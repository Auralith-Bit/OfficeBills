import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { Item } from '../../store/AppStore';
import { formatNPR } from '../../utils/nepaliDate';

interface Props {
  items: Item[];
  value: string;                                  // selected item id
  onSelect: (itemId: string) => void;
  placeholder?: string;
}

export default function ItemPicker({ items, value, onSelect, placeholder = 'Search item by name or code…' }: Props) {
  const selected = items.find(i => i.id === value);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const term = q.trim().toLowerCase();
  const results = (term
    ? items.filter(i => i.name.toLowerCase().includes(term) || i.hsnSac.toLowerCase().includes(term))
    : items
  ).slice(0, 8);

  return (
    <div ref={boxRef} className="relative flex-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder={placeholder}
          value={open ? q : (selected?.name ?? '')}
          onFocus={() => { setOpen(true); setQ(''); }}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
        />
      </div>
      {open && (
        <div className="absolute left-0 right-0 z-40 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {results.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">No items match “{q}”.</p>}
          {results.map(i => (
            <button
              key={i.id}
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-teal-50"
              onClick={() => { onSelect(i.id); setOpen(false); setQ(''); }}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-800">{i.name}</span>
                <span className="block text-xs text-slate-500">
                  {i.type === 'PRODUCT' ? `${i.stock} ${i.unit} left` : 'Service'} · Code {i.hsnSac}
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-slate-700">{formatNPR(i.price)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}