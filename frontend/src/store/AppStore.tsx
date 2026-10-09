import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { todayBS, last7DaysBS, type BSDate } from '../utils/nepaliDate';
import { apiRequest } from '../utils/api';
import { useAuth } from './AuthStore';

// ---------------- Types ----------------
export type PartyType = 'CUSTOMER' | 'SUPPLIER';
export interface Party { id: string; name: string; type: PartyType; panVatType: 'PAN' | 'VAT'; panVat: string; address: string; phone: string; }
export interface Item { id: string; name: string; type: 'PRODUCT' | 'SERVICE'; hsnSac: string; unit: string; price: number; taxRate: number; stock: number; reorderLevel: number; }
export interface InvoiceLine { itemId: string; name: string; qty: number; rate: number; discount: number; taxRate: number; }
export type InvoiceStatus = 'PAID' | 'UNPAID' | 'OVERDUE' | 'DRAFT';
export interface Invoice { id: string; number: string; dateBS: string; partyId: string; lines: InvoiceLine[]; subtotal: number; vat: number; total: number; status: InvoiceStatus; }
export interface Payment { id: string; type: 'IN' | 'OUT'; dateBS: string; partyId: string; invoiceId?: string; purchaseId?: string; amount: number; method: 'CASH' | 'BANK' | 'DIGITAL'; remarks?: string; note?: string; }
export interface StockMovement { id: string; dateBS: string; itemId: string; type: 'IN' | 'OUT' | 'ADJUST'; qty: number; reason: string; ref?: string; }
export interface Expense { id: string; dateBS: string; category: string; amount: number; note?: string; }
export interface OtherIncome { id: string; dateBS: string; source: string; amount: number; note?: string; }
export interface Quotation { id: string; number: string; dateBS: string; partyId: string; lines: InvoiceLine[]; subtotal: number; vat: number; total: number; status: 'OPEN' | 'CONVERTED' | 'CANCELLED'; }
export interface ReturnLine { itemId: string; name: string; qty: number; rate: number; taxRate: number; }
export interface SalesReturn { id: string; number: string; dateBS: string; partyId: string; invoiceId?: string; lines: ReturnLine[]; total: number; settlement: 'CASH' | 'CREDIT'; }
export interface Purchase { id: string; number: string; supplierBillNo?: string; dateBS: string; partyId: string; lines: InvoiceLine[]; subtotal: number; vat: number; total: number; status: 'UNPAID' | 'PAID'; }
export interface PurchaseReturn { id: string; number: string; dateBS: string; partyId: string; purchaseId?: string; lines: ReturnLine[]; total: number; settlement: 'CASH' | 'CREDIT'; }
export interface DueEntry { id: string; dateBS: string; partyId: string; invoiceId?: string; invoiceNumber?: string; type: 'ADD' | 'REDUCE'; amount: number; note?: string; }
export interface Business { name: string; address: string; phone: string; email: string; panVat: string; registrationType: 'PAN' | 'VAT'; invoicePrefix: string; nextInvoiceNo: number; nextQuoteNo: number; nextReturnNo: number; nextPurchaseNo: number; nextPurchaseReturnNo: number; bankName: string; bankAccountName: string; bankAccountNumber: string; footerNote: string; }

export interface AppState {
  business: Business;
  parties: Party[]; items: Item[]; invoices: Invoice[]; payments: Payment[];
  stockMovements: StockMovement[]; expenses: Expense[]; otherIncomes: OtherIncome[];
  quotations: Quotation[]; salesReturns: SalesReturn[];
  purchases: Purchase[]; purchaseReturns: PurchaseReturn[];
  dues: DueEntry[];
}

const uid = () => Math.random().toString(36).slice(2, 10);
const pad4 = (n: number) => String(n).padStart(4, '0');

export const DEFAULT_WALK_IN_CUSTOMER: Party = {
  id: 'p_default_walkin',
  name: 'Walk-in Customer',
  type: 'CUSTOMER',
  panVatType: 'PAN',
  panVat: '',
  address: '',
  phone: '',
};

// ---------------- Initial Empty State ----------------
const initialEmptyState: AppState = {
  business: {
    name: '', address: '',
    phone: '', email: '', panVat: '',
    registrationType: 'VAT', invoicePrefix: 'INV-', nextInvoiceNo: 1, nextQuoteNo: 1, nextReturnNo: 1,
    nextPurchaseNo: 1, nextPurchaseReturnNo: 1,
    bankName: '', bankAccountName: '',
    bankAccountNumber: '', footerNote: 'Thank you for your business!',
  },
  parties: [DEFAULT_WALK_IN_CUSTOMER],
  items: [],
  invoices: [],
  payments: [],
  stockMovements: [],
  expenses: [],
  otherIncomes: [],
  quotations: [],
  salesReturns: [],
  purchases: [],
  purchaseReturns: [],
  dues: [],
};

// ---------------- Internal helpers ----------------
// VAT is computed per line from each line's taxRate (0% or 13%):
// the default comes from the business registration / item, but can be overridden per line
const lineTotals = (_business: Business, lines: InvoiceLine[]) => {
  const subtotal = lines.reduce((a, l) => a + (l.qty * l.rate - l.discount), 0);
  const vat = lines.reduce((a, l) => a + (l.qty * l.rate - l.discount) * l.taxRate / 100, 0);
  return { subtotal, vat, total: subtotal + vat };
};

const buildInvoice = (s: AppState, partyId: string, lines: InvoiceLine[]): Invoice => ({
  id: uid(),
  number: `${s.business.invoicePrefix}${pad4(s.business.nextInvoiceNo)}`,
  dateBS: todayBS().formatted, partyId, lines, ...lineTotals(s.business, lines), status: 'UNPAID',
});

const ARRAY_KEYS = [
  'parties', 'items', 'invoices', 'payments', 'stockMovements', 'expenses',
  'salesReturns', 'purchases', 'purchaseReturns', 'dues',
] as const;

const withArrayDefaults = (incoming: Partial<AppState>): AppState => {
  const filled: Record<string, unknown> = { ...incoming };
  ARRAY_KEYS.forEach(k => { if (!Array.isArray(filled[k])) filled[k] = []; });
  const partiesList = (filled.parties as Party[]) || [];
  if (!partiesList.some(p => p.name.trim().toLowerCase() === 'walk-in customer')) {
    partiesList.unshift(DEFAULT_WALK_IN_CUSTOMER);
  }
  return {
    ...initialEmptyState,
    ...filled,
    parties: partiesList,
    business: { ...initialEmptyState.business, ...(incoming.business ?? {}) }
  } as AppState;
};

const stockOut = (s: AppState, lines: InvoiceLine[], ref: string) => {
  const items = s.items.map(it => {
    const line = lines.find(l => l.itemId === it.id && it.type === 'PRODUCT');
    return line ? { ...it, stock: it.stock - line.qty } : it;
  });
  const movements: StockMovement[] = lines
    .filter(l => s.items.find(i => i.id === l.itemId)?.type === 'PRODUCT')
    .map(l => ({ id: uid(), dateBS: todayBS().formatted, itemId: l.itemId, type: 'OUT' as const, qty: l.qty, reason: 'Sale', ref }));
  return { items, movements };
};

const stockIn = (s: AppState, lines: InvoiceLine[], ref: string, reason: string) => {
  const items = s.items.map(it => {
    const line = lines.find(l => l.itemId === it.id && it.type === 'PRODUCT');
    return line ? { ...it, stock: it.stock + line.qty } : it;
  });
  const movements: StockMovement[] = lines
    .filter(l => s.items.find(i => i.id === l.itemId)?.type === 'PRODUCT')
    .map(l => ({ id: uid(), dateBS: todayBS().formatted, itemId: l.itemId, type: 'IN' as const, qty: l.qty, reason, ref }));
  return { items, movements };
};

// ---------------- Store ----------------
interface Actions {
  setBusiness: (patch: Partial<Business>) => void;
  addParty: (p: Omit<Party, 'id'>) => void;
  updateParty: (p: Party) => void;
  deleteParty: (id: string) => void;
  addItem: (i: Omit<Item, 'id'>) => void;
  updateItem: (i: Item) => void;
  deleteItem: (id: string) => void;
  createInvoice: (partyId: string, lines: InvoiceLine[]) => Invoice;
  updateInvoice: (id: string, partyId: string, lines: InvoiceLine[]) => Invoice | undefined;
  deleteInvoice: (id: string) => void;
  addDueEntry: (partyId: string, type: 'ADD' | 'REDUCE', amount: number, note?: string, invoiceId?: string, invoiceNumber?: string) => void;
  deleteDueEntry: (id: string) => void;
  recordPaymentIn: (invoiceId: string, amount: number, method: Payment['method']) => void;
  addExpense: (e: Omit<Expense, 'id' | 'dateBS'>) => void;
  addOtherIncome: (o: Omit<OtherIncome, 'id' | 'dateBS'>) => void;
  adjustStock: (itemId: string, delta: number, reason: string) => void;
  createQuotation: (partyId: string, lines: InvoiceLine[]) => Quotation;
  convertQuotation: (id: string) => Invoice | undefined;
  cancelQuotation: (id: string) => void;
  createSalesReturn: (partyId: string, invoiceId: string | undefined, lines: ReturnLine[], settlement: 'CASH' | 'CREDIT') => SalesReturn;
  createPurchase: (partyId: string, lines: InvoiceLine[], supplierBillNo?: string) => Purchase;
  recordPaymentOut: (purchaseId: string, amount: number, method: Payment['method'], note?: string) => void;
  addPaymentOut: (partyId: string, amount: number, method: Payment['method'], note?: string) => void;
  linkPaymentToPurchase: (paymentId: string, purchaseId: string) => void;
  createPurchaseReturn: (partyId: string, purchaseId: string | undefined, lines: ReturnLine[], settlement: 'CASH' | 'CREDIT') => PurchaseReturn;
}

const AppStoreContext = createContext<{ state: AppState; actions: Actions } | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [state, setState] = useState<AppState>(initialEmptyState);

  // Sync with MySQL backend when loaded or vendor session changes
  useEffect(() => {
    const url = session?.vendorId ? `/data?vendorId=${session.vendorId}` : '/data';
    apiRequest<{ ok: boolean; data: AppState }>(url)
      .then(res => {
        // res.data is the full API response: { ok, data: AppState }
        // So the actual AppState lives inside res.data.data
        if (res.ok && res.data && res.data.data) {
          const incoming = res.data.data;
          // Only replace state if backend returned non-empty useful data
          if (incoming.business && incoming.business.name) {
            setState(withArrayDefaults(incoming));
          }
        }
      })
      .catch(() => {
        // Backend offline — keep using local state
      });
  }, [session?.vendorId]);

  const syncTimeoutRef = useRef<any>(null);
  const latestStateRef = useRef<AppState>(initialEmptyState);

  // Keep latestStateRef always updated with current state
  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  const updateAndSync = (updater: (s: AppState) => AppState) => {
    setState(current => {
      const next = updater(current);
      latestStateRef.current = next;

      // Debounce slightly (100ms) to coalesce rapid updates and prevent React StrictMode duplicates
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        apiRequest('/data/sync', {
          method: 'POST',
          body: JSON.stringify({ ...latestStateRef.current, vendorId: session?.vendorId }),
        })
          .then(res => {
            if (!res.ok) {
              console.warn('⚠️ Data sync warning:', res.error);
            } else {
              console.log('✅ Data synchronized to MySQL backend successfully');
            }
          })
          .catch(err => {
            console.error('❌ Data sync error:', err);
          });
      }, 100);

      return next;
    });
  };

  const actions: Actions = {
    setBusiness: (patch) => updateAndSync(s => ({ ...s, business: { ...s.business, ...patch } })),
    addParty: (p) => updateAndSync(s => ({ ...s, parties: [{ ...p, id: uid() }, ...s.parties] })),
    updateParty: (p) => updateAndSync(s => ({ ...s, parties: s.parties.map(x => x.id === p.id ? p : x) })),
    deleteParty: (id) => updateAndSync(s => {
      const p = s.parties.find(x => x.id === id);
      if (p && p.name.trim().toLowerCase() === 'walk-in customer') {
        alert('Walk-in Customer is the default customer and cannot be deleted.');
        return s;
      }
      return { ...s, parties: s.parties.filter(x => x.id !== id) };
    }),
    addItem: (i) => updateAndSync(s => ({ ...s, items: [{ ...i, id: uid() }, ...s.items] })),
    updateItem: (i) => updateAndSync(s => ({ ...s, items: s.items.map(x => x.id === i.id ? i : x) })),
    deleteItem: (id) => updateAndSync(s => ({ ...s, items: s.items.filter(x => x.id !== id) })),

    createInvoice: (partyId, lines) => {
      const inv = buildInvoice(state, partyId, lines);
      const dueEntry: DueEntry = {
        id: uid(),
        dateBS: inv.dateBS,
        partyId,
        invoiceId: inv.id,
        invoiceNumber: inv.number,
        type: 'ADD',
        amount: inv.total,
        note: `Invoice ${inv.number}`,
      };
      updateAndSync(s => {
        const { items, movements } = stockOut(s, lines, inv.number);
        return {
          ...s, items,
          invoices: [inv, ...s.invoices],
          dues: [dueEntry, ...s.dues],
          stockMovements: [...movements, ...s.stockMovements],
          business: { ...s.business, nextInvoiceNo: s.business.nextInvoiceNo + 1 },
        };
      });
      return inv;
    },

    updateInvoice: (id, partyId, lines) => {
      const existing = state.invoices.find(v => v.id === id);
      if (!existing) return undefined;
      const totals = lineTotals(state.business, lines);
      const updated: Invoice = { ...existing, partyId, lines, ...totals };
      updateAndSync(s => {
        const items = s.items.map(it => {
          if (it.type !== 'PRODUCT') return it;
          const oldQty = existing.lines.find(l => l.itemId === it.id)?.qty ?? 0;
          const newQty = lines.find(l => l.itemId === it.id)?.qty ?? 0;
          return oldQty || newQty ? { ...it, stock: it.stock + oldQty - newQty } : it;
        });
        const movements: StockMovement[] = [];
        s.items.forEach(it => {
          if (it.type !== 'PRODUCT') return;
          const oldQty = existing.lines.find(l => l.itemId === it.id)?.qty ?? 0;
          const newQty = lines.find(l => l.itemId === it.id)?.qty ?? 0;
          const delta = oldQty - newQty;
          if (delta !== 0) movements.push({ id: uid(), dateBS: todayBS().formatted, itemId: it.id, type: delta > 0 ? 'IN' : 'OUT', qty: Math.abs(delta), reason: `Invoice edited (${existing.number})` });
        });
        const paid = s.payments.filter(p => p.invoiceId === id && p.type === 'IN').reduce((a, p) => a + p.amount, 0);
        const credits = s.salesReturns.filter(r => r.invoiceId === id).reduce((a, r) => a + r.total, 0);
        const status: InvoiceStatus = paid + credits >= updated.total ? 'PAID' : 'UNPAID';
        return { ...s, items, stockMovements: [...movements, ...s.stockMovements], invoices: s.invoices.map(v => (v.id === id ? { ...updated, status } : v)) };
      });
      return updated;
    },

    deleteInvoice: (id) => updateAndSync(s => {
      const inv = s.invoices.find(v => v.id === id);
      if (!inv) return s;
      const items = s.items.map(it => {
        const line = inv.lines.find(l => l.itemId === it.id && it.type === 'PRODUCT');
        return line ? { ...it, stock: it.stock + line.qty } : it;
      });
      return {
        ...s,
        items,
        invoices: s.invoices.filter(v => v.id !== id),
        payments: s.payments.filter(p => p.invoiceId !== id),
        dues: s.dues.filter(d => d.invoiceId !== id),
      };
    }),

    // ---- Dues ledger actions ----
    addDueEntry: (partyId, type, amount, note, invoiceId, invoiceNumber) => updateAndSync(s => ({
      ...s,
      dues: [{
        id: uid(),
        dateBS: todayBS().formatted,
        partyId,
        invoiceId: invoiceId || undefined,
        invoiceNumber: invoiceNumber || undefined,
        type,
        amount,
        note: note?.trim() || undefined
      }, ...s.dues],
    })),

    deleteDueEntry: (id) => updateAndSync(s => ({ ...s, dues: s.dues.filter(d => d.id !== id) })),

    recordPaymentIn: (invoiceId, amount, method) => updateAndSync(s => {
      const inv = s.invoices.find(v => v.id === invoiceId);
      if (!inv) return s;
      const payment: Payment = { id: uid(), type: 'IN', dateBS: todayBS().formatted, partyId: inv.partyId, invoiceId, amount, method };
      const paid = s.payments.filter(p => p.invoiceId === invoiceId && p.type === 'IN').reduce((a, p) => a + p.amount, 0) + amount;
      const credits = s.salesReturns.filter(r => r.invoiceId === invoiceId).reduce((a, r) => a + r.total, 0);
      const isPaid = paid + credits >= inv.total;

      const dueReduction: DueEntry = {
        id: uid(),
        dateBS: todayBS().formatted,
        partyId: inv.partyId,
        invoiceId: inv.id,
        invoiceNumber: inv.number,
        type: 'REDUCE',
        amount,
        note: `Payment for ${inv.number}`,
      };

      return {
        ...s,
        payments: [payment, ...s.payments],
        dues: [dueReduction, ...s.dues],
        invoices: s.invoices.map(v => v.id === invoiceId ? { ...v, status: isPaid ? 'PAID' : 'UNPAID' } : v),
      };
    }),

    addExpense: (e) => updateAndSync(s => ({ ...s, expenses: [{ ...e, id: uid(), dateBS: todayBS().formatted }, ...s.expenses] })),
    addOtherIncome: (o) => updateAndSync(s => ({ ...s, otherIncomes: [{ ...o, id: uid(), dateBS: todayBS().formatted }, ...s.otherIncomes] })),
    adjustStock: (itemId, delta, reason) => updateAndSync(s => ({
      ...s,
      items: s.items.map(i => i.id === itemId ? { ...i, stock: i.stock + delta } : i),
      stockMovements: [{ id: uid(), dateBS: todayBS().formatted, itemId, type: delta >= 0 ? 'IN' : 'OUT', qty: Math.abs(delta), reason }, ...s.stockMovements],
    })),

    createQuotation: (partyId, lines) => {
      const q: Quotation = {
        id: uid(), number: `QT-${pad4(state.business.nextQuoteNo)}`,
        dateBS: todayBS().formatted, partyId, lines, ...lineTotals(state.business, lines), status: 'OPEN',
      };
      updateAndSync(s => ({ ...s, quotations: [q, ...s.quotations], business: { ...s.business, nextQuoteNo: s.business.nextQuoteNo + 1 } }));
      return q;
    },

    convertQuotation: (id) => {
      const q = state.quotations.find(x => x.id === id);
      if (!q || q.status !== 'OPEN') return undefined;
      const inv = buildInvoice(state, q.partyId, q.lines);
      updateAndSync(s => {
        const { items, movements } = stockOut(s, q.lines, inv.number);
        return {
          ...s, items,
          invoices: [inv, ...s.invoices],
          quotations: s.quotations.map(x => x.id === id ? { ...x, status: 'CONVERTED' as const } : x),
          stockMovements: [...movements, ...s.stockMovements],
          business: { ...s.business, nextInvoiceNo: s.business.nextInvoiceNo + 1 },
        };
      });
      return inv;
    },

    cancelQuotation: (id) => updateAndSync(s => ({
      ...s, quotations: s.quotations.map(x => x.id === id ? { ...x, status: 'CANCELLED' as const } : x),
    })),

    createSalesReturn: (partyId, invoiceId, lines, settlement) => {
      const vat = lines.reduce((a, l) => a + l.qty * l.rate * l.taxRate / 100, 0);
      const sub = lines.reduce((a, l) => a + l.qty * l.rate, 0);
      const total = sub + vat;
      const ret: SalesReturn = {
        id: uid(), number: `SR-${pad4(state.business.nextReturnNo)}`,
        dateBS: todayBS().formatted, partyId, invoiceId, lines, total, settlement,
      };
      updateAndSync(s => {
        const negLines: InvoiceLine[] = lines.map(l => ({ itemId: l.itemId, name: l.name, qty: -l.qty, rate: l.rate, discount: 0, taxRate: l.taxRate }));
        const { items, movements } = stockIn(s, negLines, ret.number, 'Sales return');
        const payments = settlement === 'CASH'
          ? [{ id: uid(), type: 'OUT' as const, dateBS: ret.dateBS, partyId, amount: total, method: 'CASH' as const, note: `Refund ${ret.number}` }, ...s.payments]
          : s.payments;
        const invoices = s.invoices.map(v => {
          if (v.id !== invoiceId) return v;
          const paid = s.payments.filter(p => p.invoiceId === v.id && p.type === 'IN').reduce((a, p) => a + p.amount, 0);
          const credits = s.salesReturns.filter(r => r.invoiceId === v.id).reduce((a, r) => a + r.total, 0) + total;
          return { ...v, status: paid + credits >= v.total ? 'PAID' as const : v.status };
        });
        return {
          ...s, items, payments, invoices,
          salesReturns: [ret, ...s.salesReturns],
          stockMovements: [...movements, ...s.stockMovements],
          business: { ...s.business, nextReturnNo: s.business.nextReturnNo + 1 },
        };
      });
      return ret;
    },

    createPurchase: (partyId, lines, supplierBillNo) => {
      const pur: Purchase = {
        id: uid(), number: `PUR-${pad4(state.business.nextPurchaseNo)}`,
        supplierBillNo: supplierBillNo?.trim() || undefined,
        dateBS: todayBS().formatted, partyId, lines, ...lineTotals(state.business, lines), status: 'UNPAID',
      };
      updateAndSync(s => {
        const { items, movements } = stockIn(s, lines, pur.number, 'Purchase');
        return {
          ...s, items,
          purchases: [pur, ...s.purchases],
          stockMovements: [...movements, ...s.stockMovements],
          business: { ...s.business, nextPurchaseNo: s.business.nextPurchaseNo + 1 },
        };
      });
      return pur;
    },

    recordPaymentOut: (purchaseId, amount, method, note) => updateAndSync(s => {
      const pur = s.purchases.find(v => v.id === purchaseId);
      if (!pur) return s;
      const cleanRemark = note?.trim() || undefined;
      const payment: Payment = { id: uid(), type: 'OUT', dateBS: todayBS().formatted, partyId: pur.partyId, purchaseId, amount, method, remarks: cleanRemark, note: cleanRemark };
      const paid = s.payments.filter(p => p.purchaseId === purchaseId && p.type === 'OUT').reduce((a, p) => a + p.amount, 0) + amount;
      const credits = s.purchaseReturns.filter(r => r.purchaseId === purchaseId).reduce((a, r) => a + r.total, 0);
      return {
        ...s,
        payments: [payment, ...s.payments],
        purchases: s.purchases.map(v => v.id === purchaseId ? { ...v, status: paid + credits >= v.total ? 'PAID' : 'UNPAID' } : v),
      };
    }),

    addPaymentOut: (partyId, amount, method, note) => {
      const cleanRemark = note?.trim() || undefined;
      return updateAndSync(s => ({
        ...s,
        payments: [{ id: uid(), type: 'OUT' as const, dateBS: todayBS().formatted, partyId, amount, method, remarks: cleanRemark, note: cleanRemark }, ...s.payments],
      }));
    },

    linkPaymentToPurchase: (paymentId, purchaseId) => updateAndSync(s => {
      const pay = s.payments.find(p => p.id === paymentId);
      const pur = s.purchases.find(v => v.id === purchaseId);
      if (!pay || !pur) return s;
      const payments = s.payments.map(p => (p.id === paymentId ? { ...p, purchaseId, partyId: pur.partyId } : p));
      const paid = payments.filter(p => p.purchaseId === purchaseId && p.type === 'OUT').reduce((a, p) => a + p.amount, 0);
      const credits = s.purchaseReturns.filter(r => r.purchaseId === purchaseId).reduce((a, r) => a + r.total, 0);
      return {
        ...s, payments,
        purchases: s.purchases.map(v => (v.id === purchaseId ? { ...v, status: paid + credits >= v.total ? 'PAID' as const : 'UNPAID' as const } : v)),
      };
    }),

    createPurchaseReturn: (partyId, purchaseId, lines, settlement) => {
      const vat = lines.reduce((a, l) => a + l.qty * l.rate * l.taxRate / 100, 0);
      const sub = lines.reduce((a, l) => a + l.qty * l.rate, 0);
      const total = sub + vat;
      const ret: PurchaseReturn = {
        id: uid(), number: `PR-${pad4(state.business.nextPurchaseReturnNo)}`,
        dateBS: todayBS().formatted, partyId, purchaseId, lines, total, settlement,
      };
      updateAndSync(s => {
        const items = s.items.map(it => {
          const line = lines.find(l => l.itemId === it.id && it.type === 'PRODUCT');
          return line ? { ...it, stock: it.stock - line.qty } : it;
        });
        const movements: StockMovement[] = lines
          .filter(l => s.items.find(i => i.id === l.itemId)?.type === 'PRODUCT')
          .map(l => ({ id: uid(), dateBS: ret.dateBS, itemId: l.itemId, type: 'OUT' as const, qty: l.qty, reason: 'Purchase return', ref: ret.number }));
        const payments = settlement === 'CASH'
          ? [{ id: uid(), type: 'IN' as const, dateBS: ret.dateBS, partyId, amount: total, method: 'CASH' as const, note: `Supplier refund ${ret.number}` }, ...s.payments]
          : s.payments;
        const purchases = s.purchases.map(v => {
          if (v.id !== purchaseId) return v;
          const paid = s.payments.filter(p => p.purchaseId === v.id && p.type === 'OUT').reduce((a, p) => a + p.amount, 0);
          const credits = s.purchaseReturns.filter(r => r.purchaseId === v.id).reduce((a, r) => a + r.total, 0) + total;
          return { ...v, status: paid + credits >= v.total ? 'PAID' as const : v.status };
        });
        return {
          ...s, items, payments, purchases,
          purchaseReturns: [ret, ...s.purchaseReturns],
          stockMovements: [...movements, ...s.stockMovements],
          business: { ...s.business, nextPurchaseReturnNo: s.business.nextPurchaseReturnNo + 1 },
        };
      });
      return ret;
    },
  };

  return <AppStoreContext.Provider value={{ state, actions }}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used inside AppStoreProvider');
  return ctx;
}


// ---------------- Selectors ----------------
export const invoiceBalance = (s: AppState, inv: Invoice) => {
  const paid = s.payments.filter(p => p.invoiceId === inv.id && p.type === 'IN').reduce((a, p) => a + p.amount, 0);
  const credits = s.salesReturns.filter(r => r.invoiceId === inv.id).reduce((a, r) => a + r.total, 0);
  return Math.max(0, inv.total - paid - credits);
};

export const purchaseBalance = (s: AppState, pur: Purchase) => {
  const paid = s.payments.filter(p => p.purchaseId === pur.id && p.type === 'OUT').reduce((a, p) => a + p.amount, 0);
  const credits = s.purchaseReturns.filter(r => r.purchaseId === pur.id).reduce((a, r) => a + r.total, 0);
  return Math.max(0, pur.total - paid - credits);
};

export const toReceive = (s: AppState) => {
  const linkedInvoiceIds = new Set(s.dues.filter(d => d.invoiceId).map(d => d.invoiceId));
  const unlinkedInvDue = s.invoices
    .filter(v => v.status !== 'DRAFT' && !linkedInvoiceIds.has(v.id))
    .reduce((a, v) => a + invoiceBalance(s, v), 0);
  const ledgerDue = s.dues.reduce((a, d) => a + (d.type === 'ADD' ? d.amount : -d.amount), 0);
  return Math.max(0, unlinkedInvDue + ledgerDue);
};
export const toGive = (s: AppState) => s.purchases.reduce((a, v) => a + purchaseBalance(s, v), 0);

const inCurrentBSMonth = (dateBS: string) => dateBS.startsWith(`${todayBS().year}-${String(todayBS().month + 1).padStart(2, '0')}`);
export const salesThisMonth = (s: AppState) => s.invoices.filter(v => inCurrentBSMonth(v.dateBS)).reduce((a, v) => a + v.total, 0);
export const purchaseThisMonth = (s: AppState) => s.purchases.filter(v => inCurrentBSMonth(v.dateBS)).reduce((a, v) => a + v.total, 0);
export const expenseThisMonth = (s: AppState) => s.expenses.filter(e => inCurrentBSMonth(e.dateBS)).reduce((a, e) => a + e.amount, 0);

export const cashBankBalance = (s: AppState) => {
  const inn = s.payments.filter(p => p.type === 'IN').reduce((a, p) => a + p.amount, 0);
  const out = s.payments.filter(p => p.type === 'OUT').reduce((a, p) => a + p.amount, 0) + s.expenses.reduce((a, e) => a + e.amount, 0);
  return inn - out;
};

export const cashflowLast7Days = (s: AppState) => last7DaysBS().map((d: BSDate) => {
  const moneyIn = s.payments.filter(p => p.type === 'IN' && p.dateBS === d.formatted).reduce((a, p) => a + p.amount, 0);
  const moneyOut = s.payments.filter(p => p.type === 'OUT' && p.dateBS === d.formatted).reduce((a, p) => a + p.amount, 0)
    + s.expenses.filter(e => e.dateBS === d.formatted).reduce((a, e) => a + e.amount, 0);
  return { ...d, moneyIn, moneyOut };
});

export const lowStockItems = (s: AppState) => s.items.filter(i => i.type === 'PRODUCT' && i.stock <= i.reorderLevel);

export const manualDueBalance = (s: AppState, partyId: string) =>
  s.dues.filter(d => d.partyId === partyId).reduce((a, d) => a + (d.type === 'ADD' ? d.amount : -d.amount), 0);

export const totalCustomerDue = (s: AppState, partyId: string) => {
  const linkedInvoiceIds = new Set(s.dues.filter(d => d.partyId === partyId && d.invoiceId).map(d => d.invoiceId));
  const unlinkedInvoiceDue = s.invoices
    .filter(inv => inv.partyId === partyId && !linkedInvoiceIds.has(inv.id))
    .reduce((a, inv) => a + invoiceBalance(s, inv), 0);
  const ledgerDue = s.dues
    .filter(d => d.partyId === partyId)
    .reduce((a, d) => a + (d.type === 'ADD' ? d.amount : -d.amount), 0);
  return Math.max(0, unlinkedInvoiceDue + ledgerDue);
};