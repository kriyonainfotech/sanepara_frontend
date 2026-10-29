import { CheckCircle2, ClipboardList, Users, Zap } from 'lucide-react';

const TONES = {
  yellow: 'border-yellow-200 bg-yellow-50/60 text-yellow-900 [&_.lbl]:text-yellow-700/70 [&_.ic]:text-yellow-600',
  slate: 'border-zinc-200 bg-zinc-50 text-zinc-900 [&_.lbl]:text-zinc-400 [&_.ic]:text-zinc-600',
  red: 'border-red-100 bg-red-50/60 text-red-900 [&_.lbl]:text-red-600/70 [&_.ic]:text-red-600',
  green: 'border-emerald-100 bg-emerald-50/60 text-emerald-900 [&_.lbl]:text-emerald-600/70 [&_.ic]:text-emerald-600',
  blue: 'border-blue-100 bg-blue-50/60 text-blue-900 [&_.lbl]:text-blue-600/70 [&_.ic]:text-blue-600',
};

function Stat({ label, value, icon: Icon, tone }) {
  return (
    <div className={`flex h-[72px] items-center gap-3 rounded-xl border px-4 ${TONES[tone]}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/60 bg-white shadow-sm">
        <Icon className="ic h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="lbl truncate text-[10px] font-bold uppercase tracking-wider">{label}</div>
        <div className="mt-0.5 text-xl font-black leading-none tabular-nums">{value}</div>
      </div>
    </div>
  );
}

export default function StatsSection({ totalClients, totalServices, unscheduled, scheduled, completed }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Stat label="Total Customers" value={totalClients} icon={Users} tone="yellow" />
      <Stat label="Total Services" value={totalServices} icon={ClipboardList} tone="slate" />
      <Stat label="Unscheduled" value={unscheduled} icon={Zap} tone="red" />
      <Stat label="Scheduled" value={scheduled} icon={CheckCircle2} tone="green" />
      <Stat label="Completed" value={completed} icon={CheckCircle2} tone="blue" />
    </div>
  );
}
