var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_url = require("url");
var import_vite = require("vite");
var import_genai = require("@google/genai");

// src/server/authStore.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var JWT_SECRET = process.env.JWT_SECRET || "bolek_desk_jwt_secret_key_2026_prod";
var DATA_DIR = import_path.default.resolve(process.cwd(), "data");
var USERS_FILE = import_path.default.join(DATA_DIR, "users.json");
function initUserStore() {
  if (!import_fs.default.existsSync(DATA_DIR)) {
    import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!import_fs.default.existsSync(USERS_FILE)) {
    const defaultPasswordHash = import_bcryptjs.default.hashSync("bolek2026", 10);
    const seedUser = {
      id: "usr_seed_001",
      email: "rjelvanbaloaloa@gmail.com",
      passwordHash: defaultPasswordHash,
      name: "Jelvan Ricolcol",
      picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      verified: true,
      totpSecret: "GBSWY3DPEHPK3PXP",
      passkeys: [
        {
          id: "pk_seed_01",
          name: "Primary Security Key",
          createdAt: (/* @__PURE__ */ new Date()).toLocaleDateString(),
          real: true,
          username: "rjelvanbaloaloa@gmail.com"
        }
      ]
    };
    import_fs.default.writeFileSync(USERS_FILE, JSON.stringify([seedUser], null, 2), "utf-8");
  }
}
function getAllUsers() {
  initUserStore();
  try {
    const raw = import_fs.default.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading users store file:", err);
    return [];
  }
}
function saveUsers(users) {
  initUserStore();
  import_fs.default.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}
function findUserByEmail(email) {
  const users = getAllUsers();
  return users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}
function findUserById(id) {
  const users = getAllUsers();
  return users.find((u) => u.id === id);
}
async function createUser(email, passwordPlain, name) {
  const users = getAllUsers();
  const normalizedEmail = email.trim().toLowerCase();
  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error("An account with this email address already exists.");
  }
  const saltRounds = 10;
  const passwordHash = await import_bcryptjs.default.hash(passwordPlain, saltRounds);
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let totpSecret = "";
  for (let i = 0; i < 16; i++) {
    totpSecret += base32Chars.charAt(Math.floor(Math.random() * base32Chars.length));
  }
  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: normalizedEmail,
    passwordHash,
    name: name.trim() || normalizedEmail.split("@")[0],
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    verified: true,
    totpSecret,
    passkeys: []
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
}
async function verifyPassword(passwordPlain, passwordHash) {
  return import_bcryptjs.default.compare(passwordPlain, passwordHash);
}
function generateAuthToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture || ""
  };
  return import_jsonwebtoken.default.sign(payload, JWT_SECRET, { expiresIn: "14d" });
}
function verifyAuthToken(token) {
  try {
    return import_jsonwebtoken.default.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
function updateUserPasskeys(userId, passkeys) {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return null;
  users[idx].passkeys = passkeys;
  saveUsers(users);
  return users[idx];
}
async function changeUserPassword(userId, oldPasswordPlain, newPasswordPlain) {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("User not found.");
  const isValid = await import_bcryptjs.default.compare(oldPasswordPlain, users[idx].passwordHash);
  if (!isValid) {
    throw new Error("Current password is incorrect.");
  }
  users[idx].passwordHash = await import_bcryptjs.default.hash(newPasswordPlain, 10);
  saveUsers(users);
  return true;
}

// server.ts
var import_meta = {};
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path2.default.dirname(__filename);
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
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
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      console.error("Registration error:", err);
      return res.status(400).json({ error: err.message || "Failed to create account." });
    }
  });
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
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "An error occurred during authentication." });
    }
  });
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
        createdAt: user.createdAt
      }
    });
  });
  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Successfully logged out." });
  });
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
      return res.json({ message: "Password changed successfully." });
    } catch (err) {
      return res.status(400).json({ error: err.message || "Failed to change password." });
    }
  });
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
    return res.json({ passkeys: updatedUser.passkeys });
  });
  app.get("/api/auth/google/url", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "Google OAuth client is not fully configured in your environment secrets." });
    }
    const redirectUri = req.query.redirect_uri || `${process.env.APP_URL || "http://localhost:3000"}/auth/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent"
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ url });
  });
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
    const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const host = req.headers.host || "localhost:3000";
    const redirectUri = `${protocol}://${host}/auth/callback`;
    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        })
      });
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Google token exchange failed: ${errorText}`);
      }
      const { access_token } = await tokenResponse.json();
      const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });
      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        throw new Error(`Google user profile retrieval failed: ${errorText}`);
      }
      const profile = await profileResponse.json();
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
                  }, '*');
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
    } catch (error) {
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
  app.post("/api/gemini/generate", async (req, res) => {
    const { prompt, systemInstruction, responseSchema, isJson } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing required parameter: prompt" });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("\u26A0\uFE0F GEMINI_API_KEY not found in environment. Utilizing premium local simulation mode.");
      try {
        let simulatedResponse = "";
        const lowerPrompt = prompt.toLowerCase();
        if (isJson || responseSchema) {
          if (lowerPrompt.includes("mind") || lowerPrompt.includes("map") || lowerPrompt.includes("diagram") || lowerPrompt.includes("flowchart")) {
            simulatedResponse = JSON.stringify({
              title: "AI Brainstorm Board",
              nodes: [
                { id: "node-1", label: "\u{1F4A1} Main Concept", x: 250, y: 100, type: "terminal", color: "#1e3a8a" },
                { id: "node-2", label: "\u{1F50D} Research & Context", x: 100, y: 220, type: "process", color: "#0d9488" },
                { id: "node-3", label: "\u{1F6E0}\uFE0F Execution Plan", x: 400, y: 220, type: "process", color: "#0891b2" },
                { id: "node-4", label: "\u2728 Final Review", x: 250, y: 340, type: "decision", color: "#ca8a04" }
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
          if (lowerPrompt.includes("summarize")) {
            simulatedResponse = "### \u{1F4CB} Document Summary\n\nThis is an automated high-fidelity summary of your active workspace document. It outlines the core objectives, key action items, and structural outlines described in your draft.\n\n- **Objective**: Establish premium workflow optimizations.\n- **Status**: Iteration phase active.\n- **Next Steps**: Conduct alignment review with the workspace board.";
          } else if (lowerPrompt.includes("translate")) {
            simulatedResponse = "Secci\xF3n de Documento Traducida:\n\nEste es un documento profesional editado con Bolek Docs. Ofrece una maquetaci\xF3n impecable y herramientas de IA integradas para aumentar la productividad escolar y profesional.";
          } else if (lowerPrompt.includes("minutes")) {
            simulatedResponse = "### \u{1F4DD} Meeting Minutes\n\n**Date**: July 17, 2026  \n**Attendees**: Team Bolek & Stakeholders  \n\n#### 1. Core Agenda\n- Reviewed the new Bolek Docs features and formatting capabilities.\n- Inspected the Bolek Canvas visual layout, isometric background grids, and aligners.\n\n#### 2. Key Action Items\n- **Engineering**: Deliver PDF & DOCX export capabilities.\n- **Design**: Refine custom typography and padding constraints.\n- **AI Team**: Connect to Google GenAI for auto-generating flowchart structures.";
          } else if (lowerPrompt.includes("proposal")) {
            simulatedResponse = "# \u{1F4BC} Business Proposal: Project Bolek Desk\n\n## 1. Executive Summary\nOur goal is to deliver an integrated single-page interactive workspace combining canvas brainstorming, calendar scheduling, and professional document editors.\n\n## 2. Deliverables\n- Real-time dragging, connection anchoring, and flowchart nodes.\n- Rich document typography formatting, Cover pages, and signature stamping.";
          } else {
            simulatedResponse = `### \u2728 AI Enhanced Result

Here is your refined text with professional grammar and optimized formatting:

"${prompt.replace(/rewrite|summarize|expand/gi, "").trim()}"

*Optimized for clarity, conciseness, and professional tone.*`;
          }
        }
        return res.json({ text: simulatedResponse });
      } catch (err) {
        return res.status(500).json({ error: "Simulation failed" });
      }
    }
    try {
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const config = {};
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
    } catch (error) {
      console.error("Gemini API Error:", error);
      return res.status(500).json({ error: error.message || "Error calling Gemini API" });
    }
  });
  app.get("/api/boleksend/config-status", (req, res) => {
    res.json({
      hasAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretAccessKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "us-east-1",
      senderEmail: process.env.AWS_SES_SENDER || process.env.BOLEKSEND_SENDER_EMAIL || "rjelvanbaloaloa@gmail.com"
    });
  });
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
          secretAccessKey
        }
      });
      const command = new SendEmailCommand({
        Destination: {
          ToAddresses: [to]
        },
        Message: {
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: message.replace(/\n/g, "<br>")
            },
            Text: {
              Charset: "UTF-8",
              Data: message
            }
          },
          Subject: {
            Charset: "UTF-8",
            Data: subject
          }
        },
        Source: senderEmail
      });
      const result = await client.send(command);
      console.log("==================================================");
      console.log("\u{1F4EC} BOLEKSEND EMAIL DISPATCHED VIA AMAZON SES!");
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
    } catch (error) {
      console.error("AWS SES Error:", error);
      return res.status(500).json({
        error: `AWS SES sending failed: ${error.message || error}`
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      root: __dirname,
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.resolve(__dirname, "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bolek Desk Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
//# sourceMappingURL=server.cjs.map
