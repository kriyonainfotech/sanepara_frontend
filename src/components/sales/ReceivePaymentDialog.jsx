import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { WandSparkles } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { formatMoney, localToday, shortDay } from '../../lib/format';
import { PAY_MODES } from '../../lib/sales';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input, Select } from '../ui/Field';
import BankSelect from '../BankSelect';

const round = (n) => Math.round(n * 100) / 100;

// Split `amount` over the sales, oldest first.
const autoSplit = (sales, amount) => {
  let left = Number(amount) || 0;
  const out = {};
  for (const s of sales) {
    const a = round(Math.min(left, s.balance));
    out[s._id] = a > 0 ? String(a) : '';
    left = round(left - Math.max(a, 0));
  }
  return out;
};

// One payment from the customer covering several pending sales (e.g. all their firms).
export default function ReceivePaymentDialog({ open, customerId, customerName, sales, onClose, onDone }) {
  const pending = useMemo(() => (sales || []).filter((s) => s.balance > 0).sort((a, b) => a.saleDate.localeCompare(b.saleDate)), [sales]);
  const due = round(pending.reduce((a, s) => a + s.balance, 0));
  const [f, setF] = useState({});
  const [split, setSplit] = useState({});
  const [manual, setManual] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({ amount: String(due), date: localToday(), mode: 'Cash', bank: '', reference: '', note: '' });
    setSplit(autoSplit(pending, due));
    setManual(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setAmount = (v) => {
    setF({ ...f, amount: v });
    if (!manual) setSplit(autoSplit(pending, v));
  };
  const amount = round(Number(f.amount) || 0);
  const splitTotal = round(Object.values(split).reduce((a, v) => a + (Number(v) || 0), 0));
  const over = pending.find((s) => (Number(split[s._id]) || 0) > s.balance + 0.001);

  // Pending sales grouped by firm.
  const groups = [];
  for (const s of pending) {
    const key = s.gstNumber || '';
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, label: s.firmName || (key ? key : customerName), owner: s.ownerName, gstNumber: s.gstNumber, list: [] }));
    g.list.push(s);
  }

  const submit = async (e) => {
    e.preventDefault();
    if (amount <= 0) return toast.error('Enter the amount received');
    if (over) return toast.error(`Only ${formatMoney(over.balance)} is pending on ${over.saleNo}`);
    if (splitTotal !== amount) return toast.error(`Split over sales (${formatMoney(splitTotal)}) must equal the amount received (${formatMoney(amount)})`);
    setSaving(true);
    try {
      const allocations = pending.filter((s) => Number(split[s._id]) > 0).map((s) => ({ sale: s._id, amount: Number(split[s._id]) }));
      const { data } = await api.post('/sales/receive', { ...f, customer: customerId, amount, allocations });
      toast.success(data.message);
      onDone?.(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" scroll title="Receive payment" description={`From ${customerName} — one payment for all pending sales of their firms`} footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="receive-form" loading={saving} disabled={!pending.length}>Save Payment</Button></>
    }>
      {!pending.length ? <p className="py-6 text-center text-sm text-zinc-500">Nothing is pending for this customer.</p> : (
        <form id="receive-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Amount received (₹)" hint={`Total pending ${formatMoney(due)}`}><Input type="number" min="0" step="any" max={due} value={f.amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></Field>
            <Field label="Date"><Input type="date" max={localToday()} value={f.date} onChange={set('date')} /></Field>
            <Field label="Mode"><Select value={f.mode} onChange={set('mode')}>{PAY_MODES.map((m) => <option key={m}>{m}</option>)}</Select></Field>
            <BankSelect label="Received in" value={f.bank} onChange={(v) => setF({ ...f, bank: v })} disabled={!amount} />
            <Field label="Reference" hint="UTR / cheque no."><Input value={f.reference} onChange={set('reference')} /></Field>
            <Field label="Note"><Input value={f.note} onChange={set('note')} /></Field>
          </div>

          <div className="rounded-xl border border-zinc-200">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-2.5">
              <div className="text-sm font-semibold">Goes to</div>
              <Button type="button" size="sm" variant="ghost" icon={WandSparkles} onClick={() => { setManual(false); setSplit(autoSplit(pending, f.amount)); }}>Oldest first</Button>
            </div>
            {groups.map((g) => (
              <div key={g.key}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 bg-zinc-50/80 px-4 py-1.5 text-xs">
                  <span className="font-semibold text-zinc-700">{g.label}{g.owner && <span className="font-normal text-zinc-500"> · {g.owner}</span>}</span>
                  {g.gstNumber && <span className="font-mono text-zinc-400">{g.gstNumber}</span>}
                </div>
                {g.list.map((s) => (
                  <div key={s._id} className="flex items-center gap-3 border-t border-zinc-100 px-4 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{s.title}</div>
                      <div className="text-xs text-zinc-500"><span className="font-mono">{s.saleNo}</span> · {shortDay(s.saleDate)} · pending <b className="text-rose-600">{formatMoney(s.balance)}</b></div>
                    </div>
                    <Input type="number" min="0" step="any" max={s.balance} value={split[s._id] ?? ''} placeholder="0"
                      onChange={(e) => { setManual(true); setSplit({ ...split, [s._id]: e.target.value }); }}
                      className={`w-28! text-right ${(Number(split[s._id]) || 0) > s.balance + 0.001 ? 'border-rose-400!' : ''}`} />
                  </div>
                ))}
              </div>
            ))}
            <div className={`flex justify-between border-t border-zinc-200 px-4 py-2.5 text-sm ${splitTotal !== amount ? 'text-rose-600' : 'text-zinc-700'}`}>
              <span>{splitTotal !== amount ? `Split ${formatMoney(splitTotal)} — must equal ${formatMoney(amount)}` : 'Split over sales'}</span>
              <b className="tabular-nums">{formatMoney(splitTotal)}</b>
            </div>
          </div>
          <p className="text-xs text-zinc-500">Each sale gets its share (government fee first). The whole payment gets one receipt number and shows as one line in the ledger.</p>
        </form>
      )}
    </Modal>
  );
}
