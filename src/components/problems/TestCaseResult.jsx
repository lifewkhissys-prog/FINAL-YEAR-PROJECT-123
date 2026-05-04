import { Check, X } from 'lucide-react';

export function TestCaseResult({ result, index }) {
  const { passed, actual_output, expected_output, exec_time_ms, is_hidden } = result;

  return (
    <div className="border border-default rounded-lg overflow-hidden bg-[var(--bg-surface)] mb-3">
      <div className={`flex items-center justify-between p-3 border-b border-default ${passed ? 'bg-brand-green/10' : 'bg-red-500/10'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${passed ? 'bg-brand-green/20 text-brand-green' : 'bg-red-500/20 text-red-500'}`}>
            {passed ? <Check size={14} /> : <X size={14} />}
          </div>
          <span className="font-semibold text-sm">Test Case {index + 1}</span>
          {is_hidden && <span className="text-xs text-[var(--text-muted)] ml-2">(Hidden)</span>}
        </div>
        <div className="text-xs text-[var(--text-secondary)] font-mono">
          {exec_time_ms}ms
        </div>
      </div>
      
      {!is_hidden && (
        <div className="p-3 space-y-3 bg-[var(--bg-surface)]">
          <div>
            <div className="text-xs font-semibold text-[var(--text-muted)] mb-1">Expected Output</div>
            <pre className="font-mono text-xs bg-[var(--bg-primary)] p-2 rounded text-[var(--text-secondary)] border border-default whitespace-pre-wrap">{expected_output || ' '}</pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-muted)] mb-1">Actual Output</div>
            <pre className={`font-mono text-xs p-2 rounded border border-default whitespace-pre-wrap ${passed ? 'bg-[var(--bg-primary)] text-[var(--text-secondary)]' : 'bg-red-500/5 text-red-400'}`}>
              {actual_output || ' '}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
