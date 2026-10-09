import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import { formatNPR, fiscalYearBS } from '../utils/nepaliDate';
import { amountInWords } from '../utils/words';

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useAppStore();
  const inv = state.invoices.find(v => v.id === id);

  if (!inv) {
    return (
      <div className="p-10 text-center text-sm text-slate-500">
        Invoice not found.{' '}
        <button className="text-teal-800 underline" onClick={() => navigate('/sales/invoices')}>Back to list</button>
      </div>
    );
  }

  const party = state.parties.find(p => p.id === inv.partyId);
  const b = state.business;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Toolbar (hidden when printing) */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <button className="btn-outline" onClick={() => navigate('/sales/invoices')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button className="btn-primary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      {/* ---------- The invoice document ---------- */}
      <div className="card p-6 text-sm text-slate-800 sm:p-8 print:rounded-none print:border-none print:shadow-none print:bg-white" id="invoice-doc">
        {/* 1) Header: identity left, registration right */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-teal-800 text-lg font-bold text-teal-900">
              {b.name.charAt(0)}
            </span>
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wide text-slate-900">{b.name}</h1>
              <p className="text-slate-600">{b.address}</p>
              <p className="text-slate-600">Phone: {b.phone}{b.email ? ` · ${b.email}` : ''}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">{b.registrationType === 'VAT' ? 'VAT No.' : 'PAN No.'}</p>
            <p className="font-mono text-base font-bold text-slate-900">{b.panVat}</p>
          </div>
        </div>

        {/* 2) Title + document meta */}
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-300 py-3">
          <h2 className="text-base font-bold uppercase tracking-[0.2em] text-slate-900">
            {b.registrationType === 'VAT' ? 'Tax Invoice' : 'Invoice'}
          </h2>
          <div className="text-right text-xs text-slate-600">
            <p>No. <span className="font-mono font-bold text-slate-900">{inv.number}</span></p>
            <p>Date: <span className="font-medium text-slate-900">{inv.dateBS} BS</span></p>
            <p>Fiscal Year: {fiscalYearBS()}</p>
          </div>
        </div>

        {/* 3) Bill-to */}
        <div className="border-b border-slate-200 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Billed To</p>
          <p className="mt-1 font-semibold text-slate-900">{party?.name ?? '—'}</p>
          <p className="text-slate-600">{party?.address}</p>
          <p className="text-slate-600">PAN/VAT: <span className="font-mono">{party?.panVat}</span></p>
        </div>

        {/* 4) Items table */}
        <div className="overflow-x-auto">
        <table className="mt-2 w-full min-w-max border-collapse text-left print-avoid">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-1.5 text-xs font-semibold">SN</th>
              <th className="border border-slate-300 px-2 py-1.5 text-xs font-semibold">Particulars</th>
              <th className="border border-slate-300 px-2 py-1.5 text-right text-xs font-semibold">Qty</th>
              <th className="border border-slate-300 px-2 py-1.5 text-right text-xs font-semibold">Rate</th>
              <th className="border border-slate-300 px-2 py-1.5 text-right text-xs font-semibold">Disc.</th>
              <th className="border border-slate-300 px-2 py-1.5 text-right text-xs font-semibold">VAT</th>
              <th className="border border-slate-300 px-2 py-1.5 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i}>
                <td className="border border-slate-300 px-2 py-1.5">{i + 1}</td>
                <td className="border border-slate-300 px-2 py-1.5">{l.name}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{l.qty}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{formatNPR(l.rate)}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{l.discount ? formatNPR(l.discount) : '—'}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">
                  {l.taxRate ? formatNPR(((l.qty * l.rate) - l.discount) * l.taxRate / 100) : '—'}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-right font-medium">
                  {formatNPR((l.qty * l.rate - l.discount) * (1 + l.taxRate / 100))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* 5) Totals + amount in words */}
        <div className="mt-4 flex justify-end print-avoid">
          <div className="w-full space-y-1 sm:w-72">
            <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span>{formatNPR(inv.subtotal)}</span></div>
            <div className="flex justify-between text-slate-600"><span>VAT:</span><span>{formatNPR(inv.vat)}</span></div>
            <div className="flex justify-between border-t border-slate-300 pt-1 text-base font-bold text-slate-900">
              <span>Grand Total:</span><span>{formatNPR(inv.total)}</span>
            </div>
          </div>
        </div>
        <p className="mt-3 rounded bg-slate-50 px-3 py-2 text-xs italic text-slate-600 print-avoid">
          In Words: {amountInWords(inv.total)}
        </p>

        {/* 6+7) FOOTER BLOCK — terms left, signature right, bottoms aligned */}
        <div className="print-footer print-avoid mt-8">
          <div className="flex items-end justify-between gap-6">
            <div className="max-w-[55%] text-xs text-slate-500">
              <p className="font-semibold text-slate-600">Terms & Notes:</p>
              <p className="mt-1">{b.footerNote}</p>
            </div>
            <div className="w-44 shrink-0 text-center">
              <div className="h-12" />
              <div className="border-t border-slate-400 pt-1 text-xs text-slate-600">Authorized Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}