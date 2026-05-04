import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Activity, Database, Zap, TrendingUp } from 'lucide-react';

const MetricBlock = ({ label, value, progress, color }) => (
  <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
    <div className="flex justify-between items-center mb-3">
      <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{label}</span>
      <span className={`text-xs font-mono ${color}`}>{value}</span>
    </div>
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        whileInView={{ width: `${progress}%` }}
        transition={{ duration: 1, delay: 0.5 }}
        className={`h-full ${color.replace('text-', 'bg-')}`}
      />
    </div>
  </div>
);

export function EngineVisualizer() {
  return (
    <div className="relative group">
      {/* Background Glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-blue to-brand-purple rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
      
      <div className="relative bg-[#0F0F0F] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={16} className="text-brand-blue animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-white/80">Real-time Analysis Engine</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 px-2 py-0.5 bg-brand-purple/10 border border-brand-purple/20 rounded text-[8px] font-bold text-brand-purple uppercase tracking-widest">
                <TrendingUp size={10} /> Optimal Path Active
             </div>
             <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-brand-blue animate-ping"></div>
             </div>
          </div>
        </div>

        {/* Grid Content */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Live Graph with Optimal Path Ghost */}
          <div className="space-y-6">
            <div className="h-32 bg-white/[0.02] border border-white/5 rounded-lg p-4 relative overflow-hidden">
               {/* Global Average Path (Ghost) */}
               <svg viewBox="0 0 200 100" className="absolute inset-0 w-full h-full stroke-brand-purple stroke-1 fill-none opacity-20">
                  <motion.path 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 3, repeat: Infinity }}
                    d="M 0 50 Q 50 40, 100 50 T 200 50" 
                  />
               </svg>
               {/* Current Execution Path */}
               <svg viewBox="0 0 200 100" className="w-full h-full stroke-brand-blue stroke-2 fill-none overflow-visible relative z-10">
                  <motion.path 
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "linear" }}
                    d="M 0 80 Q 20 20, 40 70 T 80 40 T 120 80 T 160 30 T 200 60" 
                  />
               </svg>
               <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F0F] via-transparent to-[#0F0F0F] pointer-events-none"></div>
               <div className="absolute top-2 left-3 flex items-center gap-4">
                  <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">CPU Latency Matrix</span>
                  <span className="text-[8px] font-mono text-brand-purple uppercase tracking-widest opacity-40">Top 1% Efficiency Baseline</span>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <MetricBlock label="Heap Size" value="12.4 MB" progress={45} color="text-brand-blue" />
               <MetricBlock label="Recursion" value="Level 14" progress={72} color="text-brand-purple" />
            </div>
          </div>

          {/* Right: Technical Stats */}
          <div className="flex flex-col justify-between py-1">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Database size={18} className="text-white/40 mt-1" />
                <div>
                  <p className="text-[11px] font-bold text-white uppercase tracking-wider mb-1">Neural Benchmarking</p>
                  <p className="text-[10px] text-white/40 font-sans leading-tight">Code is compared against 1.2M historical optimal solutions to detect logical drift.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Cpu size={18} className="text-white/40 mt-1" />
                <div>
                  <p className="text-[11px] font-bold text-white uppercase tracking-wider mb-1">Architecture Audit</p>
                  <p className="text-[10px] text-white/40 font-sans leading-tight">Validating thread-safety and resource disposal across multi-core execution nodes.</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <Zap size={12} className="text-brand-blue" />
                  <span className="text-[10px] font-mono text-white/60">Node: US-EAST-01 (ACTIVE)</span>
               </div>
               <span className="text-[10px] font-mono text-brand-blue">Benchmarking Live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
