import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthGrid, monthLabel, monthOf, shiftMonth, localToday } from '../../lib/format';

// Small month calendar; `dayInfo(key)` may return { color } to draw a dot.
export default function MiniCalendar({ month, onMonthChange, selected, onSelect, dayInfo }) {
  const today = localToday();
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => onMonthChange(shiftMonth(month, -1))} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-semibold">{monthLabel(month)}</span>
        <button onClick={() => onMonthChange(shiftMonth(month, 1))} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-zinc-400">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {monthGrid(month).map((d) => {
          const info = dayInfo?.(d);
          const inMonth = monthOf(d) === monthOf(month);
          const isSel = d === selected;
          const isToday = d === today;
          return (
            <button
              key={d}
              onClick={() => onSelect(d)}
              className={`relative flex aspect-square items-center justify-center rounded-lg text-xs transition-colors ${
                isSel ? 'bg-zinc-900 font-semibold text-white' : isToday ? 'bg-zinc-100 font-semibold text-zinc-900' : inMonth ? 'text-zinc-700 hover:bg-zinc-100' : 'text-zinc-300 hover:bg-zinc-50'
              }`}
            >
              {Number(d.slice(8))}
              {info && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: info.color }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
