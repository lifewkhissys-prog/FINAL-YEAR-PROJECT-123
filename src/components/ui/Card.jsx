export function Card({ children, className = '', hover = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`glass p-5 transition-all duration-200
        ${hover ? 'hover:border-brand-blue/30 hover:shadow-blue cursor-pointer hover:-translate-y-0.5' : ''}
        ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={`font-semibold text-[var(--text-primary)] text-base ${className}`}>{children}</h3>;
}

export function CardMeta({ children, className = '' }) {
  return <p className={`text-sm text-[var(--text-secondary)] mt-1 ${className}`}>{children}</p>;
}
