import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { StatusBadge, TypeBadge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useDemoStore } from '../../store/demoStore';
import toast from 'react-hot-toast';

export function AssessmentDetailPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { assessments, courses, problems, updateAssessment, deleteAssessment, deleteProblem } = useDemoStore();
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editEndsAt, setEditEndsAt] = useState('');
  const [editDuration, setEditDuration] = useState('120');

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

  const handleDeleteProblem = (probId) => {
    if (window.confirm("Are you sure you want to delete this problem?")) {
      deleteProblem(probId);
      toast.success('Problem deleted.');
    }
  };

  if (loading) return <FullPageSpinner />;
  if (!assessment) return <div className="p-8 text-[var(--text-primary)]">Assessment not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10 px-4">
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

      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Problems</h2>
          {assessment.status !== 'ended' && (
            <Link to={`/lecturer/assessments/${assessment.id}/problems/new`} className="btn-primary">
              <Plus size={16} /> Add Problem
            </Link>
          )}
        </div>
        <div className="space-y-3">
          {assessment.problems.length > 0 ? (
            assessment.problems.map((problem) => (
              <div key={problem.id} className="border border-default rounded-lg p-4 bg-[var(--bg-surface)] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">{problem.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <TypeBadge type={problem.type} />
                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{problem.language}</span>
                  </div>
                </div>
                {assessment.status !== 'ended' && (
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/lecturer/assessments/${assessment.id}/problems/${problem.id}/edit`}
                      className="text-brand-blue hover:text-brand-purple text-sm"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteProblem(problem.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">No problems added to this assessment yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
