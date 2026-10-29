// Segmented control. items: [{ key, label, count?, icon? }]
export default function Tabs({ items, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex max-w-full overflow-x-auto rounded-xl bg-zinc-100 p-1 ${className}`}>
      {items.map(({ key, label, count, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
            value === key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          {Icon && <Icon className="h-4 w-4" />}
          {label}
          {count !== undefined && (
            <span className={`rounded-md px-1.5 text-xs tabular-nums ${value === key ? 'bg-zinc-100 text-zinc-700' : 'text-zinc-400'}`}>{count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
