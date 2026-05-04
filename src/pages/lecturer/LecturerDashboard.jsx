import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, BookOpen, Clock, FileCode2, ChevronRight, CheckCircle, ArrowRight } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/Badge';
import useAuthStore from '../../store/authStore';
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
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    setTimeout(() => {
      setData({
        stats: {
          totalStudents: 83,
          activeCourses: 2,
          totalProblems: 20,
          pendingGrades: 5
        },
        upcomingAssessments: [
          { id: 'a1', title: 'Midterm Practical', course: 'Introduction to Python', date: 'Tomorrow, 10:00 AM', enrolled: 45 },
          { id: 'a2', title: 'SQL Joins Quiz', course: 'Database Systems', date: 'Next Friday', enrolled: 38 },
        ],
        recentSubmissions: [
          { id: 1, student: 'Ankomah Kelvin', problem: 'Two Sum', status: 'completed', score: '100%', time: '10 mins ago' },
          { id: 2, student: 'Mahfuz Abgor Seidu', problem: 'Valid Palindrome', status: 'error', score: '0%', time: '1 hour ago' },
          { id: 3, student: 'John Doe', problem: 'SQL Joins', status: 'completed', score: '80%', time: '2 hours ago' },
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
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-default pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-brand-blue"></div>
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em]">Lecturer Control Panel // 01</span>
          </div>
          <h1 className="text-4xl font-serif text-[var(--text-primary)] mb-2 tracking-tight">Lecturer Dashboard</h1>
          <p className="text-[var(--text-secondary)] font-sans">Welcome back, {user?.name.split(' ')[0] || 'Lecturer'}. Infrastructure status: <span className="text-brand-green">Stable</span></p>
        </div>
        <Link to="/lecturer/problems/new" className="btn-primary btn-lg group">
          <FileCode2 size={18} /> 
          <span>Initialize Problem</span>
        </Link>
      </motion.div>

      {/* Stats row - SaaS Style */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 border border-default overflow-hidden">
        {[
          { label: 'Enrolled Students', value: data.stats.totalStudents, icon: Users, color: 'text-brand-blue' },
          { label: 'Active Curricula', value: data.stats.activeCourses, icon: BookOpen, color: 'text-brand-purple' },
          { label: 'Problem Repository', value: data.stats.totalProblems, icon: FileCode2, color: 'text-brand-green' },
          { label: 'Pending Assessment', value: data.stats.pendingGrades, icon: CheckCircle, color: 'text-yellow-400' }
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
            {data.upcomingAssessments.map(a => (
              <div 
                key={a.id} 
                className="group bg-[var(--bg-primary)] p-6 hover:bg-white/[0.02] transition-all cursor-pointer relative"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 bg-brand-purple"></div>
                      <span className="text-[10px] font-mono text-brand-purple uppercase tracking-widest">Assessment Scheduled</span>
                    </div>
                    <h3 className="font-serif text-[var(--text-primary)] text-xl group-hover:text-brand-blue transition-colors">{a.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] font-mono uppercase mt-1 tracking-wider">{a.course}</p>
                  </div>
                  <div className="font-mono text-[10px] text-[var(--text-secondary)] border border-default px-2 py-1">
                    {a.date.toUpperCase()}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-6 border-t border-default mt-4">
                  <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
                    <span className="text-[var(--text-primary)] font-bold">{a.enrolled}</span> Student Nodes Connected
                  </div>
                  <Link to={`/lecturer/assessments/${a.id}/gradebook`} className="text-[10px] font-mono text-brand-blue hover:underline uppercase tracking-widest flex items-center gap-2">
                    Access Gradebook <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center justify-between mb-2">
             <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent Activity Feed</h2>
          </div>
          <div className="bg-[var(--bg-surface)] border border-default rounded-xl overflow-hidden">
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
                         <span className={`font-bold ${sub.score === '100%' ? 'text-brand-green' : sub.score === '0%' ? 'text-red-400' : 'text-yellow-400'}`}>
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
                  View Full Gradebook
                </Link>
             </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
