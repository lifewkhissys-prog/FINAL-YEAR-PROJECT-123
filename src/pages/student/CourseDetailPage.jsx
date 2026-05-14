import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Play, CheckCircle, Clock } from 'lucide-react';
import { TypeBadge, StatusBadge, LangBadge } from '../../components/ui/Badge';
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
          { id: '101', title: 'Hello World', type: 'guided', status: 'completed', language: 'python', bestScore: '1/1' },
          { id: '102', title: 'Variables & Types', type: 'guided', status: 'completed', language: 'python', bestScore: '1/1' },
          { id: '103', title: 'List Comprehensions', type: 'challenge', status: 'pending', language: 'python', bestScore: '3/5' },
          { id: '104', title: 'Dictionary Manipulation', type: 'challenge', status: 'pending', language: 'python', bestScore: '2/5' },
        ],
        assessments: [
          { id: 'a1', title: 'Midterm Practical', status: 'active', timeRemaining: '45 mins left' },
          { id: 'a2', title: 'Sorting Lab', status: 'upcoming', date: 'Next Friday' },
          { id: 'a3', title: 'Foundations Quiz', status: 'ended', date: 'Ended last week' }
        ]
      });
      setLoading(false);
    }, 500);
  }, [id]);

  const groupedProblems = useMemo(() => {
    if (!course) return { guided: [], challenge: [] };
    return course.problems.reduce(
      (acc, problem) => {
        acc[problem.type].push(problem);
        return acc;
      },
      { guided: [], challenge: [] }
    );
  }, [course]);

  const groupedAssessments = useMemo(() => {
    if (!course) return { active: [], upcoming: [], ended: [] };
    return course.assessments.reduce(
      (acc, assessment) => {
        acc[assessment.status].push(assessment);
        return acc;
      },
      { active: [], upcoming: [], ended: [] }
    );
  }, [course]);

  if (loading) return <FullPageSpinner />;
  if (!course) return <div>Course not found</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <Link to="/student/courses" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Courses
        </Link>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{course.title}</h1>
        <p className="text-[var(--text-secondary)] max-w-2xl leading-relaxed">{course.description}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] border-b border-default pb-2">Practice Problems</h2>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-[var(--text-muted)]">Guided</h3>
                  <span className="text-xs text-[var(--text-muted)]">{groupedProblems.guided.length} problems</span>
                </div>
                <div className="space-y-3">
                  {groupedProblems.guided.map((problem) => (
                    <div key={problem.id} className="glass p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${problem.status === 'completed' ? 'bg-brand-green/20 text-brand-green' : 'bg-white/5 text-[var(--text-secondary)]'}`}>
                          {problem.status === 'completed' ? <CheckCircle size={18} /> : <Play size={16} className="ml-0.5" />}
                        </div>
                        <div>
                          <h4 className="font-medium text-[var(--text-primary)]">{problem.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <TypeBadge type={problem.type} />
                            <LangBadge lang={problem.language} />
                            <span className="text-xs text-[var(--text-muted)]">Best: {problem.bestScore}</span>
                          </div>
                        </div>
                      </div>
                      <Link to={`/student/problems/${problem.id}`} className="btn-secondary btn-sm">
                        Practice <ArrowRight size={14} />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-[var(--text-muted)]">Challenge</h3>
                  <span className="text-xs text-[var(--text-muted)]">{groupedProblems.challenge.length} problems</span>
                </div>
                <div className="space-y-3">
                  {groupedProblems.challenge.map((problem) => (
                    <div key={problem.id} className="glass p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${problem.status === 'completed' ? 'bg-brand-green/20 text-brand-green' : 'bg-white/5 text-[var(--text-secondary)]'}`}>
                          {problem.status === 'completed' ? <CheckCircle size={18} /> : <Play size={16} className="ml-0.5" />}
                        </div>
                        <div>
                          <h4 className="font-medium text-[var(--text-primary)]">{problem.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <TypeBadge type={problem.type} />
                            <LangBadge lang={problem.language} />
                            <span className="text-xs text-[var(--text-muted)]">Best: {problem.bestScore}</span>
                          </div>
                        </div>
                      </div>
                      <Link to={`/student/problems/${problem.id}`} className="btn-secondary btn-sm">
                        Practice <ArrowRight size={14} />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] border-b border-default pb-2">Assessments</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Active</h3>
              <div className="space-y-3">
                {groupedAssessments.active.map((assessment) => (
                  <div key={assessment.id} className="glass p-5 border-l-2 border-l-brand-green">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-[var(--text-primary)]">{assessment.title}</h4>
                      <StatusBadge status="active" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Clock size={14} />
                      <span>{assessment.timeRemaining}</span>
                    </div>
                    <div className="mt-3">
                      <Link to={`/student/assessments/${assessment.id}`} className="text-sm text-brand-blue hover:text-brand-purple">
                        Enter Assessment
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Upcoming</h3>
              <div className="space-y-3">
                {groupedAssessments.upcoming.map((assessment) => (
                  <div key={assessment.id} className="glass p-5 border-l-2 border-l-brand-purple">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-[var(--text-primary)]">{assessment.title}</h4>
                      <StatusBadge status="scheduled" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Clock size={14} />
                      <span>{assessment.date}</span>
                    </div>
                    <div className="mt-3">
                      <button className="text-sm text-[var(--text-muted)] cursor-not-allowed" disabled>
                        Starts soon
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Ended</h3>
              <div className="space-y-3">
                {groupedAssessments.ended.map((assessment) => (
                  <div key={assessment.id} className="glass p-5 border-l-2 border-l-dark-600">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-[var(--text-primary)]">{assessment.title}</h4>
                      <StatusBadge status="ended" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Clock size={14} />
                      <span>{assessment.date}</span>
                    </div>
                    <div className="mt-3">
                      <Link to={`/student/assessments/${assessment.id}/results`} className="text-sm text-brand-blue hover:text-brand-purple">
                        View Results
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
