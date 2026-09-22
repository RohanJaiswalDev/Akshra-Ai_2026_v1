"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowUp,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Square,
  Lock,
} from "lucide-react";
import { AkshraLogo } from "./icons";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { type AuthUser } from "./AuthModals";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  isError?: boolean;
}

interface ChatMessagesProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onRegenerate?: () => void;
  isStreaming?: boolean;
  onStop?: () => void;
  user?: AuthUser | null;
  onOpenLogin?: () => void;
  onOpenSignup?: () => void;
}

// Highly optimized memoized single message row
const ChatMessageRow = React.memo(function ChatMessageRow({
  msg,
  copiedId,
  onCopy,
  onRegenerate,
  user,
  onOpenLogin,
}: {
  msg: Message;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  onRegenerate?: () => void;
  user?: AuthUser | null;
  onOpenLogin?: () => void;
}) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end animate-in fade-in duration-150">
        <div className="max-w-[88%] sm:max-w-[80%] md:max-w-[75%] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-[14px] sm:text-sm leading-relaxed bg-neutral-100 dark:bg-[#2f2f2f] text-neutral-900 dark:text-neutral-100 rounded-br-sm shadow-xs select-text">
          <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
        </div>
      </div>
    );
  }

  // Assistant message: Logo and text starting point match seamlessly in a straight line
  return (
    <div className="flex items-start gap-2.5 sm:gap-3.5 justify-start animate-in fade-in duration-150 select-text">
      {/* Logo icon - exactly matches first line height */}
      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shrink-0 shadow-xs select-none mt-0.5 sm:mt-0">
        <AkshraLogo className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      </div>

      {/* Message Content: seamlessly aligned line height */}
      <div className="flex-1 min-w-0 text-[14px] sm:text-[15px] leading-6 sm:leading-7 text-neutral-800 dark:text-neutral-200">
        <MarkdownRenderer
          content={msg.content}
          isStreaming={msg.isStreaming}
        />

        {/* Assistant Message Actions */}
        {!msg.isStreaming && msg.content && (
          <div className="flex items-center gap-1 sm:gap-1.5 mt-2 pt-1 text-neutral-400 dark:text-neutral-500 select-none">
            <button
              onClick={() => onCopy(msg.id, msg.content)}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer"
              title="Copy response"
            >
              {copiedId === msg.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer"
              title="Good response"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer"
              title="Bad response"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
            {onRegenerate && (
              <button
                onClick={() => {
                  if (!user) {
                    onOpenLogin?.();
                  } else {
                    onRegenerate();
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer"
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
});

export function ChatMessages({
  messages,
  onSendMessage,
  onRegenerate,
  isStreaming = false,
  onStop,
  user,
  onOpenLogin,
  onOpenSignup,
}: ChatMessagesProps) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const rafScrollRef = useRef<number | null>(null);

  // Smooth scroll to top when button clicked
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Smooth scroll to bottom when button clicked
  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // Performance-optimized scroll listener throttled by requestAnimationFrame
  const handleScrollThrottled = useCallback(() => {
    if (rafScrollRef.current) return;
    rafScrollRef.current = requestAnimationFrame(() => {
      rafScrollRef.current = null;
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const shouldShowTop = scrollTop > 100;

      setShowBackToTop((prev) => (prev !== shouldShowTop ? shouldShowTop : prev));
    });
  }, []);

  // Attach scroll listeners
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScrollThrottled, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScrollThrottled);
      if (rafScrollRef.current) {
        cancelAnimationFrame(rafScrollRef.current);
        rafScrollRef.current = null;
      }
    };
  }, [handleScrollThrottled]);

  // Keep scrolled to bottom during active streaming without triggering reflow churn
  useEffect(() => {
    if (!isStreaming) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < 160) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!user) {
        onOpenLogin?.();
        return;
      }
      if (input.trim() && !isStreaming) {
        onSendMessage(input.trim());
        setInput("");
        setTimeout(() => scrollToBottom(true), 40);
      }
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full h-full relative overflow-hidden">
      {/* Scrollable messages container with native instant mouse wheel response */}
      <div
        ref={scrollContainerRef}
        data-scrollable="true"
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 md:px-10 py-4 sm:py-6 space-y-5 sm:space-y-6 max-w-3xl w-full mx-auto pb-44 sm:pb-40 overscroll-contain"
      >
        {/* Top anchor */}
        <div
          ref={messagesStartRef}
          id="chat-top-anchor"
          className="w-full h-0 opacity-0 pointer-events-none"
        />

        {messages.map((msg) => (
          <ChatMessageRow
            key={msg.id}
            msg={msg}
            copiedId={copiedId}
            onCopy={handleCopy}
            onRegenerate={onRegenerate}
            user={user}
            onOpenLogin={onOpenLogin}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <div className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 flex items-center pointer-events-auto gpu-accelerated">
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-[#252528]/95 border border-neutral-300/90 dark:border-neutral-700 shadow-md hover:shadow-lg text-xs font-medium text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-[#2e2e32] transition active:scale-95 cursor-pointer backdrop-blur-sm animate-in fade-in zoom-in-95 group"
            title="Back to top"
          >
            <ArrowUp className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-transform group-hover:-translate-y-0.5" />
            <span>Back to top</span>
          </button>
        </div>
      )}

      {/* Floating Bottom Input Bar with Safe Area Support */}
      <div className="absolute bottom-0 left-0 right-0 px-3 sm:px-6 md:px-10 py-2.5 sm:py-3.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-[var(--canvas-bg)] via-[var(--canvas-bg)] to-transparent pt-4 sm:pt-6 z-20 gpu-accelerated">
        <div className="max-w-3xl w-full mx-auto">
          {!user ? (
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/95 dark:bg-[#252528]/95 backdrop-blur-md rounded-2xl sm:rounded-full border border-neutral-200/90 dark:border-neutral-700 shadow-[0_4px_24px_rgba(0,0,0,0.08)] px-4 sm:px-6 py-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 text-center sm:text-left">
                <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Log in or create an account to continue chatting with Akshra Ai.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="px-4 py-1.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium hover:opacity-90 active:scale-95 transition cursor-pointer shadow-xs"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={onOpenSignup}
                  className="px-4 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white/50 dark:bg-transparent text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                >
                  Sign up
                </button>
              </div>
            </div>
          ) : (
            <div className="relative flex items-center bg-white dark:bg-[#2f2f2f] rounded-full border border-neutral-200/90 dark:border-[#424242] shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)] px-4 sm:px-6 py-2.5 sm:py-3 focus-within:border-neutral-400 dark:focus-within:border-neutral-500 transition">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Akshra Ai anything..."
                className="w-full bg-transparent text-[16px] sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-400 outline-none resize-none max-h-32 pr-2 py-0.5 font-normal"
              />

              {/* Stop vs Send Icon */}
              {isStreaming && onStop ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-full flex items-center justify-center shrink-0 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 cursor-pointer shadow-sm hover:opacity-85 active:scale-95 transition-all"
                  title="Stop generating"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      onOpenLogin?.();
                      return;
                    }
                    if (input.trim()) {
                      onSendMessage(input.trim());
                      setInput("");
                      setTimeout(() => scrollToBottom(true), 40);
                    }
                  }}
                  disabled={!input.trim()}
                  className={`w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-full flex items-center justify-center shrink-0 transition-all ${input.trim()
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 cursor-pointer shadow-sm active:scale-95"
                    : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
                    }`}
                  title="Send message"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          )}

          <div className="text-center mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] text-neutral-400 dark:text-neutral-500">
            Akshra Ai can make mistakes. Verify important info.
          </div>
        </div>
      </div>
    </div>
  );
}
