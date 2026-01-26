# Local Development Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or remote)
- npm or yarn package manager

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up PostgreSQL Database

You have a few options:

**Option A: Local PostgreSQL**
```bash
# Create a new database
createdb curated_job_engine
```

**Option B: Use a cloud service**
- [Supabase](https://supabase.com) (free tier available)
- [Neon](https://neon.tech) (free tier available)
- [Railway](https://railway.app) (free tier available)

**Option C: Docker**
```bash
docker run --name postgres-curated-jobs \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=curated_job_engine \
  -p 5432:5432 \
  -d postgres:15
```

### 2a. Create tables in Supabase (if using Supabase)

The `public.jobs` (and other) tables must exist before the app can create jobs. Two options:

**Option 1 — Easiest: Supabase SQL Editor**

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor** → **New query**.
3. Copy the contents of `prisma/supabase-init.sql` and paste into the editor.
4. Click **Run**. All required tables will be created.

   If you change the Prisma schema later, regenerate the SQL with `npm run db:sql-supabase`, then run the new script in the SQL Editor again (or use `npx prisma db push` with the direct URL).

**Option 2 — Prisma from your machine**

1. In Supabase: **Project Settings** → **Database** → copy the **Connection string** (URI).
2. Use the **Direct** connection (port `5432`), not the pooler. Example:
   ```bash
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
   ```
3. Add to `.env`:
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
   ```
4. From the project root, run:
   ```bash
   npx prisma db push
   ```
   Or use the setup script: `npm run db:setup`.

For **Vercel**: Set `DATABASE_URL` (Supabase pooler, port 6543) in Vercel environment variables. The build does **not** run migrations—Vercel’s build environment often cannot reach Supabase’s direct DB (port 5432). Create tables **before** deploying: use **Option 1** (Supabase SQL Editor + `prisma/supabase-init.sql`) or **Option 2** (run `npx prisma db push` locally with `DIRECT_URL` in `.env`), then deploy.

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
# Database (required)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/curated_job_engine?schema=public"

# App URL (required)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# For MVP, you can skip these initially:
# - File storage (will use placeholder)
# - Email provider (will fail gracefully)
# - CAPTCHA (optional for local dev)
```

**Quick Start - Minimal `.env` for local testing:**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/curated_job_engine?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push
```

**Alternative: Use migrations (recommended for production)**
```bash
npx prisma migrate dev --name init
```

### 5. (Optional) View Database

Open Prisma Studio to view/edit data:

```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555`

### 6. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Testing the Application

### 1. Post a Job

1. Visit `http://localhost:3000/post-job`
2. Fill in the job form:
   - Job title: "Senior Endur Developer"
   - Location: "London, UK"
   - Select ETRM packages, commodities, etc.
   - Add at least one question (e.g., "Do you have EU work authorization?" - Type: BOOLEAN)
   - Optionally add a gate rule (e.g., work_auth_eu == true)
3. Submit the form
4. Copy the job URL from the success page

### 2. Browse Jobs

1. Visit `http://localhost:3000/jobs`
2. See your posted job in the list
3. Use filters to narrow down results

### 3. Apply to a Job

1. Click on a job to view details
2. Click "Apply Now"
3. Answer the questionnaire
4. If you pass the gates, you'll be asked to submit your CV
5. Fill in contact details and upload a resume

## Troubleshooting

### Database Connection Issues

```bash
# Test your connection string
psql "postgresql://postgres:postgres@localhost:5432/curated_job_engine"

# If using Docker, check if container is running
docker ps | grep postgres
```

### Prisma Issues

```bash
# Reset Prisma Client
npx prisma generate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### `prisma db push` — "Can't reach database server" (P1001)

Run the diagnostic script:

```bash
npm run db:troubleshoot-push
```

Common causes:

- **IPv6-only DB**: Supabase direct DB often has no IPv4. Many home networks don’t have IPv6. **Fix:** Supabase Dashboard → Project Settings → Database → enable **IPv4 add-on** (if available). Or use **SQL Editor** + `prisma/supabase-init.sql` instead of `prisma db push`.
- **Firewall**: If the script reports "Access is denied" when adding a rule, run **PowerShell as Administrator** and run `npm run db:troubleshoot-push` again.
- **VPN / network**: Try turning VPN off, or use another network (e.g. phone hotspot).

### Port Already in Use

If port 3000 is taken:

```bash
# Use a different port
PORT=3001 npm run dev
```

### Missing Environment Variables

The app will work with minimal config, but some features need setup:

- **File Upload**: Currently uses placeholder. For real storage, configure S3/R2/Supabase in `lib/storage.ts`
- **Email**: Currently uses Postmark. Configure in `lib/email.ts` or it will fail gracefully
- **CAPTCHA**: Optional. App works without it, but submission won't require CAPTCHA verification

## Development Tips

### View Database Schema

```bash
npx prisma studio
```

### Reset Database

```bash
npx prisma migrate reset
```

### Create a Migration

```bash
npx prisma migrate dev --name your_migration_name
```

### Check Database Status

```bash
npx prisma db pull  # See current DB state
npx prisma db push  # Push schema changes
```

## Next Steps

Once running locally:

1. **Configure Email** (optional): Set up Postmark/SendGrid/SES for email notifications
2. **Configure Storage** (optional): Set up S3/R2/Supabase for file uploads
3. **Add CAPTCHA** (optional): Get Cloudflare Turnstile keys
4. **Test Full Flow**: Post a job → Apply → Check email delivery

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run linter

# Database
npx prisma studio        # Open database GUI
npx prisma generate      # Generate Prisma Client
npx prisma db push       # Push schema changes
npx prisma migrate dev   # Create and apply migration
```

## Need Help?

- Check the main `README.md` for architecture details
- Review `prisma/schema.prisma` for data model
- Check API routes in `app/api/` for endpoint details