import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { SubmissionPanel } from '../../components/problems/SubmissionPanel';

export function AssessmentResultsPage() {
  const { assessmentId } = useParams();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [expandedProblemId, setExpandedProblemId] = useState(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setResults({
        id: assessmentId,
        title: 'Midterm Practical',
        course: 'Introduction to Python',
        score: '12 / 15 test cases passed',
        problems: [
          {
            id: '103',
            title: 'Two Sum',
            score: '5/5',
            status: 'accepted',
            submission: {
              status: 'completed',
              score: 5,
              totalCases: 5,
              results: [
                { id: 1, passed: true, stdin: 'nums=[2,7,11,15]\ntarget=9', expected_output: '[0,1]', actual_output: '[0,1]', exec_time_ms: 12, is_hidden: false },
                { id: 2, passed: true, stdin: 'nums=[3,2,4]\ntarget=6', expected_output: '[1,2]', actual_output: '[1,2]', exec_time_ms: 10, is_hidden: false },
                { id: 3, passed: true, stdin: 'nums=[3,3]\ntarget=6', expected_output: '[0,1]', actual_output: '[0,1]', exec_time_ms: 9, is_hidden: false },
                { id: 4, passed: true, stdin: '', expected_output: '', actual_output: '', exec_time_ms: 11, is_hidden: true },
                { id: 5, passed: true, stdin: '', expected_output: '', actual_output: '', exec_time_ms: 14, is_hidden: true },
              ]
            }
          },
          {
            id: '101',
            title: 'SQL Murder Mystery',
            score: '4/5',
            status: 'wrong',
            submission: {
              status: 'completed',
              score: 4,
              totalCases: 5,
              results: [
                { id: 1, passed: true, stdin: 'block-1', expected_output: 'OK', actual_output: 'OK', exec_time_ms: 11, is_hidden: false },
                { id: 2, passed: true, stdin: 'block-2', expected_output: 'OK', actual_output: 'OK', exec_time_ms: 13, is_hidden: false },
                { id: 3, passed: true, stdin: 'block-3', expected_output: 'OK', actual_output: 'OK', exec_time_ms: 9, is_hidden: false },
                { id: 4, passed: false, stdin: 'block-4', expected_output: 'OK', actual_output: 'Missing row', exec_time_ms: 16, is_hidden: false },
                { id: 5, passed: true, stdin: '', expected_output: '', actual_output: '', exec_time_ms: 12, is_hidden: true },
              ]
            }
          },
          {
            id: '104',
            title: 'Dictionary Manipulation',
            score: '3/5',
            status: 'wrong',
            submission: {
              status: 'completed',
              score: 3,
              totalCases: 5,
              results: [
                { id: 1, passed: true, stdin: 'input=...', expected_output: '3', actual_output: '3', exec_time_ms: 14, is_hidden: false },
                { id: 2, passed: true, stdin: 'input=...', expected_output: '7', actual_output: '7', exec_time_ms: 12, is_hidden: false },
                { id: 3, passed: false, stdin: 'input=...', expected_output: '9', actual_output: '2', exec_time_ms: 21, is_hidden: false },
                { id: 4, passed: true, stdin: '', expected_output: '', actual_output: '', exec_time_ms: 8, is_hidden: true },
                { id: 5, passed: false, stdin: '', expected_output: '', actual_output: '', exec_time_ms: 12, is_hidden: true },
              ]
            }
          },
        ],
      });
      setLoading(false);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [assessmentId]);

  if (loading || !results) return <FullPageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
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
