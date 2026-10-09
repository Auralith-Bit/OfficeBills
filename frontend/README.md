# OfficeBill Frontend 🧾

OfficeBill is a streamlined, utilitarian billing and inventory management system designed specifically for daily office operations. Built as a focused variant of a larger master project, it prioritizes speed, clarity, and IRD (Inland Revenue Department, Nepal) compliance without the clutter of premium SaaS features.

---

## ✨ Key Features

- **🔐 Role-Based Access Control (RBAC)**
  - **Admin:** Full access to settings, staff management, reports, and all modules.
  - **Cashier:** Restricted to POS, Sales Invoices, Payment In, and Inventory viewing. Route guarding prevents unauthorized access.
- **🧾 IRD-Compliant Invoicing**
  - Toggle between **PAN** (0% VAT) and **VAT** (13% VAT) registration.
  - Automatic Bikram Sambat (BS) date generation and Fiscal Year tracking.
  - Search-to-add item picker for lightning-fast billing.
- **💰 Advanced Payment Modes**
  - Record payments via **Cash**, **QR Scan**, or **Split** (Partial Cash + QR).
  - Automatic change calculation for cash tenders.
  - Internal "Paid/Unpaid" billing status flags for credit sales.
- **📒 Dues Ledger**
  - Track outstanding customer balances across invoices and manual credit entries.
  - Add/Reduce dues manually with reason notes.
  - Searchable ledger with live outstanding totals.
- **📦 Smart Inventory**
  - Unified Product/Service toggle (Services automatically bypass stock tracking).
  - HSN/SAC code support and automatic low-stock dashboard alerts.
- **🖨️ Print-Optimized Documents**
  - Custom `@media print` CSS ensures invoices print cleanly on A4 paper.
  - Hides app UI (sidebars, buttons), prevents page-break orphans, and repeats table headers on multi-page invoices.
- **📧 Secure Onboarding**
  - Two-step signup flow with simulated Email OTP verification.

---

## 🛠️ Tech Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (Custom utilitarian deep-teal theme)
- **Routing:** React Router v6 (with protected routes)
- **State Management:** React Context API (`AuthStore` + `AppStore`)
- **Icons:** Lucide React
- **Date Utilities:** Custom Bikram Sambat (BS) conversion logic

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation & Setup

1. **Clone the repository** (or navigate to the frontend folder):

   ```bash
   cd frontend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run the development server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

The optimized production files will be generated in the `dist/` folder.

---

## 📂 Project Structure

```text
src/
├── components/       # Reusable UI (Sidebar, Topbar, Modals, ItemPicker)
├── pages/            # Route views (Dashboard, InvoiceCreate, Dues, Settings)
├── store/            # Global state (AppStore for data, AuthStore for users)
├── utils/            # Helpers (Nepali dates, number-to-words, permissions)
├── App.tsx           # Root component & Route definitions
└── index.css         # Tailwind directives, custom components, and print styles
```

---

## 🎨 Design & UX Decisions

OfficeBill was intentionally simplified from its premium master counterpart to suit an internal office environment:

1. **Utilitarian Theme:** Uses a deep, flat institutional teal (`#115e59`) instead of bright SaaS gradients.
2. **No Distractions:** Removed dark mode, command palettes, and complex charting in favor of dense, readable data tables.
3. **Print-First Invoices:** The `InvoiceView` component uses flexbox and CSS break-inside rules to ensure signatures and totals never get pushed to an orphaned second page.
4. **Local-First Demo:** All data is currently persisted in `localStorage` to allow immediate testing without a backend. The store architecture is designed to be easily swapped with REST/GraphQL API calls later.

---

## 👨‍💻 Credits

**Designed and Developed by Auralith Bit and Team**

_Built with precision for reliable, day-to-day office billing operations._
