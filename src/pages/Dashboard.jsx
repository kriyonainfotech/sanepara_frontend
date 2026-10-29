import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarCheck, CalendarClock, Layers, UserCog, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, localToday } from '../lib/format';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import ClockCard from '../components/attendance/ClockCard';
import TeamPerformance from '../components/TeamPerformance';
import { DueRow } from '../components/compliance/DueRow';

function Stat({ label, value, sub, icon: Icon, to }) {
  const body = (
    <Card className="group h-full p-4 transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 sm:text-sm">{label}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 sm:h-8 sm:w-8 text-zinc-600 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:mt-3 sm:text-3xl">{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </Card>
  );
  return to ? <Link to={to} className="block h-full">{body}</Link> : body;
}

// Overdue and next-7-days compliance due dates.
function ComplianceAlerts() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/compliance/upcoming').then((r) => setData(r.data)).catch(() => {});
  }, []);
  if (!data) return null;
  const list = [...data.overdue, ...data.upcoming];
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarCheck className="h-4 w-4 text-zinc-500" /> Compliance due dates
          {data.overdue.length > 0 && <span className="rounded-md bg-red-50 px-1.5 text-xs font-medium text-red-700">{data.overdue.length} overdue</span>}
        </h2>
        <Link to="/compliance" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900">
          Calendar <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {list.length === 0 ? (
        <div className="px-5 py-6 text-center text-sm text-zinc-500">Nothing overdue and nothing due in the next 7 days.</div>
      ) : (
        <div className="max-h-80 divide-y divide-zinc-100 overflow-y-auto">
          {list.map((o) => <DueRow key={o.id} o={o} today={data.today} onOpen={() => navigate('/compliance')} />)}
        </div>
      )}
    </Card>
  );
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function Dashboard() {
  const { user, can } = useAuth();
  const allowed = can('dashboard', 'view');
  const [data, setData] = useState(null);

  useEffect(() => {
    if (allowed) api.get('/dashboard/summary').then((r) => setData(r.data));
  }, [allowed]);

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <p className="text-sm text-zinc-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {greeting()}, {user.name.split(' ')[0]}
        </h1>
      </div>

      {user.role !== 'superadmin' && <div className="mb-6"><ClockCard /></div>}

      {can('compliance') && <ComplianceAlerts />}

      {!allowed ? (
        <Card className="p-8 text-center text-sm text-zinc-500">Use the menu on the left to get to your work.</Card>
      ) : !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Stat label="Total customers" value={data.customers} sub={`+${data.customersThisMonth} this month`} icon={Users} to={can('customers') ? '/customers' : undefined} />
            <Stat label="Active services" value={data.services} icon={Layers} to={can('services') ? '/services' : undefined} />
            <Stat label="Pending to schedule" value={data.pendingSchedule} sub="Services waiting for a member" icon={CalendarClock} to={can('schedule') ? '/schedule' : undefined} />
            <Stat label="Team members" value={data.team} icon={UserCog} to={can('team') ? '/team' : undefined} />
          </div>

          {data.recentCustomers && <Card className="mt-6">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-semibold">Recently added customers</h2>
              <Link to="/customers" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {data.recentCustomers.length === 0 ? (
              <EmptyState icon={Users} title="No customers yet" message="Converted leads you add will show up here." />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {data.recentCustomers.map((c) => (
                  <li key={c._id}>
                    <Link to={`/customers/${c._id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50">
                      <Avatar name={c.businessName} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{c.businessName}</div>
                        <div className="truncate text-xs text-zinc-500">{c.gstNumber || c.phone}</div>
                      </div>
                      <div className="text-right text-xs text-zinc-500">
                        <div>{formatDate(c.createdAt)}</div>
                        <div className="text-zinc-400">by {c.addedBy?.name || '—'}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>}
        </>
      )}

      {can('reports') && (
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold">Team performance this month</h2>
            <Link to="/reports" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900">
              Reports <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <TeamPerformance month={localToday().slice(0, 7)} compact />
        </Card>
      )}
    </div>
  );
}
