# Kakuma Digital Work Connect (KDWC)

> A full-stack, offline-ready platform that helps refugee and host-community youth in Kakuma learn digital skills, earn verifiable certificates and find paid remote work.

**Live app:** https://kakumadigitalworkconnect.vercel.app
**GitHub repository:** https://github.com/jamesdeng462/kakuma_digital_work_connect
**Demo video:** https://youtu.be/rfx6S7khH8w
**SRS document:** [Software Requirements Specification](https://docs.google.com/document/d/1wRJMec7Icftdl1X-7rmqAMhzzV6NBSFyviQE8xigjcQ/edit?usp=sharing)
**API reference (live):** https://kakumadigitalworkconnect.vercel.app/api/docs
**Author:** James Giir Deng, African Leadership University

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [The Solution (MVP)](#2-the-solution-mvp)
3. [Demo Accounts](#3-demo-accounts)
4. [Features by Role](#4-features-by-role)
5. [Tech Stack](#5-tech-stack)
6. [Architecture & System Design](#6-architecture--system-design)
7. [Prerequisites](#7-prerequisites)
8. [Run It Locally (Step by Step)](#8-run-it-locally-step-by-step)
9. [Deploy to Vercel + Neon (Step by Step)](#9-deploy-to-vercel--neon-step-by-step)
10. [Environment Variables](#10-environment-variables)
11. [Testing](#11-testing)
12. [Demo Walkthrough](#12-demo-walkthrough)
13. [SRS Requirements Traceability](#13-srs-requirements-traceability)
14. [Security](#14-security)
15. [Sandboxed External Services](#15-sandboxed-external-services)
16. [Known Limitations & Future Work](#16-known-limitations--future-work)
17. [Project Structure](#17-project-structure)
18. [API Reference](#18-api-reference)
19. [Development Workflow](#19-development-workflow)
20. [Troubleshooting](#20-troubleshooting)

---

## 1. The Problem

Kakuma Refugee Camp in Turkana County, Kenya, opened in 1992. Together with the Kalobeyei settlement it is home to **more than 280,000 people from over 20 countries** (UNHCR, 2024). Young people there face:

- **Few jobs.** Formal work is scarce, and refugees face limits on movement and the right to work.
- **No recognised ID.** Many have no national ID or formal certificates, so mainstream job and payment platforms shut them out.
- **No route into the digital economy.** Training rarely leads to real, paid work.
- **No financial access.** Many are unbanked and cannot receive international payments.
- **Poor connectivity.** Most people use low-end Android phones on 2G/3G with expensive data.

**Why it matters:** without income, young people stay dependent on aid, and the skills they build never become livelihoods.

## 2. The Solution (MVP)

KDWC is a **full-stack, offline-first Progressive Web App** covering the whole journey from learning to earning:

**Verify identity (no national ID needed) → Learn → Pass a server-graded quiz (≥70%) → Earn a tamper-evident, QR-verifiable certificate → Get AI-matched to jobs from vetted employers → Sign a digital contract → Deliver work → Get paid (M-Pesa, 5% platform fee) → Rate each other**

It also has mentor-led learning cohorts, youth-led governance, an anonymous safeguarding channel, an admin console with an audit log, and impact reporting for humanitarian partners.

**The MVP is a complete working product:** a REST API with 67 endpoints, a PostgreSQL database, password hashing, login sessions, role-based access control, every business rule enforced on the server, and a responsive multilingual frontend that keeps working offline.

## 3. Demo Accounts

Every demo account uses the password **`Demo1234!`**. You can also log in with one click on the login page.

| Role | Email | What to try |
|---|---|---|
| Youth Worker | `worker@kdwc.demo` | Courses, quiz, certificate, AI job matches, apply, submit work, wallet |
| Employer (verified) | `employer@kdwc.demo` | Post a job, review applicants, hire, approve work, pay |
| Employer (pending) | `pending@kdwc.demo` | Shows that unverified employers cannot post jobs (BR2) |
| Mentor | `mentor@kdwc.demo` | Create cohorts, add learners, post in discussions |
| Administrator | `admin@kdwc.demo` | Verify employers, moderation, safeguarding, disputes, audit log, reset data |
| Humanitarian Partner | `partner@kdwc.demo` | Impact dashboard, CSV report export, safeguarding escalations |
| Youth Governor | `governor@kdwc.demo` | Propose policies, vote |
| Youth (no certificate yet) | `esther@kdwc.demo` | Shows that applying is blocked until a course is passed (BR1) |

**Sandbox values for signup:** UNHCR number `KAK-123456` (any `KAK-` followed by 6 digits); OTP / email code `123456`.

> The data is shared by everyone using the live app. If it gets messy, log in as **Admin → Admin → Users → Reset demo data**.

## 4. Features by Role

### Youth Worker
- **Onboarding** that follows the SRS activity diagram: UNHCR ProGres check, or another method (phone OTP, email code, document upload with self-attestation), then digital identity, role, language, connectivity check, quick tutorial and first course. Verification is **re-checked on the server**.
- **4 languages:** English, Kiswahili, Arabic (full right-to-left layout), French
- **7 courses** across Data Entry, Graphic Design, Web Development, Customer Service, Data Annotation, Digital Marketing and Financial Literacy
- Lessons → **competency quiz graded on the server** (answers never reach the browser), with a **70% pass mark**
- **Offline study:** downloaded courses work without internet, and progress syncs automatically on reconnect
- **Auto-issued certificate:** UUID, SHA-256 integrity hash checked by the server, QR code, public verification page, print/PDF and **Add to LinkedIn**
- **AI career guidance:** learning path, job-readiness score, ranked job matches with reasons, market demand
- **Jobs** with 5 filters and **one-click apply**; application tracking; job reporting
- **Contracts:** sign, submit work, handle revisions, raise disputes, rate the employer
- **E-wallet:** balance, analytics, earnings chart, withdrawals (M-Pesa / Airtel Money / Chipper Cash / bank), history, and a microfinance referral after 3 months of income
- **Cohorts** with discussions that are automatically screened for scams; **governance** voting

### Employer
- Signup with **company vetting** (registration number, payment capability, anti-exploitation agreement, email code). The account stays **pending until an admin approves it** (BR2).
- Post jobs; certified workers in that domain are notified automatically
- Review applicants with their **verified certificates**; shortlist, reject or **hire**. Hiring generates the **digital work agreement**.
- Review submissions, request revisions, approve, then **pay**. The fee is deducted inside one database transaction, with protection against double payment.
- Wallet top-up; rate workers

### Mentor
- Create cohorts (active at 8 learners, maximum 15, enforced by the server), add or remove learners, track their progress, facilitate discussions, view the impact dashboard

### Administrator
- Platform metrics; **employer verification**; **moderation** queue; **safeguarding** reports; **disputes**; user directory; **audit log** of privileged actions; reset demo data

### Humanitarian Partner
- **Impact dashboard** (reach, gender, refugee vs host community, countries, earnings, certificates, placements) and the **quarterly CSV report** generated by the server; safeguarding escalations

### Youth Governor
- **Propose policies**, vote (one vote per person, changeable while open), close voting

### Everyone, including logged-out visitors
- **Anonymous safeguarding / GBV channel**, which stores no reporter identity in the database, plus real helplines (1195, UNHCR 1517); notifications for every key event

## 5. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | **Next.js 15** (App Router), **React 19**, **TypeScript**, **Tailwind CSS** | One codebase, fast pages, mobile-first, built-in RTL support |
| Backend | **Node.js** REST API (Next.js route handlers, `src/server`) | Matches the SRS (Node.js backend); deploys together with the frontend |
| Database | **PostgreSQL** via **Drizzle ORM** | Matches the SRS (PostgreSQL primary DB); typed queries and SQL migrations |
| Local database | **PGlite** (embedded PostgreSQL) | Zero-setup local development: no database install needed |
| Auth | **bcrypt** password hashes + **JWT** in an httpOnly, SameSite cookie (`jose`) | Secure sessions; no tokens in JavaScript |
| Validation | **zod** | Every request body is validated, with clear error messages |
| Offline | Service worker + on-device cache + outbox sync | SRS 2.4 / 6.1 c / 6.2 h (offline-first PWA, sync-on-connect) |
| Hosting | **Vercel** (app) + **Neon** (PostgreSQL), both free tiers | Public URL; the database is hosted on AWS |

## 6. Architecture & System Design

```
 Android phone / browser (installable PWA)
 ┌─────────────────────────────────────────────┐
 │ Pages (src/app/*)  ─►  API client           │
 │                        src/lib/store.ts     │
 │                        - offline cache      │
 │                        - outbox sync        │
 │ Service worker (public/sw.js): page cache   │
 └───────────────┬─────────────────────────────┘
                 │ HTTPS  /api/*  (JSON, session cookie)
 ┌───────────────▼─────────────────────────────┐
 │ Node.js REST API (src/server)               │
 │  router.ts  → auth (JWT cookie) + RBAC      │
 │  routes/    → auth · learning · marketplace │
 │               contracts+wallet · community  │
 │               admin+impact+sync             │
 │  business rules: BR1, BR2, 70% pass mark,   │
 │  5% fee, cohort 8–15, one rating per side   │
 │  adapters: ProGres · OTP · M-Pesa · AI      │
 └───────────────┬─────────────────────────────┘
                 │ Drizzle ORM (SQL)
 ┌───────────────▼─────────────────────────────┐
 │ PostgreSQL: 18 tables + audit log           │
 │ (Neon in production, PGlite locally)        │
 └─────────────────────────────────────────────┘
```

**How the UML diagrams map to the code (SRS Appendix B):**

| UML diagram | Implementation |
|---|---|
| **Use case diagram** (6 actors) | Roles enforced by `requireUser([...roles])` on every endpoint, plus one dashboard per actor |
| **Class diagram** | `src/server/db/schema.ts`: `users` (User → YouthWorker / Employer), `courses`, `certificates` (`id` UUID + `ipfs_hash`), `jobs`, `contracts` (`payment_terms`, `deliverables`, `status`), wallet as a `transactions` ledger, `cohorts` + `cohort_members` (8–15) |
| **Activity diagram** (onboarding) | `src/app/signup/page.tsx` + `POST /api/verify/*` + `POST /api/auth/signup` |
| **Sequence diagram** (job → payment) | `GET /api/jobs` (AI ranking) → `POST /api/jobs/:id/apply` (employer-verification check) → `POST /api/applications/:id/accept` (contract) → `sign` → `submit` ⇄ `review` → `POST /api/contracts/:id/pay` (M-Pesa, 5% fee, wallet update in one transaction) → `rate` |

**Offline-first design:** `GET /api/sync` returns everything the signed-in user is allowed to see, filtered by role. The app caches it on the device, so pages open instantly and keep working offline. Lesson progress made offline is stored in an outbox and sent to the API when the connection returns.

## 7. Prerequisites

| Tool | Version | Check with |
|---|---|---|
| [Node.js](https://nodejs.org/) | **18.18 or newer** (20 LTS recommended) | `node -v` |
| npm | comes with Node | `npm -v` |
| [Git](https://git-scm.com/) | any recent version | `git --version` |

**No database install is needed for local development.** An embedded PostgreSQL starts automatically.

## 8. Run It Locally (Step by Step)

**Step 1: Clone the repository**
```bash
git clone https://github.com/jamesdeng462/kakuma_digital_work_connect.git
cd kakuma_digital_work_connect
```

**Step 2: Install dependencies** (1–2 minutes)
```bash
npm install
```

**Step 3: Start the app**
```bash
npm run dev
```
On the first request the app creates a local database in the `.pglite/` folder, creates all tables and loads the demo data automatically. You will see `[db] applied migration 0000_init` and `[db] seeded demo data` in the terminal.

**Step 4: Open the app**

Go to http://localhost:3000. Click **Log in** and choose a demo account, or **Sign up** to try onboarding. The API reference is at http://localhost:3000/api/docs.

**Optional: use your own PostgreSQL instead of the embedded one**
1. Create a database (local PostgreSQL or a free [Neon](https://neon.tech) project).
2. Create a file called `.env.local` in the project folder:
   ```
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
   JWT_SECRET=any-long-random-string
   ```
3. Run `npm run dev` again. Tables and demo data are created automatically.

**Optional: production build** (needed to test offline mode / PWA install)
```bash
npm run build
npm start
```

**Start from a clean database:** stop the app and delete the `.pglite` folder (embedded database), or log in as Admin → Users → **Reset demo data**.

**Useful commands**

| Command | What it does |
|---|---|
| `npm run dev` | Development server (frontend + API) |
| `npm run build` | Production build (also type-checks) |
| `npm start` | Serve the production build |
| `npm run test:api` | Run the API test suite (with the app running) |
| `npm run db:generate` | After changing `src/server/db/schema.ts`: generate a new SQL migration |

## 9. Deploy to Vercel + Neon (Step by Step)

**A. Create the database (free)**
1. Go to https://neon.tech and sign up.
2. **Create project** → name it `kdwc` → choose the region closest to Kenya (e.g. AWS Europe (Frankfurt)).
3. On the dashboard click **Connect**, select the **Pooled connection**, and copy the connection string. It looks like `postgresql://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`

**B. Deploy the app**
1. Push this project to a **public** GitHub repository.
2. Go to https://vercel.com, sign in with GitHub, click **Add New… → Project** and import the repository.
3. Open **Environment Variables** and add:
   - `DATABASE_URL`: the Neon connection string from step A3
   - `JWT_SECRET`: a long random string. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. Click **Deploy** (about 1–2 minutes).
5. Open `https://YOUR-APP.vercel.app/api/health`. You should see `"status":"ok","database":"postgresql"`. The first request creates the tables and demo data automatically.
6. Open the app in an **incognito window** and log in with a demo account.
7. Paste the live URL at the top of this README.

> Shortcut: in Vercel → your project → **Storage → Create Database → Neon**. This sets `DATABASE_URL` for you.

## 10. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | On Vercel: **yes**. Locally: no | PostgreSQL connection string. If empty locally, the embedded database in `./.pglite` is used. |
| `JWT_SECRET` | Recommended | Secret for signing login sessions. If missing, one is derived from `DATABASE_URL`. |
| `PGLITE_DIR` | No | Folder for the embedded local database (default `./.pglite`). |

See `.env.example`.

## 11. Testing

**API tests** check business rules and access control directly against the API:
```bash
npm run dev            # terminal 1
npm run test:api       # terminal 2  → 21/21 checks passed
```
To test the live deployment: `BASE_URL=https://YOUR-APP.vercel.app npm run test:api`

The suite checks, among other things:
- BR1: applying without a certificate is blocked
- BR2: an unverified employer cannot post jobs
- No self-registration as admin; fake UNHCR numbers are rejected
- Workers cannot use admin endpoints or read other people's contracts
- Payment is blocked before approval; workers cannot pay; withdrawals cannot exceed the balance
- No double ratings; quizzes are graded on the server
- Quiz answers, password hashes and other users' emails are never sent to the browser
- Invalid input returns a clear 400 error

**End-to-end UI testing:** every flow in the [Demo Walkthrough](#12-demo-walkthrough) was tested in a real browser against PostgreSQL, on desktop, mobile, Arabic RTL and offline.

## 12. Demo Walkthrough

This covers every core flow in about 6 minutes:

1. **Onboarding:** Sign up → *Learn & find work* → form → *Yes* → `KAK-123456` → language and skills → connectivity → tutorial → **Data Entry Fundamentals**.
2. **Learning:** Complete 3 lessons → **Take quiz** → ≥70% → **View certificate** (QR code, "Verified authentic").
3. **AI matching and applying:** **Jobs** → *Apply* on "Clean and de-duplicate NGO beneficiary spreadsheet".
4. **Hiring:** Log in as `employer@kdwc.demo` → **My jobs** → the job → **Hire & create contract** → **Sign**.
5. **Work loop:** New worker signs → **Submit work** → employer **Request revision** → resubmit → **Approve**.
6. **Payment:** Employer **Pay** (5% fee breakdown) → worker **Wallet** shows the earning → **Withdraw**. Both rate each other.
7. **Business rules:** `esther@kdwc.demo` cannot apply (BR1); `pending@kdwc.demo` cannot post (BR2) → Admin approves BrightPixel Studio → now it can post.
8. **Admin:** Moderation (remove the scam job, hide the scam post) → Safeguarding (escalate) → Users tab → **Audit log** shows every action.
9. **Mentor:** New cohort → add a learner → post.
10. **Governor:** New proposal → vote.
11. **Partner:** Impact dashboard → **Export quarterly report (CSV)**.
12. **Inclusion and offline:** switch to **العربية**; open a course, turn off Wi-Fi, reload. It still works, and completed lessons sync when you reconnect.

## 13. SRS Requirements Traceability

| SRS requirement | Status | Where |
|---|---|---|
| 6.1 a: Multi-modal registration (OTP / email / UNHCR no.) | ✅ server-verified (ProGres & OTP sandboxed) | `POST /api/auth/signup`, `/api/verify/*` |
| 6.1 b: Digital identity profile, documents, optional biometric | ✅ (biometric is opt-in UI only) | `/signup`, `PATCH /api/profile` |
| 6.1 c: Offline profile caching | ✅ device cache of `/api/sync` + service worker | `src/lib/store.ts` |
| 6.1 d: Multi-language | 🟡 EN, SW, AR (RTL), FR. Somali planned; course text in English. | `src/lib/i18n.ts` |
| 6.1 e: Role allocation + RBAC | ✅ 6 roles, enforced on every endpoint | `requireUser()` |
| 6.2 f: Course catalogue by domain | ✅ 7 courses | `GET /api/courses` |
| 6.2 g: Competency progression (≥70%) | ✅ graded on the server | `POST /api/courses/:id/quiz` |
| 6.2 h: Offline course content + sync | ✅ outbox sync on reconnect | `completeLesson()` |
| 6.2 i: Signed certificates, QR, LinkedIn | ✅ SHA-256 checked by the server | `GET /api/certificates/:id` |
| 6.2 j: Peer cohorts of 8–15 | ✅ max 15 enforced | `/api/cohorts/*` |
| 6.2 k: AI learning path | ✅ rule-based engine (OpenAI planned) | `GET /api/guidance` |
| 6.3 l: Job listings with filters | ✅ | `GET /api/jobs` |
| 6.3 m: One-click apply + tracking | ✅ | `POST /api/jobs/:id/apply` |
| 6.3 n: Employer verification (BR2) | ✅ | `PATCH /api/admin/employers/:id` |
| 6.3 o: Standardised contracts | ✅ | `POST /api/applications/:id/accept` |
| 6.3 p: Work submission & review | ✅ | `/api/contracts/:id/submit`, `/review` |
| 6.3 q: Dual-sided reputation | ✅ paid only, one rating per side, average updated | `POST /api/contracts/:id/rate` |
| 6.4: M-Pesa + alternative rails | 🟡 sandbox adapters | `/api/wallet/*`, `/pay` |
| 6.4: E-wallet with analytics | ✅ transaction ledger | `GET /api/wallet` |
| 6.4: Financial literacy | ✅ as a course | `c-financial-literacy` |
| 6.4: MFI referral (≥3 months income) | ✅ checked on the server | `POST /api/wallet/mfi-referral` |
| 6.5: Admin dashboard + audit logging | ✅ | `/api/impact`, `/api/admin/audit` |
| 6.5: Youth governance | ✅ | `/api/policies/*` |
| 6.5: Content moderation | 🟡 keyword screen + human review (AI planned) | `/api/admin/posts`, `/jobs` |
| 6.5: Anonymous safeguarding / GBV | ✅ no user id stored | `POST /api/reports` |
| 6.5: Impact reporting | ✅ CSV generated on the server | `GET /api/impact?format=csv` |
| NFR: REST APIs for all functions | ✅ 67 endpoints, self-documenting | `GET /api/docs` |
| NFR: RBAC; privilege escalation needs admin | ✅ only Worker/Employer can self-register | `POST /api/auth/signup` |
| BR1 / BR2 / 5% fee | ✅ enforced on the server | see tests |
| USSD; React Native app; biometric login | ⏳ future work | — |

Key: ✅ implemented · 🟡 partial / sandboxed · ⏳ future work

## 14. Security

- **Passwords** are hashed with bcrypt (cost 10) and never returned by the API.
- **Sessions** are a signed JWT in an `HttpOnly`, `SameSite=Lax`, `Secure` cookie, so JavaScript cannot read the token.
- **RBAC:** every endpoint declares its allowed roles. Ownership is checked too (e.g. only the parties to a contract can see it).
- **Input validation:** every request body is checked with zod.
- **Data minimisation:** other users' email, phone, UNHCR number and demographics are removed before data leaves the server; quiz answers never leave the server.
- **Integrity:** payments run in one database transaction with a row lock, so a contract cannot be paid twice. Certificate hashes are recomputed on verification.
- **Audit log:** admin actions, contracts, payments, certificates and reports are all recorded.
- **Anonymous reporting:** the `reports` table has no user column.
- **SQL injection:** all queries are parameterised through Drizzle ORM.

## 15. Sandboxed External Services

These integrations sit behind adapters (`src/lib/services.ts`, `src/lib/ai.ts`), so they can be swapped for the real ones without changing endpoints:

| SRS service | MVP behaviour |
|---|---|
| UNHCR ProGres | Accepts `KAK-######` |
| Twilio SMS / email OTP | Code is always `123456` |
| M-Pesa Daraja / Airtel / Chipper / SWIFT | Instant success with a reference number; no real money moves |
| OpenAI career engine | Transparent rule-based scoring of certificates, skills, language and job demand |
| IPFS / blockchain credentials | SHA-256 integrity hash stored in PostgreSQL |
| AI content moderation | Keyword screen + user reports → human review |

## 16. Known Limitations & Future Work

- The external services above are sandboxed. Next steps: M-Pesa Daraja B2C, Africa's Talking or Twilio SMS, and OpenAI for guidance.
- Course content is in English (the interface is translated).
- `/api/sync` loads the role-scoped dataset in one response, which suits pilot scale (thousands of users). At larger scale it would become paginated, incremental sync.
- No password reset, MFA or rate limiting yet (SRS NFR: MFA for admin and financial actions).
- **Planned:** USSD menus for feature phones, a React Native app, Somali and Nuer translations, push notifications (FCM).

## 17. Project Structure

```
kakuma-digital-work-connect/
├── drizzle/0000_init.sql            # SQL migration (generated from the schema)
├── public/                          # PWA manifest, service worker, icons
├── scripts/
│   ├── api-test.mjs                 # API test suite (npm run test:api)
│   └── embed-migrations.mjs         # Bundles SQL migrations for serverless
├── src/
│   ├── app/                         # FRONTEND - one folder per screen
│   │   ├── api/[...path]/route.ts   # → hands every /api/* request to src/server
│   │   ├── login/ signup/ dashboard/ courses/ certificates/ verify/
│   │   ├── jobs/ applications/ guidance/ contracts/ wallet/
│   │   ├── employer/ cohorts/ governance/ admin/ impact/ profile/ report/
│   ├── components/                  # AppShell (nav, RBAC guard), UI kit
│   ├── lib/                         # SHARED
│   │   ├── store.ts                 # API client + offline cache + outbox
│   │   ├── types.ts                 # Data types (= UML class diagram)
│   │   ├── ai.ts                    # Career guidance engine
│   │   ├── services.ts              # ProGres / OTP / M-Pesa adapters (sandbox)
│   │   ├── metrics.ts, i18n.ts, courses.ts, seed.ts, sha256.ts
│   └── server/                      # BACKEND
│       ├── router.ts                # Routing, session, RBAC, error handling
│       ├── auth.ts                  # JWT session cookie
│       ├── http.ts, helpers.ts      # Validation, errors, notifications, audit
│       ├── db/
│       │   ├── schema.ts            # PostgreSQL tables (Drizzle)
│       │   ├── index.ts             # Connection, auto-migrate, auto-seed
│       │   ├── seed.ts              # Demo data loader / reset
│       │   └── migrations.ts        # (generated)
│       └── routes/                  # API endpoints by module
│           ├── auth.ts              # signup, login, verification, profile
│           ├── learning.ts          # courses, quiz, certificates
│           ├── marketplace.ts       # jobs, applications, hiring, guidance
│           ├── contracts.ts         # contracts, payments, ratings, wallet
│           ├── community.ts         # cohorts, governance, safeguarding
│           └── admin.ts             # admin, impact, sync, health, docs
├── drizzle.config.ts
├── .env.example
└── package.json
```

## 18. API Reference

Base URL: `/api`. Authentication uses the session cookie set by `POST /api/auth/login`. Responses are JSON, and errors look like `{ "error": "message" }` with the right HTTP status (400 validation, 401 not logged in, 403 wrong role or business rule, 404, 409 conflict).

A live, always-current list is served at **`GET /api/docs`**.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Log in with email + password; sets an httpOnly session cookie |
| `POST` | `/api/auth/logout` | Log out (clears the session cookie) |
| `GET` | `/api/auth/me` | Current user or null |
| `POST` | `/api/verify/unhcr` | Check a UNHCR registration number against ProGres (sandbox: KAK-######) |
| `POST` | `/api/verify/otp/send` | Send a one-time code by SMS or email (sandbox code 123456) |
| `POST` | `/api/verify/otp/check` | Check a one-time code |
| `GET` | `/api/auth/email-available` | Check whether an email is free before signup |
| `POST` | `/api/auth/signup` | Create a Youth Worker or Employer account (verification re-checked on the server) |
| `PATCH` | `/api/profile` | Update your own profile |
| `GET` | `/api/notifications` | Your notifications (latest 50) |
| `POST` | `/api/notifications/read` | Mark all your notifications as read |
| `GET` | `/api/courses` | Course catalogue (public) |
| `GET` | `/api/courses/:id` | One course with lessons (quiz answers hidden) |
| `POST` | `/api/courses/:id/enroll` | Enrol in a course (Youth Worker) |
| `POST` | `/api/courses/:id/lessons/:lessonId/complete` | Mark a lesson complete (also used by offline sync) |
| `POST` | `/api/courses/:id/download` | Mark a course as downloaded for offline use |
| `POST` | `/api/courses/:id/quiz` | Submit quiz answers; graded on the server; issues a certificate at 70%+ |
| `GET` | `/api/certificates` | Your certificates |
| `GET` | `/api/certificates/:id` | Verify a certificate (public) |
| `GET` | `/api/jobs` | Open jobs; for Youth Workers they are ranked by the AI career engine (?domain= filter) |
| `GET` | `/api/guidance` | Personalised job matches and learning path (Youth Worker) |
| `POST` | `/api/jobs` | Post a job (verified Employer only - BR2) |
| `PATCH` | `/api/jobs/:id` | Open or close your job |
| `POST` | `/api/jobs/:id/flag` | Report a job listing to moderators |
| `POST` | `/api/jobs/:id/apply` | Apply to a job (Youth Worker; BR1 + employer verification enforced) |
| `GET` | `/api/jobs/:id/applications` | Applicants for your job, with their certificates (Employer) |
| `GET` | `/api/applications` | Your applications and their status (Youth Worker) |
| `DELETE` | `/api/applications/:id` | Withdraw an application |
| `PATCH` | `/api/applications/:id` | Shortlist or reject an applicant (Employer) |
| `POST` | `/api/applications/:id/accept` | Hire an applicant and generate the contract (Employer) |
| `GET` | `/api/contracts` | Your contracts (admins see all) |
| `GET` | `/api/contracts/:id` | Contract with submissions and ratings (parties and admins only) |
| `POST` | `/api/contracts/:id/sign` | Sign the digital work agreement |
| `POST` | `/api/contracts/:id/submit` | Submit work (Youth Worker) |
| `POST` | `/api/contracts/:id/review` | Approve work or request a revision (Employer) |
| `POST` | `/api/contracts/:id/pay` | Pay an approved contract (Employer) - M-Pesa sandbox, 5% fee |
| `POST` | `/api/contracts/:id/dispute` | Raise a dispute |
| `POST` | `/api/contracts/:id/resolve` | Resolve a dispute (Admin) |
| `POST` | `/api/contracts/:id/rate` | Rate the other party after payment |
| `GET` | `/api/wallet` | Wallet balance and transaction history |
| `POST` | `/api/wallet/withdraw` | Withdraw to mobile money or bank (Youth Worker, sandbox) |
| `POST` | `/api/wallet/deposit` | Top up wallet (Employer, sandbox) |
| `POST` | `/api/wallet/mfi-referral` | Request a microfinance referral (needs 3 months of income) |
| `GET` | `/api/cohorts` | Cohorts you mentor or belong to |
| `POST` | `/api/cohorts` | Create a cohort (Mentor) |
| `GET` | `/api/cohorts/:id` | Cohort with members and discussion |
| `POST` | `/api/cohorts/:id/members` | Add a learner (Mentor; max 15) |
| `DELETE` | `/api/cohorts/:id/members/:userId` | Remove a learner (Mentor) |
| `POST` | `/api/cohorts/:id/posts` | Post in a cohort discussion (auto-screened) |
| `POST` | `/api/posts/:id/flag` | Report a post to moderators |
| `GET` | `/api/policies` | Policy proposals with votes |
| `POST` | `/api/policies` | Propose a platform policy (Youth Governor) |
| `POST` | `/api/policies/:id/vote` | Vote for/against (one vote per person, can be changed while open) |
| `POST` | `/api/policies/:id/close` | Close voting on your proposal |
| `POST` | `/api/reports` | Submit an anonymous safeguarding / GBV report (no login needed) |
| `GET` | `/api/reports` | Safeguarding reports (Admin, Partner) |
| `PATCH` | `/api/reports/:id` | Escalate or resolve a report (Admin, Partner) |
| `GET` | `/api/sync` | Everything the current user may see (role-scoped) - powers the offline-first app cache |
| `GET` | `/api/impact` | Impact metrics (JSON) or quarterly report (?format=csv) - Partner, Admin, Mentor, Governor |
| `GET` | `/api/admin/users` | All users (Admin) |
| `PATCH` | `/api/admin/employers/:id` | Approve or reject an employer (Admin) - BR2 |
| `PATCH` | `/api/admin/posts/:id` | Moderate a post (Admin) |
| `PATCH` | `/api/admin/jobs/:id` | Moderate a job listing (Admin) |
| `GET` | `/api/admin/audit` | Audit log of privileged actions (Admin) |
| `POST` | `/api/admin/reset` | Reset all data to the demo seed (Admin) |
| `GET` | `/api/health` | Health check (public) |
| `GET` | `/api/docs` | This API reference |

**Example**
```bash
# Log in and keep the session cookie
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"worker@kdwc.demo","password":"Demo1234!"}'

# Get AI-ranked jobs as that worker
curl -b cookies.txt http://localhost:3000/api/jobs
```

## 19. Development Workflow

Features were built on separate branches and merged into `main` through pull requests:

| Branch | Scope |
|---|---|
| `feat/frontend-foundation` | Next.js setup, UI kit, layout, landing page |
| `feat/onboarding-learning` | Signup flow, courses, quizzes, certificates |
| `feat/marketplace-contracts` | Jobs, applications, contracts, wallet screens |
| `feat/community-admin-ui` | Cohorts, governance, admin, impact screens |
| `feat/database` | PostgreSQL schema, migrations, seed |
| `feat/api-auth` | Router, sessions, RBAC, auth and verification endpoints |
| `feat/api-modules` | Learning, marketplace, contracts, community, admin endpoints |
| `feat/connect-frontend` | API client, offline cache and outbox, page integration |
| `test/api-suite` | API test suite |
| `docs/readme` | Documentation |

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).

## 20. Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` fails | Check `node -v` is 18.18 or newer. Delete `node_modules` and `package-lock.json`, then run `npm install` again. |
| Port 3000 in use | `npm run dev -- -p 3001` |
| Vercel shows "Something went wrong" / `/api/health` fails | Check `DATABASE_URL` is set in Vercel → Settings → Environment Variables, then redeploy. Use Neon's **pooled** connection string (it contains `-pooler`). |
| Logged out after deploying | Expected after changing `JWT_SECRET`. Log in again. |
| Demo login fails | Someone changed the data. Admin → Users → **Reset demo data**; locally, delete `.pglite/` and restart. |
| I changed `schema.ts` and the app broke | Run `npm run db:generate` to create a migration; it applies automatically on the next start. |
| Offline mode does not work | The service worker only runs in production builds (`npm run build && npm start`, or the Vercel URL). |

---

*Built by James Giir Deng for the Software Engineering Final Project at African Leadership University, 2026.*
