import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../../lib/api';
import { addDays, localToday } from '../../lib/format';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import { Field, Input, Select } from '../ui/Field';

const PRESETS = ['Collect bills from @client', 'Follow up @client for documents', 'Call @client for payment'];

// One action for many customers, every day in a date range, for one member.
export default function BulkTaskDialog({ open, onClose, onDone, members = [], customers = [] }) {
  const [action, setAction] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [from, setFrom] = useState(localToday());
  const [to, setTo] = useState(localToday());
  const [selected, setSelected] = useState([]);
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAction(''); setAssignedTo(''); setFrom(localToday()); setTo(localToday()); setSelected([]); setQ('');
  }, [open]);

  const team = members.filter((m) => m.role === 'team');
  const shown = useMemo(() => customers.filter((c) => c.businessName.toLowerCase().includes(q.toLowerCase())), [customers, q]);
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSelected = customers.length > 0 && selected.length === customers.length;

  const submit = async () => {
    if (!action.trim()) return toast.error('Please enter the task action.');
    if (!selected.length) return toast.error('Please select at least one customer.');
    if (!assignedTo) return toast.error('Please select a team member.');
    if (!from || to < from) return toast.error('Please select a valid date range.');

    const days = [];
    for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
    const tasks = [];
    for (const id of selected) {
      const name = customers.find((c) => c._id === id)?.businessName || '';
      const title = /@client/i.test(action) ? action.replace(/@client/gi, name) : `${name} ${action}`;
      for (const day of days) {
        tasks.push({ title: title.trim(), description: `Bulk assigned task: ${action}`, type: 'Team', status: 'Pending', assignedTo, client: id, dueDate: day });
      }
    }
    setSaving(true);
    try {
      const { data } = await api.post('/tasks/bulk', { tasks });
      toast.success(data.message);
      onDone();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Bulk Task Add"
      description="Assign one action for many customers to a team member over a date range."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Create Tasks</Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Task Action (use @client for the customer name)" required>
          <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. Collect bills from @client" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => setAction(p)} className="rounded-md border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-50">{p.replace(' @client', '')}</button>
            ))}
            <button type="button" onClick={() => setAction((a) => (a ? `${a} @client` : '@client'))} className="rounded-md border border-brand-100 bg-brand-50 px-2 py-0.5 text-xs text-brand-700">+ @client tag</button>
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Assign To (Team Member)" required className="sm:col-span-1">
            <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">Select…</option>
              {team.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="From" required><Input type="date" min={localToday()} value={from} onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); }} /></Field>
          <Field label="To" required><Input type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600">Select Customers <span className="text-red-500">*</span></span>
            <button type="button" onClick={() => setSelected(allSelected ? [] : customers.map((c) => c._id))} className="text-xs font-medium text-zinc-600 hover:text-zinc-900">{allSelected ? 'Deselect All' : 'Select All'}</button>
          </div>
          <div className="rounded-lg border border-zinc-200">
            <div className="border-b border-zinc-100 p-2"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer…" className="h-8 text-xs" /></div>
            <div className="max-h-52 overflow-y-auto p-1">
              {shown.length === 0 ? (
                <div className="p-4 text-center text-sm text-zinc-400">No customers found.</div>
              ) : (
                shown.map((c) => (
                  <div key={c._id} onClick={() => toggle(c._id)} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-zinc-50">
                    <Checkbox checked={selected.includes(c._id)} onChange={() => toggle(c._id)} />
                    <span className="text-sm">{c.businessName}</span>
                    {c.contactPerson && <span className="text-xs text-zinc-400">{c.contactPerson}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-1 text-xs text-zinc-500">{selected.length} customer(s) selected</div>
        </div>
      </div>
    </Modal>
  );
}
