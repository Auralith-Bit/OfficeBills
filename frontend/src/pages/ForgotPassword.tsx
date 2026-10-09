import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound, Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../store/AuthStore';

type Step = 'email' | 'reset' | 'done';

export default function ForgotPassword() {
  const { requestPasswordReset, resetPassword } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const sendOtp = () => {
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    const res = requestPasswordReset(email);
    if (!res.ok) { setError(res.error ?? 'Could not send OTP.'); return; }
    setDemoOtp(res.otp ?? '');
    setOtp('');
    setStep('reset');
    setSeconds(30);
  };

  const submitReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(otp.trim())) { setError('Enter the 6-digit OTP.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    const res = resetPassword(email, otp, password);
    if (!res.ok) { setError(res.error ?? 'Reset failed.'); return; }
    setStep('done');
  };

  return (
    <AuthLayout>
      {/* ---------- STEP 1: email ---------- */}
      {step === 'email' && (
        <>
          <h2 className="text-3xl font-bold text-slate-900">Forgot your password?</h2>
          <p className="mt-2 text-sm text-slate-500">
            Enter the email linked to your business account and we'll send you a 6-digit OTP.
          </p>

          {error && <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

          <form onSubmit={e => { e.preventDefault(); sendOtp(); }} className="mt-8 space-y-5" noValidate>
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full !py-3 text-base">Send OTP</button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Remembered it? <Link to="/login" className="font-semibold text-teal-800 hover:underline">Sign in</Link>
          </p>
        </>
      )}

      {/* ---------- STEP 2: OTP + new password ---------- */}
      {step === 'reset' && (
        <>
          <h2 className="text-3xl font-bold text-slate-900">Verify & reset</h2>
          <p className="mt-2 text-sm text-slate-500">
            We sent a 6-digit code to <b className="text-slate-700">{email}</b>. Enter it below with your new password.
          </p>

          <div className="mt-4 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            Demo mode (no email gateway yet) — your OTP is{' '}
            <b className="font-mono text-sm tracking-widest">{demoOtp}</b>
          </div>

          {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

          <form onSubmit={submitReset} className="mt-6 space-y-5" noValidate>
            <div>
              <label className="label">6-digit OTP *</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9 font-mono tracking-[0.4em]"
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="••••••"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {seconds > 0 ? (
                  <>Resend available in {seconds}s</>
                ) : (
                  <button type="button" onClick={sendOtp} className="font-semibold text-teal-800 hover:underline">
                    Resend OTP
                  </button>
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">New Password *</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={show ? 'text' : 'password'}
                    className="input pl-9 pr-10"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    title={show ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm Password *</label>
                <input
                  type={show ? 'text' : 'password'}
                  className="input"
                  placeholder="Repeat new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full !py-3 text-base">Reset Password</button>
            <button
              type="button"
              onClick={() => { setStep('email'); setError(''); }}
              className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Use a different email
            </button>
          </form>
        </>
      )}

      {/* ---------- STEP 3: success ---------- */}
      {step === 'done' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-3 text-2xl font-bold text-slate-900">Password updated!</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your password has been changed successfully. Sign in with your new password.
          </p>
          <Link to="/login" className="btn-primary mt-5 inline-flex">Back to sign in</Link>
        </div>
      )}
    </AuthLayout>
  );
}