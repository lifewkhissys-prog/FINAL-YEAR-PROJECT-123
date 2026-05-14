import { useMemo, useState } from 'react';
import { Spinner } from '../ui/Spinner';
import { AlertCircle, Check, Lock, X } from 'lucide-react';

export function SubmissionPanel({ submission, isLoading }) {
  const results = submission?.results || [];
  const [activeCase, setActiveCase] = useState(0);
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = submission?.totalCases || results.length;
  const allPassed = passedCount === totalCount && totalCount > 0;
  const fastest = useMemo(() => {
    if (!results.length) return null;
    return Math.min(...results.map((r) => r.exec_time_ms || 0));
  }, [results]);

  const caseLabels = useMemo(() => {
    let hiddenIndex = 0;
    let visibleIndex = 0;
    return results.map((result) => {
      if (result.is_hidden) {
        hiddenIndex += 1;
        return `Hidden ${hiddenIndex}`;
      }
      visibleIndex += 1;
      return `Case ${visibleIndex}`;
    });
  }, [results]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-[var(--text-secondary)]">
        <Spinner size="lg" className="mb-4" />
        <p className="animate-pulse">Running your code...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-[var(--text-muted)]">
        <p>Run or submit your code to see results here.</p>
      </div>
    );
  }

  if (submission.compileError || submission.stderr || submission.status === 'error') {
    return (
      <div className="h-full p-4 overflow-y-auto">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3 text-red-400">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div className="flex-1">
            <div className="font-semibold text-sm mb-2">
              {submission.compileError ? 'Compilation Failed' : 'Runtime Error'}
            </div>
            <div className="font-mono text-sm whitespace-pre-wrap">
              {submission.compileError || submission.stderr || submission.error || 'An unexpected error occurred during execution.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      <div className="shrink-0 border-b border-default p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold ${allPassed ? 'text-brand-green' : 'text-red-400'}`}>
              {allPassed ? 'Accepted' : 'Wrong Answer'}
            </span>
            <span className="text-sm text-[var(--text-secondary)] font-mono">
              {passedCount} / {totalCount} test cases passed
            </span>
          </div>
          <div className="text-xs text-[var(--text-muted)] font-mono">
            {fastest !== null ? `Fastest: ${fastest}ms` : 'Fastest: --'}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-b border-default flex flex-wrap gap-2 px-4 py-3">
        {results.map((result, index) => (
          <button
            key={result.id || index}
            onClick={() => setActiveCase(index)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${activeCase === index ? 'border-brand-blue text-brand-blue bg-brand-blue/10' : 'border-default text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            <span className="inline-flex items-center gap-1">
              {result.is_hidden ? <Lock size={12} /> : result.passed ? <Check size={12} /> : <X size={12} />}
              {caseLabels[index]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {results.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm text-center py-4">No test cases found.</p>
        ) : (
          (() => {
            const activeResult = results[activeCase];
            if (activeResult.is_hidden) {
              return (
                <div className="border border-default rounded-lg p-4 bg-[var(--bg-surface)] text-sm text-[var(--text-secondary)]">
                  <div className="font-semibold text-[var(--text-primary)] mb-2">This is a hidden test case.</div>
                  <p>Result: {activeResult.passed ? 'Passed' : 'Failed'}</p>
                  <p className="mt-2">Input and expected output are not shown.</p>
                </div>
              );
            }

            const mismatch = activeResult.actual_output !== activeResult.expected_output;
            return (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-muted)] mb-1">Input</div>
                  <pre className="font-mono text-xs bg-[var(--bg-surface)] p-3 rounded border border-default whitespace-pre-wrap">
                    {activeResult.stdin || 'None'}
                  </pre>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--text-muted)] mb-1">Expected Output</div>
                  <pre className="font-mono text-xs bg-[var(--bg-surface)] p-3 rounded border border-default whitespace-pre-wrap">
                    {activeResult.expected_output || 'None'}
                  </pre>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--text-muted)] mb-1">Your Output</div>
                  <pre className={`font-mono text-xs p-3 rounded border whitespace-pre-wrap ${mismatch ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-default bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}>
                    {activeResult.actual_output || 'None'}
                  </pre>
                  <div className={`text-xs font-semibold mt-2 ${mismatch ? 'text-red-400' : 'text-brand-green'}`}>
                    {mismatch ? 'Mismatch' : 'Match'}
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)]">Execution time: {activeResult.exec_time_ms || 0}ms</div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
