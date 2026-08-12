# DEPLOYMENT.md

## Production paths

### 1. Cloudflare Pages app

- Build command: `npm run build`
- Output directory: `dist`
- Primary runtime: static React app + Pages Functions

### 2. Legacy Express server

- Local/dev runtime: `npm run dev` in the repo root
- Uses `legacy/server.ts`
- Suitable for Node hosting, not Workers

### 3. Optional Cloudflare Workers backend

- Located in `backend/`
- Uses `wrangler.toml`
- Separate from the main Pages app

## Current Cloudflare bindings

### Root `wrangler.toml`

- D1 binding: `DB` (set the production database UUID in `wrangler.toml`)
- R2 binding: `STICKY_BUCKET`
- Environment: `ENVIRONMENT=production`

### `backend/wrangler.toml`

- D1 binding: `DB`
- KV binding: `KV`
- R2 binding: `BUCKET`
- AI binding: `AI`
- Vectorize binding: `VECTOR_INDEX`
- Durable Object binding: `DOCUMENT_DO`

## Deployment flow

Developer → Git push → Cloudflare Pages build → `dist/` deploy → Pages Functions active.

For the worker prototype:

Developer → `wrangler deploy` → Cloudflare Workers runtime.

## Environment setup

1. Copy `.env.example`
2. Fill in required secrets
3. Configure Cloudflare bindings
4. Set `APP_URL` to the deployed origin
5. Configure PayPal if subscriptions are needed

## Known deployment caveats

- The root app depends on the legacy Express server for auth and email routes.
- Pages deployment alone is not enough unless those routes are also deployed elsewhere.
- The worker backend is currently a prototype and not the source of truth for the UI.

## Rollout checklist

- Build succeeds
- Pages Functions respond
- Auth server is reachable
- PayPal env vars are set
- D1 tables exist
- R2 binding exists
- Legal/help pages render
- Public board sharing works
