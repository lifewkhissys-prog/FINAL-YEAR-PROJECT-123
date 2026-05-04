import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * KernelSavePulse
 * A high-fidelity particle animation that simulates a "data flush" 
 * from a specific point (e.g., the Save button or Editor) to the 
 * system kernel (bottom console).
 */
export function KernelSavePulse({ trigger, onComplete }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (trigger) {
      // Generate particles
      const newParticles = Array.from({ length: 12 }).map((_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100 - 50, // spread
        y: Math.random() * 100 - 50,
        delay: i * 0.05,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        if (onComplete) onComplete();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ 
              opacity: 0, 
              scale: 0,
              x: 0,
              y: 0 
            }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              scale: [0, 1.5, 0.5, 0],
              x: [0, p.x, p.x * 2, 0], // Move out then down toward console
              y: [0, p.y, 400, 800],   // Falling toward bottom
            }}
            transition={{ 
              duration: 1.2, 
              delay: p.delay,
              ease: "circOut"
            }}
            className="absolute w-1 h-1 bg-brand-blue rounded-full shadow-[0_0_10px_#2563EB]"
          />
        ))}
      </AnimatePresence>
      
      {/* Central Flash */}
      <AnimatePresence>
        {trigger && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.5, 0], scale: [0.5, 2, 3] }}
            transition={{ duration: 0.8 }}
            className="absolute w-32 h-32 bg-brand-blue/20 rounded-full blur-2xl"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
