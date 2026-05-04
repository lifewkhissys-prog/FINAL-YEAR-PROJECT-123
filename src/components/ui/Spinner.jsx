import { Loader2 } from 'lucide-react';

export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return (
    <Loader2 className={`animate-spin text-brand-blue ${sizes[size]} ${className}`} />
  );
}

export function FullPageSpinner({ message = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Spinner size="lg" />
      <p className="text-[var(--text-secondary)] text-sm">{message}</p>
    </div>
  );
}
