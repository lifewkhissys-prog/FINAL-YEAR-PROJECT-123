import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { 
  BookOpen, 
  Code2, 
  LayoutDashboard, 
  FolderClock,
  Clock,
  GraduationCap,
  Users,
  Library,
  Trophy
} from 'lucide-react';
import DevLabLogo from '../ui/DevLabLogo';

export function Sidebar() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const isLecturer = user?.role === 'lecturer';

  const studentLinks = [
    { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/courses', icon: BookOpen, label: 'My Courses' },
    { to: '/student/assessments/active', icon: Clock, label: 'Active Assessments' },
    { to: '/student/submissions', icon: FolderClock, label: 'My Submissions' },
  ];

  const lecturerLinks = [
    { to: '/lecturer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/lecturer/courses', icon: BookOpen, label: 'My Courses' },
    { to: '/lecturer/problems', icon: Code2, label: 'Problem Bank' },
    { to: '/lecturer/assessments', icon: Library, label: 'Assessments' },
  ];

  const links = isLecturer ? lecturerLinks : studentLinks;

  return (
    <aside className="w-64 max-w-[85vw] h-full border-r border-default bg-[var(--bg-primary)]/80 backdrop-blur-xl z-20 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-default shrink-0">
        <Link to="/" className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
          <DevLabLogo size="md" mono={false} />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
        <div className="px-3 mb-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Menu
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to || location.pathname.startsWith(link.to);
          
          return (
            <Link
              key={link.to}
              to={link.to}
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
             {isLecturer ? <GraduationCap size={20} className="text-brand-blue" /> : <Users size={20} className="text-brand-blue" />}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-[var(--text-secondary)] capitalize truncate">{user?.role || 'Role'}</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-[7px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity">
            Maintained by ANKOMAH KELVIN & MAHFUZ ABGOR SEIDU
          </p>
        </div>
      </div>
    </aside>
  );
}
