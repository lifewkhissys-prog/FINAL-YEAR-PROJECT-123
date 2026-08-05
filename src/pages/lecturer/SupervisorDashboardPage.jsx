import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import NavigationHeader from '../../components/NavigationHeader';
import { authFetch } from '../../api/axiosInstance';

export default function SupervisorDashboardPage() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubmissions() {
      try {
        const res = await authFetch('/api/submissions');
        if (res.ok) {
          setSubmissions(await res.json());
        }
      } catch (err) {
        console.error("Error loading submissions:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSubmissions();
  }, []);

  const totalEvaluated = submissions.length;
  const pendingCount = submissions.filter(s => s.status === 'pending' || s.status === 'assessing').length;
  const completedCount = submissions.filter(s => s.status === 'completed' || s.status === 'reviewed').length;

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col">
      <NavigationHeader />

      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Dashboard Title & CTA Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high pb-6">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1">Supervisor Workspace</span>
            <h1 className="font-serif text-3xl font-bold text-primary">Thesis Assessment Dashboard</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Overview of student thesis submissions, preliminary gate checks, plagiarism alerts, and evaluation scores.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/thesis/rubric"
              className="px-4 py-2.5 border border-outline-variant text-on-surface-variant text-xs font-semibold rounded-lg hover:bg-surface-container transition-colors"
            >
              Rubric Configuration
            </Link>

            <Link
              to="/thesis/upload"
              className="px-6 py-2.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>New Thesis Assessment</span>
            </Link>
          </div>
        </div>

        {/* Dashboard Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-surface-container-highest shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Submissions</span>
              <span className="material-symbols-outlined text-primary text-xl">folder_shared</span>
            </div>
            <p className="text-3xl font-bold text-primary">{totalEvaluated}</p>
            <p className="text-xs text-on-surface-variant mt-1">Uploaded thesis documents</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-surface-container-highest shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pipeline Processing</span>
              <span className="material-symbols-outlined text-amber-600 text-xl">sync</span>
            </div>
            <p className="text-3xl font-bold text-amber-700">{pendingCount}</p>
            <p className="text-xs text-on-surface-variant mt-1">Active multi-agent pipeline runs</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-surface-container-highest shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Completed Reviews</span>
              <span className="material-symbols-outlined text-emerald-700 text-xl">task_alt</span>
            </div>
            <p className="text-3xl font-bold text-emerald-700">{completedCount}</p>
            <p className="text-xs text-on-surface-variant mt-1">Synthesized narrative reports ready</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-surface-container-highest shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Priority Alerts</span>
              <span className="material-symbols-outlined text-red-600 text-xl">warning</span>
            </div>
            <p className="text-3xl font-bold text-red-700">0</p>
            <p className="text-xs text-on-surface-variant mt-1">Plagiarism or gate check flags</p>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-xl border border-surface-container-highest p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">article</span>
              <span>Recent Student Submissions</span>
            </h2>
            <span className="text-xs text-on-surface-variant font-medium">Updated in real-time</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-on-surface-variant text-sm">
              Loading student thesis submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant text-sm space-y-3">
              <p>No thesis submissions found in system database.</p>
              <Link
                to="/thesis/upload"
                className="inline-block px-5 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors"
              >
                Upload First Student Thesis
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low text-primary uppercase font-bold border-b border-surface-container-high">
                    <th className="p-3">Student & Title</th>
                    <th className="p-3">Degree</th>
                    <th className="p-3">Gate Check</th>
                    <th className="p-3">Plagiarism</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-primary text-sm">{sub.student_name || 'Anonymous Student'}</p>
                        <p className="text-on-surface-variant text-[11px] truncate max-w-xs">{sub.title}</p>
                      </td>

                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                          sub.degree_level === 'undergraduate'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : sub.degree_level === 'msc'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : sub.degree_level === 'phd'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {sub.degree_level === 'undergraduate'
                            ? 'BSc / Undergrad'
                            : sub.degree_level === 'msc'
                            ? 'MSc (Taught)'
                            : sub.degree_level === 'phd'
                            ? 'PhD (Doctoral)'
                            : 'MPhil (Research)'}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          sub.preliminary_check_passed !== false
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {sub.preliminary_check_passed !== false ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>

                      <td className="p-3 font-semibold text-primary">
                        {sub.plagiarism_score !== null ? `${sub.plagiarism_score}%` : 'N/A'}
                      </td>

                      <td className="p-3">
                        {sub.percentage === null || sub.percentage === undefined ? (
                          <span className="text-[11px] text-on-surface-variant">Not graded</span>
                        ) : (
                          <>
                            <span className="font-bold text-primary text-sm">{sub.total_score} / {sub.max_possible}</span>
                            <span className="text-[11px] text-on-surface-variant block">
                              ({sub.percentage}%)
                              {sub.grade && (
                                <span className={`ml-1 font-bold ${
                                  sub.grade === 'A' ? 'text-emerald-700'
                                    : sub.grade === 'B' ? 'text-emerald-600'
                                    : sub.grade === 'C' ? 'text-amber-700'
                                    : sub.grade === 'E' ? 'text-orange-700'
                                    : 'text-red-700'
                                }`}>
                                  {sub.grade} · {sub.grade_interpretation}
                                </span>
                              )}
                            </span>
                            {sub.unscored_criteria > 0 && (
                              <span className="text-[10px] text-red-700 block">
                                {sub.unscored_criteria} criteri{sub.unscored_criteria === 1 ? 'on' : 'a'} not scored
                              </span>
                            )}
                          </>
                        )}
                      </td>

                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 font-semibold text-[11px] rounded-full capitalize ${
                          sub.status === 'failed' || sub.status === 'preliminary_check_failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-surface-container text-primary'
                        }`} title={sub.error_detail || ''}>
                          {sub.status === 'preliminary_check_failed' ? 'not assessable' : sub.status}
                        </span>
                      </td>

                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => navigate(`/thesis/submission/${sub.id}/scoring`)}
                          className="px-3 py-1 bg-surface-container-low border border-outline-variant text-primary text-[11px] font-semibold rounded hover:bg-surface-container transition-colors"
                        >
                          Score
                        </button>
                        <button
                          onClick={() => navigate(`/thesis/submission/${sub.id}/report`)}
                          className="px-3 py-1 bg-primary text-white text-[11px] font-semibold rounded hover:bg-primary-container transition-colors"
                        >
                          Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
