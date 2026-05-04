import { Plus, Trash2 } from 'lucide-react';
import { Textarea } from '../ui/Input';

export function AssessmentBlock({ data, onChange }) {
  const testCases = data.testCases || [{ id: 1, stdin: '', stdout: '', isHidden: false }];

  const updateTestCase = (id, field, value) => {
    const updated = testCases.map(tc => 
      tc.id === id ? { ...tc, [field]: value } : tc
    );
    onChange({ ...data, testCases: updated });
  };

  const addTestCase = () => {
    const newId = Date.now();
    onChange({ 
      ...data, 
      testCases: [...testCases, { id: newId, stdin: '', stdout: '', isHidden: false }] 
    });
  };

  const removeTestCase = (id) => {
    onChange({ 
      ...data, 
      testCases: testCases.filter(tc => tc.id !== id) 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">Verification Test Cases</h3>
        <button 
          onClick={addTestCase}
          className="btn-secondary py-1 px-3 text-xs flex items-center gap-1"
        >
          <Plus size={14} /> Add Test Case
        </button>
      </div>

      <div className="space-y-4">
        {testCases.map((tc, index) => (
          <div key={tc.id} className="p-4 rounded-lg border border-default bg-black/20 relative group">
            <button 
              onClick={() => removeTestCase(tc.id)}
              className="absolute top-2 right-2 p-1 text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
            
            <div className="text-[10px] font-bold uppercase tracking-tighter text-[var(--text-muted)] mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center border border-default">{index + 1}</span>
              Test Case
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <Textarea 
                label="Standard Input" 
                rows={2} 
                value={tc.stdin}
                onChange={(e) => updateTestCase(tc.id, 'stdin', e.target.value)}
                placeholder="Input given to the solution..."
              />
              <Textarea 
                label="Expected Output" 
                rows={2} 
                value={tc.stdout}
                onChange={(e) => updateTestCase(tc.id, 'stdout', e.target.value)}
                placeholder="Correct output expected..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id={`hidden-${tc.id}`}
                checked={tc.isHidden}
                onChange={(e) => updateTestCase(tc.id, 'isHidden', e.target.checked)}
                className="rounded border-white/20 bg-dark-800 text-brand-blue focus:ring-brand-blue/30" 
              />
              <label htmlFor={`hidden-${tc.id}`} className="text-xs text-[var(--text-secondary)]">
                Hidden from students (grading only)
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
