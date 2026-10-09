import { useState, useMemo, useEffect } from 'react';
import { BarChart3, Download, Search, Calendar, Filter, X } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import { useAppStore } from '../store/AppStore';
import { todayBS, formatNPR } from '../utils/nepaliDate';

// Oldest date first; same date → bill number ascending (0001, 0002, …)
const byDateThenNumber = (a: { dateBS: string; number: string }, b: { dateBS: string; number: string }) =>
  a.dateBS.localeCompare(b.dateBS) ||
  (parseInt(a.number.replace(/\D/g, ''), 10) || 0) - (parseInt(b.number.replace(/\D/g, ''), 10) || 0);

type FilterMode = 'today' | 'week' | 'month' | 'year' | 'custom';

// Approximate BS "N days ago" — handles month/year rollover with 30-day months.
const bsDaysAgo = (n: number): string => {
  const t = todayBS();
  let y = t.year;
  let m = t.month + 1;
  let d = t.day - n;
  while (d <= 0) {
    m -= 1;
    if (m < 1) { m = 12; y -= 1; }
    d += 30;
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const filterLabel = (mode: FilterMode, from?: string, to?: string): string => {
  switch (mode) {
    case 'today': return 'today';
    case 'week': return 'this week';
    case 'month': return 'this month';
    case 'year': return 'this year';
    case 'custom': return `${from ?? '—'} → ${to ?? '—'}`;
  }
};

export default function Reports() {
  const { state } = useAppStore();
  const today = todayBS();
  const monthKey = today.formatted.slice(0, 7);
  const yearKey = String(today.year);

  // ---------- Filter state (shared mode, independent dropdown open state) ----------
  const [filterMode, setFilterMode] = useState<FilterMode>('month');
  const [customFrom, setCustomFrom] = useState<string>(today.formatted);
  const [customTo, setCustomTo] = useState<string>(today.formatted);
  const [openFilter, setOpenFilter] = useState<'sales' | 'purchases' | null>(null);
  // Fixed-position anchor so no card/overflow can clip the panel
  const [filterPos, setFilterPos] = useState<{ top: number; right: number } | null>(null);

  const toggleFilter = (which: 'sales' | 'purchases') => (e: React.MouseEvent<HTMLButtonElement>) => {
    if (openFilter === which) { setOpenFilter(null); setFilterPos(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setFilterPos({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) });
    setOpenFilter(which);
  };

  // Close filter dropdown when clicking outside
  useEffect(() => {
    if (!openFilter) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-filter-panel]') && !target.closest('[data-filter-trigger]')) {
        setOpenFilter(null);
        setFilterPos(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [openFilter]);

  // ---------- Search state (independent per register) ----------
  const [salesSearch, setSalesSearch] = useState('');
  const [purchasesSearch, setPurchasesSearch] = useState('');

  const partyName = (id: string) => state.parties.find(p => p.id === id)?.name ?? '—';

  const allSales = useMemo(
    () => [...state.invoices].sort(byDateThenNumber),
    [state.invoices]
  );
  const allPurchases = useMemo(
    () => [...state.purchases].sort(byDateThenNumber),
    [state.purchases]
  );

  const rangeStart = useMemo(() => {
    switch (filterMode) {
      case 'today': return today.formatted;
      case 'week': return bsDaysAgo(7);
      case 'month': return `${monthKey}-01`;
      case 'year': return `${yearKey}-01-01`;
      case 'custom': return customFrom;
    }
  }, [filterMode, today.formatted, monthKey, yearKey, customFrom]);

  const rangeEnd = useMemo(() => {
    switch (filterMode) {
      case 'today': return today.formatted;
      case 'week': return today.formatted;
      case 'month': return `${monthKey}-99`;
      case 'year': return `${yearKey}-12-99`;
      case 'custom': return customTo;
    }
  }, [filterMode, today.formatted, monthKey, yearKey, customTo]);

  const inRange = (dateBS: string) => dateBS >= rangeStart && dateBS <= rangeEnd;

  const applySearch = <T extends { dateBS: string; number: string; partyId: string }>(
    rows: T[],
    term: string,
  ) => {
    const q = term.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.dateBS.toLowerCase().includes(q) ||
      r.number.toLowerCase().includes(q) ||
      partyName(r.partyId).toLowerCase().includes(q)
    );
  };

  const sales = applySearch(allSales.filter(v => inRange(v.dateBS)), salesSearch);
  const purchases = applySearch(allPurchases.filter(v => inRange(v.dateBS)), purchasesSearch);

  // P&L and VAT summary use "this month" as the canonical period
  const monthSales = allSales.filter(v => v.dateBS.startsWith(monthKey));
  const monthPurchases = allPurchases.filter(v => v.dateBS.startsWith(monthKey));
  const monthExpenses = state.expenses.filter(e => e.dateBS.startsWith(monthKey));

  const outVat = monthSales.reduce((a, v) => a + v.vat, 0);
  const inVat = monthPurchases.reduce((a, v) => a + v.vat, 0);
  const salesTotal = monthSales.reduce((a, v) => a + v.total, 0);
  const purchaseTotal = monthPurchases.reduce((a, v) => a + v.total, 0);
  const expenseTotal = monthExpenses.reduce((a, e) => a + e.amount, 0);
  const net = salesTotal - purchaseTotal - expenseTotal;

  const rangeTag = filterLabel(filterMode, customFrom, customTo).replace(/[\s→]/g, '_');

  const exportCsv = (name: string, rows: (string | number)[][]) => {
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name}-${rangeTag}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ---------- Filter dropdown (fixed-position, never clipped) ----------
  const FilterDropdown = () => (
    <div
      data-filter-panel
      style={{ position: 'fixed', top: filterPos?.top ?? 0, right: filterPos?.right ?? 8 }}
      className="z-50 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter by period</p>
          <button className="btn-ghost" onClick={() => { setOpenFilter(null); setFilterPos(null); }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-1 p-2">
          {([
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'year', label: 'Year' },
            { key: 'custom', label: 'Custom Date' },
          ] as const).map(opt => {
            const active = filterMode === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setFilterMode(opt.key)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? 'bg-teal-50 font-semibold text-teal-800' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Calendar className={`h-4 w-4 ${active ? 'text-teal-700' : 'text-slate-400'}`} />
                {opt.label}
              </button>
            );
          })}
        </div>
        {filterMode === 'custom' && (
          <div className="space-y-2 border-t border-slate-100 p-3">
            <div>
              <label className="text-[11px] font-medium text-slate-500">From (BS)</label>
              <input
                type="date"
                className="input !py-1.5 text-xs"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500">To (BS)</label>
              <input
                type="date"
                className="input !py-1.5 text-xs"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
              />
            </div>
          </div>
        )}
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          Showing: <b className="text-slate-700">{filterLabel(filterMode, customFrom, customTo)}</b>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Reports" subtitle="VAT, profit & loss, and detailed registers with filters." icon={BarChart3} />

      <div className="mb-6">
        <SectionCard>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">VAT Summary (this month)</h2>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              <tr><td className="py-2 text-slate-600">Output VAT (sales)</td><td className="py-2 text-right font-medium text-slate-900">{formatNPR(outVat)}</td></tr>
              <tr><td className="py-2 text-slate-600">Input VAT (purchases)</td><td className="py-2 text-right font-medium text-slate-900">{formatNPR(inVat)}</td></tr>
              <tr><td className="py-2 font-semibold text-slate-800">Net VAT payable</td><td className="py-2 text-right font-bold text-slate-900">{formatNPR(outVat - inVat)}</td></tr>
            </tbody>
          </table>
        </SectionCard>
      </div>

      <div className="mb-6">
        <SectionCard>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Profit & Loss (this month)</h2>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              <tr><td className="py-2 text-slate-600">Sales (incl. VAT)</td><td className="py-2 text-right font-medium text-slate-900">{formatNPR(salesTotal)}</td></tr>
              <tr><td className="py-2 text-slate-600">Purchases (incl. VAT)</td><td className="py-2 text-right font-medium text-slate-900">− {formatNPR(purchaseTotal)}</td></tr>
              <tr><td className="py-2 text-slate-600">Expenses</td><td className="py-2 text-right font-medium text-slate-900">− {formatNPR(expenseTotal)}</td></tr>
              <tr><td className="py-2 font-semibold text-slate-800">Net result</td><td className={`py-2 text-right font-bold ${net >= 0 ? 'text-slate-900' : 'text-red-600'}`}>{formatNPR(net)}</td></tr>
            </tbody>
          </table>
        </SectionCard>
      </div>

      {/* -------- Sales Register -------- */}
      <div className="mb-6">
        <SectionCard bodyClassName="p-0">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Sales Register</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {sales.length} of {allSales.length} invoice{allSales.length === 1 ? '' : 's'} · {filterLabel(filterMode, customFrom, customTo)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                data-filter-trigger
                onClick={toggleFilter('sales')}
                title="Filter by period"
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  openFilter === 'sales' || filterMode !== 'month'
                    ? 'border-teal-700 bg-teal-50 text-teal-800'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Filter className="h-4 w-4" />
              </button>
              <button className="btn-outline" onClick={() => exportCsv('sales-register', [
                ['Date', 'Number', 'Party', 'Subtotal', 'VAT', 'Total'],
                ...sales.map(v => [v.dateBS, v.number, partyName(v.partyId), v.subtotal, v.vat, v.total]),
              ])}><Download className="h-4 w-4" /> CSV</button>
            </div>
          </div>

          <div className="border-b border-slate-100 px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search by invoice no., date, or party name…"
                value={salesSearch}
                onChange={e => setSalesSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Number</th>
                  <th className="px-4 py-2 font-medium">Party</th>
                  <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                  <th className="px-4 py-2 text-right font-medium">VAT</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map(v => (
                  <tr key={v.id}>
                    <td className="px-4 py-2 text-slate-600">{v.dateBS}</td>
                    <td className="px-4 py-2 font-mono text-teal-800">{v.number}</td>
                    <td className="px-4 py-2 text-slate-800">{partyName(v.partyId)}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{formatNPR(v.subtotal)}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{formatNPR(v.vat)}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900">{formatNPR(v.total)}</td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    {salesSearch ? `No invoices match "${salesSearch}" in this period.` : 'No sales in this period.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* -------- Purchase Register -------- */}
      <div>
        <SectionCard bodyClassName="p-0">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Purchase Register</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {purchases.length} of {allPurchases.length} bill{allPurchases.length === 1 ? '' : 's'} · {filterLabel(filterMode, customFrom, customTo)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                data-filter-trigger
                onClick={toggleFilter('purchases')}
                title="Filter by period"
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  openFilter === 'purchases' || filterMode !== 'month'
                    ? 'border-teal-700 bg-teal-50 text-teal-800'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Filter className="h-4 w-4" />
              </button>
              <button className="btn-outline" onClick={() => exportCsv('purchase-register', [
                ['Date', 'Number', 'Supplier', 'Subtotal', 'VAT', 'Total'],
                ...purchases.map(v => [v.dateBS, v.number, partyName(v.partyId), v.subtotal, v.vat, v.total]),
              ])}><Download className="h-4 w-4" /> CSV</button>
            </div>
          </div>

          <div className="border-b border-slate-100 px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search by bill no., date, or supplier name…"
                value={purchasesSearch}
                onChange={e => setPurchasesSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Number</th>
                  <th className="px-4 py-2 font-medium">Supplier</th>
                  <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                  <th className="px-4 py-2 text-right font-medium">VAT</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map(v => (
                  <tr key={v.id}>
                    <td className="px-4 py-2 text-slate-600">{v.dateBS}</td>
                    <td className="px-4 py-2 font-mono text-teal-800">{v.number}</td>
                    <td className="px-4 py-2 text-slate-800">{partyName(v.partyId)}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{formatNPR(v.subtotal)}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{formatNPR(v.vat)}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900">{formatNPR(v.total)}</td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    {purchasesSearch ? `No bills match "${purchasesSearch}" in this period.` : 'No purchases in this period.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* Dropdown rendered once, fixed to whichever trigger opened it */}
      {openFilter && <FilterDropdown />}
    </div>
  );
}