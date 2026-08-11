# STRUCTURE.md

## 1. System Overview

This repository is a monorepo with three execution paths:

1. **Legacy React app** in `legacy/`
2. **Cloudflare Pages Functions** in `functions/`
3. **Optional Cloudflare Workers API** in `backend/`

The legacy app is the most complete user-facing product. It renders the workspace UI, handles authentication flows, and calls the Express API server in `legacy/server.ts`. Cloudflare Functions provide PayPal checkout and public board persistence. The `backend/` worker is a separate Hono prototype with stubbed AI/document routes.

## 2. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, Motion | Workspace UI |
| Backend (legacy) | Node.js, Express, Vite middleware | Auth, OAuth, Gemini, email, reset flows |
| API (Cloudflare) | Pages Functions, D1 | PayPal + public boards |
| API (Worker) | Hono | Experimental document/AI/signature API |
| Database | Local JSON file, Cloudflare D1 | User store + public board/paypal state |
| Auth | JWT-like HMAC token, Google OAuth, passkeys, TOTP simulation | Sign-in and account control |
| Storage | localStorage, D1, R2 binding, optional filesystem | UI state, board snapshots, assets |
| Deployment | Vite build, Cloudflare Pages, optional Workers | Hosting |
| Cloudflare | Pages, Functions, D1, R2, Worker bindings | Production runtime |

## 3. Folder Structure

```text
/
├── backend/
├── functions/
├── legacy/
├── README.md
├── STRUCTURE.md
├── API.md
├── SECURITY.md
├── DEPLOYMENT.md
├── ENVIRONMENT.md
├── ACCESSIBILITY.md
├── CHANGELOG.md
├── package.json
├── package-lock.json
├── wrangler.toml
├── .env.example
├── firebase-applet-config.json
└── metadata.json
```

### Major directories

#### `legacy/`
- Purpose: active UI and local Express server
- Responsibility: all major user workflows
- Important files: `src/App.tsx`, `server.ts`, `src/components/*`, `src/server/authStore.ts`
- Dependencies: React, Express, Vite, Google GenAI, AWS SES

#### `functions/`
- Purpose: Cloudflare Pages Functions
- Responsibility: PayPal checkout, subscription lookup, public board CRUD
- Important files: `_shared/paypal.ts`, `_shared/publicBoards.ts`, `api/paypal/*`, `api/public-boards/*`
- Dependencies: Cloudflare D1, external PayPal API

#### `backend/`
- Purpose: Cloudflare Workers prototype
- Responsibility: stubbed AI/doc/signature API and Durable Object demo
- Important files: `src/index.ts`, `src/durable_objects.ts`, `schema.sql`
- Dependencies: Hono, Workers bindings

## 4. Feature Map

| Feature | Frontend | Backend | API | Database | Purpose |
|---|---|---|---|---|---|
| Login/register | `legacy/src/App.tsx` | `legacy/server.ts` | `/api/auth/*` | JSON user store | Session creation |
| Google OAuth | `legacy/src/App.tsx` | `legacy/server.ts` | `/api/auth/google/url`, `/auth/callback` | JSON user store | OAuth sign-in |
| Passkeys/TOTP | `legacy/src/components/BolekAuth.tsx`, `legacy/src/App.tsx` | `legacy/server.ts` | `/api/auth/passkeys/sync` | JSON user store + localStorage | 2FA vault |
| Board / notes | `legacy/src/App.tsx`, `BolekDashboard.tsx` | legacy UI only | none | localStorage | Workspace cards |
| StickySend | `legacy/src/components/BolekStickySend.tsx` | `legacy/server.ts` for send endpoint | `/api/boleksend/send` | localStorage | Inter-user sticky messages |
| Calendar | `legacy/src/components/BolekCalendar.tsx` | legacy UI only | none | localStorage | Reminders |
| Docs | `legacy/src/components/BolekDocs.tsx` | `legacy/server.ts` | `/api/gemini/generate` | localStorage | Rich docs editor |
| Canvas | `legacy/src/components/BolekCanvas.tsx` | legacy UI only | none | localStorage | Whiteboard / flowcharts |
| Paywall / billing | `legacy/src/components/PaywallModal.tsx`, `PayPalPaymentModal.tsx` | Cloudflare Functions | `/api/paypal/*` | D1 | Subscription upgrades |
| Public boards | `legacy/src/App.tsx` | Functions | `/api/public-boards/*` | D1 | Shareable board snapshots |
| Admin settings | `legacy/src/components/AdminDashboardSettings.tsx` | legacy UI only | none | localStorage | Role/plan simulation |
| Experimental backend | none | `backend/src/index.ts` | `/api/ai/*`, `/api/documents/*`, `/api/signatures/*` | none yet | Worker prototype |

## 5. Button / Action Map

| Button | Page | Frontend Handler | API | Backend | Purpose | Status |
|---|---|---|---|---|---|---|
| Login / Register | Auth screen | `handleSignInSubmit` | `/api/auth/login`, `/api/auth/register` | `legacy/server.ts` | Session creation | Implemented |
| Google sign-in | Auth screen | `handleGoogleSignIn` | `/api/auth/google/url` | `legacy/server.ts` | OAuth flow | Implemented |
| Passkey sign-in | Auth screen | `handlePasskeySignIn` | none / `/api/auth/passkeys/sync` | `legacy/server.ts` | WebAuthn demo + sync | Partial |
| Publish board | Desk | publish handler | `/api/public-boards` | Pages Functions | Create public snapshot | Implemented |
| PayPal upgrade | Desk / admin | `onOpenPayment` | `/api/paypal/create-subscription` | Pages Functions | Start subscription checkout | Implemented |
| Send sticky | StickySend | compose submit | `/api/boleksend/send` | `legacy/server.ts` | Email delivery | Implemented |
| Create reminder | Calendar | form submit | none | localStorage | Reminder persistence | Implemented |
| Export docs | Docs | export handlers | none | browser download | Download document | Implemented |
| Add note / tab controls | Dashboard | many local handlers | none | local state | Board editing | Implemented |

## 6. API Map

| Method | Endpoint | Purpose | Auth | Backend | Data |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | Create account | No | Express | JSON user store |
| POST | `/api/auth/login` | Create JWT-like token | No | Express | JSON user store |
| GET | `/api/auth/me` | Read current user | bearer token | Express | JSON user store |
| POST | `/api/auth/logout` | Logout | bearer token expected by UI | Express | none |
| GET/POST | `/api/auth/preferences` | Read/update notification prefs | bearer token | Express | JSON user store |
| POST | `/api/auth/change-password` | Change password | bearer token | Express | JSON user store |
| POST | `/api/auth/request-password-reset` | Send reset email | No | Express | JSON user store |
| POST | `/api/auth/reset-password` | Consume reset token | No | Express | JSON user store |
| POST | `/api/auth/passkeys/sync` | Save passkeys | bearer token | Express | JSON user store |
| GET | `/api/auth/google/url` | Build OAuth URL | No | Express | none |
| GET | `/auth/callback` | Google OAuth callback | Google auth code | Express | JSON user store |
| POST | `/api/gemini/generate` | Gemini text generation | No | Express | none |
| GET | `/api/boleksend/config-status` | SES config status | No | Express | env only |
| POST | `/api/boleksend/send` | Send email | No | Express | SES |
| POST | `/api/paypal/create-subscription` | Start PayPal subscription | No | Pages Function | D1 + PayPal |
| GET | `/api/paypal/subscription-status` | Read PayPal subscription | No | Pages Function | PayPal |
| POST | `/api/public-boards` | Create board snapshot | No | Pages Function | D1 |
| GET | `/api/public-boards/:id` | Read board snapshot | No | Pages Function | D1 |
| PUT | `/api/public-boards/:id` | Update board snapshot | No | Pages Function | D1 |
| POST | `/api/ai/*`, `/api/documents/*`, `/api/signatures/*` | Experimental worker API | No | Workers prototype | none yet |

## 7. Data Flow

User → React UI → local state / form handlers → Express API or Cloudflare Function → JSON store / D1 / PayPal / SES / browser download → UI state update.

## 8. Authentication Flow

1. User submits email/password.
2. Express server validates credentials and returns a signed token.
3. UI stores token in `localStorage`.
4. `GET /api/auth/me` rehydrates the session.
5. Google OAuth and passkeys are additional sign-in paths.

## 9. Authorization Flow

- UI hides premium sections for regular users.
- Server-side auth endpoints use bearer tokens.
- PayPal success enables premium features in UI.
- There is no central role service; much of the gating is client-side simulation.

## 10. Security Architecture

- Passwords are hashed with PBKDF2.
- Auth tokens are HMAC-signed.
- Reset tokens are hashed before storage.
- Rate limiting exists for sensitive Express actions.
- Cloudflare Functions validate configuration before calling PayPal.

## 11. Cloudflare Architecture

User → Cloudflare Pages → static app + Functions → D1 / PayPal / public board snapshots.

The optional worker backend is separate from the Pages app.

## 12. Environment Configuration

See `ENVIRONMENT.md`.

## 13. Deployment Flow

Developer → GitHub → Cloudflare Pages build (`npm run build`) → `dist/` → production.

`backend/` can be deployed separately with Wrangler.

## 14. Testing Structure

- No automated tests are present.
- Validation currently relies on TypeScript checks, manual UI testing, and deployment verification.

## 15. Known Limitations

- Most workspace data is local-only.
- Many admin controls are simulated.
- The worker backend is stubbed.
- There is no automated test suite.

## 16. Future Improvements

- Move sensitive integrations fully server-side.
- Add persistent storage for workspace entities.
- Add real authorization and user ownership checks.
- Add automated tests and accessibility coverage.
