"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
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
  Search,
  Pin,
  PinOff,
  Edit2,
  Archive,
  ArchiveRestore,
  Folder,
  X,
  Check,
  MoreVertical,
} from "lucide-react";
import { type AuthUser } from "./AuthModals";
import type { Message } from "./ChatMessages";
import { usePWA } from "./PWAProvider";

export interface SavedChat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
  model?: string;
  folder?: string;
  isPinned?: boolean;
  isArchived?: boolean;
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
  onRenameChat?: (chatId: string, newTitle: string) => void;
  onPinChat?: (chatId: string, isPinned: boolean) => void;
  onArchiveChat?: (chatId: string, isArchived: boolean) => void;
  onMoveFolder?: (chatId: string, folder: string) => void;
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
  onRenameChat,
  onPinChat,
  onArchiveChat,
  onMoveFolder,
  user,
  onLogout,
  onOpenLogin,
  onOpenSignup,
}: SidebarProps) {
  const [isRailUserMenuOpen, setIsRailUserMenuOpen] = useState(false);
  const [isExpandedUserMenuOpen, setIsExpandedUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const { isInstalled, promptInstall } = usePWA();

  const folders = ["all", "General", "Development", "Learning", "Personal", "archived"];

  useEffect(() => {
    if (editingChatId) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [editingChatId]);

  // Close popup menus on outside click
  useEffect(() => {
    const handleOutside = () => setOpenMenuChatId(null);
    if (openMenuChatId) {
      document.addEventListener("click", handleOutside);
    }
    return () => document.removeEventListener("click", handleOutside);
  }, [openMenuChatId]);

  // Filtered and partitioned chats
  const filteredChats = useMemo(() => {
    return chatHistory.filter((chat) => {
      // Folder filtering
      if (selectedFolder === "archived") {
        if (!chat.isArchived) return false;
      } else {
        if (chat.isArchived) return false;
        if (selectedFolder !== "all") {
          const chatFolder = chat.folder || "General";
          if (chatFolder.toLowerCase() !== selectedFolder.toLowerCase()) return false;
        }
      }

      // Search query filtering
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      if (chat.title.toLowerCase().includes(q)) return true;
      return chat.messages.some((m) => m.content.toLowerCase().includes(q));
    });
  }, [chatHistory, selectedFolder, searchQuery]);

  const pinnedChats = useMemo(() => {
    if (selectedFolder === "archived") return [];
    return filteredChats.filter((c) => c.isPinned);
  }, [filteredChats, selectedFolder]);

  const unpinnedChats = useMemo(() => {
    if (selectedFolder === "archived") return filteredChats;
    return filteredChats.filter((c) => !c.isPinned);
  }, [filteredChats, selectedFolder]);

  const handleStartRename = (chat: SavedChat) => {
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
    setOpenMenuChatId(null);
  };

  const handleSaveRename = (chatId: string) => {
    if (editTitle.trim()) {
      onRenameChat?.(chatId, editTitle.trim());
    }
    setEditingChatId(null);
  };

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
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Collapse sidebar"
          >
            <SidebarToggleIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Action: New chat button */}
        <div className="px-3 pt-1 pb-1 shrink-0 space-y-2">
          <button
            onClick={() => {
              if (!user) {
                onOpenLogin();
              } else {
                onNewChat();
              }
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 dark:bg-[#212121] dark:hover:bg-[#2c2c2c] text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm font-medium transition group cursor-pointer shadow-2xs"
          >
            <NewChatIcon className="w-4 h-4 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition" />
            <span>New chat</span>
          </button>

          {/* Phase 2: Search Chats input */}
          {user && isHistoryEnabled && (
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-7 py-1.5 bg-neutral-200/60 dark:bg-[#212121] text-xs text-neutral-900 dark:text-neutral-100 rounded-lg outline-none placeholder:text-neutral-400 focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Phase 2: Folder selector pills */}
          {user && isHistoryEnabled && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
              {folders.map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFolder(f)}
                  className={`px-2 py-0.5 rounded-md whitespace-nowrap capitalize transition cursor-pointer ${selectedFolder === f
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium"
                    : "bg-neutral-200/50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                    }`}
                >
                  {f === "archived" ? "📦 Archive" : f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Central Area: Account-synced Chat History or Sign-in Prompt */}
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
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium hover:opacity-90 active:scale-95 transition cursor-pointer shadow-2xs"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={onOpenSignup}
                className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                Sign up
              </button>
            </div>
          </div>
        ) : isHistoryEnabled ? (
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 min-h-0">
            {/* 📌 Pinned Chats Section */}
            {pinnedChats.length > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>Pinned</span>
                </div>
                {pinnedChats.map((chat) => renderChatItem(chat))}
              </div>
            )}

            {/* Standard Chats Section */}
            {unpinnedChats.length > 0 ? (
              <div>
                {pinnedChats.length > 0 && (
                  <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                    {selectedFolder === "archived" ? "Archived Chats" : "Recent"}
                  </div>
                )}
                {unpinnedChats.map((chat) => renderChatItem(chat))}
              </div>
            ) : (
              pinnedChats.length === 0 && (
                <div className="px-3 py-6 text-xs text-neutral-400 dark:text-neutral-500 text-center">
                  {searchQuery ? "No matching conversations" : "No chats in this folder yet"}
                </div>
              )
            )}
          </div>
        ) : (
          <div className="flex-1 px-3 py-4 text-xs text-neutral-400 text-center">
            Chat history is off in Settings.
          </div>
        )}

        {/* Bottom footer: Settings + User Auth */}
        <div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-neutral-200/80 dark:border-neutral-800/80 space-y-2 bg-[#f9f9f9] dark:bg-[#171717] shrink-0">
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
                PWA
              </span>
            </button>
          )}

          {user && (
            <div className="relative">
              <button
                onClick={() => setIsExpandedUserMenuOpen(!isExpandedUserMenuOpen)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold flex items-center justify-center shrink-0 uppercase shadow-2xs">
                  {user.email.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                    {user.email}
                  </p>
                </div>
              </button>

              {isExpandedUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsExpandedUserMenuOpen(false)}
                  />
                  <div className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in duration-150">
                    <button
                      onClick={() => {
                        setIsExpandedUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Collapsed Rail (Desktop only) */}
      <div
        className={`hidden md:flex fixed top-0 bottom-0 left-0 z-30 flex-col items-center justify-between py-3.5 select-none transition-all duration-300 border-r border-neutral-200/80 dark:border-neutral-800 bg-[#f9f9f9] dark:bg-[#171717] ${isOpen ? "opacity-0 pointer-events-none w-0" : "w-14 sm:w-16 opacity-100"
          }`}
      >
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Expand sidebar"
          >
            <SidebarToggleIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onNewChat}
            className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="New chat"
          >
            <NewChatIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsRailUserMenuOpen(!isRailUserMenuOpen)}
                className="w-7 h-7 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold text-xs flex items-center justify-center cursor-pointer uppercase shadow-2xs hover:opacity-90 transition"
              >
                {user.email.charAt(0)}
              </button>
              {isRailUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsRailUserMenuOpen(false)}
                  />
                  <div className="absolute bottom-0 left-full ml-2 w-48 bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 p-2 animate-in fade-in duration-150">
                    <p className="text-xs font-semibold truncate px-2 py-1">{user.name}</p>
                    <button
                      onClick={() => {
                        setIsRailUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="p-2 rounded-lg text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="Log in"
            >
              <UserIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );

  // Helper renderer for individual chat rows
  function renderChatItem(chat: SavedChat) {
    const isActive = activeChatId === chat.id;
    const isEditing = editingChatId === chat.id;
    const isMenuOpen = openMenuChatId === chat.id;

    return (
      <div
        key={chat.id}
        onClick={() => {
          if (!isEditing) onSelectChat(chat);
        }}
        className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition ${isActive
          ? "bg-neutral-200/80 dark:bg-neutral-800 font-medium text-neutral-900 dark:text-white shadow-2xs"
          : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/60"
          }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {chat.isPinned ? (
            <Pin className="w-3 h-3 text-amber-500 shrink-0 fill-amber-500" />
          ) : (
            <MessageSquare className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          )}

          {isEditing ? (
            <div className="flex items-center gap-1 flex-1 pr-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={renameInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveRename(chat.id);
                  if (e.key === "Escape") setEditingChatId(null);
                }}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-1.5 py-0.5 text-xs outline-none"
              />
              <button
                type="button"
                onClick={() => handleSaveRename(chat.id)}
                className="p-1 hover:text-emerald-500 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="truncate pr-1 text-xs">
              {chat.title || "New Conversation"}
            </span>
          )}
        </div>

        {/* Hover action menu */}
        {!isEditing && (
          <div className="relative shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpenMenuChatId(isMenuOpen ? null : chat.id)}
              className={`p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition ${isMenuOpen || isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              title="Chat options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 p-1 text-xs space-y-0.5 animate-in fade-in duration-100">
                <button
                  type="button"
                  onClick={() => handleStartRename(chat)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Rename</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onPinChat?.(chat.id, !chat.isPinned);
                    setOpenMenuChatId(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition"
                >
                  {chat.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                  <span>{chat.isPinned ? "Unpin" : "Pin"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onArchiveChat?.(chat.id, !chat.isArchived);
                    setOpenMenuChatId(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition"
                >
                  {chat.isArchived ? (
                    <ArchiveRestore className="w-3 h-3" />
                  ) : (
                    <Archive className="w-3 h-3" />
                  )}
                  <span>{chat.isArchived ? "Unarchive" : "Archive"}</span>
                </button>

                {/* Move to folder */}
                <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="px-2.5 text-[10px] text-neutral-400 font-semibold uppercase">
                    Folder
                  </span>
                  {["General", "Development", "Learning", "Personal"].map((fold) => (
                    <button
                      key={fold}
                      type="button"
                      onClick={() => {
                        onMoveFolder?.(chat.id, fold);
                        setOpenMenuChatId(null);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] transition ${(chat.folder || "General") === fold
                        ? "font-semibold text-neutral-900 dark:text-white"
                        : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                    >
                      <Folder className="w-2.5 h-2.5" />
                      <span>{fold}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteChat(chat.id);
                      setOpenMenuChatId(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}
