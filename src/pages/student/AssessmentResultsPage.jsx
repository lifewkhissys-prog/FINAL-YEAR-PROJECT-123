import { Fragment, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { SubmissionPanel } from '../../components/problems/SubmissionPanel';
import useAuthStore from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';

export function AssessmentResultsPage() {
  const { assessmentId } = useParams();
  const user = useAuthStore((state) => state.user);
  const { assessments, courses, problems, submissions } = useDemoStore();

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [expandedProblemId, setExpandedProblemId] = useState(null);

  useEffect(() => {
    if (!user) return;

    const storeAssessment = assessments.find((a) => a.id === assessmentId);
    if (!storeAssessment) {
      setResults(null);
      setLoading(false);
      return;
    }

    const courseObj = courses.find((c) => c.id === storeAssessment.courseId);

    let overallPassed = 0;
    let overallTotal = 0;

    const mappedProblems = (storeAssessment.problemIds || []).map((pId) => {
      const prob = problems[pId];
      if (!prob) return null;

      const totalCases = prob.testCases ? prob.testCases.length : 1;
      
      // Find student's submissions for this problem
      const studentSubs = submissions.filter(
        (s) => s.studentEmail.toLowerCase() === user.email.toLowerCase() && s.problemId === pId
      );

      // Find the submission with highest score
      let bestSub = null;
      let maxPassed = 0;

      studentSubs.forEach((sub) => {
        const passed = sub.testCases ? sub.testCases.filter((tc) => tc.status === 'passed').length : (sub.status === 'completed' ? 1 : 0);
        if (passed >= maxPassed) {
          maxPassed = passed;
          bestSub = sub;
        }
      });

      overallPassed += maxPassed;
      overallTotal += totalCases;

      const scoreLabel = `${maxPassed}/${totalCases}`;
      const status = bestSub && bestSub.status === 'completed' && maxPassed === totalCases ? 'accepted' : 'wrong';

      const submissionPanelData = bestSub
        ? {
            status: bestSub.status,
            score: maxPassed,
            totalCases: totalCases,
            stderr: bestSub.error,
            results: (bestSub.testCases || []).map((t, idx) => ({
              id: t.id || idx,
              passed: t.status === 'passed',
              stdin: 'Sample stdin',
              expected_output: 'Expected output',
              actual_output: t.status === 'passed' ? 'Expected output' : (bestSub.error || 'Output mismatch'),
              exec_time_ms: parseInt(t.executionTime) || 12,
              is_hidden: false
            }))
          }
        : {
            status: 'not_started',
            score: 0,
            totalCases: totalCases,
            results: []
          };

      return {
        id: prob.id,
        title: prob.title,
        score: scoreLabel,
        status,
        submission: submissionPanelData
      };
    }).filter(Boolean);

    setResults({
      id: storeAssessment.id,
      title: storeAssessment.title,
      course: courseObj ? courseObj.title : 'General Course',
      score: `${overallPassed} / ${overallTotal} test cases passed`,
      problems: mappedProblems
    });
    setLoading(false);
  }, [assessmentId, assessments, courses, problems, submissions, user]);

  if (loading) return <FullPageSpinner />;
  if (!results) return <div className="p-8 text-[var(--text-primary)]">Results not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10 px-4">
      <div className="mb-2">
        <Link to="/student/dashboard" className="text-xs text-brand-blue hover:text-brand-purple flex items-center gap-1 font-mono uppercase">
          <ArrowLeft size={12} /> Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Assessment Results</h1>
        <p className="text-sm text-[var(--text-secondary)]">{results.title} • {results.course}</p>
      </div>

      <div className="glass p-5">
        <div className="text-sm text-[var(--text-secondary)] uppercase tracking-widest mb-2">Overall Score</div>
        <div className="text-2xl font-bold text-[var(--text-primary)]">{results.score}</div>
      </div>

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-dark-800/50 text-[var(--text-secondary)] border-b border-default uppercase text-xs tracking-wider">
              <tr>
                <th className="p-4 font-semibold">Problem</th>
                <th className="p-4 font-semibold">Score</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {results.problems.map((problem) => (
                <Fragment key={problem.id}>
                  <tr
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setExpandedProblemId((prev) => (prev === problem.id ? null : problem.id))}
                  >
                    <td className="p-4">
                      <span className="font-medium text-[var(--text-primary)]">{problem.title}</span>
                    </td>
                    <td className="p-4 font-mono text-[var(--text-secondary)]">{problem.score}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-2 ${problem.status === 'accepted' ? 'text-brand-green' : 'text-red-400'}`}>
                        {problem.status === 'accepted' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        {problem.status === 'accepted' ? 'Accepted' : 'Wrong Answer'}
                      </span>
                    </td>
                  </tr>
                  {expandedProblemId === problem.id && (
                    <tr key={`${problem.id}-panel`} className="bg-[var(--bg-primary)]">
                      <td colSpan={3} className="p-4">
                        <div className="border border-default rounded-lg overflow-hidden">
                          <SubmissionPanel submission={problem.submission} isLoading={false} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
