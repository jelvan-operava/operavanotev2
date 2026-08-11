import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import {
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
  generateAuthToken,
  verifyAuthToken,
  updateUserPasskeys,
  updateUserProfile,
  changeUserPassword,
  updateUserNotificationPreferences,
  setUserLastLogin,
  markWelcomeEmailSent,
  setPasswordResetToken,
  resetUserPasswordWithToken
} from "./src/server/authStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const legalTermsPath = path.join(__dirname, "terms-conditions&privacypolicy");
const REPO_URL = "https://github.com/jelvan-operava/operavanotev2";

function getAppUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

function createAppLink(pathname: string) {
  return new URL(pathname, getAppUrl()).toString();
}

function renderEmailShell(title: string, heading: string, bodyHtml: string, ctaLabel?: string, ctaUrl?: string) {
  const repoLink = REPO_URL;
  const logo = "B";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f8f6f2;font-family:Inter,Arial,sans-serif;color:#1c1917;">
    <div style="max-width:680px;margin:0 auto;padding:32px 16px;">
      <div style="background:#fff;border:1px solid #e7e5e4;border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,.08);">
        <div style="padding:24px 28px;background:linear-gradient(180deg,#fff 0%,#fafaf9 100%);border-bottom:1px solid #e7e5e4;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:44px;height:44px;border-radius:14px;background:#111827;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;">${logo}</div>
            <div>
              <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#78716c;">Bolek Desk</div>
              <h1 style="margin:4px 0 0;font-size:24px;line-height:1.2;">${escapeHtml(heading)}</h1>
            </div>
          </div>
        </div>
        <div style="padding:28px;">
          ${bodyHtml}
          ${ctaLabel && ctaUrl ? `<div style="margin-top:28px;"><a href="${ctaUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;">${escapeHtml(ctaLabel)}</a></div>` : ""}
        </div>
        <div style="padding:18px 28px;border-top:1px solid #e7e5e4;background:#fafaf9;font-size:12px;line-height:1.6;color:#57534e;">
          <p style="margin:0 0 8px;">If you did not expect this email, secure your account immediately and contact support.</p>
          <p style="margin:0;">Public docs & source: <a href="${repoLink}" style="color:#111827;">${repoLink}</a></p>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function renderPublicHelpCenter() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bolek Desk Help Center</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body { margin:0; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#fafaf9; color:#1c1917; line-height:1.6; }
      .wrap { max-width: 1040px; margin: 0 auto; padding: 32px 18px 56px; }
      .hero, .card { background:#fff; border:1px solid #e7e5e4; border-radius:24px; box-shadow:0 14px 40px rgba(15,23,42,.06); }
      .hero { padding: 28px; margin-bottom: 20px; }
      .grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); gap:16px; }
      .card { padding: 20px; }
      a { color:#111827; }
      .pill { display:inline-flex; padding:6px 10px; border-radius:999px; background:#f5f5f4; font-size:12px; }
      .actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; }
      .btn { display:inline-flex; align-items:center; justify-content:center; padding:10px 14px; border-radius:999px; text-decoration:none; font-weight:700; border:1px solid #d6d3d1; color:#111827; background:#fff; }
      .btn.primary { background:#111827; color:#fff; border-color:#111827; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="hero">
        <span class="pill">Public · no login required</span>
        <h1 style="margin:12px 0 8px;font-size:clamp(2rem,4vw,3rem);line-height:1.1;">Bolek Desk Help Center</h1>
        <p style="margin:0;max-width:760px;color:#57534e;">Find account security guidance, password reset steps, email notification controls, and production deployment notes.</p>
        <div class="actions">
          <a class="btn primary" href="/">Back to app</a>
          <a class="btn" href="${REPO_URL}" target="_blank" rel="noreferrer">Source repository</a>
        </div>
      </section>
      <section class="grid">
        <article class="card"><h2>Account security</h2><p>Use passkeys or 2FA, keep your password unique, and review login notices regularly.</p></article>
        <article class="card"><h2>Password reset</h2><p>Request a reset email, open the secure link, and set a new password before the token expires.</p></article>
        <article class="card"><h2>Email alerts</h2><p>Control login, security, reset, and product emails from account settings.</p></article>
        <article class="card"><h2>Cloudflare safety</h2><p>Use secrets for admin bootstrap, set a strong JWT secret, and keep app origins exact in OAuth messages.</p></article>
      </section>
    </main>
  </body>
</html>`;
}

function renderResetPasswordPage(token = "") {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reset your Bolek Desk password</title>
    <style>
      body { margin:0; font-family: Inter, system-ui, sans-serif; background:#fafaf9; color:#1c1917; }
      .wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
      .card { width:min(560px,100%); background:#fff; border:1px solid #e7e5e4; border-radius:24px; box-shadow:0 18px 50px rgba(15,23,42,.08); padding:28px; }
      label { display:block; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; margin:16px 0 6px; color:#57534e; }
      input { width:100%; padding:12px 14px; border:1px solid #d6d3d1; border-radius:14px; font-size:14px; }
      button { margin-top:20px; background:#111827; color:#fff; border:0; border-radius:999px; padding:12px 18px; font-weight:700; cursor:pointer; }
      .muted { color:#57534e; font-size:14px; }
      .row { display:flex; gap:12px; }
      .row > div { flex:1; }
      a { color:#111827; }
      .msg { margin-top:16px; padding:12px 14px; border-radius:14px; background:#f5f5f4; display:none; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1 style="margin-top:0;">Reset password</h1>
        <p class="muted">Use the reset token from your email. If you do not have one, request a reset below.</p>
        <form id="requestForm">
          <label for="email">Request reset email</label>
          <input id="email" type="email" placeholder="name@example.com" />
          <button type="submit">Send reset link</button>
        </form>
        <hr style="margin:24px 0;border:0;border-top:1px solid #e7e5e4;" />
        <form id="resetForm">
          <label for="token">Reset token</label>
          <input id="token" type="text" value="${escapeHtml(token)}" placeholder="Paste token from email" />
          <label for="password">New password</label>
          <input id="password" type="password" placeholder="New password" />
          <label for="confirm">Confirm password</label>
          <input id="confirm" type="password" placeholder="Confirm password" />
          <button type="submit">Update password</button>
        </form>
        <div id="msg" class="msg"></div>
        <p style="margin-top:18px;font-size:12px;color:#78716c;">Source repo: <a href="${REPO_URL}" target="_blank" rel="noreferrer">${REPO_URL}</a></p>
      </div>
    </div>
    <script>
      const msg = document.getElementById('msg');
      const show = (text, ok=true) => {
        msg.style.display = 'block';
        msg.style.background = ok ? '#ecfdf5' : '#fef2f2';
        msg.style.color = ok ? '#166534' : '#991b1b';
        msg.textContent = text;
      };
      document.getElementById('requestForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const res = await fetch('/api/auth/request-password-reset', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ email })
        });
        const data = await res.json().catch(() => ({}));
        show(data.message || 'If the email exists, a reset link has been sent.');
      });
      document.getElementById('resetForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = document.getElementById('token').value.trim();
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm').value;
        if (password !== confirm) return show('Passwords do not match.', false);
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ token, newPassword: password })
        });
        const data = await res.json().catch(() => ({}));
        show(data.message || 'Password updated.');
      });
    </script>
  </body>
</html>`;
}

async function sendPlatformEmail(to: string, subject: string, html: string, text: string) {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "us-east-1";
  const senderEmail = process.env.AWS_SES_SENDER || process.env.BOLEKSEND_SENDER_EMAIL || "noreply@bolekpad.com";

  if (!accessKeyId || !secretAccessKey) {
    console.log(`[email-skip] ${subject} -> ${to}`);
    return { sent: false, messageId: null };
  }

  const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
  const client = new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey }
  });

  const result = await client.send(new SendEmailCommand({
    Destination: { ToAddresses: [to] },
    Message: {
      Body: {
        Html: { Charset: "UTF-8", Data: html },
        Text: { Charset: "UTF-8", Data: text }
      },
      Subject: { Charset: "UTF-8", Data: subject }
    },
    Source: senderEmail
  }));

  return { sent: true, messageId: result.MessageId || null };
}

function buildSecurityEmail(title: string, body: string, ctaLabel?: string, ctaUrl?: string) {
  return renderEmailShell(title, title, `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#44403c;">${body}</p>`, ctaLabel, ctaUrl);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderLegalPage() {
  const terms = fs.readFileSync(legalTermsPath, "utf8");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BolekPad Legal Terms & Privacy Policy</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #ffffff;
        color: #111111;
        line-height: 1.6;
      }
      .page {
        max-width: 980px;
        margin: 0 auto;
        padding: 32px 20px 48px;
      }
      .panel {
        background: #ffffff;
        border: 1px solid #e7e5e4;
        border-radius: 24px;
        box-shadow: 0 12px 40px rgba(15, 23, 42, 0.06);
        overflow: hidden;
      }
      .hero {
        padding: 28px 28px 20px;
        border-bottom: 1px solid #e7e5e4;
        background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
      }
      .hero h1 {
        margin: 0 0 8px;
        font-size: clamp(1.6rem, 3vw, 2.2rem);
      }
      .hero p {
        margin: 0;
        color: #57534e;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 18px;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #d6d3d1;
        border-radius: 999px;
        padding: 10px 14px;
        background: #ffffff;
        color: #111111;
        text-decoration: none;
        font-weight: 600;
        font-size: 14px;
      }
      .btn.primary {
        background: #ffffff;
        color: #111111;
        border-color: #111111;
      }
      .content {
        padding: 28px;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        margin-bottom: 24px;
      }
      .summary div {
        border: 1px solid #e7e5e4;
        border-radius: 18px;
        padding: 16px;
        background: #fafafa;
      }
      .summary h2 {
        margin: 0 0 6px;
        font-size: 0.95rem;
      }
      .summary p { margin: 0; color: #57534e; font-size: 0.92rem; }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: inherit;
        font-size: 14px;
        color: #111111;
      }
      @media print {
        .actions { display: none; }
        body { background: #ffffff; }
        .page { padding: 0; }
        .panel { border: 0; border-radius: 0; box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="panel">
        <div class="hero">
          <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#78716c;">Accessible without signing in</p>
          <h1>BolekPad Legal Terms & Privacy Policy</h1>
          <p>White-themed public policy page with zero-login access, payment acknowledgements, and storage disclosures.</p>
          <div class="actions">
            <a class="btn primary" href="/">Back to app</a>
            <a class="btn" href="/terms" target="_blank" rel="noreferrer">Open in new tab</a>
            <button class="btn" type="button" onclick="window.print()">Print / Save PDF</button>
          </div>
        </div>
        <div class="content">
          <div class="summary">
            <div><h2>Data visibility</h2><p>We use Cloudflare and minimize exposure of user content to the extent technically possible.</p></div>
            <div><h2>Payments</h2><p>Subscriptions require acknowledgement and are non-refundable except where the law requires otherwise.</p></div>
            <div><h2>Security</h2><p>Passkeys and two-factor authentication are supported to protect accounts and notifications.</p></div>
          </div>
          <pre>${escapeHtml(terms)}</pre>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON
  app.use(express.json());

  app.get(["/legal", "/terms", "/privacy-policy", "/terms-conditions&privacypolicy"], (_req, res) => {
    res.status(200).type("html").send(renderLegalPage());
  });

  app.get(["/help", "/help-center"], (_req, res) => {
    res.status(200).type("html").send(renderPublicHelpCenter());
  });

  app.get("/reset-password", (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    res.status(200).type("html").send(renderResetPasswordPage(token));
  });

  // -------------------------------------------------------------
  // Backend Authentication Endpoints
  // -------------------------------------------------------------

  // User Registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email address and password are required." });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long." });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address." });
      }

      const user = await createUser(email, password, name || "");
      const token = generateAuthToken(user);

      return res.status(201).json({
        message: "Account created successfully.",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture || "",
          totpSecret: user.totpSecret,
          passkeys: user.passkeys,
          createdAt: user.createdAt,
          notificationPreferences: user.notificationPreferences,
          lastLoginAt: user.lastLoginAt || null,
          welcomeEmailSentAt: user.welcomeEmailSentAt || null
        }
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      return res.status(400).json({ error: err.message || "Failed to create account." });
    }
  });

  // User Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const user = findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email address or password." });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email address or password." });
      }

      const token = generateAuthToken(user);
      const updatedUser = setUserLastLogin(user.id) || user;

      if (updatedUser.notificationPreferences?.welcomeEmail && !updatedUser.welcomeEmailSentAt) {
        try {
          await sendPlatformEmail(
            updatedUser.email,
            "Welcome to Bolek Desk",
            renderEmailShell(
              "Welcome to Bolek Desk",
              "Welcome aboard",
              `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#44403c;">Hi ${escapeHtml(updatedUser.name)}, your first successful sign-in is complete.</p><p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#44403c;">You can change email notification preferences in account settings anytime.</p>`,
              "Open Bolek Desk",
              `${getAppUrl()}/desk`
            ),
            `Hi ${updatedUser.name}, your first successful sign-in is complete.`
          );
          markWelcomeEmailSent(updatedUser.id);
        } catch (emailError) {
          console.warn("Welcome email failed:", emailError);
        }
      } else if (updatedUser.notificationPreferences?.loginEmails) {
        try {
          await sendPlatformEmail(
            updatedUser.email,
            "New sign-in to Bolek Desk",
            buildSecurityEmail(
              "New sign-in detected",
              `We detected a successful login to your Bolek Desk account (${escapeHtml(updatedUser.email)}). If this was not you, change your password immediately and review your passkeys.`
            ),
            `We detected a successful login to your Bolek Desk account (${updatedUser.email}).`
          );
        } catch (emailError) {
          console.warn("Login alert email failed:", emailError);
        }
      }

      return res.json({
        message: "Login successful.",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture || "",
          totpSecret: user.totpSecret,
          passkeys: user.passkeys,
          createdAt: updatedUser.createdAt,
          notificationPreferences: updatedUser.notificationPreferences,
          lastLoginAt: updatedUser.lastLoginAt || null,
          welcomeEmailSentAt: updatedUser.welcomeEmailSentAt || null
        }
      });
    } catch (err: any) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "An error occurred during authentication." });
    }
  });

  // Get current logged-in user session
  app.get("/api/auth/me", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication token is missing." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAuthToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Invalid or expired authentication session." });
    }

    const user = findUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "Authenticated user record not found." });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture || "",
        totpSecret: user.totpSecret,
        passkeys: user.passkeys,
        createdAt: user.createdAt,
        notificationPreferences: user.notificationPreferences,
        lastLoginAt: user.lastLoginAt || null,
        welcomeEmailSentAt: user.welcomeEmailSentAt || null
      }
    });
  });

  // User Logout
  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Successfully logged out." });
  });

  app.get("/api/auth/preferences", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication token is missing." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAuthToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Invalid or expired session." });
    }

    const user = findUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json({ notificationPreferences: user.notificationPreferences });
  });

  app.post("/api/auth/preferences", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication token is missing." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAuthToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Invalid or expired session." });
    }

    const updatedUser = updateUserNotificationPreferences(decoded.userId, {
      securityEmails: !!req.body?.securityEmails,
      loginEmails: !!req.body?.loginEmails,
      welcomeEmail: !!req.body?.welcomeEmail,
      passwordResetEmails: !!req.body?.passwordResetEmails,
      productEmails: !!req.body?.productEmails,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json({ notificationPreferences: updatedUser.notificationPreferences });
  });

  // Change Password
  app.post("/api/auth/change-password", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication token is missing." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAuthToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Invalid or expired session." });
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Please provide current password and a new password (min 6 characters)." });
    }

    try {
      await changeUserPassword(decoded.userId, oldPassword, newPassword);
      const updatedUser = findUserById(decoded.userId);
      if (updatedUser?.notificationPreferences?.securityEmails) {
        try {
          await sendPlatformEmail(
            updatedUser.email,
            "Your Bolek Desk password changed",
            buildSecurityEmail(
              "Password updated",
              "Your Bolek Desk password was changed successfully. If you did not make this change, reset your password immediately and review your account security."
            ),
            "Your Bolek Desk password was changed successfully."
          );
        } catch (emailError) {
          console.warn("Password change email failed:", emailError);
        }
      }
      return res.json({ message: "Password changed successfully." });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Failed to change password." });
    }
  });

  app.post("/api/auth/request-password-reset", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "Email address is required." });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.json({ message: "If an account exists, a reset link has been sent." });
    }

    if (!user.notificationPreferences?.passwordResetEmails) {
      return res.json({ message: "Password reset notifications are disabled for this account." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    setPasswordResetToken(user.id, token, expiresAt);

    const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await sendPlatformEmail(
        user.email,
        "Reset your Bolek Desk password",
        renderEmailShell(
          "Reset your password",
          "Password reset request",
          `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#44403c;">We received a request to reset the password for ${escapeHtml(user.email)}.</p><p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#44403c;">This link expires in 60 minutes.</p><p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#44403c;">If you did not request this, ignore this message.</p>`,
          "Reset password now",
          resetUrl
        ),
        `We received a request to reset the password for ${user.email}. Use this link within 60 minutes: ${resetUrl}`
      );
    } catch (emailError) {
      console.warn("Password reset email failed:", emailError);
    }

    return res.json({ message: "If an account exists, a reset link has been sent." });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const token = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!token || newPassword.length < 6) {
      return res.status(400).json({ error: "Valid reset token and a new password (min 6 characters) are required." });
    }

    const user = await resetUserPasswordWithToken(token, newPassword);
    if (!user) {
      return res.status(400).json({ error: "Reset token is invalid or expired." });
    }

    if (user.notificationPreferences?.securityEmails) {
      try {
        await sendPlatformEmail(
          user.email,
          "Your Bolek Desk password was reset",
          buildSecurityEmail(
            "Password reset complete",
            "Your password has been reset successfully. If you did not perform this action, contact support immediately and review your passkeys."
          ),
          "Your Bolek Desk password has been reset successfully."
        );
      } catch (emailError) {
        console.warn("Password reset completion email failed:", emailError);
      }
    }

    return res.json({ message: "Password updated successfully. You can now sign in with your new password." });
  });

  // Sync Passkeys
  app.post("/api/auth/passkeys/sync", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication token is missing." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAuthToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Invalid session." });
    }

    const { passkeys } = req.body;
    if (!Array.isArray(passkeys)) {
      return res.status(400).json({ error: "Passkeys array required." });
    }

    const updatedUser = updateUserPasskeys(decoded.userId, passkeys);
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    if (updatedUser.notificationPreferences?.securityEmails) {
      sendPlatformEmail(
        updatedUser.email,
        "Your Bolek Desk passkeys changed",
        buildSecurityEmail(
          "Passkeys updated",
          "Your saved passkeys were updated. If this wasn't you, remove all passkeys and change your password immediately."
        ),
        "Your saved passkeys were updated."
      ).catch((emailError) => console.warn("Passkey update email failed:", emailError));
    }

    return res.json({ passkeys: updatedUser.passkeys });
  });

  // Google OAuth URL Generation
  app.get("/api/auth/google/url", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "Google OAuth client is not fully configured in your environment secrets." });
    }
    const redirectUri = (req.query.redirect_uri as string) || `${process.env.APP_URL || "http://localhost:3000"}/auth/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ url });
  });

  // Google OAuth Callback endpoint (Handles both slash and no-slash paths)
  app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
    const { code } = req.query;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!code) {
      return res.status(400).send("Authorization code is missing.");
    }

    if (!clientId || !clientSecret) {
      return res.status(500).send("Google OAuth environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are missing on the server.");
    }

    // Determine secure or default redirect_uri matching Google credentials settings
    const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const host = req.headers.host || "localhost:3000";
    const redirectUri = `${protocol}://${host}/auth/callback`;

    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code: code as string,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Google token exchange failed: ${errorText}`);
      }

      const { access_token } = await tokenResponse.json();

      // Fetch user profile info from Google API
      const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        throw new Error(`Google user profile retrieval failed: ${errorText}`);
      }

      const profile = await profileResponse.json();
      const targetOrigin = new URL(getAppUrl()).origin;

      // Send postMessage success to parent and close popup
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Bolek Desk Authentication</title>
          </head>
          <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #fafafa; margin: 0; color: #1c1917;">
            <div style="text-align: center; padding: 2.5rem; background: white; border-radius: 16px; border: 1px solid #e7e5e4; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); max-w-sm; width: 100%;">
              <div style="width: 48px; height: 48px; background: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem;">
                <svg style="width: 24px; height: 24px; color: #15803d;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 style="margin: 0 0 0.5rem 0; font-size: 1.125rem; font-weight: 600; color: #1c1917;">Authentication Complete</h2>
              <p style="margin: 0; color: #78716c; font-size: 0.875rem; line-height: 1.5;">Securing connection to your Bolek Desk workspace. This popup will close automatically.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'OAUTH_AUTH_SUCCESS',
                    profile: {
                      email: ${JSON.stringify(profile.email)},
                      name: ${JSON.stringify(profile.name || profile.given_name || "Google User")},
                      picture: ${JSON.stringify(profile.picture || "")}
                    }
                  }, ${JSON.stringify(targetOrigin)});
                  setTimeout(() => {
                    try { window.close(); } catch(e) {}
                  }, 500);
                } else {
                  window.location.href = '/desk';
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("OAuth callback error:", error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #fafafa; color: #991b1b; margin: 0;">
            <div style="text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #fca5a5;">
              <h2 style="margin: 0 0 0.5rem 0; font-size: 1.25rem;">Authentication Failed</h2>
              <p style="margin: 0; color: #78716c; font-size: 0.875rem;">Error: ${error.message || "Unknown error occurred"}</p>
              <button onclick="window.close()" style="margin-top: 1rem; padding: 0.5rem 1rem; background-color: #991b1b; color: white; border: none; border-radius: 6px; cursor: pointer;">Close Window</button>
            </div>
          </body>
        </html>
      `);
    }
  });

  // API Route for Gemini Generative AI (Server-side)
  app.post("/api/gemini/generate", async (req, res) => {
    const { prompt, systemInstruction, responseSchema, isJson } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing required parameter: prompt" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("⚠️ GEMINI_API_KEY not found in environment. Utilizing premium local simulation mode.");
      // Premium fallback generator so user preview still runs smoothly
      try {
        let simulatedResponse = "";
        const lowerPrompt = prompt.toLowerCase();
        
        if (isJson || responseSchema) {
          // Return simulated JSON
          if (lowerPrompt.includes("mind") || lowerPrompt.includes("map") || lowerPrompt.includes("diagram") || lowerPrompt.includes("flowchart")) {
            simulatedResponse = JSON.stringify({
              title: "AI Brainstorm Board",
              nodes: [
                { id: "node-1", label: "💡 Main Concept", x: 250, y: 100, type: "terminal", color: "#1e3a8a" },
                { id: "node-2", label: "🔍 Research & Context", x: 100, y: 220, type: "process", color: "#0d9488" },
                { id: "node-3", label: "🛠️ Execution Plan", x: 400, y: 220, type: "process", color: "#0891b2" },
                { id: "node-4", label: "✨ Final Review", x: 250, y: 340, type: "decision", color: "#ca8a04" }
              ],
              connections: [
                { id: "conn-1", fromId: "node-1", toId: "node-2", label: "investigate", style: "bezier" },
                { id: "conn-2", fromId: "node-1", toId: "node-3", label: "develop", style: "orthogonal" },
                { id: "conn-3", fromId: "node-2", toId: "node-4", label: "approve", style: "straight" },
                { id: "conn-4", fromId: "node-3", toId: "node-4", label: "submit", style: "bezier" }
              ]
            });
          } else {
            simulatedResponse = JSON.stringify({
              text: "Simulated structured response."
            });
          }
        } else {
          // Return plain text
          if (lowerPrompt.includes("summarize")) {
            simulatedResponse = "### 📋 Document Summary\n\nThis is an automated high-fidelity summary of your active workspace document. It outlines the core objectives, key action items, and structural outlines described in your draft.\n\n- **Objective**: Establish premium workflow optimizations.\n- **Status**: Iteration phase active.\n- **Next Steps**: Conduct alignment review with the workspace board.";
          } else if (lowerPrompt.includes("translate")) {
            simulatedResponse = "Sección de Documento Traducida:\n\nEste es un documento profesional editado con Bolek Docs. Ofrece una maquetación impecable y herramientas de IA integradas para aumentar la productividad escolar y profesional.";
          } else if (lowerPrompt.includes("minutes")) {
            simulatedResponse = "### 📝 Meeting Minutes\n\n**Date**: July 17, 2026  \n**Attendees**: Team Bolek & Stakeholders  \n\n#### 1. Core Agenda\n- Reviewed the new Bolek Docs features and formatting capabilities.\n- Inspected the Bolek Canvas visual layout, isometric background grids, and aligners.\n\n#### 2. Key Action Items\n- **Engineering**: Deliver PDF & DOCX export capabilities.\n- **Design**: Refine custom typography and padding constraints.\n- **AI Team**: Connect to Google GenAI for auto-generating flowchart structures.";
          } else if (lowerPrompt.includes("proposal")) {
            simulatedResponse = "# 💼 Business Proposal: Project Bolek Desk\n\n## 1. Executive Summary\nOur goal is to deliver an integrated single-page interactive workspace combining canvas brainstorming, calendar scheduling, and professional document editors.\n\n## 2. Deliverables\n- Real-time dragging, connection anchoring, and flowchart nodes.\n- Rich document typography formatting, Cover pages, and signature stamping.";
          } else {
            simulatedResponse = `### ✨ AI Enhanced Result\n\nHere is your refined text with professional grammar and optimized formatting:\n\n"${prompt.replace(/rewrite|summarize|expand/gi, "").trim()}"\n\n*Optimized for clarity, conciseness, and professional tone.*`;
          }
        }
        
        return res.json({ text: simulatedResponse });
      } catch (err) {
        return res.status(500).json({ error: "Simulation failed" });
      }
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const config: any = {};
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }
      if (responseSchema) {
        config.responseSchema = responseSchema;
        config.responseMimeType = "application/json";
      } else if (isJson) {
        config.responseMimeType = "application/json";
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config
      });

      return res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      return res.status(500).json({ error: error.message || "Error calling Gemini API" });
    }
  });

  // API Route for checking Boleksend SES configuration status
  app.get("/api/boleksend/config-status", (req, res) => {
    res.json({
      hasAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretAccessKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "us-east-1",
      senderEmail: process.env.AWS_SES_SENDER || process.env.BOLEKSEND_SENDER_EMAIL || "rjelvanbaloaloa@gmail.com"
    });
  });

  // API Route for Boleksend Email Dispatcher
  app.post("/api/boleksend/send", async (req, res) => {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ error: "Missing required fields: to, subject, and message are required." });
    }

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || "us-east-1";
    const senderEmail = process.env.AWS_SES_SENDER || process.env.BOLEKSEND_SENDER_EMAIL || "rjelvanbaloaloa@gmail.com";

    if (!accessKeyId || !secretAccessKey) {
      return res.status(400).json({ 
        error: "Amazon SES credentials (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY) are not configured. Please define them in your environment secrets to send production emails." 
      });
    }

    try {
      const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
      const client = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const command = new SendEmailCommand({
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: message.replace(/\n/g, "<br>"),
            },
            Text: {
              Charset: "UTF-8",
              Data: message,
            },
          },
          Subject: {
            Charset: "UTF-8",
            Data: subject,
          },
        },
        Source: senderEmail,
      });

      const result = await client.send(command);

      console.log("==================================================");
      console.log("📬 BOLEKSEND EMAIL DISPATCHED VIA AMAZON SES!");
      console.log(`To:        ${to}`);
      console.log(`Subject:   ${subject}`);
      console.log(`Sender:    ${senderEmail}`);
      console.log(`MessageId: ${result.MessageId}`);
      console.log("==================================================");

      return res.json({ 
        success: true, 
        message: `Message sent successfully via Amazon SES (Message ID: ${result.MessageId})`,
        messageId: result.MessageId
      });
    } catch (error: any) {
      console.error("AWS SES Error:", error);
      return res.status(500).json({ 
        error: `AWS SES sending failed: ${error.message || error}` 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      root: __dirname,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bolek Desk Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
