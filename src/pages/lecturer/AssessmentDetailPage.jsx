import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { StatusBadge, TypeBadge } from '../../components/ui/Badge';

export function AssessmentDetailPage() {
  const { assessmentId } = useParams();
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAssessment({
        id: assessmentId,
        title: 'Midterm Practical',
        course: 'Introduction to Python',
        window: 'Today, 10:00 - 12:00',
        status: 'active',
        problems: [
          { id: '103', title: 'Two Sum', type: 'challenge', language: 'Python' },
          { id: '101', title: 'SQL Murder Mystery', type: 'guided', language: 'SQL' },
        ],
      });
      setLoading(false);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [assessmentId]);

  if (loading || !assessment) return <FullPageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <Link to="/lecturer/assessments" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Assessments
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">{assessment.title}</h1>
            <p className="text-sm text-[var(--text-secondary)]">{assessment.course} • {assessment.window}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={assessment.status} />
            <Link to={`/lecturer/assessments/${assessment.id}/gradebook`} className="btn-primary">View Gradebook</Link>
          </div>
        </div>
      </div>

      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Problems</h2>
          <Link to={`/lecturer/assessments/${assessment.id}/problems/new`} className="btn-primary">
            <Plus size={16} /> Add Problem
          </Link>
        </div>
        <div className="space-y-3">
          {assessment.problems.map((problem) => (
            <div key={problem.id} className="border border-default rounded-lg p-4 bg-[var(--bg-surface)] flex items-center justify-between">
              <div>
                <div className="font-semibold text-[var(--text-primary)]">{problem.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <TypeBadge type={problem.type} />
                  <span className="text-xs text-[var(--text-muted)]">{problem.language}</span>
                </div>
              </div>
              <Link
                to={`/lecturer/assessments/${assessment.id}/problems/${problem.id}/edit`}
                className="text-brand-blue hover:text-brand-purple"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
