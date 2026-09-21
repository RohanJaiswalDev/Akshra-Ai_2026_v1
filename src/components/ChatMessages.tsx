"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowUp,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { AkshraLogo } from "./icons";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface ChatMessagesProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onRegenerate?: () => void;
  isStreaming?: boolean;
}

export function ChatMessages({
  messages,
  onSendMessage,
  onRegenerate,
  isStreaming = false,
}: ChatMessagesProps) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isStreaming) {
        onSendMessage(input.trim());
        setInput("");
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full relative overflow-hidden">
      {/* Scrollable messages container */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-10 md:px-12 py-6 space-y-6 max-w-3xl w-full mx-auto pb-32">
        {messages.map((msg) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={`flex gap-3 sm:gap-4 ${isUser ? "justify-end" : "justify-start"
                } animate-in fade-in duration-200`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <AkshraLogo className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser
                  ? "bg-neutral-100 dark:bg-[#2f2f2f] text-neutral-900 dark:text-neutral-100 rounded-br-sm"
                  : "bg-transparent text-neutral-800 dark:text-neutral-200"
                  }`}
              >
                {/* Content */}
                <div className="whitespace-pre-wrap font-sans">
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-neutral-800 dark:bg-neutral-200 animate-pulse align-middle" />
                  )}
                </div>

                {/* Assistant Message Actions */}
                {!isUser && !msg.isStreaming && (
                  <div className="flex items-center gap-2 mt-3 pt-2 text-neutral-400 dark:text-neutral-500">
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                      title="Good response"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                      title="Bad response"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    {onRegenerate && (
                      <button
                        onClick={onRegenerate}
                        className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                        title="Regenerate response"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 md:px-12 py-4 bg-gradient-to-t from-[var(--canvas-bg)] via-[var(--canvas-bg)] to-transparent pt-6">
        <div className="max-w-3xl w-full mx-auto">
          <div className="relative flex items-center bg-white dark:bg-[#2f2f2f] rounded-full border border-neutral-200/90 dark:border-[#424242] shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)] px-5 sm:px-6 py-3 sm:py-3.5 focus-within:border-neutral-400 dark:focus-within:border-neutral-500 transition">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hello, Akshra Ai here."
              className="w-full bg-transparent text-sm sm:text-base text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-400 outline-none resize-none max-h-32 pr-3 py-0.5 font-normal"
            />

            <button
              type="button"
              onClick={() => {
                if (input.trim() && !isStreaming) {
                  onSendMessage(input.trim());
                  setInput("");
                }
              }}
              disabled={!input.trim() || isStreaming}
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${input.trim() && !isStreaming
                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 cursor-pointer shadow-sm active:scale-95"
                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
                }`}
              title="Send message"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          <div className="text-center mt-2 text-[11px] text-neutral-400 dark:text-neutral-500">
            Akshra Ai can make mistakes. Verify important info.
          </div>
        </div>
      </div>
    </div>
  );
}
