import { Textarea } from '../ui/Input';

export function NarrativeBlock({ data, onChange }) {
  return (
    <div className="space-y-4">
      <Textarea
        label="Narrative Content (Markdown)"
        value={data.content || ''}
        onChange={(e) => onChange({ ...data, content: e.target.value })}
        placeholder="Introduce the problem, provide context, or add hints..."
        rows={6}
      />
      <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-default">Markdown Supported</span>
        <span>Use # for headings, ** for bold, ` for code</span>
      </div>
    </div>
  );
}
