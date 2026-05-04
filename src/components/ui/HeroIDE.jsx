import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Bug, Terminal, Play, MousePointer2, Award, Info } from 'lucide-react';
import { KernelSavePulse } from './KernelSavePulse';


const CODE_CONTENT = `class DevLabCurriculum:
    def __init__(self, university):
        self.name = "Applied Data Science"
        self.is_aligned = True

    def get_assessments(self):
        return [
            "Auto-graded Labs",
            "Real-time Feedback",
            "Plagiarism Detection"
        ]`;

const REVIEW_NOTES = [
  { type: 'optimization', text: 'Consider memoization for recursive calls to improve Big O complexity.' },
  { type: 'style', text: 'Variable naming follows PEP8 standards. Excellent readability.' },
  { type: 'pattern', text: 'Structural implementation matches the Factory Pattern requirement.' },
];

export function HeroIDE({ onValidate }) {
  const [typedCode, setTypedCode] = useState("");
  const [showBadge, setShowBadge] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showPulse, setShowPulse] = useState(false);


  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTypedCode(CODE_CONTENT.slice(0, i));
      i++;
      if (i > CODE_CONTENT.length) {
        clearInterval(interval);
        setTimeout(() => triggerExecution(), 800);
      }
    }, 20);
    return () => clearInterval(interval);
  }, []);

  const triggerExecution = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setShowBadge(true);
      setShowPulse(true);
      if (onValidate) onValidate();
      setTimeout(() => setShowReview(true), 1000);
    }, 1500);

  };

  return (
    <motion.div 
      animate={showBadge ? { 
        x: [0, -2, 2, -2, 2, 0],
        boxShadow: ["0 0 0px rgba(37,99,235,0)", "0 0 40px rgba(37,99,235,0.4)", "0 0 0px rgba(37,99,235,0)"]
      } : {}}
      transition={{ duration: 0.4 }}
      className="relative w-full max-w-3xl flex gap-6"
    >
      {/* Side Architecture Review (The "Senior Developer" Enhancement) */}
      <AnimatePresence>
        {showReview && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden xl:flex flex-col w-64 gap-4 py-4"
          >
             <div className="bg-[#1A1A1A] border border-brand-blue/30 rounded-lg p-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                   <Award size={40} className="text-brand-blue" />
                </div>
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                   <Award size={16} className="text-brand-blue" />
                   <span className="text-[10px] font-mono text-white font-bold uppercase tracking-[0.2em]">Architect Review</span>
                </div>
                <div className="space-y-4">
                   {REVIEW_NOTES.map((note, idx) => (
                     <div key={idx} className="group cursor-help">
                        <div className="flex items-center gap-2 mb-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-brand-blue/60 group-hover:bg-brand-blue transition-colors"></div>
                           <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{note.type}</span>
                        </div>
                        <p className="text-[11px] text-white/70 leading-relaxed font-sans">{note.text}</p>
                     </div>
                   ))}
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                   <span className="text-[10px] font-mono text-brand-blue">Grade: A+</span>
                   <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-brand-blue"></div>
                      ))}
                   </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main IDE Window */}
      <div className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden font-mono text-[13px] relative z-10">
        {/* Title Bar */}
        <div className="bg-[#252525] px-4 py-3 flex items-center justify-between border-b border-white/5">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
          </div>
          <div className="text-white/40 text-[11px] font-sans">senior_architect_review.py</div>
          <div className="flex items-center gap-4">
             {isRunning && <span className="text-[9px] text-brand-blue animate-pulse uppercase font-bold tracking-widest">Profiling...</span>}
             <Play size={12} className={isRunning ? 'text-brand-blue animate-spin' : 'text-white/40'} />
          </div>
        </div>

        {/* Editor Content */}
        <div className="p-6 flex gap-4 min-h-[360px]">
          <div className="text-white/20 text-right select-none pr-4 border-r border-white/5">
            {[...Array(13)].map((_, i) => (
              <div key={i} className="leading-relaxed">{i + 1}</div>
            ))}
          </div>

          <div className="flex-1 text-[#E0E0E0] leading-relaxed relative">
            <pre className="whitespace-pre-wrap">
              {typedCode.split('\n').map((line, idx) => {
                let highlighted = line;
                if (line.includes('class') || line.includes('def') || line.includes('return')) {
                  highlighted = <span className="text-[#C586C0]">{line}</span>;
                } else if (line.includes('"')) {
                  highlighted = <span className="text-[#CE9178]">{line}</span>;
                } else if (line.includes('True') || line.includes('self')) {
                  highlighted = <span className="text-[#569CD6]">{line}</span>;
                }
                return <div key={idx}>{highlighted}</div>;
              })}
              <motion.span 
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="inline-block w-2 h-4 bg-brand-blue align-middle ml-0.5"
              />
            </pre>

            {/* Test Pass Badge */}
            <AnimatePresence>
              {showBadge && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute bottom-4 right-4 bg-[#1E1E1E] border border-[#27C93F]/30 p-5 rounded-lg shadow-[0_0_50px_rgba(39,201,63,0.15)] flex items-start gap-4 w-72 z-20"
                >
                  <div className="w-10 h-10 rounded-full bg-[#27C93F]/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="text-[#27C93F]" size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#27C93F] uppercase tracking-[0.2em] mb-1">Architecture Validated</p>
                    <p className="text-[12px] text-white/80 font-sans leading-tight">
                       Score: 100/100 | Optimal Pattern Detected
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <KernelSavePulse trigger={showPulse} onComplete={() => setShowPulse(false)} />
    </motion.div>

  );
}
