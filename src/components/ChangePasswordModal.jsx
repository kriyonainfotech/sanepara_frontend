import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Field, Input } from './ui/Field';
import { api, errorMessage } from '../lib/api';

export default function ChangePasswordModal({ open, onClose }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/auth/change-password', form);
      toast.success('Password updated');
      setForm({ currentPassword: '', newPassword: '' });
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
      title="Change password"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="pw-form" loading={saving}>Update</Button>
        </>
      }
    >
      <form id="pw-form" onSubmit={submit} className="space-y-4">
        <Field label="Current password" required>
          <Input type="password" required value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
        </Field>
        <Field label="New password" hint="At least 6 characters" required>
          <Input type="password" required minLength={6} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
        </Field>
      </form>
    </Modal>
  );
}
