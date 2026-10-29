import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { CATEGORIES } from '../../lib/taskConfig';
import { localToday } from '../../lib/format';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Field';

/**
 * Create / edit a task.
 * type: 'Personal' | 'Team' | 'Admin' decides who it can be assigned to.
 * lockClient: customer is fixed (scheduling from Schedule Management).
 * onUnschedule: shows an "Unschedule" button when editing a scheduled item.
 */
export default function TaskDialog({ open, onClose, onSubmit, initialData, type = 'Personal', members = [], customers = [], defaultAssignee = '', defaultDueDate, lockClient, onUnschedule, title }) {
  const [form, setForm] = useState({});
  const [templates, setTemplates] = useState([]);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(initialData?._id);

  useEffect(() => {
    if (!open) return;
    api.get('/checklist-templates').then((r) => setTemplates(r.data.data)).catch(() => {});
    const d = initialData || {};
    setForm({
      title: d.title || '',
      description: d.description || '',
      assignedTo: d.assignedTo?._id || d.assignedTo || defaultAssignee || '',
      client: d.client?._id || d.client || '',
      taskCategory: d.taskCategory || 'General',
      checklistTemplateId: d.checklistTemplate?._id || d.checklistTemplate || '',
      dueDate: d.dueDate || defaultDueDate || localToday(),
      taskTime: d.taskTime || '',
    });
    // Reset only when the dialog opens — parents pass fresh objects every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const assignable = members.filter((m) => (type === 'Team' ? m.role === 'team' : type === 'Admin' ? m.role === 'admin' : false));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ ...form, type });
    } finally {
      setSaving(false);
    }
  };

  const today = localToday();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || (editing ? 'Edit Task' : 'Create New Task')}
      footer={
        <>
          {onUnschedule && editing && (
            <Button variant="ghost" className="mr-auto !text-red-600 hover:!bg-red-50" onClick={onUnschedule}>Unschedule</Button>
          )}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="task-dialog" loading={saving}>{editing ? 'Save Changes' : 'Create Task'}</Button>
        </>
      }
    >
      <form id="task-dialog" onSubmit={submit} className="space-y-4">
        <Field label="Task Title" required>
          <Input required autoFocus maxLength={200} value={form.title || ''} onChange={set('title')} placeholder="e.g. File GSTR-3B" />
        </Field>
        <Field label="Task Description">
          <Textarea rows={3} value={form.description || ''} onChange={set('description')} placeholder="Add detailed requirements here..." />
        </Field>

        {(type === 'Team' || type === 'Admin') && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={type === 'Team' ? 'Assign To (Team)' : 'Assign To (Admin)'} required>
              <Select required value={form.assignedTo || ''} onChange={set('assignedTo')}>
                <option value="">Select member…</option>
                {assignable.map((m) => (
                  <option key={m._id} value={m._id}>{m.name}{m.designation ? ` (${m.designation})` : ''}</option>
                ))}
              </Select>
            </Field>
            {type === 'Team' && (
              <Field label="Customer (Optional)">
                <Select value={form.client || ''} onChange={set('client')} disabled={lockClient}>
                  <option value="">No customer</option>
                  {customers.map((c) => <option key={c._id} value={c._id}>{c.businessName}</option>)}
                </Select>
              </Field>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Task Category">
            <Select value={form.taskCategory || 'General'} onChange={set('taskCategory')}>
              {[...new Set([...CATEGORIES, form.taskCategory].filter(Boolean))].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Checklist Template (Optional)">
            <Select value={form.checklistTemplateId || ''} onChange={set('checklistTemplateId')}>
              <option value="">No Checklist</option>
              {templates.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Due Date" required>
            <Input type="date" required min={editing && form.dueDate < today ? form.dueDate : today} value={form.dueDate || ''} onChange={set('dueDate')} />
          </Field>
          <Field label="Task Time">
            <Input type="time" value={form.taskTime || ''} onChange={set('taskTime')} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
