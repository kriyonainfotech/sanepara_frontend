import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Crown, RotateCcw, ShieldCheck, Users, UserCog } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

const ROLES = [
  { key: 'admin', label: 'Admin', icon: UserCog },
  { key: 'team', label: 'Team', icon: Users },
];

const same = (a, b) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
const normalize = (p) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v.length).map(([k, v]) => [k, [...v].sort()]).sort());

function Switch({ checked, onChange, partial }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? (partial ? 'bg-zinc-500' : 'bg-zinc-900') : 'bg-zinc-200'
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function ActionChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
        active ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-500 ring-zinc-200 hover:text-zinc-900 hover:ring-zinc-300'
      }`}
    >
      {active && <Check className="h-3 w-3" />}
      {label}
    </button>
  );
}

export default function Permissions() {
  const [data, setData] = useState(null);
  const [role, setRole] = useState('team');
  const [draft, setDraft] = useState({ admin: {}, team: {} });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/permissions').then((r) => {
      setData(r.data);
      setDraft(r.data.roles);
    });
  }, []);

  const perms = draft[role];
  const dirty = data && !same(perms, data.roles[role]);
  const modules = useMemo(() => data?.catalog.flatMap((g) => g.modules) ?? [], [data]);
  const enabledCount = modules.filter((m) => perms[m.key]?.length).length;

  const setModule = (key, actions) => setDraft((d) => ({ ...d, [role]: { ...d[role], [key]: actions } }));

  // Other actions are meaningless without View, so they pull View in / out with them.
  const toggleAction = (m, action) => {
    const current = perms[m.key] || [];
    const hasView = m.actions.some((a) => a.key === 'view');
    if (current.includes(action)) {
      setModule(m.key, action === 'view' ? [] : current.filter((a) => a !== action));
    } else {
      const next = [...current, action];
      if (hasView && !next.includes('view')) next.push('view');
      setModule(m.key, next);
    }
  };

  const toggleModule = (m) =>
    setModule(m.key, perms[m.key]?.length ? [] : m.actions.map((a) => a.key));

  const setAll = (on) =>
    setDraft((d) => ({ ...d, [role]: on ? Object.fromEntries(modules.map((m) => [m.key, m.actions.map((a) => a.key)])) : {} }));

  const save = async () => {
    setSaving(true);
    try {
      const { data: res } = await api.put(`/permissions/${role}`, { permissions: perms });
      setData((d) => ({ ...d, roles: { ...d.roles, [role]: res.permissions } }));
      setDraft((d) => ({ ...d, [role]: res.permissions }));
      toast.success(`${role === 'admin' ? 'Admin' : 'Team'} permissions saved`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <Spinner />;

  return (
    <div className="pb-24">
      <PageHeader
        title="Roles & Permissions"
        description="Choose exactly what Admins and Team members can see and do. Changes apply to everyone in that role."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl bg-zinc-100 p-1">
          {ROLES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setRole(key)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                role === key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {!same(draft[key], data.roles[key]) && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-1 text-xs text-zinc-500">{enabledCount} of {modules.length} modules on</span>
          <Button variant="ghost" size="sm" onClick={() => setAll(true)}>Allow all</Button>
          <Button variant="ghost" size="sm" onClick={() => setAll(false)}>Clear all</Button>
          <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => setDraft((d) => ({ ...d, [role]: data.defaults[role] }))}>Defaults</Button>
        </div>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
        <Crown className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p>
          <span className="font-medium text-zinc-900">Super Admin always has full access.</span> Every member can always see their
          own tasks, attendance and incentive — the switches below control access to everyone else's data.
        </p>
      </div>

      <div className="space-y-6">
        {data.catalog.map((group) => (
          <div key={group.group}>
            <h2 className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">{group.group}</h2>
            <Card className="divide-y divide-zinc-100">
              {group.modules.map((m) => {
                const current = perms[m.key] || [];
                const on = current.length > 0;
                return (
                  <div key={m.key} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Switch checked={on} partial={on && current.length < m.actions.length} onChange={() => toggleModule(m)} />
                      <div className="min-w-0">
                        <div className={`text-sm font-medium ${on ? 'text-zinc-900' : 'text-zinc-500'}`}>{m.label}</div>
                        <div className="truncate text-xs text-zinc-400">{m.description}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-12 md:pl-0">
                      {m.actions.map((a) => (
                        <ActionChip key={a.key} label={a.label} active={current.includes(a.key)} onClick={() => toggleAction(m, a.key)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        ))}
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4 lg:pl-64">
          <div className="flex items-center gap-4 rounded-2xl bg-zinc-900 py-2.5 pl-5 pr-2.5 text-sm text-white shadow-2xl animate-pop-in">
            <ShieldCheck className="h-4 w-4 text-zinc-400" />
            <span>Unsaved changes for <b>{role === 'admin' ? 'Admin' : 'Team'}</b></span>
            <button onClick={() => setDraft((d) => ({ ...d, [role]: data.roles[role] }))} className="rounded-lg px-3 py-1.5 text-zinc-300 hover:bg-white/10 hover:text-white">
              Discard
            </button>
            <Button onClick={save} loading={saving} className="!bg-white !text-zinc-900 hover:!bg-zinc-100">Save changes</Button>
          </div>
        </div>
      )}
    </div>
  );
}
