# Scaling & Production Readiness Review

**Target:** 100 employers, 2,000 candidates, production-grade job board
**Current Stack:** Next.js 14 (App Router) + Prisma + PostgreSQL (Supabase) + NextAuth v5
**Date:** January 2026

---

## TL;DR — Will It Scale to 100 Employers / 2,000 Candidates?

**Short answer: Yes, with caveats.** The database schema and core architecture can handle this load without breaking. PostgreSQL can easily handle millions of rows. The real risks aren't about raw scale — they're about **operational failures** that will hit you before you reach those numbers:

- Resumes stored as base64 in the database will bloat your DB to ~10GB+ and make backups slow
- In-memory rate limiting does nothing on Vercel (serverless = new process per request)
- No server-side middleware means bots can hammer your API
- File upload/download endpoints have zero authentication
- No pagination on any list endpoint — one recruiter with 200 applications will see a slow dashboard

The sections below break down every risk, ranked by severity, with specific fixes.

---

## 1. CRITICAL — Fix Before Going Live

### 1.1 Resume Storage Will Blow Up Your Database

**The Problem:**
`lib/storage.ts` stores resumes as **base64-encoded text inside PostgreSQL** (`file_objects.data` column). A 3MB PDF becomes ~4MB of base64 text in a `TEXT` column.

**Impact at scale:**
- 2,000 candidates × 3MB avg resume = **~8GB of base64 text in your database**
- Supabase free tier: 500MB. Pro tier: 8GB. You'll hit the limit fast.
- Database backups become massive and slow
- `pg_dump` will take minutes instead of seconds
- Prisma queries that accidentally `include` the `data` field will transfer GBs over the wire

**Fix:**
Implement the S3/R2 upload path that's already stubbed out in `storage.ts`:
```
1. Use Cloudflare R2 (free egress) or AWS S3
2. Store only the object key/URL in the database
3. Generate signed URLs for downloads (time-limited, secure)
4. Remove the `data` column from FileObject once migrated
```

**Effort:** Medium — the abstraction layer already exists, you just need to fill in `uploadToS3()` or `uploadToR2()`.

---

### 1.2 File Endpoints Have No Authentication

**The Problem:**
- `POST /api/files/upload` — **anyone** can upload files without being authenticated
- `GET /api/files/[fileId]/download` — **anyone** with a file ID can download any resume

File IDs are CUIDs (predictable-ish format). An attacker could enumerate IDs and download resumes containing personal data (names, phone numbers, addresses).

**Impact:** GDPR/privacy violation. Resume data is PII.

**Fix:**
```
Upload: Require either a valid application session token OR authenticated user
Download: Verify the requester is either:
  - The candidate who uploaded it (candidateEmail match)
  - The recruiter whose job the resume was submitted to (recruiterEmailTo match)
  - Return 403 for everyone else
```

---

### 1.3 In-Memory Rate Limiting Is Useless on Vercel

**The Problem:**
`lib/rate-limit.ts` uses a `Map()` stored in process memory. On Vercel (serverless), **every request may spin up a new function instance** — each with its own empty Map. The rate limiter will never see previous requests.

**Impact:** Rate limiting effectively disabled in production. Bots can:
- Spam application submissions
- Brute-force file ID enumeration
- Abuse the IP-based geolocation API (ip-api.com has 45 req/min limit — you'll get blocked)

**Fix:**
```
Option A: Vercel KV (Redis) — built-in, ~$1/month for low usage
Option B: Upstash Redis — serverless Redis, free tier is 10K requests/day
Option C: Use Vercel's built-in rate limiting (via middleware + Edge Config)

Replace the Map() with a Redis INCR + EXPIRE pattern:
  INCR rate:submit:{ip}
  EXPIRE rate:submit:{ip} 60
```

---

### 1.4 No Server Middleware — No Global Protection

**The Problem:**
There is **no `middleware.ts`** file. All route protection is done:
- Client-side: `useEffect` checks `status === 'unauthenticated'` and redirects
- Per-route: Each API route individually calls `auth()` and checks the response

**Impact:**
- Protected pages flash briefly before redirecting (poor UX)
- If you forget an auth check on one API route, it's exposed
- No centralized place to add security headers, logging, or bot detection
- No way to block entire request paths at the edge

**Fix:**
Create `middleware.ts` in the project root:
```
- Protect /dashboard/* routes at the edge (redirect before page loads)
- Add security headers globally (CSP, X-Frame-Options, X-Content-Type-Options)
- Add rate limiting at the edge for /api/* routes
- Log request metadata for debugging
```

---

## 2. HIGH — Fix Before Scaling Past ~50 Jobs

### 2.1 No Pagination Anywhere

**The Problem:**
Every list endpoint returns **all** matching records:

- `GET /api/public/jobs` — returns ALL active jobs (no limit/offset)
- `GET /api/dashboard/recruiter` — returns ALL jobs with ALL applications (nested)
- `GET /api/dashboard/candidate` — returns ALL applications
- `POST /api/public/filter-jobs` — loads ALL jobs, evaluates gates in-memory for each

**Impact at 100 jobs × 20 applications each:**
- Recruiter dashboard: 1 query returning 100 jobs × 20 applications × resume metadata = **2,000+ nested objects**
- Job listing: 100 jobs sent to every visitor on every page load
- Filter jobs: loads 100 jobs with all gate rules, evaluates each one server-side

**Fix:**
```
Add cursor-based or offset pagination to all list endpoints:
  GET /api/public/jobs?page=1&limit=20
  GET /api/dashboard/recruiter?page=1&limit=10

For the recruiter dashboard, consider:
  - Load jobs list first (lightweight)
  - Load applications per-job on expand/click (lazy loading)
  - Never return resume file data in list queries
```

### 2.2 The Filter-Jobs Endpoint Loads Entire Job Table

**The Problem:**
`POST /api/public/filter-jobs` (`app/api/public/filter-jobs/route.ts`):
1. Loads **every active job** with all gate rules from the database
2. Iterates through each job in JavaScript to evaluate gates
3. Returns the filtered list

This is O(n) on total active jobs, executed entirely in JavaScript instead of SQL.

**Impact at 100+ jobs:** Every "Find Jobs For Me" click triggers a full table scan + gate evaluation for every job. With 100 jobs and 5 gate rules each, that's 500 rule evaluations per request.

**Fix:**
```
Short-term: Add pagination to the results (even if evaluation is still in-memory)
Long-term: Move gate evaluation to SQL using WHERE clauses with JSONB operators
  - Store gate rules as JSONB instead of serialized text
  - Use PostgreSQL JSONB operators for filtering
```

### 2.3 No Caching — Every Page Load Hits the Database

**The Problem:**
Every API route has `export const dynamic = 'force-dynamic'` and every client fetch uses `cache: 'no-store'`. The job listing page, viewed by thousands of candidates, makes a fresh database query every single time.

**Impact:**
- 100 concurrent visitors = 100 identical database queries for the same job list
- Supabase connection pool will saturate (default 15-20 connections)
- Response times will spike during traffic bursts

**Fix:**
```
Tier 1 — HTTP caching (easiest):
  Set Cache-Control headers on public endpoints:
  /api/public/jobs → Cache-Control: public, s-maxage=60, stale-while-revalidate=300
  /api/public/jobs/[slug] → Cache-Control: public, s-maxage=300

Tier 2 — ISR (Incremental Static Regeneration):
  Use Next.js revalidate for job listing/detail pages
  Jobs change infrequently — a 60-second cache is fine

Tier 3 — Redis cache:
  Cache hot queries (job list, filter questions) in Redis
  Invalidate when a job is created/updated/expired
```

### 2.4 Recruiter Dashboard N+1 Query Pattern

**The Problem:**
`GET /api/dashboard/recruiter` loads everything in one massive Prisma include:
```javascript
prisma.job.findMany({
  where: { recruiterEmailTo: email },
  include: {
    questionnaire: { include: { questions: true } },
    applications: { include: { resumeFile: true } },
  },
})
```

For a recruiter with 20 jobs and 50 applications per job, this returns **1,000 application objects** with resume metadata in a single response.

**Fix:**
```
1. Separate the queries: Load jobs first, then applications on-demand
2. Add pagination: Only load 10 applications per job initially
3. Remove resumeFile include from list view — only load when viewing detail
4. Add application counts instead: _count: { applications: true }
```

---

## 3. MEDIUM — Fix for Production Quality

### 3.1 No Error Monitoring or Logging

**The Problem:**
All errors go to `console.error()`. On Vercel, these appear in the function logs but:
- They're not searchable
- No alerting when errors spike
- No stack traces with source maps in production
- No way to correlate errors with specific users or requests
- Email failures are logged as "CRITICAL" to console — nobody will see this

**Fix:**
```
1. Add Sentry (free tier: 5K errors/month)
   npm install @sentry/nextjs
   - Captures errors with stack traces, user context, request data
   - Alerts via email/Slack when error rate spikes

2. Add structured logging for key events:
   - Application submitted
   - Email sent/failed
   - Job created/expired
   - Auth failures
```

### 3.2 No Database Connection Pooling Strategy

**The Problem:**
Prisma connects to PostgreSQL with default settings. On Vercel:
- Each serverless function opens its own connection
- Supabase free tier allows ~20 direct connections
- With 50 concurrent users, you'll exhaust the pool and get connection errors

The code has a Supabase pooler URL conversion helper, but no explicit pool size configuration.

**Fix:**
```
1. Use Supabase's built-in PgBouncer pooler (port 6543)
   - Already partially configured via DATABASE_URL
   - Ensure connection mode is "transaction" (not "session")

2. Configure Prisma connection pool:
   datasource db {
     url = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")  // For migrations only
   }
   // Add ?pgbouncer=true&connection_limit=5 to DATABASE_URL

3. Consider Prisma Accelerate for edge caching + connection pooling
```

### 3.3 No Input Sanitization for XSS

**The Problem:**
User-submitted content (candidate names, answers, LinkedIn URLs) is stored as-is and rendered in:
- Recruiter email HTML (direct string interpolation)
- Dashboard displays
- Gate answer displays

In `submit/route.ts`:
```javascript
const emailHtml = `
  <li><strong>Name:</strong> ${data.candidateName}</li>
  <li><strong>Email:</strong> ${data.candidateEmail}</li>
```

A candidate could submit `<script>alert('xss')</script>` as their name.

**Fix:**
```
1. Sanitize all user inputs before storing (or before rendering):
   npm install dompurify (server-side) or sanitize-html

2. For emails: HTML-encode all interpolated values
   Use a template library (like mjml or react-email) instead of string concatenation

3. For React rendering: React auto-escapes by default, but verify
   no dangerouslySetInnerHTML is used with user content
```

### 3.4 Turnstile CAPTCHA Is Not Enforced

**The Problem:**
The submit schema accepts an optional `turnstileToken`, but there's **no server-side verification** of the token. The Turnstile integration is client-side only (cosmetic).

**Fix:**
```
In the submit endpoint, verify the token:
const verifyResponse = await fetch(
  'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  {
    method: 'POST',
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: data.turnstileToken,
    }),
  }
)
const verification = await verifyResponse.json()
if (!verification.success) {
  return NextResponse.json({ error: 'CAPTCHA verification failed' }, { status: 400 })
}
```

### 3.5 No Duplicate Application Prevention

**The Problem:**
There's no unique constraint on `(jobId, candidateEmail)` in the applications table. A candidate could submit multiple applications for the same job. The one-click apply checks for existing applications, but the regular submit flow does not.

**Fix:**
```
1. Add a unique constraint in Prisma schema:
   @@unique([jobId, candidateEmail])

2. Handle the conflict gracefully in the submit endpoint:
   Return "You've already applied to this job" instead of creating a duplicate
```

### 3.6 Migration Endpoints Exposed in Production

**The Problem:**
These endpoints exist and are callable in production:
- `POST /api/migrate` — runs database migrations
- `POST /api/migrate/nextauth` — runs NextAuth migration
- `POST /api/migrate/google-profile` — runs Google profile migration
- `GET /api/test-db` — returns database connection info
- `GET /api/verify-db` — returns table structure

The migrate endpoint checks for a `MIGRATE_SECRET` token, but test-db and verify-db have **no authentication at all**.

**Fix:**
```
1. Delete these routes entirely — migrations should run via CLI, not HTTP
2. If you must keep them, gate behind a strong secret AND a check for NODE_ENV
3. test-db and verify-db should be removed or heavily restricted
```

---

## 4. LOW — Nice-to-Have for Production Polish

### 4.1 No SEO / Server-Side Rendering for Job Pages

Job detail pages (`/jobs/[slug]`) render client-side. Search engines may not index them properly. For a job board, SEO is critical for organic traffic.

**Fix:**
```
Convert /jobs/[slug]/page.tsx to a server component:
- Fetch job data server-side
- Add generateMetadata() for dynamic <title> and <meta> tags
- Add structured data (JSON-LD) for Google Jobs
- Add generateStaticParams() for pre-rendering active jobs
```

### 4.2 No Image Optimization

User profile images use raw `<img>` tags instead of `next/image`. Minor issue since images are only Google avatars, but `next/image` adds lazy loading, sizing, and format optimization for free.

### 4.3 Client-Side State Duplication

Each page independently fetches its own data with `useState` + `useEffect` + `fetch`. Navigation between pages re-fetches everything. Consider React Query or SWR for:
- Request deduplication
- Background refetching
- Stale-while-revalidate pattern
- Cache persistence across page navigations

### 4.4 No CI/CD Pipeline

No GitHub Actions, no automated tests, no build verification. For a production app:
```
1. Add GitHub Actions for:
   - Lint on PR
   - Type check on PR
   - Build verification on PR
   - Database migration check on PR

2. Add automated deployment:
   - Preview deployments for PRs (Vercel does this automatically)
   - Production deployment on merge to main
```

### 4.5 No Automated Tests

Zero test files found. For a job board handling PII (resumes, contact info):
```
Priority test areas:
1. Gate evaluation logic (lib/gate-evaluator.ts) — pure function, easy to test
2. Application submit flow — ensure data integrity
3. Authorization checks — ensure recruiters can't see other recruiters' data
4. File upload validation — ensure type/size checks work
```

### 4.6 No Abandoned Session Cleanup

`ApplicationSession` records with status `IN_PROGRESS` accumulate forever. Users who start but don't finish applications leave orphaned rows.

**Fix:** Add a cron job (alongside expire-jobs) to mark sessions older than 24 hours as `ABANDONED`.

---

## 5. Database Size Projections

### At 100 Employers + 2,000 Candidates (with current LOCAL file storage):

| Table | Rows | Avg Row Size | Total Size |
|-------|------|-------------|------------|
| jobs | 100-300 | ~2 KB | ~600 KB |
| questionnaires | 100-300 | ~100 B | ~30 KB |
| questions | 500-1,500 | ~200 B | ~300 KB |
| gate_rules | 300-900 | ~150 B | ~135 KB |
| applications | 2,000-10,000 | ~1 KB | ~10 MB |
| application_sessions | 5,000-20,000 | ~500 B | ~10 MB |
| **file_objects** | **2,000-10,000** | **3-4 MB (base64!)** | **6-40 GB** |
| mail_logs | 2,000-10,000 | ~200 B | ~2 MB |
| candidate_gate_answers | 10,000-50,000 | ~150 B | ~7.5 MB |
| users | 2,000-2,200 | ~500 B | ~1.1 MB |
| sessions | 500-2,000 | ~100 B | ~200 KB |

**Total without files:** ~30 MB (well within any plan)
**Total with LOCAL file storage:** **6-40 GB** (will exceed Supabase Pro plan)

### The fix: Move to S3/R2. Without base64 resume data, the database stays under 50 MB for this scale.

---

## 6. Performance Bottleneck Analysis

### Will the platform slow down?

**At 10 concurrent users:** No issues. Current architecture handles this fine.

**At 50 concurrent users:**
- Database connection pool may saturate (Supabase free: ~20 connections)
- Job listing responses will be ~50-100KB JSON (100 jobs) — acceptable
- Recruiter dashboard with many applications will be slow (no pagination)

**At 200+ concurrent users:**
- Without HTTP caching, every visitor triggers a fresh DB query for the same job list
- Filter-jobs endpoint becomes a bottleneck (loads all jobs + evaluates in JS)
- ip-api.com geolocation will rate-limit you (45 req/min)
- Serverless cold starts add 1-3 seconds to first requests

### Performance Priority Fixes:
1. Add `Cache-Control` headers to public job endpoints (immediate, zero cost)
2. Add pagination to all list endpoints
3. Move to connection pooler (PgBouncer via Supabase)
4. Cache the geolocation lookup or use Vercel's built-in `X-Vercel-IP-Country` header

---

## 7. Security Checklist for Production

| Check | Status | Priority |
|-------|--------|----------|
| Auth on file upload | Missing | CRITICAL |
| Auth on file download | Missing | CRITICAL |
| Rate limiting (distributed) | Missing | CRITICAL |
| Server middleware | Missing | CRITICAL |
| CAPTCHA verification (server-side) | Missing | HIGH |
| CSP headers | Missing | HIGH |
| XSS sanitization | Missing | HIGH |
| Duplicate application prevention | Missing | MEDIUM |
| Migration routes removed | Not done | MEDIUM |
| Audit logging | Missing | MEDIUM |
| CORS configuration | Default only | LOW |
| API key rotation | N/A | LOW |
| 2FA | Not applicable (Google SSO) | N/A |

---

## 8. Prioritized Action Plan

### Phase 1: Security (do this now)
1. Add auth to file upload/download endpoints
2. Add `middleware.ts` with route protection + security headers
3. Remove/protect migration and test-db endpoints
4. Add server-side Turnstile verification
5. Sanitize user inputs in email templates

### Phase 2: Storage & Database (do before launching)
6. Implement S3 or R2 file storage (the stubs already exist)
7. Configure Supabase connection pooler properly
8. Add unique constraint on `(jobId, candidateEmail)` in applications

### Phase 3: Performance (do before marketing/scaling)
9. Add pagination to all list endpoints (jobs, applications, dashboard)
10. Add `Cache-Control` headers to public endpoints
11. Replace in-memory rate limiter with Redis (Vercel KV or Upstash)
12. Refactor filter-jobs to paginate or cache results

### Phase 4: Monitoring & Quality (do for production stability)
13. Add Sentry for error monitoring
14. Add structured logging for key flows
15. Add basic automated tests (gate evaluator, submit flow, auth checks)
16. Add GitHub Actions CI pipeline
17. Add abandoned session cleanup cron

### Phase 5: Growth & SEO (do for organic traffic)
18. Convert job detail pages to SSR with `generateMetadata()`
19. Add JSON-LD structured data for Google Jobs integration
20. Add SWR or React Query for client-side data fetching
21. Add `next/image` for avatar optimization

---

## 9. What's Actually Good About the Current Architecture

Credit where due — several things are well-done:

- **Prisma schema is well-indexed** — composite indexes on frequently queried columns, foreign keys properly set up, cascade deletes configured
- **Pluggable abstractions** — email and storage have provider interfaces that make switching backends straightforward
- **Gate evaluation engine** — clean separation of concerns, pure function, supports 5 operators
- **Application session flow** — stateless for candidates, prevents direct resume submission without passing gates
- **Email as non-blocking** — application succeeds even if email fails, failures logged to MailLog
- **Zod validation on API routes** — input validation is present and structured
- **Database session storage** — more secure than JWT for this use case
- **Clean database schema** — proper snake_case mapping, appropriate column types, TEXT for large fields

The foundation is solid. The issues are almost entirely around what's *missing* (auth on files, pagination, caching, monitoring) rather than what's *broken*. That's a good position to be in.
