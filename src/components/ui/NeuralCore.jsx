import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls, useMotionValue, animate } from 'framer-motion';
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
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [dragConstraints, setDragConstraints] = useState({ left: -800, right: 0, top: -600, bottom: 0 });
  const isDragging = useRef(false);

  const handleDragStart = () => {
    isDragging.current = true;
  };

  const handleDragEnd = () => {
    setTimeout(() => {
      isDragging.current = false;
    }, 100);
  };

  const handleClick = () => {
    if (!isDragging.current) {
      setIsOpen(true);
    }
  };

  useEffect(() => {
    const padding = 32; // bottom-8 right-8 layout margin is 32px
    const margin = 16;  // keep 16px safety gap from screen boundary

    const updateConstraints = () => {
      if (isOpen) {
        // Panel: 320px wide, ~410px tall
        setDragConstraints({
          left: -window.innerWidth + 320 + padding + margin,
          right: margin,
          top: -window.innerHeight + 410 + padding + margin,
          bottom: margin,
        });
      } else {
        // Button: 56px wide, 56px tall
        setDragConstraints({
          left: -window.innerWidth + 56 + padding + margin,
          right: margin,
          top: -window.innerHeight + 56 + padding + margin,
          bottom: margin,
        });
      }
    };
    updateConstraints();

    // Check if current position is outside new constraints and animate it back
    const currentX = x.get();
    const currentY = y.get();

    let minX, maxX, minY, maxY;
    if (isOpen) {
      minX = -window.innerWidth + 320 + padding + margin;
      maxX = margin;
      minY = -window.innerHeight + 410 + padding + margin;
      maxY = margin;
    } else {
      minX = -window.innerWidth + 56 + padding + margin;
      maxX = margin;
      minY = -window.innerHeight + 56 + padding + margin;
      maxY = margin;
    }

    let targetX = currentX;
    let targetY = currentY;

    if (currentX < minX) targetX = minX;
    if (currentX > maxX) targetX = maxX;
    if (currentY < minY) targetY = minY;
    if (currentY > maxY) targetY = maxY;

    if (targetX !== currentX) {
      animate(x, targetX, { type: 'spring', stiffness: 300, damping: 30 });
    }
    if (targetY !== currentY) {
      animate(y, targetY, { type: 'spring', stiffness: 300, damping: 30 });
    }

    window.addEventListener('resize', updateConstraints);
    return () => window.removeEventListener('resize', updateConstraints);
  }, [isOpen, x, y]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDiagnostic((prev) => (prev + 1) % DIAGNOSTICS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      drag 
      dragListener={false} 
      dragControls={dragControls}
      dragMomentum={false} 
      dragConstraints={dragConstraints}
      dragElastic={0.1}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ x, y }}
      className="fixed bottom-8 right-8 z-[100] touch-none select-none"
    >
      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={handleClick}
            onPointerDown={(e) => dragControls.start(e)}
            className="w-14 h-14 bg-brand-blue rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.6)] group relative cursor-grab active:cursor-grabbing"
          >
            <div className="absolute inset-0 rounded-full animate-ping bg-brand-blue/40"></div>
            <Bot className="text-white group-hover:scale-110 transition-transform" />
          </motion.button>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-80 bg-[#0F0F0F] border border-brand-blue/30 rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden cursor-default"
          >
            {/* Header */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className="bg-brand-blue/10 px-4 py-3 flex items-center justify-between border-b border-brand-blue/20 cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-center gap-2 select-none pointer-events-none">
                 <Sparkles size={14} className="text-brand-blue" />
                 <span className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">Neural Core AI</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }} 
                onPointerDown={(e) => e.stopPropagation()}
                className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/5 rounded"
              >
                 <X size={14} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-6 select-text">
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
    </motion.div>
  );
}
