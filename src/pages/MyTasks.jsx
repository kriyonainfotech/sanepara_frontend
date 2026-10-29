import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2, Check, Circle, Eye, Layers, Phone, User, Mail, MapPin, Receipt } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { localToday, longDay, shortDay } from '../lib/format';
import { DONE_COLOR, FUTURE_PENDING_COLOR, OVERDUE_COLOR, TODAY_COLOR, formatTime, groupByBunch, hexToRgba, isDailyTask, isDone, isOtherTask, paletteStyle, sortTasks, statusColor } from '../lib/taskConfig';
import Progress from '../components/ui/Progress';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { Textarea } from '../components/ui/Field';
import TeamTaskCalendar from '../components/tasks/TeamTaskCalendar';
import ViewTaskDialog from '../components/tasks/ViewTaskDialog';

const TABS = [
  { id: 'all', label: 'All Tasks', match: (t) => !isDailyTask(t) && !isOtherTask(t) },
  { id: 'daily', label: 'Daily Tasks', match: isDailyTask },
  { id: 'other', label: 'Other', match: (t) => isOtherTask(t) && !isDailyTask(t) },
];

function Stats({ tasks, today }) {
  const total = tasks.length;
  const done = tasks.filter((t) => isDone(t.status)).length;
  const open = tasks.filter((t) => !isDone(t.status));
  const overdue = open.filter((t) => t.dueDate < today).length;
  const pending = open.length - overdue;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  const cards = [
    { label: 'Total Tasks', value: total, percent: 100, className: 'border-zinc-200 bg-zinc-50 text-zinc-700' },
    { label: 'Done', value: done, percent: pct(done), style: paletteStyle(statusColor('Done')) },
    { label: 'Pending', value: pending, percent: pct(pending), style: paletteStyle(statusColor('Pending')) },
    { label: 'Overdue', value: overdue, percent: pct(overdue), style: paletteStyle(OVERDUE_COLOR) },
  ];
  return (
    <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className={`flex h-20 justify-between rounded-xl border p-3 ${c.className || ''}`} style={c.style}>
          <div className="flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{c.label}</span>
            <span className="text-3xl font-black leading-none tabular-nums">{c.value}</span>
          </div>
          <span className="self-end text-2xl font-medium leading-none opacity-60 tabular-nums">{c.percent}%</span>
        </div>
      ))}
    </div>
  );
}

function rowTone(task, today) {
  const color = isDone(task.status) ? DONE_COLOR : task.dueDate < today ? OVERDUE_COLOR : task.dueDate === today ? TODAY_COLOR : FUTURE_PENDING_COLOR;
  return { backgroundColor: hexToRgba(color, isDone(task.status) ? 0.07 : 0.08), borderLeftColor: color };
}

function ContactModal({ client, onClose }) {
  const Row = ({ icon: Icon, label, value }) => value ? (
    <div className="flex items-start gap-3"><Icon className="mt-0.5 h-4 w-4 text-zinc-400" /><div><div className="text-sm font-medium">{label}</div><div className="text-sm text-zinc-500">{value}</div></div></div>
  ) : null;
  return (
    <Modal open={!!client} onClose={onClose} size="sm" title={<span className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Customer Contact Info</span>} footer={<Button onClick={onClose}>Close</Button>}>
      {client && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{client.businessName}</h3>
          <div className="space-y-3 border-t border-zinc-100 pt-4">
            <Row icon={User} label="Contact Person" value={client.contactPerson} />
            <Row icon={Phone} label="Phone Number" value={client.phone ? <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a> : null} />
            <Row icon={Mail} label="Email" value={client.email} />
            <Row icon={Receipt} label="GST Number" value={client.gstNumber} />
            <Row icon={MapPin} label="Address" value={client.address} />
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function MyTasks() {
  const [tasks, setTasks] = useState(null);
  const [today, setToday] = useState(localToday());
  const [selected, setSelected] = useState(localToday());
  const [month, setMonth] = useState(localToday());
  const [tab, setTab] = useState('all');
  const [confirm, setConfirm] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [contact, setContact] = useState(null);

  const load = useCallback(() => api.get('/tasks/mine').then((r) => { setTasks(r.data.data); setToday(r.data.today); }), []);
  useEffect(() => { load(); }, [load]);

  const all = tasks || [];
  const ofDay = useMemo(() => (selected ? all.filter((t) => t.dueDate === selected) : all), [all, selected]);
  const tabTasks = (t) => sortTasks(ofDay.filter(TABS.find((x) => x.id === t).match));
  const rows = tabTasks(tab);
  const proper = all.filter(TABS[0].match);

  const markDone = (task) => {
    if (task.checklist?.some((c) => !c.isCompleted)) return toast.error('Please complete all checklist items before marking the task as Done.');
    setNote('');
    setConfirm(task);
  };

  const submitDone = async () => {
    setSaving(true);
    try {
      await api.patch(`/tasks/${confirm._id}/status`, { status: 'Done', note });
      toast.success('Task status updated successfully');
      setConfirm(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-6 xl:flex-row">
        <div className="shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
          <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-zinc-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-900" />
            {selected ? (selected === today ? 'Today' : longDay(selected)) : 'All Tasks'}
          </p>
          {selected !== today && (
            <button onClick={() => { setSelected(today); setMonth(today); }} className="mt-2 text-xs font-bold uppercase tracking-wider text-zinc-900 hover:opacity-70">Reset to Today</button>
          )}
        </div>
        <div className="w-full xl:max-w-3xl"><Stats tasks={proper.filter((t) => !selected || t.dueDate === selected)} today={today} /></div>
      </div>

      <TeamTaskCalendar month={month} onMonthChange={setMonth} selected={selected} onSelect={setSelected} tasks={proper} />

      <div>
        <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-lg py-2 text-sm font-semibold transition-all ${tab === t.id ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}>
              {t.label} ({tabTasks(t.id).length})
            </button>
          ))}
        </div>

        {/* Phones & tablets: task cards, grouped by service bunch */}
        <div className="lg:hidden">
          {!tasks ? <Spinner /> : rows.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white py-14 text-center text-sm text-zinc-400">No tasks for this day.</div>
          ) : (
            <div className="space-y-4">
              {(() => { let n = 0; return groupByBunch(rows).map((entry) => {
                const list = entry.type === 'bunch' ? entry.tasks : [entry.task];
                return (
                  <div key={entry.type === 'bunch' ? entry.key : entry.task._id} className="space-y-2">
                    {entry.type === 'bunch' && (
                      <div className="rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white"><Layers className="h-3.5 w-3.5" /></span>
                          <span className="font-semibold text-zinc-900">{entry.name}</span>
                          {entry.client && <button onClick={() => setContact(entry.client)} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100">{entry.customer}</button>}
                          <span className="text-xs text-zinc-500">{entry.tasks.length} tasks</span>
                        </div>
                        <Progress done={entry.tasks.filter((t) => isDone(t.status)).length} total={entry.tasks.length} className="mt-2" />
                      </div>
                    )}
                    <div className={`grid gap-2 sm:grid-cols-2 ${entry.type === 'bunch' ? 'pl-3' : ''}`}>
                      {list.map((t) => {
                        const done = isDone(t.status);
                        n += 1;
                        return (
                          <div key={t._id} className="rounded-xl border border-l-4 border-zinc-200 bg-white p-4" style={rowTone(t, today)}>
                            <div className="flex items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs text-zinc-400">#{n}</span>
                                  <span className={`font-semibold ${done ? 'text-zinc-500' : 'text-zinc-900'}`}>{t.title}</span>
                                  {t.taskCategory === 'Meeting' && <span className="rounded border border-blue-300 bg-blue-100 px-1.5 text-[10px] font-bold uppercase text-blue-800">Meeting</span>}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                                  <span className="font-semibold text-zinc-600">{shortDay(t.dueDate)}</span>
                                  {t.taskTime && <span>{formatTime(t.taskTime)}</span>}
                                  {t.checklist?.length > 0 && <span className="text-zinc-400">☑ {t.checklist.filter((c) => c.isCompleted).length}/{t.checklist.length}</span>}
                                </div>
                              </div>
                              <button
                                title={done ? 'Done' : 'Mark as Done'}
                                disabled={done}
                                onClick={() => markDone(t)}
                                className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all hover:scale-110 disabled:hover:scale-100"
                                style={done ? { backgroundColor: DONE_COLOR, boxShadow: `0 8px 18px ${hexToRgba(DONE_COLOR, 0.28)}` } : undefined}
                              >
                                {done ? <Check className="h-4 w-4 text-white" strokeWidth={3.5} /> : <Circle className="h-5 w-5" style={{ color: DONE_COLOR }} />}
                              </button>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              {t.client ? (
                                <button onClick={() => setContact(t.client)} className="truncate rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 hover:bg-zinc-200">{t.client.businessName}</button>
                              ) : (
                                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">Internal</span>
                              )}
                              <button onClick={() => setViewId(t._id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"><Eye className="h-4 w-4" /> View</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }); })()}
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/70 text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-5 py-3 text-left font-medium">Sr.</th>
                <th className="px-5 py-3 text-left font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Due Date</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">View</th>
                <th className="px-5 py-3 font-medium">Done</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {!tasks ? (
                <tr><td colSpan={6}><Spinner /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="py-14 text-center text-zinc-400">No tasks for this day.</td></tr>
              ) : (
                (() => { let n = 0; return groupByBunch(rows).flatMap((entry) => {
                  const list = entry.type === 'bunch' ? entry.tasks : [entry.task];
                  const header = entry.type === 'bunch' ? [
                    <tr key={entry.key} className="bg-zinc-50">
                      <td colSpan={6} className="px-5 py-2.5">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white"><Layers className="h-3.5 w-3.5" /></span>
                          <span className="font-semibold text-zinc-900">{entry.name}</span>
                          {entry.client && <button onClick={() => setContact(entry.client)} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100">{entry.customer}</button>}
                          <span className="text-xs text-zinc-500">{entry.tasks.length} tasks</span>
                          <Progress done={entry.tasks.filter((t) => isDone(t.status)).length} total={entry.tasks.length} className="ml-auto w-44" />
                        </div>
                      </td>
                    </tr>,
                  ] : [];
                  return [...header, ...list.map((t) => {
                  const done = isDone(t.status);
                  const inBunch = entry.type === 'bunch';
                  n += 1;
                  return (
                    <tr key={t._id} className="border-l-4" style={rowTone(t, today)}>
                      <td className="px-5 py-3.5 font-mono text-xs text-zinc-400">#{n}</td>
                      <td className={`py-3.5 pr-5 ${inBunch ? 'pl-10' : 'pl-5'}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-semibold ${done ? 'text-zinc-500' : 'text-zinc-900'}`}>{t.title}</span>
                          {t.taskCategory === 'Meeting' && <span className="rounded border border-blue-300 bg-blue-100 px-1.5 text-[10px] font-bold uppercase text-blue-800">Meeting</span>}
                          {t.taskTime && <span className="text-xs text-zinc-500">{formatTime(t.taskTime)}</span>}
                          {t.checklist?.length > 0 && <span className="text-[11px] text-zinc-400">☑ {t.checklist.filter((c) => c.isCompleted).length}/{t.checklist.length}</span>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-center font-semibold text-zinc-600">{shortDay(t.dueDate)}</td>
                      <td className="px-5 py-3.5 text-center">
                        {t.client ? (
                          <button onClick={() => setContact(t.client)} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 hover:bg-zinc-200">{t.client.businessName}</button>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">Internal</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button onClick={() => setViewId(t._id)} className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"><Eye className="h-[18px] w-[18px]" /></button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-center">
                          <button
                            title={done ? 'Done' : 'Mark as Done'}
                            disabled={done}
                            onClick={() => markDone(t)}
                            className="group flex h-7 w-7 items-center justify-center rounded-full transition-all hover:scale-110 disabled:hover:scale-100"
                            style={done ? { backgroundColor: DONE_COLOR, boxShadow: `0 8px 18px ${hexToRgba(DONE_COLOR, 0.28)}` } : undefined}
                          >
                            {done ? <Check className="h-4 w-4 text-white" strokeWidth={3.5} /> : <Circle className="h-[18px] w-[18px]" style={{ color: DONE_COLOR }} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })];
                }); })()
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!confirm} onClose={() => !saving && setConfirm(null)} title="Confirm Action" description={confirm && <>Are you sure you want to mark <strong>"{confirm.title}"</strong> as <strong>Done</strong>?</>} footer={
        <>
          <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button onClick={submitDone} loading={saving} style={{ backgroundColor: DONE_COLOR }}>Confirm Done</Button>
        </>
      }>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">Update Note (Optional)</label>
        <Textarea rows={4} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a reason or brief update for this status change..." />
        <div className="mt-1 text-right text-[10px] font-medium text-zinc-400">{note.length}/300 characters</div>
      </Modal>
      <ViewTaskDialog taskId={viewId} onClose={() => setViewId(null)} onChanged={load} />
      <ContactModal client={contact} onClose={() => setContact(null)} />
    </div>
  );
}
