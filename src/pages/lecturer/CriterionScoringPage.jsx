import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  const [chapterText, setChapterText] = useState('');
  const [loadingResults, setLoadingResults] = useState(true);
  const [loadingText, setLoadingText] = useState(true);
  const [overrideScores, setOverrideScores] = useState({});
  const [activeQuoteHighlight, setActiveQuoteHighlight] = useState('');
  const [highlightedSubCritId, setHighlightedSubCritId] = useState(null);
  // Toggle between 'text' (extracted formatted text with highlights) and 'document' (PDF/DOCX file viewer)
  const [viewMode, setViewMode] = useState('text');


  const documentReaderRef = useRef(null);
  const baseURL = import.meta.env.VITE_API_BASE_URL || '';

  // Build the PDF viewer URL using auth token
  const pdfViewerUrl = useMemo(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    return `${baseURL}/api/submissions/${id}/document?token=${encodeURIComponent(token)}`;
  }, [id, baseURL]);

  // Sync active chapter from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chap = params.get('chapter');
    if (chap && chap !== activeChapter) {
      setActiveChapter(chap);
    }
  }, [location.search]);

  // Load Chapter Results & Chapter Text
  useEffect(() => {
    async function loadData() {
      setLoadingResults(true);
      setLoadingText(true);
      setActiveQuoteHighlight('');
      setHighlightedSubCritId(null);

      try {
        const [resultsRes, textRes] = await Promise.all([
          authFetch(`/api/submissions/${id}/results/by-chapter/${activeChapter}`),
          authFetch(`/api/submissions/${id}/chapter-text/${activeChapter}`),
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

  // Fuzzy paragraph matching for highlight
  const findMatchingParagraphIdx = (paragraphs, quote) => {
    if (!quote || !paragraphs.length) return -1;
    const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const normQuote = norm(quote);
    const searchKey = normQuote.slice(0, 60);
    if (searchKey.length < 8) return -1;

    for (let i = 0; i < paragraphs.length; i++) {
      if (norm(paragraphs[i]).includes(searchKey)) return i;
    }
    const shortKey = normQuote.slice(0, 25);
    for (let i = 0; i < paragraphs.length; i++) {
      if (norm(paragraphs[i]).includes(shortKey)) return i;
    }
    return -1;
  };

  // Highlight & scroll to matching paragraph in the reader
  const handleHighlightQuote = (subCritId, quote) => {
    if (!quote) return;
    // Switch to text view so the highlight is visible
    setViewMode('text');
    const cleanQuote = quote.replace(/^["']|["']$/g, '').trim();
    setActiveQuoteHighlight(cleanQuote);
    setHighlightedSubCritId(subCritId);

    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById('grammarly-active-highlight');
        if (el && documentReaderRef.current) {
          const container = documentReaderRef.current;
          const elTop = el.offsetTop - container.offsetTop;
          container.scrollTo({ top: elTop - 80, behavior: 'smooth' });
        }
      }, 200);
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

  const highlightedParaIdx = useMemo(() => {
    return findMatchingParagraphIdx(textParagraphs, activeQuoteHighlight);
  }, [textParagraphs, activeQuoteHighlight]);

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
          {/* Reader Header with View Mode Toggle */}
          <div className="flex items-center justify-between border-b border-surface-container-high px-4 py-2.5 shrink-0 bg-surface-container-lowest">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">
                {isFullManuscript ? 'auto_stories' : 'article'}
              </span>
              <h2 className="font-serif text-sm font-bold text-primary">
                {activeChapterLabel}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {activeQuoteHighlight && viewMode === 'text' && (
                <button
                  onClick={() => { setActiveQuoteHighlight(''); setHighlightedSubCritId(null); }}
                  className="text-[9px] font-bold text-on-surface bg-surface-container hover:bg-surface-container-high px-2 py-1 rounded-full flex items-center gap-1 transition-colors border border-surface-container-highest"
                >
                  <span className="material-symbols-outlined text-[10px]">close</span>
                  Clear Highlight
                </button>
              )}
              {/* View mode toggle */}
              <div className="flex bg-surface-container rounded-lg p-0.5 border border-surface-container-highest">
                <button
                  onClick={() => setViewMode('document')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'document'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">picture_as_pdf</span>
                  Document
                </button>
                <button
                  onClick={() => setViewMode('text')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'text'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">text_snippet</span>
                  Text View
                </button>
              </div>
            </div>
          </div>

          {/* Reader Content */}
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            {viewMode === 'document' ? (
              <DocumentViewer submissionId={id} className="h-full" />
            ) : (

              /* Text View — extracted text with highlight support */
              <div className="px-6 py-5">
                {loadingText ? (
                  <div className="py-16 text-center text-on-surface-variant text-xs flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    Loading manuscript text...
                  </div>
                ) : textParagraphs.length === 0 ? (
                  <div className="py-16 text-center text-on-surface-variant text-xs italic">
                    No extracted text available for this section.
                  </div>
                ) : (
                  <div className="space-y-3 max-w-none">
                    {textParagraphs.map((para, pIdx) => {
                      const isHighlightedPara = pIdx === highlightedParaIdx;
                      const isHeading = para.length < 120 && (
                        /^(chapter|section|\d+\.)\s/i.test(para) || para === para.toUpperCase()
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
                              Cited Evidence — Sub-Criterion #{highlightedSubCritId}
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
                        <p key={pIdx} className="text-on-surface font-serif text-[13px] leading-relaxed text-justify">{para}</p>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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

                      {/* Rubric Anchors */}
                      <div className="grid grid-cols-3 gap-1.5 text-[9px] bg-surface-container-low p-1.5 rounded-lg border border-surface-container">
                        <div><span className="font-bold text-error block">Low:</span><p className="text-on-surface-variant">{item.level_low_desc || '—'}</p></div>
                        <div><span className="font-bold text-warning block">Mid:</span><p className="text-on-surface-variant">{item.level_mid_desc || '—'}</p></div>
                        <div><span className="font-bold text-success block">High:</span><p className="text-on-surface-variant">{item.level_high_desc || '—'}</p></div>
                      </div>

                      {/* Cited Evidence & Highlight Button */}
                      <div className="p-2.5 bg-surface-container-low rounded-lg space-y-1.5" style={{ borderLeft: '3px solid var(--accent, #2563EB)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                            <span className="material-symbols-outlined text-[9px]">format_quote</span>Evidence
                          </span>
                          {item.cited_text && (
                            <button
                              type="button"
                              onClick={() => handleHighlightQuote(item.sub_criterion_id, item.cited_text)}
                              className="text-[9px] font-bold text-primary bg-surface-container hover:bg-surface-container-high px-2 py-0.5 rounded flex items-center gap-1 transition-colors border border-surface-container-highest"
                            >
                              <span className="material-symbols-outlined text-[10px]">find_in_page</span>
                              Highlight in Manuscript
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-on-surface leading-relaxed font-sans whitespace-pre-wrap p-1.5 bg-surface-container-lowest rounded border border-surface-container max-h-16 overflow-y-auto">
                          "{item.cited_text || 'No verbatim quote tagged.'}"
                        </div>
                      </div>

                      {/* AI Justification */}
                      <div className="text-[9px] text-on-surface-variant leading-relaxed p-2 bg-surface-container-low rounded-lg border border-surface-container">
                        <span className="font-bold text-primary block mb-0.5 text-[8px] uppercase tracking-wider">Justification:</span>
                        <span className="text-on-surface">{item.ai_justification}</span>
                      </div>

                      {/* Score Override */}
                      <div className="pt-2 border-t border-surface-container flex items-center justify-between gap-2">
                        <div className="flex-1 flex items-center gap-2">
                          <label className="text-[9px] font-bold text-on-surface-variant shrink-0">Score:</label>
                          <input
                            type="range" min="0" max={item.max_marks} step="0.5"
                            value={currentScore != null ? currentScore : 0}
                            onChange={(e) => handleScoreChange(item.sub_criterion_id, e.target.value)}
                            className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <span className="text-[10px] font-bold text-primary w-12 text-right">
                            {currentScore != null ? currentScore : 0}/{item.max_marks}
                          </span>
                        </div>
                        <button
                          onClick={() => handleSaveOverride(item.sub_criterion_id)}
                          className="px-2.5 py-1 bg-primary text-on-primary text-[9px] font-bold rounded-lg hover:opacity-90 transition-opacity shrink-0"
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
