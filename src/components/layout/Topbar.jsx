import { LogOut, Menu, Bell, Terminal, Volume2 } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import { useState, useEffect } from 'react';

export function Topbar({ onMenuClick }) {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [isHackerMode, setIsHackerMode] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(false);

  const toggleHackerMode = () => {
    setIsHackerMode(!isHackerMode);
    document.body.classList.toggle('hacker-mode');
    document.body.classList.toggle('crt-overlay');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-default bg-[var(--bg-primary)]/80 backdrop-blur-xl sticky top-0 z-10 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden btn-icon"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsAudioActive(!isAudioActive)}
          className={`btn-icon transition-all ${isAudioActive ? 'text-brand-blue scale-110' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          title="Toggle Adaptive Soundscape (Flow State)"
        >
          <Volume2 size={18} />
        </button>

        <button 
          onClick={toggleHackerMode}
          className={`btn-icon transition-all ${isHackerMode ? 'text-brand-blue scale-110' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          title="Toggle Hacker Mode (CRT)"
        >
          <Terminal size={18} />
        </button>

        <ThemeSwitcher />
        
        <button className="btn-icon relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-blue ring-2 ring-[var(--bg-primary)]"></span>
        </button>
        
        <div className="w-px h-6 bg-[var(--border)] mx-2"></div>
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
