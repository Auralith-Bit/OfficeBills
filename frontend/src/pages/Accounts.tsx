import { useMemo, useState } from 'react';
import { Landmark, Wallet, Banknote, ArrowDown, ArrowUp, Download } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import StatCard from '../components/ui/StatCard';
import DataTable, { type Column } from '../components/ui/DataTable';
import { useAppStore, toReceive, toGive, invoiceBalance, purchaseBalance } from '../store/AppStore';
import { todayBS, formatNPRCompact } from '../utils/nepaliDate';

interface LedgerRow { id: string; date: string; particular: string; debit: number; credit: number; balance: number; }
interface EntryRow { id: string; date: string; particular: string; inn: number; out: number; balance: number; }

const monthIndex = (key: string) => { const [y, m] = key.split('-').map(Number); return y * 12 + m; };
const BUCKETS = ['0–30 days', '31–60 days', '60+ days'];

// Extract numeric part from bill number for secondary sort (e.g., "INV-0045" → 45)
const billNum = (particular: string) => {
  const match = particular.match(/(\d{4,})/);
  return match ? parseInt(match[1], 10) : 0;
};

export default function Accounts() {
  const { state } = useAppStore();
  const [partyId, setPartyId] = useState(state.parties[0]?.id ?? '');
  const [book, setBook] = useState<'cash' | 'bank'>('cash');

  const party = state.parties.find(p => p.id === partyId);
  const invoiceNo = (id?: string) => state.invoices.find(v => v.id === id)?.number ?? '';
  const purchaseNo = (id?: string) => state.purchases.find(v => v.id === id)?.number ?? '';

  // ---------- CSV export helper ----------
  const exportCsv = (filename: string, rows: (string | number)[][]) => {
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ---------- Cash & Bank books ----------
  const { cashEntries, bankEntries } = useMemo(() => {
    const raw = {
      cash: [
        ...state.payments.filter(p => p.method === 'CASH').map(p => ({
          date: p.dateBS,
          particular: p.type === 'IN' ? `Receipt — ${invoiceNo(p.invoiceId) || p.note || 'Cash in'}` : `Payment — ${purchaseNo(p.purchaseId) || p.note || 'Cash out'}`,
          inn: p.type === 'IN' ? p.amount : 0,
          out: p.type === 'OUT' ? p.amount : 0,
        })),
        ...state.expenses.map(e => ({ date: e.dateBS, particular: `Expense — ${e.category}${e.note ? ` (${e.note})` : ''}`, inn: 0, out: e.amount })),
      ],
      bank: [
        ...state.payments.filter(p => p.method !== 'CASH').map(p => ({
          date: p.dateBS,
          particular: p.type === 'IN' ? `Receipt (${p.method}) — ${invoiceNo(p.invoiceId) || p.note || ''}` : `Payment (${p.method}) — ${purchaseNo(p.purchaseId) || p.note || ''}`,
          inn: p.type === 'IN' ? p.amount : 0,
          out: p.type === 'OUT' ? p.amount : 0,
        })),
      ],
    };
    const withBalance = (list: { date: string; particular: string; inn: number; out: number }[]): EntryRow[] => {
      let bal = 0;
      return [...list]
        .sort((a, b) => a.date.localeCompare(b.date) || billNum(a.particular) - billNum(b.particular))
        .map((e, i) => {
          bal += e.inn - e.out;
          return { id: `e${i}`, ...e, balance: bal };
        });
    };
    return { cashEntries: withBalance(raw.cash), bankEntries: withBalance(raw.bank) };
  }, [state.payments, state.expenses, state.invoices, state.purchases]);

  const cashInHand = cashEntries.length ? cashEntries[cashEntries.length - 1].balance : 0;
  const bankBalance = bankEntries.length ? bankEntries[bankEntries.length - 1].balance : 0;

  // ---------- Party ledger statement ----------
  const ledgerRows: LedgerRow[] = useMemo(() => {
    if (!party) return [];
    const events: { date: string; particular: string; debit: number; credit: number }[] = [];
    if (party.type === 'CUSTOMER') {
      state.invoices.filter(v => v.partyId === partyId).forEach(v => events.push({ date: v.dateBS, particular: `Invoice ${v.number}`, debit: v.total, credit: 0 }));
      state.payments.filter(p => p.partyId === partyId && p.type === 'IN').forEach(p => events.push({ date: p.dateBS, particular: `Payment received (${p.method}) ${invoiceNo(p.invoiceId) ? '— ' + invoiceNo(p.invoiceId) : ''}`, debit: 0, credit: p.amount }));
      state.salesReturns.filter(r => r.partyId === partyId).forEach(r => events.push({ date: r.dateBS, particular: `Sales return ${r.number} (credit)`, debit: 0, credit: r.total }));
    } else {
      state.purchases.filter(v => v.partyId === partyId).forEach(v => events.push({ date: v.dateBS, particular: `Purchase bill ${v.number}`, debit: 0, credit: v.total }));
      state.payments.filter(p => p.partyId === partyId && p.type === 'OUT').forEach(p => events.push({
        date: p.dateBS,
        particular: p.purchaseId
          ? `Payment made (${p.method}) ${purchaseNo(p.purchaseId) ? '— ' + purchaseNo(p.purchaseId) : ''}`
          : `Advance payment (${p.method}) — not applied to any bill`,
        debit: p.purchaseId ? p.amount : 0,
        credit: 0,
      }));
      state.purchaseReturns.filter(r => r.partyId === partyId).forEach(r => events.push({ date: r.dateBS, particular: `Purchase return ${r.number} (credit)`, debit: r.total, credit: 0 }));
    }
    let bal = 0;
    return [...events]
      .sort((a, b) => a.date.localeCompare(b.date) || billNum(a.particular) - billNum(b.particular))
      .map((e, i) => {
        bal += e.debit - e.credit;
        return { id: `l${i}`, ...e, balance: bal };
      });
  }, [partyId, party, state.invoices, state.purchases, state.payments, state.salesReturns, state.purchaseReturns]);

  const closingBalance = ledgerRows.length ? ledgerRows[ledgerRows.length - 1].balance : 0;

  // ---------- Aging ----------
  const curIdx = monthIndex(todayBS().formatted.slice(0, 7));
  const bucketOf = (dateBS: string) => {
    const diff = curIdx - monthIndex(dateBS.slice(0, 7));
    return diff <= 0 ? 0 : diff === 1 ? 1 : 2;
  };
  const receivableAging = [0, 0, 0];
  state.invoices.forEach(v => { const b = invoiceBalance(state, v); if (b > 0) receivableAging[bucketOf(v.dateBS)] += b; });
  const payableAging = [0, 0, 0];
  state.purchases.forEach(v => { const b = purchaseBalance(state, v); if (b > 0) payableAging[bucketOf(v.dateBS)] += b; });

  // ---------- Export party ledger to CSV ----------
  const exportPartyLedger = () => {
    if (!party || ledgerRows.length === 0) {
      alert('No ledger entries to export.');
      return;
    }
    const rows = [
      ['Date (BS)', 'Particulars', 'Debit', 'Credit', 'Balance'],
      ...ledgerRows.map(r => [
        r.date,
        r.particular,
        r.debit || '',
        r.credit || '',
        `${Math.abs(r.balance)}${r.balance < 0 ? ' Cr' : ''}`,
      ]),
      [],
      ['', 'Closing Balance', '', '', closingBalance < 0 ? `${Math.abs(closingBalance)} Cr` : closingBalance],
    ];
    const partySlug = party.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    exportCsv(`ledger-${partySlug}-${todayBS().formatted}`, rows);
  };

  // ---------- Tables ----------
  const ledgerCols: Column<LedgerRow>[] = [
    { key: 'date', header: 'Date (BS)', render: r => r.date },
    { key: 'particular', header: 'Particulars', mobilePrimary: true, render: r => <span className="text-slate-700">{r.particular}</span> },
    { key: 'debit', header: 'Debit', align: 'right', render: r => (r.debit ? formatNPRCompact(r.debit) : '—') },
    { key: 'credit', header: 'Credit', align: 'right', render: r => (r.credit ? formatNPRCompact(r.credit) : '—') },
    { key: 'balance', header: 'Balance', align: 'right', render: r => <span className={`font-semibold ${r.balance > 0 ? 'text-slate-900' : 'text-green-600'}`}>{formatNPRCompact(Math.abs(r.balance))}{r.balance < 0 ? ' Cr' : ''}</span> },
  ];

  const entryCols: Column<EntryRow>[] = [
    { key: 'date', header: 'Date (BS)', render: r => r.date },
    { key: 'particular', header: 'Particulars', mobilePrimary: true, render: r => <span className="text-slate-700">{r.particular}</span> },
    { key: 'inn', header: 'In', align: 'right', render: r => (r.inn ? <span className="text-green-600">{formatNPRCompact(r.inn)}</span> : '—') },
    { key: 'out', header: 'Out', align: 'right', render: r => (r.out ? <span className="text-red-500">{formatNPRCompact(r.out)}</span> : '—') },
    { key: 'balance', header: 'Balance', align: 'right', render: r => <span className="font-semibold text-slate-900">{formatNPRCompact(r.balance)}</span> },
  ];

  const entries = book === 'cash' ? cashEntries : bankEntries;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Manage Accounts" subtitle="Cash & bank books & party ledgers and aging, your digital accounts register." icon={Landmark} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cash in Hand" value={formatNPRCompact(cashInHand)} icon={Wallet} tone="green" />
        <StatCard label="Bank & Digital" value={formatNPRCompact(bankBalance)} icon={Banknote} tone="blue" />
        <StatCard label="To Receive" value={formatNPRCompact(toReceive(state))} icon={ArrowDown} tone="green" sub="From customers" />
        <StatCard label="To Give" value={formatNPRCompact(toGive(state))} icon={ArrowUp} tone="red" sub="To suppliers" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Party ledger */}
        <SectionCard
          title="Party Ledger"
          subtitle={party ? `${party.name} — closing ${formatNPRCompact(Math.abs(closingBalance))}${closingBalance < 0 ? ' Cr' : party.type === 'CUSTOMER' ? ' receivable' : ' payable'}` : undefined}
          actions={
            <div className="flex items-center gap-2">
              <button
                className="btn-outline !py-1.5 !px-2.5"
                onClick={exportPartyLedger}
                disabled={ledgerRows.length === 0}
                title="Export ledger to CSV"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
              <select className="input w-44 !py-1.5 text-xs" value={partyId} onChange={e => setPartyId(e.target.value)}>
                {state.parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          }
          bodyClassName="p-0"
        >
          <div className="max-h-96 overflow-y-auto">
            <DataTable columns={ledgerCols} rows={ledgerRows} rowKey={r => r.id} />
          </div>
        </SectionCard>

        {/* Aging */}
        <SectionCard title="Outstanding Aging" subtitle="Approximate buckets by BS month of the document." bodyClassName="p-4 sm:p-5">
          <div className="space-y-5">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><ArrowDown className="h-4 w-4 text-green-600" /> Receivable (customers)</p>
              <div className="space-y-1.5">
                {BUCKETS.map((b, i) => (
                  <div key={b} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-600">{b}</span>
                    <span className={`font-semibold ${receivableAging[i] > 0 ? (i === 2 ? 'text-red-600' : i === 1 ? 'text-amber-600' : 'text-green-600') : 'text-slate-400'}`}>
                      {formatNPRCompact(receivableAging[i])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><ArrowUp className="h-4 w-4 text-red-500" /> Payable (suppliers)</p>
              <div className="space-y-1.5">
                {BUCKETS.map((b, i) => (
                  <div key={b} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-600">{b}</span>
                    <span className={`font-semibold ${payableAging[i] > 0 ? (i === 2 ? 'text-red-600' : i === 1 ? 'text-amber-600' : 'text-slate-700') : 'text-slate-400'}`}>
                      {formatNPRCompact(payableAging[i])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Day books */}
      <SectionCard
        title="Day Books"
        subtitle="Chronological cash and bank movements with running balances."
        actions={
          <div className="flex rounded-lg bg-slate-100 p-1">
            {(['cash', 'bank'] as const).map(b => (
              <button key={b} onClick={() => setBook(b)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${book === b ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                {b === 'cash' ? <Wallet className="h-3.5 w-3.5" /> : <Banknote className="h-3.5 w-3.5" />} {b === 'cash' ? 'Cash Book' : 'Bank Book'}
              </button>
            ))}
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="max-h-96 overflow-y-auto">
          <DataTable columns={entryCols} rows={entries} rowKey={r => r.id} />
        </div>
      </SectionCard>
    </div>
  );
}