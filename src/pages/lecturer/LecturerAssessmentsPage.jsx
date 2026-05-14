import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, CalendarClock } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/Badge';

export function LecturerAssessmentsPage() {
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAssessments([
        { id: 'a1', title: 'Midterm Practical', course: 'Introduction to Python', status: 'active', window: 'Today, 10:00 - 12:00' },
        { id: 'a2', title: 'SQL Joins Quiz', course: 'Database Systems', status: 'scheduled', window: 'Next Friday, 10:00 - 11:00' },
        { id: 'a3', title: 'Final Lab', course: 'Data Structures', status: 'ended', window: 'Last week' },
      ]);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, []);

  if (loading) return <FullPageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Assessments</h1>
          <p className="text-sm text-[var(--text-secondary)]">Create and manage timed assessments.</p>
        </div>
        <Link to="/lecturer/assessments/new" className="btn-primary">
          <Plus size={16} /> New Assessment
        </Link>
      </div>

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-dark-800/50 text-[var(--text-secondary)] border-b border-default uppercase text-xs tracking-wider">
              <tr>
                <th className="p-4 font-semibold">Assessment</th>
                <th className="p-4 font-semibold">Course</th>
                <th className="p-4 font-semibold">Window</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {assessments.map((assessment) => (
                <tr key={assessment.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-medium text-[var(--text-primary)]">{assessment.title}</td>
                  <td className="p-4 text-[var(--text-secondary)]">{assessment.course}</td>
                  <td className="p-4 text-[var(--text-secondary)] flex items-center gap-2">
                    <CalendarClock size={14} /> {assessment.window}
                  </td>
                  <td className="p-4"><StatusBadge status={assessment.status} /></td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Link to={`/lecturer/assessments/${assessment.id}`} className="text-brand-blue hover:text-brand-purple">Details</Link>
                      <Link to={`/lecturer/assessments/${assessment.id}/gradebook`} className="text-brand-blue hover:text-brand-purple">Gradebook</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
