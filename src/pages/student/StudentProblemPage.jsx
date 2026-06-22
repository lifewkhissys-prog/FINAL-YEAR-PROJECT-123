import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { ChallengePage } from './ChallengePage';
import { GuidedPage } from './GuidedPage';
import { useDemoStore } from '../../store/demoStore';

export function StudentProblemPage() {
  const { problemId } = useParams();
  const { problems } = useDemoStore();
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    const found = problems[problemId];
    if (found) {
      setProblem(found);
    } else {
      setProblem({
        id: problemId,
        type: 'challenge',
        title: 'Unknown Problem',
        language: 'python'
      });
    }
  }, [problemId, problems]);

  const isGuided = useMemo(() => problem?.type === 'guided', [problem]);

  if (!problem) return <FullPageSpinner />;

  return isGuided ? (
    <GuidedPage problemId={problem.id} />
  ) : (
    <ChallengePage problemId={problem.id} />
  );
}
