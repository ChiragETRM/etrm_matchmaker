# Authentication Schema Fix Guide

## Problems Fixed

### 1. Database Schema Mismatch
The login fails with error: `The column 'users.given_name' does not exist in the current database.`

This happens when the Prisma schema defines fields that don't exist in the database, causing the Prisma adapter to fail when querying users.

### 2. PKCE Code Verifier Error
The login fails with error: `Invalid code verifier` or `invalid_grant: Invalid code verifier.`

This happens when the PKCE (Proof Key for Code Exchange) code verifier cookie is not properly stored, retrieved, or matches the code challenge sent to Google OAuth.

## Solution

### Quick Fix (Recommended)
Run the comprehensive fix script that checks and fixes all schema issues:

```bash
npm run db:fix-auth-schema
```

This script will:
1. Check if all required columns exist
2. Apply missing migrations automatically
3. Regenerate the Prisma client
4. Verify everything is correct

### Manual Fix Steps

If you prefer to run migrations manually:

1. **Apply NextAuth columns migration:**
   ```bash
   npm run db:apply-nextauth-migration
   ```

2. **Apply Google profile fields migration:**
   ```bash
   npm run db:apply-google-profile-migration
   ```

3. **Regenerate Prisma client:**
   ```bash
   npm run db:generate
   ```

### API Endpoints

#### Health Check
Check if the schema is correct:
```bash
GET /api/auth/health
```

#### Apply Google Profile Migration via API
```bash
POST /api/migrate/google-profile
Authorization: Bearer migrate-now
```

#### Check Google Profile Migration Status
```bash
GET /api/migrate/google-profile
```

### Required Columns

The following columns must exist in the `users` table:

**NextAuth columns:**
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Google profile columns:**
- `given_name` (TEXT)
- `family_name` (TEXT)
- `locale` (TEXT)
- `google_sub` (TEXT)
- `profile_data` (TEXT)

### Error Handling

The auth system now includes defensive error handling:
- If columns don't exist, the error is logged but login continues
- Profile data updates are skipped if columns are missing
- Clear error messages guide you to run migrations

### Cache Issues

If you still experience issues after running migrations:

1. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   ```

2. **Regenerate Prisma client:**
   ```bash
   npm run db:generate
   ```

3. **Restart the development server:**
   ```bash
   npm run dev
   ```

### Production Deployment

Before deploying to production:

1. Run the fix script:
   ```bash
   npm run db:fix-auth-schema
   ```

2. Verify schema:
   ```bash
   curl https://your-domain.com/api/auth/health
   ```

3. Ensure migrations are applied in your production database

### PKCE Code Verifier Fix

The PKCE code verifier cookie is now explicitly configured to prevent "Invalid code verifier" errors:

- Cookie name: `next-auth.pkce.code_verifier` (or `__Secure-next-auth.pkce.code_verifier` in production)
- Cookie settings: httpOnly, sameSite: 'lax', secure in production
- Max age: 15 minutes (matches OAuth flow duration)

**If you still get PKCE errors:**

1. **Verify Google OAuth Callback URL:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to APIs & Services > Credentials
   - Edit your OAuth 2.0 Client ID
   - Ensure "Authorized redirect URIs" includes:
     - `https://your-domain.com/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google` (for development)
   - The URL must match EXACTLY (including protocol and trailing paths)

2. **Clear Browser Cookies:**
   - The sign-in page automatically clears cookies on PKCE errors
   - Manually clear cookies if issues persist:
     - Open browser DevTools (F12)
     - Application/Storage tab > Cookies
     - Delete all cookies for your domain
     - Try signing in again

3. **Check Environment Variables:**
   - Ensure `AUTH_URL` or `NEXTAUTH_URL` is set correctly
   - Must match your actual domain (no trailing slash)
   - Example: `https://your-domain.com` (not `https://your-domain.com/`)

### Troubleshooting

**Issue: Migration fails with connection error**
- Ensure `DIRECT_URL` is set in environment variables
- The migration requires a direct database connection (not pooler)

**Issue: Prisma client still has errors**
- Run `npm run db:generate` after migrations
- Clear `.next` cache and restart

**Issue: Login still fails after migrations**
- Check `/api/auth/health` endpoint
- Verify all columns exist in database
- Check Prisma client is regenerated

**Issue: "Invalid code verifier" error**
- Verify Google OAuth callback URL matches exactly
- Clear browser cookies and try again
- Check that `AUTH_URL` or `NEXTAUTH_URL` is set correctly
- Ensure cookies are not being blocked by browser settings
- Check that you're using HTTPS in production (required for secure cookies)

### Scripts Reference

- `npm run db:fix-auth-schema` - Comprehensive fix (checks + applies migrations + regenerates client)
- `npm run db:apply-nextauth-migration` - Apply NextAuth columns only
- `npm run db:apply-google-profile-migration` - Apply Google profile columns only
- `npm run db:generate` - Regenerate Prisma client
- `npm run db:push` - Push entire schema to database
