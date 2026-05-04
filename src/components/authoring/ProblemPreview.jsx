import { motion } from 'framer-motion';
import { Terminal, BookOpen, Code2, ShieldCheck, ArrowRight } from 'lucide-react';

export function ProblemPreview({ blocks, metadata }) {
  return (
    <div className="space-y-12 pb-20 max-w-4xl mx-auto animate-fade-in">
      {/* Student View Header */}
      <div className="flex flex-col gap-4 border-b border-default pb-8">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            metadata.difficulty === 'hard' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
            metadata.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
            'bg-green-500/10 text-green-500 border border-green-500/20'
          }`}>
            {metadata.difficulty}
          </span>
          <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
            {metadata.language} environment
          </span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">
          {metadata.title || 'Untitled Problem'}
        </h1>
      </div>

      {/* Render Blocks */}
      <div className="space-y-10">
        {blocks.map((block, index) => (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            {block.type === 'narrative' && (
              <div className="prose prose-invert max-w-none">
                <div className="flex items-center gap-2 text-brand-blue mb-4">
                  <BookOpen size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest">Context</span>
                </div>
                <div className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {block.data.content || 'No description provided.'}
                </div>
              </div>
            )}

            {block.type === 'code' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-brand-blue mb-2">
                  <Code2 size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest">Starter Code</span>
                </div>
                <div className="rounded-lg border border-default bg-[#0d1117] overflow-hidden font-mono text-sm">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-default bg-white/5">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
                      solution.{metadata.language === 'python' ? 'py' : metadata.language === 'java' ? 'java' : 'cpp'}
                    </span>
                  </div>
                  <pre className="p-4 overflow-x-auto text-blue-300">
                    <code>{block.data.code || '// Write your code here'}</code>
                  </pre>
                </div>
              </div>
            )}

            {block.type === 'assessment' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-brand-blue mb-2">
                  <Terminal size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest">Expected Outcome</span>
                </div>
                <div className="grid gap-4">
                  {block.data.testCases?.filter(tc => !tc.isHidden).map((tc, idx) => (
                    <div key={tc.id} className="glass p-4 border-l-2 border-brand-blue/30 bg-white/[0.01]">
                      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-3 tracking-widest">
                        Example Case #{idx + 1}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase text-[var(--text-muted)] font-bold">Input</span>
                          <pre className="p-2 rounded bg-black/40 text-xs font-mono text-blue-100 border border-white/5">
                            {tc.stdin || '<empty>'}
                          </pre>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase text-[var(--text-muted)] font-bold">Expected Output</span>
                          <pre className="p-2 rounded bg-black/40 text-xs font-mono text-green-400 border border-white/5">
                            {tc.stdout || '<empty>'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                  {block.data.testCases?.some(tc => tc.isHidden) && (
                    <div className="p-3 rounded border border-dashed border-default flex items-center justify-center gap-2 text-[10px] text-[var(--text-muted)] uppercase tracking-widest italic">
                      <ShieldCheck size={12} /> + Hidden cases for final evaluation
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Footer / Submit Button Simulation */}
      <div className="pt-12 border-t border-default flex justify-end">
        <button className="px-8 h-12 bg-brand-blue text-white font-bold rounded-lg opacity-50 cursor-not-allowed flex items-center gap-3">
          Submit Solution <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
