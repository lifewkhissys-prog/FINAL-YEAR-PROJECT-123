import { useMemo, useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Play, Send } from 'lucide-react';
import { CodeEditor } from '../../components/editor/CodeEditor';
import { SubmissionPanel } from '../../components/problems/SubmissionPanel';
import { CountdownTimer } from '../../components/assessment/CountdownTimer';
import { FullPageSpinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

export function ChallengePage({ problemId, initialProblem }) {
  const params = useParams();
  const location = useLocation();
  const resolvedProblemId = problemId || params.problemId || params.id;
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [submission, setSubmission] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentEnded, setAssessmentEnded] = useState(false);
  const isAssessmentSession = new URLSearchParams(location.search).get('mode') === 'assessment';

  useEffect(() => {
    const getStarterCode = (lang) => {
      const normalized = (lang || 'python').toLowerCase();
      if (normalized === 'python') return 'def solve():\n    # Write your code here\n    pass';
      if (normalized === 'java') return 'public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}';
      if (normalized === 'cpp') return '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}';
      if (normalized === 'sql') return 'SELECT *\nFROM your_table\n-- Write your query here';
      return '// Write your code here';
    };

    if (initialProblem) {
      const starter = initialProblem.starter_code || getStarterCode(initialProblem.language);
      setProblem({
        ...initialProblem,
        starter_code: starter,
      });
      setCode(starter);
      setSelectedLanguage(initialProblem.language || 'python');
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      const prob = {
        id: resolvedProblemId,
        type: 'challenge',
        title: 'Two Sum',
        language: 'python',
        languages: ['python', 'java'],
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
        constraints: '- `2 <= nums.length <= 10^4`\n- `-10^9 <= nums[i] <= 10^9`',
        starter_code: 'def twoSum(nums, target):\n    # Write your code here\n    pass',
        sample_cases: [
          { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }
        ],
        assessment_ends_at: isAssessmentSession ? new Date(Date.now() + 60000 * 30).toISOString() : null
      };
      const starter = prob.starter_code || getStarterCode(prob.language);
      setProblem({
        ...prob,
        starter_code: starter,
      });
      setCode(starter);
      setSelectedLanguage(prob.language || 'python');
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [initialProblem, resolvedProblemId, isAssessmentSession]);

  const handleAction = (isSubmit) => {
    if (isAssessmentSession && assessmentEnded && problem?.assessment_ends_at) return;
    setIsSubmitting(true);

    // Mock submission flow
    setTimeout(() => {
      const mockResults = [
        { id: 1, passed: true, actual_output: '[0, 1]', expected_output: '[0, 1]', exec_time_ms: 12, is_hidden: false },
        { id: 2, passed: false, actual_output: '[]', expected_output: '[1, 2]', exec_time_ms: 15, is_hidden: false },
        { id: 3, passed: true, actual_output: '', expected_output: '', exec_time_ms: 11, is_hidden: true },
      ];

      const passedTests = mockResults.filter(r => r.passed).length;
      const totalTests = mockResults.length;

      setSubmission({
        status: 'completed',
        score: passedTests,
        totalCases: totalTests,
        results: mockResults
      });
      setIsSubmitting(false);

      // Show toast notification
      if (passedTests === totalTests) {
        toast.success(`🎉 All tests passed! ${passedTests}/${totalTests} correct`);
      } else if (passedTests > 0) {
        toast.success(`✅ ${passedTests}/${totalTests} tests passed. Keep trying!`);
      } else {
        toast.error(`❌ All tests failed. Check your solution and try again.`);
      }
    }, 2000);
  };

  const languageOptions = useMemo(() => {
    if (!problem) return ['python'];
    if (problem.languages && problem.languages.length) return problem.languages;
    return [problem.language || 'python'];
  }, [problem]);

  const handleLanguageChange = (event) => {
    const nextLanguage = event.target.value;
    if (nextLanguage === selectedLanguage) return;
    const shouldReset = code.trim() !== (problem.starter_code || '').trim();
    if (shouldReset && !window.confirm('Switch language and reset your editor?')) {
      return;
    }

    const nextStarter = (problem.starter_code && problem.language === nextLanguage)
      ? problem.starter_code
      : (() => {
          const normalized = (nextLanguage || 'python').toLowerCase();
          if (normalized === 'python') return 'def solve():\n    # Write your code here\n    pass';
          if (normalized === 'java') return 'public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}';
          if (normalized === 'cpp') return '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}';
          if (normalized === 'sql') return 'SELECT *\nFROM your_table\n-- Write your query here';
          return '// Write your code here';
        })();

    setSelectedLanguage(nextLanguage);
    setCode(nextStarter);
    setSubmission(null);
  };

  if (!problem) return <FullPageSpinner />;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col animate-fade-in bg-[var(--bg-primary)]">
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full lg:w-[40%] border-r border-default bg-[var(--bg-surface)] overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">{problem.title}</h1>
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {problem.language}
              </span>
            </div>
            {isAssessmentSession && problem.assessment_ends_at && !assessmentEnded && (
              <CountdownTimer endsAt={problem.assessment_ends_at} onExpired={() => setAssessmentEnded(true)} />
            )}
          </div>

          {isAssessmentSession && assessmentEnded && problem.assessment_ends_at && (
            <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3">
              Time's up. Your last submission has been recorded.
            </div>
          )}

          <div className="prose prose-invert prose-pre:bg-[var(--bg-primary)] prose-pre:border-default max-w-none">
            <ReactMarkdown>{problem.description}</ReactMarkdown>

            <h3 className="text-lg font-semibold mt-8 border-b border-default pb-2">Constraints</h3>
            <ReactMarkdown>{problem.constraints}</ReactMarkdown>

            <h3 className="text-lg font-semibold mt-8 border-b border-default pb-2">Sample Cases</h3>
            {problem.sample_cases.map((sc, i) => (
              <div key={i} className="mt-4 bg-[var(--bg-primary)] p-3 rounded-lg border border-default font-mono text-sm">
                <div className="text-[var(--text-muted)] mb-1">Input:</div>
                <div className="text-[var(--text-secondary)] mb-3">{sc.input}</div>
                <div className="text-[var(--text-muted)] mb-1">Expected Output:</div>
                <div className="text-[var(--text-secondary)]">{sc.output}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden lg:flex lg:w-[60%] flex-col overflow-hidden">
          <div className="border-b border-default px-4 py-3 flex items-center justify-between bg-[var(--bg-surface)]">
            <div className="flex items-center gap-3">
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Language</label>
              <select
                value={selectedLanguage}
                onChange={handleLanguageChange}
                className="bg-[var(--bg-primary)] border border-default rounded px-3 py-1 text-sm text-[var(--text-primary)]"
              >
                {languageOptions.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleAction(false)}
                disabled={isSubmitting || (isAssessmentSession && assessmentEnded && problem.assessment_ends_at)}
                className="btn-secondary py-1.5 px-3"
              >
                <Play size={14} /> Run
              </button>
              <button
                onClick={() => handleAction(true)}
                disabled={isSubmitting || (isAssessmentSession && assessmentEnded && problem.assessment_ends_at)}
                className="btn-success py-1.5 px-3"
              >
                <Send size={14} /> Submit
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={selectedLanguage}
              readOnly={isAssessmentSession && assessmentEnded && !!problem.assessment_ends_at}
              height="100%"
              className="rounded-none border-0 border-b border-default"
              problemId={problem.id}
            />
          </div>

          <div className="h-[40%] min-h-[200px] border-t border-dark-950">
            <SubmissionPanel submission={submission} isLoading={isSubmitting} />
          </div>
        </div>

        <div className="lg:hidden flex flex-col w-full overflow-hidden">
          <div className="border-t border-default px-4 py-3 flex items-center justify-between bg-[var(--bg-surface)]">
            <div className="flex items-center gap-3">
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Language</label>
              <select
                value={selectedLanguage}
                onChange={handleLanguageChange}
                className="bg-[var(--bg-primary)] border border-default rounded px-3 py-1 text-sm text-[var(--text-primary)]"
              >
                {languageOptions.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleAction(false)}
                disabled={isSubmitting || (isAssessmentSession && assessmentEnded && problem.assessment_ends_at)}
                className="btn-secondary py-1.5 px-3"
              >
                <Play size={14} /> Run
              </button>
              <button
                onClick={() => handleAction(true)}
                disabled={isSubmitting || (isAssessmentSession && assessmentEnded && problem.assessment_ends_at)}
                className="btn-success py-1.5 px-3"
              >
                <Send size={14} /> Submit
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={selectedLanguage}
              readOnly={isAssessmentSession && assessmentEnded && !!problem.assessment_ends_at}
              height="100%"
              className="rounded-none border-0 border-b border-default"
              problemId={problem.id}
            />
          </div>

          <div className="h-[40%] min-h-[200px] border-t border-dark-950">
            <SubmissionPanel submission={submission} isLoading={isSubmitting} />
          </div>
        </div>
      </div>
    </div>
  );
}
