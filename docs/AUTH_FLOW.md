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

```
# Required for auth
AUTH_SECRET="..."          # or NEXTAUTH_SECRET
AUTH_URL="..."             # e.g. https://your-domain.com

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# SMTP (for OTP emails)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASSWORD="..."        # or SMTP_PASS
SMTP_FROM="noreply@learnetrm.com"

# Optional
CRON_SECRET="..."          # for /api/cron/cleanup-auth
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
