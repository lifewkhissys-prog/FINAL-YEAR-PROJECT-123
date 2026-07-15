import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Trash2, Loader2, FileText, CheckCircle, XCircle, AlertTriangle,
  BookOpen, ChevronRight, Sparkles, RefreshCw, Plus, Download, ArrowLeft,
  Award, ShieldAlert, Check, Calendar, Edit3, Save, Eye, Settings,
  BarChart3, Layers, Scale, ClipboardList,
} from 'lucide-react';
import {
  uploadThesis, listSubmissions, getSubmission, deleteSubmission,
  triggerAssessment, getResults, overrideResult, getReport, updateReport,
  exportSubmissionDocx, listCriteria, updateCriterion, createExample,
  listExamples, getSubmissionFullText,
} from '../../api/thesis.api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } },
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE — tab-based layout
// ═══════════════════════════════════════════════════════════════════════════

export function ThesisCritiquePage() {
  const [tab, setTab] = useState('submissions');
  const tabs = [
    { key: 'submissions', label: 'Submissions', icon: FileText },
    { key: 'rubric', label: 'Rubric Editor', icon: Scale },
    { key: 'examples', label: 'Graded Examples', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-brand-blue" />
          Thesis Assessment System
        </h1>
        <p className="text-[var(--text-secondary)] mt-1 text-sm">
          Rubric-grounded multi-agent assessment pipeline
        </p>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-[var(--bg-secondary)] rounded-xl p-1 max-w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-brand-blue text-white shadow-md'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'submissions' && <SubmissionsTab key="sub" />}
        {tab === 'rubric' && <RubricTab key="rub" />}
        {tab === 'examples' && <ExamplesTab key="ex" />}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBMISSIONS TAB
// ═══════════════════════════════════════════════════════════════════════════

function SubmissionsTab() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selected, setSelected] = useState(null); // submission id for detail view

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listSubmissions();
      setSubs(data);
    } catch { toast.error('Failed to load submissions'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (selected) {
    return <SubmissionDetail id={selected} onBack={() => { setSelected(null); load(); }} />;
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Thesis Submissions</h2>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          <Upload className="w-4 h-4" /> Upload Thesis
        </button>
      </div>

      {showUpload && (
        <UploadForm
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); load(); }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
        </div>
      ) : subs.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No submissions yet. Upload a thesis to get started.</p>
        </div>
      ) : (
        <motion.div variants={containerVariants} className="grid gap-3">
          {subs.map((s) => (
            <motion.div
              key={s.id}
              variants={itemVariants}
              onClick={() => setSelected(s.id)}
              className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] cursor-pointer hover:border-brand-blue/50 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  s.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                  s.status === 'assessing' ? 'bg-blue-500/10 text-blue-400' :
                  s.status === 'reviewed' ? 'bg-purple-500/10 text-purple-400' :
                  'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {s.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                   s.status === 'assessing' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                   s.status === 'reviewed' ? <Award className="w-5 h-5" /> :
                   <FileText className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text-primary)] truncate">
                    {s.title || s.filePath || 'Untitled'}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {s.studentName || 'Unknown student'} · {s.programme || ''} · {new Date(s.submittedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={s.status} />
                <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-brand-blue transition-colors" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    assessing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    reviewed: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD FORM
// ═══════════════════════════════════════════════════════════════════════════

function UploadForm({ onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [title, setTitle] = useState('');
  const [programme, setProgramme] = useState('');
  const [institution, setInstitution] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Select a thesis file');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (studentName) fd.append('studentName', studentName);
      if (title) fd.append('title', title);
      if (programme) fd.append('programme', programme);
      if (institution) fd.append('institution', institution);
      await uploadThesis(fd);
      toast.success('Thesis uploaded successfully');
      onUploaded();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Upload failed');
    }
    setUploading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-6 p-5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)]"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--text-primary)]">Upload Thesis</h3>
        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">✕</button>
      </div>
      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
        <div
          onClick={() => fileRef.current?.click()}
          className="md:col-span-2 border-2 border-dashed border-[var(--border-primary)] rounded-lg p-6 text-center cursor-pointer hover:border-brand-blue/50 transition-colors"
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-[var(--text-secondary)]" />
          <p className="text-sm text-[var(--text-secondary)]">
            {file ? file.name : 'Click or drag to upload PDF/DOCX'}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.doc"
            onChange={(e) => setFile(e.target.files[0])}
            className="hidden"
          />
        </div>
        <Input label="Student Name" value={studentName} onChange={setStudentName} placeholder="Auto-extracted if blank" />
        <Input label="Thesis Title" value={title} onChange={setTitle} placeholder="Auto-extracted if blank" />
        <Input label="Programme" value={programme} onChange={setProgramme} placeholder="e.g. MSc Computer Science" />
        <Input label="Institution" value={institution} onChange={setInstitution} placeholder="e.g. KNUST" />
        <div className="md:col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading || !file}
            className="flex items-center gap-2 px-5 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:border-brand-blue focus:outline-none"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBMISSION DETAIL — results, report, overrides
// ═══════════════════════════════════════════════════════════════════════════

function SubmissionDetail({ id, onBack }) {
  const [sub, setSub] = useState(null);
  const [results, setResults] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [editingReport, setEditingReport] = useState(false);
  const [editedText, setEditedText] = useState('');
  const pollRef = useRef();

  const load = useCallback(async () => {
    try {
      const [s, r, rp] = await Promise.all([
        getSubmission(id),
        getResults(id).catch(() => []),
        getReport(id).catch(() => null),
      ]);
      setSub(s);
      setResults(r);
      setReport(rp);
      if (rp?.narrativeReportEdited) setEditedText(rp.narrativeReportEdited);
      else if (rp?.narrativeReport) setEditedText(rp.narrativeReport);
      return s;
    } catch {
      toast.error('Failed to load submission');
      return null;
    }
  }, [id]);

  const [activeSubTab, setActiveSubTab] = useState('scores');
  const [fullText, setFullText] = useState('');
  const [loadingFullText, setLoadingFullText] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState('');

  useEffect(() => {
    if (activeSubTab === 'document' && !fullText) {
      (async () => {
        setLoadingFullText(true);
        try {
          const data = await getSubmissionFullText(id);
          setFullText(data.fullText || 'No text content available.');
        } catch {
          toast.error('Failed to load document text');
        }
        setLoadingFullText(false);
      })();
    }
  }, [activeSubTab, id, fullText]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const s = await load();
      setLoading(false);
      // Poll while assessing
      if (s?.status === 'assessing' || s?.status === 'pending') {
        const interval = setInterval(async () => {
          const fresh = await load();
          if (fresh?.status === 'completed' || fresh?.status === 'reviewed') {
            clearInterval(interval);
            toast.success('Assessment complete!');
          }
        }, 5000);
        pollRef.current = interval;
      }
    })();
    return () => clearInterval(pollRef.current);
  }, [load]);

  const handleAssess = async () => {
    setAssessing(true);
    try {
      await triggerAssessment(id);
      toast.success('Assessment started — processing...');
      const s = await load();
      const interval = setInterval(async () => {
        const fresh = await load();
        if (fresh?.status === 'completed' || fresh?.status === 'reviewed') {
          clearInterval(interval);
          toast.success('Assessment complete!');
          setAssessing(false);
        }
      }, 5000);
      pollRef.current = interval;
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to start assessment');
      setAssessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this submission and all its results?')) return;
    try {
      await deleteSubmission(id);
      toast.success('Deleted');
      onBack();
    } catch { toast.error('Delete failed'); }
  };

  const handleSaveReport = async () => {
    try {
      await updateReport(id, { narrativeReportEdited: editedText });
      toast.success('Report saved');
      setEditingReport(false);
      await load();
    } catch { toast.error('Failed to save report'); }
  };

  const handleExport = async () => {
    try {
      await exportSubmissionDocx(id, sub?.title || 'thesis');
      toast.success('Exported');
    } catch { toast.error('Export failed'); }
  };

  const weightedScore = results.length > 0
    ? results.reduce((sum, r) => {
        const score = r.supervisorOverrideScore ?? r.aiScore;
        return sum + (r.criterionWeight || 0) * score;
      }, 0)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
      </div>
    );
  }

  if (!sub) return <p className="text-[var(--text-secondary)]">Not found</p>;

  const reportText = report?.narrativeReportEdited || report?.narrativeReport;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-[var(--text-primary)] truncate">{sub.title || 'Untitled'}</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {sub.studentName || 'Unknown'} · {sub.programme || ''} · {sub.institution || ''}
          </p>
        </div>
        <StatusBadge status={sub.status} />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(sub.status === 'pending' || sub.status === 'completed' || sub.status === 'reviewed') && (
          <button
            onClick={handleAssess}
            disabled={assessing || sub.status === 'assessing'}
            className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
          >
            {assessing || sub.status === 'assessing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {sub.status === 'pending' ? 'Run Assessment' : 'Re-assess'}
          </button>
        )}
        {reportText && (
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] hover:border-brand-blue/50">
            <Download className="w-4 h-4" /> Export DOCX
          </button>
        )}
        <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 text-sm ml-auto">
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>

      {sub.status === 'assessing' && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          <p className="text-sm text-blue-300">Assessment in progress — scoring 7 criteria with verifier checks...</p>
        </div>
      )}

      {/* Weighted score */}
      {weightedScore !== null && results.length > 0 && (
        <div className="p-4 mb-6 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Weighted Score</p>
              <p className="text-3xl font-bold text-[var(--text-primary)]">
                {weightedScore.toFixed(2)} <span className="text-lg text-[var(--text-secondary)]">/ 5.0</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--text-secondary)]">Scaled (0-100)</p>
              <p className="text-3xl font-bold text-brand-blue">{(weightedScore * 20).toFixed(0)}</p>
            </div>
          </div>
          <div className="mt-3 w-full bg-[var(--bg-tertiary)] rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
              style={{ width: `${(weightedScore / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Sub-tab bar for Scores / Report / Document */}
      {(results.length > 0 || reportText) && (
        <div className="flex gap-1 mb-5 bg-[var(--bg-secondary)] rounded-xl p-1 max-w-fit">
          {[
            { key: 'scores',   label: 'Criterion Scores', icon: BarChart3 },
            { key: 'report',   label: 'Narrative Report', icon: BookOpen },
            { key: 'document', label: 'Document View',    icon: FileText },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSubTab(key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === key
                  ? 'bg-brand-blue text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Scores Tab */}
        {activeSubTab === 'scores' && results.length > 0 && (
          <motion.div key="scores" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-3 mb-6">
            {results.map((r) => (
              <CriterionCard
                key={r.id}
                result={r}
                submissionId={id}
                onOverride={load}
                onCitationClick={(cited) => {
                  setActiveHighlight(cited);
                  setActiveSubTab('document');
                }}
              />
            ))}
          </motion.div>
        )}

        {/* Report Tab */}
        {activeSubTab === 'report' && reportText && (
          <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-blue" /> Narrative Report
              </h3>
              <div className="flex gap-2">
                {!editingReport && (
                  <button onClick={() => setEditingReport(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg hover:border-brand-blue/50 text-[var(--text-secondary)]">
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                )}
                {editingReport && (
                  <>
                    <button onClick={() => setEditingReport(false)} className="px-3 py-1.5 text-xs text-[var(--text-secondary)]">Cancel</button>
                    <button onClick={handleSaveReport} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-brand-blue text-white rounded-lg">
                      <Save className="w-3 h-3" /> Save
                    </button>
                  </>
                )}
              </div>
            </div>
            {editingReport ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={25}
                className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-sm text-[var(--text-primary)] font-mono focus:border-brand-blue focus:outline-none resize-y"
              />
            ) : (
              <div className="p-5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{reportText}</ReactMarkdown>
              </div>
            )}
          </motion.div>
        )}

        {/* Document View Tab */}
        {activeSubTab === 'document' && (
          <motion.div key="document" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-blue" /> Document Viewer
              </h3>
              {activeHighlight && (
                <button
                  onClick={() => setActiveHighlight('')}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]"
                >
                  ✕ Clear highlight
                </button>
              )}
            </div>
            <DocumentViewer
              fullText={fullText}
              loading={loadingFullText}
              highlight={activeHighlight}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CRITERION CARD — score, justification, verifier, override
// ═══════════════════════════════════════════════════════════════════════════

function CriterionCard({ result, submissionId, onOverride, onCitationClick }) {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [score, setScore] = useState(result.supervisorOverrideScore || result.aiScore);
  const [notes, setNotes] = useState(result.supervisorNotes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await overrideResult(submissionId, result.criterionId, {
        supervisorOverrideScore: score,
        supervisorNotes: notes || null,
      });
      toast.success('Override saved');
      setOverrideOpen(false);
      onOverride();
    } catch { toast.error('Failed to save override'); }
    setSaving(false);
  };

  const effectiveScore = result.supervisorOverrideScore ?? result.aiScore;
  const scoreColor = effectiveScore >= 4 ? 'text-green-400' : effectiveScore >= 3 ? 'text-yellow-400' : 'text-red-400';
  const scoreBg = effectiveScore >= 4 ? 'bg-green-500/10' : effectiveScore >= 3 ? 'bg-yellow-500/10' : 'bg-red-500/10';

  return (
    <motion.div
      variants={itemVariants}
      className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-[var(--text-primary)] text-sm">{result.criterionName}</h4>
            <span className="text-xs text-[var(--text-secondary)]">(w={result.criterionWeight})</span>
            {!result.verifierPassed && result.verifierPassed !== null && (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <ShieldAlert className="w-3 h-3" /> Flagged
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-2">{result.aiJustification}</p>
          {result.citedText && (
            <button
              onClick={() => onCitationClick?.(result.citedText)}
              title="Click to view in document"
              className="w-full text-left mb-2 group"
            >
              <blockquote className="border-l-2 border-brand-blue/30 pl-3 text-xs text-[var(--text-secondary)] italic group-hover:border-brand-blue group-hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-start gap-1">
                <Eye className="w-3 h-3 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-brand-blue" />
                <span>"{result.citedText.substring(0, 300)}{result.citedText.length > 300 ? '…' : ''}"</span>
              </blockquote>
            </button>
          )}
          {result.verifierNotes && (
            <p className="text-xs text-[var(--text-secondary)]">
              <span className={result.verifierPassed ? 'text-green-400' : 'text-red-400'}>Verifier:</span> {result.verifierNotes}
            </p>
          )}
          {result.supervisorOverrideScore && (
            <p className="text-xs text-purple-400 mt-1">
              ✎ Supervisor override: {result.supervisorOverrideScore}/5
              {result.supervisorNotes ? ` — ${result.supervisorNotes}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${scoreBg} ${scoreColor}`}>
            {effectiveScore}
          </div>
          <button
            onClick={() => setOverrideOpen(!overrideOpen)}
            className="text-xs text-[var(--text-secondary)] hover:text-brand-blue"
          >
            Override
          </button>
        </div>
      </div>

      <AnimatePresence>
        {overrideOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-[var(--border-primary)]"
          >
            <div className="flex items-center gap-3">
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Score (1-5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded text-sm text-[var(--text-primary)] text-center"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-[var(--text-secondary)]">Notes</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional justification"
                  className="w-full px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded text-sm text-[var(--text-primary)]"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 bg-brand-blue text-white rounded text-xs font-medium mt-4"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// RUBRIC EDITOR TAB
// ═══════════════════════════════════════════════════════════════════════════

function RubricTab() {
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // criterion id
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setCriteria(await listCriteria());
      } catch { toast.error('Failed to load rubric'); }
      setLoading(false);
    })();
  }, []);

  const handleEdit = (c) => {
    setEditing(c.id);
    setFormData({
      name: c.name,
      description: c.description,
      weight: c.weight,
      level1Desc: c.level1Desc,
      level3Desc: c.level3Desc,
      level5Desc: c.level5Desc,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCriterion(editing, formData);
      toast.success('Criterion updated');
      setEditing(null);
      setCriteria(await listCriteria());
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  const totalWeight = criteria.reduce((s, c) => s + (c.weight || 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-blue" /></div>;
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Rubric Criteria</h2>
        <span className={`text-xs px-2 py-1 rounded ${Math.abs(totalWeight - 1) < 0.01 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          Total weight: {totalWeight.toFixed(2)}
        </span>
      </div>

      {criteria.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No criteria configured. Run the seed script to initialize.</p>
          <code className="block mt-2 text-xs text-brand-blue">python -m app.seed</code>
        </div>
      ) : (
        <div className="grid gap-3">
          {criteria.map((c) => (
            <motion.div
              key={c.id}
              variants={itemVariants}
              className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)]"
            >
              {editing === c.id ? (
                <div className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input label="Name" value={formData.name} onChange={(v) => setFormData(p => ({ ...p, name: v }))} />
                    <Input label="Weight" type="number" value={formData.weight} onChange={(v) => setFormData(p => ({ ...p, weight: parseFloat(v) || 0 }))} />
                  </div>
                  <Textarea label="Description" value={formData.description} onChange={(v) => setFormData(p => ({ ...p, description: v }))} />
                  <Textarea label="Level 1 (Weak)" value={formData.level1Desc} onChange={(v) => setFormData(p => ({ ...p, level1Desc: v }))} />
                  <Textarea label="Level 3 (Adequate)" value={formData.level3Desc} onChange={(v) => setFormData(p => ({ ...p, level3Desc: v }))} />
                  <Textarea label="Level 5 (Excellent)" value={formData.level5Desc} onChange={(v) => setFormData(p => ({ ...p, level5Desc: v }))} />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs text-[var(--text-secondary)]">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-brand-blue text-white rounded-lg text-xs font-medium">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-[var(--text-primary)]">{c.name}</h4>
                      <span className="text-xs px-2 py-0.5 bg-brand-blue/10 text-brand-blue rounded-full">
                        {(c.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mb-2">{c.description}</p>
                    <div className="grid md:grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-red-500/5 rounded-lg">
                        <span className="text-red-400 font-medium">Level 1:</span>
                        <p className="text-[var(--text-secondary)] mt-0.5">{c.level1Desc?.substring(0, 100)}…</p>
                      </div>
                      <div className="p-2 bg-yellow-500/5 rounded-lg">
                        <span className="text-yellow-400 font-medium">Level 3:</span>
                        <p className="text-[var(--text-secondary)] mt-0.5">{c.level3Desc?.substring(0, 100)}…</p>
                      </div>
                      <div className="p-2 bg-green-500/5 rounded-lg">
                        <span className="text-green-400 font-medium">Level 5:</span>
                        <p className="text-[var(--text-secondary)] mt-0.5">{c.level5Desc?.substring(0, 100)}…</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleEdit(c)} className="p-2 text-[var(--text-secondary)] hover:text-brand-blue rounded-lg hover:bg-[var(--bg-tertiary)]">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:border-brand-blue focus:outline-none resize-y"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GRADED EXAMPLES TAB
// ═══════════════════════════════════════════════════════════════════════════

function ExamplesTab() {
  const [examples, setExamples] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filterCrit, setFilterCrit] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ex, cr] = await Promise.all([
        listExamples(filterCrit || undefined),
        listCriteria(),
      ]);
      setExamples(ex);
      setCriteria(cr);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  }, [filterCrit]);

  useEffect(() => { load(); }, [load]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Graded Examples</h2>
        <div className="flex items-center gap-2">
          <select
            value={filterCrit}
            onChange={(e) => setFilterCrit(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-xs text-[var(--text-primary)]"
          >
            <option value="">All criteria</option>
            {criteria.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-brand-blue text-white rounded-lg text-xs font-medium"
          >
            <Plus className="w-3 h-3" /> Add Example
          </button>
        </div>
      </div>

      {showAdd && (
        <AddExampleForm
          criteria={criteria}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); load(); }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-blue" /></div>
      ) : examples.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No graded examples yet. Add excerpts from real theses to improve scoring accuracy.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {examples.map((ex) => (
            <motion.div key={ex.id} variants={itemVariants} className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 bg-brand-blue/10 text-brand-blue rounded-full">
                      {criteria.find(c => c.id === ex.criterionId)?.name || `Criterion #${ex.criterionId}`}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {new Date(ex.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <blockquote className="text-sm text-[var(--text-secondary)] italic border-l-2 border-[var(--border-primary)] pl-3 mb-2">
                    "{ex.excerpt.substring(0, 250)}{ex.excerpt.length > 250 ? '…' : ''}"
                  </blockquote>
                  {ex.justification && (
                    <p className="text-xs text-[var(--text-secondary)]">{ex.justification}</p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold shrink-0">
                  {ex.assignedScore}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function AddExampleForm({ criteria, onClose, onAdded }) {
  const [criterionId, setCriterionId] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [assignedScore, setAssignedScore] = useState(3);
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!criterionId || !excerpt) return toast.error('Fill in criterion and excerpt');
    setSaving(true);
    try {
      await createExample({
        criterionId: parseInt(criterionId),
        excerpt,
        assignedScore,
        justification: justification || null,
      });
      toast.success('Example added');
      onAdded();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to add');
    }
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-6 p-5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)]"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--text-primary)]">Add Graded Example</h3>
        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">✕</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Criterion</label>
            <select
              value={criterionId}
              onChange={(e) => setCriterionId(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)]"
              required
            >
              <option value="">Select criterion...</option>
              {criteria.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Input label="Score (1-5)" type="number" value={assignedScore} onChange={(v) => setAssignedScore(parseInt(v) || 1)} />
        </div>
        <Textarea label="Thesis Excerpt" value={excerpt} onChange={setExcerpt} />
        <Textarea label="Justification (why this score)" value={justification} onChange={setJustification} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[var(--text-secondary)]">Cancel</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-brand-blue text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Example
          </button>
        </div>
      </form>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT VIEWER — renders the full thesis text and highlights a passage
// ═══════════════════════════════════════════════════════════════════════════

function DocumentViewer({ fullText, loading, highlight }) {
  const highlightRef = useRef(null);

  // Auto-scroll to the highlighted passage
  useEffect(() => {
    if (highlight && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlight]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-[var(--text-secondary)]">
        <Loader2 className="w-5 h-5 animate-spin text-brand-blue" />
        <span className="text-sm">Loading document…</span>
      </div>
    );
  }

  if (!fullText) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--text-secondary)] text-sm">
        <FileText className="w-5 h-5 mr-2 opacity-50" />
        No document text available yet.
      </div>
    );
  }

  // Split the full text around the highlighted passage
  if (highlight) {
    // Normalize whitespace for matching
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const normFull = norm(fullText);
    const normHl   = norm(highlight);
    const idx = normFull.indexOf(normHl);

    if (idx !== -1) {
      const before = fullText.substring(0, idx);
      const match  = fullText.substring(idx, idx + normHl.length);
      const after  = fullText.substring(idx + normHl.length);

      return (
        <div className="relative max-h-[70vh] overflow-y-auto p-5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed font-mono text-xs">
          {before}
          <mark
            ref={highlightRef}
            className="bg-yellow-400/30 text-[var(--text-primary)] border border-yellow-400/50 rounded px-0.5 scroll-mt-8"
          >
            {match}
          </mark>
          {after}
        </div>
      );
    }
  }

  // No highlight — plain render
  return (
    <div className="max-h-[70vh] overflow-y-auto p-5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed font-mono">
      {fullText}
    </div>
  );
}

export default ThesisCritiquePage;

