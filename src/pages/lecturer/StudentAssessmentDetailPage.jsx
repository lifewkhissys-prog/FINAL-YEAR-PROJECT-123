import { useMemo, useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { SubmissionPanel } from '../../components/problems/SubmissionPanel';
import { useDemoStore } from '../../store/demoStore';

export function StudentAssessmentDetailPage() {
  const { assessmentId, userId } = useParams(); // userId is studentEmail
  const location = useLocation();
  const { assessments, studentsList, submissions, problems } = useDemoStore();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState(null);

  useEffect(() => {
    const storeAssessment = assessments.find((a) => a.id === assessmentId);
    const studentInfo = studentsList.find((s) => s.email.toLowerCase() === userId.toLowerCase()) || {
      email: userId,
      name: userId.split('@')[0]
    };

    const assessmentTitle = storeAssessment ? storeAssessment.title : 'Assessment';

    // Get student's submissions for this assessment
    const studentSubs = submissions.filter(
      (s) =>
        s.studentEmail.toLowerCase() === userId.toLowerCase() &&
        s.assessmentId === assessmentId
    );

    // Sort submissions by time desc
    const sortedSubs = [...studentSubs].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    const mapped = sortedSubs.map((s) => {
      const prob = problems[s.problemId];
      const total = prob && prob.testCases ? prob.testCases.length : 1;
      const passed = s.testCases
        ? s.testCases.filter((tc) => tc.status === 'passed').length
        : (s.status === 'completed' ? 1 : 0);

      const formattedTime = new Date(s.submittedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }) + ' on ' + new Date(s.submittedAt).toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
      });

      const submissionPanelData = {
        status: s.status,
        score: passed,
        totalCases: total,
        stderr: s.error,
        code: s.code || '# No code submitted',
        results: (s.testCases || []).map((t, idx) => ({
          id: t.id || idx,
          passed: t.status === 'passed',
          stdin: 'Sample Input',
          expected_output: 'Expected Output',
          actual_output: t.status === 'passed' ? 'Expected Output' : (s.error || 'Output mismatch'),
          exec_time_ms: parseInt(t.executionTime) || 12,
          is_hidden: false
        }))
      };

      return {
        id: s.id,
        problemId: s.problemId,
        problem: s.problemTitle || (prob ? prob.title : 'Problem'),
        language: s.language || 'Python',
        submittedAt: formattedTime,
        scoreLabel: `${passed}/${total}`,
        result: submissionPanelData
      };
    });

    setStudent({
      id: userId,
      name: studentInfo.name,
      email: studentInfo.email,
      assessment: assessmentTitle,
      submissions: mapped
    });
    setLoading(false);
  }, [assessmentId, userId, assessments, studentsList, submissions, problems]);

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
    <div className="space-y-6 animate-fade-in pb-10 px-4">
      <div>
        <Link to={`/lecturer/assessments/${assessmentId}/gradebook`} className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Gradebook
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{student.name}</h1>
        <p className="text-sm text-[var(--text-secondary)]">{student.email} • {student.assessment}</p>
      </div>

      {filteredSubmissions.length > 0 ? (
        filteredSubmissions.map((submission) => (
          <div key={submission.id} className="glass overflow-hidden border border-default rounded-xl">
            <button
              className="w-full p-4 border-b border-default text-left flex items-center justify-between hover:bg-white/[0.02]"
              onClick={() => setExpandedSubmissionId((prev) => (prev === submission.id ? null : submission.id))}
              type="button"
            >
              <div>
                <div className="font-semibold text-[var(--text-primary)]">{submission.problem}</div>
                <div className="text-xs text-[var(--text-muted)]">Submitted {submission.submittedAt} • {submission.language} • {submission.scoreLabel}</div>
              </div>
              <span className="text-xs text-brand-blue font-mono">{expandedSubmissionId === submission.id ? 'Collapse' : 'Expand'}</span>
            </button>
            {expandedSubmissionId === submission.id && (
              <div className="min-h-[380px] p-2 bg-[var(--bg-primary)]">
                <SubmissionPanel submission={submission.result} isLoading={false} />
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="p-8 text-center text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-xl border border-default">
          No submissions found for this filter.
        </div>
      )}
    </div>
  );
}
