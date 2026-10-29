import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, FileText, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { formatDate } from '../lib/format';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field, Input } from '../components/ui/Field';

export default function ChecklistTemplates() {
  const [templates, setTemplates] = useState(null);
  const [editing, setEditing] = useState(undefined);
  const [title, setTitle] = useState('');
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => api.get('/checklist-templates').then((r) => setTemplates(r.data.data));
  useEffect(() => { load(); }, []);

  const open = (t = null) => {
    setEditing(t);
    setTitle(t?.title || '');
    setItems(t ? [...t.items] : []);
    setNewItem('');
  };
  const addItem = () => { if (newItem.trim()) { setItems([...items, newItem.trim()]); setNewItem(''); } };

  const submit = async () => {
    setSaving(true);
    try {
      if (editing) await api.put(`/checklist-templates/${editing._id}`, { title, items });
      else await api.post('/checklist-templates', { title, items });
      toast.success(editing ? 'Template updated' : 'Template created');
      setEditing(undefined);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/checklist-templates/${deleting._id}`);
      toast.success('Template deleted');
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader title="Checklist Templates" description="QC checklists for tasks — a task can't be marked Done until every item is ticked." actions={<Button icon={Plus} onClick={() => open()}>Add Template</Button>} />
      {!templates ? (
        <Spinner />
      ) : templates.length === 0 ? (
        <Card><EmptyState icon={FileText} title="No templates found" message="Get started by creating a checklist, e.g. 'GST filing QC'." action={<Button icon={Plus} onClick={() => open()}>Add Template</Button>} /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <Card key={t._id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white"><FileText className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{t.title}</h3>
                    <span className="text-xs text-zinc-500">Created {formatDate(t.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="icon" onClick={() => open(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleting(t)} className="hover:!text-red-600"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="mt-4 border-t border-zinc-100 pt-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Items ({t.items.length})</h4>
                <ul className="space-y-1.5">
                  {t.items.slice(0, 4).map((it, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" /><span className="line-clamp-1">{it}</span></li>
                  ))}
                  {t.items.length > 4 && <li className="text-xs italic text-zinc-400">+ {t.items.length - 4} more item(s)</li>}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit Template' : 'Add New Template'} footer={
        <><Button variant="secondary" onClick={() => setEditing(undefined)}>Cancel</Button><Button onClick={submit} loading={saving} disabled={!title.trim()}>{editing ? 'Update' : 'Create'}</Button></>
      }>
        <div className="space-y-4">
          <Field label="Template Title" required><Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. GST Filing QC" /></Field>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-zinc-600">Checklist Items</span>
            <div className="flex gap-2">
              <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} placeholder="Add a new item..." />
              <Button type="button" variant="secondary" onClick={addItem}>Add</Button>
            </div>
            <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto">
              {items.length === 0 ? (
                <p className="rounded-md border border-dashed border-zinc-200 bg-zinc-50 py-4 text-center text-sm italic text-zinc-400">No items added yet</p>
              ) : items.map((it, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5">
                  <span className="text-sm text-zinc-700">{it}</span>
                  <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Delete template?" message={`"${deleting?.title}" will be removed. Existing tasks keep their checklist.`} />
    </div>
  );
}
