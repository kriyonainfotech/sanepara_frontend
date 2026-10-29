import { Children, Fragment, isValidElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { FloatingPanel, useEscape, useFloating } from './Floating';
import { changeEvent, RequiredProxy, triggerBase } from './fieldStyles';

const textOf = (node) =>
  node == null || typeof node === 'boolean' ? '' : Array.isArray(node) ? node.map(textOf).join('') : isValidElement(node) ? textOf(node.props.children) : String(node);

// Reads <option> children the same way a native <select> does (value falls back to the text).
const optionsFrom = (children) =>
  Children.toArray(children).flatMap((c) => {
    if (!isValidElement(c)) return [];
    if (c.type === Fragment) return optionsFrom(c.props.children);
    if (c.type !== 'option') return [];
    const label = textOf(c.props.children);
    return [{ value: String(c.props.value ?? label), label, disabled: Boolean(c.props.disabled) }];
  });

// Drop-in replacement for <select>: same value / onChange(e.target.value) / <option> children.
export default function CustomSelect({ value, onChange, children, className = '', disabled, required, name, id, title }) {
  const options = useMemo(() => optionsFrom(children), [children]);
  const current = String(value ?? '');
  const selected = options.find((o) => o.value === current) ?? options[0];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const close = useCallback(() => setOpen(false), []);
  const { anchorRef, panelRef, pos } = useFloating(open, close);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  useEscape(open, () => { close(); buttonRef.current?.focus(); });

  const searchable = options.length > 8;
  const shown = query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options;

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(Math.max(0, options.indexOf(selected)));
    if (!searchable) buttonRef.current?.focus(); // arrow keys work even when opened by mouse
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = (o) => {
    if (!o || o.disabled) return;
    if (o.value !== current) onChange?.(changeEvent(o.value, name));
    close();
    buttonRef.current?.focus();
  };

  const move = (dir) => {
    if (!shown.length) return;
    let i = active;
    for (let n = 0; n < shown.length; n++) {
      i = (i + dir + shown.length) % shown.length;
      if (!shown[i].disabled) break;
    }
    setActive(i);
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(shown[active]); }
    else if (e.key === 'Tab') close();
    else if (!searchable && e.key.length === 1) {
      const i = shown.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setActive(i);
    }
  };

  return (
    <div ref={anchorRef} className={`relative w-full ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        title={title}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${triggerBase} ${open ? 'border-brand-500 ring-4 ring-brand-500/10' : ''}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected?.value === '' ? 'text-zinc-500' : ''}`}>{selected?.label || ' '}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <RequiredProxy required={required} value={current} name={name} />

      {open && (
        <FloatingPanel panelRef={panelRef} pos={pos} className="max-w-[min(24rem,calc(100vw-16px))] p-1">
          {searchable && (
            <div className="relative mb-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                onKeyDown={onKeyDown}
                placeholder="Search…"
                className="h-8 w-full rounded-md border border-zinc-200 pl-8 pr-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          )}
          <div ref={listRef} role="listbox" className="max-h-64 overflow-y-auto">
            {shown.length === 0 && <div className="px-2.5 py-2 text-sm text-zinc-400">No matches</div>}
            {shown.map((o, i) => {
              const isSel = o.value === selected?.value;
              return (
                <div
                  key={`${o.value}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSel}
                  aria-disabled={o.disabled}
                  onMouseEnter={() => !o.disabled && setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o)}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm ${
                    o.disabled ? 'cursor-not-allowed text-zinc-300' : i === active ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700'
                  } ${isSel ? 'font-medium text-brand-700' : ''}`}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label || ' '}</span>
                  {isSel && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                </div>
              );
            })}
          </div>
        </FloatingPanel>
      )}
    </div>
  );
}
