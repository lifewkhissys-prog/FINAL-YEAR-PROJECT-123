import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, FolderClock, TrendingUp, ChevronRight, Play, CheckCircle2, ArrowRight } from 'lucide-react';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { StatusBadge, TechBadge } from '../../components/ui/Badge';
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

export function StudentDashboard() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    setTimeout(() => {
      setData({
        stats: {
          enrolledCourses: 3,
          activeAssessments: 2,
          problemsSolved: 15,
          totalSubmissions: 42
        },
        continueLearning: {
          courseId: '1',
          courseTitle: 'Introduction to Python',
          problemId: '103',
          problemTitle: 'List Comprehensions',
          type: 'challenge',
          progress: 65
        },
        recentActivity: [
          { id: 1, title: 'Two Sum', status: 'completed', time: '2 hours ago' },
          { id: 2, title: 'Midterm Practical', status: 'pending', time: '1 day ago' },
          { id: 3, title: 'Variables & Types', status: 'completed', time: '2 days ago' },
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

      {/* Stats row - Minimal & Iconographic */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 border border-default overflow-hidden">
        {[
          { label: 'Active Curricula', value: data.stats.enrolledCourses, icon: BookOpen, color: 'text-brand-blue' },
          { label: 'Assessments Pending', value: data.stats.activeAssessments, icon: Clock, color: 'text-yellow-400' },
          { label: 'Resolved Problems', value: data.stats.problemsSolved, icon: TrendingUp, color: 'text-brand-green' },
          { label: 'Total Submissions', value: data.stats.totalSubmissions, icon: FolderClock, color: 'text-brand-purple' }
        ].map((stat, i) => (
          <div 
            key={i}
            className="bg-[var(--bg-primary)] p-6 hover:bg-white/[0.02] transition-colors relative overflow-hidden group"
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

      <div className="grid lg:grid-cols-3 gap-8">
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          
          {/* Continue Learning - SaaS Style Polish */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Current Session</h2>
            </div>
            <div 
              className="group relative bg-[var(--bg-primary)] border border-default p-8 overflow-hidden"
            >
              {/* Technical background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none">
                 <div className="absolute top-8 right-8 w-24 h-24 border-2 border-dashed border-white rounded-full animate-spin-slow"></div>
              </div>
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <TechBadge>{data.continueLearning.courseTitle}</TechBadge>
                  </div>
                  <h3 className="text-3xl font-serif text-[var(--text-primary)] mb-4 tracking-tight">{data.continueLearning.problemTitle}</h3>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex-1 h-1 bg-white/5 overflow-hidden max-w-xs">
                      <div className="h-full bg-brand-blue" style={{ width: `${data.continueLearning.progress}%` }}></div>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">{data.continueLearning.progress}% Synchronized</span>
                  </div>
                </div>
                
                <Link 
                  to={`/problems/${data.continueLearning.problemId}/${data.continueLearning.type}`}
                  className="btn-primary btn-lg px-10 group"
                >
                  Resume Protocol <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </section>

          {/* Active Assessments Alert - High Contrast */}
          {data.stats.activeAssessments > 0 && (
            <section className="mt-8">
               <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-semibold text-[var(--text-primary)]">Action Required</h2>
              </div>
              <motion.div 
                whileHover={{ x: 4 }}
                className="bg-yellow-500/10 border-l-4 border-l-yellow-500 rounded-r-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)]">You have {data.stats.activeAssessments} active assessments</h4>
                    <p className="text-sm text-yellow-500/80">Submit before the timer expires.</p>
                  </div>
                </div>
                <Link to="/assessments/active" className="text-sm font-semibold text-yellow-500 hover:text-yellow-400 flex items-center gap-1 group">
                  View Tasks <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </section>
          )}
        </motion.div>

        {/* Recent Activity List - Clean UI */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent Activity</h2>
             <Link to="/submissions" className="text-sm text-brand-blue hover:text-brand-purple flex items-center transition-colors">
               See all
             </Link>
          </div>
          <div className="bg-[var(--bg-surface)] border border-default rounded-xl p-2">
            <div className="space-y-1">
              {data.recentActivity.map((activity) => (
                <Link 
                  key={activity.id}
                  to="/submissions" 
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activity.status === 'completed' ? 'bg-brand-green/20 text-brand-green' : 'bg-white/5 text-[var(--text-secondary)]'}`}>
                      {activity.status === 'completed' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)] text-sm group-hover:text-brand-blue transition-colors">{activity.title}</h4>
                      <p className="text-xs text-[var(--text-muted)]">{activity.time}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
