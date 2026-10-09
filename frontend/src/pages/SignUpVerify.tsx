import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MailCheck, ShieldCheck } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../store/AuthStore';

export const PENDING_SIGNUP_KEY = 'OfficeBill_pending_signup';

interface PendingSignup {
  businessName: string; registrationType: 'PAN' | 'VAT'; panVat: string;
  address: string; phone: string; name: string; email: string; password: string;
}

export default function SignupVerify() {
  const navigate = useNavigate();
  const { signup, confirmSignupOtp, requestSignupOtp, demoSignupOtp } = useAuth();

  const [pending] = useState<PendingSignup | null>(() => {
    try {
      const raw = localStorage.getItem(PENDING_SIGNUP_KEY);
      return raw ? (JSON.parse(raw) as PendingSignup) : null;
    } catch {
      return null;
    }
  });

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(30);

  // No pending signup? bounce back to the form
  useEffect(() => {
    if (!pending) navigate('/signup', { replace: true });
  }, [pending, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    const t = setInterval(() => setCooldown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  if (!pending) return null;

  const verify = async () => {
    setError('');
    if (code.trim().length !== 6) { setError('Enter the 6-digit code.'); return; }
    const check = await confirmSignupOtp(pending.email, code);
    if (!check.ok) { setError(check.error ?? 'Verification failed.'); return; }
    const created = await signup(pending);
    if (!created.ok) { setError(created.error ?? 'Could not create the account.'); return; }
    localStorage.removeItem(PENDING_SIGNUP_KEY);
    navigate('/');
  };

  const resend = () => {
    setError('');
    const res = requestSignupOtp(pending.email);
    if (!res.ok) { setError(res.error ?? 'Could not resend the code.'); return; }
    setCode('');
    setCooldown(30);
    setNotice('A new verification code has been sent.');
  };

  return (
    <AuthLayout>
      <div className="card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
            <MailCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Verify your email</h1>
            <p className="text-sm text-slate-500">Step 2 of 2 — enter the code we sent to</p>
          </div>
        </div>
        <p className="mt-2 font-mono text-sm font-semibold text-slate-800">{pending.email}</p>

        {/* DEMO notice — real email arrives with the backend */}
        {demoSignupOtp && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <b>DEMO MODE:</b> email delivery arrives with the backend. Your code is{' '}
            <span className="font-mono text-base font-bold tracking-widest">{demoSignupOtp}</span>
          </p>
        )}
        {notice && <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">{notice}</p>}
        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-5">
          <label className="label">6-digit verification code *</label>
          <input
            className="input text-center font-mono text-2xl tracking-[0.5em]"
            value={code}
            maxLength={6}
            inputMode="numeric"
            placeholder="••••••"
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && verify()}
          />
        </div>

        <button className="btn-primary mt-4 w-full" onClick={verify}>
          <ShieldCheck className="h-4 w-4" /> Verify & Create Account
        </button>

        <div className="mt-4 flex items-center justify-between text-xs">
          <button className="font-medium text-teal-800 underline" onClick={() => navigate('/signup')}>
            <ArrowLeft className="mr-1 inline h-3 w-3" /> Edit details
          </button>
          <button
            className={`font-medium ${cooldown > 0 ? 'cursor-not-allowed text-slate-400' : 'text-teal-800 underline'}`}
            disabled={cooldown > 0}
            onClick={resend}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}