import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileCheck2, FileClock, Search, Users } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { localToday, shiftMonth, shortDay } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import Progress from '../components/ui/Progress';
import SearchSelect from '../components/tasks/SearchSelect';
import { Input } from '../components/ui/Field';

const isMonth = (m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m || '');
const lastMonth = () => shiftMonth(localToday(), -1).slice(0, 7);
const moveMonth = (m, n) => shiftMonth(`${m}-01`, n).slice(0, 7);

// Status of one return (GSTR-1 / GSTR-3B) of a customer, with its date underneath.
function ReturnCell({ r, today }) {
  if (r.status === 'na') return <span className="text-xs text-zinc-400">Not applicable</span>;
  if (r.status === 'nowork') return <><Badge>No work yet</Badge>{r.dueOn && <div className="mt-0.5 text-[11px] text-zinc-400">due {shortDay(r.dueOn)}</div>}</>;
  if (r.status === 'filed') {
    const late = r.filedOn && r.dueOn && r.filedOn > r.dueOn;
    return (
      <>
        <Badge tone="green"><CheckCircle2 className="h-3 w-3" />Filed</Badge>
        {r.filedOn && <div className={`mt-0.5 text-[11px] ${late ? 'text-amber-600' : 'text-zinc-500'}`}>on {shortDay(r.filedOn)}{late && ' (late)'}</div>}
      </>
    );
  }
  const overdue = r.dueOn && r.dueOn < today;
  return (
    <>
      {r.status === 'unassigned' ? <Badge tone={overdue ? 'red' : 'zinc'}>Not given to anyone</Badge> : <Badge tone={overdue ? 'red' : 'amber'}>{overdue ? 'Overdue' : 'Pending'}</Badge>}
      <div className="mt-0.5 text-[11px] text-zinc-500">
        {[r.member?.name, r.dueOn && `due ${shortDay(r.dueOn)}`].filter(Boolean).join(' · ')}
        {r.fromWork && <span className="text-zinc-400"> · whole work</span>}
      </div>
    </>
  );
}

function WorkCell({ row }) {
  if (!row.work) return <span className="text-xs text-zinc-400">—</span>;
  return <Progress done={row.work.steps.completed} total={row.work.steps.total} className="w-28" />;
}

export default function GstReturns() {
  const today = localToday();
  const [params, setParams] = useSearchParams();
  const month = isMonth(params.get('month')) ? params.get('month') : lastMonth();
  const [status, setStatus] = useState('all');
  const [member, setMember] = useState('all');
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/users', { params: { active: true } }).then((r) => setMembers(r.data.users)).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(() => setQ(search), 300); return () => clearTimeout(t); }, [search]);
  const load = useCallback(() => {
    setData(null);
    api.get('/gst-filing/tracker', { params: { month, status, ...(member !== 'all' && { member }), ...(q && { search: q }) } })
      .then((r) => setData(r.data))
      .catch((e) => { toast.error(errorMessage(e)); setData({ data: [], stats: null }); });
  }, [month, status, member, q]);
  useEffect(() => { load(); }, [load]);

  const goMonth = (m) => setParams(m === lastMonth() ? {} : { month: m });
  const s = data?.stats;

  return (
    <div>
      <PageHeader title="GST Return Tracker" description="Every customer’s GSTR-1 and GSTR-3B for the month, from the monthly GST work. Progress updates as members mark their tasks Done." />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Button variant="secondary" size="icon" onClick={() => goMonth(moveMonth(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="min-w-36 text-center">
          <div className="text-sm font-semibold">{data?.monthLabel || month}</div>
          {data?.quarterLabel && <div className="text-[11px] text-zinc-500">Quarterly filers: {data.quarterLabel}</div>}
        </div>
        <Button variant="secondary" size="icon" onClick={() => goMonth(moveMonth(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
        {month !== lastMonth() && <Button variant="ghost" size="sm" onClick={() => goMonth(lastMonth())}>Last month</Button>}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Customers" value={s ? s.total : '—'} icon={Users} tone="blue" sub={s?.noWork ? `${s.noWork} without GST work` : undefined} />
        <StatCard label="GSTR-1 filed" value={s ? `${s.gstr1Filed}/${s.returns}` : '—'} icon={FileCheck2} tone="green" />
        <StatCard label="GSTR-3B filed" value={s ? `${s.gstr3bFiled}/${s.returns}` : '—'} icon={FileCheck2} tone="green" />
        <StatCard label="All done" value={s ? s.done : '—'} icon={CheckCircle2} tone="green" sub={s && `of ${s.total}`} />
        <StatCard label="Pending" value={s ? s.total - s.done : '—'} icon={FileClock} tone="amber" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tabs value={status} onChange={setStatus} items={[{ key: 'all', label: 'All' }, { key: 'pending', label: 'Pending' }, { key: 'filed', label: 'Filed' }]} />
        <SearchSelect options={members.map((m) => ({ value: m._id, label: m.name }))} value={member} onChange={setMember} allLabel="All members" placeholder="Search member…" />
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer, GSTIN, mobile…" className="pl-9" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {!data ? <Spinner /> : data.data.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No customers here" message={status !== 'all' || member !== 'all' || q ? 'Try other filters.' : 'Running GST customers show here once their monthly GST work is created (Running GST Filing → Settings).'}
            action={<Link to="/gst-filing"><Button variant="secondary">Running GST Filing</Button></Link>} />
        ) : (
          <>
          {/* Phones & tablets: cards */}
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
            {data.data.map((r) => (
              <div key={r.filingId} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={r.customer.businessName} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/customers/${r.customer._id}`} className="font-medium hover:underline">{r.customer.businessName}</Link>
                    <div className="text-xs text-zinc-500">{[r.gstNumber, r.firmName, r.customer.phone].filter(Boolean).join(' · ')}</div>
                  </div>
                  {r.done && <Badge tone="green">Done</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs"><Badge>{r.returnType}</Badge><span className="text-zinc-500">{r.periodLabel}</span>{!r.isRunning && <Badge tone="red">Stopped</Badge>}</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div><div className="mb-1 text-[11px] font-medium text-zinc-500">GSTR-1</div><ReturnCell r={r.gstr1} today={today} /></div>
                  <div><div className="mb-1 text-[11px] font-medium text-zinc-500">GSTR-3B</div><ReturnCell r={r.gstr3b} today={today} /></div>
                </div>
                {r.work && <div className="mt-3"><div className="mb-1 text-[11px] font-medium text-zinc-500">All steps</div><WorkCell row={r} /></div>}
              </div>
            ))}
          </div>

          {/* Laptop and up: table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs text-zinc-500">
                <th className="px-5 py-2.5 font-medium">Customer</th><th className="px-3 py-2.5 font-medium">Return</th>
                <th className="px-3 py-2.5 font-medium">GSTR-1</th><th className="px-3 py-2.5 font-medium">GSTR-3B</th>
                <th className="px-3 py-2.5 font-medium">All steps</th><th className="px-5 py-2.5 font-medium">Members</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {data.data.map((r) => (
                  <tr key={r.filingId} className="hover:bg-zinc-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.customer.businessName} />
                        <div>
                          <Link to={`/customers/${r.customer._id}`} className="font-medium hover:underline">{r.customer.businessName}</Link>
                          <div className="font-mono text-xs text-zinc-500">{r.gstNumber || <span className="font-sans text-zinc-400">GSTIN not added</span>}</div>
                          {r.firmName && r.firmName !== r.customer.businessName && <div className="text-[11px] text-zinc-400">{r.firmName}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge>{r.returnType}</Badge>{!r.isRunning && <Badge tone="red" className="ml-1">Stopped</Badge>}
                      <div className="mt-0.5 text-[11px] text-zinc-400">{r.periodLabel}</div>
                    </td>
                    <td className="px-3 py-3"><ReturnCell r={r.gstr1} today={today} /></td>
                    <td className="px-3 py-3"><ReturnCell r={r.gstr3b} today={today} /></td>
                    <td className="px-3 py-3"><WorkCell row={r} /></td>
                    <td className="px-5 py-3 text-xs text-zinc-600">{r.members.length ? r.members.map((m) => m.name).join(', ') : <span className="text-zinc-400">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>
    </div>
  );
}
