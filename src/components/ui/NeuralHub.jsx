import React from 'react';
import { motion } from 'framer-motion';

const SKILLS = [
  { name: 'Python Core', x: 150, y: 100, progress: 0.9 },
  { name: 'Data Analytics', x: 300, y: 150, progress: 0.7 },
  { name: 'Neural Nets', x: 200, y: 300, progress: 0.4 },
  { name: 'System Arch', x: 450, y: 250, progress: 0.6 },
  { name: 'Logic Gates', x: 350, y: 350, progress: 0.8 },
];

const CONNECTIONS = [
  [0, 1], [1, 3], [3, 4], [4, 2], [2, 0], [1, 4]
];

export function NeuralHub() {
  return (
    <div className="relative w-full h-[500px] bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden group">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20" 
           style={{ backgroundImage: 'radial-gradient(circle, #2563EB 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <svg className="absolute inset-0 w-full h-full">
        {/* Connections */}
        {CONNECTIONS.map(([from, to], i) => {
          const start = SKILLS[from];
          const end = SKILLS[to];
          return (
            <motion.line
              key={i}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="rgba(37, 99, 235, 0.2)"
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, delay: i * 0.2 }}
            />
          );
        })}

        {/* Pulsing Data Packets */}
        {CONNECTIONS.map(([from, to], i) => {
          const start = SKILLS[from];
          const end = SKILLS[to];
          return (
            <motion.circle
              key={`p-${i}`}
              r="2"
              fill="#2563EB"
              initial={{ offset: 0 }}
              animate={{ 
                cx: [start.x, end.x],
                cy: [start.y, end.y],
                opacity: [0, 1, 0]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                delay: i * 0.5,
                ease: "linear"
              }}
            />
          );
        })}
      </svg>

      {/* Skill Nodes */}
      {SKILLS.map((skill, i) => (
        <motion.div
          key={i}
          style={{ left: skill.x, top: skill.y }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: i * 0.1 }}
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
        >
          <div className="relative">
            {/* Outer Ring */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 10 + i * 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full border border-brand-blue/30 border-dashed"
            />
            {/* Core Node */}
            <div className="absolute inset-0 m-auto w-4 h-4 rounded-full bg-brand-blue shadow-[0_0_15px_#2563EB] z-10" />
            
            {/* Progress Ring */}
            <svg className="absolute inset-0 w-12 h-12 -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="22"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="2"
              />
              <motion.circle
                cx="24"
                cy="24"
                r="22"
                fill="none"
                stroke="#2563EB"
                strokeWidth="2"
                strokeDasharray="138"
                initial={{ strokeDashoffset: 138 }}
                animate={{ strokeDashoffset: 138 - (138 * skill.progress) }}
                transition={{ duration: 1.5, delay: 1 }}
              />
            </svg>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono text-white/60 uppercase tracking-tighter">{skill.name}</span>
            <span className="text-[9px] font-mono text-brand-blue">{(skill.progress * 100).toFixed(0)}%</span>
          </div>
        </motion.div>
      ))}

      {/* Header */}
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <div className="w-1 h-8 bg-brand-blue rounded-full" />
        <div>
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-[0.3em]">Neural Topology</h3>
          <p className="text-[10px] text-white/40 font-mono italic">Real-time skill adjacency mapping active...</p>
        </div>
      </div>
    </div>
  );
}
