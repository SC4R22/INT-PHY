-- ============================================================
-- USEFUL SUPABASE QUERIES
-- Copy and paste these into Supabase SQL Editor
-- https://app.supabase.com/project/vrefcmplibzoayfyfidd/sql/new
-- ============================================================

-- ============================================================
-- CHECK ALL USERS
-- ============================================================

-- See all users with their profile info
SELECT 
  up.full_name,
  up.phone_number,
  up.role,
  up.parent_name,
  up.parent_phone_number,
  au.email,
  au.created_at,
  au.last_sign_in_at,
  au.email_confirmed_at
FROM public.user_profiles up
JOIN auth.users au ON au.id = up.id
ORDER BY au.created_at DESC;


-- ============================================================
-- CHECK RECENT SIGNUPS
-- ============================================================

-- See users who signed up in the last 24 hours
SELECT 
  up.full_name,
  up.phone_number,
  up.role,
  au.created_at
FROM public.user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE au.created_at > NOW() - INTERVAL '24 hours'
ORDER BY au.created_at DESC;


-- ============================================================
-- MAKE SOMEONE AN ADMIN
-- ============================================================

-- Replace the phone number with the user you want to make admin
UPDATE public.user_profiles
SET role = 'admin'
WHERE phone_number = '01115291000';

-- Verify it worked
SELECT full_name, phone_number, role
FROM public.user_profiles
WHERE phone_number = '01115291000';


-- ============================================================
-- MAKE SOMEONE A TEACHER
-- ============================================================

UPDATE public.user_profiles
SET role = 'teacher'
WHERE phone_number = 'PHONE_NUMBER_HERE';


-- ============================================================
-- CHANGE SOMEONE BACK TO STUDENT
-- ============================================================

UPDATE public.user_profiles
SET role = 'student'
WHERE phone_number = 'PHONE_NUMBER_HERE';


-- ============================================================
-- COUNT USERS BY ROLE
-- ============================================================

SELECT 
  role,
  COUNT(*) as user_count
FROM public.user_profiles
GROUP BY role
ORDER BY user_count DESC;


-- ============================================================
-- FIND USER BY PHONE
-- ============================================================

SELECT 
  up.*,
  au.email,
  au.created_at,
  au.last_sign_in_at
FROM public.user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE up.phone_number = 'PHONE_NUMBER_HERE';


-- ============================================================
-- DELETE A USER (BE CAREFUL!)
-- ============================================================

-- This will delete from both auth.users and user_profiles
-- due to CASCADE delete
DELETE FROM auth.users
WHERE email = 'PHONE_NUMBER@intphy.app';

-- Example: Delete user with phone 01115291000
-- DELETE FROM auth.users WHERE email = '01115291000@intphy.app';


-- ============================================================
-- CHECK EMAIL CONFIRMATION STATUS
-- ============================================================

SELECT 
  email,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'Confirmed'
    ELSE 'Not Confirmed'
  END as status
FROM auth.users
ORDER BY created_at DESC;


-- ============================================================
-- CHECK COURSES (When you create them)
-- ============================================================

SELECT 
  c.id,
  c.title,
  c.description,
  c.published,
  c.price_cash,
  up.full_name as teacher_name,
  c.created_at
FROM public.courses c
JOIN public.user_profiles up ON up.id = c.teacher_id
ORDER BY c.created_at DESC;


-- ============================================================
-- CHECK ENROLLMENTS (When students enroll)
-- ============================================================

SELECT 
  up.full_name as student_name,
  up.phone_number,
  c.title as course_title,
  e.enrolled_at
FROM public.enrollments e
JOIN public.user_profiles up ON up.id = e.user_id
JOIN public.courses c ON c.id = e.course_id
ORDER BY e.enrolled_at DESC;


-- ============================================================
-- CHECK ACCESS CODES (When admin creates them)
-- ============================================================

SELECT 
  ac.code,
  c.title as course_title,
  ac.is_used,
  ac.used_by,
  ac.created_at,
  ac.expires_at,
  CASE 
    WHEN ac.is_used THEN 'Used'
    WHEN ac.expires_at IS NOT NULL AND ac.expires_at < NOW() THEN 'Expired'
    ELSE 'Available'
  END as status
FROM public.access_codes ac
JOIN public.courses c ON c.id = ac.course_id
ORDER BY ac.created_at DESC;


-- ============================================================
-- RESET EMAIL CONFIRMATION (If needed)
-- ============================================================

-- Auto-confirm all emails
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;


-- ============================================================
-- VIEW USER ACTIVITY (Recent logins)
-- ============================================================

SELECT 
  up.full_name,
  up.phone_number,
  au.last_sign_in_at,
  EXTRACT(EPOCH FROM (NOW() - au.last_sign_in_at))/3600 as hours_since_login
FROM public.user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE au.last_sign_in_at IS NOT NULL
ORDER BY au.last_sign_in_at DESC
LIMIT 20;


-- ============================================================
-- DATABASE STATISTICS
-- ============================================================

SELECT 
  'Users' as table_name,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'User Profiles',
  COUNT(*)
FROM public.user_profiles
UNION ALL
SELECT 
  'Courses',
  COUNT(*)
FROM public.courses
UNION ALL
SELECT 
  'Enrollments',
  COUNT(*)
FROM public.enrollments
UNION ALL
SELECT 
  'Access Codes',
  COUNT(*)
FROM public.access_codes;
