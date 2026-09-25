import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  UserCheck, 
  MessageSquare,
  FileSignature,
  ArrowRight,
  Check
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function ApprovalsView() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // { approval, actionType: 'Approve' | 'Reject' }
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/approvals/pending');
      const data = res.data;
      const list = data?.blocks || data?.approvals || (Array.isArray(data) ? data : []);
      setApprovals(list);
    } catch (err) {
      console.error("Failed to load approvals", err);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!activeModal) return;
    try {
      setSubmitting(true);
      const blkId = activeModal.approval.block_id || activeModal.approval.id;
      const actionName = activeModal.actionType === 'Approve' ? 'Approved' : 'Rejected';
      await apiClient.post(`/approvals/${blkId}/action`, {
        action: actionName,
        comments: comments || `${activeModal.actionType}d by Railway Officer`
      });

      setActionSuccessMsg(`Block possession ${activeModal.approval.block_code} successfully ${activeModal.actionType.toLowerCase()}d and recorded in MongoDB Atlas.`);
      const currentBlkId = blkId;
      setApprovals(prev => prev.map(a => (a.block_id === currentBlkId || a.id === currentBlkId) ? { ...a, status: actionName } : a));
      setActiveModal(null);
      setComments('');
      setTimeout(() => setActionSuccessMsg(null), 6000);
    } catch (err) {
      console.error("Approval action failed", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <CheckCircle2 className="w-6 h-6 text-amber-600" />
              <span>Officer Approval Workflow & Digital Signatures</span>
            </h2>
            <Badge variant="success">LIVE DRM WORKFLOW</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Divisional Railway Manager (DRM) and Branch Officers (Sr.DEN, Sr.DOM, Sr.DSTE) multi-tier concurrence queue.
          </p>
        </div>

        <Badge variant="secondary" className="px-3 py-1 font-mono text-xs font-bold">
          {approvals.length} Clearance Items in Queue
        </Badge>
      </div>

      {/* Success Banner */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center justify-between text-emerald-900 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <Badge variant="success">AUDIT LOG PERSISTED TO MONGODB</Badge>
        </div>
      )}

      {/* Pending Approvals Queue */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span>Loading pending approval queue...</span>
          </div>
        ) : approvals.length === 0 ? (
          <Card className="p-12 text-center text-slate-500 shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">All Clearance Requests Processed</h4>
            <p className="text-xs text-slate-400 mt-1">There are no maintenance blocks pending DRM approval at this time.</p>
          </Card>
        ) : (
          approvals.map((appr) => {
            const isApproved = appr.status === 'Approved';
            const isRejected = appr.status === 'Rejected';

            return (
              <Card
                key={appr.id || appr.block_id}
                className={`transition ${
                  isApproved
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-1 ring-emerald-400/30'
                    : isRejected
                      ? 'border-rose-300 bg-rose-50/50'
                      : 'hover:shadow-md'
                }`}
              >
                <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-extrabold text-sm text-slate-900">
                        {appr.block_code}
                      </span>
                      {isApproved ? (
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-xs flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                          <span>✓ DRM SANCTIONED & SAVED TO DB</span>
                        </span>
                      ) : isRejected ? (
                        <Badge variant="critical">Rejected</Badge>
                      ) : (
                        <Badge variant="warning">{appr.status || 'Pending Review'}</Badge>
                      )}
                      <span className="text-xs text-slate-500 font-medium">
                        Section: <b className="text-blue-700 font-mono">{appr.section_code}</b>
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{appr.duration_hours || 3.0} Hours Duration</span>
                      </span>
                      <span>Lead Dept: <b className="text-slate-900">{appr.lead_department || 'ENG'}</b></span>
                      <span>Requested By: <b className="text-slate-900">{appr.officer_title || 'Sr. Divisional Engineer (Civil)'}</b></span>
                    </div>

                    {appr.justification && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-2">
                        <b>Engineering Justification:</b> {appr.justification}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {isApproved ? (
                      <div className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-lg shadow-md flex items-center space-x-1.5 border border-emerald-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        <span>✓ Sanctioned & Saved to MongoDB</span>
                      </div>
                    ) : isRejected ? (
                      <div className="px-3 py-1.5 bg-rose-100 text-rose-800 text-xs font-bold rounded-lg border border-rose-300">
                        Rejected & Returned
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="critical"
                          size="sm"
                          onClick={() => setActiveModal({ approval: appr, actionType: 'Reject' })}
                          className="flex items-center space-x-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </Button>

                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => setActiveModal({ approval: appr, actionType: 'Approve' })}
                          className="flex items-center space-x-1 shadow-md shadow-emerald-600/20"
                        >
                          <FileSignature className="w-3.5 h-3.5" />
                          <span>Approve & Grant Block</span>
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Confirmation & Signature Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {activeModal.actionType} Block Possession
              </h3>
              <Badge variant={activeModal.actionType === 'Approve' ? 'success' : 'critical'}>
                {activeModal.approval.block_code}
              </Badge>
            </div>

            <p className="text-xs text-slate-600">
              You are applying an official digital signature as an authorized Railway Officer for section <b>{activeModal.approval.section_code}</b>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Concurrence / Reason Comments
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Enter concurrence comments or regulation conditions..."
                rows={3}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant={activeModal.actionType === 'Approve' ? 'success' : 'critical'}
                size="sm"
                onClick={handleExecuteAction}
                disabled={submitting}
              >
                {submitting ? 'Recording...' : `Confirm ${activeModal.actionType}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

