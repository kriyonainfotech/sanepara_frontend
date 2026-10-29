export default function Progress({ done, total, className = '' }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-zinc-900'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-zinc-500">{done}/{total}</span>
    </div>
  );
}
