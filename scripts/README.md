# Seed Jobs Script

This script creates 5 sample jobs for testing purposes across different ETRM roles.

## Prerequisites

1. Make sure your `.env` file has a valid `DATABASE_URL` configured
2. Ensure your database is accessible and Prisma is set up

## Usage

Run the seed script:

```bash
npm run seed:jobs
```

This will create 5 sample jobs:
1. **Senior ETRM Business Analyst - Endur** (London, UK) - Hybrid, Permanent
2. **ETRM Developer - Endur (OpenJVS)** (New York, USA) - Remote, Contract
3. **ETRM QA Analyst / Tester - Endur** (Amsterdam, Netherlands) - Hybrid, Permanent
4. **ETRM Developer - Allegro** (Houston, USA) - Onsite, Permanent
5. **ETRM Business Analyst - RightAngle** (Singapore) - Hybrid, Permanent

## Alternative: Use API Endpoint

If you prefer to seed via API, you can use the `/api/jobs` endpoint with POST requests for each job.
