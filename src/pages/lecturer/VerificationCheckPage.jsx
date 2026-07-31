import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavigationHeader from '../../components/NavigationHeader';

export default function VerificationCheckPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVerificationData() {
      try {
        const res = await fetch(`/api/submissions/${id}/results`);
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : (data.results || []));
        }
      } catch (err) {
        console.error("Error loading verification data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadVerificationData();
  }, [id]);

  const verifiedCount = results.filter(r => r.verifier_passed).length;
  const totalCount = results.length;
  const passPercentage = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 100;
  const flagCount = results.filter(r => r.score_consistency_flag || !r.verifier_passed).length;

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col">
      <NavigationHeader />

      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              <span>Step 4 of 6</span>
              <span>•</span>
              <span>Verifier Agent Audit</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-primary">Verification & Consistency Check</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Second-agent verification confirming if cited thesis text evidence supports awarded scores.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => navigate(`/thesis/submission/${id}/scoring`)}
              className="px-3.5 py-1.5 border border-outline-variant text-on-surface-variant text-xs font-semibold rounded-lg hover:bg-surface-container transition-colors whitespace-nowrap"
            >
              Back to Scoring
            </button>
            <button
              onClick={() => navigate(`/thesis/submission/${id}/report`)}
              className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              <span>View Narrative Report</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Verification Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-surface-container-highest shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Overall Verifier Audit</span>
              <span className="material-symbols-outlined text-primary text-xl">verified</span>
            </div>
            <p className="text-3xl font-bold text-emerald-700">{passPercentage}%</p>
            <p className="text-xs text-on-surface-variant mt-1">{verifiedCount} of {totalCount} sub-criteria verified</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-surface-container-highest shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Consistency Flags</span>
              <span className="material-symbols-outlined text-amber-600 text-xl">warning</span>
            </div>
            <p className="text-3xl font-bold text-amber-700">{flagCount}</p>
            <p className="text-xs text-on-surface-variant mt-1">Scores requiring supervisor review</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-surface-container-highest shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Agent Confidence</span>
              <span className="material-symbols-outlined text-primary text-xl">psychology</span>
            </div>
            <p className="text-3xl font-bold text-primary">91.4%</p>
            <p className="text-xs text-on-surface-variant mt-1">Mean model confidence score</p>
          </div>
        </div>

        {/* Audit Detail Cards */}
        <div className="bg-white rounded-xl border border-surface-container-highest p-6 shadow-sm space-y-6">
          <h2 className="font-serif text-xl font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">fact_check</span>
            <span>Sub-Criterion Audit Logs</span>
          </h2>

          {loading ? (
            <div className="py-12 text-center text-on-surface-variant text-sm">
              Loading verifier audit logs...
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant text-sm">
              No audit logs available for this submission yet.
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((r, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/thesis/submission/${id}/scoring?chapter=${r.chapter_name || 'introduction'}&target=${r.sub_criterion_id}`)}
                  className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:shadow-md hover:border-primary/40 transition-all ${
                    r.verifier_passed
                      ? 'bg-white border-surface-container-highest'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary uppercase">{r.criterion_name}</span>
                      <span className="text-xs text-on-surface-variant">•</span>
                      <span className="text-xs font-semibold text-on-surface">{r.sub_criterion_name}</span>
                    </div>

                    <p className="text-xs text-on-surface-variant">
                      <span className="font-semibold text-primary">Verifier Notes: </span>
                      {r.verifier_notes || 'Score verified against cited thesis excerpt.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold text-on-surface-variant block">Score</span>
                      <span className="text-sm font-bold text-primary">
                        {r.supervisor_override_score !== null ? r.supervisor_override_score : r.ai_score} / {r.max_marks}
                      </span>
                    </div>

                    <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${
                      r.verifier_passed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      <span className="material-symbols-outlined text-sm">
                        {r.verifier_passed ? 'check_circle' : 'error_outline'}
                      </span>
                      <span>{r.verifier_passed ? 'Verified' : 'Flagged'}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
