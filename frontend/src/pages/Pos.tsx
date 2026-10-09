import { useMemo, useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle2, Printer } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAppStore } from '../store/AppStore';
import type { Item, InvoiceLine, Payment } from '../store/AppStore';
import { formatNPR, formatNPRCompact } from '../utils/nepaliDate';

interface CartLine {
  itemId: string; name: string; qty: number; rate: number; discount: number;
  taxRate: number; unit: string; stock: number; type: 'PRODUCT' | 'SERVICE';
}

export default function Pos() {
  const { state, actions } = useAppStore();
  const isPanRegistered = state.business.registrationType === 'PAN';
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [partyId, setPartyId] = useState(
    () => state.parties.find(p => p.name === 'Walk-in Customer')?.id ?? state.parties.find(p => p.type === 'CUSTOMER')?.id ?? ''
  );
  const [method, setMethod] = useState<Payment['method']>('CASH');
  const [tendered, setTendered] = useState(0);
  const [receipt, setReceipt] = useState<{ number: string; total: number; change: number } | null>(null);

  const items = useMemo(
    () => state.items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())),
    [search, state.items],
  );

  const addToCart = (item: Item) => {
    if (item.type === 'PRODUCT') {
      const inCart = cart.find(l => l.itemId === item.id)?.qty ?? 0;
      if (inCart + 1 > item.stock) { alert(`Only ${item.stock} ${item.unit} in stock for ${item.name}.`); return; }
    }
    setCart(c => {
      const ex = c.find(l => l.itemId === item.id);
      if (ex) return c.map(l => (l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { itemId: item.id, name: item.name, qty: 1, rate: item.price, discount: 0, taxRate: isPanRegistered ? 0 : 13, unit: item.unit, stock: item.stock, type: item.type }];
    });
  };

  const setQty = (itemId: string, delta: number) => {
    setCart(c => c.map(l => {
      if (l.itemId !== itemId) return l;
      const qty = l.qty + delta;
      if (qty < 1) return l;
      if (l.type === 'PRODUCT' && qty > l.stock) return l;
      return { ...l, qty };
    }));
  };

  const removeLine = (itemId: string) => setCart(c => c.filter(l => l.itemId !== itemId));

  const subtotal = cart.reduce((a, l) => a + (l.qty * l.rate - l.discount), 0);
  const vat = isPanRegistered ? 0 : subtotal * 0.13;
  const total = subtotal + vat;
  const change = Math.max(0, tendered - total);

  const checkout = (paid: boolean) => {
    if (cart.length === 0 || !partyId) return;
    const lines: InvoiceLine[] = cart.map(l => ({ itemId: l.itemId, name: l.name, qty: l.qty, rate: l.rate, discount: l.discount, taxRate: l.taxRate }));
    const inv = actions.createInvoice(partyId, lines);
    if (paid) actions.recordPaymentIn(inv.id, total, method);
    setReceipt({ number: inv.number, total, change: paid && method === 'CASH' ? change : 0 });
    setCart([]); setTendered(0);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Quick POS" subtitle="Fast counter billing for walk-in sales." icon={ShoppingCart} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ---------- Item picker ---------- */}
        <div className="lg:col-span-3">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search items to sell…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={item.type === 'PRODUCT' && item.stock <= 0}
                className="card p-3 text-left transition hover:border-teal-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                <p className="line-clamp-2 text-sm font-medium text-slate-800">{item.name}</p>
                <p className="mt-1 text-sm font-bold text-teal-800">{formatNPRCompact(item.price)}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">per {item.unit}</span>
                  {item.type === 'PRODUCT'
                    ? <Badge tone={item.stock <= item.reorderLevel ? 'red' : 'green'}>{item.stock} left</Badge>
                    : <Badge tone="slate">Service</Badge>}
                </div>
              </button>
            ))}
            {items.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-slate-400">No items match “{search}”.</p>
            )}
          </div>
        </div>

        {/* ---------- Cart ---------- */}
        <div className="lg:col-span-2">
          <div className="card sticky top-20">
            <div className="border-b border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">Cart ({cart.length})</h2>
                <select value={partyId} onChange={e => setPartyId(e.target.value)} className="input w-40 !py-1.5 text-xs">
                  {state.parties.filter(p => p.type === 'CUSTOMER').map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lines */}
            <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
              {cart.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Tap items to add them here.</p>}
              {cart.map(l => (
                <div key={l.itemId} className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{l.name}</p>
                    <p className="text-xs text-slate-500">{formatNPRCompact(l.rate)} / {l.unit}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQty(l.itemId, -1)} className="btn-ghost !p-1"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-7 text-center text-sm font-semibold text-slate-800">{l.qty}</span>
                    <button onClick={() => setQty(l.itemId, 1)} className="btn-ghost !p-1"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <span className="w-20 text-right text-sm font-semibold text-slate-900">{formatNPRCompact(l.qty * l.rate - l.discount)}</span>
                  <button onClick={() => removeLine(l.itemId)} className="btn-ghost !p-1 hover:!text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>

            {/* Totals + payment */}
            <div className="space-y-2 border-t border-slate-100 p-4 text-sm">
              <div className="flex justify-between text-slate-600"><span>Taxable</span><span>{formatNPR(subtotal)}</span></div>
              {!isPanRegistered && (
                <div className="flex justify-between text-slate-600"><span>VAT (13%)</span><span>{formatNPR(vat)}</span></div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900"><span>Total</span><span>{formatNPR(total)}</span></div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="label !mb-1 text-xs">Method</label>
                  <select value={method} onChange={e => setMethod(e.target.value as Payment['method'])} className="input !py-1.5 text-xs">
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    <option value="DIGITAL">Digital Wallet</option>
                  </select>
                </div>
                {method === 'CASH' && (
                  <div>
                    <label className="label !mb-1 text-xs">Tendered (Rs.)</label>
                    <input type="number" min={0} value={tendered || ''} onChange={e => setTendered(Number(e.target.value))}
                      className="input !py-1.5 text-xs" placeholder="0" />
                  </div>
                )}
              </div>
              {method === 'CASH' && tendered > 0 && (
                <div className="flex justify-between rounded-lg bg-teal-50 px-3 py-2 text-xs font-medium text-teal-900">
                  <span>Change to return</span><span>{formatNPR(change)}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 pt-2">
                <button onClick={() => checkout(true)} disabled={cart.length === 0} className="btn-primary w-full">
                  Complete Sale (Paid)
                </button>
                <button onClick={() => checkout(false)} disabled={cart.length === 0} className="btn-outline w-full">
                  Save as Unpaid (Credit)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt modal */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Sale Complete"
        footer={<>
          <button className="btn-outline flex-1" onClick={() => alert('Thermal receipt printing arrives with the backend.')}>
            <Printer className="h-4 w-4" /> Print
          </button>
          <button className="btn-primary flex-1" onClick={() => setReceipt(null)}>Done</button>
        </>}>
        {receipt && (
          <div className="py-2 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-3 text-sm text-slate-500">Invoice <span className="font-mono font-bold text-slate-900">{receipt.number}</span> saved.</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatNPR(receipt.total)}</p>
            {receipt.change > 0 && (
              <p className="mt-2 rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900">Change: {formatNPR(receipt.change)}</p>
            )}
            <p className="mt-3 text-xs text-slate-400">Stock levels and the cashflow chart have been updated automatically.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}