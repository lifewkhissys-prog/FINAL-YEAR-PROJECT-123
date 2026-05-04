import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, CheckCircle, Clock } from 'lucide-react';
import { TypeBadge, StatusBadge } from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';

export function CourseDetailPage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setCourse({
        id,
        title: 'Introduction to Python',
        description: 'Learn the basics of Python programming, from variables to data structures.',
        problems: [
          { id: '101', title: 'Hello World', type: 'guided', status: 'completed' },
          { id: '102', title: 'Variables & Types', type: 'guided', status: 'completed' },
          { id: '103', title: 'List Comprehensions', type: 'challenge', status: 'pending' },
          { id: '104', title: 'Dictionary Manipulation', type: 'challenge', status: 'pending' },
        ],
        assessments: [
          { id: 'a1', title: 'Midterm Practical', status: 'upcoming', date: 'Next Friday' },
        ]
      });
      setLoading(false);
    }, 500);
  }, [id]);

  if (loading) return <FullPageSpinner />;
  if (!course) return <div>Course not found</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Courses
        </Link>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{course.title}</h1>
        <p className="text-[var(--text-secondary)] max-w-2xl leading-relaxed">{course.description}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] border-b border-default pb-2">Practice Problems</h2>
          <div className="space-y-3">
            {course.problems.map(p => (
              <Link 
                key={p.id} 
                to={`/problems/${p.id}/${p.type}`}
                className="glass p-4 flex items-center justify-between hover:border-brand-blue/30 hover:-translate-y-0.5 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${p.status === 'completed' ? 'bg-brand-green/20 text-brand-green' : 'bg-white/5 text-[var(--text-secondary)]'}`}>
                    {p.status === 'completed' ? <CheckCircle size={20} /> : <Play size={18} className="ml-0.5 group-hover:text-brand-blue transition-colors" />}
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--text-primary)] group-hover:text-brand-blue transition-colors">{p.title}</h3>
                    <div className="flex gap-2 mt-1">
                      <TypeBadge type={p.type} />
                      {p.status === 'completed' && <StatusBadge status="completed" />}
                    </div>
                  </div>
                </div>
                <ArrowRight size={18} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0" />
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
           <h2 className="text-xl font-semibold text-[var(--text-primary)] border-b border-default pb-2">Assessments</h2>
           {course.assessments.map(a => (
             <div key={a.id} className="glass p-5 border-l-2 border-l-brand-purple">
               <div className="flex items-start justify-between mb-2">
                 <h3 className="font-semibold text-[var(--text-primary)]">{a.title}</h3>
                 <StatusBadge status="pending" />
               </div>
               <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                 <Clock size={14} />
                 <span>{a.date}</span>
               </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
