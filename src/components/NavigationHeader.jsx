import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function NavigationHeader() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', path: '/thesis/dashboard', icon: 'dashboard' },
    { name: 'New Upload', path: '/thesis/upload', icon: 'upload_file' },
    { name: 'Rubric Editor', path: '/thesis/rubric', icon: 'edit_note' },
  ];

  return (
    <header className="bg-white border-b border-surface-container-high flex flex-col md:flex-row justify-between items-center w-full px-4 md:px-12 py-3 md:py-0 md:h-16 z-50 shadow-sm relative">
      <div className="flex items-center justify-between w-full md:w-auto">
        <Link to="/thesis/dashboard" className="font-serif text-2xl font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-28" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified_user
          </span>
          <span>Thesis Assessor</span>
        </Link>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-primary focus:outline-none"
        >
          <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex gap-2 h-full items-center">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`h-full flex items-center gap-2 px-4 font-semibold transition-colors text-xs ${
                isActive
                  ? 'text-primary border-b-2 border-primary bg-surface-container-lowest font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0" }}>
                {link.icon}
              </span>
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <nav className="md:hidden flex flex-col w-full bg-white border-t border-surface-container-high py-2 mt-2 space-y-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2 text-sm font-semibold rounded-lg ${
                  isActive ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{link.icon}</span>
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Profile & Controls */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-3 pl-3 border-l border-surface-container-high">
          <div className="w-9 h-9 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs shadow-sm">
            KNUST
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-primary">Dr. Academic Supervisor</p>
            <p className="text-[10px] text-on-surface-variant font-medium">Department of Computer Engineering</p>
          </div>
        </div>
      </div>
    </header>
  );
}
