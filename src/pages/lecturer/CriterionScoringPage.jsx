import React, { useEffect, useState, useRef, useMemo } from 'react';
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

  // Load Chapter Results, Chapter Text, and Figures
  useEffect(() => {
    async function loadData() {
      setLoadingResults(true);
      setLoadingText(true);
      setActiveQuoteHighlight('');
      setHighlightedSubCritId(null);

      try {
        const fetches = [
          authFetch(`/api/submissions/${id}/results/by-chapter/${activeChapter}`),
          authFetch(`/api/submissions/${id}/chapter-text/${activeChapter}`),
        ];
        // Only fetch figures once
        if (figures.length === 0) {
          fetches.push(authFetch(`/api/submissions/${id}/figures`));
        }

        const responses = await Promise.all(fetches);
        const [resultsRes, textRes] = responses;
        const figuresRes = responses[2];

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

        if (figuresRes && figuresRes.ok) {
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

  // Fuzzy paragraph matching for highlight — compare normalized words
  const findMatchingParagraphIdx = (paragraphs, quote) => {
    if (!quote || !paragraphs.length) return -1;
    const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const normQuote = norm(quote);
    // Take first 60 chars of the normalized quote as a search key
    const searchKey = normQuote.slice(0, 60);
    if (searchKey.length < 10) return -1;

    for (let i = 0; i < paragraphs.length; i++) {
      const normPara = norm(paragraphs[i]);
      if (normPara.includes(searchKey)) return i;
    }
    // Try even shorter fragment (first 30 chars)
    const shortKey = normQuote.slice(0, 30);
    for (let i = 0; i < paragraphs.length; i++) {
      const normPara = norm(paragraphs[i]);
      if (normPara.includes(shortKey)) return i;
    }
    return -1;
  };

  // Highlight & scroll to matching paragraph in the reader
  const handleHighlightQuote = (subCritId, quote) => {
    if (!quote) return;
    const cleanQuote = quote.replace(/^["']|["']$/g, '').trim();
    setActiveQuoteHighlight(cleanQuote);
    setHighlightedSubCritId(subCritId);

    // Wait for React to re-render with the highlight, then scroll
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById('grammarly-active-highlight');
        if (el && documentReaderRef.current) {
          // Scroll the reader panel, not the whole page
          const container = documentReaderRef.current;
          const elTop = el.offsetTop - container.offsetTop;
          container.scrollTo({ top: elTop - 80, behavior: 'smooth' });
        }
      }, 100);
    });
  };

  const chapterSubtotal = results.reduce((acc, r) => {
    const scoreVal = overrideScores[r.sub_criterion_id] !== undefined ? overrideScores[r.sub_criterion_id] : r.ai_score;
    return acc + (scoreVal || 0);
  }, 0);

  const chapterMaxTotal = results.reduce((acc, r) => acc + (r.max_marks || 0), 0);
  const unscoredCount = results.length - results.filter(r => (overrideScores[r.sub_criterion_id] ?? r.ai_score) !== null).length;

  const textParagraphs = useMemo(() => {
    if (!chapterText) return [];
    return chapterText.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
  }, [chapterText]);

  // Pre-compute which paragraph index is highlighted
  const highlightedParaIdx = useMemo(() => {
    return findMatchingParagraphIdx(textParagraphs, activeQuoteHighlight);
  }, [textParagraphs, activeQuoteHighlight]);

  const baseURL = import.meta.env.VITE_API_BASE_URL || '';

  const isFullManuscript = activeChapter === 'all';
  const activeChapterLabel = CHAPTERS.find(c => c.key === activeChapter)?.label || activeChapter;

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col">
      <NavigationHeader />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1600px] w-full mx-auto p-4 md:p-6 gap-5" style={{ height: 'calc(100vh - 64px)' }}>
        
        {/* Left Sidebar: Chapter Navigation */}
        <aside className="w-full lg:w-52 bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 shrink-0 shadow-sm flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="px-2 mb-3">
              <h2 className="font-serif text-sm font-bold text-primary">Thesis Chapters</h2>
              <p className="text-[10px] text-on-surface-variant mt-0.5">Select section to review</p>
            </div>

            <nav className="space-y-0.5">
              {CHAPTERS.map(ch => {
                const isActive = activeChapter === ch.key;
                return (
                  <button
                    key={ch.key}
                    onClick={() => setActiveChapter(ch.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                      isActive
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                    } ${ch.key === 'all' ? 'border-b border-surface-container mb-1 pb-2.5' : ''}`}
                  >
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0" }}>
                      {ch.icon}
                    </span>
                    <span className="truncate">{ch.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-3 border-t border-surface-container mt-3">
            <button
              onClick={() => navigate(`/thesis/submission/${id}/verification`)}
              className="w-full px-3 py-2 bg-surface-container text-primary text-[11px] font-bold rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-between"
            >
              <span>Verification Gate</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </aside>

        {/* Center: Document Reader Canvas */}
        <section
          ref={documentReaderRef}
          className="w-full lg:flex-1 bg-surface-container-lowest border border-surface-container-highest rounded-xl shadow-sm overflow-y-auto flex flex-col"
          style={{ minHeight: 0 }}
        >
          {/* Reader Header */}
          <div className="flex items-center justify-between border-b border-surface-container-high px-5 py-3 shrink-0 bg-surface-container-lowest sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">
                {isFullManuscript ? 'auto_stories' : 'article'}
              </span>
              <h2 className="font-serif text-base font-bold text-primary">
                {activeChapterLabel}
              </h2>
              {textParagraphs.length > 0 && (
                <span className="text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                  {textParagraphs.length} paragraphs
                </span>
              )}
            </div>
            {activeQuoteHighlight && (
              <button
                onClick={() => { setActiveQuoteHighlight(''); setHighlightedSubCritId(null); }}
                className="text-[10px] font-bold text-on-surface bg-surface-container hover:bg-surface-container-high px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors border border-surface-container-highest"
              >
                <span className="material-symbols-outlined text-xs">close</span>
                <span>Clear Highlight</span>
              </button>
            )}
          </div>

          {/* Reader Body */}
          <div className="px-6 py-5 flex-1">
            {loadingText ? (
              <div className="py-16 text-center text-on-surface-variant text-xs flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                <span>Loading manuscript text...</span>
              </div>
            ) : textParagraphs.length === 0 ? (
              <div className="py-16 text-center text-on-surface-variant text-xs italic">
                No extracted manuscript text available for this section.
              </div>
            ) : (
              <div className="space-y-3 max-w-none">
                {textParagraphs.map((para, pIdx) => {
                  const isHighlightedPara = pIdx === highlightedParaIdx;

                  // Detect headings (lines that are short, uppercase-heavy, or start with "Chapter")
                  const isHeading = para.length < 100 && (
                    /^(chapter|section|\d+\.)\s/i.test(para) ||
                    para === para.toUpperCase()
                  );

                  if (isHighlightedPara) {
                    return (
                      <div
                        key={pIdx}
                        id="grammarly-active-highlight"
                        className="px-4 py-3 rounded-lg border-l-4 my-2 transition-all duration-300"
                        style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.12)',
                          borderLeftColor: '#f59e0b',
                          boxShadow: '0 0 0 1px rgba(245, 158, 11, 0.25), 0 2px 8px rgba(245, 158, 11, 0.1)'
                        }}
                      >
                        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#92400e' }}>
                          <span className="material-symbols-outlined text-xs">format_quote</span>
                          <span>Cited Evidence — Sub-Criterion #{highlightedSubCritId}</span>
                        </div>
                        <p className="text-on-surface font-serif text-[13px] leading-relaxed">{para}</p>
                      </div>
                    );
                  }

                  if (isHeading) {
                    return (
                      <h3 key={pIdx} className="font-serif text-sm font-bold text-primary pt-4 pb-1 border-b border-surface-container">
                        {para}
                      </h3>
                    );
                  }

                  return (
                    <p key={pIdx} className="text-on-surface font-serif text-[13px] leading-relaxed text-justify">
                      {para}
                    </p>
                  );
                })}

                {/* Figure Gallery */}
                {figures.length > 0 && (
                  <div className="pt-6 border-t border-surface-container mt-8 space-y-4">
                    <h3 className="font-serif text-sm font-bold text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">collections</span>
                      Extracted Figures ({figures.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {figures.map((fig, fIdx) => (
                        <div key={fIdx} className="p-3 bg-surface-container-low border border-surface-container-highest rounded-lg space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-primary">
                            <span>{fig.caption || `Figure ${fIdx+1}`}</span>
                            <span className="text-[9px] bg-surface-container px-2 py-0.5 rounded text-on-surface-variant font-mono">
                              Fig #{fIdx+1}
                            </span>
                          </div>
                          <div className="bg-surface-container-lowest p-2 rounded border border-surface-container flex items-center justify-center max-h-60 overflow-hidden">
                            <img
                              src={`${baseURL}/api/submissions/${id}/figures/${fIdx}/image`}
                              alt={fig.caption || "Extracted Figure"}
                              className="max-h-52 object-contain rounded"
                              onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                            />
                          </div>
                          {fig.vision_analysis && (
                            <p className="text-[10px] bg-surface-container-low p-2 rounded text-on-surface-variant border border-surface-container leading-snug">
                              <strong className="font-bold text-primary block text-[9px] uppercase mb-0.5">Vision AI:</strong>
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
          </div>
        </section>

        {/* Right Pane: Evaluation Scoring Panel — hidden in Full Manuscript read-only mode */}
        {!isFullManuscript && (
          <aside className="w-full lg:w-[420px] bg-surface-container-lowest border border-surface-container-highest rounded-xl shadow-sm overflow-y-auto flex flex-col shrink-0" style={{ minHeight: 0 }}>
            
            {/* Eval Header */}
            <div className="flex items-center justify-between border-b border-surface-container-high px-5 py-3 shrink-0 sticky top-0 bg-surface-container-lowest z-10">
              <div>
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Chapter Evaluation
                </div>
                <h2 className="font-serif text-base font-bold text-primary">{activeChapterLabel}</h2>
              </div>

              <div className="bg-surface-container-low px-3 py-1.5 rounded-lg border border-surface-container text-right">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block">Subtotal</span>
                <span className="text-sm font-bold text-primary">
                  {chapterSubtotal.toFixed(1)} / {chapterMaxTotal.toFixed(1)}
                </span>
                {unscoredCount > 0 && (
                  <span className="text-[9px] text-error block font-semibold">
                    {unscoredCount} unscored
                  </span>
                )}
              </div>
            </div>

            {/* Eval Body */}
            <div className="px-4 py-4 space-y-4">
              {loadingResults ? (
                <div className="py-12 text-center text-on-surface-variant text-xs flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Loading criteria for {activeChapterLabel}...
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
                      className={`p-4 rounded-xl border transition-all duration-300 space-y-3 ${
                        isCardHighlighted
                          ? 'border-secondary bg-surface-container-low shadow-md'
                          : 'border-surface-container-highest bg-surface-container-lowest shadow-sm'
                      }`}
                    >
                      {/* Title row */}
                      <div className="flex flex-col gap-1 border-b border-surface-container pb-2.5">
                        <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">{item.criterion_name}</span>
                        <h3 className="font-serif text-sm font-bold text-primary leading-tight">{item.sub_criterion_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {item.score_consistency_flag && (
                            <span className="px-2 py-0.5 bg-warning-muted text-warning border border-outline text-[9px] font-semibold rounded-full flex items-center gap-1">
                              <span className="material-symbols-outlined text-[10px]">warning</span>
                              Runs disagreed
                            </span>
                          )}
                          {item.ai_score === null || item.ai_score === undefined ? (
                            <span className="px-2 py-0.5 bg-danger-muted text-error border border-outline text-[9px] font-bold rounded-full flex items-center gap-1">
                              <span className="material-symbols-outlined text-[10px]">error</span>
                              Not scored
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-surface-container text-primary font-bold text-[10px] rounded-full">
                              AI: {item.ai_score} / {item.max_marks}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rubric Anchors */}
                      <div className="grid grid-cols-3 gap-2 text-[10px] bg-surface-container-low p-2 rounded-lg border border-surface-container">
                        <div>
                          <span className="font-bold text-error block mb-0.5">Low:</span>
                          <p className="text-on-surface-variant text-[9px]">{item.level_low_desc || '—'}</p>
                        </div>
                        <div>
                          <span className="font-bold text-warning block mb-0.5">Mid:</span>
                          <p className="text-on-surface-variant text-[9px]">{item.level_mid_desc || '—'}</p>
                        </div>
                        <div>
                          <span className="font-bold text-success block mb-0.5">High:</span>
                          <p className="text-on-surface-variant text-[9px]">{item.level_high_desc || '—'}</p>
                        </div>
                      </div>

                      {/* Cited Evidence & Highlight Button */}
                      <div className="p-3 bg-surface-container-low border-l-3 border-primary rounded-r-lg space-y-2" style={{ borderLeftWidth: '3px' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">format_quote</span>
                            Cited Evidence
                          </span>
                          
                          {item.cited_text && (
                            <button
                              type="button"
                              onClick={() => handleHighlightQuote(item.sub_criterion_id, item.cited_text)}
                              className="text-[9px] font-bold text-primary bg-surface-container hover:bg-surface-container-high px-2 py-1 rounded flex items-center gap-1 transition-colors border border-surface-container-highest"
                            >
                              <span className="material-symbols-outlined text-[10px]">find_in_page</span>
                              Find in Reader
                            </button>
                          )}
                        </div>

                        <div className="text-[10px] text-on-surface leading-relaxed font-sans whitespace-pre-wrap p-2 bg-surface-container-lowest rounded border border-surface-container max-h-20 overflow-y-auto">
                          "{item.cited_text || 'No verbatim quote tagged.'}"
                        </div>
                      </div>

                      {/* AI Justification */}
                      <div className="text-[10px] text-on-surface-variant leading-relaxed p-2 bg-surface-container-low rounded-lg border border-surface-container">
                        <span className="font-bold text-primary block mb-0.5 text-[9px] uppercase tracking-wider">Justification:</span>
                        <span className="text-on-surface">{item.ai_justification}</span>
                      </div>

                      {/* Score Override */}
                      <div className="pt-2 border-t border-surface-container flex items-center justify-between gap-3">
                        <div className="flex-1 flex items-center gap-2">
                          <label className="text-[10px] font-bold text-on-surface-variant shrink-0">Score:</label>
                          <input
                            type="range"
                            min="0"
                            max={item.max_marks}
                            step="0.5"
                            value={currentScore !== null && currentScore !== undefined ? currentScore : 0}
                            onChange={(e) => handleScoreChange(item.sub_criterion_id, e.target.value)}
                            className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <span className="text-[11px] font-bold text-primary w-14 text-right">
                            {currentScore !== null && currentScore !== undefined ? currentScore : 0}/{item.max_marks}
                          </span>
                        </div>

                        <button
                          onClick={() => handleSaveOverride(item.sub_criterion_id)}
                          className="px-3 py-1.5 bg-primary text-on-primary text-[10px] font-bold rounded-lg hover:opacity-90 transition-opacity shrink-0"
                        >
                          Save
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
