import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-purple mb-4">404</h1>
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Page not found</h2>
      <p className="text-[var(--text-secondary)] mb-8 max-w-sm mx-auto">
        We couldn't find the page you're looking for. It might have been moved or deleted.
      </p>
      <Link to="/dashboard" className="btn-primary">
        <Home size={18} />
        Back to Dashboard
      </Link>
    </div>
  );
}
