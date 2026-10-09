import { Fragment, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Plus, Minus, Search } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAppStore, invoiceBalance } from '../store/AppStore';
import type { Invoice } from '../store/AppStore';
import { formatNPR } from '../utils/nepaliDate';

interface ReduceModalState {
  partyId: string;
  amount: string;
  method: 'CASH' | 'DIGITAL';
  partyLocked: boolean;
}

export default function Dues() {
  const { state, actions } = useAppStore();
  const [search, setSearch] = useState('');
  const [expandedParty, setExpandedParty] = useState<string | null>(null);
  const [payModal, setPayModal] = useState<{ invoice: Invoice; amount: string } | null>(null);
  const [reduceModal, setReduceModal] = useState<ReduceModalState | null>(null);

  const partyName = (id: string) => state.parties.find(p => p.id === id)?.name ?? '—';
  const partyPhone = (id: string) => state.parties.find(p => p.id === id)?.phone ?? '—';

  // ---- Dues = unpaid invoice balances ONLY (no manual ledger, no double counting) ----
  const invoiceDueOf = (pid: string) =>
    state.invoices.reduce((a, inv) => (inv.partyId === pid ? a + invoiceBalance(state, inv) : a), 0);

  const parties = Array.from(new Set(
    state.invoices.filter(inv => invoiceBalance(state, inv) > 0).map(inv => inv.partyId)
  ))
    .map(id => ({
      id,
      name: partyName(id),
      phone: partyPhone(id),
      total: invoiceDueOf(id),
      invCount: state.invoices.filter(inv => inv.partyId === id && invoiceBalance(state, inv) > 0).length,
    }))
    .filter(p => p.total > 0)
    .sort((a, b) => b.total - a.total);

  // ---- Search filter (by name or phone) ----
  const term = search.trim().toLowerCase();
  const filtered = term
    ? parties.filter(p => p.name.toLowerCase().includes(term) || p.phone.toLowerCase().includes(term))
    : parties;

  const totalOutstanding = parties.reduce((s, p) => s + p.total, 0);

  const openReduce = (partyId?: string) =>
    setReduceModal({
      partyId: partyId ?? parties[0]?.id ?? '',
      amount: '',
      method: 'CASH',
      partyLocked: !!partyId,
    });

  // ---- Reduce = record payment against oldest open invoices ----
  const saveReduce = () => {
    if (!reduceModal) return;
    const amt = Number(reduceModal.amount);
    if (!reduceModal.partyId) { alert('Select a customer.'); return; }
    if (!amt || amt <= 0) { alert('Enter an amount greater than zero.'); return; }
    const due = invoiceDueOf(reduceModal.partyId);
    if (amt > due) { alert(`Amount exceeds the outstanding due of ${formatNPR(due)}.`); return; }

    let remaining = amt;
    const paidInvoices: string[] = [];
    const openInvoices = state.invoices
      .filter(inv => inv.partyId === reduceModal.partyId && invoiceBalance(state, inv) > 0)
      .sort((a, b) => a.dateBS.localeCompare(b.dateBS) || a.number.localeCompare(b.number));

    for (const inv of openInvoices) {
      if (remaining <= 0) break;
      const bal = invoiceBalance(state, inv);
      const pay = Math.min(remaining, bal);
      actions.recordPaymentIn(inv.id, pay, reduceModal.method); // Payment In record + status → PAID
      remaining -= pay;
      paidInvoices.push(`${inv.number} → ${formatNPR(pay)}`);
    }

    alert(`Payment recorded in Payment In:\n• ${paidInvoices.join('\n• ')}`);
    setReduceModal(null);
  };

  const handleRecordPayment = () => {
    if (!payModal) return;
    const amt = Number(payModal.amount);
    const bal = invoiceBalance(state, payModal.invoice);
    if (!amt || amt <= 0) { alert('Enter a valid amount.'); return; }
    if (amt > bal) { alert(`Amount exceeds balance of ${formatNPR(bal)}.`); return; }
    actions.recordPaymentIn(payModal.invoice.id, amt, 'CASH');
    alert(`Payment of ${formatNPR(amt)} recorded against ${payModal.invoice.number}.`);
    setPayModal(null);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dues"
        subtitle="Customers with unpaid invoices — collect and clear."
        icon={AlertCircle}
        actions={
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-500">Total Outstanding</p>
              <p className="text-lg font-bold text-red-600">{formatNPR(totalOutstanding)}</p>
            </div>
            <button className="btn-primary" onClick={() => openReduce()}><Minus className="h-4 w-4" /> Reduce Due</button>
          </div>
        }
      />

      {/* ---- Search bar ---- */}
      {parties.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by customer name or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-500">
            {filtered.length} of {parties.length} customer{parties.length === 1 ? '' : 's'} shown
          </p>
        </div>
      )}

      {parties.length === 0 ? (
        <SectionCard>
          <p className="py-12 text-center text-sm text-slate-500">
            No outstanding dues. All customers are paid up to date. ✓
          </p>
        </SectionCard>
      ) : filtered.length === 0 ? (
        <SectionCard>
          <p className="py-12 text-center text-sm text-slate-500">
            No customers match “<b className="text-slate-700">{search}</b>”.
          </p>
        </SectionCard>
      ) : (
        <SectionCard bodyClassName="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 text-center font-medium">Invoices</th>
                <th className="px-4 py-2 text-right font-medium">Total Due</th>
                <th className="w-10 px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => {
                const open = expandedParty === p.id;
                const invs = state.invoices.filter(inv => inv.partyId === p.id && invoiceBalance(state, inv) > 0);
                return (
                  <Fragment key={p.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-center"><Badge tone="slate">{p.invCount}</Badge></td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">{formatNPR(p.total)}</td>
                      <td className="px-4 py-3">
                        <button className="btn-ghost" onClick={() => setExpandedParty(open ? null : p.id)}>
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={4} className="bg-slate-50 px-4 py-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-slate-500">
                                <th className="pb-2 text-left font-medium">Invoice No.</th>
                                <th className="pb-2 text-left font-medium">Date</th>
                                <th className="pb-2 text-right font-medium">Total</th>
                                <th className="pb-2 text-right font-medium">Balance</th>
                                <th className="pb-2 text-right font-medium"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {invs.map(inv => {
                                const bal = invoiceBalance(state, inv);
                                return (
                                  <tr key={inv.id}>
                                    <td className="py-2 font-mono text-teal-800">{inv.number}</td>
                                    <td className="py-2 text-slate-600">{inv.dateBS}</td>
                                    <td className="py-2 text-right text-slate-600">{formatNPR(inv.total)}</td>
                                    <td className="py-2 text-right font-semibold text-red-600">{formatNPR(bal)}</td>
                                    <td className="py-2 text-right">
                                      <button className="btn-ghost hover:!text-teal-800" title="Record payment"
                                        onClick={() => setPayModal({ invoice: inv, amount: String(bal) })}>
                                        <Plus className="h-4 w-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </SectionCard>
      )}

      {/* ---------- Reduce due (record payment) modal ---------- */}
      <Modal
        open={!!reduceModal}
        onClose={() => setReduceModal(null)}
        title="Reduce Due — Record Payment"
        footer={<>
          <button className="btn-outline flex-1" onClick={() => setReduceModal(null)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={saveReduce}>Record Payment</button>
        </>}
      >
        {reduceModal && (
          <div className="space-y-4">
            <div>
              <label className="label">Customer *</label>
              <select
                className="input"
                value={reduceModal.partyId}
                disabled={reduceModal.partyLocked}
                onChange={e => setReduceModal({ ...reduceModal, partyId: e.target.value })}
              >
                {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount Received (Rs.) *</label>
              <input type="number" min={0} className="input" value={reduceModal.amount}
                onChange={e => setReduceModal({ ...reduceModal, amount: e.target.value })} />
              <p className="mt-1.5 text-xs text-slate-500">
                Applied to the oldest open invoices first. Outstanding due:{' '}
                <b className="text-slate-800">{formatNPR(invoiceDueOf(reduceModal.partyId))}</b>
              </p>
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select
                className="input"
                value={reduceModal.method}
                onChange={e => setReduceModal({ ...reduceModal, method: e.target.value as 'CASH' | 'DIGITAL' })}
              >
                <option value="CASH">Cash</option>
                <option value="DIGITAL">QR / Digital</option>
              </select>
            </div>
          </div>
        )}
      </Modal>

      {/* ---------- Single-invoice payment modal ---------- */}
      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title={`Record Payment — ${payModal?.invoice.number ?? ''}`}
        footer={<>
          <button className="btn-outline flex-1" onClick={() => setPayModal(null)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={handleRecordPayment}>Record Payment</button>
        </>}
      >
        {payModal && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500">Customer</p>
              <p className="font-semibold text-slate-900">{partyName(payModal.invoice.partyId)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500">Invoice Total</p>
                <p className="font-medium text-slate-700">{formatNPR(payModal.invoice.total)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Outstanding Balance</p>
                <p className="font-bold text-red-600">{formatNPR(invoiceBalance(state, payModal.invoice))}</p>
              </div>
            </div>
            <div>
              <label className="label">Payment Amount (Rs.) *</label>
              <input type="number" className="input" value={payModal.amount} min={0}
                onChange={e => setPayModal({ ...payModal, amount: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}