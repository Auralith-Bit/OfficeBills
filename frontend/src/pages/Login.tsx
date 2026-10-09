import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../store/AuthStore';

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');          // banner: wrong credentials
  const [fields, setFields] = useState<FieldErrors>({}); // per-textbox messages

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // ---- per-field validation ----
    const next: FieldErrors = {};
    if (!email.trim()) next.email = 'Email address is required.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    setFields(next);
    if (next.email || next.password) return; // stop here — show textbox errors

    // ---- credentials check ----
    const res = await login(email, password, remember);
    if (!res.ok) { setError(res.error ?? 'Login failed.'); return; }
    navigate('/');
  };

  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold text-slate-900">Sign in to your account</h2>
      <p className="mt-2 text-sm text-slate-500">Enter your details to continue.</p>

      {error && <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        {/* Email */}
        <div>
          <label className="label">Email address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              className={`input pl-9 ${fields.email ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setFields(f => ({ ...f, email: undefined })); }}
            />
          </div>
          {fields.email && <p className="mt-1.5 text-xs font-medium text-red-600">{fields.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={show ? 'text' : 'password'}
              className={`input pl-9 pr-10 ${fields.password ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''}`}
              placeholder="Enter your password"
              value={password}
              onChange={e => { setPassword(e.target.value); setFields(f => ({ ...f, password: undefined })); }}
            />
            {/* Eye icon toggle */}
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              title={show ? 'Hide password' : 'Show password'}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fields.password && <p className="mt-1.5 text-xs font-medium text-red-600">{fields.password}</p>}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-teal-800"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm font-semibold text-teal-800 hover:underline">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="btn-primary w-full !py-3 text-base">Sign in</button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium text-slate-400">OR</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <p className="text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <Link to="/signup" className="font-semibold text-teal-800 hover:underline">Create account</Link>
      </p>
    </AuthLayout>
  );
}