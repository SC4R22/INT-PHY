# INTPHY Bug Audit — Progress System & Mismatched Calls
**Audit Date:** 2026-04-07  
**Status:** ✅ ALL ISSUES RESOLVED — DB and codebase fully clean.

---

## ✅ FIXED (Session 1 — Previous Agent)

### Fix 1 — Activity trigger was wired to the wrong table
**What was wrong:**  
`trigger_update_activity_on_progress` fired on `lesson_progress` INSERT/UPDATE. But `lesson_progress` had 0 rows and was never written to by the app. So `last_activity_at` on `user_profiles` was never being updated.

**What was fixed:**  
Dropped the trigger from `lesson_progress`. Created `trigger_update_activity_on_user_progress` on `user_progress` (the table the API route actually writes to).

**Migration:** `fix_01_drop_broken_lesson_progress_trigger`

---

### Fix 2 — `get_student_dashboard` read from empty tables (always returned 0 progress)
**What was wrong:**  
The DB function `get_student_dashboard` joined `lesson_progress → course_content → course_sections`. Both `course_content` (0 rows) and `course_sections` (0 rows) are a dead shadow schema from a previous agent. Every student saw 0% progress always.

**What was fixed:**  
Rewrote `get_student_dashboard` to join `user_progress → videos → modules` — the actual data path the app uses.

**Migration:** `fix_04b_rewrite_get_student_dashboard`

---

### Fix 3 — Two competing progress calculation paths producing different results
**What was wrong:**  
- `calculate_course_progress()` counted rows in `lesson_progress` (always 0 → always 0%)
- `update_enrollment_progress()` trigger counted rows in `user_progress` (correct data)
- Both updated `enrollments.progress_percentage` — whichever ran last won

**What was fixed:**  
`update_enrollment_progress` is now the single source of truth. It reads `user_progress` and counts completed videos per course correctly.

**Migration:** `fix_02_rewrite_update_enrollment_progress`

---

### Fix 4 — `get_course_progress_summary` vs dashboard used different data sources
**What was wrong:**  
`get_course_progress_summary` read from `user_progress` (correct).  
`get_student_dashboard` read from `lesson_progress` (wrong/empty).  
Same user, two functions, two different numbers.

**What was fixed:**  
Both now read from `user_progress`. They agree.

**Migration:** `fix_03_rewrite_get_course_progress_summary`, `fix_04b_rewrite_get_student_dashboard`

---

### Fix 5 — Stale enrollment progress data (data backfill)
**What was wrong:**  
`enrollments.progress_percentage` was never being updated correctly for existing enrollments. Students who had watched videos still showed 0%.

**What was fixed:**  
One-time SQL backfill recalculated `progress_percentage`, `completed`, and `completed_at` for every enrollment from actual `user_progress` data.

**Migration:** `fix_09_sync_enrollment_progress_from_existing_data`

---

### Fix 6 — `redeem_access_code` hard-deleted codes instead of marking them used
**What was wrong:**  
The function did `DELETE FROM access_codes WHERE id = ...`. Admin could never see who used a code. `is_used`, `used_by`, `used_at` columns were never populated.

**What was fixed:**  
Rewrote to `UPDATE access_codes SET is_used = true, used_by = ..., used_at = NOW()`. Codes are now soft-marked and visible in admin audit trail.

**Migration:** `fix_05_rewrite_redeem_access_code`

---

### Fix 7 — `lesson_progress.user_id` was nullable (trigger crash risk)
**What was wrong:**  
If any row was ever inserted into `lesson_progress` without a `user_id`, the activity trigger would run `UPDATE user_profiles WHERE id = NULL` — silently affecting 0 rows.

**What was fixed:**  
Added `NOT NULL` constraint to `lesson_progress.user_id`. Safe since the table had 0 rows. (Table has since been dropped entirely — see Fix 12.)

**Migration:** `fix_06_fix_lesson_progress_nullable_user_id`

---

### Fix 8 — `get_blocking_quiz_for_video` had inverted order logic
**What was wrong:**  
Used `q.order_index <= video.order_index` which meant a quiz at the same position as the video would block it.

**What was fixed:**  
Changed to `q.order_index < video.order_index` (strict less-than). A quiz only blocks videos that come after it.

**Migration:** `fix_07_fix_blocking_quiz_logic`

---

### Fix 9 — `update_course_analytics` referenced a non-existent table
**What was wrong:**  
The function tried to INSERT/UPDATE a `course_analytics` table that doesn't exist. Every call threw a runtime error.

**What was fixed:**  
Dropped the function. It was never called by any app code.

**Migration:** `fix_08_drop_broken_update_course_analytics`

---

## ✅ FIXED (Session 2 — Current)

### Fix 10 — YouTube videos never resumed from saved position
**What was wrong:**  
`YouTubePlayer.tsx` had no `startTime` prop. The watch page correctly read `last_position` from `user_progress` and passed it as `initialPosition` — but the YouTube player component silently ignored it and always started from 0:00. Mux and native video players were NOT affected (they already used `startTime`).

**What was fixed:**  
- Added `startTime?: number` prop to `YouTubePlayer.tsx`
- Added `start: Math.floor(startTime)` to YouTube player params (integer-second resume at init)
- Added `e.target.seekTo(startTime, true)` in `onReady` callback (sub-second precision after load)
- Updated `video-player.tsx` to pass `startTime={initialPosition}` to `YouTubePlayer`

**Files changed:**  
- `components/YouTubePlayer.tsx`
- `app/dashboard/watch/[videoId]/video-player.tsx`

---

### Fix 11 — `calculate_course_progress()` dead function dropped
**What was wrong:**  
Function read from `lesson_progress` (0 rows, now dropped) and always returned 0%. Not called anywhere in app code.

**What was fixed:**  
Dropped the function entirely.

**Migration:** `fix_10_drop_dead_calculate_course_progress_function`

---

### Fix 12 — `exam_submissions.content_id` FK to dead `course_content` removed
**What was wrong:**  
`exam_submissions.content_id` was a nullable FK pointing to `course_content` (0 rows, dead shadow schema). Never populated by any app code but was a landmine constraint blocking future inserts if triggered.

**What was fixed:**  
Dropped the FK constraint and the `content_id` column from `exam_submissions`.

**Migration:** `fix_11_remove_exam_submissions_content_id_fk`

---

### Fix 13 — Shadow schema tables fully dropped
**What was wrong:**  
Three tables existed with 0 rows that were entirely unused: `lesson_progress`, `course_content`, `course_sections`. They had RLS policies, FK constraints, and triggers pointing to them — adding confusion and maintenance overhead.

**What was fixed:**  
Dropped all three tables with CASCADE (removes all associated RLS policies and constraints).

**Migration:** `fix_12_drop_unused_shadow_schema`

---

## Summary Table

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | Activity trigger on wrong table (`lesson_progress`) | 🔴 Critical | ✅ Fixed (Session 1) |
| 2 | `get_student_dashboard` read from empty `course_content` | 🔴 Critical | ✅ Fixed (Session 1) |
| 3 | Two competing progress calculators with different tables | 🔴 Critical | ✅ Fixed (Session 1) |
| 4 | `get_course_progress_summary` vs dashboard data source mismatch | 🔴 Critical | ✅ Fixed (Session 1) |
| 5 | Stale `enrollments.progress_percentage` from old bad data | 🔴 Critical | ✅ Fixed (Session 1 — backfill) |
| 6 | `redeem_access_code` hard-deleted instead of soft-marking | 🟠 High | ✅ Fixed (Session 1) |
| 7 | `lesson_progress.user_id` nullable — trigger crash risk | 🟡 Medium | ✅ Fixed (Session 1) |
| 8 | `get_blocking_quiz_for_video` order logic inverted | 🟠 High | ✅ Fixed (Session 1) |
| 9 | `update_course_analytics` referenced non-existent table | 🟠 High | ✅ Fixed (Session 1 — dropped) |
| 10 | YouTube videos never resumed from saved position | 🔴 Critical | ✅ Fixed (Session 2) |
| 11 | `calculate_course_progress()` dead function (reads empty table) | 🟡 Low | ✅ Fixed (Session 2 — dropped) |
| 12 | `exam_submissions.content_id` FK to dead `course_content` | 🟠 High | ✅ Fixed (Session 2 — dropped) |
| 13 | `lesson_progress`/`course_content`/`course_sections` shadow schema | 🟡 Medium | ✅ Fixed (Session 2 — dropped) |

---

## ⚠️ FUTURE — Optional Improvements (Not Bugs)

### Future 1 — `course_analytics` table for real analytics
The old `update_course_analytics()` function was dropped (Fix 9) because it referenced a non-existent table. If you want proper course analytics (views, completion rates over time), this should be built fresh as a scheduled Edge Function writing to a properly designed `course_analytics` table.

**Status:** ⏳ Future feature — not a bug, no action needed now.

---

## Architecture Reference — Correct Data Flow

After all fixes, the single correct data path is:

```
Student watches video
  → POST /api/progress
  → upsert into user_progress (user_id, video_id, last_position, completed, last_watched_at)
  → trigger: trg_update_enrollment_progress fires
  → updates enrollments.progress_percentage (counts completed videos / total videos)
  → trigger: trigger_update_activity_on_user_progress fires
  → updates user_profiles.last_activity_at

Student opens dashboard
  → reads enrollments (with progress_percentage from above)
  → reads user_progress (last watched video, for "continue watching")
  → all data consistent ✅

Student reopens a video
  → watch page reads user_progress.last_position
  → passes as initialPosition → startTime to video player
  → all three player types (YouTube, Mux, native) resume correctly ✅
```
