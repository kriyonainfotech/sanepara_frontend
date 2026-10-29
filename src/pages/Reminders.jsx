import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BellRing, CheckCircle2, ExternalLink, MessageCircle, MessageSquareText, Send, ShoppingCart, Receipt } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, monthLabel } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import Checkbox from '../components/ui/Checkbox';
import EmptyState from '../components/ui/EmptyState';
import { Field, Input, Textarea } from '../components/ui/Field';

const isDone = (r) => r.purchase.received && r.sales.received;

function TemplateDialog({ open, template, onClose, onSaved }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setText(template); }, [open, template]);
  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/reminders/settings', { template: text });
      toast.success(data.message);
      onSaved(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Reminder message" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
      <Field label="Message" hint="{name} contact person · {business} firm name · {bills} pending bills · {month} bill month · {firm} your firm">
        <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
    </Modal>
  );
}

// After sending without the WhatsApp API: one click-to-send link per customer.
function ResultsDialog({ results, onClose }) {
  return (
    <Modal open={!!results} onClose={onClose} title="Send on WhatsApp" description="Click each customer to open WhatsApp with the message ready, then press send." size="lg">
      <ul className="max-h-96 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200">
        {(results || []).map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="flex-1 truncate font-medium">{r.name}</span>
            {r.sent && <Badge tone="green">Sent</Badge>}
            {r.skipped && <Badge>{r.skipped}</Badge>}
            {r.error && <span className="truncate text-xs text-red-600">{r.error}</span>}
            {r.link && (
              <a href={r.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                <MessageCircle className="h-3.5 w-3.5" /> Open WhatsApp <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function ReceivedToggle({ on, disabled, onChange, label, icon: Icon }) {
  return (
    <button disabled={disabled} onClick={() => onChange(!on)}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-default ${on ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700 enabled:hover:bg-amber-100'}`}>
      {on ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />} {label}: {on ? 'Received' : 'Pending'}
    </button>
  );
}

export default function Reminders() {
  const { can } = useAuth();
  const canMark = can('reminders', 'mark');
  const canSend = can('reminders', 'send');
  const [month, setMonth] = useState('');
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('pending');
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(false);

  const load = useCallback(() => api.get('/reminders', { params: month ? { month } : {} })
    .then((r) => { setData(r.data); if (!month) setMonth(r.data.month); })
    .catch((e) => { toast.error(errorMessage(e)); setData({ data: [], stats: { total: 0, complete: 0, pending: 0, purchasePending: 0, salesPending: 0 }, whatsappApi: true }); }), [month]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelected(new Set()); }, [month, tab]);

  const mark = async (row, patch) => {
    try {
      await api.put(`/reminders/${row._id}/mark`, patch);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const send = async (ids) => {
    setSending(true);
    try {
      const { data: res } = await api.post('/reminders/send', { ids });
      // Browsers block pop-ups opened after a request, so links are shown to click.
      if (!res.whatsappApi || res.results.some((r) => r.error)) setResults(res.results);
      if (res.whatsappApi) toast.success(res.message);
      setSelected(new Set());
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const rows = (data?.data || []).filter((r) => (tab === 'pending' ? !isDone(r) : tab === 'complete' ? isDone(r) : true));
  const selectable = rows.filter((r) => !isDone(r) && r.hasMobile);
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r._id));
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const s = data?.stats;

  return (
    <div>
      <PageHeader title="Monthly Reminders" description="Purchase & sales bill reminders for running GST customers. Customers who have sent both bills are not reminded again."
        actions={<>
          <div className="w-44"><Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>
          {canSend && <Button variant="secondary" icon={MessageSquareText} onClick={() => setEditingTemplate(true)}>Message</Button>}
          {canSend && <Button icon={Send} loading={sending} disabled={!s?.pending} onClick={() => send(data.data.filter((r) => !isDone(r) && r.hasMobile).map((r) => r._id))}>Remind all pending</Button>}
        </>} />
      {!data ? <Spinner /> : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="GST customers" value={s.total} icon={BellRing} sub={`Bills for ${monthLabel(month + '-01')}`} />
            <StatCard label="All bills received" value={s.complete} icon={CheckCircle2} tone="green" />
            <StatCard label="Purchase bills pending" value={s.purchasePending} icon={ShoppingCart} tone="amber" />
            <StatCard label="Sales bills pending" value={s.salesPending} icon={Receipt} tone="rose" />
          </div>
          {!data.whatsappApi && canSend && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
              WhatsApp API is not connected yet — reminders open WhatsApp with the message ready (one click to send). Super Admin can connect it in Settings → WhatsApp API to send directly from the CRM.
            </div>
          )}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Tabs value={tab} onChange={setTab} items={[{ key: 'pending', label: 'Pending', count: s.pending }, { key: 'complete', label: 'Complete', count: s.complete }, { key: 'all', label: 'All', count: s.total }]} />
            {canSend && selected.size > 0 && <Button size="sm" icon={Send} loading={sending} onClick={() => send([...selected])}>Remind selected ({selected.size})</Button>}
          </div>
          <Card className="overflow-hidden">
            {data.data.length === 0 ? (
              <EmptyState icon={BellRing} title="No running GST customers" message="Customers added in Running GST Filing show up here every month."
                action={can('gst_filing') && <Link to="/gst-filing"><Button variant="secondary">Go to Running GST Filing</Button></Link>} />
            ) : rows.length === 0 ? (
              <p className="py-12 text-center text-sm text-zinc-400">{tab === 'pending' ? 'Everyone has sent their bills.' : 'Nothing here.'}</p>
            ) : (
              <>
              {/* Phones & tablets: cards */}
              <div className="lg:hidden">
                {canSend && selectable.length > 0 && (
                  <label className="flex cursor-pointer items-center gap-2 border-b border-zinc-100 px-4 py-3 text-sm text-zinc-600">
                    <Checkbox checked={allSelected} indeterminate={!allSelected && selectable.some((r) => selected.has(r._id))} onChange={(v) => setSelected(v ? new Set(selectable.map((r) => r._id)) : new Set())} />
                    Select all pending ({selectable.length})
                  </label>
                )}
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  {rows.map((r) => {
                    const last = r.sends.at(-1);
                    return (
                      <div key={r._id} className={`flex flex-col rounded-xl border p-4 ${selected.has(r._id) ? 'border-zinc-900' : 'border-zinc-200'}`}>
                        <div className="flex items-start gap-3">
                          {canSend && <Checkbox className="mt-0.5" checked={selected.has(r._id)} disabled={isDone(r) || !r.hasMobile} onChange={() => toggle(r._id)} />}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{r.customer?.businessName}</div>
                            <div className="text-xs text-zinc-500">{[r.customer?.contactPerson, r.customer?.phone].filter(Boolean).join(' · ')}{!r.hasMobile && <span className="text-red-600"> · no valid mobile</span>}</div>
                          </div>
                          {isDone(r) && <Badge tone="green">Complete</Badge>}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <ReceivedToggle label="Purchase" icon={ShoppingCart} on={r.purchase.received} disabled={!canMark} onChange={(v) => mark(r, { purchase: v })} />
                          <ReceivedToggle label="Sales" icon={Receipt} on={r.sales.received} disabled={!canMark} onChange={(v) => mark(r, { sales: v })} />
                        </div>
                        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                          <div className="text-xs text-zinc-500">
                            {last ? <>Last reminder {formatDate(last.at)} {last.ok ? '' : <span className="text-red-600">· failed</span>}<div className="text-zinc-400">{r.sends.length} sent{last.by?.name ? ` · ${last.by.name}` : ''}</div></> : <span className="text-zinc-400">Not sent yet</span>}
                          </div>
                          {canSend && !isDone(r) && <Button size="sm" variant="secondary" icon={MessageCircle} disabled={!r.hasMobile || sending} onClick={() => send([r._id])}>Remind</Button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Laptop and up: table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs text-zinc-500">
                    {canSend && <th className="w-10 px-5 py-2.5"><Checkbox checked={allSelected} indeterminate={!allSelected && selectable.some((r) => selected.has(r._id))} onChange={(v) => setSelected(v ? new Set(selectable.map((r) => r._id)) : new Set())} /></th>}
                    <th className="px-3 py-2.5 font-medium">Customer</th><th className="px-3 py-2.5 font-medium">Bills</th><th className="px-3 py-2.5 font-medium">Last reminder</th><th className="px-5 py-2.5" />
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-100">
                    {rows.map((r) => {
                      const last = r.sends.at(-1);
                      return (
                        <tr key={r._id} className="hover:bg-zinc-50/60">
                          {canSend && <td className="px-5 py-3"><Checkbox checked={selected.has(r._id)} disabled={isDone(r) || !r.hasMobile} onChange={() => toggle(r._id)} /></td>}
                          <td className="px-3 py-3">
                            <div className="font-medium">{r.customer?.businessName}</div>
                            <div className="text-xs text-zinc-500">{[r.customer?.contactPerson, r.customer?.phone].filter(Boolean).join(' · ')}{!r.hasMobile && <span className="text-red-600"> · no valid mobile</span>}</div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              <ReceivedToggle label="Purchase" icon={ShoppingCart} on={r.purchase.received} disabled={!canMark} onChange={(v) => mark(r, { purchase: v })} />
                              <ReceivedToggle label="Sales" icon={Receipt} on={r.sales.received} disabled={!canMark} onChange={(v) => mark(r, { sales: v })} />
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs text-zinc-500">
                            {last ? <>{formatDate(last.at)} {last.ok ? '' : <span className="text-red-600">· failed</span>}<div className="text-zinc-400">{r.sends.length} sent{last.by?.name ? ` · ${last.by.name}` : ''}</div></> : <span className="text-zinc-400">Not sent</span>}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {canSend && !isDone(r) && <Button size="sm" variant="secondary" icon={MessageCircle} disabled={!r.hasMobile || sending} onClick={() => send([r._id])}>Remind</Button>}
                            {isDone(r) && <Badge tone="green">Complete</Badge>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </Card>
        </>
      )}
      <TemplateDialog open={editingTemplate} template={data?.template || ''} onClose={() => setEditingTemplate(false)} onSaved={load} />
      <ResultsDialog results={results} onClose={() => setResults(null)} />
    </div>
  );
}
