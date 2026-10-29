import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, AlignLeft, Briefcase, CalendarDays, CheckCircle2, Clock, History, Tag, User } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { longDay } from '../../lib/format';
import { formatTime } from '../../lib/taskConfig';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Checkbox from '../ui/Checkbox';
import { StatusBadge } from './StatusSelect';

function Meta({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white"><Icon className="h-4 w-4 text-zinc-500" /></div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{label}</div>
        <div className="truncate text-sm font-medium text-zinc-900">{children}</div>
      </div>
    </div>
  );
}

// Full task details with a toggleable QC checklist.
export default function ViewTaskDialog({ taskId, onClose, onChanged, canToggle = true }) {
  const [task, setTask] = useState(null);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    setTask(null);
    if (taskId) api.get(`/tasks/${taskId}`).then((r) => setTask(r.data.data)).catch((e) => { toast.error(errorMessage(e)); onClose(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const toggle = async (i) => {
    setSaving(i);
    try {
      const { data } = await api.put(`/tasks/${task._id}/checklist/${i}`);
      setTask((t) => ({ ...t, checklist: data.data.checklist }));
      onChanged?.();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Modal open={!!taskId} onClose={onClose} size="lg" title={task?.title || 'Task'} footer={<Button variant="secondary" onClick={onClose}>Close Details</Button>}>
      {!task ? (
        <div className="py-10 text-center text-sm text-zinc-400">Loading…</div>
      ) : (
        <div className="space-y-5">
          <div className="-mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <StatusBadge status={task.status} />
            <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" /> {task.type} Task</span>
            {task.taskCategory && <Badge>{task.taskCategory}</Badge>}
          </div>

          <div className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 sm:grid-cols-2">
            <Meta icon={CalendarDays} label="Due Date">{longDay(task.dueDate)}</Meta>
            <Meta icon={User} label="Assigned To">{task.assignedTo?.name || 'Unassigned'}</Meta>
            {task.client && <Meta icon={Briefcase} label="Customer">{task.client.businessName}</Meta>}
            {task.taskTime && <Meta icon={Clock} label="Task Time">{formatTime(task.taskTime)}</Meta>}
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-700"><AlignLeft className="h-4 w-4" /> Task Description</h3>
            <div className="min-h-20 whitespace-pre-wrap rounded-xl border border-zinc-200 p-4 text-sm text-zinc-700">
              {task.description || <span className="text-zinc-400">No description provided.</span>}
            </div>
          </div>

          {task.checklist?.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-700">
                <CheckCircle2 className="h-4 w-4" /> QC Checklist
                {task.requiresChecklistCompletion && <Badge tone="red">Required</Badge>}
                <span className="ml-auto text-xs font-normal text-zinc-400">{task.checklist.filter((c) => c.isCompleted).length}/{task.checklist.length}</span>
              </h3>
              <div className="grid gap-2.5 rounded-xl border border-zinc-200 p-4 sm:grid-cols-2">
                {task.checklist.map((c, i) => (
                  <label key={i} className="flex cursor-pointer items-start gap-2.5">
                    <Checkbox checked={c.isCompleted} disabled={!canToggle || saving !== null} onChange={() => toggle(i)} className="mt-0.5" />
                    <span className={`text-sm ${c.isCompleted ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>{c.text}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {task.pendingReasons?.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-600"><AlertTriangle className="h-4 w-4" /> Pending Reasons</h3>
              <div className="space-y-2">
                {[...task.pendingReasons].reverse().map((p, i) => (
                  <div key={i} className="rounded-lg border border-rose-100 bg-rose-50/50 p-3">
                    <div className="mb-1 text-[11px] font-semibold uppercase text-rose-500">{new Date(p.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}{p.updatedBy?.name && ` · ${p.updatedBy.name}`}</div>
                    <p className="text-sm text-zinc-800">{p.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {task.statusHistory?.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-700"><History className="h-4 w-4" /> Status History</h3>
              <ol className="space-y-2 border-l border-zinc-200 pl-4">
                {[...task.statusHistory].reverse().map((h, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex flex-wrap items-center gap-2"><StatusBadge status={h.status} /><span className="text-xs text-zinc-400">{new Date(h.updatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}{h.updatedBy?.name && ` · ${h.updatedBy.name}`}</span></div>
                    {h.note && <p className="mt-1 text-zinc-600">{h.note}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
