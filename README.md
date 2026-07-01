# Team Skill Matrix

> An interactive web platform for tracking, managing, and visualising team member proficiency across scientific workstations — built for precision-critical environments.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Interactive Matrix** | Live colour-coded grid mapping every team member against every workstation skill |
| **Secure Authentication** | Cookie-based JWT auth with CSRF protection and rate limiting |
| **Admin Panel** | Full CRUD for users, workstations, and skill assignments |
| **Password Reset Flow** | Secure email-based forgot/reset password pipeline |
| **User Settings** | Profile management and personalisation |
| **Edge Deployment** | Serverless Cloudflare Pages with zero cold-start Workers |
| **Persistent Storage** | Turso (LibSQL) edge-replicated database |

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  Browser Client                  │
│  index.html · login.html · settings.html · ...   │
│             app.js · index.css                   │
└────────────────────┬─────────────────────────────┘
                     │ HTTPS + CSRF Token
┌────────────────────▼─────────────────────────────┐
│          Cloudflare Pages (Edge Workers)          │
│                                                  │
│  /api/login          /api/logout                 │
│  /api/register       /api/session                │
│  /api/verify         /api/proficiency            │
│  /api/matrix-data    /api/settings               │
│  /api/forgot-password /api/reset-password        │
│  /api/check-code                                 │
│                                                  │
│  /api/admin/workstations  (Admin-only)           │
└────────────────────┬─────────────────────────────┘
                     │ LibSQL Protocol
┌────────────────────▼─────────────────────────────┐
│              Turso Edge Database                  │
│         users · workstations · skills            │
│         proficiency_ratings · sessions           │
└──────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES Modules) |
| **Backend** | Cloudflare Pages Functions (Edge Workers) |
| **Database** | [Turso](https://turso.tech/) — LibSQL (SQLite at the edge) |
| **Auth** | JWT (`@tsndr/cloudflare-worker-jwt`) + HttpOnly Cookies |
| **Deployment** | Cloudflare Pages via [Wrangler](https://developers.cloudflare.com/workers/wrangler/) |

---

## Project Structure

```
skill_matrix/
│
├── 📄 index.html               # Main matrix view (authenticated)
├── 📄 login.html               # Login page
├── 📄 forgot-password.html     # Password reset request
├── 📄 reset-password.html      # Password reset confirmation
├── 📄 settings.html            # User settings
│
├──  index.css                # Global stylesheet
│
├──  app.js                  # Core matrix application logic
├──  login.js                # Auth flow logic
├──  settings.js             # Settings page logic
├──  forgot-password.js      # Reset request logic
├──  reset-password.js       # Reset confirmation logic
│
├──  functions/
│   └── api/
│       ├── login.js            # POST /api/login
│       ├── logout.js           # POST /api/logout
│       ├── register.js         # POST /api/register
│       ├── session.js          # GET  /api/session
│       ├── verify.js           # POST /api/verify
│       ├── proficiency.js      # PUT  /api/proficiency
│       ├── matrix-data.js      # GET  /api/matrix-data
│       ├── settings.js         # GET/PUT /api/settings
│       ├── forgot-password.js  # POST /api/forgot-password
│       ├── reset-password.js   # POST /api/reset-password
│       ├── check-code.js       # POST /api/check-code
│       └── admin/
│           └── workstations.js # Admin-only workstation management
│
├── wrangler.toml            # Cloudflare Pages config
├── package.json
└── .env / .dev.vars         # Environment variables (never committed)
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- A [Turso](https://turso.tech/) database (free tier works)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/skill_matrix.git
cd skill_matrix
npm install
```

### 2. Configure Environment

Create a `.dev.vars` file in the project root (this is your local equivalent of Cloudflare secrets):

```env
# Turso Database
TURSO_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token

# JWT Secret (generate a long random string)
JWT_SECRET=your_super_secret_jwt_key

# Email (for password reset flows)
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@your-domain.com
```

> **Caution:** Never commit `.env` or `.dev.vars` to version control. Both are included in `.gitignore`.

### 3. Run Locally

```bash
npx wrangler pages dev .
```

The app will be available at `http://localhost:8788`.

---

## Deployment

This project deploys to **Cloudflare Pages** via Wrangler.

```bash
npx wrangler pages deploy .
```

Or connect your GitHub repository to Cloudflare Pages and set the following build settings:

| Setting | Value |
|---|---|
| **Build command** | `npm install` |
| **Build output directory** | `.` (root) |
| **Compatibility date** | `2026-05-03` |

Then add your environment variables as **Cloudflare Pages Secrets** in the dashboard.

---

## Security

- **CSRF Protection** — All state-mutating requests require a custom `X-CSRF-Token` header
- **HttpOnly Cookies** — JWTs are stored in `HttpOnly; Secure; SameSite=Strict` cookies, inaccessible to JavaScript
- **Rate Limiting** — In-memory rate limiting per isolate to prevent brute-force attacks
- **Dummy Emails** — Users without email addresses receive auto-generated dummy addresses to maintain database integrity

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/login` | ❌ | Authenticate and receive JWT cookie |
| `POST` | `/api/logout` | ✅ | Clear session cookie |
| `POST` | `/api/register` | ❌ | Register a new user |
| `GET` | `/api/session` | ✅ | Validate current session |
| `POST` | `/api/verify` | ❌ | Verify email with code |
| `GET` | `/api/matrix-data` | ✅ | Fetch full matrix data |
| `PUT` | `/api/proficiency` | ✅ | Update a skill proficiency rating |
| `GET/PUT` | `/api/settings` | ✅ | Manage user settings |
| `POST` | `/api/forgot-password` | ❌ | Initiate password reset |
| `POST` | `/api/check-code` | ❌ | Validate reset code |
| `POST` | `/api/reset-password` | ❌ | Set new password |
| `*` | `/api/admin/workstations` | ✅ 👑 | Admin: manage workstations & skills |

---


## Changelog

| Date | Change |
|---|---|
| 2026-06-30 | Added Remove Skill functionality to admin panel |
| 2026-06-30 | Updated Add User to capture First Name, Last Name, Role; Email now optional |
| 2026-06-30 | Completed Admin Controls, Matrix Usability improvements, and Security Hardening |

---

## License

ISC — see [`package.json`](./package.json).
