import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, BookOpen, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { FullPageSpinner } from '../../components/ui/Spinner';

export function ActiveAssessmentsPage() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setAssessments([
        { id: 'a1', title: 'Midterm Practical', course: 'Introduction to Python', timeRemaining: '45 mins left', problemsCount: 3, isUrgent: true },
        { id: 'a2', title: 'SQL Joins Quiz', course: 'Database Systems', timeRemaining: '2 days left', problemsCount: 5, isUrgent: false },
      ]);
      setLoading(false);
    }, 600);
  }, []);

  if (loading) return <FullPageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Active Assessments</h1>
        <p className="text-sm text-[var(--text-secondary)]">Assessments that are currently open for submission.</p>
      </div>

      {assessments.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {assessments.map(a => (
            <Card key={a.id} className="flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-semibold border ${a.isUrgent ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse' : 'bg-brand-blue/10 text-brand-blue border-brand-blue/30'}`}>
                   <Clock size={16} />
                   {a.timeRemaining}
                </div>
              </div>
              
              <h3 className="font-semibold text-[var(--text-primary)] text-xl mb-1">{a.title}</h3>
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-6">
                 <BookOpen size={14} />
                 <span>{a.course}</span>
                 <span className="mx-2">•</span>
                 <span>{a.problemsCount} problems</span>
              </div>
              
              <Link to={`/student/assessments/${a.id}`} className="mt-auto btn-primary w-full justify-center">
                Enter Assessment
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState 
          icon={AlertCircle} 
          title="No active assessments" 
          message="You have no active assessments at this time. Enjoy your free time!" 
        />
      )}
    </div>
  );
}
