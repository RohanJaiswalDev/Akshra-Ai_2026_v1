"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sidebar, type SavedChat } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ChatLanding } from "@/components/ChatLanding";
import { ChatMessages, type Message } from "@/components/ChatMessages";
import { AuthModal, type AuthUser } from "@/components/AuthModals";
import { SettingsModal } from "@/components/SettingsModal";
import { DEFAULT_MODEL_ID } from "@/lib/models";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
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

  // Keep ref synchronized with state
  useEffect(() => {
    isHistoryEnabledRef.current = isHistoryEnabled;
  }, [isHistoryEnabled]);

  // Load history toggle, sidebar state, model, and saved chats from localStorage on mount
  useEffect(() => {
    try {
      // Default history to TRUE unless explicitly turned off
      const savedToggle = localStorage.getItem("akshra_history_enabled");
      const enabled = savedToggle !== "false";
      setIsHistoryEnabled(enabled);
      isHistoryEnabledRef.current = enabled;

      // Load sidebar state (default to open on desktop)
      const savedSidebar = localStorage.getItem("akshra_sidebar_open");
      if (savedSidebar !== null) {
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

  // Check existing auth session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.error("Failed to fetch session:", err);
      }
    };
    checkSession();
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch (err) {
      console.error("Failed to logout:", err);
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
  const handleSendMessage = async (text: string) => {
    if (isStreaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: "Just now",
    };

    const newMessages = [...messages, userMsg];
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
        try {
          const errData = await response.json();
          if (errData?.error) errorDetails = errData.error;
        } catch {
          const raw = await response.text();
          if (raw) errorDetails = raw;
        }

        const errorMsg: Message = {
          id: botMsgId,
          role: "assistant",
          content: `⚠️ **OpenRouter Connection Notice**:\n\n${errorDetails}\n\n*Check your \`OPENROUTER_API_KEY\` in \`.env.local\` to enable real AI responses.*`,
          timestamp: "Just now",
          isStreaming: false,
        };

        setMessages((prev) =>
          prev.map((m) => (m.id === botMsgId ? errorMsg : m))
        );
        setIsStreaming(false);
        abortControllerRef.current = null;

        // Save error state in chat history as well
        saveChatToHistory(currentId, text, [...newMessages, errorMsg]);
        return;
      }

      if (!response.body) {
        throw new Error("No response stream body received.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        if (controller.signal.aborted) break;

        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, content: accumulated } : m
          )
        );
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
        content: `⚠️ **Network / Connection Error**:\n\n${errMsg}\n\nPlease verify your connection and OpenRouter API status.`,
        timestamp: "Just now",
        isStreaming: false,
      };
      setMessages((prev) =>
        prev.map((m) => (m.id === botMsgId ? errorMsg : m))
      );
      setIsStreaming(false);
      abortControllerRef.current = null;
      saveChatToHistory(currentId, text, [...newMessages, errorMsg]);
    }
  };

  // Handle Regenerate last response
  const handleRegenerate = () => {
    if (messages.length === 0 || isStreaming) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      // Filter out the last assistant response
      const withoutLastAssistant = [...messages];
      if (withoutLastAssistant[withoutLastAssistant.length - 1]?.role === "assistant") {
        withoutLastAssistant.pop();
      }
      setMessages(withoutLastAssistant);
      handleSendMessage(lastUserMsg.content);
    }
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
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-300 ${
          isSidebarOpen ? "md:pl-[260px]" : "pl-14 sm:pl-16"
        }`}
      >
        {/* Top Header with Model Selector */}
        <Header
          onOpenLogin={() => setAuthModal({ isOpen: true, mode: "login" })}
          onOpenSignup={() => setAuthModal({ isOpen: true, mode: "signup" })}
          isSidebarOpen={isSidebarOpen}
          user={user}
          onLogout={handleLogout}
          selectedModel={selectedModel}
          onSelectModel={handleSelectModel}
        />

        {/* Dynamic View: Landing (Hello, Coder.Developer) vs Active Chat Messages */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          {messages.length === 0 ? (
            <ChatLanding onSubmit={handleSendMessage} />
          ) : (
            <ChatMessages
              messages={messages}
              onSendMessage={handleSendMessage}
              onRegenerate={handleRegenerate}
              isStreaming={isStreaming}
              onStop={handleStop}
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
        onAuthSuccess={(authenticatedUser) => setUser(authenticatedUser)}
      />

      {/* Settings Modal (with model selector, real history toggle & clear history) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isHistoryEnabled={isHistoryEnabled}
        onToggleHistory={handleToggleHistory}
        onClearHistory={handleClearHistory}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
      />
    </div>
  );
}
