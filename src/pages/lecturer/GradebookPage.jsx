import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle, Clock } from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';

export function GradebookPage() {
  const { id } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setAssessment({ id, title: 'Midterm Practical', course: 'Introduction to Python' });
      setResults([
        { id: 1, studentId: '3371222', name: 'Ankomah Kelvin', score: 100, passed: 10, total: 10, status: 'completed', submittedAt: '10:45 AM' },
        { id: 2, studentId: '3364722', name: 'Mahfuz Abgor Seidu', score: 80, passed: 8, total: 10, status: 'completed', submittedAt: '10:55 AM' },
        { id: 3, studentId: '1234567', name: 'John Doe', score: 0, passed: 0, total: 10, status: 'pending', submittedAt: '-' },
      ]);
      setLoading(false);
    }, 600);
  }, [id]);

  if (loading) return <FullPageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/lecturer/assessments" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Assessments
          </Link>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">Gradebook: {assessment.title}</h1>
          <p className="text-[var(--text-secondary)]">{assessment.course}</p>
        </div>
        <button className="btn-secondary whitespace-nowrap">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="glass p-4 rounded-xl">
           <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Average Score</div>
           <div className="text-2xl font-bold text-[var(--text-primary)]">90%</div>
         </div>
         <div className="glass p-4 rounded-xl">
           <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Highest Score</div>
           <div className="text-2xl font-bold text-brand-green">100%</div>
         </div>
         <div className="glass p-4 rounded-xl">
           <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Submissions</div>
           <div className="text-2xl font-bold text-[var(--text-primary)]">2 / 3</div>
         </div>
         <div className="glass p-4 rounded-xl">
           <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Status</div>
           <div className="mt-1"><StatusBadge status="completed" /></div>
         </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-dark-800/50 text-[var(--text-secondary)] border-b border-default uppercase text-xs tracking-wider">
              <tr>
                <th className="p-4 font-semibold">Student ID</th>
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Score</th>
                <th className="p-4 font-semibold">Test Cases</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Submitted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                  <td className="p-4 font-mono text-[var(--text-secondary)]">{r.studentId}</td>
                  <td className="p-4 font-medium text-[var(--text-primary)] group-hover:text-brand-blue transition-colors">{r.name}</td>
                  <td className="p-4">
                    <span className={`font-bold ${r.score >= 80 ? 'text-brand-green' : r.score > 0 ? 'text-yellow-400' : 'text-[var(--text-muted)]'}`}>
                      {r.score}%
                    </span>
                  </td>
                  <td className="p-4 text-[var(--text-secondary)]">
                     <span className={r.passed === r.total && r.total > 0 ? 'text-brand-green' : ''}>
                       {r.passed} / {r.total}
                     </span>
                  </td>
                  <td className="p-4"><StatusBadge status={r.status} /></td>
                  <td className="p-4 text-[var(--text-secondary)]">{r.submittedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
