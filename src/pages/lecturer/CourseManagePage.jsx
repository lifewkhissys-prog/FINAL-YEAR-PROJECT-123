import { useMemo, useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Trash2, Plus, Library, BookOpen, FileUp, Eye, Edit, Search, Check, X, Copy, ChevronDown, ChevronRight, Play, Award, Clock } from 'lucide-react';
import { Input, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { useDemoStore } from '../../store/demoStore';
import { SlideViewer } from '../../components/ui/SlideViewer';
import toast from 'react-hot-toast';

const parseSlideFile = (file) => {
  const fileName = file.name || '';
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  
  let title = nameWithoutExt
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
    
  let language = 'general';
  if (title.toLowerCase().includes('python') || title.toLowerCase().includes('py')) {
    language = 'python';
  } else if (title.toLowerCase().includes('sql') || title.toLowerCase().includes('database') || title.toLowerCase().includes('db')) {
    language = 'sql';
  } else if (title.toLowerCase().includes('js') || title.toLowerCase().includes('javascript') || title.toLowerCase().includes('web')) {
    language = 'javascript';
  } else if (title.toLowerCase().includes('c++') || title.toLowerCase().includes('cpp')) {
    language = 'cpp';
  }
  
  let description = `Lecture slides and reference guide for ${title}.`;
  
  let pages = [];
  if (language === 'python') {
    pages = [
      { title: `Introduction to ${title}`, content: `Welcome to the lecture slides for ${title}.\n\nThis session covers the basic components and structure of Python coding.` },
      { title: 'Syntax & Variables', content: 'x = 10\ny = 25\n\n# Basic Operations\nsum_val = x + y\nprint("Total sum:", sum_val)' },
      { title: 'Interactive Practice', content: 'Complete the practice problems linked to this course to verify your learning.' }
    ];
  } else if (language === 'sql') {
    pages = [
      { title: `Welcome to ${title}`, content: `Welcome to this lecture on database concepts.\n\nIn this slide deck we cover query structures, tables, and keys.` },
      { title: 'Basic SQL select query', content: 'SELECT id, title, description\nFROM products\nWHERE price > 49.99\nORDER BY price ASC;' },
      { title: 'Primary vs Foreign Keys', content: '- Primary Key: Uniquely identifies a record in a table.\n- Foreign Key: Points to a Primary Key in another table to build relations.' }
    ];
  } else {
    pages = [
      { title: `Introduction: ${title}`, content: `This slide deck outlines the core concepts of ${title}.\n\nReview these pages to prepare for assessments.` },
      { title: 'Key Takeaways', content: '- Focus on implementation speed\n- Solve the practice checklist items\n- Ask questions in the discussion board' }
    ];
  }
  
  return { title, description, language, pages };
};

export function CourseManagePage() {
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    courses,
    assessments: storeAssessments,
    studentsList,
    updateCourse,
    deleteCourse,
    enrollStudent,
    removeStudent,
    problems: storeProblems,
    addSlideToCourse,
    removeSlideFromCourse,
    updateSlideInCourse,
    createModule,
    updateModule,
    deleteModule,
    linkProblemToModule,
    unlinkProblemFromModule,
    addSlideToModule,
    removeSlideFromModule: removeSlideFromModuleStore,
    assignAssessmentToModule
  } = useDemoStore();

  const [course, setCourse] = useState(null);
  const [courseDraft, setCourseDraft] = useState({ title: '', description: '' });
  const [students, setStudents] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('modules');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Student enrollment modal
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollError, setEnrollError] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);
  const [showDeleteCourse, setShowDeleteCourse] = useState(false);

  // New features state
  const [courseProblems, setCourseProblems] = useState([]);
  const [slides, setSlides] = useState([]);

  // Modules management state
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [activeModuleIdForUpload, setActiveModuleIdForUpload] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});

  // Linking modals
  const [linkingModuleId, setLinkingModuleId] = useState(null);
  const [isLinkProblemOpen, setIsLinkProblemOpen] = useState(false);
  const [problemSearch, setProblemSearch] = useState('');
  const [isLinkAssessmentOpen, setIsLinkAssessmentOpen] = useState(false);

  // Slides uploading
  const [isSlideUploadOpen, setIsSlideUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadLanguage, setUploadLanguage] = useState('general');
  const [uploadPages, setUploadPages] = useState([]);
  const [uploadFileName, setUploadFileName] = useState('');

  // Slides editing
  const [isSlideEditOpen, setIsSlideEditOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);

  // Direct slide preview modal
  const [activePreviewSlide, setActivePreviewSlide] = useState(null);

  useEffect(() => {
    const storeCourse = courses.find((c) => c.id === courseId);
    if (!storeCourse) {
      setCourse(null);
      setLoading(false);
      return;
    }

    setCourse(storeCourse);
    setCourseDraft({
      title: storeCourse.title || '',
      description: storeCourse.description || ''
    });

    // Populate problems & slides
    const courseProblemIds = storeCourse.problemIds || [];
    const fullProblems = courseProblemIds.map((id) => storeProblems[id]).filter(Boolean);
    setCourseProblems(fullProblems);
    setSlides(storeCourse.slides || []);

    // Populate students details from emails list
    const enrolledEmails = storeCourse.students || [];
    const enrolledStudents = enrolledEmails.map((email) => {
      const info = studentsList.find((s) => s.email.toLowerCase() === email.toLowerCase());
      return {
        id: email, // use email as unique id
        name: info ? info.name : email.split('@')[0],
        email: email
      };
    });
    setStudents(enrolledStudents);

    // Populate assessments for this course
    const courseAssessments = storeAssessments
      .filter((a) => a.courseId === courseId)
      .map((a) => {
        const now = Date.now();
        const start = new Date(a.startsAt).getTime();
        const end = new Date(a.endsAt).getTime();
        let statusLabel = 'Scheduled';
        if (now >= start && now <= end) statusLabel = 'Active';
        else if (now > end) statusLabel = 'Ended';

        const formattedStart = new Date(a.startsAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const formattedStartTime = new Date(a.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const formattedEndTime = new Date(a.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return {
          id: a.id,
          title: a.title,
          window: `${statusLabel} • ${formattedStart}, ${formattedStartTime} - ${formattedEndTime}`,
          problems: a.problemIds ? a.problemIds.length : 0
        };
      });
    setAssessments(courseAssessments);
    setLoading(false);
  }, [courseId, courses, storeAssessments, studentsList, storeProblems]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextTab = params.get('tab');
    if (nextTab && ['modules', 'students', 'edit'].includes(nextTab)) {
      setActiveTab(nextTab);
    }
  }, [location.search]);

  const handleSaveModule = () => {
    if (!moduleTitle.trim()) {
      toast.error('Module title is required.');
      return;
    }
    if (editingModule) {
      updateModule(courseId, editingModule.id, {
        title: moduleTitle.trim(),
        description: moduleDescription.trim()
      });
      toast.success('Module updated successfully!');
    } else {
      createModule(courseId, {
        title: moduleTitle.trim(),
        description: moduleDescription.trim()
      });
      toast.success('Module created successfully!');
    }
    setModuleTitle('');
    setModuleDescription('');
    setEditingModule(null);
    setIsModuleModalOpen(false);
  };

  const handleDeleteModule = (modId) => {
    if (confirm('Are you sure you want to delete this module? This does not delete slides or problems, but removes their organization.')) {
      deleteModule(courseId, modId);
      toast.success('Module deleted.');
    }
  };

  const toggleModule = (modId) => {
    setExpandedModules(prev => ({
      ...prev,
      [modId]: prev[modId] === false ? true : false
    }));
  };

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

    enrollStudent(courseId, trimmedEmail);
    toast.success(`🎉 Enrolled ${trimmedEmail} successfully!`);

    setEnrollEmail('');
    setEnrollError('');
    setIsEnrollOpen(false);
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    removeStudent(courseId, removeTarget.email);
    toast.success(`Removed student ${removeTarget.email} from course.`);
    setRemoveTarget(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    
    // Heuristic Parsing
    const parsed = parseSlideFile(file);
    setUploadTitle(parsed.title);
    setUploadDescription(parsed.description);
    setUploadLanguage(parsed.language);
    setUploadPages(parsed.pages);
    
    setIsSlideUploadOpen(true);
  };

  const handleStartEditSlide = (slide) => {
    setEditingSlide({ ...slide });
    setIsSlideEditOpen(true);
  };

  const handleDeleteSlide = (slideId) => {
    if (window.confirm('Are you sure you want to delete this slide deck?')) {
      removeSlideFromCourse(courseId, slideId);
      toast.success('Slide deck deleted.');
    }
  };

  const handleSaveChanges = () => {
    if (!courseDraft.title.trim()) {
      toast.error('Course title is required.');
      return;
    }
    updateCourse(courseId, {
      title: courseDraft.title.trim(),
      description: courseDraft.description.trim()
    });
    toast.success('🎉 Course changes saved successfully!');
  };

  const handleDelete = () => {
    deleteCourse(courseId);
    toast.success('Course deleted.');
    navigate('/lecturer/courses');
  };

  if (loading) return <FullPageSpinner />;
  if (!course) return <div className="p-8 text-[var(--text-primary)]">Course not found.</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-10 px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Link to="/lecturer/courses" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Courses
          </Link>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Manage: {course.title}</h1>
          <p className="text-sm text-[var(--text-secondary)]">Language: {(course.language || 'python').toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center">
          <div className="glass px-4 py-2 border border-white/10 rounded-xl flex items-center gap-4 bg-white/[0.01]">
            <div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-semibold">Student Join Code</span>
              <span className="font-mono text-base font-bold text-brand-blue tracking-widest uppercase">{course.joinCode}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(course.joinCode);
                toast.success('Course code copied to clipboard!');
              }}
              title="Copy Code"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-default pb-3">
        {[
          { key: 'students', label: 'Students' },
          { key: 'problems', label: 'Practice Problems' },
          { key: 'slides', label: 'Slides & Resources' },
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
                      to={`/lecturer/courses/${course.id}/students/${student.email}`}
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
                Add students by email. Click on a student to see their individual progress and grade logs for this course.
              </p>
            </div>
          </div>
        </div>
      )}

        {activeTab === 'modules' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Curriculum Modules (Mini-courses)</h2>
              <p className="text-sm text-[var(--text-secondary)]">Organize your course content into sequential mini-courses (modules) with lecture materials, practice exercises, and assessments.</p>
            </div>
            <button
              onClick={() => {
                setEditingModule(null);
                setModuleTitle('');
                setModuleDescription('');
                setIsModuleModalOpen(true);
              }}
              className="btn-primary flex items-center gap-1.5 self-start"
            >
              <Plus size={16} /> Create Module
            </button>
          </div>

          <div className="space-y-4">
            {(course.modules || []).map((mod, index) => {
              const isExpanded = expandedModules[mod.id] !== false;
              const moduleSlides = (course.slides || []).filter(s => (mod.slideIds || []).includes(s.id));
              const moduleProblems = (mod.problemIds || []).map(id => storeProblems[id]).filter(Boolean);
              const moduleAssessments = storeAssessments.filter(a => (mod.assessmentIds || []).includes(a.id));

              return (
                <div key={mod.id} className="glass rounded-2xl border border-white/10 overflow-hidden transition-all duration-300">
                  {/* Module Header */}
                  <div className="p-5 flex items-center justify-between bg-white/[0.01] border-b border-white/5">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-mono text-sm font-bold text-[var(--text-secondary)] shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-[var(--text-primary)] text-lg flex items-center gap-2">
                          {mod.title}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{mod.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingModule(mod);
                          setModuleTitle(mod.title);
                          setModuleDescription(mod.description || '');
                          setIsModuleModalOpen(true);
                        }}
                        className="p-1.5 rounded hover:bg-white/5 text-[var(--text-secondary)] hover:text-brand-blue transition-colors"
                        title="Edit Module Details"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteModule(mod.id)}
                        className="p-1.5 rounded hover:bg-white/5 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                        title="Delete Module"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => toggleModule(mod.id)}
                        className="p-1.5 rounded hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ml-2"
                      >
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Module Resources */}
                  {isExpanded && (
                    <div className="p-6 space-y-6">
                      <div className="grid md:grid-cols-3 gap-6">
                        {/* Slides subcolumn */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                              <BookOpen size={12} /> Lectures ({moduleSlides.length})
                            </h4>
                            <button className="relative overflow-hidden btn-secondary py-1 px-2 text-[10px] flex items-center gap-1 font-semibold">
                              <Plus size={10} /> Add
                              <input
                                type="file"
                                accept=".pdf,.pptx,.txt"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => {
                                  setActiveModuleIdForUpload(mod.id);
                                  handleFileChange(e);
                                }}
                              />
                            </button>
                          </div>
                          
                          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                            {moduleSlides.map(slide => (
                              <div key={slide.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.005] hover:bg-white/[0.01] transition-all flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <h5 className="font-semibold text-sm text-[var(--text-primary)] truncate">{slide.title}</h5>
                                  <span className="text-[9px] text-[var(--text-muted)] font-mono">{slide.pages ? slide.pages.length : 0} slides • {slide.programmingLanguage || 'general'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setActivePreviewSlide(slide)}
                                    className="p-1 hover:text-brand-blue text-[var(--text-muted)] transition-colors"
                                    title="Preview Deck"
                                  >
                                    <Eye size={13} />
                                  </button>
                                  <button
                                    onClick={() => removeSlideFromModuleStore(courseId, mod.id, slide.id)}
                                    className="p-1 hover:text-red-400 text-[var(--text-muted)] transition-colors"
                                    title="Unlink Slide"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {moduleSlides.length === 0 && (
                              <p className="text-[11px] text-[var(--text-muted)] italic text-center py-4">No slide decks uploaded yet.</p>
                            )}
                          </div>
                        </div>

                        {/* Coding Exercises subcolumn */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                              <Play size={12} /> Practice ({moduleProblems.length})
                            </h4>
                            <button
                              onClick={() => {
                                setLinkingModuleId(mod.id);
                                setProblemSearch('');
                                setIsLinkProblemOpen(true);
                              }}
                              className="btn-secondary py-1 px-2 text-[10px] flex items-center gap-1 font-semibold"
                            >
                              <Plus size={10} /> Link
                            </button>
                          </div>

                          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                            {moduleProblems.map(prob => (
                              <div key={prob.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.005] hover:bg-white/[0.01] transition-all flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <h5 className="font-semibold text-sm text-[var(--text-primary)] truncate">{prob.title}</h5>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[8px] font-mono px-1 rounded bg-white/5 border border-white/5 text-[var(--text-secondary)] uppercase">{prob.language}</span>
                                    <span className={`text-[8px] font-mono px-1 rounded uppercase ${prob.type === 'challenge' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>{prob.type}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => unlinkProblemFromModule(courseId, mod.id, prob.id)}
                                  className="p-1 hover:text-red-400 text-[var(--text-muted)] transition-colors shrink-0"
                                  title="Unlink Problem"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                            {moduleProblems.length === 0 && (
                              <p className="text-[11px] text-[var(--text-muted)] italic text-center py-4">No problems linked to this module.</p>
                            )}
                          </div>
                        </div>

                        {/* Assessments subcolumn */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                              <Clock size={12} /> Assessments ({moduleAssessments.length})
                            </h4>
                            <button
                              onClick={() => {
                                setLinkingModuleId(mod.id);
                                setIsLinkAssessmentOpen(true);
                              }}
                              className="btn-secondary py-1 px-2 text-[10px] flex items-center gap-1 font-semibold"
                            >
                              <Plus size={10} /> Link
                            </button>
                          </div>

                          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                            {moduleAssessments.map(ass => (
                              <div key={ass.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.005] hover:bg-white/[0.01] transition-all flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <h5 className="font-semibold text-sm text-[var(--text-primary)] truncate">{ass.title}</h5>
                                  <span className="text-[8px] text-[var(--text-muted)] block mt-0.5 truncate">{ass.window}</span>
                                </div>
                                <button
                                  onClick={() => assignAssessmentToModule(courseId, '', ass.id)}
                                  className="p-1 hover:text-red-400 text-[var(--text-muted)] transition-colors shrink-0"
                                  title="Unlink Assessment"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                            {moduleAssessments.length === 0 && (
                              <p className="text-[11px] text-[var(--text-muted)] italic text-center py-4">No assessments linked to this module.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {(course.modules || []).length === 0 && (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                <Library size={48} className="mx-auto text-brand-blue opacity-50 mb-3" />
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No Curriculum Modules Yet</h3>
                <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-6">Create mini-courses/modules to group your lecture slides, exercises, and assessments in a logical timeline for your students.</p>
                <button
                  onClick={() => {
                    setEditingModule(null);
                    setModuleTitle('');
                    setModuleDescription('');
                    setIsModuleModalOpen(true);
                  }}
                  className="btn-primary"
                >
                  Create Your First Module
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'edit' && (
        <div className="glass p-6 space-y-4 max-w-3xl">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Course Details</h2>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
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
              <button className="btn-primary" type="button" onClick={handleSaveChanges}>Save Changes</button>
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

      {/* Enroll Modal */}
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

      {/* Remove Student Modal */}
      <Modal
        isOpen={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        title="Remove Student"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Remove {removeTarget?.name} ({removeTarget?.email}) from this course? They will lose access to future assessments.
          </p>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setRemoveTarget(null)} type="button">Cancel</button>
            <button className="btn-primary" onClick={handleRemove} type="button">Remove</button>
          </div>
        </div>
      </Modal>

      {/* Delete Course Modal */}
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
            <button className="btn-primary" type="button" onClick={handleDelete}>Delete Course</button>
          </div>
        </div>
      </Modal>

      {/* Module Add/Edit Modal */}
      <Modal
        isOpen={isModuleModalOpen}
        onClose={() => setIsModuleModalOpen(false)}
        title={editingModule ? "Edit Module Details" : "Create New Module"}
      >
        <div className="space-y-4">
          <Input
            label="Module Title"
            placeholder="e.g. Variables and Data Types"
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
          />
          <Textarea
            label="Description"
            placeholder="What will students learn in this module?"
            rows={3}
            value={moduleDescription}
            onChange={(e) => setModuleDescription(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-default">
            <button className="btn-secondary" onClick={() => setIsModuleModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveModule}>
              {editingModule ? "Save Changes" : "Create Module"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Module Problems Linking Modal */}
      <Modal
        isOpen={isLinkProblemOpen}
        onClose={() => {
          setIsLinkProblemOpen(false);
          setLinkingModuleId(null);
        }}
        title="Link Practice Problems"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={16} />
            <input
              type="text"
              className="input pl-9 w-full"
              placeholder="Search problem bank..."
              value={problemSearch}
              onChange={(e) => setProblemSearch(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {Object.values(storeProblems)
              .filter(problem => {
                const term = problemSearch.toLowerCase().trim();
                return !term || 
                  problem.title.toLowerCase().includes(term) || 
                  problem.description.toLowerCase().includes(term) ||
                  problem.language.toLowerCase().includes(term);
              })
              .map(problem => {
                const currentMod = course.modules?.find(m => m.id === linkingModuleId);
                const isLinkedToCurrent = currentMod?.problemIds?.includes(problem.id);
                const otherModule = course.modules?.find(m => m.id !== linkingModuleId && m.problemIds?.includes(problem.id));

                return (
                  <div
                    key={problem.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-default bg-dark-900/10 hover:border-white/10 transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="font-semibold text-sm text-[var(--text-primary)] truncate flex items-center gap-2">
                        {problem.title}
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-default uppercase font-mono shrink-0">
                          {problem.language}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] truncate">{problem.description}</p>
                    </div>

                    <div>
                      {isLinkedToCurrent ? (
                        <button
                          onClick={() => {
                            unlinkProblemFromModule(courseId, linkingModuleId, problem.id);
                            toast.success('Unlinked problem.');
                          }}
                          className="btn-secondary py-1 px-2.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-1 font-semibold"
                        >
                          <Check size={12} /> Linked
                        </button>
                      ) : otherModule ? (
                        <button
                          onClick={() => {
                            unlinkProblemFromModule(courseId, otherModule.id, problem.id);
                            linkProblemToModule(courseId, linkingModuleId, problem.id);
                            toast.success(`Moved problem to this module!`);
                          }}
                          className="btn-secondary py-1 px-2.5 text-xs text-amber-400 hover:bg-amber-500/10 font-semibold"
                          title={`Currently linked to: ${otherModule.title}`}
                        >
                          Move Here
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            linkProblemToModule(courseId, linkingModuleId, problem.id);
                            toast.success('Linked problem successfully!');
                          }}
                          className="btn-primary py-1 px-2.5 text-xs font-semibold"
                        >
                          + Link
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-default">
            <button className="btn-secondary" onClick={() => {
              setIsLinkProblemOpen(false);
              setLinkingModuleId(null);
            }}>
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Module Assessments Linking Modal */}
      <Modal
        isOpen={isLinkAssessmentOpen}
        onClose={() => {
          setIsLinkAssessmentOpen(false);
          setLinkingModuleId(null);
        }}
        title="Link Assessment to Module"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)]">Assessments belonging to this course can be linked to this module timeline.</p>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {storeAssessments
              .filter(ass => ass.courseId === courseId)
              .map(ass => {
                const currentMod = course.modules?.find(m => m.id === linkingModuleId);
                const isLinkedToCurrent = currentMod?.assessmentIds?.includes(ass.id);
                const otherMod = course.modules?.find(m => m.id !== linkingModuleId && m.assessmentIds?.includes(ass.id));

                return (
                  <div
                    key={ass.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-default bg-dark-900/10 hover:border-white/10 transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <h4 className="font-semibold text-sm text-[var(--text-primary)] truncate">{ass.title}</h4>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{ass.startsAt} - {ass.endsAt}</p>
                    </div>

                    <div>
                      {isLinkedToCurrent ? (
                        <button
                          onClick={() => {
                            assignAssessmentToModule(courseId, '', ass.id);
                            toast.success('Unlinked assessment from module.');
                          }}
                          className="btn-secondary py-1 px-2.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-1 font-semibold"
                        >
                          <Check size={12} /> Linked
                        </button>
                      ) : otherMod ? (
                        <button
                          onClick={() => {
                            assignAssessmentToModule(courseId, linkingModuleId, ass.id);
                            toast.success('Moved assessment to this module!');
                          }}
                          className="btn-secondary py-1 px-2.5 text-xs text-amber-400 hover:bg-amber-500/10 font-semibold"
                          title={`Linked to: ${otherMod.title}`}
                        >
                          Move Here
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            assignAssessmentToModule(courseId, linkingModuleId, ass.id);
                            toast.success('Linked assessment successfully!');
                          }}
                          className="btn-primary py-1 px-2.5 text-xs font-semibold"
                        >
                          + Link
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

            {storeAssessments.filter(ass => ass.courseId === courseId).length === 0 && (
              <p className="text-xs text-center py-4 text-[var(--text-muted)]">No assessments created for this course yet.</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-default">
            <button className="btn-secondary" onClick={() => {
              setIsLinkAssessmentOpen(false);
              setLinkingModuleId(null);
            }}>
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Slide Upload Preview & Edit Modal */}
      <Modal
        isOpen={isSlideUploadOpen}
        onClose={() => setIsSlideUploadOpen(false)}
        title="Review & Process Uploaded Slides"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)] bg-brand-blue/5 p-3 border-l-2 border-brand-blue rounded">
            We extracted the metadata and slide outlines below. Customize them before finalized addition to the course.
          </p>

          <Input
            label="Slide Deck Title"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
          />

          <Textarea
            label="Description"
            rows={2}
            value={uploadDescription}
            onChange={(e) => setUploadDescription(e.target.value)}
          />

          <div>
            <label className="label mb-1">Programming Language (If applicable)</label>
            <select
              className="input w-full"
              value={uploadLanguage}
              onChange={(e) => setUploadLanguage(e.target.value)}
            >
              <option value="general">General (None)</option>
              <option value="python">Python</option>
              <option value="sql">SQL</option>
              <option value="javascript">JavaScript</option>
              <option value="cpp">C++</option>
            </select>
          </div>

          <div className="space-y-4 border border-default p-4 rounded-lg bg-dark-900/30">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-xs uppercase font-bold tracking-wider text-[var(--text-secondary)]">Slide Pages ({uploadPages.length})</h4>
              <button
                type="button"
                onClick={() => setUploadPages([...uploadPages, { title: `Slide ${uploadPages.length + 1}`, content: '' }])}
                className="btn-secondary py-1 px-2 text-xs flex items-center gap-1"
              >
                + Add Page
              </button>
            </div>
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {uploadPages.map((page, idx) => (
                <div key={idx} className="border border-default/60 p-3 rounded bg-dark-950/20 space-y-2 relative">
                  <button
                    type="button"
                    onClick={() => setUploadPages(uploadPages.filter((_, i) => i !== idx))}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-300 text-[10px]"
                  >
                    Remove
                  </button>
                  <input
                    type="text"
                    className="input py-1 text-xs w-full font-bold"
                    placeholder={`Slide ${idx + 1} Title`}
                    value={page.title}
                    onChange={(e) => {
                      const updated = [...uploadPages];
                      updated[idx].title = e.target.value;
                      setUploadPages(updated);
                    }}
                  />
                  <textarea
                    className="input py-1 text-xs w-full h-16 font-mono"
                    placeholder="Slide Content (Supports code snippet or bullet lists)"
                    value={page.content}
                    onChange={(e) => {
                      const updated = [...uploadPages];
                      updated[idx].content = e.target.value;
                      setUploadPages(updated);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-default">
            <button className="btn-secondary" onClick={() => setIsSlideUploadOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              onClick={() => {
                if (!uploadTitle.trim()) {
                  toast.error('Slide title is required.');
                  return;
                }
                const newSlide = {
                  title: uploadTitle.trim(),
                  description: uploadDescription.trim(),
                  programmingLanguage: uploadLanguage,
                  fileName: uploadFileName,
                  pages: uploadPages
                };
                if (activeModuleIdForUpload) {
                  addSlideToModule(courseId, activeModuleIdForUpload, newSlide);
                } else {
                  addSlideToCourse(courseId, newSlide);
                }
                toast.success('🎉 Slides processed and saved!');
                setIsSlideUploadOpen(false);
                setActiveModuleIdForUpload(null);
              }}
            >
              Confirm and Save Deck
            </button>
          </div>
        </div>
      </Modal>

      {/* Slide Edit Modal */}
      <Modal
        isOpen={isSlideEditOpen}
        onClose={() => setIsSlideEditOpen(false)}
        title="Edit Slide Deck"
      >
        <div className="space-y-4">
          {editingSlide && (
            <>
              <Input
                label="Slide Deck Title"
                value={editingSlide.title}
                onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
              />

              <Textarea
                label="Description"
                rows={2}
                value={editingSlide.description}
                onChange={(e) => setEditingSlide({ ...editingSlide, description: e.target.value })}
              />

              <div>
                <label className="label mb-1">Programming Language</label>
                <select
                  className="input w-full"
                  value={editingSlide.programmingLanguage || 'general'}
                  onChange={(e) => setEditingSlide({ ...editingSlide, programmingLanguage: e.target.value })}
                >
                  <option value="general">General (None)</option>
                  <option value="python">Python</option>
                  <option value="sql">SQL</option>
                  <option value="javascript">JavaScript</option>
                  <option value="cpp">C++</option>
                </select>
              </div>

              <div className="space-y-4 border border-default p-4 rounded-lg bg-dark-900/30">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-[var(--text-secondary)]">Slide Pages ({editingSlide.pages?.length || 0})</h4>
                  <button
                    type="button"
                    onClick={() => setEditingSlide({
                      ...editingSlide,
                      pages: [...(editingSlide.pages || []), { title: `Slide ${(editingSlide.pages || []).length + 1}`, content: '' }]
                    })}
                    className="btn-secondary py-1 px-2 text-xs flex items-center gap-1"
                  >
                    + Add Page
                  </button>
                </div>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {(editingSlide.pages || []).map((page, idx) => (
                    <div key={idx} className="border border-default/60 p-3 rounded bg-dark-950/20 space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => setEditingSlide({
                          ...editingSlide,
                          pages: editingSlide.pages.filter((_, i) => i !== idx)
                        })}
                        className="absolute top-2 right-2 text-red-400 hover:text-red-300 text-[10px]"
                      >
                        Remove
                      </button>
                      <input
                        type="text"
                        className="input py-1 text-xs w-full font-bold"
                        placeholder={`Slide ${idx + 1} Title`}
                        value={page.title}
                        onChange={(e) => {
                          const updatedPages = [...editingSlide.pages];
                          updatedPages[idx].title = e.target.value;
                          setEditingSlide({ ...editingSlide, pages: updatedPages });
                        }}
                      />
                      <textarea
                        className="input py-1 text-xs w-full h-16 font-mono"
                        placeholder="Slide Content"
                        value={page.content}
                        onChange={(e) => {
                          const updatedPages = [...editingSlide.pages];
                          updatedPages[idx].content = e.target.value;
                          setEditingSlide({ ...editingSlide, pages: updatedPages });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-default">
                <button className="btn-secondary" onClick={() => setIsSlideEditOpen(false)}>Cancel</button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (!editingSlide.title.trim()) {
                      toast.error('Slide title is required.');
                      return;
                    }
                    updateSlideInCourse(courseId, editingSlide.id, editingSlide);
                    toast.success('🎉 Slides saved successfully!');
                    setIsSlideEditOpen(false);
                  }}
                >
                  Save Changes
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Slide Viewer component */}
      <SlideViewer
        isOpen={Boolean(activePreviewSlide)}
        onClose={() => setActivePreviewSlide(null)}
        slide={activePreviewSlide}
      />
    </div>
  );
}
