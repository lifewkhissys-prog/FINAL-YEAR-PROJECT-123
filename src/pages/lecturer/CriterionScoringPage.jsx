import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import NavigationHeader from '../../components/NavigationHeader';

const CHAPTERS = [
  { key: 'introduction', label: 'Introduction', icon: 'info' },
  { key: 'literature_review', label: 'Literature Review', icon: 'menu_book' },
  { key: 'methodology', label: 'Methodology', icon: 'psychology' },
  { key: 'data_analysis', label: 'Data Analysis', icon: 'analytics' },
  { key: 'results', label: 'Results & Findings', icon: 'assessment' },
  { key: 'discussion', label: 'Discussion', icon: 'forum' },
  { key: 'conclusion', label: 'Conclusions', icon: 'task_alt' },
  { key: 'references', label: 'References', icon: 'format_quote' }
];

export default function CriterionScoringPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialChapter = queryParams.get('chapter') || 'introduction';
  const targetSubCritId = queryParams.get('target');

  const [activeChapter, setActiveChapter] = useState(initialChapter);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overrideScores, setOverrideScores] = useState({});

  // Sync active chapter from query parameter if it changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chap = params.get('chapter');
    if (chap && chap !== activeChapter) {
      setActiveChapter(chap);
    }
  }, [location.search]);

  // Scroll to target sub-criterion if specified
  useEffect(() => {
    if (!loading && targetSubCritId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`sub-crit-${targetSubCritId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight card visual feedback
          el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, targetSubCritId]);

  useEffect(() => {
    async function loadChapterResults() {
      setLoading(true);
      try {
        const res = await fetch(`/api/submissions/${id}/results/by-chapter/${activeChapter}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          // Initialize overrides
          const overrides = {};
          data.forEach(item => {
            overrides[item.sub_criterion_id] = item.supervisor_override_score !== null && item.supervisor_override_score !== undefined
              ? item.supervisor_override_score
              : item.ai_score;
          });
          setOverrideScores(overrides);
        }
      } catch (err) {
        console.error("Error loading chapter results:", err);
      } finally {
        setLoading(false);
      }
    }
    loadChapterResults();
  }, [id, activeChapter]);

  const handleScoreChange = (subCritId, val) => {
    setOverrideScores(prev => ({
      ...prev,
      [subCritId]: parseFloat(val)
    }));
  };

  const handleSaveOverride = async (subCritId) => {
    try {
      const val = overrideScores[subCritId];
      await fetch(`/api/submissions/${id}/results/${subCritId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisor_override_score: val,
          supervisor_notes: 'Supervisor adjusted score based on evidence review.'
        })
      });
      // Refresh
      const res = await fetch(`/api/submissions/${id}/results/by-chapter/${activeChapter}`);
      if (res.ok) setResults(await res.json());
    } catch (err) {
      console.error("Error saving score override:", err);
    }
  };

  const chapterSubtotal = results.reduce((acc, r) => {
    const scoreVal = overrideScores[r.sub_criterion_id] !== undefined ? overrideScores[r.sub_criterion_id] : r.ai_score;
    return acc + (scoreVal || 0);
  }, 0);

  const chapterMaxTotal = results.reduce((acc, r) => acc + (r.max_marks || 0), 0);

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col">
      <NavigationHeader />

      {/* Main Dual-Pane Evaluation Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        
        {/* Left SideNav: 8 Thesis Chapters */}
        <aside className="w-full md:w-64 bg-white border border-surface-container-highest rounded-xl p-4 shrink-0 shadow-sm">
          <div className="px-3 mb-4">
            <h2 className="font-serif text-lg font-bold text-primary">Thesis Chapters</h2>
            <p className="text-xs text-on-surface-variant">Select chapter to score mapped rubric criteria</p>
          </div>

          <nav className="space-y-1">
            {CHAPTERS.map(ch => {
              const isActive = activeChapter === ch.key;
              return (
                <button
                  key={ch.key}
                  onClick={() => setActiveChapter(ch.key)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0" }}>
                    {ch.icon}
                  </span>
                  <span>{ch.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Main Content Pane */}
        <main className="flex-1 bg-white border border-surface-container-highest rounded-xl p-6 shadow-sm overflow-y-auto space-y-6">
          
          {/* Header & Subtotal metrics */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                Scoring Chapter: <span className="capitalize">{activeChapter.replace('_', ' ')}</span>
              </div>
              <h1 className="font-serif text-2xl font-bold text-primary">Sub-Criterion Evaluation Workspace</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-surface-container-low px-4 py-2 rounded-lg border border-surface-container text-right">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Section Subtotal</span>
                <span className="text-lg font-bold text-primary">
                  {chapterSubtotal.toFixed(1)} / {chapterMaxTotal.toFixed(1)}
                </span>
              </div>

              <button
                onClick={() => navigate(`/thesis/submission/${id}/verification`)}
                className="px-5 py-2.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors flex items-center gap-2 shadow-sm"
              >
                <span>Verification Check</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-on-surface-variant text-sm">
              Loading sub-criteria mapped to {activeChapter}...
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant text-sm">
              No sub-criteria mapped directly to this chapter. All overall presentation criteria apply across chapters.
            </div>
          ) : (
            <div className="space-y-6">
              {results.map((item, idx) => {
                const currentScore = overrideScores[item.sub_criterion_id] !== undefined
                  ? overrideScores[item.sub_criterion_id]
                  : item.ai_score;

                return (
                  <div key={idx} id={`sub-crit-${item.sub_criterion_id}`} className="p-6 bg-surface-container-lowest rounded-xl border border-surface-container-highest shadow-sm space-y-4 transition-all duration-300">
                    
                    {/* Top sub-criterion title & badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container pb-3">
                      <div>
                        <span className="text-xs font-bold text-primary uppercase tracking-wider block">{item.criterion_name}</span>
                        <h3 className="font-serif text-lg font-bold text-primary">{item.sub_criterion_name}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.score_consistency_flag && (
                          <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            <span>Double-Scored Disagreement</span>
                          </span>
                        )}

                        <span className="px-3 py-1 bg-surface-container text-primary font-bold text-xs rounded-full">
                          AI Suggests: {item.ai_score} / {item.max_marks}
                        </span>
                      </div>
                    </div>

                    {/* Low / Mid / High Rubric Anchors */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-surface-container-low p-3 rounded-lg border border-surface-container">
                      <div>
                        <span className="font-bold text-red-700 block mb-1">Low (Near 0):</span>
                        <p className="text-on-surface-variant">{item.level_low_desc || 'Unjustified or missing evidence.'}</p>
                      </div>
                      <div>
                        <span className="font-bold text-amber-700 block mb-1">Mid (~50%):</span>
                        <p className="text-on-surface-variant">{item.level_mid_desc || 'Adequate compliance with minor gaps.'}</p>
                      </div>
                      <div>
                        <span className="font-bold text-emerald-700 block mb-1">High (Near Max):</span>
                        <p className="text-on-surface-variant">{item.level_high_desc || 'Exemplary compliance with rigorous evidence.'}</p>
                      </div>
                    </div>

                    {/* Cited Evidence Quote */}
                    <div className="p-4 bg-slate-50 border-l-4 border-primary rounded-r-lg space-y-1">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">Retrieved Thesis Evidence</span>
                      <p className="text-xs text-slate-800 italic leading-relaxed">"{item.cited_text}"</p>
                    </div>

                    {/* AI Justification */}
                    <div className="text-xs text-on-surface-variant leading-relaxed">
                      <span className="font-semibold text-primary">AI Justification: </span>
                      <span>{item.ai_justification}</span>
                    </div>

                    {/* Supervisor Override Slider */}
                    <div className="pt-3 border-t border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 flex items-center gap-4">
                        <label className="text-xs font-semibold text-primary shrink-0">Supervisor Override Score:</label>
                        <input
                          type="range"
                          min="0"
                          max={item.max_marks}
                          step="0.5"
                          value={currentScore}
                          onChange={(e) => handleScoreChange(item.sub_criterion_id, e.target.value)}
                          className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <span className="text-sm font-bold text-primary w-12 text-right">
                          {currentScore} / {item.max_marks}
                        </span>
                      </div>

                      <button
                        onClick={() => handleSaveOverride(item.sub_criterion_id)}
                        className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-container transition-colors shrink-0"
                      >
                        Save Override
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
