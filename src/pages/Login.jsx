import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../lib/api';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      toast.error(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-zinc-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-base font-bold text-zinc-900">S</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-white">SANEPARA</div>
            <div className="text-[10px] font-medium tracking-[0.16em] text-zinc-400">AND COMPANY</div>
          </div>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Every client, filing and task — in one calm place.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Customers, GST filings, reminders, team work, collections and payroll for the whole office.
          </p>
        </div>
        <div className="relative text-xs text-zinc-500">© {new Date().getFullYear()} Sanepara and Company</div>
      </div>

      <div className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white">S</div>
            <div className="text-sm font-semibold">SANEPARA AND COMPANY</div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Sign in to continue to your workspace.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Email">
              <Input type="email" required autoFocus placeholder="you@sanepara.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10" />
            </Field>
            <Field label="Password">
              <Input type="password" required placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-10" />
            </Field>
            <Button type="submit" loading={loading} className="h-10 w-full justify-center">
              Sign in {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
