import { ChevronLeft, ChevronRight } from 'lucide-react';
import { localToday, monthGrid, monthLabel, monthOf, shiftMonth } from '../../lib/format';

// Month grid. `renderDay(key)` returns the cell body; exceptions mark holidays.
export default function AttendanceCalendar({ month, onMonthChange, selected, onSelect, renderDay, exceptions = [], compact }) {
  const today = localToday();
  const exBy = Object.fromEntries(exceptions.map((e) => [e.date, e]));
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h2 className="font-semibold">{monthLabel(month)}</h2>
        <div className="flex gap-1.5">
          <button onClick={() => onMonthChange(shiftMonth(month, -1))} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => onMonthChange(localToday())} className="rounded-lg border border-zinc-200 px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50">Today</button>
          <button onClick={() => onMonthChange(shiftMonth(month, 1))} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className={`py-2 text-center text-[11px] font-bold uppercase tracking-wider ${d === 'Sun' ? 'text-rose-400' : 'text-zinc-500'}`}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-zinc-100">
        {monthGrid(month).map((d) => {
          const inMonth = monthOf(d) === monthOf(month);
          const ex = exBy[d];
          const sunday = new Date(`${d}T00:00:00Z`).getUTCDay() === 0;
          const off = (sunday && ex?.type !== 'Working Sunday') || ex?.type === 'Holiday';
          return (
            <button
              key={d}
              onClick={() => onSelect?.(d)}
              className={`flex flex-col justify-between p-1.5 text-left transition-colors ${compact ? 'min-h-14' : 'min-h-20'} ${
                d === selected ? 'bg-zinc-100 ring-1 ring-inset ring-zinc-900/25' : !inMonth ? 'bg-zinc-50/70 text-zinc-300' : off ? 'bg-rose-50/40 hover:bg-rose-50' : 'bg-white hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${d === today ? 'bg-zinc-900 text-white' : inMonth ? 'text-zinc-700' : ''}`}>{Number(d.slice(8))}</span>
                {inMonth && ex && <span className={`truncate rounded px-1 text-[9px] font-semibold ${ex.type === 'Holiday' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`} title={ex.description}>{ex.type === 'Holiday' ? 'Holiday' : 'Working'}</span>}
              </div>
              {inMonth && renderDay?.(d)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
