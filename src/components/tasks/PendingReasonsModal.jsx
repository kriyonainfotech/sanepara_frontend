import { AlertTriangle } from 'lucide-react';
import Modal from '../ui/Modal';

export default function PendingReasonsModal({ task, onClose }) {
  const reasons = task?.pendingReasons || [];
  return (
    <Modal open={!!task} onClose={onClose} size="sm" title={<span className="flex items-center gap-2 text-rose-600"><AlertTriangle className="h-5 w-5" /> Pending Reasons History</span>}>
      <div className="max-h-96 space-y-3 overflow-y-auto">
        {[...reasons].reverse().map((p, i) => (
          <div key={i} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-zinc-500">{new Date(p.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              <span className="rounded-md border border-rose-200 bg-white px-1.5 text-[10px] font-medium text-rose-500">Day {reasons.length - i}</span>
            </div>
            <p className="text-sm font-medium text-zinc-800">{p.reason}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
