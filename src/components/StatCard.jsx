import Card from './ui/Card';

const TONES = { zinc: 'bg-zinc-100 text-zinc-700', green: 'bg-emerald-50 text-emerald-600', blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600', violet: 'bg-violet-50 text-violet-600' };

export default function StatCard({ label, value, icon: Icon, tone = 'zinc', sub, valueClass = '' }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        {Icon && <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${TONES[tone]}`}><Icon className="h-3.5 w-3.5" /></span>}
      </div>
      <div className={`mt-1.5 text-xl font-semibold tracking-tight tabular-nums ${valueClass}`}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-zinc-500">{sub}</div>}
    </Card>
  );
}
