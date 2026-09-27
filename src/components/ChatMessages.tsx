"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ArrowUp,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Square,
  Lock,
  Mic,
  Brain,
  Globe,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Paperclip,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { AkshraLogo } from "./icons";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { type AuthUser } from "./AuthModals";
import { unlockAudioAndSpeech } from "@/lib/useVoiceAssistant";
import { FileAttachment } from "@/types/files";
import { useFileUpload } from "@/lib/useFileUpload";
import {
  AttachedFileChip,
  MessageFileCard,
  FileQuickPrompts,
  ImageLightboxModal,
} from "./FileAttachmentUI";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  isError?: boolean;
  feedback?: "up" | "down";
  attachments?: FileAttachment[];
}

interface ChatMessagesProps {
  messages: Message[];
  onSendMessage: (text: string, attachments?: FileAttachment[]) => void;
  onRegenerate?: (messageId: string) => void;
  onFeedback?: (messageId: string, feedback: "up" | "down" | null) => void;
  isStreaming?: boolean;
  onStop?: () => void;
  user?: AuthUser | null;
  onOpenLogin?: () => void;
  onOpenSignup?: () => void;
  onOpenVoice?: () => void;
  isThinkingEnabled: boolean;
  onToggleThinking: () => void;
  isWebSearchEnabled: boolean;
  onToggleWebSearch: () => void;
}

interface WebSearchResultItem {
  title: string;
  url: string;
  snippet?: string;
}

interface WebSearchData {
  query: string;
  results: WebSearchResultItem[];
}

interface ParsedMessage {
  webSearch?: WebSearchData;
  thoughtProcess?: string;
  isStillThinking: boolean;
  finalContent: string;
}

function parseMessageContent(rawContent: string, isStreaming?: boolean): ParsedMessage {
  let content = rawContent;
  let webSearch: WebSearchData | undefined;

  // Extract <!--web_search:...-->
  const searchMatch = content.match(/<!--web_search:([\s\S]*?)-->/);
  if (searchMatch) {
    try {
      webSearch = JSON.parse(searchMatch[1]);
    } catch {
      // ignore JSON parse error
    }
    content = content.replace(/<!--web_search:[\s\S]*?-->\n*/, "");
  }

  let thoughtProcess: string | undefined;
  let isStillThinking = false;
  let finalContent = content;

  // Check for <think> tags
  const thinkStart = content.indexOf("<think>");
  if (thinkStart !== -1) {
    const thinkEnd = content.indexOf("</think>");
    if (thinkEnd !== -1) {
      thoughtProcess = content.substring(thinkStart + 7, thinkEnd).trim();
      finalContent = content.substring(thinkEnd + 8).trimStart();
      isStillThinking = false;
    } else {
      thoughtProcess = content.substring(thinkStart + 7).trimStart();
      finalContent = "";
      isStillThinking = isStreaming ?? false;
    }
  }

  return {
    webSearch,
    thoughtProcess,
    isStillThinking,
    finalContent,
  };
}

// Deep Thinking Accordion Card
function ThoughtProcessCard({
  thought,
  isStillThinking,
}: {
  thought: string;
  isStillThinking: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState<boolean>(isStillThinking);

  // Auto-expand when actively thinking
  useEffect(() => {
    if (isStillThinking) {
      setIsExpanded(true);
    }
  }, [isStillThinking]);

  if (!thought && !isStillThinking) return null;

  return (
    <div className="my-2.5 rounded-xl border border-purple-200/90 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 overflow-hidden text-xs transition-all shadow-2xs">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium">
          <Brain
            className={`w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 ${isStillThinking ? "animate-pulse" : ""
              }`}
          />
          <span>{isStillThinking ? "Thinking deeply..." : "Thought Process"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-purple-600/70 dark:text-purple-400/70">
          <span className="text-[11px] font-normal">{isExpanded ? "Hide" : "Show"}</span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 border-t border-purple-200/60 dark:border-purple-900/30 bg-white/40 dark:bg-neutral-900/40 font-mono text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap max-h-80 overflow-y-auto">
          {thought}
          {isStillThinking && (
            <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-500 animate-pulse align-middle" />
          )}
        </div>
      )}
    </div>
  );
}

// Web Search Verified Sources Card
function WebSearchSourcesCard({ search }: { search: WebSearchData }) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!search.results || search.results.length === 0) return null;

  return (
    <div className="my-2.5 rounded-xl border border-sky-200/90 dark:border-sky-900/40 bg-sky-50/40 dark:bg-sky-950/20 overflow-hidden text-xs transition-all shadow-2xs">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-sky-100/50 dark:hover:bg-sky-900/30 transition cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-medium">
          <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>
            Searched web for:{" "}
            <span className="font-semibold italic truncate max-w-[180px] sm:max-w-xs inline-block align-bottom">
              &quot;{search.query}&quot;
            </span>
          </span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-200/70 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 font-semibold">
            {search.results.length} sources
          </span>
        </div>
        <div className="flex items-center gap-1 text-sky-600/70 dark:text-sky-400/70">
          <span className="text-[11px] font-normal">{isExpanded ? "Hide" : "Show"}</span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-2.5 border-t border-sky-200/60 dark:border-sky-900/30 bg-white/40 dark:bg-neutral-900/40 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {search.results.map((res, i) => {
            let hostname = "";
            try {
              hostname = new URL(res.url).hostname.replace(/^www\./, "");
            } catch {
              hostname = res.url;
            }
            return (
              <a
                key={i}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 p-2 rounded-lg border border-sky-100 dark:border-neutral-800 bg-white dark:bg-[#252528] hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-xs transition group cursor-pointer"
              >
                <div className="w-5 h-5 rounded-md bg-sky-100 dark:bg-sky-950 flex items-center justify-center shrink-0 mt-0.5 text-sky-600 dark:text-sky-400">
                  <Globe className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-800 dark:text-neutral-200 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition text-[11px]">
                    {res.title}
                  </div>
                  <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate flex items-center gap-1 mt-0.5">
                    <span>{hostname}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Highly optimized memoized single message row
const ChatMessageRow = React.memo(function ChatMessageRow({
  msg,
  copiedId,
  onCopy,
  onRegenerate,
  onFeedback,
  canRegenerate,
  onImageClick,
}: {
  msg: Message;
  copiedId: string | null;
  onCopy: (id: string, text: string) => Promise<void>;
  onRegenerate?: (messageId: string) => void;
  onFeedback?: (messageId: string, feedback: "up" | "down" | null) => void;
  canRegenerate: boolean;
  user?: AuthUser | null;
  onOpenLogin?: () => void;
  onImageClick?: (url: string, name: string) => void;
}) {
  const isUser = msg.role === "user";

  const parsed = useMemo(
    () => parseMessageContent(msg.content, msg.isStreaming),
    [msg.content, msg.isStreaming]
  );

  if (isUser) {
    return (
      <div className="flex justify-end animate-in fade-in duration-150">
        <div className="max-w-[88%] sm:max-w-[80%] md:max-w-[75%] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-[14px] sm:text-sm leading-relaxed bg-neutral-100 dark:bg-[#2f2f2f] text-neutral-900 dark:text-neutral-100 rounded-br-sm shadow-xs select-text">
          {/* Attached Files inside User Message */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-2.5">
              {msg.attachments.map((file) => (
                <MessageFileCard
                  key={file.id}
                  attachment={file}
                  onImageClick={onImageClick}
                />
              ))}
            </div>
          )}
          <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
        </div>
      </div>
    );
  }

  // Assistant message: Logo and text starting point match seamlessly in a straight line
  return (
    <div className="flex items-start gap-2.5 sm:gap-3.5 justify-start animate-in fade-in duration-150 select-text">
      {/* Logo icon - exactly matches first line height */}
      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shrink-0 shadow-xs select-none mt-0.5 sm:mt-0">
        <AkshraLogo className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      </div>

      {/* Message Content: seamlessly aligned line height */}
      <div className="flex-1 min-w-0 text-[14px] sm:text-[15px] leading-6 sm:leading-7 text-neutral-800 dark:text-neutral-200">
        {/* Real-time Web Search Grounding Card if present */}
        {parsed.webSearch && <WebSearchSourcesCard search={parsed.webSearch} />}

        {/* Deep Thinking Process Collapsible Card if present */}
        {(parsed.thoughtProcess !== undefined || parsed.isStillThinking) && (
          <ThoughtProcessCard
            thought={parsed.thoughtProcess || ""}
            isStillThinking={parsed.isStillThinking}
          />
        )}

        {/* Final Response Markdown Renderer */}
        {parsed.finalContent ? (
          <MarkdownRenderer
            content={parsed.finalContent}
            isStreaming={msg.isStreaming && !parsed.isStillThinking}
          />
        ) : parsed.isStillThinking ? (
          <div className="text-xs text-neutral-400 dark:text-neutral-500 italic flex items-center gap-1.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
            <span>Analyzing deeply and evaluating reasoning paths...</span>
          </div>
        ) : null}

        {/* Assistant Message Actions */}
        {!msg.isStreaming && parsed.finalContent && (
          <div className="flex items-center gap-1 sm:gap-1.5 mt-2 pt-1 text-neutral-400 dark:text-neutral-500 select-none">
            <button
              onClick={() => onCopy(msg.id, parsed.finalContent)}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer"
              title="Copy response"
            >
              {copiedId === msg.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            {!msg.isError && onFeedback && (
              <>
                <button
                  type="button"
                  onClick={() => onFeedback(msg.id, msg.feedback === "up" ? null : "up")}
                  aria-pressed={msg.feedback === "up"}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${msg.feedback === "up"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200"
                    }`}
                  title={msg.feedback === "up" ? "Remove positive feedback" : "Good response"}
                >
                  <ThumbsUp className="w-3.5 h-3.5" fill={msg.feedback === "up" ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  onClick={() => onFeedback(msg.id, msg.feedback === "down" ? null : "down")}
                  aria-pressed={msg.feedback === "down"}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${msg.feedback === "down"
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200"
                    }`}
                  title={msg.feedback === "down" ? "Remove negative feedback" : "Bad response"}
                >
                  <ThumbsDown className="w-3.5 h-3.5" fill={msg.feedback === "down" ? "currentColor" : "none"} />
                </button>
              </>
            )}
            {onRegenerate && canRegenerate && (
              <button
                type="button"
                onClick={() => onRegenerate(msg.id)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer"
                title="Regenerate response"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export function ChatMessages({
  messages,
  onSendMessage,
  onRegenerate,
  onFeedback,
  isStreaming = false,
  onStop,
  user,
  onOpenLogin,
  onOpenSignup,
  onOpenVoice,
  isThinkingEnabled,
  onToggleThinking,
  isWebSearchEnabled,
  onToggleWebSearch,
}: ChatMessagesProps) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const rafScrollRef = useRef<number | null>(null);

  const {
    attachments,
    isUploading,
    uploadError,
    setUploadError,
    isDragging,
    setIsDragging,
    uploadFiles,
    removeAttachment,
    clearAttachments,
  } = useFileUpload();

  // Smooth scroll to top when button clicked
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Smooth scroll to bottom when button clicked
  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // Performance-optimized scroll listener throttled by requestAnimationFrame
  const handleScrollThrottled = useCallback(() => {
    if (rafScrollRef.current) return;
    rafScrollRef.current = requestAnimationFrame(() => {
      rafScrollRef.current = null;
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const shouldShowTop = scrollTop > 100;

      setShowBackToTop((prev) => (prev !== shouldShowTop ? shouldShowTop : prev));
    });
  }, []);

  // Attach scroll listeners
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScrollThrottled, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScrollThrottled);
      if (rafScrollRef.current) {
        cancelAnimationFrame(rafScrollRef.current);
        rafScrollRef.current = null;
      }
    };
  }, [handleScrollThrottled]);

  // Keep scrolled to bottom during active streaming without triggering reflow churn
  useEffect(() => {
    if (!isStreaming) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < 160) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleCopy = useCallback(async (id: string, text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!copied) throw new Error("Copy command was rejected.");
      }

      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Unable to copy response:", error);
    }
  }, []);

  let lastAssistantIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "assistant" && !messages[index].isStreaming) {
      lastAssistantIndex = index;
      break;
    }
  }

  const submitMessage = () => {
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;
    if (isStreaming) return;

    const finalPrompt = trimmed || "Please analyze this attached file in detail.";
    onSendMessage(finalPrompt, attachments.length > 0 ? attachments : undefined);
    setInput("");
    clearAttachments();
    setTimeout(() => scrollToBottom(true), 40);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!user) {
        onOpenLogin?.();
        return;
      }
      submitMessage();
    }
  };

  // Drag and Drop handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user && !isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!user) {
      onOpenLogin?.();
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files);
    }
  };

  const canSubmit = (input.trim().length > 0 || attachments.length > 0) && !isStreaming && !isUploading;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 min-h-0 flex flex-col w-full h-full relative overflow-hidden"
    >
      {/* Lightbox for zooming in on images */}
      {previewImage && (
        <ImageLightboxModal
          url={previewImage.url}
          name={previewImage.name}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-4 z-40 rounded-3xl border-2 border-dashed border-sky-400 bg-sky-50/80 dark:bg-sky-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 animate-in fade-in duration-150 pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-600 dark:text-sky-300 flex items-center justify-center shadow-lg">
            <UploadCloud className="w-8 h-8 animate-bounce" />
          </div>
          <div className="text-center px-4">
            <p className="text-base font-semibold text-sky-900 dark:text-sky-100">
              Drop files to attach to this chat
            </p>
            <p className="text-xs text-sky-700 dark:text-sky-300 mt-1">
              Supports PDF, DOCX, XLSX, CSV, JSON, TXT, and Images
            </p>
          </div>
        </div>
      )}

      {/* Scrollable messages container with native instant mouse wheel response */}
      <div
        ref={scrollContainerRef}
        data-scrollable="true"
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 md:px-10 py-4 sm:py-6 space-y-5 sm:space-y-6 max-w-3xl w-full mx-auto pb-44 sm:pb-40 overscroll-contain"
      >
        {/* Top anchor */}
        <div
          ref={messagesStartRef}
          id="chat-top-anchor"
          className="w-full h-0 opacity-0 pointer-events-none"
        />

        {messages.map((msg, index) => (
          <ChatMessageRow
            key={msg.id}
            msg={msg}
            copiedId={copiedId}
            onCopy={handleCopy}
            onRegenerate={onRegenerate}
            onFeedback={onFeedback}
            canRegenerate={index === lastAssistantIndex && !isStreaming}
            user={user}
            onOpenLogin={onOpenLogin}
            onImageClick={(url, name) => setPreviewImage({ url, name })}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <div className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 flex items-center pointer-events-auto gpu-accelerated">
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-[#252528]/95 border border-neutral-300/90 dark:border-neutral-700 shadow-md hover:shadow-lg text-xs font-medium text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-[#2e2e32] transition active:scale-95 cursor-pointer backdrop-blur-sm animate-in fade-in zoom-in-95 group"
            title="Back to top"
          >
            <ArrowUp className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-transform group-hover:-translate-y-0.5" />
            <span>Back to top</span>
          </button>
        </div>
      )}

      {/* Fixed bottom input container */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#212121] dark:via-[#212121]/95 dark:to-transparent pt-8 pb-3 sm:pb-5 px-3 sm:px-6">
        <div className="max-w-2xl w-full mx-auto pointer-events-auto">
          {!user ? (
            <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-neutral-50/90 dark:bg-[#2a2a2d]/90 border border-neutral-200 dark:border-neutral-700 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white">
                    Authentication required
                  </h4>
                  <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                    Log in or create a free account to continue this conversation.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="px-4 py-1.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium hover:opacity-90 active:scale-95 transition cursor-pointer shadow-xs"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={onOpenSignup}
                  className="px-4 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white/50 dark:bg-transparent text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                >
                  Sign up
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Attached Files Preview Chips Container */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-2 px-1 animate-in fade-in duration-200">
                  {attachments.map((file) => (
                    <AttachedFileChip
                      key={file.id}
                      file={file}
                      onRemove={() => removeAttachment(file.id)}
                    />
                  ))}
                </div>
              )}

              {/* Upload error notice */}
              {uploadError && (
                <div className="mb-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl px-3 py-1.5 flex items-center justify-between animate-in fade-in duration-150">
                  <span>{uploadError}</span>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    className="text-rose-400 hover:text-rose-700 ml-1 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Dynamic Contextual Prompts for Attached Files */}
              {attachments.length > 0 && (
                <FileQuickPrompts
                  attachments={attachments}
                  onSelectPrompt={(prompt) => {
                    setInput(prompt);
                  }}
                />
              )}

              {/* Active Search & Thinking Status Badges */}
              {(isThinkingEnabled || isWebSearchEnabled) && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2 px-2 animate-in fade-in duration-200">
                  {isThinkingEnabled && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs">
                      <Brain className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      <span>Deep Thinking Active</span>
                      <button
                        type="button"
                        onClick={onToggleThinking}
                        className="hover:text-purple-900 dark:hover:text-purple-100 text-purple-400 ml-0.5 cursor-pointer"
                        title="Turn off Thinking Mode"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {isWebSearchEnabled && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 shadow-2xs">
                      <Globe className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                      <span>Web Search Active</span>
                      <button
                        type="button"
                        onClick={onToggleWebSearch}
                        className="hover:text-sky-900 dark:hover:text-sky-100 text-sky-400 ml-0.5 cursor-pointer"
                        title="Turn off Web Search"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              )}

              <div className="relative flex items-center bg-white dark:bg-[#2f2f2f] rounded-full border border-neutral-200/90 dark:border-[#424242] shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)] px-3 sm:px-5 py-2 sm:py-2.5 focus-within:border-neutral-400 dark:focus-within:border-neutral-500 transition">
                {/* Paperclip Attach Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      onOpenLogin?.();
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  disabled={isUploading}
                  className={`relative w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-full flex items-center justify-center shrink-0 mr-1.5 transition-all active:scale-95 cursor-pointer ${attachments.length > 0
                    ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-400/50"
                    : "text-neutral-400 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                  title="Attach files (PDF, DOCX, XLSX, CSV, JSON, TXT, Images)"
                  aria-label="Attach file"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                  {attachments.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center shadow-2xs">
                      {attachments.length}
                    </span>
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls,.json,image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      uploadFiles(e.target.files);
                      e.target.value = "";
                    }
                  }}
                  className="hidden"
                />

                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    attachments.length > 0
                      ? `Ask about ${attachments.length === 1 ? `"${attachments[0].name}"` : `${attachments.length} attached files`}...`
                      : "Ask Akshra Ai anything..."
                  }
                  className="w-full bg-transparent text-[16px] sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-400 outline-none resize-none max-h-32 pr-2 py-0.5 font-normal"
                />

                {/* Thinking Mode (Mind icon) */}
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      onOpenLogin?.();
                      return;
                    }
                    onToggleThinking();
                  }}
                  className={`relative w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-full flex items-center justify-center shrink-0 mr-1 transition-all active:scale-95 cursor-pointer ${isThinkingEnabled
                    ? "bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-300 ring-1 ring-purple-400/50 shadow-xs"
                    : "text-neutral-400 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                  title={
                    isThinkingEnabled
                      ? "Thinking Mode: Active (Deep reasoning)"
                      : "Thinking Mode: Deep multi-step reasoning"
                  }
                  aria-label="Toggle Thinking Mode"
                >
                  <Brain className={`w-4 h-4 ${isThinkingEnabled ? "stroke-[2.2]" : ""}`} />
                  {isThinkingEnabled && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  )}
                </button>

                {/* Web Search Mode (Browser/Globe icon) */}
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      onOpenLogin?.();
                      return;
                    }
                    onToggleWebSearch();
                  }}
                  className={`relative w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-full flex items-center justify-center shrink-0 mr-1 transition-all active:scale-95 cursor-pointer ${isWebSearchEnabled
                    ? "bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-300 ring-1 ring-sky-400/50 shadow-xs"
                    : "text-neutral-400 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                  title={
                    isWebSearchEnabled
                      ? "Web Search Mode: Active (Real-time Google search)"
                      : "Web Search Mode: Live Google search"
                  }
                  aria-label="Toggle Web Search Mode"
                >
                  <Globe className={`w-4 h-4 ${isWebSearchEnabled ? "stroke-[2.2]" : ""}`} />
                  {isWebSearchEnabled && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  )}
                </button>

                {/* Voice Mode Button */}
                {onOpenVoice && !isStreaming && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        onOpenLogin?.();
                        return;
                      }
                      unlockAudioAndSpeech();
                      onOpenVoice();
                    }}
                    className="w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-full flex items-center justify-center shrink-0 mr-1 text-neutral-500 hover:text-cyan-600 dark:text-neutral-400 dark:hover:text-cyan-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition active:scale-95 cursor-pointer touch-manipulation"
                    title="Voice Conversation Mode"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}

                {/* Stop vs Send Icon */}
                {isStreaming && onStop ? (
                  <button
                    type="button"
                    onClick={onStop}
                    className="w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-full flex items-center justify-center shrink-0 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 cursor-pointer shadow-sm hover:opacity-85 active:scale-95 transition-all"
                    title="Stop generating"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        onOpenLogin?.();
                        return;
                      }
                      submitMessage();
                    }}
                    disabled={!canSubmit}
                    className={`w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-full flex items-center justify-center shrink-0 transition-all ${canSubmit
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 cursor-pointer shadow-sm active:scale-95"
                      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
                      }`}
                    title="Send message"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </>
          )}

          <div className="text-center mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] text-neutral-400 dark:text-neutral-500">
            Akshra Ai - Designed & Developed by{" "}
            <a
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              href="https://rohanjaiswal.co.in"
              target="_blank"
              rel="noopener noreferrer"
            >
              Rohan Jaiswal
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
