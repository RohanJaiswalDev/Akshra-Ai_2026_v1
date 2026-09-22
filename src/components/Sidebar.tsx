"use client";

import React, { useState } from "react";
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
  LogOut,
  User as UserIcon,
  Download,
  Lock,
} from "lucide-react";
import { ThemeSelector } from "./ThemeSelector";
import { type AuthUser } from "./AuthModals";
import { usePWA } from "./PWAProvider";

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
  user: AuthUser | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  onOpenSignup: () => void;
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
  user,
  onLogout,
  onOpenLogin,
  onOpenSignup,
}: SidebarProps) {
  const [isRailUserMenuOpen, setIsRailUserMenuOpen] = useState(false);
  const [isExpandedUserMenuOpen, setIsExpandedUserMenuOpen] = useState(false);
  const { isInstalled, promptInstall } = usePWA();

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Expanded Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 md:z-40 flex flex-col transition-all duration-300 ease-in-out select-none border-r ${isOpen
          ? "w-[280px] max-w-[85vw] sm:w-[260px] translate-x-0 bg-[#f9f9f9] dark:bg-[#171717] border-neutral-200/80 dark:border-neutral-800 shadow-2xl md:shadow-none"
          : "-translate-x-full w-[280px] sm:w-[260px] pointer-events-none"
          }`}
      >
        {/* Top bar of expanded sidebar: Akshra Logo + Toggle Sidebar button */}
        <div className="h-14 px-3 flex items-center justify-between border-b border-transparent shrink-0">
          <button
            onClick={onNewChat}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition text-neutral-800 dark:text-neutral-200 cursor-pointer"
            title="Akshra Ai"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shadow-xs">
              <AkshraLogo className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">
              Akshra Ai
            </span>
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
        <div className="px-3 pt-2 pb-2 shrink-0">
          <button
            onClick={() => {
              if (!user) {
                onOpenLogin();
              } else {
                onNewChat();
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 dark:bg-[#212121] dark:hover:bg-[#2c2c2c] text-neutral-800 dark:text-neutral-200 text-sm font-medium transition group cursor-pointer shadow-2xs"
          >
            <NewChatIcon className="w-4 h-4 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition" />
            <span>New chat</span>
          </button>
        </div>

        {/* Central Area: Real Chat History or Sign-in Prompt */}
        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 text-center space-y-3 min-h-0">
            <div className="w-9 h-9 rounded-full bg-neutral-200/60 dark:bg-neutral-800/80 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
              <Lock className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Chat History
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-[200px]">
                Sign in to save and sync your conversations with Akshra Ai.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-4 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium hover:opacity-90 active:scale-95 transition cursor-pointer shadow-2xs"
            >
              Sign in
            </button>
          </div>
        ) : isHistoryEnabled ? (
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 min-h-0">
            <div className="px-3 py-1 text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Recent Chats
            </div>
            {chatHistory && chatHistory.length > 0 ? (
              chatHistory.map((chat) => {
                const isActive = activeChatId === chat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => onSelectChat(chat)}
                    className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-[13px] cursor-pointer transition ${isActive
                      ? "bg-neutral-200/80 dark:bg-neutral-800 font-medium text-neutral-900 dark:text-white shadow-2xs"
                      : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/60"
                      }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                      <span className="truncate pr-1">
                        {chat.title || "New Conversation"}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/60 rounded-md transition cursor-pointer shrink-0"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-6 text-xs text-neutral-400 dark:text-neutral-500 text-center">
                No recent chats yet
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 px-3 py-4 text-xs text-neutral-400 text-center">
            Chat history is off in Settings.
          </div>
        )}

        {/* Bottom footer: Theme selector + Settings + User Auth at the very end */}
        <div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-neutral-200/80 dark:border-neutral-800/80 space-y-2.5 bg-[#f9f9f9] dark:bg-[#171717] shrink-0">
          {/* Theme selector section */}
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

          {/* Install App button (PWA) */}
          {!isInstalled && (
            <button
              onClick={promptInstall}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition cursor-pointer group"
            >
              <span className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition" />
                <span>Install App</span>
              </span>
              <span className="text-[10px] bg-neutral-200/80 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md font-medium text-neutral-500 dark:text-neutral-400">
                Android/IOS
              </span>
            </button>
          )}

          {/* User Auth Section at the very end of expanded sidebar */}
          {user ? (
            <div className="relative pt-1 border-t border-neutral-200/60 dark:border-neutral-800/60">
              <button
                onClick={() => setIsExpandedUserMenuOpen(!isExpandedUserMenuOpen)}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold text-xs flex items-center justify-center shrink-0 uppercase shadow-xs">
                    {user.email.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isExpandedUserMenuOpen ? "-rotate-90" : ""
                    }`}
                />
              </button>

              {isExpandedUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsExpandedUserMenuOpen(false)}
                  />
                  <div className="absolute left-2 right-2 bottom-14 bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150 text-neutral-900 dark:text-neutral-100">
                    <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800/80 mb-1">
                      <p className="text-xs font-semibold truncate">{user.name}</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setIsExpandedUserMenuOpen(false);
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
            <div className="flex items-center gap-2 pt-1 border-t border-neutral-200/60 dark:border-neutral-800/60">
              <button
                onClick={onOpenLogin}
                className="flex-1 py-1.5 px-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium hover:opacity-90 transition cursor-pointer text-center"
              >
                Log in
              </button>
              <button
                onClick={onOpenSignup}
                className="flex-1 py-1.5 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium transition cursor-pointer text-center"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Collapsed Rail (Visible when sidebar is closed on desktop/tablet) */}
      {!isOpen && (
        <div className="fixed top-0 bottom-0 left-0 z-30 hidden md:flex w-14 sm:w-16 h-screen h-[100dvh] border-r border-neutral-200 dark:border-neutral-800 bg-[var(--sidebar-bg)] flex-col justify-between items-center py-3 select-none transition-colors">
          {/* Top: Toggle Sidebar & New Chat buttons */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onToggle}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
              title="Open sidebar"
              aria-label="Open sidebar"
            >
              <SidebarToggleIcon className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                if (!user) {
                  onOpenLogin();
                } else {
                  onNewChat();
                }
              }}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
              title="New chat"
              aria-label="New chat"
            >
              <NewChatIcon className="w-5 h-5" />
            </button>

            {!isInstalled && (
              <button
                onClick={promptInstall}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
                title="Install Akshra Ai App"
                aria-label="Install App"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Bottom: Auth / User Avatar & Logout Dropdown at the very end of rail */}
          <div className="relative flex flex-col items-center gap-2 pb-1">
            {user ? (
              <>
                <button
                  onClick={() => setIsRailUserMenuOpen(!isRailUserMenuOpen)}
                  className="w-8 h-8 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold text-xs flex items-center justify-center shadow-xs cursor-pointer hover:opacity-90 transition active:scale-95 uppercase"
                  title={user.email}
                >
                  {user.email.charAt(0)}
                </button>

                {isRailUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsRailUserMenuOpen(false)}
                    />
                    <div className="absolute left-14 sm:left-16 bottom-1 w-52 bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150 text-neutral-900 dark:text-neutral-100">
                      <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800/80 mb-1">
                        <p className="text-xs font-semibold truncate">{user.name}</p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setIsRailUserMenuOpen(false);
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
              </>
            ) : (
              <button
                onClick={onOpenLogin}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 flex items-center justify-center transition cursor-pointer shadow-xs"
                title="Log in"
              >
                <UserIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
