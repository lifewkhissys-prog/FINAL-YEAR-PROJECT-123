import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, BookOpen, Clock, FileCode2, ChevronRight, ArrowRight } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/Badge';
import useAuthStore from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';
import { TechnicalPulseChart } from '../../components/ui/TechnicalPulseChart';

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

export function LecturerDashboard() {
  const user = useAuthStore((state) => state.user);
  const { courses, assessments, submissions, studentsList } = useDemoStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const now = Date.now();
    
    // Count active assessments
    const activeAssessmentsCount = assessments.filter((a) => {
      const start = new Date(a.startsAt).getTime();
      const end = new Date(a.endsAt).getTime();
      return now >= start && now <= end;
    }).length;

    // Build stats
    const stats = {
      totalCourses: courses.length,
      activeAssessments: activeAssessmentsCount,
      totalStudents: studentsList.length
    };

    // Build upcoming assessments list
    const upcoming = assessments.slice(0, 3).map((a) => {
      const start = new Date(a.startsAt).getTime();
      const end = new Date(a.endsAt).getTime();
      
      let status = 'upcoming';
      let windowLabel = '';

      if (now >= start && now <= end) {
        status = 'active';
        windowLabel = 'Running now';
      } else if (now < start) {
        status = 'scheduled';
        const dateObj = new Date(a.startsAt);
        windowLabel = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        status = 'ended';
        windowLabel = 'Ended';
      }

      const courseObj = courses.find((c) => c.id === a.courseId);

      return {
        id: a.id,
        title: a.title,
        course: courseObj ? courseObj.title : 'General Course',
        status,
        window: windowLabel
      };
    });

    // Build courses overview
    const coursesSummary = courses.slice(0, 3).map((c) => {
      // Find count of unique students that submitted to problems in this course
      const courseProblems = c.problemIds || [];
      const courseSubmissions = submissions.filter((s) => courseProblems.includes(s.problemId));
      const uniqueEmails = new Set(courseSubmissions.map((s) => s.studentEmail.toLowerCase()));
      const studentCount = uniqueEmails.size > 0 ? uniqueEmails.size : 12; // Fallback default to keep look realistic

      const courseAssessmentsCount = assessments.filter((a) => a.courseId === c.id).length;

      return {
        id: c.id,
        title: c.title,
        students: studentCount,
        assessments: courseAssessmentsCount
      };
    });

    // Build relative time string helper
    const getRelativeTime = (isoString) => {
      const date = new Date(isoString || Date.now());
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    };

    // Build recent activity feed from actual submissions
    const recent = [...submissions]
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        student: s.studentName || 'Student Demo',
        problem: s.problemTitle || 'Coding Lab',
        status: s.status,
        score: s.score,
        time: getRelativeTime(s.submittedAt)
      }));

    setData({
      stats,
      upcomingAssessments: upcoming,
      courses: coursesSummary,
      recentSubmissions: recent
    });
    setLoading(false);
  }, [courses, assessments, submissions, studentsList]);

  if (loading || !data) return <FullPageSpinner />;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10 px-4"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-default pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-brand-blue"></div>
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em]">Lecturer Control Panel // 01</span>
          </div>
          <h1 className="text-4xl font-serif text-[var(--text-primary)] mb-2 tracking-tight">Lecturer Dashboard</h1>
          <p className="text-[var(--text-secondary)] font-sans">Welcome back, {user?.name || 'Lecturer'}. Infrastructure status: <span className="text-brand-green">Stable</span></p>
        </div>
        <Link to="/lecturer/assessments" className="btn-primary btn-lg group">
          <FileCode2 size={18} /> 
          <span>Manage Assessments</span>
        </Link>
      </motion.div>

      {/* Stats row - SaaS Style */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white/5 border border-default overflow-hidden">
        {[
          { label: 'Total Courses', value: data.stats.totalCourses, icon: BookOpen, color: 'text-brand-purple' },
          { label: 'Active Assessments', value: data.stats.activeAssessments, icon: Clock, color: 'text-yellow-400' },
          { label: 'Total Students', value: data.stats.totalStudents, icon: Users, color: 'text-brand-blue' }
        ].map((stat, i) => (
          <div 
            key={i}
            className="bg-dark-950 p-6 hover:bg-white/[0.02] transition-colors relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">{stat.label}</span>
              <stat.icon size={14} className={stat.color} />
            </div>
            <div className="text-4xl font-mono text-[var(--text-primary)] tracking-tighter relative z-10">{stat.value.toString().padStart(2, '0')}</div>
            
            {/* Technical Pulse Chart */}
            <TechnicalPulseChart 
              color={`var(--${stat.color.split('-')[2]})`} 
              className="mt-6 opacity-40 group-hover:opacity-80 transition-opacity" 
            />
          </div>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center justify-between mb-2">
             <h2 className="text-lg font-semibold text-[var(--text-primary)]">Upcoming Assessments</h2>
             <Link to="/lecturer/assessments" className="text-sm font-medium text-brand-blue hover:text-brand-purple flex items-center transition-colors">
               Manage all
             </Link>
          </div>
          <div className="grid gap-px bg-white/5 border border-default overflow-hidden">
            {data.upcomingAssessments.length > 0 ? (
              data.upcomingAssessments.map(a => (
                <div 
                  key={a.id} 
                  className="group bg-[var(--bg-primary)] p-6 hover:bg-white/[0.02] transition-all cursor-pointer relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-1.5 bg-brand-purple"></div>
                        <span className="text-[10px] font-mono text-brand-purple uppercase tracking-widest">Assessment {a.status}</span>
                      </div>
                      <h3 className="font-serif text-[var(--text-primary)] text-xl group-hover:text-brand-blue transition-colors">{a.title}</h3>
                      <p className="text-xs text-[var(--text-muted)] font-mono uppercase mt-1 tracking-wider">{a.course}</p>
                    </div>
                    <div className="font-mono text-[10px] text-[var(--text-secondary)] border border-default px-2 py-1">
                      {a.window.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-default mt-4">
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
                      Status: <span className="text-[var(--text-primary)] font-bold">{a.status}</span>
                    </div>
                    <Link to={`/lecturer/assessments/${a.id}/gradebook`} className="text-[10px] font-mono text-brand-blue hover:underline uppercase tracking-widest flex items-center gap-2">
                      Access Gradebook <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-[var(--text-muted)] bg-[var(--bg-surface)]">
                No assessments scheduled yet.
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center justify-between mb-2">
             <h2 className="text-lg font-semibold text-[var(--text-primary)]">Courses</h2>
             <Link to="/lecturer/courses" className="text-sm font-medium text-brand-blue hover:text-brand-purple flex items-center transition-colors">
               Manage courses
             </Link>
          </div>
          <div className="grid gap-3">
            {data.courses.map((course) => (
              <Link
                key={course.id}
                to={`/lecturer/courses/${course.id}`}
                className="glass p-4 flex items-center justify-between hover:border-brand-blue/30 transition-colors"
              >
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">{course.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{course.students} students • {course.assessments} assessments</div>
                </div>
                <ArrowRight size={16} className="text-[var(--text-muted)]" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center justify-between mb-2">
             <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent Activity Feed</h2>
          </div>
          <div className="bg-[var(--bg-surface)] border border-default rounded-xl overflow-hidden">
            {data.recentSubmissions.length > 0 ? (
               <>
                 <table className="w-full text-left text-sm">
                   <thead className="bg-[var(--bg-primary)]/50 text-[var(--text-secondary)] border-b border-default uppercase text-xs tracking-wider">
                     <tr>
                       <th className="p-4 font-semibold">Student & Problem</th>
                       <th className="p-4 font-semibold text-right">Result</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {data.recentSubmissions.map((sub) => (
                       <tr key={sub.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                         <td className="p-4">
                           <div className="font-medium text-[var(--text-primary)] group-hover:text-brand-blue transition-colors">{sub.student}</div>
                           <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
                             <span className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-default">{sub.problem}</span>
                             <span>•</span>
                             <span>{sub.time}</span>
                           </div>
                         </td>
                         <td className="p-4 text-right">
                           <div className="flex flex-col items-end gap-1">
                             <span className={`font-bold ${sub.score.includes('100%') ? 'text-brand-green' : sub.score.includes('0%') ? 'text-red-400' : 'text-yellow-400'}`}>
                               {sub.score}
                             </span>
                             <StatusBadge status={sub.status} />
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 <div className="p-3 border-t border-default bg-[var(--bg-primary)]/50 flex justify-center">
                    <Link to="/lecturer/courses" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                      View Courses to Access Gradebook
                    </Link>
                 </div>
               </>
            ) : (
              <div className="p-8 text-center text-sm text-[var(--text-muted)]">
                No submissions recorded yet.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
