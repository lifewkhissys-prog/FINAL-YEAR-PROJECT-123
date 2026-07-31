import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationHeader from '../../components/NavigationHeader';

export default function UploadThesisPage() {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('');
  const [degreeLevel, setDegreeLevel] = useState('mphil');
  const [thesisTitle, setThesisTitle] = useState('');
  const [programme, setProgramme] = useState('Computer Engineering');
  const [institution, setInstitution] = useState('Kwame Nkrumah University of Science and Technology (KNUST)');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a thesis document (.docx, .pdf, or .txt) to upload.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('student_name', studentName);
      formData.append('degree_level', degreeLevel);
      formData.append('title', thesisTitle);
      formData.append('programme', programme);
      formData.append('institution', institution);
      formData.append('file', selectedFile);

      const res = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Upload failed');
      }

      const data = await res.json();
      const submissionId = data.id;

      // Trigger background agent pipeline
      await fetch(`/api/submissions/${submissionId}/assess`, {
        method: 'POST',
      });

      navigate(`/thesis/submission/${submissionId}/structure`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error creating submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col">
      <NavigationHeader />

      <main className="flex-grow flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-4xl bg-white border border-surface-container-highest shadow-sm rounded-xl overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Side: Branding / Info */}
          <div className="md:w-1/3 bg-surface-container-low p-8 flex flex-col border-b md:border-b-0 md:border-r border-surface-container-highest">
            <div className="mb-auto">
              <div className="w-12 h-12 bg-primary text-white rounded-lg flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  assignment_turned_in
                </span>
              </div>
              <h1 className="font-serif text-2xl font-bold text-primary mb-3">New Assessment</h1>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                Configure the parameters for the new thesis evaluation. Sub-criteria will be mapped according to official KNUST Rubric standards.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-surface-container-highest space-y-3">
              <div className="flex items-center gap-3 text-on-surface-variant text-xs font-medium">
                <span className="material-symbols-outlined text-base text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>
                  verified_user
                </span>
                <span>KNUST HDR Rubric Grounded</span>
              </div>
              <div className="flex items-center gap-3 text-on-surface-variant text-xs font-medium">
                <span className="material-symbols-outlined text-base text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>
                  psychology
                </span>
                <span>Multi-Agent Double Verification</span>
              </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="md:w-2/3 p-8">
            <form onSubmit={handleSubmit} className="space-y-6 flex flex-col h-full">
              {error && (
                <div className="p-4 bg-error-container text-on-error-container text-sm rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Drag & Drop Zone */}
              <div className="relative border-2 border-dashed border-outline-variant rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-surface-bright transition-colors cursor-pointer group">
                <input
                  type="file"
                  accept=".docx,.pdf,.txt"
                  required
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="w-14 h-14 bg-surface-container rounded-full flex items-center justify-center mb-3 group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
                  <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>
                    upload_file
                  </span>
                </div>
                <p className="text-sm font-semibold text-primary mb-1">
                  {selectedFile ? selectedFile.name : 'Click to upload or drag & drop student thesis'}
                </p>
                <p className="text-xs text-on-surface-variant">PDF, DOCX, or TXT (KNUST thesis document format)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="studentName">
                    Student Name
                  </label>
                  <input
                    id="studentName"
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Elvis Atiah"
                    className="bg-white border border-outline-variant rounded px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>

                {/* Degree Level */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="degreeLevel">
                    Degree Level (Determines Rubric)
                  </label>
                  <select
                    id="degreeLevel"
                    value={degreeLevel}
                    onChange={(e) => setDegreeLevel(e.target.value)}
                    className="bg-white border border-outline-variant rounded px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  >
                    <option value="undergraduate">Undergraduate (BSc FYP)</option>
                    <option value="msc">MSc (Taught Master's)</option>
                    <option value="mphil">MPhil (KNUST Appendix 4.4)</option>
                    <option value="phd">PhD (KNUST Appendix 4.2)</option>
                  </select>
                </div>
              </div>

              {/* Thesis Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface" htmlFor="thesisTitle">
                  Thesis Title
                </label>
                <input
                  id="thesisTitle"
                  type="text"
                  required
                  value={thesisTitle}
                  onChange={(e) => setThesisTitle(e.target.value)}
                  placeholder="Enter full thesis title"
                  className="bg-white border border-outline-variant rounded px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="programme">
                    Programme
                  </label>
                  <input
                    id="programme"
                    type="text"
                    value={programme}
                    onChange={(e) => setProgramme(e.target.value)}
                    className="bg-white border border-outline-variant rounded px-3 py-2 text-sm focus:border-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="institution">
                    Institution
                  </label>
                  <input
                    id="institution"
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="bg-white border border-outline-variant rounded px-3 py-2 text-sm focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="mt-auto pt-6 flex justify-end gap-4 border-t border-surface-container-highest">
                <button
                  type="button"
                  onClick={() => navigate('/thesis/dashboard')}
                  className="px-5 py-2 border border-outline-variant text-on-surface-variant text-sm font-semibold rounded hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-primary text-white font-semibold text-sm rounded hover:bg-primary-container transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60"
                >
                  <span>{isSubmitting ? 'Processing Upload...' : 'Start Evaluation'}</span>
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0" }}>
                    arrow_forward
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
