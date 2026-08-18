import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import NavigationHeader from '../../components/NavigationHeader';
import DocumentViewer from '../../components/DocumentViewer';
import { authFetch, safeJson } from '../../api/axiosInstance';

const CHAPTERS = [
  { key: 'all', label: 'Full Manuscript', icon: 'auto_stories' },
  { key: 'introduction', label: '1. Introduction', icon: 'info' },
  { key: 'literature_review', label: '2. Literature Review', icon: 'menu_book' },
  { key: 'methodology', label: '3. Methodology', icon: 'psychology' },
  { key: 'data_analysis', label: '4. Data Analysis', icon: 'analytics' },
  { key: 'results', label: '5. Results & Findings', icon: 'assessment' },
  { key: 'discussion', label: '6. Discussion', icon: 'forum' },
  { key: 'conclusion', label: '7. Conclusions', icon: 'task_alt' },
  { key: 'references', label: '8. References', icon: 'format_quote' }
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
  const [loadingResults, setLoadingResults] = useState(true);
  const [overrideScores, setOverrideScores] = useState({});
  const [activeQuoteHighlight, setActiveQuoteHighlight] = useState('');
  const [highlightedSubCritId, setHighlightedSubCritId] = useState(null);

  const documentReaderRef = useRef(null);

  // Sync active chapter from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chap = params.get('chapter');
    if (chap && chap !== activeChapter) {
      setActiveChapter(chap);
    }
  }, [location.search]);

  // Load Chapter Results
  useEffect(() => {
    async function loadData() {
      setLoadingResults(true);
      setActiveQuoteHighlight('');
      setHighlightedSubCritId(null);

      try {
        const resultsRes = await authFetch(`/api/submissions/${id}/results/by-chapter/${activeChapter}`);
        if (resultsRes.ok) {
          const data = await safeJson(resultsRes);
          if (data) {
            setResults(data);
            const overrides = {};
            data.forEach(item => {
              const v = item.supervisor_override_score !== null && item.supervisor_override_score !== undefined
                ? item.supervisor_override_score
                : item.ai_score;
              if (v !== null && v !== undefined) {
                overrides[item.sub_criterion_id] = v;
              }
            });
            setOverrideScores(overrides);
          }
        }
      } catch (err) {
        console.error("Error loading chapter evaluation data:", err);
      } finally {
        setLoadingResults(false);
      }
    }
    loadData();
  }, [id, activeChapter]);

  // Scroll to target sub-criterion if specified in query
  useEffect(() => {
    if (!loadingResults && targetSubCritId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`sub-crit-${targetSubCritId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 3000);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loadingResults, targetSubCritId]);

  const handleScoreChange = (subCritId, val) => {
    setOverrideScores(prev => ({ ...prev, [subCritId]: parseFloat(val) }));
  };

  const handleSaveOverride = async (subCritId) => {
    try {
      const val = overrideScores[subCritId];
      await authFetch(`/api/submissions/${id}/results/${subCritId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisor_override_score: val,
          supervisor_notes: 'Supervisor adjusted score based on evidence review.'
        })
      });
      const res = await authFetch(`/api/submissions/${id}/results/by-chapter/${activeChapter}`);
      if (res.ok) {
        const data = await safeJson(res);
        if (data) setResults(data);
      }
    } catch (err) {
      console.error("Error saving score override:", err);
    }
  };

  // Highlight quote in Document View
  const handleHighlightQuote = (subCritId, quote) => {
    if (!quote) return;
    const cleanQuote = quote.replace(/^["']|["']$/g, '').trim();
    setActiveQuoteHighlight(cleanQuote);
    setHighlightedSubCritId(subCritId);
  };

  const chapterSubtotal = results.reduce((acc, r) => {
    const scoreVal = overrideScores[r.sub_criterion_id] !== undefined ? overrideScores[r.sub_criterion_id] : r.ai_score;
    return acc + (scoreVal || 0);
  }, 0);
  const chapterMaxTotal = results.reduce((acc, r) => acc + (r.max_marks || 0), 0);
  const unscoredCount = results.length - results.filter(r => (overrideScores[r.sub_criterion_id] ?? r.ai_score) !== null).length;

  const isFullManuscript = activeChapter === 'all';
  const activeChapterLabel = CHAPTERS.find(c => c.key === activeChapter)?.label || activeChapter;

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col">
      <NavigationHeader />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1600px] w-full mx-auto p-4 md:p-5 gap-4" style={{ height: 'calc(100vh - 64px)' }}>
        
        {/* Left Sidebar: Chapter Navigation */}
        <aside className="w-full lg:w-48 bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 shrink-0 shadow-sm flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Prominent Verification Gate Button at TOP of Sidebar */}
            <div className="pb-3 border-b border-surface-container mb-3">
              <button
                onClick={() => navigate(`/thesis/submission/${id}/verification`)}
                className="w-full px-3 py-2 bg-primary hover:opacity-90 text-on-primary text-xs font-bold rounded-lg transition-all shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>Verification Gate</span>
                </div>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </div>

            <div className="px-2 mb-2">
              <h2 className="font-serif text-xs font-bold text-on-surface-variant uppercase tracking-wider">Chapters</h2>
            </div>
            <nav className="space-y-0.5">
              {CHAPTERS.map(ch => {
                const isActive = activeChapter === ch.key;
                return (
                  <button
                    key={ch.key}
                    onClick={() => setActiveChapter(ch.key)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                      isActive
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                    } ${ch.key === 'all' ? 'border-b border-surface-container mb-1 pb-2' : ''}`}
                  >
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0" }}>{ch.icon}</span>
                    <span className="truncate">{ch.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Center: Document Viewer */}
        <section
          ref={documentReaderRef}
          className="w-full lg:flex-1 bg-surface-container-lowest border border-surface-container-highest rounded-xl shadow-sm overflow-hidden flex flex-col"
          style={{ minHeight: 0 }}
        >
          {/* Reader Header */}
          <div className="flex items-center justify-between border-b border-surface-container-high px-4 py-2 shrink-0 bg-surface-container-lowest">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">
                {isFullManuscript ? 'auto_stories' : 'article'}
              </span>
              <h2 className="font-serif text-sm font-bold text-primary">
                {activeChapterLabel}
              </h2>
            </div>

            <button
              onClick={() => navigate(`/thesis/submission/${id}/verification`)}
              className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high text-primary text-[10px] font-bold rounded-md flex items-center gap-1 transition-colors border border-surface-container-highest"
            >
              <span>Verification Gate</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>

          {/* Reader Content: Dedicated Document Viewer */}
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            <DocumentViewer
              submissionId={id}
              className="h-full"
              activeQuoteHighlight={activeQuoteHighlight}
              highlightedSubCritId={highlightedSubCritId}
              onClearHighlight={() => { setActiveQuoteHighlight(''); setHighlightedSubCritId(null); }}
            />
          </div>
        </section>

        {/* Right Pane: Evaluation Scoring Panel */}
        {!isFullManuscript && (
          <aside className="w-full lg:w-[400px] bg-surface-container-lowest border border-surface-container-highest rounded-xl shadow-sm overflow-y-auto flex flex-col shrink-0" style={{ minHeight: 0 }}>
            
            {/* Eval Header */}
            <div className="flex items-center justify-between border-b border-surface-container-high px-4 py-2 shrink-0 sticky top-0 bg-surface-container-lowest z-10">
              <div>
                <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Evaluation</div>
                <h2 className="font-serif text-sm font-bold text-primary">{activeChapterLabel}</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-surface-container-low px-2 py-0.5 rounded-lg border border-surface-container text-right">
                  <span className="text-[8px] font-bold text-on-surface-variant uppercase block">Subtotal</span>
                  <span className="text-xs font-bold text-primary">
                    {chapterSubtotal.toFixed(1)} / {chapterMaxTotal.toFixed(1)}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/thesis/submission/${id}/verification`)}
                  className="px-2 py-1 bg-primary text-on-primary text-[10px] font-bold rounded-lg hover:opacity-90 transition-opacity shadow-xs flex items-center gap-0.5"
                >
                  <span>Verification</span>
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Eval Body */}
            <div className="px-3 py-3 space-y-3">
              {loadingResults ? (
                <div className="py-12 text-center text-on-surface-variant text-xs flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Loading criteria...
                </div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant text-xs italic">
                  No sub-criteria mapped to this chapter.
                </div>
              ) : (
                results.map((item, idx) => {
                  const currentScore = overrideScores[item.sub_criterion_id] !== undefined
                    ? overrideScores[item.sub_criterion_id]
                    : item.ai_score;
                  const isCardHighlighted = highlightedSubCritId === item.sub_criterion_id;

                  return (
                    <div
                      key={idx}
                      id={`sub-crit-${item.sub_criterion_id}`}
                      className={`p-3.5 rounded-xl border transition-all duration-300 space-y-2.5 ${
                        isCardHighlighted
                          ? 'border-secondary bg-surface-container-low shadow-md'
                          : 'border-surface-container-highest bg-surface-container-lowest shadow-sm'
                      }`}
                    >
                      {/* Title */}
                      <div className="border-b border-surface-container pb-2">
                        <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">{item.criterion_name}</span>
                        <h3 className="font-serif text-[13px] font-bold text-primary leading-tight">{item.sub_criterion_name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          {item.score_consistency_flag && (
                            <span className="px-1.5 py-0.5 bg-warning-muted text-warning text-[8px] font-semibold rounded-full flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[9px]">warning</span>Disagreed
                            </span>
                          )}
                          {item.ai_score != null ? (
                            <span className="px-1.5 py-0.5 bg-surface-container text-primary font-bold text-[9px] rounded-full">
                              AI: {item.ai_score}/{item.max_marks}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-danger-muted text-error font-bold text-[8px] rounded-full flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[9px]">error</span>Not scored
                            </span>
                          )}
                        </div>
                      </div>

                      {/* AI Evaluation Breakdown / Critique */}
                      {item.ai_justification && (
                        <div className="bg-surface-container-low p-2.5 rounded-lg border border-surface-container space-y-1">
                          <div className="text-[8px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px]">auto_awesome</span>
                            Evaluation Breakdown & Critique
                          </div>
                          <p className="text-[11px] text-on-surface leading-relaxed whitespace-pre-line">
                            {item.ai_justification}
                          </p>
                        </div>
                      )}

                      {/* Evidence Citation Quote & Highlight Button */}
                      {(item.cited_text || item.evidence_quote) && (
                        <div className="bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200/80 dark:border-amber-800/50 space-y-1.5">
                          <div className="text-[8px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px] text-amber-600">format_quote</span>
                            Evidence Citation
                          </div>
                          <p className="text-[11px] font-serif italic text-on-surface line-clamp-4 leading-relaxed">
                            "{item.cited_text || item.evidence_quote}"
                          </p>
                          <button
                            onClick={() => handleHighlightQuote(item.sub_criterion_id, item.cited_text || item.evidence_quote)}
                            className="w-full py-1 px-2 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 text-amber-900 dark:text-amber-200 text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-colors border border-amber-300/80 dark:border-amber-700/80"
                          >
                            <span className="material-symbols-outlined text-xs text-amber-600">search</span>
                            Highlight Evidence in Document
                          </button>
                        </div>
                      )}

                      {/* Rubric Band Expectations (Level High/Mid/Low) */}
                      {(item.level_high_desc || item.level_mid_desc || item.level_low_desc) && (
                        <details className="bg-surface-container-low rounded-lg border border-surface-container text-[10px] group">
                          <summary className="px-2.5 py-1.5 font-bold text-on-surface-variant cursor-pointer hover:text-primary flex items-center justify-between">
                            <span>Rubric Scoring Guide</span>
                            <span className="material-symbols-outlined text-xs group-open:rotate-180 transition-transform">expand_more</span>
                          </summary>
                          <div className="px-2.5 pb-2.5 pt-1 space-y-1.5 border-t border-surface-container">
                            {item.level_high_desc && (
                              <div>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">High Level: </span>
                                <span className="text-on-surface-variant">{item.level_high_desc}</span>
                              </div>
                            )}
                            {item.level_mid_desc && (
                              <div>
                                <span className="font-bold text-amber-700 dark:text-amber-400">Mid Level: </span>
                                <span className="text-on-surface-variant">{item.level_mid_desc}</span>
                              </div>
                            )}
                            {item.level_low_desc && (
                              <div>
                                <span className="font-bold text-rose-700 dark:text-rose-400">Low Level: </span>
                                <span className="text-on-surface-variant">{item.level_low_desc}</span>
                              </div>
                            )}
                          </div>
                        </details>
                      )}

                      {/* Score Override Slider & Controls */}
                      <div className="pt-1 space-y-2 border-t border-surface-container">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-on-surface-variant">Adjust Marks:</label>
                          <span className="text-xs font-bold text-primary">
                            {currentScore !== null ? currentScore : 0} / {item.max_marks}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={item.max_marks}
                          step="0.5"
                          value={currentScore !== null ? currentScore : 0}
                          onChange={(e) => handleScoreChange(item.sub_criterion_id, e.target.value)}
                          className="w-full accent-primary cursor-pointer"
                        />
                        <button
                          onClick={() => handleSaveOverride(item.sub_criterion_id)}
                          className="w-full py-1.5 bg-primary text-on-primary font-bold text-[11px] rounded-lg hover:opacity-90 transition-opacity shadow-xs flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">save</span>
                          Save Score Adjustment
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
