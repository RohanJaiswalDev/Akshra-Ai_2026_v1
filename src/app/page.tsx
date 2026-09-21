"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, type SavedChat } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ChatLanding } from "@/components/ChatLanding";
import { ChatMessages, type Message } from "@/components/ChatMessages";
import { AuthModal, type AuthUser } from "@/components/AuthModals";
import { SettingsModal } from "@/components/SettingsModal";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Chat History toggle & saved list
  const [isHistoryEnabled, setIsHistoryEnabled] = useState(false);
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

  // Load history toggle & saved chats from localStorage on mount
  useEffect(() => {
    try {
      const savedToggle = localStorage.getItem("akshra_history_enabled");
      if (savedToggle !== null) {
        setIsHistoryEnabled(savedToggle === "true");
      }

      const savedList = localStorage.getItem("akshra_chat_history");
      if (savedList) {
        setChatHistory(JSON.parse(savedList));
      }
    } catch (e) {
      console.error("Failed to load local history:", e);
    }
  }, []);

  // Save history toggle state
  const handleToggleHistory = (enabled: boolean) => {
    setIsHistoryEnabled(enabled);
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
  };

  // Select chat from sidebar
  const handleSelectChat = (chat: SavedChat) => {
    setActiveChatId(chat.id);
    setMessages(chat.messages);
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

  // Handle New Chat: resets to landing view "Hello, Coder.Developer"
  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setIsStreaming(false);
  };

  // Send new message
  const handleSendMessage = (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: "Just now",
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    // If starting a fresh chat & history is enabled, register chat
    const currentId = activeChatId || `chat-${Date.now()}`;
    if (!activeChatId) {
      setActiveChatId(currentId);
    }

    // Simulate realistic AI streaming response
    setIsStreaming(true);
    const botMsgId = (Date.now() + 1).toString();

    let fullResponse = `Hello! I'm **Akshra Ai**.\n\n`;
    if (
      text.toLowerCase().includes("code") ||
      text.toLowerCase().includes("hook") ||
      text.toLowerCase().includes("debug")
    ) {
      fullResponse += `Here is a clean TypeScript example demonstrating modern patterns:\n\n\`\`\`typescript\nimport { useState, useEffect } from 'react';\n\nexport function useAkshraTheme() {\n  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');\n  \n  useEffect(() => {\n    console.log('Akshra Ai theme system initialized:', theme);\n  }, [theme]);\n\n  return { theme, setTheme };\n}\n\`\`\`\n\nIs there anything specific you would like to customize or expand?`;
    } else {
      fullResponse += `You asked: "${text}".\n\nI have processed your prompt with the Akshra Turbo engine. You can ask follow-ups, request code, or switch between Light, Dark, and System theme modes anytime!`;
    }

    // Placeholder message for streaming
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

    // Stream text progressively
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex += 4;
      if (currentIndex >= fullResponse.length) {
        clearInterval(interval);
        const finalBotMsg: Message = {
          id: botMsgId,
          role: "assistant",
          content: fullResponse,
          timestamp: "Just now",
          isStreaming: false,
        };

        const completedMessages = [...newMessages, finalBotMsg];

        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? finalBotMsg : m
          )
        );
        setIsStreaming(false);

        // Save into history if history is enabled
        if (isHistoryEnabled) {
          setChatHistory((prev) => {
            const title = text.length > 26 ? text.substring(0, 26) + "..." : text;
            const existingIndex = prev.findIndex((c) => c.id === currentId);
            let updated: SavedChat[];

            if (existingIndex >= 0) {
              updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                messages: completedMessages,
                updatedAt: "Just now",
              };
            } else {
              updated = [
                {
                  id: currentId,
                  title,
                  messages: completedMessages,
                  updatedAt: "Just now",
                },
                ...prev,
              ];
            }

            try {
              localStorage.setItem("akshra_chat_history", JSON.stringify(updated));
            } catch (e) {
              console.error(e);
            }
            return updated;
          });
        }
      } else {
        const partial = fullResponse.slice(0, currentIndex);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, content: partial } : m
          )
        );
      }
    }, 18);
  };

  const handleRegenerate = () => {
    if (messages.length === 0) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  };

  return (
    <div className="relative min-h-screen flex w-full bg-[var(--canvas-bg)] text-[var(--canvas-fg)] transition-colors duration-200">
      {/* Sidebar (Collapsed Rail & Expanded Drawer with dynamic History support) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
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
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          isSidebarOpen ? "md:pl-[260px]" : "pl-14 sm:pl-16"
        }`}
      >
        {/* Top Header */}
        <Header
          onOpenLogin={() => setAuthModal({ isOpen: true, mode: "login" })}
          onOpenSignup={() => setAuthModal({ isOpen: true, mode: "signup" })}
          isSidebarOpen={isSidebarOpen}
          user={user}
          onLogout={handleLogout}
        />

        {/* Dynamic View: Landing (Hello, Coder.Developer) vs Active Chat Messages */}
        <main className="flex-1 flex flex-col">
          {messages.length === 0 ? (
            <ChatLanding onSubmit={handleSendMessage} />
          ) : (
            <ChatMessages
              messages={messages}
              onSendMessage={handleSendMessage}
              onRegenerate={handleRegenerate}
              isStreaming={isStreaming}
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

      {/* Settings Modal (with real history toggle & clear history) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isHistoryEnabled={isHistoryEnabled}
        onToggleHistory={handleToggleHistory}
        onClearHistory={handleClearHistory}
      />
    </div>
  );
}
