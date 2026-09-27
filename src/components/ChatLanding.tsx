"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Code2,
  Compass,
  Lightbulb,
  PenLine,
  Lock,
  Mic,
  Brain,
  Globe,
  Paperclip,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { type AuthUser } from "./AuthModals";
import { unlockAudioAndSpeech } from "@/lib/useVoiceAssistant";
import { FileAttachment } from "@/types/files";
import { useFileUpload } from "@/lib/useFileUpload";
import { AttachedFileChip, FileQuickPrompts } from "./FileAttachmentUI";

interface ChatLandingProps {
  onSubmit: (prompt: string, attachments?: FileAttachment[]) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    attachments,
    isUploading,
    uploadError,
    setUploadError,
    isDragging,
    setIsDragging,
    uploadFiles,
    removeAttachment,
    clearAttachments,
  } = useFileUpload();

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
      submitForm();
    }
  };

  const submitForm = () => {
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;

    // If text is empty but files are attached, use intelligent default
    const finalPrompt = trimmed || `Please analyze this attached file in detail.`;
    onSubmit(finalPrompt, attachments.length > 0 ? attachments : undefined);
    setInput("");
    clearAttachments();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenLogin();
      return;
    }
    submitForm();
  };

  const handleSuggestionClick = (prompt: string) => {
    if (!user) {
      onOpenLogin();
      return;
    }
    onSubmit(prompt, attachments.length > 0 ? attachments : undefined);
    clearAttachments();
  };

  // Drag and Drop handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user && !isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!user) {
      onOpenLogin();
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files);
    }
  };

  const suggestions = [
    { icon: Code2, label: "Write a React hook for debounce" },
    { icon: Compass, label: "Help me debug Next.js App Router" },
    { icon: Lightbulb, label: "Brainstorm AI app features" },
    { icon: PenLine, label: "Draft a modern tech blog post" },
  ];

  const canSubmit = input.trim().length > 0 || attachments.length > 0;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative w-full flex-1 flex flex-col items-center justify-center px-3 sm:px-8 md:px-16 -mt-4 sm:-mt-10 select-none overflow-y-auto py-6"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-4 z-40 rounded-3xl border-2 border-dashed border-sky-400 bg-sky-50/80 dark:bg-sky-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 animate-in fade-in duration-150 pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-600 dark:text-sky-300 flex items-center justify-center shadow-lg">
            <UploadCloud className="w-8 h-8 animate-bounce" />
          </div>
          <div className="text-center px-4">
            <p className="text-base font-semibold text-sky-900 dark:text-sky-100">
              Drop files to attach to Akshra AI
            </p>
            <p className="text-xs text-sky-700 dark:text-sky-300 mt-1">
              Supports PDF, DOCX, XLSX, CSV, JSON, TXT, and Images
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-5 sm:space-y-6 animate-in fade-in zoom-in-95 duration-300">
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

        {/* Attached Files Chips Container */}
        {attachments.length > 0 && (
          <div className="w-full flex flex-wrap items-center justify-center gap-2 px-2 animate-in fade-in duration-200">
            {attachments.map((file) => (
              <AttachedFileChip
                key={file.id}
                file={file}
                onRemove={() => removeAttachment(file.id)}
              />
            ))}
          </div>
        )}

        {/* Upload error message */}
        {uploadError && (
          <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl px-3 py-1.5 flex items-center gap-2 animate-in fade-in duration-150">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-rose-400 hover:text-rose-700 ml-1 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Prompt Input Capsule */}
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
              } px-3 sm:px-5 py-2 sm:py-3`}
          >
            {/* Paperclip File Attach Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!user) {
                  onOpenLogin();
                  return;
                }
                fileInputRef.current?.click();
              }}
              disabled={isUploading}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-full flex items-center justify-center shrink-0 mr-1.5 transition-all active:scale-95 cursor-pointer ${attachments.length > 0
                ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-400/50"
                : "text-neutral-400 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              title="Attach files (PDF, DOCX, XLSX, CSV, JSON, TXT, Images)"
              aria-label="Attach file"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
              {attachments.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center shadow-2xs">
                  {attachments.length}
                </span>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls,.json,image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  uploadFiles(e.target.files);
                  e.target.value = "";
                }
              }}
              className="hidden"
            />

            {/* Input Field with exact placeholder and 16px font to prevent mobile iOS zoom */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                user
                  ? attachments.length > 0
                    ? `Ask about ${attachments.length === 1 ? `"${attachments[0].name}"` : `${attachments.length} attached files`}...`
                    : "Hello, Akshra Ai here."
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
                  unlockAudioAndSpeech();
                  onOpenVoice();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-full flex items-center justify-center shrink-0 mr-1 text-neutral-500 hover:text-cyan-600 dark:text-neutral-400 dark:hover:text-cyan-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition active:scale-95 cursor-pointer touch-manipulation"
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
                disabled={!canSubmit || isUploading}
                className={`w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-full flex items-center justify-center shrink-0 transition-all ${canSubmit && !isUploading
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

        {/* Dynamic Contextual Prompts for Attached Files */}
        {attachments.length > 0 && (
          <FileQuickPrompts
            attachments={attachments}
            onSelectPrompt={(prompt) => {
              setInput(prompt);
              inputRef.current?.focus();
            }}
          />
        )}

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
        {attachments.length === 0 && (
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
        )}
      </div>
    </div>
  );
}
