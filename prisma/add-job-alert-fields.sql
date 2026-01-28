-- Add job alert policy agreement fields to users table
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "job_alert_policy_agreed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "job_alert_policy_agreed_at" TIMESTAMP(3);

-- Create job_alert_subscriptions table
CREATE TABLE IF NOT EXISTS "job_alert_subscriptions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_alert_subscriptions_pkey" PRIMARY KEY ("id")
);

-- Create unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS "job_alert_subscriptions_email_key" ON "job_alert_subscriptions"("email");

-- Create indexes
CREATE INDEX IF NOT EXISTS "job_alert_subscriptions_email_idx" ON "job_alert_subscriptions"("email");
CREATE INDEX IF NOT EXISTS "job_alert_subscriptions_is_active_idx" ON "job_alert_subscriptions"("is_active");
