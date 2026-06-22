import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock, Play, ArrowLeft } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { StatusBadge, TypeBadge } from '../../components/ui/Badge';
import { CountdownTimer } from '../../components/assessment/CountdownTimer';
import useAuthStore from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';

export function AssessmentHubPage() {
  const { assessmentId } = useParams();
  const user = useAuthStore((state) => state.user);
  const { assessments, courses, problems, submissions } = useDemoStore();

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const storeAssessment = assessments.find((a) => a.id === assessmentId);
    if (!storeAssessment) {
      setAssessment(null);
      setLoading(false);
      return;
    }

    const courseObj = courses.find((c) => c.id === storeAssessment.courseId);
    const now = Date.now();
    const isEnded = new Date(storeAssessment.endsAt).getTime() <= now;
    setEnded(isEnded);

    const mappedProblems = (storeAssessment.problemIds || []).map((pId) => {
      const prob = problems[pId];
      if (!prob) return null;

      const studentSubs = submissions.filter(
        (s) => s.studentEmail.toLowerCase() === user.email.toLowerCase() && s.problemId === pId
      );

      const hasCompleted = studentSubs.some((s) => s.status === 'completed');
      const status = hasCompleted ? 'submitted' : studentSubs.length > 0 ? 'in-progress' : 'not-started';

      return {
        id: prob.id,
        title: prob.title,
        type: prob.type,
        status
      };
    }).filter(Boolean);

    setAssessment({
      id: storeAssessment.id,
      title: storeAssessment.title,
      course: courseObj ? courseObj.title : 'General Course',
      endsAt: storeAssessment.endsAt,
      problems: mappedProblems
    });
    setLoading(false);
  }, [assessmentId, assessments, courses, problems, submissions, user]);

  if (loading) return <FullPageSpinner />;
  if (!assessment) return <div className="p-8 text-[var(--text-primary)]">Assessment not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10 px-4">
      <div className="mb-2">
        <Link to="/student/dashboard" className="text-xs text-brand-blue hover:text-brand-purple flex items-center gap-1 font-mono uppercase">
          <ArrowLeft size={12} /> Dashboard
        </Link>
      </div>

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
            {ended ? (
              <button
                disabled
                className="btn-primary px-4 py-2 opacity-50 cursor-not-allowed"
              >
                Closed
              </button>
            ) : (
              <Link
                to={`/student/problems/${problem.id}?mode=assessment`}
                className="btn-primary px-4 py-2"
              >
                Attempt
              </Link>
            )}
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
