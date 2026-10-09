import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'No records found', description, action, icon: Icon = Inbox }: {
  title?: string; description?: string; action?: ReactNode; icon?: typeof Inbox;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="rounded-full bg-slate-100 p-3 text-slate-400"><Icon className="h-6 w-6" /></div>
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}