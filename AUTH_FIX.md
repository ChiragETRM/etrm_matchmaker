# Authentication Schema Fix Guide

## Problem
The login fails with error: `The column 'users.given_name' does not exist in the current database.`

This happens when the Prisma schema defines fields that don't exist in the database, causing the Prisma adapter to fail when querying users.

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

### Scripts Reference

- `npm run db:fix-auth-schema` - Comprehensive fix (checks + applies migrations + regenerates client)
- `npm run db:apply-nextauth-migration` - Apply NextAuth columns only
- `npm run db:apply-google-profile-migration` - Apply Google profile columns only
- `npm run db:generate` - Regenerate Prisma client
- `npm run db:push` - Push entire schema to database
