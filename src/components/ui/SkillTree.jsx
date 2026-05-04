import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Shield, Cpu, Code2, Network, Zap } from 'lucide-react';

const SkillNode = ({ icon: Icon, title, level, x, y, active = false }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.8 }}
    whileInView={{ opacity: 1, scale: 1 }}
    className="absolute flex flex-col items-center"
    style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
  >
    <div className={`relative w-16 h-16 rounded-xl flex items-center justify-center border-2 transition-all duration-500 group cursor-pointer ${active ? 'bg-brand-blue/20 border-brand-blue shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-white/5 border-white/10 hover:border-white/30'}`}>
       <Icon className={`w-8 h-8 ${active ? 'text-brand-blue' : 'text-white/20'}`} />
       
       {/* Pulse Effect for Active Nodes */}
       {active && <div className="absolute inset-0 rounded-xl animate-ping bg-brand-blue/20"></div>}
       
       {/* Label */}
       <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'text-white' : 'text-white/40'}`}>{title}</p>
          <p className="text-[8px] font-mono text-brand-blue/60 uppercase">{level}</p>
       </div>
    </div>
  </motion.div>
);

const Path = ({ startX, startY, endX, endY, active = false }) => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none">
    <motion.path
      initial={{ pathLength: 0 }}
      whileInView={{ pathLength: 1 }}
      d={`M ${startX}% ${startY}% Q ${(startX + endX) / 2}% ${startY}% ${endX}% ${endY}%`}
      stroke={active ? "var(--accent)" : "rgba(255,255,255,0.05)"}
      strokeWidth={active ? "2" : "1"}
      fill="none"
      transition={{ duration: 1.5, ease: "easeInOut" }}
    />
  </svg>
);

export function SkillTree() {
  return (
    <div className="relative w-full aspect-[16/9] bg-[#050505] border border-white/5 rounded-3xl overflow-hidden p-20 shadow-2xl">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-dot-grid opacity-10"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-blue/5 blur-[120px] rounded-full"></div>
      
      {/* Paths Container */}
      <div className="absolute inset-0">
         <Path startX={15} startY={50} endX={35} endY={30} active={true} />
         <Path startX={15} startY={50} endX={35} endY={70} active={true} />
         <Path startX={35} startY={30} endX={60} endY={20} active={true} />
         <Path startX={35} startY={70} endX={60} endY={80} active={false} />
         <Path startX={60} startY={20} endX={85} endY={50} active={false} />
      </div>

      {/* Nodes Container */}
      <div className="absolute inset-0">
         <SkillNode icon={Code2} title="Core Logic" level="Mastered" x={15} y={50} active={true} />
         
         <SkillNode icon={Layers} title="Data Structures" level="Level 14" x={35} y={30} active={true} />
         <SkillNode icon={Shield} title="Secure Systems" level="Level 8" x={35} y={70} active={true} />
         
         <SkillNode icon={Cpu} title="System Arch" level="Level 2" x={60} y={20} active={true} />
         <SkillNode icon={Network} title="Neural Grids" level="Locked" x={60} y={80} active={false} />
         
         <SkillNode icon={Zap} title="Quantum Logic" level="Redacted" x={85} y={50} active={false} />
      </div>

      {/* Stats Sidebar */}
      <div className="absolute top-10 right-10 flex flex-col gap-6 text-right">
         <div>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mb-1">Knowledge Rank</p>
            <p className="text-2xl font-serif text-white">System Architect</p>
         </div>
         <div>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mb-1">Node Connectivity</p>
            <p className="text-2xl font-serif text-brand-blue">64%</p>
         </div>
      </div>
    </div>
  );
}
