import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Layers, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/format';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea } from '../components/ui/Field';

const EMPTY = { name: '', description: '', price: '', isActive: true, tasks: [{ title: '' }] };

function ServiceFormModal({ open, onClose, service, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      service
        ? { ...service, price: service.price || '', tasks: service.tasks.length ? service.tasks.map((t) => ({ _id: t._id, title: t.title })) : [{ title: '' }] }
        : EMPTY
    );
  }, [open, service]);

  // Tasks keep their _id so renaming one updates it for customers who already have the service.
  const setTask = (i, v) => setForm({ ...form, tasks: form.tasks.map((t, j) => (j === i ? { ...t, title: v } : t)) });
  // A new box only appears once every existing box has a title.
  const hasBlank = form.tasks.some((t) => !t.title.trim());
  const addTask = () => {
    if (hasBlank) return toast.error('Fill in the empty task first');
    setForm({ ...form, tasks: [...form.tasks, { title: '' }] });
  };
  const removeTask = (i) => setForm({ ...form, tasks: form.tasks.filter((_, j) => j !== i) });
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= form.tasks.length) return;
    const tasks = [...form.tasks];
    [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
    setForm({ ...form, tasks });
  };

  const submit = async (e) => {
    e.preventDefault();
    const tasks = form.tasks.map((t) => ({ ...t, title: t.title.trim() })).filter((t) => t.title);
    if (!tasks.length) return toast.error('Add at least one task');
    setSaving(true);
    try {
      const payload = { name: form.name, description: form.description, price: Number(form.price) || 0, isActive: form.isActive, tasks };
      if (service) await api.put(`/services/${service._id}`, payload);
      else await api.post('/services', payload);
      toast.success(service ? 'Service updated' : 'Service created');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={service ? 'Edit service' : 'New service'}
      description="Define the service and the list of tasks that make it up."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="service-form" loading={saving}>{service ? 'Save changes' : 'Create service'}</Button>
        </>
      }
    >
      <form id="service-form" onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Service name" required className="sm:col-span-2">
            <Input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. GST Monthly Filing" />
          </Field>
          <Field label="Default price (₹)">
            <Input type="number" min="0" step="any" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
          </Field>
        </div>
        <Field label="Description">
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600">Tasks <span className="text-red-500">*</span></span>
            <span className="text-xs text-zinc-400">{form.tasks.filter((t) => t.title.trim()).length} tasks</span>
          </div>
          <div className="space-y-2">
            {form.tasks.map((t, i) => (
              <div key={i} className="group flex items-center gap-2">
                <div className="flex flex-col text-zinc-300">
                  <button type="button" onClick={() => move(i, -1)} className="h-3 leading-none hover:text-zinc-600" tabIndex={-1}>▴</button>
                  <button type="button" onClick={() => move(i, 1)} className="h-3 leading-none hover:text-zinc-600" tabIndex={-1}>▾</button>
                </div>
                <span className="w-5 text-right text-xs tabular-nums text-zinc-400">{i + 1}</span>
                <Input
                  value={t.title}
                  onChange={(e) => setTask(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTask();
                    }
                  }}
                  placeholder={i === 0 ? 'e.g. Collect sales & purchase bills' : 'Task title'}
                  autoFocus={i > 0 && i === form.tasks.length - 1 && !t.title}
                />
                <button type="button" onClick={() => removeTask(i)} disabled={form.tasks.length === 1} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 disabled:invisible">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" icon={Plus} onClick={addTask} disabled={hasBlank} className="mt-2 ml-9">Add task</Button>
        </div>

        <label className="flex items-center gap-2.5 text-sm text-zinc-700">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-zinc-300 accent-zinc-900" />
          Active — available to assign to customers
        </label>
      </form>
    </Modal>
  );
}

function ServiceCard({ service, onEdit, onDelete }) {
  const [menu, setMenu] = useState(false);
  const hasMenu = onEdit || onDelete;
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
          <Layers className="h-4 w-4" />
        </div>
        {hasMenu && <div className="relative">
          <button onClick={() => setMenu(!menu)} onBlur={() => setTimeout(() => setMenu(false), 150)} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menu && (
            <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg animate-pop-in">
              {onEdit && <button onClick={onEdit} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"><Pencil className="h-3.5 w-3.5" /> Edit</button>}
              {onDelete && <button onClick={onDelete} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>}
            </div>
          )}
        </div>}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <h3 className="font-semibold tracking-tight">{service.name}</h3>
        {!service.isActive && <Badge>Inactive</Badge>}
      </div>
      {service.description && <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{service.description}</p>}

      <ol className="mt-4 flex-1 space-y-1.5">
        {service.tasks.slice(0, 5).map((t, i) => (
          <li key={t._id} className="flex gap-2 text-sm text-zinc-600">
            <span className="w-4 text-right text-xs leading-5 tabular-nums text-zinc-400">{i + 1}</span>
            <span className="truncate">{t.title}</span>
          </li>
        ))}
        {service.tasks.length > 5 && <li className="pl-6 text-xs text-zinc-400">+{service.tasks.length - 5} more</li>}
      </ol>

      <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 text-xs text-zinc-500">
        <span>{service.tasks.length} tasks · {service.customerCount} customer{service.customerCount === 1 ? '' : 's'}</span>
        {service.price > 0 && <span className="font-medium text-zinc-900">{formatMoney(service.price)}</span>}
      </div>
    </Card>
  );
}

const NO_FILTERS = { status: '', customers: '', sort: '' };

export default function Services() {
  const { can } = useAuth();
  const canCreate = can('services', 'create');
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState(NO_FILTERS);
  const [page, setPage] = useState(1);
  const filtered = Boolean(q || filters.status || filters.customers);
  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get('/services', { params: { q, page, limit: 12, ...filters } }).then((r) => {
      setData(r.data);
      if (r.data.page !== page) setPage(r.data.page); // e.g. the last service on a page was deleted
    });

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, filters]);

  const openForm = (s = null) => { setEditing(s); setFormOpen(true); };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/services/${deleting._id}`);
      toast.success('Service deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Services"
        description={data ? `${data.total} service${data.total === 1 ? '' : 's'} · the tasks each one involves` : 'Services you offer and the tasks each one involves.'}
        actions={canCreate && <Button icon={Plus} onClick={() => openForm()}>New service</Button>}
      />

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search service, description or task" className="pl-9" />
        </div>
        <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="w-auto!">
          <option value="">Status: All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <Select value={filters.customers} onChange={(e) => setFilter('customers', e.target.value)} className="w-auto!">
          <option value="">Customers: All</option>
          <option value="assigned">Assigned to customers</option>
          <option value="none">Not assigned yet</option>
        </Select>
        <Select value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)} className="w-auto!">
          <option value="">Sort: Name A–Z</option>
          <option value="newest">Newest first</option>
          <option value="customers">Most customers</option>
          <option value="price_high">Price: high to low</option>
          <option value="price_low">Price: low to high</option>
        </Select>
        {(filtered || filters.sort) && (
          <Button variant="secondary" icon={X} onClick={() => { setQ(''); setFilters(NO_FILTERS); setPage(1); }}>Clear</Button>
        )}
      </Card>

      {!data ? (
        <Spinner />
      ) : data.services.length === 0 ? (
        <Card>
          {filtered ? (
            <EmptyState icon={Search} title="No matching services" message="Try a different search or clear the filters." />
          ) : (
            <EmptyState icon={Layers} title="No services yet" message="Create your first service, e.g. GST filing with its 7 tasks." action={canCreate && <Button icon={Plus} onClick={() => openForm()}>New service</Button>} />
          )}
        </Card>
      ) : (
        <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.services.map((s) => (
            <ServiceCard
              key={s._id}
              service={s}
              onEdit={can('services', 'edit') ? () => openForm(s) : null}
              onDelete={can('services', 'delete') ? () => setDeleting(s) : null}
            />
          ))}
        </div>
        {data.pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
            <span>Page {data.page} of {data.pages}</span>
            <div className="flex gap-1">
              <Button variant="secondary" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="secondary" size="icon" disabled={page >= data.pages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
        </>
      )}

      <ServiceFormModal open={formOpen} onClose={() => setFormOpen(false)} service={editing} onSaved={load} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete service?"
        message={`"${deleting?.name}" will be permanently deleted.`}
      />
    </div>
  );
}
