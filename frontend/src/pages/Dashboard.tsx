import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAppStore, salesThisMonth, toReceive, toGive, cashBankBalance, cashflowLast7Days, lowStockItems, invoiceBalance } from '../store/AppStore';
import { formatNPRCompact, formatNPR } from '../utils/nepaliDate';
import { StatusBadge } from '../components/ui/Badge';

export default function Dashboard() {
  const { state } = useAppStore();
  const partyName = (id: string) => state.parties.find(p => p.id === id)?.name ?? '—';
  const recent = state.invoices.slice(0, 6);
  const low = lowStockItems(state);

  // ---- 7-day cash flow for the bar chart ----
  const flow = cashflowLast7Days(state);
  const maxFlow = Math.max(1, ...flow.map(d => Math.max(d.moneyIn, d.moneyOut)));
  const weekIn = flow.reduce((a, d) => a + d.moneyIn, 0);
  const weekOut = flow.reduce((a, d) => a + d.moneyOut, 0);
  const barHeight = (v: number) => `${Math.max(2, Math.round((v / maxFlow) * 100))}%`;
  const dayLabel = (formatted: string) => formatted.slice(5).replace('-', '/'); // e.g. 06/07

  const boxes = [
    { label: 'Sales This Month', value: formatNPRCompact(salesThisMonth(state)) },
    { label: 'To Receive', value: formatNPRCompact(toReceive(state)) },
    { label: 'To Pay', value: formatNPRCompact(toGive(state)) },
    { label: 'Cash & Bank', value: formatNPRCompact(cashBankBalance(state)) },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Today's position at a glance.</p>
      </div>

      {/* Stat boxes */}
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {boxes.map(b => (
          <div key={b.label} className="rounded-sm border border-slate-300 bg-white p-4">
            <p className="text-xs text-slate-500">{b.label}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{b.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        {/* ---- Simple 7-day cash flow chart ---- */}
        <div className="rounded-sm border border-slate-300 bg-white p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Cash Flow — Last 7 Days</h2>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-teal-800" /> In</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-red-400" /> Out</span>
            </div>
          </div>

          <div className="flex items-end gap-2 border-b border-slate-300 pb-0 sm:gap-3">
            {flow.map(d => (
              <div key={d.formatted} className="flex-1">
                <div className="flex h-36 items-end justify-center gap-1">
                  <div
                    className="w-2.5 bg-teal-800 sm:w-3"
                    style={{ height: barHeight(d.moneyIn) }}
                    title={`Money in ${formatNPR(d.moneyIn)}`}
                  />
                  <div
                    className="w-2.5 bg-red-400 sm:w-3"
                    style={{ height: barHeight(d.moneyOut) }}
                    title={`Money out ${formatNPR(d.moneyOut)}`}
                  />
                </div>
                <p className="mt-1 text-center text-[10px] text-slate-500">{dayLabel(d.formatted)}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-between text-xs text-slate-600">
            <span>In: <b className="text-slate-900">{formatNPRCompact(weekIn)}</b></span>
            <span>Out: <b className="text-slate-900">{formatNPRCompact(weekOut)}</b></span>
            <span>Net: <b className={weekIn - weekOut >= 0 ? 'text-slate-900' : 'text-red-600'}>{formatNPRCompact(weekIn - weekOut)}</b></span>
          </div>
        </div>

        {/* ---- Recent invoices ---- */}
        <div className="rounded-sm border border-slate-300 bg-white lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Recent Invoices</h2>
            <Link to="/sales/invoices" className="text-xs text-teal-800 underline">View all</Link>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">No.</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell">Party</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map(inv => (
                <tr key={inv.id}>
                  <td className="px-4 py-2 font-mono text-teal-800">{inv.number}</td>
                  <td className="px-4 py-2 text-slate-600">{inv.dateBS}</td>
                  <td className="hidden px-4 py-2 text-slate-800 sm:table-cell">{partyName(inv.partyId)}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900">{formatNPRCompact(inv.total)}</td>
                  <td className="px-4 py-2"><StatusBadge status={inv.status === 'DRAFT' ? 'DRAFT' : invoiceBalance(state, inv) <= 0 ? 'PAID' : inv.status} /></td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No invoices yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Low stock alerts ---- */}
      <div className="mt-3 rounded-sm border border-slate-300 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock Alerts
            {low.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">{low.length}</span>
            )}
          </h2>
          <Link to="/inventory" className="text-xs text-teal-800 underline">Manage inventory</Link>
        </div>

        {low.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">All stock levels are healthy ✅</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 text-right font-medium">Current Stock</th>
                <th className="px-4 py-2 text-right font-medium">Reorder At</th>
                <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Unit Price</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {low.map(i => (
                <tr key={i.id}>
                  <td className="px-4 py-2 font-medium text-slate-800">{i.name}</td>
                  <td className="px-4 py-2 text-right font-bold text-red-600">{i.stock} {i.unit}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{i.reorderLevel}</td>
                  <td className="hidden px-4 py-2 text-right text-slate-600 sm:table-cell">{formatNPRCompact(i.price)}</td>
                  <td className="px-4 py-2">
                    {i.stock === 0 ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">Out of stock</span>
                    ) : (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Reorder soon</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}