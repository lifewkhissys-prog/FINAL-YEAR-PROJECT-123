import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Play, CheckCircle, Clock } from 'lucide-react';
import { TypeBadge, StatusBadge, LangBadge } from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';
import useAuthStore from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';

export function CourseDetailPage() {
  const { courseId } = useParams();
  const user = useAuthStore((state) => state.user);
  const { courses, problems, assessments, submissions } = useDemoStore();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const foundCourse = courses.find((c) => c.id === courseId);
    if (!foundCourse) {
      setCourse(null);
      setLoading(false);
      return;
    }

    // Filter problems for this course
    const courseProblems = (foundCourse.problemIds || []).map((pId) => {
      const prob = problems[pId];
      if (!prob) return null;

      // Check student submissions
      const studentSubs = submissions.filter(
        (s) => s.studentEmail.toLowerCase() === user.email.toLowerCase() && s.problemId === pId
      );
      
      const hasCompleted = studentSubs.some((s) => s.status === 'completed');
      const status = hasCompleted ? 'completed' : studentSubs.length > 0 ? 'pending' : 'not_started';

      let bestScore = '0%';
      if (prob.type === 'challenge') {
        const totalCases = prob.testCases ? prob.testCases.length : 0;
        let maxPassed = 0;
        studentSubs.forEach((sub) => {
          if (sub.status === 'completed') {
            maxPassed = totalCases;
          } else if (sub.testCases) {
            const passed = sub.testCases.filter((tc) => tc.status === 'passed').length;
            if (passed > maxPassed) maxPassed = passed;
          }
        });
        bestScore = totalCases > 0 ? `${maxPassed}/${totalCases}` : '0/0';
      } else {
        // Guided
        bestScore = hasCompleted ? '1/1' : '0/1';
      }

      return {
        ...prob,
        status,
        bestScore
      };
    }).filter(Boolean);

    // Filter assessments for this course
    const courseAssessments = assessments
      .filter((a) => a.courseId === courseId)
      .map((a) => {
        const now = Date.now();
        const start = new Date(a.startsAt).getTime();
        const end = new Date(a.endsAt).getTime();
        
        let status = 'upcoming';
        let timeLabel = '';

        if (now >= start && now <= end) {
          status = 'active';
          const minDiff = Math.max(0, Math.floor((end - now) / 60000));
          const hours = Math.floor(minDiff / 60);
          const mins = minDiff % 60;
          timeLabel = hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
        } else if (now < start) {
          status = 'upcoming';
          const minDiff = Math.max(0, Math.floor((start - now) / 60000));
          const days = Math.floor(minDiff / 1440);
          const hours = Math.floor((minDiff % 1440) / 60);
          timeLabel = days > 0 ? `Starts in ${days} days` : `Starts in ${hours} hours`;
        } else {
          status = 'ended';
          const dateObj = new Date(a.endsAt);
          timeLabel = `Ended ${dateObj.toLocaleDateString()}`;
        }

        return {
          id: a.id,
          title: a.title,
          status,
          timeRemaining: status === 'active' ? timeLabel : undefined,
          date: status !== 'active' ? timeLabel : undefined
        };
      });

    setCourse({
      ...foundCourse,
      problems: courseProblems,
      assessments: courseAssessments
    });
    setLoading(false);
  }, [courseId, courses, problems, assessments, submissions, user]);

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
