import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Cpu, Sparkles, X, ChevronRight, Brain } from 'lucide-react';

const DIAGNOSTICS = [
  "Analyzing memory allocation...",
  "Standardizing variable nomenclature...",
  "O(n²) complexity detected in loop block #14",
  "Neural weights synchronized with Global Grid",
  "Architecture Audit: Factory Pattern confirmed",
  "Sub-millisecond latency achieved on local node",
];

export function NeuralCore() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDiagnostic, setCurrentDiagnostic] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDiagnostic((prev) => (prev + 1) % DIAGNOSTICS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-brand-blue rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.6)] group relative"
          >
            <div className="absolute inset-0 rounded-full animate-ping bg-brand-blue/40"></div>
            <Bot className="text-white group-hover:scale-110 transition-transform" />
          </motion.button>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-80 bg-[#0F0F0F] border border-brand-blue/30 rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-brand-blue/10 px-4 py-3 flex items-center justify-between border-b border-brand-blue/20">
              <div className="flex items-center gap-2">
                 <Sparkles size={14} className="text-brand-blue" />
                 <span className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">Neural Core AI</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white transition-colors">
                 <X size={14} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-6">
               <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0">
                     <Brain className="text-brand-blue animate-pulse" />
                  </div>
                  <div>
                     <p className="text-xs text-white/80 leading-relaxed font-sans">
                       "I'm monitoring your current session. Architecture looks solid, but I've noted some minor heap inefficiencies."
                     </p>
                  </div>
               </div>

               {/* Live Diagnostics */}
               <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                     <Cpu size={12} className="text-brand-blue" />
                     <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">System Diagnostics</span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={currentDiagnostic}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      className="text-[10px] font-mono text-brand-blue/80 italic"
                    >
                      {DIAGNOSTICS[currentDiagnostic]}
                    </motion.p>
                  </AnimatePresence>
               </div>

               {/* Action */}
               <button className="w-full py-2 bg-brand-blue/20 border border-brand-blue/30 rounded-lg text-[10px] font-mono text-brand-blue uppercase font-bold tracking-widest hover:bg-brand-blue/30 transition-all flex items-center justify-center gap-2">
                  Request Architecture Audit
                  <ChevronRight size={12} />
               </button>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse"></div>
                  <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Neural Link: Active</span>
               </div>
               <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">v1.0.4</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
