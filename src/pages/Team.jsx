import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatMoney, ROLE_LABEL } from '../lib/format';
import { time12 } from '../lib/attendance';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field, Input, Select } from '../components/ui/Field';

const EMPTY = { name: '', email: '', phone: '', password: '', role: 'team', designation: '', monthlySalary: '', joiningDate: '', isActive: true, shiftStart: '09:00', shiftEnd: '18:00', fullDayHours: 8, halfDayHours: 4 };
const ROLE_TONE = { superadmin: 'violet', admin: 'blue', team: 'zinc' };

function MemberFormModal({ open, onClose, member, onSaved }) {
  const { user: me, isSuperAdmin } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      member
        ? { ...EMPTY, ...member, password: '', monthlySalary: member.monthlySalary || '', joiningDate: member.joiningDate?.slice(0, 10) || '', shiftStart: member.shiftStart || '09:00', shiftEnd: member.shiftEnd || '18:00', fullDayHours: member.fullDayHours ?? 8, halfDayHours: member.halfDayHours ?? 4 }
        : EMPTY
    );
  }, [open, member]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (form.phone && !/^\d{10}$/.test(form.phone)) throw new Error('Mobile number must be exactly 10 digits');
      if (Number(form.halfDayHours) > Number(form.fullDayHours)) throw new Error('Half day hours cannot be more than full day hours');
      const payload = { ...form, monthlySalary: Number(form.monthlySalary) || 0, joiningDate: form.joiningDate || null, fullDayHours: Number(form.fullDayHours), halfDayHours: Number(form.halfDayHours) };
      if (member && !payload.password) delete payload.password;
      if (member) await api.put(`/users/${member._id}`, payload);
      else await api.post('/users', payload);
      toast.success(member ? 'Member updated' : 'Member added');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const isSelf = member?._id === me._id;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? 'Edit member' : 'Add member'}
      description={member ? undefined : 'They will log in with this email and password.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="member-form" loading={saving}>{member ? 'Save changes' : 'Add member'}</Button>
        </>
      }
    >
      <form id="member-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required className="sm:col-span-2">
          <Input required autoFocus value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email (login)" required>
          <Input required type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Mobile">
          <Input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            pattern="\d{10}"
            title="Enter a 10 digit mobile number"
            value={form.phone || ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            placeholder="10 digit mobile number"
          />
        </Field>
        <Field label={member ? 'New password' : 'Password'} required={!member} hint={member ? 'Leave blank to keep current' : 'At least 6 characters'}>
          <Input type="password" required={!member} minLength={6} value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Role" required>
          <Select value={form.role} onChange={set('role')} disabled={isSelf || !isSuperAdmin}>
            <option value="team">Team</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
          </Select>
        </Field>
        <Field label="Designation">
          <Input value={form.designation} onChange={set('designation')} placeholder="e.g. GST Executive" />
        </Field>
        <Field label="Joining date">
          <Input type="date" value={form.joiningDate} onChange={set('joiningDate')} />
        </Field>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 sm:col-span-2">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Shift, attendance & salary</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shift start" required hint="Clock-in after this is late">
              <Input type="time" required value={form.shiftStart} onChange={set('shiftStart')} />
            </Field>
            <Field label="Shift end" required hint="Used if they forget to clock out">
              <Input type="time" required value={form.shiftEnd} onChange={set('shiftEnd')} />
            </Field>
            <Field label="Full day (hours)" required hint="Worked this much or more = Full Day">
              <Input type="number" required min="0" max="24" step="0.25" value={form.fullDayHours} onChange={set('fullDayHours')} />
            </Field>
            <Field label="Half day (hours)" required hint="At least this = Half Day, less = Absent">
              <Input type="number" required min="0" max="24" step="0.25" value={form.halfDayHours} onChange={set('halfDayHours')} />
            </Field>
            <Field label="Monthly salary (₹)" className="sm:col-span-2" hint="Paid per working day from attendance — Full Day = 1 day, Half Day = ½ day">
              <Input type="number" min="0" value={form.monthlySalary} onChange={set('monthlySalary')} />
            </Field>
          </div>
        </div>
        {member && !isSelf && (
          <label className="flex items-center gap-2.5 self-end pb-2 text-sm text-zinc-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 accent-zinc-900" />
            Active (can log in)
          </label>
        )}
      </form>
    </Modal>
  );
}

export default function Team() {
  const { user: me, can, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => api.get('/users').then((r) => setUsers(r.data.users));
  useEffect(() => { load(); }, []);

  const openForm = (u = null) => { setEditing(u); setFormOpen(true); };
  // Admins can only manage Team accounts; nobody deletes themselves.
  const canEdit = (u) => can('team', 'edit') && (isSuperAdmin || u.role === 'team');
  const canDelete = (u) => can('team', 'delete') && (isSuperAdmin || u.role === 'team') && u._id !== me._id;
  const actions = (u) => (
    <>
      {canEdit(u) && <Button variant="ghost" size="icon" onClick={() => openForm(u)} title="Edit"><Pencil className="h-4 w-4" /></Button>}
      {canDelete(u) && <Button variant="ghost" size="icon" onClick={() => setDeleting(u)} title="Delete" className="hover:!text-red-600"><Trash2 className="h-4 w-4" /></Button>}
    </>
  );
  const remove = async () => {
    try {
      const { data } = await api.delete(`/users/${deleting._id}`);
      toast.success(data.message);
      setDeleting(null); load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader
        title="Team members"
        description="Super Admins, Admins and Team who use the CRM."
        actions={can('team', 'create') && <Button icon={Plus} onClick={() => openForm()}>Add member</Button>}
      />

      <Card>
        {!users ? (
          <Spinner />
        ) : users.length === 0 ? (
          <EmptyState icon={UserCog} title="No members" />
        ) : (
          <>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
            {users.map((u) => (
              <div key={u._id} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{u.name}</div>
                    <div className="truncate text-xs text-zinc-500">{u.designation || u.email}</div>
                  </div>
                  <div className="flex">{actions(u)}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                  {u.isActive ? <Badge tone="green">Active</Badge> : <Badge>Disabled</Badge>}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-zinc-50 px-3 py-2"><div className="text-[10px] font-semibold uppercase text-zinc-400">Shift</div><div className="tabular-nums text-zinc-700">{time12(u.shiftStart)} – {time12(u.shiftEnd)}</div><div className="text-zinc-400">Full {u.fullDayHours ?? 8}h · Half {u.halfDayHours ?? 4}h</div></div>
                  <div className="rounded-lg bg-zinc-50 px-3 py-2"><div className="text-[10px] font-semibold uppercase text-zinc-400">Salary</div><div className="tabular-nums text-zinc-700">{u.monthlySalary ? formatMoney(u.monthlySalary) : '—'}</div><div className="text-zinc-400">Joined {formatDate(u.joiningDate)}</div></div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
                  <th className="px-5 py-2.5 font-medium">Member</th>
                  <th className="px-5 py-2.5 font-medium">Role</th>
                  <th className="px-5 py-2.5 font-medium">Shift</th>
                  <th className="px-5 py-2.5 font-medium text-right">Salary</th>
                  <th className="px-5 py-2.5 font-medium">Joined</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{u.name}</div>
                          <div className="truncate text-xs text-zinc-500">{u.designation || u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge></td>
                    <td className="px-5 py-3 text-zinc-700">
                      <div className="tabular-nums">{time12(u.shiftStart)} – {time12(u.shiftEnd)}</div>
                      <div className="text-xs text-zinc-400">Full {u.fullDayHours ?? 8}h · Half {u.halfDayHours ?? 4}h</div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-zinc-700">{u.monthlySalary ? formatMoney(u.monthlySalary) : '—'}</td>
                    <td className="px-5 py-3 text-zinc-500">{formatDate(u.joiningDate)}</td>
                    <td className="px-5 py-3">
                      {u.isActive ? <Badge tone="green">Active</Badge> : <Badge>Disabled</Badge>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">{actions(u)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      <MemberFormModal open={formOpen} onClose={() => setFormOpen(false)} member={editing} onSaved={load} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title={`Delete ${deleting?.name}?`}
        message="They will be removed from the team and can no longer log in. Their past tasks, attendance, sales and salary records stay as they are." />
    </div>
  );
}
