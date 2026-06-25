import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, X, Check, Search, Library, AlertCircle } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { StatusBadge, TypeBadge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useDemoStore } from '../../store/demoStore';
import toast from 'react-hot-toast';

export function AssessmentDetailPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { 
    assessments, 
    courses, 
    problems, 
    updateAssessment, 
    deleteAssessment, 
    deleteProblem,
    linkProblemsToAssessment,
    unlinkProblemFromAssessment
  } = useDemoStore();
  
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editEndsAt, setEditEndsAt] = useState('');
  const [editDuration, setEditDuration] = useState('120');

  // Modal states for Problem Bank
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [modalSelectedIds, setModalSelectedIds] = useState([]);

  const systemIds = ['101', '102', '103', '104', '105', '106', '107'];

  const toDatetimeLocal = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const formatDuration = (mins) => {
    if (!mins) return 'N/A';
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (remainingMins > 0) parts.push(`${remainingMins} minute${remainingMins > 1 ? 's' : ''}`);
    return parts.join(' ');
  };

  useEffect(() => {
    const storeAssessment = assessments.find((a) => a.id === assessmentId);
    if (!storeAssessment) {
      setAssessment(null);
      setLoading(false);
      return;
    }

    const courseObj = courses.find((c) => c.id === storeAssessment.courseId);
    
    // Status
    const now = Date.now();
    const start = new Date(storeAssessment.startsAt).getTime();
    const end = new Date(storeAssessment.endsAt).getTime();
    let status = 'upcoming';
    if (now >= start && now <= end) status = 'active';
    else if (now > end) status = 'ended';

    const dateObj = new Date(storeAssessment.startsAt);
    const formattedStart = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const formattedStartTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedEndTime = new Date(storeAssessment.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const mappedProblems = (storeAssessment.problemIds || []).map((pId) => {
      const prob = problems[pId];
      if (!prob) return null;
      return {
        id: prob.id,
        title: prob.title,
        type: prob.type,
        language: prob.language || 'python'
      };
    }).filter(Boolean);

    setAssessment({
      id: storeAssessment.id,
      title: storeAssessment.title,
      course: courseObj ? courseObj.title : 'General Course',
      window: `${formattedStart}, ${formattedStartTime} - ${formattedEndTime}`,
      status,
      duration: formatDuration(storeAssessment.duration),
      problems: mappedProblems
    });
    setLoading(false);
  }, [assessmentId, assessments, courses, problems]);

  const handleStartEdit = () => {
    const storeAssessment = assessments.find((a) => a.id === assessmentId);
    if (storeAssessment) {
      setEditTitle(storeAssessment.title);
      setEditStartsAt(toDatetimeLocal(storeAssessment.startsAt));
      setEditEndsAt(toDatetimeLocal(storeAssessment.endsAt));
      setEditDuration(storeAssessment.duration || '120');
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim()) {
      toast.error('Assessment title is required.');
      return;
    }
    if (!editStartsAt || !editEndsAt) {
      toast.error('Start and end windows must be defined.');
      return;
    }
    const start = new Date(editStartsAt).getTime();
    const end = new Date(editEndsAt).getTime();
    if (end <= start) {
      toast.error('End Datetime must be strictly after Start Datetime.');
      return;
    }
    if (start < Date.now()) {
      toast('Warning: The start time of this assessment is in the past.', {
        icon: '⚠️',
      });
    }

    updateAssessment(assessment.id, {
      title: editTitle.trim(),
      startsAt: new Date(editStartsAt).toISOString(),
      endsAt: new Date(editEndsAt).toISOString(),
      duration: parseInt(editDuration) || 120,
    });
    
    toast.success('Assessment updated successfully!');
    setIsEditing(false);
  };

  const handleDeleteAssessment = () => {
    if (window.confirm("All problems in this assessment will also be removed. Delete anyway?")) {
      deleteAssessment(assessment.id);
      toast.success('Assessment deleted.');
      navigate('/lecturer/assessments');
    }
  };

  // Link & Unlink handlers
  const handleUnlinkProblem = (probId) => {
    if (window.confirm("Are you sure you want to remove this problem from this assessment? It will still remain available in the Problem Bank.")) {
      unlinkProblemFromAssessment(assessment.id, probId);
      toast.success('Problem unlinked from assessment.');
    }
  };

  const handleDeleteProblemGlobally = (probId) => {
    if (systemIds.includes(probId)) {
      toast.error('System questions cannot be deleted.');
      return;
    }
    if (window.confirm("Are you sure you want to permanently delete this custom problem from the system? This action cannot be undone and will delete it from the Problem Bank.")) {
      deleteProblem(probId);
      toast.success('Problem deleted globally.');
    }
  };

  const toggleModalSelect = (id) => {
    setModalSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleAddSelectedFromBank = () => {
    if (modalSelectedIds.length === 0) {
      toast.error('Please select at least one question.');
      return;
    }
    linkProblemsToAssessment(assessment.id, modalSelectedIds);
    toast.success(`Successfully added ${modalSelectedIds.length} question(s) to assessment.`);
    setModalSelectedIds([]);
    setIsBankModalOpen(false);
  };

  if (loading) return <FullPageSpinner />;
  if (!assessment) return <div className="p-8 text-[var(--text-primary)]">Assessment not found.</div>;

  // Filter bank problems to show only ones that aren't already linked to this assessment
  const currentProblemIds = assessment.problems.map((p) => p.id);
  const bankProblems = Object.values(problems).filter((p) => !currentProblemIds.includes(p.id));
  const filteredBankProblems = bankProblems.filter((p) =>
    p.title.toLowerCase().includes(bankSearch.toLowerCase()) ||
    (p.tags || '').toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10 px-4 relative">
      <div>
        <Link to="/lecturer/assessments" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Assessments
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4 max-w-xl glass p-4 rounded-lg mt-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-blue">Edit Assessment</h3>
                <Input 
                  label="Title" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Start Date & Time" 
                    type="datetime-local" 
                    value={editStartsAt}
                    onChange={(e) => setEditStartsAt(e.target.value)}
                  />
                  <Input 
                    label="End Date & Time" 
                    type="datetime-local" 
                    value={editEndsAt}
                    onChange={(e) => setEditEndsAt(e.target.value)}
                  />
                </div>
                <Input 
                  label="Duration (minutes)" 
                  type="number" 
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="btn-success btn-sm">
                    <Check size={14} /> Save
                  </button>
                  <button onClick={() => setIsEditing(false)} className="btn-secondary btn-sm">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">{assessment.title}</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {assessment.course} • Window: {assessment.window} • Duration: {assessment.duration}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={assessment.status} />
            <Link to={`/lecturer/assessments/${assessment.id}/gradebook`} className="btn-primary">View Gradebook</Link>
            {assessment.status !== 'ended' && !isEditing && (
              <>
                <button onClick={handleStartEdit} className="btn-secondary flex items-center gap-1">
                  <Edit size={14} /> Edit
                </button>
                <button onClick={handleDeleteAssessment} className="btn-danger flex items-center gap-1 bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30">
                  <Trash2 size={14} /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {assessment.status === 'ended' && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg text-sm">
          This assessment has ended and cannot be edited.
        </div>
      )}

      {/* Linked Problems Board */}
      <div className="glass p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Problems in Assessment</h2>
          {assessment.status !== 'ended' && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsBankModalOpen(true)}
                className="btn-secondary flex items-center gap-1.5 text-xs text-brand-blue border-brand-blue/20 hover:bg-brand-blue/5"
              >
                <Library size={14} /> Select from Bank
              </button>
              <Link to={`/lecturer/assessments/${assessment.id}/problems/new`} className="btn-primary flex items-center gap-1.5 text-xs">
                <Plus size={14} /> Create Custom Problem
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {assessment.problems.length > 0 ? (
            assessment.problems.map((problem) => {
              const isSystem = systemIds.includes(problem.id);
              return (
                <div key={problem.id} className="border border-default rounded-lg p-4 bg-[var(--bg-surface)] flex items-center justify-between hover:border-white/10 transition-colors">
                  <div>
                    <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      {problem.title}
                      <span className="text-[9px] uppercase font-mono text-[var(--text-muted)] tracking-wider">
                        {isSystem ? '• System' : '• Custom'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <TypeBadge type={problem.type} />
                      <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{problem.language}</span>
                    </div>
                  </div>
                  {assessment.status !== 'ended' && (
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/lecturer/assessments/${assessment.id}/problems/${problem.id}/edit`}
                        className="text-brand-blue hover:text-brand-purple text-xs font-semibold"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleUnlinkProblem(problem.id)}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold"
                        title="Remove from this assessment only"
                      >
                        Remove
                      </button>
                      {!isSystem && (
                        <button
                          onClick={() => handleDeleteProblemGlobally(problem.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-semibold"
                          title="Delete permanently from store"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-lg border border-dashed border-default">
              No problems added to this assessment yet. Click "Select from Bank" or "Create Custom Problem" to get started.
            </div>
          )}
        </div>
      </div>

      {/* Select from Bank Dialog Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass w-full max-w-2xl max-h-[85vh] rounded-xl overflow-hidden flex flex-col shadow-2xl border border-white/15">
            {/* Modal Header */}
            <div className="p-4 border-b border-default flex items-center justify-between bg-dark-900/50">
              <div className="flex items-center gap-2">
                <Library className="text-brand-blue" size={20} />
                <h3 className="font-bold text-[var(--text-primary)]">Select Questions from Bank</h3>
              </div>
              <button 
                onClick={() => {
                  setModalSelectedIds([]);
                  setIsBankModalOpen(false);
                }} 
                className="p-1 hover:bg-white/5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Filters */}
            <div className="p-4 border-b border-default bg-dark-950/20">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search questions by title or tag..."
                  className="input pl-10 w-full text-sm py-1.5"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Modal List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px] max-h-[400px]">
              {filteredBankProblems.length > 0 ? (
                filteredBankProblems.map((prob) => {
                  const isSelected = modalSelectedIds.includes(prob.id);
                  const isSystem = systemIds.includes(prob.id);
                  let displayType = prob.type || 'coding';
                  if (prob.type === 'challenge') displayType = 'coding';
                  if (prob.type === 'guided') {
                    displayType = prob.language === 'sql' ? 'sql_problem' : 'coding';
                  }

                  return (
                    <div 
                      key={prob.id}
                      onClick={() => toggleModalSelect(prob.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'border-brand-blue bg-brand-blue/5' 
                          : 'border-default bg-[var(--bg-surface)] hover:border-white/10'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                          {prob.title}
                          <span className="text-[9px] uppercase font-mono text-[var(--text-muted)]">
                            {isSystem ? 'System' : 'Custom'}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] line-clamp-1">
                          {prob.description || prob.prompt || 'No description.'}
                        </div>
                        <div className="flex gap-2">
                          <span className="text-[10px] text-brand-blue uppercase font-mono">{displayType}</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">{(prob.difficulty || 'easy').toUpperCase()}</span>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                        isSelected ? 'bg-brand-blue border-brand-blue text-white' : 'border-default text-transparent'
                      }`}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 space-y-2 text-[var(--text-muted)]">
                  <AlertCircle className="mx-auto" size={24} />
                  <p className="text-sm">No available questions found in the Problem Bank.</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-default flex justify-end gap-3 bg-dark-900/50">
              <button 
                onClick={() => {
                  setModalSelectedIds([]);
                  setIsBankModalOpen(false);
                }} 
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddSelectedFromBank}
                disabled={modalSelectedIds.length === 0}
                className="btn-primary text-xs flex items-center gap-1"
              >
                <Check size={14} /> Add Selected ({modalSelectedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

