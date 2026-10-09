import type { ReactNode } from 'react';

export default function SectionCard({ title, subtitle, actions, children, bodyClassName = 'p-4 sm:p-5' }: {
  title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode; bodyClassName?: string;
}) {
  return (
    <section className="card overflow-hidden">
      {(title || actions) && (
        <header className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-800">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}