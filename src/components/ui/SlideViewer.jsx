import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Maximize2, Minimize2, Sparkles, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

export function SlideViewer({ isOpen, onClose, slide }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setCurrentPage(0);
  }, [slide]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, isFullscreen, slide]);

  if (!isOpen || !slide) return null;

  const pages = slide.pages || [];
  const hasPages = pages.length > 0;
  const currentSlideContent = hasPages ? pages[currentPage] : null;

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Helper to check if text contains code blocks or syntax and render them
  const renderSlideContent = (content) => {
    if (!content) return null;

    // Check if there are lines resembling code examples
    const lines = content.split('\n');
    const isCodeBlock = lines.some(line => 
      line.trim().startsWith('def ') || 
      line.trim().startsWith('import ') || 
      line.trim().startsWith('SELECT ') || 
      line.trim().startsWith('CREATE TABLE') ||
      line.trim().startsWith('if ') ||
      line.trim().includes('print(')
    );

    if (isCodeBlock) {
      return (
        <pre className="bg-dark-900 border border-default p-5 rounded-lg font-mono text-sm text-brand-blue overflow-x-auto leading-relaxed shadow-inner my-4">
          <code>{content}</code>
        </pre>
      );
    }

    // Otherwise render as readable paragraphs or list items
    return (
      <div className="space-y-4 text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
        {lines.map((line, idx) => {
          if (line.trim().startsWith('- ')) {
            return (
              <ul key={idx} className="list-disc pl-6 space-y-2">
                <li className="text-[var(--text-primary)]">{line.replace('- ', '')}</li>
              </ul>
            );
          }
          if (line.trim().startsWith('Example:')) {
            return <p key={idx} className="font-mono text-sm bg-white/5 p-3 border-l-2 border-brand-blue rounded-r text-[var(--text-primary)] my-3">{line}</p>;
          }
          return <p key={idx}>{line}</p>;
        })}
      </div>
    );
  };

  return createPortal(
    <AnimatePresence>
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`glass border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
            isFullscreen ? 'w-screen h-screen max-w-none max-h-none rounded-none border-none p-6' : 'w-full max-w-4xl h-[70vh]'
          }`}
        >
          {/* Header Row */}
          <div className="p-4 border-b border-default flex items-center justify-between bg-dark-950/40">
            <div className="flex items-center gap-2">
              <BookOpen className="text-brand-blue" size={18} />
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] line-clamp-1">{slide.title}</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider">
                  Slide {currentPage + 1} of {pages.length} • {slide.programmingLanguage || 'General'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="p-1.5 hover:bg-white/5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Presentation'}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {hasPages && (
            <div className="h-1 bg-white/5 w-full relative">
              <div 
                className="h-full bg-brand-blue transition-all duration-300"
                style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
              />
            </div>
          )}

          {/* Presentation Slide Body */}
          <div className="flex-1 p-6 md:p-10 flex flex-col justify-center overflow-y-auto bg-dark-950/20">
            {hasPages && currentSlideContent ? (
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 max-w-2xl mx-auto w-full"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] border-b border-default pb-3 tracking-tight font-serif flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-brand-blue rounded-full"></span>
                  {currentSlideContent.title}
                </h2>
                
                <div className="slide-page-body">
                  {renderSlideContent(currentSlideContent.content)}
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-12 text-[var(--text-muted)] space-y-2">
                <Sparkles className="mx-auto" size={32} />
                <p>No slide pages available in this deck.</p>
              </div>
            )}
          </div>

          {/* Footer Navigation Bar */}
          <div className="p-4 border-t border-default flex items-center justify-between bg-dark-950/40">
            <div className="text-xs text-[var(--text-muted)] font-mono">
              Use Left / Right arrow keys to navigate
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentPage === 0}
                className="btn-secondary p-1.5 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="text-xs font-mono px-3 py-1 rounded bg-white/5 border border-default text-[var(--text-primary)]">
                {currentPage + 1} / {pages.length}
              </span>

              <button
                onClick={handleNext}
                disabled={currentPage === pages.length - 1}
                className="btn-secondary p-1.5 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
