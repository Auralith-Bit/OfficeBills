import { useMemo, useState } from 'react';
import { Users, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import DataTable, { type Column } from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAppStore, type Party } from '../store/AppStore';

export default function Parties() {
  const { state, actions } = useAppStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>('ALL');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);

  const rows = useMemo(() => state.parties.filter(p =>
    (filter === 'ALL' || p.type === filter) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.panVat.includes(search))
  ), [state.parties, filter, search]);

  const columns: Column<Party>[] = [
    {
      key: 'name', header: 'Name', mobilePrimary: true,
      render: p => (
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-slate-900">{p.name}</p>

          </div>
          <Badge tone={p.type === 'CUSTOMER' ? 'green' : 'purple'}>{p.type === 'CUSTOMER' ? 'Customer' : 'Supplier'}</Badge>
        </div>
      ),
    },
    {
      key: 'panVat', header: 'PAN/VAT',
      render: p => (
        <span className="inline-flex items-center gap-1.5">
          {p.panVat !== '—' && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{p.panVatType}</span>
          )}
          <span className="font-mono">{p.panVat}</span>
        </span>
      ),
    },
    { key: 'phone', header: 'Phone', render: p => p.phone },
    { key: 'address', header: 'Address', hideOnMobile: true, render: p => p.address },
    {
      key: 'actions', header: '', hideOnMobile: true, align: 'right',
      render: p => (
        <div className="flex justify-end gap-1">
          <button className="btn-ghost hover:!text-teal-800" title="Edit" onClick={() => { setEditing(p); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </button>
          {p.name.trim().toLowerCase() !== 'walk-in customer' && (
            <button className="btn-ghost hover:!text-red-600" title="Delete" onClick={() => confirm('Delete this party?') && actions.deleteParty(p.id)}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Parties" subtitle="Manage your customers and suppliers." icon={Users}
        actions={<button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Party</button>}
      />

      <SectionCard bodyClassName="p-0">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search by name or PAN/VAT…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {(['ALL', 'CUSTOMER', 'SUPPLIER'] as const).map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none ${filter === t ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                {t === 'ALL' ? 'All' : t === 'CUSTOMER' ? 'Customers' : 'Suppliers'}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns} rows={rows} rowKey={p => p.id}
          mobileActions={p => (
            <>
              <button className="btn-ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></button>
              {p.name.trim().toLowerCase() !== 'walk-in customer' && (
                <button className="btn-ghost hover:text-red-600" onClick={() => confirm('Delete this party?') && actions.deleteParty(p.id)}><Trash2 className="h-4 w-4" /></button>
              )}
            </>
          )}
          footer={
            <tfoot className="border-t border-slate-200 bg-slate-50">
              <tr><td className="td font-medium" colSpan={5}>{rows.length} parties</td></tr>
            </tfoot>
          }
        />
      </SectionCard>

      <PartyModal open={open} onClose={() => setOpen(false)} editing={editing} />
    </div>
  );
}

function PartyModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Party | null }) {
  const { actions } = useAppStore();
  const blank = (): Omit<Party, 'id'> => ({ name: '', type: 'CUSTOMER', panVatType: 'PAN', panVat: '', address: '', phone: '' });
  const fromParty = (p: Party): Omit<Party, 'id'> => ({ name: p.name, type: p.type, panVatType: p.panVatType, panVat: p.panVat, address: p.address, phone: p.phone });

  const [form, setForm] = useState<Omit<Party, 'id'>>(editing ? fromParty(editing) : blank());

  // refresh form when a different row is edited
  useMemo(() => {
    if (open) setForm(editing ? fromParty(editing) : blank());
  }, [open, editing]);

  const set = (k: keyof Omit<Party, 'id'>, v: string) => setForm(f => ({ ...f, [k]: v }) as Omit<Party, 'id'>);

  const save = () => {
    if (!form.name.trim()) return alert('Name is required');
    if (form.panVat && form.panVat !== '—' && !/^\d{9}$/.test(form.panVat)) {
      return alert(`${form.panVatType} number must be exactly 9 digits (or leave blank).`);
    }
    editing ? actions.updateParty({ ...form, id: editing.id }) : actions.addParty(form);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Party' : 'Add New Party'}
      footer={<>
        <button className="btn-outline flex-1" onClick={onClose}>Cancel</button>
        <button className="btn-primary flex-1" onClick={save}>{editing ? 'Update' : 'Save'}</button>
      </>}>
      <div className="space-y-4">
        <div className="flex rounded-lg bg-slate-100 p-1">
          {(['CUSTOMER', 'SUPPLIER'] as const).map(t => (
            <button key={t} type="button" onClick={() => set('type', t)}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${form.type === t ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}>
              {t === 'CUSTOMER' ? 'Customer' : 'Supplier'}
            </button>
          ))}
        </div>

        <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} /></div>

        {/* Registration type dropdown + its number */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Registration Type *</label>
            <select className="input" value={form.panVatType} onChange={e => set('panVatType', e.target.value)}>
              <option value="PAN">PAN</option>
              <option value="VAT">VAT</option>
            </select>
          </div>
          <div>
            <label className="label">{form.panVatType === 'VAT' ? 'VAT Number' : 'PAN Number'}</label>
            <input
              className="input font-mono"
              value={form.panVat}
              maxLength={9}
              inputMode="numeric"
              onChange={e => set('panVat', e.target.value.replace(/\D/g, ''))}
              placeholder={form.panVatType === 'VAT' ? '9-digit VAT number' : '9-digit PAN number'}
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-slate-500">
          {form.panVatType === 'VAT'
            ? 'VAT-registered parties allow input-tax (VAT deduction) claims on purchases.'
            : 'PAN parties are non-VAT; invoices to them carry no VAT credit.'}
        </p>

        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => set('address', e.target.value)} /></div>
      </div>
    </Modal>
  );
}