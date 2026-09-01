import React, { useEffect, useState, useRef } from 'react';
import { renderAsync } from 'docx-preview';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { authFetch } from '../api/axiosInstance';

if (pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

// 4-Tier Fuzzy DOM text & figure image block locator for evidence quotes
function findMatchingDomElement(container, quote) {
  if (!container || !quote) return null;

  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const normQuote = norm(quote);
  if (!normQuote || normQuote.length < 4) return null;

  // Gather structural paragraph block containers & figures inside rendered docx and pdf
  const blocks = Array.from(container.querySelectorAll('p, td, li, figure, section.docx > div, .pdf-text-block, .pdf-text-line'));
  if (blocks.length === 0) return null;

  // Tier 1: Full text substring match
  for (const block of blocks) {
    const txt = norm(block.textContent);
    if (txt.includes(normQuote)) return block;
  }

  // Tier 2: Head substring match (first 35 chars)
  const headKey = normQuote.slice(0, 35);
  if (headKey.length >= 8) {
    for (const block of blocks) {
      if (norm(block.textContent).includes(headKey)) return block;
    }
  }

  // Tier 3: Middle substring match (35 chars from middle of quote)
  if (normQuote.length > 45) {
    const midStart = Math.floor((normQuote.length - 35) / 2);
    const midKey = normQuote.slice(midStart, midStart + 35);
    for (const block of blocks) {
      if (norm(block.textContent).includes(midKey)) return block;
    }
  }

  // Tier 4: Multi-word phrase anchor match (extract 4 consecutive key words)
  const words = normQuote.split(' ').filter(w => w.length >= 4);
  if (words.length >= 3) {
    const phraseStart = words.slice(0, 4).join(' ');
    for (const block of blocks) {
      if (norm(block.textContent).includes(phraseStart)) return block;
    }
    const phraseEnd = words.slice(-4).join(' ');
    for (const block of blocks) {
      if (norm(block.textContent).includes(phraseEnd)) return block;
    }
  }

  return null;
}

// Locate image / figure element associated with a text block
function findAssociatedImageElement(block) {
  if (!block) return null;
  // 1. Direct child img
  const directImg = block.querySelector('img, canvas');
  if (directImg) return directImg;

  // 2. Parent container img
  if (block.parentElement) {
    const parentImg = block.parentElement.querySelector('img, canvas');
    if (parentImg) return parentImg;
  }

  // 3. Next or previous sibling img
  const nextImg = block.nextElementSibling?.querySelector('img, canvas') || (['IMG', 'CANVAS'].includes(block.nextElementSibling?.tagName) ? block.nextElementSibling : null);
  if (nextImg) return nextImg;

  const prevImg = block.previousElementSibling?.querySelector('img, canvas') || (['IMG', 'CANVAS'].includes(block.previousElementSibling?.tagName) ? block.previousElementSibling : null);
  if (prevImg) return prevImg;

  return null;
}

export default function DocumentViewer({
  submissionId,
  className = '',
  activeQuoteHighlight = '',
  highlightedSubCritId = null,
  allHighlights = [],
  onSelectSubCriterion = null,
  onClearHighlight = () => {}
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [docType, setDocType] = useState('unknown'); // 'pdf' | 'docx'
  const [hoveredResult, setHoveredResult] = useState(null);
  const documentContainerRef = useRef(null);

  const baseURL = import.meta.env.VITE_API_BASE_URL || '';
  const token = localStorage.getItem('devlab_token') || localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  const directDownloadUrl = `${baseURL}/api/submissions/${submissionId}/document?token=${encodeURIComponent(token)}`;

  useEffect(() => {
    let active = true;

    async function loadDocument() {
      setLoading(true);
      setError(null);

      try {
        let res = await authFetch(`/api/submissions/${submissionId}/document`);
        if (!res.ok) {
          const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
          const fallbackRes = await fetch(`${baseURL}/api/submissions/${submissionId}/document${tokenParam}`);
          if (fallbackRes.ok) res = fallbackRes;
        }

        if (!res.ok) {
          let msg = `Server returned HTTP ${res.status}`;
          try {
            const errData = await res.json();
            if (errData?.detail) msg = errData.detail;
          } catch (e) {}
          throw new Error(msg);
        }

        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        const contentDisposition = (res.headers.get('content-disposition') || '').toLowerCase();

        const blob = await res.blob();
        if (!active) return;

        const isPdf = contentType.includes('pdf') || contentDisposition.includes('.pdf');
        const isDocx = contentType.includes('word') || contentType.includes('officedocument') || contentDisposition.includes('.docx');

        const arrayBuffer = await blob.arrayBuffer();
        if (!active) return;

        if (isPdf) {
          setDocType('pdf');
          setLoading(false);

          setTimeout(async () => {
            if (!documentContainerRef.current || !active) return;
            documentContainerRef.current.innerHTML = '';

            try {
              const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
              const pdf = await loadingTask.promise;

              for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.5 });

                const pageDiv = document.createElement('div');
                pageDiv.className = 'pdf-page-wrapper relative bg-white text-zinc-900 shadow-xl mb-6 mx-auto rounded p-6 border border-slate-200';
                pageDiv.style.width = '100%';
                pageDiv.style.maxWidth = '900px';
                pageDiv.setAttribute('data-page-number', pageNum);

                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvas.className = 'w-full h-auto block rounded shadow-inner mb-4';
                const canvasContext = canvas.getContext('2d');
                await page.render({ canvasContext, viewport }).promise;
                pageDiv.appendChild(canvas);

                const textContent = await page.getTextContent();
                const textLayerDiv = document.createElement('div');
                textLayerDiv.className = 'pdf-text-layer mt-4 space-y-2 pt-3 border-t border-slate-200';

                let currentLine = [];
                const lines = [];

                for (const item of textContent.items) {
                  const str = (item.str || '').trim();
                  if (!str) continue;
                  currentLine.push(str);

                  if (/[.!?]$/.test(str) || currentLine.join(' ').length > 200) {
                    lines.push(currentLine.join(' '));
                    currentLine = [];
                  }
                }
                if (currentLine.length > 0) {
                  lines.push(currentLine.join(' '));
                }

                lines.forEach(lineText => {
                  const p = document.createElement('p');
                  p.className = 'pdf-text-block text-xs font-serif leading-relaxed text-slate-800 p-2 rounded transition-all';
                  p.textContent = lineText;
                  textLayerDiv.appendChild(p);
                });

                pageDiv.appendChild(textLayerDiv);
                documentContainerRef.current.appendChild(pageDiv);
              }
            } catch (pdfErr) {
              console.error("PDF render error:", pdfErr);
              if (active) setError("Could not parse PDF text structure. You can download the file directly using the button above.");
            }
          }, 50);

        } else if (isDocx || blob.type.includes('word') || blob.type.includes('officedocument')) {
          setDocType('docx');
          setLoading(false);

          setTimeout(async () => {
            if (documentContainerRef.current && active) {
              documentContainerRef.current.innerHTML = '';
              try {
                await renderAsync(arrayBuffer, documentContainerRef.current, null, {
                  className: 'docx-preview-root',
                  inWrapper: true,
                  ignoreWidth: false,
                  ignoreHeight: false,
                  breakPages: true,
                  experimental: true,
                });
              } catch (err) {
                console.error("docx-preview error:", err);
                if (active) setError("Could not parse Word document structure. You can download the file directly using the button above.");
              }
            }
          }, 50);

        } else {
          setDocType('pdf');
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading document stream:", err);
        if (active) {
          setError(err.message || "Failed to fetch manuscript file from server.");
          setLoading(false);
        }
      }
    }

    if (submissionId) {
      loadDocument();
    }

    return () => {
      active = false;
    };
  }, [submissionId]);

  // Effect: Highlight single active quote & associated figure images inside rendered document (.pdf / .docx)
  useEffect(() => {
    if (!documentContainerRef.current || loading) return;

    // Reset existing active highlights & image outlines
    const prevHighlights = documentContainerRef.current.querySelectorAll('.docx-active-highlight, .pdf-active-highlight');
    prevHighlights.forEach(el => {
      el.classList.remove('docx-active-highlight', 'pdf-active-highlight');
      el.style.backgroundColor = '';
      el.style.borderLeft = '';
      el.style.padding = '';
      el.style.borderRadius = '';
      el.style.boxShadow = '';
      el.style.outline = '';
    });

    const prevImgOutlines = documentContainerRef.current.querySelectorAll('img.docx-img-highlight, canvas.pdf-img-highlight');
    prevImgOutlines.forEach(img => {
      img.classList.remove('docx-img-highlight', 'pdf-img-highlight');
      img.style.outline = '';
      img.style.boxShadow = '';
      img.style.borderRadius = '';
    });

    if (!activeQuoteHighlight) return;

    const matchedEl = findMatchingDomElement(documentContainerRef.current, activeQuoteHighlight);

    if (matchedEl) {
      matchedEl.classList.add('docx-active-highlight', 'pdf-active-highlight');
      matchedEl.style.backgroundColor = 'rgba(37, 99, 235, 0.2)';
      matchedEl.style.borderLeft = '4px solid #2563eb';
      matchedEl.style.padding = '8px 12px';
      matchedEl.style.borderRadius = '6px';
      matchedEl.style.boxShadow = '0 0 16px rgba(37, 99, 235, 0.35)';
      matchedEl.style.transition = 'all 0.3s ease';

      // Highlight associated figure image/canvas if present
      const associatedImg = findAssociatedImageElement(matchedEl);
      if (associatedImg) {
        associatedImg.classList.add('docx-img-highlight', 'pdf-img-highlight');
        associatedImg.style.outline = '4px solid #2563eb';
        associatedImg.style.borderRadius = '8px';
        associatedImg.style.boxShadow = '0 0 25px rgba(37, 99, 235, 0.45)';
        associatedImg.style.transition = 'all 0.3s ease';
      }

      setTimeout(() => {
        (associatedImg || matchedEl).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [activeQuoteHighlight, docType, loading]);

  // Effect: Highlight ALL cited quotes & figures in Full Manuscript mode + Attach Hover Tooltip & Click Listeners
  useEffect(() => {
    if (!documentContainerRef.current || loading || !allHighlights || allHighlights.length === 0) return;

    // Reset previous all-quote highlights & image highlights
    const prevAll = documentContainerRef.current.querySelectorAll('.docx-all-quote-highlight, .pdf-all-quote-highlight');
    prevAll.forEach(el => {
      el.classList.remove('docx-all-quote-highlight', 'pdf-all-quote-highlight');
      el.style.backgroundColor = '';
      el.style.borderBottom = '';
      el.style.cursor = '';
      el.onmouseenter = null;
      el.onmouseleave = null;
      el.onclick = null;
    });

    const prevImgs = documentContainerRef.current.querySelectorAll('img.docx-all-img-highlight, canvas.pdf-all-img-highlight');
    prevImgs.forEach(img => {
      img.classList.remove('docx-all-img-highlight', 'pdf-all-img-highlight');
      img.style.outline = '';
      img.style.boxShadow = '';
      img.style.cursor = '';
      img.onmouseenter = null;
      img.onmouseleave = null;
      img.onclick = null;
    });

    allHighlights.forEach(item => {
      const quote = item.cited_text || item.evidence_quote;
      if (!quote) return;

      const matchedEl = findMatchingDomElement(documentContainerRef.current, quote);
      if (matchedEl) {
        matchedEl.classList.add('docx-all-quote-highlight', 'pdf-all-quote-highlight');
        matchedEl.style.backgroundColor = 'rgba(37, 99, 235, 0.12)';
        matchedEl.style.borderBottom = '2px dashed #2563eb';
        matchedEl.style.cursor = 'pointer';

        const setupHoverAndClick = (targetEl) => {
          targetEl.onmouseenter = () => {
            const rect = targetEl.getBoundingClientRect();
            setHoveredResult({
              item,
              x: rect.left + rect.width / 2,
              y: rect.top - 8
            });
          };
          targetEl.onmouseleave = () => {
            setHoveredResult(null);
          };
          targetEl.onclick = (e) => {
            e.stopPropagation();
            if (onSelectSubCriterion) {
              onSelectSubCriterion(item.sub_criterion_id);
            }
          };
        };

        setupHoverAndClick(matchedEl);

        // Also highlight associated figure diagram image if available
        const associatedImg = findAssociatedImageElement(matchedEl);
        if (associatedImg) {
          associatedImg.classList.add('docx-all-img-highlight', 'pdf-all-img-highlight');
          associatedImg.style.outline = '3px dashed #2563eb';
          associatedImg.style.borderRadius = '6px';
          associatedImg.style.boxShadow = '0 0 15px rgba(37, 99, 235, 0.25)';
          associatedImg.style.cursor = 'pointer';
          setupHoverAndClick(associatedImg);
        }
      }
    });
  }, [allHighlights, docType, loading, onSelectSubCriterion]);

  return (
    <div className={`flex flex-col h-full w-full bg-surface-container-lowest overflow-hidden ${className}`}>
      {/* Top Banner / Toolbar */}
      <div className="bg-surface-container px-4 py-2 border-b border-surface-container-high flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">
            {docType === 'pdf' ? 'picture_as_pdf' : docType === 'docx' ? 'description' : 'article'}
          </span>
          <span className="font-semibold text-on-surface">
            {docType === 'pdf' ? 'PDF Manuscript Viewer' : docType === 'docx' ? 'Word (.docx) Document Viewer' : 'Manuscript Document'}
          </span>
        </div>

        <a
          href={directDownloadUrl}
          target="_blank"
          rel="noreferrer"
          className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded flex items-center gap-1.5 transition-colors border border-primary/20 text-[11px]"
        >
          <span className="material-symbols-outlined text-xs">download</span>
          Download Original File
        </a>
      </div>

      {/* Quote Highlight Indicator Bar */}
      {activeQuoteHighlight && (
        <div className="bg-blue-50/90 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-800/60 px-4 py-2 flex items-center justify-between text-xs shrink-0 z-10">
          <div className="flex items-center gap-2 text-blue-950 dark:text-blue-200 font-medium truncate">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm shrink-0">format_quote</span>
            <span className="font-bold shrink-0">
              {highlightedSubCritId ? `Sub-Criterion #${highlightedSubCritId} Evidence:` : 'Cited Evidence:'}
            </span>
            <span className="truncate text-[11px]">"{activeQuoteHighlight}"</span>
          </div>
          <button
            onClick={onClearHighlight}
            className="text-[10px] font-bold text-blue-900 dark:text-blue-200 bg-blue-200/60 dark:bg-blue-800/60 hover:bg-blue-300 dark:hover:bg-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors shrink-0 ml-2"
          >
            <span className="material-symbols-outlined text-[11px]">close</span>
            Clear Highlight
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-auto bg-slate-100/80 dark:bg-zinc-900/50">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-container-lowest/80 backdrop-blur-sm z-20">
            <span className="material-symbols-outlined text-2xl text-primary animate-spin">progress_activity</span>
            <p className="text-xs text-on-surface-variant font-medium">Loading document stream...</p>
          </div>
        )}

        {error && (
          <div className="p-8 max-w-md mx-auto my-12 bg-surface-container-lowest border border-error/30 rounded-xl text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">error_outline</span>
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-sm">Unable to render inline preview</h3>
              <p className="text-xs text-on-surface-variant mt-1">{error}</p>
            </div>
            <a
              href={directDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-lg hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Download Manuscript File
            </a>
          </div>
        )}

        {!loading && !error && (
          <div className="p-4 md:p-8 flex justify-center min-h-full">
            <style>{`
              .docx-wrapper {
                background: transparent !important;
                padding: 0 !important;
              }
              .docx-wrapper > section.docx {
                background: white !important;
                color: #1a1a1a !important;
                box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.1), 0 2px 6px -1px rgba(0, 0, 0, 0.06) !important;
                margin-bottom: 2rem !important;
                border-radius: 4px !important;
                padding: 3rem !important;
              }
            `}</style>
            <div ref={documentContainerRef} className="w-full max-w-4xl" />
          </div>
        )}

        {/* Floating Hover Tooltip Popover for AI Critique Breakdown */}
        {hoveredResult && (
          <div
            className="fixed z-50 w-80 md:w-96 bg-slate-900 text-slate-100 p-4 rounded-xl shadow-2xl border border-slate-700 space-y-2 pointer-events-none transition-all transform -translate-x-1/2 -translate-y-full mb-2 animate-in fade-in zoom-in-95"
            style={{
              left: `${hoveredResult.x}px`,
              top: `${hoveredResult.y}px`
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 truncate">
                {hoveredResult.item.criterion_name}
              </span>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-bold text-[9px] rounded-full shrink-0">
                AI: {hoveredResult.item.ai_score}/{hoveredResult.item.max_marks}
              </span>
            </div>
            
            <h4 className="text-xs font-bold text-white leading-tight">
              {hoveredResult.item.sub_criterion_name}
            </h4>

            {hoveredResult.item.ai_justification && (
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-200 leading-relaxed max-h-36 overflow-y-auto space-y-1">
                <div className="text-[9px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                  AI Critique & Breakdown
                </div>
                <p className="whitespace-pre-line">{hoveredResult.item.ai_justification}</p>
              </div>
            )}

            <div className="text-[9px] text-slate-400 italic flex items-center justify-between pt-1 border-t border-slate-800">
              <span>Click highlight or figure to jump to evaluation card</span>
              <span className="material-symbols-outlined text-xs">touch_app</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
