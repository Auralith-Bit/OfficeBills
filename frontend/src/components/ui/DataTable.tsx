import type { ReactNode } from 'react';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right';
  hideOnMobile?: boolean;
  mobilePrimary?: boolean;
}

export default function DataTable<T>({ columns, rows, rowKey, empty, mobileActions, footer }: {
  columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string;
  empty?: ReactNode; mobileActions?: (r: T) => ReactNode; footer?: ReactNode;
}) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>{columns.map(c => <th key={c.key} className={`th ${c.align === 'right' ? 'text-right' : ''}`}>{c.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(r => (
              <tr key={rowKey(r)} className="hover:bg-slate-50 transition-colors">
                {columns.map(c => <td key={c.key} className={`td ${c.align === 'right' ? 'text-right' : ''}`}>{c.render(r)}</td>)}
              </tr>
            ))}
          </tbody>
          {footer}
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-slate-100 md:hidden">
        {rows.map(r => {
          const primary = columns.find(c => c.mobilePrimary);
          const rest = columns.filter(c => c !== primary && !c.hideOnMobile);
          return (
            <div key={rowKey(r)} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1 space-y-1.5">
                {primary && <div className="mb-1">{primary.render(r)}</div>}
                {rest.map(c => (
                  <div key={c.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="shrink-0 text-slate-500">{c.header}</span>
                    <span className="text-right text-slate-700">{c.render(r)}</span>
                  </div>
                ))}
              </div>
              {mobileActions && <div className="flex shrink-0 gap-1">{mobileActions(r)}</div>}
            </div>
          );
        })}
      </div>

      {rows.length === 0 && (empty ?? <EmptyState />)}
    </>
  );
}