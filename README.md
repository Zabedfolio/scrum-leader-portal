# Scrum Leader Attendance & Points Portal

An internal administrative dashboard and public check-in application built for Scrum Leaders to track daily attendance, manage teams, auto-calculate performance standing points, and lock sessions securely.

🌐 **Live Production Link:** [scrum-leader-portal.vercel.app](https://scrum-leader-portal.vercel.app/)

---

## 🚀 Core Features

### 👨‍💼 1. Scrum Leader Dashboard (Admin Panel)
- **Real-time Stats:** Instantly view total members, active teams, weekly attendance rates, and warning flags.
- **Dynamic Session Manager:** Generate temporary check-in links (expiring after 15 minutes) for Day and Afternoon/Evening sessions.
- **Attendance Grid Control:** Fully interactive spreadsheet-like grid to toggle statuses between **Present**, **Absent (Informed)**, and **Absent (Not Informed)**.
- **Permanent Lockout:** Once finalized, sessions are locked permanently preventing any database modifications.
- **Points Export:** Export current standing sheets into CSV format in one click.

### 🛡️ 2. Double-Layer Proxy Prevention (Public Check-in Flow)
- **Step-by-step Wizard:** Responsive, mobile-first wizard for team members to select their cards, find their name, and register as present.
- **Secure Google Account Verification:** Automatically checks the browser's logged-in Google email against the database member registration. If they do not match, check-in is rejected to prevent colleagues from checking in for each other.
- **Browser Lockout:** Uses `localStorage` and `HttpOnly Secure Cookies` to block duplicate present check-ins from the same device/browser.

### 📊 3. Attendance Points Logic
- **Present:** `+1 point`
- **Absent (Informed):** `0 points` (Requires selecting a reason: *Exam, Sickness, Family Emergency, or Other*).
- **Absent (Not Informed):** `-1 point` (Assigned automatically for un-submitted cells when a session is finalized and locked).
- **At-Risk Flagging:** Members missing attendance thresholds are flagged as "At-Risk" directly on the dashboard page.

---

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router, Turbopack enabled)
- **Styling:** Tailwind CSS & Custom CSS variables
- **Database:** MongoDB Atlas (NoSQL) & Mongoose ORM
- **Authentication:** JSON Web Tokens (JWT) stored in HttpOnly cookies
- **Identity Provider:** Google Identity Services (OAuth 2.0 ID Token verification)
- **Icons:** Gravity UI Icons

---

## ⚙️ Environment Variables Setup

Create a `.env.local` file in the root directory and populate it with the following configuration keys:

```ini
# MongoDB Connection String
MONGODB_URI=your-mongodb-atlas-connection-uri

# JWT Authentication Secret
JWT_SECRET=your-32-character-jwt-secret

# Public Check-in link expiry time (minutes)
CHECKIN_LINK_EXPIRY_MINUTES=15

# Public URL (use http://localhost:3000 for local development)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Google OAuth Credentials (for browser email verification)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

---

## 📦 Local Installation & Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/scrum-leader-portal.git
   cd scrum-leader-portal
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Database Seed (Creates initial administrator user):**
   Run the database seed script to insert the default administrator user credentials:
   ```bash
   npm run seed
   ```
   *Default Credentials:*
   - **Email:** `zabedfolio@gmail.com`
   - **Password:** `zabedfolio12345`

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

5. **Build for production compilation:**
   ```bash
   npm run build
   ```

---

## ⚡ Deployment to Vercel

1. Push your code to a GitHub repository.
2. Link your repository inside your [Vercel Dashboard](https://vercel.com).
3. Populate all environment variables from `.env.local` in Vercel's **Environment Variables** settings.
4. Set the build command to: `npm run build`.
5. Deploy!

> [!IMPORTANT]
> **Google Cloud Console Settings:**
> To enable the secure browser Google Account check on your live domain, you **MUST** add both `http://localhost:3000` and your production URL `https://scrum-leader-portal.vercel.app` inside the **Authorized JavaScript origins** section of your credentials in the [Google Cloud Console](https://console.cloud.google.com/).
