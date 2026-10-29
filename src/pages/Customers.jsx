import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Plus, Search, Users, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/format';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Avatar from '../components/ui/Avatar';
import CustomerFormModal from '../components/CustomerFormModal';
import ImportCustomersModal from '../components/ImportCustomersModal';

const NO_FILTERS = { service: '', gst: '', addedBy: '', from: '', to: '' };

function ReferredBy({ c }) {
  const p = c.referredByPartner;
  if (p) return <>{p.name}{p.firmName ? ` — ${p.firmName}` : ''} <span className="ml-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">B2B</span></>;
  return c.referredBy || <span className="text-zinc-400">—</span>;
}

export default function Customers() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canCreate = can('customers', 'create');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [services, setServices] = useState([]);
  const [members, setMembers] = useState([]);
  const filtered = Boolean(q) || Object.values(filters).some(Boolean);
  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

  useEffect(() => {
    api.get('/services').then((r) => setServices(r.data.services)).catch(() => {});
    api.get('/users').then((r) => setMembers(r.data.users)).catch(() => {});
  }, []);

  const load = () =>
    api.get('/customers', { params: { q, page, limit: 20, ...filters } }).then((r) => setData(r.data));

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, filters]);

  return (
    <div>
      <PageHeader
        title="Customers"
        description={data ? `${data.total} customer${data.total === 1 ? '' : 's'} in your database` : 'Converted leads and their details'}
        actions={canCreate && (
          <>
            <Button variant="secondary" icon={FileSpreadsheet} onClick={() => setImportOpen(true)}>Import Excel</Button>
            <Button icon={Plus} onClick={() => setFormOpen(true)}>Add customer</Button>
          </>
        )}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 p-3">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by name, mobile or GST number" className="pl-9" />
          </div>
          {services.length > 0 && (
            <Select value={filters.service} onChange={(e) => setFilter('service', e.target.value)} className="w-auto!">
              <option value="">All services</option>
              {services.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </Select>
          )}
          <Select value={filters.gst} onChange={(e) => setFilter('gst', e.target.value)} className="w-auto!">
            <option value="">GST: All</option>
            <option value="running">Running GST filing</option>
            <option value="stopped">GST filing stopped</option>
            <option value="has">Has GST number</option>
            <option value="none">No GST number</option>
          </Select>
          {members.length > 0 && (
            <Select value={filters.addedBy} onChange={(e) => setFilter('addedBy', e.target.value)} className="w-auto!">
              <option value="">Added by: Anyone</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </Select>
          )}
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter('from', e.target.value)} className="w-auto!" title="Added from" />
            <span>to</span>
            <Input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} className="w-auto!" title="Added to" />
          </div>
          {filtered && (
            <Button variant="secondary" icon={X} onClick={() => { setQ(''); setFilters(NO_FILTERS); setPage(1); }}>Clear</Button>
          )}
        </div>

        {!data ? (
          <Spinner />
        ) : data.customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={filtered ? 'No matching customers' : 'No customers yet'}
            message={filtered ? 'Try a different search or clear the filters.' : 'When a lead converts, add it here as a customer.'}
            action={!filtered && canCreate && <Button icon={Plus} onClick={() => setFormOpen(true)}>Add customer</Button>}
          />
        ) : (
          <>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
              {data.customers.map((c) => (
                <div key={c._id} onClick={() => navigate(`/customers/${c._id}`)} className="cursor-pointer rounded-xl border border-zinc-200 p-4 transition-colors hover:bg-zinc-50">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.businessName} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-zinc-900">{c.businessName}</div>
                      {c.contactPerson && <div className="truncate text-xs text-zinc-500">{c.contactPerson}</div>}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-zinc-50 px-3 py-2"><div className="text-[10px] font-semibold uppercase text-zinc-400">Mobile</div><div className="tabular-nums text-zinc-700">{c.phone}</div></div>
                    <div className="rounded-lg bg-zinc-50 px-3 py-2"><div className="text-[10px] font-semibold uppercase text-zinc-400">GST number</div><div className="truncate font-mono text-zinc-700">{c.gstNumber || <span className="font-sans text-zinc-400">—</span>}</div></div>
                  </div>
                  {(c.referredByPartner || c.referredBy) && <div className="mt-2 text-xs text-zinc-500">Referred by <ReferredBy c={c} /></div>}
                  <div className="mt-2 flex justify-between text-xs text-zinc-500"><span>by {c.addedBy?.name || '—'}</span><span>{formatDate(c.createdAt)}</span></div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-xs font-medium text-zinc-500">
                    <th className="px-5 py-2.5 font-medium">Business</th>
                    <th className="px-5 py-2.5 font-medium">Mobile</th>
                    <th className="px-5 py-2.5 font-medium">GST number</th>
                    <th className="px-5 py-2.5 font-medium">Referred by</th>
                    <th className="px-5 py-2.5 font-medium">Added by</th>
                    <th className="px-5 py-2.5 font-medium">Added on</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.customers.map((c) => (
                    <tr key={c._id} onClick={() => navigate(`/customers/${c._id}`)} className="cursor-pointer transition-colors hover:bg-zinc-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.businessName} />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-zinc-900">{c.businessName}</div>
                            {c.contactPerson && <div className="truncate text-xs text-zinc-500">{c.contactPerson}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 tabular-nums text-zinc-700">{c.phone}</td>
                      <td className="px-5 py-3 font-mono text-xs text-zinc-700">{c.gstNumber || <span className="font-sans text-zinc-400">—</span>}</td>
                      <td className="px-5 py-3 text-zinc-700"><ReferredBy c={c} /></td>
                      <td className="px-5 py-3 text-zinc-700">{c.addedBy?.name || '—'}</td>
                      <td className="px-5 py-3 text-zinc-500">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500">
                <span>Page {data.page} of {data.pages}</span>
                <div className="flex gap-1">
                  <Button variant="secondary" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="secondary" size="icon" disabled={page >= data.pages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <ImportCustomersModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => (page === 1 ? load() : setPage(1))} />
      <CustomerFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={(c) => navigate(`/customers/${c._id}`)} />
    </div>
  );
}
