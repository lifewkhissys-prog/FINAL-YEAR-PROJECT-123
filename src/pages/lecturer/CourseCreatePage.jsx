import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Input, Select } from '../../components/ui/Input';
import { useDemoStore } from '../../store/demoStore';
import toast from 'react-hot-toast';

export function CourseCreatePage() {
  const navigate = useNavigate();
  const { createCourse } = useDemoStore();
  
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('python');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Course title is required.');
      return;
    }

    createCourse({
      title: title.trim(),
      language,
      description: description.trim(),
      problemIds: []
    });

    toast.success('🎉 Course created successfully!');
    navigate('/lecturer/courses');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 px-4">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/lecturer/courses" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Courses
          </Link>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Create Course</h1>
        </div>
        <button onClick={handleSave} className="btn-primary">
          <Save size={16} /> Save Course
        </button>
      </div>

      <div className="glass p-6 space-y-4 max-w-2xl">
        <Input 
          label="Course Title" 
          placeholder="e.g. Introduction to Python" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Select
          label="Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          options={[
            { value: 'python', label: 'Python' },
            { value: 'java', label: 'Java' },
            { value: 'cpp', label: 'C++' },
            { value: 'sql', label: 'SQL' },
            { value: 'html', label: 'HTML/CSS/JS' },
          ]}
        />
        <div className="w-full">
          <label className="label">Description</label>
          <textarea 
            className="input min-h-[140px]" 
            placeholder="Describe the course goals and structure..." 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
