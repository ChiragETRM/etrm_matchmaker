# Curated Job Engine - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Database Schema](#database-schema)
4. [Application Flows](#application-flows)
5. [Screens & Pages](#screens--pages)
6. [API Endpoints](#api-endpoints)
7. [Key Features](#key-features)
8. [Technical Implementation Details](#technical-implementation-details)
9. [Environment Variables](#environment-variables)
10. [File Structure](#file-structure)
11. [Deployment & Setup](#deployment--setup)

---

## Project Overview

**Curated Job Engine** (also branded as "Hand Picked ETRM/CTRM Jobs") is a lightweight web application designed specifically for ETRM (Energy Trading and Risk Management) job posting and candidate application system. The platform focuses on niche ETRM roles with specialized requirements.

### Core Philosophy
- **Stateless for Candidates**: No account creation required for candidates
- **Gate System**: Hard requirements evaluation before CV collection
- **ETRM-Focused**: Specialized fields for ETRM packages, commodities, and role categories
- **30-Day Auto-Expiry**: Jobs automatically expire after 30 days
- **Email-Driven**: Recruiters receive qualified candidates via email

### Key Differentiators
1. **Gate Evaluation**: Candidates must pass hard requirements (gates) before submitting CV
2. **Questionnaire System**: Custom questionnaires with gate rules
3. **ETRM-Specific**: Built-in support for ETRM packages (Endur, Allegro, RightAngle, Trayport), commodities (Power, Gas, LNG, Oil, Emissions), and role categories
4. **No Accounts for Candidates**: Candidates can browse and apply without creating accounts
5. **Recruiter Authentication**: Google SSO for recruiters to manage their postings

---

## Architecture & Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18.2
- **Styling**: Tailwind CSS 3.3
- **Forms**: React Hook Form 7.49
- **Validation**: Zod 3.22
- **Markdown Rendering**: Custom simple markdown parser (supports `**bold**`)

### Backend
- **Runtime**: Node.js
- **API**: Next.js API Routes (App Router)
- **Authentication**: NextAuth.js v5 (beta) with Google OAuth
- **Database ORM**: Prisma 5.7
- **Database**: PostgreSQL (supports Supabase, direct connections, and poolers)

### Storage & Services
- **File Storage**: Configurable (S3, R2, Supabase Storage) - currently using local storage abstraction
- **Email**: Configurable (Postmark, SendGrid, AWS SES) - currently Postmark implemented
- **CAPTCHA**: Cloudflare Turnstile (optional)
- **Rate Limiting**: In-memory rate limiter (production should use Redis)

### Development Tools
- **TypeScript**: 5.x
- **Linting**: ESLint with Next.js config
- **Build Tool**: Next.js built-in (Turbopack in dev mode)

---

## Database Schema

### Core Models

#### User (NextAuth)
```prisma
- id: String (CUID)
- email: String (unique)
- name: String?
- emailVerified: DateTime?
- image: String?
- createdAt, updatedAt: DateTime
- Relations: accounts[], sessions[]
```

#### Job
```prisma
- id: String (CUID)
- slug: String (unique, indexed)
- title: String
- companyName: String?
- locationText: String
- countryCode: String?
- remotePolicy: Enum (ONSITE | HYBRID | REMOTE)
- contractType: Enum (PERM | CONTRACT)
- seniority: Enum (JUNIOR | MID | SENIOR)
- roleCategory: String (BA | DEV | OPS | RISK | TRADING | COMPLIANCE)
- etrmPackages: String[] (array of package names)
- commodityTags: String[] (array of commodity names)
- experienceYearsMin: Int?
- budgetMin, budgetMax: Float?
- budgetCurrency: String?
- budgetPeriod: Enum (ANNUAL | DAY_RATE)?
- budgetIsEstimate: Boolean
- jdText: String (Text, markdown supported)
- recruiterEmailTo: String (indexed)
- recruiterEmailCc: String[]
- emailSubjectPrefix: String?
- createdAt: DateTime
- expiresAt: DateTime (indexed, 30 days from creation)
- status: String (ACTIVE | EXPIRED, indexed)
- Relations: questionnaire?, applicationSessions[], applications[]
```

#### Questionnaire
```prisma
- id: String (CUID)
- jobId: String (unique, foreign key to Job)
- version: Int (default: 1)
- createdAt: DateTime
- Relations: job, questions[], gateRules[]
```

#### Question
```prisma
- id: String (CUID)
- questionnaireId: String (foreign key, indexed with orderIndex)
- key: String (unique identifier for the question)
- label: String (display text)
- type: Enum (BOOLEAN | SINGLE_SELECT | MULTI_SELECT | NUMBER | COUNTRY)
- required: Boolean
- optionsJson: String? (JSON array for select types)
- orderIndex: Int (indexed with questionnaireId)
- Relations: questionnaire
```

#### GateRule
```prisma
- id: String (CUID)
- questionnaireId: String (foreign key, indexed with orderIndex)
- questionKey: String (references Question.key)
- operator: Enum (EQ | GTE | INCLUDES_ANY | INCLUDES_ALL | IN)
- valueJson: String (JSON value for comparison)
- orderIndex: Int (indexed with questionnaireId)
- Relations: questionnaire
```

#### ApplicationSession
```prisma
- id: String (CUID)
- jobId: String (foreign key, indexed)
- questionnaireVersion: Int
- sessionToken: String (unique, indexed, 64-char hex)
- answersJson: String? (JSON object of answers)
- status: Enum (IN_PROGRESS | PASSED | FAILED | ABANDONED)
- createdAt: DateTime
- completedAt: DateTime?
- applicationId: String? (unique, foreign key to Application)
- Relations: job, application?
```

#### Application
```prisma
- id: String (CUID)
- jobId: String (foreign key, indexed)
- candidateName: String
- candidateEmail: String (indexed)
- candidatePhone: String?
- candidateLinkedin: String?
- resumeFileId: String? (foreign key to FileObject)
- answersJson: String (JSON object, same as session)
- recruiterStatus: Enum (PENDING | SHORTLISTED | DISCARDED)
- createdAt: DateTime
- Relations: job, resumeFile?, mailLogs[], session?
```

#### FileObject
```prisma
- id: String (CUID)
- provider: Enum (S3 | R2 | SUPABASE | LOCAL)
- path: String (indexed with provider)
- mimeType: String
- sizeBytes: Int
- checksum: String?
- createdAt: DateTime
- Relations: applications[]
```

#### MailLog
```prisma
- id: String (CUID)
- jobId: String (indexed)
- applicationId: String? (foreign key, indexed)
- toEmail: String
- ccEmails: String[]
- status: Enum (SENT | FAILED)
- providerMessageId: String?
- errorText: String? (Text)
- createdAt: DateTime
- Relations: application?
```

### Database Relationships
- **Job** → **Questionnaire** (1:1)
- **Questionnaire** → **Question** (1:many)
- **Questionnaire** → **GateRule** (1:many)
- **Job** → **ApplicationSession** (1:many)
- **Job** → **Application** (1:many)
- **ApplicationSession** → **Application** (1:1, optional)
- **Application** → **FileObject** (many:1, optional)
- **Application** → **MailLog** (1:many)

---

## Application Flows

### Flow 1: Recruiter Job Posting Flow

1. **Access Post Job Page** (`/post-job`)
   - Requires authentication (Google SSO)
   - Middleware redirects to `/auth/signin` if not authenticated
   - Session email auto-populates recruiter email field

2. **Fill Job Form** (`app/post-job/page.tsx`)
   - **Job Basics**: Title, company, location, remote policy, contract type, experience range
   - **ETRM Details**: Role category, ETRM packages, commodity tags
   - **Budget**: Slider (70k-300k), currency, estimate flag
   - **Job Description**: Textarea with markdown preview (supports `**bold**`)
   - **Minimum Requirements (Gates)**: 
     - Years of experience with specific ETRM packages
     - Language requirements
     - Commodity knowledge
     - Work permit requirements
     - Custom "other" requirements
   - **Email**: Recruiter email (auto-filled from session)

3. **Submit Job** (`POST /api/jobs`)
   - Validates all fields with Zod schema
   - Generates unique slug from title + timestamp
   - Sets `expiresAt` to 30 days from now
   - Creates Job record
   - Creates Questionnaire with Questions and GateRules
   - Returns job URL and expiration date

4. **Success Page** (`/post-job/success`)
   - Shows job URL
   - Shows expiration date
   - Link to recruiter dashboard

### Flow 2: Candidate Job Browsing Flow

1. **Homepage** (`/`)
   - Landing page with two cards:
     - "For Recruiters" → `/post-job`
     - "For Candidates" → `/jobs`
   - Link to dashboards

2. **Browse Jobs** (`/jobs`)
   - **Left Panel**: List of active jobs (title, company, location, remote policy, contract type, days left)
   - **Right Panel**: Selected job details (full description, ETRM packages, commodities, apply button)
   - **Filters**:
     - Remote policy (ONSITE | HYBRID | REMOTE)
     - Contract type (PERM | CONTRACT)
     - Seniority (JUNIOR | MID | SENIOR)
     - Role category (BA | DEV | OPS | RISK | TRADING | COMPLIANCE)
     - ETRM Package (Endur | Allegro | RightAngle | Trayport)
     - Commodity (Power | Gas | LNG | Oil | Emissions)
     - "Near Me" checkbox (uses IP geolocation)

3. **Job Detail** (`/jobs/[slug]`)
   - Full job description with markdown rendering
   - All job metadata
   - "Apply Now" button

4. **Filter Jobs** (`/filter-jobs`)
   - Advanced filtering page (separate from main browse page)
   - Similar filters as browse page

### Flow 3: Candidate Application Flow

1. **Start Application** (`/apply/start/[jobId]`)
   - Candidate clicks "Apply Now" on job detail
   - `POST /api/apply/start` creates ApplicationSession
   - Generates 64-character hex session token
   - Returns questions array (if questionnaire exists) or empty array
   - If no questions, session status is immediately "PASSED"

2. **Answer Questionnaire** (`/apply/start/[jobId]` - same page)
   - **Question Types**:
     - `BOOLEAN`: Radio buttons (Yes/No)
     - `SINGLE_SELECT`: Dropdown
     - `MULTI_SELECT`: Checkboxes
     - `NUMBER`: Number input
     - `COUNTRY`: Text input
   - Progress bar shows completion percentage
   - Previous/Next navigation
   - Answers stored in component state
   - On last question, submits answers

3. **Evaluate Gates** (`POST /api/apply/[session]/evaluate`)
   - Receives answers JSON
   - Loads session and gate rules
   - Calls `evaluateGates()` from `lib/gate-evaluator.ts`
   - **Gate Operators**:
     - `EQ`: Exact match
     - `GTE`: Greater than or equal (for numbers)
     - `INCLUDES_ANY`: Answer array includes any of expected values
     - `INCLUDES_ALL`: Answer array includes all expected values
     - `IN`: Answer is in expected array
   - Updates session status: `PASSED` or `FAILED`
   - Stores answers in `answersJson`
   - Returns `{ passed: boolean, status: string, failedRules: string[] }`

4. **Result Page** (`/apply/[session]/result`)
   - **If PASSED**: 
     - Success message
     - "Continue to Submit CV" button
   - **If FAILED**:
     - Polite decline message
     - Links to filter jobs or browse all jobs
     - No CV collection

5. **Submit CV** (`/apply/[session]/submit`)
   - Only accessible if session status is "PASSED"
   - Form fields:
     - Full Name (required)
     - Email (required, validated)
     - Phone (optional)
     - LinkedIn URL (optional, validated)
     - Resume file (required, PDF/DOCX, max 5MB)
     - Consent checkbox (required)
     - Cloudflare Turnstile CAPTCHA (if configured)
   - File validation: type and size
   - `POST /api/apply/[session]/submit`:
     - Rate limiting check (10 requests per minute per IP)
     - Validates session status is "PASSED"
     - Uploads resume file (creates FileObject record)
     - Creates Application record
     - Links ApplicationSession to Application
     - Sends email to recruiter with:
       - Job details
       - Candidate details
       - Resume as attachment
       - Questionnaire answers in HTML table
     - Creates MailLog record
     - Returns success

6. **Success Page** (`/apply/[session]/success`)
   - Confirmation message
   - Link to browse more jobs

### Flow 4: Recruiter Dashboard Flow

1. **Access Dashboard** (`/dashboard/recruiter`)
   - Requires authentication
   - Shows jobs posted by authenticated user's email
   - `GET /api/dashboard/recruiter`:
     - Finds all jobs where `recruiterEmailTo` matches session email
     - Includes applications with resume file info
     - Includes questionnaire questions for display

2. **View Applications**
   - Each job shows list of applications
   - Application card shows:
     - Candidate name, email, phone
     - Recruiter status badge (PENDING | SHORTLISTED | DISCARDED)
     - Resume download link
     - Email candidate link
     - Expandable section with questionnaire answers
   - Status actions:
     - "Shortlist" button (PENDING → SHORTLISTED)
     - "Discard" button (PENDING → DISCARDED)
   - `PATCH /api/dashboard/recruiter/application` updates status

### Flow 5: Candidate Dashboard Flow

1. **Access Dashboard** (`/dashboard/candidate`)
   - Requires authentication
   - Shows applications submitted by authenticated user's email
   - `GET /api/dashboard/candidate`:
     - Finds all applications where `candidateEmail` matches session email
     - Includes job details
     - Includes resume file info

2. **Profile Management**
   - **CV Upload Section**:
     - Upload/update CV (PDF/DOCX)
     - View current CV link
     - `POST /api/files/upload` uploads file
     - `PATCH /api/dashboard/candidate/update` updates profile with resumeFileId
   
   - **Profile Update Section**:
     - Full Name
     - Phone Number
     - LinkedIn Profile URL
     - `PATCH /api/dashboard/candidate/update` updates profile

3. **View Applications**
   - List of all applications
   - Each card shows:
     - Job title and company
     - Application date
     - Recruiter status badge
     - Link to job
     - Link to CV
     - Expandable questionnaire answers

### Flow 6: Job Expiration Flow

1. **Cron Job** (`POST /api/cron/expire-jobs`)
   - Optional authentication via `CRON_SECRET` header
   - Finds all jobs where `expiresAt <= now` and `status = 'ACTIVE'`
   - Updates status to `'EXPIRED'`
   - Returns count of expired jobs
   - Can be called by Vercel Cron, GitHub Actions, or any cron service

2. **Automatic Filtering**
   - All job listing endpoints filter by:
     - `expiresAt > now`
     - `status = 'ACTIVE'`
   - Expired jobs are not shown to candidates

---

## Screens & Pages

### Public Pages (No Auth Required)

#### `/` - Homepage
- **Purpose**: Landing page with navigation to recruiter/candidate flows
- **Components**: 
  - Two large cards (Recruiters / Candidates)
  - Link to dashboards
- **Styling**: Gradient background, modern card design

#### `/jobs` - Browse Jobs
- **Purpose**: Main job listing page for candidates
- **Layout**: Split view (list + detail)
- **Left Panel**: 
  - Scrollable job list
  - Each item: title, company, location, remote policy, contract type, days left
  - Click to select job
- **Right Panel**:
  - Selected job details
  - Full job description (markdown rendered)
  - ETRM packages and commodities
  - "Apply Now" button
- **Filters Section**:
  - Remote policy dropdown
  - Contract type dropdown
  - Seniority dropdown
  - Role category dropdown
  - ETRM package dropdown
  - Commodity dropdown
  - "Near Me" checkbox (IP geolocation)
- **State Management**: Client-side filtering, URL params for selected job

#### `/jobs/[slug]` - Job Detail Page
- **Purpose**: Standalone job detail page
- **Content**: Same as right panel in `/jobs`
- **API**: `GET /api/public/jobs/[slug]`
- **Features**: Markdown rendering, apply button

#### `/filter-jobs` - Advanced Filter Page
- **Purpose**: Dedicated filtering page
- **Content**: Similar to `/jobs` but focused on filtering

### Protected Pages (Auth Required)

#### `/post-job` - Post Job Page
- **Purpose**: Recruiter job posting form
- **Auth**: Required (Google SSO)
- **Sections**:
  1. Job Basics (title, company, location, remote, contract, experience)
  2. ETRM Details (role, packages, commodities)
  3. Budget (slider, currency, estimate flag)
  4. Job Description (textarea with markdown preview, boilerplate buttons)
  5. Minimum Requirements (gate rules builder)
  6. Email (auto-filled from session)
- **Form Handling**: React Hook Form with Zod validation
- **Submission**: `POST /api/jobs`
- **Success**: Redirects to `/post-job/success?slug=...&expiresAt=...`

#### `/post-job/success` - Post Job Success
- **Purpose**: Confirmation after job creation
- **Content**: Job URL, expiration date, link to dashboard

#### `/dashboard` - Dashboard Hub
- **Purpose**: Navigation to candidate/recruiter dashboards
- **Links**: 
  - `/dashboard/candidate`
  - `/dashboard/recruiter`

#### `/dashboard/recruiter` - Recruiter Dashboard
- **Purpose**: View posted jobs and manage applications
- **Auth**: Required
- **Content**:
  - User info card (name, email, profile picture)
  - Refresh button
  - List of jobs posted by user
  - For each job:
    - Job details
    - Link to job
    - List of applications
    - For each application:
      - Candidate info
      - Status badge
      - Action buttons (Shortlist/Discard)
      - Resume link
      - Email link
      - Expandable questionnaire answers

#### `/dashboard/candidate` - Candidate Dashboard
- **Purpose**: View applications and manage profile
- **Auth**: Required
- **Content**:
  - User info card
  - Refresh button
  - **CV Upload Section**:
    - File input
    - Current CV link
    - Upload success message
  - **Profile Update Section**:
    - Name input
    - Phone input
    - LinkedIn input
    - Update button
    - Update success message
  - **Applications List**:
    - Each application card:
      - Job title and company
      - Application date
      - Status badge
      - Job link
      - CV link
      - Expandable questionnaire answers

### Application Flow Pages

#### `/apply/start/[jobId]` - Questionnaire Page
- **Purpose**: Answer questionnaire questions
- **Flow**: 
  - On mount: `POST /api/apply/start` to create session
  - If no questions: redirect to submit page
  - If questions: show one at a time
- **UI**:
  - Progress bar (question X of Y, percentage)
  - Question label (with required asterisk)
  - Question input (varies by type)
  - Previous/Next buttons
  - On last question: "Submit" button
- **State**: Answers stored in component state, submitted on last question

#### `/apply/[session]/result` - Gate Evaluation Result
- **Purpose**: Show pass/fail result
- **If PASSED**: 
  - Green checkmark
  - "Congratulations!" message
  - "Continue to Submit CV" button → `/apply/[session]/submit`
- **If FAILED**:
  - Sad emoji
  - Polite decline message
  - Links to filter jobs or browse all

#### `/apply/[session]/submit` - CV Submission Page
- **Purpose**: Submit CV and contact details
- **Form Fields**:
  - Full Name (required)
  - Email (required, email validation)
  - Phone (optional)
  - LinkedIn URL (optional, URL validation)
  - Resume file (required, PDF/DOCX, max 5MB)
  - Consent checkbox (required)
  - Cloudflare Turnstile widget (if configured)
- **Validation**: Client-side and server-side
- **Submission**: `POST /api/apply/[session]/submit` (multipart/form-data)
- **Success**: Redirects to `/apply/[session]/success`

#### `/apply/[session]/success` - Application Success
- **Purpose**: Confirmation after successful application
- **Content**: Success message, link to browse more jobs

### Auth Pages

#### `/auth/signin` - Sign In Page
- **Purpose**: Google OAuth sign-in
- **Provider**: NextAuth.js with Google provider
- **Redirect**: After sign-in, redirects to `callbackUrl` or `/dashboard`

---

## API Endpoints

### Public Endpoints (No Auth)

#### `GET /api/public/jobs`
- **Purpose**: List active jobs with optional filters
- **Query Parameters**:
  - `remotePolicy`: ONSITE | HYBRID | REMOTE
  - `contractType`: PERM | CONTRACT
  - `seniority`: JUNIOR | MID | SENIOR
  - `roleCategory`: String
  - `etrmPackage`: String
  - `commodity`: String
  - `nearMe`: 1 (boolean flag)
- **Response**: `{ jobs: JobListItem[], detectedCountry?: string }`
- **Filtering**: 
  - Database filters for enum fields
  - Array contains for ETRM packages and commodities
  - Client-side filtering for "near me" (IP geolocation)
- **Geolocation**: Uses Vercel country header or IP geolocation API

#### `GET /api/public/jobs/[slug]`
- **Purpose**: Get single job detail
- **Response**: `{ job: JobDetail }`
- **Excludes**: `recruiterEmailTo`, `recruiterEmailCc`
- **Validation**: Checks expiration and status

#### `POST /api/apply/start`
- **Purpose**: Start application session
- **Body**: `{ jobId: string }`
- **Response**: `{ sessionToken: string, questions: Question[] }`
- **Creates**: ApplicationSession with status "IN_PROGRESS" (or "PASSED" if no questions)
- **Validation**: Checks job exists and not expired

#### `POST /api/apply/[session]/evaluate`
- **Purpose**: Evaluate questionnaire answers against gate rules
- **Body**: `{ answers: Record<string, any> }`
- **Response**: `{ passed: boolean, status: string, failedRules: string[] }`
- **Logic**: Uses `evaluateGates()` from `lib/gate-evaluator.ts`
- **Updates**: Session status to "PASSED" or "FAILED", stores answers

#### `POST /api/apply/[session]/submit`
- **Purpose**: Submit CV and contact details
- **Body**: `FormData` with:
  - `resume`: File (PDF/DOCX, max 5MB)
  - `candidateName`: string
  - `candidateEmail`: string
  - `candidatePhone`: string (optional)
  - `candidateLinkedin`: string (optional)
  - `consent`: "true"
  - `turnstileToken`: string (optional)
- **Response**: `{ success: boolean, applicationId: string }`
- **Rate Limiting**: 10 requests per minute per IP
- **Validation**: 
  - Session status must be "PASSED"
  - File type and size validation
  - Zod schema validation for form fields
- **Actions**:
  1. Upload resume file (creates FileObject)
  2. Create Application record
  3. Link ApplicationSession to Application
  4. Send email to recruiter (with resume attachment and answers table)
  5. Create MailLog record

#### `GET /api/files/[fileId]`
- **Purpose**: Download file
- **Response**: File stream
- **Note**: Currently returns placeholder (file storage not fully implemented)

#### `POST /api/files/upload`
- **Purpose**: Upload file (used by candidate dashboard)
- **Body**: `FormData` with `file` and `folder`
- **Response**: `{ fileId: string, path: string, url: string }`
- **Note**: Currently creates FileObject record but doesn't store actual file (MVP)

### Protected Endpoints (Auth Required)

#### `POST /api/jobs`
- **Purpose**: Create new job posting
- **Auth**: Required (session email used as recruiterEmailTo)
- **Body**: Full job schema (see Zod schema in route)
- **Response**: `{ success: boolean, job: { id, slug, url, expiresAt } }`
- **Creates**: Job, Questionnaire, Questions, GateRules
- **Slug Generation**: Uses `generateSlug()` from `lib/utils.ts` (title + timestamp)

#### `GET /api/dashboard/recruiter`
- **Purpose**: Get recruiter's jobs and applications
- **Auth**: Required
- **Response**: `{ jobs: JobItem[] }`
- **Filters**: Jobs where `recruiterEmailTo` matches session email
- **Includes**: Applications with resume file info and questionnaire questions

#### `PATCH /api/dashboard/recruiter/application`
- **Purpose**: Update application status
- **Auth**: Required
- **Body**: `{ applicationId: string, status: 'SHORTLISTED' | 'DISCARDED' }`
- **Response**: `{ success: boolean }`

#### `GET /api/dashboard/candidate`
- **Purpose**: Get candidate's applications
- **Auth**: Required
- **Response**: `{ applications: AppItem[] }`
- **Filters**: Applications where `candidateEmail` matches session email
- **Includes**: Job details and resume file info

#### `PATCH /api/dashboard/candidate/update`
- **Purpose**: Update candidate profile
- **Auth**: Required
- **Body**: `{ name?: string, phone?: string, linkedin?: string, resumeFileId?: string }`
- **Response**: `{ success: boolean }`
- **Updates**: All applications for candidate email (name, phone, linkedin, resumeFileId)

### Auth Endpoints (NextAuth)

#### `GET/POST /api/auth/[...nextauth]`
- **Purpose**: NextAuth.js handlers
- **Providers**: Google OAuth
- **Adapter**: PrismaAdapter
- **Callbacks**: Adds user.id to session

### Cron Endpoints

#### `POST /api/cron/expire-jobs`
- **Purpose**: Mark expired jobs
- **Auth**: Optional (Bearer token with CRON_SECRET)
- **Response**: `{ success: boolean, expired: number }`
- **Logic**: Updates jobs where `expiresAt <= now` and `status = 'ACTIVE'` to `status = 'EXPIRED'`

---

## Key Features

### 1. Gate System
- **Purpose**: Enforce hard requirements before CV collection
- **Implementation**: `lib/gate-evaluator.ts`
- **Operators**:
  - `EQ`: Exact match (for booleans, strings)
  - `GTE`: Greater than or equal (for numbers, e.g., years of experience)
  - `INCLUDES_ANY`: Answer array includes any of expected values (e.g., languages)
  - `INCLUDES_ALL`: Answer array includes all expected values
  - `IN`: Answer is in expected array
- **Flow**: 
  1. Candidate answers questionnaire
  2. Answers evaluated against all gate rules
  3. If any rule fails → status "FAILED", no CV collection
  4. If all rules pass → status "PASSED", proceed to CV submission

### 2. Questionnaire Builder
- **Dynamic Questions**: Recruiters can add questions when posting jobs
- **Question Types**:
  - `BOOLEAN`: Yes/No questions
  - `SINGLE_SELECT`: Dropdown with options
  - `MULTI_SELECT`: Checkboxes with multiple options
  - `NUMBER`: Numeric input (for years of experience, etc.)
  - `COUNTRY`: Text input for country name
- **Gate Rule Mapping**: Questions automatically generated from gate rules in post-job form
- **Ordering**: Questions and gate rules have `orderIndex` for display order

### 3. ETRM-Specific Fields
- **ETRM Packages**: Array field for packages (Endur, Allegro, RightAngle, Trayport, Other)
- **Commodity Tags**: Array field for commodities (Power, Gas, LNG, Oil, Emissions, etc.)
- **Role Categories**: BA, DEV, OPS, RISK, TRADING, COMPLIANCE
- **Boilerplate Job Descriptions**: Pre-written templates for common ETRM roles

### 4. Email Notifications
- **Provider**: Configurable (Postmark implemented, SendGrid/SES stubs)
- **Implementation**: `lib/email.ts`
- **Content**: HTML email with:
  - Job details (title, location, ETRM packages, link)
  - Candidate details (name, email, phone, LinkedIn)
  - Resume as attachment
  - Questionnaire answers in HTML table
- **Logging**: All emails logged in MailLog table
- **Subject**: Customizable prefix + job title + candidate name + location

### 5. File Storage Abstraction
- **Provider**: Configurable (S3, R2, Supabase Storage)
- **Implementation**: `lib/storage.ts`
- **Current State**: MVP uses local storage (FileObject record only, actual file not stored)
- **File Types**: PDF, DOC, DOCX
- **Size Limit**: 5MB
- **Validation**: MIME type and extension checking

### 6. Rate Limiting
- **Implementation**: `lib/rate-limit.ts`
- **Type**: In-memory (production should use Redis)
- **Default**: 10 requests per minute per IP
- **Configurable**: `RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_MS`
- **Usage**: Applied to `/api/apply/[session]/submit`

### 7. Geolocation Filtering
- **Implementation**: `lib/geo.ts`
- **Sources**: 
  1. Vercel country header (`x-vercel-ip-country`)
  2. IP geolocation API (fallback)
- **Usage**: "Near Me" filter on job listings
- **Matching**: Country code and country name matching

### 8. Markdown Rendering
- **Implementation**: `lib/markdown.ts`
- **Support**: Only `**text**` for bold (simple markdown)
- **Security**: HTML escaping to prevent XSS
- **Usage**: Job descriptions

### 9. Auto-Expiry
- **Duration**: 30 days from creation
- **Field**: `expiresAt` on Job model
- **Status**: Jobs marked as "EXPIRED" (via cron or automatic filtering)
- **Filtering**: All job queries filter by `expiresAt > now` and `status = 'ACTIVE'`

### 10. Session-Based Application Flow
- **Stateless**: No account required for candidates
- **Session Token**: 64-character hex string (randomBytes)
- **Storage**: ApplicationSession table
- **Flow**: Start → Answer → Evaluate → Submit → Success
- **State**: IN_PROGRESS → PASSED/FAILED → Application created

---

## Technical Implementation Details

### Authentication
- **Provider**: NextAuth.js v5 (beta)
- **OAuth**: Google OAuth 2.0
- **Adapter**: PrismaAdapter (stores users, accounts, sessions in database)
- **Session Strategy**: JWT (default for NextAuth v5)
- **Middleware**: `middleware.ts` protects `/dashboard/*` and `/post-job/*` routes
- **Session Access**: `auth()` function from `lib/auth.ts` (server-side), `useSession()` hook (client-side)

### Database Connection
- **ORM**: Prisma 5.7
- **Provider**: PostgreSQL
- **Connection Handling**: `lib/prisma.ts`
  - Supports pooler URLs (Supabase)
  - Supports direct URLs
  - Auto-converts pooler to direct if `USE_DIRECT_CONNECTION=true`
  - Singleton pattern for PrismaClient
- **Migrations**: Prisma migrations (not db push in production)

### Form Handling
- **Library**: React Hook Form 7.49
- **Validation**: Zod 3.22
- **Pattern**: 
  1. Define Zod schema
  2. Use `useForm()` with schema
  3. Register fields with `{...register('fieldName')}`
  4. Validate on submit with `handleSubmit()`

### State Management
- **Client State**: React `useState`, `useEffect`
- **Server State**: Direct API calls (no React Query/SWR)
- **Session State**: NextAuth session (server and client)

### Error Handling
- **API Routes**: Try-catch with detailed error messages
- **Client**: Alert dialogs for errors
- **Validation**: Zod schema validation with detailed error responses
- **Database Errors**: Prisma error handling (connection, unique constraints, etc.)

### File Upload
- **Format**: multipart/form-data
- **Validation**: 
  - MIME type checking
  - Extension checking
  - Size limit (5MB)
- **Storage**: Currently creates FileObject record only (MVP)
- **Future**: Implement actual file storage (S3/R2/Supabase)

### Email Sending
- **Provider**: Postmark (implemented)
- **Format**: HTML email with attachments
- **Attachments**: Resume file as Buffer
- **Error Handling**: Logs failures in MailLog table
- **Retry**: Not implemented (single attempt)

### Slug Generation
- **Library**: `slugify` npm package
- **Function**: `generateSlug()` in `lib/utils.ts`
- **Format**: `slugify(title) + '-' + timestamp36`
- **Uniqueness**: Timestamp ensures uniqueness

### Date Handling
- **Expiration**: `expiresAt` set to `now + 30 days`
- **Display**: `daysLeftToApply()` function formats expiration (e.g., "5 days left to apply")
- **Filtering**: All queries use `expiresAt > now` for active jobs

### CAPTCHA
- **Provider**: Cloudflare Turnstile
- **Implementation**: Client-side widget, token sent to server
- **Optional**: Only required if `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set
- **Usage**: `/apply/[session]/submit` page

---

## Environment Variables

### Required
```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
DIRECT_URL="postgresql://user:password@host:5432/database?schema=public"  # Optional, for Supabase pooler issues

# NextAuth
AUTH_SECRET="your-secret-key"  # Or NEXTAUTH_SECRET for v4 compatibility
AUTH_URL="http://localhost:3000"  # Or your production URL
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # Or your production URL
```

### Optional
```bash
# Email (Postmark)
EMAIL_PROVIDER="POSTMARK"  # Default: POSTMARK
POSTMARK_API_KEY="your-postmark-api-key"
POSTMARK_FROM_EMAIL="noreply@yourdomain.com"

# Storage (not fully implemented)
STORAGE_PROVIDER="SUPABASE"  # Default: SUPABASE
# S3/R2/Supabase credentials would go here

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS="10"  # Default: 10
RATE_LIMIT_WINDOW_MS="60000"  # Default: 60000 (1 minute)

# CAPTCHA
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your-turnstile-site-key"

# Cron
CRON_SECRET="your-cron-secret"  # For protecting cron endpoint

# Database Connection
USE_DIRECT_CONNECTION="true"  # Use direct URL instead of pooler (Supabase)
```

---

## File Structure

```
Curated Job Engine/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── apply/                # Application flow endpoints
│   │   │   ├── start/            # POST: Start application session
│   │   │   └── [session]/        # Session-specific endpoints
│   │   │       ├── evaluate/     # POST: Evaluate gates
│   │   │       └── submit/       # POST: Submit CV
│   │   ├── auth/                 # NextAuth endpoints
│   │   │   └── [...nextauth]/    # NextAuth handler
│   │   ├── cron/                 # Cron jobs
│   │   │   └── expire-jobs/      # POST: Mark expired jobs
│   │   ├── dashboard/            # Dashboard endpoints
│   │   │   ├── candidate/        # GET: Candidate applications, PATCH: Update profile
│   │   │   └── recruiter/        # GET: Recruiter jobs, PATCH: Update application status
│   │   ├── files/                # File endpoints
│   │   │   ├── [fileId]/         # GET: Download file
│   │   │   └── upload/            # POST: Upload file
│   │   ├── jobs/                 # Job endpoints
│   │   │   └── route.ts          # POST: Create job
│   │   └── public/               # Public endpoints
│   │       └── jobs/             # GET: List jobs, GET [slug]: Job detail
│   ├── apply/                    # Application flow pages
│   │   └── [session]/            # Session-specific pages
│   │       ├── result/           # Gate evaluation result
│   │       ├── submit/          # CV submission form
│   │       └── success/         # Application success
│   ├── auth/                     # Auth pages
│   │   └── signin/               # Sign-in page
│   ├── dashboard/                # Dashboard pages
│   │   ├── candidate/           # Candidate dashboard
│   │   ├── recruiter/           # Recruiter dashboard
│   │   └── page.tsx              # Dashboard hub
│   ├── jobs/                     # Job browsing pages
│   │   ├── [slug]/              # Job detail page
│   │   └── page.tsx             # Browse jobs page
│   ├── post-job/                 # Job posting pages
│   │   ├── success/             # Post job success
│   │   └── page.tsx             # Post job form
│   ├── components/               # React components
│   │   ├── Nav.tsx              # Navigation component
│   │   └── SessionProvider.tsx  # NextAuth session provider
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                 # Homepage
│   └── globals.css              # Global styles
├── lib/                          # Utility libraries
│   ├── auth.ts                  # NextAuth configuration
│   ├── email.ts                 # Email sending abstraction
│   ├── gate-evaluator.ts        # Gate rule evaluation logic
│   ├── geo.ts                   # Geolocation utilities
│   ├── markdown.ts              # Markdown rendering
│   ├── prisma.ts                # Prisma client singleton
│   ├── rate-limit.ts            # Rate limiting
│   ├── storage.ts               # File storage abstraction
│   └── utils.ts                 # General utilities
├── prisma/                       # Prisma files
│   ├── schema.prisma            # Database schema
│   ├── add-nextauth-columns.sql # Migration SQL (NextAuth)
│   └── supabase-init.sql        # Supabase initialization SQL
├── scripts/                      # Utility scripts
│   ├── apply-nextauth-migration.ts
│   ├── fix-pooler-issue.ts
│   ├── migrate-db.ts
│   ├── seed-jobs.ts
│   └── setup-database.ts
├── middleware.ts                 # Next.js middleware (auth protection)
├── next.config.js                # Next.js configuration
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind CSS configuration
└── README.md                     # Project README
```

---

## Deployment & Setup

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Database**
   - Create PostgreSQL database
   - Set `DATABASE_URL` in `.env`
   - Run migrations:
     ```bash
     npx prisma generate
     npx prisma db push
     ```

3. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Fill in all required variables

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Access Application**
   - Open `http://localhost:3000`

### Production Deployment

1. **Database Setup**
   - Set up PostgreSQL (Supabase, AWS RDS, etc.)
   - Run migrations: `npx prisma migrate deploy`

2. **Environment Variables**
   - Set all required environment variables in hosting platform
   - Ensure `NEXT_PUBLIC_APP_URL` points to production URL

3. **Build**
   ```bash
   npm run build
   ```

4. **Start**
   ```bash
   npm start
   ```

5. **Cron Job**
   - Set up cron to call `/api/cron/expire-jobs` daily
   - Use `CRON_SECRET` for authentication

### Database Migrations

- **Development**: `npx prisma db push` (for rapid iteration)
- **Production**: `npx prisma migrate deploy` (for versioned migrations)

### File Storage Setup

Currently, file storage is not fully implemented (MVP creates FileObject records only). To implement:

1. Choose provider (S3, R2, Supabase Storage)
2. Implement upload function in `lib/storage.ts`
3. Implement download function in `app/api/files/[fileId]/route.ts`
4. Set `STORAGE_PROVIDER` environment variable

### Email Setup

1. Choose provider (Postmark recommended)
2. Get API key
3. Set `POSTMARK_API_KEY` and `POSTMARK_FROM_EMAIL`
4. Verify sender domain in Postmark

### Google OAuth Setup

1. Create OAuth 2.0 credentials in Google Cloud Console
2. Set authorized redirect URI: `{AUTH_URL}/api/auth/callback/google`
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

---

## Additional Notes

### Security Considerations
- **XSS Prevention**: HTML escaping in markdown rendering
- **SQL Injection**: Prisma ORM prevents SQL injection
- **Rate Limiting**: Applied to CV submission endpoint
- **File Validation**: MIME type and size validation
- **CAPTCHA**: Optional Cloudflare Turnstile for spam prevention
- **Auth**: NextAuth.js handles OAuth securely

### Performance Considerations
- **Database Indexes**: Slug, expiresAt, status, recruiterEmailTo, candidateEmail indexed
- **Caching**: No caching implemented (all queries are dynamic)
- **File Storage**: Not implemented (MVP)
- **Rate Limiting**: In-memory (should use Redis in production)

### Future Enhancements
- Full file storage implementation (S3/R2/Supabase)
- SendGrid and AWS SES email providers
- Redis-based rate limiting
- Job search/filtering improvements
- Candidate profile persistence
- Application status notifications
- Analytics dashboard
- Bulk job posting
- Job templates

---

## Conclusion

This documentation provides a comprehensive overview of the Curated Job Engine project, including architecture, flows, screens, API endpoints, and technical details. The system is designed as a lightweight, ETRM-focused job posting platform with a gate-based screening system that ensures only qualified candidates reach recruiters.

For questions or contributions, refer to the codebase and this documentation.
