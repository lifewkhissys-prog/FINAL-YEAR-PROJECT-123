import { Fragment, useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderClock, Check, X, Calendar, Filter } from 'lucide-react';
import { Badge, LangBadge, TypeBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { SubmissionPanel } from '../../components/problems/SubmissionPanel';
import useAuthStore from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';

export function SubmissionsPage() {
  const user = useAuthStore((state) => state.user);
  const { submissions: storeSubmissions } = useDemoStore();
  
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    course: 'all',
    type: 'all',
    status: 'all',
    from: '',
    to: ''
  });
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!user) return;

    // Filter submissions for this student
    const studentSubs = storeSubmissions.filter(
      (s) => s.studentEmail.toLowerCase() === user.email.toLowerCase()
    );

    // Map to required layout format
    const mapped = studentSubs.map((sub) => {
      const passedCount = sub.testCases ? sub.testCases.filter((tc) => tc.status === 'passed').length : (sub.status === 'completed' ? 1 : 0);
      const totalCount = sub.testCases ? sub.testCases.length : 1;
      const scoreLabel = `${passedCount}/${totalCount}`;
      const status = sub.status === 'completed' ? (passedCount === totalCount ? 'accepted' : 'wrong') : 'error';

      const dateObj = new Date(sub.submittedAt || Date.now());
      const dateLabel = dateObj.toLocaleDateString() + ', ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return {
        id: sub.id,
        problemId: sub.problemId,
        problemTitle: sub.problemTitle || 'Unknown Problem',
        course: sub.course || 'Introduction to Python',
        type: sub.type || 'challenge',
        language: sub.language || 'python',
        status,
        score: scoreLabel,
        submittedAt: sub.submittedAt || new Date().toISOString(),
        dateLabel,
        submission: {
          status: sub.status,
          score: passedCount,
          totalCases: totalCount,
          stderr: sub.error,
          results: (sub.testCases || []).map((t, idx) => ({
            id: t.id || idx,
            passed: t.status === 'passed',
            stdin: 'Sample stdin',
            expected_output: 'Expected output',
            actual_output: t.status === 'passed' ? 'Expected output' : (sub.error || 'Output mismatch'),
            exec_time_ms: parseInt(t.executionTime) || 12,
            is_hidden: false
          }))
        }
      };
    });

    setSubmissions(mapped);
    setLoading(false);
  }, [user, storeSubmissions]);

  const courses = useMemo(() => {
    return ['all', ...new Set(submissions.map((sub) => sub.course))];
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      if (filters.course !== 'all' && submission.course !== filters.course) return false;
      if (filters.type !== 'all' && submission.type !== filters.type) return false;
      if (filters.status !== 'all' && submission.status !== filters.status) return false;
      if (filters.from && new Date(submission.submittedAt) < new Date(filters.from)) return false;
      if (filters.to && new Date(submission.submittedAt) > new Date(`${filters.to}T23:59:59`)) return false;
      return true;
    });
  }, [filters, submissions]);

  if (loading) return <FullPageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in px-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">My Submissions</h1>
        <p className="text-sm text-[var(--text-secondary)]">History of all your code submissions across courses.</p>
      </div>

      <div className="glass p-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          <Filter size={14} /> Filters
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 flex-1">
          <select
            value={filters.course}
            onChange={(event) => setFilters((prev) => ({ ...prev, course: event.target.value }))}
            className="bg-[var(--bg-primary)] border border-default rounded px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            {courses.map((course) => (
              <option key={course} value={course}>{course === 'all' ? 'All courses' : course}</option>
            ))}
          </select>
          <select
            value={filters.type}
            onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
            className="bg-[var(--bg-primary)] border border-default rounded px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All types</option>
            <option value="guided">Guided</option>
            <option value="challenge">Challenge</option>
          </select>
          <select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            className="bg-[var(--bg-primary)] border border-default rounded px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All statuses</option>
            <option value="accepted">Accepted</option>
            <option value="wrong">Wrong Answer</option>
            <option value="error">Error</option>
          </select>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-[var(--text-muted)]" />
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
              className="bg-[var(--bg-primary)] border border-default rounded px-3 py-2 text-sm text-[var(--text-primary)] w-full"
            />
            <span className="text-xs text-[var(--text-muted)]">to</span>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
              className="bg-[var(--bg-primary)] border border-default rounded px-3 py-2 text-sm text-[var(--text-primary)] w-full"
            />
          </div>
        </div>
      </div>

      {filteredSubmissions.length > 0 ? (
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-dark-800/50 text-[var(--text-secondary)] border-b border-default uppercase text-xs tracking-wider">
                <tr>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Course</th>
                  <th className="p-4 font-semibold">Problem</th>
                  <th className="p-4 font-semibold">Language</th>
                  <th className="p-4 font-semibold">Score</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSubmissions.map((sub) => (
                  <Fragment key={sub.id}>
                    <tr
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                      onClick={() => setExpandedId((prev) => (prev === sub.id ? null : sub.id))}
                    >
                      <td className="p-4 text-[var(--text-secondary)]">{sub.dateLabel}</td>
                      <td className="p-4 text-[var(--text-secondary)]">{sub.course}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Link to={`/student/problems/${sub.problemId}`} className="font-medium text-[var(--text-primary)] group-hover:text-brand-blue transition-colors">
                            {sub.problemTitle}
                          </Link>
                          <TypeBadge type={sub.type} />
                        </div>
                      </td>
                      <td className="p-4"><LangBadge lang={sub.language} /></td>
                      <td className="p-4 font-mono text-[var(--text-secondary)]">
                        {sub.score.split('/')[0] === sub.score.split('/')[1] ? (
                          <span className="text-brand-green flex items-center gap-1"><Check size={14}/> {sub.score}</span>
                        ) : (
                          <span className="text-red-400 flex items-center gap-1"><X size={14}/> {sub.score}</span>
                        )}
                      </td>
                      <td className="p-4">
                        {sub.status === 'accepted' && <Badge variant="green">Accepted</Badge>}
                        {sub.status === 'wrong' && <Badge variant="red">Wrong Answer</Badge>}
                        {sub.status === 'error' && <Badge variant="yellow">Error</Badge>}
                      </td>
                    </tr>
                    {expandedId === sub.id && (
                      <tr key={`${sub.id}-panel`} className="bg-[var(--bg-primary)]">
                        <td colSpan={6} className="p-4">
                          <div className="border border-default rounded-lg overflow-hidden">
                            <SubmissionPanel submission={sub.submission} isLoading={false} />
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
      ) : (
        <EmptyState 
          icon={FolderClock} 
          title="No submissions yet" 
          message="Start practicing to see your submission history here." 
        />
      )}
    </div>
  );
}
