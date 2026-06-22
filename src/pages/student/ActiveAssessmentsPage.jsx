import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, BookOpen, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { useDemoStore } from '../../store/demoStore';

export function ActiveAssessmentsPage() {
  const { assessments: storeAssessments, courses } = useDemoStore();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = Date.now();
    const active = storeAssessments
      .filter((a) => {
        const start = new Date(a.startsAt).getTime();
        const end = new Date(a.endsAt).getTime();
        return now >= start && now <= end;
      })
      .map((a) => {
        const end = new Date(a.endsAt).getTime();
        const minDiff = Math.max(0, Math.floor((end - now) / 60000));
        const hours = Math.floor(minDiff / 60);
        const mins = minDiff % 60;
        const timeRemaining = hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
        
        const course = courses.find((c) => c.id === a.courseId);
        
        return {
          id: a.id,
          title: a.title,
          course: course ? course.title : 'General Computer Science',
          timeRemaining,
          problemsCount: a.problemIds ? a.problemIds.length : 0,
          isUrgent: minDiff < 60
        };
      });

    setAssessments(active);
    setLoading(false);
  }, [storeAssessments, courses]);

  if (loading) return <FullPageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in px-4">
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
