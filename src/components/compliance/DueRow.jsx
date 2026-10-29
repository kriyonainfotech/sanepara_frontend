import { CheckCircle2 } from 'lucide-react';
import Badge from '../ui/Badge';
import { shortDay } from '../../lib/format';

// Compliance due dates, shared by the Compliance Calendar and the dashboard alerts.
export const CATEGORY_STYLE = {
  GST: { dot: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700' },
  'Income Tax': { dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700' },
  TDS: { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-800' },
  Trademark: { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700' },
  ROC: { dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700' },
  Other: { dot: 'bg-zinc-400', chip: 'bg-zinc-100 text-zinc-700' },
};
export const styleOf = (c) => CATEGORY_STYLE[c] || CATEGORY_STYLE.Other;

// Done / overdue / due today, for one occurrence.
export function DueBadge({ o, today }) {
  if (o.done) return <Badge tone="green"><CheckCircle2 className="h-3 w-3" />Done</Badge>;
  if (o.date < today) return <Badge tone="red">Overdue</Badge>;
  if (o.date === today) return <Badge tone="amber">Due today</Badge>;
  return null;
}

export function DueRow({ o, today, onOpen, showDate = true }) {
  return (
    <button onClick={() => onOpen?.(o)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${styleOf(o.category).dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`text-sm font-medium ${o.done ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>{o.title}</span>
          {o.period && <span className="text-xs text-zinc-500">{o.period}</span>}
          <DueBadge o={o} today={today} />
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-zinc-500">
          {showDate && <span>{shortDay(o.date)}{o.date !== o.original && <span className="text-amber-600"> (moved)</span>}</span>}
          <span>{o.category}</span>
          {o.customer?.businessName && <span>{o.customer.businessName}</span>}
          {o.customers !== undefined && <span>{o.customers} running customer{o.customers === 1 ? '' : 's'}</span>}
          {o.progress && <span>GST work {o.progress.completed}/{o.progress.total} done</span>}
        </div>
      </div>
    </button>
  );
}
