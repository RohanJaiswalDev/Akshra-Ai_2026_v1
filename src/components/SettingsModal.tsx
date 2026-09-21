"use client";

import React from "react";
import { X, Trash2, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { ThemeSelector } from "./ThemeSelector";
import { AVAILABLE_MODELS } from "@/lib/models";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHistoryEnabled: boolean;
  onToggleHistory: (enabled: boolean) => void;
  onClearHistory?: () => void;
  selectedModel?: string;
  onSelectModel?: (modelId: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  isHistoryEnabled,
  onToggleHistory,
  onClearHistory,
  selectedModel,
  onSelectModel,
}: SettingsModalProps) {
  const { theme } = useTheme();

  if (!isOpen) return null;

  const currentModel =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-[#202123] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl z-10 overflow-hidden text-neutral-900 dark:text-neutral-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-base font-semibold">Settings</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Theme setting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-neutral-100 dark:border-neutral-800/80">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Choose how Akshra Ai looks for you
              </p>
            </div>
            <div className="w-full sm:w-48">
              <ThemeSelector compact={false} />
            </div>
          </div>

          {/* Real Chat History Toggle Switch */}
          <div className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-800/80">
            <div>
              <p className="text-sm font-medium">Chat History & Persistence</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isHistoryEnabled
                  ? "Chat history is saved and shown in the sidebar"
                  : "Chat history is off. Conversations won't be saved"}
              </p>
            </div>

            {/* Interactive Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isHistoryEnabled}
              onClick={() => onToggleHistory(!isHistoryEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shrink-0 ${isHistoryEnabled
                ? "bg-neutral-900 dark:bg-white"
                : "bg-neutral-300 dark:bg-neutral-700"
                }`}
              title={isHistoryEnabled ? "Disable chat history" : "Enable chat history"}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white dark:bg-neutral-900 shadow-md transition-transform duration-200 ${isHistoryEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
              />
            </button>
          </div>

          {/* Model selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-neutral-100 dark:border-neutral-800/80">
            <div>
              <p className="text-sm font-medium">Active AI Model</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Powered via OpenRouter API
              </p>
            </div>
            {onSelectModel ? (
              <select
                value={selectedModel || currentModel.id}
                onChange={(e) => onSelectModel(e.target.value)}
                className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 font-mono text-neutral-700 dark:text-neutral-300">
                {currentModel.name}
              </span>
            )}
          </div>

          {/* Clear History Option (if enabled) */}
          {isHistoryEnabled && onClearHistory && (
            <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800/80">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Clear chat history</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Permanently delete all saved conversations
                </p>
              </div>
              <button
                type="button"
                onClick={onClearHistory}
                className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          )}

          {/* About */}
          <div className="pt-2 text-xs text-neutral-500 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Akshra Ai 2026</span>
            </div>
            <p>OpenRouter API • Next.js 16 • Tailwind CSS v4 • MongoDB</p>
            <p>Full Auth & Genuine Email OTP verification enabled.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3.5 bg-neutral-50 dark:bg-[#1a1b1e] border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium hover:opacity-90 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
