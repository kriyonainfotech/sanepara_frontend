import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../../lib/api';
import { formatMoney, localToday } from '../../lib/format';
import { PAY_MODES } from '../../lib/sales';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input, Select } from '../ui/Field';

export default function CollectDialog({ sale, onClose, onDone }) {
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (sale) setF({ amount: sale.balance, discount: '', date: localToday(), mode: 'Cash', reference: '', note: '' });
  }, [sale]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post(`/sales/${sale._id}/payments`, { ...f, amount: Number(f.amount) || 0, discount: Number(f.discount) || 0 });
      toast.success(data.message);
      onDone?.(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const left = sale ? sale.balance - (Number(f.amount) || 0) - (Number(f.discount) || 0) : 0;
  const govtDue = sale ? Math.max(0, sale.govtFee - sale.govtReceived) : 0;

  return (
    <Modal open={!!sale} onClose={onClose} title="Record Payment" description={sale && `${sale.saleNo} · ${sale.customer?.businessName || ''} · ${sale.title}`} footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="collect-form" loading={saving}>Save Payment</Button></>
    }>
      {sale && (
        <form id="collect-form" onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-zinc-50 p-3 text-center text-sm">
            <div><div className="text-[10px] font-bold uppercase text-zinc-400">Total</div><div className="font-semibold">{formatMoney(sale.totalAmount)}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-zinc-400">Received</div><div className="font-semibold text-emerald-700">{formatMoney(sale.receivedAmount)}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-zinc-400">Pending</div><div className="font-semibold text-rose-600">{formatMoney(sale.balance)}</div></div>
          </div>
          {govtDue > 0 && <p className="text-xs text-zinc-500">First {formatMoney(govtDue)} of this payment goes to the government fee, the rest is professional fee.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount received (₹)"><Input type="number" min="0" step="any" max={sale.balance} value={f.amount} onChange={set('amount')} autoFocus /></Field>
            <Field label="Discount / write-off (₹)" hint="Waived — reduces what they owe"><Input type="number" min="0" step="any" value={f.discount} onChange={set('discount')} placeholder="0" /></Field>
            <Field label="Date"><Input type="date" max={localToday()} value={f.date} onChange={set('date')} /></Field>
            <Field label="Mode"><Select value={f.mode} onChange={set('mode')}>{PAY_MODES.map((m) => <option key={m}>{m}</option>)}</Select></Field>
            <Field label="Reference" hint="UTR / cheque no."><Input value={f.reference} onChange={set('reference')} /></Field>
            <Field label="Note"><Input value={f.note} onChange={set('note')} /></Field>
          </div>
          <p className={`text-sm ${left < 0 ? 'text-rose-600' : 'text-zinc-600'}`}>{left < 0 ? 'More than what is pending.' : `Pending after this: ${formatMoney(left)}`}</p>
        </form>
      )}
    </Modal>
  );
}
