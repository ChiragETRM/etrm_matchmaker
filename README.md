# Curated Job Engine

A lightweight web application for ETRM-focused job posting and candidate application system.

## Features

- **Recruiter Flow**: Post jobs with ETRM-specific fields and custom questionnaires
- **Candidate Flow**: Browse jobs, complete questionnaires, and apply with CV upload
- **Gate System**: Hard requirements evaluation before CV collection
- **Email Notifications**: Automatic email delivery to recruiters
- **30-Day Auto-Expiry**: Jobs automatically expire after 30 days
- **No Accounts**: Stateless system with no login required

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, React Hook Form
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: S3/R2/Supabase Storage (configurable)
- **Email**: Postmark/SendGrid/AWS SES (configurable)
- **CAPTCHA**: Cloudflare Turnstile

## Quick Start (Local Development)

See [SETUP.md](./SETUP.md) for detailed local development instructions.

**Quick version:**

```bash
# 1. Install dependencies
npm install

# 2. Set up database (create .env with DATABASE_URL)
cp .env.example .env
# Edit .env and set: DATABASE_URL="postgresql://user:password@localhost:5432/curated_job_engine?schema=public"

# 3. Run migrations
npx prisma generate
npx prisma db push

# 4. Start dev server
npm run dev
```

Visit `http://localhost:3000`

**For detailed setup instructions, see [SETUP.md](./SETUP.md)**

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── jobs/              # Job creation endpoint
│   │   ├── public/jobs/       # Public job listing endpoints
│   │   └── apply/             # Application flow endpoints
│   ├── post-job/              # Recruiter job posting pages
│   ├── jobs/                  # Candidate job browsing pages
│   └── apply/                 # Application flow pages
├── lib/
│   ├── prisma.ts              # Prisma client
│   ├── utils.ts               # Utility functions
│   ├── gate-evaluator.ts     # Gate rule evaluation
│   ├── email.ts               # Email sending abstraction
│   ├── storage.ts             # File storage abstraction
│   └── rate-limit.ts          # Rate limiting
└── prisma/
    └── schema.prisma          # Database schema
```

## Key Features

### Job Posting

- ETRM-specific fields (packages, commodities, role categories)
- Custom questionnaire builder
- Gate rules for minimum requirements
- 30-day automatic expiry

### Application Flow

1. Candidate browses jobs
2. Clicks "Apply" → starts questionnaire
3. Answers questions → system evaluates gates
4. If PASS → submit CV and contact details
5. If FAIL → polite decline message
6. Recruiter receives email with candidate details

### Gate Rules

Gate rules enforce hard requirements:

- `EQ`: Equals
- `GTE`: Greater than or equal
- `INCLUDES_ANY`: Answer includes any of the values
- `INCLUDES_ALL`: Answer includes all values
- `IN`: Answer is in the list

## API Endpoints

### Recruiter

- `POST /api/jobs` - Create a new job

### Candidate

- `GET /api/public/jobs` - List active jobs (with filters)
- `GET /api/public/jobs/:slug` - Get job details
- `POST /api/apply/start` - Start application session
- `POST /api/apply/:session/evaluate` - Evaluate questionnaire answers
- `POST /api/apply/:session/submit` - Submit CV and contact details

## Environment Variables

See `.env.example` for all required variables.

## Production Deployment

1. Set up PostgreSQL database
2. Configure file storage (S3/R2/Supabase)
3. Configure email provider
4. Set up Cloudflare Turnstile
5. Update `NEXT_PUBLIC_APP_URL` to production URL
6. Run migrations: `npx prisma migrate deploy`
7. Build: `npm run build`
8. Start: `npm start`

## License

MIT