import { forwardRef } from 'react';

export const Input = forwardRef(({ label, id, error, className = '', ...props }, ref) => (
  <div className="w-full">
    {label && <label htmlFor={id} className="label">{label}</label>}
    <input
      id={id}
      ref={ref}
      className={`input ${error ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : ''} ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
  </div>
));

Input.displayName = 'Input';

export const Textarea = forwardRef(({ label, id, error, className = '', rows = 4, ...props }, ref) => (
  <div className="w-full">
    {label && <label htmlFor={id} className="label">{label}</label>}
    <textarea
      id={id}
      ref={ref}
      rows={rows}
      className={`input resize-none ${error ? 'border-red-500/60' : ''} ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
  </div>
));

Textarea.displayName = 'Textarea';

export function Select({ label, id, options = [], error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="label">{label}</label>}
      <select
        id={id}
        className={`input appearance-none ${error ? 'border-red-500/60' : ''} ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-dark-800">{o.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
