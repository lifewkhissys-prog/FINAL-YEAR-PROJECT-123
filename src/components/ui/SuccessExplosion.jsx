import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PARTICLE_COUNT = 30;

export function SuccessExplosion({ onComplete }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const newParticles = [...Array(PARTICLE_COUNT)].map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 600,
      y: (Math.random() - 0.5) * 600,
      size: Math.random() * 10 + 2,
      color: Math.random() > 0.5 ? '#2563EB' : '#00FF41',
      char: Math.random() > 0.5 ? '1' : '0'
    }));
    setParticles(newParticles);

    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] flex items-center justify-center">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ 
              x: p.x, 
              y: p.y, 
              opacity: 0, 
              scale: 0.5,
              rotate: Math.random() * 360
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute font-mono font-bold"
            style={{ 
              fontSize: p.size, 
              color: p.color,
              textShadow: `0 0 10px ${p.color}`
            }}
          >
            {p.char}
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Central Flash */}
      <motion.div
        initial={{ opacity: 1, scale: 0 }}
        animate={{ opacity: 0, scale: 4 }}
        transition={{ duration: 0.8 }}
        className="absolute w-20 h-20 bg-white rounded-full blur-3xl opacity-50"
      />
    </div>
  );
}
