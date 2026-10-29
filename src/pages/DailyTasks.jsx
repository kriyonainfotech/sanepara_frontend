import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Briefcase, CalendarDays, Plus, Search, Trash2, Users } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { localToday } from '../lib/format';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import Checkbox from '../components/ui/Checkbox';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field, Input, Select } from '../components/ui/Field';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FREQ_TONE = { Daily: 'zinc', Weekly: 'blue', Monthly: 'violet', Yearly: 'amber' };
const EMPTY = { title: '', description: '', assignedTo: '', frequency: 'Daily', daysOfWeek: [], dateOfMonth: '', monthOfYear: '', isChecklistTask: false, checklistTemplate: '', customChecklist: [], clients: [] };

const freqDetail = (r) =>
  r.frequency === 'Weekly' ? r.daysOfWeek.map((d) => DAYS[d]).join(', ')
  : r.frequency === 'Monthly' ? `Every ${r.dateOfMonth}`
  : r.frequency === 'Yearly' ? `${r.dateOfMonth} ${MONTHS[(r.monthOfYear || 1) - 1]}`
  : 'Mon – Sat';

function RuleDialog({ open, rule, onClose, onSaved, members, customers, templates }) {
  const [f, setF] = useState(EMPTY);
  const [newItem, setNewItem] = useState('');
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNewItem(''); setQ('');
    setF(rule ? {
      ...EMPTY, ...rule,
      assignedTo: rule.assignedTo?._id || rule.assignedTo || '',
      checklistTemplate: rule.checklistTemplate?._id || rule.checklistTemplate || '',
      clients: (rule.clients || []).map((c) => c._id || c),
      dateOfMonth: rule.dateOfMonth || '', monthOfYear: rule.monthOfYear || '',
    } : EMPTY);
  }, [open, rule]);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const addItem = () => { if (newItem.trim()) { set('customChecklist', [...f.customChecklist, newItem.trim()]); set('checklistTemplate', ''); setNewItem(''); } };
  const shownCustomers = customers.filter((c) => c.businessName.toLowerCase().includes(q.toLowerCase()));
  const allIds = shownCustomers.map((c) => c._id);
  const allSel = allIds.length > 0 && allIds.every((id) => f.clients.includes(id));

  const submit = async () => {
    setSaving(true);
    try {
      const payload = { ...f, dateOfMonth: f.dateOfMonth || null, monthOfYear: f.monthOfYear || null };
      if (rule) await api.put(`/daily-task-rules/${rule._id}`, payload);
      else await api.post('/daily-task-rules', payload);
      toast.success(rule ? 'Rule updated successfully' : 'Daily task rule created');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={rule ? 'Edit Daily Task Rule' : 'Create New Daily Task Rule'} footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving}>{rule ? 'Update Rule' : 'Save Rule'}</Button>
      </>
    }>
      <div className="space-y-4">
        <Field label="Task Title (e.g. Check client bills)" required><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Enter title..." /></Field>
        <Field label="Description"><Input value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Task description..." /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assign To" required>
            <Select value={f.assignedTo} onChange={(e) => set('assignedTo', e.target.value)}>
              <option value="">Select a member</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.name} ({m.role === 'superadmin' ? 'Super Admin' : m.role === 'admin' ? 'Admin' : 'Team'})</option>)}
            </Select>
          </Field>
          <Field label="Frequency" required>
            <Select value={f.frequency} onChange={(e) => set('frequency', e.target.value)}>
              {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((x) => <option key={x}>{x}</option>)}
            </Select>
          </Field>
        </div>

        {f.frequency === 'Weekly' && (
          <Field label="Days of Week" required>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => {
                const on = f.daysOfWeek.includes(i);
                return (
                  <button key={d} type="button" disabled={i === 0} title={i === 0 ? 'Sunday is a holiday' : undefined}
                    onClick={() => set('daysOfWeek', on ? f.daysOfWeek.filter((x) => x !== i) : [...f.daysOfWeek, i])}
                    className={`rounded-md px-3 py-1 text-xs font-medium ring-1 ring-inset disabled:opacity-40 ${on ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-600 ring-zinc-200 hover:ring-zinc-300'}`}>{d}</button>
                );
              })}
            </div>
          </Field>
        )}
        {(f.frequency === 'Monthly' || f.frequency === 'Yearly') && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date (1-31)" required hint="Short months use their last day"><Input type="number" min={1} max={31} value={f.dateOfMonth} onChange={(e) => set('dateOfMonth', e.target.value)} placeholder="e.g. 15" /></Field>
            {f.frequency === 'Yearly' && (
              <Field label="Month" required>
                <Select value={f.monthOfYear} onChange={(e) => set('monthOfYear', e.target.value)}>
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </Select>
              </Field>
            )}
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-sm font-semibold">
          <Checkbox checked={f.isChecklistTask} onChange={(v) => set('isChecklistTask', v)} /> Checklist Task
          <span className="font-normal text-zinc-400">— each task comes with a checklist</span>
        </label>

        {f.isChecklistTask && (
          <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
            <Field label="Use Existing Checklist Template">
              <Select value={f.checklistTemplate} onChange={(e) => { set('checklistTemplate', e.target.value); set('customChecklist', []); }}>
                <option value="">-- None --</option>
                {templates.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
              </Select>
            </Field>
            <div className="border-t border-zinc-200 pt-4">
              <span className="mb-1.5 block text-xs font-medium text-zinc-600">OR Create Custom Checklist (only for this rule)</span>
              <div className="flex gap-2">
                <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} placeholder="Add custom item..." />
                <Button type="button" variant="secondary" onClick={addItem}>Add</Button>
              </div>
              {f.customChecklist.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {f.customChecklist.map((it, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm">
                      <span>{it}</span>
                      <button onClick={() => set('customChecklist', f.customChecklist.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600">
              Select Customers {!f.isChecklistTask && <span className="text-red-500">*</span>}{' '}
              <span className="font-normal text-zinc-400">
                {f.isChecklistTask
                  ? '— optional; with customers, one checklist task per customer'
                  : `— one task per customer, e.g. "${f.title || 'Title'} - Customer"`}
              </span>
            </span>
            <button type="button" onClick={() => set('clients', allSel ? f.clients.filter((id) => !allIds.includes(id)) : [...new Set([...f.clients, ...allIds])])} className="text-xs font-medium text-zinc-600 hover:text-zinc-900">{allSel ? 'Deselect All' : 'Select All'}</button>
          </div>
          <div className="rounded-lg border border-zinc-200">
            <div className="border-b border-zinc-100 p-2"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer…" className="h-8 text-xs" /></div>
            <div className="max-h-56 space-y-0.5 overflow-y-auto p-1">
              {shownCustomers.length === 0 ? (
                <p className="p-4 text-center text-sm text-zinc-400">No customers found.</p>
              ) : shownCustomers.map((c) => {
                const on = f.clients.includes(c._id);
                return (
                  <div key={c._id} onClick={() => set('clients', on ? f.clients.filter((x) => x !== c._id) : [...f.clients, c._id])} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-zinc-50">
                    <Checkbox checked={on} onChange={() => {}} /> <span className="text-sm">{c.businessName}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-1 text-xs text-zinc-500">{f.clients.length} selected</div>
        </div>
      </div>
    </Modal>
  );
}

function TriggerDialog({ rule, onClose }) {
  const [date, setDate] = useState(localToday());
  const [busy, setBusy] = useState(false);
  useEffect(() => setDate(localToday()), [rule]);
  const run = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/daily-task-rules/${rule._id}/trigger`, { targetDate: date });
      toast.success(data.message);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={!!rule} onClose={onClose} size="sm" title="Manual Trigger" footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={run} loading={busy}>Trigger Now</Button></>
    }>
      <Field label="Select Target Date" hint="Generates this rule's tasks for the selected date, as if the 7 PM job ran.">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
    </Modal>
  );
}

export default function DailyTasks() {
  const [rules, setRules] = useState(null);
  const [members, setMembers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(undefined); // undefined closed, null new
  const [triggering, setTriggering] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  // Matches title, description, member, frequency, checklist and customer names.
  const customerName = Object.fromEntries(customers.map((c) => [c._id, c.businessName]));
  const needle = search.trim().toLowerCase();
  const shown = !rules || !needle ? rules : rules.filter((r) =>
    [r.title, r.description, r.assignedTo?.name, r.frequency, freqDetail(r), r.checklistTemplate?.title, ...(r.clients || []).map((c) => c.businessName || customerName[c._id || c])]
      .some((v) => v && String(v).toLowerCase().includes(needle))
  );

  const load = () => api.get('/daily-task-rules').then((r) => setRules(r.data.data));
  useEffect(() => {
    load();
    api.get('/users', { params: { active: true } }).then((r) => setMembers(r.data.users));
    api.get('/customers/options').then((r) => setCustomers(r.data.data));
    api.get('/checklist-templates').then((r) => setTemplates(r.data.data));
  }, []);

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/daily-task-rules/${deleting._id}`);
      toast.success('Rule deleted');
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Daily Tasks</span>}
        description="Tasks are generated automatically every evening at 7:00 PM for the next day (except Sundays)."
        actions={<Button icon={Plus} onClick={() => setEditing(null)}>Create Daily Task Rule</Button>}
      />
      <Card className="overflow-hidden">
        {rules?.length > 0 && (
          <div className="border-b border-zinc-100 p-3">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, member, frequency or customer" className="pl-9" />
            </div>
          </div>
        )}
        {!rules ? (
          <Spinner />
        ) : rules.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No daily tasks configured" message="E.g. 'Check WhatsApp for client bills' for selected customers every day." action={<Button icon={Plus} onClick={() => setEditing(null)}>Create rule</Button>} />
        ) : shown.length === 0 ? (
          <EmptyState icon={Search} title="No matching rules" message="Try a different search." />
        ) : (
          <>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
            {shown.map((r) => (
              <div key={r._id} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{r.title}</div>
                    {r.description && <div className="truncate text-xs text-zinc-500">{r.description}</div>}
                  </div>
                  <Badge tone={FREQ_TONE[r.frequency]}>{r.frequency}</Badge>
                </div>
                <div className="mt-1 text-xs text-zinc-400">{freqDetail(r)}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-zinc-50 px-3 py-2"><div className="text-[10px] font-semibold uppercase text-zinc-400">Assigned to</div><div className="flex items-center gap-1.5 truncate text-zinc-700"><Users className="h-3.5 w-3.5 shrink-0 text-zinc-400" />{r.assignedTo?.name || 'Unknown'}</div></div>
                  <div className="rounded-lg bg-zinc-50 px-3 py-2"><div className="text-[10px] font-semibold uppercase text-zinc-400">{r.isChecklistTask ? 'Checklist' : 'Customers'}</div><div className="truncate text-zinc-700">
                    {r.isChecklistTask ? <span>☑ {r.checklistTemplate?.title || `${r.customChecklist.length} custom items`}{r.clients?.length > 0 && ` · ${r.clients.length} Customers`}</span> : <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-zinc-400" />{r.clients?.length || 0} Customers</span>}
                  </div></div>
                </div>
                <div className="mt-3 flex gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => setTriggering(r)} className="flex-1 justify-center !text-blue-600">Trigger Now</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleting(r)} className="hover:!text-red-600"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs text-zinc-500">
                  <th className="px-5 py-2.5 font-medium">Title</th>
                  <th className="px-5 py-2.5 font-medium">Frequency</th>
                  <th className="px-5 py-2.5 font-medium">Assigned To</th>
                  <th className="px-5 py-2.5 font-medium">Customers / Checklist</th>
                  <th className="px-5 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {shown.map((r) => (
                  <tr key={r._id} className="hover:bg-zinc-50/60">
                    <td className="px-5 py-3">
                      <div className="font-medium">{r.title}</div>
                      {r.description && <div className="max-w-xs truncate text-xs text-zinc-500">{r.description}</div>}
                    </td>
                    <td className="px-5 py-3"><Badge tone={FREQ_TONE[r.frequency]}>{r.frequency}</Badge><div className="mt-1 text-xs text-zinc-400">{freqDetail(r)}</div></td>
                    <td className="px-5 py-3"><span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-zinc-400" />{r.assignedTo?.name || 'Unknown'}</span></td>
                    <td className="px-5 py-3 text-zinc-600">
                      {r.isChecklistTask ? (
                        <span>☑ {r.checklistTemplate?.title || `${r.customChecklist.length} custom items`}{r.clients?.length > 0 && ` · ${r.clients.length} Customers`}</span>
                      ) : (
                        <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-zinc-400" />{r.clients?.length || 0} Customers</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => setTriggering(r)} className="!text-blue-600">Trigger Now</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleting(r)} className="hover:!text-red-600"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>
      <RuleDialog open={editing !== undefined} rule={editing} onClose={() => setEditing(undefined)} onSaved={load} members={members} customers={customers} templates={templates} />
      <TriggerDialog rule={triggering} onClose={() => setTriggering(null)} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={busy} title="Delete rule?" message={`"${deleting?.title}" will stop generating tasks. Tasks already created stay.`} />
    </div>
  );
}
