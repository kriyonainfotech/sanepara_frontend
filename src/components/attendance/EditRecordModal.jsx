import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { longDay } from '../../lib/format';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input } from '../ui/Field';

const STATUSES = ['Full Day', 'Half Day', 'Absent', 'Leave'];

export default function EditRecordModal({ row, onClose, onDone }) {
  const [inTime, setIn] = useState('');
  const [outTime, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setIn(row?.record?.inTime || ''); setOut(row?.record?.outTime || ''); }, [row]);

  const save = async (status) => {
    setBusy(true);
    try {
      await api.put(`/attendance/${row.record._id}`, { inTime, outTime, ...(status && { status }) });
      toast.success('Attendance updated');
      onDone(); onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const clear = async () => {
    setBusy(true);
    try {
      await api.delete(`/attendance/${row.record._id}`);
      toast.success('Attendance cleared');
      onDone(); onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!row} onClose={onClose} title="Update Attendance" description={row && `${row.member.name} · ${longDay(row.record.date)}`} footer={
      <div className="flex w-full items-center justify-between">
        <Button variant="ghost" icon={Trash2} onClick={clear} disabled={busy} className="!text-red-600 hover:!bg-red-50">Clear Record</Button>
        <div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => save()} loading={busy}>Save Changes</Button></div>
      </div>
    }>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Clock In Time"><Input type="time" value={inTime} onChange={(e) => setIn(e.target.value)} /></Field>
          <Field label="Clock Out Time"><Input type="time" value={outTime} onChange={(e) => setOut(e.target.value)} /></Field>
        </div>
        <p className="text-xs text-zinc-500">Save Changes works out the status from the hours (Full ≥ {row?.member.fullDayHours ?? 8}h, Half ≥ {row?.member.halfDayHours ?? 4}h). Or set a status directly:</p>
        <div className="grid grid-cols-4 gap-2">
          {STATUSES.map((s) => (
            <Button key={s} variant="secondary" size="sm" className="justify-center" disabled={busy || row?.record.status === s} onClick={() => save(s)}>{s.split(' ')[0]}</Button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
