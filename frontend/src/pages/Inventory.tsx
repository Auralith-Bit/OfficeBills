import { useState, type ChangeEvent } from 'react';
import { Package, Plus, Search, Pencil, SlidersHorizontal, Trash2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import DataTable, { type Column } from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAppStore } from '../store/AppStore';
import type { Item } from '../store/AppStore';
import { formatNPR } from '../utils/nepaliDate';

interface FormState {
  name: string; type: 'PRODUCT' | 'SERVICE'; hsnSac: string; unit: string;
  price: string; stock: string; reorderLevel: string; taxRate: string;
}

// Reorder Level now starts at 0 — identical behaviour to Opening Stock
const emptyForm: FormState = { name: '', type: 'PRODUCT', hsnSac: '', unit: 'Pcs', price: '0', stock: '0', reorderLevel: '0', taxRate: '13' };

export default function Inventory() {
  const { state, actions } = useAppStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [adjust, setAdjust] = useState<{ item: Item; delta: string; reason: string } | null>(null);

  const term = search.trim().toLowerCase();
  const items = state.items.filter(i =>
    (typeFilter === 'ALL' || i.type === typeFilter) &&
    (!term || i.name.toLowerCase().includes(term) || i.hsnSac.toLowerCase().includes(term))
  );

  const openAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (i: Item) => {
    setEditing(i);
    setForm({
      name: i.name, type: i.type, hsnSac: i.hsnSac, unit: i.unit,
      price: String(i.price), stock: String(i.stock), reorderLevel: String(i.reorderLevel),
      taxRate: String(i.taxRate),
    });
    setOpen(true);
  };

  // Kills leading zeros while typing: "0" + "2" => "2", "02500" => "2500", "" stays empty
  const setNum = (key: 'price' | 'stock' | 'reorderLevel') => (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d.]/g, '');
    const normalized = raw === '' ? '' : String(Number(raw));
    setForm(f => ({ ...f, [key]: normalized }));
  };

  const save = () => {
    if (!form.name.trim()) { alert('Item name is required.'); return; }
    if (!form.unit.trim()) { alert('Unit is required.'); return; }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      hsnSac: form.hsnSac.trim() || '—',
      unit: form.unit.trim(),
      price: Number(form.price) || 0,
      taxRate: Number(form.taxRate) || 0,
      stock: form.type === 'SERVICE' ? 0 : (Number(form.stock) || 0),
      reorderLevel: form.type === 'SERVICE' ? 0 : (Number(form.reorderLevel) || 0),
    };
    if (editing) actions.updateItem({ ...payload, id: editing.id });
    else actions.addItem(payload);
    setOpen(false);
  };

  const remove = (i: Item) => {
    if (!confirm(`Delete "${i.name}"? This cannot be undone.`)) return;
    actions.deleteItem(i.id);
  };

  const applyAdjust = () => {
    if (!adjust) return;
    const delta = Number(adjust.delta);
    if (!delta) { alert('Enter a non-zero adjustment (e.g. 5 or -3).'); return; }
    actions.adjustStock(adjust.item.id, delta, adjust.reason.trim() || 'Manual adjustment');
    setAdjust(null);
  };

  // ---- Columns exactly as the original layout ----
  const columns: Column<Item>[] = [
    {
      key: 'name', header: 'Item', mobilePrimary: true,
      render: i => (
        <div>
          <p className="font-medium text-slate-900">{i.name}</p>
          <span className="mt-1 inline-block">
            <Badge tone={i.type === 'PRODUCT' ? 'blue' : 'purple'}>{i.type === 'PRODUCT' ? 'Product' : 'Service'}</Badge>
          </span>
        </div>
      ),
    },
    { key: 'hsnSac', header: 'HSN/SAC', hideOnMobile: true, render: i => <span className="font-mono text-sm text-slate-600">{i.hsnSac}</span> },
    { key: 'price', header: 'Price', hideOnMobile: true, render: i => <span className="text-slate-600">{formatNPR(i.price)}</span> },
    { key: 'taxRate', header: 'VAT', hideOnMobile: true, render: i => <Badge tone={i.taxRate === 0 ? 'slate' : 'green'}>{i.taxRate}%</Badge> },
    {
      key: 'stock', header: 'Stock',
      render: i => i.type === 'SERVICE'
        ? <span className="text-slate-400">—</span>
        : <span className="font-semibold text-slate-900">{i.stock} {i.unit}</span>,
    },
    {
      key: 'reorderLevel', header: 'Reorder At', hideOnMobile: true,
      render: i => i.type === 'SERVICE' ? <span className="text-slate-400">—</span> : <span className="text-slate-600">{i.reorderLevel}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: i => i.type === 'SERVICE'
        ? <Badge tone="slate">Service</Badge>
        : i.stock <= i.reorderLevel
          ? <Badge tone="amber">Low stock</Badge>
          : <Badge tone="green">In stock</Badge>,
    },
    {
      key: 'actions', header: '', hideOnMobile: true, align: 'right',
      render: i => (
        <div className="flex justify-end gap-1">
          <button className="btn-ghost hover:!text-teal-800" title="Adjust stock" onClick={() => setAdjust({ item: i, delta: '', reason: '' })}>
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button className="btn-ghost hover:!text-teal-800" title="Edit" onClick={() => openEdit(i)}>
            <Pencil className="h-4 w-4" />
          </button>
          <button className="btn-ghost hover:!text-red-600" title="Delete" onClick={() => remove(i)}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Inventory" subtitle="Products and services available for billing." icon={Package}
        actions={<button className="btn-primary" onClick={openAdd}><Plus className="h-4 w-4" /> Add Item</button>}
      />

      {/* ---- Search bar + type filter ---- */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search items by name or HSN/SAC code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1">
          {(['ALL', 'PRODUCT', 'SERVICE'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                typeFilter === t ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'ALL' ? 'All' : t === 'PRODUCT' ? 'Products' : 'Services'}
            </button>
          ))}
        </div>
      </div>

      <SectionCard bodyClassName="p-0">
        <DataTable
          columns={columns} rows={items} rowKey={i => i.id}
          mobileActions={i => (
            <>
              <button className="btn-ghost hover:!text-teal-800" onClick={() => setAdjust({ item: i, delta: '', reason: '' })}>
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              <button className="btn-ghost hover:!text-teal-800" onClick={() => openEdit(i)}>
                <Pencil className="h-4 w-4" />
              </button>
              <button className="btn-ghost hover:!text-red-600" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        />
      </SectionCard>

      {/* ---- Add / Edit item modal ---- */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Item' : 'Add New Item'}
        footer={<>
          <button className="btn-outline flex-1" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={save}>{editing ? 'Save Changes' : 'Save Item'}</button>
        </>}>
        <div className="space-y-4">
          {/* Product / Service segmented toggle */}
          <div className="flex rounded-lg bg-slate-100 p-1">
            {(['PRODUCT', 'SERVICE'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setForm(f => ({
                  ...f,
                  type: t,
                  unit: t === 'SERVICE' ? 'Service' : (f.unit === 'Service' ? 'Pcs' : f.unit),
                }))}
                className={`flex-1 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${
                  form.type === t ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t === 'PRODUCT' ? 'Product' : 'Service'}
              </button>
            ))}
          </div>

          <div>
            <label className="label">Item Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">HSN/SAC Code</label>
              <input className="input font-mono" value={form.hsnSac} onChange={e => setForm(f => ({ ...f, hsnSac: e.target.value }))} />
            </div>
            <div>
              <label className="label">Unit *</label>
              <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                {form.type === 'PRODUCT'
                  ? ['Pcs', 'Kg', 'Ltr', 'Box', 'Set'].map(u => <option key={u} value={u}>{u}</option>)
                  : ['Service', 'Hour', 'Day', 'Visit'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Sale Price (Rs.) *</label>
            <input type="number" min={0} className="input" value={form.price} onChange={setNum('price')} />
          </div>

          <div>
            <label className="label">VAT % *</label>
            <select className="input" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))}>
              <option value={13}>13% VAT</option>
              <option value={0}>0% (VAT exempt)</option>
            </select>
          </div>

          {form.type === 'PRODUCT' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Opening Stock</label>
                <input type="number" min={0} className="input" value={form.stock} onChange={setNum('stock')} />
              </div>
              <div>
                <label className="label">Reorder Level</label>
                <input type="number" min={0} className="input" value={form.reorderLevel} onChange={setNum('reorderLevel')} />
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ---- Stock adjust modal ---- */}
      <Modal open={!!adjust} onClose={() => setAdjust(null)} title={`Adjust Stock — ${adjust?.item.name ?? ''}`}
        footer={<>
          <button className="btn-outline flex-1" onClick={() => setAdjust(null)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={applyAdjust}>Apply Adjustment</button>
        </>}>
        {adjust && (
          <div className="space-y-4">
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Current stock: <b className="text-slate-900">{adjust.item.stock} {adjust.item.unit}</b>
            </p>
            <div>
              <label className="label">Change (+ add / − remove) *</label>
              <input type="number" className="input" value={adjust.delta} placeholder="e.g. 10 or -2"
                onChange={e => setAdjust({ ...adjust, delta: e.target.value })} />
            </div>
            <div>
              <label className="label">Reason</label>
              <input className="input" value={adjust.reason} placeholder="e.g. stock count, damaged goods…"
                onChange={e => setAdjust({ ...adjust, reason: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}