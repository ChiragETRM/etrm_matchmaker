-- Add last login audit fields to users
-- Run with: npx prisma db push (preferred) or execute this SQL manually

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_ip" TEXT;
