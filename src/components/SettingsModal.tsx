"use client";

import React from "react";
import { X, Trash2, Sparkles, Download, CheckCircle2 } from "lucide-react";
import { useTheme } from "next-themes";
import { ThemeSelector } from "./ThemeSelector";
import { AVAILABLE_MODELS } from "@/lib/models";
import { usePWA } from "./PWAProvider";

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
  const { isInstalled, promptInstall } = usePWA();

  if (!isOpen) return null;

  const currentModel =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[88vh] flex flex-col bg-white dark:bg-[#202123] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl z-10 overflow-hidden text-neutral-900 dark:text-neutral-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <h3 className="text-sm sm:text-base font-semibold">Settings</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
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

          {/* App Installation / PWA status */}
          <div className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-800/80">
            <div>
              <p className="text-sm font-medium">App Installation</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isInstalled
                  ? "Running in standalone app mode"
                  : "Install Akshra Ai for faster launch & native experience"}
              </p>
            </div>

            {isInstalled ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl font-medium border border-emerald-200 dark:border-emerald-800 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Installed</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={promptInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium hover:opacity-90 transition cursor-pointer shadow-xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
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
              <span>Akshra Ai</span>
            </div>
            <p>Developed by <a href="https://www.rohanjaiswal.co.in " target="_blank" className="text-blue-500 dark:text-blue-400 hover:underline">www.rohanjaiswal.co.in</a></p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 sm:px-6 py-3 bg-neutral-50 dark:bg-[#1a1b1e] border-t border-neutral-200 dark:border-neutral-800 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium hover:opacity-90 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
