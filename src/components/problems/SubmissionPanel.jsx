import { useState } from 'react';
import { TestCaseResult } from './TestCaseResult';
import { Spinner } from '../ui/Spinner';
import { AlertCircle } from 'lucide-react';

export function SubmissionPanel({ submission, isLoading }) {
  const [activeTab, setActiveTab] = useState('results');

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

  if (submission.status === 'error') {
    return (
      <div className="h-full p-4 overflow-y-auto">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3 text-red-400">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div className="flex-1 font-mono text-sm whitespace-pre-wrap">
            {submission.error || 'An unexpected error occurred during execution.'}
          </div>
        </div>
      </div>
    );
  }

  const results = submission.results || [];
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const allPassed = passedCount === totalCount && totalCount > 0;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      {/* Tabs */}
      <div className="flex border-b border-default shrink-0">
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'results' ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        >
          Test Results
        </button>
        <button
          onClick={() => setActiveTab('console')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'console' ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        >
          Console output
        </button>
      </div>

      {/* Summary Banner */}
      <div className={`shrink-0 p-3 flex items-center justify-between border-b border-default ${allPassed ? 'bg-brand-green/10 text-brand-green' : 'bg-red-500/10 text-red-400'}`}>
         <span className="font-semibold text-sm">
           {allPassed ? 'Accepted' : 'Failed'}
         </span>
         <span className="font-mono text-sm">
           {passedCount} / {totalCount} test cases passed
         </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'results' ? (
          <div>
            {results.length > 0 ? (
               results.map((r, i) => <TestCaseResult key={r.id || i} index={i} result={r} />)
            ) : (
              <p className="text-[var(--text-muted)] text-sm text-center py-4">No test cases found.</p>
            )}
          </div>
        ) : (
          <div className="font-mono text-sm text-[var(--text-secondary)] whitespace-pre-wrap p-2 rounded bg-[var(--bg-surface)] border border-default h-full">
             {submission.console_output || 'No console output.'}
          </div>
        )}
      </div>
    </div>
  );
}
