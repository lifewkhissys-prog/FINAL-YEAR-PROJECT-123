import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock, Play } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { StatusBadge, TypeBadge } from '../../components/ui/Badge';
import { CountdownTimer } from '../../components/assessment/CountdownTimer';

export function AssessmentHubPage() {
  const { assessmentId } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAssessment({
        id: assessmentId,
        title: 'Midterm Practical',
        course: 'Introduction to Python',
        endsAt: new Date(Date.now() + 1000 * 60 * 35).toISOString(),
        problems: [
          { id: '103', title: 'Two Sum', type: 'challenge', status: 'not-started' },
          { id: '101', title: 'SQL Murder Mystery', type: 'guided', status: 'in-progress' },
          { id: '104', title: 'Dictionary Manipulation', type: 'challenge', status: 'submitted' },
        ],
      });
      setLoading(false);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [assessmentId]);

  if (loading || !assessment) return <FullPageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">{assessment.title}</h1>
          <p className="text-sm text-[var(--text-secondary)]">{assessment.course}</p>
        </div>
        <div className="flex items-center gap-3">
          {!ended ? (
            <CountdownTimer endsAt={assessment.endsAt} onExpired={() => setEnded(true)} />
          ) : (
            <div className="px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 font-semibold text-sm">
              Time's up. This assessment has ended.
            </div>
          )}
        </div>
      </div>

      <div className="glass p-4 space-y-4">
        {assessment.problems.map((problem) => (
          <div key={problem.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-default rounded-lg p-4 bg-[var(--bg-surface)]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-default flex items-center justify-center">
                <Play size={16} className="text-brand-blue" />
              </div>
              <div>
                <div className="font-semibold text-[var(--text-primary)]">{problem.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <TypeBadge type={problem.type} />
                  <StatusBadge status={problem.status} />
                </div>
              </div>
            </div>
            <Link
              to={`/student/problems/${problem.id}?mode=assessment`}
              className={`btn-primary px-4 py-2 ${ended ? 'pointer-events-none opacity-60' : ''}`}
            >
              {ended ? 'Closed' : 'Attempt'}
            </Link>
          </div>
        ))}
      </div>

      {ended && (
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <Clock size={16} />
          <span>Your submissions are available in the results page.</span>
          <Link to={`/student/assessments/${assessment.id}/results`} className="text-brand-blue hover:text-brand-purple">View Results</Link>
        </div>
      )}
    </div>
  );
}
