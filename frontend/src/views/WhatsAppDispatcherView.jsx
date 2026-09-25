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
  MoreVertical,
  Smile,
  Paperclip,
  CheckCheck,
  Trash2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff
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
  const [viewMode, setViewMode] = useState('selected'); // 'selected' or 'all'
  const [newSub, setNewSub] = useState({
    full_name: '',
    phone_number: '',
    crew_id: '',
    role: 'Junior Engineer',
    department: 'Engineering',
    language_pref: 'en'
  });
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callState, setCallState] = useState('ringing'); // 'ringing' or 'connected'
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [callStatus, setCallStatus] = useState('Connecting...');

  const formatMsgTime = (dateStr) => {
    if (!dateStr) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    try {
      let str = String(dateStr);
      if (!str.endsWith('Z') && !str.includes('+')) {
        str = str.replace(' ', 'T') + 'Z';
      }
      const d = new Date(str);
      if (isNaN(d.getTime())) {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  };

  // OTP Verification States
  const [otpStep, setOtpStep] = useState(1); // 1 = input phone & crew details, 2 = verify 6-digit OTP
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [otpPreviewMsg, setOtpPreviewMsg] = useState(null);
  const [otpErrorMsg, setOtpErrorMsg] = useState(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  // Access Granted State
  const [isAccessGranted, setIsAccessGranted] = useState(() => {
    return localStorage.getItem('ir_whatsapp_access_granted') === 'true';
  });
  const [verifiedPhone, setVerifiedPhone] = useState(() => {
    return localStorage.getItem('ir_whatsapp_verified_phone') || '';
  });

  const handleRevokeAccess = () => {
    localStorage.removeItem('ir_whatsapp_access_granted');
    localStorage.removeItem('ir_whatsapp_verified_phone');
    setIsAccessGranted(false);
    setVerifiedPhone('');
  };

  const chatScrollRef = useRef(null);
  const callTimerRef = useRef(null);
  const audioCtxRef = useRef(null);

  const cleanDigits = (phone) => (phone ? String(phone).replace(/\D/g, '') : '');

  const isPhoneMatch = (p1, p2) => {
    const c1 = cleanDigits(p1);
    const c2 = cleanDigits(p2);
    if (!c1 || !c2) return false;
    return c1 === c2 || c1.endsWith(c2) || c2.endsWith(c1);
  };

  const fetchSubscribers = async () => {
    try {
      const res = await apiClient.get('/whatsapp/subscribers');
      const list = res.data?.subscribers || res.data || [];
      const safeList = Array.isArray(list) ? list : [];
      setSubscribers(safeList);
      
      const storedVerified = localStorage.getItem('ir_whatsapp_verified_phone') || verifiedPhone;
      if (safeList.length > 0) {
        const matched = storedVerified 
          ? safeList.find(s => isPhoneMatch(s.phone_number, storedVerified))
          : null;
        setSelectedSubscriber(matched || safeList[0]);
      }
    } catch (err) {
      console.error("Failed to load WhatsApp subscribers", err);
      setSubscribers([]);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await apiClient.get('/whatsapp/logs');
      const list = res.data?.logs || res.data || [];
      const safeList = Array.isArray(list) ? list : [];
      setLogs(safeList);
    } catch (err) {
      console.error("Failed to load WhatsApp message logs", err);
      setLogs([]);
    }
  };

  const handleClearLogs = async () => {
    try {
      await apiClient.delete('/whatsapp/logs');
      setLogs([]);
    } catch (err) {
      console.error("Failed to clear WhatsApp message logs", err);
    }
  };

  const handleDeleteSingleLog = async (logId) => {
    try {
      await apiClient.delete(`/whatsapp/logs/${logId}`);
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    } catch (err) {
      console.error("Failed to delete message log", err);
    }
  };

  useEffect(() => {
    fetchSubscribers();
    fetchLogs();
    const interval = setInterval(() => {
      fetchLogs();
      fetchSubscribers();
    }, 3000);
    return () => {
      clearInterval(interval);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, []);

  const startRingingAudio = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      setTimeout(() => {
        try {
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
          setTimeout(() => {
            osc1.stop();
            osc2.stop();
            ctx.close();
          }, 300);
        } catch (e) {}
      }, 1800);
    } catch (err) {
      console.warn("Audio context ringback unavailable", err);
    }
  };

  const stopRingingAudio = () => {
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  const handleMakeCall = async () => {
    if (!selectedSubscriber) return;
    const phone = selectedSubscriber.phone_number || verifiedPhone || '';
    const cleanPhoneDigits = cleanDigits(phone);

    // 1. Immediately trigger native device phone dialer (opens Call App on iOS/Android/macOS)
    if (cleanPhoneDigits) {
      try {
        window.open(`tel:+${cleanPhoneDigits}`, '_self');
      } catch (e) {
        console.warn("Direct phone dialer trigger error", e);
      }
    }

    // 2. Open in-browser call modal overlay directly in Ringing mode
    setShowCallModal(true);
    setCallState('ringing');
    setCallStatus('Ringing... (Waiting for answer)');
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeaker(true);

    startRingingAudio();

    if (callTimerRef.current) clearInterval(callTimerRef.current);

    try {
      await apiClient.post('/whatsapp/make-voice-call', {
        phone_number: phone,
        message_body: 'CALL_REQUEST'
      });
      await fetchLogs();
    } catch (err) {
      console.error("Failed to trigger call log", err);
    }
  };

  const handleAcceptCall = () => {
    stopRingingAudio();
    setCallState('connected');
    setCallStatus('Connected (Operational Voice Stream)');
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const handleEndCall = () => {
    stopRingingAudio();
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setShowCallModal(false);
    setCallState('ringing');
    setCallDuration(0);
    setCallStatus('Ringing...');
  };

  const formatCallTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
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

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!newSub.full_name || !newSub.phone_number) return;
    setOtpErrorMsg(null);
    setOtpSending(true);

    let formattedPhone = newSub.phone_number.trim().replace(/\s+/g, '').replace(/-/g, '');
    if (/^\d{10}$/.test(formattedPhone)) {
      formattedPhone = `+91${formattedPhone}`;
    } else if (!formattedPhone.startsWith('+') && formattedPhone.length >= 10) {
      formattedPhone = `+${formattedPhone}`;
    }

    const payloadToSubmit = { ...newSub, phone_number: formattedPhone };
    setNewSub(payloadToSubmit);

    try {
      await apiClient.post('/whatsapp/request-otp', payloadToSubmit);
      setOtpStep(2);
      await fetchLogs();
    } catch (err) {
      console.error("Failed to request WhatsApp OTP", err);
      setOtpErrorMsg(err.response?.data?.detail || "Failed to dispatch WhatsApp OTP code. Please verify phone number format.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCodeInput.trim()) return;
    setOtpErrorMsg(null);
    setOtpVerifying(true);
    try {
      const res = await apiClient.post('/whatsapp/verify-otp', {
        phone_number: newSub.phone_number,
        otp_code: otpCodeInput.trim()
      });
      const verifiedSub = res.data.subscriber;
      const vPhone = verifiedSub?.phone_number || newSub.phone_number;
      localStorage.setItem('ir_whatsapp_access_granted', 'true');
      localStorage.setItem('ir_whatsapp_verified_phone', vPhone);
      setVerifiedPhone(vPhone);
      setIsAccessGranted(true);

      setNewSub({
        full_name: '',
        phone_number: '',
        crew_id: '',
        role: 'Junior Engineer',
        department: 'Engineering',
        language_pref: 'en'
      });
      setOtpCodeInput('');
      setOtpStep(1);
      setShowAddSubModal(false);
      setOtpPreviewMsg(null);
      await fetchSubscribers();
      await fetchLogs();
      if (verifiedSub) setSelectedSubscriber(verifiedSub);
    } catch (err) {
      console.error("OTP Verification failed", err);
      setOtpErrorMsg(err.response?.data?.detail || "Invalid 6-digit OTP verification code. Please check WhatsApp message and try again.");
    } finally {
      setOtpVerifying(false);
    }
  };

  // Defensive array handling for safety against unhandled API errors
  const safeLogs = Array.isArray(logs) ? logs : [];
  const rawSubscribers = Array.isArray(subscribers) ? subscribers : [];
  const safeSubscribers = verifiedPhone 
    ? rawSubscribers.filter(s => isPhoneMatch(s.phone_number, verifiedPhone))
    : rawSubscribers;

  const activeChatLogs = safeLogs
    .filter(l => {
      if (!l) return false;
      if (verifiedPhone && !isPhoneMatch(l.phone_number, verifiedPhone)) return false;
      if (viewMode === 'all') return true;
      return selectedSubscriber && isPhoneMatch(l.phone_number, selectedSubscriber.phone_number);
    })
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

  // Render WhatsApp Access Gateway screen if phone number / OTP is not verified yet
  if (!isAccessGranted) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        {/* Gateway Card */}
        <div className="glass-card-premium p-10 rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900 via-emerald-950/40 to-slate-950 text-white shadow-2xl relative overflow-hidden text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/10">
            <MessageSquare className="w-10 h-10" />
          </div>

          <div className="max-w-xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>2-Step WhatsApp OTP Authentication Required</span>
            </div>

            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              RailOptima WhatsApp Dispatch Gateway
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              To access the 2-Way Operational WhatsApp Dispatcher, live train delay re-sequencing stream, and field crew messaging, please add your phone number and verify the 6-digit WhatsApp OTP code.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setNewSub({
                  full_name: '',
                  phone_number: '',
                  crew_id: '',
                  role: 'Junior Engineer',
                  department: 'Engineering',
                  language_pref: 'bn'
                });
                setOtpStep(1);
                setShowAddSubModal(true);
              }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-600/30 transition transform hover:scale-105 active:scale-95 inline-flex items-center space-x-2.5 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>📱 ADD PHONE NUMBER & VERIFY OTP</span>
            </button>
          </div>

          <div className="pt-6 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-center space-x-6 font-mono">
            <span>🔒 End-to-End Encrypted</span>
            <span>⚡ Meta WhatsApp Cloud API</span>
            <span>🌐 Multilingual (BN/HI/EN)</span>
          </div>
        </div>

        {/* 2-Step OTP Verification Assignment Modal */}
        {showAddSubModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-card p-6 rounded-2xl border border-emerald-500/30 bg-slate-900 max-w-md w-full space-y-4 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">
                    {otpStep === 1 ? 'Assign WhatsApp Phone Number' : 'Enter 6-Digit WhatsApp OTP'}
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded">
                  STEP {otpStep} OF 2
                </span>
              </div>

              {otpErrorMsg && (
                <div className="p-3 bg-rose-950/80 border border-rose-600/60 text-rose-200 text-xs rounded-xl flex items-center space-x-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{otpErrorMsg}</span>
                </div>
              )}

              {otpStep === 1 ? (
                <form onSubmit={handleRequestOtp} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Crew Member Full Name</label>
                    <input
                      type="text"
                      required
                      value={newSub.full_name}
                      onChange={(e) => setNewSub({...newSub, full_name: e.target.value})}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400">WhatsApp Phone Number (with Country Code)</label>
                    <input
                      type="text"
                      required
                      value={newSub.phone_number}
                      onChange={(e) => setNewSub({...newSub, phone_number: e.target.value})}
                      placeholder="e.g. +919876543210"
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">A 6-digit WhatsApp OTP verification code will be sent to this number.</span>
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

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddSubModal(false);
                        setOtpErrorMsg(null);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={otpSending}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {otpSending ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Sending WhatsApp OTP...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send WhatsApp OTP Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 bg-emerald-950/80 border border-emerald-600/60 rounded-xl text-xs text-emerald-300 font-semibold space-y-1">
                    <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>WhatsApp OTP Message Dispatched!</span>
                    </div>
                    <div className="text-slate-300 text-[11px] leading-relaxed">
                      🔐 6-digit WhatsApp OTP code sent to <strong className="text-emerald-300 font-mono">{newSub.phone_number}</strong>. Please check your WhatsApp messages and enter the code below.
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Enter 6-Digit WhatsApp Verification OTP:
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCodeInput}
                      onChange={(e) => setOtpCodeInput(e.target.value)}
                      placeholder="e.g. 482915"
                      className="w-full text-center tracking-[0.4em] font-mono text-xl font-bold bg-slate-950 border border-emerald-500/60 rounded-xl px-4 py-3 text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block text-center">Until this code is verified, access remains restricted.</span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep(1);
                        setOtpErrorMsg(null);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200 font-medium underline cursor-pointer"
                    >
                      &larr; Back to edit details
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddSubModal(false);
                          setOtpStep(1);
                          setOtpErrorMsg(null);
                        }}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={otpVerifying || otpCodeInput.length < 6}
                        className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {otpVerifying ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Verifying OTP...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                            <span>Verify OTP & Grant Access</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

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
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Zero-App WhatsApp Field Dispatcher
              </span>
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5" />
                BN / HI / EN / Hinglish
              </span>
              {verifiedPhone && (
                <span className="px-3 py-1 bg-emerald-600/30 border border-emerald-400 text-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Verified: {verifiedPhone}</span>
                  <button onClick={handleRevokeAccess} className="ml-1 text-[10px] text-slate-300 underline hover:text-white cursor-pointer">
                    (Re-verify)
                  </button>
                </span>
              )}
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
          <div className="glass-card-dark p-4 rounded-2xl border border-slate-800 bg-slate-900/95 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Field Crew Subscribers ({safeSubscribers.length})
              </h2>
              <button
                onClick={() => setShowAddSubModal(true)}
                className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg hover:bg-emerald-500/30 transition-all"
              >
                + Register Crew
              </button>
            </div>

            <div className="mt-3 space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {safeSubscribers.map((sub) => {
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
              <div className="bg-emerald-800 px-4 py-3 flex flex-col gap-2 text-white shadow-md z-10">
                <div className="flex items-center justify-between">
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
                        <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                        {viewMode === 'all'
                          ? `All Operational Stream (${safeLogs.length})`
                          : `Active Crew: ${selectedSubscriber?.full_name || 'Ground Staff'}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-100">
                    <button
                      onClick={handleMakeCall}
                      title={`Call ${selectedSubscriber?.full_name || 'Crew'}`}
                      className="p-1 hover:bg-emerald-700/60 rounded-full transition-all"
                    >
                      <Phone className="w-4 h-4 cursor-pointer hover:text-white" />
                    </button>
                    <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white" />
                  </div>
                </div>

                {/* Stream Filter Toggle Tab */}
                <div className="flex bg-emerald-950/70 p-1 rounded-lg border border-emerald-600/30 text-[11px]">
                  <button
                    onClick={() => setViewMode('selected')}
                    className={`flex-1 py-1 rounded font-bold transition-all ${
                      viewMode === 'selected' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-300 hover:text-white'
                    }`}
                  >
                    💬 {selectedSubscriber?.full_name?.split(' ')[0] || 'Selected Crew'}
                  </button>
                  <button
                    onClick={() => setViewMode('all')}
                    className={`flex-1 py-1 rounded font-bold transition-all ${
                      viewMode === 'all' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-300 hover:text-white'
                    }`}
                  >
                    📡 Live All Feed ({safeLogs.length})
                  </button>
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
                    <p className="text-xs font-semibold text-slate-400">
                      {viewMode === 'all' ? "No operational messages logged yet." : `No active chat log for ${selectedSubscriber?.full_name || 'this recipient'}.`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Send a message or click "Simulate Train Delay & Swap" to start live WhatsApp crew dispatch!
                    </p>
                  </div>
                ) : (
                  activeChatLogs.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';
                    const matchedSub = safeSubscribers.find(s => isPhoneMatch(s.phone_number, msg.phone_number));
                    const senderName = matchedSub ? matchedSub.full_name : msg.phone_number;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutbound ? 'items-start' : 'items-end'}`}
                      >
                        {viewMode === 'all' && (
                          <div className="text-[10px] text-slate-400 font-semibold px-1 mb-0.5">
                            {isOutbound ? `➡️ Outbound to ${senderName}` : `⬅️ Inbound from ${senderName}`}
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-wrap shadow-md ${
                            isOutbound
                              ? 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-none'
                              : 'bg-emerald-700 text-white rounded-tr-none'
                          }`}
                        >
                          {msg.content}

                          <div className={`mt-1.5 flex items-center justify-between gap-2 text-[10px] ${isOutbound ? 'text-slate-400' : 'text-emerald-200'}`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSingleLog(msg.id);
                              }}
                              title="Delete this message"
                              className="opacity-70 hover:opacity-100 hover:text-rose-400 transition-all p-0.5 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <div className="flex items-center gap-1">
                              <span>{formatMsgTime(msg.created_at)}</span>
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
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
            <div className="glass-card-dark p-4 rounded-2xl border border-slate-800 bg-slate-900/95 space-y-3 shadow-xl">
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
      <div className="glass-card-dark p-6 rounded-2xl border border-slate-800 bg-slate-950 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            Live Interaction Audit Trail & Tool Actions Executed
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearLogs}
              title="Purge message logs for clean slate"
              className="px-3.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-600/50 text-xs rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Logs
            </button>
            <button
              onClick={fetchLogs}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Logs
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-100">
            <thead className="bg-slate-950 text-slate-300 uppercase font-extrabold text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Time</th>
                <th className="py-3.5 px-4">Phone / Crew</th>
                <th className="py-3.5 px-4">Direction</th>
                <th className="py-3.5 px-4">Message Body</th>
                <th className="py-3.5 px-4">Intent</th>
                <th className="py-3.5 px-4">Tool Action</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/90">
              {safeLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 font-semibold text-sm">
                    No live message logs recorded yet. Send a message to start!
                  </td>
                </tr>
              ) : (
                safeLogs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/80 transition-all">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-300 whitespace-nowrap">
                      {formatMsgTime(log.created_at)}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-white font-mono whitespace-nowrap">
                      {log.phone_number}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {log.direction === 'inbound' ? (
                        <span className="px-2.5 py-1 bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 rounded text-[10px] font-extrabold tracking-wider">
                          INBOUND
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-sky-500/25 text-sky-300 border border-sky-400/50 rounded text-[10px] font-extrabold tracking-wider">
                          OUTBOUND
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm font-mono text-slate-100 font-medium text-xs leading-normal break-words">
                      {log.content}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-amber-300 font-mono text-xs whitespace-nowrap">
                      {log.intent_detected || '-'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {log.tool_executed ? (
                        <span className="px-2.5 py-1 bg-purple-900/60 text-purple-200 border border-purple-400/50 rounded font-mono text-[10px] font-extrabold">
                          {log.tool_executed}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400 font-extrabold uppercase font-mono text-xs whitespace-nowrap">
                      {log.delivery_status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2-Step WhatsApp OTP Verification Phone Assignment Modal */}
      {showAddSubModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl border border-emerald-500/30 bg-slate-900 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  {otpStep === 1 ? 'Assign WhatsApp Phone Number' : 'Enter 6-Digit WhatsApp OTP'}
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded">
                STEP {otpStep} OF 2
              </span>
            </div>

            {otpErrorMsg && (
              <div className="p-3 bg-rose-950/80 border border-rose-600/60 text-rose-200 text-xs rounded-xl flex items-center space-x-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{otpErrorMsg}</span>
              </div>
            )}

            {otpStep === 1 ? (
              <form onSubmit={handleRequestOtp} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Crew Member Full Name</label>
                  <input
                    type="text"
                    required
                    value={newSub.full_name}
                    onChange={(e) => setNewSub({...newSub, full_name: e.target.value})}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">WhatsApp Phone Number (with Country Code)</label>
                  <input
                    type="text"
                    required
                    value={newSub.phone_number}
                    onChange={(e) => setNewSub({...newSub, phone_number: e.target.value})}
                    placeholder="e.g. +919876543210"
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">A 6-digit WhatsApp OTP verification code will be sent to this number.</span>
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

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSubModal(false);
                      setOtpErrorMsg(null);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={otpSending}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {otpSending ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending WhatsApp OTP...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send WhatsApp OTP Code</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-emerald-950/80 border border-emerald-600/60 rounded-xl text-xs text-emerald-300 font-semibold space-y-1">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>WhatsApp OTP Message Dispatched!</span>
                  </div>
                  <div className="text-slate-300 text-[11px] leading-relaxed">
                    🔐 6-digit WhatsApp OTP code sent to <strong className="text-emerald-300 font-mono">{newSub.phone_number}</strong>. Please check your WhatsApp messages and enter the code below.
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Enter 6-Digit WhatsApp Verification OTP:
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCodeInput}
                    onChange={(e) => setOtpCodeInput(e.target.value)}
                    placeholder="e.g. 482915"
                    className="w-full text-center tracking-[0.4em] font-mono text-xl font-bold bg-slate-950 border border-emerald-500/60 rounded-xl px-4 py-3 text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block text-center">Until this code is verified, the phone number remains unassigned.</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(1);
                      setOtpErrorMsg(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 font-medium underline cursor-pointer"
                  >
                    &larr; Back to edit details
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddSubModal(false);
                        setOtpStep(1);
                        setOtpErrorMsg(null);
                      }}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={otpVerifying || otpCodeInput.length < 6}
                      className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {otpVerifying ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying OTP...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>Verify OTP & Assign Number</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* In-Browser WhatsApp Voice Call Modal Overlay */}
      {showCallModal && selectedSubscriber && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card p-8 rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 max-w-sm w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
            {/* Ambient ring glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

            {/* Header Badge */}
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-3.5 py-1 rounded-full w-max mx-auto shadow-md">
              <span className={`w-2 h-2 rounded-full ${callState === 'ringing' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
              <span>{callState === 'ringing' ? 'WhatsApp Voice Call Dispatched' : 'Live Operational Voice Stream'}</span>
            </div>

            {/* Avatar & Animated Rings */}
            <div className="relative py-4 flex items-center justify-center">
              {callState === 'ringing' && (
                <>
                  <div className="absolute w-36 h-36 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />
                  <div className="absolute w-28 h-28 rounded-full bg-emerald-500/30 animate-pulse pointer-events-none" />
                </>
              )}
              <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-emerald-400/80 flex items-center justify-center text-3xl font-extrabold text-emerald-300 shadow-xl relative z-10">
                {selectedSubscriber.full_name?.charAt(0) || 'C'}
              </div>
            </div>

            {/* Crew Details */}
            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                {selectedSubscriber.full_name}
              </h3>
              <p className="text-xs text-emerald-400 font-medium mt-0.5">
                {selectedSubscriber.role} • {selectedSubscriber.assigned_gang || 'Gang Alpha'}
              </p>
              <p className="text-xs font-mono text-slate-400 mt-1">
                {selectedSubscriber.phone_number}
              </p>
            </div>

            {/* Live Call Status & Timer Box */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl py-3 px-4 space-y-1">
              <div className="text-xs text-slate-300 font-semibold">
                {callStatus}
              </div>
              {callState === 'connected' && (
                <div className="text-2xl font-mono font-bold text-white tracking-wider">
                  {formatCallTime(callDuration)}
                </div>
              )}
              {/* Sound wave visualizer bars */}
              <div className="flex items-center justify-center gap-1 pt-2">
                <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="w-1 h-6 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
                <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '600ms' }} />
              </div>
            </div>

            {/* Direct Calling Links */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/${cleanDigits(selectedSubscriber.phone_number || verifiedPhone)}`}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-200 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
                <span>WhatsApp App</span>
              </a>
              <a
                href={`tel:+${cleanDigits(selectedSubscriber.phone_number || verifiedPhone)}`}
                className="py-2 px-2 bg-teal-600/30 hover:bg-teal-600/50 border border-teal-500/50 text-teal-200 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-teal-300" />
                <span>Cellular Call</span>
              </a>
            </div>

            {/* Call Controls */}
            <div className="flex items-center justify-center gap-6 pt-2">
              {callState === 'ringing' ? (
                <>
                  <button
                    onClick={handleAcceptCall}
                    className="p-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/40 hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                    title="Accept & Connect Call"
                  >
                    <Phone className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleEndCall}
                    className="p-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40 hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                    title="Decline / End Call"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-4 rounded-full transition-all border ${
                      isMuted
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={handleEndCall}
                    className="p-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title="End Call"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>

                  <button
                    onClick={() => setIsSpeaker(!isSpeaker)}
                    className={`p-4 rounded-full transition-all border ${
                      isSpeaker
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                    title={isSpeaker ? "Speaker On" : "Speaker Off"}
                  >
                    {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
