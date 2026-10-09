import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiRequest } from '../utils/api';

export type Role = 'ADMIN' | 'CASHIER';
export type RegistrationType = 'PAN' | 'VAT';

export interface Vendor {
  id: string;
  businessName: string;
  registrationType: RegistrationType;
  panVat: string;
  address: string;
  phone: string;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  vendorId: string;
  name: string;
  email: string;
  password: string; // DEMO ONLY — backend will store bcrypt hashes
  role: Role;
  phone?: string;
  active: boolean;
}

export interface Session {
  userId: string;
  vendorId: string;
  token?: string;
  name?: string;
  email?: string;
  role?: Role;
}

interface SignupInput {
  businessName: string;
  registrationType: RegistrationType;
  panVat: string;
  address: string;
  phone: string;
  name: string;
  email: string;
  password: string;
}
interface StaffInput { name: string; email: string; role: Role; password?: string; phone?: string; }
type StaffPatch = Partial<Pick<UserAccount, 'name' | 'email' | 'phone' | 'role' | 'active'>>;
interface Result { ok: boolean; error?: string; }
interface ResetResult extends Result { otp?: string; }

interface ResetTicket { email: string; code: string; expiresAt: number; }

interface AuthContextValue {
  session: Session | null;
  currentUser: UserAccount | null;
  currentVendor: Vendor | null;
  staffUsers: UserAccount[];
  signup: (input: SignupInput) => Promise<Result> | Result;
  login: (email: string, password: string, remember?: boolean) => Promise<Result> | Result;
  logout: () => void;
  requestPasswordReset: (email: string) => ResetResult;
  resetPassword: (email: string, otp: string, newPassword: string) => Result;
  requestSignupOtp: (email: string) => ResetResult;
  confirmSignupOtp: (email: string, code: string) => Promise<Result> | Result;
  demoSignupOtp: string | null;
  addStaffUser: (input: StaffInput) => Promise<Result> | Result;
  updateStaffUser: (id: string, patch: StaffPatch) => Promise<Result> | Result;
  deleteStaffUser: (id: string) => Promise<Result> | Result;
}

const SESSION_KEY = 'OfficeBill_session';

const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const loadSession = (): Session | null => {
  const fromLocal = load<Session | null>(SESSION_KEY, null);
  if (fromLocal) return fromLocal;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthStoreProvider({ children }: { children: ReactNode }) {
  const [vendors, setVendors] = useState<Vendor[]>(() => load('OfficeBill_vendors', []));
  const [users, setUsers] = useState<UserAccount[]>(() =>
    load<UserAccount[]>('OfficeBill_users', []).map(u => ({
      ...u,
      active: u.active ?? true,
      role: u.role === 'ADMIN' ? 'ADMIN' : 'CASHIER',
    }))
  );
  const [session, setSession] = useState<Session | null>(loadSession);
  const [resetTicket, setResetTicket] = useState<ResetTicket | null>(null);
  const [signupTicket, setSignupTicket] = useState<ResetTicket | null>(null);

  const persistVendors = (v: Vendor[]) => { setVendors(v); localStorage.setItem('OfficeBill_vendors', JSON.stringify(v)); };
  const persistUsers = (u: UserAccount[]) => { setUsers(u); localStorage.setItem('OfficeBill_users', JSON.stringify(u)); };

  // Fetch initial auth state from Express backend on mount
  useEffect(() => {
    apiRequest<{ ok: boolean; vendors: Vendor[]; users: UserAccount[] }>('/auth/state')
      .then(res => {
        if (res.ok && res.data) {
          if (res.data.vendors && res.data.vendors.length > 0) persistVendors(res.data.vendors);
          if (res.data.users && res.data.users.length > 0) persistUsers(res.data.users);
        }
      })
      .catch(() => {});
  }, []);

  const persistSession = (s: Session | null, remember = true) => {
    setSession(s);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (s) {
      (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(s));
    }
  };

  const signup = async (input: SignupInput): Promise<Result> => {
    const email = input.email.trim().toLowerCase();
    
    // Send to Backend API
    const apiRes = await apiRequest<{ ok: boolean; user: UserAccount; vendor: Vendor; session: Session }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    if (apiRes.ok && apiRes.data) {
      const { user, vendor, session: sess } = apiRes.data;
      persistVendors([...vendors, vendor]);
      persistUsers([...users, user]);
      persistSession({ ...sess, name: user.name, email: user.email, role: user.role }, true);
      return { ok: true };
    }

    // Local fallback if backend offline
    if (users.some(u => u.email === email)) {
      return { ok: false, error: 'An account with this email already exists. Please log in.' };
    }
    const vendor: Vendor = {
      id: `v_${Date.now()}`,
      businessName: input.businessName.trim(),
      registrationType: input.registrationType,
      panVat: input.panVat.trim(),
      address: input.address.trim(),
      phone: input.phone.trim(),
      createdAt: new Date().toISOString(),
    };
    const user: UserAccount = {
      id: `u_${Date.now()}`,
      vendorId: vendor.id,
      name: input.name.trim(),
      email,
      password: input.password,
      role: 'ADMIN',
      phone: '',
      active: true,
    };
    persistVendors([...vendors, vendor]);
    persistUsers([...users, user]);
    persistSession({ userId: user.id, vendorId: vendor.id }, true);
    return { ok: true };
  };

  const login = async (email: string, password: string, remember = true): Promise<Result> => {
    const cleanEmail = email.trim().toLowerCase();

    // Call Express Backend API
    const apiRes = await apiRequest<{ ok: boolean; user: UserAccount; vendor: Vendor; session: Session }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    if (apiRes.ok && apiRes.data) {
      const { user, vendor, session: sess } = apiRes.data;
      if (!users.some(u => u.id === user.id)) persistUsers([...users, user]);
      if (!vendors.some(v => v.id === vendor.id)) persistVendors([...vendors, vendor]);
      persistSession({ ...sess, name: user.name, email: user.email, role: user.role }, remember);
      return { ok: true };
    }

    // Local Fallback if offline
    const user = users.find(u => u.email === cleanEmail);
    if (!user || user.password !== password) return { ok: false, error: apiRes.error || 'Invalid email or password.' };
    if (user.active === false) return { ok: false, error: 'This account has been deactivated. Contact your administrator.' };
    persistSession({ userId: user.id, vendorId: user.vendorId }, remember);
    return { ok: true };
  };

  const logout = () => persistSession(null);

  // ---------- OTP password reset ----------
  const requestPasswordReset = (email: string): ResetResult => {
    const user = users.find(u => u.email === email.trim().toLowerCase());
    if (!user) return { ok: false, error: 'No account found with this email address.' };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setResetTicket({ email: user.email, code, expiresAt: Date.now() + 10 * 60 * 1000 });
    return { ok: true, otp: code };
  };

  const resetPassword = (email: string, otp: string, newPassword: string): Result => {
    const ticket = resetTicket;
    if (!ticket || ticket.email !== email.trim().toLowerCase()) {
      return { ok: false, error: 'No active OTP request. Please request a new code.' };
    }
    if (Date.now() > ticket.expiresAt) return { ok: false, error: 'OTP expired. Please resend the code.' };
    if (ticket.code !== otp.trim()) return { ok: false, error: 'Incorrect OTP. Check the code and try again.' };
    if (newPassword.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    persistUsers(users.map(u => (u.email === ticket.email ? { ...u, password: newPassword } : u)));
    setResetTicket(null);
    return { ok: true };
  };

  // ---------- Signup email verification (OTP) ----------
  const requestSignupOtp = (email: string): ResetResult => {
    const clean = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(clean)) return { ok: false, error: 'Enter a valid email address.' };
    if (users.some(u => u.email === clean)) return { ok: false, error: 'An account with this email already exists. Please log in.' };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSignupTicket({ email: clean, code, expiresAt: Date.now() + 10 * 60 * 1000 });
    return { ok: true, otp: code };
  };

  const confirmSignupOtp = (email: string, code: string): Result => {
    const clean = email.trim().toLowerCase();
    if (!signupTicket || signupTicket.email !== clean) {
      return { ok: false, error: 'No active OTP request. Please start sign-up again.' };
    }
    if (Date.now() > signupTicket.expiresAt) return { ok: false, error: 'OTP expired. Please resend the code.' };
    if (signupTicket.code !== code.trim()) return { ok: false, error: 'Incorrect OTP. Check the code and try again.' };
    setSignupTicket(null);
    return { ok: true };
  };

  const demoSignupOtp = signupTicket?.code ?? null;

  // ---------- Staff accounts (real logins) ----------
  const staffUsers = users.filter(u => u.vendorId === session?.vendorId);

  const addStaffUser = async (input: StaffInput): Promise<Result> => {
    const vendorId = session?.vendorId;
    if (!vendorId) return { ok: false, error: 'You must be logged in to add staff.' };
    const email = input.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'Enter a valid email address.' };
    if (users.some(u => u.email === email)) return { ok: false, error: 'An account with this email already exists.' };

    const apiRes = await apiRequest<{ ok: boolean; user: UserAccount }>('/auth/staff', {
      method: 'POST',
      body: JSON.stringify({ vendorId, ...input }),
    });

    if (apiRes.ok && apiRes.data) {
      persistUsers([...users, apiRes.data.user]);
      return { ok: true };
    }

    const user: UserAccount = {
      id: `u_${Date.now()}`,
      vendorId,
      name: input.name.trim(),
      email,
      password: input.password && input.password.trim().length > 0 ? input.password.trim() : 'aura123',
      role: input.role,
      phone: input.phone?.trim() || '',
      active: true,
    };
    persistUsers([...users, user]);
    return { ok: true };
  };

  const updateStaffUser = async (id: string, patch: StaffPatch): Promise<Result> => {
    const target = users.find(u => u.id === id);
    if (!target) return { ok: false, error: 'Staff member not found.' };
    let p = { ...patch };
    if (p.email) {
      const email = p.email.trim().toLowerCase();
      if (users.some(u => u.email === email && u.id !== id)) return { ok: false, error: 'Email already in use by another account.' };
      p = { ...p, email };
    }
    const becomesNonAdmin = p.role !== undefined && p.role !== 'ADMIN' && target.role === 'ADMIN';
    const deactivating = p.active === false && target.active !== false;
    if (becomesNonAdmin || deactivating) {
      const activeAdmins = users.filter(u => u.vendorId === target.vendorId && u.role === 'ADMIN' && u.active !== false);
      if (activeAdmins.length <= 1) return { ok: false, error: 'Cannot demote or deactivate the last active Admin of this business.' };
    }

    await apiRequest(`/auth/staff/${id}`, { method: 'PUT', body: JSON.stringify(p) });
    persistUsers(users.map(u => (u.id === id ? { ...u, ...p } : u)));
    return { ok: true };
  };

  const deleteStaffUser = async (id: string): Promise<Result> => {
    const target = users.find(u => u.id === id);
    if (!target) return { ok: false, error: 'Staff member not found.' };
    if (session?.userId === id) return { ok: false, error: 'You cannot delete your own account.' };
    const activeAdmins = users.filter(u => u.vendorId === target.vendorId && u.role === 'ADMIN' && u.active !== false);
    if (target.role === 'ADMIN' && target.active !== false && activeAdmins.length <= 1) {
      return { ok: false, error: 'Cannot delete the last active Admin of this business.' };
    }

    await apiRequest(`/auth/staff/${id}`, { method: 'DELETE' });
    persistUsers(users.filter(u => u.id !== id));
    return { ok: true };
  };

  const currentUser = users.find(u => u.id === session?.userId) ?? (session ? {
    id: session.userId,
    vendorId: session.vendorId,
    name: session.name || 'Admin',
    email: session.email || '',
    role: session.role || 'ADMIN',
    active: true,
    password: '',
  } : null);
  const currentVendor = vendors.find(v => v.id === session?.vendorId) ?? null;

  return (
    <AuthContext.Provider value={{
      session, currentUser, currentVendor, staffUsers,
      signup, login, logout,
      requestPasswordReset, resetPassword,
      requestSignupOtp, confirmSignupOtp,
      demoSignupOtp,
      addStaffUser, updateStaffUser, deleteStaffUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthStoreProvider');
  return ctx;
}