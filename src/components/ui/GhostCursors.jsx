import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const CURSOR_NAMES = [
  "alex_dev", "sarah_q", "mike_build", "ghost_node", "architect_01",
  "pixel_junkie", "logic_bomb", "kernel_panic", "null_ptr", "void_star"
];

export function GhostCursors() {
  const [ghosts, setGhosts] = useState([]);

  useEffect(() => {
    // Initialize ghosts
    const initialGhosts = Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      name: CURSOR_NAMES[Math.floor(Math.random() * CURSOR_NAMES.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: ['#3B82F6', '#8B5CF6', '#10B981'][Math.floor(Math.random() * 3)]
    }));
    setGhosts(initialGhosts);

    // Animate ghosts
    const interval = setInterval(() => {
      setGhosts(prev => prev.map(ghost => ({
        ...ghost,
        x: Math.max(0, Math.min(100, ghost.x + (Math.random() - 0.5) * 15)),
        y: Math.max(0, Math.min(100, ghost.y + (Math.random() - 0.5) * 15))
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 dark:opacity-40 select-none">
      {ghosts.map(ghost => (
        <motion.div
          key={ghost.id}
          initial={false}
          animate={{ x: `${ghost.x}%`, y: `${ghost.y}%` }}
          transition={{ duration: 3, ease: "linear" }}
          className="absolute flex flex-col items-start gap-1"
          style={{ left: 0, top: 0 }}
        >
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill={ghost.color} 
            stroke="white" 
            strokeWidth="2" 
            className="drop-shadow-sm"
          >
            <path d="M5.653 3.123l12.184 12.184-4.873.974 3.9 7.721-1.95.975-3.9-7.721-4.385 4.385V3.123z" />
          </svg>
          <div 
            className="px-1.5 py-0.5 rounded-sm bg-white/10 backdrop-blur-md border border-white/10 text-[8px] font-mono text-white/60 uppercase tracking-tighter"
            style={{ borderColor: `${ghost.color}44` }}
          >
            {ghost.name}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
