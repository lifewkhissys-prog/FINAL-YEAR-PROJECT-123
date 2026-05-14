import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Eye, Layout, Loader2, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { CodeEditor } from '../../components/editor/CodeEditor';
import { useProblemStore } from '../../store/problemStore';

export function ProblemAuthorPage() {
  const { assessmentId, problemId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!problemId;
  const [isPreview, setIsPreview] = useState(false);
  const { saveProblem, loading } = useProblemStore();
  const [step, setStep] = useState('setup');
  const [metadata, setMetadata] = useState({
    title: '',
    type: 'challenge',
    language: 'python',
    timeLimit: 2000,
    memoryLimit: 256,
  });

  const [challengeDraft, setChallengeDraft] = useState({
    description: '',
    starterCode: 'def solve():\n    # Write your code here\n    pass',
    testCases: [
      { id: Date.now(), stdin: '', expectedStdout: '', isHidden: false },
    ],
  });

  const [guidedBlocks, setGuidedBlocks] = useState([
    { id: Date.now().toString(), type: 'narrative', content: 'Start your guided narrative here.' },
    { id: (Date.now() + 1).toString(), type: 'editor', starterCode: 'SELECT * FROM table_name;', expectedOutput: '', hint: '' },
  ]);

  const canContinue = metadata.title.trim() && metadata.type && metadata.language;

  const addTestCase = () => {
    setChallengeDraft((prev) => ({
      ...prev,
      testCases: [
        ...prev.testCases,
        { id: Date.now(), stdin: '', expectedStdout: '', isHidden: false },
      ],
    }));
  };

  const updateTestCase = (id, field, value) => {
    setChallengeDraft((prev) => ({
      ...prev,
      testCases: prev.testCases.map((testCase) => (
        testCase.id === id ? { ...testCase, [field]: value } : testCase
      )),
    }));
  };

  const removeTestCase = (id) => {
    setChallengeDraft((prev) => ({
      ...prev,
      testCases: prev.testCases.filter((testCase) => testCase.id !== id),
    }));
  };

  const addGuidedBlock = (type) => {
    const id = Date.now().toString();
    setGuidedBlocks((prev) => ([
      ...prev,
      type === 'narrative'
        ? { id, type, content: '' }
        : { id, type, starterCode: '', expectedOutput: '', hint: '' },
    ]));
  };

  const updateGuidedBlock = (id, patch) => {
    setGuidedBlocks((prev) => prev.map((block) => (
      block.id === id ? { ...block, ...patch } : block
    )));
  };

  const moveGuidedBlock = (index, direction) => {
    setGuidedBlocks((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const removeGuidedBlock = (id) => {
    setGuidedBlocks((prev) => prev.filter((block) => block.id !== id));
  };

  const payload = useMemo(() => {
    if (metadata.type === 'challenge') {
      return {
        assessmentId,
        title: metadata.title,
        type: metadata.type,
        language: metadata.language,
        timeLimitMs: metadata.timeLimit,
        memoryLimitMb: metadata.memoryLimit,
        description: challengeDraft.description,
        starterCode: challengeDraft.starterCode,
        testCases: challengeDraft.testCases,
      };
    }
    return {
      assessmentId,
      title: metadata.title,
      type: metadata.type,
      language: metadata.language,
      timeLimitMs: metadata.timeLimit,
      memoryLimitMb: metadata.memoryLimit,
      blocks: guidedBlocks,
    };
  }, [assessmentId, challengeDraft, guidedBlocks, metadata]);

  const handleSave = async () => {
    try {
      await saveProblem({ id: problemId, ...payload });
      if (!isEditing) {
        navigate(`/lecturer/assessments/${assessmentId}`);
      }
      alert('Problem saved.');
    } catch (error) {
      alert('Failed to save problem: ' + error.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between sticky top-0 z-20 bg-[var(--bg-primary)]/80 backdrop-blur-md py-4 border-b border-default">
        <div className="flex items-center gap-6">
          <Link to={`/lecturer/assessments/${assessmentId}`} className="p-2 hover:bg-white/5 rounded-full transition-colors text-[var(--text-secondary)]">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {isPreview ? 'Problem Preview' : (isEditing ? 'Edit Problem' : 'New Problem')}
            </h1>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              MODE: {isPreview ? 'STUDENT_VIEW' : 'AUTHOR_ENV'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={loading}
            onClick={() => setIsPreview(!isPreview)}
            className={`px-4 h-10 flex items-center gap-2 rounded-lg font-bold text-xs transition-all border ${
              isPreview
                ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/20'
                : 'hover:bg-white/5 text-[var(--text-secondary)] border-default'
            } disabled:opacity-50`}
          >
            {isPreview ? <Layout size={16} /> : <Eye size={16} />}
            {isPreview ? 'Exit Preview' : 'Preview'}
          </button>
          {!isPreview && (
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn-primary px-6 h-10 flex items-center gap-2 shadow-lg shadow-brand-blue/20 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEditing ? 'Update Problem' : 'Save Problem'}
            </button>
          )}
        </div>
      </div>

      {step === 'setup' && !isPreview && (
        <div className="glass p-6 space-y-6 max-w-3xl">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Problem Setup</h2>
          <Input
            label="Problem Title"
            placeholder="e.g. Two Sum"
            value={metadata.title}
            onChange={(event) => setMetadata((prev) => ({ ...prev, title: event.target.value }))}
          />
          <div className="flex flex-wrap gap-3">
            {['guided', 'challenge'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMetadata((prev) => ({ ...prev, type }))}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${metadata.type === type ? 'border-brand-blue text-brand-blue bg-brand-blue/10' : 'border-default text-[var(--text-secondary)]'}`}
              >
                {type === 'guided' ? 'Guided' : 'Challenge'}
              </button>
            ))}
          </div>
          <Select
            label="Language"
            value={metadata.language}
            onChange={(event) => setMetadata((prev) => ({ ...prev, language: event.target.value }))}
            options={[
              { value: 'python', label: 'Python' },
              { value: 'java', label: 'Java' },
              { value: 'cpp', label: 'C++' },
              { value: 'sql', label: 'SQL' },
            ]}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Time Limit (ms)"
              type="number"
              value={metadata.timeLimit}
              onChange={(event) => setMetadata((prev) => ({ ...prev, timeLimit: Number(event.target.value) }))}
            />
            <Input
              label="Memory Limit (MB)"
              type="number"
              value={metadata.memoryLimit}
              onChange={(event) => setMetadata((prev) => ({ ...prev, memoryLimit: Number(event.target.value) }))}
            />
          </div>
          <div className="flex justify-end">
            <button
              className="btn-primary"
              disabled={!canContinue}
              onClick={() => setStep('editor')}
              type="button"
            >
              Continue to Editor
            </button>
          </div>
        </div>
      )}

      {step === 'editor' && !isPreview && metadata.type === 'challenge' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Description (Markdown)</h2>
              <Textarea
                rows={14}
                placeholder="Problem statement, input/output format, constraints, sample I/O"
                value={challengeDraft.description}
                onChange={(event) => setChallengeDraft((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div className="glass p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Live Preview</h2>
              <div className="prose prose-invert max-w-none text-sm">
                <ReactMarkdown>{challengeDraft.description || 'Nothing to preview yet.'}</ReactMarkdown>
              </div>
            </div>
          </div>

          <div className="glass p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Starter Code</h2>
            <CodeEditor
              value={challengeDraft.starterCode}
              onChange={(value) => setChallengeDraft((prev) => ({ ...prev, starterCode: value }))}
              language={metadata.language}
              height="320px"
            />
          </div>

          <div className="glass p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Test Cases</h2>
              <button className="btn-primary" type="button" onClick={addTestCase}>
                <Plus size={16} /> Add Test Case
              </button>
            </div>
            <div className="space-y-4">
              {challengeDraft.testCases.map((testCase, index) => (
                <div key={testCase.id} className="border border-default rounded-lg p-4 bg-[var(--bg-surface)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Case {index + 1}</div>
                    <button
                      className="text-[var(--text-muted)] hover:text-red-400"
                      type="button"
                      onClick={() => removeTestCase(testCase.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <Textarea
                    label="stdin"
                    rows={2}
                    value={testCase.stdin}
                    onChange={(event) => updateTestCase(testCase.id, 'stdin', event.target.value)}
                  />
                  <Textarea
                    label="expected_stdout"
                    rows={2}
                    value={testCase.expectedStdout}
                    onChange={(event) => updateTestCase(testCase.id, 'expectedStdout', event.target.value)}
                  />
                  <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={testCase.isHidden}
                      onChange={(event) => updateTestCase(testCase.id, 'isHidden', event.target.checked)}
                    />
                    Hidden test case
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'editor' && !isPreview && metadata.type === 'guided' && (
        <div className="space-y-6">
          <div className="glass p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Guided Blocks</h2>
            <div className="space-y-4">
              {guidedBlocks.map((block, index) => (
                <div key={block.id} className="border border-default rounded-lg p-4 bg-[var(--bg-surface)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{block.type}</div>
                    <div className="flex items-center gap-2">
                      <button
                        className="btn-icon"
                        type="button"
                        onClick={() => moveGuidedBlock(index, 'up')}
                        aria-label="Move up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        className="btn-icon"
                        type="button"
                        onClick={() => moveGuidedBlock(index, 'down')}
                        aria-label="Move down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        className="btn-icon"
                        type="button"
                        onClick={() => removeGuidedBlock(block.id)}
                        aria-label="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {block.type === 'narrative' ? (
                    <Textarea
                      rows={4}
                      value={block.content}
                      onChange={(event) => updateGuidedBlock(block.id, { content: event.target.value })}
                      placeholder="Narrative content (Markdown supported)"
                    />
                  ) : (
                    <div className="space-y-3">
                      <CodeEditor
                        value={block.starterCode}
                        onChange={(value) => updateGuidedBlock(block.id, { starterCode: value })}
                        language={metadata.language}
                        height="200px"
                      />
                      <Textarea
                        label="Expected Output"
                        rows={2}
                        value={block.expectedOutput}
                        onChange={(event) => updateGuidedBlock(block.id, { expectedOutput: event.target.value })}
                      />
                      <Textarea
                        label="Hint (optional)"
                        rows={2}
                        value={block.hint}
                        onChange={(event) => updateGuidedBlock(block.id, { hint: event.target.value })}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn-secondary" type="button" onClick={() => addGuidedBlock('narrative')}>
                <Plus size={16} /> Add Narrative
              </button>
              <button className="btn-secondary" type="button" onClick={() => addGuidedBlock('editor')}>
                <Plus size={16} /> Add Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {isPreview && (
        <div className="glass p-6 space-y-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Preview</h2>
          {metadata.type === 'challenge' ? (
            <div className="space-y-6">
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{challengeDraft.description || 'No description yet.'}</ReactMarkdown>
              </div>
              <CodeEditor
                value={challengeDraft.starterCode}
                onChange={() => {}}
                language={metadata.language}
                readOnly
                height="240px"
              />
            </div>
          ) : (
            <div className="space-y-6">
              {guidedBlocks.map((block) => (
                <div key={block.id} className="border border-default rounded-lg p-4 bg-[var(--bg-surface)]">
                  {block.type === 'narrative' ? (
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown>{block.content || 'Narrative block'}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <CodeEditor
                        value={block.starterCode}
                        onChange={() => {}}
                        language={metadata.language}
                        readOnly
                        height="180px"
                      />
                      <div className="text-xs text-[var(--text-muted)]">Expected: {block.expectedOutput || '—'}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

