import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Plus, Edit2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LangBadge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { useDemoStore } from '../../store/demoStore';

export function LecturerCoursesPage() {
  const { courses: storeCourses, assessments, submissions } = useDemoStore();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mapped = storeCourses.map((c) => {
      // Find count of unique students that submitted to problems in this course
      const courseProblems = c.problemIds || [];
      const courseSubmissions = submissions.filter((s) => courseProblems.includes(s.problemId));
      const uniqueEmails = new Set(courseSubmissions.map((s) => s.studentEmail.toLowerCase()));
      const studentCount = uniqueEmails.size > 0 ? uniqueEmails.size : 12; // Default realistic mockup size

      const courseAssessmentsCount = assessments.filter((a) => a.courseId === c.id).length;

      return {
        id: c.id,
        title: c.title,
        language: c.language || 'python',
        studentsCount: studentCount,
        assessmentsCount: courseAssessmentsCount
      };
    });

    setCourses(mapped);
    setLoading(false);
  }, [storeCourses, assessments, submissions]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in px-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-[var(--bg-surface)] rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-[var(--bg-surface)] rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-[var(--bg-surface)] rounded animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">My Courses</h1>
          <p className="text-sm text-[var(--text-secondary)]">Manage courses you teach.</p>
        </div>
        <Link to="/lecturer/courses/new" className="btn-primary">
          <Plus size={16} /> Create Course
        </Link>
      </div>

      {courses.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <Card key={course.id} hover className="flex flex-col group relative">
              <Link to={`/lecturer/courses/${course.id}`} className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-dark-800 rounded-md border border-default opacity-0 group-hover:opacity-100 transition-all z-10 hover:bg-dark-700">
                <Edit2 size={14} />
              </Link>

              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-dark-800 border border-default flex items-center justify-center">
                  <BookOpen size={20} className="text-brand-purple" />
                </div>
                <LangBadge lang={course.language} />
              </div>
              
              <h3 className="font-semibold text-[var(--text-primary)] text-lg mb-4 pr-10">{course.title}</h3>
              
              <div className="mt-auto grid grid-cols-2 gap-4 border-t border-default pt-4">
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-1">Students</div>
                  <div className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
                    <Users size={14} className="text-brand-blue" />
                    {course.studentsCount}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-1">Assessments</div>
                  <div className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
                    <BookOpen size={14} className="text-brand-purple" />
                    {course.assessmentsCount}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Link to={`/lecturer/courses/${course.id}?tab=students`} className="hover:text-[var(--text-primary)]">Manage Students</Link>
                <span>•</span>
                <Link to={`/lecturer/courses/${course.id}?tab=assessments`} className="hover:text-[var(--text-primary)]">Assessments</Link>
                <span>•</span>
                <Link to={`/lecturer/courses/${course.id}?tab=edit`} className="hover:text-[var(--text-primary)]">Edit</Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState 
          icon={BookOpen} 
          title="No courses found" 
          message="You haven't created any courses yet." 
          action={<Link to="/lecturer/courses/new" className="btn-primary"><Plus size={16} /> Create Course</Link>}
        />
      )}
    </div>
  );
}
