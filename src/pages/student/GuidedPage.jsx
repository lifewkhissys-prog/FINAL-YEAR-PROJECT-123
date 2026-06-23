import { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Play, CheckCircle2, XCircle, Lock, ArrowLeft, Minimize2 } from 'lucide-react';
import { CodeEditor } from '../../components/editor/CodeEditor';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { AttemptHeader } from '../../components/layout/AttemptHeader';
import useAuthStore from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';

export function GuidedPage({ problemId, initialProblem }) {
  const params = useParams();
  const location = useLocation();
  const resolvedProblemId = problemId || params.problemId || params.id;
  const user = useAuthStore((state) => state.user);
  const { courses, problems, submissions, addSubmission, assessments } = useDemoStore();

  const [problem, setProblem] = useState(null);
  const [codeValues, setCodeValues] = useState({});
  const [results, setResults] = useState({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [openHints, setOpenHints] = useState({});
  
  const [isFocusMode, setIsFocusMode] = useState(false);
  const bottomRef = useRef(null);

  const isAssessmentSession = new URLSearchParams(location.search).get('mode') === 'assessment';

  const backUrl = useMemo(() => {
    if (isAssessmentSession) {
      const activeAssessment = assessments.find(
        (a) => a.problemIds.includes(resolvedProblemId) &&
               new Date(a.startsAt).getTime() <= Date.now() &&
               new Date(a.endsAt).getTime() > Date.now()
      );
      const assessmentObj = activeAssessment || assessments.find(a => a.problemIds.includes(resolvedProblemId));
      if (assessmentObj) {
        return `/student/assessments/${assessmentObj.id}`;
      }
    }
    return '/student/dashboard';
  }, [isAssessmentSession, assessments, resolvedProblemId]);

  const assessmentEndsAt = useMemo(() => {
    if (!isAssessmentSession) return null;
    const activeAssessment = assessments.find(
      (a) => a.problemIds.includes(resolvedProblemId) &&
             new Date(a.startsAt).getTime() <= Date.now() &&
             new Date(a.endsAt).getTime() > Date.now()
    );
    const assessmentObj = activeAssessment || assessments.find(a => a.problemIds.includes(resolvedProblemId));
    return assessmentObj ? assessmentObj.endsAt : null;
  }, [isAssessmentSession, assessments, resolvedProblemId]);

  useEffect(() => {
    if (initialProblem) {
      setProblem(initialProblem);
      return;
    }

    const storeProblem = problems[resolvedProblemId];
    if (storeProblem) {
      // Map blocks from DB format to editor format
      const mappedBlocks = (storeProblem.blocks || []).map((b, i) => {
        if (b.type === 'text') {
          return { type: 'narrative', content: b.content };
        } else if (b.type === 'code') {
          return {
            id: b.id || `b${i}`,
            type: 'editor',
            starter_code: b.starterCode || '',
            expected_output: b.expectedOutput || '',
            hint: b.hint || ''
          };
        }
        return b;
      });

      setProblem({
        ...storeProblem,
        blocks: mappedBlocks
      });
    } else {
      setProblem({
        id: resolvedProblemId,
        type: 'guided',
        title: 'Variables & Math',
        language: 'python',
        blocks: [
          { type: 'narrative', content: '### Welcome to Python Variables\nIn Python, variables are created when you assign a value to it.' },
          { id: 'b1', type: 'editor', starter_code: 'x = 5\nprint(x)', expected_output: '5\n', hint: 'Assign 5 to x and print it.' }
        ]
      });
    }
  }, [initialProblem, resolvedProblemId, problems]);

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
      if (!solvedBlockIds.includes(String(block.id))) return index;
    }

    return -1; // Everything solved
  }, [problem, solvedBlockIds]);

  const prevUnsolvedIndexRef = useRef(-2); // Start at -2 to differentiate from -1 (everything solved)

  useEffect(() => {
    if (!problem?.blocks?.length) return;
    
    // Only scroll if firstUnsolvedIndex has changed and it is not the initial load
    if (prevUnsolvedIndexRef.current !== -2 && firstUnsolvedIndex > prevUnsolvedIndexRef.current) {
      const element = document.getElementById(`block-${firstUnsolvedIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
    
    prevUnsolvedIndexRef.current = firstUnsolvedIndex;
  }, [firstUnsolvedIndex, problem]);

  const totalSections = editorBlocks.length;
  const solvedCount = solvedBlockIds.length;
  const allSolved = totalSections > 0 && solvedCount === totalSections;

  // Sync complete submission to store
  useEffect(() => {
    if (allSolved && problem && user) {
      const course = courses.find((c) => c.problemIds.includes(problem.id));
      const courseTitle = course ? course.title : 'Self Practice';

      const alreadySubmitted = submissions.some(
        (s) =>
          s.studentEmail.toLowerCase() === user.email.toLowerCase() &&
          s.problemId === problem.id &&
          s.status === 'completed'
      );

      if (!alreadySubmitted) {
        addSubmission({
          studentEmail: user.email,
          studentName: user.name,
          problemId: problem.id,
          problemTitle: problem.title,
          course: courseTitle,
          type: 'guided',
          language: problem.language,
          status: 'completed',
          score: '100%',
          code: JSON.stringify(codeValues),
          is_graded: true
        });
      }
    }
  }, [allSolved, problem, user, courses, submissions, addSubmission, codeValues]);

  const handleRun = (blockId, expectedOutput, starterCode) => {
    setIsEvaluating(true);

    setTimeout(() => {
      const currentCode = codeValues[blockId] !== undefined ? codeValues[blockId] : starterCode;
      const code = (currentCode || '').trim();
      const isCorrect = code.length > 0;

      setResults((prev) => ({
        ...prev,
        [blockId]: {
          passed: isCorrect,
          actual: isCorrect ? expectedOutput : 'Please provide code/query implementation before running.'
        }
      }));

      setIsEvaluating(false);
    }, 600);
  };

  if (!problem) return <FullPageSpinner />;

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] overflow-hidden relative">
      {!isFocusMode && (
        <AttemptHeader
          title={problem.title}
          language={problem.language}
          isAssessment={isAssessmentSession}
          endsAt={assessmentEndsAt}
          onExpired={() => {}}
          backUrl={backUrl}
          onToggleFocusMode={() => setIsFocusMode(true)}
        />
      )}

      {isFocusMode && (
        <button
          onClick={() => setIsFocusMode(false)}
          className="fixed bottom-4 right-4 z-50 p-2.5 rounded-lg bg-brand-blue text-white shadow-lg hover:bg-brand-purple transition-all flex items-center gap-2 text-xs font-mono uppercase font-semibold border border-brand-blue/30"
          title="Exit Focus Mode"
        >
          <Minimize2 size={14} /> Exit Focus Mode
        </button>
      )}

      <div className="flex-1 overflow-y-auto py-8">
        <div className="max-w-3xl mx-auto px-4">

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
          const isLocked = firstUnsolvedIndex >= 0 && index > firstUnsolvedIndex;

          if (block.type === 'narrative') {
            if (isLocked) return null; // Hide future narrative blocks
            return (
              <div key={index} id={`block-${index}`} className="prose prose-invert prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed max-w-none animate-slide-up">
                <ReactMarkdown>{block.content}</ReactMarkdown>
              </div>
            );
          }

          if (block.type === 'editor') {
            const result = results[block.id];
            const isSolved = result?.passed;

            return (
              <div key={index} id={`block-${index}`} className="relative">
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
                          onClick={() => handleRun(block.id, block.expected_output, block.starter_code)}
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
    </div>
  </div>
  );
}
