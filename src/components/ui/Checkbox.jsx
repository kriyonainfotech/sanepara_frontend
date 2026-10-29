import { Check, Minus } from 'lucide-react';

export default function Checkbox({ checked, indeterminate, onChange, disabled, className = '' }) {
  const on = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : !!checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!checked);
      }}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-50 ${
        on ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white hover:border-zinc-500'
      } ${className}`}
    >
      {indeterminate ? <Minus className="h-3 w-3" strokeWidth={3} /> : checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  );
}
