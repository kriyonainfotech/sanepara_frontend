import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, CheckCircle2, Clock, ListChecks } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { shortDay } from '../../lib/format';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Textarea } from '../ui/Field';

/**
 * Clock-out: daily tasks must be done first; then every still-pending task
 * needs a reason, one task at a time; then confirm.
 */
export default function ClockOutFlow({ open, onClose, onDone }) {
  const [check, setCheck] = useState(null);
  const [index, setIndex] = useState(0);
  const [reasons, setReasons] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCheck(null); setIndex(0); setReasons({}); setError('');
    api.get('/attendance/clock-out/check').then((r) => setCheck(r.data)).catch((e) => { toast.error(errorMessage(e)); onClose(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const needs = (check?.pending || []).filter((t) => !t.reasonGivenToday);
  const finished = index >= needs.length;
  const current = needs[index];

  const next = () => {
    if (!reasons[current._id]?.trim()) return setError('Please provide a reason before proceeding.');
    setError('');
    setIndex((i) => i + 1);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/attendance/clock-out', { reasons: needs.map((t) => ({ taskId: t._id, reason: reasons[t._id] })) });
      toast.success(data.message);
      onDone();
      onClose();
    } catch (e) {
      const d = e.response?.data?.details;
      toast.error(errorMessage(e) + (d?.daily ? `: ${d.daily.join(', ')}` : d?.missing ? `: ${d.missing.join(', ')}` : ''));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  // Daily tasks block clock-out entirely.
  if (check?.daily?.length) {
    return (
      <Modal open onClose={onClose} title={<span className="flex items-center gap-2 text-amber-600"><ListChecks className="h-5 w-5" /> Finish your daily tasks first</span>} footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Link to="/my-tasks" onClick={onClose}><Button>Go to My Tasks</Button></Link>
        </>
      }>
        <p className="mb-3 text-sm text-zinc-600">You can clock out once today's daily tasks are done:</p>
        <ul className="space-y-1.5">
          {check.daily.map((t) => (
            <li key={t._id} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-zinc-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> {t.title}
            </li>
          ))}
        </ul>
      </Modal>
    );
  }

  return (
    <Modal open onClose={() => (finished || !needs.length) && onClose()} size="lg" title={<span className="flex items-center gap-2"><Clock className="h-5 w-5" /> {needs.length ? 'Pending Task Remark' : 'Clock out'}</span>} footer={
      <div className="flex w-full items-center justify-between">
        <span className="text-xs text-zinc-400">{!finished && needs.length > 0 && 'Please provide a valid reason for each pending task.'}</span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {!check ? null : finished ? (
            <Button onClick={submit} loading={busy} className="!bg-rose-600 hover:!bg-rose-700">Confirm & Clock Out</Button>
          ) : (
            <Button onClick={next}>Save Reason, Next <ArrowRight className="h-4 w-4" /></Button>
          )}
        </div>
      </div>
    }>
      {!check ? (
        <div className="py-12 text-center text-sm text-zinc-400">Checking your tasks…</div>
      ) : needs.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" />
          <h3 className="font-semibold">{check.pending.length ? 'Reasons already given for today' : 'All tasks completed!'}</h3>
          <p className="mt-1 text-sm text-zinc-500">You can clock out for the day.</p>
        </div>
      ) : finished ? (
        <div className="flex flex-col items-center py-8 text-center">
          <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" />
          <h3 className="font-semibold">Reasons ready</h3>
          <p className="mt-1 text-sm text-zinc-500">Confirm to save them and clock out.</p>
        </div>
      ) : (
        <div key={index} className="animate-fade-in">
          <div className="mb-3 flex justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
            <span>Task {index + 1}</span><span>{needs.length} Pending</span>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <h4 className="text-lg font-semibold">{current.title}</h4>
            <p className="mb-4 mt-0.5 text-sm text-zinc-500">
              {[current.client?.businessName, `Due ${shortDay(current.dueDate)}`].filter(Boolean).join(' · ')}
            </p>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Why is this task still pending?</label>
            <Textarea autoFocus rows={4} className="bg-white" placeholder="Enter the reason here..." value={reasons[current._id] || ''}
              onChange={(e) => { setError(''); setReasons((r) => ({ ...r, [current._id]: e.target.value })); }} />
          </div>
          {error && <p className="mt-2 text-sm font-medium text-rose-500">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
