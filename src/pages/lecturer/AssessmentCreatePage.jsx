import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Save, Check } from 'lucide-react';
import { Input, Select } from '../../components/ui/Input';
import { useDemoStore } from '../../store/demoStore';
import toast from 'react-hot-toast';

export function AssessmentCreatePage() {
  const { courseId: routeCourseId } = useParams();
  const navigate = useNavigate();
  const { courses, problems, createAssessment } = useDemoStore();

  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState(routeCourseId || '');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [duration, setDuration] = useState('120');
  const [selectedProblemIds, setSelectedProblemIds] = useState([]);
  const [timeError, setTimeError] = useState('');

  // Get list of courses for selector
  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: c.title
  }));

  const selectedCourse = courses.find((c) => c.id === (courseId || routeCourseId));

  // Determine available problems (filter by course language/type, or display all)
  const availableProblems = Object.values(problems);

  useEffect(() => {
    if (routeCourseId) {
      setCourseId(routeCourseId);
    } else if (courses.length > 0 && !courseId) {
      setCourseId(courses[0].id);
    }
  }, [routeCourseId, courses, courseId]);

  // Pre-select some problems by default so the list is not empty
  useEffect(() => {
    if (availableProblems.length > 0 && selectedProblemIds.length === 0) {
      // Pick first 2 problems
      setSelectedProblemIds(availableProblems.slice(0, 2).map((p) => p.id));
    }
  }, [availableProblems, selectedProblemIds]);

  useEffect(() => {
    if (startsAt && endsAt) {
      const start = new Date(startsAt).getTime();
      const end = new Date(endsAt).getTime();
      if (end <= start) {
        setTimeError('End Datetime must be strictly after Start Datetime.');
      } else {
        setTimeError('');
      }
    } else {
      setTimeError('');
    }
  }, [startsAt, endsAt]);

  const getWindowDurationText = () => {
    if (!startsAt || !endsAt) return null;
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return null;

    const diffMs = end - start;
    const diffMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(diffMinutes / 1440);
    const hours = Math.floor((diffMinutes % 1440) / 60);
    const mins = diffMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (mins > 0) parts.push(`${mins} minute${mins > 1 ? 's' : ''}`);

    return parts.join(' ');
  };

  const toggleProblem = (id) => {
    setSelectedProblemIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handlePublish = () => {
    if (!title.trim()) {
      toast.error('Assessment title is required.');
      return;
    }
    if (!courseId) {
      toast.error('Course must be selected.');
      return;
    }
    if (!startsAt || !endsAt) {
      toast.error('Start and end windows must be defined.');
      return;
    }
    if (timeError) {
      toast.error(timeError);
      return;
    }

    if (new Date(startsAt).getTime() < Date.now()) {
      toast('Warning: The start time of this assessment is in the past.', {
        icon: '⚠️',
      });
    }

    createAssessment({
      title: title.trim(),
      courseId,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      duration: parseInt(duration) || 120,
      problemIds: selectedProblemIds
    });

    toast.success('🎉 Assessment scheduled and published successfully!');
    navigate('/lecturer/assessments');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 px-4">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/lecturer/assessments" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Assessments
          </Link>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Schedule Assessment</h1>
        </div>
        <button onClick={handlePublish} className="btn-primary">
          <Save size={16} /> Publish Assessment
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="glass p-6 space-y-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 border-b border-default pb-2">Configuration</h2>
            <Input 
              label="Assessment Title" 
              placeholder="e.g. Midterm Exam" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {routeCourseId && selectedCourse ? (
              <div className="w-full">
                <label className="label">Course</label>
                <div className="input flex items-center justify-between bg-dark-900 border border-default opacity-85">
                  <span>{selectedCourse.title}</span>
                  <span className="text-[var(--text-muted)] text-xs font-mono">Locked</span>
                </div>
              </div>
            ) : (
              <Select 
                label="Select Course" 
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                options={courseOptions}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Start Date & Time" 
                type="datetime-local" 
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
              <Input 
                label="End Date & Time" 
                type="datetime-local" 
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
            {timeError && (
              <p className="text-xs text-red-400 font-semibold">{timeError}</p>
            )}
            {getWindowDurationText() && !timeError && (
              <p className="text-xs text-brand-blue font-semibold">Assessment window duration: {getWindowDurationText()}</p>
            )}

            <Input 
              label="Duration (minutes)" 
              type="number" 
              placeholder="120" 
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <p className="text-xs text-[var(--text-secondary)]">The timer will start when a student begins the assessment and will auto-submit when the duration expires, or at the End Date, whichever comes first.</p>
          </div>
        </div>

        <div className="space-y-6">
           <div className="glass p-6">
             <div className="flex items-center justify-between mb-4 pb-2 border-b border-default">
               <h2 className="text-xl font-semibold text-[var(--text-primary)]">Selected Problems</h2>
               <div className="flex items-center gap-3">
                 <Link to="/lecturer/problems/new" className="text-xs text-brand-blue hover:underline">
                   + Create Custom
                 </Link>
                 <span className="text-xs text-[var(--text-muted)]">{selectedProblemIds.length} selected</span>
               </div>
             </div>

             <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
               {availableProblems.map((prob) => {
                 const isSelected = selectedProblemIds.includes(prob.id);
                 return (
                   <div 
                     key={prob.id} 
                     onClick={() => toggleProblem(prob.id)}
                     className={`p-3 rounded border transition-colors cursor-pointer flex items-center justify-between ${
                       isSelected 
                         ? 'border-brand-blue bg-brand-blue/5' 
                         : 'border-default bg-[var(--bg-surface)] hover:border-white/20'
                     }`}
                   >
                     <div>
                       <div className="font-medium text-[var(--text-primary)] text-sm">{prob.title}</div>
                       <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-0.5">{prob.type} • {prob.language || 'python'}</div>
                     </div>
                     <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                       isSelected ? 'bg-brand-blue border-brand-blue text-white' : 'border-default text-transparent'
                     }`}>
                       <Check size={12} strokeWidth={3} />
                     </div>
                   </div>
                 );
               })}
             </div>
             
             <div className="mt-6 bg-brand-blue/10 border border-brand-blue/20 rounded-lg p-4 flex gap-3 text-brand-blue text-sm">
                <Clock className="shrink-0 mt-0.5" size={16} />
                <p>Students will see these problems only during the active assessment window.</p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
