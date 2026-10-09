import { useState } from 'react';
import { ShoppingCart, Plus, Trash2, Search, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import StatCard from '../components/ui/StatCard';
import DataTable, { type Column } from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAppStore, toGive, purchaseThisMonth } from '../store/AppStore';
import type { Purchase as PurchaseDoc, InvoiceLine, Item } from '../store/AppStore';
import { todayBS, formatNPRCompact } from '../utils/nepaliDate';

// Unit options based on item type
const PRODUCT_UNITS = ['Pcs', 'Kg', 'Ltr', 'Box', 'Set'];
const SERVICE_UNITS = ['Service', 'Hour', 'Day', 'Visit'];

export default function Purchase() {
  const { state, actions } = useAppStore();
  const isPanRegistered = state.business.registrationType === 'PAN';
  const [open, setOpen] = useState(false);
  const [partyId, setPartyId] = useState('');
  const [billNo, setBillNo] = useState('');
  const [applyVat, setApplyVat] = useState(!isPanRegistered);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [itemSearch, setItemSearch] = useState('');

  const lineTax = applyVat ? 13 : 0;

  const partyName = (id: string) => state.parties.find(p => p.id === id)?.name ?? '—';
  const getItem = (itemId: string) => state.items.find(i => i.id === itemId);
  const monthKey = todayBS().formatted.slice(0, 7);
  const countMonth = state.purchases.filter(p => p.dateBS.startsWith(monthKey)).length;

  const openModal = () => {
    setPartyId(state.parties.find(p => p.type === 'SUPPLIER')?.id ?? '');
    setBillNo('');
    setApplyVat(!isPanRegistered); // sensible default per registration
    setLines([{ itemId: '', name: '', qty: 1, rate: 0, discount: 0, taxRate: !isPanRegistered ? 13 : 0 }]);
    setItemSearch('');
    setOpen(true);
  };

  const setLine = (idx: number, patch: Partial<InvoiceLine>) =>
    setLines(ls => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  // Flip VAT for the whole bill — every existing line updates immediately
  const toggleVat = (on: boolean) => {
    setApplyVat(on);
    setLines(ls => ls.map(l => ({ ...l, taxRate: on ? 13 : 0 })));
  };

  const pickItem = (idx: number, itemId: string) => {
    const item = getItem(itemId);
    setLine(idx, item
      ? { itemId: item.id, name: item.name, rate: Math.round(item.price * 0.8), taxRate: lineTax }
      : { itemId: '' });
  };

  const addFromSearch = (item: Item) => {
    const idx = lines.findIndex(l => !l.itemId);
    const patch = { itemId: item.id, name: item.name, rate: Math.round(item.price * 0.8), taxRate: lineTax };
    if (idx >= 0) {
      setLine(idx, patch);
    } else {
      setLines(ls => [...ls, { ...patch, qty: 1, discount: 0 }]);
    }
    setItemSearch('');
  };

  const term = itemSearch.trim().toLowerCase();
  const matches = state.items.filter(i =>
    !term || i.name.toLowerCase().includes(term) || i.hsnSac.toLowerCase().includes(term)
  );

  const lineAmt = (l: InvoiceLine) => (l.qty * l.rate - l.discount) * (1 + l.taxRate / 100);
  const lineVat = (l: InvoiceLine) => (l.qty * l.rate - l.discount) * l.taxRate / 100;
  const totalSub = lines.reduce((a, l) => a + (l.qty * l.rate - l.discount), 0);
  const totalVat = lines.reduce((a, l) => a + lineVat(l), 0);
  const total = totalSub + totalVat;

  const save = () => {
    const valid = lines.filter(l => l.name && l.qty > 0 && l.rate > 0);
    if (!partyId || valid.length === 0) { alert('Pick a supplier and at least one priced item.'); return; }
    actions.createPurchase(partyId, valid, billNo);
    setOpen(false);
  };

  const columns: Column<PurchaseDoc>[] = [
    { key: 'number', header: 'Bill No.', mobilePrimary: true, render: p => <span className="font-mono font-medium text-teal-800">{p.number}</span> },
    { key: 'sbill', header: 'Supplier Bill', hideOnMobile: true, render: p => <span className="font-mono">{p.supplierBillNo || '—'}</span> },
    { key: 'date', header: 'Date (BS)', render: p => p.dateBS },
    { key: 'party', header: 'Supplier', render: p => partyName(p.partyId) },
    { key: 'total', header: 'Amount', align: 'right', render: p => <span className="font-semibold text-slate-900">{formatNPRCompact(p.total)}</span> },
    { key: 'status', header: 'Status', render: p => <Badge tone={p.status === 'PAID' ? 'green' : 'amber'}>{p.status === 'PAID' ? 'Paid' : 'Unpaid'}</Badge> },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Purchase" subtitle="Supplier bills — stock is added on save." icon={ShoppingCart}
        actions={<button className="btn-primary" onClick={openModal}><Plus className="h-4 w-4" /> New Purchase</button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Purchase This Month" value={formatNPRCompact(purchaseThisMonth(state))} icon={ShoppingCart} tone="blue" />
        <StatCard label="To Give (Suppliers)" value={formatNPRCompact(toGive(state))} icon={ShoppingCart} tone="red" />
        <StatCard label="Bills This Month" value={String(countMonth)} icon={ShoppingCart} tone="green" />
      </div>

      <SectionCard bodyClassName="p-0">
        <DataTable columns={columns} rows={state.purchases} rowKey={p => p.id} />
      </SectionCard>

      <Modal open={open} onClose={() => setOpen(false)} title="New Purchase" size="max-w-2xl"
        footer={<>
          <button className="btn-outline flex-1" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={save}>Save Purchase</button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Supplier *</label>
              <select className="input" value={partyId} onChange={e => setPartyId(e.target.value)}>
                {state.parties.filter(p => p.type === 'SUPPLIER').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Supplier Bill No.</label>
              <input
                className="input font-mono"
                value={billNo}
                onChange={e => setBillNo(e.target.value)}
                placeholder="e.g., ES-2081-114"
              />
            </div>
          </div>

          {/* ---- VAT option for this bill ---- */}
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">VAT on this purchase</p>
            </div>
            <div className="flex shrink-0 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => toggleVat(true)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  applyVat ? 'bg-teal-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Add 13% VAT
              </button>
              <button
                type="button"
                onClick={() => toggleVat(false)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  !applyVat ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                No VAT
              </button>
            </div>
          </div>
          {isPanRegistered && applyVat && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <b>PAN registered:</b> VAT paid on purchases cannot be claimed as input credit.
            </p>
          )}

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search goods by name…"
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
              />
              {term && (
                <div className="absolute left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {matches.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-slate-500">No goods match "{itemSearch.trim()}".</p>
                  ) : (
                    matches.map(i => {
                      const added = lines.some(l => l.itemId === i.id);
                      return (
                        <button key={i.id} type="button" onClick={() => addFromSearch(i)}
                          className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-teal-50">
                          <span className="min-w-0 truncate text-slate-800">{i.name}</span>
                          <span className="shrink-0 text-xs text-slate-400">{i.hsnSac}</span>
                          {added
                            ? <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />
                            : <Plus className="h-4 w-4 shrink-0 text-slate-400" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Column headers — Item · Qty · Unit · Rate · Amount */}
            <div className="hidden grid-cols-[1fr_70px_90px_100px_110px_32px] items-center gap-2 sm:grid">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Item</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Qty</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Unit</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rate (Rs.)</span>
              <span className="text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Amount</span>
              <span />
            </div>

            {/* Line rows — unit dropdown between qty and rate */}
            {lines.map((l, idx) => {
              const item = getItem(l.itemId);
              const unitOptions = item?.type === 'SERVICE' ? SERVICE_UNITS : PRODUCT_UNITS;
              const currentUnit = item?.unit ?? '';

              return (
                <div key={idx} className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_70px_90px_100px_110px_32px]">
                  <select className="input col-span-2 sm:col-span-1" value={l.itemId} onChange={e => pickItem(idx, e.target.value)}>
                    <option value="">— Select item —</option>
                    {state.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                  <input type="number" min={1} className="input" value={l.qty} onChange={e => setLine(idx, { qty: Number(e.target.value) })} title="Qty" />
                  <select className="input" value={currentUnit} disabled={!item} title="Unit (from inventory)">
                    {item ? (
                      unitOptions.map(u => <option key={u} value={u}>{u}</option>)
                    ) : (
                      <option value="">—</option>
                    )}
                  </select>
                  <input type="number" min={0} className="input" value={l.rate} onChange={e => setLine(idx, { rate: Number(e.target.value) })} title="Rate (Rs.)" />
                  <div className="flex items-center justify-end text-sm font-medium text-slate-800">{formatNPRCompact(lineAmt(l))}</div>
                  <button className="btn-ghost justify-self-end" onClick={() => setLines(ls => ls.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
            <button className="btn-outline w-full" onClick={() => setLines(ls => [...ls, { itemId: '', name: '', qty: 1, rate: 0, discount: 0, taxRate: lineTax }])}>
              <Plus className="h-4 w-4" /> Add Line
            </button>
          </div>

          {/* Summary — follows the VAT toggle */}
          <div className="space-y-1 rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatNPRCompact(totalSub)}</span></div>
            <div className="flex justify-between text-slate-600">
              <span>VAT ({applyVat ? '13%' : '0%'})</span>
              <span>{formatNPRCompact(totalVat)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
              <span>Total {applyVat ? '(incl. VAT)' : '(no VAT)'}</span>
              <span>{formatNPRCompact(total)}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}