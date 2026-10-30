import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Landmark, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, localToday, longDay, monthEndKey, monthStartKey, shiftMonth } from '../lib/format';
import { loadBankOptions } from '../components/BankSelect';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Checkbox from '../components/ui/Checkbox';
import { Field, Input, Select } from '../components/ui/Field';

const KINDS = ['Cash', 'Bank', 'Personal', 'Company', 'Wallet', 'Other'];
const SOURCE = {
  sale: ['Sale', 'green'],
  expense: ['Expense', 'red'],
  salary: ['Salary', 'amber'],
  b2b: ['B2B', 'violet'],
  entry: ['Manual', 'zinc'],
  transfer: ['Transfer', 'blue'],
};
const noSciKeys = (e) => ['e', 'E', '+'].includes(e.key) && e.preventDefault();

function AccountDialog({ open, account, onClose, onSaved }) {
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setF(account
      ? { name: account.name, openingBalance: account.openingBalance, isDefault: account.isDefault, active: account.active }
      : { name: '', openingBalance: '', isDefault: false, active: true });
  }, [open, account]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = account ? await api.put(`/banks/${account._id}`, f) : await api.post('/banks', f);
      toast.success(data.message);
      loadBankOptions(true);
      onSaved(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={account ? 'Edit Account' : 'Add Account'} description="Type any name — Cash, Personal, Company…" footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="bank-form" loading={saving}>{account ? 'Save' : 'Add Account'}</Button></>
    }>
      <form id="bank-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" required>
          <Input list="bank-kinds" required autoFocus maxLength={50} value={f.name} onChange={set('name')} placeholder="e.g. Cash, Personal, Company" />
          <datalist id="bank-kinds">{KINDS.map((k) => <option key={k} value={k} />)}</datalist>
        </Field>
        <Field label="Opening balance (₹)" hint="Money in it before you start using the app">
          <Input type="number" step="any" value={f.openingBalance} onChange={set('openingBalance')} onKeyDown={noSciKeys} placeholder="0" />
        </Field>
        <div className="flex flex-wrap gap-5 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.isDefault} onChange={(v) => setF({ ...f, isDefault: v })} /> Default account <span className="text-xs text-zinc-400">(pre-selected in forms)</span></label>
          {account && <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.active} onChange={(v) => setF({ ...f, active: v })} /> Active</label>}
        </div>
      </form>
    </Modal>
  );
}

// Money in / money out / transfer between two accounts, added by hand.
function EntryDialog({ open, entry, type: startType, accounts, bankId, onClose, onSaved }) {
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  const active = accounts.filter((a) => a.active || a._id === entry?.bank || a._id === entry?.toBank);
  useEffect(() => {
    if (!open) return;
    if (entry) setF({ type: entry.type, amount: entry.amount, bank: entry.bank, toBank: entry.toBank || '', date: entry.date, party: entry.party || '', note: entry.note || '' });
    else {
      const from = bankId || active[0]?._id || '';
      setF({ type: startType || 'in', amount: '', bank: from, toBank: active.find((a) => a._id !== from)?._id || '', date: localToday(), party: '', note: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry, startType, bankId]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = entry ? await api.put(`/banks/entries/${entry._id}`, f) : await api.post('/banks/entries', f);
      toast.success(data.message);
      onSaved(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const transfer = f.type === 'transfer';
  const options = active.map((a) => <option key={a._id} value={a._id}>{a.name}</option>);
  return (
    <Modal open={open} onClose={onClose} title={entry ? 'Edit Entry' : 'Add Entry'} footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="bank-entry-form" loading={saving}>Save</Button></>
    }>
      <form id="bank-entry-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-zinc-200 bg-white p-0.5">
          {[['in', 'Money In', ArrowDownLeft], ['out', 'Money Out', ArrowUpRight], ['transfer', 'Transfer', ArrowLeftRight]].map(([k, label, Icon]) => (
            <button type="button" key={k} onClick={() => setF({ ...f, type: k })} className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium ${f.type === k ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (₹)" required><Input type="number" min="0.01" step="any" required autoFocus value={f.amount} onChange={set('amount')} onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()} /></Field>
          <Field label="Date" required><Input type="date" required max={localToday()} value={f.date} onChange={set('date')} /></Field>
          <Field label={transfer ? 'From account' : 'Account'} required><Select value={f.bank} onChange={set('bank')}>{options}</Select></Field>
          {transfer
            ? <Field label="To account" required><Select value={f.toBank} onChange={set('toBank')}>{options}</Select></Field>
            : <Field label={f.type === 'in' ? 'Received from' : 'Paid to'}><Input maxLength={100} value={f.party} onChange={set('party')} placeholder="Optional" /></Field>}
          <Field label="Note" className="sm:col-span-2"><Input maxLength={300} value={f.note} onChange={set('note')} placeholder={transfer ? 'e.g. Cash deposited in bank' : 'Optional'} /></Field>
        </div>
        {transfer && f.bank && f.bank === f.toBank && <p className="text-sm text-rose-600">Pick two different accounts.</p>}
      </form>
    </Modal>
  );
}

// One line per entry of every account: which account, what it was, how much came in / went out.
function EntriesTable({ accounts, version, canEdit, canDelete, onChanged, onEditEntry }) {
  const today = localToday();
  const lastMonth = shiftMonth(today, -1);
  const PERIODS = [['Today', today, today], ['This month', monthStartKey(today), today], ['Last month', lastMonth, monthEndKey(lastMonth)], ['All', '2000-01-01', today]];
  const [range, setRange] = useState({ from: monthStartKey(today), to: today });
  const [bank, setBank] = useState('');
  const [data, setData] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [removing, setRemoving] = useState(false);
  const load = useCallback(() => {
    if (!range.from || !range.to) return;
    api.get('/banks/entries', { params: { ...range, bank: bank || undefined } }).then((r) => setData(r.data)).catch((e) => toast.error(errorMessage(e)));
  }, [range, bank]);
  useEffect(() => { load(); }, [load, version]);

  const remove = async () => {
    setRemoving(true);
    try {
      await api.delete(`/banks/entries/${deleting._id}`);
      toast.success('Entry deleted');
      setDeleting(null); onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card className="mt-5 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-3 xl:flex-row xl:items-center xl:justify-between">
        <h2 className="text-sm font-semibold">All entries</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <div className="w-40"><Select value={bank} onChange={(e) => setBank(e.target.value)}><option value="">All accounts</option>{accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}</Select></div>
          <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5">
            {PERIODS.map(([label, from, to]) => (
              <button key={label} onClick={() => setRange({ from, to })} className={`rounded-md px-2.5 py-1 font-medium ${range.from === from && range.to === to ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}>{label}</button>
            ))}
          </div>
          <Input type="date" value={range.from} max={range.to || today} onChange={(e) => setRange({ ...range, from: e.target.value })} className="w-auto!" />
          <span>to</span>
          <Input type="date" value={range.to} min={range.from || undefined} max={today} onChange={(e) => setRange({ ...range, to: e.target.value })} className="w-auto!" />
        </div>
      </div>
      {!data ? <Spinner /> : data.data.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-zinc-500">No entries in this period.</div>
      ) : (
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
          <thead><tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs text-zinc-500">
            <th className="px-5 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Account</th>
            <th className="px-3 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 font-medium">Details</th>
            <th className="px-3 py-2.5 text-right font-medium">In</th>
            <th className="px-3 py-2.5 text-right font-medium">Out</th>
            <th className="w-20 px-5 py-2.5" />
          </tr></thead>
          <tbody className="divide-y divide-zinc-100">
            {data.data.map((r) => {
              const [label, tone] = SOURCE[r.source] || ['', 'zinc'];
              return (
                <tr key={`${r.source}-${r._id}-${r.account?._id}`} className="hover:bg-zinc-50/60">
                  <td className="whitespace-nowrap px-5 py-2.5 text-zinc-600">{longDay(r.date)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium">{r.account?.name || '—'}</td>
                  <td className="px-3 py-2.5"><Badge tone={tone}>{label}</Badge></td>
                  <td className="max-w-xs px-3 py-2.5">
                    <div className="truncate">{r.title}</div>
                    {r.sub && <div className="truncate text-xs text-zinc-400">{r.sub}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums text-emerald-700">{r.in ? formatMoney(r.in) : ''}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums text-rose-600">{r.out ? formatMoney(r.out) : ''}</td>
                  <td className="px-5 py-1.5">
                    {r.entry && (
                      <div className="flex justify-end gap-0.5">
                        {canEdit && <Button size="icon" variant="ghost" onClick={() => onEditEntry(r.entry)}><Pencil className="h-3.5 w-3.5" /></Button>}
                        {canDelete && <Button size="icon" variant="ghost" onClick={() => setDeleting(r.entry)} className="hover:!text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr className="border-t border-zinc-200 bg-zinc-50/70 font-semibold">
            <td className="px-5 py-3" colSpan={4}>Total · {data.data.length} {data.data.length === 1 ? 'entry' : 'entries'}</td>
            <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{formatMoney(data.in)}</td>
            <td className="px-3 py-3 text-right tabular-nums text-rose-600">{formatMoney(data.out)}</td>
            <td />
          </tr></tfoot>
        </table></div>
      )}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={removing} title="Delete entry?"
        message={deleting && `${formatMoney(deleting.amount)} on ${longDay(deleting.date)} will be deleted${deleting.type === 'transfer' ? ' from both accounts' : ''}.`} />
    </Card>
  );
}

export default function Banks() {
  const { can } = useAuth();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(undefined); // account: null = new
  const [entry, setEntry] = useState(undefined); // { type } new, { entry } edit
  const [deleting, setDeleting] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(() => api.get('/banks').then((r) => setData(r.data)).catch((e) => toast.error(errorMessage(e))), []);
  useEffect(() => { load(); }, [load]);

  const remove = async () => {
    setRemoving(true);
    try {
      const { data: res } = await api.delete(`/banks/${deleting._id}`);
      toast.success(res.message);
      loadBankOptions(true);
      setDeleting(null); load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRemoving(false);
    }
  };

  const accounts = data?.data || [];
  const activeAccounts = accounts.filter((a) => a.active);
  const canEdit = can('banks', 'edit');
  const canDelete = can('banks', 'delete');

  return (
    <div>
      <PageHeader title="Bank & Cash" description="How much money is in each account."
        actions={<>
          {can('banks', 'create') && activeAccounts.length > 0 && <>
            <Button variant="secondary" icon={ArrowDownLeft} onClick={() => setEntry({ type: 'in' })}>Money In</Button>
            <Button variant="secondary" icon={ArrowUpRight} onClick={() => setEntry({ type: 'out' })}>Money Out</Button>
            {activeAccounts.length > 1 && <Button variant="secondary" icon={ArrowLeftRight} onClick={() => setEntry({ type: 'transfer' })}>Transfer</Button>}
          </>}
          {can('banks', 'create') && <Button icon={Plus} onClick={() => setEditing(null)}>Add Account</Button>}
        </>} />
      {!data ? <Spinner /> : accounts.length === 0 ? (
        <Card><EmptyState icon={Landmark} title="No accounts yet" message="Add Cash, Personal, Company… with their opening balance. Then pick them when recording payments and expenses."
          action={can('banks', 'create') && <Button icon={Plus} onClick={() => setEditing(null)}>Add Account</Button>} /></Card>
      ) : (
        <>
          <Card className="mb-5 flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Wallet className="h-5 w-5" /></span>
            <div>
              <div className="text-xs font-medium text-zinc-500">Total balance</div>
              <div className={`text-2xl font-semibold tracking-tight tabular-nums ${data.stats.balance < 0 ? 'text-rose-600' : ''}`}>{formatMoney(data.stats.balance)}</div>
            </div>
            <div className="ml-auto text-right text-xs text-zinc-500">{activeAccounts.length} account{activeAccounts.length === 1 ? '' : 's'}</div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {accounts.map((a) => (
              <Card key={a._id} className={`group p-4 ${a.active ? '' : 'opacity-60'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-zinc-600">{a.name}</span>
                    {a.isDefault && <Badge tone="blue">Default</Badge>}
                    {!a.active && <Badge>Inactive</Badge>}
                  </div>
                  {(canEdit || canDelete) && (
                    <div className="-my-1 -mr-1 flex shrink-0 opacity-0 transition group-hover:opacity-100 max-lg:opacity-100">
                      {canEdit && <Button size="icon" variant="ghost" onClick={() => setEditing(a)}><Pencil className="h-3.5 w-3.5" /></Button>}
                      {canDelete && <Button size="icon" variant="ghost" onClick={() => setDeleting(a)} className="hover:!text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  )}
                </div>
                <div className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${a.balance < 0 ? 'text-rose-600' : 'text-zinc-900'}`}>{formatMoney(a.balance)}</div>
                <div className="mt-3 flex gap-4 border-t border-zinc-100 pt-2.5 text-xs">
                  <span className="flex items-center gap-1 text-emerald-700"><ArrowDownLeft className="h-3 w-3" />{formatMoney(a.in)}</span>
                  <span className="flex items-center gap-1 text-rose-600"><ArrowUpRight className="h-3 w-3" />{formatMoney(a.out)}</span>
                </div>
              </Card>
            ))}
          </div>

          <EntriesTable accounts={accounts} version={data} canEdit={canEdit} canDelete={canDelete} onChanged={load} onEditEntry={(e) => setEntry({ entry: e })} />
        </>
      )}
      <AccountDialog open={editing !== undefined} account={editing} onClose={() => setEditing(undefined)} onSaved={load} />
      <EntryDialog open={entry !== undefined} entry={entry?.entry} type={entry?.type} accounts={accounts} onClose={() => setEntry(undefined)} onSaved={load} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={removing} title="Delete account?"
        message={deleting && `${deleting.name} will be deleted. An account that already has entries can only be marked inactive.`} />
    </div>
  );
}
