import React, { useEffect, useState } from 'react';
import { X, Sparkles, Clock, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import apiClient from '../api/client';

export default function AIExplanationModal({ blockId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState(null);

  useEffect(() => {
    if (blockId) {
      fetchExplanation();
    }
  }, [blockId]);

  const fetchExplanation = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/optimization/explain/${blockId}`);
      setExplanation(res.data);
    } catch (err) {
      console.error("Failed to fetch explanation", err);
    } finally {
      setLoading(false);
    }
  };

  if (!blockId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">AI Decision Explanation</h3>
              <p className="text-xs text-slate-400">Block #{explanation?.block_code || blockId} • Section {explanation?.section_code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400">Synthesizing multi-objective rationale...</p>
            </div>
          ) : explanation ? (
            <>
              {/* Confidence badge */}
              <div className="flex items-center justify-between bg-blue-950/40 border border-blue-800/60 p-3 rounded-lg">
                <span className="text-xs text-blue-300 font-medium">Model Confidence Metric</span>
                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-900/60 px-2.5 py-1 rounded">
                  {(explanation.confidence_score * 100).toFixed(0)}% Certainty
                </span>
              </div>

              {/* Rationale Pillars */}
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-800/50 rounded-lg border border-slate-700/60">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 mb-1.5">
                    <Clock className="w-4 h-4" />
                    <span>Time Window Justification</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {explanation.window_justification}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-800/50 rounded-lg border border-slate-700/60">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 mb-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Multi-Department Integrated Shadow Synergy</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {explanation.synergy_justification}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-800/50 rounded-lg border border-slate-700/60">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-amber-400 mb-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>Train Regulation & Punctuality Impact</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {explanation.traffic_justification}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-800/50 rounded-lg border border-slate-700/60">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-purple-400 mb-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Asset Safety Payoff</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {explanation.safety_payoff}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-400 text-center py-6">Failed to load explanation for this block.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-800/60 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
