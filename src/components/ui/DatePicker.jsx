import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { localToday, monthGrid, monthLabel, shiftMonth } from '../../lib/format';
import { FloatingPanel, useEscape, useFloating } from './Floating';
import { changeEvent, RequiredProxy, triggerBase } from './fieldStyles';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');
const dayLabel = (key) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

// Drop-in replacement for <input type="date"> and <input type="month">.
// Values stay 'YYYY-MM-DD' / 'YYYY-MM'; min / max are honoured.
export default function DatePicker({ type = 'date', value, onChange, min, max, className = '', disabled, required, name, id, title, placeholder }) {
  const isMonth = type === 'month';
  const today = localToday();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(isMonth ? 'months' : 'days');
  const [cursor, setCursor] = useState(`${(value || today).slice(0, 7)}-01`); // first day of the shown month
  const close = useCallback(() => setOpen(false), []);
  const { anchorRef, panelRef, pos } = useFloating(open, close);
  const buttonRef = useRef(null);
  useEscape(open, () => { close(); buttonRef.current?.focus(); });

  useEffect(() => {
    if (!open) return;
    setView(isMonth ? 'months' : 'days');
    let start = value || today;
    if (!value && min && start < min) start = min;
    if (!value && max && start > max) start = max;
    setCursor(`${start.slice(0, 7)}-01`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commit = (v) => {
    if (v !== (value || '')) onChange?.(changeEvent(v, name));
    close();
    buttonRef.current?.focus();
  };

  const year = Number(cursor.slice(0, 4));
  const minMonth = min?.slice(0, 7);
  const maxMonth = max?.slice(0, 7);
  const dayOff = (key) => (min && key < min) || (max && key > max);
  const monthOff = (ym) => (minMonth && ym < minMonth) || (maxMonth && ym > maxMonth);
  const yearOff = (y) => (minMonth && String(y) < minMonth.slice(0, 4)) || (maxMonth && String(y) > maxMonth.slice(0, 4));
  const decade = year - (year % 12);

  const step = (n) => {
    if (view === 'days') setCursor(shiftMonth(cursor, n));
    else if (view === 'months') setCursor(`${year + n}-${cursor.slice(5, 7)}-01`);
    else setCursor(`${year + n * 12}-${cursor.slice(5, 7)}-01`);
  };

  const heading =
    view === 'days' ? monthLabel(cursor) : view === 'months' ? String(year) : `${decade} – ${decade + 11}`;
  const thisMonth = today.slice(0, 7);
  const display = value ? (isMonth ? monthLabel(value) : dayLabel(value)) : placeholder || (isMonth ? 'Select month' : 'Select date');

  // One class string per cell so text colours never fight each other.
  const cell = ({ selected, current, muted, sunday }) =>
    `rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent ${
      selected
        ? 'bg-brand-600 font-semibold text-white hover:bg-brand-700'
        : `hover:bg-zinc-100 ${current ? 'font-semibold ring-1 ring-inset ring-brand-500/40' : ''} ${muted ? 'text-zinc-300' : current ? 'text-brand-700' : sunday ? 'text-rose-500' : 'text-zinc-700'}`
    }`;

  return (
    <div ref={anchorRef} className={`relative w-full ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        title={title}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'ArrowDown' && (e.preventDefault(), setOpen(true))}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${triggerBase} ${open ? 'border-brand-500 ring-4 ring-brand-500/10' : ''}`}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-zinc-400" />
        <span className={`min-w-0 flex-1 truncate whitespace-nowrap ${value ? '' : 'text-zinc-400'}`}>{display}</span>
      </button>
      <RequiredProxy required={required} value={value} name={name} />

      {open && (
        <FloatingPanel panelRef={panelRef} pos={pos} role="dialog" className="w-72 p-3">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => step(-1)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900" aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView(view === 'days' ? 'months' : 'years')}
              disabled={view === 'years'}
              className="rounded-md px-2 py-1 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:hover:bg-transparent"
            >
              {heading}
            </button>
            <button type="button" onClick={() => step(1)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900" aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {view === 'days' && (
            <>
              <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-zinc-400">
                {WEEKDAYS.map((d, i) => <div key={i} className={`py-1 ${i === 0 ? 'text-rose-400' : ''}`}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {monthGrid(cursor).map((key, i) => {
                  const inMonth = key.slice(0, 7) === cursor.slice(0, 7);
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={dayOff(key)}
                      onClick={() => commit(key)}
                      className={`h-9 ${cell({ selected: key === value, current: key === today, muted: !inMonth, sunday: i % 7 === 0 })}`}
                    >
                      {Number(key.slice(8))}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {view === 'months' && (
            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((m, i) => {
                const ym = `${year}-${pad(i + 1)}`;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={monthOff(ym)}
                    onClick={() => (isMonth ? commit(ym) : (setCursor(`${ym}-01`), setView('days')))}
                    className={`h-10 ${cell({ selected: ym === value?.slice(0, 7), current: ym === thisMonth })}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {view === 'years' && (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }, (_, i) => decade + i).map((y) => (
                <button
                  key={y}
                  type="button"
                  disabled={yearOff(y)}
                  onClick={() => { setCursor(`${y}-${cursor.slice(5, 7)}-01`); setView('months'); }}
                  className={`h-10 ${cell({ selected: String(y) === value?.slice(0, 4), current: String(y) === today.slice(0, 4) })}`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-xs font-medium">
            {!required && value ? (
              <button type="button" onClick={() => commit('')} className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">Clear</button>
            ) : <span />}
            {isMonth ? (
              <button type="button" disabled={monthOff(thisMonth)} onClick={() => commit(thisMonth)} className="rounded-md px-2 py-1 text-brand-600 hover:bg-brand-50 disabled:text-zinc-300 disabled:hover:bg-transparent">This month</button>
            ) : (
              <button type="button" disabled={dayOff(today)} onClick={() => commit(today)} className="rounded-md px-2 py-1 text-brand-600 hover:bg-brand-50 disabled:text-zinc-300 disabled:hover:bg-transparent">Today</button>
            )}
          </div>
        </FloatingPanel>
      )}
    </div>
  );
}
