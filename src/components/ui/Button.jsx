import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm',
  secondary: 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm',
  ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
};
const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  icon: 'h-8 w-8 justify-center',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  children,
  disabled,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}
