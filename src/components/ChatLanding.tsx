"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, Code2, Compass, Lightbulb, PenLine, Lock, Mic, Brain, Globe } from "lucide-react";
import { type AuthUser } from "./AuthModals";

interface ChatLandingProps {
  onSubmit: (prompt: string) => void;
  user: AuthUser | null;
  isAuthLoading?: boolean;
  onOpenLogin: () => void;
  onOpenSignup: () => void;
  onOpenVoice?: () => void;
  isThinkingEnabled: boolean;
  onToggleThinking: () => void;
  isWebSearchEnabled: boolean;
  onToggleWebSearch: () => void;
}

export function ChatLanding({
  onSubmit,
  user,
  isAuthLoading = false,
  onOpenLogin,
  onOpenVoice,
  isThinkingEnabled,
  onToggleThinking,
  isWebSearchEnabled,
  onToggleWebSearch,
}: ChatLandingProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      inputRef.current?.focus();
    }
  }, [user]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!user) {
        onOpenLogin();
        return;
      }
      if (input.trim()) {
        onSubmit(input.trim());
        setInput("");
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenLogin();
      return;
    }
    if (input.trim()) {
      onSubmit(input.trim());
      setInput("");
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    if (!user) {
      onOpenLogin();
      return;
    }
    onSubmit(prompt);
  };

  const suggestions = [
    { icon: Code2, label: "Write a React hook for debounce" },
    { icon: Compass, label: "Help me debug Next.js App Router" },
    { icon: Lightbulb, label: "Brainstorm AI app features" },
    { icon: PenLine, label: "Draft a modern tech blog post" },
  ];

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-3 sm:px-8 md:px-16 -mt-4 sm:-mt-10 select-none overflow-y-auto py-6">
      <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-5 sm:space-y-7 animate-in fade-in zoom-in-95 duration-300">
        {/* Title: Dynamic based on auth state */}
        {isAuthLoading ? (
          <div className="h-8 sm:h-9 w-64 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-full animate-pulse" />
        ) : user ? (
          <h1 className="text-[22px] sm:text-[28px] md:text-[30px] font-normal tracking-tight text-neutral-800 dark:text-neutral-100 font-sans px-2">
            Hello, {user.name || "Coder.Developer"}
          </h1>
        ) : (
          <div className="space-y-2 px-2">
            <h1 className="text-[24px] sm:text-[30px] md:text-[34px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 font-sans">
              Welcome to Akshra Ai
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
              Please log in or create an account to start chatting with state-of-the-art AI models.
            </p>
          </div>
        )}

        {/* Prompt Input Capsule: Matches styling, with click-to-login gate if unauthenticated */}
        <form
          onSubmit={handleFormSubmit}
          className="w-full relative flex items-center group px-1"
        >
          <div
            onClick={() => {
              if (!user) onOpenLogin();
            }}
            className={`w-full relative flex items-center bg-white dark:bg-[#2f2f2f] rounded-full border border-neutral-200/90 dark:border-[#424242] shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-all duration-200 ${user
              ? "focus-within:border-neutral-400 dark:focus-within:border-neutral-500 focus-within:shadow-[0_6px_30px_rgba(0,0,0,0.1)]"
              : "cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600"
              } px-4 sm:px-6 py-2.5 sm:py-3.5`}
          >
            {/* Input Field with exact placeholder and 16px font to prevent mobile iOS zoom */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                user
                  ? "Hello, Akshra Ai here."
                  : "Log in or sign up to ask Akshra Ai anything..."
              }
              readOnly={!user}
              className={`w-full bg-transparent text-[16px] sm:text-base text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-400 outline-none pr-2 font-normal ${!user ? "cursor-pointer select-none" : ""
                }`}
            />

            {/* Thinking Mode (Mind icon) */}
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  onOpenLogin();
                  return;
                }
                onToggleThinking();
              }}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-full flex items-center justify-center shrink-0 mr-1 transition-all active:scale-95 cursor-pointer ${isThinkingEnabled
                ? "bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-300 ring-1 ring-purple-400/50 shadow-xs"
                : "text-neutral-400 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              title={
                isThinkingEnabled
                  ? "Thinking Mode: Active (Deep multi-step reasoning)"
                  : "Thinking Mode: Deep multi-step reasoning"
              }
              aria-label="Toggle Thinking Mode"
            >
              <Brain className={`w-4 h-4 ${isThinkingEnabled ? "stroke-[2.2]" : ""}`} />
              {isThinkingEnabled && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              )}
            </button>

            {/* Web Search Mode (Browser/Globe icon) */}
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  onOpenLogin();
                  return;
                }
                onToggleWebSearch();
              }}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-full flex items-center justify-center shrink-0 mr-1 transition-all active:scale-95 cursor-pointer ${isWebSearchEnabled
                ? "bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-300 ring-1 ring-sky-400/50 shadow-xs"
                : "text-neutral-400 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              title={
                isWebSearchEnabled
                  ? "Web Search Mode: Active (Real-time Google search)"
                  : "Web Search Mode: Live Google search"
              }
              aria-label="Toggle Web Search Mode"
            >
              <Globe className={`w-4 h-4 ${isWebSearchEnabled ? "stroke-[2.2]" : ""}`} />
              {isWebSearchEnabled && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              )}
            </button>

            {/* Voice Mode Button */}
            {onOpenVoice && (
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    onOpenLogin();
                    return;
                  }
                  onOpenVoice();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-full flex items-center justify-center shrink-0 mr-1 text-neutral-500 hover:text-cyan-600 dark:text-neutral-400 dark:hover:text-cyan-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition active:scale-95 cursor-pointer"
                title="Start Voice Conversation"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}

            {/* Lock or Send button */}
            {!user ? (
              <button
                type="button"
                onClick={onOpenLogin}
                className="w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-full flex items-center justify-center shrink-0 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition active:scale-95 cursor-pointer shadow-2xs"
                title="Log in to chat"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
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
        </form>

        {/* Active Search & Thinking Status Badges */}
        {(isThinkingEnabled || isWebSearchEnabled) && (
          <div className="flex flex-wrap items-center justify-center gap-2 -mt-1 sm:-mt-2 animate-in fade-in duration-200">
            {isThinkingEnabled && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs">
                <Brain className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span>Deep Thinking Mode</span>
                <button
                  type="button"
                  onClick={onToggleThinking}
                  className="hover:text-purple-900 dark:hover:text-purple-100 text-purple-400 ml-0.5 cursor-pointer"
                  title="Turn off Thinking Mode"
                >
                  ×
                </button>
              </span>
            )}
            {isWebSearchEnabled && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 shadow-2xs">
                <Globe className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                <span>Live Web Search</span>
                <button
                  type="button"
                  onClick={onToggleWebSearch}
                  className="hover:text-sky-900 dark:hover:text-sky-100 text-sky-400 ml-0.5 cursor-pointer"
                  title="Turn off Web Search"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        {/* Quick Suggestion Pills with responsive wrap */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-1 sm:pt-2 max-w-xl px-1">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(item.label)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-neutral-100/70 dark:bg-[#252528] hover:bg-neutral-200/70 dark:hover:bg-[#2f3035] border border-neutral-200/50 dark:border-neutral-800 text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-300 transition active:scale-95 text-left cursor-pointer"
            >
              <item.icon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
