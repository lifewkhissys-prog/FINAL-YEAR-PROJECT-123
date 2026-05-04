import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderClock, Check, X, Clock } from 'lucide-react';
import { StatusBadge, LangBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { FullPageSpinner } from '../../components/ui/Spinner';

export function SubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setSubmissions([
        { id: 's1', problemId: '103', problemTitle: 'Two Sum', language: 'python', status: 'completed', score: '3/3', date: '2 hours ago' },
        { id: 's2', problemId: '104', problemTitle: 'Dictionary Manipulation', language: 'python', status: 'error', score: '0/4', date: 'Yesterday' },
        { id: 's3', problemId: '101', problemTitle: 'Hello World', language: 'python', status: 'completed', score: '1/1', date: '2 days ago' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) return <FullPageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">My Submissions</h1>
        <p className="text-sm text-[var(--text-secondary)]">History of all your code submissions across courses.</p>
      </div>

      {submissions.length > 0 ? (
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-dark-800/50 text-[var(--text-secondary)] border-b border-default uppercase text-xs tracking-wider">
                <tr>
                  <th className="p-4 font-semibold">Problem</th>
                  <th className="p-4 font-semibold">Language</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Score</th>
                  <th className="p-4 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                    <td className="p-4">
                      <Link to={`/problems/${sub.problemId}/challenge`} className="font-medium text-[var(--text-primary)] group-hover:text-brand-blue transition-colors">
                        {sub.problemTitle}
                      </Link>
                    </td>
                    <td className="p-4"><LangBadge lang={sub.language} /></td>
                    <td className="p-4"><StatusBadge status={sub.status} /></td>
                    <td className="p-4 font-mono text-[var(--text-secondary)]">
                      {sub.score.split('/')[0] === sub.score.split('/')[1] ? (
                        <span className="text-brand-green flex items-center gap-1"><Check size={14}/> {sub.score}</span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1"><X size={14}/> {sub.score}</span>
                      )}
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] flex items-center gap-1.5"><Clock size={14} />{sub.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState 
          icon={FolderClock} 
          title="No submissions yet" 
          message="When you run or submit code for a problem, your history will appear here." 
        />
      )}
    </div>
  );
}
