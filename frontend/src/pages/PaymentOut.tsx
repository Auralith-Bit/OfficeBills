import { useMemo, useState } from 'react';
import { Banknote, CalendarDays, AlertCircle, Plus, Search, FileText, HandCoins, Link2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import StatCard from '../components/ui/StatCard';
import DataTable, { type Column } from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAppStore, toGive, purchaseBalance } from '../store/AppStore';
import type { Payment as PaymentDoc, Purchase as PurchaseDoc } from '../store/AppStore';
import { todayBS, formatNPRCompact } from '../utils/nepaliDate';

const methodTone = { CASH: 'green', BANK: 'blue', DIGITAL: 'purple' } as const;
type Mode = 'BILL' | 'ADVANCE';
interface BillSel { checked: boolean; amount: string; }

export default function PaymentOut() {
  const { state, actions } = useAppStore();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  // modal state
  const [mode, setMode] = useState<Mode>('BILL');
  const [supplierId, setSupplierId] = useState('');
  const [selections, setSelections] = useState<Record<string, BillSel>>({});
  const [manualRef, setManualRef] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [billNote, setBillNote] = useState('');       // ← remark for Against Bill
  const [advAmount, setAdvAmount] = useState('');
  const [advNote, setAdvNote] = useState('');
  const [method, setMethod] = useState<PaymentDoc['method']>('CASH');

  // link-bill modal state
  const [linkPayId, setLinkPayId] = useState<string | null>(null);
  const [linkPurchaseId, setLinkPurchaseId] = useState('');

  const partyName = (id: string) => state.parties.find(p => p.id === id)?.name ?? '—';
  const purchaseNo = (id?: string) => state.purchases.find(v => v.id === id)?.number ?? '';
  const suppliers = state.parties.filter(p => p.type === 'SUPPLIER');

  const payouts = useMemo(() => state.payments.filter(p => {
    if (p.type !== 'OUT') return false;
    const term = search.toLowerCase();
    const ref = purchaseNo(p.purchaseId) || p.remarks || p.note || '';
    return !term || partyName(p.partyId).toLowerCase().includes(term) || ref.toLowerCase().includes(term);
  }), [state.payments, state.parties, state.purchases, search]);

  const today = todayBS().formatted;
  const monthKey = today.slice(0, 7);
  const paidToday = state.payments.filter(p => p.type === 'OUT' && p.dateBS === today).reduce((a, p) => a + p.amount, 0);
  const paidMonth = state.payments.filter(p => p.type === 'OUT' && p.dateBS.startsWith(monthKey)).reduce((a, p) => a + p.amount, 0);

  const unpaid = state.purchases.filter(v => purchaseBalance(state, v) > 0);
  const supplierBills = unpaid.filter(v => v.partyId === supplierId);
  const chosenBills = supplierBills.filter(v => selections[v.id]?.checked);
  const totalSelected = chosenBills.reduce((a, v) => a + (Number(selections[v.id]?.amount) || 0), 0);

  const payableCols: Column<PurchaseDoc>[] = [
    {
      key: 'number', header: 'Bill', mobilePrimary: true,
      render: p => (
        <div>
          <p className="font-medium text-teal-800">{p.number}</p>
          {p.supplierBillNo && <p className="text-xs text-slate-500">supplier: {p.supplierBillNo}</p>}
        </div>
      ),
    },
    { key: 'party', header: 'Supplier', render: p => partyName(p.partyId) },
    { key: 'date', header: 'Date (BS)', hideOnMobile: true, render: p => p.dateBS },
    {
      key: 'balance', header: 'Balance Due', align: 'right',
      render: p => <span className="font-semibold text-red-600">{formatNPRCompact(purchaseBalance(state, p))}</span>,
    },
  ];

  const columns: Column<PaymentDoc>[] = [
    { key: 'date', header: 'Date (BS)', render: p => p.dateBS },
    { key: 'party', header: 'Paid To', mobilePrimary: true, render: p => <span className="font-medium text-slate-900">{partyName(p.partyId)}</span> },
    {
      key: 'ref', header: 'Reference',
      render: p => p.purchaseId
        ? <Badge tone="blue">{purchaseNo(p.purchaseId)}</Badge>
        : <span className="font-mono text-teal-800">{p.remarks || p.note || '—'}</span>,
    },
    { key: 'method', header: 'Method', hideOnMobile: true, render: p => <Badge tone={methodTone[p.method]}>{p.method}</Badge> },
    { key: 'amount', header: 'Amount', align: 'right', render: p => <span className="font-semibold text-slate-900">{formatNPRCompact(p.amount)}</span> },
    {
      key: 'actions', header: '', hideOnMobile: true, align: 'right',
      render: p => !p.purchaseId ? (
        <button
          className="btn-ghost hover:!text-teal-800"
          title="Link this payment to a purchase bill"
          onClick={() => { setLinkPayId(p.id); setLinkPurchaseId(state.purchases.find(v => v.partyId === p.partyId)?.id ?? ''); }}
        >
          <Link2 className="h-4 w-4" />
        </button>
      ) : null,
    },
  ];

  const openModal = () => {
    setSupplierId(suppliers[0]?.id ?? '');
    setMode(unpaid.length > 0 ? 'BILL' : 'ADVANCE');
    setSelections({});
    setManualRef(''); setManualAmount('');
    setBillNote('');
    setAdvAmount(''); setAdvNote('');
    setMethod('CASH');
    setOpen(true);
  };

  const changeSupplier = (id: string) => { setSupplierId(id); setSelections({}); };

  const toggleBill = (id: string) => {
    setSelections(sel => {
      const cur = sel[id];
      if (cur?.checked) return { ...sel, [id]: { ...cur, checked: false } };
      const bal = purchaseBalance(state, state.purchases.find(v => v.id === id)!);
      return { ...sel, [id]: { checked: true, amount: String(bal) } };
    });
  };

  const setBillAmount = (id: string, amount: string) =>
    setSelections(sel => ({ ...sel, [id]: { ...(sel[id] ?? { checked: true, amount: '0' }), amount } }));

  const save = () => {
    if (!supplierId) { alert('Select a supplier first.'); return; }
    const remark = billNote.trim();

    if (mode === 'BILL') {
      if (supplierBills.length === 0) {
        // Manual supplier-bill reference (bill not entered in system yet)
        const amt = Number(manualAmount);
        if (!manualRef.trim()) { alert("Enter the supplier's bill number/reference."); return; }
        if (!amt || amt <= 0) { alert('Enter a valid amount.'); return; }
        const note = `Against supplier bill ${manualRef.trim()}${remark ? ` — ${remark}` : ''}`;
        actions.addPaymentOut(supplierId, amt, method, note);
        alert(`Payment of Rs. ${amt.toLocaleString('en-IN')} recorded against supplier bill ${manualRef.trim()}.`);
      } else {
        if (chosenBills.length === 0) { alert('Select at least one bill to pay.'); return; }
        for (const v of chosenBills) {
          const bal = purchaseBalance(state, v);
          const amt = Number(selections[v.id].amount);
          if (!amt || amt <= 0) { alert(`Enter a valid amount for ${v.number}.`); return; }
          if (amt > bal) { alert(`Amount for ${v.number} exceeds its balance (Rs. ${bal}).`); return; }
        }
        chosenBills.forEach(v => actions.recordPaymentOut(v.id, Number(selections[v.id].amount), method, remark || undefined));
        alert(`Payment of Rs. ${totalSelected.toLocaleString('en-IN')} recorded against ${chosenBills.length} bill(s) of ${partyName(supplierId)}.`);
      }
    } else {
      const amt = Number(advAmount);
      if (!amt || amt <= 0) { alert('Enter a valid amount.'); return; }
      actions.addPaymentOut(supplierId, amt, method, advNote.trim() || 'Supplier advance');
      alert(`Advance payment of Rs. ${amt.toLocaleString('en-IN')} recorded for ${partyName(supplierId)}.`);
    }
    setOpen(false);
  };

  const saveLink = () => {
    if (!linkPayId || !linkPurchaseId) { alert('Select a bill to link.'); return; }
    actions.linkPaymentToPurchase(linkPayId, linkPurchaseId);
    alert(`Payment linked to ${purchaseNo(linkPurchaseId)}. Bill balance updated.`);
    setLinkPayId(null);
  };

  const linkPay = state.payments.find(p => p.id === linkPayId);
  const linkOptions = linkPay ? state.purchases.filter(v => v.partyId === linkPay.partyId) : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Payment Out" subtitle="Money paid to suppliers — against bills or as advances." icon={Banknote}
        actions={
          <button className="btn-primary" onClick={openModal} disabled={suppliers.length === 0}>
            <Plus className="h-4 w-4" /> Record Payment
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Paid Today" value={formatNPRCompact(paidToday)} icon={Banknote} tone="red" />
        <StatCard label="Paid This Month" value={formatNPRCompact(paidMonth)} icon={CalendarDays} tone="blue" />
        <StatCard label="Still Payable" value={formatNPRCompact(toGive(state))} icon={AlertCircle} tone="red" />
      </div>

      <div className="mb-6">
        <SectionCard bodyClassName="p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Bills Payable — Payment to be Made</h2>
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{unpaid.length}</span>
          </div>
          <DataTable columns={payableCols} rows={unpaid} rowKey={p => p.id} />
        </SectionCard>
      </div>

      <SectionCard bodyClassName="p-0">
        <div className="border-b border-slate-100 p-4">
          <div className="relative sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search supplier or reference…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <DataTable
          columns={columns} rows={payouts} rowKey={p => p.id}
          mobileActions={p => !p.purchaseId ? (
            <button className="btn-ghost hover:!text-teal-800" title="Link to bill"
              onClick={() => { setLinkPayId(p.id); setLinkPurchaseId(state.purchases.find(v => v.partyId === p.partyId)?.id ?? ''); }}>
              <Link2 className="h-4 w-4" />
            </button>
          ) : null}
        />
      </SectionCard>

      {/* ---------- Record Payment modal ---------- */}
      <Modal open={open} onClose={() => setOpen(false)} title="Record Payment Out" size="max-w-lg"
        footer={<>
          <button className="btn-outline flex-1" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={save}>Save Payment</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="label">Supplier *</label>
            <select className="input" value={supplierId} onChange={e => changeSupplier(e.target.value)}>
              {suppliers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="flex rounded-lg bg-slate-100 p-1">
            <button type="button" onClick={() => setMode('BILL')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${mode === 'BILL' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <FileText className="h-4 w-4" /> Against Bill
            </button>
            <button type="button" onClick={() => setMode('ADVANCE')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${mode === 'ADVANCE' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <HandCoins className="h-4 w-4" /> Advance / On-account
            </button>
          </div>

          {mode === 'BILL' && (
            <>
              {supplierBills.length === 0 ? (
                <div className="space-y-3">
                  <div>
                    <label className="label">Supplier Bill No. / Reference *</label>
                    <input className="input font-mono" value={manualRef} onChange={e => setManualRef(e.target.value)} placeholder="e.g., ES-2081-114" />
                  </div>
                  <div>
                    <label className="label">Amount (Rs.) *</label>
                    <input type="number" min={0} className="input" value={manualAmount} onChange={e => setManualAmount(e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Select bill(s) to pay
                  </p>
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {supplierBills.map(v => {
                      const sel = selections[v.id];
                      const bal = purchaseBalance(state, v);
                      return (
                        <div key={v.id}
                          className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${sel?.checked ? 'border-teal-500 bg-teal-50/60' : 'border-slate-200'}`}>
                          <input type="checkbox" className="h-4 w-4 shrink-0 accent-teal-800" checked={!!sel?.checked} onChange={() => toggleBill(v.id)} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {v.number}
                              {v.supplierBillNo && <span className="ml-1 text-xs font-normal text-slate-500">(supplier: {v.supplierBillNo})</span>}
                            </p>
                            <p className="text-xs text-slate-500">Date {v.dateBS} · Balance Rs. {bal.toLocaleString('en-IN')}</p>
                          </div>
                          {sel?.checked && (
                            <div className="w-28 shrink-0">
                              <input type="number" min={1} max={bal} className="input !py-1.5 text-xs" value={sel.amount}
                                onChange={e => setBillAmount(v.id, e.target.value)} title="Amount to pay for this bill" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {chosenBills.length > 0 && (
                    <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-600">Total for {chosenBills.length} selected bill(s)</span>
                      <span className="font-bold text-slate-900">Rs. {totalSelected.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Remark for Against Bill payments */}
              <div>
                <label className="label">Remark</label>
                <input
                  className="input"
                  value={billNote}
                  onChange={e => setBillNote(e.target.value)}
                  placeholder="e.g., Part payment for Ashwin stock…"
                />
              </div>
            </>
          )}

          {mode === 'ADVANCE' && (
            <>
              <div>
                <label className="label">Amount (Rs.) *</label>
                <input type="number" min={0} className="input" value={advAmount} onChange={e => setAdvAmount(e.target.value)} />
              </div>
              <div>
                <label className="label">Remark</label>
                <input className="input" value={advNote} onChange={e => setAdvNote(e.target.value)} placeholder="e.g., Advance for Ashwin stock" />
              </div>
            </>
          )}

          <div>
            <label className="label">Method *</label>
            <select className="input" value={method} onChange={e => setMethod(e.target.value as PaymentDoc['method'])}>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank Transfer</option>
              <option value="DIGITAL">Digital Wallet</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* ---------- Link payment → bill modal ---------- */}
      <Modal open={!!linkPay} onClose={() => setLinkPayId(null)} title="Link Payment to Bill"
        footer={<>
          <button className="btn-outline flex-1" onClick={() => setLinkPayId(null)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={saveLink} disabled={linkOptions.length === 0}>Link Payment</button>
        </>}>
        {linkPay && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Payment of <b className="text-slate-900">Rs. {linkPay.amount.toLocaleString('en-IN')}</b> to{' '}
              <b className="text-slate-900">{partyName(linkPay.partyId)}</b> on {linkPay.dateBS}
              {(linkPay.remarks || linkPay.note) ? <> · remark: {linkPay.remarks || linkPay.note}</> : null}
            </div>
            {linkOptions.length === 0 ? (
              <p className="text-sm text-amber-700">This supplier has no purchase bills yet. Create one under Purchase first.</p>
            ) : (
              <div>
                <label className="label">Purchase Bill *</label>
                <select className="input" value={linkPurchaseId} onChange={e => setLinkPurchaseId(e.target.value)}>
                  {linkOptions.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.number}{v.supplierBillNo ? ` (supplier: ${v.supplierBillNo})` : ''} — balance Rs. {purchaseBalance(state, v)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">The bill's payable balance and status update immediately after linking.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}