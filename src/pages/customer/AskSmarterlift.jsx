// AskSmarterlift — A2 (AI Q&A Chat).
// See docs/CUSTOMER_PORTAL_FEATURES.md.
//
// Customer asks natural-language questions about their elevators, service
// history, invoices, etc. Backend assembles a customer-data-grounded system
// prompt and forwards to Claude Sonnet 4.5 via Bedrock. Conversation state
// lives in React state on the client; server side is stateless.

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, LogOut, Send, Sparkles, Clock, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const SUGGESTED_QUESTIONS = [
  'When was my last inspection?',
  'What service has been performed in the last 6 months?',
  "What's coming up on my elevator's schedule?",
  'How much have I been invoiced this year?',
  'Should I be thinking about modernization?',
  'Do I have any open service requests?',
];

const AskSmarterlift = () => {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto-scroll the latest message into view.
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');
    const next = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setLoading(true);
    try {
      const result = await api.askChat(next);
      setMessages([...next, { role: 'assistant', content: result.answer || "I'm not sure how to answer that." }]);
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: "I had trouble reaching the AI right now. Please try again in a moment, or contact your service provider for an immediate answer." }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/customer/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Home className="w-7 h-7 text-blue-400" />
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-bold text-white">Ask Smarterlift</h1>
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-xs text-gray-400">{user?.name || 'AI assistant'}</p>
              </div>
            </Link>
            <button onClick={logout} className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
              <LogOut className="w-4 h-4" />Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        <div className="flex-1 space-y-4 mb-4">
          {/* Empty state with suggested questions */}
          {messages.length === 0 && !loading && (
            <div className="text-center py-8 md:py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Ask anything about your elevators</h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                I have access to your service history, invoices, inspection schedules, and the Texas TDLR registry. Try a question or pick one below.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-w-2xl mx-auto">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => send(q)}
                    className="text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-purple-500/50 rounded-xl px-4 py-3 text-sm text-gray-300 hover:text-white transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100 border border-gray-700'
              }`}>
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-xs text-purple-400">
                    <Sparkles className="w-3 h-3" />
                    <span className="font-medium">Smarterlift</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400 animate-spin" />
                <span className="text-gray-400 text-sm">Thinking…</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input row */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-2 flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask about your elevators, inspections, invoices, or maintenance…"
            rows={1}
            maxLength={2000}
            disabled={loading}
            className="flex-1 bg-transparent text-white placeholder:text-gray-500 px-3 py-2 text-sm resize-none focus:outline-none disabled:opacity-60"
            style={{ minHeight: 40, maxHeight: 200 }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="p-2.5 bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-start gap-1.5 mt-2 text-xs text-gray-500">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p>AI answers can occasionally be off. For anything time-sensitive — a stuck elevator, a billing dispute, a missed inspection — call your service provider directly.</p>
        </div>
      </div>
    </div>
  );
};

export default AskSmarterlift;
