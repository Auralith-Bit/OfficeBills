# OfficeBill 🧾

**A complete billing, inventory, and dues management system for Nepali offices and small businesses.**

**Live:** [office-bills.vercel.app](https://office-bills.vercel.app) · **Frontend docs:** [frontend/README.md](frontend/README.md)

---

## 📌 Overview

OfficeBill digitizes day-to-day office billing: create IRD-compliant invoices in Bikram Sambat dates, track stock, record cash/QR payments, monitor customer dues, and hand over clean printed documents — all from one utilitarian workspace built for speed and clarity.

Key compliance behaviors:

- **PAN-registered businesses** never charge VAT (0% enforced everywhere).
- **VAT-registered businesses** apply 13% VAT with proper output/input tracking.
- Invoices print on A4 with repeating table headers, orphan-proof totals/signature blocks, and no browser chrome.

---

## 🗂 Repository Structure

```text
OfficeBill/
├── frontend/               # React + TypeScript single-page app (Vite)
│   ├── src/
│   │   ├── components/     # Layout, Sidebar, Topbar, UI kit, ItemPicker
│   │   ├── pages/          # Dashboard, POS, Invoices, Dues, Inventory, Reports…
│   │   ├── store/          # AppStore (business data) + AuthStore (users/sessions)
│   │   ├── utils/          # Nepali dates, words, permissions, CSV helpers
│   │   └── index.css       # Theme, component classes, print stylesheet
│   ├── index.html
│   ├── package.json
│   └── README.md           # Frontend-specific documentation
└── README.md               # ← you are here
```

> **Backend note:** The current build is a fully functional frontend demo persisted in `localStorage`. The store layer is API-ready — a Node/PostgreSQL backend (JWT auth, bcrypt hashes, real email OTP) plugs in without UI changes.

---

## ⚡ Quick Start

```bash
# 1 — enter the app folder
cd frontend

# 2 — install dependencies
npm install

# 3 — start dev server (http://localhost:5173)
npm run dev

# 4 — production build + preview
npm run build
npm run preview
```

First run: click **Sign up** to register your business (the owner becomes Admin). A demo OTP is shown on-screen because real email delivery arrives with the backend.

---

## 👥 Roles & Access

| Role        | Landing page | Can access                                                        |
| ----------- | ------------ | ----------------------------------------------------------------- |
| **Admin**   | Dashboard    | Everything: settings, staff, reports, accounts, purchase, expense |
| **Cashier** | POS          | POS, sales invoices, Payment In, Dues, parties & inventory view   |

Routes are guarded on the client (`RequireRole`), the sidebar hides unauthorized modules, and stale sessions auto-downgrade safely.

Default staff password (when left blank at creation): `aura123` — settable per staff account.

---

## 🧩 Module Map

| Module                     | Purpose                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| **Dashboard**              | KPIs, 7-day cash-flow bars, recent invoices, low-stock alerts       |
| **POS / New Invoice**      | Search-to-add line items, PAN/VAT-aware tax, cash/QR/split tender   |
| **Sales Invoices**         | List, edit, print/PDF, internal paid/unpaid flag                    |
| **Payment In**             | Receipts against invoices or on-account                             |
| **Dues**                   | Outstanding ledger per customer; add/reduce manual entries; collect |
| **Parties**                | Customers & suppliers with PAN/VAT registration type                |
| **Inventory**              | Products/services, HSN/SAC, stock adjustments, reorder levels       |
| **Purchase / Payment Out** | Supplier bills and settlements (stock auto-increments)              |
| **Expense / Accounts**     | Daily costs, other income, cash & bank position                     |
| **Reports**                | VAT summary, P&L, sales/purchase registers + CSV export             |
| **Manage Staffs**          | Real login accounts with role assignment and activation             |
| **Settings**               | Business profile, PAN/VAT switch, invoice footer note               |

---

## 🛠 Tech Stack

- React 18 · TypeScript · Vite
- Tailwind CSS (institutional deep-teal theme)
- React Router v6 (protected routes)
- Context-based stores (`AppStore`, `AuthStore`)
- Lucide icons · custom BS-date utilities · number-to-words (Nepali currency)

---

## ☁️ Deployment

- **Host:** Vercel — auto-deploys from `main`
- **Root directory:** `frontend`
- **Build command:** `npm run build`
- **Output directory:** `dist`

---

## 🗺 Roadmap (backend phase)

1. Node/Express + PostgreSQL API replacing the localStorage stores
2. JWT sessions, bcrypt password hashes, real SMTP OTP emails
3. IRD QR codes on printed invoices
4. Multi-branch stock and user audit logs

---

## 👨‍💻 Credits

**Designed and Developed by Auralith Bit and Team**

_OfficeBill — reliable, print-perfect, office-ready billing._
