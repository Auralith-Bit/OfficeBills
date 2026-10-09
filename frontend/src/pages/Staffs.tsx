import { useState } from 'react';
import { UsersRound, Plus, Pencil, Trash2, ShieldCheck, UserCog } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import DataTable, { type Column } from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAuth } from '../store/AuthStore';
import type { UserAccount, Role } from '../store/AuthStore';

const roleMeta: Record<Role, { label: string; tone: 'purple' | 'blue'; icon: LucideIcon; blurb: string }> = {
  ADMIN: { label: 'Admin', tone: 'purple', icon: ShieldCheck, blurb: 'Full access — settings, staff, all modules, deletions.' },
  CASHIER: { label: 'Cashier', tone: 'blue', icon: UserCog, blurb: 'POS, sales invoices, Payment In, parties & inventory view.' },
};

interface FormState { name: string; email: string; phone: string; role: Role; password: string; }

export default function Staffs() {
  const { staffUsers, currentUser, addStaffUser, updateStaffUser, deleteStaffUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', email: '', phone: '', role: 'CASHIER', password: '' });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', role: 'CASHIER', password: '' });
    setOpen(true);
  };
  const openEdit = (s: UserAccount) => {
    setEditing(s);
    setForm({ name: s.name, email: s.email, phone: s.phone ?? '', role: s.role, password: '' });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { alert('Name is required.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { alert('Enter a valid email address.'); return; }
    if (editing) {
      const res = await updateStaffUser(editing.id, { name: form.name.trim(), email: form.email, phone: form.phone, role: form.role });
      if (!res.ok) { alert(res.error); return; }
    } else {
      if (form.password && form.password.length < 6) { alert('Password must be at least 6 characters (or leave blank for default "aura123").'); return; }
      const res = await addStaffUser({ name: form.name, email: form.email, phone: form.phone, role: form.role, password: form.password });
      if (!res.ok) { alert(res.error); return; }
    }
    setOpen(false);
  };

  const toggleActive = async (s: UserAccount) => {
    if (s.id === currentUser?.id) { alert('You cannot deactivate your own account.'); return; }
    const res = await updateStaffUser(s.id, { active: s.active === false });
    if (!res.ok) alert(res.error);
  };

  const remove = async (s: UserAccount) => {
    if (!confirm(`Remove ${s.name}? They will no longer be able to log in.`)) return;
    const res = await deleteStaffUser(s.id);
    if (!res.ok) alert(res.error);
  };

  const columns: Column<UserAccount>[] = [
    {
      key: 'name', header: 'Staff', mobilePrimary: true,
      render: s => (
        <div>
          <p className="font-medium text-slate-900">
            {s.name}
            {s.id === currentUser?.id && <span className="ml-2 rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-900">YOU</span>}
          </p>
          <p className="text-xs text-slate-500">{s.email}{s.phone ? ` · ${s.phone}` : ''}</p>
        </div>
      ),
    },
    {
      key: 'role', header: 'Role',
      render: s => {
        const meta = roleMeta[s.role];
        return (
          <Badge tone={meta.tone}>
            <span className="flex items-center gap-1"><meta.icon className="h-3 w-3" /> {meta.label}</span>
          </Badge>
        );
      },
    },
    { key: 'access', header: 'Key Access', hideOnMobile: true, render: s => <span className="text-xs text-slate-500">{roleMeta[s.role].blurb}</span> },
    {
      key: 'status', header: 'Status',
      render: s => (
        <button onClick={() => toggleActive(s)} title="Click to toggle active/inactive">
          <Badge tone={s.active !== false ? 'green' : 'slate'}>{s.active !== false ? 'Active' : 'Inactive'}</Badge>
        </button>
      ),
    },
    {
      key: 'actions', header: '', hideOnMobile: true, align: 'right',
      render: s => (
        <div className="flex justify-end gap-1">
          <button className="btn-ghost hover:!text-teal-800" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></button>
          {s.id !== currentUser?.id && (
            <button className="btn-ghost hover:!text-red-600" onClick={() => remove(s)}><Trash2 className="h-4 w-4" /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Manage Staffs" subtitle="Team members with real login accounts and role-based access." icon={UsersRound}
        actions={<button className="btn-primary" onClick={openAdd}><Plus className="h-4 w-4" /> Add Staff</button>}
      />

      <SectionCard bodyClassName="p-0">
        <DataTable
          columns={columns} rows={staffUsers} rowKey={s => s.id}
          mobileActions={s => (
            <>
              <button className="btn-ghost hover:!text-teal-800" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></button>
              {s.id !== currentUser?.id && (
                <button className="btn-ghost hover:!text-red-600" onClick={() => remove(s)}><Trash2 className="h-4 w-4" /></button>
              )}
            </>
          )}
        />
      </SectionCard>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Staff' : 'Add Staff'}
        footer={<>
          <button className="btn-outline flex-1" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={save}>{editing ? 'Update' : 'Create Account'}</button>
        </>}>
        <div className="space-y-4">
          <div><label className="label">Full Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div>
            <label className="label">Role *</label>
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}>
              <option value="ADMIN">Admin — full access</option>
              <option value="CASHIER">Cashier — billing & receipts</option>
            </select>
            <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <b className="text-slate-800">{roleMeta[form.role].label}:</b> {roleMeta[form.role].blurb}
            </p>
          </div>
          <div><label className="label">Email (login) *</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="staff@business.com" /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          {!editing && (
            <div>
              <label className="label"> Password</label>
              <input type="text" className="input font-mono" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="" />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}