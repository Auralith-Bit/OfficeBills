import type { Role } from '../store/AuthStore';

/** Where each role lands right after login */
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/',
  CASHIER: '/pos',
};

/** Route prefixes each role may open ('*' = everything) */
const ALLOW: Record<Role, string[]> = {
  ADMIN: ['*'],
  CASHIER: ['/', '/pos', '/parties', '/inventory', '/sales/invoices', '/sales/payment-in', '/sales/dues'], // ADDED /sales/dues
};

/** Explicit blocks that override ALLOW (checked first) */
const DENY: Record<Role, string[]> = {
  ADMIN: [],
  CASHIER: [],
};

export function canAccess(role: Role | undefined, path: string): boolean {
  const effectiveRole: Role = role || 'ADMIN';
  if (effectiveRole === 'ADMIN') return true;
  const denied = DENY[effectiveRole] ?? [];
  if (denied.some(d => path === d || path.startsWith(d + '/'))) return false;
  const allowed = ALLOW[effectiveRole] ?? [];
  if (allowed.includes('*')) return true;
  return allowed.some(a => path === a || path.startsWith(a + '/'));
}