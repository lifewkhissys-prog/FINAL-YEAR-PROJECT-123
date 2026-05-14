export function Badge({ variant = 'blue', children, className = '' }) {
  const variants = {
    blue:   'badge-blue',
    purple: 'badge-purple',
    green:  'badge-green',
    yellow: 'badge-yellow',
    red:    'badge-red',
    gray:   'badge-gray',
  };
  return (
    <span className={`${variants[variant] || 'badge-gray'} ${className}`}>
      {children}
    </span>
  );
}

export function LangBadge({ lang }) {
  const map = {
    python:  { variant: 'blue',   label: 'Python' },
    java:    { variant: 'yellow', label: 'Java' },
    cpp:     { variant: 'purple', label: 'C++' },
    sql:     { variant: 'green',  label: 'SQL' },
    html:    { variant: 'red',    label: 'HTML/CSS/JS' },
  };
  const cfg = map[lang?.toLowerCase()] || { variant: 'gray', label: lang };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export function TypeBadge({ type }) {
  return type === 'guided'
    ? <Badge variant="purple">Guided</Badge>
    : <Badge variant="blue">Challenge</Badge>;
}

export function StatusBadge({ status }) {
  const map = {
    completed: { variant: 'green',  label: 'Completed' },
    running:   { variant: 'yellow', label: 'Running' },
    pending:   { variant: 'gray',   label: 'Pending' },
    error:     { variant: 'red',    label: 'Error' },
    active:    { variant: 'green',  label: 'Active' },
    scheduled: { variant: 'yellow', label: 'Scheduled' },
    ended:     { variant: 'gray',   label: 'Ended' },
    accepted:  { variant: 'green',  label: 'Accepted' },
    wrong:     { variant: 'red',    label: 'Wrong Answer' },
  };
  const cfg = map[status] || { variant: 'gray', label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export function TechBadge({ children }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-default text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-widest mb-6 relative overflow-hidden group/badge">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/badge:animate-scan pointer-events-none"></div>
      <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse"></div>
      {children}
    </div>
  );
}
