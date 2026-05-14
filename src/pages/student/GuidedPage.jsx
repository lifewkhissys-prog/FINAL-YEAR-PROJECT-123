import { useMemo, useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Play, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { CodeEditor } from '../../components/editor/CodeEditor';
import { FullPageSpinner } from '../../components/ui/Spinner';

export function GuidedPage({ problemId, initialProblem }) {
  const params = useParams();
  const resolvedProblemId = problemId || params.problemId || params.id;
  const [problem, setProblem] = useState(null);
  const [codeValues, setCodeValues] = useState({});
  const [results, setResults] = useState({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [openHints, setOpenHints] = useState({});
  
  const bottomRef = useRef(null);

  useEffect(() => {
    if (initialProblem) {
      setProblem(initialProblem);
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setProblem({
        id: resolvedProblemId,
        type: 'guided',
        title: 'SQL Murder Mystery: The First Clue',
        language: 'sql',
        blocks: [
          { type: 'narrative', content: 'A crime has taken place and the detective needs your help. The detective gave you the crime scene report, but you somehow lost it. You vaguely remember that the crime was a **murder** that occurred sometime on **Jan 15, 2018** and that it took place in **SQL City**.' },
          { type: 'narrative', content: 'Start by retrieving the corresponding crime scene report from the police department’s database.' },
          { id: 'b1', type: 'editor', starter_code: 'SELECT * FROM crime_scene_report\n--', expected_output: 'murder|20180115|SQL City|Life aint no joke.', hint: 'Focus on the date and city. Filter by date first, then location.' },
          { type: 'narrative', content: 'Excellent! The report says: "Security footage shows that there were 2 witnesses. The first witness lives at the last house on Northwestern Dr. The second witness, named Annabel, lives somewhere on Franklin Ave."\n\nLet\'s find the first witness.' },
          { id: 'b2', type: 'editor', starter_code: 'SELECT * FROM person\nWHERE address_street_name = "Northwestern Dr"\nORDER BY address_number DESC\nLIMIT 1;', expected_output: '14887|Morty Schapiro|118009|111564949|Northwestern Dr', hint: 'Order by house number descending to get the last house.' },
          { type: 'narrative', content: '🎉 You found Morty! Now find Annabel.' },
        ]
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [initialProblem, resolvedProblemId]);

  useEffect(() => {
    if (!problem?.id) return;
    const storageKey = `devlab_guided_${problem.id}`;
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setCodeValues(parsed.codeByBlockId || {});
        const solvedIds = parsed.solvedBlockIds || [];
        if (solvedIds.length) {
          setResults((prev) => {
            const next = { ...prev };
            solvedIds.forEach((blockId) => {
              next[blockId] = next[blockId] || { passed: true, actual: 'Previously solved.' };
            });
            return next;
          });
        }
      } catch (error) {
        localStorage.removeItem(storageKey);
      }
    }
  }, [problem]);

  useEffect(() => {
    if (!problem?.id) return;
    const storageKey = `devlab_guided_${problem.id}`;
    const solvedBlockIds = Object.keys(results).filter((key) => results[key]?.passed);
    localStorage.setItem(storageKey, JSON.stringify({
      problemId: problem.id,
      solvedBlockIds,
      codeByBlockId: codeValues,
    }));
  }, [codeValues, results, problem]);

  const editorBlocks = useMemo(() => problem?.blocks.filter((block) => block.type === 'editor') || [], [problem]);

  const solvedBlockIds = useMemo(
    () => Object.keys(results).filter((key) => results[key]?.passed),
    [results]
  );

  const firstUnsolvedIndex = useMemo(() => {
    if (!problem) return -1;
    const editorIndices = problem.blocks
      .map((block, index) => (block.type === 'editor' ? index : null))
      .filter((index) => index !== null);

    for (const index of editorIndices) {
      const block = problem.blocks[index];
      if (!solvedBlockIds.includes(block.id)) return index;
    }

    return editorIndices.length ? editorIndices[editorIndices.length - 1] : -1;
  }, [problem, solvedBlockIds]);

  useEffect(() => {
    if (!problem?.blocks?.length) return;
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [problem, firstUnsolvedIndex]);

  const handleRun = (blockId, expectedOutput) => {
    setIsEvaluating(true);

    setTimeout(() => {
      const code = (codeValues[blockId] || '').trim();
      const isCorrect = code.length > 0 && Math.random() > 0.35;

      setResults((prev) => ({
        ...prev,
        [blockId]: {
          passed: isCorrect,
          actual: isCorrect ? expectedOutput : 'Output mismatched. Please re-check your query.'
        }
      }));

      setIsEvaluating(false);
    }, 900);
  };

  if (!problem) return <FullPageSpinner />;

  const totalSections = editorBlocks.length;
  const solvedCount = solvedBlockIds.length;
  const allSolved = totalSections > 0 && solvedCount === totalSections;

  return (
    <div className="max-w-3xl mx-auto py-8 animate-fade-in">
      <div className="flex flex-col gap-3 mb-8 border-b border-default pb-4">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">{problem.title}</h1>
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span className="uppercase tracking-[0.2em]">Progress</span>
          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden max-w-xs">
            <div className="h-full bg-brand-blue" style={{ width: `${(solvedCount / Math.max(totalSections, 1)) * 100}%` }}></div>
          </div>
          <span>{solvedCount} / {totalSections} sections complete</span>
        </div>
      </div>

      <div className="space-y-12 pb-32">
        {problem.blocks.map((block, index) => {
          if (block.type === 'narrative') {
            return (
              <div key={index} className="prose prose-invert prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed max-w-none animate-slide-up">
                <ReactMarkdown>{block.content}</ReactMarkdown>
              </div>
            );
          }

          if (block.type === 'editor') {
            const result = results[block.id];
            const isSolved = result?.passed;
            const isLocked = firstUnsolvedIndex >= 0 && index > firstUnsolvedIndex;

            return (
              <div key={index} className="relative">
                <div className={`glass-sm overflow-hidden transition-all duration-500 animate-slide-up ${isLocked ? 'opacity-70' : ''}`}>
                  <div className="bg-dark-800 px-4 py-2 border-b border-default flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Editor</span>
                    <div className="flex items-center gap-2 text-xs text-brand-blue font-mono">
                      {isSolved && <CheckCircle2 size={14} className="text-brand-green" />}
                      {problem.language}
                    </div>
                  </div>

                  <CodeEditor
                    value={codeValues[block.id] ?? block.starter_code}
                    onChange={(val) => setCodeValues((prev) => ({ ...prev, [block.id]: val }))}
                    language={problem.language}
                    height="200px"
                    readOnly={isLocked || isSolved}
                    className="rounded-none border-0"
                  />

                  <div className="p-4 border-t border-default flex flex-col gap-4 bg-[var(--bg-surface)]">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleRun(block.id, block.expected_output)}
                          disabled={isEvaluating || isLocked || isSolved}
                          className="btn-primary py-2 px-6"
                        >
                          <Play size={16} /> Run
                        </button>
                        {block.hint && (
                          <button
                            onClick={() => setOpenHints((prev) => ({ ...prev, [block.id]: !prev[block.id] }))}
                            className="text-xs text-brand-blue hover:text-brand-purple uppercase tracking-widest"
                          >
                            {openHints[block.id] ? 'Hide Hint' : 'Show Hint'}
                          </button>
                        )}
                      </div>

                      {result && (
                        <div className={`flex items-center gap-2 font-medium ${result.passed ? 'text-brand-green' : 'text-red-400'}`}>
                          {result.passed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                          {result.passed ? 'Correct! Continue reading.' : 'Incorrect. Try again.'}
                        </div>
                      )}
                    </div>

                    {block.hint && openHints[block.id] && (
                      <div className="bg-[var(--bg-primary)] p-3 rounded border border-default text-sm text-[var(--text-secondary)]">
                        {block.hint}
                      </div>
                    )}

                    {result && !result.passed && (
                      <div className="bg-[var(--bg-primary)] p-3 rounded border border-red-500/20 font-mono text-sm text-red-400">
                        <div className="text-xs text-[var(--text-muted)] mb-1">Output didn't match expected:</div>
                        {result.actual}
                      </div>
                    )}
                  </div>
                </div>

                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-primary)] uppercase tracking-widest">
                      <Lock size={14} /> Locked
                    </div>
                  </div>
                )}
              </div>
            );
          }
          return null;
        })}

        {allSolved && (
          <div className="glass p-6 text-center text-[var(--text-primary)]">
            <h2 className="text-xl font-semibold mb-2">All sections complete</h2>
            <p className="text-sm text-[var(--text-secondary)]">Great work. You can review your solutions or return to the assessment hub.</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
