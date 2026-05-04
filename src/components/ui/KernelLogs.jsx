import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';

const LOG_MESSAGES = [
  "INITIALIZING KERNEL v1.0.4...",
  "ALLOCATING GRADING NODE: US-WEST-02",
  "GARBAGE COLLECTION COMPLETE: 120ms",
  "NEURAL LINK ESTABLISHED: GLOBAL_GRID_7",
  "ENCRYPTING SESSION HANDSHAKE...",
  "THROTTLING CPU CYCLES: PROTECTIVE_MODE",
  "ISOLATING HEAP: SANDBOX_A84",
  "SYNCHRONIZING ARCHITECTURE AUDIT...",
  "DETECTING LOGIC DRIFT: 0.002%",
];

export function KernelLogs() {
  const [logs, setLogs] = useState([LOG_MESSAGES[0]]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(prev => {
        const next = [...prev, LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)]];
        if (next.length > 5) return next.slice(1);
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/40 backdrop-blur-md border border-white/5 p-4 rounded-lg font-mono text-[9px] w-full max-w-md shadow-2xl">
      <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
         <Terminal size={12} className="text-brand-blue" />
         <span className="text-white/40 uppercase tracking-widest">System Kernel Logs</span>
      </div>
      <div className="space-y-1">
         <AnimatePresence mode="popLayout">
            {logs.map((log, i) => (
              <motion.div
                key={log + i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-3"
              >
                 <span className="text-brand-blue/40">[{new Date().toLocaleTimeString()}]</span>
                 <span className="text-white/60">{log}</span>
              </motion.div>
            ))}
         </AnimatePresence>
      </div>
    </div>
  );
}
