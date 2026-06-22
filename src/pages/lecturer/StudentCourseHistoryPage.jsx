import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { useDemoStore } from '../../store/demoStore';

export function StudentCourseHistoryPage() {
  const { courseId, userId } = useParams(); // userId is studentEmail
  const { courses, assessments, problems, submissions, studentsList } = useDemoStore();

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState(null);
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => {
    const courseObj = courses.find((c) => c.id === courseId);
    const studentInfo = studentsList.find((s) => s.email.toLowerCase() === userId.toLowerCase()) || {
      email: userId,
      name: userId.split('@')[0]
    };

    const courseTitle = courseObj ? courseObj.title : 'Course';

    // Get assessments belonging to this course
    const courseAssessments = assessments.filter((a) => a.courseId === courseId);

    const assessmentsHistory = courseAssessments.map((a) => {
      const assessmentProblems = (a.problemIds || []).map((pId) => {
        const prob = problems[pId];
        const total = prob && prob.testCases ? prob.testCases.length : 1;

        // Submissions for this student + problem + assessment
        const probSubs = submissions.filter(
          (sub) =>
            sub.studentEmail.toLowerCase() === userId.toLowerCase() &&
            sub.assessmentId === a.id &&
            sub.problemId === pId
        );

        // Sort new to old
        const sortedSubs = [...probSubs].sort(
          (x, y) => new Date(y.submittedAt).getTime() - new Date(x.submittedAt).getTime()
        );

        let highestPassed = 0;
        const mappedSubs = sortedSubs.map((sub) => {
          const passed = sub.testCases
            ? sub.testCases.filter((tc) => tc.status === 'passed').length
            : (sub.status === 'completed' ? 1 : 0);
          
          if (passed > highestPassed) {
            highestPassed = passed;
          }

          const formattedTime = new Date(sub.submittedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }) + ' on ' + new Date(sub.submittedAt).toLocaleDateString([], {
            month: 'short',
            day: 'numeric'
          });

          return {
            id: sub.id,
            submittedAt: formattedTime,
            score: `${passed}/${total}`
          };
        });

        return {
          id: pId,
          title: prob ? prob.title : 'Problem ' + pId,
          attempts: probSubs.length,
          score: probSubs.length > 0 ? `${highestPassed}/${total}` : `0/${total}`,
          submissions: mappedSubs
        };
      });

      return {
        id: a.id,
        title: a.title,
        problems: assessmentProblems
      };
    });

    setHistory({
      course: courseTitle,
      student: studentInfo.name,
      assessments: assessmentsHistory
    });
    setLoading(false);
  }, [courseId, userId, courses, assessments, problems, submissions, studentsList]);

  if (loading || !history) return <FullPageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in pb-10 px-4">
      <div>
        <Link to={`/lecturer/courses/${courseId}`} className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Course
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{history.student}</h1>
        <p className="text-sm text-[var(--text-secondary)]">Course: {history.course}</p>
      </div>

      {history.assessments.length > 0 ? (
        history.assessments.map((assessment) => (
          <div key={assessment.id} className="glass p-4 border border-default rounded-xl">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">{assessment.title}</h2>
            <div className="space-y-2">
              {assessment.problems.map((problem) => (
                <div key={problem.id} className="rounded-lg border border-default bg-[var(--bg-surface)] overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-white/[0.01]"
                    onClick={() => setExpandedKey((prev) => (prev === `${assessment.id}:${problem.id}` ? null : `${assessment.id}:${problem.id}`))}
                    type="button"
                  >
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">{problem.title}</div>
                      <div className="text-xs text-[var(--text-muted)]">{problem.attempts} submissions</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[var(--text-secondary)]">{problem.score}</span>
                      <ChevronRight size={16} className={`text-[var(--text-muted)] transition-transform ${expandedKey === `${assessment.id}:${problem.id}` ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                  {expandedKey === `${assessment.id}:${problem.id}` && (
                    <div className="border-t border-default px-4 py-3 text-sm text-[var(--text-secondary)] space-y-2 bg-[var(--bg-primary)]/50">
                      {problem.submissions.length > 0 ? (
                        problem.submissions.map((submission) => (
                          <div key={submission.id} className="flex items-center justify-between">
                            <span>{submission.submittedAt}</span>
                            <span className="font-mono text-[var(--text-primary)]">{submission.score}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">No submission attempts yet.</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="p-8 text-center text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-xl border border-default">
          No assessments scheduled for this course yet.
        </div>
      )}
    </div>
  );
}
