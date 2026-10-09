import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Printer, FileText, Banknote, QrCode, Wallet, EyeOff, Search, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import type { InvoiceLine } from '../store/AppStore';
import { todayBS, formatNPR } from '../utils/nepaliDate';
import { amountInWords } from '../utils/words';

type PayMode = 'CASH' | 'QR' | 'SPLIT';
type BillStatus = 'PAID' | 'UNPAID';

export default function InvoiceCreate() {
  const { state, actions } = useAppStore();
  const navigate = useNavigate();

  // PAN-registered businesses cannot charge VAT under Nepal IRD rules
  const isPanRegistered = state.business.registrationType === 'PAN';

  const [selectedPartyId, setSelectedPartyId] = useState(
    () => state.parties.find(p => p.name === 'Walk-in Customer')?.id ?? state.parties.find(p => p.type === 'CUSTOMER')?.id ?? ''
  );
  const [lineItems, setLineItems] = useState<InvoiceLine[]>([
    { itemId: '', name: '', qty: 1, rate: 0, discount: 0, taxRate: isPanRegistered ? 0 : 13 },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Close header search dropdown when clicking outside
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Internal billing status (never printed on the invoice document)
  const [billStatus, setBillStatus] = useState<BillStatus>('PAID');

  // Payment mode state (used only when billStatus === 'PAID')
  const [payMode, setPayMode] = useState<PayMode>('CASH');
  const [tendered, setTendered] = useState(0);   // cash tendered (CASH mode)
  const [cashPart, setCashPart] = useState(0);   // split: cash portion
  const [qrPart, setQrPart] = useState(0);       // split: QR portion

  const today = todayBS();
  const invoiceNumber = `${state.business.invoicePrefix}${String(state.business.nextInvoiceNo).padStart(4, '0')}`;

  // ---------- Line item handlers (index-based) ----------
  const addLineItem = () =>
    setLineItems(ls => [...ls, { itemId: '', name: '', qty: 1, rate: 0, discount: 0, taxRate: isPanRegistered ? 0 : 13 }]);

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) setLineItems(ls => ls.filter((_, i) => i !== index));
  };

  const handleItemSelect = (index: number, catalogItemId: string) => {
    const item = state.items.find(i => i.id === catalogItemId);
    // Tax follows the business registration type: PAN = 0%, VAT = 13% on everything
    const effectiveTax = isPanRegistered ? 0 : 13;
    setLineItems(ls => ls.map((l, i) => (i === index ? {
      ...l,
      itemId: item?.id ?? '',
      name: item?.name ?? '',
      rate: item?.price ?? 0,
      taxRate: effectiveTax,
    } : l)));
  };

  const updateLine = (index: number, patch: Partial<InvoiceLine>) =>
    setLineItems(ls => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  // Search filters rows across the whole list (matched by selected item name or code)
  const term = searchTerm.trim().toLowerCase();
  const visibleIndices = term
    ? lineItems
        .map((l, i) => ({ l, i }))
        .filter(({ l }) => {
          const cat = state.items.find(it => it.id === l.itemId);
          return (l.name || '').toLowerCase().includes(term) ||
                 (cat?.hsnSac || '').toLowerCase().includes(term);
        })
        .map(({ i }) => i)
    : lineItems.map((_, i) => i);

  // Header search dropdown: matching catalog items, green tick for already-added ones
  const searchResults = term
    ? state.items
        .filter(i => i.name.toLowerCase().includes(term) || i.hsnSac.toLowerCase().includes(term))
        .slice(0, 8)
    : [];
  const addedIds = new Set(lineItems.map(l => l.itemId));

  const addItemFromSearch = (itemId: string) => {
    if (addedIds.has(itemId)) return;
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;
    const effectiveTax = isPanRegistered ? 0 : 13;
    setLineItems(ls => {
      // Fill the first empty row before appending a new one
      const emptyIdx = ls.findIndex(l => !l.itemId && !l.name);
      if (emptyIdx !== -1) return ls.map((l, i) => (i === emptyIdx ? {
        ...l,
        itemId: item.id,
        name: item.name,
        rate: item.price,
        taxRate: effectiveTax,
      } : l));
      return [...ls, {
        itemId: item.id,
        name: item.name,
        qty: 1,
        rate: item.price,
        discount: 0,
        taxRate: effectiveTax,
      }];
    });
    setSearchTerm('');
    setSearchOpen(false);
  };

  // ---------- Calculations (IRD compliant) ----------
  // Tax follows registration type: PAN = no VAT, VAT = 13% charged on the gross total
  const subtotal = lineItems.reduce((a, l) => a + (l.qty * l.rate - l.discount), 0);
  const vat = isPanRegistered ? 0 : subtotal * 0.13;
  const total = subtotal + vat;

  const change = Math.max(0, (tendered || total) - total);
  const splitSum = cashPart + qrPart;
  const splitRemaining = Math.max(0, total - splitSum);

  const switchMode = (m: PayMode) => {
    setPayMode(m);
    if (m === 'SPLIT' && cashPart === 0 && qrPart === 0) {
      setCashPart(Math.round(total / 2));
      setQrPart(total - Math.round(total / 2));
    }
  };

  // ---------- Save ----------
  const handleSave = (print: boolean) => {
    const valid = lineItems.filter(l => l.name && l.qty > 0 && l.rate > 0);
    if (!selectedPartyId || valid.length === 0) { alert('Select a customer and add at least one priced item.'); return; }

    const inv = actions.createInvoice(selectedPartyId, valid);

    if (billStatus === 'UNPAID') {
      // Credit sale — no payment recorded now
      alert(`Invoice ${inv.number} saved as UNPAID (credit sale). Record receipts later from Payment In.`);
      navigate(print ? `/sales/invoices/${inv.id}` : '/sales/invoices');
      return;
    }

    // Record payment(s) so the invoice shows as PAID immediately
    if (payMode === 'CASH') {
      actions.recordPaymentIn(inv.id, total, 'CASH');
    } else if (payMode === 'QR') {
      actions.recordPaymentIn(inv.id, total, 'DIGITAL');
    } else {
      if (cashPart > 0) actions.recordPaymentIn(inv.id, cashPart, 'CASH');
      if (qrPart > 0) actions.recordPaymentIn(inv.id, qrPart, 'DIGITAL');
    }

    const paid = payMode === 'CASH' || payMode === 'QR' ? total : splitSum;
    alert(
      paid >= total
        ? `Invoice ${inv.number} saved as PAID (${payMode === 'SPLIT' ? `Cash ${formatNPR(cashPart)} + QR ${formatNPR(qrPart)}` : payMode === 'CASH' ? 'Cash' : 'QR'}).`
        : `Invoice ${inv.number} saved. Received ${formatNPR(paid)} — balance ${formatNPR(total - paid)} stays outstanding.`
    );

    navigate(print ? `/sales/invoices/${inv.id}` : '/sales/invoices');
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/sales/invoices')} className="btn-ghost"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
              <FileText className="h-6 w-6 text-teal-800" /> New Invoice
            </h1>
            <p className="text-sm text-slate-500">
              {invoiceNumber} • {today.formatted} BS
              {isPanRegistered && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">PAN</span>}
              {!isPanRegistered && <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">VAT</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleSave(true)} className="btn-outline">
            <Printer className="h-4 w-4" /> Save & Print
          </button>
          <button onClick={() => handleSave(false)} className="btn-primary">
            <Save className="h-4 w-4" /> Save Invoice
          </button>
        </div>
      </div>

      {/* Bill To */}
      <div className="card mb-6 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Bill To (Customer)</h2>
        <select className="input" value={selectedPartyId} onChange={e => setSelectedPartyId(e.target.value)}>
          {state.parties.filter(p => p.type === 'CUSTOMER').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {(() => {
          const p = state.parties.find(x => x.id === selectedPartyId);
          return p ? (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <p><span className="font-medium">Address:</span> {p.address}</p>
              <p>
                <span className="font-medium">{p.panVatType === 'VAT' ? 'VAT No.:' : 'PAN No.:'}</span>{' '}
                <span className="font-mono">{p.panVat}</span>
              </p>
            </div>
          ) : null;
        })()}
      </div>

      {/* Line Items */}
      <div className="card mb-6 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h2 className="text-sm font-semibold text-slate-800">Line Items</h2>
          <div ref={searchBoxRef} className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input pl-9"
              placeholder="Search items by name or code…"
              value={searchTerm}
              onFocus={() => setSearchOpen(true)}
              onChange={e => { setSearchTerm(e.target.value); setSearchOpen(true); }}
            />
            {searchOpen && term && (
              <div className="absolute left-0 right-0 z-40 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {searchResults.length === 0 && (
                  <p className="px-3 py-2 text-sm text-slate-500">No items match “{term}”.</p>
                )}
                {searchResults.map(item => {
                  const added = addedIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${added ? 'cursor-default' : 'hover:bg-teal-50'}`}
                      onClick={() => addItemFromSearch(item.id)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-800">{item.name}</span>
                        <span className="block text-xs text-slate-500">
                          {item.type === 'PRODUCT' ? `${item.stock} ${item.unit} left` : 'Service'} · Code {item.hsnSac}
                        </span>
                      </span>
                      {added ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                      ) : (
                        <span className="shrink-0 text-xs font-semibold text-slate-700">{formatNPR(item.price)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button onClick={addLineItem} className="flex items-center justify-center gap-1 text-sm font-medium text-teal-800 hover:text-teal-900">
            <Plus className="h-4 w-4" /> Add Item
          </button>
        </div>

        <div className="space-y-4">
          {visibleIndices.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
              No line items match “{searchTerm}”.
            </p>
          )}
          {visibleIndices.map((index) => {
            const li = lineItems[index];
            return (
            <div key={index} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                <select
                  className="input flex-1"
                  value={li.itemId}
                  onChange={e => handleItemSelect(index, e.target.value)}
                >
                  <option value="">Select item…</option>
                  {state.items.map(item => (
                    <option key={item.id} value={item.id}>{item.name} · {item.hsnSac}</option>
                  ))}
                </select>
                <button onClick={() => removeLineItem(index)} className="btn-ghost hover:!text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="label !mb-1 text-xs">Quantity</label>
                  <input type="number" min={1} className="input" value={li.qty}
                    onChange={e => updateLine(index, { qty: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label !mb-1 text-xs">Rate (Rs.)</label>
                  <input type="number" min={0} className="input" value={li.rate}
                    onChange={e => updateLine(index, { rate: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label !mb-1 text-xs">Discount (Rs.)</label>
                  <input type="number" min={0} className="input" value={li.discount}
                    onChange={e => updateLine(index, { discount: Number(e.target.value) })} />
                </div>
              </div>

              <div className="mt-3 flex justify-between border-t border-slate-200 pt-2 text-sm">
                <span className="text-slate-500">Line Amount</span>
                <span className="font-bold text-slate-900">
                  {formatNPR((li.qty * li.rate) - li.discount)}
                </span>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Summary + internal status + payment */}
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Summary</h2>

        {/* INTERNAL Paid / Unpaid selector — never printed */}
        <div className="mb-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <EyeOff className="h-3.5 w-3.5" /> Billing Status
            </p>
            <div className="flex rounded-lg bg-slate-200/70 p-1">
              {(['PAID', 'UNPAID'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setBillStatus(s)}
                  className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                    billStatus === s
                      ? s === 'PAID' ? 'bg-green-600 text-white shadow-sm' : 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s === 'PAID' ? 'Paid' : 'Unpaid'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600"><span>Gross Total</span><span>{formatNPR(subtotal)}</span></div>
          {isPanRegistered ? (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <b>PAN registered:</b> VAT is not charged on sales. Only income tax applies at year-end.
            </div>
          ) : (
            <div className="flex justify-between text-slate-600"><span>VAT (13%)</span><span>{formatNPR(vat)}</span></div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
            <span>Grand Total</span><span>{formatNPR(total)}</span>
          </div>
          <div className="mt-2 rounded-lg bg-teal-50 p-2 text-xs text-teal-800">
            <span className="font-semibold">In Words: </span>{amountInWords(total)}
          </div>
        </div>

        {/* Mode of Payment — only when Paid */}
        {billStatus === 'PAID' && (
          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="mb-2 text-sm font-semibold text-slate-800">Mode of Payment</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button onClick={() => switchMode('CASH')}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${payMode === 'CASH' ? 'bg-teal-800 text-white shadow-sm' : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
                <Banknote className="h-4 w-4" /> Cash
              </button>
              <button onClick={() => switchMode('QR')}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${payMode === 'QR' ? 'bg-teal-800 text-white shadow-sm' : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
                <QrCode className="h-4 w-4" /> QR Scan
              </button>
              <button onClick={() => switchMode('SPLIT')}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${payMode === 'SPLIT' ? 'bg-teal-800 text-white shadow-sm' : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
                <Wallet className="h-4 w-4" /> Partial Cash + QR
              </button>
            </div>

            {payMode === 'CASH' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="label !mb-1 text-xs">Cash Tendered (Rs.)</label>
                  <input type="number" min={0} className="input" value={tendered || ''} placeholder={String(Math.round(total))}
                    onChange={e => setTendered(Number(e.target.value))} />
                </div>
                <div className="flex items-end pb-1">
                  <p className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900">Change: {formatNPR(change)}</p>
                </div>
              </div>
            )}

            {payMode === 'QR' && (
              <p className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-xs font-medium text-teal-900">
                Full amount {formatNPR(total)} will be recorded as a QR / digital payment.
              </p>
            )}

            {payMode === 'SPLIT' && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label !mb-1 text-xs">Cash Portion (Rs.)</label>
                    <input type="number" min={0} className="input" value={cashPart || ''} placeholder="0"
                      onChange={e => setCashPart(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="label !mb-1 text-xs">QR Portion (Rs.)</label>
                    <input type="number" min={0} className="input" value={qrPart || ''} placeholder="0"
                      onChange={e => setQrPart(Number(e.target.value))} />
                  </div>
                </div>
                <p className={`rounded-lg px-3 py-2 text-xs font-semibold ${splitRemaining > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                  {splitRemaining > 0
                    ? `Received ${formatNPR(splitSum)} — remaining ${formatNPR(splitRemaining)} will stay outstanding.`
                    : `Fully covered: Cash ${formatNPR(cashPart)} + QR ${formatNPR(qrPart)}. Invoice will be PAID.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}