import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MOCK_LOGS = [
  "INITIALIZING PROTOCOL...",
  "CONNECTING TO NODE US-EAST-01",
  "SYNCING CURRICULUM DATA",
  "ESTABLISHING ENCRYPTED CHANNEL",
  "READY FOR ASSESSMENT",
  "SCANNING FOR PLAGIARISM",
  "UPDATING STUDENT METRICS",
  "NODE STATUS: OPTIMAL",
  "PROTOCOL v1.0.4 ACTIVE",
];

export function SystemStatusLog() {
  const [logs, setLogs] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(prev => {
        const newLogs = [...prev, MOCK_LOGS[index]];
        if (newLogs.length > 3) newLogs.shift();
        return newLogs;
      });
      setIndex(prev => (prev + 1) % MOCK_LOGS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [index]);

  return (
    <div className="fixed bottom-6 left-6 z-40 hidden md:block w-64 pointer-events-none">
      <div className="bg-[var(--bg-surface)]/80 backdrop-blur border border-[var(--border)] p-3 rounded shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></div>
          <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest">Live System Logs</span>
        </div>
        <div className="space-y-1 overflow-hidden h-12">
          <AnimatePresence mode="popLayout">
            {logs.map((log, i) => (
              <motion.div
                key={log + i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="text-[10px] font-mono text-[var(--text-secondary)] whitespace-nowrap overflow-hidden text-ellipsis"
              >
                <span className="text-brand-blue mr-1">&gt;</span> {log}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
