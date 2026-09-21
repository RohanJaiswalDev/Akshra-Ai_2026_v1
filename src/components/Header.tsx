"use client";

import React, { useState } from "react";
import { ThemeSelector } from "./ThemeSelector";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { type AuthUser } from "./AuthModals";

interface HeaderProps {
  onOpenLogin: () => void;
  onOpenSignup: () => void;
  isSidebarOpen: boolean;
  user: AuthUser | null;
  onLogout: () => void;
}

export function Header({
  onOpenLogin,
  onOpenSignup,
  isSidebarOpen,
  user,
  onLogout,
}: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 w-full h-14 sm:h-16 flex items-center justify-between px-6 sm:px-10 md:px-12 select-none bg-transparent">
      {/* Left: Brand name */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 group cursor-pointer"
        >
          <span className="text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 transition-colors">
            Akshra Ai
          </span>
          <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors" />
        </button>
      </div>

      {/* Right: Auth action buttons + Theme Switcher */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Theme Switcher */}
        <ThemeSelector compact={true} />

        {/* Authenticated State: User Avatar & Dropdown */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold text-xs sm:text-sm flex items-center justify-center shadow-xs cursor-pointer hover:opacity-90 transition active:scale-95 uppercase"
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
          <>
            <button
              onClick={onOpenLogin}
              className="h-8 sm:h-9 px-3.5 sm:px-4 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs sm:text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
            >
              Log in
            </button>

            <button
              onClick={onOpenSignup}
              className="h-8 sm:h-9 px-3.5 sm:px-4 rounded-full bg-white text-black border border-neutral-300 hover:bg-neutral-50 dark:bg-transparent dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800 text-xs sm:text-sm font-medium active:scale-[0.98] transition-all shadow-sm cursor-pointer"
            >
              Sign up for free
            </button>
          </>
        )}
      </div>
    </header>
  );
}
