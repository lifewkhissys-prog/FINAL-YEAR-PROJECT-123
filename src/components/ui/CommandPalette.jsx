import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Command, 
  Search, 
  Terminal, 
  Sun, 
  Moon, 
  LayoutDashboard, 
  Settings, 
  Zap,
  Code2,
  Cpu,
  GraduationCap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const role = user?.role || 'student';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const actions = [
    { 
      id: 'dash', 
      name: 'Go to Dashboard', 
      icon: LayoutDashboard, 
      shortcut: '↵',
      action: () => navigate(role === 'lecturer' ? '/lecturer/dashboard' : '/student/dashboard') 
    },
    { 
      id: 'hacker-mode', 
      name: 'Toggle Hacker Mode', 
      icon: Cpu, 
      category: 'System', 
      action: () => {
        document.documentElement.classList.toggle('hacker-mode');
        document.body.classList.toggle('crt-overlay');
      } 
    },
    { 
      id: 'light', 
      name: 'Set Light Mode', 
      icon: Sun, 
      action: () => {
        const root = document.documentElement;
        root.classList.remove('theme-dark', 'theme-slate', 'theme-contrast', 'theme-knust');
        root.classList.add('theme-light');
      } 
    },
    { 
      id: 'dark', 
      name: 'Set Dark Mode', 
      icon: Moon, 
      action: () => {
        const root = document.documentElement;
        root.classList.remove('theme-light', 'theme-slate', 'theme-contrast', 'theme-knust');
        root.classList.add('theme-dark');
      } 
    },
    { 
      id: 'knust', 
      name: 'Set KNUST Mode', 
      icon: GraduationCap, 
      action: () => {
        const root = document.documentElement;
        root.classList.remove('theme-light', 'theme-dark', 'theme-slate', 'theme-contrast');
        root.classList.add('theme-knust');
      } 
    },
    { 
      id: 'assess', 
      name: 'Active Assessments', 
      icon: Zap, 
      action: () => navigate(role === 'lecturer' ? '/lecturer/assessments' : '/student/assessments/active') 
    },
    { 
      id: 'problems', 
      name: 'Browse Problems', 
      icon: Code2, 
      action: () => navigate(role === 'lecturer' ? '/lecturer/courses' : '/student/courses') 
    }
  ];

  const filteredActions = actions.filter(action => 
    action.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-[var(--bg-surface)] border border-default rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center px-4 py-3 border-b border-default bg-[var(--bg-primary)]/50">
              <Search className="w-5 h-5 text-[var(--text-muted)] mr-3" />
              <input
                autoFocus
                placeholder="Search commands, courses, or settings..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] text-sm font-sans placeholder:text-[var(--text-muted)]"
              />
              <div className="flex items-center gap-1.5 ml-4">
                <span className="px-1.5 py-0.5 rounded border border-default bg-[var(--bg-elevated)] text-[10px] font-mono text-[var(--text-muted)] uppercase">ESC</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
               <div className="px-2 py-1.5 mb-1">
                 <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">Protocol Commands</p>
               </div>
               
               {filteredActions.length > 0 ? (
                 filteredActions.map((action) => (
                   <button
                     key={action.id}
                     onClick={() => {
                       action.action();
                       setIsOpen(false);
                     }}
                     className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-brand-blue/10 hover:text-brand-blue group transition-all text-left"
                   >
                     <div className="flex items-center gap-3">
                       <div className="p-1.5 rounded-md bg-[var(--bg-elevated)] group-hover:bg-brand-blue/20 transition-colors">
                         <action.icon size={16} className="text-[var(--text-secondary)] group-hover:text-brand-blue" />
                       </div>
                       <span className="text-sm text-[var(--text-primary)] font-medium group-hover:text-brand-blue">{action.name}</span>
                     </div>
                     {action.shortcut && (
                       <span className="text-[10px] font-mono text-[var(--text-muted)] group-hover:text-brand-blue/60">{action.shortcut}</span>
                     )}
                   </button>
                 ))
               ) : (
                 <div className="py-12 flex flex-col items-center justify-center opacity-40">
                   <Cpu size={32} className="mb-3 animate-pulse" />
                   <p className="text-sm font-mono tracking-tight">No active nodes found matching your query.</p>
                 </div>
               )}
            </div>

            <div className="px-4 py-2 bg-[var(--bg-primary)]/50 border-t border-default flex items-center justify-between">
              <div className="flex gap-4">
                 <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--text-muted)]">
                   <span className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] border border-default text-[8px]">↑↓</span>
                   NAVIGATE
                 </div>
                 <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--text-muted)]">
                   <span className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] border border-default text-[8px]">ENTER</span>
                   EXECUTE
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <Command size={10} className="text-brand-blue" />
                 <span className="text-[8px] font-mono text-brand-blue uppercase tracking-widest font-bold">DevLab OS v1.0.4</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
