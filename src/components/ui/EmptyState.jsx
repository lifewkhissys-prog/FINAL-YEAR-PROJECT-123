import { Inbox } from 'lucide-react';

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-default flex items-center justify-center mb-4">
        <Icon size={28} className="text-[var(--text-muted)]" />
      </div>
      <h3 className="text-[var(--text-primary)] font-semibold text-base mb-1">{title}</h3>
      <p className="text-[var(--text-secondary)] text-sm max-w-xs mb-6">{message}</p>
      {action}
    </div>
  );
}

