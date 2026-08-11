# 🚀 Bolek Workspace — Complete Deployment & Cloudflare Setup Guide

This guide provides simple, step-by-step, non-technical instructions for deploying your **Bolek Workspace** application to **GitHub** and **Cloudflare** (including Cloudflare Pages, Cloudflare D1 Database, and Cloudflare R2 File Storage).

---

## 📋 Table of Contents
1. [Overview](#1-overview)
2. [Exporting to GitHub](#2-exporting-to-github)
3. [Cloudflare Setup Checklist](#3-cloudflare-setup-checklist)
4. [Setting up Cloudflare D1 (Database)](#4-setting-up-cloudflare-d1-database)
5. [Setting up Cloudflare R2 (Storage Bucket)](#5-setting-up-cloudflare-r2-storage-bucket)
6. [Deploying to Cloudflare Pages](#6-deploying-to-cloudflare-pages)
7. [Environment Variables Setup](#7-environment-variables-setup)
8. [Testing & Verification](#8-testing--verification)

---

## 1. Overview

**Bolek Workspace** is built with modern, web-standard technologies (React, Vite, Node/Express, Tailwind CSS) fully compatible with all cloud hosting platforms:
* **Hosting**: Cloudflare Pages / Vercel / Netlify / Cloud Run
* **Database (Optional)**: Cloudflare D1 (SQLite) or Firebase Firestore
* **File & Image Storage**: Cloudflare R2 or AWS S3
* **Code Repository**: GitHub

---

## 2. Exporting to GitHub

### Option A: Using the AI Studio Interface (Easiest)
1. Open the **Settings / Workspace Menu** in the top-right corner of AI Studio.
2. Click **Export to GitHub** or **Download ZIP**.
3. If exporting directly, sign in to your GitHub account and choose your repository name (e.g., `bolek-workspace`).
4. Click **Create Repository**.

### Option B: Using Git Command Line
If you downloaded the ZIP or cloned locally:
```bash
# Initialize git repository
git init

# Add all project files
git add .

# Commit changes
git commit -m "Initial commit - Bolek Workspace release"

# Link to your GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/bolek-workspace.git
git branch -M main
git push -u origin main
```

---

## 3. Cloudflare Setup Checklist

To run this application on Cloudflare, you will use:
* **Cloudflare Pages**: Free static & full-stack web hosting.
* **Cloudflare D1**: Distributed SQL database for user accounts and data.
* **Cloudflare R2**: High-speed object storage for images, documents, and sticky note attachments.

---

## 4. Setting up Cloudflare D1 (Database)

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. On the left sidebar, click **Storage & Databases** → **D1**.
3. Click the blue **Create Database** button.
4. Enter a name for your database, e.g., `bolek_db`.
5. Click **Create**.
6. Cloudflare will display a **Database ID** (a string of letters and numbers like `a1b2c3d4-e5f6-...`).
7. Copy this Database ID and paste it into `wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "bolek_db"
   database_id = "YOUR_DATABASE_ID_HERE"
   ```

---

## 5. Setting up Cloudflare R2 (Storage Bucket)

Cloudflare R2 allows users to upload photos, files, and attachments for sticky notes with **zero egress bandwidth fees**.

1. In your Cloudflare Dashboard sidebar, click **Storage & Databases** → **R2**.
2. Click **Create Bucket**.
3. Enter the bucket name: `bolek-sticky-files`.
4. Select location (Default / Automatic is recommended).
5. Click **Create Bucket**.

*(Note: We will connect this bucket to your web application in the next step).*

---

## 6. Deploying to Cloudflare Pages

1. In Cloudflare Dashboard, click **Workers & Pages** in the left sidebar.
2. Click **Create Application** → Select the **Pages** tab.
3. Click **Connect to GitHub**.
4. Log in and select your `bolek-workspace` repository.
5. In the **Set up builds and deployments** section, fill in the following exact settings:
   * **Framework Preset**: `Vite` (or `None`)
   * **Build Command**: `npm run build`
   * **Build Output Directory**: `dist`
   * **Root Directory**: *(leave blank)*
6. **Attach D1 Database & R2 Storage**:
   * Scroll down to **Bindings** or go to **Settings** → **Functions** after deployment.
   * Add D1 Binding: Variable Name = `DB`, Database = `bolek_db`.
   * Add R2 Binding: Variable Name = `STICKY_BUCKET`, Bucket = `bolek-sticky-files`.
7. Click **Save and Deploy**.

Cloudflare will now automatically build your site and generate a live link (e.g., `https://bolek-workspace.pages.dev`).

---

## 7. Environment Variables Setup

In your Cloudflare Pages Dashboard under **Settings** → **Environment Variables**:

Add the following environment variables (from `.env.example`):

| Variable Name | Description | Required? |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini AI Key for smart features | Optional |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | Optional |
| `AWS_ACCESS_KEY_ID` | AWS SES Key for campaign emails | Optional |
| `AWS_SECRET_ACCESS_KEY` | AWS SES Secret | Optional |

---

## 8. Testing & Verification

1. Once the deployment finishes, open your live `.pages.dev` URL.
2. Test the core features:
   * **Dashboard**: Live currency converter refresh rates & widgets.
   * **StickySend**: Send inter-user sticky notes with unread pins, photos, and file attachments.
   * **Admin Settings**: Switch user roles, manage plans, and toggle PayPal sandbox simulation.
3. Any new push to your `main` branch on GitHub will automatically trigger a new deployment on Cloudflare!

🎉 **Congratulations! Your Bolek Workspace is now fully deployed and ready for production!**
