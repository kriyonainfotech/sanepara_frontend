import { useEffect, useState } from 'react';
import { localToday } from '../../lib/format';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input, Select } from '../ui/Field';

// Schedule (or reschedule) a whole service for one member on one day.
export default function BunchScheduleDialog({ bunch, mode, customerName, members, onClose, onSubmit }) {
  const [form, setForm] = useState({ assignedTo: '', dueDate: localToday(), taskTime: '' });
  const [saving, setSaving] = useState(false);
  const reschedule = mode === 'edit';

  useEffect(() => {
    if (!bunch) return;
    const today = localToday();
    setForm({
      assignedTo: reschedule ? bunch.assignedTo?._id || '' : '',
      dueDate: reschedule && bunch.dueDate && bunch.dueDate >= today ? bunch.dueDate : today,
      taskTime: reschedule ? bunch.taskTime || '' : '',
    });
  }, [bunch, reschedule]);

  const items = bunch ? bunch.items.filter((i) => (reschedule ? i.status === 'Scheduled' : i.status === 'Unscheduled')) : [];
  const team = members.filter((m) => m.role === 'team' || m._id === form.assignedTo);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!bunch}
      onClose={onClose}
      title={reschedule ? 'Reschedule Service' : 'Schedule Service'}
      description={bunch && `${bunch.serviceName} · ${customerName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="bunch-form" loading={saving}>{reschedule ? 'Save' : `Schedule ${items.length} Tasks`}</Button>
        </>
      }
    >
      <form id="bunch-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Assign To (Team)" required className="sm:col-span-3">
            <Select required value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="">Select member…</option>
              {team.map((m) => <option key={m._id} value={m._id}>{m.name}{m.designation ? ` (${m.designation})` : ''}</option>)}
            </Select>
          </Field>
          <Field label="Date" required className="sm:col-span-2">
            <Input type="date" required min={localToday()} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
          <Field label="Task Time">
            <Input type="time" value={form.taskTime} onChange={(e) => setForm({ ...form, taskTime: e.target.value })} />
          </Field>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-2 text-xs font-medium text-zinc-500">
            {reschedule ? `${items.length} open tasks will move` : `All ${items.length} tasks go to the member together, as one bunch`}
          </div>
          <ol className="space-y-1.5">
            {items.map((t, i) => (
              <li key={t._id} className="flex gap-2 text-sm text-zinc-700">
                <span className="w-4 text-right text-xs leading-5 tabular-nums text-zinc-400">{i + 1}</span>{t.content}
              </li>
            ))}
          </ol>
          {reschedule && <p className="mt-3 text-xs text-zinc-400">Completed tasks stay as they are.</p>}
        </div>
      </form>
    </Modal>
  );
}
