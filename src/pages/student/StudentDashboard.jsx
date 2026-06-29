import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, CalendarClock, Clock, GraduationCap, ArrowRight, Code } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { StatusBadge, TechBadge, LangBadge } from '../../components/ui/Badge';
import useAuthStore from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
};

export function StudentDashboard() {
  const user = useAuthStore((state) => state.user);
  const { courses, assessments, problems, enrollStudentWithCode } = useDemoStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ activeAssessments: [], upcomingAssessments: [], enrolledCourses: [] });

  // Join Code Modal state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    if (!user) return;

    // Filter enrolled courses
    const enrolled = courses.filter(c => c.students && c.students.some(s => s.toLowerCase() === user.email.toLowerCase()));

    const enrolledCourseIds = enrolled.map(c => c.id);
    const studentAssessments = assessments.filter(a => enrolledCourseIds.includes(a.courseId));

    const now = Date.now();
    const active = studentAssessments.filter(a => {
      const start = new Date(a.startsAt).getTime();
      const end = new Date(a.endsAt).getTime();
      return now >= start && now <= end;
    }).map(a => {
      const course = enrolled.find(c => c.id === a.courseId);
      const end = new Date(a.endsAt).getTime();
      const minDiff = Math.max(0, Math.floor((end - now) / 60000));
      const hours = Math.floor(minDiff / 60);
      const mins = minDiff % 60;
      const timeRemaining = hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
      return {
        id: a.id,
        title: a.title,
        course: course ? course.title : 'Unknown Course',
        timeRemaining
      };
    });

    const upcoming = studentAssessments.filter(a => {
      const start = new Date(a.startsAt).getTime();
      return now < start;
    }).map(a => {
      const course = enrolled.find(c => c.id === a.courseId);
      const start = new Date(a.startsAt).getTime();
      const minDiff = Math.max(0, Math.floor((start - now) / 60000));
      const days = Math.floor(minDiff / 1440);
      const hours = Math.floor((minDiff % 1440) / 60);
      const startsIn = days > 0 ? `Starts in ${days} days` : `Starts in ${hours} hours`;
      return {
        id: a.id,
        title: a.title,
        course: course ? course.title : 'Unknown Course',
        startsIn
      };
    });

    const enrolledMapped = enrolled.map((c) => {
      const firstProblem = (c.problemIds && c.problemIds.length > 0) ? problems[c.problemIds[0]] : null;
      const language = firstProblem ? firstProblem.language : 'python';
      return {
        ...c,
        lecturer: c.lecturer === 'lecturer@uni.edu' ? 'Dr. Yaw Anim' : c.lecturer,
        language
      };
    });

    setData({
      activeAssessments: active,
      upcomingAssessments: upcoming,
      enrolledCourses: enrolledMapped
    });
    setLoading(false);
  }, [courses, assessments, problems, user]);

  const handleJoinWithCode = (e) => {
    e.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) {
      setJoinError('Please enter a course code.');
      return;
    }

    try {
      const course = enrollStudentWithCode(code, user.email);
      toast.success(`🎉 Successfully joined "${course.title}"!`);
      setIsJoinModalOpen(false);
      setJoinCodeInput('');
      setJoinError('');
    } catch (err) {
      setJoinError(err.message || 'Failed to join course. Check code.');
    }
  };

  if (loading) return <FullPageSpinner />;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-default pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-brand-blue"></div>
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em]">Student Terminal // Access ID: {user?.id || '001'}</span>
          </div>
          <h1 className="text-4xl font-serif text-[var(--text-primary)] mb-2 tracking-tight">Student Dashboard</h1>
          <p className="text-[var(--text-secondary)] font-sans">Welcome back, {user?.name.split(' ')[0] || 'Student'}. Connection: <span className="text-brand-green">Encrypted</span></p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Active assessments</h2>
              <Link to="/student/assessments/active" className="text-xs text-brand-blue hover:text-brand-purple uppercase tracking-widest">
                View all
              </Link>
            </div>
            {data.activeAssessments.length === 0 ? (
              <div className="glass p-6 text-sm text-[var(--text-secondary)]">
                No active assessments right now.
              </div>
            ) : (
              <div className="grid gap-4">
                {data.activeAssessments.map((assessment) => (
                  <div key={assessment.id} className="glass p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <TechBadge>{assessment.course}</TechBadge>
                        <StatusBadge status="active" />
                      </div>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)]">{assessment.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mt-2">
                        <Clock size={14} />
                        <span>{assessment.timeRemaining}</span>
                      </div>
                    </div>
                    <Link to={`/student/assessments/${assessment.id}`} className="btn-primary btn-sm">
                      Enter Assessment <ArrowRight size={16} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Upcoming assessments</h2>
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Next 7 days</span>
            </div>
            <div className="grid gap-3">
              {data.upcomingAssessments.map((assessment) => (
                <div key={assessment.id} className="glass p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{assessment.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{assessment.course}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                    <CalendarClock size={14} />
                    <span>{assessment.startsIn}</span>
                    <StatusBadge status="scheduled" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Enrolled courses</h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsJoinModalOpen(true)}
                className="flex items-center gap-1 text-xs text-brand-blue hover:text-brand-purple font-semibold transition-all"
              >
                <Code size={13} />
                Join with Code
              </button>
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest">{data.enrolledCourses.length} total</span>
            </div>
          </div>
          <div className="space-y-3">
            {data.enrolledCourses.map((course) => (
              <div key={course.id} className="glass p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-dark-800 border border-default flex items-center justify-center">
                    <BookOpen size={18} className="text-brand-blue" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{course.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)]">{course.lecturer}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <LangBadge lang={course.language} />
                  <Link to={`/student/courses/${course.id}`} className="text-xs font-semibold text-brand-blue hover:text-brand-purple flex items-center gap-1">
                    Open Course <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Join Code Modal */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => {
          setIsJoinModalOpen(false);
          setJoinCodeInput('');
          setJoinError('');
        }}
        title="Join Course with Code"
      >
        <form onSubmit={handleJoinWithCode} className="space-y-4">
          <div>
            <label className="label mb-2">Enter Enrollment Code</label>
            <input 
              type="text"
              placeholder="e.g. PY-101"
              value={joinCodeInput}
              onChange={(e) => {
                setJoinCodeInput(e.target.value);
                setJoinError('');
              }}
              className="input text-center font-mono uppercase tracking-widest text-lg"
              autoFocus
            />
            {joinError && (
              <p className="text-red-400 text-xs mt-1.5 font-mono">{joinError}</p>
            )}
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 text-xs text-[var(--text-secondary)] leading-relaxed">
            💡 <strong>Note:</strong> Ask your course lecturer or check the syllabus announcement to find the 6-character course code.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={() => {
                setIsJoinModalOpen(false);
                setJoinCodeInput('');
                setJoinError('');
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Join Course
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
