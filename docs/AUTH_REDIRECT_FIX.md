# Auth Redirect Loop Fix – Root Cause & QA

## Root cause

**Symptom:** After successful email+password sign-in (or after OTP onboarding), the user was sent back to `/auth/signin` instead of `/dashboard`.

**Cause:** On the **login page** (`app/auth/login/page.tsx`), after `signIn('credentials', { redirect: false })` succeeded, the code did `router.push(callbackUrl)`. That is a **client-side navigation**. The SessionProvider had not yet refetched the new session, so when the dashboard mounted, `useSession()` still returned `unauthenticated`. The dashboard’s `useEffect` then ran and did `router.push('/auth/signin?callbackUrl=/dashboard')`, producing the loop.

**Contributing factors:**
- No full-page redirect after credentials sign-in, so the next route saw stale session state.
- Sign-in page used `router.push(decodedUrl)` for authenticated users; a full-page redirect is more reliable so the target page loads with the cookie and a fresh session.
- Error handling on sign-in was clearing cookies on any `error` query param; now we only clear on specific auth errors (Configuration, PKCEError, StateError, AccessDenied) and preserve `callbackUrl` when redirecting.
- No middleware for `/dashboard`; protection was only client-side. Middleware now redirects unauthenticated (no session cookie) to `/auth/signin?callbackUrl=<path>`.

**Files/lines involved:**
- `app/auth/login/page.tsx`: `router.push(callbackUrl)` after credentials success → replaced with `window.location.href = callbackUrl`; same for the `useEffect` that runs when `status === 'authenticated'`.
- `app/auth/signin/page.tsx`: `router.push(decodedUrl)` when authenticated → replaced with `window.location.href = decodedUrl`; error `useEffect` limited to specific errors and preserves `callbackUrl`.
- `middleware.ts`: new file; protects `/dashboard` and `/dashboard/*`, redirects to sign-in with `callbackUrl`.
- `lib/auth.ts`: redirect callback already used `callbackUrl`; added dev-only logging of redirect targets.

## Corrected flow (state machine)

```
                    ┌─────────────────┐
                    │  /auth/signin   │
                    │  (entry point)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     [Continue with    [Google OAuth]  [Sign in with
      email – OTP]                      password link]
              │              │              │
              ▼              │              ▼
     POST request-otp       │         /auth/login
     → /auth/verify         │              │
              │             │              │
              ▼             │              ▼
     /auth/verify          │         signIn(credentials)
     [Enter OTP]           │         → window.location.href
              │             │         = callbackUrl
     POST verify-otp        │              │
              │             │              ▼
     ┌────────┴────────┐   │         [Session set,
     │                 │   │          full load of
     ▼                 ▼   │          callbackUrl]
  EXISTING_USER    NEW_USER   │
  signInToken     needsProfile
     │                 │    │
     │                 ▼    │
     │            /auth/onboarding
     │            [name + password]
     │                 │
     │            POST onboarding-complete (token, name, password, callbackUrl)
     │            → Server: update user, create Session, Set-Cookie, return { redirectUrl }
     │                 │
     │            Client: window.location.href = redirectUrl
     │                 │
     ▼                 ▼
  [Session set by verify-otp   [Session set by onboarding-complete
   or callback/credentials]    in API response]
     │
     ▼
  Browser: full load of callbackUrl (e.g. /dashboard)
  → session present → no redirect to signin
```

**Protected routes:** Visiting `/dashboard` or `/dashboard/*` without a session cookie → middleware redirects to `/auth/signin?callbackUrl=<current path>`. `callbackUrl` is preserved through sign-in → verify → onboarding → final redirect.

## New-user onboarding loop (fixed)

**Symptom:** New user: OTP → onboard (name + password) → redirected back to /auth/signin.

**Cause:** After onboarding-complete API success, the client did a **form POST** to `/api/auth/callback/credentials` with the onboarding token. NextAuth’s credentials `authorize()` was failing (or redirect was going to signin), so the user landed on signin. Same class of failure as existing-user OTP (credentials callback unreliable for this flow).

**Fix:** onboarding-complete API now **creates the session** and sets the session cookie in the response (same pattern as verify-otp for existing users). It accepts `callbackUrl`, returns `redirectUrl`, and the client does `window.location.href = data.redirectUrl`. No form POST, no credentials callback. Token is deleted after use (one-time).

**Files:** `app/api/auth/onboarding-complete/route.ts` (create Session, set cookie, return redirectUrl); `app/auth/onboarding/page.tsx` (pass callbackUrl, redirect to data.redirectUrl, remove handleSubmitWithToken).

## Manual QA checklist

| # | Scenario | Steps | Expected result |
|---|----------|--------|------------------|
| 1 | New user: OTP → onboard → dashboard | 1) /auth/signin, enter email, submit. 2) /auth/verify, enter OTP. 3) /auth/onboarding, enter name + password, submit. | User lands on /dashboard, authenticated. No redirect back to /auth/signin. |
| 2 | Existing user: OTP → dashboard | 1) /auth/signin, enter email. 2) /auth/verify, enter OTP. | User lands on /dashboard (or callbackUrl), authenticated. No onboarding step. |
| 3 | Email/password login → dashboard | 1) /auth/login (or signin → “Sign in with email and password”). 2) Enter email + password, submit. | User lands on /dashboard (or callbackUrl), authenticated. No redirect back to /auth/signin. |
| 4 | Dashboard when logged out | 1) Ensure no session (or sign out). 2) Open /dashboard. | Redirect to /auth/signin?callbackUrl=/dashboard. After sign-in, land on /dashboard. |
| 5 | callbackUrl preserved | 1) Open /auth/signin?callbackUrl=/dashboard/candidate. 2) Complete OTP (or login). | Final redirect is /dashboard/candidate. |
| 6 | Sign out then dashboard | 1) Sign in, go to dashboard. 2) Sign out. 3) Visit /dashboard. | Redirect to /auth/signin?callbackUrl=/dashboard. |
| 7 | Change email / back links | On /auth/verify and /auth/onboarding, use “Change email” / “Back to sign in” / “Use a different email”. | Links include callbackUrl where applicable; flow can be restarted without losing intent. |
| 8 | Resend OTP | On /auth/verify, click “Resend code”. | Cooldown (e.g. 60s) applies; code can be resent; verify still works. |
| 9 | Signin while logged in | While authenticated, visit /auth/signin. | Redirected to /dashboard (or callbackUrl). No sign-in form shown. |
| 10 | New user: refresh after onboard | After OTP → onboard → /dashboard, refresh the page. | User stays on /dashboard, still authenticated. |

## Technical checklist (already implemented)

- Session cookie: no custom domain (browser default); `secure` in production; `sameSite: 'lax'`; `path: '/'`.
- After session creation, client uses full-page redirect (`window.location.href`) so the next load has the cookie and a fresh session.
- `callbackUrl` is passed through: signin → verify (query); verify → onboarding (query); onboarding-complete API returns redirectUrl; login form/redirect.
- Middleware protects `/dashboard` and `/dashboard/*`, redirects to `/auth/signin?callbackUrl=<path>` when session cookie is absent.
- OTP: request-otp returns `otp_request_id` and `expires_at`; verify-otp returns `status`: `EXISTING_USER_AUTHENTICATED` or `NEW_USER_VERIFIED_NEEDS_PROFILE`.
- UX: progress steps (1–2–3) on signin, verify, onboarding; “Change email” / “Back to sign in”; password rules on onboarding; loading and error states; resend OTP cooldown on verify.
