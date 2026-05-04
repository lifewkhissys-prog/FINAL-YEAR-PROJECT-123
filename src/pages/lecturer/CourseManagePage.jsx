import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Trash2, Plus } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { FullPageSpinner } from '../../components/ui/Spinner';

export function CourseManagePage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setCourse({
        id,
        title: 'Introduction to Python',
        description: 'Learn the basics of Python programming, from variables to data structures.',
        language: 'python'
      });
      setStudents([
        { id: 1, name: 'Alice Smith', email: 'alice@uni.edu' },
        { id: 2, name: 'Bob Jones', email: 'bob@uni.edu' },
      ]);
      setLoading(false);
    }, 500);
  }, [id]);

  if (loading) return <FullPageSpinner />;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <Link to="/lecturer/courses" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Courses
        </Link>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Manage: {course.title}</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass p-6">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Course Details</h2>
            <form className="space-y-4">
              <Input label="Course Title" defaultValue={course.title} />
              <div className="w-full">
                <label className="label">Description</label>
                <textarea className="input min-h-[100px]" defaultValue={course.description} />
              </div>
              <button className="btn-primary" type="button">Save Changes</button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
           <div className="glass p-6">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-xl font-semibold text-[var(--text-primary)]">Enrolled Students</h2>
               <div className="w-8 h-8 rounded-full bg-brand-blue/20 text-brand-blue flex items-center justify-center text-sm font-bold">
                 {students.length}
               </div>
            </div>
            
            <div className="flex gap-2 mb-4">
              <Input placeholder="student@uni.edu" className="h-9" />
              <button className="btn-primary px-3 h-9 shrink-0"><Plus size={16} /></button>
            </div>

            <div className="space-y-2">
              {students.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-default bg-[var(--bg-surface)]">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center shrink-0">
                      <Users size={14} className="text-[var(--text-secondary)]" />
                    </div>
                    <div className="truncate">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">{s.name}</div>
                      <div className="text-xs text-[var(--text-muted)] truncate">{s.email}</div>
                    </div>
                  </div>
                  <button className="text-[var(--text-muted)] hover:text-red-400 p-1 transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
           </div>
        </div>
      </div>
    </div>
  );
}
