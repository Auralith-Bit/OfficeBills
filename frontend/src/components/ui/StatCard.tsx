import type { LucideIcon } from 'lucide-react';

const tones = {
  green: 'border-green-100 bg-green-50 text-green-600',
  red: 'border-red-100 bg-red-50 text-red-500',
  blue: 'border-teal-100 bg-teal-50 text-teal-800',
  amber: 'border-amber-100 bg-amber-50 text-amber-600',
  purple: 'border-purple-100 bg-purple-50 text-purple-600',
  slate: 'border-slate-200 bg-white text-slate-600',
};

export default function StatCard({ label, value, icon: Icon, tone = 'green', sub }: {
  label: string; value: string; icon: LucideIcon; tone?: keyof typeof tones; sub?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 shadow-card sm:p-5 ${tones[tone]}`}>
      <Icon className="h-5 w-5" />
      <p className="mt-3 text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}