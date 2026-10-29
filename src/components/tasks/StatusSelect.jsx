import { Check, ChevronDown } from 'lucide-react';
import Popover from '../ui/Popover';
import { STATUS_OPTIONS, statusColor, hexToRgba } from '../../lib/taskConfig';

const Dot = ({ color }) => <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />;

export function StatusBadge({ status }) {
  const color = statusColor(status);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: hexToRgba(color, 0.1), color, borderColor: hexToRgba(color, 0.3) }}>
      <Dot color={color} /> {status}
    </span>
  );
}

// Inline status picker with coloured dots.
export default function StatusSelect({ value, onChange, disabled, placeholder = 'Status', includeAll, className = '' }) {
  const current = STATUS_OPTIONS.find((o) => o.value === value);
  const options = includeAll ? [{ label: 'All Status', value: 'all' }, ...STATUS_OPTIONS] : STATUS_OPTIONS;
  return (
    <Popover
      className={className}
      panelClassName="w-40"
      trigger={({ toggle }) => (
        <button
          type="button"
          disabled={disabled}
          onClick={toggle}
          className="flex h-8 w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:border-zinc-300 disabled:opacity-50"
        >
          {current ? <Dot color={current.color} /> : null}
          <span className="flex-1 truncate text-left">{current?.label || (value === 'all' ? 'All Status' : placeholder)}</span>
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
        </button>
      )}
    >
      {({ close }) =>
        options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => { onChange(o.value); close(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-100"
          >
            {o.color ? <Dot color={o.color} /> : <span className="w-2" />}
            <span className="flex-1">{o.label}</span>
            {o.value === value && <Check className="h-3.5 w-3.5 text-zinc-500" />}
          </button>
        ))
      }
    </Popover>
  );
}
