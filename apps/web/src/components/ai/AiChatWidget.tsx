'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X, Loader2, Sparkles } from 'lucide-react';
import { aiChat } from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const GREETING: ChatMessage = {
  role: 'assistant',
  content: "Hi! I'm Waw's shopping assistant. Ask me about products, delivery, or anything else.",
};

export function AiChatWidget({ productId }: { productId?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([GREETING]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await aiChat(
        nextMessages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        productId,
      );
      setMessages((prev) => [...prev, { role: 'assistant', content: reply || 'Sorry, I could not answer that.' }]);
    } catch (err: any) {
      let systemMessage: string;
      if (err?.status === 401) {
        systemMessage = 'Please log in to chat with the assistant.';
      } else if (err?.message?.includes('Daily AI limit reached')) {
        systemMessage = 'Daily AI limit reached. Please try again tomorrow.';
      } else {
        systemMessage = 'The assistant is unavailable right now. Please try again later.';
      }
      setMessages((prev) => [...prev, { role: 'system', content: systemMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI shopping assistant"
          className="fixed bottom-20 lg:bottom-6 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-slate-900 shadow-lg transition-all hover:bg-amber-500 hover:scale-105 cursor-pointer"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] h-[480px] max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">Waw Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((msg, idx) =>
              msg.role === 'system' ? (
                <div key={idx} className="flex justify-center">
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-amber-50 text-gray-900 dark:bg-amber-900/30 dark:text-amber-50'
                        : 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-gray-100'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ),
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-3 py-2 dark:bg-slate-800">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-400" />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-gray-200 px-3 py-3 dark:border-slate-700">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask a question..."
              className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-amber-400"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-900 transition-all hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
