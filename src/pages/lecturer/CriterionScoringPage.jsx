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
            <div className="px-2 mb-3">
              <h2 className="font-serif text-sm font-bold text-primary">Chapters</h2>
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
          <div className="pt-3 border-t border-surface-container mt-3">
            <button
              onClick={() => navigate(`/thesis/submission/${id}/verification`)}
              className="w-full px-2.5 py-1.5 bg-surface-container text-primary text-[10px] font-bold rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-between"
            >
              <span>Verification Gate</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>
        </aside>

        {/* Center: Document Viewer */}
        <section
          ref={documentReaderRef}
          className="w-full lg:flex-1 bg-surface-container-lowest border border-surface-container-highest rounded-xl shadow-sm overflow-hidden flex flex-col"
          style={{ minHeight: 0 }}
        >
          {/* Reader Header */}
          <div className="flex items-center justify-between border-b border-surface-container-high px-4 py-2.5 shrink-0 bg-surface-container-lowest">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">
                {isFullManuscript ? 'auto_stories' : 'article'}
              </span>
              <h2 className="font-serif text-sm font-bold text-primary">
                {activeChapterLabel}
              </h2>
            </div>
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
            <div className="flex items-center justify-between border-b border-surface-container-high px-4 py-2.5 shrink-0 sticky top-0 bg-surface-container-lowest z-10">
              <div>
                <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Evaluation</div>
                <h2 className="font-serif text-sm font-bold text-primary">{activeChapterLabel}</h2>
              </div>
              <div className="bg-surface-container-low px-2.5 py-1 rounded-lg border border-surface-container text-right">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase block">Subtotal</span>
                <span className="text-sm font-bold text-primary">
                  {chapterSubtotal.toFixed(1)} / {chapterMaxTotal.toFixed(1)}
                </span>
                {unscoredCount > 0 && (
                  <span className="text-[9px] text-error block font-semibold">{unscoredCount} unscored</span>
                )}
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

                      {/* Evidence Quote Button */}
                      {item.evidence_quote && (
                        <div className="bg-surface-container-low p-2.5 rounded-lg border border-surface-container">
                          <div className="text-[8px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Evidence Quote</div>
                          <p className="text-[11px] font-serif italic text-on-surface line-clamp-3 leading-relaxed mb-2">
                            "{item.evidence_quote}"
                          </p>
                          <button
                            onClick={() => handleHighlightQuote(item.sub_criterion_id, item.evidence_quote)}
                            className="w-full py-1 px-2 bg-surface-container hover:bg-surface-container-high text-primary text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-colors border border-surface-container-highest"
                          >
                            <span className="material-symbols-outlined text-xs text-amber-500">search</span>
                            Highlight Evidence in Document
                          </button>
                        </div>
                      )}

                      {/* Score Override Slider & Controls */}
                      <div className="pt-1 space-y-2">
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
