import { Sparkles } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';

export default function ComingSoon({ item }) {
  const Icon = item.icon;
  return (
    <div>
      <PageHeader title={item.label} />
      <Card className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="relative mb-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600">
            <Icon className="h-6 w-6" />
          </div>
          <Sparkles className="absolute -right-2 -top-2 h-4 w-4 text-brand-500" />
        </div>
        <h2 className="text-base font-semibold">This module is on the way</h2>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">{item.label} will be available here soon.</p>
      </Card>
    </div>
  );
}
