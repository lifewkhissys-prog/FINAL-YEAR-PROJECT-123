import { useMemo, useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Play, Send, ArrowLeft, Minimize2 } from 'lucide-react';
import { CodeEditor } from '../../components/editor/CodeEditor';
import { SubmissionPanel } from '../../components/problems/SubmissionPanel';
import { AttemptHeader } from '../../components/layout/AttemptHeader';
import { CountdownTimer } from '../../components/assessment/CountdownTimer';
import { FullPageSpinner } from '../../components/ui/Spinner';
import useAuthStore from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';
import toast from 'react-hot-toast';

export function ChallengePage({ problemId, initialProblem }) {
  const params = useParams();
  const location = useLocation();
  const resolvedProblemId = problemId || params.problemId || params.id;
  const user = useAuthStore((state) => state.user);
  const { courses, problems, assessments, addSubmission } = useDemoStore();

  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [submission, setSubmission] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentEnded, setAssessmentEnded] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const isAssessmentSession = new URLSearchParams(location.search).get('mode') === 'assessment';

  const backUrl = useMemo(() => {
    if (isAssessmentSession) {
      const activeAssessment = assessments.find(
        (a) => a.problemIds.includes(resolvedProblemId) &&
               new Date(a.startsAt).getTime() <= Date.now() &&
               new Date(a.endsAt).getTime() > Date.now()
      );
      const assessmentObj = activeAssessment || assessments.find(a => a.problemIds.includes(resolvedProblemId));
      if (assessmentObj) {
        return `/student/assessments/${assessmentObj.id}`;
      }
    }
    return '/student/dashboard';
  }, [isAssessmentSession, assessments, resolvedProblemId]);

  const getStarterCode = (lang) => {
    const normalized = (lang || 'python').toLowerCase();
    if (normalized === 'python') return 'def solve():\n    # Write your code here\n    pass';
    if (normalized === 'java') return 'public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}';
    if (normalized === 'cpp') return '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}';
    if (normalized === 'sql') return 'SELECT *\nFROM your_table\n-- Write your query here';
    return '// Write your code here';
  };

  useEffect(() => {
    const activeAssessment = assessments.find(
      (a) => a.problemIds.includes(resolvedProblemId) &&
             new Date(a.startsAt).getTime() <= Date.now() &&
             new Date(a.endsAt).getTime() > Date.now()
    );
    const assessmentObj = activeAssessment || assessments.find(a => a.problemIds.includes(resolvedProblemId));
    const endsAt = assessmentObj ? assessmentObj.endsAt : new Date(Date.now() + 60000 * 30).toISOString();

    if (initialProblem) {
      const starter = initialProblem.starterCode || getStarterCode(initialProblem.language);
      setProblem({
        ...initialProblem,
        starter_code: starter,
        languages: [initialProblem.language || 'python'],
        constraints: '- `2 <= nums.length <= 10^4`\n- Memory Limit: 256MB\n- Time Limit: 2.0s',
        sample_cases: [
          { input: 'Sample Test Case #1', output: 'Passed' }
        ],
        assessment_ends_at: isAssessmentSession ? endsAt : null
      });
      setCode(starter);
      setSelectedLanguage(initialProblem.language || 'python');
      return;
    }

    const storeProblem = problems[resolvedProblemId];
    if (storeProblem) {
      const starter = storeProblem.starterCode || getStarterCode(storeProblem.language);
      
      // Infer constraints and sample cases if missing
      const constraints = `- Time Limit: ${storeProblem.timeLimitMs || 2000}ms\n- Memory Limit: ${storeProblem.memoryLimitMb || 256}MB`;
      const sampleCases = storeProblem.testCases && storeProblem.testCases.length > 0
        ? storeProblem.testCases.filter(tc => !tc.isHidden).map(tc => ({
            input: tc.stdin || 'None',
            output: tc.expectedStdout || 'None'
          }))
        : [{ input: 'Default Case', output: 'Passed' }];

      setProblem({
        ...storeProblem,
        starter_code: starter,
        languages: [storeProblem.language || 'python'],
        constraints,
        sample_cases: sampleCases,
        assessment_ends_at: isAssessmentSession ? endsAt : null
      });
      setCode(starter);
      setSelectedLanguage(storeProblem.language || 'python');
    } else {
      // Fallback
      setProblem({
        id: resolvedProblemId,
        type: 'challenge',
        title: 'Two Sum',
        language: 'python',
        languages: ['python'],
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.',
        constraints: '- `2 <= nums.length <= 10^4`',
        starter_code: 'def two_sum(nums, target):\n    pass',
        sample_cases: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }],
        assessment_ends_at: isAssessmentSession ? endsAt : null
      });
      setCode('def two_sum(nums, target):\n    pass');
      setSelectedLanguage('python');
    }
  }, [initialProblem, resolvedProblemId, isAssessmentSession, problems, assessments]);

  const handleAction = (isSubmit) => {
    if (isAssessmentSession && assessmentEnded && problem?.assessment_ends_at) return;
    setIsSubmitting(true);

    setTimeout(() => {
      const testCases = problem.testCases || [
        { id: 1, stdin: 'Sample case', expectedStdout: 'Passed', isHidden: false }
      ];

      const mockResults = testCases.map((tc) => {
        const codeTrimmed = (code || '').trim();
        const passed = codeTrimmed.length > 0;
        return {
          id: tc.id,
          passed,
          actual_output: passed ? (tc.expectedStdout || 'Passed') : 'Error: Output mismatch or execution timed out.',
          expected_output: tc.expectedStdout || 'Passed',
          exec_time_ms: Math.floor(Math.random() * 25) + 8,
          is_hidden: tc.isHidden
        };
      });

      const passedTests = mockResults.filter((r) => r.passed).length;
      const totalTests = mockResults.length;

      setSubmission({
        status: 'completed',
        score: passedTests,
        totalCases: totalTests,
        results: mockResults
      });
      setIsSubmitting(false);

      if (passedTests === totalTests) {
        toast.success(`🎉 All tests passed! ${passedTests}/${totalTests} correct`);
      } else if (passedTests > 0) {
        toast.success(`✅ ${passedTests}/${totalTests} tests passed. Keep trying!`);
      } else {
        toast.error(`❌ All tests failed. Check your solution and try again.`);
      }

      // Save submission to database if submitting
      if (isSubmit && user) {
        const course = courses.find((c) => c.problemIds.includes(problem.id));
        const courseTitle = course ? course.title : 'Self Practice';

        const percent = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
        const status = percent === 100 ? 'completed' : 'error';

        addSubmission({
          studentEmail: user.email,
          studentName: user.name,
          problemId: problem.id,
          problemTitle: problem.title,
          course: courseTitle,
          type: 'challenge',
          language: selectedLanguage,
          status,
          score: `${percent}%`,
          code: code,
          is_graded: true,
          testCases: mockResults.map((r) => ({
            id: r.id,
            status: r.passed ? 'passed' : 'failed',
            executionTime: `${r.exec_time_ms}ms`
          }))
        });
      }
    }, 1500);
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
      : getStarterCode(nextLanguage);

    setSelectedLanguage(nextLanguage);
    setCode(nextStarter);
    setSubmission(null);
  };

  if (!problem) return <FullPageSpinner />;

  return (
    <div className="h-full flex flex-col animate-fade-in bg-[var(--bg-primary)] relative">
      {!isFocusMode && (
        <AttemptHeader
          title={problem.title}
          language={selectedLanguage}
          isAssessment={isAssessmentSession}
          endsAt={problem.assessment_ends_at}
          onExpired={() => setAssessmentEnded(true)}
          backUrl={backUrl}
          onToggleFocusMode={() => setIsFocusMode(true)}
        />
      )}

      {isFocusMode && (
        <button
          onClick={() => setIsFocusMode(false)}
          className="fixed bottom-4 right-4 z-50 p-2.5 rounded-lg bg-brand-blue text-white shadow-lg hover:bg-brand-purple transition-all flex items-center gap-2 text-xs font-mono uppercase font-semibold border border-brand-blue/30"
          title="Exit Focus Mode"
        >
          <Minimize2 size={14} /> Exit Focus Mode
        </button>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-full lg:w-[40%] border-r border-default bg-[var(--bg-surface)] overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">{problem.title}</h1>
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {selectedLanguage}
            </span>
          </div>

          {isAssessmentSession && assessmentEnded && problem.assessment_ends_at && (
            <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3">
              Time's up. Your last submission has been recorded.
            </div>
          )}

          <div className="prose prose-invert prose-pre:bg-[var(--bg-primary)] prose-pre:border-default max-w-none">
            <ReactMarkdown>{problem.description || ''}</ReactMarkdown>

            <h3 className="text-lg font-semibold mt-8 border-b border-default pb-2">Constraints</h3>
            <ReactMarkdown>{problem.constraints || ''}</ReactMarkdown>

            <h3 className="text-lg font-semibold mt-8 border-b border-default pb-2">Sample Cases</h3>
            {problem.sample_cases && problem.sample_cases.map((sc, i) => (
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
                {isAssessmentSession && assessmentEnded && problem.assessment_ends_at ? (
                  "Time's up"
                ) : (
                  <>
                    <Play size={14} /> Run
                  </>
                )}
              </button>
              <button
                onClick={() => handleAction(true)}
                disabled={isSubmitting || (isAssessmentSession && assessmentEnded && problem.assessment_ends_at)}
                className="btn-success py-1.5 px-3"
              >
                {isAssessmentSession && assessmentEnded && problem.assessment_ends_at ? (
                  "Time's up"
                ) : (
                  <>
                    <Send size={14} /> Submit
                  </>
                )}
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
                {isAssessmentSession && assessmentEnded && problem.assessment_ends_at ? (
                  "Time's up"
                ) : (
                  <>
                    <Play size={14} /> Run
                  </>
                )}
              </button>
              <button
                onClick={() => handleAction(true)}
                disabled={isSubmitting || (isAssessmentSession && assessmentEnded && problem.assessment_ends_at)}
                className="btn-success py-1.5 px-3"
              >
                {isAssessmentSession && assessmentEnded && problem.assessment_ends_at ? (
                  "Time's up"
                ) : (
                  <>
                    <Send size={14} /> Submit
                  </>
                )}
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
