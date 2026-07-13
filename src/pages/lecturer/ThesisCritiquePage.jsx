import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Trash2, 
  Loader2, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  BookOpen, 
  ChevronRight, 
  FileCheck,
  Grid,
  List,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Plus,
  Minus,
  MessageSquare,
  AlertCircle,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Award,
  ThumbsUp,
  ShieldAlert,
  Check,
  Calendar
} from 'lucide-react';
import { uploadThesis, listTheses, getThesisDetail, deleteThesis, exportThesisDocx } from '../../api/thesis.api';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120 } }
};

// Helper: derive qualitative verdict from major_corrections
function getVerdict(reportJson) {
  // Prefer the LLM's own overall_recommendation or final_recommendation decision if present
  const rec = (reportJson?.final_recommendation?.decision || reportJson?.overall_recommendation || '').toLowerCase();
  if (rec.includes('reject')) return 'major-corrections';
  if (rec.includes('major')) return 'major-corrections';
  if (rec.includes('accept') && !rec.includes('correction')) return 'ready';
  // Fallback: count severity of major_corrections
  const corrections = reportJson?.major_corrections || [];
  const highCount = corrections.filter(c => c.severity?.toLowerCase() === 'high').length;
  if (highCount > 0) return 'major-corrections';
  if (corrections.length > 0) return 'needs-corrections';
  return 'ready';
}

// Helper: count correction summary from major_corrections
function getFindingCounts(reportJson) {
  const corrections = reportJson?.major_corrections || [];
  return {
    total: corrections.length,
    high: corrections.filter(c => c.severity?.toLowerCase() === 'high').length,
    medium: corrections.filter(c => c.severity?.toLowerCase() === 'medium').length,
    low: corrections.filter(c => c.severity?.toLowerCase() === 'low').length,
  };
}

// Helper: is this a wording/phrasing category (diff format) vs a substance category (issue layout)
const DIFF_CATEGORIES = new Set(['academic_writing', 'structure_coherence']);

// Finding card: two layouts depending on category type
function FindingCard({ f, showChapter, getCategoryLabel, getSeverityBadgeClass, getTagIcon }) {
  const useDiff = DIFF_CATEGORIES.has(f.category);

  return (
    <div className="border border-default/80 p-5 bg-[var(--bg-input)]/10 rounded-xl space-y-4 hover:border-default transition-colors relative group">
      {/* Top-right badges */}
      <div className="absolute top-4 right-4 flex items-center gap-2 flex-wrap justify-end max-w-[55%]">
        {showChapter && f.chapterName && (
          <span className="text-[9px] font-mono bg-brand-purple/10 text-brand-purple border border-brand-purple/20 px-2 py-0.5 rounded-full font-bold">
            {f.chapterName}
          </span>
        )}
        <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${getSeverityBadgeClass(f.severity)}`}>
          {f.severity} Priority
        </span>
      </div>

      {/* Category label */}
      <div className="flex items-center gap-2 pb-1 border-b border-default/30 max-w-[60%]">
        <span className="text-[9px] font-mono bg-[var(--bg-elevated)] border border-default px-2 py-0.5 rounded uppercase tracking-wider text-[var(--text-secondary)]">
          {getCategoryLabel(f.category)}
        </span>
      </div>

      {useDiff ? (
        /* ── DIFF LAYOUT: academic_writing / structure_coherence ──────────── */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[9px] font-mono font-semibold uppercase text-red-400">
                <Minus size={10} />
                <span>Draft text:</span>
              </div>
              <p className="bg-red-500/5 text-red-200 border border-red-500/10 p-3 rounded-lg font-mono text-xs break-words whitespace-pre-wrap leading-relaxed shadow-inner">
                "{f.original_text}"
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[9px] font-mono font-semibold uppercase text-emerald-400">
                <Plus size={10} />
                <span>Suggested correction:</span>
              </div>
              <p className="bg-emerald-500/5 text-emerald-200 border border-emerald-500/10 p-3 rounded-lg font-mono text-xs break-words whitespace-pre-wrap leading-relaxed shadow-inner">
                "{f.correction}"
              </p>
            </div>
          </div>

          {f.why_it_matters && (
            <div className="text-xs text-[var(--text-secondary)] bg-pink-500/[0.02] border border-pink-500/10 p-3 rounded-lg flex items-start gap-2">
              <ShieldAlert size={14} className="text-pink-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-pink-400 font-semibold font-mono text-[9px] uppercase tracking-wider">Why It Matters: </strong>
                <span className="italic">{f.why_it_matters}</span>
              </div>
            </div>
          )}

          <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)]/60 border border-default p-3 rounded-lg flex items-start gap-2">
            <MessageSquare size={13} className="text-brand-blue shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-[var(--text-primary)] font-semibold font-mono text-[9px] uppercase tracking-wider">Analysis: </strong>
              <span>{f.comment}</span>
            </div>
          </div>
        </>
      ) : (
        /* ── PLAIN LAYOUT: methodological_rigor / literature_review ──────── */
        <div className="space-y-3">
          {/* Issue */}
          <div className="space-y-1">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">Issue</span>
            <p className="text-xs text-[var(--text-primary)] leading-relaxed">{f.comment}</p>
          </div>

          {/* Why It Matters */}
          {f.why_it_matters && (
            <div className="bg-pink-500/[0.03] border border-pink-500/15 rounded-lg p-3 space-y-0.5">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                <ShieldAlert size={11} />
                Why It Matters
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">{f.why_it_matters}</p>
            </div>
          )}

          {/* Required Correction */}
          {f.correction && (
            <div className="bg-emerald-500/[0.03] border border-emerald-500/15 rounded-lg p-3 space-y-0.5">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Check size={11} strokeWidth={2.5} />
                Required Correction
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{f.correction}</p>
            </div>
          )}
        </div>
      )}

      {/* Applies-to tags — shown for both layouts */}
      {f.applies_to && f.applies_to.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-default/20">
          <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-wider mr-1">Applies to:</span>
          {f.applies_to.map((tag, tagIdx) => (
            <span
              key={tagIdx}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-default text-[9px] font-mono text-[var(--text-secondary)] capitalize"
            >
              {getTagIcon(tag)}
              <span>{tag}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}


export function ThesisCritiquePage() {
  const [activeScreen, setActiveScreen] = useState('list'); // 'list' | 'upload' | 'report' | 'processing'
  const [critiques, setCritiques] = useState([]);
  const [selectedCritique, setSelectedCritique] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState('category'); // 'category' or 'chapter'
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [dragOver, setDragOver] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Collapse state for optional fields
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Form states
  const [candidateName, setCandidateName] = useState('');
  const [programme, setProgramme] = useState('');
  const [thesisTitle, setThesisTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const fileInputRef = useRef(null);

  // Timed progress states
  const [processingTime, setProcessingTime] = useState(0);
  const progressSteps = [
    { label: "Reading document", desc: "Extracting text structure and metadata formatting" },
    { label: "Reviewing chapters", desc: "Analyzing grammar, style, and methodological claims" },
    { label: "Writing report", desc: "Compiling critiques, strengths, and priority actions" }
  ];

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      return `${diffDays} days ago`;
    } catch (e) {
      return dateStr;
    }
  };

  const fetchList = async () => {
    try {
      const data = await listTheses();
      setCritiques(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load thesis critiques.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // Poll for incomplete critiques
  useEffect(() => {
    const incomplete = critiques.some(c => c.status === 'pending' || c.status === 'processing');
    if (!incomplete) return;

    const interval = setInterval(async () => {
      try {
        const data = await listTheses();
        setCritiques(data);
        
        if (selectedCritique) {
          const updated = data.find(c => c.id === selectedCritique.id);
          if (updated) {
            if (updated.status !== selectedCritique.status) {
              setSelectedCritique(updated);
              if (updated.status === 'completed') {
                const details = await getThesisDetail(updated.id);
                setSelectedDetails(details);
                setActiveScreen('report');
                toast.success(`Thesis review for ${updated.candidateName || 'candidate'} completed!`);
              } else if (updated.status === 'failed') {
                setActiveScreen('list');
                toast.error("Thesis analysis failed.");
              }
            }
          }
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [critiques, selectedCritique]);

  // Timed progress counter for loading screen
  useEffect(() => {
    let interval;
    if (activeScreen === 'processing') {
      setProcessingTime(0);
      interval = setInterval(() => {
        setProcessingTime((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeScreen]);

  const handleSelectCritique = async (critique) => {
    setSelectedCritique(critique);
    setSelectedDetails(null);
    if (critique.status === 'completed') {
      try {
        const details = await getThesisDetail(critique.id);
        setSelectedDetails(details);
        setActiveScreen('report');
      } catch (err) {
        console.error(err);
        toast.error("Failed to load critique report details.");
      }
    } else if (critique.status === 'failed') {
      toast.error("This critique has failed processing.");
      setActiveScreen('list');
    } else {
      setActiveScreen('processing');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this critique report?")) return;

    try {
      await deleteThesis(id);
      toast.success("Critique report deleted.");
      if (selectedCritique?.id === id) {
        setSelectedCritique(null);
        setSelectedDetails(null);
        setActiveScreen('list');
      }
      fetchList();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete critique report.");
    }
  };

  const handleExportDocx = async (id, title) => {
    setExporting(true);
    try {
      await exportThesisDocx(id, title);
      toast.success("Critique report exported as DOCX.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export report as DOCX.");
    } finally {
      setExporting(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a thesis document.");
      return;
    }

    const formData = new FormData();
    formData.append("candidateName", candidateName);
    formData.append("programme", programme);
    formData.append("thesisTitle", thesisTitle);
    formData.append("file", selectedFile);

    setUploading(true);
    setActiveScreen('processing');
    setProcessingTime(0);
    try {
      const newCritique = await uploadThesis(formData);
      toast.success("Thesis uploaded successfully! Processing started.");
      setCandidateName('');
      setProgramme('');
      setThesisTitle('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      setSelectedCritique(newCritique);
      setSelectedDetails(null);
      fetchList();
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload thesis.");
      setActiveScreen('upload');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop().toLowerCase();
      if (['pdf', 'docx', 'doc'].includes(ext)) {
        setSelectedFile(file);
      } else {
        toast.error("Only PDF and DOCX files are allowed.");
      }
    }
  };

  const getCorrectionsByCategory = (reportJson) => {
    const grouped = {
      academic_writing: [],
      methodological_rigor: [],
      literature_review: [],
      structure_coherence: []
    };
    (reportJson?.major_corrections || []).forEach(c => {
      const cat = c.category || 'academic_writing';
      if (grouped[cat]) grouped[cat].push(c);
    });
    return grouped;
  };

  const getSeverityBadgeClass = (sev) => {
    switch (sev?.toLowerCase()) {
      case 'high': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'low':
      default: return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'academic_writing': return 'Academic Writing';
      case 'methodological_rigor': return 'Methodological Rigor';
      case 'literature_review': return 'Literature Review';
      case 'structure_coherence': return 'Structure & Coherence';
      default: return cat;
    }
  };

  const getTagIcon = (tag) => {
    switch (tag.toLowerCase()) {
      case 'abstract': return <FileText size={10} className="text-brand-blue" />;
      case 'table': return <Grid size={10} className="text-brand-purple" />;
      case 'references': return <BookOpen size={10} className="text-emerald-400" />;
      case 'section': return <List size={10} className="text-pink-400" />;
      default: return <Sparkles size={10} className="text-amber-400" />;
    }
  };

  const correctionsByCategory = selectedDetails?.reportJson ? getCorrectionsByCategory(selectedDetails.reportJson) : {};

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12 w-full max-w-6xl mx-auto"
    >
      {/* Header Banner */}
      <motion.div variants={itemVariants} className="glass p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-default/60">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-blue"></span>
            </span>
            <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-[0.25em] font-semibold">AI Dissertation Analytics Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            Thesis Critique Suite
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Audit student thesis drafts. Submit documents to extract insights, detect grammatical inconsistencies, verify methodological rigor, and structure literature arguments.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10 bg-[var(--bg-elevated)]/60 border border-default p-3 rounded-xl backdrop-blur">
          <Sparkles className="text-brand-blue animate-pulse" size={20} />
          <div className="text-left font-mono">
            <p className="text-xs font-semibold text-[var(--text-primary)]">Powered by LLM</p>
            <p className="text-[9px] text-[var(--text-secondary)]">Deep Semantic Inspection</p>
          </div>
        </div>
      </motion.div>

      {/* Main Screen Router */}
      <AnimatePresence mode="wait">
        
        {/* SCREEN 1: LIST / HISTORY SCREEN */}
        {activeScreen === 'list' && (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold font-mono uppercase tracking-wider text-[var(--text-primary)]">
                Thesis Evaluations
              </h2>
              <button
                onClick={() => setActiveScreen('upload')}
                className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg shadow-lg hover:shadow-[0_0_15px_rgba(37,99,235,0.25)] transition-all"
              >
                <Plus size={14} />
                <span>Analyze New Thesis</span>
              </button>
            </div>

            {loadingList ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 border border-default rounded-xl bg-[var(--bg-elevated)]/10">
                <Loader2 className="animate-spin text-brand-blue" size={28} />
                <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">Loading history...</span>
              </div>
            ) : critiques.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-default rounded-xl bg-[var(--bg-elevated)]/10 space-y-4">
                <AlertCircle className="text-[var(--text-muted)] opacity-30" size={32} />
                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">No Evaluations Found</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Upload a thesis draft to generate your first AI review report.</p>
                </div>
              </div>
            ) : (
              <div className="border border-default rounded-xl overflow-hidden bg-[var(--bg-elevated)]/10 backdrop-blur-sm">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-default text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold bg-[var(--bg-input)]/40">
                  <div className="col-span-3">Candidate</div>
                  <div className="col-span-5">Thesis Title</div>
                  <div className="col-span-2">Date Added</div>
                  <div className="col-span-1.5 text-center">Status</div>
                  <div className="col-span-0.5"></div>
                </div>

                <div className="divide-y divide-default/40">
                  {critiques.map((c) => (
                    <div 
                      key={c.id}
                      onClick={() => handleSelectCritique(c)}
                      className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-brand-blue/[0.02] cursor-pointer transition-colors group"
                    >
                      <div className="col-span-3 space-y-0.5">
                        <p className="font-semibold text-xs text-[var(--text-primary)] truncate">{c.candidateName}</p>
                        <p className="text-[9px] font-mono text-[var(--text-muted)] truncate">{c.programme}</p>
                      </div>
                      <div className="col-span-5 text-xs text-[var(--text-secondary)] truncate font-serif italic">
                        {c.thesisTitle}
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-mono">
                        <Calendar size={11} />
                        <span>{getRelativeTime(c.createdAt)}</span>
                      </div>
                      <div className="col-span-1.5 flex justify-center">
                        {c.status === 'completed' && (
                          <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Ready
                          </span>
                        )}
                        {(c.status === 'pending' || c.status === 'processing') && (
                          <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-brand-purple/10 text-brand-purple border border-brand-purple/20 flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-brand-purple animate-ping"></span>
                            <span>Analyzing</span>
                          </span>
                        )}
                        {c.status === 'failed' && (
                          <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                            Failed
                          </span>
                        )}
                      </div>
                      <div className="col-span-0.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleDelete(c.id, e)}
                          className="text-[var(--text-muted)] hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Delete report"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* SCREEN 2: UPLOAD SCREEN */}
        {activeScreen === 'upload' && (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <button 
              onClick={() => setActiveScreen('list')}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to History</span>
            </button>
            
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] font-serif">Upload Thesis for Critique</h2>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                Select or drag a thesis PDF or DOCX file to execute deep AI diagnostics. Extracted text is checked for spelling, grammar, academic tone, and methodological rigor.
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} className="glass p-6 md:p-8 border-default/60 space-y-6">
              {/* Centered Drop Zone */}
              <div className="space-y-1.5 text-center">
                <div 
                  className={`border-2 border-dashed rounded-xl transition-all duration-300 p-10 text-center cursor-pointer relative ${
                    dragOver 
                      ? 'border-brand-blue bg-brand-blue/5 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                      : 'border-default hover:border-brand-blue/40 bg-[var(--bg-input)]/20'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf,.docx,.doc" 
                    onChange={handleFileChange}
                  />
                  <FileText className={`mx-auto mb-3 transition-transform duration-300 ${dragOver ? 'scale-110 text-brand-blue' : 'text-[var(--text-muted)]'}`} size={36} />
                  
                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-brand-blue truncate max-w-sm mx-auto">
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] font-mono">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-[var(--text-secondary)]">
                        Drag & drop file here or <span className="text-brand-blue font-semibold hover:underline">Browse</span>
                      </p>
                      <p className="text-[9px] text-[var(--text-muted)] font-mono">PDF, DOCX up to 25MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsible Disclosure Panel */}
              <div className="border border-default/60 rounded-xl overflow-hidden bg-[var(--bg-input)]/10">
                <button
                  type="button"
                  onClick={() => setDetailsOpen(!detailsOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-elevated)]/50 hover:bg-[var(--bg-elevated)] transition-colors text-xs font-semibold text-[var(--text-secondary)] font-mono border-b border-default/30"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-brand-blue" />
                    <span>Optional Details (Candidate, Programme, Title)</span>
                  </div>
                  {detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {detailsOpen && (
                  <div className="p-4 space-y-4 bg-[var(--bg-input)]/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold font-mono uppercase tracking-wider text-[var(--text-secondary)]">Candidate Name</label>
                        <input 
                          type="text" 
                          className="input bg-[var(--bg-input)] hover:border-default focus:border-brand-blue transition-all"
                          placeholder="e.g. Mahfuz Abgor Seidu"
                          value={candidateName}
                          onChange={(e) => setCandidateName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold font-mono uppercase tracking-wider text-[var(--text-secondary)]">Degree Programme</label>
                        <input 
                          type="text" 
                          className="input bg-[var(--bg-input)] hover:border-default focus:border-brand-blue transition-all"
                          placeholder="e.g. M.Sc. Computer Engineering"
                          value={programme}
                          onChange={(e) => setProgramme(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold font-mono uppercase tracking-wider text-[var(--text-secondary)]">Thesis Title</label>
                      <input 
                        type="text" 
                        className="input bg-[var(--bg-input)] hover:border-default focus:border-brand-blue transition-all"
                        placeholder="e.g. Scalable Assessment Architectures"
                        value={thesisTitle}
                        onChange={(e) => setThesisTitle(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="btn-primary w-full justify-center py-3 rounded-lg shadow-lg font-semibold hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center gap-2"
                disabled={uploading}
              >
                <Upload size={16} />
                <span>Analyze Thesis</span>
              </button>
            </form>
          </motion.div>
        )}

        {/* SCREEN 3: TIMED PROGRESS MESSAGING SCREEN */}
        {activeScreen === 'processing' && selectedCritique && (
          <motion.div 
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <button 
              onClick={() => setActiveScreen('list')}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to History</span>
            </button>
            
            <div className="glass p-8 text-center border-default/60 space-y-8 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-purple/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="relative flex items-center justify-center mx-auto">
                <div className="w-20 h-20 border-4 border-brand-purple/10 border-t-brand-purple rounded-full animate-spin"></div>
                <Loader2 className="absolute text-brand-purple animate-pulse" size={28} />
              </div>
              
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-serif text-[var(--text-primary)] font-semibold">Running Thesis Diagnostics</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  The AI engine is extracting and analyzing the contents of <span className="font-mono font-semibold text-brand-purple">"{selectedCritique.filename}"</span>. This usually takes between 30 to 90 seconds.
                </p>
              </div>

              {/* Timed progress list */}
              <div className="max-w-md mx-auto border border-default/60 rounded-xl p-4 bg-[var(--bg-input)]/10 text-left space-y-3">
                {progressSteps.map((step, idx) => {
                  const isCompleted = processingTime > (idx === 0 ? 12 : idx === 1 ? 35 : 9999);
                  const isInProgress = !isCompleted && (idx === 0 || (idx === 1 && processingTime > 12) || (idx === 2 && processingTime > 35));
                  const isPending = !isCompleted && !isInProgress;
                  
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {isCompleted ? (
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        ) : isInProgress ? (
                          <Loader2 size={14} className="text-brand-blue animate-spin" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-default bg-[var(--bg-elevated)]" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className={`text-xs font-semibold ${isCompleted ? 'text-[var(--text-primary)]' : isInProgress ? 'text-brand-blue' : 'text-[var(--text-muted)]'}`}>
                          {step.label}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-purple/10 border border-brand-purple/20 rounded-full">
                <span className="flex h-1.5 w-1.5 rounded-full bg-brand-purple animate-ping"></span>
                <span className="text-[9px] font-mono text-brand-purple uppercase tracking-widest font-semibold">
                  Processing (elapsed: {processingTime}s)
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* SCREEN 4: DETAILED CRITIQUE REPORT DASHBOARD */}
        {activeScreen === 'report' && selectedDetails && (
          <motion.div 
            key="report"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <button 
              onClick={() => setActiveScreen('list')}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to History</span>
            </button>

            {/* Meta details header card */}
            <div className="glass p-6 border-default/60 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="absolute top-0 right-0 p-16 bg-brand-blue/5 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="space-y-3 max-w-[75%] relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono bg-brand-blue/10 text-brand-blue border border-brand-blue/20 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
                    Critique Analysis Report
                  </span>
                  {(() => {
                    const verdict = getVerdict(selectedDetails.reportJson);
                    if (verdict === 'ready') return (
                      <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
                        Ready
                      </span>
                    );
                    if (verdict === 'major-corrections') return (
                      <span className="text-[9px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded uppercase tracking-wider font-semibold animate-pulse">
                        Major Corrections Required
                      </span>
                    );
                    return (
                      <span className="text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
                        Needs Corrections
                      </span>
                    );
                  })()}
                </div>
                <h2 className="text-2xl font-bold font-serif text-[var(--text-primary)] leading-tight tracking-tight">
                  {selectedDetails.thesisTitle}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--text-secondary)] font-medium">
                  <div>Candidate: <strong className="text-[var(--text-primary)]">{selectedDetails.candidateName}</strong></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--border)] hidden sm:block"></div>
                  <div>Programme: <strong className="text-[var(--text-primary)]">{selectedDetails.programme}</strong></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--border)] hidden sm:block"></div>
                  <div>File: <span className="font-mono text-[var(--text-muted)]">{selectedDetails.filename}</span></div>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => handleExportDocx(selectedDetails.id, selectedDetails.thesisTitle)}
                    disabled={exporting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-blue/10 border border-brand-blue/20 hover:bg-brand-blue/20 text-brand-blue transition-all disabled:opacity-50"
                  >
                    {exporting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    <span>{exporting ? 'Exporting...' : 'Export DOCX'}</span>
                  </button>
                </div>
              </div>

              {/* Findings count summary — real data, no invented scores */}
              {(() => {
                const counts = getFindingCounts(selectedDetails.reportJson);
                return (
                  <div className="bg-[var(--bg-elevated)]/60 border border-default p-4 rounded-xl relative z-10 shrink-0 shadow-lg space-y-2 min-w-[140px]">
                    <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase tracking-wider block">Findings</span>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-mono text-red-400">High priority</span>
                        <span className="text-[13px] font-bold font-mono text-[var(--text-primary)]">{counts.high}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-mono text-amber-400">Medium</span>
                        <span className="text-[13px] font-bold font-mono text-[var(--text-primary)]">{counts.medium}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-mono text-blue-400">Low</span>
                        <span className="text-[13px] font-bold font-mono text-[var(--text-primary)]">{counts.low}</span>
                      </div>
                      <div className="pt-1 border-t border-default flex items-center justify-between gap-3">
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">Total</span>
                        <span className="text-[13px] font-bold font-mono text-[var(--text-secondary)]">{counts.total}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Overall Assessment card */}
            {selectedDetails.reportJson?.overall_assessment && (
              <div className="glass p-5 border-default/60 space-y-3 relative overflow-hidden bg-white/[0.01]">
                <div className="flex items-center gap-2 pb-2 border-b border-default/50">
                  <MessageSquare size={14} className="text-brand-blue" />
                  <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase font-mono tracking-wider">
                    Supervisor's Assessment
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic font-serif">
                  "{selectedDetails.reportJson.overall_assessment}"
                </p>
              </div>
            )}

            {/* Strengths checklist */}
            <div className="glass p-5 border-default/60 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-default/50">
                <Award size={16} className="text-emerald-400" />
                <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase font-mono tracking-wider">
                  Key Thesis Strengths
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedDetails.reportJson?.strengths?.map((strength, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/[0.01] border border-emerald-500/10">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                      <Check size={10} strokeWidth={3} />
                    </div>
                    <span className="text-xs text-[var(--text-secondary)] leading-relaxed">{strength}</span>
                  </div>
                )) || (
                  <p className="text-xs text-[var(--text-muted)] italic">No strengths metadata listed.</p>
                )}
              </div>
            </div>

            {/* ── Major Corrections ─────────────────────────────────────────── */}
            {(selectedDetails.reportJson?.major_corrections?.length > 0) && (
              <div className="glass p-5 border-default/60 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-default/50">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={15} className="text-red-400" />
                    <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase font-mono tracking-wider">Major Corrections Required</h3>
                  </div>
                  {/* Category filter pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {['all', 'academic_writing', 'methodological_rigor', 'literature_review', 'structure_coherence'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategoryFilter(cat)}
                        className={`px-2.5 py-1 text-[9px] font-mono font-bold border rounded-full transition-all ${
                          activeCategoryFilter === cat
                            ? 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue'
                            : 'border-default text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        {cat === 'all' ? 'ALL' : getCategoryLabel(cat).toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {selectedDetails.reportJson.major_corrections
                    .filter(c => activeCategoryFilter === 'all' || c.category === activeCategoryFilter)
                    .map((c, idx) => (
                      <div key={idx} className="border border-default/80 p-5 rounded-xl space-y-3 relative hover:border-default transition-colors">
                        {/* Severity + category badges */}
                        <div className="absolute top-4 right-4 flex items-center gap-2">
                          <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${getSeverityBadgeClass(c.severity)}`}>
                            {c.severity} Priority
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pb-1 border-b border-default/30 max-w-[60%]">
                          <span className="text-[9px] font-mono bg-[var(--bg-elevated)] border border-default px-2 py-0.5 rounded uppercase tracking-wider text-[var(--text-secondary)]">
                            {getCategoryLabel(c.category)}
                          </span>
                        </div>
                        {/* Issue */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">Issue</span>
                          <p className="text-xs text-[var(--text-primary)] leading-relaxed">{c.issue}</p>
                        </div>
                        {/* Why It Matters */}
                        {c.why_it_matters && (
                          <div className="bg-pink-500/[0.03] border border-pink-500/15 rounded-lg p-3 space-y-0.5">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                              <ShieldAlert size={11} />
                              Why It Matters
                            </span>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">{c.why_it_matters}</p>
                          </div>
                        )}
                        {/* Required Correction */}
                        {c.required_correction && (
                          <div className="bg-emerald-500/[0.03] border border-emerald-500/15 rounded-lg p-3 space-y-0.5">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                              <Check size={11} strokeWidth={2.5} />
                              Required Correction
                            </span>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{c.required_correction}</p>
                          </div>
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* ── Chapter-by-Chapter Assessment ─────────────────────────────── */}
            {(selectedDetails.reportJson?.chapter_assessments?.length > 0) && (
              <div className="glass p-5 border-default/60 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-default/50">
                  <BookOpen size={15} className="text-brand-purple" />
                  <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase font-mono tracking-wider">Chapter-by-Chapter Assessment</h3>
                </div>
                <div className="space-y-4">
                  {selectedDetails.reportJson.chapter_assessments.map((ch, i) => (
                    <div key={i} className="space-y-2">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-purple/10 text-[10px] font-mono font-bold text-brand-purple border border-brand-purple/20">
                          {i + 1}
                        </span>
                        {ch.name}
                      </h4>
                      <div className="space-y-1.5 pl-7">
                        {(ch.observations || []).map((obs, j) => (
                          <div key={j} className="flex items-start gap-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-purple/50"></span>
                            <span>{obs}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Technical & Methodological Comments ───────────────────────────── */}
            {(selectedDetails.reportJson?.technical_comments?.length > 0) && (
              <div className="glass p-5 border-default/60 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-default/50">
                  <Grid size={14} className="text-amber-400" />
                  <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase font-mono tracking-wider">Technical &amp; Methodological Comments</h3>
                </div>
                <div className="space-y-1.5">
                  {selectedDetails.reportJson.technical_comments.map((tc, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/60"></span>
                      <span>{tc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Formatting, Language & Referencing Corrections ────────────────── */}
            {(selectedDetails.reportJson?.formatting_comments?.length > 0) && (
              <div className="glass p-5 border-default/60 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-default/50">
                  <FileText size={14} className="text-blue-400" />
                  <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase font-mono tracking-wider">Formatting, Language &amp; Referencing Corrections</h3>
                </div>
                <div className="space-y-1.5">
                  {selectedDetails.reportJson.formatting_comments.map((fc, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400/60"></span>
                      <span>{fc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Priority Action Plan ──────────────────────────────────────── */}
            <div className="glass p-5 border-default/60 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-default/50">
                <List size={16} className="text-brand-purple" />
                <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase font-mono tracking-wider">Priority Action Plan</h3>
              </div>
              <div className="space-y-2">
                {(selectedDetails.reportJson?.priority_action_plan || []).map((action, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-input)]/30 border border-default/60 hover:bg-[var(--bg-input)]/50 transition-colors">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-purple/10 text-[10px] font-mono font-bold text-brand-purple border border-brand-purple/20">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] leading-relaxed mt-0.5">{action}</span>
                  </div>
                ))}
                {!(selectedDetails.reportJson?.priority_action_plan?.length) && (
                  <p className="text-xs text-[var(--text-muted)] italic">No priority action plan listed.</p>
                )}
              </div>
            </div>

            {/* ── Final Recommendation ──────────────────────────────────────── */}
            {selectedDetails.reportJson?.final_recommendation && (
              <div className="glass p-5 border-default/60 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-default/50">
                  <Award size={16} className="text-emerald-400" />
                  <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase font-mono tracking-wider">Final Recommendation</h3>
                </div>
                <div className="space-y-4">
                  {selectedDetails.reportJson.final_recommendation.narrative && (
                    <div className="p-4 rounded-lg bg-[var(--bg-input)]/25 border border-default/50">
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {selectedDetails.reportJson.final_recommendation.narrative}
                      </p>
                    </div>
                  )}

                  {selectedDetails.reportJson.final_recommendation.decision && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[var(--text-primary)]">Decision:</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                        {selectedDetails.reportJson.final_recommendation.decision}
                      </span>
                    </div>
                  )}

                  {selectedDetails.reportJson.final_recommendation.closing_note && (
                    <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                      <h4 className="text-xs font-semibold text-emerald-400 mb-1">Supervisor's closing note to the supervisee:</h4>
                      <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">
                        "{selectedDetails.reportJson.final_recommendation.closing_note}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
