"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Trash2,
  Download,
  CheckCircle2,
  User,
  Palette,
  MessageSquare,
  Brain,
  Mic,
  Keyboard,
  Info,
  LogOut,
  Plus,
  Loader2,
  FileJson,
} from "lucide-react";
import { ThemeSelector } from "./ThemeSelector";
import { usePWA } from "./PWAProvider";
import { type AuthUser } from "./AuthModals";

type SettingsTab =
  | "account"
  | "appearance"
  | "chat"
  | "memory"
  | "voice"
  | "shortcuts"
  | "about";

interface MemoryItem {
  id: string;
  content: string;
  enabled: boolean;
  createdAt?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  onLogout: () => void;
  isHistoryEnabled: boolean;
  onToggleHistory: (enabled: boolean) => void;
  onClearHistory?: () => void;
  chatHistoryForExport?: unknown;
  voicePersonality: "natural" | "professional" | "friendly" | "teacher" | "developer";
  onSelectVoicePersonality: (
    p: "natural" | "professional" | "friendly" | "teacher" | "developer"
  ) => void;
  voiceSpeechRate: number;
  onSelectVoiceSpeechRate: (rate: number) => void;
  voiceLanguage: string;
  onSelectVoiceLanguage: (lang: string) => void;
  isMemoryEnabled: boolean;
  onToggleMemory: (enabled: boolean) => void;
}

const PERSONALITY_OPTIONS: {
  id: "natural" | "professional" | "friendly" | "teacher" | "developer";
  name: string;
  desc: string;
}[] = [
    {
      id: "natural",
      name: "Natural",
      desc: "Human, conversational, and balanced tone.",
    },
    {
      id: "professional",
      name: "Professional",
      desc: "Concise, structured, and executive tone.",
    },
    {
      id: "friendly",
      name: "Warm & Friendly",
      desc: "Empathetic, upbeat, and encouraging.",
    },
    {
      id: "teacher",
      name: "Teacher / Mentor",
      desc: "Patient, pedagogical step-by-step guidance.",
    },
    {
      id: "developer",
      name: "Senior Developer",
      desc: "Direct, technical, and code-first solutions.",
    },
  ];

const LANGUAGE_OPTIONS = [
  { code: "en-US", name: "English (US)" },
  { code: "en-IN", name: "English (India)" },
  { code: "hi-IN", name: "Hindi (India)" },
  { code: "es-ES", name: "Spanish (Spain)" },
  { code: "fr-FR", name: "French (France)" },
  { code: "de-DE", name: "German (Germany)" },
  { code: "ja-JP", name: "Japanese (Japan)" },
];

export function SettingsModal({
  isOpen,
  onClose,
  user,
  onLogout,
  isHistoryEnabled,
  onToggleHistory,
  onClearHistory,
  chatHistoryForExport,
  voicePersonality,
  onSelectVoicePersonality,
  voiceSpeechRate,
  onSelectVoiceSpeechRate,
  voiceLanguage,
  onSelectVoiceLanguage,
  isMemoryEnabled,
  onToggleMemory,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const { isInstalled, promptInstall } = usePWA();

  // Memory state
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [newMemoryInput, setNewMemoryInput] = useState("");
  const [isSubmittingMemory, setIsSubmittingMemory] = useState(false);

  // Fetch memories when modal opens or tab switches to memory
  useEffect(() => {
    let isCancelled = false;
    if (isOpen && activeTab === "memory" && user) {
      const timer = setTimeout(() => {
        if (!isCancelled) setIsLoadingMemories(true);
      }, 0);

      fetch("/api/user/memories")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!isCancelled && data && Array.isArray(data.memories)) {
            setMemories(data.memories);
          }
        })
        .catch(() => {
          // silently catch
        })
        .finally(() => {
          if (!isCancelled) setIsLoadingMemories(false);
        });

      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    }
  }, [isOpen, activeTab, user]);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryInput.trim() || isSubmittingMemory) return;

    setIsSubmittingMemory(true);
    try {
      const res = await fetch("/api/user/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMemoryInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.memory) {
          setMemories((prev) => [data.memory, ...prev]);
          setNewMemoryInput("");
        }
      }
    } catch {
      // ignore
    } finally {
      setIsSubmittingMemory(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const res = await fetch(`/api/user/memories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch {
      // ignore
    }
  };

  const handleClearAllMemories = async () => {
    if (!confirm("Are you sure you want to clear all remembered preferences?")) return;
    try {
      const res = await fetch("/api/user/memories", { method: "DELETE" });
      if (res.ok) {
        setMemories([]);
      }
    } catch {
      // ignore
    }
  };

  const handleExportChats = () => {
    try {
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(chatHistoryForExport || [], null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `akshra_ai_chats_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  if (!isOpen) return null;

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "account", label: "Account", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "chat", label: "Chat & Data", icon: MessageSquare },
    { id: "memory", label: "Memory", icon: Brain },
    { id: "voice", label: "Voice Assistant", icon: Mic },
    { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
    { id: "about", label: "About", icon: Info },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl h-[90vh] max-h-[640px] flex flex-col bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-10 overflow-hidden text-neutral-900 dark:text-neutral-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <h3 className="text-sm sm:text-base font-semibold">Settings</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Split View (Tabs Navigation + Tab Content) */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Tabs navigation: Horizontal scroll on mobile, Vertical on desktop */}
          <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible shrink-0 md:w-48 p-2 md:p-3 border-b md:border-b-0 md:border-r border-neutral-200 dark:border-neutral-800 gap-1 bg-neutral-50/50 dark:bg-neutral-900/30">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium transition cursor-pointer whitespace-nowrap shrink-0 text-left ${isActive
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                    }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Panel */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* 1. Account Tab */}
            {activeTab === "account" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                  <h4 className="text-sm font-semibold">Account Profile</h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Manage your credentials and session persistence
                  </p>
                </div>

                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
                      <div className="w-10 h-10 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold text-sm flex items-center justify-center uppercase shrink-0">
                        {user.email.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs py-2 border-b border-neutral-100 dark:border-neutral-800/80">
                        <span className="text-neutral-500 dark:text-neutral-400">Database Sync</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Account Isolated (MongoDB Atlas)
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          onLogout();
                          onClose();
                        }}
                        className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/40 transition cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign out of this session</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center space-y-2">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      You are currently using guest mode. Sign in to synchronize chats across devices and isolate your private memories.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 2. Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                  <h4 className="text-sm font-semibold">Theme & Display</h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Customize the look and feel of the interface
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Interface Theme
                  </p>
                  <ThemeSelector compact={false} />
                </div>
              </div>
            )}

            {/* 3. Chat & Data Tab */}
            {activeTab === "chat" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                  <h4 className="text-sm font-semibold">Chat History & Data</h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Control conversation persistence and backups
                  </p>
                </div>

                {/* History toggle */}
                <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800/80">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">Save Chat History</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {isHistoryEnabled
                        ? "Chats are preserved and organized in your sidebar"
                        : "History is off. New chats will not be saved"}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isHistoryEnabled}
                    onClick={() => onToggleHistory(!isHistoryEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shrink-0 ${isHistoryEnabled
                      ? "bg-neutral-900 dark:bg-white"
                      : "bg-neutral-300 dark:bg-neutral-700"
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white dark:bg-neutral-900 shadow-md transition-transform duration-200 ${isHistoryEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>

                {/* Export Data */}
                <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800/80">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">Export Conversations</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Download all saved conversations as a JSON file
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportChats}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer shrink-0"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>
                </div>

                {/* Clear All Chats */}
                {isHistoryEnabled && onClearHistory && (
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">
                        Clear All Conversations
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Permanently erase your entire chat history
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClearHistory}
                      className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 4. Memory Tab */}
            {activeTab === "memory" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                  <h4 className="text-sm font-semibold">Akshra Memory System</h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Preferences and context remembered across all your chats
                  </p>
                </div>

                {/* Memory toggle */}
                <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800/80">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">Enable Memory Guidance</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {isMemoryEnabled
                        ? "Active memories are incorporated naturally into answers"
                        : "Memory is disabled for prompt completions"}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isMemoryEnabled}
                    onClick={() => onToggleMemory(!isMemoryEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shrink-0 ${isMemoryEnabled
                      ? "bg-neutral-900 dark:bg-white"
                      : "bg-neutral-300 dark:bg-neutral-700"
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white dark:bg-neutral-900 shadow-md transition-transform duration-200 ${isMemoryEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>

                {/* Add new memory form */}
                {user ? (
                  <div className="space-y-3">
                    <form onSubmit={handleAddMemory} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g., I write code in TypeScript and Next.js"
                        value={newMemoryInput}
                        onChange={(e) => setNewMemoryInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl text-xs border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                      />
                      <button
                        type="submit"
                        disabled={!newMemoryInput.trim() || isSubmittingMemory}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-medium hover:opacity-90 disabled:opacity-40 transition cursor-pointer shrink-0"
                      >
                        {isSubmittingMemory ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Add</span>
                      </button>
                    </form>

                    {/* Memories list */}
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {isLoadingMemories ? (
                        <div className="flex items-center justify-center py-6 text-neutral-400 text-xs">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span>Loading memories...</span>
                        </div>
                      ) : memories.length === 0 ? (
                        <p className="text-xs text-neutral-400 py-3 text-center">
                          No memories added yet. Add a preference above to guide Akshra AI.
                        </p>
                      ) : (
                        memories.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 text-xs"
                          >
                            <span className="flex-1 truncate">{m.content}</span>
                            <button
                              onClick={() => handleDeleteMemory(m.id)}
                              className="p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer shrink-0"
                              title="Delete memory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {memories.length > 1 && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={handleClearAllMemories}
                          className="text-[11px] text-red-500 hover:underline cursor-pointer"
                        >
                          Clear all memories
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 py-2">
                    Sign in to configure personalized memory preferences.
                  </p>
                )}
              </div>
            )}

            {/* 5. Voice Assistant Tab */}
            {activeTab === "voice" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                  <h4 className="text-sm font-semibold">Voice Personality & Speech</h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Tune the conversational voice assistant style and speed
                  </p>
                </div>

                {/* Personality selector */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Voice Personality
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {PERSONALITY_OPTIONS.map((p) => {
                      const isSelected = voicePersonality === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onSelectVoicePersonality(p.id)}
                          className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer ${isSelected
                            ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800/80"
                            : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30"
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold">{p.name}</span>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 dark:text-white" />
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {p.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Speech rate slider */}
                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Speech Rate</span>
                    <span className="text-xs text-neutral-500">{voiceSpeechRate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={voiceSpeechRate}
                    onChange={(e) => onSelectVoiceSpeechRate(parseFloat(e.target.value))}
                    className="w-full accent-neutral-900 dark:accent-white cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400">
                    <span>0.8x (Slower)</span>
                    <span>1.0x (Default)</span>
                    <span>1.3x (Faster)</span>
                  </div>
                </div>

                {/* Language Recognition selector */}
                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Speech Recognition Language
                  </p>
                  <select
                    value={voiceLanguage}
                    onChange={(e) => onSelectVoiceLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none cursor-pointer"
                  >
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 6. Shortcuts Tab */}
            {activeTab === "shortcuts" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                  <h4 className="text-sm font-semibold">Keyboard Shortcuts</h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Work faster with productivity keyboard commands
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800/80">
                    <span className="text-neutral-600 dark:text-neutral-400">Start New Chat</span>
                    <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md font-mono text-[11px]">
                      Ctrl + K
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800/80">
                    <span className="text-neutral-600 dark:text-neutral-400">Search Chats</span>
                    <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md font-mono text-[11px]">
                      Ctrl + /
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800/80">
                    <span className="text-neutral-600 dark:text-neutral-400">Send Message</span>
                    <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md font-mono text-[11px]">
                      Enter
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800/80">
                    <span className="text-neutral-600 dark:text-neutral-400">Insert Line Break</span>
                    <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md font-mono text-[11px]">
                      Shift + Enter
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-neutral-600 dark:text-neutral-400">Close Modals / Interrupt Voice</span>
                    <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md font-mono text-[11px]">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>
            )}

            {/* 7. About Tab */}
            {activeTab === "about" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                  <h4 className="text-sm font-semibold">About Akshra AI</h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Application information and credits
                  </p>
                </div>

                <div className="space-y-3 text-xs text-neutral-600 dark:text-neutral-400">
                  <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Akshra AI — Version 1.0 (2026)
                    </p>
                    <p className="text-[11px]">
                      A high-speed, intelligent AI workspace featuring multi-model routing, pipelined conversational voice assistance, and persistent encrypted session memory.
                    </p>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800/80">
                    <span>Developer</span>
                    <a
                      href="https://www.rohanjaiswal.co.in"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-neutral-900 dark:text-neutral-100 hover:underline"
                    >
                      Rohan Jaiswal (rohanjaiswal.co.in)
                    </a>
                  </div>

                  {/* PWA Section */}
                  <div className="flex items-center justify-between py-2">
                    <span>Desktop / Mobile App</span>
                    {isInstalled ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Installed
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={promptInstall}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium hover:opacity-90 transition cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Install App</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 sm:px-6 py-3 bg-neutral-50 dark:bg-[#151515] border-t border-neutral-200 dark:border-neutral-800 shrink-0">
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
