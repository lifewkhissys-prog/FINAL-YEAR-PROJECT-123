import { Suspense, lazy, useEffect, useState, useCallback } from 'react';
import { Spinner } from '../ui/Spinner';
import { Check, Clock } from 'lucide-react';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

const LANG_MAP = {
  python: 'python',
  java:   'java',
  cpp:    'cpp',
  sql:    'sql',
  html:   'html',
};

export function CodeEditor({
  value,
  onChange,
  language = 'python',
  readOnly = false,
  height = '400px',
  className = '',
  problemId, // Add problemId for unique storage key
}) {
  const [isSaved, setIsSaved] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);

  // Auto-save to localStorage with debounce
  const autoSave = useCallback((code) => {
    if (!problemId || readOnly) return;

    const key = `devlab-draft-${problemId}`;
    localStorage.setItem(key, JSON.stringify({
      code,
      timestamp: Date.now(),
      language
    }));

    setIsSaved(true);
    setLastSaved(new Date());
  }, [problemId, language, readOnly]);

  // Load draft on mount
  useEffect(() => {
    if (!problemId || readOnly) return;

    const key = `devlab-draft-${problemId}`;
    const draft = localStorage.getItem(key);

    if (draft) {
      try {
        const { code, timestamp } = JSON.parse(draft);
        // Only load if draft is less than 24 hours old
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          onChange(code);
        } else {
          localStorage.removeItem(key);
        }
      } catch (e) {
        localStorage.removeItem(key);
      }
    }
  }, [problemId, onChange, readOnly]);

  // Debounced auto-save
  useEffect(() => {
    if (!value || !problemId || readOnly) return;

    setIsSaved(false);
    const timeoutId = setTimeout(() => autoSave(value), 2000); // Save after 2 seconds of no typing

    return () => clearTimeout(timeoutId);
  }, [value, autoSave, problemId, readOnly]);

  const handleChange = (newValue) => {
    onChange(newValue);
  };

  return (
    <div className={`rounded-lg overflow-hidden border border-default ${className}`}>
      {/* Auto-save indicator */}
      {problemId && !readOnly && (
        <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-surface)] border-b border-default">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            {isSaved ? (
              <>
                <Check size={12} className="text-green-500" />
                <span>Draft saved</span>
                {lastSaved && (
                  <span className="text-[var(--text-muted)]">
                    {lastSaved.toLocaleTimeString()}
                  </span>
                )}
              </>
            ) : (
              <>
                <Clock size={12} className="text-yellow-500" />
                <span>Saving...</span>
              </>
            )}
          </div>
        </div>
      )}

      <Suspense fallback={
        <div className="flex items-center justify-center bg-[var(--bg-surface)]" style={{ height }}>
          <Spinner />
        </div>
      }>
        <MonacoEditor
          height={height}
          language={LANG_MAP[language?.toLowerCase()] || language}
          value={value}
          onChange={handleChange}
          theme="vs-dark"
          options={{
            readOnly,
            fontSize: 14,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontLigatures: true,
            minimap:       { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderLineHighlight: 'gutter',
            padding: { top: 16, bottom: 16 },
            scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            overviewRulerLanes: 0,
          }}
        />
      </Suspense>
    </div>
  );
}
