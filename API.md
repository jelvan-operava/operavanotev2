# API.md

## Implemented APIs

### Express server (`legacy/server.ts`)

#### POST `/api/auth/register`
- Purpose: create a user account
- Auth: none
- Body: `{ email, password, name? }`
- Validation: email format, password length >= 6
- Responses: `201`, `400`

#### POST `/api/auth/login`
- Purpose: authenticate a user
- Auth: none
- Body: `{ email, password }`
- Responses: `200`, `400`, `401`, `500`

#### GET `/api/auth/me`
- Purpose: return the current user
- Auth: bearer token in `Authorization`
- Responses: `200`, `401`, `404`

#### POST `/api/auth/logout`
- Purpose: client logout acknowledgement
- Auth: none on server; UI clears local storage
- Responses: `200`

#### GET `/api/auth/preferences`
#### POST `/api/auth/preferences`
- Purpose: read/update notification settings
- Auth: bearer token
- Responses: `200`, `401`, `404`, `429`

#### POST `/api/auth/change-password`
- Purpose: change the current password
- Auth: bearer token
- Responses: `200`, `400`, `401`

#### POST `/api/auth/request-password-reset`
- Purpose: request reset email
- Auth: none
- Responses: `200`, `400`, `429`

#### POST `/api/auth/reset-password`
- Purpose: set a new password with token
- Auth: none
- Responses: `200`, `400`, `429`

#### POST `/api/auth/passkeys/sync`
- Purpose: persist passkeys
- Auth: bearer token
- Responses: `200`, `400`, `401`, `404`

#### GET `/api/auth/google/url`
- Purpose: generate Google OAuth URL
- Auth: none
- Responses: `200`, `500`

#### GET `/auth/callback`
- Purpose: exchange Google OAuth code and close popup
- Auth: Google auth code
- Responses: HTML success/failure page

#### POST `/api/gemini/generate`
- Purpose: generate AI content
- Auth: none
- Behavior: uses Gemini when configured, otherwise returns simulated text
- Responses: `200`, `400`, `500`

#### GET `/api/boleksend/config-status`
- Purpose: expose SES configuration state
- Auth: none
- Responses: `200`

#### POST `/api/boleksend/send`
- Purpose: send email through SES
- Auth: none
- Body: `{ to, subject, message }`
- Responses: `200`, `400`, `500`

### Cloudflare Pages Functions

#### POST `/api/paypal/create-subscription`
- Purpose: create PayPal trial subscription
- Auth: none
- Env: PayPal client secret, D1, APP_URL
- Responses: `200`, `400`, `503`, `500`

#### GET `/api/paypal/subscription-status`
- Purpose: fetch PayPal subscription status
- Auth: none
- Query: `subscription_id`
- Responses: `200`, `400`, `503`, `500`

#### POST `/api/public-boards`
- Purpose: create public board snapshot
- Auth: none
- Body: `{ title, columns }`
- Responses: `200`, `400`

#### GET `/api/public-boards/:id`
- Purpose: read a public board
- Auth: none
- Responses: `200`, `404`

#### PUT `/api/public-boards/:id`
- Purpose: update a public board snapshot
- Auth: none
- Responses: `200`, `400`, `404`

### Experimental Cloudflare Workers API (`backend/src/index.ts`)

These routes currently return placeholder responses and are not wired to the main frontend.

- `GET /`
- `POST /api/ai/ingest`
- `POST /api/ai/ask`
- `POST /api/ai/rewrite`
- `POST /api/ai/summarize`
- `POST /api/ai/grammar`
- `POST /api/ai/translate`
- `POST /api/documents`
- `GET /api/documents/:id`
- `POST /api/signatures/verify-identity`
- `POST /api/signatures/sign`
- `GET /api/signatures/verify/:signatureId`

## Missing or frontend-only calls

The frontend also references these behaviors:

- `/api/auth/logout` is UI-driven and does not revoke tokens server-side.
- Many board, calendar, docs, and canvas actions are local-only.
- Some integrations depend on browser `localStorage` rather than persisted backend state.

## External APIs used

- Google OAuth
- Google Gemini
- PayPal Subscriptions API
- AWS SES
- Resend API (calendar fallback path)
- Open ER API / ExchangeRate API

## Notes

- There is no formal OpenAPI spec.
- There is no rate-limiting middleware in the Pages Functions layer.
