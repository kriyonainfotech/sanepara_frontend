import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Layers, Mail, MapPin, Pencil, Phone, Plus, Receipt, Trash2, UserRound, X } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/format';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Progress from '../components/ui/Progress';
import { Field, Select } from '../components/ui/Field';
import CustomerFormModal from '../components/CustomerFormModal';
import CustomerAccount from '../components/sales/CustomerAccount';
import SaleDialog from '../components/sales/SaleDialog';
import { formatMoney } from '../lib/format';

const STATUS = {
  pending: { label: 'Unscheduled', tone: 'amber' },
  in_progress: { label: 'In progress', tone: 'violet' },
  completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'zinc' },
};

function Info({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
      <div className="min-w-0">
        <div className="text-xs text-zinc-500">{label}</div>
        <div className={`mt-0.5 break-words text-sm text-zinc-900 ${mono ? 'font-mono' : ''}`}>{value || <span className="text-zinc-400">—</span>}</div>
      </div>
    </div>
  );
}

function AssignServiceModal({ open, onClose, customerId, onAssigned }) {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setServiceId('');
    api.get('/services', { params: { active: true } }).then((r) => setServices(r.data.services));
  }, [open]);

  const selected = services.find((s) => s._id === serviceId);

  const submit = async () => {
    setSaving(true);
    try {
      await api.post(`/customers/${customerId}/services`, { serviceId });
      toast.success('Service assigned — its tasks are now in Schedule Management');
      onAssigned();
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
      title="Assign service"
      description="Each task of the service will appear in Schedule Management as unscheduled work."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!serviceId} loading={saving}>Assign</Button>
        </>
      }
    >
      <Field label="Service">
        <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          <option value="">Select a service…</option>
          {services.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </Select>
      </Field>
      {selected && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-2 text-xs font-medium text-zinc-500">{selected.tasks.length} tasks included</div>
          <ol className="space-y-1.5">
            {selected.tasks.map((t, i) => (
              <li key={t._id} className="flex gap-2 text-sm text-zinc-700">
                <span className="w-4 text-right text-xs leading-5 tabular-nums text-zinc-400">{i + 1}</span>
                {t.title}
              </li>
            ))}
          </ol>
        </div>
      )}
    </Modal>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const canAssign = can('services', 'assign');
  const [data, setData] = useState(null);
  const [billing, setBilling] = useState(null); // assigned service to create a sale for
  const [accountKey, setAccountKey] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () =>
    api.get(`/customers/${id}`).then((r) => setData(r.data)).catch((err) => {
      toast.error(errorMessage(err));
      navigate('/customers');
    });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const removeCustomer = async () => {
    setDeleting(true);
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Customer deleted');
      navigate('/customers');
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  };

  const removeService = async (assignmentId) => {
    try {
      await api.delete(`/customers/${id}/services/${assignmentId}`);
      toast.success('Service removed');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (!data) return <Spinner />;
  const { customer, services } = data;

  return (
    <div>
      <Link to="/customers" className="mb-5 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="h-4 w-4" /> Customers
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="scale-125"><Avatar name={customer.businessName} /></div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{customer.businessName}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Added by {customer.addedBy?.name || '—'} on {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {can('customers', 'edit') && <Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>Edit</Button>}
          {can('customers', 'delete') && <Button variant="secondary" icon={Trash2} onClick={() => setConfirmDelete(true)} className="hover:!text-red-600">Delete</Button>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-5 p-5 lg:col-span-1 self-start">
          <h2 className="text-sm font-semibold">Details</h2>
          <Info icon={UserRound} label="Contact person" value={customer.contactPerson} />
          <Info icon={Phone} label="Mobile" value={customer.phone} />
          <Info icon={Receipt} label="GST number" value={customer.gstNumber} mono />
          <Info icon={Mail} label="Email" value={customer.email} />
          <Info icon={MapPin} label="Address" value={customer.address} />
          {customer.notes && (
            <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">{customer.notes}</div>
          )}
        </Card>

        <Card className="lg:col-span-2 self-start">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold">Services</h2>
            {canAssign && <Button size="sm" icon={Plus} onClick={() => setAssignOpen(true)}>Assign service</Button>}
          </div>
          {services.length === 0 ? (
            <EmptyState icon={Layers} title="No services assigned" message="Assign a service like GST filing to start scheduling work for this customer." />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {services.map((s) => (
                <li key={s._id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.service?.name || 'Deleted service'}{s.periodLabel && <span className="font-normal text-zinc-500"> · {s.periodLabel}</span>}</div>
                    <div className="text-xs text-zinc-500">
                      {s.done}/{s.total} done · {s.scheduled} scheduled · assigned {formatDate(s.createdAt)}
                    </div>
                    <Progress done={s.done} total={s.total} className="mt-1.5 max-w-56" />
                  </div>
                  {s.billing !== undefined && (
                    s.billing ? (
                      <span className="text-right text-xs">
                        <span className="font-medium text-emerald-700">Billed {formatMoney(s.billing.amount)}</span>
                        {s.billing.balance > 0 && <span className="block text-rose-600">{formatMoney(s.billing.balance)} due</span>}
                      </span>
                    ) : can('sales', 'create') ? (
                      <Button size="sm" variant="secondary" onClick={() => setBilling(s)}>Create sale</Button>
                    ) : (
                      <span className="text-xs text-amber-600">Not billed</span>
                    )
                  )}
                  <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
                  {canAssign && s.status === 'pending' && !s.scheduled && (
                    <button onClick={() => removeService(s._id)} title="Remove" className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {can('sales', 'view') && (
        <div className="mt-6">
          <CustomerAccount customerId={id} refreshKey={accountKey} onChanged={load} />
        </div>
      )}

      <SaleDialog
        open={!!billing}
        onClose={() => setBilling(null)}
        preset={billing && { customer: id, customerService: billing._id, title: [billing.service?.name, billing.periodLabel].filter(Boolean).join(' · '), professionalFee: billing.service?.price || '' }}
        onSaved={() => { load(); setAccountKey((k) => k + 1); }}
      />
      <CustomerFormModal open={editOpen} onClose={() => setEditOpen(false)} customer={customer} onSaved={load} />
      <AssignServiceModal open={assignOpen} onClose={() => setAssignOpen(false)} customerId={id} onAssigned={load} />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={removeCustomer}
        loading={deleting}
        title="Delete customer?"
        message={`${customer.businessName} and all its assigned services will be permanently removed.`}
      />
    </div>
  );
}
