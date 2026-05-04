import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { useState } from 'react';

export function Alert({ type = 'info', message, dismissible = false }) {
  const [visible, setVisible] = useState(true);
  if (!visible || !message) return null;

  const styles = {
    info:    { cls: 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue',   Icon: Info },
    success: { cls: 'bg-brand-green/10 border-brand-green/30 text-brand-green', Icon: CheckCircle },
    error:   { cls: 'bg-red-500/10 border-red-500/30 text-red-400',             Icon: AlertCircle },
    warning: { cls: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',    Icon: AlertCircle },
  };
  const { cls, Icon } = styles[type];

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border text-sm ${cls} animate-fade-in`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <p className="flex-1">{message}</p>
      {dismissible && (
        <button onClick={() => setVisible(false)} className="opacity-70 hover:opacity-100 transition-opacity">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
