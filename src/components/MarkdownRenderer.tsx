"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export const MarkdownRenderer = React.memo(function MarkdownRenderer({
  content,
  isStreaming,
}: MarkdownRendererProps) {
  // Keep hooks before every conditional return so streaming state cannot change hook order.
  const segments = React.useMemo(() => parseContent(content), [content]);

  // If content is empty while streaming, show single thin cursor perfectly centered
  if (!content || !content.trim()) {
    return (
      <div className="flex items-center h-7 select-none">
        {isStreaming && (
          <span className="inline-block w-[2px] h-[16px] bg-neutral-800 dark:bg-neutral-200 animate-pulse rounded-full" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 font-sans text-sm sm:text-[15px] leading-7">
      {segments.map((segment, index) => {
        const isLastSegment = index === segments.length - 1;

        if (segment.type === "code") {
          return (
            <React.Fragment key={index}>
              <CodeBlock
                language={segment.language || "text"}
                code={segment.content}
              />
              {isLastSegment && isStreaming && (
                <span className="inline-block w-[2px] h-[16px] ml-1 bg-neutral-800 dark:bg-neutral-200 animate-pulse align-middle rounded-full" />
              )}
            </React.Fragment>
          );
        }

        return (
          <div key={index} className="space-y-2">
            {renderMarkdownParagraphs(segment.content, isLastSegment && isStreaming)}
          </div>
        );
      })}
    </div>
  );
});

const CodeBlock = React.memo(function CodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-neutral-800/80 bg-[#18181b] shadow-md text-neutral-200 max-w-full">
      {/* Code Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#202024] border-b border-neutral-800/60 text-xs">
        <span className="font-mono text-neutral-400 lowercase truncate max-w-[150px] sm:max-w-none">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-700/60 transition cursor-pointer active:scale-95 shrink-0"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Pre */}
      <div className="p-3 sm:p-4 overflow-x-auto max-w-full">
        <pre className="font-mono text-xs sm:text-[13px] leading-relaxed whitespace-pre font-normal text-neutral-100">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
});

interface ContentSegment {
  type: "text" | "code";
  language?: string;
  content: string;
}

function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)(?:```|$)/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textChunk = content.slice(lastIndex, match.index);
      if (textChunk.trim()) {
        segments.push({ type: "text", content: textChunk });
      }
    }

    segments.push({
      type: "code",
      language: match[1].trim() || "plaintext",
      content: match[2].replace(/\n$/, ""),
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    if (remaining.trim()) {
      segments.push({ type: "text", content: remaining });
    }
  }

  if (segments.length === 0) {
    segments.push({ type: "text", content });
  }

  return segments;
}

function renderMarkdownParagraphs(text: string, showCursorAtEnd = false) {
  const lines = text.split("\n");
  const paragraphs: React.ReactNode[] = [];
  let currentListItems: string[] = [];

  const flushList = () => {
    if (currentListItems.length > 0) {
      paragraphs.push(
        <ul key={`list-${paragraphs.length}`} className="list-disc pl-5 space-y-1 my-2">
          {currentListItems.map((item, idx) => (
            <li key={idx} className="text-neutral-800 dark:text-neutral-200">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      currentListItems = [];
    }
  };

  // Find index of the last non-empty line
  let lastNonEmptyIndex = -1;
  for (let idx = lines.length - 1; idx >= 0; idx--) {
    if (lines[idx].trim()) {
      lastNonEmptyIndex = idx;
      break;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isTargetForCursor = showCursorAtEnd && i === lastNonEmptyIndex;

    // Check list item
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      currentListItems.push(trimmed.slice(2));
      continue;
    }

    flushList();

    if (!trimmed) {
      continue;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      paragraphs.push(
        <h3 key={i} className="text-base font-semibold text-neutral-900 dark:text-neutral-100 pt-2">
          {renderInlineMarkdown(trimmed.slice(4))}
          {isTargetForCursor && (
            <span className="inline-block w-[2px] h-[16px] ml-1 bg-neutral-800 dark:bg-neutral-200 animate-pulse align-middle rounded-full" />
          )}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      paragraphs.push(
        <h2 key={i} className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 pt-3">
          {renderInlineMarkdown(trimmed.slice(3))}
          {isTargetForCursor && (
            <span className="inline-block w-[2px] h-[16px] ml-1 bg-neutral-800 dark:bg-neutral-200 animate-pulse align-middle rounded-full" />
          )}
        </h2>
      );
    } else if (trimmed.startsWith("# ")) {
      paragraphs.push(
        <h1 key={i} className="text-xl font-bold text-neutral-900 dark:text-neutral-100 pt-4">
          {renderInlineMarkdown(trimmed.slice(2))}
          {isTargetForCursor && (
            <span className="inline-block w-[2px] h-[16px] ml-1 bg-neutral-800 dark:bg-neutral-200 animate-pulse align-middle rounded-full" />
          )}
        </h1>
      );
    } else {
      paragraphs.push(
        <p key={i} className="leading-7 text-neutral-800 dark:text-neutral-200">
          {renderInlineMarkdown(line)}
          {isTargetForCursor && (
            <span className="inline-block w-[2px] h-[16px] ml-1 bg-neutral-800 dark:bg-neutral-200 animate-pulse align-middle rounded-full" />
          )}
        </p>
      );
    }
  }

  flushList();
  return paragraphs;
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Regex to split by bold (**text**) and inline code (`code`)
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded-md bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono text-[12px] sm:text-[12.5px] border border-neutral-300/40 dark:border-neutral-700/40 break-words"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-neutral-900 dark:text-neutral-100">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}
