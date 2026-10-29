import { Loader2 } from 'lucide-react';

export default function Spinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center py-16 text-zinc-400 ${className}`}>
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}
