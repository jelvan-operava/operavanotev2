<div align="center">
  <h1>Bolekpad (Bolek Desk)</h1>
  <p>An elegant, interactive workspace with draggable cards, a vector canvas supporting flowcharts, diagrams, graphing, and YouTube embeds, plus an integrated calendar scheduler with email reminders.</p>
</div>

## Table of Contents
- [OVERVIEW](#overview)
- [ARCHITECTURE](#architecture)
- [FRONTEND](#frontend)
- [BACKEND](#backend)
- [AUTHENTICATION](#authentication)
- [ENVIRONMENT_VARIABLES](#environment-variables)
- [FILE_STRUCTURE](#file-structure)
- [DEPLOYMENT](#deployment)
- [CLOUDFLARE](#cloudflare)
- [GITHUB](#github)

---

## OVERVIEW

Bolek Desk (also known as Bolekpad) is a fully-featured, full-stack Single-Page Application (SPA) designed as an elegant workspace. It features:
- Interactive draggable cards.
- Vector canvas for flowcharts, diagrams, and graphing.
- YouTube embed capabilities.
- Integrated calendar scheduler with email reminders.
- A robust, zero-dependency offline sandbox fallback.

The application is built to run flawlessly as a purely static SPA on Cloudflare Pages, but also includes optional Express backend support.

## ARCHITECTURE

- **Client-Side**: React 19, TypeScript, Tailwind CSS, Vite, Framer Motion, and Lucide React.
- **Server-Side**: Node.js, Express, TSX, AWS SDK (SES), and Google GenAI.
- **Deployment & Hosting**: Optimized for Cloudflare Pages (with optional Cloudflare Workers/Pages Functions) and GitHub Actions.

## FRONTEND

The frontend uses React with TailwindCSS for styling and Framer Motion for complex animations. It has been built with mobile responsiveness and a swipeable horizontal board to achieve high-end mobile usability on small screens.
- **Components**: Includes `Bolekpanel`, `BolekCanvas`, `BolekCalendar`, `BolekDocs`, and `BolekSlides`.
- **Mobile Experience**: Kanban board is rendered as a fluid horizontal pager using native, high-performance CSS Scroll Snap (`snap-x snap-mandatory`).

## BACKEND

The backend is built with Express.js (`server.ts`) offering:
- Serving of the Vite React application.
- API endpoints for Google OAuth (`/api/auth/google/url`, `/auth/callback`).
- Simulated and production-ready email dispatch utilizing AWS SES or simple console logging.
- AI integration via `@google/genai`.

*Note: You can run the server in local development or deploy serverless functions to Cloudflare Pages.*

## AUTHENTICATION

The application supports robust authentication strategies:
- **Google OAuth**: Full support for Google Signup and Login configured through the Google Cloud Console.
- **Passkeys (WebAuthn)**: Modern hybrid Passkeys authentication flow. Utilizes the native `navigator.credentials` WebAuthn standard API for environments operating over a secure context (`https://` or `localhost`). Includes a highly polished visual biometric verification simulator for iframe sandboxes.

## ENVIRONMENT_VARIABLES

Create a `.env` or `.env.local` file with the following configurations:
```env
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
APP_URL=http://localhost:3000

# AWS SES (Optional, for email scheduling)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=your_aws_region
```

## FILE_STRUCTURE

```text
.
├── src/                  # React Frontend (Components, Hooks, Types)
├── server.ts             # Express Backend Server
├── package.json          # Node dependencies and scripts
├── vite.config.ts        # Vite Bundler Configuration
├── tsconfig.json         # TypeScript configuration
├── metadata.json         # Application metadata
└── DEPLOYMENT.md         # Extended deployment guide
```

## DEPLOYMENT

### Local Development Mode
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development command:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your web browser.

## CLOUDFLARE

Cloudflare Pages is the recommended hosting environment. It is free, globally distributed, and provides automatic CI/CD from GitHub.

1. Connect your GitHub Repository to Cloudflare Pages.
2. Build Settings:
   - **Framework Preset:** Vite (or None)
   - **Build Command:** `npm run build`
   - **Build Output Directory:** `dist`

### Pages Functions (Optional)
If you require server-side functionality (e.g., the Express backend routes) on Cloudflare:
1. Create a `functions/` directory.
2. Implement your endpoints (e.g., `functions/api/boleksend/send.ts`) using Cloudflare Pages Functions architecture.

## GITHUB

To push your code:
1. Initialize the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Bolek Desk complete workspace"
   ```
2. Link and push to your new GitHub repository:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME.git
   git push -u origin main
   ```
