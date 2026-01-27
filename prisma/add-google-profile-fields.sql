-- Add Google profile fields to users table
-- This migration adds additional fields to store comprehensive Google profile data

-- Add given_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'given_name'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "given_name" TEXT;
    END IF;
END $$;

-- Add family_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'family_name'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "family_name" TEXT;
    END IF;
END $$;

-- Add locale column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'locale'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "locale" TEXT;
    END IF;
END $$;

-- Add google_sub column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'google_sub'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "google_sub" TEXT;
    END IF;
END $$;

-- Add profile_data column if it doesn't exist (stores complete profile as JSON)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_data'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "profile_data" TEXT;
    END IF;
END $$;

-- Create index on google_sub for faster lookups
CREATE INDEX IF NOT EXISTS "users_google_sub_idx" ON "users"("google_sub");

-- Add comments to document the columns
COMMENT ON COLUMN "users"."given_name" IS 'User''s first name from Google profile';
COMMENT ON COLUMN "users"."family_name" IS 'User''s last name from Google profile';
COMMENT ON COLUMN "users"."locale" IS 'User''s locale/language preference from Google';
COMMENT ON COLUMN "users"."google_sub" IS 'Google''s unique identifier (sub) for the user';
COMMENT ON COLUMN "users"."profile_data" IS 'Complete Google profile data stored as JSON string';
