# Implementation Plan - Scrum Attendance & Points Dashboard

This plan outlines the architecture, database schema, API routing, and frontend pages for building a unified **Next.js (App Router, JavaScript)** application for tracking scrum attendance and points.

---

## User Review Required

> [!IMPORTANT]
> **Key Architectural Decisions & Guidelines:**
> 1. **Bangladesh Timezone (UTC+6):** All weekly resets and boundary calculations will use BST (Bangladesh Standard Time).
> 2. **Shared Check-in Tokens:** The "Generate Check-in Link" creates a token that applies across all teams. In the public check-in page, users select their team and name. If a team's session is finalized, checking in for that team is disabled.
> 3. **Strict Database-level Session Locking:** A pre-save and pre-update Mongoose hook is added to `AttendanceRecord` to reject updates on records whose parent `ScrumSession` is locked.
> 4. **No CORS or Separate Servers:** Since the backend and frontend run inside the same Next.js origin, relative path fetches will be used, and authentication is managed via an `httpOnly` secure JWT cookie.

---

## Open Questions

> [!NOTE]
> None. We will proceed with the specifications exactly as defined:
> - **Weekly flag**: 2 or more absences (Not Informed or Informed) within the current week (Monday-Sunday BST).
> - **Removal threshold**: Red badge for <= -4 cumulative "Not Informed" points; Orange badge for exactly -3.
> - **Locking**: Final Save locks the session, invalidates/expires the check-in token for that team/session, and auto-converts unresolved absences to Not Informed.

---

## Proposed Changes

### Component: Project Configuration

#### [NEW] [.env.local](file:///Users/zabedmahmud/Documents/Projects/scrum/.env.local)
Store environment variables: MongoDB URI, JWT Secret, Link Expiration, etc.

#### [NEW] [tailwind.config.js](file:///Users/zabedmahmud/Documents/Projects/scrum/tailwind.config.js)
Tailwind CSS configuration extending theme with custom light-green branding (`brand` color palette based on emerald/green shades) and responsive styles.

#### [NEW] [middleware.js](file:///Users/zabedmahmud/Documents/Projects/scrum/middleware.js)
Next.js middleware to intercept and protect admin dashboard routes (`/dashboard/:path*`, `/api/sessions/:path*`, etc.) by verifying the JWT cookie, redirecting unauthenticated requests to `/login`.

---

### Component: Core Libraries & Helpers

#### [NEW] [db.js](file:///Users/zabedmahmud/Documents/Projects/scrum/lib/db.js)
Cached Mongoose connection singleton helper to avoid creating multiple connections during serverless invocations and dev hot-reloads.

#### [NEW] [auth.js](file:///Users/zabedmahmud/Documents/Projects/scrum/lib/auth.js)
Utility to sign, verify JWT tokens, and parse/validate auth state for route handlers.

#### [NEW] [time.js](file:///Users/zabedmahmud/Documents/Projects/scrum/lib/time.js)
Timezone helper for Bangladesh Standard Time (BST, UTC+6) calculations:
- Find Monday 00:00:00 to Sunday 23:59:59 boundaries for any BST date.
- Convert dates between UTC and BST for MongoDB queries.

---

### Component: MongoDB Models

#### [NEW] [Team.js](file:///Users/zabedmahmud/Documents/Projects/scrum/models/Team.js)
Stores team information (`teamCode`, `teamName`).

#### [NEW] [Member.js](file:///Users/zabedmahmud/Documents/Projects/scrum/models/Member.js)
Stores member details (`name`, `teamId`, `email`, `phone`, `role`, `isActive`).

#### [NEW] [Admin.js](file:///Users/zabedmahmud/Documents/Projects/scrum/models/Admin.js)
Stores admin login credentials and hash (`name`, `email`, `passwordHash`, `role`).

#### [NEW] [ScrumSession.js](file:///Users/zabedmahmud/Documents/Projects/scrum/models/ScrumSession.js)
Stores session identifiers (`date`, `sessionType` [Day/Afternoon], `teamId`, `locked`, `lockedAt`, `checkInToken`, `checkInTokenExpiresAt`).
- Compound unique index on `{ date, sessionType, teamId }`.

#### [NEW] [AttendanceRecord.js](file:///Users/zabedmahmud/Documents/Projects/scrum/models/AttendanceRecord.js)
Stores individual member attendance status (`sessionId`, `memberId`, `status` [present, absent_not_informed, absent_informed, unresolved], `points`, and informed absence fields).
- Compound unique index on `{ sessionId, memberId }`.
- Pre-save/pre-update hooks to verify parent session's locked state and reject changes with 403 error if locked.

---

### Component: API Route Handlers

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/auth/login/route.js)
Authenticates the admin user, sets a secure, same-site, `httpOnly` cookie named `token`.

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/auth/logout/route.js)
Clears the `token` cookie.

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/auth/me/route.js)
Returns currently logged-in admin data.

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/teams/route.js)
Handles fetching list of teams and creating a new team.

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/teams/[id]/route.js)
Handles editing or deleting a team (soft delete or reject if members exist).

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/members/route.js)
Fetches and creates members (supports filtering by `teamId`).

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/members/[id]/route.js)
Handles editing and deleting/deactivating members.

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/sessions/route.js)
Fetches all sessions and associated attendance records. Serves as grid data.

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/sessions/generate-checkin-link/route.js)
Generates a check-in token for a given `date` and `sessionType`, creating the session documents for all 4 teams, returning the shared check-in link.

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/sessions/[id]/finalize/route.js)
Finalizes/locks a session. Converts unresolved members to `absent_not_informed`, sets `locked: true`, updates `lockedAt`.

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/attendance/[id]/mark-not-informed/route.js)
API to manually mark a member as `absent_not_informed` (deducts 1 point). Rejects if session is locked.

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/attendance/[id]/mark-informed/route.js)
API to mark a member as `absent_informed`, accepts reason, notes, and documentation URL. Rejects if session is locked.

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/attendance/[id]/mark-present/route.js)
API to manually override and mark a member present. Rejects if session is locked.

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/checkin/[token]/route.js)
Public API: Validates token, retrieves the 4 teams and their member list. Disables/omits locked/expired teams.

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/checkin/[token]/mark-present/route.js)
Public API: Allows self check-in by submitting `memberId` with the token.

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/points/summary/route.js)
Calculates and returns sortable points table (Present count, Not Informed count, Informed count, weekly points, all-time points).

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/points/flags/route.js)
Identifies flagged members (weekly >= 2 absences, all-time Not Informed count reaching -3 [orange warning] or >= -4 [red at risk]).

#### [NEW] [route.js](file:///Users/zabedmahmud/Documents/Projects/scrum/app/api/export/route.js)
Generates and downloads a CSV export of points and attendance history.

---

### Component: Frontend UI Pages

#### [NEW] [page.jsx](file:///Users/zabedmahmud/Documents/Projects/scrum/app/login/page.jsx)
Minimalistic, premium login form for the Scrum Leader.

#### [NEW] [layout.jsx](file:///Users/zabedmahmud/Documents/Projects/scrum/app/dashboard/layout.jsx)
Main dashboard container layout with premium Sidebar and Top Navbar.

#### [NEW] [page.jsx](file:///Users/zabedmahmud/Documents/Projects/scrum/app/dashboard/page.jsx)
Overview home widgets:
- Today's Session Status Widget (Day/Afternoon status across teams)
- At-risk members summary
- Primary "Generate Check-in Link" control with instant clipboard copy & QR code displays

#### [NEW] [page.jsx](file:///Users/zabedmahmud/Documents/Projects/scrum/app/dashboard/attendance/page.jsx)
Google Sheets style attendance grid:
- Team tabs
- Sticky member columns, horizontal scroll
- Inline popover actions (Toggle present, Informed absence triggers)
- Final Save action buttons

#### [NEW] [page.jsx](file:///Users/zabedmahmud/Documents/Projects/scrum/app/dashboard/points/page.jsx)
Points Summary tab view with filters and red/orange visual flags.

#### [NEW] [page.jsx](file:///Users/zabedmahmud/Documents/Projects/scrum/app/dashboard/members/page.jsx)
CRUD interface to manage teams and team members.

#### [NEW] [page.jsx](file:///Users/zabedmahmud/Documents/Projects/scrum/app/dashboard/settings/page.jsx)
Settings panel (expiry timer adjustment, admin password modification).

#### [NEW] [page.jsx](file:///Users/zabedmahmud/Documents/Projects/scrum/app/checkin/[token]/page.jsx)
Public Check-in screen: mobile-friendly layout, wizard UI (Team -> Name -> Check in).

---

### Component: Shared UI Components & Modals

#### [NEW] [AttendanceGrid.jsx](file:///Users/zabedmahmud/Documents/Projects/scrum/components/grid/AttendanceGrid.jsx)
Coordinates the horizontal sheet view and cell event handling.

#### [NEW] [GridCell.jsx](file:///Users/zabedmahmud/Documents/Projects/scrum/components/grid/GridCell.jsx)
Individual cell rendering. Implements the popover overlay menu.

#### [NEW] [InformedModal.jsx](file:///Users/zabedmahmud/Documents/Projects/scrum/components/grid/InformedModal.jsx)
React Hook Form modal to input Informed Absence details.

#### [NEW] [Sidebar.jsx](file:///Users/zabedmahmud/Documents/Projects/scrum/components/shared/Sidebar.jsx) & [Navbar.jsx](file:///Users/zabedmahmud/Documents/Projects/scrum/components/shared/Navbar.jsx)
Brand layout navigation.

---

### Component: Seeding Utilities

#### [NEW] [seed.js](file:///Users/zabedmahmud/Documents/Projects/scrum/scripts/seed.js)
MongoDB seeder script:
1. Wipes current DB (optional, with safeguard).
2. Creates the 4 teams (`1301.1` to `1301.4`).
3. Populates 5 members per team.
4. Inserts initial Scrum Leader Admin user credentials (`admin@scrum.local` / `password123`).

---

## Verification Plan

### Automated Verification
Since testing routes and Mongoose validations is critical, we will create a simple validation test script at `/scripts/validate-rules.js` and execute it with:
```bash
node scripts/validate-rules.js
```
This script will test:
- Block writes on locked session records (expect 403 / error).
- Token expiry and public check-in logic.
- Points engine calculations (+1 present, -1 not informed, 0 informed).

### Manual Verification
1. **Bootstrap Next.js:** Initialize workspace, boot up dev server, verify Tailwind config and default theme styling.
2. **Database Seeding:** Run seed script, verify collections in MongoDB.
3. **Login & Dashboard:** Access `/login`, authenticate, view dashboard stats.
4. **Link Generation & Public Check-in:** Generate link, open in private window, perform check-in flow, see cell auto-update to "Present" in real time.
5. **Final Save & Locking:** Press "Final Save" with unresolved members, verify confirmation message, see remaining members turn "Not Informed", verify lock icons and disabled styling, try modifying grid cell (verify `not-allowed`).
6. **Points and Badges:** Check `/dashboard/points` for weekly red highlights (>=2 absences) and orange/red badging for cumulative Not Informed counts.
