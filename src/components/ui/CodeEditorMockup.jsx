import React from 'react';
import { motion } from 'framer-motion';

export function CodeEditorMockup({ className = '' }) {
  const codeLines = [
    { num: 1, text: 'class DevLabCurriculum:', color: 'text-purple-400' },
    { num: 2, text: '    def __init__(self, university):', color: 'text-blue-400' },
    { num: 3, text: '        self.name = "Applied Data Science"', color: 'text-green-400' },
    { num: 4, text: '        self.is_aligned = True', color: 'text-orange-400' },
    { num: 5, text: '    ', color: '' },
    { num: 6, text: '    def get_assessments(self):', color: 'text-blue-400' },
    { num: 7, text: '        return [', color: 'text-[var(--text-secondary)]' },
    { num: 8, text: '            "Auto-graded Labs",', color: 'text-green-400' },
    { num: 9, text: '            "Real-time Feedback",', color: 'text-green-400' },
    { num: 10, text: '            "Plagiarism Detection"', color: 'text-green-400' },
    { num: 11, text: '        ]', color: 'text-[var(--text-secondary)]' },
  ];
  return (
    <div data-color-scheme="dark">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`relative rounded-lg border border-[var(--editor-border)] bg-[var(--editor-bg)] shadow-2xl overflow-hidden ${className}`}
      >
        {/* Editor Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--editor-header)] border-b border-[var(--editor-border)]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
          <span className="ml-4 text-xs font-mono text-[var(--text-muted)]">curriculum.py</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="px-2 py-0.5 rounded text-[10px] font-mono bg-brand-blue/20 text-brand-blue border border-brand-blue/30 uppercase tracking-widest">
             Live Sync
           </div>
        </div>
      </div>

      {/* Code Area */}
      <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto whitespace-nowrap bg-[#0B0E14]">
        {codeLines.map((line) => (
          <div key={line.num} className="flex group">
            <span className="w-10 text-[var(--text-muted)] text-right pr-4 select-none group-hover:text-[var(--text-secondary)] transition-colors">{line.num}</span>
            <span className={line.color}>{line.text}</span>
          </div>
        ))}
        
        {/* Cursor animation */}
        <motion.div 
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-2 h-5 bg-brand-blue ml-1 translate-y-1"
        ></motion.div>
      </div>

      {/* Editor Footer / Status Bar */}
      <div className="px-4 py-1.5 bg-dark-800 border-t border-default flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>Python 3.12</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-brand-blue">● Ln 12, Col 24</span>
          <span>Spaces: 4</span>
        </div>
      </div>

      {/* Decorative Blueprint Lines (Subtle) */}
      <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none opacity-20">
         <div className="absolute top-0 right-0 w-full h-px bg-brand-blue"></div>
         <div className="absolute top-0 right-0 h-full w-px bg-brand-blue"></div>
         <div className="absolute top-4 right-4 w-4 h-4 border border-brand-blue rounded-full"></div>
      </div>
    </motion.div>
    </div>
  );
}
