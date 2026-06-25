import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Plus, Edit, Trash2, HelpCircle, Code2, Database, 
  Sparkles, Filter, Check, BookOpen, AlertCircle, RefreshCw 
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useDemoStore } from '../../store/demoStore';
import toast from 'react-hot-toast';

export function ProblemBankPage() {
  const { problems, deleteProblem } = useDemoStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedMode, setSelectedMode] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedOrigin, setSelectedOrigin] = useState('all');

  const systemIds = ['101', '102', '103', '104', '105', '106', '107'];

  const allProblems = Object.values(problems);

  // Stats
  const totalCount = allProblems.length;
  const customCount = allProblems.filter(p => !systemIds.includes(p.id)).length;
  const systemCount = totalCount - customCount;

  // Filtering
  const filteredProblems = allProblems.filter((p) => {
    const isSystem = systemIds.includes(p.id);
    const originMatches = 
      selectedOrigin === 'all' || 
      (selectedOrigin === 'system' && isSystem) || 
      (selectedOrigin === 'custom' && !isSystem);

    const matchesSearch = 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.tags || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Normalize type mappings:
    // Some mock data has type 'challenge' or 'guided', but in our builder
    // type is 'coding', 'mcq', 'short_answer', or 'sql_problem'.
    let displayType = p.type || 'coding';
    if (p.type === 'challenge') displayType = 'coding';
    if (p.type === 'guided') {
      if (p.language === 'sql') displayType = 'sql_problem';
      else displayType = 'coding';
    }

    const typeMatches = selectedType === 'all' || displayType === selectedType;

    const modeMatches = 
      selectedMode === 'all' || 
      (p.interactionMode || (p.type === 'guided' ? 'guided' : 'direct')) === selectedMode;

    const diffMatches = 
      selectedDifficulty === 'all' || 
      (p.difficulty || 'easy').toLowerCase() === selectedDifficulty.toLowerCase();

    return originMatches && matchesSearch && typeMatches && modeMatches && diffMatches;
  });

  const handleDelete = (id) => {
    if (systemIds.includes(id)) {
      toast.error('System questions cannot be deleted.');
      return;
    }
    if (window.confirm('Are you sure you want to permanently delete this custom question? It will be removed from all scheduled assessments.')) {
      deleteProblem(id);
      toast.success('Question deleted successfully.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 px-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Problem Bank</h1>
          <p className="text-sm text-[var(--text-secondary)]">Create and manage your question library to build assessments.</p>
        </div>
        <Link to="/lecturer/problems/new" className="btn-primary flex items-center gap-1.5 self-start md:self-auto">
          <Plus size={16} /> Create Custom Problem
        </Link>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass p-4 rounded-lg flex flex-col justify-between">
          <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">Total Bank Size</span>
          <span className="text-3xl font-extrabold text-[var(--text-primary)] mt-1">{totalCount}</span>
        </div>
        <div className="glass p-4 rounded-lg flex flex-col justify-between">
          <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">Pre-seeded (LeetCode/SQL)</span>
          <span className="text-3xl font-extrabold text-brand-blue mt-1">{systemCount}</span>
        </div>
        <div className="glass p-4 rounded-lg flex flex-col justify-between">
          <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">Custom Authored</span>
          <span className="text-3xl font-extrabold text-brand-purple mt-1">{customCount}</span>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="glass p-4 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search Box */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by title, tags, or description..."
              className="input pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Reset Filters */}
          {(selectedType !== 'all' || selectedMode !== 'all' || selectedDifficulty !== 'all' || selectedOrigin !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('all');
                setSelectedMode('all');
                setSelectedDifficulty('all');
                setSelectedOrigin('all');
              }}
              className="text-xs text-brand-blue hover:underline flex items-center gap-1 shrink-0"
            >
              <RefreshCw size={12} /> Clear all filters
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="select w-full py-1 text-xs"
            >
              <option value="all">All Types</option>
              <option value="coding">Coding Challenge</option>
              <option value="mcq">Multiple Choice</option>
              <option value="short_answer">Short Answer</option>
              <option value="sql_problem">SQL / Databases</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">Interaction Mode</label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="select w-full py-1 text-xs"
            >
              <option value="all">All Modes</option>
              <option value="direct">Direct Submission</option>
              <option value="guided">Guided Steps</option>
              <option value="exploratory">Exploratory Sandbox</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="select w-full py-1 text-xs"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">Origin</label>
            <select
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="select w-full py-1 text-xs"
            >
              <option value="all">All Origins</option>
              <option value="system">System Seeding</option>
              <option value="custom">Lecturer Custom</option>
            </select>
          </div>
        </div>
      </div>

      {/* Problems Display Grid */}
      {filteredProblems.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProblems.map((prob) => {
            const isSystem = systemIds.includes(prob.id);
            const difficulty = (prob.difficulty || 'easy').toLowerCase();
            const tagsList = prob.tags ? prob.tags.split(',').map(t => t.trim()) : [];

            // Display normalization
            let displayType = prob.type || 'coding';
            if (prob.type === 'challenge') displayType = 'coding';
            if (prob.type === 'guided') {
              displayType = prob.language === 'sql' ? 'sql_problem' : 'coding';
            }

            const interactionMode = prob.interactionMode || (prob.type === 'guided' ? 'guided' : 'direct');

            // Type styles
            const typeLabels = {
              coding: { label: 'Coding Challenge', color: 'blue' },
              mcq: { label: 'Multiple Choice', color: 'green' },
              short_answer: { label: 'Short Answer', color: 'yellow' },
              sql_problem: { label: 'SQL Database', color: 'purple' }
            };

            const typeConfig = typeLabels[displayType] || { label: displayType, color: 'gray' };

            // Difficulty Colors
            const diffColors = {
              easy: 'badge-green',
              medium: 'badge-yellow',
              hard: 'badge-red'
            };

            return (
              <Card key={prob.id} hover className="flex flex-col justify-between border-default bg-[var(--bg-surface)] relative group">
                <div>
                  {/* Badges row */}
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-default tracking-wider bg-white/5 text-[var(--text-secondary)]`}>
                      {isSystem ? '💻 System' : '✨ Custom'}
                    </span>
                    <div className="flex gap-1">
                      <span className={`badge text-[10px] ${diffColors[difficulty] || 'badge-gray'}`}>
                        {difficulty.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-[var(--text-primary)] text-md line-clamp-1 mb-2">
                    {prob.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 mb-4">
                    {prob.description || prob.prompt || 'No description provided.'}
                  </p>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <Badge variant={typeConfig.color}>{typeConfig.label}</Badge>
                    <Badge variant="gray">{interactionMode}</Badge>
                    {prob.language && (
                      <Badge variant="blue" className="uppercase font-mono text-[9px]">{prob.language}</Badge>
                    )}
                  </div>
                </div>

                {/* Footer and Actions */}
                <div className="border-t border-default pt-3 mt-auto flex items-center justify-between text-xs">
                  <div className="flex gap-1">
                    {tagsList.slice(0, 2).map((t, i) => (
                      <span key={i} className="text-[10px] text-[var(--text-muted)] font-mono">#{t}</span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      to={isSystem ? `/lecturer/problems/${prob.id}/edit` : `/lecturer/problems/${prob.id}/edit`}
                      className="p-1.5 text-brand-blue hover:text-brand-purple hover:bg-white/5 rounded transition-colors"
                      title={isSystem ? 'View Schema/Template' : 'Edit Question'}
                    >
                      <Edit size={14} />
                    </Link>
                    {!isSystem && (
                      <button
                        onClick={() => handleDelete(prob.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-white/5 rounded transition-colors"
                        title="Delete Question"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="glass p-12 text-center rounded-lg space-y-3">
          <AlertCircle className="mx-auto text-[var(--text-muted)]" size={32} />
          <h3 className="font-semibold text-lg text-[var(--text-primary)]">No questions match your criteria</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Try adjusting your search query, difficulty level, or selection filters to browse the question bank.
          </p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setSelectedType('all');
              setSelectedMode('all');
              setSelectedDifficulty('all');
              setSelectedOrigin('all');
            }}
            className="btn-secondary text-xs"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
