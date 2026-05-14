import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, CalendarClock, Clock, GraduationCap, ArrowRight } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { StatusBadge, TechBadge, LangBadge } from '../../components/ui/Badge';
import useAuthStore from '../../store/authStore';

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
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    setTimeout(() => {
      setData({
        activeAssessments: [
          { id: 'a1', title: 'Midterm Practical', course: 'Introduction to Python', timeRemaining: '45 mins left' },
          { id: 'a2', title: 'SQL Joins Quiz', course: 'Database Systems', timeRemaining: '2 days left' }
        ],
        upcomingAssessments: [
          { id: 'a3', title: 'Sorting Lab', course: 'Data Structures in Java', startsIn: 'Starts in 3 days' },
          { id: 'a4', title: 'SQL Aggregates', course: 'Database Systems', startsIn: 'Starts in 6 days' }
        ],
        enrolledCourses: [
          { id: '1', title: 'Introduction to Python', lecturer: 'Dr. Smith', language: 'python' },
          { id: '2', title: 'Data Structures in Java', lecturer: 'Prof. Johnson', language: 'java' },
          { id: '3', title: 'Database Systems', lecturer: 'Dr. Lee', language: 'sql' }
        ]
      });
      setLoading(false);
    }, 600);
  }, []);

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
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest">{data.enrolledCourses.length} total</span>
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
    </motion.div>
  );
}
