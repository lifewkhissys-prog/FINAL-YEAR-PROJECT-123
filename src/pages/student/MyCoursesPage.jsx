import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, User, ArrowRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LangBadge } from '../../components/ui/Badge';
import useAuthStore from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';

export function MyCoursesPage() {
  const user = useAuthStore((state) => state.user);
  const { courses, problems, submissions } = useDemoStore();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Auto-enroll student in default courses if they aren't enrolled in any
    let studentCourses = courses.filter((c) => c.students.some(s => s.toLowerCase() === user.email.toLowerCase()));
    if (studentCourses.length === 0 && user.role === 'student') {
      courses.forEach(c => {
        if (c.id === '1' || c.id === '2') {
          if (!c.students.some(s => s.toLowerCase() === user.email.toLowerCase())) {
            c.students.push(user.email);
          }
        }
      });
      useDemoStore.getState().syncToStorage();
      studentCourses = courses.filter((c) => c.students.some(s => s.toLowerCase() === user.email.toLowerCase()));
    }

    // Get completed problem submissions
    const completedProblems = new Set(
      submissions
        .filter((s) => s.studentEmail.toLowerCase() === user.email.toLowerCase() && s.status === 'completed')
        .map((s) => s.problemId)
    );

    // Map course metadata
    const mapped = studentCourses.map((c) => {
      const pCount = c.problemIds.length;
      const compCount = c.problemIds.filter((id) => completedProblems.has(id)).length;
      const firstProblem = c.problemIds.length > 0 ? problems[c.problemIds[0]] : null;
      const language = firstProblem ? firstProblem.language : 'python';

      return {
        ...c,
        lecturer: c.lecturer === 'lecturer@uni.edu' ? 'Dr. Yaw Anim' : c.lecturer,
        language,
        problemsCount: pCount,
        completedCount: compCount
      };
    });

    setEnrolledCourses(mapped);
    setLoading(false);
  }, [courses, problems, submissions, user]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">My Courses</h1>
          <p className="text-sm text-[var(--text-secondary)]">Courses you are currently enrolled in.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 glass rounded-xl animate-pulse bg-white/5"></div>
          ))}
        </div>
      ) : enrolledCourses.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolledCourses.map(course => (
            <Link key={course.id} to={`/student/courses/${course.id}`}>
              <Card hover className="h-full flex flex-col group">
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
                      style={{ width: `${Math.max(5, (course.completedCount / course.problemsCount) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState 
          icon={BookOpen} 
          title="No courses yet" 
          message="You haven't been enrolled in any courses. Check with your lecturer." 
        />
      )}
    </div>
  );
}
