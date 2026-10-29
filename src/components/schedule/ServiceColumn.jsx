import { useState } from 'react';
import { CalendarClock, Calendar, CheckCircle2, ChevronDown, Clock, Edit2, Layers, Pencil, Trash2, Undo2, User, Zap } from 'lucide-react';
import Spinner from '../ui/Spinner';
import Progress from '../ui/Progress';
import { shortDay } from '../../lib/format';
import { formatTime, isDone, statusColor } from '../../lib/taskConfig';

function ItemRow({ item, i, canManage, showStatus, onRename, onDelete }) {
  const done = item.status === 'Completed';
  const task = item.linkedTask;
  return (
    <li className="group/item flex items-center gap-2.5 py-1.5 pl-1 pr-1">
      <span className="w-4 text-right text-[11px] tabular-nums text-zinc-400">{i + 1}</span>
      {showStatus && (
        <span className="h-2 w-2 shrink-0 rounded-full" title={task?.status || item.status} style={{ backgroundColor: task ? statusColor(isDone(task.status) ? 'Done' : task.status) : '#d4d4d8' }} />
      )}
      <span className={`flex-1 text-[13px] leading-snug ${done ? 'text-zinc-400 line-through' : 'text-zinc-700'}`}>{item.content}</span>
      {canManage && !done && (
        <span className="flex opacity-0 transition-opacity group-hover/item:opacity-100">
          <button title="Rename" onClick={() => onRename(item)} className="rounded p-1 text-blue-500 hover:bg-blue-50"><Edit2 className="h-3.5 w-3.5" /></button>
          <button title="Remove from service" onClick={() => onDelete(item)} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
        </span>
      )}
    </li>
  );
}

function BunchCard({ bunch, type, canManage, onSchedule, onEdit, onUnschedule, onRename, onDelete }) {
  const [open, setOpen] = useState(false);
  const unscheduled = type === 'unscheduled';
  const items = unscheduled ? bunch.items.filter((i) => i.status === 'Unscheduled') : bunch.items.filter((i) => i.status !== 'Unscheduled');
  const done = bunch.completed;
  const total = bunch.total - (unscheduled ? 0 : bunch.unscheduled);
  const completed = !unscheduled && bunch.scheduled === 0;

  return (
    <div className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md ${
      unscheduled ? 'border-zinc-200 hover:border-red-200' : completed ? 'border-blue-200 bg-blue-50/30' : 'border-zinc-200 hover:border-emerald-300'
    }`}>
      <div className={`absolute bottom-0 left-0 top-0 w-1 ${unscheduled ? 'bg-red-500/0 group-hover:bg-red-500' : completed ? 'bg-blue-500' : 'bg-emerald-500/0 group-hover:bg-emerald-500'} transition-colors`} />
      <div className="p-3.5 pl-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${unscheduled ? 'bg-red-50 text-red-600' : completed ? 'bg-blue-100 text-blue-700' : 'bg-emerald-50 text-emerald-600'}`}>
            {completed ? <CheckCircle2 className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-zinc-900">{bunch.serviceName}</h4>
              {completed && <span className="rounded border border-blue-200 bg-blue-50 px-1.5 text-[10px] font-bold uppercase text-blue-700">Completed</span>}
              {unscheduled && bunch.scheduled + bunch.completed > 0 && <span className="rounded border border-amber-200 bg-amber-50 px-1.5 text-[10px] font-bold uppercase text-amber-700">Remaining</span>}
            </div>
            <div className="mt-0.5 text-xs text-zinc-500">{items.length} task{items.length === 1 ? '' : 's'}{unscheduled ? ' to schedule' : ''}</div>
          </div>
          {canManage && unscheduled && (
            <button onClick={() => onSchedule(bunch)} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-700">
              <CalendarClock className="h-3.5 w-3.5" /> Schedule
            </button>
          )}
        </div>

        {!unscheduled && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 ${completed ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-700'}`}>
                <Calendar className="h-3 w-3 opacity-60" /><span className="font-semibold">{bunch.dueDate ? shortDay(bunch.dueDate) : 'TBD'}</span>
                {bunch.taskTime && <span className="opacity-70">· {formatTime(bunch.taskTime)}</span>}
              </span>
              <span className="flex items-center gap-1.5 text-zinc-600"><User className="h-3 w-3 text-zinc-400" />{bunch.assignedTo?.name || 'Unassigned'}</span>
              {bunch.mixed && <span className="text-amber-600">· mixed dates / members</span>}
            </div>
            <Progress done={done} total={total} />
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between">
          <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} /> {open ? 'Hide' : 'Show'} tasks
          </button>
          {canManage && !unscheduled && !completed && (
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(bunch)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"><Pencil className="h-3 w-3" /> Reschedule</button>
              <button onClick={() => onUnschedule(bunch)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"><Undo2 className="h-3 w-3" /> Unschedule</button>
            </div>
          )}
        </div>

        {open && (
          <ol className="mt-1.5 divide-y divide-zinc-50 border-t border-zinc-100 pt-1">
            {items.map((item, i) => (
              <ItemRow key={item._id} item={item} i={i} canManage={canManage} showStatus={!unscheduled} onRename={onRename} onDelete={onDelete} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export default function ServiceColumn({ title, bunches, type, loading, ...handlers }) {
  const unscheduled = type === 'unscheduled';
  return (
    <div className="flex h-[420px] flex-col lg:h-[calc(100vh-250px)]">
      <div className="mb-3 flex items-center justify-between border-b border-zinc-100 px-1 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`rounded-md p-1.5 ${unscheduled ? 'bg-red-50' : 'bg-emerald-50'}`}>
            {unscheduled ? <Zap className="h-4 w-4 text-red-600" /> : <Clock className="h-4 w-4 text-emerald-600" />}
          </div>
          <h3 className="truncate font-semibold">{title}</h3>
        </div>
        <span className={`rounded-md border bg-white px-2.5 text-xs font-bold shadow-sm ${unscheduled ? 'border-red-200 text-red-600' : 'border-emerald-200 text-emerald-600'}`}>{bunches.length}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pb-4 pr-1">
        {loading ? (
          <Spinner />
        ) : bunches.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-400">{unscheduled ? 'No services waiting to be scheduled' : 'No scheduled services'}</p>
        ) : (
          bunches.map((b) => <BunchCard key={b._id} bunch={b} type={type} {...handlers} />)
        )}
      </div>
    </div>
  );
}
