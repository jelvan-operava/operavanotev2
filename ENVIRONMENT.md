# ENVIRONMENT.md

## Root `.env.example`

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Gemini text generation |
| `GOOGLE_CLIENT_ID` | Optional/production | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Optional/production | Google OAuth callback |
| `AWS_ACCESS_KEY_ID` | Optional | SES email delivery |
| `AWS_SECRET_ACCESS_KEY` | Optional | SES email delivery |
| `AWS_REGION` | Optional | SES region |
| `AWS_SES_SENDER` | Optional | SES from-address |
| `JWT_SECRET` | Required in production | Sign auth tokens |
| `ADMIN_BOOTSTRAP_EMAIL` | Optional | Seed user email |
| `ADMIN_BOOTSTRAP_NAME` | Optional | Seed user display name |
| `ADMIN_BOOTSTRAP_PASSWORD` | Optional | Seed password fallback |
| `ADMIN_BOOTSTRAP_PASSWORD_HASH` | Optional | Seed password hash |
| `ADMIN_BOOTSTRAP_TOTP_SECRET` | Optional | Seed TOTP secret |
| `PAYPAL_ENV` | Optional | `sandbox` or `live` |
| `PAYPAL_CLIENT_ID` | Required for PayPal | Subscriptions API |
| `PAYPAL_CLIENT_SECRET` | Required for PayPal | Subscriptions API |
| `PAYPAL_BASE_URL` | Optional | Override PayPal API base |
| `APP_URL` | Required for links | Application origin |

## Additional server-only env vars

| Variable | Used by | Purpose |
|---|---|---|
| `RESEND_API_KEY` | `legacy/src/components/Bolekpanel.tsx` | Demo email dispatch |
| `BOLEKSEND_SENDER_EMAIL` | `legacy/server.ts` | SES sender override |

## Cloudflare env / bindings

- `DB` — D1 database
- `STICKY_BUCKET` — R2 bucket
- `PAYPAL_*` — Pages Function checkout
- `ENVIRONMENT` — deployment mode flag

## Local storage keys

The legacy UI persists most data in `localStorage`, including:

- `bolek_auth_token`
- `bolek_columns`
- `bolek_registered_users`
- `bolek_feature_access`
- `bolek_passkeys`
- `bolek_docs_content`
- `bolek_sticky_messages`
- `bolek_calendar_reminders`

## Notes

- Do not place real secrets in the repository.
- Browser-stored values are not secure storage for production secrets.
