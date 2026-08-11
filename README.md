# Bolek Workspace

An all-in-one productivity suite featuring interactive workspace boards, live exchange rate currency conversion, StickySend inter-user messaging, calendar scheduling, email campaign management, and admin controls.

---

## ✨ Features

* **Bolek Board**: Interactive kanban sticky notes with tag filters, card locking, color customization, and search.
* **StickySend**: Direct inter-user sticky note messaging with unread pin covers (`received boleknote from @username`), file attachments, photo previews, and adjustable dual-panel layout (BolekInbox / BolekSent).
* **Live Currency Converter**: Real-time USD/EUR/GBP/JPY exchange rate fetching with swap buttons, currency pair locking, quick amount presets, and visual rate bar graphs.
* **Admin Dashboard Settings**: Manage registered user accounts, role switching (Admin/Regular User), subscription plans, feature toggles, and PayPal sandbox payments.
* **Bolek Calendar & Docs & Canvas**: Integrated scheduling, document editing, and whiteboarding utilities.

---

## 📖 Deployment & Setup

For step-by-step, non-technical instructions on deploying this project to **GitHub**, **Cloudflare Pages**, **Cloudflare D1 Database**, and **Cloudflare R2 Storage**, please consult the **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**.

### Local Development Quick Start

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

Build for production:
```bash
npm run build
```

---

## 🛠️ Configuration Files

* `DEPLOYMENT_GUIDE.md`: Comprehensive non-technical deployment guide for GitHub and Cloudflare (D1 & R2).
* `wrangler.toml`: Cloudflare Pages / Workers setup configuration file.
* `.env.example`: Template for environment variables.
* `functions/`: Cloudflare Pages Functions for live PayPal subscription checkout.
