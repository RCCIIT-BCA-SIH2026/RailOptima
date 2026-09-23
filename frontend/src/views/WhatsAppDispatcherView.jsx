import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  RefreshCw,
  Send,
  Radio,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  UserCheck,
  Languages,
  ShieldCheck,
  Zap,
  ArrowRightLeft,
  ChevronRight,
  Sparkles,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  CheckCheck
} from 'lucide-react';
import apiClient from '../api/client';

export default function WhatsAppDispatcherView() {
  const [subscribers, setSubscribers] = useState([]);
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [logs, setLogs] = useState([]);
  const [resequenceData, setResequenceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resequencing, setResequencing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [newSub, setNewSub] = useState({
    full_name: '',
    phone_number: '',
    crew_id: '',
    role: 'Junior Engineer',
    department: 'Engineering',
    language_pref: 'en'
  });
  const [showAddSubModal, setShowAddSubModal] = useState(false);

  const chatScrollRef = useRef(null);

  useEffect(() => {
    fetchSubscribers();
    fetchLogs();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [logs]);

  const fetchSubscribers = async () => {
    try {
      const res = await apiClient.get('/whatsapp/subscribers');
      const list = res.data.subscribers || [];
      setSubscribers(list);
      if (list.length > 0 && !selectedSubscriber) {
        setSelectedSubscriber(list[0]);
      }
    } catch (err) {
      console.error("Failed to load subscribers", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await apiClient.get('/whatsapp/logs?limit=100');
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error("Failed to load logs", err);
    }
  };

  const handleTriggerResequence = async () => {
    setResequencing(true);
    try {
      const res = await apiClient.post('/whatsapp/trigger-resequence', {
        delayed_train_number: '12002',
        delay_minutes: 75,
        target_pit_line: 'Pit Line 3',
        section_name: 'New Delhi Depot Yard'
      });
      setResequenceData(res.data);
      await fetchLogs();
    } catch (err) {
      console.error("Failed to trigger re-sequence", err);
    } finally {
      setResequencing(false);
    }
  };

  const handleSendSimulatedReply = async (customText) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || !selectedSubscriber) return;

    setLoading(true);
    try {
      await apiClient.post('/whatsapp/simulate-inbound', {
        phone_number: selectedSubscriber.phone_number,
        message_body: textToSend
      });
      setInputText('');
      await fetchLogs();
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubscriber = async (e) => {
    e.preventDefault();
    if (!newSub.full_name || !newSub.phone_number) return;
    try {
      await apiClient.post('/whatsapp/subscribers', newSub);
      setNewSub({
        full_name: '',
        phone_number: '',
        crew_id: '',
        role: 'Junior Engineer',
        department: 'Engineering',
        language_pref: 'en'
      });
      setShowAddSubModal(false);
      await fetchSubscribers();
    } catch (err) {
      console.error("Failed to add subscriber", err);
    }
  };

  // Filter message stream for current selected subscriber
  const activeChatLogs = logs
    .filter(l => selectedSubscriber && l.phone_number === selectedSubscriber.phone_number)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-card-premium p-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-slate-900/90 via-emerald-950/40 to-slate-900/90 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <MessageSquare className="w-64 h-64 text-emerald-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Zero-App WhatsApp Field Dispatcher
              </span>
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5" />
                BN / HI / EN / Hinglish
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              RailOptima Field Crew Dispatch & Dynamic Re-Sequencer
            </h1>
            <p className="mt-1 text-slate-300 max-w-2xl text-sm leading-relaxed">
              2-way operational WhatsApp dispatch engine linking CP-SAT optimizer to ground staff. Autonomously swaps servicing order when trains are delayed and handles 2-way track possession status tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerResequence}
              disabled={resequencing}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2 transform active:scale-95 disabled:opacity-50"
            >
              <ArrowRightLeft className={`w-5 h-5 ${resequencing ? 'animate-spin' : ''}`} />
              Simulate Train Delay & Swap
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Crew Selector + WhatsApp Simulator + Re-sequence Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Crew Subscriber Directory (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/80">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Field Crew Subscribers ({subscribers.length})
              </h2>
              <button
                onClick={() => setShowAddSubModal(true)}
                className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg hover:bg-emerald-500/30 transition-all"
              >
                + Register Crew
              </button>
            </div>

            <div className="mt-3 space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {subscribers.map((sub) => {
                const isSelected = selectedSubscriber?.phone_number === sub.phone_number;
                return (
                  <div
                    key={sub.phone_number}
                    onClick={() => setSelectedSubscriber(sub)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-950/60 to-slate-900 border-emerald-500/60 ring-1 ring-emerald-500/40'
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-emerald-400 border border-emerald-500/30">
                          {sub.full_name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-1.5">
                            {sub.full_name}
                            {sub.language_pref === 'bn' && (
                              <span className="px-1.5 py-0.5 bg-sky-500/20 text-sky-300 text-[10px] font-bold rounded">বাংলা</span>
                            )}
                            {sub.language_pref === 'hi' && (
                              <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-300 text-[10px] font-bold rounded">हिंदी</span>
                            )}
                            {sub.language_pref === 'en' && (
                              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded">EN</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            {sub.role} • {sub.assigned_gang || 'Gang Alpha'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-500 ${isSelected ? 'text-emerald-400' : ''}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Resequence Status Badge */}
          {resequenceData && (
            <div className="glass-card p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 text-white space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Zap className="w-4 h-4" />
                Live Task Re-Sequencer Active
              </div>
              <div className="text-xs space-y-1 text-slate-300">
                <div>🚨 <strong className="text-amber-300">Train A ({resequenceData.delayed_train.train_number}):</strong> Delayed +{resequenceData.delayed_train.delay_minutes}m (Revised ETA: {resequenceData.delayed_train.revised_eta})</div>
                <div>⚡ <strong className="text-emerald-300">Train B ({resequenceData.promoted_train.train_number}):</strong> Advanced to Active Window ({resequenceData.promoted_train.assigned_window})</div>
                <div>📍 Location: {resequenceData.promoted_train.location}</div>
              </div>
            </div>
          )}
        </div>

        {/* Center/Right Column: Live WhatsApp Mobile Simulator (8 Cols) */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* WhatsApp Mobile Device Mockup (7 Cols) */}
          <div className="md:col-span-7 flex justify-center">
            <div className="w-full max-w-sm bg-slate-950 rounded-[36px] border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[650px] relative">
              
              {/* WhatsApp Header */}
              <div className="bg-emerald-800 px-4 py-3 flex items-center justify-between text-white shadow-md z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 border border-white/30 flex items-center justify-center font-bold text-white text-sm">
                    RO
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1.5">
                      RailOptima Dispatcher
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                    </div>
                    <div className="text-[11px] text-emerald-200 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                      Active Crew: {selectedSubscriber?.full_name || 'Ground Staff'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-emerald-100">
                  <Phone className="w-4 h-4 cursor-pointer hover:text-white" />
                  <Video className="w-4 h-4 cursor-pointer hover:text-white" />
                  <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white" />
                </div>
              </div>

              {/* Chat Canvas Stream */}
              <div
                ref={chatScrollRef}
                className="flex-1 bg-slate-900/90 p-3 overflow-y-auto space-y-3 font-sans"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 80%)`
                }}
              >
                {activeChatLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 space-y-2">
                    <MessageSquare className="w-10 h-10 text-slate-600" />
                    <p className="text-xs">No active chat log for this recipient.</p>
                    <p className="text-[11px] text-slate-600">Click "Simulate Train Delay & Swap" or use quick replies below to dispatch alerts!</p>
                  </div>
                ) : (
                  activeChatLogs.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutbound ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-wrap shadow-md ${
                            isOutbound
                              ? 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-none'
                              : 'bg-emerald-700 text-white rounded-tr-none'
                          }`}
                        >
                          {msg.content}

                          <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${isOutbound ? 'text-slate-400' : 'text-emerald-200'}`}>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Interactive Inbound Input Bar */}
              <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
                <Smile className="w-5 h-5 text-slate-500 cursor-pointer" />
                <Paperclip className="w-5 h-5 text-slate-500 cursor-pointer" />
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendSimulatedReply()}
                  placeholder={selectedSubscriber ? `Reply as ${selectedSubscriber.full_name}...` : 'Type WhatsApp message...'}
                  className="flex-1 bg-slate-900 text-white text-xs px-3 py-2.5 rounded-full border border-slate-800 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => handleSendSimulatedReply()}
                  disabled={loading || !inputText.trim()}
                  className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Quick-Reply Pad & Multilingual Test Bench (5 Cols) */}
          <div className="md:col-span-5 space-y-4">
            <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Quick-Reply Keypad (1-Key Execution)
              </h3>
              <p className="text-xs text-slate-400">
                Simulate single-key crew replies directly from the field:
              </p>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleSendSimulatedReply('1')}
                  className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-xs font-semibold text-white flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-mono font-bold rounded">1 / ACK</span>
                    Acknowledge Work Order
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </button>

                <button
                  onClick={() => handleSendSimulatedReply('START')}
                  className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-xs font-semibold text-white flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-mono font-bold rounded">START</span>
                    Track Possession Start
                  </span>
                  <Wrench className="w-4 h-4 text-emerald-400" />
                </button>

                <button
                  onClick={() => handleSendSimulatedReply('DONE')}
                  className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-xs font-semibold text-white flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 font-mono font-bold rounded">DONE</span>
                    Work Finished & Track Fit
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                </button>

                <button
                  onClick={() => handleSendSimulatedReply('STATUS')}
                  className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-xs font-semibold text-white flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 font-mono font-bold rounded">STATUS</span>
                    Live Train ETA Inquiry
                  </span>
                  <Clock className="w-4 h-4 text-purple-400" />
                </button>

                <button
                  onClick={() => handleSendSimulatedReply('DELAY +15')}
                  className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl text-xs font-semibold text-white flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 font-mono font-bold rounded">DELAY +15</span>
                    Request 15m Block Extension
                  </span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </button>
              </div>

              {/* Multilingual Sample Presets */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300">Multilingual Query Presets:</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleSendSimulatedReply('Train A kokhon asbe?')}
                    className="px-2.5 py-1 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-500/40 text-sky-200 text-xs rounded-lg transition-all"
                  >
                    🇧🇩 Train A kokhon asbe?
                  </button>
                  <button
                    onClick={() => handleSendSimulatedReply('Train B ka kaam ho gaya')}
                    className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 text-amber-200 text-xs rounded-lg transition-all"
                  >
                    🇮🇳 Train B ka kaam ho gaya
                  </button>
                  <button
                    onClick={() => handleSendSimulatedReply('Found rail crack at KM 824/12')}
                    className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-200 text-xs rounded-lg transition-all"
                  >
                    🚨 Flaw Report (KM 824/12)
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Bottom Section: Audit Trail & Tool Execution Log Table */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            Live Interaction Audit Trail & Tool Actions Executed
          </h3>
          <button
            onClick={fetchLogs}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Logs
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Phone / Crew</th>
                <th className="py-3 px-4">Direction</th>
                <th className="py-3 px-4">Message Body</th>
                <th className="py-3 px-4">Intent</th>
                <th className="py-3 px-4">Tool Action</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-500">No message logs recorded yet.</td>
                </tr>
              ) : (
                logs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-all">
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {log.phone_number}
                    </td>
                    <td className="py-3 px-4">
                      {log.direction === 'inbound' ? (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold">INBOUND</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded text-[10px] font-bold">OUTBOUND</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate font-mono text-slate-200">
                      {log.content}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-300">
                      {log.intent_detected || '-'}
                    </td>
                    <td className="py-3 px-4">
                      {log.tool_executed ? (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded font-mono text-[10px] font-bold">
                          {log.tool_executed}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      {log.delivery_status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Subscriber Modal */}
      {showAddSubModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl border border-slate-700 bg-slate-900 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Register Field Crew Subscriber</h3>
            
            <form onSubmit={handleAddSubscriber} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400">Full Name</label>
                <input
                  type="text"
                  required
                  value={newSub.full_name}
                  onChange={(e) => setNewSub({...newSub, full_name: e.target.value})}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">WhatsApp Phone Number</label>
                <input
                  type="text"
                  required
                  value={newSub.phone_number}
                  onChange={(e) => setNewSub({...newSub, phone_number: e.target.value})}
                  placeholder="e.g. +919876543210"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Crew ID</label>
                  <input
                    type="text"
                    value={newSub.crew_id}
                    onChange={(e) => setNewSub({...newSub, crew_id: e.target.value})}
                    placeholder="CREW-DEL-05"
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Language Preference</label>
                  <select
                    value={newSub.language_pref}
                    onChange={(e) => setNewSub({...newSub, language_pref: e.target.value})}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="en">English (EN)</option>
                    <option value="bn">Bengali (বাংলা)</option>
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="hinglish">Hinglish</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Role</label>
                  <select
                    value={newSub.role}
                    onChange={(e) => setNewSub({...newSub, role: e.target.value})}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Junior Engineer">Junior Engineer</option>
                    <option value="Gangmate">Gangmate</option>
                    <option value="Track Maintainer">Track Maintainer</option>
                    <option value="OHE Lineman">OHE Lineman</option>
                    <option value="Pit Line Tech">Pit Line Tech</option>
                    <option value="S&T Maintainer">S&T Maintainer</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Department</label>
                  <select
                    value={newSub.department}
                    onChange={(e) => setNewSub({...newSub, department: e.target.value})}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Electrical/TRD">Electrical/TRD</option>
                    <option value="S&T">S&T</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSubModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Register Crew Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
