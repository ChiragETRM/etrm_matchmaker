# Authentication Flow

This document describes the authentication system for the LearnETRM job portal.

## Sign-in Methods

1. **Google OAuth** – Sign in with Google account
2. **Email OTP** – One-time code sent to email, then optional password setup

## Routes

| Route | Purpose |
|-------|---------|
| `/auth/signin` | Request OTP (name + email) or continue with Google |
| `/auth/verify` | Enter 6-digit OTP code |
| `/auth/onboarding` | Set password (new users or users without password) |
| `/auth/login` | Email + password sign-in (returning users) |
| `/auth/forgot` | Request OTP to reset password |
| `/auth/set-password` | Set new password (forgot flow, requires token) |

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/email/request-otp` | Send OTP to email (rate limited) |
| POST | `/api/auth/email/verify-otp` | Verify OTP, create/find user, return sign-in token |
| POST | `/api/auth/email/resend-otp` | Resend OTP (60s cooldown, max 3/hour) |
| POST | `/api/auth/password/set` | Set password (authenticated) |
| POST | `/api/auth/password/reset` | Reset password (forgot flow, token in body) |
| POST | `/api/auth/password/forgot-verify` | Verify OTP for password reset |
| POST | `/api/cron/cleanup-auth` | Clean expired OTPs and tokens (optional CRON_SECRET) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` or `NEXTAUTH_SECRET` | Yes | Secret for signing cookies and CSRF tokens |
| `AUTH_URL` or `NEXTAUTH_URL` | Yes (production) | Base URL of the app (e.g. `https://jobs.learnetrm.com`) |
| `GOOGLE_CLIENT_ID` | Yes (for Google) | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes (for Google) | Google OAuth client secret |
| `SMTP_HOST` | Yes (for OTP) | SMTP server hostname |
| `SMTP_PORT` | No | SMTP port (default `587`) |
| `SMTP_USER` | Yes (for OTP) | SMTP username |
| `SMTP_PASS` or `SMTP_PASSWORD` | Yes (for OTP) | SMTP password |
| `SMTP_FROM` | No | From address (defaults to `SMTP_USER`) |
| `CRON_SECRET` | No | Bearer token for `/api/cron/cleanup-auth` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DIRECT_URL` | Yes (Supabase) | Direct connection string for migrations |

Example `.env`:

```bash
# Required for auth
AUTH_SECRET="your-secret-at-least-32-chars"
AUTH_URL="https://jobs.learnetrm.com"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# SMTP (for OTP emails)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASS="..."
SMTP_FROM="noreply@learnetrm.com"

# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Optional
CRON_SECRET="..."
```

## Security

- OTP stored hashed (argon2), never plaintext
- Password stored hashed (argon2)
- Rate limiting: per IP and per email
- No account enumeration in messages
- CSRF protection via NextAuth
- Secure cookies: httpOnly, sameSite, secure in production

## Password Rules

- Min 10 characters
- At least 1 uppercase, 1 lowercase, 1 number

## Setup Steps (Local)

1. **Copy environment variables**
   - Copy `.env.example` to `.env` and fill in values (see table above).

2. **Database**
   - Ensure PostgreSQL is running and `DATABASE_URL` / `DIRECT_URL` are set.
   - Run: `npx prisma db push` (or `npx prisma migrate dev` for migrations).

3. **SMTP (for OTP emails)**
   - Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and optionally `SMTP_FROM`.
   - For local testing you can use a service like Mailtrap or Gmail (app password).

4. **Run the app**
   - `npm install && npm run dev`
   - Open `http://localhost:3000/auth/signin`.

## Schema Migration

Apply schema changes with:

```bash
npx prisma db push
```

Or run the SQL in `prisma/add-email-otp-password-auth.sql` manually (e.g. in Supabase SQL Editor).

## Cron Setup

To clean expired OTP and tokens daily, add to your cron (e.g. Vercel Cron):

```
POST /api/cron/cleanup-auth
Authorization: Bearer <CRON_SECRET>
```
