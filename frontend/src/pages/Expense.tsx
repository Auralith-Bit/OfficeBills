import { useMemo, useState } from 'react';
import { Wallet, Plus, PieChart, CalendarDays, Banknote } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import StatCard from '../components/ui/StatCard';
import DataTable, { type Column } from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAppStore, expenseThisMonth } from '../store/AppStore';
import type { Expense as ExpenseDoc } from '../store/AppStore';
import { todayBS, formatNPRCompact } from '../utils/nepaliDate';

const CATEGORIES = ['Rent', 'Salary', 'Electricity', 'Water', 'Internet', 'Transport', 'Marketing', 'Office Supplies', 'Maintenance', 'Tax & Fees', 'Other'];

export default function Expense() {
  const { state, actions } = useAppStore();
  const [filter, setFilter] = useState<'ALL' | string>('ALL');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: 'Rent', amount: '', note: '' });

  const today = todayBS().formatted;
  const monthKey = today.slice(0, 7);

  const rows = useMemo(
    () => state.expenses.filter(e => filter === 'ALL' || e.category === filter),
    [state.expenses, filter],
  );

  const spentToday = state.expenses.filter(e => e.dateBS === today).reduce((a, e) => a + e.amount, 0);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    state.expenses.filter(e => e.dateBS.startsWith(monthKey)).forEach(e => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [state.expenses, monthKey]);

  const columns: Column<ExpenseDoc>[] = [
    { key: 'date', header: 'Date (BS)', render: e => e.dateBS },
    {
      key: 'category', header: 'Category', mobilePrimary: true,
      render: e => (
        <div>
          <Badge tone="blue">{e.category}</Badge>
          {e.note && <p className="mt-0.5 text-xs text-slate-500">{e.note}</p>}
        </div>
      ),
    },
    { key: 'amount', header: 'Amount', align: 'right', render: e => <span className="font-semibold text-red-500">− {formatNPRCompact(e.amount)}</span> },
  ];

  const save = () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) { alert('Enter a valid amount.'); return; }
    actions.addExpense({ category: form.category, amount, note: form.note || undefined });
    setForm({ category: 'Rent', amount: '', note: '' });
    setOpen(false);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Expense" subtitle="Day-to-day business spending." icon={Wallet}
        actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Expense</button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Spent Today" value={formatNPRCompact(spentToday)} icon={Banknote} tone="red" />
        <StatCard label="Spent This Month" value={formatNPRCompact(expenseThisMonth(state))} icon={CalendarDays} tone="red" />
        <StatCard
          label="Top Category (Month)"
          value={byCategory[0]?.[0] ?? '—'}
          sub={byCategory[0] ? formatNPRCompact(byCategory[0][1]) : undefined}
          icon={PieChart} tone="amber"
        />
      </div>

      <SectionCard bodyClassName="p-0">
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 p-3">
          {['ALL', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === c ? 'bg-teal-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {c === 'ALL' ? 'All' : c}
            </button>
          ))}
        </div>
        <DataTable columns={columns} rows={rows} rowKey={e => e.id} />
      </SectionCard>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Expense"
        footer={<>
          <button className="btn-outline flex-1" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={save}>Save Expense</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="label">Category *</label>
            <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Amount (Rs.) *</label>
            <input type="number" min={0} className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <input className="input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g., Office rent for Bhadau" />
          </div>
        </div>
      </Modal>
    </div>
  );
}