-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Creates all tables required by the Curated Job Engine app

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company_name" TEXT,
    "location_text" TEXT NOT NULL,
    "country_code" TEXT,
    "remote_policy" TEXT NOT NULL,
    "contract_type" TEXT NOT NULL,
    "seniority" TEXT NOT NULL,
    "role_category" TEXT NOT NULL,
    "etrm_packages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "commodity_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experience_years_min" INTEGER,
    "budget_min" DOUBLE PRECISION,
    "budget_max" DOUBLE PRECISION,
    "budget_currency" TEXT,
    "budget_period" TEXT,
    "budget_is_estimate" BOOLEAN NOT NULL DEFAULT false,
    "jd_text" TEXT NOT NULL,
    "recruiter_email_to" TEXT NOT NULL,
    "recruiter_email_cc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "email_subject_prefix" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaires" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "questionnaire_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options_json" TEXT,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_rules" (
    "id" TEXT NOT NULL,
    "questionnaire_id" TEXT NOT NULL,
    "question_key" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value_json" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "gate_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_sessions" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "questionnaire_version" INTEGER NOT NULL,
    "session_token" TEXT NOT NULL,
    "answers_json" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "application_id" TEXT,

    CONSTRAINT "application_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "candidate_name" TEXT NOT NULL,
    "candidate_email" TEXT NOT NULL,
    "candidate_phone" TEXT,
    "candidate_linkedin" TEXT,
    "resume_file_id" TEXT,
    "answers_json" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_objects" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_logs" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "application_id" TEXT,
    "to_email" TEXT NOT NULL,
    "cc_emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "error_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_slug_key" ON "jobs"("slug");
CREATE INDEX "jobs_slug_idx" ON "jobs"("slug");
CREATE INDEX "jobs_expires_at_idx" ON "jobs"("expires_at");
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

CREATE UNIQUE INDEX "questionnaires_job_id_key" ON "questionnaires"("job_id");
CREATE INDEX "questions_questionnaire_id_order_index_idx" ON "questions"("questionnaire_id", "order_index");
CREATE INDEX "gate_rules_questionnaire_id_order_index_idx" ON "gate_rules"("questionnaire_id", "order_index");

CREATE UNIQUE INDEX "application_sessions_session_token_key" ON "application_sessions"("session_token");
CREATE UNIQUE INDEX "application_sessions_application_id_key" ON "application_sessions"("application_id");
CREATE INDEX "application_sessions_session_token_idx" ON "application_sessions"("session_token");
CREATE INDEX "application_sessions_job_id_idx" ON "application_sessions"("job_id");

CREATE INDEX "applications_job_id_idx" ON "applications"("job_id");
CREATE INDEX "file_objects_provider_path_idx" ON "file_objects"("provider", "path");
CREATE INDEX "mail_logs_job_id_idx" ON "mail_logs"("job_id");
CREATE INDEX "mail_logs_application_id_idx" ON "mail_logs"("application_id");

-- AddForeignKey
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gate_rules" ADD CONSTRAINT "gate_rules_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_sessions" ADD CONSTRAINT "application_sessions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_sessions" ADD CONSTRAINT "application_sessions_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_file_id_fkey" FOREIGN KEY ("resume_file_id") REFERENCES "file_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mail_logs" ADD CONSTRAINT "mail_logs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
