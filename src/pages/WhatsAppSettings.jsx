import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Checkbox from '../components/ui/Checkbox';
import { Field, Input, Select } from '../components/ui/Field';

export default function WhatsAppSettings() {
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  useEffect(() => { api.get('/settings/whatsapp').then((r) => setF(r.data.data)); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // Picking a known provider fills in how it expects the request.
  const pickProvider = (e) => {
    const provider = e.target.value;
    setF({ ...f, provider, ...(f.presets[provider] || {}) });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/settings/whatsapp', f);
      setF(data.data);
      toast.success(data.message);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const { data } = await api.post('/settings/whatsapp/test', { phone: testPhone });
      toast.success(data.message);
    } catch (err) {
      toast.error(errorMessage(err), { duration: 8000 });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <PageHeader title="WhatsApp API" description="Provider used to send Monthly Reminders. Change the endpoint or key here if the provider changes them." />
      {!f ? <Spinner /> : (
        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <form onSubmit={submit}>
            <Card className="grid gap-4 p-6 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium sm:col-span-2">
                <Checkbox checked={f.enabled} onChange={(v) => setF({ ...f, enabled: v })} />
                Send reminders through the WhatsApp API
                <Badge tone={f.enabled && f.hasKey ? 'green' : 'zinc'}>{f.enabled && f.hasKey ? 'Connected' : 'Off — wa.me links'}</Badge>
              </label>
              <Field label="Provider">
                <Select value={f.provider} onChange={pickProvider}>
                  <option value="instantbroadcast">InstantBroadcast</option>
                  <option value="meta">WhatsApp Cloud API (Meta)</option>
                  <option value="custom">Other provider</option>
                </Select>
              </Field>
              <div />
              <Field label="Endpoint URL" required className="sm:col-span-2" hint={f.provider === 'meta' ? 'Replace PHONE_NUMBER_ID with your number ID from Meta' : 'The send-message URL from the provider'}>
                <Input value={f.endpoint} onChange={set('endpoint')} placeholder="https://..." />
              </Field>
              <Field label="API key / token" required className="sm:col-span-2" hint={f.hasKey ? `Saved key ${f.apiKeyMasked} — leave blank to keep it` : 'Not set yet'}>
                <Input type="password" autoComplete="off" value={f.apiKey} onChange={set('apiKey')} placeholder={f.hasKey ? 'Enter a new key to replace' : 'Paste the key'} />
              </Field>
              <Field label="Send key as">
                <Select value={f.authType} onChange={set('authType')}>
                  <option value="query">URL parameter (?token=...)</option>
                  <option value="bearer">Authorization: Bearer header</option>
                </Select>
              </Field>
              {f.authType === 'query' ? (
                <Field label="URL parameter name"><Input value={f.authParam} onChange={set('authParam')} placeholder="token" /></Field>
              ) : <div />}
              <Field label="Wrap message in key" hint="InstantBroadcast: messageObject · Meta: leave blank">
                <Input value={f.wrapKey} onChange={set('wrapKey')} placeholder="(none)" />
              </Field>
              <div />
              <Field label="Approved template name" hint="Needed for customers who haven't messaged you in 24 hours. Blank = plain text">
                <Input value={f.templateName} onChange={set('templateName')} placeholder="e.g. gst_bill_reminder" />
              </Field>
              <Field label="Template language" hint="e.g. en, en_US, hi, gu">
                <Input value={f.templateLang} onChange={set('templateLang')} />
              </Field>
              <p className="text-xs text-zinc-500 sm:col-span-2">Template variables: {'{{1}}'} customer name · {'{{2}}'} pending bills · {'{{3}}'} bill month</p>
              <div className="sm:col-span-2"><Button type="submit" loading={saving}>Save</Button></div>
            </Card>
          </form>
          <Card className="h-fit p-6">
            <div className="text-sm font-medium">Send a test message</div>
            <p className="mt-1 text-xs text-zinc-500">Uses the saved settings — save first after a change.</p>
            <div className="mt-4 grid gap-3">
              <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="Mobile number" inputMode="tel" />
              <Button type="button" icon={Send} loading={testing} disabled={!testPhone.trim()} onClick={test}>Send test</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
