import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../store/AuthStore';
import type { RegistrationType } from '../store/AuthStore';

const PENDING_SIGNUP_KEY = 'OfficeBill_pending_signup';

export default function Signup() {
  const { requestSignupOtp } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [registrationType, setRegistrationType] = useState<RegistrationType>('PAN');
  const [panVat, setPanVat] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!businessName.trim()) { setError('Business name is required.'); return; }
    if (!/^\d{9}$/.test(panVat.trim())) { setError('PAN/VAT number must be exactly 9 digits.'); return; }
    if (!name.trim()) { setError('Your name is required.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    // Step 1 done → generate + "send" OTP, park the payload, go verify
    const res = requestSignupOtp(email);
    if (!res.ok) { setError(res.error ?? 'Could not send verification code.'); return; }

    localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify({
      businessName: businessName.trim(),
      registrationType,
      panVat: panVat.trim(),
      address: address.trim(),
      phone: phone.trim(),
      name: name.trim(),
      email: email.trim(),
      password,
    }));
    navigate('/verify-otp');
  };

  return (
    <AuthLayout>
      <div className="card p-6 sm:p-8">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <UserPlus className="h-5 w-5 text-teal-800" /> Create your account
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Step 1 of 2 — business & owner details. We'll email a verification code next.
        </p>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <form className="mt-5 space-y-4" onSubmit={submit}>
          <div>
            <label className="label">Business Name *</label>
            <input className="input" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Sharma Trading Concern" />
          </div>

          <div>
            <label className="label">Tax Registration Type *</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setRegistrationType('PAN')}
                className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  registrationType === 'PAN' ? 'border-teal-800 bg-teal-800 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}>
                PAN <span className="mt-0.5 block text-[11px] font-normal opacity-80">No VAT charged</span>
              </button>
              <button type="button" onClick={() => setRegistrationType('VAT')}
                className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  registrationType === 'VAT' ? 'border-teal-800 bg-teal-800 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}>
                VAT <span className="mt-0.5 block text-[11px] font-normal opacity-80">13% VAT on sales</span>
              </button>
            </div>
          </div>

          <div>
            <label className="label">{registrationType === 'VAT' ? 'VAT No.' : 'PAN No.'} *</label>
            <input className="input font-mono" value={panVat} maxLength={9} inputMode="numeric"
              onChange={e => setPanVat(e.target.value.replace(/\D/g, ''))} placeholder="9-digit number" />
          </div>

          <div>
            <label className="label">Address</label>
            <input className="input" value={address} onChange={e => setAddress(e.target.value)} />
          </div>

          <div>
            <label className="label">Phone</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <div className="border-t border-slate-200 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Owner / Admin user</p>
            <div className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="label">Email (login) *</label>
                <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Password *</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} className="input pr-10" value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" title={showPass ? 'Hide password' : 'Show password'}>
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirm *</label>
                  <div className="relative">
                    <input type={showConfirm ? 'text' : 'password'} className="input pr-10" value={confirm} onChange={e => setConfirm(e.target.value)} />
                    <button type="button" onClick={() => setShowConfirm(s => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" title={showConfirm ? 'Hide password' : 'Show password'}>
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full">Send Verification Code</button>
          <p className="text-center text-xs text-slate-500">
            Already have an account?{' '}
            <button type="button" className="font-medium text-teal-800 underline" onClick={() => navigate('/login')}>Log in</button>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}