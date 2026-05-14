import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Clock, Save } from 'lucide-react';
import { Input, Select } from '../../components/ui/Input';

export function AssessmentCreatePage() {
  const { courseId } = useParams();
  const courseOptions = [
    { value: '1', label: 'Introduction to Python' },
    { value: '2', label: 'Data Structures in Java' },
  ];
  const selectedCourse = courseOptions.find((course) => course.value === courseId);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/lecturer/assessments" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Assessments
          </Link>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Schedule Assessment</h1>
        </div>
        <button className="btn-primary"><Save size={16} /> Publish Assessment</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="glass p-6 space-y-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 border-b border-default pb-2">Configuration</h2>
            <Input label="Assessment Title" placeholder="e.g. Midterm Exam" />

            {selectedCourse ? (
              <div className="w-full">
                <label className="label">Course</label>
                <div className="input flex items-center justify-between">
                  <span>{selectedCourse.label}</span>
                  <span className="text-[var(--text-muted)] text-xs">Locked</span>
                </div>
              </div>
            ) : (
              <Select 
                label="Select Course" 
                options={courseOptions}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input label="Start Date & Time" type="datetime-local" />
              <Input label="End Date & Time" type="datetime-local" />
            </div>

            <Input label="Duration (minutes)" type="number" placeholder="120" />
            <p className="text-xs text-[var(--text-secondary)]">The timer will start when a student begins the assessment and will auto-submit when the duration expires, or at the End Date, whichever comes first.</p>
          </div>
        </div>

        <div className="space-y-6">
           <div className="glass p-6">
             <div className="flex items-center justify-between mb-4 pb-2 border-b border-default">
               <h2 className="text-xl font-semibold text-[var(--text-primary)]">Selected Problems</h2>
               <button className="btn-secondary py-1 px-3 text-xs"><Plus size={14} /> Add from Bank</button>
             </div>

             <div className="space-y-3">
               <div className="p-3 rounded bg-[var(--bg-surface)] border border-default flex items-center justify-between">
                 <div>
                   <div className="font-medium text-[var(--text-primary)] text-sm">Two Sum</div>
                   <div className="text-xs text-[var(--text-muted)]">Challenge Mode • Python</div>
                 </div>
                 <div className="text-[var(--text-secondary)] cursor-move">☰</div>
               </div>
               <div className="p-3 rounded bg-[var(--bg-surface)] border border-default flex items-center justify-between">
                 <div>
                   <div className="font-medium text-[var(--text-primary)] text-sm">Valid Palindrome</div>
                   <div className="text-xs text-[var(--text-muted)]">Challenge Mode • Python</div>
                 </div>
                 <div className="text-[var(--text-secondary)] cursor-move">☰</div>
               </div>
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
