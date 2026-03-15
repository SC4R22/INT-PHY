# منصة المبدع — دليل الأعوان الكامل
# Al-Mubdi' Platform — Complete Agent Reference

> **للعامل الجديد:** اقرأ هذا الملف بالكامل قبل لمس أي كود. يصف الحالة الفعلية للمنصة كما هي الآن.
> **For new agents:** Read this entire file before touching any code. Describes the actual current state.

---

## 1. نظرة عامة على المشروع / Project Overview

منصة تعليم إلكتروني عربية للأستاذ أحمد بدوي (مدرس لغة عربية). الطلاب يشترون أكواد وصول نقدًا ثم يستخدمونها للتسجيل في الكورسات.

Arabic e-learning platform for teacher Ahmed Badawi. Students purchase access codes in cash then use them to enroll in courses.

**URL:** `https://int-phy.vercel.app`  
**Supabase Project:** `vrefcmplibzoayfyfidd` (region: eu-west-1)

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Auth + DB | Supabase (PostgreSQL + RLS) |
| Video | YouTube embed (custom player, no branding) + Mux (paid uploads) |
| Storage | Supabase Storage (`exam-images`, `module-files`, `course-thumbnails`) |
| Styling | Tailwind CSS + CSS variables (dark/light mode) |
| Fonts | Cairo, Tajawal, Rakkas (Arabic), custom `font-payback` for headers |
| Direction | RTL throughout |
| Mobile App | Expo (React Native) — admin management app |
| Deployment | Vercel (website), Expo Go / standalone APK (app) |

---

## 3. الحالة الحالية للمشروع / Current Project State

### ✅ مبني وشغال / Built and Working

**Authentication**
- Phone-number → email conversion (`01012345678` → `01012345678@intphy.app`)
- Sign up with grade, parent info, role defaults to `student`
- Roles: `student`, `teacher`, `admin`
- Ban system: banned users are signed out immediately at dashboard layout level

**Public Pages**
- `/` — Landing page
- `/courses` — Course listing with search, grade filtering, **enrolled courses hidden from student view**
- `/courses/[id]` — Course detail with access code redemption modal
- `/about` — About page

**Student Dashboard (`/dashboard`)**
- Continue watching widget (last watched/incomplete video)
- Course progress cards with % completion
- Quick links: تسليم الواجبات (`/dashboard/assignments`), الامتحانات (`/dashboard/exams`)
- Completed courses section (green border)
- Expired/deleted courses section (locked)

**Student Learning**
- `/dashboard/courses/[id]` — Course page with module/video list
- `/dashboard/watch/[videoId]` — Video player (YouTube custom embed or Mux)
  - Progress saved to `user_progress` (last position, completion)
  - Quiz inline during video (collapsible)
- `/dashboard/quiz/[quizId]` — Standalone quiz page with review mode
- `/dashboard/exam/[examId]` — Exam page with `?type=homework` param for homework mode
- `/dashboard/standalone-exam/[examId]` — Standalone (non-course) exam page
- `/dashboard/assignments` — Lists homework modules from enrolled courses
- `/dashboard/exams` — Lists published standalone exams (all students)

**Admin Panel (`/admin`)**
- Protected: only `admin` or `teacher` role
- `/admin` — Dashboard with stats (students, courses, enrollments, active last 7d)
- `/admin/courses` — Course list
- `/admin/courses/new` — Create course
- `/admin/courses/[id]/edit` — Edit course details, thumbnail
- `/admin/courses/[id]/content` — Manage modules:
  - **Lesson modules**: videos (YouTube/URL/Mux) + files + quizzes
  - **Exam modules**: MCQ questions (image or text) with solution keys
  - **Homework modules**: same as exam, shown in `/dashboard/assignments`
- `/admin/courses/[id]/stats` — Course analytics (enrollment, video views, quiz/exam scores)
- `/admin/codes` — Generate, filter, mark, share, delete access codes
- `/admin/students` — Student list with enrollment data
- `/admin/users` — All users, ban/unban, delete, password reset via Edge Function
- `/admin/standalone-exams` — Create/publish/manage standalone exams with questions

**Expo Mobile App (`C:\Users\yusuf\Desktop\management`)**
- Tabs: 📚 كورسات / 🎓 طلاب / 📋 امتحانات / 🎟️ أكواد / ⚙️ مستخدمين
- Full admin capabilities: manage courses, view student profiles, generate codes, reset passwords
- Quiz/exam rankings per item (sorted by score, medal system)
- Standalone exam stats
- Tapping a student → `UserDetailScreen` (full profile, courses, quizzes, exams)

---

## 4. Database Schema (Current — All Tables)

```
user_profiles          id, full_name, parent_name, phone_number, parent_phone_number,
                       role (student/teacher/admin), grade, is_banned, email, created_at

courses                id, title, description, thumbnail_url, teacher_id, price_cash,
                       is_free, published, target_grade, created_at, deleted_at

modules                id, course_id, title, order_index,
                       module_type (lesson/exam/homework)

videos                 id, module_id, title, video_url, mux_asset_id, mux_playback_id,
                       duration, order_index, is_preview

module_files           id, module_id, name, file_url, file_size, file_type, order_index

quizzes                id, module_id, title, order_index
quiz_questions         id, quiz_id, question_text, option_a/b/c/d, correct (a/b/c/d),
                       solution, order_index

module_exams           id, module_id (unique), title
exam_question_items    id, exam_id, image_url, question_text, option_a/b/c/d,
                       correct, solution, order_index

enrollments            id, user_id, course_id, enrolled_at, completed, progress_percentage

user_progress          id, user_id, video_id, completed, last_position, last_watched_at

quiz_submissions       id, user_id, quiz_id, answers (jsonb), score, total, submitted_at
                       UNIQUE(user_id, quiz_id)

module_exam_submissions id, user_id, exam_id, answers (jsonb), score, total, submitted_at
                       UNIQUE(user_id, exam_id)

access_codes           id, code, course_id, is_used, used_by, used_at, created_by,
                       created_at, expires_at, notes, is_marked

standalone_exams       id, title, description, published, created_by, created_at
standalone_exam_questions  id, exam_id, image_url, question_text, option_a/b/c/d,
                           correct, solution, order_index
standalone_exam_submissions id, user_id, exam_id, answers (jsonb), score, total, submitted_at
                            UNIQUE(user_id, exam_id)

course_analytics       VIEW: course_id, total_enrollments (used by admin dashboard)
user_bans              id, user_id, banned_by, ban_reason, banned_at, is_active
```

**Key Relationships:**
- `modules` → homework/exam type → creates a `module_exams` row (shared table)
- `module_exams` submissions use `module_exam_submissions` for BOTH exam AND homework modules
- Homework distinction is only in `modules.module_type = 'homework'`; the exam infra is identical

---

## 5. API Routes

```
POST /api/auth/signout             Sign out (form action)
GET  /api/enroll                   Check enrollment status
POST /api/enroll                   Redeem access code + enroll

GET  /api/quiz?quizId=&getQuestions=1     Fetch quiz questions (no correct answers)
GET  /api/quiz?quizId=             Fetch existing submission
POST /api/quiz                     Submit quiz, returns score+correct+solutions

GET  /api/exam?examId=&getQuestions=1    Fetch exam questions
GET  /api/exam?examId=             Fetch existing submission
GET  /api/exam?examId=&getCorrect=1      Get correct answers (only if already submitted)
POST /api/exam                     Submit exam

GET  /api/standalone-exam?examId=&getQuestions=1
GET  /api/standalone-exam?examId=
GET  /api/standalone-exam?examId=&getCorrect=1
POST /api/standalone-exam

GET  /api/assignments              List homework modules for enrolled courses (student)

GET  /api/videos?moduleId=         List videos for a module (used by watch page)
POST /api/videos/progress          Save video progress (last_position, completed)

GET  /api/admin/courses            List all courses
POST /api/admin/courses            Create course
GET  /api/admin/courses/[id]/content    Fetch course + modules + videos + quizzes + exams
POST /api/admin/courses/[id]/content    Actions: addModule, deleteModule, addVideo,
                                        deleteVideo, addFile, deleteFile, addQuiz,
                                        deleteQuiz, updateQuizQuestion, addExamQuestion,
                                        updateExamQuestion, deleteExamQuestion
POST /api/admin/courses/[id]/upload           Upload module files
POST /api/admin/courses/[id]/upload-exam-image Upload exam question images
POST /api/admin/courses/exam-image-upload      Shared image upload (standalone exams)

GET  /api/admin/courses/[id]/stats    Course stats via Edge Function
GET  /api/admin/codes              List access codes
POST /api/admin/codes              Generate/delete codes
GET  /api/admin/users              List users
PATCH /api/admin/users/[id]        Update user (ban, role)
DELETE /api/admin/users/[id]       Delete user

GET  /api/admin/standalone-exams         List standalone exams with question counts
POST /api/admin/standalone-exams         Create/togglePublish/delete exam
GET  /api/admin/standalone-exams/[id]    Fetch exam + questions
POST /api/admin/standalone-exams/[id]    addQuestion/updateQuestion/deleteQuestion
```

---

## 6. Security Model

- **RLS** on all tables. Admin client (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS — only used server-side.
- **User client** (anon key) enforces RLS — students can only read their own data.
- **Admin routes** protected at layout level: `app/admin/layout.tsx` checks `role IN ('admin','teacher')`.
- **Dashboard routes** protected at layout level: `app/dashboard/layout.tsx` checks auth + `is_banned`.
- **Correct answers** never sent to client until after submission.
- **Homework/exam questions**: `correct` and `solution` fields excluded from GET questions endpoint.
- **Standalone exams**: RLS policy — students can read only `published = true` exams.

---

## 7. Code Patterns (Use These Exactly)

### Server Component (reads DB)
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()  // NOT getSession()
  // ...
}
```

### Admin/Service Role (bypasses RLS)
```typescript
import { createAdminClient } from '@/lib/supabase/admin'

// Only use server-side. Never in client components.
const admin = createAdminClient()
```

### Client Component (browser)
```typescript
'use client'
import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = useMemo(() => createClient(), [])
// Never call createClient() in render body
```

### API Route Pattern
```typescript
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const admin = createAdminClient()
  // Use admin for all DB operations (bypasses RLS)
}
```

### Phone → Email Conversion
```typescript
// Phone: 01012345678 → Email: 01012345678@intphy.app
const email = `${cleanPhone}@intphy.app`
```

---

## 8. مهمة الاختبار وضمان الجودة / Testing & Load Testing Mission

> **الهدف:** التأكد من أن المنصة تتحمل آلاف المستخدمين المتزامنين قبل النشر الرسمي.

### 8.1 ما الذي نختبره / What We're Testing

#### أ. أداء قاعدة البيانات / Database Performance
- استعلامات تحت حمل عالٍ (1000+ مستخدم متزامن)
- كفاءة RLS (سياسات الأمان لا تسبب N+1)
- الـ indexes الموجودة كافية للاستعلامات الشائعة
- الـ connection pooling (Supabase يستخدم PgBouncer تلقائيًا)

#### ب. نقاط الضغط الحرجة / Critical Pressure Points

**الأكثر استخدامًا من الطلاب:**
1. `/dashboard` — تحميل التسجيلات + التقدم + آخر فيديو (3 queries متوازية)
2. `/dashboard/watch/[videoId]` — حفظ progress كل 5 ثوانٍ (write-heavy)
3. `/api/quiz` POST — تسليم الكويز (read all questions + upsert submission)
4. `/api/exam` POST — تسليم الامتحان (نفس النمط)
5. `/courses` — صفحة الكورسات (مع فلترة التسجيلات للطلاب)
6. `/api/enroll` POST — استرداد الكود والتسجيل (atomic RPC)

**الأكثر استخدامًا من الأدمن:**
1. `/admin` dashboard — aggregate queries على enrollments
2. `/admin/courses/[id]/content` — fetch all modules + videos + quizzes + exams
3. `/admin/students` — 500 rows max

### 8.2 فحص الـ Database Indexes / Database Index Audit

```sql
-- تشغيل هذا في Supabase SQL Editor للتحقق من الـ indexes الموجودة
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**الـ Indexes الحرجة التي يجب التأكد من وجودها:**

| Table | Column(s) | Why |
|-------|-----------|-----|
| enrollments | (user_id) | dashboard loads |
| enrollments | (course_id) | course stats |
| enrollments | (user_id, course_id) | enrollment check |
| user_progress | (user_id) | dashboard continue watching |
| user_progress | (video_id) | video completion check |
| user_progress | (user_id, video_id) | upsert conflict |
| quiz_submissions | (user_id, quiz_id) | submission lookup |
| module_exam_submissions | (user_id, exam_id) | submission lookup |
| standalone_exam_submissions | (user_id, exam_id) | submission lookup |
| modules | (course_id) | course content load |
| videos | (module_id) | video list |
| access_codes | (code) | code redemption |
| access_codes | (course_id) | admin filter |
| user_profiles | (phone_number) | login |
| standalone_exam_questions | (exam_id) | question load |

### 8.3 اختبار الأداء / Performance Tests

**الأدوات المقترحة:**
- **k6** (https://k6.io) — load testing scripts
- **Supabase Dashboard → Database → Performance** — slow query log
- **Vercel Analytics** — real user metrics
- **pgbench** — direct PostgreSQL load testing

#### Test Scenario 1: Student Login Storm
```javascript
// k6 script — simulate 500 students logging in simultaneously
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // ramp up to 100 users
    { duration: '1m',  target: 500 },   // hold at 500 users
    { duration: '30s', target: 0 },     // ramp down
  ],
}

export default function () {
  const res = http.post('https://int-phy.vercel.app/api/auth/signout', {})
  check(res, { 'status 200': (r) => r.status === 200 })
  sleep(1)
}
```

#### Test Scenario 2: Dashboard Load
```javascript
// Simulate 200 students hitting /dashboard simultaneously
// Each triggers: enrollments query + user_progress query + profile query
import http from 'k6/http'

export const options = {
  vus: 200,
  duration: '2m',
}

export default function () {
  // Requires valid session cookie — use authenticated requests
  http.get('https://int-phy.vercel.app/dashboard', {
    headers: { Cookie: `sb-vrefcmplibzoayfyfidd-auth-token=YOUR_TEST_TOKEN` }
  })
}
```

#### Test Scenario 3: Video Progress Save Storm
```javascript
// Simulate 300 students saving video progress every 5 seconds
// This is the most write-heavy operation
export const options = {
  vus: 300,
  duration: '5m',
}

export default function () {
  http.post('https://int-phy.vercel.app/api/videos/progress', JSON.stringify({
    videoId: 'KNOWN_VIDEO_ID',
    position: Math.floor(Math.random() * 3600),
    completed: false,
  }), { headers: { 'Content-Type': 'application/json' } })
  sleep(5)
}
```

#### Test Scenario 4: Quiz Submission Spike
```javascript
// Simulate entire class submitting quiz at same time
export const options = {
  vus: 100,
  duration: '30s',
}

export default function () {
  http.post('https://int-phy.vercel.app/api/quiz', JSON.stringify({
    quizId: 'KNOWN_QUIZ_ID',
    answers: { 'Q1_ID': 'a', 'Q2_ID': 'b', 'Q3_ID': 'c' }
  }), { headers: { 'Content-Type': 'application/json' } })
}
```

### 8.4 Supabase-Specific Checks

**تشغيل هذه الاستعلامات في SQL Editor:**

```sql
-- 1. Check for missing foreign key indexes (common performance killer)
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  'MISSING INDEX' as issue
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = tc.table_name
      AND indexdef LIKE '%' || kcu.column_name || '%'
  );

-- 2. Check table row counts and bloat
SELECT
  relname AS table_name,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 3. Find slow queries (requires pg_stat_statements — already enabled)
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time,
  rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 4. Check RLS policy complexity (policies that call auth.uid() many times)
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
ORDER BY tablename;

-- 5. Check for tables without RLS enabled
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE c.relrowsecurity = true
  );

-- 6. Connection count check (should stay well under 60 on free tier)
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;

-- 7. Simulate load: check enrollment query EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT e.*, c.id, c.title, c.description, c.thumbnail_url, c.deleted_at
FROM enrollments e
JOIN courses c ON c.id = e.course_id
WHERE e.user_id = (SELECT id FROM user_profiles LIMIT 1)
ORDER BY e.enrolled_at DESC;

-- 8. Check the most expensive query (dashboard continue-watching)
EXPLAIN ANALYZE
SELECT up.*, v.id, v.title, v.duration, v.module_id,
       m.title as module_title, m.course_id,
       c.id as course_id, c.title as course_title
FROM user_progress up
JOIN videos v ON v.id = up.video_id
JOIN modules m ON m.id = v.module_id
JOIN courses c ON c.id = m.course_id
WHERE up.user_id = (SELECT id FROM user_profiles WHERE role = 'student' LIMIT 1)
ORDER BY up.last_watched_at DESC
LIMIT 5;
```

### 8.5 اختبارات وظيفية / Functional Tests

**يجب اختبار كل هذه السيناريوهات يدويًا:**

#### تدفق الطالب الكامل / Full Student Flow
- [ ] إنشاء حساب جديد بـ رقم هاتف + كلمة سر + صف دراسي
- [ ] تسجيل الدخول
- [ ] فتح صفحة الكورسات — الكورسات المشترك فيها لا تظهر
- [ ] إدخال كود صحيح → التسجيل في الكورس
- [ ] إدخال كود خاطئ → رسالة خطأ واضحة
- [ ] إدخال كود منتهي → رسالة خطأ
- [ ] إدخال كود مستخدم سابقًا → رسالة خطأ
- [ ] فتح الداشبورد → يظهر الكورس الجديد مع 0%
- [ ] مشاهدة فيديو → يتحفظ الموضع بعد 5 ثوانٍ
- [ ] إغلاق المتصفح وإعادة الفتح → يستكمل من آخر موضع
- [ ] إكمال 90% من الفيديو → يُحسب مكتمل
- [ ] حل كويز → يظهر الترتيب والشرح
- [ ] حل امتحان موديول → يظهر الترتيب والشرح
- [ ] فتح `/dashboard/assignments` → يظهر الواجب
- [ ] حل واجب → يُسجل كـ "تسليم واجب" لا "تسليم امتحان"
- [ ] فتح `/dashboard/exams` → تظهر الامتحانات المستقلة المنشورة فقط
- [ ] حل امتحان مستقل → يُحفظ في `standalone_exam_submissions`

#### تدفق الأدمن / Admin Flow
- [ ] تسجيل دخول بحساب أدمن
- [ ] إنشاء كورس جديد
- [ ] رفع صورة thumbnail
- [ ] إضافة وحدة درس + فيديو يوتيوب
- [ ] إضافة ملف PDF للوحدة
- [ ] إضافة كويز بـ 3 أسئلة نصية مع مفتاح الإجابة
- [ ] إضافة وحدة امتحان + سؤالين (نص + صورة)
- [ ] إضافة وحدة واجب + 3 أسئلة
- [ ] نشر الكورس
- [ ] توليد 5 أكواد للكورس
- [ ] مشاركة كود → يفتح share sheet
- [ ] تحديد كود بعلامة ✓
- [ ] حذف كود غير مستخدم
- [ ] فتح `/admin/standalone-exams` → إنشاء امتحان مستقل
- [ ] إضافة 5 أسئلة للامتحان المستقل
- [ ] نشر الامتحان المستقل
- [ ] فتح إحصائيات الكورس → يظهر عدد المشتركين
- [ ] الضغط على كويز في الإحصائيات → يفتح صفحة الترتيب

#### تدفق التطبيق المحمول / Mobile App Flow
- [ ] تسجيل دخول بحساب أدمن/معلم
- [ ] تبويب كورسات → يظهر قائمة الكورسات مجمعة بالصف
- [ ] تعديل كورس → حفظ → يُحدَّث
- [ ] تبويب طلاب → يظهر قائمة الاشتراكات
- [ ] الضغط على طالب → يفتح ملفه الشخصي الكامل
- [ ] تبويب امتحانات → إنشاء امتحان مستقل جديد
- [ ] إضافة سؤال → حفظ → يظهر في القائمة
- [ ] الضغط على "🏆 ترتيب" على كويز → يظهر الترتيب
- [ ] تبويب أكواد → توليد 3 أكواد
- [ ] تبويب مستخدمين → حظر مستخدم → إلغاء الحظر
- [ ] إعادة تعيين كلمة سر → يعمل عبر Edge Function

### 8.6 اختبارات الأمان / Security Tests

```
- [ ] محاولة الوصول لـ /admin بحساب طالب → يُعاد توجيه لـ /dashboard
- [ ] محاولة تسليم امتحان مرتين → يُحدَّث نفس الـ submission (upsert)
- [ ] محاولة استرداد إجابات امتحان قبل التسليم → 403
- [ ] محاولة رفع صورة لـ exam-images بدون جلسة → 401
- [ ] طالب يحاول قراءة بيانات طالب آخر → RLS يمنع
- [ ] محاولة الوصول لـ /api/admin/* بحساب طالب → 401
- [ ] كود منتهي الصلاحية → يُرفض
- [ ] كود مستخدم مسبقًا → يُرفض (الكود يُحذف بعد الاستخدام)
- [ ] طالب محظور يحاول الدخول → يُسجَّل خروجه فورًا
```

### 8.7 اختبار الحمل المحاكي / Simulated Load Test (Manual)

إذا لم يكن k6 متاحًا، يمكن محاكاة الضغط يدويًا:

1. **افتح 20 تبويب متصفح** على `/dashboard/watch/[videoId]` بنفس الوقت
2. **استخدم Browser DevTools** → Network → تحقق أن استجابة `/api/videos/progress` < 500ms
3. **في Supabase Dashboard** → Database → Connection Pooling → تحقق أن عدد الـ connections لا يتجاوز 50
4. **شاهد Vercel Function Logs** أثناء الضغط للتحقق من عدم وجود timeouts

### 8.8 المقاييس المستهدفة / Target Metrics

| Endpoint | Max Response Time | Max Concurrent Users |
|----------|------------------|---------------------|
| `/dashboard` | < 2s | 500 |
| `/api/videos/progress` | < 300ms | 1000 |
| `/api/quiz` POST | < 500ms | 200 |
| `/api/exam` POST | < 500ms | 200 |
| `/api/enroll` POST | < 1s | 100 |
| `/courses` | < 1.5s | 1000 |
| Admin pages | < 3s | 20 |

### 8.9 مشاكل محتملة وحلولها / Known Potential Issues & Fixes

#### مشكلة 1: N+1 في صفحة الداشبورد
**المشكلة:** Dashboard fetches enrollments, then for each enrollment fetches videos separately.  
**الحل المقترح:**
```sql
-- Add this composite index if missing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_module_course
ON videos(module_id);

-- And ensure modules has index on course_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_modules_course_id
ON modules(course_id);
```

#### مشكلة 2: Video Progress Write Storm
**المشكلة:** 1000 طالب يكتبون progress كل 5 ثوانٍ = 200 writes/second.  
**الحل الحالي:** `upsert` على `(user_id, video_id)` — كافٍ لـ Supabase free tier.  
**إذا وصلنا لـ 5000+ طالب متزامن:** فكّر في batching أو Rate limiting على هذا الـ endpoint.

#### مشكلة 3: RLS على standalone_exam_questions
**المشكلة:** Policy تفحص `published` على `standalone_exams` — join مخفية في كل query.  
**التحقق:**
```sql
EXPLAIN ANALYZE
SELECT * FROM standalone_exam_questions
WHERE exam_id = 'SOME_ID';
-- يجب أن يستخدم index على exam_id لا seq scan
```

#### مشكلة 4: صفحة الكورسات مع فلترة التسجيلات
**الكود الحالي:** يجلب enrollments أولًا ثم يفلتر في JavaScript.  
**أفضل:** إضافة `NOT IN` في الـ SQL query مباشرة لتقليل البيانات المنقولة.

#### مشكلة 5: Connection Pool على Free Tier
**الحد:** Supabase free tier = 60 direct connections.  
**الحل:** Vercel Serverless + Supabase Edge يستخدمان PgBouncer تلقائيًا — راقب في:  
Supabase Dashboard → Database → Connection Pooling

### 8.10 اختبار Supabase Storage

```bash
# تحقق من حجم الـ Storage المستخدم (الحد 500MB على free tier)
# افتح Supabase Dashboard → Storage → مراجعة الـ buckets:
# - exam-images (صور أسئلة الامتحانات)
# - module-files (ملفات PDF وغيرها)
# - course-thumbnails (صور الكورسات)
```

**نصيحة:** الصور الكبيرة في `exam-images` هي المخاطرة الأكبر. تأكد من:
- Max upload size مضبوط في الكود
- الصور يتم ضغطها قبل الرفع (تحقق من `upload-exam-image/route.ts`)

---

## 9. Edge Functions

```
admin-reset-password     يُعاد توجيه طلبات تغيير كلمة السر من الأدمن
course-stats             يجمع إحصائيات الكورس (enrollments, progress, quiz/exam scores)
```

**التحقق من وجودها:**
```bash
supabase functions list --project-ref vrefcmplibzoayfyfidd
```

---

## 10. Environment Variables Required

```env
# Website (.env.local in INTPHY-REAL root)
NEXT_PUBLIC_SUPABASE_URL=https://vrefcmplibzoayfyfidd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Mobile App (lib/supabase.ts — hardcoded, update before prod)
SUPABASE_URL=https://vrefcmplibzoayfyfidd.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

---

## 11. ملفات المشروع المهمة / Key Files

```
INTPHY-REAL/
├── app/
│   ├── (public)/courses/page.tsx         ← صفحة الكورسات (enrolled courses filtered out)
│   ├── dashboard/
│   │   ├── layout.tsx                    ← Auth + ban check
│   │   ├── page.tsx                      ← Main student dashboard
│   │   ├── assignments/page.tsx          ← Homework page
│   │   ├── exams/page.tsx                ← Standalone exams page
│   │   ├── exam/[examId]/page.tsx        ← Exam/homework taker (?type=homework)
│   │   ├── standalone-exam/[examId]/page.tsx  ← Standalone exam taker
│   │   └── watch/                        ← Video player
│   ├── admin/
│   │   ├── layout.tsx                    ← Admin auth guard
│   │   ├── courses/[id]/content/page.tsx ← Content manager (lesson/exam/homework)
│   │   └── standalone-exams/             ← Standalone exam management
│   └── api/
│       ├── exam/route.ts                 ← Module exam API
│       ├── quiz/route.ts                 ← Quiz API
│       ├── standalone-exam/route.ts      ← Standalone exam API
│       └── assignments/route.ts          ← Homework list API
├── components/
│   └── admin-sidebar.tsx                 ← Sidebar with all 6 admin links
└── lib/
    ├── supabase/
    │   ├── server.ts                     ← SSR client
    │   ├── client.ts                     ← Browser client
    │   └── admin.ts                      ← Service role client

management/ (Expo App)
├── App.tsx                               ← 5-tab navigator
├── screens/
│   ├── CoursesScreen.tsx                 ← Course list grouped by grade
│   ├── CourseEditScreen.tsx              ← Create/edit course
│   ├── CourseStatsScreen.tsx             ← Course analytics + quiz/exam rankings
│   ├── StudentsScreen.tsx                ← Student enrollments list → profile
│   ├── StandaloneExamsScreen.tsx         ← Standalone exam management
│   ├── CodesScreen.tsx                   ← Access code management
│   ├── UsersScreen.tsx                   ← User management (ban/delete/reset pw)
│   ├── UserDetailScreen.tsx              ← Full student profile
│   ├── QuizExamRankingsScreen.tsx        ← Rankings for quiz/exam/homework
│   └── StandaloneExamStatsScreen.tsx     ← Rankings for standalone exams
└── lib/
    ├── supabase.ts                       ← Supabase client (AsyncStorage)
    └── theme.ts                          ← COLORS constants
```

---

## 12. ما لم يُبنَ بعد / Not Yet Built

هذه الأشياء **غير موجودة** في الكود حاليًا — لا تفترض وجودها:

- ❌ نظام إشعارات (push notifications)
- ❌ دفع إلكتروني (كل المدفوعات نقدية + أكواد)
- ❌ تعليقات أو نقاشات
- ❌ شهادات إتمام
- ❌ خاصية البحث داخل الفيديو
- ❌ تطبيق للطلاب (فقط الموقع للطلاب، التطبيق للأدمن فقط)
- ❌ CI/CD pipeline رسمي
- ❌ اختبارات unit/integration مكتوبة مسبقًا

---

## 13. قواعد للعامل / Agent Rules

1. **لا تغير schema** بدون إضافة migration جديد عبر `Supabase:apply_migration`
2. **لا تستخدم `getSession()`** على السيرفر — استخدم `getUser()` دائمًا
3. **لا تعرض `SUPABASE_SERVICE_ROLE_KEY`** في client components أبدًا
4. **لا تحذف migration** موجود — أضف migration جديد للتراجع
5. **الـ admin client** فقط في Server Components وAPI Routes وEdge Functions
6. **كل route جديد في `/api/admin/`** يجب أن يتحقق من الـ role أولًا
7. **أي تغيير في RLS policies** يجب اختباره بـ `EXPLAIN ANALYZE` للتأكد من الأداء
8. **لا تُضيف `'use server'`** داخل function body — فقط في أعلى الملف
9. **Supabase Storage quota: 500MB** — لا ترفع ملفات كبيرة بدون فحص الحجم
10. **اتجاه RTL** في كل الـ UI — `dir="rtl"` على `<html>`، وكل نصوص واجهة المستخدم بالعربية

---

## 14. سجل التغييرات / Changelog Summary

| التاريخ | التغيير |
|---------|---------|
| فبراير 2026 | بناء المنصة الأساسية (auth, courses, videos, dashboard) |
| مارس 2026 | نظام الكويز والامتحانات داخل الكورسات |
| مارس 2026 | **وحدة الواجبات** (homework module type) |
| مارس 2026 | **الامتحانات المستقلة** (standalone_exams — خارج الكورسات، لكل الطلاب) |
| مارس 2026 | صفحات `/dashboard/assignments` و `/dashboard/exams` |
| مارس 2026 | فلترة الكورسات المشترك فيها من صفحة `/courses` |
| مارس 2026 | تطبيق الأدمن: إضافة تبويبات الطلاب والامتحانات المستقلة |
| مارس 2026 | تطبيق الأدمن: صفحات الترتيب للكويزات والامتحانات والواجبات |
| مارس 2026 | تطبيق الأدمن: الملف الشخصي الكامل للطالب عند الضغط |
