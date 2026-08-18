import React, { useEffect, useState, useRef, useMemo } from 'react';
import { renderAsync } from 'docx-preview';
import { authFetch } from '../api/axiosInstance';

export default function DocumentViewer({
  submissionId,
  className = '',
  activeQuoteHighlight = '',
  highlightedSubCritId = null,
  onClearHighlight = () => {}
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [docType, setDocType] = useState('unknown'); // 'pdf' | 'docx'
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const docxContainerRef = useRef(null);

  const baseURL = import.meta.env.VITE_API_BASE_URL || '';
  const token = localStorage.getItem('devlab_token') || localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  const directDownloadUrl = `${baseURL}/api/submissions/${submissionId}/document?token=${encodeURIComponent(token)}`;

  // PDF URL with search fragment if highlight is active
  const pdfUrlWithHighlight = useMemo(() => {
    if (!pdfBlobUrl) return null;
    if (!activeQuoteHighlight) return pdfBlobUrl;
    const searchPhrase = encodeURIComponent(activeQuoteHighlight.slice(0, 40).replace(/["']/g, ''));
    return `${pdfBlobUrl}#search=${searchPhrase}`;
  }, [pdfBlobUrl, activeQuoteHighlight]);

  useEffect(() => {
    let active = true;
    let createdUrl = null;

    async function loadDocument() {
      setLoading(true);
      setError(null);

      try {
        const res = await authFetch(`/api/submissions/${submissionId}/document`);
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }

        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        const contentDisposition = (res.headers.get('content-disposition') || '').toLowerCase();

        const blob = await res.blob();
        if (!active) return;

        const isPdf = contentType.includes('pdf') || contentDisposition.includes('.pdf');
        const isDocx = contentType.includes('word') || contentType.includes('officedocument') || contentDisposition.includes('.docx');

        if (isPdf) {
          setDocType('pdf');
          createdUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(createdUrl);
          setLoading(false);
        } else if (isDocx || blob.type.includes('word') || blob.type.includes('officedocument')) {
          setDocType('docx');
          const arrayBuffer = await blob.arrayBuffer();
          if (!active) return;

          setLoading(false);
          // Render docx after DOM updates
          setTimeout(async () => {
            if (docxContainerRef.current) {
              docxContainerRef.current.innerHTML = '';
              try {
                await renderAsync(arrayBuffer, docxContainerRef.current, null, {
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
          // Fallback: try as PDF
          setDocType('pdf');
          createdUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(createdUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading document stream:", err);
        if (active) {
          setError("Failed to fetch manuscript file from server.");
          setLoading(false);
        }
      }
    }

    if (submissionId) {
      loadDocument();
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [submissionId]);

  // Effect: Highlight quote inside rendered Word document (.docx)
  useEffect(() => {
    if (docType !== 'docx' || !docxContainerRef.current || loading) return;

    // Reset existing highlights
    const prevHighlights = docxContainerRef.current.querySelectorAll('.docx-active-highlight');
    prevHighlights.forEach(el => {
      el.classList.remove('docx-active-highlight');
      el.style.backgroundColor = '';
      el.style.borderLeft = '';
      el.style.padding = '';
      el.style.borderRadius = '';
      el.style.boxShadow = '';
    });

    if (!activeQuoteHighlight) return;

    const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const normQuote = norm(activeQuoteHighlight);
    const searchKey = normQuote.slice(0, 50);

    if (!searchKey || searchKey.length < 5) return;

    const elements = Array.from(docxContainerRef.current.querySelectorAll('p, span, td, div'));
    let matchedEl = null;

    for (const el of elements) {
      const txt = norm(el.textContent || '');
      if (txt.includes(searchKey)) {
        if (el.tagName === 'P' || el.tagName === 'TD' || el.children.length === 0) {
          matchedEl = el;
          break;
        }
      }
    }

    if (!matchedEl) {
      const shortKey = normQuote.slice(0, 25);
      for (const el of elements) {
        const txt = norm(el.textContent || '');
        if (txt.includes(shortKey)) {
          matchedEl = el;
          break;
        }
      }
    }

    if (matchedEl) {
      matchedEl.classList.add('docx-active-highlight');
      matchedEl.style.backgroundColor = 'rgba(245, 158, 11, 0.22)';
      matchedEl.style.borderLeft = '4px solid #f59e0b';
      matchedEl.style.padding = '8px 12px';
      matchedEl.style.borderRadius = '6px';
      matchedEl.style.boxShadow = '0 0 0 1px rgba(245, 158, 11, 0.3)';
      matchedEl.style.transition = 'all 0.3s ease';

      setTimeout(() => {
        matchedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [activeQuoteHighlight, docType, loading]);

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
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2 flex items-center justify-between text-xs shrink-0 z-10">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-medium truncate">
            <span className="material-symbols-outlined text-amber-600 text-sm shrink-0">format_quote</span>
            <span className="font-bold shrink-0">
              {highlightedSubCritId ? `Sub-Criterion #${highlightedSubCritId} Evidence:` : 'Cited Evidence:'}
            </span>
            <span className="italic truncate text-[11px]">"{activeQuoteHighlight}"</span>
          </div>
          <button
            onClick={onClearHighlight}
            className="text-[10px] font-bold text-amber-900 dark:text-amber-200 bg-amber-200/60 dark:bg-amber-800/60 hover:bg-amber-300 dark:hover:bg-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors shrink-0 ml-2"
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

        {!loading && !error && docType === 'pdf' && pdfUrlWithHighlight && (
          <object
            data={pdfUrlWithHighlight}
            type="application/pdf"
            className="w-full h-full min-h-[600px] border-0"
          >
            <iframe
              src={pdfUrlWithHighlight}
              title="Thesis Document PDF"
              className="w-full h-full min-h-[600px] border-0"
            />
          </object>
        )}

        {!loading && !error && docType === 'docx' && (
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
            <div ref={docxContainerRef} className="w-full max-w-4xl" />
          </div>
        )}
      </div>
    </div>
  );
}
