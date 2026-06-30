# SpaceIN CRM (Next.js)

Modern rebuild of Space IN Business Center CRM.
rre
## Stack

- **Next.js 16** + TypeScript + Tailwind + shadcn/ui
- **NextAuth** (credentials via `crm_users` in Supabase)
- **Supabase Postgres** (clients, activity log, offices, settings)

## First-time Supabase setup

### 1. Environment variables

Copy `.env.example` → `.env.local` and fill in your Supabase + auth values.

`DATABASE_URL` password must be URL-encoded (`@` → `%40`).

### 2. Create tables

**Option A — CLI (if direct DB connection works):**

```bash
npm run db:setup
```
rwrr
**Option B — Supabase Dashboard (if migrate fails):**

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Paste and run `supabase/migrations/001_initial.sql`
3. Then run `supabase/migrations/002_admin_root.sql`
4. Then seed data:

```bash
npm run db:seed
```

### 3. Run the app

```bash
npm install
npm run dev
```

Open http://localhost:3000

### Demo login (after seed)

| Email | Password | Role |
|-------|----------|------|
| admin@spacein.bh | admin123 | Root admin |

Additional administrators can be created under **Settings → Administrators** (admin-only).

Staff accounts can be created under **Settings → Staff**.

## Deploy (Vercel)

1. Root directory: `web`
2. Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AUTH_SECRET`
   - `AUTH_URL` (your production URL)
3. Run migration + seed against production DB once

## Phase status

- [x] Phase 1 — App shell, auth, core CRM pages
- [x] Phase 2a — Supabase schema, server actions, auth users in DB
- [x] Phase 2b — Analytics, Offices, CR & Contracts, invoices/comms
- [x] Phase 3 — A4 PDF, Resend email, WhatsApp Cloud API (with fallbacks)

## Email & WhatsApp setup

### Resend (recommended)

1. Create an account at [resend.com](https://resend.com)
2. Verify your sending domain (or use Resend's test domain in dev)
3. Add to `.env.local`:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL` — e.g. `Space IN <billing@yourdomain.com>`
   - `RESEND_REPLY_TO` — optional, defaults to `Spacein.bh@gmail.com`

Without Resend, the app logs the email and opens your mail client.

### WhatsApp Business Cloud API

1. Create a [Meta Developer](https://developers.facebook.com/) app with WhatsApp product
2. Add a business phone number and get a permanent access token
3. Add to `.env.local`:
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID` (from WhatsApp → API Setup)
   - `WHATSAPP_API_VERSION` — optional, defaults to `v21.0`

Without these, WhatsApp opens a `wa.me` link (manual send from the user's phone).

### A4 invoices / PDF

Click **Print / Save PDF (A4)** on any invoice or receipt. A new window opens with a true **210×297mm A4** layout — use the browser's **Save as PDF** with paper size **A4**.

## Legacy

`../SpaceIN_CRM_v2.html` is deprecated.
