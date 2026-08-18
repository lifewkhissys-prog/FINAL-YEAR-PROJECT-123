import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavigationHeader from '../../components/NavigationHeader';
import { authFetch, safeJson } from '../../api/axiosInstance';

export default function FinalNarrativeReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [reportText, setReportText] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState('docx'); // 'docx' page preview vs 'editor' raw text

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await authFetch(`/api/submissions/${id}/report`);
        if (res.ok) {
          const data = await safeJson(res);
          if (data) {
            setReportText(data.narrative_report_edited || data.narrative_report || '');
            if (data.supervisor_recommendation) {
              setRecommendation(data.supervisor_recommendation);
            }
          }
        }
      } catch (err) {
        console.error("Error loading report:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [id]);

  const handleSaveReport = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await authFetch(`/api/submissions/${id}/report`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative_report_edited: reportText,
          supervisor_recommendation: recommendation
        })
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving report:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportDocx = async () => {
    setIsExporting(true);
    try {
      const res = await authFetch(`/api/submissions/${id}/export`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thesis_assessment_report_${id}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting report to DOCX:", err);
      alert("Failed to export Word document.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col">
      <NavigationHeader />

      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              <span>Step 4 of 4</span>
              <span>•</span>
              <span>Synthesized Evaluation Draft</span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-primary">Final 8-Part Narrative Assessment Report</h1>
            <p className="text-xs md:text-sm text-on-surface-variant mt-1">
              Synthesized evaluation report drafted from rubric criteria scores, evidence citations, and verification metrics.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => navigate(`/thesis/submission/${id}/verification`)}
              className="px-3 py-1.5 border border-outline-variant text-on-surface-variant text-xs font-semibold rounded-lg hover:bg-surface-container transition-colors whitespace-nowrap"
            >
              Back to Verification
            </button>

            <button
              onClick={handleExportDocx}
              disabled={isExporting}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-base">description</span>
              <span>{isExporting ? 'Generating DOCX...' : 'Download & Edit in Word (.docx)'}</span>
            </button>

            <button
              onClick={handleSaveReport}
              disabled={isSaving}
              className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-60 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-base">save</span>
              <span>{isSaving ? 'Saving...' : 'Save & Finalize'}</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700 text-sm">check_circle</span>
            <span>Narrative report and supervisor recommendation saved successfully!</span>
          </div>
        )}

        {/* Supervisor Formal Recommendation Verdict */}
        <div className="bg-white p-5 rounded-xl border border-surface-container-highest shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-0.5">Supervisor Formal Verdict</span>
            <h2 className="font-serif text-lg font-bold text-primary">Overall Assessment Recommendation</h2>
            <p className="text-xs text-on-surface-variant">Select final recommendation for academic transcript and degree award.</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              className="bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold text-primary outline-none focus:border-primary"
            >
              <option value="Pass (Unconditional)">Pass (Unconditional) — no corrections required</option>
              <option value="Pass (Conditional)">Pass (Conditional) — minor typographical/formatting corrections</option>
              <option value="Pass (Minor Revision)">Pass (Minor Revision) — minor technical corrections required</option>
              <option value="Referred (Re-assessment capped at 60%)">Referred — major revision required (capped at 60%)</option>
              <option value="Fail (Resubmission Required)">Fail — serious conceptual/empirical deficiencies</option>
            </select>
          </div>
        </div>

        {/* 8-Part Structured Narrative Report View & Editor */}
        <div className="bg-white rounded-xl border border-surface-container-highest p-4 md:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-surface-container pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">description</span>
              <h2 className="font-serif text-lg font-bold text-primary">8-Part Structured Narrative Report (.docx Format)</h2>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-surface-container rounded-lg p-0.5 border border-surface-container-highest">
              <button
                onClick={() => setViewMode('docx')}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'docx' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-xs">description</span>
                Word (.docx) Document Preview
              </button>
              <button
                onClick={() => setViewMode('editor')}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'editor' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-xs">edit_note</span>
                Raw Text Editor
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-on-surface-variant text-xs flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
              Loading 8-part synthesized narrative report...
            </div>
          ) : viewMode === 'docx' ? (
            /* Styled Word Document Preview Box */
            <div className="p-4 md:p-8 bg-slate-100 dark:bg-zinc-900 rounded-xl overflow-x-auto flex justify-center border border-surface-container">
              <div className="w-full max-w-4xl bg-white text-zinc-900 p-8 md:p-12 rounded-sm shadow-xl space-y-6 font-serif leading-relaxed text-sm">
                
                {/* Document Header */}
                <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                  <h2 className="font-bold text-lg text-slate-900 tracking-wide uppercase">KWAME NKRUMAH UNIVERSITY OF SCIENCE AND TECHNOLOGY</h2>
                  <p className="text-xs italic text-slate-600 font-sans">School of Graduate Studies — Critical Thesis Assessment Report</p>
                </div>

                {/* Recommendation Banner */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded text-xs font-sans space-y-1">
                  <span className="font-bold uppercase tracking-wider text-slate-500 block text-[10px]">Official Verdict</span>
                  <p className="font-bold text-slate-800 text-sm">{recommendation || 'Pass (Unconditional)'}</p>
                </div>

                {/* Editable Report Content Box */}
                <div className="space-y-4">
                  <label className="block text-[11px] font-sans font-bold text-slate-500 uppercase tracking-wider">
                    Report Content (Edit inline below or download as Word .docx):
                  </label>
                  <textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    rows={20}
                    className="w-full font-serif text-sm leading-relaxed p-4 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={handleExportDocx}
                    disabled={isExporting}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-sans text-xs font-bold rounded shadow flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">download</span>
                    Export Official Word (.docx) Document
                  </button>
                </div>

              </div>
            </div>
          ) : (
            /* Raw Text Editor */
            <div className="space-y-3">
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={22}
                className="w-full font-mono text-xs leading-relaxed bg-surface-container-lowest p-5 rounded-lg border border-outline-variant focus:border-primary outline-none transition-all"
                placeholder="Enter narrative report text..."
              />
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
