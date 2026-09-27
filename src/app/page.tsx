"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sidebar, type SavedChat } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ChatLanding } from "@/components/ChatLanding";
import { ChatMessages, type Message } from "@/components/ChatMessages";
import { AuthModal, type AuthUser } from "@/components/AuthModals";
import { SettingsModal } from "@/components/SettingsModal";
import { VoiceAssistantModal } from "@/components/VoiceAssistantModal";
import { unlockAudioAndSpeech } from "@/lib/useVoiceAssistant";
import { DEFAULT_MODEL_ID, AVAILABLE_MODELS } from "@/lib/models";
import { FileAttachment } from "@/types/files";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);

  // Thinking Mode & Web Search Mode toggles
  const [isThinkingEnabled, setIsThinkingEnabled] = useState<boolean>(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState<boolean>(false);

  // Reference to abort ongoing chat stream
  const abortControllerRef = useRef<AbortController | null>(null);

  // Chat History toggle & saved list (Enabled by default!)
  const [isHistoryEnabled, setIsHistoryEnabled] = useState(true);
  const isHistoryEnabledRef = useRef(true);
  const [chatHistory, setChatHistory] = useState<SavedChat[]>([]);

  // Voice & Memory settings
  const [voicePersonality, setVoicePersonality] = useState<
    "natural" | "professional" | "friendly" | "teacher" | "developer"
  >("natural");
  const [voiceSpeechRate, setVoiceSpeechRate] = useState<number>(1.05);
  const [voiceLanguage, setVoiceLanguage] = useState<string>("en-US");
  const [isMemoryEnabled, setIsMemoryEnabled] = useState<boolean>(true);

  // Auth & Settings Modal states
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    mode: "login" | "signup";
  }>({
    isOpen: false,
    mode: "login",
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  // Keep ref synchronized with state
  useEffect(() => {
    isHistoryEnabledRef.current = isHistoryEnabled;
  }, [isHistoryEnabled]);

  // Load history toggle, sidebar state, model, voice settings, and saved chats from localStorage on mount
  useEffect(() => {
    const initializeFromStorage = () => {
      try {
        // Default history to TRUE unless explicitly turned off
        const savedToggle = localStorage.getItem("akshra_history_enabled");
        const enabled = savedToggle !== "false";
        setIsHistoryEnabled(enabled);
        isHistoryEnabledRef.current = enabled;

        // Load sidebar state (default to closed on mobile < 768px, open on desktop >= 768px)
        const savedSidebar = localStorage.getItem("akshra_sidebar_open");
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setIsSidebarOpen(false);
        } else if (savedSidebar !== null) {
          setIsSidebarOpen(savedSidebar === "true");
        } else if (typeof window !== "undefined") {
          setIsSidebarOpen(window.innerWidth >= 768);
        }

        // Load saved chat history
        const savedList = localStorage.getItem("akshra_chat_history");
        if (savedList) {
          try {
            const parsed = JSON.parse(savedList);
            if (Array.isArray(parsed)) {
              setChatHistory(parsed);
            }
          } catch (e) {
            console.error("Failed to parse saved chat history:", e);
          }
        }

        // Load saved model - ensure valid active model, default to "auto"
        const savedModel = localStorage.getItem("akshra_selected_model");
        if (savedModel && AVAILABLE_MODELS.some((m) => m.id === savedModel)) {
          setSelectedModel(savedModel);
        } else {
          setSelectedModel(DEFAULT_MODEL_ID);
          try {
            localStorage.setItem("akshra_selected_model", DEFAULT_MODEL_ID);
          } catch {
            // ignore
          }
        }

        // Load voice personality
        const savedPersonality = localStorage.getItem("akshra_voice_personality");
        if (
          savedPersonality &&
          ["natural", "professional", "friendly", "teacher", "developer"].includes(
            savedPersonality
          )
        ) {
          setVoicePersonality(
            savedPersonality as "natural" | "professional" | "friendly" | "teacher" | "developer"
          );
        }

        // Load voice speech rate
        const savedRate = localStorage.getItem("akshra_voice_rate");
        if (savedRate) {
          const parsedRate = parseFloat(savedRate);
          if (!isNaN(parsedRate) && parsedRate >= 0.8 && parsedRate <= 1.3) {
            setVoiceSpeechRate(parsedRate);
          }
        }

        // Load voice language
        const savedLang = localStorage.getItem("akshra_voice_lang");
        if (savedLang) {
          setVoiceLanguage(savedLang);
        }

        // Load memory setting
        const savedMemory = localStorage.getItem("akshra_memory_enabled");
        if (savedMemory !== null) {
          setIsMemoryEnabled(savedMemory !== "false");
        }

        // Load Thinking & Web Search toggles
        const savedThinking = localStorage.getItem("akshra_thinking_enabled");
        if (savedThinking !== null) {
          setIsThinkingEnabled(savedThinking === "true");
        }
        const savedWebSearch = localStorage.getItem("akshra_websearch_enabled");
        if (savedWebSearch !== null) {
          setIsWebSearchEnabled(savedWebSearch === "true");
        }

        // Load saved user from localStorage
        const savedUser = localStorage.getItem("akshra_auth_user");
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch {
            // ignore
          }
        }
      } catch (e) {
        console.error("Failed to load local settings:", e);
      }
    };

    initializeFromStorage();
  }, []);

  // Fetch account-scoped chats from database when authenticated
  useEffect(() => {
    let isMounted = true;
    if (user) {
      fetch("/api/chats")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data && Array.isArray(data.chats)) {
            setChatHistory(data.chats);
            try {
              localStorage.setItem("akshra_chat_history", JSON.stringify(data.chats));
            } catch {
              // ignore
            }
          }
        })
        .catch((err) => {
          console.error("Failed to load user chats from server:", err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Helper to reliably save chat to state and sync with backend
  const saveChatToHistory = (
    chatId: string,
    titleText: string,
    chatMessages: Message[]
  ) => {
    if (!isHistoryEnabledRef.current) return;

    const title =
      titleText.length > 28 ? titleText.substring(0, 28) + "..." : titleText;

    setChatHistory((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === chatId);
      let updated: SavedChat[];

      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          messages: chatMessages,
          updatedAt: "Just now",
        };
      } else {
        updated = [
          {
            id: chatId,
            title: title || "New Conversation",
            messages: chatMessages,
            updatedAt: "Just now",
            folder: "general",
            isPinned: false,
            isArchived: false,
            model: selectedModel,
          },
          ...prev,
        ];
      }

      try {
        localStorage.setItem("akshra_chat_history", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save chat history to localStorage:", e);
      }
      return updated;
    });

    // Server-side MongoDB sync when authenticated
    if (user) {
      fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chatId,
          title: title || "New Conversation",
          messages: chatMessages,
          model: selectedModel,
        }),
      }).catch((err) => {
        console.error("Failed to sync chat to server:", err);
      });
    }
  };

  // Toggle sidebar and persist state
  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("akshra_sidebar_open", next.toString());
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Save model selection
  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    try {
      localStorage.setItem("akshra_selected_model", modelId);
    } catch (e) {
      console.error("Failed to save selected model:", e);
    }
  };

  // Save history toggle state
  const handleToggleHistory = (enabled: boolean) => {
    setIsHistoryEnabled(enabled);
    isHistoryEnabledRef.current = enabled;
    try {
      localStorage.setItem("akshra_history_enabled", enabled.toString());
    } catch (e) {
      console.error(e);
    }
  };

  // Thinking Mode toggle handler
  const handleToggleThinking = () => {
    setIsThinkingEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("akshra_thinking_enabled", next.toString());
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Web Search Mode toggle handler
  const handleToggleWebSearch = () => {
    setIsWebSearchEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("akshra_websearch_enabled", next.toString());
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Select chat from sidebar
  const handleSelectChat = (chat: SavedChat) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setActiveChatId(chat.id);
    setMessages(chat.messages || []);
    setIsStreaming(false);

    // Auto-close sidebar drawer on mobile upon selecting a chat
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Handle New Chat: resets to landing view
  const handleNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setActiveChatId(null);
    setMessages([]);
    setIsStreaming(false);

    // Auto-close sidebar drawer on mobile upon starting a new chat
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Delete single chat
  const handleDeleteChat = (chatId: string) => {
    setChatHistory((prev) => {
      const updated = prev.filter((c) => c.id !== chatId);
      try {
        localStorage.setItem("akshra_chat_history", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    if (user) {
      fetch(`/api/chats/${chatId}`, { method: "DELETE" }).catch(console.error);
    }

    if (activeChatId === chatId) {
      handleNewChat();
    }
  };

  // Rename chat
  const handleRenameChat = (chatId: string, newTitle: string) => {
    setChatHistory((prev) => {
      const updated = prev.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c));
      try {
        localStorage.setItem("akshra_chat_history", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    if (user) {
      fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      }).catch(console.error);
    }
  };

  // Pin / Unpin chat
  const handlePinChat = (chatId: string, isPinned: boolean) => {
    setChatHistory((prev) => {
      const updated = prev.map((c) => (c.id === chatId ? { ...c, isPinned } : c));
      try {
        localStorage.setItem("akshra_chat_history", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    if (user) {
      fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned }),
      }).catch(console.error);
    }
  };

  // Archive / Unarchive chat
  const handleArchiveChat = (chatId: string, isArchived: boolean) => {
    setChatHistory((prev) => {
      const updated = prev.map((c) => (c.id === chatId ? { ...c, isArchived } : c));
      try {
        localStorage.setItem("akshra_chat_history", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    if (user) {
      fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived }),
      }).catch(console.error);
    }
  };

  // Move chat to folder
  const handleMoveFolder = (chatId: string, folder: string) => {
    setChatHistory((prev) => {
      const updated = prev.map((c) => (c.id === chatId ? { ...c, folder } : c));
      try {
        localStorage.setItem("akshra_chat_history", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    if (user) {
      fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
      }).catch(console.error);
    }
  };

  // Clear all saved history
  const handleClearHistory = () => {
    setChatHistory([]);
    try {
      localStorage.removeItem("akshra_chat_history");
    } catch (e) {
      console.error(e);
    }

    if (user) {
      fetch("/api/chats", { method: "DELETE" }).catch(console.error);
    }

    handleNewChat();
  };

  // Voice personality and settings handlers
  const handleSelectVoicePersonality = (
    p: "natural" | "professional" | "friendly" | "teacher" | "developer"
  ) => {
    setVoicePersonality(p);
    try {
      localStorage.setItem("akshra_voice_personality", p);
    } catch {
      // ignore
    }
  };

  const handleSelectVoiceSpeechRate = (rate: number) => {
    setVoiceSpeechRate(rate);
    try {
      localStorage.setItem("akshra_voice_rate", rate.toString());
    } catch {
      // ignore
    }
  };

  const handleSelectVoiceLanguage = (lang: string) => {
    setVoiceLanguage(lang);
    try {
      localStorage.setItem("akshra_voice_lang", lang);
    } catch {
      // ignore
    }
  };

  const handleToggleMemory = (enabled: boolean) => {
    setIsMemoryEnabled(enabled);
    try {
      localStorage.setItem("akshra_memory_enabled", enabled.toString());
    } catch {
      // ignore
    }
  };

  // Check existing auth session on mount and synchronize with localStorage
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          try {
            localStorage.setItem("akshra_auth_user", JSON.stringify(data.user));
          } catch (e) {
            console.error("Failed to sync user to localStorage:", e);
          }
        } else {
          setUser(null);
          try {
            localStorage.removeItem("akshra_auth_user");
          } catch (e) {
            console.error("Failed to remove user from localStorage:", e);
          }
        }
      } catch (err) {
        console.error("Failed to fetch session:", err);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkSession();

    // Cross-tab synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "akshra_auth_user") {
        if (e.newValue) {
          try {
            setUser(JSON.parse(e.newValue));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Handle Logout: clear session cookie, clear localStorage, wipe chat state for isolation
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Failed to logout:", err);
    } finally {
      setUser(null);
      setChatHistory([]);
      try {
        localStorage.removeItem("akshra_auth_user");
        localStorage.removeItem("akshra_chat_history");
      } catch (e) {
        console.error(e);
      }
      handleNewChat();
    }
  };

  // Stop chat generation immediately like in ChatGPT
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  };

  // Send new message to OpenRouter API with real streaming and file attachments
  const handleSendMessage = async (
    text: string,
    attachmentsOrConversation?: FileAttachment[] | Message[],
    explicitAttachments?: FileAttachment[]
  ) => {
    // Strict authentication gate: Require genuine logged-in user
    if (!user) {
      setPendingPrompt(text);
      setAuthModal({ isOpen: true, mode: "login" });
      return;
    }

    if (isStreaming) return;

    let conversation: Message[] | undefined;
    let attachments: FileAttachment[] | undefined = explicitAttachments;

    if (Array.isArray(attachmentsOrConversation)) {
      if (attachmentsOrConversation.length > 0 && "role" in attachmentsOrConversation[0]) {
        conversation = attachmentsOrConversation as Message[];
      } else {
        attachments = attachmentsOrConversation as FileAttachment[];
      }
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: "Just now",
      attachments,
    };

    // Never send a previous connection-error notice back to the model as context.
    const previousMessages = (conversation || messages).filter((message) => !message.isError);
    const newMessages = [...previousMessages, userMsg];
    setMessages(newMessages);

    // Register active chat ID
    const currentId = activeChatId || `chat-${Date.now()}`;
    if (!activeChatId) {
      setActiveChatId(currentId);
    }

    // Immediately save chat to history so it shows in the sidebar right away!
    saveChatToHistory(currentId, text, newMessages);

    const botMsgId = (Date.now() + 1).toString();
    setIsStreaming(true);

    // Placeholder message for live streaming
    setMessages((prev) => [
      ...prev,
      {
        id: botMsgId,
        role: "assistant",
        content: "",
        timestamp: "Just now",
        isStreaming: true,
      },
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          attachments,
          model: selectedModel,
          thinking: isThinkingEnabled,
          webSearch: isWebSearchEnabled,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorDetails = "Failed to connect to OpenRouter.";
        let retryable = false;
        try {
          const responseText = await response.text();
          const parsed: unknown = JSON.parse(responseText);
          if (parsed && typeof parsed === "object") {
            const error = (parsed as Record<string, unknown>).error;
            const canRetry = (parsed as Record<string, unknown>).retryable;
            if (typeof error === "string") errorDetails = error;
            retryable = canRetry === true;
          }
        } catch {
          // The server intentionally returns concise JSON errors; use the safe fallback above.
        }

        const errorMsg: Message = {
          id: botMsgId,
          role: "assistant",
          content: retryable
            ? `⚠️ **Temporary AI service issue**\n\n${errorDetails}\n\nYour message was not processed. Use **Regenerate response** to try again.`
            : `⚠️ **Unable to send message**\n\n${errorDetails}`,
          timestamp: "Just now",
          isStreaming: false,
          isError: true,
        };

        setMessages((prev) =>
          prev.map((m) => (m.id === botMsgId ? errorMsg : m))
        );
        setIsStreaming(false);
        abortControllerRef.current = null;
        return;
      }

      if (!response.body) {
        throw new Error("No response stream body received.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let rafId: number | null = null;
      let lastRenderedTime = 0;

      while (true) {
        if (controller.signal.aborted) break;

        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        // Smooth 60fps streaming batching with requestAnimationFrame
        const now = performance.now();
        if (!rafId && now - lastRenderedTime >= 20) {
          lastRenderedTime = now;
          rafId = requestAnimationFrame(() => {
            rafId = null;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === botMsgId ? { ...m, content: accumulated } : m
              )
            );
          });
        }
      }

      const finalChunk = decoder.decode();
      if (finalChunk) accumulated += finalChunk;

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      const finalBotMsg: Message = {
        id: botMsgId,
        role: "assistant",
        content: accumulated,
        timestamp: "Just now",
        isStreaming: false,
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === botMsgId ? finalBotMsg : m))
      );
      setIsStreaming(false);
      abortControllerRef.current = null;

      // Finalize and persist completed chat to history & database
      saveChatToHistory(currentId, text, [...newMessages, finalBotMsg]);
    } catch (err: unknown) {
      if (
        (err instanceof Error && err.name === "AbortError") ||
        controller.signal.aborted
      ) {
        setIsStreaming(false);
        abortControllerRef.current = null;
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === botMsgId ? { ...m, isStreaming: false } : m
          );
          saveChatToHistory(currentId, text, updated);
          return updated;
        });
        return;
      }

      console.error("Chat Stream Error:", err);
      const errMsg = err instanceof Error ? err.message : "Network error";
      const errorMsg: Message = {
        id: botMsgId,
        role: "assistant",
        content: `⚠️ **Network error**\n\n${errMsg}\n\nYour message was not processed. Use **Regenerate response** to try again.`,
        timestamp: "Just now",
        isStreaming: false,
        isError: true,
      };
      setMessages((prev) =>
        prev.map((m) => (m.id === botMsgId ? errorMsg : m))
      );
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Persist a user's response rating with the local saved conversation.
  const handleResponseFeedback = (
    messageId: string,
    feedback: "up" | "down" | null
  ) => {
    const updatedMessages = messages.map((message) =>
      message.id === messageId ? { ...message, feedback: feedback || undefined } : message
    );
    setMessages(updatedMessages);

    if (activeChatId) {
      const firstPrompt =
        updatedMessages.find((message) => message.role === "user")?.content ||
        "New Conversation";
      saveChatToHistory(activeChatId, firstPrompt, updatedMessages);
    }
  };

  // Regenerate exactly the latest completed response from its preceding prompt.
  const handleRegenerate = (responseId: string) => {
    if (!user) {
      setAuthModal({ isOpen: true, mode: "login" });
      return;
    }
    if (messages.length === 0 || isStreaming) return;
    const responseIndex = messages.findIndex((message) => message.id === responseId);
    if (responseIndex < 0 || messages[responseIndex].role !== "assistant") return;

    let lastUserIndex = -1;
    for (let index = responseIndex - 1; index >= 0; index -= 1) {
      if (messages[index].role === "user") {
        lastUserIndex = index;
        break;
      }
    }

    if (lastUserIndex >= 0) {
      const lastUserMsg = messages[lastUserIndex];
      handleSendMessage(
        lastUserMsg.content,
        messages.slice(0, lastUserIndex),
        lastUserMsg.attachments
      );
    }
  };

  // Trigger real-time Voice Mode modal
  const handleOpenVoice = () => {
    if (!user) {
      setAuthModal({ isOpen: true, mode: "login" });
      return;
    }
    unlockAudioAndSpeech();
    setIsVoiceOpen(true);
  };

  // Synchronize completed voice conversation turns into active chat & history
  const handleVoiceTurnComplete = (turn: { role: "user" | "assistant"; content: string }) => {
    const currentId = activeChatId || `chat-${Date.now()}`;
    if (!activeChatId) {
      setActiveChatId(currentId);
    }

    const newMsg: Message = {
      id: Date.now().toString(),
      role: turn.role,
      content: turn.content,
      timestamp: "Just now",
    };

    setMessages((prev) => {
      const updated = [...prev, newMsg];
      const titlePrompt =
        updated.find((m) => m.role === "user")?.content || "Voice Conversation";
      saveChatToHistory(currentId, titlePrompt, updated);
      return updated;
    });
  };

  // Keyboard shortcuts listener: Ctrl+K for new chat, Esc for close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleNewChat();
      } else if (e.key === "Escape") {
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (authModal.isOpen) setAuthModal({ isOpen: false, mode: "login" });
        if (isVoiceOpen) setIsVoiceOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [authModal.isOpen, isSettingsOpen, isVoiceOpen]);

  return (
    <div className="relative h-screen h-[100dvh] flex w-full bg-[var(--canvas-bg)] text-[var(--canvas-fg)] overflow-hidden transition-colors duration-200">
      {/* Sidebar with Search, Folders, Pinned Chats & Inline Renaming */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={handleToggleSidebar}
        onNewChat={handleNewChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isHistoryEnabled={isHistoryEnabled}
        chatHistory={chatHistory}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onPinChat={handlePinChat}
        onArchiveChat={handleArchiveChat}
        onMoveFolder={handleMoveFolder}
        user={user}
        onLogout={handleLogout}
        onOpenLogin={() => setAuthModal({ isOpen: true, mode: "login" })}
        onOpenSignup={() => setAuthModal({ isOpen: true, mode: "signup" })}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col h-full min-h-0 overflow-hidden transition-[padding] duration-200 ease-in-out ${isSidebarOpen ? "md:pl-[260px]" : "md:pl-14 sm:md:pl-16"
          }`}
      >
        {/* Top Header with Grouped Model Selector */}
        <Header
          onOpenLogin={() => setAuthModal({ isOpen: true, mode: "login" })}
          onOpenSignup={() => setAuthModal({ isOpen: true, mode: "signup" })}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          user={user}
          onLogout={handleLogout}
          selectedModel={selectedModel}
          onSelectModel={handleSelectModel}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Dynamic View: Landing vs Active Chat Messages */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          {messages.length === 0 ? (
            <ChatLanding
              onSubmit={handleSendMessage}
              user={user}
              isAuthLoading={isAuthLoading}
              onOpenLogin={() => setAuthModal({ isOpen: true, mode: "login" })}
              onOpenSignup={() => setAuthModal({ isOpen: true, mode: "signup" })}
              onOpenVoice={handleOpenVoice}
              isThinkingEnabled={isThinkingEnabled}
              onToggleThinking={handleToggleThinking}
              isWebSearchEnabled={isWebSearchEnabled}
              onToggleWebSearch={handleToggleWebSearch}
            />
          ) : (
            <ChatMessages
              messages={messages}
              onSendMessage={handleSendMessage}
              onRegenerate={handleRegenerate}
              onFeedback={handleResponseFeedback}
              isStreaming={isStreaming}
              onStop={handleStop}
              user={user}
              onOpenLogin={() => setAuthModal({ isOpen: true, mode: "login" })}
              onOpenSignup={() => setAuthModal({ isOpen: true, mode: "signup" })}
              onOpenVoice={handleOpenVoice}
              isThinkingEnabled={isThinkingEnabled}
              onToggleThinking={handleToggleThinking}
              isWebSearchEnabled={isWebSearchEnabled}
              onToggleWebSearch={handleToggleWebSearch}
            />
          )}
        </main>
      </div>

      {/* Auth Modals */}
      <AuthModal
        isOpen={authModal.isOpen}
        mode={authModal.mode}
        onClose={() => setAuthModal({ isOpen: false, mode: "login" })}
        onSwitchMode={(mode) => setAuthModal({ isOpen: true, mode })}
        onAuthSuccess={(authenticatedUser) => {
          setUser(authenticatedUser);
          try {
            localStorage.setItem("akshra_auth_user", JSON.stringify(authenticatedUser));
          } catch (e) {
            console.error("Failed to save user to localStorage:", e);
          }
          if (pendingPrompt) {
            const promptToSend = pendingPrompt;
            setPendingPrompt(null);
            setTimeout(() => {
              handleSendMessage(promptToSend);
            }, 150);
          }
        }}
      />

      {/* Modular Tabbed Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onLogout={handleLogout}
        isHistoryEnabled={isHistoryEnabled}
        onToggleHistory={handleToggleHistory}
        onClearHistory={handleClearHistory}
        chatHistoryForExport={chatHistory}
        voicePersonality={voicePersonality}
        onSelectVoicePersonality={handleSelectVoicePersonality}
        voiceSpeechRate={voiceSpeechRate}
        onSelectVoiceSpeechRate={handleSelectVoiceSpeechRate}
        voiceLanguage={voiceLanguage}
        onSelectVoiceLanguage={handleSelectVoiceLanguage}
        isMemoryEnabled={isMemoryEnabled}
        onToggleMemory={handleToggleMemory}
      />

      {/* Real-time Voice Assistant Modal with Personality & Speed Controls */}
      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        model={selectedModel}
        personality={voicePersonality}
        speechRate={voiceSpeechRate}
        language={voiceLanguage}
        onNewMessageTurn={handleVoiceTurnComplete}
        conversationHistory={messages.map((m) => ({
          role: m.role,
          content: m.content,
        }))}
      />
    </div>
  );
}
