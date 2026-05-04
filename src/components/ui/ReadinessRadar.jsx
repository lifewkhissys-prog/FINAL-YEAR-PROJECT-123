import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Cpu, Code2, Zap, Layout } from 'lucide-react';

const DIMENSIONS = [
  { name: 'Algorithmic Efficiency', icon: Zap, value: 85 },
  { name: 'System Architecture', icon: Layout, value: 72 },
  { name: 'Clean Code Standards', icon: Code2, value: 94 },
  { name: 'Security Mindset', icon: Shield, value: 68 },
  { name: 'Resource Optimization', icon: Cpu, value: 88 },
];

export function ReadinessRadar() {
  const points = DIMENSIONS.map((d, i) => {
    const angle = (i * 2 * Math.PI) / DIMENSIONS.length - Math.PI / 2;
    const r = (d.value / 100) * 100;
    return `${120 + r * Math.cos(angle)},${120 + r * Math.sin(angle)}`;
  }).join(' ');

  const baselinePoints = DIMENSIONS.map((_, i) => {
    const angle = (i * 2 * Math.PI) / DIMENSIONS.length - Math.PI / 2;
    const r = 80; // FAANG average
    return `${120 + r * Math.cos(angle)},${120 + r * Math.sin(angle)}`;
  }).join(' ');

  return (
    <div className="bg-[#0F0F0F] border border-white/10 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-dot-grid opacity-10"></div>
      
      <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
        {/* Radar SVG */}
        <div className="relative w-64 h-64 flex items-center justify-center">
           <svg viewBox="0 0 240 240" className="w-full h-full">
              {/* Concentric Rings */}
              {[20, 40, 60, 80, 100].map(r => (
                <circle key={r} cx="120" cy="120" r={r} className="fill-none stroke-white/5 stroke-1" />
              ))}
              
              {/* Axis Lines */}
              {DIMENSIONS.map((_, i) => {
                const angle = (i * 2 * Math.PI) / DIMENSIONS.length - Math.PI / 2;
                return (
                  <line 
                    key={i} 
                    x1="120" y1="120" 
                    x2={120 + 100 * Math.cos(angle)} 
                    y2={120 + 100 * Math.sin(angle)} 
                    className="stroke-white/5 stroke-1" 
                  />
                );
              })}

              {/* FAANG Baseline (Ghost) */}
              <polygon points={baselinePoints} className="fill-brand-purple/5 stroke-brand-purple/30 stroke-1 stroke-dasharray-[4,4] animate-pulse" />
              
              {/* User Readiness Data */}
              <motion.polygon 
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                points={points} 
                className="fill-brand-blue/20 stroke-brand-blue stroke-2" 
              />
              
              {/* Data Points */}
              {DIMENSIONS.map((d, i) => {
                const angle = (i * 2 * Math.PI) / DIMENSIONS.length - Math.PI / 2;
                const r = (d.value / 100) * 100;
                return (
                  <motion.circle 
                    key={i}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    cx={120 + r * Math.cos(angle)} 
                    cy={120 + r * Math.sin(angle)} 
                    r="4" 
                    className="fill-brand-blue shadow-[0_0_10px_rgba(37,99,235,0.8)]" 
                  />
                );
              })}
           </svg>

           {/* Label Overlay */}
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.4em]">Industrial Audit</span>
           </div>
        </div>

        {/* Legend / Info */}
        <div className="flex-1 space-y-6">
           <div>
              <h4 className="text-xl font-serif text-white mb-2">Industry Readiness.</h4>
              <p className="text-xs text-white/40 leading-relaxed font-sans">
                Your technical fingerprint compared against FAANG engineering benchmarks. 
                You are currently performing in the <span className="text-brand-blue font-bold">top 4%</span> of system architects.
              </p>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DIMENSIONS.map((d, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/5">
                   <d.icon size={14} className="text-brand-blue" />
                   <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                         <span className="text-[9px] font-mono text-white/60 uppercase">{d.name}</span>
                         <span className="text-[9px] font-mono text-brand-blue">{d.value}%</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                         <motion.div initial={{ width: 0 }} whileInView={{ width: `${d.value}%` }} className="h-full bg-brand-blue" />
                      </div>
                   </div>
                </div>
              ))}
           </div>

           <div className="flex items-center gap-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-brand-blue"></div>
                 <span className="text-[8px] font-mono text-white/40 uppercase">Your Performance</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 border border-brand-purple/50 rounded-full"></div>
                 <span className="text-[8px] font-mono text-white/40 uppercase">FAANG Baseline</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
