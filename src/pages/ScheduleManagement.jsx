import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import StatsSection from '../components/schedule/StatsSection';
import ClientColumn from '../components/schedule/ClientColumn';
import ServiceColumn from '../components/schedule/ServiceColumn';
import BunchScheduleDialog from '../components/schedule/BunchScheduleDialog';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field, Input } from '../components/ui/Field';

const DISMISSED_KEY = 'schedule_dismissed_customers';

function RenameDialog({ item, onClose, onDone }) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => setTitle(item?.content || ''), [item]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/schedule/${item._id}`, { content: title });
      toast.success('Task renamed');
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!item} onClose={onClose} size="sm" title="Rename Task" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="rename-form" loading={saving} disabled={!title.trim() || title === item?.content}>Update</Button>
      </>
    }>
      <form id="rename-form" onSubmit={submit}>
        <Field label="Task title"><Input required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      </form>
    </Modal>
  );
}

export default function ScheduleManagement() {
  const { can } = useAuth();
  const canManage = can('schedule', 'manage');
  const [summary, setSummary] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [bunches, setBunches] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [bunchesLoading, setBunchesLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [dismissed, setDismissed] = useState(() => JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'));

  const [dialog, setDialog] = useState(null); // { bunch, mode: 'new' | 'edit' }
  const [renaming, setRenaming] = useState(null);
  const [removing, setRemoving] = useState(null); // item
  const [unscheduling, setUnscheduling] = useState(null); // bunch
  const [busy, setBusy] = useState(false);

  const loadSummary = useCallback(
    () =>
      Promise.all([api.get('/schedule/summary'), api.get('/schedule/analytics')]).then(([s, a]) => {
        setSummary(s.data.data);
        setAnalytics(a.data.data);
      }),
    []
  );
  const loadBunches = useCallback((id) => {
    if (!id) return setBunches([]);
    setBunchesLoading(true);
    return api.get(`/schedule/customer/${id}`).then((r) => setBunches(r.data.data)).finally(() => setBunchesLoading(false));
  }, []);
  const refresh = () => Promise.all([loadSummary(), loadBunches(selectedId)]);

  useEffect(() => {
    loadSummary().finally(() => setLoading(false));
    api.get('/users', { params: { active: true } }).then((r) => setMembers(r.data.users));
  }, [loadSummary]);

  // A dismissed customer comes back as soon as it has open work again.
  useEffect(() => {
    const stillDone = dismissed.filter((id) => {
      const s = summary.find((c) => c._id === id);
      return s && s.total > 0 && s.unscheduled === 0 && s.scheduled === 0;
    });
    if (summary.length && stillDone.length !== dismissed.length) {
      setDismissed(stillDone);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(stillDone));
    }
  }, [summary, dismissed]);

  const clients = useMemo(() => summary.filter((c) => !dismissed.includes(c._id)), [summary, dismissed]);

  useEffect(() => {
    if (clients.length && !clients.some((c) => c._id === selectedId)) setSelectedId(clients[0]._id);
    if (!clients.length) setSelectedId('');
  }, [clients, selectedId]);
  useEffect(() => { loadBunches(selectedId); }, [selectedId, loadBunches]);

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  };

  const waiting = bunches.filter((b) => b.unscheduled > 0);
  const scheduled = bunches.filter((b) => b.scheduled + b.completed > 0).sort((a, b) => (b.scheduled > 0) - (a.scheduled > 0) || (a.dueDate || '').localeCompare(b.dueDate || ''));
  const selected = summary.find((c) => c._id === selectedId);

  const submitSchedule = async (form) => {
    try {
      const { bunch, mode } = dialog;
      const { data } = mode === 'edit'
        ? await api.put(`/schedule/bunch/${bunch._id}`, form)
        : await api.post(`/schedule/bunch/${bunch._id}`, form);
      const name = members.find((m) => m._id === form.assignedTo)?.name;
      toast.success(mode === 'edit' ? data.message : `${data.message} for ${name}`);
      setDialog(null);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const run = async (fn, done) => {
    setBusy(true);
    try {
      const { data } = await fn();
      toast.success(data.message);
      done();
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Schedule Management</h1>
        <p className="mt-1 text-sm text-zinc-500">Pick a customer and schedule a whole service — all its tasks go to the member together.</p>
      </div>

      <StatsSection
        totalClients={clients.length}
        totalServices={analytics?.totalServices || 0}
        unscheduled={analytics?.totalPending || 0}
        scheduled={analytics?.totalScheduled || 0}
        completed={analytics?.totalCompleted || 0}
      />

      <div className="mt-6 grid grid-cols-1 border-t border-zinc-200/70 pt-5 lg:grid-cols-3">
        <div className="min-w-0 pb-6 lg:border-r lg:border-zinc-200/70 lg:pb-0 lg:pr-6">
          <ClientColumn clients={clients} selectedId={selectedId} onSelect={setSelectedId} onDismiss={dismiss} loading={loading} />
        </div>
        <div className="min-w-0 pb-6 lg:border-r lg:border-zinc-200/70 lg:px-6 lg:pb-0">
          <ServiceColumn title="Unscheduled Services" bunches={waiting} type="unscheduled" canManage={canManage} loading={bunchesLoading && !bunches.length}
            onSchedule={(b) => setDialog({ bunch: b, mode: 'new' })} onRename={setRenaming} onDelete={setRemoving} />
        </div>
        <div className="min-w-0 lg:pl-6">
          <ServiceColumn title="Scheduled Services" bunches={scheduled} type="scheduled" canManage={canManage} loading={bunchesLoading && !bunches.length}
            onEdit={(b) => setDialog({ bunch: b, mode: 'edit' })} onUnschedule={setUnscheduling} onRename={setRenaming} onDelete={setRemoving} />
        </div>
      </div>

      <BunchScheduleDialog bunch={dialog?.bunch} mode={dialog?.mode} customerName={selected?.businessName} members={members} onClose={() => setDialog(null)} onSubmit={submitSchedule} />
      <RenameDialog item={renaming} onClose={() => setRenaming(null)} onDone={refresh} />
      <ConfirmDialog
        open={!!unscheduling}
        onClose={() => setUnscheduling(null)}
        onConfirm={() => run(() => api.delete(`/schedule/bunch/${unscheduling._id}`), () => setUnscheduling(null))}
        loading={busy}
        confirmText="Unschedule"
        title="Unschedule this service?"
        message={`Open tasks of ${unscheduling?.serviceName} are removed from the member and the service goes back to Unscheduled. Completed tasks stay.`}
      />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => run(() => api.delete(`/schedule/${removing._id}`), () => setRemoving(null))}
        loading={busy}
        confirmText="Remove"
        title="Remove this task from the service?"
        message={`"${removing?.content}" is removed for this customer (its scheduled task too, if any).`}
      />
    </div>
  );
}
