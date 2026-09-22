"use client";

import React, { useState, useRef, useEffect } from "react";
import { ThemeSelector } from "./ThemeSelector";
import {
  ChevronDown,
  LogOut,
  Check,
} from "lucide-react";
import { type AuthUser } from "./AuthModals";
import { AVAILABLE_MODELS } from "@/lib/models";
import { SidebarToggleIcon } from "./icons";

interface HeaderProps {
  onOpenLogin: () => void;
  onOpenSignup: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar?: () => void;
  user: AuthUser | null;
  onLogout: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export function Header({
  onOpenLogin,
  onOpenSignup,
  isSidebarOpen,
  onToggleSidebar,
  user,
  onLogout,
  selectedModel,
  onSelectModel,
}: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const activeModelObj =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  // Close model menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modelMenuRef.current &&
        !modelMenuRef.current.contains(event.target as Node)
      ) {
        setIsModelMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getBadgeStyle = (badge?: string) => {
    switch (badge) {
      case "Free":
        return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      case "Fast":
        return "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "Reasoning":
        return "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800";
      case "Flagship":
        return "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      default:
        return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700";
    }
  };

  return (
    <header className="sticky top-0 z-20 w-full h-14 sm:h-16 flex items-center justify-between px-2.5 sm:px-6 md:px-8 select-none bg-[var(--canvas-bg)]/80 backdrop-blur-md transition-colors border-b border-neutral-200/50 dark:border-neutral-800/50">
      {/* Left: Sidebar Toggle Button + Brand name & Model Selector Pill */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Responsive Sidebar Toggle: Visible ONLY on mobile (< md), since tablet/desktop (>= md) has the rail/sidebar toggle */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="w-8 h-8 sm:w-9 sm:h-9 flex md:hidden items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition cursor-pointer shrink-0"
            title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-label="Toggle sidebar"
          >
            <SidebarToggleIcon className="w-5 h-5" />
          </button>
        )}

        <div className="relative" ref={modelMenuRef}>
          <button
            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer group"
            title="Change AI Model"
          >
            <span className="text-[15px] sm:text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Akshra Ai
            </span>
            <span className="hidden sm:inline-block text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60">
              {activeModelObj.name}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-transform duration-200 ${isModelMenuOpen ? "rotate-180" : ""
                }`}
            />
          </button>

          {/* Model Selection Dropdown */}
          {isModelMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-[calc(100vw-32px)] max-w-[340px] bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150 text-neutral-900 dark:text-neutral-100">
              <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800/80 mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Select Model
                </span>
              </div>

              <div className="max-h-[360px] overflow-y-auto space-y-1 pr-1">
                {AVAILABLE_MODELS.map((m) => {
                  const isSelected = m.id === selectedModel;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSelectModel(m.id);
                        setIsModelMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition cursor-pointer flex items-start justify-between gap-2 group ${isSelected
                        ? "bg-neutral-100 dark:bg-neutral-800/90 font-medium"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {m.name}
                          </span>
                          {m.badge && (
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md border shrink-0 ${getBadgeStyle(
                                m.badge
                              )}`}
                            >
                              {m.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                          {m.description}
                        </p>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Auth action buttons + Theme Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Quick Theme Switcher */}
        <ThemeSelector compact={true} />

        {/* Authenticated State: User Avatar & Dropdown */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold text-xs sm:text-sm flex items-center justify-center shadow-xs cursor-pointer hover:opacity-90 transition active:scale-95 uppercase shrink-0"
              title={user.email}
            >
              {user.email.charAt(0)}
            </button>

            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150 text-neutral-900 dark:text-neutral-100">
                  <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800/80 mb-1">
                    <p className="text-xs font-semibold truncate">{user.name}</p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {user.email}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Unauthenticated State: Log in & Sign up for free */
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onOpenLogin}
              className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs sm:text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all shadow-xs cursor-pointer shrink-0"
            >
              Log in
            </button>

            <button
              onClick={onOpenSignup}
              className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full bg-white text-black border border-neutral-300 hover:bg-neutral-50 dark:bg-transparent dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800 text-xs sm:text-sm font-medium active:scale-[0.98] transition-all shadow-xs cursor-pointer shrink-0"
            >
              <span>Sign up<span className="hidden sm:inline"> for free</span></span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
