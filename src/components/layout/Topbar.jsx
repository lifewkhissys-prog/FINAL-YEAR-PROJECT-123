import { LogOut, Menu, Bell, BookOpen, Code2, LayoutDashboard, FolderClock, Clock, Library, FileText, GraduationCap, Users } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import DevLabLogo from '../ui/DevLabLogo';

export function Topbar({ onMenuClick }) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
    { to: '/lecturer/thesis-critique', icon: FileText, label: 'Thesis Critique' },
  ];

  const links = isLecturer ? lecturerLinks : studentLinks;

  return (
    <header className="h-16 border-b border-default bg-[var(--bg-primary)]/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 w-full shrink-0">
      <div className="flex items-center gap-6">
        {/* Mobile Menu Trigger */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden btn-icon"
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
          <DevLabLogo size="sm" mono={false} />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to || location.pathname.startsWith(link.to);
            
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border ${
                  isActive 
                    ? 'text-brand-blue bg-brand-blue/10 border-brand-blue/20' 
                    : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-white/5'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-brand-blue' : 'text-[var(--text-muted)]'} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right utilities & Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        <ThemeSwitcher />
        
        <button className="btn-icon relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-blue ring-2 ring-[var(--bg-primary)]"></span>
        </button>
        
        <div className="w-px h-6 bg-[var(--border)] mx-1 sm:mx-2"></div>

        {/* User Capsule */}
        {user && (
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-default">
            <div className="w-6 h-6 rounded-full bg-white/5 border border-default flex items-center justify-center shrink-0">
              {isLecturer ? <GraduationCap size={13} className="text-brand-blue" /> : <Users size={13} className="text-brand-blue" />}
            </div>
            <div className="text-left leading-none max-w-[120px] overflow-hidden">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{user.name}</p>
              <p className="text-[9px] text-[var(--text-muted)] capitalize truncate font-mono mt-0.5">{user.role}</p>
            </div>
          </div>
        )}
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-default bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
