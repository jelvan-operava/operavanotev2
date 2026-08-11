# SECURITY.md

## Current security posture

### Implemented

- Passwords in the Express store use PBKDF2 hashing.
- Auth tokens are HMAC-signed and include expiry.
- Password reset tokens are hashed before storage.
- Sensitive Express actions have basic in-memory rate limiting.
- PayPal Functions refuse to operate without credentials.
- Public help and legal pages are publicly readable without exposing app tokens.

### Important risks

- The app stores auth tokens and much of the user state in `localStorage`.
- Several UI features are simulated client-side rather than enforced server-side.
- The calendar component can send mail directly from the browser when enabled.
- The legacy auth store uses fallback bootstrap credentials if env vars are missing.
- The repository includes sample secrets/config values that must not be reused in production.

## Authentication

- Token-based auth exists in `legacy/server.ts`.
- Google OAuth is supported.
- Passkeys are simulated and only partially integrated with the server.
- There is no MFA enforcement on the server beyond stored user secrets.

## Authorization

- Server-side authorization exists only for a subset of auth endpoints.
- Role and subscription gating is mostly UI-driven.
- Public board routes are intentionally unauthenticated.
- The experimental worker API currently has no auth.

## Input security

- Express routes validate some required fields.
- Password reset and login endpoints reject invalid input.
- Public board endpoints validate `columns` presence.
- Several UI forms do not have backend schema validation.

## Web security

- No CSP, HSTS, or CSRF protection is implemented in this repo.
- Token handling is bearer-token based, not cookie-based.
- Cross-origin browser calls are used for third-party services.

## Secrets

- Never commit real values for:
  - `JWT_SECRET`
  - `GOOGLE_CLIENT_SECRET`
  - `AWS_SECRET_ACCESS_KEY`
  - `PAYPAL_CLIENT_SECRET`
  - `RESEND_API_KEY`
  - admin bootstrap password hashes

## Cloudflare compatibility

- `functions/` is Cloudflare-native.
- `backend/` uses Workers-compatible code.
- `legacy/server.ts` is Node/Express and not Workers-compatible.
- `fs`, `path`, and local file persistence are not suitable for Workers.

## Findings to address next

1. Move sensitive browser-side integrations server-side.
2. Replace localStorage-backed auth/session data with server-managed sessions.
3. Add CSRF/CSP/security headers.
4. Add ownership checks for mutable resources.
5. Replace simulated admin controls with persistent authorization.
