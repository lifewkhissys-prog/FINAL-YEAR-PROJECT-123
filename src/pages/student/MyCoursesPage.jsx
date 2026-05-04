import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, User, ArrowRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LangBadge } from '../../components/ui/Badge';

export function MyCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock fetching enrolled courses
    setTimeout(() => {
      setCourses([
        { id: '1', title: 'Introduction to Python', lecturer: 'Dr. Smith', language: 'python', problemsCount: 12, completedCount: 5 },
        { id: '2', title: 'Data Structures in Java', lecturer: 'Prof. Johnson', language: 'java', problemsCount: 8, completedCount: 8 },
        { id: '3', title: 'Database Systems', lecturer: 'Dr. Lee', language: 'sql', problemsCount: 15, completedCount: 2 }
      ]);
      setLoading(false);
    }, 800);
  }, []);

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
      ) : courses.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <Link key={course.id} to={`/courses/${course.id}`}>
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
