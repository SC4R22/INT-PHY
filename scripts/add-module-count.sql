-- Run this once in your Supabase SQL editor
ALTER TABLE courses ADD COLUMN IF NOT EXISTS module_count integer DEFAULT NULL;
