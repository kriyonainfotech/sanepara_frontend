import { useEffect, useState } from 'react';
import { BarChart3, Users } from 'lucide-react';
import { api } from '../lib/api';
import { formatMoney, localToday, monthLabel } from '../lib/format';
import PageHeader from '../components/PageHeader';
import TeamPerformance from '../components/TeamPerformance';
import Card from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import Spinner from '../components/ui/Spinner';
import { Input, Select } from '../components/ui/Field';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Darker cell = sold more that month (relative to the busiest cell).
function heat(value, max) {
  if (!value) return '';
  const r = value / max;
  return r > 0.75 ? 'bg-zinc-900 text-white' : r > 0.5 ? 'bg-zinc-700 text-white' : r > 0.25 ? 'bg-zinc-300' : 'bg-zinc-100';
}

function ServiceMatrix() {
  const thisYear = Number(localToday().slice(0, 4));
  const [year, setYear] = useState(String(thisYear));
  const [metric, setMetric] = useState('count');
  const [data, setData] = useState(null);
  useEffect(() => {
    setData(null);
    api.get('/reports/service-matrix', { params: { year } }).then((r) => setData(r.data));
  }, [year]);

  const val = (cell) => (metric === 'count' ? cell.count : cell.amount);
  const fmt = (v) => (metric === 'count' ? v || '' : v ? formatMoney(v) : '');
  const max = data ? Math.max(1, ...data.data.flatMap((s) => s.months.map(val))) : 1;
  const rows = (data?.data || []).filter((s) => s.count > 0 || s.isActive);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="w-32">
          <Select value={year} onChange={(e) => setYear(e.target.value)}>{Array.from({ length: 6 }, (_, i) => String(thisYear - i)).map((y) => <option key={y}>{y}</option>)}</Select>
        </div>
        <Tabs value={metric} onChange={setMetric} items={[{ key: 'count', label: 'Times sold' }, { key: 'amount', label: 'Amount' }]} />
      </div>
      <Card className="overflow-hidden">
        {!data ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead><tr className="border-b border-zinc-100 bg-zinc-50/70 text-xs text-zinc-500">
                <th className="sticky left-0 bg-zinc-50 px-5 py-2.5 text-left font-medium">Service</th>
                {MONTHS.map((m) => <th key={m} className="px-2 py-2.5 text-center font-medium">{m}</th>)}
                <th className="px-5 py-2.5 text-right font-medium">Total</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.length === 0 ? <tr><td colSpan={14} className="py-12 text-center text-zinc-400">No services yet.</td></tr> : rows.map((s) => (
                  <tr key={s.id}>
                    <td className="sticky left-0 bg-white px-5 py-2 font-medium">{s.name}</td>
                    {s.months.map((c, i) => (
                      <td key={i} className="px-1 py-1 text-center">
                        <div className={`rounded-md px-1.5 py-1.5 text-xs tabular-nums ${heat(val(c), max)}`}>{fmt(val(c)) || <span className="text-zinc-300">·</span>}</div>
                      </td>
                    ))}
                    <td className="px-5 py-2 text-right font-semibold tabular-nums">{metric === 'count' ? s.count : formatMoney(s.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-zinc-200 bg-zinc-50/70 font-semibold tabular-nums">
                <tr>
                  <td className="sticky left-0 bg-zinc-50 px-5 py-2.5">Total</td>
                  {data.totals.map((c, i) => <td key={i} className="px-2 py-2.5 text-center text-xs">{fmt(val(c)) || <span className="text-zinc-300">0</span>}</td>)}
                  <td className="px-5 py-2.5 text-right">{metric === 'count' ? data.grand.count : formatMoney(data.grand.amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-2 text-xs text-zinc-400">Counted from sales by sale date. Sales without a linked service are under "Other".</p>
    </>
  );
}

export default function Reports() {
  const [tab, setTab] = useState('matrix');
  const [month, setMonth] = useState(localToday().slice(0, 7));
  return (
    <div>
      <PageHeader title="Reports & Matrix" description="Which service sold how many times each month, and how every team member is performing."
        actions={tab === 'team' && <div className="w-44"><Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} items={[{ key: 'matrix', label: 'Service matrix', icon: BarChart3 }, { key: 'team', label: 'Team performance', icon: Users }]} />
      {tab === 'matrix' ? <ServiceMatrix /> : (
        <Card className="overflow-hidden">
          <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3 text-sm font-semibold">Team performance — {monthLabel(month + '-01')}</div>
          <TeamPerformance month={month} />
        </Card>
      )}
    </div>
  );
}
