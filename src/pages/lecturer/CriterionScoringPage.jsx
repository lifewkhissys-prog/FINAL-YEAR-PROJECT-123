import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import NavigationHeader from '../../components/NavigationHeader';
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
  const [chapterText, setChapterText] = useState('');
  const [figures, setFigures] = useState([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [loadingText, setLoadingText] = useState(true);
  const [overrideScores, setOverrideScores] = useState({});
  const [expandedContext, setExpandedContext] = useState({});
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

  // Load Chapter Results, Chapter Text, and Extracted Figure Metadata
  useEffect(() => {
    async function loadData() {
      setLoadingResults(true);
      setLoadingText(true);
      setActiveQuoteHighlight('');
      setHighlightedSubCritId(null);

      try {
        const [resultsRes, textRes, figuresRes] = await Promise.all([
          authFetch(`/api/submissions/${id}/results/by-chapter/${activeChapter}`),
          authFetch(`/api/submissions/${id}/chapter-text/${activeChapter}`),
          authFetch(`/api/submissions/${id}/figures`)
        ]);

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

        if (textRes.ok) {
          const tData = await safeJson(textRes);
          if (tData) setChapterText(tData.text || '');
        }

        if (figuresRes.ok) {
          const figData = await safeJson(figuresRes);
          if (figData && figData.figures) setFigures(figData.figures);
        }
      } catch (err) {
        console.error("Error loading chapter evaluation data:", err);
      } finally {
        setLoadingResults(false);
        setLoadingText(false);
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
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loadingResults, targetSubCritId]);

  const handleScoreChange = (subCritId, val) => {
    setOverrideScores(prev => ({
      ...prev,
      [subCritId]: parseFloat(val)
    }));
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

  // Grammarly-style Auto-scroll & Highlight Trigger
  const handleHighlightQuote = (subCritId, quote) => {
    if (!quote) return;
    const cleanQuote = quote.replace(/^["']|["']$/g, '').trim();
    setActiveQuoteHighlight(cleanQuote);
    setHighlightedSubCritId(subCritId);

    setTimeout(() => {
      const el = document.getElementById('grammarly-active-highlight');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const chapterSubtotal = results.reduce((acc, r) => {
    const scoreVal = overrideScores[r.sub_criterion_id] !== undefined ? overrideScores[r.sub_criterion_id] : r.ai_score;
    return acc + (scoreVal || 0);
  }, 0);

  const chapterMaxTotal = results.reduce((acc, r) => acc + (r.max_marks || 0), 0);
  const unscoredCount = results.length - results.filter(r => (overrideScores[r.sub_criterion_id] ?? r.ai_score) !== null).length;

  const textParagraphs = chapterText ? chapterText.split('\n\n').filter(p => p.strip ? p.strip() : p.trim()) : [];

  const baseURL = import.meta.env.VITE_API_BASE_URL || '';

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col">
      <NavigationHeader />

      {/* Main Dual-Pane Evaluation Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1600px] w-full mx-auto p-4 md:p-6 gap-6">
        
        {/* Left SideNav: 8 Thesis Chapters */}
        <aside className="w-full lg:w-56 bg-white border border-surface-container-highest rounded-xl p-4 shrink-0 shadow-sm flex flex-col justify-between">
          <div>
            <div className="px-3 mb-4">
              <h2 className="font-serif text-base font-bold text-primary">Thesis Chapters</h2>
              <p className="text-[11px] text-on-surface-variant">Select chapter to review evidence</p>
            </div>

            <nav className="space-y-1">
              {CHAPTERS.map(ch => {
                const isActive = activeChapter === ch.key;
                return (
                  <button
                    key={ch.key}
                    onClick={() => setActiveChapter(ch.key)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0" }}>
                      {ch.icon}
                    </span>
                    <span className="truncate">{ch.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-surface-container mt-4">
            <button
              onClick={() => navigate(`/thesis/submission/${id}/verification`)}
              className="w-full px-3 py-2 bg-surface-container text-primary text-xs font-bold rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-between"
            >
              <span>Verification Gate</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </aside>

        {/* Center Canvas: Grammarly-style Interactive Document Reader with Inline Figures */}
        <section className="w-full lg:w-1/2 bg-white border border-surface-container-highest rounded-xl p-6 shadow-sm overflow-y-auto flex flex-col" ref={documentReaderRef}>
          <div className="flex items-center justify-between border-b border-surface-container-high pb-3 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">article</span>
              <h2 className="font-serif text-lg font-bold text-primary capitalize">
                {activeChapter === 'all' ? 'Full Manuscript' : activeChapter.replace('_', ' ')} Reader Canvas
              </h2>
            </div>
            {activeQuoteHighlight && (
              <button
                onClick={() => { setActiveQuoteHighlight(''); setHighlightedSubCritId(null); }}
                className="text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-xs">close</span>
                <span>Clear Highlight</span>
              </button>
            )}
          </div>

          {loadingText ? (
            <div className="py-16 text-center text-on-surface-variant text-xs flex-grow flex items-center justify-center">
              <span>Loading manuscript text & figures...</span>
            </div>
          ) : textParagraphs.length === 0 ? (
            <div className="py-16 text-center text-on-surface-variant text-xs flex-grow flex items-center justify-center italic">
              <span>No extracted manuscript text available for this section.</span>
            </div>
          ) : (
            <div className="space-y-4 text-xs leading-relaxed text-slate-800 font-serif">
              {textParagraphs.map((para, pIdx) => {
                const cleanPara = para.trim();
                const isMatchingHighlight = activeQuoteHighlight && (
                  cleanPara.toLowerCase().includes(activeQuoteHighlight.toLowerCase()) ||
                  activeQuoteHighlight.toLowerCase().includes(cleanPara.slice(0, 50).toLowerCase())
                );

                // Check if paragraph mentions a figure (e.g. Figure 4.1 or Fig. 2)
                const figMatch = cleanPara.match(/(?:Figure|Fig\.)\s+(\d+(?:\.\d+)?)/i);
                let matchedFigIdx = -1;
                if (figMatch && figures.length > 0) {
                  const figNum = figMatch[1];
                  matchedFigIdx = figures.findIndex(f => f.caption && f.caption.includes(figNum));
                }

                if (isMatchingHighlight) {
                  return (
                    <div
                      key={pIdx}
                      id="grammarly-active-highlight"
                      className="p-4 bg-amber-50/90 border-l-4 border-amber-500 rounded-r-lg shadow-sm text-slate-900 font-sans transition-all duration-500 ring-2 ring-amber-300 ring-offset-1 my-3"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1.5">
                        <span className="material-symbols-outlined text-sm text-amber-700">stars</span>
                        <span>Grammarly-Style Cited Evidence Highlight (Sub-Criterion #{highlightedSubCritId})</span>
                      </div>
                      <p className="leading-relaxed font-serif text-xs font-medium text-slate-900">{para}</p>
                    </div>
                  );
                }

                return (
                  <React.Fragment key={pIdx}>
                    <p className="text-slate-800 leading-relaxed font-serif text-xs">
                      {para}
                    </p>

                    {/* Inline Figure Preview Card when figure reference is detected */}
                    {matchedFigIdx !== -1 && (
                      <div className="my-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 font-sans shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-primary">image</span>
                            <span>{figures[matchedFigIdx].caption || `Figure ${matchedFigIdx+1}`}</span>
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                            Embedded Manuscript Figure #{matchedFigIdx+1}
                          </span>
                        </div>

                        {/* Extracted Figure Image Stream */}
                        <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-center max-h-72 overflow-hidden">
                          <img
                            src={`${baseURL}/api/submissions/${id}/figures/${matchedFigIdx}/image`}
                            alt={figures[matchedFigIdx].caption || "Thesis Figure"}
                            className="max-h-64 object-contain rounded"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>

                        {/* Groq Vision AI Analysis Badge */}
                        {figures[matchedFigIdx].vision_analysis && (
                          <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px]">
                            <span className="font-bold text-amber-900 block mb-0.5 text-[10px] uppercase tracking-wider flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs text-amber-700">visibility</span>
                              <span>Groq Vision AI Figure Analysis:</span>
                            </span>
                            <p className="text-amber-950 font-sans text-[11px] leading-relaxed">
                              {figures[matchedFigIdx].vision_analysis}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Figure Gallery at bottom of document if figures exist and weren't inline matched */}
              {figures.length > 0 && (
                <div className="pt-6 border-t border-slate-200 my-6 space-y-4 font-sans">
                  <h3 className="font-serif text-sm font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">collections</span>
                    <span>Extracted Document Figures & Groq Vision Analyses ({figures.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {figures.map((fig, fIdx) => (
                      <div key={fIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-primary">
                          <span>{fig.caption || `Figure ${fIdx+1}`}</span>
                          <span className="text-[9px] bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-mono">Fig #{fIdx+1}</span>
                        </div>
                        <div className="bg-white p-2 rounded border flex items-center justify-center max-h-60 overflow-hidden">
                          <img
                            src={`${baseURL}/api/submissions/${id}/figures/${fIdx}/image`}
                            alt={fig.caption || "Extracted Figure"}
                            className="max-h-52 object-contain rounded"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                        {fig.vision_analysis && (
                          <p className="text-[11px] bg-amber-50 p-2 rounded text-amber-950 border border-amber-200 leading-snug">
                            <strong className="font-bold text-amber-900 block text-[10px] uppercase">Vision AI Extraction:</strong>
                            {fig.vision_analysis}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Pane: Scored Criteria Cards & Controls */}
        <main className="w-full lg:w-1/2 bg-white border border-surface-container-highest rounded-xl p-6 shadow-sm overflow-y-auto space-y-6 flex flex-col">
          
          {/* Header & Subtotal metrics */}
          <div className="flex items-center justify-between border-b border-surface-container-high pb-4 shrink-0">
            <div>
              <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-0.5">
                Evaluation Panel
              </div>
              <h2 className="font-serif text-xl font-bold text-primary">Sub-Criteria Scoring Cards</h2>
            </div>

            <div className="bg-surface-container-low px-3.5 py-1.5 rounded-lg border border-surface-container text-right">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Section Subtotal</span>
              <span className="text-base font-bold text-primary">
                {chapterSubtotal.toFixed(1)} / {chapterMaxTotal.toFixed(1)}
              </span>
              {unscoredCount > 0 && (
                <span className="text-[9px] text-red-700 block font-semibold">
                  {unscoredCount} unscored
                </span>
              )}
            </div>
          </div>

          {loadingResults ? (
            <div className="py-12 text-center text-on-surface-variant text-xs">
              Loading sub-criteria mapped to {activeChapter}...
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant text-xs italic">
              No sub-criteria mapped directly to this chapter. General presentation criteria apply across chapters.
            </div>
          ) : (
            <div className="space-y-6">
              {results.map((item, idx) => {
                const currentScore = overrideScores[item.sub_criterion_id] !== undefined
                  ? overrideScores[item.sub_criterion_id]
                  : item.ai_score;

                const isHighlighted = highlightedSubCritId === item.sub_criterion_id;

                return (
                  <div
                    key={idx}
                    id={`sub-crit-${item.sub_criterion_id}`}
                    className={`p-5 rounded-xl border transition-all duration-300 space-y-4 ${
                      isHighlighted
                        ? 'bg-amber-50/40 border-amber-400 ring-2 ring-amber-300 ring-offset-1 shadow-md'
                        : 'bg-surface-container-lowest border-surface-container-highest shadow-sm'
                    }`}
                  >
                    
                    {/* Top sub-criterion title & badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">{item.criterion_name}</span>
                        <h3 className="font-serif text-base font-bold text-primary">{item.sub_criterion_name}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.score_consistency_flag && (
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-semibold rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">warning</span>
                            <span>Runs disagreed</span>
                          </span>
                        )}

                        {item.ai_score === null || item.ai_score === undefined ? (
                          <span
                            className="px-2.5 py-0.5 bg-red-100 text-red-800 border border-red-300 font-bold text-[10px] rounded-full flex items-center gap-1"
                            title={item.error_detail || 'Not scored'}
                          >
                            <span className="material-symbols-outlined text-xs">error</span>
                            <span>Not scored</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-surface-container text-primary font-bold text-[11px] rounded-full">
                            AI Score: {item.ai_score} / {item.max_marks}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Low / Mid / High Rubric Anchors */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] bg-surface-container-low p-2.5 rounded-lg border border-surface-container">
                      <div>
                        <span className="font-bold text-red-700 block mb-0.5">Low:</span>
                        <p className="text-on-surface-variant text-[10px]">{item.level_low_desc || 'Unjustified or missing evidence.'}</p>
                      </div>
                      <div>
                        <span className="font-bold text-amber-700 block mb-0.5">Mid:</span>
                        <p className="text-on-surface-variant text-[10px]">{item.level_mid_desc || 'Adequate compliance.'}</p>
                      </div>
                      <div>
                        <span className="font-bold text-emerald-700 block mb-0.5">High:</span>
                        <p className="text-on-surface-variant text-[10px]">{item.level_high_desc || 'Exemplary evidence.'}</p>
                      </div>
                    </div>

                    {/* Cited Evidence Quote & Grammarly Auto-Highlight Button */}
                    <div className="p-3.5 bg-slate-50 border-l-4 border-primary rounded-r-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-primary">pin_drop</span>
                          <span>Grounded Excerpt</span>
                        </span>
                        
                        {item.cited_text && (
                          <button
                            type="button"
                            onClick={() => handleHighlightQuote(item.sub_criterion_id, item.cited_text)}
                            className="text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded flex items-center gap-1 transition-colors border border-amber-300 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-xs">find_in_page</span>
                            <span>Highlight in Manuscript</span>
                          </button>
                        )}
                      </div>

                      <div className={`text-[11px] text-slate-900 leading-relaxed font-sans whitespace-pre-wrap p-2 bg-white rounded border border-slate-200 shadow-2xs ${
                        expandedContext[item.sub_criterion_id] ? 'max-h-96 overflow-y-auto' : 'max-h-24 overflow-y-auto'
                      }`}>
                        "{item.cited_text || 'No explicit verbatim quote tagged for this criterion.'}"
                      </div>
                    </div>

                    {/* AI Justification */}
                    <div className="text-[11px] text-on-surface-variant leading-relaxed p-2.5 bg-surface-container-low rounded-lg border border-surface-container">
                      <span className="font-bold text-primary block mb-0.5 text-[10px] uppercase tracking-wider">AI Justification:</span>
                      <span className="text-slate-800 font-medium">{item.ai_justification}</span>
                    </div>

                    {/* Supervisor Override Slider */}
                    <div className="pt-2.5 border-t border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 flex items-center gap-3">
                        <label className="text-[11px] font-bold text-primary shrink-0">Override Score:</label>
                        <input
                          type="range"
                          min="0"
                          max={item.max_marks}
                          step="0.5"
                          value={currentScore !== null && currentScore !== undefined ? currentScore : 0}
                          onChange={(e) => handleScoreChange(item.sub_criterion_id, e.target.value)}
                          className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <span className="text-xs font-bold text-primary w-12 text-right">
                          {currentScore !== null && currentScore !== undefined ? currentScore : 0} / {item.max_marks}
                        </span>
                      </div>

                      <button
                        onClick={() => handleSaveOverride(item.sub_criterion_id)}
                        className="px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded hover:bg-primary-container transition-colors shrink-0 shadow-2xs"
                      >
                        Save Score
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
