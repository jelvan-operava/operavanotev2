# Bolek Desk / Bolekpad

Monorepo for a React/Vite workspace app, an Express auth/API server, Cloudflare Pages Functions, and an optional Cloudflare Workers backend.

## What lives here

- `legacy/` — active React app, local Express server, and most UI logic
- `functions/` — Cloudflare Pages Functions for PayPal and public boards
- `backend/` — optional Hono/Workers API prototype

## Main features

- Board / sticky-note workspace
- StickySend inter-user messaging
- Calendar reminders
- Docs editor
- Imore office suite with signatures, exports, and document conversion
- Canvas / flowchart workspace
- 2FA / passkey vault
- Admin and billing controls
- PayPal subscription checkout
- Public board sharing

## Start locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Canonical docs

- `STRUCTURE.md`
- `API.md`
- `SECURITY.md`
- `DEPLOYMENT.md`
- `ENVIRONMENT.md`
- `ACCESSIBILITY.md`
- `CHANGELOG.md`

## Notes

- Most app data is stored in `localStorage` for the legacy UI.
- Public boards and PayPal subscriptions use D1-backed Cloudflare Functions.
- The Express server in `legacy/server.ts` implements the login, reset, Google OAuth, Gemini, and Boleksend routes used by the frontend.
