import React, { useEffect, useState } from 'react';
import { CheckSquare, CheckCircle2, XCircle, Clock, ShieldCheck, HelpCircle } from 'lucide-react';
import apiClient from '../api/client';
import AIExplanationModal from '../components/AIExplanationModal';

export default function ApprovalCenterView({ activeRole }) {
  const [pendingBlocks, setPendingBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [explainingBlockId, setExplainingBlockId] = useState(null);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/approvals/pending');
      setPendingBlocks(res.data.blocks || []);
    } catch (err) {
      console.error("Failed to load approvals", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (blockId, action) => {
    try {
      const res = await apiClient.post(`/approvals/${blockId}/action`, {
        action: action,
        comments: `${action} digitally signed by ${activeRole}`
      });
      setActionSuccess(`Block ${blockId} ${action.toLowerCase()} and saved to SQLite & MongoDB Atlas stream.`);
      // Update block in list rather than removing, so user sees clear green approval marking
      setPendingBlocks(prev => prev.map(b => (b.block_id === blockId || b.id === blockId) ? { ...b, status: action, action_recorded: action } : b));
    } catch (err) {
      console.error("Approval action failed", err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Officer Approval Center</span>
            <span className="text-xs font-mono font-normal text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
              Role: {activeRole} Authorization
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Review AI-optimized maintenance blocks, evaluate delay impacts, and provide executive digital sign-offs.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-700 text-emerald-300 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">&times;</button>
        </div>
      )}

      {/* Pending Queue Table */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl overflow-hidden shadow-xl space-y-4">
        <div className="p-5 border-b border-slate-700/60 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-sm">Blocks Clearance Queue ({pendingBlocks.length})</h3>
            <p className="text-xs text-slate-400">Proposed by automatic optimization engine & awaiting DRM concurrence</p>
          </div>
          <button
            onClick={fetchPendingApprovals}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            Refresh Queue
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 font-semibold bg-slate-900/50">
                <th className="p-3.5">Block Code</th>
                <th className="p-3.5">Corridor / Section</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Window (Start &rarr; End)</th>
                <th className="p-3.5">Duration</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">AI Confidence</th>
                <th className="p-3.5 text-right">Approval Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading pending approval items...
                  </td>
                </tr>
              ) : pendingBlocks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-white">All Clear! No Blocks Pending Review</p>
                    <p className="text-xs text-slate-500 mt-1">Run automatic optimization to generate new proposed block plans.</p>
                  </td>
                </tr>
              ) : pendingBlocks.map((b) => {
                const isApproved = b.status === 'Approved' || b.action_recorded === 'Approved';
                const isRejected = b.status === 'Rejected' || b.action_recorded === 'Rejected';

                return (
                  <tr
                    key={b.block_id || b.id}
                    className={`transition ${
                      isApproved
                        ? 'bg-emerald-950/40 border-l-4 border-l-emerald-500'
                        : isRejected
                          ? 'bg-rose-950/40 border-l-4 border-l-rose-500'
                          : 'hover:bg-slate-700/30'
                    }`}
                  >
                    <td className="p-3.5 font-mono font-bold text-white">
                      <div className="flex items-center space-x-1.5">
                        <span>{b.block_code}</span>
                        {isApproved && (
                          <span className="bg-emerald-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded">✓ SANCTIONED</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-200">{b.section_code}</div>
                      <div className="text-[11px] text-slate-400">{b.corridor}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.block_type === 'Integrated'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {b.block_type}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      {new Date(b.requested_start_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} &rarr; {new Date(b.requested_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">{b.duration_hours} hrs</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-700">
                        {b.lead_department}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className="text-blue-400 font-bold">{(b.ai_confidence * 100).toFixed(0)}%</span>
                    </td>
                    <td className="p-3.5 text-right">
                      {isApproved ? (
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600/90 text-white rounded-lg text-xs font-black shadow-md border border-emerald-400">
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>✓ APPROVED BY {activeRole} (SAVED TO DB & MONGODB)</span>
                        </div>
                      ) : isRejected ? (
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-900/90 text-rose-200 rounded-lg text-xs font-bold border border-rose-700">
                          <XCircle className="w-4 h-4 text-rose-400" />
                          <span>REJECTED BY {activeRole}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setExplainingBlockId(b.block_id)}
                            className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[11px] font-medium transition cursor-pointer"
                          >
                            Explain AI
                          </button>
                          <button
                            onClick={() => handleAction(b.block_id, 'Approved')}
                            className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer shadow-md shadow-emerald-600/20"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve & Grant</span>
                          </button>
                          <button
                            onClick={() => handleAction(b.block_id, 'Rejected')}
                            className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-300 border border-rose-700 rounded text-[11px] font-medium transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Explanation Modal */}
      {explainingBlockId && (
        <AIExplanationModal
          blockId={explainingBlockId}
          onClose={() => setExplainingBlockId(null)}
        />
      )}
    </div>
  );
}
