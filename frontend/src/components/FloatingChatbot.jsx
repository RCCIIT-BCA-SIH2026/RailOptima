import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Activity, 
  AlertTriangle, 
  Cpu, 
  ShieldCheck, 
  TrendingUp, 
  CheckCircle2, 
  ChevronRight,
  ExternalLink,
  Bot
} from 'lucide-react';
import apiClient from '../api/client';

export default function FloatingChatbot({ activeUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `👋 **Namaste! I am RailOptima Assistant** — your divisional railway operations and block planning assistant.\n\nI can help you inspect track defects, check train delays, schedule maintenance possessions, and review pending approvals.\n\nHow can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [systemStats, setSystemStats] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [executingActionId, setExecutingActionId] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    fetchSystemSummary();
    fetchSuggestions();

    const handleToggle = () => {
      setIsOpen((prev) => !prev);
    };
    window.addEventListener('toggle-railoptima-chatbot', handleToggle);
    return () => window.removeEventListener('toggle-railoptima-chatbot', handleToggle);
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Initialize Web Speech API for voice dictation
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const fetchSystemSummary = async () => {
    try {
      const res = await apiClient.get('/chatbot/system-summary');
      setSystemStats(res.data);
    } catch (e) {
      console.warn("Could not fetch chatbot system stats", e);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await apiClient.get('/chatbot/suggestions');
      setSuggestions(res.data.suggestions || []);
    } catch (e) {
      console.warn("Could not fetch chatbot suggestions", e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleVoiceDictation = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Speech recognition start failed", err);
      }
    }
  };

  const speakText = (text) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Strip markdown syntax for clean audio speech
      const cleanText = text.replace(/[*#`_\[\]]/g, '').substring(0, 250);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async (customPrompt) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newHistory = [...messages, { role: 'user', content: textToSend, timestamp: userTimestamp }];
    setMessages(newHistory);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await apiClient.post('/chatbot/chat', {
        message: textToSend,
        history: newHistory.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', content: m.content })),
        role: activeUser?.role || 'DRM',
        department: activeUser?.department || 'ENG'
      });

      const replyData = res.data;
      const botTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: replyData.reply || "Operation completed.",
          timestamp: botTimestamp,
          live_data_attached: replyData.live_data_attached,
          tool_calls: replyData.tool_calls
        }
      ]);

      if (ttsEnabled && replyData.reply) {
        speakText(replyData.reply);
      }
    } catch (err) {
      console.error("Chat request failed", err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "⚠️ I am currently unable to complete this request. Please check your connection and try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
      fetchSystemSummary();
    }
  };

  const handleExecuteApproval = async (blockId, action) => {
    try {
      setExecutingActionId(blockId);
      const res = await apiClient.post(`/approvals/${blockId}/action`, {
        action: action,
        comments: `${action} digitally signed via RailOptima Assistant by ${activeUser?.role || 'DRM'}`
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `✅ **Success:** Block #${blockId} was marked as **${action}**. The record and audit log have been updated.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      fetchSystemSummary();
    } catch (e) {
      console.error("Block action failed", e);
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        role: 'assistant',
        content: `🧹 **Chat conversation cleared.** How can I assist you now?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const renderMarkdownFormatted = (content) => {
    if (!content) return null;

    // Simple markdown line renderer
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="font-bold text-cyan-300 text-xs mt-2 mb-1">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="font-bold text-amber-300 text-sm mt-2 mb-1">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <li key={idx} className="ml-3 list-disc text-xs text-slate-200 leading-relaxed">
            {line.substring(2)}
          </li>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }
      return <p key={idx} className="text-xs text-slate-100 leading-relaxed">{line}</p>;
    });
  };

  return (
    <>
      {/* Floating Action Mascot Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Pulsing Hint Pill */}
          <button 
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center space-x-2 px-3.5 py-2 bg-slate-900/90 text-white rounded-full shadow-2xl backdrop-blur-md border border-cyan-500/40 hover:border-cyan-400 text-xs font-semibold hover:scale-105 transition-all group"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-300 bg-clip-text text-transparent">
              RailOptima Assistant
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1" />
          </button>

          {/* Avatar Button */}
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open RailOptima Assistant"
            className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-500 p-0.5 shadow-2xl shadow-cyan-900/50 hover:shadow-cyan-500/50 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
          >
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden border-2 border-cyan-400/80">
              <img 
                src="/chatbot_avatar.png" 
                alt="RailOptima Assistant" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden w-full h-full items-center justify-center bg-blue-600">
                <Bot className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Live Indicator */}
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
            </span>
          </button>
        </div>
      )}

      {/* Floating Chat Modal Panel */}
      {isOpen && (
        <div 
          className={`fixed z-50 transition-all duration-300 ease-out flex flex-col shadow-2xl shadow-slate-950/80 rounded-3xl overflow-hidden border border-cyan-500/30 backdrop-blur-2xl bg-slate-900/95 text-white ${
            isExpanded 
              ? 'inset-4 sm:inset-10 max-w-5xl max-h-[90vh] mx-auto' 
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[95vw] sm:w-[440px] h-[640px] max-h-[85vh]'
          }`}
        >
          {/* Glass Header */}
          <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 px-4 py-3 border-b border-cyan-500/20 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden border border-cyan-400 shadow-md">
                <img 
                  src="/chatbot_avatar.png" 
                  alt="RailOptima Assistant" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-bold text-sm tracking-wide bg-gradient-to-r from-cyan-300 via-blue-200 to-white bg-clip-text text-transparent">
                    RailOptima Assistant
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 rounded-full font-sans">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Indian Railways Operations & Planning
                </p>
              </div>
            </div>

            {/* Header Control Buttons */}
            <div className="flex items-center space-x-1 text-slate-400">
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                title={ttsEnabled ? "Mute Voice Output" : "Enable Voice Output (TTS)"}
                className={`p-1.5 rounded-lg transition-colors ${ttsEnabled ? 'text-cyan-400 bg-cyan-950/60' : 'hover:text-white'}`}
              >
                {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={handleClearHistory}
                title="Clear Chat History"
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Restore Size" : "Expand Window"}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden sm:block"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="Minimize Copilot"
                className="p-1.5 hover:text-white hover:bg-rose-950/60 hover:text-rose-300 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live System Telemetry Strip */}
          {systemStats && (
            <div className="bg-slate-950/80 px-3 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-nowrap scrollbar-none gap-3">
              <span className="flex items-center space-x-1 text-rose-300">
                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                <span>P0 Defects: <b>{systemStats.p0_critical_emergencies ?? 0}</b></span>
              </span>
              <span className="flex items-center space-x-1 text-amber-300">
                <Activity className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Speed Restr: <b>{systemStats.active_speed_restrictions ?? 0}</b></span>
              </span>
              <span className="flex items-center space-x-1 text-cyan-300">
                <Cpu className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>Approvals: <b>{systemStats.pending_approvals ?? 0}</b></span>
              </span>
              <span className="flex items-center space-x-1 text-emerald-300">
                <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Punctuality: <b>{systemStats.system_punctuality_rate ?? '89%'}</b></span>
              </span>
            </div>
          )}

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-radial from-slate-900 via-slate-950 to-slate-950 scrollbar-thin scrollbar-thumb-slate-700">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-start space-x-2 max-w-[90%]">
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-cyan-400/60 shrink-0 mt-0.5">
                      <img src="/chatbot_avatar.png" alt="Bot" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div 
                    className={`rounded-2xl p-3.5 text-xs shadow-lg space-y-2 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none border border-blue-400/30'
                        : 'bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/60 backdrop-blur-sm'
                    }`}
                  >
                    <div>{renderMarkdownFormatted(msg.content)}</div>

                    {/* Interactive Proposed Block Cards with 1-Click Approval */}
                    {msg.live_data_attached?.blocks && msg.live_data_attached.blocks.length > 0 && (
                      <div className="mt-3 space-y-2 pt-2 border-t border-slate-700/60">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-cyan-300">
                          Pending Block Actions:
                        </p>
                        {msg.live_data_attached.blocks.slice(0, 3).map((blk) => (
                          <div key={blk.block_id} className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-700/80 flex items-center justify-between gap-2">
                            <div>
                              <div className="font-mono font-bold text-white text-xs">{blk.block_code}</div>
                              <div className="text-[10px] text-slate-400">{blk.section_code} • {blk.duration_hours}h • Dept: {blk.lead_department}</div>
                            </div>

                            {blk.status === 'Proposed' && (
                              <div className="flex items-center space-x-1.5 shrink-0">
                                <button
                                  disabled={executingActionId === blk.block_id}
                                  onClick={() => handleExecuteApproval(blk.block_id, 'Rejected')}
                                  className="px-2 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded text-[10px] font-bold border border-rose-700 transition-colors"
                                >
                                  Reject
                                </button>
                                <button
                                  disabled={executingActionId === blk.block_id}
                                  onClick={() => handleExecuteApproval(blk.block_id, 'Approved')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold shadow-xs transition-colors"
                                >
                                  {executingActionId === blk.block_id ? 'Signing...' : 'Approve'}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer Meta */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Loader */}
            {loading && (
              <div className="flex items-center space-x-2 text-xs text-cyan-300 font-sans animate-pulse pl-8">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>RailOptima Assistant is looking up records...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestion Chips */}
          <div className="bg-slate-950/90 px-3 py-2 border-t border-slate-800 flex items-center space-x-2 overflow-x-auto scrollbar-none shrink-0">
            {suggestions.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSendMessage(item.prompt)}
                disabled={loading}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-blue-900/60 border border-slate-700 hover:border-cyan-500/60 rounded-full text-[11px] text-slate-200 whitespace-nowrap transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {item.title}
              </button>
            ))}
          </div>

          {/* Message Input Bar */}
          <div className="p-3 bg-slate-950 border-t border-cyan-500/20 shrink-0">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              {/* Voice Dictation Button */}
              <button
                type="button"
                onClick={toggleVoiceDictation}
                title={isListening ? "Stop Listening" : "Voice Input (Hindi/English)"}
                className={`p-2.5 rounded-xl border transition-all ${
                  isListening 
                    ? 'bg-rose-600 border-rose-400 text-white animate-pulse' 
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isListening ? "Listening to your voice..." : "Ask a question (e.g. 'Show critical defects', 'Check train delays')..."}
                disabled={loading}
                className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-cyan-400 transition-all font-sans"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="p-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-cyan-950/50 transition-all active:scale-95 flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
