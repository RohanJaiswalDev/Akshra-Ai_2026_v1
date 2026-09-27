"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Check } from "lucide-react";

interface ThemeSelectorProps {
  compact?: boolean;
}

const emptySubscribe = () => () => { };

export function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Client hydration check without synchronous setState in effect
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const themes = [
    { id: "light", label: "Light", icon: Sun, title: "Light Mode" },
    { id: "dark", label: "Dark", icon: Moon, title: "Dark Mode" },
  ] as const;

  if (!mounted) {
    return (
      <div
        className={
          compact
            ? "h-8 sm:h-9 w-8 sm:w-9 rounded-full bg-neutral-200/60 dark:bg-neutral-800/60 animate-pulse"
            : "h-9 w-full rounded-xl bg-neutral-200/60 dark:bg-neutral-800/60 animate-pulse"
        }
      />
    );
  }

  const currentThemeObj = themes.find((t) => t.id === theme) || themes[1];
  const CurrentIcon = currentThemeObj.icon;

  // Compact version for the top Header (icon-only button with dropdown)
  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-[#1e1e1e] hover:bg-neutral-100 dark:hover:bg-[#2a2a2a] text-neutral-800 dark:text-neutral-200 flex items-center justify-center transition shadow-xs cursor-pointer select-none"
          title={`Theme: ${currentThemeObj.label}`}
          aria-label="Change theme"
        >
          <CurrentIcon className="w-4 h-4 text-neutral-700 dark:text-neutral-200" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="space-y-1">
                {themes.map(({ id, label, icon: Icon, title }) => {
                  const isSelected = theme === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setTheme(id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all cursor-pointer ${isSelected
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-semibold shadow-xs"
                        : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#282828]"
                        }`}
                      title={title}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Full segmented pill switcher (icon + tooltip)
  return (
    <div className="w-full flex items-center p-1 bg-[#eeeeee] dark:bg-[#111111] rounded-xl border border-neutral-300/70 dark:border-neutral-800 shadow-inner">
      {themes.map(({ id, icon: Icon, title }) => {
        const isActive = theme === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            className={`flex-1 flex items-center justify-center py-2 px-2 rounded-lg transition-all duration-150 cursor-pointer ${isActive
              ? "bg-white text-neutral-950 font-semibold shadow-xs border border-neutral-300/80 dark:bg-[#2c2c2c] dark:text-white dark:border-neutral-600/70"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-white/40 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-[#1a1a1a]"
              }`}
            title={title}
            aria-label={title}
          >
            <Icon
              className={`w-4 h-4 ${isActive
                ? "text-neutral-950 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400"
                }`}
            />
          </button>
        );
      })}
    </div>
  );
}
