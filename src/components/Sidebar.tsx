"use client";

import React from "react";
import {
  SidebarToggleIcon,
  NewChatIcon,
  AkshraLogo,
} from "./icons";
import {
  Settings,
  ChevronRight,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { ThemeSelector } from "./ThemeSelector";

export interface SavedChat {
  id: string;
  title: string;
  messages: any[];
  updatedAt: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  isHistoryEnabled: boolean;
  chatHistory: SavedChat[];
  activeChatId: string | null;
  onSelectChat: (chat: SavedChat) => void;
  onDeleteChat: (chatId: string) => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  onNewChat,
  onOpenSettings,
  isHistoryEnabled,
  chatHistory,
  activeChatId,
  onSelectChat,
  onDeleteChat,
}: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Expanded Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out select-none border-r ${
          isOpen
            ? "w-[260px] translate-x-0 bg-[#f9f9f9] dark:bg-[#171717] border-neutral-200/80 dark:border-neutral-800"
            : "-translate-x-full w-[260px] pointer-events-none"
        }`}
      >
        {/* Top bar of expanded sidebar: Akshra Logo + Toggle Sidebar button */}
        <div className="h-14 px-3 flex items-center justify-between border-b border-transparent">
          <button
            onClick={onNewChat}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition text-neutral-800 dark:text-neutral-200"
            title="Akshra Ai"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shadow-xs">
              <AkshraLogo className="w-5 h-5" />
            </div>
            {/* <span className="font-semibold text-sm tracking-tight">Akshra Ai</span> */}
          </button>

          <button
            onClick={onToggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-200/70 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition cursor-pointer"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <SidebarToggleIcon className="w-5 h-5" />
          </button>
        </div>

        {/* "New chat" button */}
        <div className="px-3 pt-2 pb-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 dark:bg-[#212121] dark:hover:bg-[#2c2c2c] text-neutral-800 dark:text-neutral-200 text-sm font-medium transition group cursor-pointer"
          >
            <NewChatIcon className="w-4 h-4 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition" />
            <span>New chat</span>
          </button>
        </div>

        {/* Central Area: Real Chat History (if enabled in settings) or Clean area (if disabled) */}
        {isHistoryEnabled ? (
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            <div className="px-3 py-1 text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Recent Chats
            </div>
            {chatHistory.length > 0 ? (
              chatHistory.map((chat) => {
                const isActive = activeChatId === chat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => onSelectChat(chat)}
                    className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] cursor-pointer transition ${
                      isActive
                        ? "bg-neutral-200/80 dark:bg-neutral-800 font-medium text-neutral-900 dark:text-white"
                        : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    <span className="truncate pr-2">{chat.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition cursor-pointer"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-4 text-xs text-neutral-400 dark:text-neutral-500 text-center">
                No recent chats yet
              </div>
            )}
          </div>
        ) : (
          /* Clean central area without history (matching Screenshot 2) */
          <div className="flex-1" />
        )}

        {/* Bottom footer: Theme selector + Settings */}
        <div className="p-3 border-t border-neutral-200/80 dark:border-neutral-800/80 space-y-3 bg-[#f9f9f9] dark:bg-[#171717]">
          {/* Theme selector section (label removed) */}
          <ThemeSelector compact={false} />

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <span>Settings</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          </button>
        </div>
      </aside>

      {/* Collapsed Rail (Visible when sidebar is closed) - with min-100vh right border line */}
      {!isOpen && (
        <div className="fixed top-0 bottom-0 left-0 z-30 w-14 sm:w-16 min-h-screen border-r border-neutral-200 dark:border-neutral-800 bg-[var(--sidebar-bg)] flex flex-col items-center py-3 gap-2 select-none transition-colors">
          {/* Toggle Sidebar button */}
          <button
            onClick={onToggle}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
            title="Open sidebar"
            aria-label="Open sidebar"
          >
            <SidebarToggleIcon className="w-5 h-5" />
          </button>

          {/* New Chat icon button */}
          <button
            onClick={onNewChat}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
            title="New chat"
            aria-label="New chat"
          >
            <NewChatIcon className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}
