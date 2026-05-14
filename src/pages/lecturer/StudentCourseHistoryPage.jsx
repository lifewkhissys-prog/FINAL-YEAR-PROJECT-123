import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';

export function StudentCourseHistoryPage() {
  const { courseId, userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState(null);
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setHistory({
        course: 'Introduction to Python',
        student: 'Ankomah Kelvin',
        assessments: [
          {
            id: 'a1',
            title: 'Lab 1 (Ended)',
            problems: [
              {
                id: '103',
                title: 'Two Sum',
                attempts: 3,
                score: '4/5',
                submissions: [
                  { id: 's1', submittedAt: 'Apr 12, 10:20', score: '4/5' },
                  { id: 's2', submittedAt: 'Apr 12, 10:05', score: '3/5' },
                  { id: 's3', submittedAt: 'Apr 12, 09:50', score: '1/5' },
                ],
              },
              {
                id: '104',
                title: 'Valid Palindrome',
                attempts: 1,
                score: '5/5',
                submissions: [
                  { id: 's4', submittedAt: 'Apr 12, 11:10', score: '5/5' },
                ],
              },
            ],
          },
          {
            id: 'a2',
            title: 'Lab 2 (Ended)',
            problems: [
              {
                id: '105',
                title: 'Binary Search',
                attempts: 5,
                score: '2/5',
                submissions: [
                  { id: 's5', submittedAt: 'Apr 20, 09:10', score: '2/5' },
                  { id: 's6', submittedAt: 'Apr 20, 08:55', score: '1/5' },
                ],
              },
            ],
          },
        ],
      });
      setLoading(false);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [courseId, userId]);

  if (loading || !history) return <FullPageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <Link to={`/lecturer/courses/${courseId}`} className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Course
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{history.student}</h1>
        <p className="text-sm text-[var(--text-secondary)]">Course: {history.course}</p>
      </div>

      {history.assessments.map((assessment) => (
        <div key={assessment.id} className="glass p-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">{assessment.title}</h2>
          <div className="space-y-2">
            {assessment.problems.map((problem) => (
              <div key={problem.id} className="rounded border border-default bg-[var(--bg-surface)]">
                <button
                  className="w-full flex items-center justify-between p-3 text-left"
                  onClick={() => setExpandedKey((prev) => (prev === `${assessment.id}:${problem.id}` ? null : `${assessment.id}:${problem.id}`))}
                  type="button"
                >
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">{problem.title}</div>
                    <div className="text-xs text-[var(--text-muted)]">{problem.attempts} submissions</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[var(--text-secondary)]">{problem.score}</span>
                    <ChevronRight size={16} className="text-[var(--text-muted)]" />
                  </div>
                </button>
                {expandedKey === `${assessment.id}:${problem.id}` && (
                  <div className="border-t border-default px-4 py-3 text-sm text-[var(--text-secondary)] space-y-2">
                    {problem.submissions.map((submission) => (
                      <div key={submission.id} className="flex items-center justify-between">
                        <span>{submission.submittedAt}</span>
                        <span className="font-mono text-[var(--text-primary)]">{submission.score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
