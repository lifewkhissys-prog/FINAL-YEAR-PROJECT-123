import { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { Input } from '../../components/ui/Input';
import { useDemoStore } from '../../store/demoStore';

export function GradebookPage() {
  const { assessmentId: id } = useParams(); // assessmentId
  const { assessments, courses, problems, submissions, studentsList } = useDemoStore();

  const [assessment, setAssessment] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    const storeAssessment = assessments.find((a) => a.id === id);
    if (!storeAssessment) {
      setAssessment(null);
      setLoading(false);
      return;
    }

    const courseObj = courses.find((c) => c.id === storeAssessment.courseId);
    
    // Status
    const now = Date.now();
    const start = new Date(storeAssessment.startsAt).getTime();
    const end = new Date(storeAssessment.endsAt).getTime();
    let status = 'upcoming';
    if (now >= start && now <= end) status = 'active';
    else if (now > end) status = 'ended';

    const dateObj = new Date(storeAssessment.startsAt);
    const formattedStart = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const formattedStartTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedEndTime = new Date(storeAssessment.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Problems metadata
    const assessmentProblems = (storeAssessment.problemIds || []).map((pId) => {
      const prob = problems[pId];
      return {
        id: pId,
        title: prob ? prob.title : 'Problem ' + pId,
        total: prob && prob.testCases ? prob.testCases.length : 1
      };
    });

    // Enrolled student emails
    const enrolledEmails = courseObj ? (courseObj.students || []) : [];

    // Map each student's submission scores
    const studentsResults = enrolledEmails.map((email) => {
      const studentInfo = studentsList.find((s) => s.email.toLowerCase() === email.toLowerCase()) || {
        email,
        name: email.split('@')[0]
      };

      const scores = {};
      let hasAnySubmission = false;

      assessmentProblems.forEach((prob) => {
        const probSubs = submissions.filter(
          (s) =>
            s.studentEmail.toLowerCase() === email.toLowerCase() &&
            s.problemId === prob.id &&
            s.assessmentId === id
        );

        if (probSubs.length > 0) {
          hasAnySubmission = true;
          // Find max passed test cases
          let maxPassed = 0;
          probSubs.forEach((sub) => {
            const passedCount = sub.testCases
              ? sub.testCases.filter((tc) => tc.status === 'passed').length
              : (sub.status === 'completed' ? 1 : 0);
            if (passedCount >= maxPassed) {
              maxPassed = passedCount;
            }
          });
          scores[prob.id] = maxPassed;
        } else {
          scores[prob.id] = null;
        }
      });

      return {
        id: email, // use email as unique student identifier
        studentId: email,
        name: studentInfo.name,
        status: hasAnySubmission ? 'completed' : 'pending',
        scores
      };
    });

    setAssessment({
      id: storeAssessment.id,
      courseId: storeAssessment.courseId,
      title: storeAssessment.title,
      course: courseObj ? courseObj.title : 'General Course',
      window: `${formattedStart}, ${formattedStartTime} - ${formattedEndTime}`,
      status,
      problems: assessmentProblems
    });
    setResults(studentsResults);
    setLoading(false);
  }, [id, assessments, courses, problems, submissions, studentsList]);

  const totalCases = useMemo(() => {
    if (!assessment) return 0;
    return assessment.problems.reduce((sum, problem) => sum + problem.total, 0);
  }, [assessment]);

  const studentsWithTotals = useMemo(() => {
    if (!assessment) return [];
    return results.map((student) => {
      const passed = assessment.problems.reduce((sum, problem) => {
        const value = student.scores[problem.id];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
      return {
        ...student,
        passed,
        total: totalCases,
        percent: totalCases > 0 ? Math.round((passed / totalCases) * 100) : 0
      };
    });
  }, [results, assessment, totalCases]);

  const stats = useMemo(() => {
    if (studentsWithTotals.length === 0) {
      return { average: 0, highest: 0, completedCount: 0 };
    }
    const completed = studentsWithTotals.filter((s) => s.status === 'completed');
    const totalCount = studentsWithTotals.length;
    const highest = Math.max(...studentsWithTotals.map((s) => s.percent));
    
    let average = 0;
    if (completed.length > 0) {
      const sum = completed.reduce((acc, s) => acc + s.percent, 0);
      average = Math.round(sum / completed.length);
    }

    return {
      average,
      highest: highest >= 0 ? highest : 0,
      completedCount: completed.length,
      totalCount
    };
  }, [studentsWithTotals]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return studentsWithTotals;
    return studentsWithTotals.filter((student) => (
      student.name.toLowerCase().includes(term) || student.studentId.toLowerCase().includes(term)
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

  const handleExportCSV = () => {
    if (!assessment) return;
    const headers = ['Student Name', 'Email', ...assessment.problems.map((p) => p.title), 'Total Score', 'Status'];
    const rows = studentsWithTotals.map((student) => [
      student.name,
      student.studentId,
      ...assessment.problems.map((p) => {
        const score = student.scores[p.id];
        return typeof score === 'number' ? `${score}/${p.total}` : '—';
      }),
      `${student.passed}/${student.total}`,
      student.status
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gradebook-${assessment.title.toLowerCase().replace(/\s+/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <FullPageSpinner />;

  if (!assessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Assessment Not Found</h2>
        <p className="text-[var(--text-secondary)] mb-4">The requested gradebook could not be found.</p>
        <Link to="/lecturer/assessments" className="btn-primary">
          Back to Assessments
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/lecturer/assessments" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Assessments
          </Link>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">Gradebook: {assessment.title}</h1>
          <p className="text-[var(--text-secondary)]">{assessment.course} • {assessment.window}</p>
        </div>
        <button onClick={handleExportCSV} className="btn-secondary whitespace-nowrap">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="glass p-4 rounded-xl">
           <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Average Score</div>
           <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.average}%</div>
         </div>
         <div className="glass p-4 rounded-xl">
           <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Highest Score</div>
           <div className="text-2xl font-bold text-brand-green">{stats.highest}%</div>
         </div>
         <div className="glass p-4 rounded-xl">
           <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Submissions</div>
           <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.completedCount} / {stats.totalCount}</div>
         </div>
         <div className="glass p-4 rounded-xl">
           <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Status</div>
           <div className="mt-1"><StatusBadge status={assessment.status} /></div>
         </div>
      </div>

      <div className="glass p-4">
        <Input
          placeholder="Search students by name or email"
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
                    <div className="text-xs text-[var(--text-muted)] truncate max-w-[180px]">{student.studentId}</div>
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
