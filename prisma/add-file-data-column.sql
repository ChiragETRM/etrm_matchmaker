-- Add data column to file_objects table for LOCAL storage mode
-- This allows files to be stored as base64-encoded text in the database

ALTER TABLE file_objects 
ADD COLUMN IF NOT EXISTS data TEXT;

-- Add comment to document the column
COMMENT ON COLUMN file_objects.data IS 'Base64 encoded file data for LOCAL provider';
