import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavigationHeader from '../../components/NavigationHeader';
import { authFetch, safeJson } from '../../api/axiosInstance';

export default function FinalNarrativeReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [reportText, setReportText] = useState('');
  const [recommendation, setRecommendation] = useState('Pass (Minor Revisions Required)');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              <span>Step 4 of 4</span>
              <span>•</span>
              <span>Synthesized Evaluation Draft</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-primary">Final Narrative Report</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Comprehensive 8-section synthesis drafted from rubric scores, evidence citations, and flow verification.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => navigate(`/thesis/submission/${id}/verification`)}
              className="px-3.5 py-1.5 border border-outline-variant text-on-surface-variant text-xs font-semibold rounded-lg hover:bg-surface-container transition-colors whitespace-nowrap"
            >
              Back to Verification
            </button>

            <button
              onClick={handleExportDocx}
              disabled={isExporting}
              className="px-3.5 py-1.5 border border-primary text-primary text-xs font-semibold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-base">description</span>
              <span>{isExporting ? 'Exporting...' : 'Export Word (.docx)'}</span>
            </button>

            <button
              onClick={handleSaveReport}
              disabled={isSaving}
              className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-60 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-base">save</span>
              <span>{isSaving ? 'Saving...' : 'Save & Finalize Report'}</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700">check_circle</span>
            <span>Narrative report and supervisor recommendation saved successfully!</span>
          </div>
        )}

        {/* Supervisor Recommendation Card */}
        <div className="bg-white p-6 rounded-xl border border-surface-container-highest shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1">Supervisor Formal Recommendation</span>
            <h2 className="font-serif text-xl font-bold text-primary">Final Assessment Verdict</h2>
            <p className="text-xs text-on-surface-variant mt-1">Select final recommendation to record on student's transcript.</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              className="bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-sm font-semibold text-primary outline-none focus:border-primary"
            >
              <option value="Pass (Unconditional)">Pass — no corrections required</option>
              <option value="Pass (Minor Revisions Required)">Pass — minor corrections required</option>
              <option value="Conditionally Acceptable (Major Revisions)">Conditionally acceptable — major corrections required</option>
              <option value="Referred (Re-assessment, capped at 60)">Referred — may be revised for re-assessment (mark capped at 60)</option>
              <option value="Fail (Resubmission Required)">Fail</option>
            </select>
          </div>
        </div>

        {/* Editable Narrative Report Textarea */}
        <div className="bg-white rounded-xl border border-surface-container-highest p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-surface-container pb-4">
            <h2 className="font-serif text-xl font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">article</span>
              <span>8-Part Structured Narrative Report</span>
            </h2>
            <span className="text-xs text-on-surface-variant">Editable Markdown Draft</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-on-surface-variant text-sm">
              Loading synthesized narrative report...
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={22}
                className="w-full font-mono text-xs leading-relaxed bg-surface-container-lowest p-5 rounded-lg border border-outline-variant focus:border-primary outline-none transition-all"
                placeholder="Narrative report text..."
              />
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
