import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavigationHeader from '../../components/NavigationHeader';
import { authFetch } from '../../api/axiosInstance';

const PIPELINE_STEPS = [
  { key: 'structural_extraction', label: 'Document Extraction', desc: 'Reading document structure & figures' },
  { key: 'rubric_loading', label: 'Rubric Preparation', desc: 'Loading degree-level rubric rules' },
  { key: 'preliminary_check', label: 'Readiness Gate', desc: 'Verifying core chapters & constraints' },
  { key: 'flow_analysis', label: 'Flow Matrix', desc: 'Extracting alignment & scope matrix' },
  { key: 'plagiarism_scan', label: 'Similarity Scan', desc: 'Running section similarity check' },
  { key: 'evidence_gathering', label: 'Evidence Extraction', desc: 'Auditing chapters for verbatim evidence' },
  { key: 'scoring', label: 'Calibrated Scoring', desc: 'Scoring whole document in single pass' },
  { key: 'narrative_synthesis', label: 'Report Synthesis', desc: 'Drafting 8-part supervisor report' },
  { key: 'self_check', label: 'Quality Verification', desc: 'Running self-check audit pass' },
];

function getStepIndex(stepKey) {
  if (!stepKey || stepKey === 'structural_extraction') return 0;
  if (stepKey === 'rubric_loading') return 1;
  if (stepKey === 'preliminary_check') return 2;
  if (stepKey === 'flow_analysis') return 3;
  if (stepKey === 'plagiarism_scan') return 4;
  if (stepKey === 'evidence_gathering') return 5;
  if (stepKey === 'scoring') return 6;
  if (stepKey === 'narrative_synthesis') return 7;
  if (stepKey === 'self_check') return 8;
  if (stepKey === 'completed') return 9;
  return 0;
}

function formatMarkdownTable(mdText) {
  if (!mdText) return '';
  const lines = mdText.split('\n').filter(l => l.trim());
  if (lines.length === 0) return mdText;

  let html = '<table class="w-full text-left border-collapse my-2">';
  let inHeader = true;

  lines.forEach(line => {
    if (line.includes('---')) return;
    const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.strip ? c.strip() : c.trim());
    if (cells.length === 0) return;

    if (inHeader) {
      html += '<thead class="bg-surface-container border-b border-surface-container-high"><tr>';
      cells.forEach(c => { html += `<th class="p-2.5 font-bold text-xs text-primary">${c}</th>`; });
      html += '</tr></thead><tbody>';
      inHeader = false;
    } else {
      html += '<tr class="border-b border-surface-container-low hover:bg-surface-container-lowest">';
      cells.forEach(c => { html += `<td class="p-2.5 text-xs text-on-surface-variant">${c}</td>`; });
      html += '</tr>';
    }
  });

  html += '</tbody></table>';
  return html;
}

export default function StructureMappingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [prelimCheck, setPrelimCheck] = useState(null);
  const [flowTable, setFlowTable] = useState('');
  const [plagiarismData, setPlagiarismData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [prelimRes, flowRes, plagRes] = await Promise.all([
        authFetch(`/api/submissions/${id}/preliminary-check`),
        authFetch(`/api/submissions/${id}/flow-analysis`),
        authFetch(`/api/submissions/${id}/plagiarism`)
      ]);

      if (prelimRes.ok) setPrelimCheck(await prelimRes.json());
      if (flowRes.ok) {
        const fData = await flowRes.json();
        setFlowTable(fData.flow_analysis_table || '');
      }
      if (plagRes.ok) setPlagiarismData(await plagRes.json());
    } catch (err) {
      console.error("Error loading structure mapping data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-poll while assessment pipeline is actively running
    const interval = setInterval(() => {
      if (!prelimCheck || (prelimCheck.status !== 'completed' && prelimCheck.status !== 'reviewed' && prelimCheck.ready_for_evaluation !== false)) {
        loadData();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [id, prelimCheck?.status, prelimCheck?.ready_for_evaluation]);

  const isFailed = prelimCheck && prelimCheck.ready_for_evaluation === false;
  const isPassed = prelimCheck && (prelimCheck.status === 'completed' || prelimCheck.status === 'reviewed') && prelimCheck.ready_for_evaluation === true;
  const isAssessing = loading || !prelimCheck || (!isFailed && !isPassed);

  const currentStepIdx = getStepIndex(prelimCheck?.pipeline_step);

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col">
      <NavigationHeader />

      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              <span>Step 2 of 4</span>
              <span>•</span>
              <span>Structure & Alignment Check</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-primary">Structure Mapping & Alignment</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Cross-chapter objective alignment, preliminary readiness check, and plagiarism verification.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => navigate('/thesis/upload')}
                className="px-3.5 py-1.5 border border-outline-variant text-on-surface-variant text-xs font-semibold rounded-lg hover:bg-surface-container transition-colors whitespace-nowrap"
              >
                Back to Upload
              </button>
              <button
                onClick={() => navigate(`/thesis/submission/${id}/scoring`)}
                disabled={isAssessing || isFailed}
                className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isAssessing && <span className="material-symbols-outlined text-base animate-spin">sync</span>}
                <span>{isAssessing ? 'Evaluation in Progress...' : 'Proceed to Scoring'}</span>
                {!isAssessing && <span className="material-symbols-outlined text-base">arrow_forward</span>}
              </button>
            </div>
            {isAssessing && (
              <span className="text-[11px] text-on-surface-variant italic mt-1">
                Unlocks automatically when evaluation completes
              </span>
            )}
            {isFailed && (
              <span className="text-[11px] text-red-600 font-semibold mt-1">
                Evaluation halted — Preliminary gate check failed
              </span>
            )}
          </div>
        </div>

        {/* Live 5-Step Pipeline Progress Banner */}
        {isAssessing && (
          <div className="p-6 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-blue-600 animate-spin text-xl">sync</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-primary">Multi-Agent Pipeline Active</h3>
                  <p className="text-xs text-on-surface-variant">Executing real-time multi-agent evaluation across 5 stages</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                  {prelimCheck?.pipeline_progress || 20}% Complete
                </span>
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500 ease-out"
                style={{ width: `${prelimCheck?.pipeline_progress || 20}%` }}
              />
            </div>

            {/* 5-Step Live Stepper Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {PIPELINE_STEPS.map((st, idx) => {
                const stepNum = idx + 1;
                const isFinished = currentStepIdx > idx;
                const isActive = currentStepIdx === idx;

                return (
                  <div
                    key={st.key}
                    className={`p-3 rounded-xl border transition-all ${
                      isFinished
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : isActive
                        ? 'bg-blue-50 border-blue-300 text-blue-950 ring-2 ring-blue-400/30'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        isFinished ? 'text-emerald-700' : isActive ? 'text-blue-700' : 'text-slate-400'
                      }`}>
                        Step {stepNum}
                      </span>
                      {isFinished ? (
                        <span className="material-symbols-outlined text-sm text-emerald-600 font-bold">check_circle</span>
                      ) : isActive ? (
                        <span className="material-symbols-outlined text-sm text-blue-600 animate-spin">sync</span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                      )}
                    </div>
                    <p className={`text-xs font-bold ${isFinished ? 'text-emerald-900' : isActive ? 'text-blue-900' : 'text-slate-500'}`}>
                      {st.label}
                    </p>
                    <p className="text-[10px] mt-0.5 opacity-80 leading-tight">
                      {st.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isFailed && (
          <div className="p-5 rounded-xl bg-error-container border border-red-300 text-on-error-container flex items-start gap-4 shadow-sm">
            <span className="material-symbols-outlined text-2xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
            <div>
              <h3 className="font-bold text-base">Preliminary Gate Check: FAILED (Evaluation Halted)</h3>
              <p className="text-sm mt-1 leading-relaxed">
                {prelimCheck.notes || 'Thesis document is missing fundamental required sections (e.g. Methodology, Literature Review) or Research Objectives.'}
              </p>
            </div>
          </div>
        )}

        {isPassed && (
          <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-4 shadow-sm">
            <span className="material-symbols-outlined text-2xl mt-0.5 text-emerald-700" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified
            </span>
            <div>
              <h3 className="font-bold text-base text-emerald-900">Preliminary Gate Check: PASSED</h3>
              <p className="text-sm mt-1 leading-relaxed text-emerald-800">
                {prelimCheck.notes || 'All required core sections and research objectives are present in the thesis document.'}
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Top Summary Cards Grid (Sequential Step 1 -> Step 2 -> Step 3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Step 1/5 Readiness Status */}
          <div className="bg-white p-6 rounded-xl border border-surface-container-highest shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Readiness Status</span>
              <span className="material-symbols-outlined text-primary text-xl">fact_check</span>
            </div>
            <p className={`text-2xl font-bold ${isPassed ? 'text-emerald-700' : isFailed ? 'text-red-700' : 'text-primary'}`}>
              {isPassed ? 'Ready ✓' : isFailed ? 'Incomplete' : currentStepIdx === 0 ? 'Step 1/5: Verifying...' : 'Step 1/5: Verified ✓'}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">Core section & RQ presence verified</p>
          </div>

          {/* Card 2: Step 2/5 Scope Alignment */}
          <div className="bg-white p-6 rounded-xl border border-surface-container-highest shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Scope Alignment</span>
              <span className="material-symbols-outlined text-primary text-xl">account_tree</span>
            </div>
            <p className={`text-2xl font-bold ${isPassed ? 'text-emerald-700' : isFailed ? 'text-red-700' : 'text-primary'}`}>
              {isPassed ? 'Aligned ✓' : isFailed ? 'Halted' : currentStepIdx === 1 ? 'Step 2/5: Mapping...' : currentStepIdx > 1 ? 'Step 2/5: Mapped ✓' : 'Step 2/5: Pending'}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">Objectives mapped to empirical results</p>
          </div>

          {/* Card 3: Step 3/5 Plagiarism Scan */}
          <div className="bg-white p-6 rounded-xl border border-surface-container-highest shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Plagiarism Scan</span>
              <span className="material-symbols-outlined text-primary text-xl">find_in_page</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {plagiarismData?.overall_plagiarism_score !== null && plagiarismData?.overall_plagiarism_score !== undefined
                ? `${plagiarismData.overall_plagiarism_score}%`
                : isFailed ? 'Halted' : currentStepIdx === 2 ? 'Step 3/5: Scanning...' : currentStepIdx > 2 ? 'Scanned ✓' : 'Step 3/5: Pending'}
            </p>
            <p className="text-xs text-on-surface-variant mt-1" title={plagiarismData?.provider_description || ''}>
              Internal similarity index — not a commercial plagiarism check
            </p>
          </div>
        </div>

        {/* Mechanical compliance findings against the KNUST HDR Guide */}
        {Array.isArray(prelimCheck?.findings) && prelimCheck.findings.length > 0 && (
          <div className="bg-white rounded-xl border border-surface-container-highest p-6 shadow-sm space-y-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">rule</span>
                <span>Guide Compliance Checks</span>
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Mechanical checks against the KNUST Guide for Preparation and Evaluation of Higher Degree
                Research Thesis (June 2016). These are measured, not inferred.
                {prelimCheck.structure_option && (
                  <> Structure detected: <span className="font-semibold">
                    {prelimCheck.structure_option === 'manuscript'
                      ? 'Option 2 — manuscript-based'
                      : 'Option 1 — monograph'}
                  </span>.</>
                )}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-container-high text-xs uppercase tracking-wider text-on-surface-variant">
                    <th className="p-2.5 font-bold">Check</th>
                    <th className="p-2.5 font-bold">Result</th>
                    <th className="p-2.5 font-bold">Detail</th>
                    <th className="p-2.5 font-bold">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {prelimCheck.findings.map((f, i) => (
                    <tr key={i} className="border-b border-surface-container last:border-0">
                      <td className="p-2.5 font-semibold text-primary whitespace-nowrap">{f.check}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          f.status === 'pass' ? 'bg-emerald-100 text-emerald-800'
                            : f.status === 'fail' ? 'bg-red-100 text-red-800'
                            : f.status === 'warn' ? 'bg-amber-100 text-amber-800'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}>
                          {f.status === 'not_applicable' ? 'N/A' : f.status.toUpperCase()}
                        </span>
                        {f.blocking && f.status === 'fail' && (
                          <span className="block text-[10px] text-red-700 font-semibold mt-0.5">Blocks assessment</span>
                        )}
                      </td>
                      <td className="p-2.5 text-on-surface-variant">{f.detail}</td>
                      <td className="p-2.5 text-[11px] text-on-surface-variant italic">{f.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Logical Alignment Matrix Table */}
        <div className="bg-white rounded-xl border border-surface-container-highest p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">grid_view</span>
              <span>Logical Alignment Matrix</span>
            </h2>
            <span className="text-xs text-on-surface-variant bg-surface-container px-3 py-1 rounded-full font-medium">
              Step 1.5 Content Extraction
            </span>
          </div>

          {loading || (isAssessing && !flowTable) ? (
            <div className="p-8 text-center text-on-surface-variant text-sm flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-2xl animate-spin text-primary">sync</span>
              <span>Extracting logical flow matrix from thesis chapters...</span>
            </div>
          ) : isFailed ? (
            <div className="p-6 bg-red-50 text-red-900 rounded-lg text-xs border border-red-200">
              Evaluation halted at Step 0.5 Preliminary Readiness Gate. Logical alignment matrix generation skipped due to missing core thesis sections.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="prose prose-sm max-w-none text-on-surface font-mono text-xs bg-surface-container-lowest p-4 rounded-lg border border-surface-container">
                {flowTable ? (
                  <div dangerouslySetInnerHTML={{ __html: formatMarkdownTable(flowTable) }} />
                ) : (
                  <p>No alignment table generated yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Plagiarism Section Breakdown */}
        {plagiarismData && plagiarismData.section_checks && plagiarismData.section_checks.length > 0 && (
          <div className="bg-white rounded-xl border border-surface-container-highest p-6 shadow-sm space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">shield</span>
              <span>Plagiarism & Originality Breakdown</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plagiarismData.section_checks.map((chk, idx) => (
                <div key={idx} className="p-4 bg-surface-container-low rounded-lg border border-surface-container flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-primary capitalize">{chk.section_name.replace('_', ' ')}</p>
                    <p className="text-xs text-on-surface-variant">Provider: {chk.provider}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-bold ${
                      chk.similarity_percentage > 20 ? 'text-red-600' : 'text-emerald-700'
                    }`}>
                      {chk.similarity_percentage}%
                    </span>
                    <p className="text-[11px] text-on-surface-variant">similarity</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
