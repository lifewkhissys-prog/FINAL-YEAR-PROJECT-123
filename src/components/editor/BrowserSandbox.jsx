import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Play } from 'lucide-react';
import { CodeEditor } from './CodeEditor';

export function BrowserSandbox({ initialCode = '' }) {
  const [code, setCode] = useState(initialCode || `<!-- Write your HTML/CSS/JS here -->\n<div class="demo">\n  <h1>Hello DevLab!</h1>\n</div>\n\n<style>\n  .demo {\n    font-family: sans-serif;\n    color: #4f8ef7;\n    text-align: center;\n    margin-top: 50px;\n  }\n</style>\n\n<script>\n  console.log("DevLab sandbox ready.");\n</script>`);
  const [srcDoc, setSrcDoc] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Auto-run on mount if there's initial code
  useEffect(() => {
    if (initialCode) setSrcDoc(initialCode);
  }, [initialCode]);

  const handleRun = () => {
    setSrcDoc(code);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className={`flex flex-col h-full ${isFullscreen ? 'bg-[var(--bg-primary)] p-4' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-[var(--text-primary)]">Browser Sandbox</h3>
        <div className="flex gap-2">
          <button onClick={handleRun} className="btn-success py-1.5 px-3 text-xs">
            <Play size={14} /> Run Code
          </button>
          <button onClick={toggleFullscreen} className="btn-icon">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex gap-4 h-[calc(100%-40px)]">
        {/* Editor Pane */}
        <div className="w-1/2 flex flex-col glass overflow-hidden">
          <div className="bg-dark-800 px-3 py-1.5 border-b border-default text-xs font-semibold text-[var(--text-secondary)]">
            source.html
          </div>
          <CodeEditor 
            value={code} 
            onChange={setCode} 
            language="html" 
            height="100%" 
            className="flex-1 rounded-none border-0"
          />
        </div>

        {/* Preview Pane */}
        <div className="w-1/2 flex flex-col glass overflow-hidden bg-white">
           <div className="bg-[var(--bg-surface)] px-3 py-1.5 border-b border-default text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
            </div>
            Output Preview
          </div>
          <iframe
            srcDoc={srcDoc}
            title="Browser Sandbox Output"
            sandbox="allow-scripts"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
