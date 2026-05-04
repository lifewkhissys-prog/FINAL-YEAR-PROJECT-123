import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Globe, Activity } from 'lucide-react';

const TICKER_ITEMS = [
  { id: 1, user: "K. ANKOMAH", action: "PROTOCOL VALIDATED", node: "US-EAST", score: "99.8%" },
  { id: 2, user: "M. SEIDU", action: "OPTIMAL PATH FOUND", node: "EU-WEST", score: "100ms" },
  { id: 3, user: "S. CHEN", action: "MATRIX SYNCHRONIZED", node: "AS-SOUTH", score: "A+" },
  { id: 4, user: "A. PETROV", action: "HEAP ISOLATED", node: "RU-CENTRAL", score: "12.4MB" },
  { id: 5, user: "J. DOE", action: "RECURSION OPTIMIZED", node: "AU-EAST", score: "Lvl 14" },
];

export function GlobalTicker() {
  return (
    <div className="w-full bg-brand-blue/10 border-b border-brand-blue/20 h-8 flex items-center overflow-hidden relative z-[60]">
      <div className="absolute left-0 top-0 bottom-0 bg-brand-blue px-4 flex items-center gap-2 z-10 shadow-[5px_0_15px_rgba(37,99,235,0.3)]">
         <Globe size={12} className="text-white animate-spin-slow" />
         <span className="text-[9px] font-mono font-bold text-white uppercase tracking-[0.2em] whitespace-nowrap">Live Grid Activity</span>
      </div>
      
      <motion.div 
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="flex items-center gap-12 pl-48 whitespace-nowrap"
      >
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
          <div key={`${item.id}-${idx}`} className="flex items-center gap-3">
             <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{item.user}</span>
             <span className="text-[10px] font-mono text-brand-blue font-bold uppercase tracking-widest">{item.action}</span>
             <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-mono text-white/60">
                <Zap size={10} className="text-brand-blue" />
                {item.score}
             </div>
             <span className="text-[10px] font-mono text-white/20">@ {item.node}</span>
             <div className="w-1 h-1 rounded-full bg-white/10 mx-2"></div>
          </div>
        ))}
      </motion.div>

      <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-brand-blue/20 to-transparent w-20 pointer-events-none"></div>
    </div>
  );
}
