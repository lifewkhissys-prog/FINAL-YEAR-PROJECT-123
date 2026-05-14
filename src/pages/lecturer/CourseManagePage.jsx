import { useMemo, useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Users, Trash2, Plus } from 'lucide-react';
import { Input, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { FullPageSpinner } from '../../components/ui/Spinner';

export function CourseManagePage() {
  const { id } = useParams();
  const location = useLocation();
  const [course, setCourse] = useState(null);
  const [courseDraft, setCourseDraft] = useState({ title: '', description: '' });
  const [students, setStudents] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollError, setEnrollError] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);
  const [showDeleteCourse, setShowDeleteCourse] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setCourse({
        id,
        title: 'Introduction to Python',
        description: 'Learn the basics of Python programming, from variables to data structures.',
        language: 'python'
      });
      setCourseDraft({
        title: 'Introduction to Python',
        description: 'Learn the basics of Python programming, from variables to data structures.',
      });
      setStudents([
        { id: 1, name: 'Alice Smith', email: 'alice@uni.edu' },
        { id: 2, name: 'Bob Jones', email: 'bob@uni.edu' },
        { id: 3, name: 'Kwame Mensah', email: 'kwame@uni.edu' },
      ]);
      setAssessments([
        { id: 'a1', title: 'Lab 1', window: 'Ended • Apr 12, 10:00 - 12:00', problems: 3 },
        { id: 'a2', title: 'Midterm Practical', window: 'Active • Today, 10:00 - 12:00', problems: 2 },
      ]);
      setLoading(false);
    }, 500);
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextTab = params.get('tab');
    if (nextTab && ['students', 'assessments', 'edit'].includes(nextTab)) {
      setActiveTab(nextTab);
    }
  }, [location.search]);

  if (loading) return <FullPageSpinner />;

  const filteredStudents = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) => (
      student.name.toLowerCase().includes(term) || student.email.toLowerCase().includes(term)
    ));
  }, [students, searchQuery]);

  const handleEnroll = () => {
    const trimmedEmail = enrollEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setEnrollError('Enter a student email.');
      return;
    }
    if (students.some((student) => student.email.toLowerCase() === trimmedEmail)) {
      setEnrollError('This student is already enrolled.');
      return;
    }
    const nameFromEmail = trimmedEmail.split('@')[0] || 'New Student';
    setStudents((prev) => ([
      ...prev,
      { id: Date.now(), name: nameFromEmail.replace(/\./g, ' '), email: trimmedEmail },
    ]));
    setEnrollEmail('');
    setEnrollError('');
    setIsEnrollOpen(false);
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    setStudents((prev) => prev.filter((student) => student.id !== removeTarget.id));
    setRemoveTarget(null);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <Link to="/lecturer/courses" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Courses
        </Link>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Manage: {course.title}</h1>
        <p className="text-sm text-[var(--text-secondary)]">Language: {course.language.toUpperCase()}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-default pb-3">
        {[
          { key: 'students', label: 'Students' },
          { key: 'assessments', label: 'Assessments' },
          { key: 'edit', label: 'Edit Course' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition border ${activeTab === tab.key ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/30' : 'text-[var(--text-secondary)] border-default hover:text-[var(--text-primary)]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'students' && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Enrolled Students</h2>
                <div className="w-8 h-8 rounded-full bg-brand-blue/20 text-brand-blue flex items-center justify-center text-sm font-bold">
                  {students.length}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Input
                  placeholder="Search by name or email"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <button className="btn-primary whitespace-nowrap" onClick={() => setIsEnrollOpen(true)}>
                  <Plus size={16} /> Enroll Student
                </button>
              </div>

              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-default bg-[var(--bg-surface)]"
                  >
                    <Link
                      to={`/lecturer/courses/${course.id}/students/${student.id}`}
                      className="flex items-center gap-3 overflow-hidden"
                    >
                      <div className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center shrink-0">
                        <Users size={14} className="text-[var(--text-secondary)]" />
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-medium text-[var(--text-primary)] truncate">{student.name}</div>
                        <div className="text-xs text-[var(--text-muted)] truncate">{student.email}</div>
                      </div>
                    </Link>
                    <button
                      className="text-[var(--text-muted)] hover:text-red-400 p-1 transition-colors shrink-0"
                      onClick={() => setRemoveTarget(student)}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {filteredStudents.length === 0 && (
                  <p className="text-sm text-[var(--text-muted)]">No students match your search.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Enrollment Tips</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Add students by email. Use the search field to filter by name or email.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assessments' && (
        <div className="glass p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Assessments</h2>
              <p className="text-sm text-[var(--text-secondary)]">Timed assessments assigned to this course.</p>
            </div>
            <Link to={`/lecturer/courses/${course.id}/assessments/new`} className="btn-primary">
              <Plus size={16} /> New Assessment
            </Link>
          </div>
          <div className="space-y-2">
            {assessments.map((assessment) => (
              <Link
                key={assessment.id}
                to={`/lecturer/assessments/${assessment.id}`}
                className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 rounded-lg border border-default bg-[var(--bg-surface)] hover:border-brand-blue/30 transition-colors"
              >
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">{assessment.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{assessment.window}</div>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">{assessment.problems} problems</div>
              </Link>
            ))}
            {assessments.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">No assessments yet for this course.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'edit' && (
        <div className="glass p-6 space-y-4 max-w-3xl">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Course Details</h2>
          <form className="space-y-4">
            <Input
              label="Course Title"
              value={courseDraft.title}
              onChange={(event) => setCourseDraft((prev) => ({ ...prev, title: event.target.value }))}
            />
            <Textarea
              label="Description"
              rows={5}
              value={courseDraft.description}
              onChange={(event) => setCourseDraft((prev) => ({ ...prev, description: event.target.value }))}
            />
            <div className="flex items-center gap-3">
              <button className="btn-primary" type="button">Save Changes</button>
              <button
                className="btn-secondary text-red-400 border-red-500/30"
                type="button"
                onClick={() => setShowDeleteCourse(true)}
              >
                Delete Course
              </button>
            </div>
          </form>
        </div>
      )}

      <Modal
        isOpen={isEnrollOpen}
        onClose={() => {
          setIsEnrollOpen(false);
          setEnrollError('');
        }}
        title="Enroll Student"
      >
        <div className="space-y-4">
          <Input
            label="Student Email"
            placeholder="student@uni.edu"
            value={enrollEmail}
            onChange={(event) => {
              setEnrollEmail(event.target.value);
              setEnrollError('');
            }}
            error={enrollError}
          />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setIsEnrollOpen(false)} type="button">Cancel</button>
            <button className="btn-primary" onClick={handleEnroll} type="button">Enroll</button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        title="Remove Student"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Remove {removeTarget?.name} from this course? They will lose access to future assessments.
          </p>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setRemoveTarget(null)} type="button">Cancel</button>
            <button className="btn-primary" onClick={handleRemove} type="button">Remove</button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteCourse}
        onClose={() => setShowDeleteCourse(false)}
        title="Delete Course"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            This will remove all assessments and student enrollments. Are you sure?
          </p>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setShowDeleteCourse(false)} type="button">Cancel</button>
            <button className="btn-primary" type="button">Delete Course</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
