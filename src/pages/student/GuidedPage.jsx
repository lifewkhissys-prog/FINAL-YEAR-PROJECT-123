import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Play, CheckCircle2, XCircle } from 'lucide-react';
import { CodeEditor } from '../../components/editor/CodeEditor';
import { FullPageSpinner } from '../../components/ui/Spinner';

export function GuidedPage() {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [codeValues, setCodeValues] = useState({});
  const [results, setResults] = useState({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  const bottomRef = useRef(null);

  useEffect(() => {
    // Mock fetch
    setTimeout(() => {
      setProblem({
        id,
        title: 'SQL Murder Mystery: The First Clue',
        language: 'sql',
        blocks: [
          { type: 'narrative', content: 'A crime has taken place and the detective needs your help. The detective gave you the crime scene report, but you somehow lost it. You vaguely remember that the crime was a **murder** that occurred sometime on **Jan 15, 2018** and that it took place in **SQL City**.' },
          { type: 'narrative', content: 'Start by retrieving the corresponding crime scene report from the police department’s database.' },
          { type: 'code_editor', starter_code: 'SELECT * FROM crime_scene_report\n--', expected_output: 'murder|20180115|SQL City|Life aint no joke.' },
          { type: 'narrative', content: 'Excellent! The report says: "Security footage shows that there were 2 witnesses. The first witness lives at the last house on Northwestern Dr. The second witness, named Annabel, lives somewhere on Franklin Ave."\n\nLet\'s find the first witness.' },
          { type: 'code_editor', starter_code: 'SELECT * FROM person\nWHERE address_street_name = "Northwestern Dr"\nORDER BY address_number DESC\nLIMIT 1;', expected_output: '14887|Morty Schapiro|118009|111564949|Northwestern Dr' },
          { type: 'narrative', content: '🎉 You found Morty! Now find Annabel.' },
        ]
      });
    }, 500);
  }, [id]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentStep, results]);

  const handleRun = (blockIndex, expectedOutput) => {
    setIsEvaluating(true);
    
    // Mock execution
    setTimeout(() => {
      const isCorrect = Math.random() > 0.3; // 70% chance of being "correct" for demo
      
      setResults(prev => ({
        ...prev,
        [blockIndex]: {
          passed: isCorrect,
          actual: isCorrect ? expectedOutput : '0 rows returned or mismatched data.'
        }
      }));

      if (isCorrect) {
        // Unlock next block(s)
        let nextIndex = blockIndex + 1;
        while (nextIndex < problem.blocks.length && problem.blocks[nextIndex].type === 'narrative') {
          nextIndex++;
        }
        setCurrentStep(Math.max(currentStep, nextIndex));
      }
      
      setIsEvaluating(false);
    }, 1000);
  };

  if (!problem) return <FullPageSpinner />;

  return (
    <div className="max-w-3xl mx-auto py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8 border-b border-default pb-4">{problem.title}</h1>

      <div className="space-y-12 pb-32">
        {problem.blocks.map((block, index) => {
          // If block is beyond current step, don't render it
          if (index > currentStep && block.type !== 'narrative') return null;
          if (index > currentStep + 1 && block.type === 'narrative') return null;

          if (block.type === 'narrative') {
            return (
              <div key={index} className="prose prose-invert prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed max-w-none animate-slide-up">
                <ReactMarkdown>{block.content}</ReactMarkdown>
              </div>
            );
          }

          if (block.type === 'code_editor') {
            const isLocked = index > currentStep;
            const result = results[index];

            return (
              <div key={index} className={`glass-sm overflow-hidden transition-all duration-500 animate-slide-up ${isLocked ? 'opacity-50 pointer-events-none filter blur-[1px]' : ''}`}>
                <div className="bg-dark-800 px-4 py-2 border-b border-default flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Editor</span>
                  <span className="text-xs text-brand-blue font-mono">{problem.language}</span>
                </div>
                
                <CodeEditor
                  value={codeValues[index] ?? block.starter_code}
                  onChange={(val) => setCodeValues(prev => ({ ...prev, [index]: val }))}
                  language={problem.language}
                  height="200px"
                  readOnly={isLocked}
                  className="rounded-none border-0"
                />
                
                <div className="p-4 border-t border-default flex flex-col gap-4 bg-[var(--bg-surface)]">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleRun(index, block.expected_output)}
                      disabled={isEvaluating || isLocked}
                      className="btn-primary py-2 px-6"
                    >
                      <Play size={16} /> Run Code
                    </button>
                    
                    {result && (
                      <div className={`flex items-center gap-2 font-medium ${result.passed ? 'text-brand-green' : 'text-red-400'}`}>
                        {result.passed ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                        {result.passed ? 'Correct!' : 'Incorrect. Try again.'}
                      </div>
                    )}
                  </div>

                  {result && !result.passed && (
                     <div className="bg-[var(--bg-primary)] p-3 rounded border border-red-500/20 font-mono text-sm text-red-400">
                        <div className="text-xs text-[var(--text-muted)] mb-1">Output didn't match expected:</div>
                        {result.actual}
                     </div>
                  )}
                </div>
              </div>
            );
          }
          return null;
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
