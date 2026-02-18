# Course Platform Development Guide

## Project Overview
A Udemy-like learning platform where one teacher uploads courses and students purchase access via admin-generated codes (cash payment system). Built with AI assistance, minimal manual coding required.

## Tech Stack
- **Frontend Framework**: Next.js 14+ (App Router)
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Video Storage**: Cloudflare R2
- **Styling**: Tailwind CSS
- **Fonts**: Payback (headers), Inter (body text)

## Design System
### Dark Mode (Default)
- Background: `#25292D`
- Body Text: `#EFEFEF`
- Header Text: `#B3B3B3`
- Primary: `#6A0DAD`

### Light Mode
- Background: `#FFFFFF` / `#F5F5F5`
- Body Text: `#1A1A1A`
- Header Text: `#333333`
- Primary: `#6A0DAD`

---

## ✅ CURRENT STATUS (as of Phase 3 completion)

### What Is Built & Working
- Next.js 14 project with TypeScript, Tailwind, dark mode class setup
- Supabase auth (phone-number → email conversion pattern)
- Database schema: `user_profiles`, `courses`, `modules`, `videos`, `enrollments`, `access_codes`
- Login & Signup pages (`/login`, `/signup`) — phone-based auth
- Landing page (`/`) — hero, features, course preview, centers, CTA, about
- Courses listing page (`/courses`) — with search/filter
- Course detail page (`/courses/[id]`) — curriculum display, enroll button
- Enroll button with access code redemption modal
- Basic student dashboard (`/dashboard`) — enrolled courses list
- Admin panel (`/admin`) — built early for content testing:
  - `/admin/courses` — list, create, edit, publish/draft toggle
  - `/admin/courses/[id]/content` — modules & videos management
  - `/admin/codes` — generate & manage access codes
  - `/admin/students` — student list
  - `/admin/users` — all users by role

### Known Bugs (To Be Fixed in Phase 4)
1. 🔴 `app/layout.tsx` — `ThemeProvider` from `next-themes` is never mounted; theme toggle is broken
2. 🔴 `app/layout.tsx` — `ConditionalLayout` component exists but is never used; no page gets header/footer
3. 🔴 `enroll-button.tsx` — Free courses still show the access code modal instead of auto-enrolling
4. 🔴 `admin/codes/page.tsx` — Course filter references `c.course_id` which doesn't exist on the returned object; filter is broken
5. 🔴 `enroll-button.tsx` — Code redemption is two separate queries with a race condition; should use the `redeem_access_code` RPC already defined in `lib/auth.ts`
6. 🟠 `lib/supabase/middleware.ts` — `/admin` routes have no middleware-level protection
7. 🟠 `lib/roles.ts` — `getRoleBasedRedirect` returns `/admin/dashboard` for admin (doesn't exist, should be `/admin`)
8. 🟠 Three admin client pages — `createClient()` called directly in component body, creates new client every render
9. 🟠 `content/page.tsx` — `supabase` used inside `useCallback` without being in its dependency array
10. 🟡 `signup/page.tsx` — `console.log` calls expose user email format in production
11. 🟡 `admin/page.tsx` — Trend stats (`"+12% this month"`) are hardcoded strings, not real data
12. 🟡 `admin/page.tsx` — Queries `last_activity_at` column which likely doesn't exist in schema
13. 🟡 `admin/page.tsx` — Queries `course_analytics` view which may not exist in Supabase
14. 🟡 `dashboard/page.tsx` — "Continue Learning" links to public course page, not the video player
15. 🟡 `dashboard/page.tsx` — Teacher role renders a blank screen (no content for teacher)
16. 🟡 `debug/page.tsx` — Publicly accessible, exposes raw profile data, no auth gate
17. 🟡 `api/auth/signout/route.ts` — Hardcoded `localhost:3000` fallback breaks production logout
18. 🟡 `app/actions/auth.ts` — Nested `'use server'` directive inside `refreshSession`
19. 🟡 `lib/supabase/.env.local` — Stray env file inside lib directory, should only be at project root

### What Is NOT Yet Built
- Student course view page with sidebar (`/dashboard/courses/[id]`)
- Video player page (`/dashboard/watch/[videoId]`)
- Cloudflare R2 signed URL API route for video playback
- Video progress tracking (save position, resume, mark complete)
- Loading skeletons / toast notifications
- SEO metadata on all pages
- Custom 404 page

---

## PHASE 1: Project Setup & Foundation ✅ COMPLETE
**Goal**: Initialize project with proper structure, configuration, and basic navigation

### Tasks
1. **Initialize Next.js Project**
   - Create new Next.js 14+ project with TypeScript
   - Configure `next.config.js` for video optimization
   - Setup `app` directory structure

2. **Install & Configure Dependencies**
   ```bash
   # Core dependencies
   - @supabase/supabase-js
   - @supabase/auth-helpers-nextjs
   - tailwindcss
   - @headlessui/react (for UI components)
   - lucide-react (icons)
   - next-themes (dark/light mode)
   ```

3. **Setup Tailwind with Design System**
   - Configure `tailwind.config.js` with custom colors
   - Add Payback and Inter fonts via `next/font`
   - Create base CSS with design tokens
   - Setup dark/light mode toggle

4. **Initialize Supabase**
   - Create Supabase project
   - Setup environment variables (.env.local)
   - Create Supabase client utilities
   - Configure auth helpers for Next.js

5. **Create Base Layout & Navigation**
   - Root layout with theme provider
   - Basic navigation component (header/footer)
   - Theme toggle component
   - Responsive design foundation

6. **Setup Cloudflare R2 Configuration**
   - Document R2 bucket setup
   - Create environment variables for R2
   - Setup signed URL generation utility (placeholder)

### Deliverables
- Fully configured Next.js project
- Working theme toggle (dark/light)
- Basic navigation structure
- Supabase connection established
- All dependencies installed and configured

### Best Practices & References
- **Next.js App Router**: https://nextjs.org/docs/app/building-your-application/routing
- **Supabase Auth Helpers**: https://supabase.com/docs/guides/auth/auth-helpers/nextjs
- **Tailwind Custom Colors**: https://tailwindcss.com/docs/customizing-colors
- **next-themes Setup**: https://github.com/pacocoursey/next-themes

### AI Prompt Template for Phase 1
```
I'm building a course platform with Next.js 14, Supabase, and Tailwind. 

Tech Stack:
- Next.js 14 (App Router, TypeScript)
- Supabase (Auth + Database)
- Cloudflare R2 (video storage)
- Tailwind CSS

Design System:
- Dark Mode: Background #25292D, Body #EFEFEF, Headers #B3B3B3, Primary #6A0DAD
- Light Mode: Background #FFFFFF, Body #1A1A1A, Headers #333333, Primary #6A0DAD
- Fonts: Payback (headers), Inter (body)

Please follow Next.js 14 App Router best practices and Supabase auth helper patterns.

Please help me:
1. Initialize the Next.js project with proper structure
2. Configure Tailwind with the design system
3. Setup Supabase auth helpers
4. Create a base layout with theme toggle
5. Setup basic navigation

Reference the Figma design: [attach Figma file]
```

---

## PHASE 2: Authentication System & Database Schema ✅ COMPLETE
**Goal**: Complete authentication flow and setup database structure
**Token Estimate**: ~40k tokens

### Tasks
1. **Design Database Schema**
   - `users` table (profiles)
   - `courses` table
   - `modules` table (course sections)
   - `videos` table (module videos)
   - `enrollments` table (student-course relationships)
   - `access_codes` table (for cash payment system)
   - `user_progress` table (video completion tracking)

2. **Create Supabase Tables & RLS Policies**
   - Setup all tables with proper relationships
   - Configure Row Level Security (RLS)
   - Create database functions for common operations
   - Setup triggers for automated tasks

3. **Build Authentication Pages**
   - `/signup` - Registration page
   - `/login` - Login page
   - Email/password authentication
   - Form validation
   - Error handling
   - Protected route middleware

4. **User Role System**
   - Implement role field (student/teacher/admin)
   - Create role-based middleware
   - Setup role checking utilities

5. **Access Code System Backend**
   - Create access code generation function
   - Code validation logic
   - Code redemption workflow
   - Link codes to specific courses

### Deliverables
- Complete database schema in Supabase
- All RLS policies configured
- Working signup/login flow
- Role-based access control
- Access code generation system ready

### Best Practices & References
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **Database Schema Design**: https://supabase.com/docs/guides/database/tables
- **Auth UI Components**: https://supabase.com/docs/guides/auth/auth-helpers/auth-ui

### Database Schema Reference
```sql
-- Tables to create:
users_profile (user_id, role, full_name, avatar_url)
courses (id, title, description, thumbnail_url, teacher_id, price_cash)
modules (id, course_id, title, order)
videos (id, module_id, title, video_url, duration, order)
enrollments (id, user_id, course_id, enrolled_at)
access_codes (id, code, course_id, is_used, created_by, created_at)
user_progress (user_id, video_id, completed, last_position)
```

### AI Prompt Template for Phase 2
```
Continue the course platform project.

I need to:
1. Design and create the complete database schema in Supabase
2. Setup Row Level Security policies
3. Build signup and login pages matching the Figma design
4. Implement role-based access (student/teacher/admin)
5. Create the access code generation and redemption system

Database needs:
- User profiles with roles
- Courses with modules and videos
- Enrollment tracking
- Access codes (for cash payment)
- Video progress tracking

[Attach Figma designs for auth pages]
```

---

## PHASE 3: Landing Page & Course Listing ✅ COMPLETE
**Goal**: Build public-facing pages with course browsing
**Token Estimate**: ~35k tokens

### Tasks
1. **Landing Page (`/`)**
   - Hero section with CTA
   - Feature highlights
   - Course preview section (3-6 courses)
   - Call-to-action sections
   - Footer with links

2. **Course Listing Page (`/courses`)**
   - Grid/list view of all courses
   - Course card components (thumbnail, title, description)
   - Search/filter functionality (optional for phase)
   - Pagination or infinite scroll
   - Empty state handling

3. **Course Detail Page (`/courses/[id]`)**
   - Course overview and description
   - Teacher information
   - Course curriculum (modules & videos list)
   - "Enroll" button (shows code redemption modal)
   - Preview video (if available)

4. **Access Code Redemption Modal**
   - Input for access code
   - Validation feedback
   - Success/error states
   - Auto-redirect to course after enrollment

5. **Responsive Design**
   - Mobile-first approach
   - Tablet and desktop layouts
   - Touch-friendly interactions

### Best Practices & References
- **Next.js Dynamic Routes**: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
- **Server vs Client Components**: https://nextjs.org/docs/app/building-your-application/rendering/server-components
- **Headless UI Components**: https://headlessui.com/

### Deliverables
- Polished landing page
- Course browsing experience
- Course detail pages
- Working code redemption flow
- Fully responsive across devices

### AI Prompt Template for Phase 3
```
Continue the course platform. Build the public-facing pages.

Pages needed:
1. Landing page (/) - Hero, features, course preview, CTA
2. Course listing (/courses) - Grid of all courses with search
3. Course detail (/courses/[id]) - Full course info, curriculum, enroll button

Features:
- Access code redemption modal (student enters code to enroll)
- Responsive design (mobile-first)
- Empty states
- Loading states

Use the design system and match Figma designs.

[Attach Figma designs for these pages]
```

---

## PHASE 4: Bug Fixes & Foundation Cleanup 🔧 NEXT UP
**Goal**: Fix all known bugs from the review before building new features. This is a short, focused session — do not build anything new, only fix what's listed.
**Estimated Session Size**: Small-Medium (~20k tokens of work)

### Context to Provide Claude
```
We're on a Next.js 14 + Supabase course platform (physics education). 
The codebase is at INTPHY-REAL. We've finished Phase 3 and identified 19 bugs.
Fix all bugs listed below. Do NOT build new features. 
Use the Supabase client pattern from Critical Code Patterns section.
```

### Bug Fix Checklist (fix in this order)

**Critical — Fix First**
- [ ] **`app/layout.tsx`** — Wrap children with `ThemeProvider` from `next-themes` (attribute="class", defaultTheme="dark"). Import and mount `ConditionalLayout` around children so header/footer render on public routes.
- [ ] **`components/conditional-layout.tsx`** — Verify the `isPublicRoute` logic is correct, ensure login/signup pages are excluded from header/footer.
- [ ] **`app/courses/[id]/enroll-button.tsx`** — If `isFree === true` and user is logged in, skip the modal entirely and directly insert an enrollment row. Show a loading state then success state.
- [ ] **`app/admin/codes/page.tsx`** — Fix the course filter: the `AccessCode` type and query don't return `course_id` on the object. Add `course_id` to the Supabase select query and add it to the `AccessCode` interface.
- [ ] **`app/courses/[id]/enroll-button.tsx`** — Replace the two-step code check + update with a call to the `redeem_access_code` Supabase RPC (already defined in `lib/auth.ts`'s `redeemAccessCode`). Remove the raw access_codes queries.

**Significant — Fix Second**
- [ ] **`lib/supabase/middleware.ts`** — Add `/admin` to protected routes alongside `/dashboard`. Admin routes must redirect to `/login` if no user.
- [ ] **`lib/roles.ts`** — Fix `getRoleBasedRedirect`: change `'/admin/dashboard'` to `'/admin'`.
- [ ] **`app/admin/codes/page.tsx`**, **`app/admin/courses/[id]/content/page.tsx`**, **`app/admin/courses/[id]/edit/page.tsx`** — Move `createClient()` call inside a `useMemo` or initialize it once with `useState` to prevent a new client instance on every render.
- [ ] **`app/admin/courses/[id]/content/page.tsx`** — Add `supabase` to the `useCallback` dependency array for `fetchData`, or move the supabase client initialization inside the callback.

**Minor — Fix Last**
- [ ] **`app/signup/page.tsx`** — Remove both `console.log` statements.
- [ ] **`app/admin/page.tsx`** — Remove hardcoded trend strings or replace with `null`/empty. Remove or guard the `last_activity_at` query (wrap in try/catch or remove the activeStudents query if the column doesn't exist).
- [ ] **`app/admin/page.tsx`** — Guard the `course_analytics` query: if it returns an error, log it and show 0s rather than crashing.
- [ ] **`app/dashboard/page.tsx`** — "Continue Learning" link should go to `/dashboard/courses/${enrollment.courses?.id}` (the future course view page) — update the href now so it's correct when Phase 5 is built.
- [ ] **`app/dashboard/page.tsx`** — Add a teacher role block showing: welcome message + link to admin panel (since admin handles course management).
- [ ] **`app/debug/page.tsx`** — Add an admin-only check: fetch user profile and redirect to `/dashboard` if not admin.
- [ ] **`app/api/auth/signout/route.ts`** — Replace the redirect origin with `request.nextUrl.origin` (from the `NextRequest`) instead of `process.env.NEXT_PUBLIC_APP_URL`.
- [ ] **`app/actions/auth.ts`** — Remove the inner `'use server'` directive from inside the `refreshSession` function body.
- [ ] **`lib/supabase/.env.local`** — Delete this file. Environment variables belong only in the project root `.env.local`.

### Deliverables
- All 19 bugs fixed and tested
- Theme toggle working
- Header/footer visible on public pages
- Free course enrollment working without a code
- Admin access code filter working
- Code redemption using atomic RPC

---

## PHASE 5: Student Course View & Video Player 🎬 UPCOMING
**Goal**: Build the complete student learning experience — from enrolled courses dashboard to watching a video and saving progress.
**Estimated Session Size**: Medium-Large (~45k tokens of work)

### Context to Provide Claude
```
We're on a Next.js 14 + Supabase + Cloudflare R2 course platform.
Phase 4 bugs are fixed. Now build the student learning experience.
Students are authenticated. Enrolled courses are fetched.
Videos are stored in Cloudflare R2, accessed via signed URLs.
Use the Supabase client pattern from Critical Code Patterns.
Use server components where possible, client components only where needed.
```

### Tasks

**1. Upgrade Student Dashboard (`/dashboard/page.tsx`)**
- Replace inline styles with Tailwind classes (consistent with rest of app)
- Add "Continue Watching" section — show the last video a student was watching across all enrolled courses (query `user_progress` for most recent `updated_at` where `completed = false`)
- Enrolled course cards should show a progress bar (% of videos completed in that course)
- "Continue Learning" button goes to `/dashboard/courses/[id]`

**2. Student Course View Page (`/dashboard/courses/[id]/page.tsx`)**
- Server component — fetch course, modules, videos, and user's progress for this course
- Layout: left sidebar + right content area
- **Sidebar**: course title, modules list collapsed/expanded, each video as a clickable row showing: video title, duration, completion checkmark if done, "playing" indicator if current
- **Main area**: when no video is selected, show course overview (description, stats, instructor note)
- Clicking a video in the sidebar navigates to `/dashboard/watch/[videoId]`
- Show overall course progress bar at the top of sidebar
- Guard: redirect to `/courses/[id]` if student is not enrolled

**3. R2 Signed URL API Route (`/api/videos/signed-url/route.ts`)**
- `GET /api/videos/signed-url?videoId=[id]`
- Server-side: verify user is authenticated and enrolled in the course this video belongs to
- Fetch the video record from Supabase to get the `video_url` (R2 object key)
- Generate a signed URL using `@aws-sdk/s3-request-presigner` with the R2 credentials from env
- Return `{ signedUrl: string, expiresIn: number }`
- Return 401 if not authenticated, 403 if not enrolled, 404 if video not found

```typescript
// Env vars needed (add to .env.local):
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

**4. Video Player Page (`/dashboard/watch/[videoId]/page.tsx`)**
- Server component wrapper: fetch video metadata, verify enrollment, get adjacent videos (prev/next)
- Pass video ID (not the signed URL) to a client component — the client fetches the signed URL fresh
- **Client component `<VideoPlayer />`**:
  - On mount, call `GET /api/videos/signed-url?videoId=[id]` to get the signed URL
  - Use a native HTML5 `<video>` element or the `plyr` library (install `plyr` and `@types/plyr`)
  - Controls: play/pause, volume, fullscreen, playback speed (0.75x, 1x, 1.25x, 1.5x, 2x)
  - On `timeupdate` event, debounce saving position every 5 seconds to Supabase `user_progress`
  - On video end (or at 90% watched), mark video as `completed = true` in `user_progress`
  - On load, seek to `last_position` from `user_progress` if it exists and `completed = false`
  - Show loading skeleton while signed URL is fetching
- **Below the video**: video title, module name, prev/next video navigation buttons
- **Sidebar** (same as course view): module/video list showing progress, current video highlighted

**5. Progress Tracking**
- `user_progress` table columns needed: `user_id`, `video_id`, `completed` (bool), `last_position` (int, seconds), `updated_at`
- Upsert on position save: `supabase.from('user_progress').upsert({ user_id, video_id, last_position, completed }, { onConflict: 'user_id,video_id' })`
- Debounce the save call by 5 seconds using `setTimeout`/`clearTimeout`
- On mark complete: set `completed = true`, `last_position = 0`

### API Routes Needed
```
GET  /api/videos/signed-url?videoId=[id]   → returns signed R2 URL
```

### Dependencies to Install
```bash
npm install plyr
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Deliverables
- Upgraded dashboard with progress bars and continue-watching
- `/dashboard/courses/[id]` — course view with sidebar
- `/api/videos/signed-url` — secure signed URL endpoint
- `/dashboard/watch/[videoId]` — video player with progress tracking
- Videos resume from last position
- Videos auto-marked complete at 90%

---

## PHASE 6: Polish, SEO & Production Readiness ✨ UPCOMING
**Goal**: Final quality pass — loading states, error handling, SEO metadata, 404 page, and mobile responsiveness check. Keep this session strictly polish, no new features.
**Estimated Session Size**: Small-Medium (~25k tokens of work)

### Context to Provide Claude
```
We're on a Next.js 14 + Supabase course platform. 
Phases 1-5 are complete. This is the final polish pass.
Do not build new features. Only improve existing pages.
Use the design system: dark bg #25292D, primary #6A0DAD, body text #EFEFEF.
```

### Tasks

**1. Loading States**
- Add `loading.tsx` files for: `/courses`, `/courses/[id]`, `/dashboard`, `/dashboard/courses/[id]`, `/dashboard/watch/[videoId]`
- Each loading file should export a skeleton component matching the page's layout
- Use Tailwind's `animate-pulse` with gray/dark placeholder blocks

**2. Toast Notifications**
- Install and configure a toast library (recommended: `sonner` — lightweight, no dependencies)
- Add toasts for: successful enrollment, code redemption error, progress save error, sign out
- Wrap root layout with the `<Toaster />` component

**3. SEO Metadata**
- Add `generateMetadata` export to: `/courses/page.tsx`, `/courses/[id]/page.tsx`, `/dashboard` pages
- Each course detail page should have dynamic OG title: `"[Course Title] — Physics Platform"`
- Root layout metadata is already set, just ensure it's accurate

**4. Custom 404 Page**
- Create `app/not-found.tsx`
- Style consistent with the dark design system
- Show: large "404" text, "Page not found" message, link back to home and courses

**5. Error Boundaries**
- `app/courses/[id]/not-found.tsx` already exists — verify it's styled correctly
- Ensure `app/error.tsx` and `app/dashboard/error.tsx` have a working "Try again" button

**6. Mobile Responsiveness Audit**
- Test and fix: header mobile menu, course grid, video player controls, dashboard sidebar
- The video player sidebar should collapse on mobile (drawer/toggle pattern)
- Ensure the access code modal is usable on small screens

**7. Remove Dev Artifacts**
- Remove or admin-gate `/debug` page
- Remove `/refresh-session` page (utility page not needed in production)
- Clean up `web-docs/` folder if no longer needed

### Dependencies to Install
```bash
npm install sonner
```

### Deliverables
- Loading skeletons on all major pages
- Toast notifications for user actions
- Proper SEO metadata
- Clean 404 page
- Mobile-friendly video player
- Production-ready codebase with no debug artifacts

---

## PHASE 4: Student Dashboard & Video Player (ORIGINAL — replaced by Phases 5 & 6 above)
**Goal**: Student interface for enrolled courses and video playback
**Token Estimate**: ~45k tokens

> ⚠️ Note: This original phase has been split into the new **Phase 5** (Student Course View & Video Player) and **Phase 6** (Polish). The admin dashboard was also built early (before Phase 2) for testing. Refer to the new phases above.

---

## PHASE 5: Teacher Dashboard - Course Management (ORIGINAL — not needed)
**Goal**: Teacher interface for creating and managing courses
**Token Estimate**: ~50k tokens

> ⚠️ Note: Since this is a single-teacher platform, the Admin Panel (`/admin`) already serves all course management needs. A separate teacher dashboard is not required. This phase is **skipped**.

---

## PHASE 6: Admin Panel & Access Code Management (ORIGINAL — mostly complete)
**Goal**: Admin interface for user management and code generation
**Token Estimate**: ~35k tokens

> ✅ Note: The admin panel was built early (before Phase 2) and covers: courses, modules, videos, access code generation/management, student list, and user management. The new **Phase 4 bug fixes** will clean it up. No further work needed on admin.

---

## PHASE 7: Polish, Optimization & Testing (ORIGINAL — replaced by Phase 6 above)
**Goal**: Final touches, performance optimization, bug fixes
**Token Estimate**: ~30k tokens

> ⚠️ Note: Replaced by the new **Phase 6: Polish, SEO & Production Readiness** above.

---

## Critical Code Patterns (Reference These, Don't Re-explain)

### Supabase Client Pattern
```typescript
// app/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

### Server Component Data Fetching
```typescript
// app/courses/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function CoursesPage() {
  const supabase = createClient()
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('published', true)
  
  return <CourseGrid courses={courses} />
}
```

### Protected Route Middleware
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  // Check auth and redirect if needed
}
```

### R2 Upload API Route Pattern
```typescript
// app/api/upload/route.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export async function POST(request: Request) {
  // Generate presigned URL
  // Return to client for direct upload
}
```

**Tell Claude**: "Use the Supabase client pattern from the Critical Code Patterns section"

---

## Post-Development: Deployment

### Deployment Checklist
1. **Vercel Deployment** (recommended for Next.js)
   - Connect GitHub repository
   - Configure environment variables
   - Setup custom domain (optional)

2. **Supabase Production**
   - Create production project
   - Run migrations
   - Update environment variables

3. **Cloudflare R2**
   - Setup production bucket
   - Configure CORS
   - Update API keys

4. **Post-Deployment**
   - Create first admin user
   - Test critical flows in production
   - Monitor error logs
   - Setup analytics (optional)

---

## Guidelines for AI-Assisted Development

### How to Use Best Practice Links:
**DON'T paste entire documentation** - This wastes tokens!

**DO mention patterns:**
```
"Follow the Next.js App Router patterns for server components"
"Use Supabase RLS best practices for securing the users table"
"Implement Cloudflare R2 presigned URLs for video uploads"
```

**When AI struggles:**
1. Ask: "What's the recommended pattern for [specific task]?"
2. AI will reference the docs without you pasting them
3. If AI hallucinates, then share a specific snippet

**Token-Saving Tips:**
- Reference links by name: "Use the react-player library approach"
- Let AI access its training: Most of these docs are in Claude's knowledge
- Only paste code snippets when debugging specific errors

### For Each Phase:
1. **Start Fresh**: Begin each phase in a new Claude conversation to avoid token limits
2. **Provide Context**: Copy the relevant phase section from this document
3. **Attach Figma**: Always include Figma designs in your prompt
4. **Test Incrementally**: Test each feature as it's built
5. **Save Progress**: Commit code after completing each major task

### Communication with Claude:
- Be specific about what you're building
- Mention which phase you're on
- Include error messages in full when debugging
- Ask for explanations when you don't understand something
- Request step-by-step instructions for complex tasks

### When Bugs Arise:
- Try to understand the error first
- Check console and network tabs
- Review the code AI generated
- Ask AI for debugging help if stuck
- Document the solution for future reference

### Code Review Points:
- Ensure proper TypeScript typing
- Check for security issues (especially RLS policies)
- Verify responsive design
- Test with both themes
- Confirm proper error handling

---

## Environment Variables Template

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.r2.dev

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Success Criteria

### Phase 1 ✅
- Project runs locally
- Theme toggle works
- Navigation structure in place

### Phase 2 ✅
- Can sign up and log in
- Database tables exist with RLS
- Roles are enforced

### Phase 3 ✅
- Landing page matches design
- Can browse all courses
- Code redemption works

### Phase 4 (Bug Fixes) ✓ when:
- Theme toggle works
- Header/footer visible on all public pages
- Free courses enroll without a code
- Admin access code filter works by course
- No console errors on any page

### Phase 5 (Video Player) ✓ when:
- Student can navigate to a course from dashboard
- Sidebar shows all modules and videos with progress
- Video plays from Cloudflare R2
- Position saves every 5 seconds
- Video auto-marks complete at 90%
- Student resumes from last position on revisit

### Phase 6 (Polish) ✓ when:
- Loading skeletons appear while pages load
- Toast appears on enrollment success/failure
- All pages have proper SEO titles
- 404 page is styled and working
- No debug/dev pages accessible in production

---

## Tips for Success

1. **Don't Skip Phases**: Each phase builds on the previous
2. **Test Thoroughly**: Test each feature before moving on
3. **Keep Figma Handy**: Always reference designs when building UI
4. **Use TypeScript**: Don't disable type checking
5. **Commit Often**: Save your progress regularly
6. **Ask for Clarification**: If AI generates unclear code, ask for explanation
7. **Mobile First**: Always test on mobile as you build
8. **Accessibility**: Ask AI to include ARIA labels and keyboard navigation

---

## Common Pitfalls to Avoid

- ❌ Skipping RLS policies (security risk)
- ❌ Not handling loading states
- ❌ Ignoring error cases
- ❌ Forgetting to test on mobile
- ❌ Not validating forms properly
- ❌ Hardcoding values instead of using environment variables
- ❌ Not testing video playback in different browsers
- ❌ Forgetting to add confirmation dialogs for destructive actions

---

## Emergency Contacts & Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Community Help
- Next.js Discord
- Supabase Discord
- Stack Overflow

### When Completely Stuck
1. Review the phase objectives
2. Check if previous phases are working
3. Search for similar examples online
4. Ask in developer communities
5. Simplify the feature and try again

---

## Version History
- v1.0 - Initial agents.md creation
- v2.0 - Updated after Phase 3 completion. Restructured phases based on actual codebase state. Added Current Status section, bug fix checklist, and new Phase 4/5/6 replacing original Phase 4-7. Admin dashboard built early is accounted for. Teacher dashboard phase removed (single-teacher platform uses admin panel).

---

**Remember**: This is a learning project. It's okay to make mistakes, iterate, and improve. The goal is to build a functional platform while learning modern web development with AI assistance.
