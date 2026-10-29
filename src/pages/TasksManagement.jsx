import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CalendarDays, Eye, FilterX, Layers, MoreHorizontal, Pencil, Plus, Search, Trash, X } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { localToday, monthEndKey, monthStartKey, monthLabel, shortDay } from '../lib/format';
import { formatTime, groupByBunch, isDone, sortTasks } from '../lib/taskConfig';
import Progress from '../components/ui/Progress';
import Button from '../components/ui/Button';
import Checkbox from '../components/ui/Checkbox';
import Popover from '../components/ui/Popover';
import Spinner from '../components/ui/Spinner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Input, Select } from '../components/ui/Field';
import StatusSelect from '../components/tasks/StatusSelect';
import SearchSelect from '../components/tasks/SearchSelect';
import MiniCalendar from '../components/tasks/MiniCalendar';
import TaskDialog from '../components/tasks/TaskDialog';
import ViewTaskDialog from '../components/tasks/ViewTaskDialog';
import BulkTaskDialog from '../components/tasks/BulkTaskDialog';
import PendingReasonsModal from '../components/tasks/PendingReasonsModal';

const TABS = [
  { key: 'Personal', label: 'My Tasks' },
  { key: 'Superadmin', label: 'Superadmin Tasks' },
  { key: 'Admin', label: 'Admin Tasks' },
  { key: 'Team', label: 'Team Tasks' },
];
const TAB_KEY = 'tasks-tab';

export default function TasksManagement() {
  const { user, can } = useAuth();
  const [tab, setTab] = useState(() => (TABS.some((t) => t.key === localStorage.getItem(TAB_KEY)) ? localStorage.getItem(TAB_KEY) : 'Personal'));
  const [saUser, setSaUser] = useState('');
  const [members, setMembers] = useState([]);
  const [customers, setCustomers] = useState([]);

  const today = localToday();
  const [range, setRange] = useState({ from: today, to: today });
  const [calMonth, setCalMonth] = useState(today);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [client, setClient] = useState('all');
  const [assignee, setAssignee] = useState('all');

  const [tasks, setTasks] = useState(null);
  const [calendar, setCalendar] = useState({});
  const [selected, setSelected] = useState([]);
  const [dialog, setDialog] = useState(null); // { task? }
  const [viewId, setViewId] = useState(null);
  const [reasonsTask, setReasonsTask] = useState(null);
  const [deleting, setDeleting] = useState(null); // task | 'bulk'
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState('');
  const [busy, setBusy] = useState(false);

  const otherSuperAdmins = useMemo(() => members.filter((m) => m.role === 'superadmin' && m._id !== user._id), [members, user._id]);

  useEffect(() => {
    api.get('/users', { params: { active: true } }).then((r) => setMembers(r.data.users));
    api.get('/customers/options').then((r) => setCustomers(r.data.data));
  }, []);
  useEffect(() => {
    if (tab === 'Superadmin' && !saUser && otherSuperAdmins.length) setSaUser(otherSuperAdmins[0]._id);
  }, [tab, saUser, otherSuperAdmins]);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setSearch(text), 300);
    return () => clearTimeout(t);
  }, [text]);

  // Switching tab resets filters to today, like the original.
  const switchTab = (key) => {
    setTab(key);
    localStorage.setItem(TAB_KEY, key);
    setText(''); setSearch(''); setStatus('all'); setClient('all'); setAssignee('all');
    setRange({ from: today, to: today }); setCalMonth(today); setSelected([]); setTasks(null);
  };

  const scope = useMemo(() => {
    const p = { type: tab === 'Superadmin' ? 'Personal' : tab };
    if (tab === 'Personal') p.assignedTo = user._id;
    if (tab === 'Superadmin') p.assignedTo = saUser || 'none';
    if ((tab === 'Team' || tab === 'Admin') && assignee !== 'all') p.assignedTo = assignee;
    if (client !== 'all') p.client = client;
    if (status !== 'all') p.status = status;
    if (search) p.search = search;
    return p;
  }, [tab, user._id, saUser, assignee, client, status, search]);

  const blocked = tab === 'Superadmin' && !saUser;

  const loadTasks = useCallback(() => {
    if (blocked) return setTasks([]);
    return api.get('/tasks', { params: { ...scope, startDate: range.from, endDate: range.to } }).then((r) => setTasks(r.data.data));
  }, [scope, range, blocked]);
  const loadCalendar = useCallback(() => {
    if (blocked) return setCalendar({});
    const { status: _s, search: _q, ...calScope } = scope; // calendar shows the whole picture for the people/customer chosen
    return api.get('/tasks/calendar', { params: { ...calScope, month: calMonth } }).then((r) => setCalendar(r.data.data));
  }, [scope, calMonth, blocked]);
  const reload = () => { loadTasks(); loadCalendar(); };

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { loadCalendar(); }, [loadCalendar]);
  useEffect(() => setSelected([]), [tasks]);

  const shown = useMemo(() => sortTasks(tasks || []), [tasks]);
  const rangeStats = useMemo(() => {
    let total = 0, done = 0;
    for (const [d, v] of Object.entries(calendar)) if (d >= range.from && d <= range.to) { total += v.total; done += v.completed; }
    return { total, done, pending: total - done };
  }, [calendar, range]);

  const isMonth = range.from === monthStartKey(range.from) && range.to === monthEndKey(range.from);
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => `${today.slice(0, 4)}-${String(i + 1).padStart(2, '0')}-01`), [today]);
  const pickMonth = (m) => { setRange({ from: m, to: monthEndKey(m) }); setCalMonth(m); };

  const hasFilters = !!text || status !== 'all' || client !== 'all' || assignee !== 'all' || range.from !== today || range.to !== today;
  const clearFilters = () => { setText(''); setStatus('all'); setClient('all'); setAssignee('all'); setRange({ from: today, to: today }); setCalMonth(today); };

  const assigneeOptions = members.filter((m) => (tab === 'Team' ? m.role === 'team' : m.role === 'admin'));
  const tabLabel = tab === 'Superadmin' ? 'Partner' : tab === 'Personal' ? 'Personal' : tab;

  // --- actions ---
  const save = async (data) => {
    try {
      const payload = { ...data };
      if (tab === 'Personal' && !dialog?.task) payload.assignedTo = user._id;
      if (tab === 'Superadmin') { payload.type = 'Personal'; payload.assignedTo = saUser; }
      if (dialog?.task) {
        await api.put(`/tasks/${dialog.task._id}`, payload);
        toast.success('Task updated successfully');
      } else {
        await api.post('/tasks', payload);
        toast.success('Task created successfully');
      }
      setDialog(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const changeStatus = async (task, value) => {
    try {
      await api.patch(`/tasks/${task._id}/status`, { status: value });
      toast.success('Status updated');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      if (deleting === 'bulk') {
        const { data } = await api.post('/tasks/bulk/delete', { taskIds: selected });
        toast.success(data.message);
      } else {
        await api.delete(`/tasks/${deleting._id}`);
        toast.success('Task deleted successfully');
      }
      setDeleting(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const bulkUpdate = async (updates) => {
    try {
      const { data } = await api.put('/tasks/bulk/update', { taskIds: selected, updates });
      toast.success(data.message);
      setBulkDate('');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const allChecked = shown.length > 0 && selected.length === shown.length;
  const toggleRow = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const dialogType = dialog?.task ? dialog.task.type : tab === 'Superadmin' ? 'Personal' : tab;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        {/* Tabs */}
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 sm:grid-cols-4">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => switchTab(t.key)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'Superadmin' && (
          <div className="mb-3 flex gap-2 overflow-x-auto">
            {otherSuperAdmins.length === 0 ? (
              <p className="text-sm text-zinc-500">There are no other Super Admins yet.</p>
            ) : (
              otherSuperAdmins.map((a) => (
                <button key={a._id} onClick={() => setSaUser(a._id)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${saUser === a._id ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'}`}>
                  {a.name}
                </button>
              ))
            )}
          </div>
        )}

        {/* Search + add */}
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by task, customer, assignee, creator, status, category..." className="h-10 pl-9" />
          </div>
          {can('tasks', 'create') && (
            <>
              <Button variant="secondary" className="h-10 hidden md:inline-flex" onClick={() => setBulkOpen(true)}>Bulk Add</Button>
              <Button icon={Plus} className="h-10" onClick={() => setDialog({})} disabled={blocked}>
                <span className="hidden sm:inline">Add {tabLabel} Task</span><span className="sm:hidden">Add</span>
              </Button>
            </>
          )}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="w-44">
            <Select value={isMonth ? range.from : ''} onChange={(e) => e.target.value && pickMonth(e.target.value)}>
              <option value="">{range.from === range.to ? shortDay(range.from) : 'Select Month'}</option>
              {monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </Select>
          </div>
          <StatusSelect value={status} onChange={setStatus} includeAll className="w-36 [&>button]:h-9 [&>button]:text-sm" />
          {(tab === 'Team' || tab === 'Admin') && (
            <div className="w-40">
              <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="all">{tab === 'Team' ? 'All Team' : 'All Admins'}</option>
                {assigneeOptions.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </Select>
            </div>
          )}
          <SearchSelect options={customers.map((c) => ({ value: c._id, label: c.businessName }))} value={client} onChange={setClient} allLabel="All Customers" placeholder="Search customer..." />
          {hasFilters && <Button variant="ghost" size="sm" icon={FilterX} onClick={clearFilters} className="!text-red-600">Clear</Button>}
        </div>

        {/* Bulk bar */}
        {selected.length > 0 && (
          <div className="sticky top-0 z-20 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-white shadow-lg animate-pop-in">
            <div className="flex items-center gap-2 text-sm"><span className="rounded-full bg-white/20 px-2.5 py-0.5 font-semibold">{selected.length}</span> selected</div>
            <div className="flex items-center gap-2">
              {can('tasks', 'edit') && (
                <>
                  <StatusSelect value="" placeholder="Change Status" onChange={(v) => bulkUpdate({ status: v })} className="w-40 [&>button]:border-white/20 [&>button]:bg-white/10 [&>button]:text-white" />
                  <Popover align="right" panelClassName="w-64 p-3" trigger={({ toggle }) => (
                    <button onClick={toggle} className="flex h-8 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-medium hover:bg-white/20"><CalendarDays className="h-4 w-4" /> Change Date</button>
                  )}>
                    {({ close }) => (
                      <div className="space-y-3 text-zinc-900">
                        <div className="text-sm font-medium">Select New Due Date</div>
                        <Input type="date" min={today} value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} />
                        <Button size="sm" className="w-full justify-center" disabled={!bulkDate} onClick={() => { bulkUpdate({ dueDate: bulkDate }); close(); }}>Update {selected.length} Tasks</Button>
                      </div>
                    )}
                  </Popover>
                </>
              )}
              {can('tasks', 'delete') && (
                <button onClick={() => setDeleting('bulk')} className="flex h-8 items-center gap-2 rounded-lg bg-red-600 px-3 text-xs font-medium hover:bg-red-700"><Trash className="h-4 w-4" /> Delete</button>
              )}
              <button onClick={() => setSelected([])} className="rounded-full p-1.5 hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        {/* Phones & tablets: task cards (same selection, status and actions as the table) */}
        <div className="lg:hidden">
          {!tasks ? <Spinner /> : shown.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white py-14 text-center text-sm text-zinc-400">No tasks found for this range.</div>
          ) : (
            <div className="space-y-4">
              <label className="flex items-center gap-2 px-1 text-xs font-medium text-zinc-500">
                <Checkbox checked={allChecked} indeterminate={!allChecked && selected.length > 0} onChange={() => setSelected(allChecked ? [] : shown.map((t) => t._id))} /> Select all
              </label>
              {(() => { let n = 0; return groupByBunch(shown).map((entry) => {
                const list = entry.type === 'bunch' ? entry.tasks : [entry.task];
                const ids = list.map((t) => t._id);
                const allIn = ids.every((id) => selected.includes(id));
                const inBunch = entry.type === 'bunch';
                return (
                  <div key={inBunch ? entry.key : entry.task._id} className="space-y-2">
                    {inBunch && (
                      <div className="rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200">
                        <div className="flex flex-wrap items-center gap-2">
                          <Checkbox checked={allIn} indeterminate={!allIn && ids.some((id) => selected.includes(id))} onChange={() => setSelected((s) => (allIn ? s.filter((id) => !ids.includes(id)) : [...new Set([...s, ...ids])]))} />
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white"><Layers className="h-3.5 w-3.5" /></span>
                          <span className="font-semibold text-zinc-900">{entry.name}</span>
                          <span className="text-xs text-zinc-500">{entry.customer} · {list[0].assignedTo?.name} · {list.length} tasks</span>
                        </div>
                        <Progress done={list.filter((t) => isDone(t.status)).length} total={list.length} className="mt-2" />
                      </div>
                    )}
                    <div className={`grid gap-2 sm:grid-cols-2 ${inBunch ? 'pl-3' : ''}`}>
                      {list.map((t) => { n += 1; return (
                        <div key={t._id} className={`rounded-xl border p-4 transition-colors ${selected.includes(t._id) ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 bg-white'}`}>
                          <div className="flex items-start gap-3">
                            <Checkbox checked={selected.includes(t._id)} onChange={() => toggleRow(t._id)} className="mt-1" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-700">{n}</span>
                                <span className="font-medium text-zinc-900">{t.title}</span>
                                {t.taskCategory === 'Meeting' && <span className="rounded border border-blue-300 bg-blue-100 px-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">Meeting</span>}
                                {t.isDailyTask && <span className="rounded border border-violet-200 bg-violet-50 px-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">Daily</span>}
                                {t.checklist?.length > 0 && <span className="text-[11px] text-zinc-400">☑ {t.checklist.filter((c) => c.isCompleted).length}/{t.checklist.length}</span>}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500">
                                {[t.assignedTo?.name || 'Unknown', shortDay(t.dueDate), !inBunch && t.client?.businessName, t.taskTime && formatTime(t.taskTime)].filter(Boolean).join(' · ')}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-1">
                            <StatusSelect value={t.status} onChange={(v) => changeStatus(t, v)} disabled={!can('tasks', 'edit') && t.assignedTo?._id !== user._id} className="min-w-0 flex-1" />
                            <button title="View Task" onClick={() => setViewId(t._id)} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"><Eye className="h-4 w-4" /></button>
                            {t.pendingReasons?.length > 0 && (
                              <button title="View Pending Reasons" onClick={() => setReasonsTask(t)} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50"><AlertTriangle className="h-4 w-4 fill-rose-500 text-rose-100" /></button>
                            )}
                            {(can('tasks', 'edit') || can('tasks', 'delete')) && (
                              <Popover align="right" panelClassName="w-36" trigger={({ toggle }) => (
                                <button onClick={toggle} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"><MoreHorizontal className="h-4 w-4" /></button>
                              )}>
                                {({ close }) => (
                                  <>
                                    {can('tasks', 'edit') && <button onClick={() => { setDialog({ task: t }); close(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"><Pencil className="h-3.5 w-3.5" /> Edit Task</button>}
                                    {can('tasks', 'delete') && <button onClick={() => { setDeleting(t); close(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"><Trash className="h-3.5 w-3.5" /> Delete</button>}
                                  </>
                                )}
                              </Popover>
                            )}
                          </div>
                        </div>
                      ); })}
                    </div>
                  </div>
                );
              }); })()}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs text-zinc-500">
                <th className="w-10 px-4 py-2.5"><Checkbox checked={allChecked} indeterminate={!allChecked && selected.length > 0} onChange={() => setSelected(allChecked ? [] : shown.map((t) => t._id))} /></th>
                <th className="w-14 px-2 py-2.5 font-medium">Sr.no</th>
                <th className="px-3 py-2.5 font-medium">Task</th>
                <th className="px-3 py-2.5 font-medium">Name</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">Due Date</th>
                <th className="w-40 px-3 py-2.5 font-medium">Status</th>
                <th className="w-28 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {!tasks ? (
                <tr><td colSpan={7}><Spinner /></td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={7} className="py-14 text-center text-sm text-zinc-400">No tasks found for this range.</td></tr>
              ) : (
                (() => { let n = 0; return groupByBunch(shown).flatMap((entry) => {
                  const list = entry.type === 'bunch' ? entry.tasks : [entry.task];
                  const ids = list.map((t) => t._id);
                  const allIn = ids.every((id) => selected.includes(id));
                  const header = entry.type === 'bunch' ? [
                    <tr key={entry.key} className="bg-zinc-50/80">
                      <td className="px-4 py-2.5"><Checkbox checked={allIn} indeterminate={!allIn && ids.some((id) => selected.includes(id))} onChange={() => setSelected((s) => (allIn ? s.filter((id) => !ids.includes(id)) : [...new Set([...s, ...ids])]))} /></td>
                      <td colSpan={6} className="px-2 py-2.5">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white"><Layers className="h-3.5 w-3.5" /></span>
                          <span className="font-semibold text-zinc-900">{entry.name}</span>
                          <span className="text-xs text-zinc-500">{entry.customer} · {list[0].assignedTo?.name} · {list.length} tasks</span>
                          <Progress done={list.filter((t) => isDone(t.status)).length} total={list.length} className="ml-auto w-40" />
                        </div>
                      </td>
                    </tr>,
                  ] : [];
                  return [...header, ...list.map((t) => { n += 1; const inBunch = entry.type === 'bunch'; return (
                  <tr key={t._id} className={`transition-colors ${selected.includes(t._id) ? 'bg-zinc-50' : 'hover:bg-zinc-50/60'}`}>
                    <td className="px-4 py-3"><Checkbox checked={selected.includes(t._id)} onChange={() => toggleRow(t._id)} /></td>
                    <td className="px-2 py-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">{n}</span></td>
                    <td className={`py-3 pr-3 ${inBunch ? 'pl-8' : 'pl-3'}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-zinc-900">{t.title}</span>
                        {t.taskCategory === 'Meeting' && <span className="rounded border border-blue-300 bg-blue-100 px-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">Meeting</span>}
                        {t.isDailyTask && <span className="rounded border border-violet-200 bg-violet-50 px-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">Daily</span>}
                        {t.checklist?.length > 0 && <span className="text-[11px] text-zinc-400">☑ {t.checklist.filter((c) => c.isCompleted).length}/{t.checklist.length}</span>}
                      </div>
                      {((!inBunch && t.client) || t.taskTime) && (
                        <div className="mt-0.5 text-xs text-zinc-500">{[!inBunch && t.client?.businessName, t.taskTime && formatTime(t.taskTime)].filter(Boolean).join(' · ')}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-medium capitalize text-zinc-600">{t.assignedTo?.name || 'Unknown'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-zinc-500">{shortDay(t.dueDate)}</td>
                    <td className="px-3 py-3"><StatusSelect value={t.status} onChange={(v) => changeStatus(t, v)} disabled={!can('tasks', 'edit') && t.assignedTo?._id !== user._id} /></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <button title="View Task" onClick={() => setViewId(t._id)} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"><Eye className="h-4 w-4" /></button>
                        {t.pendingReasons?.length > 0 && (
                          <button title="View Pending Reasons" onClick={() => setReasonsTask(t)} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50"><AlertTriangle className="h-4 w-4 fill-rose-500 text-rose-100" /></button>
                        )}
                        {(can('tasks', 'edit') || can('tasks', 'delete')) && (
                          <Popover align="right" panelClassName="w-36" trigger={({ toggle }) => (
                            <button onClick={toggle} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"><MoreHorizontal className="h-4 w-4" /></button>
                          )}>
                            {({ close }) => (
                              <>
                                {can('tasks', 'edit') && <button onClick={() => { setDialog({ task: t }); close(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"><Pencil className="h-3.5 w-3.5" /> Edit Task</button>}
                                {can('tasks', 'delete') && <button onClick={() => { setDeleting(t); close(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"><Trash className="h-3.5 w-3.5" /> Delete</button>}
                              </>
                            )}
                          </Popover>
                        )}
                      </div>
                    </td>
                  </tr>
                ); })];
                }); })()
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="min-w-0 border-t border-zinc-200 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center rounded-lg border border-zinc-200 bg-zinc-50 py-2"><span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total</span><span className="text-xl font-black tabular-nums">{rangeStats.total}</span></div>
          <div className="flex flex-col items-center rounded-lg border border-emerald-500/15 bg-emerald-500/5 py-2"><span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Done</span><span className="text-xl font-black tabular-nums text-emerald-600">{rangeStats.done}</span></div>
          <div className="flex flex-col items-center rounded-lg border border-amber-500/15 bg-amber-500/5 py-2"><span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending</span><span className="text-xl font-black tabular-nums text-amber-600">{rangeStats.pending}</span></div>
        </div>
        <h2 className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-zinc-400">Calendar</h2>
        <MiniCalendar month={calMonth} onMonthChange={setCalMonth} selected={range.from === range.to ? range.from : null} onSelect={(d) => setRange({ from: d, to: d })} dayInfo={(d) => calendar[d]} />
        <div className="mt-3 flex justify-center gap-4 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ef4444]" /> Overdue</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#eab308]" /> Pending</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#22c55e]" /> All done</span>
        </div>
      </aside>

      <TaskDialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        onSubmit={save}
        initialData={dialog?.task}
        type={dialogType}
        members={members}
        customers={customers}
        defaultAssignee={tab === 'Team' || tab === 'Admin' ? (assignee !== 'all' ? assignee : '') : ''}
        defaultDueDate={range.from >= today ? range.from : today}
        lockClient={!!dialog?.task?.scheduleItem}
      />
      <ViewTaskDialog taskId={viewId} onClose={() => setViewId(null)} onChanged={loadTasks} />
      <PendingReasonsModal task={reasonsTask} onClose={() => setReasonsTask(null)} />
      <BulkTaskDialog open={bulkOpen} onClose={() => setBulkOpen(false)} onDone={reload} members={members} customers={customers} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        confirmText={deleting === 'bulk' ? `Delete ${selected.length} Tasks` : 'Delete Task'}
        title={deleting === 'bulk' ? 'Delete selected tasks?' : 'Delete Task?'}
        message="Are you sure you want to remove this? Scheduled customer work goes back to Unscheduled. This cannot be undone."
      />
    </div>
  );
}
