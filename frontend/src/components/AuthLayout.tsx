import type { ReactNode } from 'react';
import { Receipt, CheckCircle2 } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ---------- Left: simple brand panel ---------- */}
      <div className="hidden w-[42%] flex-col justify-between bg-teal-900 p-10 text-white lg:flex">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <Receipt className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">OfficeBill</span>
        </div>

        {/* Message */}
        <div className="max-w-md">
          <h1 className="text-3xl font-bold leading-tight">
            Simple billing for your office.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-teal-100">
            Invoices, payments and stock — recorded clearly, printed correctly,
            and easy to hand over.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-teal-50">
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-500" />
              IRD-style invoices in seconds
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-500" />
              Clear records of who owes whom
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-500" />
              Role-based access for your staff
            </li>
          </ul>
        </div>

        {/* Footer + developer credit */}
        <div className="space-y-1">
          <p className="text-xs text-teal-300">
            © {new Date().getFullYear()} OfficeBill · PAN / VAT compliant · Bikram Sambat ready
          </p>
          <p className="text-xs font-medium text-teal-100">
            Designed and Developed by <span className="font-semibold text-white">Auralith Bit</span>
          </p>
        </div>
      </div>

      {/* ---------- Right: the form ---------- */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10">
        {/* Compact brand for mobile (left panel is hidden there) */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-800 text-white">
            <Receipt className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold text-slate-900">OfficeBill</span>
        </div>

        <div className="w-full max-w-md">{children}</div>

        {/* Developer credit — visible on every screen size */}
        <p className="mt-8 text-center text-xs text-slate-400">
          Designed and Developed by <span className="font-semibold text-slate-600">Auralith Bit and Team</span>
        </p>
      </div>
    </div>
  );
}