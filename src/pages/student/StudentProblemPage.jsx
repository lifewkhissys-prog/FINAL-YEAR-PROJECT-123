import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { ChallengePage } from './ChallengePage';
import { GuidedPage } from './GuidedPage';

const MOCK_PROBLEMS = {
  '101': {
    id: '101',
    type: 'guided',
    title: 'SQL Murder Mystery: The First Clue',
    language: 'sql',
  },
  '103': {
    id: '103',
    type: 'challenge',
    title: 'Two Sum',
    language: 'python',
  },
  '104': {
    id: '104',
    type: 'challenge',
    title: 'Dictionary Manipulation',
    language: 'python',
  },
};

export function StudentProblemPage() {
  const { problemId } = useParams();
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setProblem(MOCK_PROBLEMS[problemId] || {
        id: problemId,
        type: 'challenge',
        title: 'Unknown Problem',
        language: 'python',
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [problemId]);

  const isGuided = useMemo(() => problem?.type === 'guided', [problem]);

  if (!problem) return <FullPageSpinner />;

  return isGuided ? (
    <GuidedPage problemId={problem.id} />
  ) : (
    <ChallengePage problemId={problem.id} />
  );
}
