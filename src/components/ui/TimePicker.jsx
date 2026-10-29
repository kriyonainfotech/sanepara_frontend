import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { time12 } from '../../lib/attendance';
import { FloatingPanel, useEscape, useFloating } from './Floating';
import { changeEvent, RequiredProxy, triggerBase } from './fieldStyles';

const pad = (n) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const split = (hhmm) => {
  const [h, m] = (hhmm || '09:00').split(':').map(Number);
  return { h12: ((h + 11) % 12) + 1, m, pm: h >= 12 };
};
const join = ({ h12, m, pm }) => `${pad((h12 % 12) + (pm ? 12 : 0))}:${pad(m)}`;

// Drop-in replacement for <input type="time">; value stays 24-hour 'HH:mm'.
export default function TimePicker({ value, onChange, className = '', disabled, required, name, id, title, placeholder }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { anchorRef, panelRef, pos } = useFloating(open, close);
  const buttonRef = useRef(null);
  useEscape(open, () => { close(); buttonRef.current?.focus(); });

  const parts = split(value);
  const minutes = MINUTES.includes(parts.m) ? MINUTES : [...MINUTES, parts.m].sort((a, b) => a - b);
  const set = (patch) => {
    const v = join({ ...parts, ...patch });
    if (v !== value) onChange?.(changeEvent(v, name));
  };

  // Scroll the selected hour / minute into view when the panel opens.
  useEffect(() => {
    if (!open || !pos) return;
    panelRef.current?.querySelectorAll('[data-selected="true"]').forEach((el) => {
      el.parentElement.scrollTop = el.offsetTop - el.parentElement.clientHeight / 2 + el.offsetHeight / 2;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, Boolean(pos)]);

  const item = (selected) =>
    `block w-full rounded-md px-3 py-1.5 text-center text-sm tabular-nums transition-colors ${selected ? 'bg-brand-600 font-semibold text-white' : 'text-zinc-700 hover:bg-zinc-100'}`;

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
        <Clock className="h-4 w-4 shrink-0 text-zinc-400" />
        <span className={`min-w-0 flex-1 truncate whitespace-nowrap tabular-nums ${value ? '' : 'text-zinc-400'}`}>{value ? time12(value) : placeholder || 'Select time'}</span>
      </button>
      <RequiredProxy required={required} value={value} name={name} />

      {open && (
        <FloatingPanel panelRef={panelRef} pos={pos} role="dialog" className="p-2">
          <div className="flex gap-1">
            <div className="relative h-52 w-16 overflow-y-auto pr-0.5">
              {HOURS.map((h) => (
                <button key={h} type="button" data-selected={Boolean(value) && h === parts.h12} onClick={() => set({ h12: h })} className={item(Boolean(value) && h === parts.h12)}>{pad(h)}</button>
              ))}
            </div>
            <div className="relative h-52 w-16 overflow-y-auto border-l border-zinc-100 pl-1 pr-0.5">
              {minutes.map((m) => (
                <button key={m} type="button" data-selected={Boolean(value) && m === parts.m} onClick={() => set({ m })} className={item(Boolean(value) && m === parts.m)}>{pad(m)}</button>
              ))}
            </div>
            <div className="w-16 space-y-1 border-l border-zinc-100 pl-1">
              {['AM', 'PM'].map((p) => (
                <button key={p} type="button" onClick={() => set({ pm: p === 'PM' })} className={item(Boolean(value) && parts.pm === (p === 'PM'))}>{p}</button>
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2 text-xs font-medium">
            {!required && value ? (
              <button type="button" onClick={() => { onChange?.(changeEvent('', name)); close(); }} className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">Clear</button>
            ) : <span />}
            <button type="button" onClick={() => { close(); buttonRef.current?.focus(); }} className="rounded-md px-2 py-1 text-brand-600 hover:bg-brand-50">Done</button>
          </div>
        </FloatingPanel>
      )}
    </div>
  );
}
