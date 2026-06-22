import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, Activity, ChevronDown, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const themes = [
  { id: 'dark', name: 'Dark Mode', icon: Moon, class: 'theme-dark' },
  { id: 'light', name: 'Light Mode', icon: Sun, class: 'theme-light' },
  { id: 'slate', name: 'Modern Slate', icon: Monitor, class: 'theme-slate' },
  { id: 'contrast', name: 'High Contrast', icon: Activity, class: 'theme-contrast' },
  { id: 'knust', name: 'KNUST Mode', icon: GraduationCap, class: 'theme-knust' },
];

export function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('devlab-theme') || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove all theme classes
    themes.forEach(t => root.classList.remove(t.class));
    
    // Add selected theme class
    const selectedTheme = themes.find(t => t.id === currentTheme);
    if (selectedTheme) {
      root.classList.add(selectedTheme.class);
    }
    
    localStorage.setItem('devlab-theme', currentTheme);
  }, [currentTheme]);

  const SelectedIcon = themes.find(t => t.id === currentTheme)?.icon || Moon;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-default bg-[var(--bg-surface)] hover:bg-accent-muted transition-colors"
      >
        <SelectedIcon size={16} className="text-brand-blue" />
        <span className="text-[10px] font-mono uppercase tracking-widest hidden md:block">{currentTheme}</span>
        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            ></div>
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-48 z-50 bg-[var(--bg-surface)] border border-default rounded-lg shadow-2xl overflow-hidden"
            >
              <div className="p-1">
                {themes.map((theme) => {
                  const Icon = theme.icon;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setCurrentTheme(theme.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-mono uppercase tracking-wider rounded transition-colors ${
                        currentTheme === theme.id 
                          ? 'bg-brand-blue text-white' 
                          : 'text-[var(--text-secondary)] hover:bg-accent-muted hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Icon size={14} />
                      {theme.name}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
