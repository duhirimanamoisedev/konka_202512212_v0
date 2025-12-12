import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, Bot, User, Loader2 } from 'lucide-react';
import { generateInsight } from '../services/geminiService';
import { AppState, ChatMessage } from '../types';
import { GlassCard } from './GlassCard';

interface AIAssistantProps {
  appState: AppState;
  isOpen: boolean;
  onClose: () => void;
}

export const AIAssistant = ({ appState, isOpen, onClose }: AIAssistantProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Hi ${appState.user.name.split(' ')[0]}! I'm Konka, your student assistant. How can I help you optimize your day?`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await generateInsight(userMsg.text, appState);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      // Error handled silently in UI, maybe add a toast later
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-full md:w-96 p-4 z-40 transition-all animate-slide-in">
      <GlassCard className="h-full flex flex-col !p-0 border-l border-white/20 bg-slate-900/90 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-emerald-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-full border border-emerald-500/50">
              <Sparkles className="text-emerald-400" size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-white">Konka AI</h3>
              <p className="text-xs text-emerald-300/80">Online & Ready</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                ${msg.role === 'model' ? 'bg-emerald-600' : 'bg-slate-600'}
              `}>
                {msg.role === 'model' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className={`
                max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed
                ${msg.role === 'model' 
                  ? 'bg-white/10 text-slate-100 rounded-tl-none' 
                  : 'bg-emerald-600 text-white rounded-tr-none'}
              `}>
                {/* Minimal Markdown rendering */}
                {msg.text.split('\n').map((line, i) => (
                    <p key={i} className="mb-1 last:mb-0">{line}</p>
                ))}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-slate-400 ml-12">
              <Loader2 className="animate-spin" size={12} />
              Konka is thinking...
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about grades, budget, or advice..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all placeholder:text-slate-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
