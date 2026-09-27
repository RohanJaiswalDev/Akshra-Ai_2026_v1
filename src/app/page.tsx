"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sidebar, type SavedChat } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ChatLanding } from "@/components/ChatLanding";
import { ChatMessages, type Message } from "@/components/ChatMessages";
import { AuthModal, type AuthUser } from "@/components/AuthModals";
import { SettingsModal } from "@/components/SettingsModal";
import { VoiceAssistantModal } from "@/components/VoiceAssistantModal";
import { DEFAULT_MODEL_ID } from "@/lib/models";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  // Immediate client-side session hydration to eliminate reload flicker
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("akshra_auth_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);

  // Reference to abort ongoing chat stream
  const abortControllerRef = useRef<AbortController | null>(null);

  // Chat History toggle & saved list (Enabled by default!)
  const [isHistoryEnabled, setIsHistoryEnabled] = useState(true);
  const isHistoryEnabledRef = useRef(true);
  const [chatHistory, setChatHistory] = useState<SavedChat[]>([]);

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

  // Load history toggle, sidebar state, model, and saved chats from localStorage on mount
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

      // Load saved model
      const savedModel = localStorage.getItem("akshra_selected_model");
      if (savedModel) {
        setSelectedModel(savedModel);
      }
      } catch (e) {
        console.error("Failed to load local settings:", e);
      }
    };

    const frame = window.requestAnimationFrame(initializeFromStorage);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Helper to reliably save chat to state and localStorage
  const saveChatToHistory = (
    chatId: string,
    titleText: string,
    chatMessages: Message[]
  ) => {
    if (!isHistoryEnabledRef.current) return;

    setChatHistory((prev) => {
      const title =
        titleText.length > 28 ? titleText.substring(0, 28) + "..." : titleText;
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

  // Clear all saved history
  const handleClearHistory = () => {
    setChatHistory([]);
    try {
      localStorage.removeItem("akshra_chat_history");
    } catch (e) {
      console.error(e);
    }
    handleNewChat();
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

    if (activeChatId === chatId) {
      handleNewChat();
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

    // Cross-tab synchronization: keep login/logout state synchronized if changed in another tab
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

  // Handle Logout: clear session cookie, clear localStorage, and reset chat view
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Failed to logout:", err);
    } finally {
      setUser(null);
      try {
        localStorage.removeItem("akshra_auth_user");
      } catch (e) {
        console.error(e);
      }
      handleNewChat();
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

  // Send new message to OpenRouter API with real streaming
  const handleSendMessage = async (text: string, conversation?: Message[]) => {
    // Strict authentication gate: Require genuine logged-in user
    if (!user) {
      setPendingPrompt(text);
      setAuthModal({ isOpen: true, mode: "login" });
      return;
    }

    if (isStreaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: "Just now",
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
          })),
          model: selectedModel,
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

        // Keep the prompt in history, but never save a provider error as an AI answer.
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

      // Finalize and persist completed chat to history
      saveChatToHistory(currentId, text, [...newMessages, finalBotMsg]);
    } catch (err: unknown) {
      // If user aborted via stop button, finalize gracefully and save partial chat
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
      const firstPrompt = updatedMessages.find((message) => message.role === "user")?.content || "New Conversation";
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
      // Resend the source prompt once, with only preceding messages as context.
      const lastUserMsg = messages[lastUserIndex];
      handleSendMessage(lastUserMsg.content, messages.slice(0, lastUserIndex));
    }
  };

  // Trigger real-time Voice Mode modal
  const handleOpenVoice = () => {
    if (!user) {
      setAuthModal({ isOpen: true, mode: "login" });
      return;
    }
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
      const titlePrompt = updated.find((m) => m.role === "user")?.content || "Voice Conversation";
      saveChatToHistory(currentId, titlePrompt, updated);
      return updated;
    });
  };

  return (
    <div className="relative h-screen h-[100dvh] flex w-full bg-[var(--canvas-bg)] text-[var(--canvas-fg)] overflow-hidden transition-colors duration-200">
      {/* Sidebar (Collapsed Rail & Expanded Drawer with dynamic History support) */}
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
        {/* Top Header with Model Selector */}
        <Header
          onOpenLogin={() => setAuthModal({ isOpen: true, mode: "login" })}
          onOpenSignup={() => setAuthModal({ isOpen: true, mode: "signup" })}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          user={user}
          onLogout={handleLogout}
          selectedModel={selectedModel}
          onSelectModel={handleSelectModel}
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
            />
          )}
        </main>
      </div>

      {/* Auth Modals (Log in & Sign up for free with genuine email OTP) */}
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

      {/* Settings Modal (with model selector, real history toggle & clear history) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isHistoryEnabled={isHistoryEnabled}
        onToggleHistory={handleToggleHistory}
        onClearHistory={handleClearHistory}
      />

      {/* Real-time Voice Assistant Modal (ChatGPT & Gemini Live style) */}
      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        model={selectedModel}
        onNewMessageTurn={handleVoiceTurnComplete}
        conversationHistory={messages.map((m) => ({
          role: m.role,
          content: m.content,
        }))}
      />
    </div>
  );
}
