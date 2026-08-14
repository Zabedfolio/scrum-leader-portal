# Scrum Leader Portal - AI Guide

This document guides AI assistants (like Claude, Cursor, Gemini, etc.) on how to build, test, and style code in this codebase.

---

## 🛠️ Build & Run Commands

- **Development Server:** `npm run dev`
- **Production Build Compile:** `npm run build`
- **Production Execution:** `npm run start`
- **Lint Check:** `npm run lint`

## 🗄️ Core Database Scripts
- **Database Seed (Creates default admin):** `node scripts/seed.js`
- **Clear Collections (Clean database state):** `node scripts/clear-collections.js`
- **Rules Validation Test Suit:** `node scripts/validate-rules.js`

---

## 📐 Project Structure

- `app/` - Next.js App Router Pages and APIs
  - `app/api/` - Backend authentication, member CRUD, and session management API routes
  - `app/checkin/[token]/` - Public user-facing check-in screen flow
  - `app/dashboard/` - Admin leader panels (attendance spreadsheet grid, points, settings)
- `components/` - Shared UI layout panels and Loader components
- `models/` - Mongoose database schemas (`Member`, `Team`, `ScrumSession`, `AttendanceRecord`)
- `lib/` - UI context providers (Stackable Toasts, Modal alerts) and MongoDB client connection helpers

---

## 🎨 Code Style & Conventions

1. **Next.js & React:**
   - Use Client Components (`'use client';` directive) strictly for views utilizing hooks (`useState`, `useEffect`, `useContext`).
   - Use absolute imports starting with `@/` for root directories.
2. **Styling:**
   - Standard Tailwind CSS utility classes.
   - For icons, import strictly from `@gravity-ui/icons` (e.g. `CircleCheck`, `TriangleExclamation`, `Handset`, `Envelope`). Emojis are disallowed in UI strings.
3. **Database Pre-Hooks:**
   - Asynchronous Mongoose pre-validate or pre-save middleware should not use a callback (`next`), returning a Promise is standard practice.
4. **Security & Validation:**
   - Public APIs must verify both the device check-in cookies (`checked_in_[token]`) and Google Identity ID tokens to prevent duplicate/proxy check-ins.

---

## 🚀 Future Scope & Upcoming Features

Here are key enhancements recommended for the next phase of development:

### 1. 💬 Notification Webhooks
- **Slack/Discord/Microsoft Teams Integrations:** Trigger a webhook notify payload automatically when a Scrum Leader creates a new session link, sending the public check-in link directly to the team channels.

### 📝 2. Administrative Audit Log (Override History)
- Log changes in the database whenever an administrator manually overrides a member's attendance cell or edits points.
- Build an "Audit Trail" log tab in the admin panel showing who changed what, when, and the reason.

### 📴 3. Progressive Web App (PWA) & Offline Caching
- Cache assets and handle intermittent internet connectivity issues on the mobile check-in page so team members can queue check-ins offline, syncing them back to the server when network reconnects.

### 👥 4. Co-Admin / Team Leader Permissions Layer
- Expand roles (`member`, `team_leader`, `admin`).
- Allow users registered as `team_leader` to log in and manage the attendance grids for *their specific team only*, while keeping global settings and cross-team actions restricted to the Scrum Leader (owner).
