import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Play, CheckCircle, Clock, Eye, Download, BookOpen, ChevronDown, ChevronRight, Award, HelpCircle } from 'lucide-react';
import { TypeBadge, StatusBadge, LangBadge } from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';
import useAuthStore from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';
import { SlideViewer } from '../../components/ui/SlideViewer';

export function CourseDetailPage() {
  const { courseId } = useParams();
  const user = useAuthStore((state) => state.user);
  const { courses, problems, assessments, submissions } = useDemoStore();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});

  useEffect(() => {
    if (!user) return;
    const foundCourse = courses.find((c) => c.id === courseId);
    if (!foundCourse) {
      setCourse(null);
      setLoading(false);
      return;
    }

    // Map modules and associate their specific items
    const allModSlideIds = new Set();
    const allModProblemIds = new Set();
    const allModAssessmentIds = new Set();

    const courseMods = foundCourse.modules || [];
    courseMods.forEach((m) => {
      (m.slideIds || []).forEach((id) => allModSlideIds.add(id));
      (m.problemIds || []).forEach((id) => allModProblemIds.add(id));
      (m.assessmentIds || []).forEach((id) => allModAssessmentIds.add(id));
    });

    const enrichProblem = (pId) => {
      const prob = problems[pId];
      if (!prob) return null;
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
        bestScore = hasCompleted ? '1/1' : '0/1';
      }

      return { ...prob, status, bestScore };
    };

    const enrichAssessment = (aId) => {
      const a = assessments.find(item => item.id === aId);
      if (!a) return null;
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
    };

    const enrichedModules = courseMods.map((mod) => {
      const modSlides = (foundCourse.slides || []).filter((s) => (mod.slideIds || []).includes(s.id));
      const modProblems = (mod.problemIds || []).map(enrichProblem).filter(Boolean);
      const modAssessments = (mod.assessmentIds || []).map(enrichAssessment).filter(Boolean);

      return {
        ...mod,
        slides: modSlides,
        problems: modProblems,
        assessments: modAssessments
      };
    });

    // Check for loose materials
    const looseSlides = (foundCourse.slides || []).filter(s => !allModSlideIds.has(s.id));
    const looseProblems = (foundCourse.problemIds || []).filter(pId => !allModProblemIds.has(pId)).map(enrichProblem).filter(Boolean);
    const looseAssessments = assessments.filter(a => a.courseId === courseId && !allModAssessmentIds.has(a.id)).map(a => enrichAssessment(a.id)).filter(Boolean);

    if (looseSlides.length > 0 || looseProblems.length > 0 || looseAssessments.length > 0) {
      enrichedModules.push({
        id: 'loose-materials',
        title: 'General Resources',
        description: 'Loose or unassigned course resources.',
        slides: looseSlides,
        problems: looseProblems,
        assessments: looseAssessments
      });
    }

    // Set default expanded state for all modules
    const exp = {};
    enrichedModules.forEach((m) => {
      exp[m.id] = true; // All open by default
    });
    setExpandedModules(exp);

    setCourse({
      ...foundCourse,
      enrichedModules
    });
    setLoading(false);
  }, [courseId, courses, problems, assessments, submissions, user]);

  const toggleModule = (id) => {
    setExpandedModules((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const progressStats = useMemo(() => {
    if (!course || !course.enrichedModules) return { total: 0, completed: 0, percent: 0 };
    let total = 0;
    let completed = 0;
    course.enrichedModules.forEach((m) => {
      m.problems.forEach((p) => {
        total++;
        if (p.status === 'completed') completed++;
      });
    });
    return {
      total,
      completed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [course]);

  if (loading) return <FullPageSpinner />;
  if (!course) return <div className="p-8 text-[var(--text-primary)]">Course not found.</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <Link to="/student/courses" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Courses
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">{course.title}</h1>
          <span className="text-xs px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue font-mono border border-brand-blue/20 uppercase tracking-wider font-semibold">
            {course.joinCode}
          </span>
        </div>
        <p className="text-[var(--text-secondary)] max-w-2xl leading-relaxed">{course.description}</p>
      </div>

      {/* Progress Dashboard */}
      {progressStats.total > 0 && (
        <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue shrink-0">
              <Award size={24} />
            </div>
            <div>
              <h3 className="font-bold text-[var(--text-primary)] text-lg">Your Curriculum Progress</h3>
              <p className="text-xs text-[var(--text-secondary)]">Completed {progressStats.completed} of {progressStats.total} coding challenges</p>
            </div>
          </div>
          <div className="w-full md:w-80 flex items-center gap-3">
            <div className="flex-1 bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="bg-gradient-to-r from-brand-blue to-brand-purple h-full rounded-full transition-all duration-500" 
                style={{ width: `${progressStats.percent}%` }}
              />
            </div>
            <span className="font-mono text-sm font-bold text-[var(--text-primary)] whitespace-nowrap">{progressStats.percent}%</span>
          </div>
        </div>
      )}

      {/* Modules Syllabus List */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-default pb-2">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Learning Modules</h2>
            <span className="text-xs text-[var(--text-muted)] font-mono">{course.enrichedModules?.length || 0} mini-courses</span>
          </div>

          <div className="space-y-4">
            {course.enrichedModules?.map((mod, index) => {
              const isExpanded = expandedModules[mod.id] !== false;
              const completedProblemsCount = mod.problems.filter(p => p.status === 'completed').length;
              return (
                <div key={mod.id} className="glass rounded-2xl border border-white/10 overflow-hidden transition-all duration-300">
                  {/* Module Header */}
                  <div 
                    onClick={() => toggleModule(mod.id)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-mono text-sm font-bold text-[var(--text-secondary)] shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-[var(--text-primary)] text-lg flex items-center gap-2">
                          {mod.title}
                          {mod.problems.length > 0 && completedProblemsCount === mod.problems.length && (
                            <span className="inline-flex items-center text-xs text-brand-green bg-brand-green/10 border border-brand-green/20 px-1.5 py-0.5 rounded-full font-medium">
                              Completed
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{mod.description}</p>
                      </div>
                    </div>
                    <button className="text-[var(--text-secondary)] p-1 rounded hover:bg-white/5 transition-colors">
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                  </div>

                  {/* Module Content */}
                  {isExpanded && (
                    <div className="px-5 pb-6 pt-2 border-t border-white/5 space-y-6 bg-white/[0.005]">
                      {/* Slides Section */}
                      {mod.slides && mod.slides.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                            <BookOpen size={12} /> Lecture Materials
                          </h4>
                          <div className="grid md:grid-cols-2 gap-3">
                            {mod.slides.map(slide => (
                              <div key={slide.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/10 transition-all flex flex-col justify-between group">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-blue/10 text-brand-blue border border-brand-blue/20 font-mono uppercase tracking-wider">
                                      {slide.programmingLanguage || 'general'}
                                    </span>
                                    <span className="text-[10px] text-[var(--text-muted)]">{slide.pages ? slide.pages.length : 0} slides</span>
                                  </div>
                                  <h5 className="font-bold text-[var(--text-primary)] text-sm group-hover:text-brand-blue transition-colors mt-1">{slide.title}</h5>
                                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{slide.description}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-4 pt-2 border-t border-white/5">
                                  <button
                                    onClick={() => setActiveSlide(slide)}
                                    className="btn-primary py-1 px-2.5 text-[11px] flex items-center gap-1 hover:brightness-110"
                                  >
                                    <Eye size={12} /> Preview
                                  </button>
                                  <a
                                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                                      (slide.pages || []).map((p, i) => `Slide ${i+1}: ${p.title}\n====================\n${p.content}\n\n`).join('\n')
                                    )}`}
                                    download={`${slide.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_lecture_notes.txt`}
                                    className="btn-secondary py-1 px-2.5 text-[11px] flex items-center gap-1 hover:bg-white/5"
                                  >
                                    <Download size={12} /> Notes
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Problems Section */}
                      {mod.problems && mod.problems.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                            <Play size={12} /> Practice Problems
                          </h4>
                          <div className="space-y-2">
                            {mod.problems.map(prob => (
                              <div key={prob.id} className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition-all flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${prob.status === 'completed' ? 'bg-brand-green/20 text-brand-green' : 'bg-white/5 text-[var(--text-secondary)]'}`}>
                                    {prob.status === 'completed' ? <CheckCircle size={15} /> : <Play size={13} className="ml-0.5" />}
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-[var(--text-primary)] text-sm">{prob.title}</h5>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <TypeBadge type={prob.type} />
                                      <LangBadge lang={prob.language} />
                                      <span className="text-[10px] text-[var(--text-muted)] font-mono">Best: {prob.bestScore}</span>
                                    </div>
                                  </div>
                                </div>
                                <Link to={`/student/problems/${prob.id}`} className="btn-secondary py-1 px-3 text-xs flex items-center gap-1 hover:bg-white/5">
                                  Solve <ArrowRight size={12} />
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Assessments Section */}
                      {mod.assessments && mod.assessments.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                            <Clock size={12} /> Module Assessments
                          </h4>
                          <div className="space-y-2">
                            {mod.assessments.map(ass => (
                              <div key={ass.id} className={`p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between border-l-2 ${
                                ass.status === 'active' 
                                  ? 'border-l-brand-green' 
                                  : ass.status === 'upcoming' 
                                  ? 'border-l-brand-purple' 
                                  : 'border-l-zinc-700'
                              }`}>
                                <div>
                                  <h5 className="font-bold text-[var(--text-primary)] text-sm">{ass.title}</h5>
                                  <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 mt-1 font-mono">
                                    <Clock size={10} /> {ass.timeRemaining || ass.date}
                                  </span>
                                </div>
                                <div>
                                  {ass.status === 'active' ? (
                                    <Link to={`/student/assessments/${ass.id}`} className="btn-primary py-1 px-3 text-xs font-semibold">
                                      Start
                                    </Link>
                                  ) : ass.status === 'ended' ? (
                                    <Link to={`/student/assessments/${ass.id}/results`} className="btn-secondary py-1 px-3 text-xs hover:bg-white/5">
                                      Results
                                    </Link>
                                  ) : (
                                    <span className="text-xs text-[var(--text-muted)] font-medium">Locked</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty Module State */}
                      {(!mod.slides || mod.slides.length === 0) && 
                       (!mod.problems || mod.problems.length === 0) && 
                       (!mod.assessments || mod.assessments.length === 0) && (
                        <p className="text-xs text-[var(--text-muted)] text-center py-4 italic">No course materials linked to this module yet.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Info Card */}
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl border border-white/10 space-y-6">
            <h3 className="font-bold text-lg text-[var(--text-primary)] border-b border-default pb-2">Course Information</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Language</span>
                <LangBadge lang={course.language} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Syllabus Modules</span>
                <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{course.enrichedModules?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Lecture Decks</span>
                <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{(course.slides || []).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Total Challenges</span>
                <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{(course.problemIds || []).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Mini Assessments</span>
                <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{(course.assessments || []).length}</span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <HelpCircle size={14} className="shrink-0" />
                <span>Mini-courses, slides, and problems are managed by the instructor. Contact them if materials are missing.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SlideViewer
        isOpen={Boolean(activeSlide)}
        onClose={() => setActiveSlide(null)}
        slide={activeSlide}
      />
    </div>
  );
}
