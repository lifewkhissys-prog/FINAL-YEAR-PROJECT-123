import React, { useEffect, useState } from 'react';
import NavigationHeader from '../../components/NavigationHeader';

export default function RubricEditorPage() {
  const [degreeLevel, setDegreeLevel] = useState('mphil');
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSub, setEditingSub] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    max_marks: 5.0,
    description: '',
    level_low_desc: '',
    level_mid_desc: '',
    level_high_desc: ''
  });

  // Exemplar Management Modal State
  const [exemplarModalSub, setExemplarModalSub] = useState(null);
  const [exemplarForm, setExemplarForm] = useState({ excerpt: '', assigned_score: 4.0, justification: '' });
  const [exemplarsSuccess, setExemplarsSuccess] = useState(false);

  const loadCriteria = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rubric/criteria?degree_level=${degreeLevel}`);
      if (res.ok) {
        setCriteria(await res.json());
      }
    } catch (err) {
      console.error("Error loading rubric criteria:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCriteria();
  }, [degreeLevel]);

  const handleEditClick = (sub) => {
    setEditingSub(sub);
    setEditForm({
      name: sub.name,
      max_marks: sub.max_marks,
      description: sub.description,
      level_low_desc: sub.level_low_desc || '',
      level_mid_desc: sub.level_mid_desc || '',
      level_high_desc: sub.level_high_desc || ''
    });
  };

  const handleSaveSub = async () => {
    if (!editingSub) return;
    try {
      await fetch(`/api/rubric/sub-criteria/${editingSub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      setEditingSub(null);
      loadCriteria();
    } catch (err) {
      console.error("Error updating sub-criterion:", err);
    }
  };

  const handleAddExemplar = async () => {
    if (!exemplarModalSub) return;
    try {
      await fetch('/api/graded-examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sub_criterion_id: exemplarModalSub.id,
          excerpt: exemplarForm.excerpt,
          assigned_score: exemplarForm.assigned_score,
          justification: exemplarForm.justification
        })
      });
      setExemplarsSuccess(true);
      setTimeout(() => {
        setExemplarsSuccess(false);
        setExemplarModalSub(null);
      }, 1500);
    } catch (err) {
      console.error("Error adding graded exemplar:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col">
      <NavigationHeader />

      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high pb-6">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1">Rubric & Exemplars Management</span>
            <h1 className="font-serif text-3xl font-bold text-primary">KNUST Official Thesis Rubric Editor</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Customize top-level criteria, lettered sub-criteria allocations, and low/mid/high evaluation descriptors.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-primary">Degree Level:</label>
            <select
              value={degreeLevel}
              onChange={(e) => setDegreeLevel(e.target.value)}
              className="bg-white border border-outline-variant rounded-lg px-4 py-2 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary shadow-sm"
            >
              <option value="mphil">MPhil (KNUST Appendix 4.4)</option>
              <option value="phd">PhD (KNUST Appendix 4.2)</option>
              <option value="msc">MSc (Taught Master's)</option>
              <option value="undergraduate">Undergraduate (BSc FYP)</option>
            </select>
          </div>
        </div>

        {/* Sub-Criterion Edit Modal */}
        {editingSub && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4 my-8">
              <h3 className="font-serif text-lg font-bold text-primary">Edit Sub-Criterion</h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-primary block mb-1">Sub-Criterion Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full border border-outline-variant p-2 rounded outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-primary block mb-1">Max Marks Allocation</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editForm.max_marks}
                    onChange={(e) => setEditForm({ ...editForm, max_marks: parseFloat(e.target.value) })}
                    className="w-full border border-outline-variant p-2 rounded outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-primary block mb-1">Description / Guidelines</label>
                  <textarea
                    rows={2}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full border border-outline-variant p-2 rounded outline-none"
                  />
                </div>

                <div className="border-t pt-2 space-y-2">
                  <h4 className="font-bold text-primary text-[11px]">Level Performance Descriptors</h4>
                  <div>
                    <label className="font-semibold text-amber-700 block mb-0.5">Low Performance Anchor</label>
                    <input
                      type="text"
                      value={editForm.level_low_desc}
                      onChange={(e) => setEditForm({ ...editForm, level_low_desc: e.target.value })}
                      className="w-full border border-outline-variant p-1.5 rounded outline-none text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-blue-700 block mb-0.5">Mid Performance Anchor</label>
                    <input
                      type="text"
                      value={editForm.level_mid_desc}
                      onChange={(e) => setEditForm({ ...editForm, level_mid_desc: e.target.value })}
                      className="w-full border border-outline-variant p-1.5 rounded outline-none text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-emerald-700 block mb-0.5">High Performance Anchor</label>
                    <input
                      type="text"
                      value={editForm.level_high_desc}
                      onChange={(e) => setEditForm({ ...editForm, level_high_desc: e.target.value })}
                      className="w-full border border-outline-variant p-1.5 rounded outline-none text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  onClick={() => setEditingSub(null)}
                  className="px-4 py-2 border text-xs font-semibold rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSub}
                  className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-container"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Graded Exemplar Modal */}
        {exemplarModalSub && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4">
              <div>
                <span className="text-[11px] font-bold text-primary uppercase block">Few-Shot Ground Truth Exemplar</span>
                <h3 className="font-serif text-lg font-bold text-primary">Add Graded Excerpt for: {exemplarModalSub.name}</h3>
              </div>

              {exemplarsSuccess && (
                <div className="p-3 bg-emerald-100 text-emerald-900 text-xs rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>Exemplar saved and embedded for scorer agent retrieval!</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-primary block mb-1">Thesis Excerpt Text</label>
                  <textarea
                    rows={4}
                    value={exemplarForm.excerpt}
                    onChange={(e) => setExemplarForm({ ...exemplarForm, excerpt: e.target.value })}
                    placeholder="Paste a real thesis excerpt..."
                    className="w-full border border-outline-variant p-2.5 rounded outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-primary block mb-1">Assigned Human Score (out of {exemplarModalSub.max_marks})</label>
                  <input
                    type="number"
                    step="0.5"
                    max={exemplarModalSub.max_marks}
                    min="0"
                    value={exemplarForm.assigned_score}
                    onChange={(e) => setExemplarForm({ ...exemplarForm, assigned_score: parseFloat(e.target.value) })}
                    className="w-full border border-outline-variant p-2 rounded outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-primary block mb-1">Supervisor Justification</label>
                  <textarea
                    rows={2}
                    value={exemplarForm.justification}
                    onChange={(e) => setExemplarForm({ ...exemplarForm, justification: e.target.value })}
                    placeholder="Reasoning why this excerpt earned this score..."
                    className="w-full border border-outline-variant p-2.5 rounded outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  onClick={() => setExemplarModalSub(null)}
                  className="px-4 py-2 border text-xs font-semibold rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddExemplar}
                  className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-container"
                >
                  Save Exemplar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Criteria & Sub-criteria List */}
        {loading ? (
          <div className="py-12 text-center text-on-surface-variant text-sm">
            Loading rubric criteria for {degreeLevel.toUpperCase()}...
          </div>
        ) : (
          <div className="space-y-6">
            {criteria.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-surface-container-highest p-6 shadow-sm space-y-4">
                {/* Parent Criterion Header */}
                <div className="flex items-center justify-between border-b border-surface-container pb-3">
                  <div>
                    <h2 className="font-serif text-xl font-bold text-primary">{c.name}</h2>
                    <p className="text-xs text-on-surface-variant">{c.description} • Source: {c.source}</p>
                  </div>
                  <span className="px-3 py-1 bg-surface-container text-primary font-bold text-xs rounded-full">
                    Max Marks: {c.max_marks}
                  </span>
                </div>

                {/* Sub-Criteria Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {c.sub_criteria && c.sub_criteria.length > 0 ? (
                    c.sub_criteria.map((sc) => (
                      <div key={sc.id} className="p-4 bg-surface-container-low rounded-lg border border-surface-container flex flex-col justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-xs text-primary">{sc.name}</h4>
                            <span className="shrink-0 px-2 py-0.5 bg-white text-primary text-[10px] font-bold rounded border border-surface-container">
                              {sc.max_marks} Marks
                            </span>
                          </div>

                          <p className="text-[11px] text-on-surface-variant leading-relaxed">{sc.description}</p>

                          {/* Low / Mid / High Descriptors */}
                          <div className="pt-2 border-t border-surface-container space-y-1 text-[10px]">
                            {sc.level_low_desc && (
                              <p className="text-amber-800 bg-amber-50/60 p-1.5 rounded">
                                <strong className="font-bold">Low:</strong> {sc.level_low_desc}
                              </p>
                            )}
                            {sc.level_mid_desc && (
                              <p className="text-blue-800 bg-blue-50/60 p-1.5 rounded">
                                <strong className="font-bold">Mid:</strong> {sc.level_mid_desc}
                              </p>
                            )}
                            {sc.level_high_desc && (
                              <p className="text-emerald-800 bg-emerald-50/60 p-1.5 rounded">
                                <strong className="font-bold">High:</strong> {sc.level_high_desc}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
                          <button
                            onClick={() => handleEditClick(sc)}
                            className="px-3 py-1 bg-white border border-outline-variant text-primary text-[11px] font-semibold rounded hover:bg-surface-container"
                          >
                            Edit Rubric
                          </button>
                          <button
                            onClick={() => {
                              setExemplarModalSub(sc);
                              setExemplarForm({ excerpt: '', assigned_score: roundHalf(sc.max_marks * 0.8), justification: '' });
                            }}
                            className="px-3 py-1 bg-primary text-white text-[11px] font-semibold rounded hover:bg-primary-container"
                          >
                            + Exemplar
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-on-surface-variant py-2">No sub-criteria defined for this section.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}

function roundHalf(num) {
  return Math.round(num * 2) / 2;
}
