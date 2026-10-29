import { useState } from 'react';
import { Briefcase, Search, User, X } from 'lucide-react';
import Spinner from '../ui/Spinner';

function Pill({ label, value, tone }) {
  const on = value > 0;
  const tones = { red: 'border-red-100 bg-red-50/80 text-red-700', green: 'border-emerald-100 bg-emerald-50/80 text-emerald-700', blue: 'border-blue-100 bg-blue-50/80 text-blue-700' };
  return (
    <div className={`flex flex-col items-center justify-center rounded-md border px-1 py-1.5 text-center ${on ? tones[tone] : 'border-zinc-100 bg-zinc-50 text-zinc-400 opacity-60'}`}>
      <span className="text-[9px] font-bold uppercase tracking-tight">{label}</span>
      <span className="mt-1 text-xs font-bold leading-none tabular-nums">{value}</span>
    </div>
  );
}

export default function ClientColumn({ clients, selectedId, onSelect, onDismiss, loading }) {
  const [q, setQ] = useState('');
  const shown = clients.filter((c) => [c.businessName, c.contactPerson].some((v) => v?.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="flex h-[420px] flex-col lg:h-[calc(100vh-250px)]">
      <div className="mb-3 flex items-center justify-between border-b border-zinc-100 px-1 pb-3">
        <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-zinc-700" /><h3 className="font-semibold">Customers</h3></div>
        <span className="rounded-md border border-zinc-200 bg-white px-2 text-xs font-bold text-zinc-600 shadow-sm">{shown.length}</span>
      </div>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer…" className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10" />
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4 pr-1">
        {loading && !clients.length ? (
          <Spinner />
        ) : shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-400">{q ? 'No matching customers.' : 'No customers with work yet. Assign a service from a customer page.'}</p>
        ) : (
          shown.map((c) => {
            const sel = c._id === selectedId;
            const completed = c.total > 0 && c.unscheduled === 0 && c.scheduled === 0;
            return (
              <div
                key={c._id}
                onClick={() => onSelect(c._id)}
                className={`group relative cursor-pointer overflow-hidden rounded-xl border p-3 pl-4 shadow-sm transition-all ${
                  sel
                    ? completed ? 'border-emerald-400/50 bg-emerald-50/60 ring-1 ring-emerald-500/20' : 'border-zinc-900/30 bg-zinc-50 ring-1 ring-zinc-900/10'
                    : completed ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300' : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md'
                }`}
              >
                {sel && <div className={`absolute bottom-0 left-0 top-0 w-1 ${completed ? 'bg-emerald-500' : 'bg-zinc-900'}`} />}
                {completed && (
                  <button onClick={(e) => { e.stopPropagation(); onDismiss(c._id); }} title="Dismiss customer" className="absolute right-2 top-2 rounded-full p-1 text-emerald-700 hover:bg-emerald-200/70">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className={`mb-2.5 flex items-start justify-between gap-2 ${completed ? 'pr-6' : ''}`}>
                  <div className="min-w-0">
                    <h4 className={`truncate text-sm font-bold ${completed ? 'text-emerald-800' : 'text-zinc-900'}`}>{c.businessName}</h4>
                    {c.contactPerson && (
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500"><User className="h-3 w-3 text-zinc-400" /><span className="truncate">{c.contactPerson}</span></div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total</span>
                    <span className="mt-0.5 min-w-6 rounded-md border border-zinc-200 bg-zinc-50 px-1 text-center text-xs font-semibold tabular-nums">{c.total}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <Pill label="Unscheduled" value={c.unscheduled} tone="red" />
                  <Pill label="Scheduled" value={c.scheduled} tone="green" />
                  <Pill label="Completed" value={c.completed} tone="blue" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
