import type { ReactNode } from 'react';

const tones = {
  green: 'border-green-200 bg-green-50 text-green-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  red: 'border-red-200 bg-red-50 text-red-700',
  blue: 'border-teal-300 bg-teal-50 text-teal-900',
  purple: 'border-purple-200 bg-purple-50 text-purple-700',
  slate: 'border-slate-200 bg-slate-100 text-slate-600',
};

export default function Badge({ tone = 'slate', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: 'PAID' | 'UNPAID' | 'OVERDUE' | 'DRAFT' }) {
  const map = { PAID: 'green', UNPAID: 'amber', OVERDUE: 'red', DRAFT: 'slate' } as const;
  return <Badge tone={map[status]}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}