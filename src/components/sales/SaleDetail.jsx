import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { IndianRupee, Pencil, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, longDay } from '../../lib/format';
import { SALE_STATUS_TONE } from '../../lib/sales';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import CollectDialog from './CollectDialog';
import SaleDialog from './SaleDialog';

export default function SaleDetail({ saleId, onClose, onChanged }) {
  const { can } = useAuth();
  const [data, setData] = useState(null);
  const [collecting, setCollecting] = useState(false);
  const [editing, setEditing] = useState(false);
  const canCollect = can('sales', 'collect') || can('sales', 'edit');

  const load = () => api.get(`/sales/${saleId}`).then((r) => setData(r.data));
  useEffect(() => { setData(null); if (saleId) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [saleId]);
  const changed = () => { load(); onChanged?.(); };

  const removePayment = async (p) => {
    if (!window.confirm(`Remove payment of ${formatMoney(p.amount + p.discount)}?`)) return;
    try {
      await api.delete(`/sales/${saleId}/payments/${p._id}`);
      toast.success('Payment removed');
      changed();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const s = data?.data;
  return (
    <>
      <Modal open={!!saleId} onClose={onClose} size="lg" title={s ? `Sale ${s.saleNo}` : 'Sale'} description={s && `${s.customer?.businessName} · ${longDay(s.saleDate)}`} footer={s && (
        <>
          {can('sales', 'edit') && <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)} className="mr-auto">Edit</Button>}
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {canCollect && s.balance > 0 && <Button icon={IndianRupee} onClick={() => setCollecting(true)}>Record Payment</Button>}
        </>
      )}>
        {!s ? <Spinner /> : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">{s.title}</h3>
              <Badge tone={SALE_STATUS_TONE[s.status]}>{s.status}</Badge>
              {s.service && <Badge>{s.service.name}</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[['Professional fee', s.professionalFee], ['Govt fee', s.govtFee], ['Total', s.totalAmount], ['Pending', s.balance]].map(([l, v]) => (
                <div key={l} className="rounded-lg border border-zinc-200 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{l}</div><div className={`text-lg font-semibold tabular-nums ${l === 'Pending' && v > 0 ? 'text-rose-600' : ''}`}>{formatMoney(v)}</div></div>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600">
              <span>Received <b className="text-emerald-700">{formatMoney(s.receivedAmount)}</b></span>
              {s.discountAmount > 0 && <span>Discount <b>{formatMoney(s.discountAmount)}</b></span>}
              <span>Govt fee covered <b>{formatMoney(s.govtReceived)}</b> / {formatMoney(s.govtFee)}</span>
              {s.soldBy && <span>Sold by <b>{s.soldBy.name}</b></span>}
              {s.b2bPartner && <span>Partner <b>{s.b2bPartner.name}</b> {s.b2bPercent}% = <b>{formatMoney(s.b2bCommission)}</b></span>}
              {s.referredBy && <span>Referred by <b>{s.referredBy}</b>{s.referralAmount > 0 && <> = <b>{formatMoney(s.referralAmount)}</b></>}</span>}
            </div>
            {s.notes && <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">{s.notes}</p>}

            <div>
              <h4 className="mb-2 text-sm font-semibold">Payments</h4>
              {data.payments.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-sm text-zinc-400">No payment yet.</p>
              ) : (
                <>
                <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 lg:hidden">
                  {data.payments.map((p) => (
                    <li key={p._id} className="p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium">{longDay(p.date)}</div>
                          <div className="text-xs text-zinc-400">{[p.reference, p.note, p.receivedBy?.name && `by ${p.receivedBy.name}`].filter(Boolean).join(' · ')}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold tabular-nums">{formatMoney(p.amount)}</div>
                          {p.discount > 0 && <div className="text-xs text-zinc-400">+{formatMoney(p.discount)} discount</div>}
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-500">
                        <Badge>{p.mode}</Badge>
                        <span className="tabular-nums">Govt {formatMoney(p.govtPart)} / Prof. {formatMoney(p.professionalPart)}</span>
                        {canCollect && <button onClick={() => removePayment(p)} className="ml-auto rounded p-1 text-zinc-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 lg:block">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
                      <tr><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Mode</th><th className="px-3 py-2 text-right font-medium">Amount</th><th className="px-3 py-2 text-right font-medium">Govt / Prof.</th><th className="px-3 py-2" /></tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {data.payments.map((p) => (
                        <tr key={p._id}>
                          <td className="px-3 py-2">{longDay(p.date)}<div className="text-xs text-zinc-400">{[p.reference, p.note, p.receivedBy?.name && `by ${p.receivedBy.name}`].filter(Boolean).join(' · ')}</div></td>
                          <td className="px-3 py-2"><Badge>{p.mode}</Badge></td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatMoney(p.amount)}{p.discount > 0 && <div className="text-xs text-zinc-400">+{formatMoney(p.discount)} discount</div>}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums text-zinc-500">{formatMoney(p.govtPart)} / {formatMoney(p.professionalPart)}</td>
                          <td className="px-3 py-2 text-right">{canCollect && <button onClick={() => removePayment(p)} className="rounded p-1 text-zinc-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
      <CollectDialog sale={collecting ? s : null} onClose={() => setCollecting(false)} onDone={changed} />
      <SaleDialog open={editing} onClose={() => setEditing(false)} sale={s} onSaved={changed} />
    </>
  );
}
