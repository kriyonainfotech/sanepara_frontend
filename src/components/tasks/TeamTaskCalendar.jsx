import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthGrid, monthLabel, monthOf, shiftMonth, localToday } from '../../lib/format';
import { DONE_COLOR, FUTURE_PENDING_COLOR, OVERDUE_COLOR, TODAY_COLOR, isDone } from '../../lib/taskConfig';

// Big month view with count chips: done (green), overdue (red), today (orange), upcoming (yellow).
export default function TeamTaskCalendar({ month, onMonthChange, selected, onSelect, tasks }) {
  const today = localToday();
  const byDay = {};
  for (const t of tasks) {
    const key = isDone(t.status) ? 'done' : t.dueDate < today ? 'overdue' : t.dueDate === today ? 'today' : 'future';
    const d = (byDay[t.dueDate] ||= {});
    d[key] = (d[key] || 0) + 1;
  }
  const COLORS = { done: DONE_COLOR, overdue: OVERDUE_COLOR, today: TODAY_COLOR, future: FUTURE_PENDING_COLOR };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h2 className="text-base font-semibold">{monthLabel(month)}</h2>
        <div className="flex gap-1.5">
          <button onClick={() => onMonthChange(shiftMonth(month, -1))} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => onMonthChange(shiftMonth(month, 1))} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-500">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-zinc-100">
        {monthGrid(month).map((d) => {
          const stats = byDay[d] || {};
          const inMonth = monthOf(d) === monthOf(month);
          const isSel = d === selected;
          return (
            <button
              key={d}
              onClick={() => onSelect(d)}
              className={`flex min-h-16 flex-col justify-between p-1.5 text-left transition-colors sm:p-2 ${isSel ? 'bg-zinc-100 ring-1 ring-inset ring-zinc-900/20' : inMonth ? 'bg-white hover:bg-zinc-50' : 'bg-zinc-50/60 text-zinc-300 hover:bg-zinc-50'}`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${d === today ? 'bg-zinc-900 text-white' : isSel ? 'text-zinc-900' : inMonth ? 'text-zinc-700' : ''}`}>
                {Number(d.slice(8))}
              </span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(stats).map(([k, n]) => (
                  <span key={k} className="flex items-center gap-1 rounded px-1 text-[9px] font-bold" style={{ backgroundColor: `${COLORS[k]}20`, color: COLORS[k] }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS[k] }} />{n}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
