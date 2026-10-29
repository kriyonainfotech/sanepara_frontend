import { initials } from '../../lib/format';

const COLORS = ['bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-teal-100 text-teal-700'];

export default function Avatar({ name = '', size = 'md' }) {
  const color = COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${dim} ${color}`}>
      {initials(name) || '?'}
    </span>
  );
}
