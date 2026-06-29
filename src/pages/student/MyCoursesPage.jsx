import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, User, ArrowRight, Compass, Plus, LogOut, Code, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LangBadge } from '../../components/ui/Badge';
import useAuthStore from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';

export function MyCoursesPage() {
  const user = useAuthStore((state) => state.user);
  const { 
    courses, 
    problems, 
    submissions, 
    enrollStudent, 
    enrollStudentWithCode, 
    unenrollStudent 
  } = useDemoStore();

  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [exploreCourses, setExploreCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('enrolled'); // 'enrolled' | 'explore'

  // Join Code Modal state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    if (!user) return;

    // Filter enrolled courses
    const studentCourses = courses.filter((c) => 
      c.students && c.students.some(s => s.toLowerCase() === user.email.toLowerCase())
    );

    // Filter explore courses (courses they are not enrolled in)
    const nonStudentCourses = courses.filter((c) => 
      !c.students || !c.students.some(s => s.toLowerCase() === user.email.toLowerCase())
    );

    // Get completed problem submissions
    const completedProblems = new Set(
      submissions
        .filter((s) => s.studentEmail.toLowerCase() === user.email.toLowerCase() && s.status === 'completed')
        .map((s) => s.problemId)
    );

    // Helper map
    const mapCourse = (c) => {
      const pCount = c.problemIds ? c.problemIds.length : 0;
      const compCount = c.problemIds ? c.problemIds.filter((id) => completedProblems.has(id)).length : 0;
      const firstProblem = (c.problemIds && c.problemIds.length > 0) ? problems[c.problemIds[0]] : null;
      const language = firstProblem ? firstProblem.language : 'python';
      const slideCount = c.slides ? c.slides.length : 0;

      return {
        ...c,
        lecturer: c.lecturer === 'lecturer@uni.edu' ? 'Dr. Yaw Anim' : c.lecturer,
        language,
        problemsCount: pCount,
        completedCount: compCount,
        slidesCount: slideCount
      };
    };

    setEnrolledCourses(studentCourses.map(mapCourse));
    setExploreCourses(nonStudentCourses.map(mapCourse));
    setLoading(false);
  }, [courses, problems, submissions, user]);

  const handleEnroll = (courseId, courseTitle) => {
    enrollStudent(courseId, user.email);
    toast.success(`🎉 Enrolled in ${courseTitle} successfully!`);
  };

  const handleDropCourse = (courseId, courseTitle) => {
    if (window.confirm(`Are you sure you want to drop "${courseTitle}"? You will lose access to assignments.`)) {
      unenrollStudent(courseId, user.email);
      toast.success(`Dropped "${courseTitle}" successfully.`);
    }
  };

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
      setActiveTab('enrolled');
    } catch (err) {
      setJoinError(err.message || 'Failed to join course. Check code.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Courses</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {activeTab === 'enrolled' 
              ? 'Courses you are currently enrolled in.' 
              : 'Discover and self-enroll in KNUST learning courses.'}
          </p>
        </div>
        
        {user.role === 'student' && (
          <div>
            <button 
              onClick={() => setIsJoinModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Code size={16} />
              Join with Code
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-default flex gap-6">
        <button 
          onClick={() => setActiveTab('enrolled')}
          className={`pb-3 text-sm font-medium transition-all relative ${
            activeTab === 'enrolled' 
              ? 'text-brand-blue' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={16} />
            My Courses ({enrolledCourses.length})
          </div>
          {activeTab === 'enrolled' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue rounded-full"></div>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('explore')}
          className={`pb-3 text-sm font-medium transition-all relative ${
            activeTab === 'explore' 
              ? 'text-brand-blue' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Compass size={16} />
            Explore Catalog ({exploreCourses.length})
          </div>
          {activeTab === 'explore' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue rounded-full"></div>
          )}
        </button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 glass rounded-xl animate-pulse bg-white/5"></div>
          ))}
        </div>
      ) : activeTab === 'enrolled' ? (
        enrolledCourses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map(course => (
              <div key={course.id} className="relative group">
                {/* Drop course action */}
                <button
                  onClick={() => handleDropCourse(course.id, course.title)}
                  title="Drop Course"
                  className="absolute top-4 right-14 z-10 w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                >
                  <LogOut size={14} />
                </button>

                <Link to={`/student/courses/${course.id}`}>
                  <Card hover className="h-full flex flex-col pt-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-lg bg-dark-800 border border-default flex items-center justify-center">
                        <BookOpen size={20} className="text-brand-blue" />
                      </div>
                      <LangBadge lang={course.language} />
                    </div>
                    
                    <h3 className="font-semibold text-[var(--text-primary)] text-lg mb-2 group-hover:text-brand-blue transition-colors">
                      {course.title}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-6">
                      <User size={14} />
                      <span>{course.lecturer}</span>
                    </div>
                    
                    <div className="mt-auto">
                      <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-2">
                        <span>Progress</span>
                        <span>{course.completedCount} / {course.problemsCount} problems</span>
                      </div>
                      <div className="w-full bg-dark-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-brand-blue h-1.5 rounded-full" 
                          style={{ width: `${course.problemsCount > 0 ? Math.max(5, (course.completedCount / course.problemsCount) * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState 
            icon={BookOpen} 
            title="No courses yet" 
            message="You aren't enrolled in any courses. Explore the catalog or enter a code to get started." 
          />
        )
      ) : (
        exploreCourses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exploreCourses.map(course => (
              <Card key={course.id} className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-lg bg-dark-800 border border-default flex items-center justify-center">
                      <Compass size={20} className="text-brand-blue" />
                    </div>
                    <LangBadge lang={course.language} />
                  </div>
                  
                  <h3 className="font-semibold text-[var(--text-primary)] text-lg mb-2">
                    {course.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-3">
                    <User size={14} />
                    <span>{course.lecturer}</span>
                  </div>

                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-4 leading-relaxed">
                    {course.description || "No description provided."}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mb-6">
                    <span className="bg-white/5 px-2 py-1 rounded">{course.problemsCount} problems</span>
                    <span className="bg-white/5 px-2 py-1 rounded">{course.slidesCount} slide decks</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleEnroll(course.id, course.title)}
                  className="w-full py-2.5 bg-brand-blue/10 border border-brand-blue/20 hover:bg-brand-blue hover:text-white rounded-lg text-sm text-brand-blue font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Enroll Now
                </button>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState 
            icon={Compass} 
            title="Explore Catalog" 
            message="No other courses are currently available for enrollment." 
          />
        )
      )}

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
    </div>
  );
}
