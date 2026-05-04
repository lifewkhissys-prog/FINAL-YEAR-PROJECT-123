import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ChevronUp, ChevronDown, Activity, Cpu, ShieldCheck } from 'lucide-react';
import { useKernelEvents } from '../../hooks/useKernelEvents';

export function KernelConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const { logs } = useKernelEvents();
  const logEndRef = useRef(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] px-4 md:px-8 pb-4 pointer-events-none">
      <motion.div
        initial={false}
        animate={{ y: isOpen ? 0 : 220 }}
        className="w-full max-w-7xl mx-auto bg-black/80 backdrop-blur-xl border border-white/5 rounded-t-xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col h-[280px]"
      >
        {/* Header / Toggle */}
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between px-4 py-2 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <Terminal size={14} className="text-brand-blue" />
                <span className="text-[10px] font-mono text-[var(--text-primary)] uppercase tracking-widest font-bold">System Kernel v1.0.4</span>
             </div>
             <div className="h-3 w-px bg-white/10 hidden sm:block"></div>
             <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                   <Activity size={10} className="text-emerald-400" />
                   <span className="text-[8px] font-mono text-emerald-400/60 uppercase">Node: Active</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <Cpu size={10} className="text-brand-blue" />
                   <span className="text-[8px] font-mono text-brand-blue/60 uppercase">CPU: 1.2%</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <ShieldCheck size={10} className="text-brand-purple" />
                   <span className="text-[8px] font-mono text-brand-purple/60 uppercase">Sec: Verified</span>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 px-2 py-0.5 rounded bg-brand-blue/10 border border-brand-blue/20">
                <span className="text-[8px] font-mono text-brand-blue uppercase font-bold animate-pulse tracking-tighter">Live Monitor</span>
             </div>
             {isOpen ? <ChevronDown size={14} className="text-white/40" /> : <ChevronUp size={14} className="text-white/40" />}
          </div>
        </div>

        {/* Log Content */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] leading-relaxed custom-scrollbar bg-black/40">
           <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-4 group">
                   <span className="text-white/20 shrink-0">[{log.time}]</span>
                   <span className="text-brand-blue/40 uppercase shrink-0 tracking-tighter">[LOG_EVENT]</span>
                   <span className={`
                     ${log.type === 'error' ? 'text-rose-400' : 
                       log.type === 'success' ? 'text-emerald-400' : 'text-white/60'}
                     group-hover:text-white transition-colors
                   `}>
                     {log.msg}
                   </span>
                </div>
              ))}
              <div ref={logEndRef} />
           </div>
        </div>

        {/* Footer Area */}
        <div className="px-4 py-1.5 border-t border-white/5 bg-black/60 flex items-center justify-between">
           <div className="flex gap-4">
              <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Protocol: 0x882A</span>
              <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Shard: North_Alpha</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[8px] font-mono text-emerald-500/60 uppercase font-bold tracking-tight">System Optimized</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
