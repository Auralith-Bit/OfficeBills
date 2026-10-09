import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import type { RegistrationType } from '../store/AuthStore';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';

export default function Settings() {
  const { state, actions } = useAppStore();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState(() => ({
    name: state.business.name,
    address: state.business.address,
    phone: state.business.phone,
    email: state.business.email,
    panVat: state.business.panVat,
    registrationType: state.business.registrationType,
    footerNote: state.business.footerNote,
  }));

  // Keep in sync if the store changes elsewhere (e.g. signup sync)
  useEffect(() => {
    setForm(f => ({ ...f, ...state.business }));
  }, [state.business]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name.trim()) { alert('Business name is required.'); return; }
    if (!/^\d{9}$/.test(form.panVat.trim())) { alert('PAN/VAT number must be exactly 9 digits.'); return; }
    actions.setBusiness({
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      panVat: form.panVat.trim(),
      registrationType: form.registrationType as RegistrationType,
      footerNote: form.footerNote,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        subtitle="Basic business information printed on your documents."
        icon={SettingsIcon}
        actions={
          <button className="btn-primary" onClick={save}>
            <Save className="h-4 w-4" /> {saved ? 'Saved ✓' : 'Save Changes'}
          </button>
        }
      />

      {saved && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          Settings saved. New invoices will use this information.
        </div>
      )}

      <SectionCard>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Business Profile</h2>

          <div>
            <label className="label">Business Name *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={e => set('address', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Tax Registration Type *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set('registrationType', 'PAN')}
                className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                  form.registrationType === 'PAN'
                    ? 'border-teal-800 bg-teal-800 text-white shadow-sm'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                PAN
                <span className="mt-1 block text-[11px] font-normal opacity-80">No VAT charged</span>
              </button>
              <button
                type="button"
                onClick={() => set('registrationType', 'VAT')}
                className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                  form.registrationType === 'VAT'
                    ? 'border-teal-800 bg-teal-800 text-white shadow-sm'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                VAT
                <span className="mt-1 block text-[11px] font-normal opacity-80">13% VAT on sales</span>
              </button>
            </div>
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {form.registrationType === 'PAN'
                ? '✓ PAN registered — invoices will NOT include 13% VAT.'
                : '✓ VAT registered — invoices will include 13% VAT on taxable items.'}
            </p>
          </div>

          <div>
            <label className="label">{form.registrationType === 'VAT' ? 'VAT No.' : 'PAN No.'} *</label>
            <input
              className="input font-mono"
              value={form.panVat}
              maxLength={9}
              inputMode="numeric"
              onChange={e => set('panVat', e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <div>
            <label className="label">Invoice Footer Note</label>
            <textarea
              className="input"
              rows={2}
              value={form.footerNote}
              onChange={e => set('footerNote', e.target.value)}
              placeholder="Printed at the bottom of every invoice"
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}