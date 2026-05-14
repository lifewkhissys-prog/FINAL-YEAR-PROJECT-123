import { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle, Clock } from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { Input } from '../../components/ui/Input';

export function GradebookPage() {
  const { id } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    setTimeout(() => {
      setAssessment({
        id,
        courseId: '1',
        title: 'Midterm Practical',
        course: 'Introduction to Python',
        window: 'Today, 10:00 - 12:00',
        status: 'active',
        problems: [
          { id: 'p1', title: 'Two Sum', total: 5 },
          { id: 'p2', title: 'SQL Murder Mystery', total: 5 },
          { id: 'p3', title: 'Dictionary Manipulation', total: 5 },
        ],
      });
      setResults([
        {
          id: 1,
          studentId: '3371222',
          name: 'Ankomah Kelvin',
          status: 'completed',
          submittedAt: '10:45 AM',
          scores: { p1: 5, p2: 4, p3: null },
        },
        {
          id: 2,
          studentId: '3364722',
          name: 'Mahfuz Abgor Seidu',
          status: 'completed',
          submittedAt: '10:55 AM',
          scores: { p1: 4, p2: 5, p3: 5 },
        },
        {
          id: 3,
          studentId: '1234567',
          name: 'John Doe',
          status: 'pending',
          submittedAt: '-',
          scores: { p1: null, p2: null, p3: null },
        },
      ]);
      setLoading(false);
    }, 600);
  }, [id]);

  if (loading) return <FullPageSpinner />;

  const totalCases = assessment.problems.reduce((sum, problem) => sum + problem.total, 0);
  const studentsWithTotals = results.map((student) => {
    const passed = assessment.problems.reduce((sum, problem) => {
      const value = student.scores[problem.id];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
    return {
      ...student,
      passed,
      total: totalCases,
      percent: totalCases > 0 ? Math.round((passed / totalCases) * 100) : 0,
    };
  });

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return studentsWithTotals;
    return studentsWithTotals.filter((student) => (
      student.name.toLowerCase().includes(term) || student.studentId.includes(term)
    ));
  }, [studentsWithTotals, query]);

  const sorted = useMemo(() => {
    const next = [...filtered];
    next.sort((a, b) => {
      if (sortKey === 'name') {
        return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortKey === 'total') {
        return sortDir === 'asc' ? a.passed - b.passed : b.passed - a.passed;
      }
      if (sortKey.startsWith('problem:')) {
        const problemId = sortKey.replace('problem:', '');
        const aScore = a.scores[problemId];
        const bScore = b.scores[problemId];
        const aVal = typeof aScore === 'number' ? aScore : -1;
        const bVal = typeof bScore === 'number' ? bScore : -1;
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return next;
  }, [filtered, sortDir, sortKey]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/lecturer/assessments" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Assessments
          </Link>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">Gradebook: {assessment.title}</h1>
          <p className="text-[var(--text-secondary)]">{assessment.course} • {assessment.window}</p>
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
           <div className="mt-1"><StatusBadge status={assessment.status} /></div>
         </div>
      </div>

      <div className="glass p-4">
        <Input
          placeholder="Search students by name or ID"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-dark-800/50 text-[var(--text-secondary)] border-b border-default uppercase text-xs tracking-wider">
              <tr>
                <th className="p-4 font-semibold">Student</th>
                {assessment.problems.map((problem) => (
                  <th key={problem.id} className="p-4 font-semibold">
                    <button
                      className="hover:text-[var(--text-primary)]"
                      onClick={() => toggleSort(`problem:${problem.id}`)}
                      type="button"
                    >
                      {problem.title}
                    </button>
                  </th>
                ))}
                <th className="p-4 font-semibold">
                  <button
                    className="hover:text-[var(--text-primary)]"
                    onClick={() => toggleSort('total')}
                    type="button"
                  >
                    Total
                  </button>
                </th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map((student) => (
                <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4">
                    <Link
                      to={`/lecturer/courses/${assessment.courseId}/students/${student.studentId}`}
                      className="font-medium text-[var(--text-primary)] hover:text-brand-blue transition-colors"
                    >
                      {student.name}
                    </Link>
                    <div className="text-xs text-[var(--text-muted)]">{student.studentId}</div>
                  </td>
                  {assessment.problems.map((problem) => {
                    const score = student.scores[problem.id];
                    const label = typeof score === 'number' ? `${score}/${problem.total}` : '—';
                    return (
                      <td key={problem.id} className="p-4">
                        {typeof score === 'number' ? (
                          <Link
                            to={`/lecturer/assessments/${assessment.id}/students/${student.studentId}?problemId=${problem.id}`}
                            className={typeof score === 'number' && score === problem.total ? 'text-brand-green font-semibold hover:underline' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}
                          >
                            {label}
                          </Link>
                        ) : (
                          <span className="text-[var(--text-secondary)]">{label}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-4 font-semibold text-[var(--text-primary)]">
                    {student.passed}/{student.total}
                  </td>
                  <td className="p-4"><StatusBadge status={student.status} /></td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td className="p-4 text-[var(--text-muted)]" colSpan={assessment.problems.length + 3}>
                    No students match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
