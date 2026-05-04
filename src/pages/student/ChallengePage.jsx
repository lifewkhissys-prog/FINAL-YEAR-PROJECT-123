import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Play, Send } from 'lucide-react';
import { CodeEditor } from '../../components/editor/CodeEditor';
import { SubmissionPanel } from '../../components/problems/SubmissionPanel';
import { CountdownTimer } from '../../components/assessment/CountdownTimer';
import { FullPageSpinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

export function ChallengePage() {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [submission, setSubmission] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentEnded, setAssessmentEnded] = useState(false);

  useEffect(() => {
    // Mock fetch
    setTimeout(() => {
      const prob = {
        id,
        title: 'Two Sum',
        language: 'python',
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
        constraints: '- `2 <= nums.length <= 10^4`\n- `-10^9 <= nums[i] <= 10^9`',
        starter_code: 'def twoSum(nums, target):\n    # Write your code here\n    pass',
        sample_cases: [
          { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }
        ],
        // assessment_ends_at: new Date(Date.now() + 60000 * 30).toISOString() // Mock 30 mins
      };
      setProblem(prob);
      setCode(prob.starter_code);
    }, 500);
  }, [id]);

  const handleAction = (isSubmit) => {
    if (assessmentEnded) return;
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

  if (!problem) return <FullPageSpinner />;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col -m-4 md:-m-6 lg:-m-8 animate-fade-in bg-[var(--bg-primary)]">
      {/* Header bar */}
      <div className="h-14 border-b border-default flex items-center justify-between px-4 shrink-0 bg-[var(--bg-surface)]">
        <h1 className="font-semibold text-[var(--text-primary)]">{problem.title}</h1>
        <div className="flex items-center gap-3">
          {problem.assessment_ends_at && !assessmentEnded && (
            <CountdownTimer endsAt={problem.assessment_ends_at} onExpired={() => setAssessmentEnded(true)} />
          )}
          {assessmentEnded && (
            <span className="text-red-500 font-bold px-3 py-1 bg-red-500/10 rounded border border-red-500/30">Assessment Locked</span>
          )}
          <button 
            onClick={() => handleAction(false)} 
            disabled={isSubmitting || assessmentEnded}
            className="btn-secondary py-1.5 px-3"
          >
            <Play size={14} /> Run
          </button>
          <button 
            onClick={() => handleAction(true)} 
            disabled={isSubmitting || assessmentEnded}
            className="btn-success py-1.5 px-3"
          >
            <Send size={14} /> Submit
          </button>
        </div>
      </div>

      {/* Main Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane - Problem */}
        <div className="w-1/3 min-w-[300px] max-w-xl border-r border-default bg-[var(--bg-surface)] overflow-y-auto p-6">
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

        {/* Right Pane - Editor & Output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <CodeEditor 
              value={code} 
              onChange={setCode} 
              language={problem.language} 
              readOnly={assessmentEnded}
              height="100%" 
              className="rounded-none border-0 border-b border-default"
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
