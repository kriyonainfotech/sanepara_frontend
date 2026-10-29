import { useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import Popover from '../ui/Popover';

// Searchable single-select, e.g. the customer filter.
export default function SearchSelect({ options, value, onChange, allLabel = 'All', placeholder = 'Search…', className = '', width = 'w-48' }) {
  const [q, setQ] = useState('');
  const selected = options.find((o) => o.value === value);
  const shown = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <Popover
      className={className}
      panelClassName="w-72 p-2"
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className={`flex h-9 items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:border-zinc-300 ${width}`}>
          <span className="truncate">{selected?.label || allLabel}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        </button>
      )}
    >
      {({ close }) => {
        const pick = (v) => { onChange(v); setQ(''); close(); };
        return (
          <>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-8 w-full rounded-lg border border-zinc-200 pl-8 pr-2 text-xs focus:border-brand-500 focus:outline-none" />
            </div>
            <div className="max-h-64 overflow-y-auto">
              <button type="button" onClick={() => pick('all')} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-zinc-100">
                <Check className={`h-4 w-4 ${value === 'all' ? 'opacity-100' : 'opacity-0'}`} /> {allLabel}
              </button>
              {shown.length === 0 ? (
                <div className="px-2 py-5 text-center text-sm text-zinc-400">Nothing found.</div>
              ) : (
                shown.map((o) => (
                  <button key={o.value} type="button" onClick={() => pick(o.value)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-zinc-100">
                    <Check className={`h-4 w-4 shrink-0 ${value === o.value ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="truncate">{o.label}</span>
                  </button>
                ))
              )}
            </div>
          </>
        );
      }}
    </Popover>
  );
}
