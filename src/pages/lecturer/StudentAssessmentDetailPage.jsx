import { useMemo, useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { SubmissionPanel } from '../../components/problems/SubmissionPanel';

export function StudentAssessmentDetailPage() {
  const { assessmentId, userId } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setStudent({
        id: userId,
        name: 'Ankomah Kelvin',
        email: 'ankomah@uni.edu',
        assessment: 'Midterm Practical',
        submissions: [
          {
            id: 's1',
            problemId: 'p1',
            problem: 'Two Sum',
            language: 'Python',
            submittedAt: '10:45 AM',
            scoreLabel: '1/2',
            result: {
              status: 'completed',
              score: 1,
              totalCases: 2,
              results: [
                { id: 1, passed: true, exec_time_ms: 12, actual_output: '[0, 1]', expected_output: '[0, 1]', is_hidden: false },
                { id: 2, passed: false, exec_time_ms: 15, actual_output: '[]', expected_output: '[1, 2]', is_hidden: true },
              ],
            },
          },
          {
            id: 's2',
            problemId: 'p1',
            problem: 'Two Sum',
            language: 'Python',
            submittedAt: '10:12 AM',
            scoreLabel: '0/2',
            result: {
              status: 'error',
              score: 0,
              totalCases: 2,
              stderr: 'RuntimeError: index out of range',
              results: [],
            },
          },
          {
            id: 's3',
            problemId: 'p2',
            problem: 'SQL Murder Mystery',
            language: 'SQL',
            submittedAt: '09:58 AM',
            scoreLabel: '4/5',
            result: {
              status: 'completed',
              score: 4,
              totalCases: 5,
              results: [
                { id: 1, passed: true, exec_time_ms: 9, actual_output: 'OK', expected_output: 'OK', is_hidden: false },
                { id: 2, passed: true, exec_time_ms: 11, actual_output: 'OK', expected_output: 'OK', is_hidden: false },
                { id: 3, passed: true, exec_time_ms: 8, actual_output: 'OK', expected_output: 'OK', is_hidden: false },
                { id: 4, passed: false, exec_time_ms: 12, actual_output: 'Missing row', expected_output: 'OK', is_hidden: false },
                { id: 5, passed: true, exec_time_ms: 10, actual_output: '', expected_output: '', is_hidden: true },
              ],
            },
          },
        ],
      });
      setLoading(false);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [assessmentId, userId]);

  const activeProblemId = new URLSearchParams(location.search).get('problemId');

  const filteredSubmissions = useMemo(() => {
    if (!student) return [];
    if (!activeProblemId) return student.submissions;
    return student.submissions.filter((submission) => submission.problemId === activeProblemId);
  }, [student, activeProblemId]);

  useEffect(() => {
    if (!filteredSubmissions.length) return;
    setExpandedSubmissionId(filteredSubmissions[0].id);
  }, [filteredSubmissions]);

  if (loading || !student) return <FullPageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <Link to={`/lecturer/assessments/${assessmentId}/gradebook`} className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Gradebook
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{student.name}</h1>
        <p className="text-sm text-[var(--text-secondary)]">{student.email} • {student.assessment}</p>
      </div>

      {filteredSubmissions.map((submission) => (
        <div key={submission.id} className="glass overflow-hidden">
          <button
            className="w-full p-4 border-b border-default text-left flex items-center justify-between"
            onClick={() => setExpandedSubmissionId((prev) => (prev === submission.id ? null : submission.id))}
            type="button"
          >
            <div>
              <div className="font-semibold text-[var(--text-primary)]">{submission.problem}</div>
              <div className="text-xs text-[var(--text-muted)]">Submitted {submission.submittedAt} • {submission.language} • {submission.scoreLabel}</div>
            </div>
            <span className="text-xs text-[var(--text-muted)]">{expandedSubmissionId === submission.id ? 'Hide' : 'View'}</span>
          </button>
          {expandedSubmissionId === submission.id && (
            <div className="h-64">
              <SubmissionPanel submission={submission.result} isLoading={false} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
