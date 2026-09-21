"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Square,
} from "lucide-react";
import { AkshraLogo } from "./icons";
import { MarkdownRenderer } from "./MarkdownRenderer";

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
  onStop?: () => void;
}

export function ChatMessages({
  messages,
  onSendMessage,
  onRegenerate,
  isStreaming = false,
  onStop,
}: ChatMessagesProps) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Bulletproof smooth scroll to top across all container and window types
  const scrollToTop = () => {
    // 1. Direct scroll on the scroll container
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }

    // 2. Scroll into view using top anchor element
    if (messagesStartRef.current) {
      messagesStartRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    // 3. Fallback for window / document level scrolling
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (typeof document !== "undefined") {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  };

  // Smooth scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  }, []);

  // Track scroll position on both container and window
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    const containerScroll = container?.scrollTop || 0;
    const windowScroll =
      typeof window !== "undefined"
        ? window.scrollY || document.documentElement.scrollTop || 0
        : 0;

    const currentScrollTop = Math.max(containerScroll, windowScroll);

    // Show Back to Top if scrolled down more than 60px
    setShowBackToTop(currentScrollTop > 60);

    // Show Scroll to Bottom if scrolled up from the bottom
    if (container) {
      const { scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - containerScroll - clientHeight;
      setShowScrollBottom(distanceFromBottom > 80);
    }
  }, []);

  // Attach scroll listeners to container and window
  useEffect(() => {
    const container = scrollContainerRef.current;
    const onScroll = () => handleScroll();

    container?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    // Initial check
    handleScroll();

    return () => {
      container?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, [handleScroll]);

  // Keep scrolled to bottom during active streaming unless user scrolled up
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (isStreaming && container) {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom < 180) {
        scrollToBottom(false);
      }
    }
    handleScroll();
  }, [messages, isStreaming, scrollToBottom, handleScroll]);

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
        setTimeout(() => scrollToBottom(true), 60);
      }
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full h-full relative overflow-hidden">
      {/* Scrollable messages container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 md:px-12 py-6 space-y-6 max-w-3xl w-full mx-auto pb-44 scroll-smooth"
      >
        {/* Top anchor for reliable scroll to top */}
        <div
          ref={messagesStartRef}
          id="chat-top-anchor"
          className="w-full h-0 opacity-0 pointer-events-none"
        />

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
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser
                  ? "bg-neutral-100 dark:bg-[#2f2f2f] text-neutral-900 dark:text-neutral-100 rounded-br-sm"
                  : "bg-transparent text-neutral-800 dark:text-neutral-200"
                  }`}
              >
                {/* Content */}
                {isUser ? (
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                ) : (
                  <MarkdownRenderer
                    content={msg.content}
                    isStreaming={msg.isStreaming}
                  />
                )}

                {/* Assistant Message Actions */}
                {!isUser && !msg.isStreaming && msg.content && (
                  <div className="flex items-center gap-2 mt-3 pt-2 text-neutral-400 dark:text-neutral-500">
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
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
                        onClick={onRegenerate}
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
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll Navigation: Single clean Back to Top / Scroll to Bottom */}
      {(showBackToTop || showScrollBottom) && (
        <div className="absolute bottom-[84px] sm:bottom-[92px] left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 pointer-events-auto">
          {/* Back to top floating pill */}
          {showBackToTop && (
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#252528] border border-neutral-300/90 dark:border-neutral-700 shadow-md hover:shadow-lg text-xs font-medium text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-[#2e2e32] transition-all duration-150 active:scale-95 cursor-pointer backdrop-blur-md animate-in fade-in zoom-in-95 group"
              title="Back to top"
            >
              <ArrowUp className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-transform group-hover:-translate-y-0.5" />
              <span>Back to top</span>
            </button>
          )}

          {/* Scroll to bottom floating pill */}
          {showScrollBottom && (
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#252528] border border-neutral-300/90 dark:border-neutral-700 shadow-md hover:shadow-lg text-xs font-medium text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-[#2e2e32] transition-all duration-150 active:scale-95 cursor-pointer backdrop-blur-md animate-in fade-in zoom-in-95 group"
              title="Scroll to bottom"
            >
              <ArrowDown className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-transform group-hover:translate-y-0.5" />
              <span>Scroll to bottom</span>
            </button>
          )}
        </div>
      )}

      {/* Floating Bottom Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 md:px-12 py-4 bg-gradient-to-t from-[var(--canvas-bg)] via-[var(--canvas-bg)] to-transparent pt-6 z-20">
        <div className="max-w-3xl w-full mx-auto">
          <div className="relative flex items-center bg-white dark:bg-[#2f2f2f] rounded-full border border-neutral-200/90 dark:border-[#424242] shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)] px-5 sm:px-6 py-3 sm:py-3.5 focus-within:border-neutral-400 dark:focus-within:border-neutral-500 transition">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Akshra Ai anything..."
              className="w-full bg-transparent text-sm sm:text-base text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-400 outline-none resize-none max-h-32 pr-3 py-0.5 font-normal"
            />

            {/* In ChatGPT, the send button switches to a Stop icon while generating */}
            {isStreaming && onStop ? (
              <button
                type="button"
                onClick={onStop}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 cursor-pointer shadow-sm hover:opacity-85 active:scale-95 transition-all"
                title="Stop generating"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (input.trim()) {
                    onSendMessage(input.trim());
                    setInput("");
                    setTimeout(() => scrollToBottom(true), 60);
                  }
                }}
                disabled={!input.trim()}
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${input.trim()
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 cursor-pointer shadow-sm active:scale-95"
                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
                  }`}
                title="Send message"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>

          <div className="text-center mt-2 text-[11px] text-neutral-400 dark:text-neutral-500">
            Akshra Ai can make mistakes. Verify important info.
          </div>
        </div>
      </div>
    </div>
  );
}
