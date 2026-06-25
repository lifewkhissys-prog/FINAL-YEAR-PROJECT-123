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
  
  // Custom states for non-coding problem types
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState(null);
  const [shortAnswers, setShortAnswers] = useState({});

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

  // Coding Submission Handler
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

  // MCQ Submission Handler
  const handleMcqSubmit = (isSubmit) => {
    if (selectedChoiceIdx === null) {
      toast.error('Please select an option before submitting.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      const choice = problem.choices[selectedChoiceIdx];
      const isCorrect = choice?.isCorrect || false;

      setSubmission({
        status: 'completed',
        score: isCorrect ? 1 : 0,
        totalCases: 1,
        results: [
          {
            id: 1,
            passed: isCorrect,
            actual_output: isCorrect ? 'Correct choice selected.' : 'Incorrect choice selected.',
            expected_output: 'Correct choice selected.',
            exec_time_ms: 1
          }
        ]
      });
      setIsSubmitting(false);

      if (isCorrect) {
        toast.success('🎉 Correct answer!');
      } else {
        toast.error('❌ Incorrect answer. Try again.');
      }

      if (isSubmit && user) {
        const course = courses.find((c) => c.problemIds.includes(problem.id));
        const courseTitle = course ? course.title : 'Self Practice';

        addSubmission({
          studentEmail: user.email,
          studentName: user.name,
          problemId: problem.id,
          problemTitle: problem.title,
          course: courseTitle,
          type: 'mcq',
          status: isCorrect ? 'completed' : 'error',
          score: isCorrect ? '100%' : '0%',
          code: `Selected Option: ${choice?.text}`,
          is_graded: true
        });
      }
    }, 800);
  };

  // Short Answer Submission Handler
  const handleShortAnswerSubmit = (isSubmit) => {
    setIsSubmitting(true);
    setTimeout(() => {
      const steps = problem.steps || [];
      let correctSteps = 0;

      const resultsList = steps.map((step, index) => {
        const answer = (shortAnswers[index] || '').trim();
        let passed = false;

        if (step.gradingMode === 'keyword_match') {
          const keywords = step.keywords || [];
          passed = keywords.some(kw => answer.toLowerCase().includes(kw.toLowerCase()));
        } else {
          // Manual or fallback matching
          passed = answer.length > 0;
        }

        if (passed) correctSteps++;

        return {
          id: index + 1,
          passed,
          actual_output: passed ? 'Graded Correct.' : 'Graded Incorrect.',
          expected_output: 'Graded Correct.',
          exec_time_ms: 1,
          prompt: step.prompt
        };
      });

      const totalSteps = steps.length || 1;
      const percent = Math.round((correctSteps / totalSteps) * 100);

      setSubmission({
        status: 'completed',
        score: correctSteps,
        totalCases: totalSteps,
        results: resultsList
      });
      setIsSubmitting(false);

      if (correctSteps === totalSteps) {
        toast.success(`🎉 All steps correct! ${correctSteps}/${totalSteps}`);
      } else if (correctSteps > 0) {
        toast.success(`✅ ${correctSteps}/${totalSteps} steps correct.`);
      } else {
        toast.error('❌ Graded incorrect. Review your answers.');
      }

      if (isSubmit && user) {
        const course = courses.find((c) => c.problemIds.includes(problem.id));
        const courseTitle = course ? course.title : 'Self Practice';

        addSubmission({
          studentEmail: user.email,
          studentName: user.name,
          problemId: problem.id,
          problemTitle: problem.title,
          course: courseTitle,
          type: 'short_answer',
          status: percent === 100 ? 'completed' : 'error',
          score: `${percent}%`,
          code: steps.map((s, idx) => `Step ${idx + 1}: ${shortAnswers[idx] || ''}`).join('\n'),
          is_graded: true
        });
      }
    }, 800);
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

  // SQL Schema Visualizer
  const renderSqlSchema = () => {
    if (selectedLanguage !== 'sql' && problem?.type !== 'sql_problem') return null;

    // Default schemas for SQL questions
    const defaultSchemas = {
      '104': [
        { name: 'crime_scene_report', cols: ['date INT', 'type VARCHAR', 'description TEXT', 'city VARCHAR'] },
        { name: 'person', cols: ['id INT PRIMARY KEY', 'name VARCHAR', 'license_id INT', 'address_number INT', 'address_street_name VARCHAR'] },
        { name: 'drivers_license', cols: ['id INT PRIMARY KEY', 'age INT', 'height INT', 'eye_color VARCHAR', 'hair_color VARCHAR', 'gender VARCHAR', 'plate_number VARCHAR', 'car_make VARCHAR', 'car_model VARCHAR'] },
        { name: 'interview', cols: ['person_id INT', 'transcript TEXT'] }
      ],
      '107': [
        { name: 'logs', cols: ['id INT', 'staff_id INT', 'room VARCHAR', 'timestamp TIMESTAMP'] },
        { name: 'staff', cols: ['id INT PRIMARY KEY', 'name VARCHAR', 'role VARCHAR'] }
      ]
    };

    const schemas = defaultSchemas[problem.id] || (problem.schemaSql ? [
      { name: 'custom_table', cols: problem.schemaSql.split(';').filter(s => s.trim().length > 0).map(s => s.replace(/CREATE TABLE\s+(\w+)\s+\((.+)\)/i, '$1: $2').trim()) }
    ] : null);

    if (!schemas) return null;

    return (
      <div className="mt-8 border border-default rounded-xl bg-[var(--bg-primary)] overflow-hidden">
        <div className="px-4 py-3 bg-white/5 border-b border-default flex items-center justify-between">
          <span className="text-xs uppercase font-mono tracking-wider font-semibold text-brand-blue flex items-center gap-2">
            🛢️ Database Schema
          </span>
        </div>
        <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
          {schemas.map((table, tIdx) => (
            <div key={tIdx} className="space-y-1.5">
              <div className="text-sm font-mono font-bold text-[var(--text-primary)]">{table.name}</div>
              <div className="pl-3 border-l border-default space-y-1">
                {table.cols.map((col, cIdx) => (
                  <div key={cIdx} className="text-xs font-mono text-[var(--text-secondary)]">{col}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // MCQ Solver Workspace
  const renderMcqWorkspace = () => {
    const choices = problem.choices || [];
    const isLocked = isAssessmentSession && assessmentEnded && !!problem.assessment_ends_at;

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-surface)] p-6">
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="border-b border-default pb-4">
            <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-[var(--text-muted)]">Multiple Choice Question</h3>
          </div>

          <div className="space-y-4">
            {choices.map((choice, idx) => {
              const isSelected = selectedChoiceIdx === idx;
              const showResult = !!submission;
              const isCorrect = choice.isCorrect;

              let cardStyle = "border-default hover:border-brand-blue/40";
              if (isSelected) {
                cardStyle = "border-brand-blue bg-brand-blue/5 shadow-[0_0_15px_rgba(59,130,246,0.15)]";
              }
              if (showResult) {
                if (isCorrect) {
                  cardStyle = "border-brand-green bg-brand-green/5";
                } else if (isSelected) {
                  cardStyle = "border-red-500 bg-red-500/5";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isLocked || showResult}
                  onClick={() => setSelectedChoiceIdx(idx)}
                  className={`w-full text-left p-5 rounded-xl border transition-all flex items-start gap-4 ${cardStyle}`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-brand-blue bg-brand-blue text-white' : 'border-default'}`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <span className="text-[var(--text-primary)] text-base font-medium">{choice.text}</span>
                    {showResult && isCorrect && (
                      <span className="ml-2 inline-flex items-center text-xs text-brand-green font-semibold">✓ Correct Answer</span>
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <span className="ml-2 inline-flex items-center text-xs text-red-400 font-semibold">✗ Your Answer (Incorrect)</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {submission && problem.explanation && (
            <div className="glass p-5 border-l-4 border-l-brand-purple space-y-2">
              <h4 className="text-sm font-semibold text-brand-purple uppercase tracking-wider font-mono">Explanation</h4>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{problem.explanation}</p>
            </div>
          )}
        </div>

        <div className="border-t border-default p-4 flex justify-end gap-3 bg-[var(--bg-primary)]/30">
          <button
            onClick={() => handleMcqSubmit(true)}
            disabled={selectedChoiceIdx === null || isSubmitting || isLocked}
            className="btn-success py-2 px-6 text-sm"
          >
            {isSubmitting ? 'Evaluating...' : 'Submit Answer'}
          </button>
        </div>
      </div>
    );
  };

  // Short Answer Solver Workspace
  const renderShortAnswerWorkspace = () => {
    const steps = problem.steps || [];
    const isLocked = isAssessmentSession && assessmentEnded && !!problem.assessment_ends_at;
    const hasSubmitted = !!submission;

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-surface)] p-6">
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="border-b border-default pb-4">
            <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-[var(--text-muted)]">Short Answer Steps</h3>
          </div>

          <div className="space-y-6">
            {steps.map((step, idx) => {
              const studentAnswer = shortAnswers[idx] || '';
              const stepResult = submission?.results?.find(r => r.id === idx + 1);

              return (
                <div key={idx} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-mono">Step {idx + 1} of {steps.length}</span>
                    {hasSubmitted && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${stepResult?.passed ? 'bg-brand-green/10 text-brand-green border-brand-green/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                        {stepResult?.passed ? 'Correct' : 'Incorrect'}
                      </span>
                    )}
                  </div>
                  <p className="text-base text-[var(--text-primary)] font-medium">{step.prompt}</p>
                  <textarea
                    disabled={isLocked || hasSubmitted}
                    value={studentAnswer}
                    onChange={(e) => setShortAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                    placeholder="Type your response here..."
                    className="w-full bg-[var(--bg-primary)] border border-default rounded-xl p-4 text-[var(--text-primary)] focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30 outline-none text-sm transition-all"
                    rows={3}
                  />
                  {hasSubmitted && step.keywords && step.keywords.length > 0 && (
                    <div className="text-xs text-[var(--text-muted)]">
                      Expected keywords: <span className="font-mono text-[var(--text-secondary)]">{step.keywords.join(', ')}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-default p-4 flex justify-end gap-3 bg-[var(--bg-primary)]/30">
          <button
            onClick={() => handleShortAnswerSubmit(true)}
            disabled={isSubmitting || isLocked}
            className="btn-success py-2 px-6 text-sm"
          >
            {isSubmitting ? 'Evaluating...' : 'Submit Answers'}
          </button>
        </div>
      </div>
    );
  };

  // Coding Challenge Workspace
  const renderCodingWorkspace = (isMobile = false) => {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
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
    );
  };

  const renderWorkspace = (isMobile = false) => {
    if (problem?.type === 'mcq') {
      return renderMcqWorkspace();
    }
    if (problem?.type === 'short_answer') {
      return renderShortAnswerWorkspace();
    }
    return renderCodingWorkspace(isMobile);
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
              {problem.type === 'mcq' ? 'Multiple Choice' : problem.type === 'short_answer' ? 'Short Answer' : selectedLanguage}
            </span>
          </div>

          {isAssessmentSession && assessmentEnded && problem.assessment_ends_at && (
            <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3">
              Time's up. Your last submission has been recorded.
            </div>
          )}

          <div className="prose prose-invert prose-pre:bg-[var(--bg-primary)] prose-pre:border-default max-w-none">
            <ReactMarkdown>{problem.description || ''}</ReactMarkdown>

            {renderSqlSchema()}

            {problem.type !== 'mcq' && problem.type !== 'short_answer' && (
              <>
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
              </>
            )}
          </div>
        </div>

        <div className="hidden lg:flex lg:w-[60%] flex-col overflow-hidden">
          {renderWorkspace(false)}
        </div>

        <div className="lg:hidden flex flex-col w-full overflow-hidden">
          {renderWorkspace(true)}
        </div>
      </div>
    </div>
  );
}
