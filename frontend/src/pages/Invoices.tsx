import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Search, Eye, Printer, AlertCircle, TrendingUp, Landmark,
  Calendar, ChevronDown, X,
} from 'lucide-react';
import { useAppStore, toReceive } from '../store/AppStore';
import { formatNPRCompact, todayBS } from '../utils/nepaliDate';
import { StatusBadge } from '../components/ui/Badge';

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

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

const dateFilterLabel = (mode: DateFilter, from: string, to: string): string => {
  switch (mode) {
    case 'all': return 'Date';
    case 'today': return 'Today';
    case 'week': return 'This Week';
    case 'month': return 'This Month';
    case 'year': return 'This Year';
    case 'custom': return `${from || '—'} → ${to || '—'}`;
  }
};

export default function Invoices() {
  const { state } = useAppStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');

  const today = todayBS();
  const monthKey = today.formatted.slice(0, 7);
  const yearKey = String(today.year);

  // ---------- Date filter state ----------
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customFrom, setCustomFrom] = useState<string>(today.formatted);
  const [customTo, setCustomTo] = useState<string>(today.formatted);
  const [openFilter, setOpenFilter] = useState(false);
  // Fixed-position anchor so no card/overflow can clip the panel
  const [filterPos, setFilterPos] = useState<{ top: number; right: number } | null>(null);

  const toggleFilter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (openFilter) { setOpenFilter(false); setFilterPos(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setFilterPos({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) });
    setOpenFilter(true);
  };

  // Close filter dropdown when clicking outside
  useEffect(() => {
    if (!openFilter) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-filter-panel]') && !target.closest('[data-filter-trigger]')) {
        setOpenFilter(false);
        setFilterPos(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [openFilter]);

  const partyName = (id: string) => state.parties.find(p => p.id === id)?.name ?? '—';
  const partyPan = (id: string) => state.parties.find(p => p.id === id)?.panVat ?? '—';

  // BS dates are zero-padded strings, so lexicographic comparison is a valid range check.
  const dateRange = ((): [string, string] | null => {
    switch (dateFilter) {
      case 'all': return null;
      case 'today': return [today.formatted, today.formatted];
      case 'week': return [bsDaysAgo(7), today.formatted];
      case 'month': return [`${monthKey}-01`, `${monthKey}-99`];
      case 'year': return [`${yearKey}-01-01`, `${yearKey}-12-99`];
      case 'custom': return [customFrom, customTo];
    }
  })();

  const filteredInvoices = state.invoices.filter((inv) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q ||
                          inv.number.toLowerCase().includes(q) ||
                          partyName(inv.partyId).toLowerCase().includes(q) ||
                          inv.dateBS.includes(q);
    const matchesStatus = filterStatus === 'ALL' || inv.status === filterStatus;
    const matchesDate = !dateRange || (inv.dateBS >= dateRange[0] && inv.dateBS <= dateRange[1]);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalSales = state.invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalVat = state.invoices.reduce((sum, inv) => sum + inv.vat, 0);
  const outstanding = toReceive(state);

  const goView = (id: string) => navigate(`/sales/invoices/${id}`);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
            <FileText className="h-6 w-6 text-teal-800" /> Sales Invoices
          </h1>
          <p className="mt-1 text-sm text-slate-500">Manage and track all your billing documents.</p>
        </div>
        <Link to="/sales/invoices/new" className="btn-primary">
          <Plus className="h-4 w-4" /> New Invoice
        </Link>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-4 p-4 sm:p-5">
          <div className="rounded-lg bg-teal-50 p-3 text-teal-800"><TrendingUp className="h-6 w-6" /></div>
          <div>
            <p className="text-xs text-slate-500 sm:text-sm">Total Sales</p>
            <p className="text-lg font-bold text-slate-900 sm:text-xl">{formatNPRCompact(totalSales)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4 sm:p-5">
          <div className="rounded-lg bg-amber-50 p-3 text-amber-600"><Landmark className="h-6 w-6" /></div>
          <div>
            <p className="text-xs text-slate-500 sm:text-sm">VAT Collected</p>
            <p className="text-lg font-bold text-slate-900 sm:text-xl">{formatNPRCompact(totalVat)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4 sm:p-5">
          <div className="rounded-lg bg-red-50 p-3 text-red-600"><AlertCircle className="h-6 w-6" /></div>
          <div>
            <p className="text-xs text-slate-500 sm:text-sm">Outstanding</p>
            <p className="text-lg font-bold text-slate-900 sm:text-xl">{formatNPRCompact(outstanding)}</p>
          </div>
        </div>
      </div>

      {/* Search & filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by invoice no., party name or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex overflow-x-auto rounded-lg bg-slate-100 p-1">
          {(['ALL', 'PAID', 'UNPAID'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none sm:text-sm ${
                filterStatus === status ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <button
          data-filter-trigger
          onClick={toggleFilter}
          className={`btn-outline justify-center gap-2 whitespace-nowrap text-sm ${
            dateFilter !== 'all' ? '!border-teal-600 !text-teal-800' : ''
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span className="max-w-[10rem] truncate">{dateFilterLabel(dateFilter, customFrom, customTo)}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${openFilter ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Date filter dropdown (fixed-position, never clipped) */}
      {openFilter && (
        <div
          data-filter-panel
          style={{ position: 'fixed', top: filterPos?.top ?? 0, right: filterPos?.right ?? 8 }}
          className="z-50 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter by date</p>
              <button className="btn-ghost" onClick={() => { setOpenFilter(false); setFilterPos(null); }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1 p-2">
              {([
                { key: 'all', label: 'All Dates' },
                { key: 'today', label: 'Today' },
                { key: 'week', label: 'Week' },
                { key: 'month', label: 'Month' },
                { key: 'year', label: 'Year' },
                { key: 'custom', label: 'Custom Date' },
              ] as const).map(opt => {
                const active = dateFilter === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setDateFilter(opt.key)}
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
            {dateFilter === 'custom' && (
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
              Showing: <b className="text-slate-700">{dateFilterLabel(dateFilter, customFrom, customTo)}</b>
            </div>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="card hidden md:block">
        <table className="w-full text-left">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th rounded-tl-xl">Invoice No.</th>
              <th className="th">Date (BS)</th>
              <th className="th">Party</th>
              <th className="th">Amount</th>
              <th className="th">Status</th>
              <th className="th rounded-tr-xl text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((inv) => (
                <tr key={inv.id} className="transition-colors hover:bg-slate-50">
                  <td className="td font-mono font-medium text-teal-800">{inv.number}</td>
                  <td className="td">{inv.dateBS}</td>
                  <td className="td">
                    <div className="font-medium text-slate-900">{partyName(inv.partyId)}</div>
                    <div className="font-mono text-xs text-slate-500">PAN: {partyPan(inv.partyId)}</div>
                  </td>
                  <td className="td">
                    <div className="font-bold text-slate-900">{formatNPRCompact(inv.total)}</div>
                    <div className="text-xs text-slate-500">VAT: {formatNPRCompact(inv.vat)}</div>
                  </td>
                  <td className="td"><StatusBadge status={inv.status} /></td>
                  <td className="td text-right">
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost" title="View" onClick={() => goView(inv.id)}>
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="btn-ghost" title="Print / PDF" onClick={() => goView(inv.id)}>
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="td py-12 text-center text-slate-500">No invoices found matching your criteria.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-4 md:hidden">
        {filteredInvoices.length > 0 ? (
          filteredInvoices.map((inv) => (
            <div key={inv.id} className="card p-4">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-mono text-sm font-semibold text-teal-800">{inv.number}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{inv.dateBS} BS</p>
                </div>
                <StatusBadge status={inv.status} />
              </div>
              <div className="mb-3">
                <p className="text-sm font-medium text-slate-900">{partyName(inv.partyId)}</p>
                <p className="font-mono text-xs text-slate-500">PAN: {partyPan(inv.partyId)}</p>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div>
                  <p className="text-xs text-slate-500">Total (incl. VAT)</p>
                  <p className="text-lg font-bold text-slate-900">{formatNPRCompact(inv.total)}</p>
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost" title="View" onClick={() => goView(inv.id)}><Eye className="h-4 w-4" /></button>
                  <button className="btn-ghost" title="Print / PDF" onClick={() => goView(inv.id)}><Printer className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card p-8 text-center text-sm text-slate-500">No invoices found.</div>
        )}
      </div>
    </div>
  );
}