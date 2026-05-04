import { useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  Type, 
  Code, 
  ShieldCheck, 
  Settings,
  Eye,
  Layout,
  Loader2
} from 'lucide-react';
import { Reorder, AnimatePresence } from 'framer-motion';
import { Input, Select } from '../../components/ui/Input';
import { BlockWrapper } from '../../components/authoring/BlockWrapper';
import { NarrativeBlock } from '../../components/authoring/NarrativeBlock';
import { CodeStarterBlock } from '../../components/authoring/CodeStarterBlock';
import { AssessmentBlock } from '../../components/authoring/AssessmentBlock';
import { ProblemPreview } from '../../components/authoring/ProblemPreview';
import { useProblemStore } from '../../store/problemStore';

export function ProblemAuthorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [isPreview, setIsPreview] = useState(false);
  const { saveProblem, loading } = useProblemStore();
  
  // Global Metadata
  const [metadata, setMetadata] = useState({
    title: '',
    language: 'python',
    timeLimit: 2000,
    memoryLimit: 256,
    difficulty: 'medium'
  });

  // Dynamic Blocks
  const [blocks, setBlocks] = useState([
    { id: '1', type: 'narrative', data: { content: '# Problem Title\nDescribe your problem here...' } },
    { id: '2', type: 'code', data: { code: 'def solution():\n    pass' } },
    { id: '3', type: 'assessment', data: { testCases: [{ id: 1, stdin: '', stdout: '', isHidden: false }] } }
  ]);

  const addBlock = (type) => {
    const newBlock = {
      id: Date.now().toString(),
      type,
      data: type === 'narrative' ? { content: '' } : 
            type === 'code' ? { code: '' } : 
            { testCases: [{ id: Date.now(), stdin: '', stdout: '', isHidden: false }] }
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id, newData) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, data: newData } : b));
  };

  const removeBlock = (id) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const handleDeploy = async () => {
    try {
      const problemData = {
        id,
        metadata,
        blocks,
        status: 'published'
      };
      const saved = await saveProblem(problemData);
      if (!isEditing) {
        navigate(`/lecturer/problems/${saved.id}`);
      }
      alert('Problem deployed successfully!');
    } catch (error) {
      alert('Failed to deploy problem: ' + error.message);
    }
  };

  const renderBlock = (block) => {
    switch (block.type) {
      case 'narrative':
        return <NarrativeBlock data={block.data} onChange={(data) => updateBlock(block.id, data)} />;
      case 'code':
        return <CodeStarterBlock data={block.data} language={metadata.language} onChange={(data) => updateBlock(block.id, data)} />;
      case 'assessment':
        return <AssessmentBlock data={block.data} onChange={(data) => updateBlock(block.id, data)} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 z-20 bg-[var(--bg-app)]/80 backdrop-blur-md py-4 border-b border-default">
        <div className="flex items-center gap-6">
          <Link to="/lecturer/problems" className="p-2 hover:bg-white/5 rounded-full transition-colors text-[var(--text-secondary)]">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {isPreview ? 'Problem Preview' : (isEditing ? 'Edit Problem' : 'New Narrative Problem')}
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
              onClick={handleDeploy}
              disabled={loading}
              className="btn-primary px-6 h-10 flex items-center gap-2 shadow-lg shadow-brand-blue/20 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEditing ? 'Update Problem' : 'Deploy Problem'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isPreview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full"
          >
            <ProblemPreview blocks={blocks} metadata={metadata} />
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid lg:grid-cols-4 gap-8"
          >
            {/* Main Editor */}
            <div className="lg:col-span-3 space-y-6">
              {/* Metadata Section */}
              <div className="glass p-6 space-y-4 border-l-4 border-brand-blue">
                <div className="flex items-center gap-2 mb-2">
                  <Settings size={16} className="text-brand-blue" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">Global Configuration</h2>
                </div>
                <Input 
                  label="Problem Title" 
                  placeholder="e.g. Structural Engineering Fundamentals" 
                  value={metadata.title}
                  onChange={(e) => setMetadata({...metadata, title: e.target.value})}
                />
                <div className="grid grid-cols-3 gap-4">
                  <Select 
                    label="Environment" 
                    value={metadata.language}
                    onChange={(e) => setMetadata({...metadata, language: e.target.value})}
                    options={[
                      { value: 'python', label: 'Python 3.11' },
                      { value: 'java', label: 'OpenJDK 17' },
                      { value: 'cpp', label: 'GCC 11' },
                      { value: 'sql', label: 'PostgreSQL 15' },
                    ]}
                  />
                  <Select 
                    label="Difficulty" 
                    value={metadata.difficulty}
                    onChange={(e) => setMetadata({...metadata, difficulty: e.target.value})}
                    options={[
                      { value: 'easy', label: 'Beginner' },
                      { value: 'medium', label: 'Intermediate' },
                      { value: 'hard', label: 'Advanced' },
                    ]}
                  />
                  <Input 
                    label="Points" 
                    type="number" 
                    defaultValue={100}
                  />
                </div>
              </div>

              {/* Blocks Builder */}
              <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="space-y-4">
                {blocks.map((block) => (
                  <Reorder.Item key={block.id} value={block} dragListener={false}>
                    <BlockWrapper 
                      id={block.id} 
                      title={block.type} 
                      onRemove={() => removeBlock(block.id)}
                    >
                      {renderBlock(block)}
                    </BlockWrapper>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              {/* Add Block Actions */}
              <div className="flex items-center justify-center gap-4 py-10 border-2 border-dashed border-default rounded-xl bg-white/[0.02]">
                <button onClick={() => addBlock('narrative')} className="flex flex-col items-center gap-2 p-4 hover:bg-white/5 rounded-lg transition-all text-[var(--text-secondary)] hover:text-brand-blue group">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-default flex items-center justify-center group-hover:border-brand-blue group-hover:bg-brand-blue/10 transition-all">
                    <Type size={20} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-tighter">Add Narrative</span>
                </button>
                
                <button onClick={() => addBlock('code')} className="flex flex-col items-center gap-2 p-4 hover:bg-white/5 rounded-lg transition-all text-[var(--text-secondary)] hover:text-brand-blue group">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-default flex items-center justify-center group-hover:border-brand-blue group-hover:bg-brand-blue/10 transition-all">
                    <Code size={20} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-tighter">Add Code Starter</span>
                </button>

                <button onClick={() => addBlock('assessment')} className="flex flex-col items-center gap-2 p-4 hover:bg-white/5 rounded-lg transition-all text-[var(--text-secondary)] hover:text-brand-blue group">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-default flex items-center justify-center group-hover:border-brand-blue group-hover:bg-brand-blue/10 transition-all">
                    <ShieldCheck size={20} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-tighter">Add Assessment</span>
                </button>
              </div>
            </div>

            {/* Sidebar Controls */}
            <div className="space-y-6">
              {/* Complexity Widget */}
              <div className="glass p-5 border-t-2 border-brand-blue bg-brand-blue/[0.02]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center justify-between">
                  Complexity Engine
                  <span className="text-[10px] bg-brand-blue/20 text-brand-blue px-2 py-0.5 rounded">v1.0</span>
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-3xl font-black text-[var(--text-primary)]">
                        {Math.min(100, (blocks.length * 15) + (blocks.filter(b => b.type === 'assessment').reduce((acc, b) => acc + (b.data.testCases?.length || 0), 0) * 10))}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Problem Score</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-brand-blue">
                        {metadata.difficulty === 'hard' ? 'MAX_LOAD' : metadata.difficulty === 'medium' ? 'STABLE' : 'LIGHT'}
                      </div>
                      <div className="w-24 h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
                        <motion.div 
                          className="h-full bg-brand-blue" 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (blocks.length * 15))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass p-4 space-y-4 sticky top-24">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <Settings size={14} /> Execution Limits
                </h3>
                <div className="space-y-3">
                  <Input 
                    label="Time Limit (ms)" 
                    type="number" 
                    value={metadata.timeLimit}
                    onChange={(e) => setMetadata({...metadata, timeLimit: parseInt(e.target.value)})}
                  />
                  <Input 
                    label="Memory Limit (MB)" 
                    type="number" 
                    value={metadata.memoryLimit}
                    onChange={(e) => setMetadata({...metadata, memoryLimit: parseInt(e.target.value)})}
                  />
                </div>
                
                <div className="pt-4 border-t border-default space-y-4">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                      Validation Checklist
                    </h3>
                    <div className="space-y-2">
                      {[
                        { label: 'Title set', pass: !!metadata.title },
                        { label: 'Narrative content', pass: blocks.some(b => b.type === 'narrative' && b.data.content?.length > 10) },
                        { label: 'Assessment defined', pass: blocks.some(b => b.type === 'assessment' && b.data.testCases?.length > 0) },
                        { label: 'Starter code provided', pass: blocks.some(b => b.type === 'code' && b.data.code?.length > 0) }
                      ].map((check, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                          <div className={`w-3 h-3 rounded-sm border ${check.pass ? 'bg-green-500/20 border-green-500 text-green-500' : 'border-default text-transparent'} flex items-center justify-center`}>
                            {check.pass && '✓'}
                          </div>
                          <span className={check.pass ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)] italic'}>
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                      Problem Stats
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded bg-white/5 border border-default">
                        <div className="text-lg font-bold text-brand-blue">{blocks.length}</div>
                        <div className="text-[10px] text-[var(--text-muted)] uppercase">Total Blocks</div>
                      </div>
                      <div className="p-3 rounded bg-white/5 border border-default">
                        <div className="text-lg font-bold text-brand-blue">
                          {blocks.filter(b => b.type === 'assessment').reduce((acc, b) => acc + (b.data.testCases?.length || 0), 0)}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] uppercase">Test Cases</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

