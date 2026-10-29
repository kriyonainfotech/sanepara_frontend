import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BookOpen, CheckCircle2, ChevronDown, Pencil, Plus, Scale, Search, Trash2, Users } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, ROLE_LABEL } from '../lib/format';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import Checkbox from '../components/ui/Checkbox';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field, Input, Textarea } from '../components/ui/Field';

// Wording and permission per kind; SOPs and Rules are managed on separate pages.
const KINDS = {
  SOP: {
    perm: 'sop', icon: BookOpen, one: 'SOP', many: 'SOPs',
    manageTitle: 'SOP Management', mineTitle: 'My SOP',
    manageDesc: 'Step-by-step procedures for every area of the business, assigned to members.',
    mineDesc: 'Procedures assigned to you. Read them and mark as understood.',
    contentLabel: 'Steps / procedure', placeholder: 'e.g. GSTR-3B filing steps', contentPlaceholder: '1. …\n2. …\n3. …',
  },
  Rule: {
    perm: 'rules', icon: Scale, one: 'Rule', many: 'Rules',
    manageTitle: 'Rule Management', mineTitle: 'My Rules',
    manageDesc: 'Office and work rules, assigned to members.',
    mineDesc: 'Rules that apply to you. Read them and mark as understood.',
    contentLabel: 'Rule', placeholder: 'e.g. Office timing', contentPlaceholder: 'Write the rule…',
  },
};

const EMPTY = { title: '', area: '', content: '', assignToAll: true, assignedTo: [], isActive: true };

function SopDialog({ open, sop, kind, areas, members, onClose, onSaved }) {
  const k = KINDS[kind];
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setF(sop ? { ...EMPTY, ...sop, assignedTo: sop.assignedTo.map((u) => u._id) } : EMPTY);
  }, [open, sop]);
  const set = (key) => (e) => setF({ ...f, [key]: e.target.value });
  const toggleMember = (id) => setF({ ...f, assignedTo: f.assignedTo.includes(id) ? f.assignedTo.filter((x) => x !== id) : [...f.assignedTo, id] });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.assignToAll && !f.assignedTo.length) return toast.error('Assign it to at least one member, or to everyone');
    setSaving(true);
    try {
      const { data } = sop ? await api.put(`/sops/${sop._id}`, f) : await api.post('/sops', { ...f, kind });
      toast.success(data.message);
      onSaved(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={sop ? `Edit ${k.one}` : `New ${k.one}`} footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="sop-form" loading={saving}>{sop ? 'Save' : 'Create'}</Button></>
    }>
      <form id="sop-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <Field label="Title" required><Input required autoFocus value={f.title} onChange={set('title')} placeholder={k.placeholder} /></Field>
          <Field label="Area">
            <Input list="sop-areas" value={f.area} onChange={set('area')} placeholder="e.g. GST, Office, Sales" />
            <datalist id="sop-areas">{areas.map((a) => <option key={a} value={a} />)}</datalist>
          </Field>
        </div>
        <Field label={k.contentLabel} required>
          <Textarea required rows={8} value={f.content} onChange={set('content')} placeholder={k.contentPlaceholder} />
        </Field>
        <div>
          <div className="mb-2 flex items-center gap-4 text-sm">
            <span className="text-xs font-medium text-zinc-600">Assign to</span>
            <label className="flex items-center gap-1.5"><input type="radio" checked={f.assignToAll} onChange={() => setF({ ...f, assignToAll: true })} className="accent-zinc-900" /> Everyone</label>
            <label className="flex items-center gap-1.5"><input type="radio" checked={!f.assignToAll} onChange={() => setF({ ...f, assignToAll: false })} className="accent-zinc-900" /> Selected members</label>
          </div>
          {!f.assignToAll && (
            <div className="grid max-h-48 gap-1 overflow-y-auto rounded-lg border border-zinc-200 p-2 sm:grid-cols-2">
              {members.map((m) => (
                <label key={m._id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50">
                  <Checkbox checked={f.assignedTo.includes(m._id)} onChange={() => toggleMember(m._id)} />
                  <span className="truncate">{m.name}</span><span className="text-xs text-zinc-400">{ROLE_LABEL[m.role]}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {sop && (
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} className="accent-zinc-900" /> Active (shown to assigned members)
          </label>
        )}
      </form>
    </Modal>
  );
}

// Management view: who has read it and who has not yet.
function ReadStatus({ sop, members }) {
  const readIds = new Set(sop.acknowledgements.map((a) => String(a.user?._id)));
  const assigned = sop.assignToAll ? members : sop.assignedTo;
  const pending = assigned.filter((u) => !readIds.has(String(u._id)));
  return (
    <div className="mt-4 grid gap-3 rounded-lg bg-zinc-50 p-3 text-xs sm:grid-cols-2">
      <div>
        <div className="mb-1 font-semibold text-emerald-700">Read ({sop.acknowledgements.length})</div>
        <div className="text-zinc-600">{sop.acknowledgements.map((a) => a.user?.name).filter(Boolean).join(', ') || '—'}</div>
      </div>
      <div>
        <div className="mb-1 font-semibold text-amber-700">Not read yet ({pending.length})</div>
        <div className="text-zinc-600">{pending.map((u) => u.name).join(', ') || '—'}</div>
      </div>
    </div>
  );
}

function SopCard({ sop, manage, members, onEdit, onDelete, onAck }) {
  const [open, setOpen] = useState(!manage && !sop.ackedByMe);
  const assignedCount = sop.assignToAll ? members.length : sop.assignedTo.length;
  return (
    <Card className={`overflow-hidden ${!sop.isActive ? 'opacity-60' : ''}`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-zinc-50/60">
        <span className="flex-1 font-medium">{sop.title}</span>
        {!sop.isActive && <Badge>Inactive</Badge>}
        {manage
          ? <Badge tone={assignedCount && sop.acknowledgements.length >= assignedCount ? 'green' : 'zinc'}>{sop.acknowledgements.length}{assignedCount ? `/${assignedCount}` : ''} read</Badge>
          : sop.ackedByMe && <Badge tone="green"><CheckCircle2 className="h-3 w-3" /> Read</Badge>}
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-zinc-100 px-5 py-4">
          <div className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">{sop.content}</div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {manage && <><Users className="h-3.5 w-3.5" />{sop.assignToAll ? 'Everyone' : sop.assignedTo.map((u) => u.name).join(', ')}<span className="text-zinc-300">·</span></>}
            Updated {formatDate(sop.updatedAt)}{sop.createdBy?.name ? ` · by ${sop.createdBy.name}` : ''}
          </div>
          {manage && <ReadStatus sop={sop} members={members} />}
          <div className="mt-4 flex flex-wrap gap-2">
            {!manage && !sop.ackedByMe && <Button size="sm" icon={CheckCircle2} onClick={onAck}>I have read & understood</Button>}
            {onEdit && <Button size="sm" variant="secondary" icon={Pencil} onClick={onEdit}>Edit</Button>}
            {onDelete && <Button size="sm" variant="ghost" icon={Trash2} onClick={onDelete} className="hover:!text-red-600">Delete</Button>}
          </div>
        </div>
      )}
    </Card>
  );
}

// kind = 'SOP' | 'Rule'; mode = 'manage' (SOP / Rule Management) | 'mine' (My SOP / My Rules).
export default function Sop({ kind = 'SOP', mode = 'mine' }) {
  const k = KINDS[kind];
  const manage = mode === 'manage';
  const { can } = useAuth();
  const canManage = manage && can(k.perm, 'manage');
  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => api.get('/sops', { params: { kind, mine: manage ? undefined : '1' } }).then((r) => setData(r.data)), [kind, manage]);
  useEffect(() => { setData(null); setTab('all'); setSearch(''); load(); }, [load]);
  // Members are needed to show who has not read yet; not everyone can list them.
  useEffect(() => {
    if (manage) api.get('/users', { params: { active: 'true' } }).then((r) => setMembers(r.data.users)).catch(() => setMembers([]));
  }, [manage]);

  const ack = async (sop) => {
    try {
      await api.post(`/sops/${sop._id}/ack`);
      toast.success('Marked as read');
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const remove = async () => {
    try {
      await api.delete(`/sops/${deleting._id}`);
      toast.success('Deleted');
      setDeleting(null); load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const all = data?.data || [];
  // Management can filter by active/inactive; My SOP / My Rules is one plain list.
  const tabs = manage
    ? [
        { key: 'all', label: 'All', count: all.length, test: () => true },
        { key: 'active', label: 'Active', count: all.filter((s) => s.isActive).length, test: (s) => s.isActive },
        { key: 'inactive', label: 'Inactive', test: (s) => !s.isActive },
      ]
    : null;
  const term = search.trim().toLowerCase();
  const shown = all.filter((s) =>
    (!tabs || tabs.find((t) => t.key === tab).test(s)) && (!term || `${s.title} ${s.area} ${s.content}`.toLowerCase().includes(term))
  );
  const areas = [...new Set(all.map((s) => s.area))].sort();
  const groups = [...new Set(shown.map((s) => s.area))].sort().map((a) => [a, shown.filter((s) => s.area === a)]);
  const newButton = canManage && <Button icon={Plus} onClick={() => setEditing(null)}>New {k.one}</Button>;

  return (
    <div>
      <PageHeader title={manage ? k.manageTitle : k.mineTitle} description={manage ? k.manageDesc : k.mineDesc} actions={newButton} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs && <Tabs value={tab} onChange={setTab} items={tabs.map(({ test, ...t }) => t)} />}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${k.many.toLowerCase()}…`} className="pl-9" />
        </div>
      </div>
      {!data ? <Spinner /> : shown.length === 0 ? (
        <Card><EmptyState icon={k.icon}
          title={all.length ? 'Nothing matches' : manage ? `No ${k.many} yet` : `No ${k.many} assigned to you`}
          message={manage ? (canManage ? `Write them down and assign them to the team.` : `${k.many} will show up here once they are added.`) : `${k.many} assigned to you will show up here.`}
          action={!all.length && newButton} /></Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([area, items]) => (
            <div key={area}>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">{area}</h2>
              <div className="space-y-2">
                {items.map((s) => (
                  <SopCard key={s._id} sop={s} manage={manage} members={members} onAck={() => ack(s)}
                    onEdit={canManage ? () => setEditing(s) : null} onDelete={canManage ? () => setDeleting(s) : null} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {canManage && <SopDialog open={editing !== undefined} sop={editing} kind={kind} areas={areas} members={members} onClose={() => setEditing(undefined)} onSaved={load} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Delete?" message={`"${deleting?.title}" will be deleted for everyone.`} />
    </div>
  );
}
