import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { 
  LayoutDashboard, 
  Upload,
  BookOpenCheck,
  GraduationCap,
  X
} from 'lucide-react';
import DevLabLogo from '../ui/DevLabLogo';

export function Sidebar({ onClose }) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const thesisLinks = [
    { to: '/thesis/dashboard', icon: LayoutDashboard, label: 'Supervisor Dashboard' },
    { to: '/thesis/upload', icon: Upload, label: 'Upload Thesis' },
    { to: '/thesis/rubric', icon: BookOpenCheck, label: 'Rubric Criteria' },
  ];

  return (
    <aside className="w-64 max-w-[85vw] h-full border-r border-default bg-[var(--bg-primary)]/95 backdrop-blur-xl z-20 flex flex-col shadow-2xl">
      <div className="h-16 flex items-center justify-between px-6 border-b border-default shrink-0">
        <Link to="/" className="flex items-center gap-2 group hover:opacity-80 transition-opacity" onClick={onClose}>
          <DevLabLogo size="md" mono={false} />
        </Link>
        <button 
          onClick={onClose} 
          className="lg:hidden p-1 rounded hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title="Close Navigation"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
        <div className="px-3 mb-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Thesis Assessor
        </div>
        {thesisLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to || location.pathname.startsWith(link.to);
          
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} className={isActive ? 'text-brand-blue' : 'text-[var(--text-secondary)]'} />
              {link.label}
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-default shrink-0">
        <div className="glass-sm p-3 flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] border border-default flex items-center justify-center shrink-0">
             <GraduationCap size={20} className="text-brand-blue" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user?.name || 'Academic Supervisor'}</p>
            <p className="text-xs text-[var(--text-secondary)] capitalize truncate">{user?.role || 'Lecturer'}</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-[7px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity">
            Evidence-Based Thesis Assessor
          </p>
        </div>
      </div>
    </aside>
  );
}

