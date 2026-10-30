import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, FileText, IndianRupee, Landmark, Plus, Receipt, Search, TrendingUp, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, localToday, longDay, shortDay } from '../lib/format';
import { SALE_STATUS_TONE } from '../lib/sales';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Input, Select } from '../components/ui/Field';
import SaleDialog from '../components/sales/SaleDialog';
import SaleDetail from '../components/sales/SaleDetail';
import CollectDialog from '../components/sales/CollectDialog';

function Stat({ label, value, icon: Icon, tone, sub }) {
  const tones = { zinc: 'bg-zinc-100 text-zinc-700', green: 'bg-emerald-50 text-emerald-600', blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600', violet: 'bg-violet-50 text-violet-600' };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between"><span className="text-xs font-medium text-zinc-500">{label}</span><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-3.5 w-3.5" /></span></div>
      <div className="mt-1.5 text-xl font-semibold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-zinc-500">{sub}</div>}
    </Card>
  );
}

function SalesTab({ month, refreshKey, onOpen, onCollect, canCollect }) {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [partner, setPartner] = useState('');
  const [partners, setPartners] = useState([]);
  const { can } = useAuth();

  useEffect(() => { const t = setTimeout(() => setQ(search), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { if (can('b2b', 'view')) api.get('/b2b').then((r) => setPartners(r.data.data)); }, [can]);
  useEffect(() => {
    setData(null);
    api.get('/sales', { params: { month, ...(q && { search: q }), ...(status && { status }), ...(partner && { b2bPartner: partner }) } }).then((r) => setData(r.data));
  }, [month, q, status, partner, refreshKey]);

  const s = data?.stats;
  return (
    <>
      {s && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Stat label="Total sales" value={formatMoney(s.total)} icon={TrendingUp} tone="zinc" sub={`${s.count} sale${s.count === 1 ? '' : 's'}`} />
          <Stat label="Professional fee" value={formatMoney(s.professional)} icon={IndianRupee} tone="blue" sub="Your income" />
          <Stat label="Government fee" value={formatMoney(s.govt)} icon={Landmark} tone="violet" sub="Paid to govt" />
          <Stat label="Received" value={formatMoney(s.received)} icon={Banknote} tone="green" sub={s.discount ? `${formatMoney(s.discount)} discount` : 'Against these sales'} />
          <Stat label="Pending" value={formatMoney(s.balance)} icon={Wallet} tone="rose" sub="On these sales" />
          <Stat label="B2B commission" value={formatMoney(s.commission)} icon={Receipt} tone="amber" sub="Partners' share" />
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer, work, sale no…" className="pl-9" />
        </div>
        <div className="w-40">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="open">Payment pending</option>
            {['Pending', 'Partial', 'Cleared', 'Written Off'].map((x) => <option key={x}>{x}</option>)}
          </Select>
        </div>
        {partners.length > 0 && (
          <div className="w-48">
            <Select value={partner} onChange={(e) => setPartner(e.target.value)}>
              <option value="">All partners</option>
              {partners.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </div>
        )}
      </div>
      <Card className="overflow-hidden">
        {!data ? <Spinner /> : data.data.length === 0 ? (
          <EmptyState icon={FileText} title="No sales in this period" message="Create a sale for a customer — or from a customer's page next to an assigned service." />
        ) : (
          <>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
            {data.data.map((s) => (
              <div key={s._id} onClick={() => onOpen(s._id)} className="cursor-pointer rounded-xl border border-zinc-200 p-4 hover:bg-zinc-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{s.customer?.businessName}</div>
                    <div className="text-xs text-zinc-500"><span className="font-mono font-semibold">{s.saleNo}</span> · {shortDay(s.saleDate)}</div>
                  </div>
                  <Badge tone={SALE_STATUS_TONE[s.status]}>{s.status}</Badge>
                </div>
                <div className="mt-1 text-xs text-zinc-500">{s.title}{s.b2bPartner && <span className="text-amber-700"> · via {s.b2bPartner.name} ({s.b2bPercent}%)</span>}{s.soldBy && <span> · {s.soldBy.name}</span>}</div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Total</dt><dd className="text-sm font-semibold tabular-nums">{formatMoney(s.totalAmount)}</dd></div>
                  <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Received</dt><dd className="text-sm tabular-nums text-emerald-700">{formatMoney(s.receivedAmount)}</dd></div>
                  <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Pending</dt><dd className={`text-sm font-semibold tabular-nums ${s.balance > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>{formatMoney(s.balance)}</dd></div>
                </dl>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-500">
                  <span>Prof. {formatMoney(s.professionalFee)} · Govt {formatMoney(s.govtFee)}</span>
                  {canCollect && s.balance > 0 && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onCollect(s); }}>Collect</Button>}
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs text-zinc-500">
                  <th className="px-4 py-2.5 font-medium">Sale</th>
                  <th className="px-4 py-2.5 font-medium">Customer / Work</th>
                  <th className="px-3 py-2.5 text-right font-medium">Prof. fee</th>
                  <th className="px-3 py-2.5 text-right font-medium">Govt fee</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total</th>
                  <th className="px-3 py-2.5 text-right font-medium">Received</th>
                  <th className="px-3 py-2.5 text-right font-medium">Pending</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.data.map((s) => (
                  <tr key={s._id} onClick={() => onOpen(s._id)} className="cursor-pointer hover:bg-zinc-50">
                    <td className="whitespace-nowrap px-4 py-3"><div className="font-mono text-xs font-semibold">{s.saleNo}</div><div className="text-xs text-zinc-500">{shortDay(s.saleDate)}</div></td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.customer?.businessName}</div>
                      <div className="text-xs text-zinc-500">{s.title}{s.b2bPartner && <span className="text-amber-700"> · via {s.b2bPartner.name} ({s.b2bPercent}%)</span>}{s.soldBy && <span> · {s.soldBy.name}</span>}</div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatMoney(s.professionalFee)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-zinc-500">{formatMoney(s.govtFee)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatMoney(s.totalAmount)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{formatMoney(s.receivedAmount)}</td>
                    <td className={`px-3 py-3 text-right font-semibold tabular-nums ${s.balance > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>{formatMoney(s.balance)}</td>
                    <td className="px-3 py-3"><Badge tone={SALE_STATUS_TONE[s.status]}>{s.status}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      {canCollect && s.balance > 0 && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onCollect(s); }}>Collect</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>
    </>
  );
}

function PaymentsTab({ month, refreshKey, onOpen }) {
  const [data, setData] = useState(null);
  useEffect(() => { setData(null); api.get('/sales/payments', { params: { month } }).then((r) => setData(r.data)); }, [month, refreshKey]);
  const s = data?.stats;
  return (
    <>
      {s && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Collection" value={formatMoney(s.amount)} icon={Banknote} tone="green" sub={`${s.count} payment${s.count === 1 ? '' : 's'}`} />
          <Stat label="Of which govt fee" value={formatMoney(s.govt)} icon={Landmark} tone="violet" />
          <Stat label="Net business" value={formatMoney(s.professional)} icon={TrendingUp} tone="blue" sub="Collection − govt fee" />
          <Stat label="By mode" value={Object.keys(s.byMode).length ? '' : '—'} icon={Wallet} tone="zinc" sub={Object.entries(s.byMode).map(([m, v]) => `${m} ${formatMoney(v)}`).join(' · ')} />
        </div>
      )}
      <Card className="overflow-hidden">
        {!data ? <Spinner /> : data.data.length === 0 ? (
          <EmptyState icon={Banknote} title="No payments in this period" />
        ) : (
          <>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
            {data.data.map((p) => (
              <div key={p._id} onClick={() => p.sale && onOpen(p.sale._id)} className="cursor-pointer rounded-xl border border-zinc-200 p-4 hover:bg-zinc-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.customer?.businessName}</div>
                    <div className="text-xs text-zinc-500">{longDay(p.date)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{formatMoney(p.amount)}</div>
                    {p.discount > 0 && <div className="text-[11px] text-zinc-400">+{formatMoney(p.discount)} disc.</div>}
                  </div>
                </div>
                <div className="mt-1 truncate text-xs text-zinc-500"><span className="font-mono">{p.sale?.saleNo}</span> · {p.sale?.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <Badge>{p.mode}</Badge>{p.bank && <Badge tone="blue">{p.bank.name}</Badge>}{p.reference && <span className="text-zinc-400">{p.reference}</span>}
                  <span className="ml-auto tabular-nums">Govt {formatMoney(p.govtPart)} · Prof. {formatMoney(p.professionalPart)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs text-zinc-500">
              <th className="px-4 py-2.5 font-medium">Date</th><th className="px-4 py-2.5 font-medium">Customer</th><th className="px-4 py-2.5 font-medium">Sale</th><th className="px-3 py-2.5 font-medium">Mode</th>
              <th className="px-3 py-2.5 text-right font-medium">Amount</th><th className="px-3 py-2.5 text-right font-medium">Govt fee</th><th className="px-4 py-2.5 text-right font-medium">Professional</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {data.data.map((p) => (
                <tr key={p._id} onClick={() => p.sale && onOpen(p.sale._id)} className="cursor-pointer hover:bg-zinc-50">
                  <td className="whitespace-nowrap px-4 py-2.5">{longDay(p.date)}</td>
                  <td className="px-4 py-2.5 font-medium">{p.customer?.businessName}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500"><span className="font-mono">{p.sale?.saleNo}</span> · {p.sale?.title}</td>
                  <td className="px-3 py-2.5"><Badge>{p.mode}</Badge>{p.bank && <div className="text-[11px] text-zinc-500">{p.bank.name}</div>}{p.reference && <div className="text-[11px] text-zinc-400">{p.reference}</div>}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatMoney(p.amount)}{p.discount > 0 && <div className="text-[11px] font-normal text-zinc-400">+{formatMoney(p.discount)} disc.</div>}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-500">{formatMoney(p.govtPart)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(p.professionalPart)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          </>
        )}
      </Card>
    </>
  );
}

function OutstandingTab({ refreshKey }) {
  const [data, setData] = useState(null);
  useEffect(() => { setData(null); api.get('/sales/outstanding').then((r) => setData(r.data)); }, [refreshKey]);
  const today = localToday();
  const age = (d) => Math.round((new Date(today) - new Date(d)) / 86400000);
  return (
    <>
      {data && <div className="mb-4 text-sm text-zinc-600">Total outstanding across all customers: <b className="text-rose-600">{formatMoney(data.total)}</b></div>}
      <Card className="overflow-hidden">
        {!data ? <Spinner /> : data.data.length === 0 ? (
          <EmptyState icon={Wallet} title="Nothing outstanding" message="Every customer has paid in full." />
        ) : (
          <>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
            {data.data.map((r) => (
              <div key={r._id} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/customers/${r.customer._id}`} className="block truncate font-medium hover:underline">{r.customer.businessName}</Link>
                    <div className="text-xs text-zinc-500">{[r.customer.contactPerson, r.customer.phone].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div className="text-right font-semibold tabular-nums text-rose-600">{formatMoney(r.balance)}</div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Open sales</dt><dd className="text-sm font-semibold tabular-nums">{r.sales}</dd></div>
                  <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Billed</dt><dd className="text-sm tabular-nums">{formatMoney(r.total)}</dd></div>
                  <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Received</dt><dd className="text-sm tabular-nums text-emerald-700">{formatMoney(r.received)}</dd></div>
                </dl>
                <div className="mt-2 text-xs text-zinc-500">Oldest {shortDay(r.oldest)} · <span className={age(r.oldest) > 30 ? 'font-semibold text-rose-600' : ''}>{age(r.oldest)} days</span></div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs text-zinc-500">
              <th className="px-4 py-2.5 font-medium">Customer</th><th className="px-3 py-2.5 text-center font-medium">Open sales</th><th className="px-3 py-2.5 text-right font-medium">Billed</th>
              <th className="px-3 py-2.5 text-right font-medium">Received</th><th className="px-3 py-2.5 text-right font-medium">Outstanding</th><th className="px-4 py-2.5 font-medium">Oldest</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {data.data.map((r) => (
                <tr key={r._id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3"><Link to={`/customers/${r.customer._id}`} className="font-medium hover:underline">{r.customer.businessName}</Link><div className="text-xs text-zinc-500">{[r.customer.contactPerson, r.customer.phone].filter(Boolean).join(' · ')}</div></td>
                  <td className="px-3 py-3 text-center tabular-nums">{r.sales}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatMoney(r.total)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{formatMoney(r.received)}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-rose-600">{formatMoney(r.balance)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{shortDay(r.oldest)} · <span className={age(r.oldest) > 30 ? 'font-semibold text-rose-600' : ''}>{age(r.oldest)} days</span></td>
                </tr>
              ))}
            </tbody>
          </table></div>
          </>
        )}
      </Card>
    </>
  );
}

export default function Sales() {
  const { can } = useAuth();
  const [tab, setTab] = useState('sales');
  const [month, setMonth] = useState(localToday().slice(0, 7));
  const [newOpen, setNewOpen] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [collecting, setCollecting] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const canCollect = can('sales', 'collect') || can('sales', 'edit');

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Sales with professional & government fee, payments received and who still owes."
        actions={
          <>
            {tab !== 'outstanding' && <div className="w-40"><Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>}
            {can('sales', 'create') && <Button icon={Plus} onClick={() => setNewOpen(true)}>New Sale</Button>}
          </>
        }
      />
      <Tabs className="mb-5" value={tab} onChange={setTab} items={[{ key: 'sales', label: 'Sales' }, { key: 'payments', label: 'Payments Received' }, { key: 'outstanding', label: 'Outstanding' }]} />
      {tab === 'sales' && <SalesTab month={month} refreshKey={refreshKey} onOpen={setOpenId} onCollect={setCollecting} canCollect={canCollect} />}
      {tab === 'payments' && <PaymentsTab month={month} refreshKey={refreshKey} onOpen={setOpenId} />}
      {tab === 'outstanding' && <OutstandingTab refreshKey={refreshKey} />}

      <SaleDialog open={newOpen} onClose={() => setNewOpen(false)} onSaved={refresh} />
      <SaleDetail saleId={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
      <CollectDialog sale={collecting} onClose={() => setCollecting(null)} onDone={refresh} />
    </div>
  );
}
