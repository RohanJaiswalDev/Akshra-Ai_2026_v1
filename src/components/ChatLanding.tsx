"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, Code2, Compass, Lightbulb, PenLine } from "lucide-react";

interface ChatLandingProps {
  onSubmit: (prompt: string) => void;
}

export function ChatLanding({ onSubmit }: ChatLandingProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSubmit(input.trim());
        setInput("");
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmit(input.trim());
      setInput("");
    }
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
        {/* Title: Exactly matches screenshot: "Hello, Coder.Developer" */}
        <h1 className="text-[22px] sm:text-[28px] md:text-[30px] font-normal tracking-tight text-neutral-800 dark:text-neutral-100 font-sans px-2">
          Hello, Coder.Developer
        </h1>

        {/* Prompt Input Capsule: Matches screenshot styling */}
        <form
          onSubmit={handleFormSubmit}
          className="w-full relative flex items-center group px-1"
        >
          <div className="w-full relative flex items-center bg-white dark:bg-[#2f2f2f] rounded-full border border-neutral-200/90 dark:border-[#424242] shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-all duration-200 focus-within:border-neutral-400 dark:focus-within:border-neutral-500 focus-within:shadow-[0_6px_30px_rgba(0,0,0,0.1)] px-4 sm:px-6 py-2.5 sm:py-3.5">
            {/* Input Field with exact placeholder and 16px font to prevent mobile iOS zoom */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hello, Akshra Ai here."
              className="w-full bg-transparent text-[16px] sm:text-base text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-400 outline-none pr-2 font-normal"
            />

            {/* Send button with comfortable touch target */}
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
          </div>
        </form>

        {/* Quick Suggestion Pills with responsive wrap */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-1 sm:pt-2 max-w-xl px-1">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSubmit(item.label)}
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
