import { CodeEditor } from '../editor/CodeEditor';

export function CodeStarterBlock({ data, onChange, language }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-secondary)]">Initial code provided to student:</span>
        <span className="text-xs px-2 py-0.5 rounded bg-brand-blue/10 text-brand-blue border border-brand-blue/20 capitalize">
          {language}
        </span>
      </div>
      <div className="h-[200px] border border-default rounded-lg overflow-hidden">
        <CodeEditor
          value={data.code || ''}
          onChange={(val) => onChange({ ...data, code: val })}
          language={language}
          height="100%"
        />
      </div>
    </div>
  );
}
