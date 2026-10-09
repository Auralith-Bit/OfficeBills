import { useMemo, useState } from 'react';
import { Banknote, CalendarDays, AlertCircle, Plus, Search } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import StatCard from '../components/ui/StatCard';
import DataTable, { type Column } from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAppStore, toReceive, invoiceBalance } from '../store/AppStore';
import type { Payment } from '../store/AppStore';
import { todayBS, formatNPRCompact } from '../utils/nepaliDate';

const methodTone = { CASH: 'green', BANK: 'blue', DIGITAL: 'purple' } as const;

export default function PaymentIn() {
  const { state, actions } = useAppStore();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<Payment['method']>('CASH');

  const partyName = (id: string) => state.parties.find(p => p.id === id)?.name ?? '—';
  const invoiceNo = (id?: string) => state.invoices.find(v => v.id === id)?.number ?? '—';

  const receipts = useMemo(() => state.payments.filter(p => {
    if (p.type !== 'IN') return false;
    const term = search.toLowerCase();
    return !term || partyName(p.partyId).toLowerCase().includes(term) || invoiceNo(p.invoiceId).toLowerCase().includes(term);
  }), [state.payments, state.parties, state.invoices, search]);

  const today = todayBS().formatted;
  const monthKey = today.slice(0, 7);
  const receivedToday = state.payments.filter(p => p.type === 'IN' && p.dateBS === today).reduce((a, p) => a + p.amount, 0);
  const receivedMonth = state.payments.filter(p => p.type === 'IN' && p.dateBS.startsWith(monthKey)).reduce((a, p) => a + p.amount, 0);

  const unpaid = state.invoices.filter(v => v.status !== 'DRAFT' && invoiceBalance(state, v) > 0);

  const columns: Column<Payment>[] = [
    { key: 'date', header: 'Date (BS)', render: p => p.dateBS },
    {
      key: 'party', header: 'Received From', mobilePrimary: true,
      render: p => <span className="font-medium text-slate-900">{partyName(p.partyId)}</span>,
    },
    { key: 'inv', header: 'Invoice', render: p => <span className="font-mono text-teal-800">{invoiceNo(p.invoiceId)}</span> },
    { key: 'method', header: 'Method', hideOnMobile: true, render: p => <Badge tone={methodTone[p.method]}>{p.method}</Badge> },
    { key: 'amount', header: 'Amount', align: 'right', render: p => <span className="font-semibold text-slate-900">{formatNPRCompact(p.amount)}</span> },
  ];

  const openModal = () => {
    setInvoiceId(unpaid[0]?.id ?? '');
    setAmount(unpaid[0] ? String(invoiceBalance(state, unpaid[0])) : '');
    setMethod('CASH');
    setOpen(true);
  };

  const save = () => {
    const bal = invoiceBalance(state, state.invoices.find(v => v.id === invoiceId)!);
    const amt = Number(amount);
    if (!invoiceId || !amt || amt <= 0) { alert('Enter a valid amount.'); return; }
    if (amt > bal) { alert(`Amount exceeds the outstanding balance (Rs. ${bal}).`); return; }
    actions.recordPaymentIn(invoiceId, amt, method);
    setOpen(false);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Payment In" subtitle="Money received from customers against invoices." icon={Banknote}
        actions={<button className="btn-primary" onClick={openModal} disabled={unpaid.length === 0}><Plus className="h-4 w-4" /> Record Payment</button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Received Today" value={formatNPRCompact(receivedToday)} icon={Banknote} tone="green" />
        <StatCard label="Received This Month" value={formatNPRCompact(receivedMonth)} icon={CalendarDays} tone="blue" />
        <StatCard label="Still Outstanding" value={formatNPRCompact(toReceive(state))} icon={AlertCircle} tone="red" />
      </div>

      <SectionCard bodyClassName="p-0">
        <div className="border-b border-slate-100 p-4">
          <div className="relative sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search party or invoice no…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <DataTable columns={columns} rows={receipts} rowKey={p => p.id} />
      </SectionCard>

      <Modal open={open} onClose={() => setOpen(false)} title="Record Payment In"
        footer={<>
          <button className="btn-outline flex-1" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={save}>Save Receipt</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="label">Unpaid Invoice *</label>
            <select
              className="input"
              value={invoiceId}
              onChange={e => {
                setInvoiceId(e.target.value);
                const inv = state.invoices.find(v => v.id === e.target.value);
                if (inv) setAmount(String(invoiceBalance(state, inv)));
              }}
            >
              {unpaid.map(v => (
                <option key={v.id} value={v.id}>
                  {v.number} — {partyName(v.partyId)} (bal. Rs. {invoiceBalance(state, v)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Amount (Rs.) *</label>
            <input type="number" min={0} className="input" value={amount} onChange={e => setAmount(e.target.value)} />
            <p className="mt-1 text-xs text-slate-500">Partial payments are allowed; the invoice stays Unpaid until fully settled.</p>
          </div>
          <div>
            <label className="label">Method *</label>
            <select className="input" value={method} onChange={e => setMethod(e.target.value as Payment['method'])}>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank Transfer</option>
              <option value="DIGITAL">Digital Wallet</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}