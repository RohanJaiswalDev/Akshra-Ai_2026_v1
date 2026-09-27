"use client";

import React, { useState } from "react";
import {
  FileText,
  Table,
  FileCode,
  Image as ImageIcon,
  File,
  Download,
  X,
  Loader2,
  ExternalLink,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { FileAttachment, FileCategory } from "@/types/files";

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileCategoryTheme(category: FileCategory) {
  switch (category) {
    case "pdf":
      return {
        icon: FileText,
        bgLight: "bg-rose-50 dark:bg-rose-950/40",
        border: "border-rose-200/80 dark:border-rose-900/40",
        text: "text-rose-600 dark:text-rose-400",
        badge: "PDF",
      };
    case "docx":
      return {
        icon: FileText,
        bgLight: "bg-blue-50 dark:bg-blue-950/40",
        border: "border-blue-200/80 dark:border-blue-900/40",
        text: "text-blue-600 dark:text-blue-400",
        badge: "DOCX",
      };
    case "spreadsheet":
    case "csv":
      return {
        icon: Table,
        bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
        border: "border-emerald-200/80 dark:border-emerald-900/40",
        text: "text-emerald-600 dark:text-emerald-400",
        badge: category === "csv" ? "CSV" : "SHEET",
      };
    case "json":
      return {
        icon: FileCode,
        bgLight: "bg-amber-50 dark:bg-amber-950/40",
        border: "border-amber-200/80 dark:border-amber-900/40",
        text: "text-amber-600 dark:text-amber-400",
        badge: "JSON",
      };
    case "image":
      return {
        icon: ImageIcon,
        bgLight: "bg-purple-50 dark:bg-purple-950/40",
        border: "border-purple-200/80 dark:border-purple-900/40",
        text: "text-purple-600 dark:text-purple-400",
        badge: "IMG",
      };
    case "text":
    default:
      return {
        icon: File,
        bgLight: "bg-neutral-100 dark:bg-neutral-800",
        border: "border-neutral-200 dark:border-neutral-700",
        text: "text-neutral-600 dark:text-neutral-300",
        badge: "TXT",
      };
  }
}

/**
 * Chip showing an attached file before the user clicks send
 */
export function AttachedFileChip({
  file,
  onRemove,
  isUploading = false,
}: {
  file: FileAttachment;
  onRemove?: () => void;
  isUploading?: boolean;
}) {
  const theme = getFileCategoryTheme(file.category);
  const Icon = theme.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs shadow-2xs transition-all ${theme.bgLight} ${theme.border} max-w-[260px] sm:max-w-xs`}
    >
      {file.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={file.thumbnailUrl}
          alt={file.name}
          className="w-6 h-6 rounded-md object-cover shrink-0 border border-neutral-200/60 dark:border-neutral-700/60"
        />
      ) : (
        <div className={`p-1 rounded-md bg-white/70 dark:bg-neutral-900/50 ${theme.text} shrink-0`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate text-[11px] sm:text-xs">
          {file.name}
        </span>
        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
          {isUploading ? (
            <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              Parsing...
            </span>
          ) : (
            <>
              <span>{formatFileSize(file.size)}</span>
              {file.pageCount && <span>• {file.pageCount}p</span>}
              {file.rowCount && <span>• {file.rowCount.toLocaleString()} rows</span>}
            </>
          )}
        </span>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition cursor-pointer"
          title="Remove attachment"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

/**
 * Interactive File Card inside a rendered Chat Message
 */
export function MessageFileCard({
  attachment,
  onImageClick,
}: {
  attachment: FileAttachment;
  onImageClick?: (url: string, name: string) => void;
}) {
  const theme = getFileCategoryTheme(attachment.category);
  const Icon = theme.icon;
  const isImage = attachment.category === "image";

  if (isImage && attachment.thumbnailUrl) {
    return (
      <div className="my-2 group relative inline-block rounded-xl overflow-hidden border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50 dark:bg-neutral-900/50 shadow-xs max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.thumbnailUrl}
          alt={attachment.name}
          onClick={() => onImageClick?.(attachment.thumbnailUrl!, attachment.name)}
          className="max-h-64 sm:max-h-72 w-auto object-contain rounded-xl cursor-zoom-in group-hover:opacity-95 transition"
        />
        <div className="px-2.5 py-1.5 flex items-center justify-between text-[11px] bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs border-t border-neutral-100 dark:border-neutral-800">
          <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]">
            {attachment.name}
          </span>
          <span className="text-[10px] text-neutral-400">{formatFileSize(attachment.size)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`my-2 flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border ${theme.bgLight} ${theme.border} max-w-md shadow-2xs transition hover:shadow-xs`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`p-2 rounded-lg bg-white/90 dark:bg-neutral-900/70 ${theme.text} shrink-0 shadow-2xs`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[12px] sm:text-[13px] text-neutral-800 dark:text-neutral-100 truncate">
            {attachment.name}
          </div>
          <div className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
            <span className="font-semibold uppercase tracking-wider text-[9px] px-1 py-0.2 rounded bg-white/70 dark:bg-neutral-800/80">
              {theme.badge}
            </span>
            <span>{formatFileSize(attachment.size)}</span>
            {attachment.pageCount ? (
              <span>• {attachment.pageCount} page{attachment.pageCount === 1 ? "" : "s"}</span>
            ) : null}
            {attachment.rowCount ? (
              <span>• {attachment.rowCount.toLocaleString()} rows</span>
            ) : null}
            {attachment.sheetNames && attachment.sheetNames.length > 0 ? (
              <span>• {attachment.sheetNames.length} sheet{attachment.sheetNames.length === 1 ? "" : "s"}</span>
            ) : null}
          </div>
        </div>
      </div>

      <a
        href={attachment.url}
        download={attachment.originalName}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-white/80 dark:hover:bg-neutral-800 transition cursor-pointer shrink-0"
        title={`Download ${attachment.name}`}
      >
        <Download className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

/**
 * Quick Suggestion Pills dynamically customized when a file is attached
 */
export function FileQuickPrompts({
  attachments,
  onSelectPrompt,
}: {
  attachments: FileAttachment[];
  onSelectPrompt: (prompt: string) => void;
}) {
  if (!attachments || attachments.length === 0) return null;

  const first = attachments[0];
  let promptOptions: string[] = [];

  if (first.category === "spreadsheet" || first.category === "csv") {
    promptOptions = [
      `Analyze this ${first.category === "csv" ? "CSV" : "Excel"} file.`,
      `Find errors, null values, or anomalies in this ${first.category === "csv" ? "CSV" : "Excel"} data.`,
      `Give me a summary of key metrics and column trends.`,
    ];
  } else if (first.category === "pdf" || first.category === "docx") {
    promptOptions = [
      `Summarize this ${first.category === "pdf" ? "PDF" : "document"}.`,
      `Extract key takeaways and action items from this document.`,
      `What are the most important insights in this file?`,
    ];
  } else if (first.category === "json") {
    promptOptions = [
      `Analyze this JSON structure and schema.`,
      `Find any data formatting errors or inconsistencies in this JSON.`,
      `Summarize the key objects and data points in this JSON.`,
    ];
  } else if (first.category === "image") {
    promptOptions = [
      `Analyze and describe this image in detail.`,
      `Find any errors, flaws, or notable elements in this image.`,
      `Transcribe all visible text or diagrams from this image.`,
    ];
  } else {
    promptOptions = [
      `Analyze and summarize this file.`,
      `Find errors or issues in this document.`,
    ];
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 my-2 animate-in fade-in duration-200">
      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mr-1">
        <span>Suggested:</span>
      </span>
      {promptOptions.map((opt, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelectPrompt(opt)}
          className="px-2.5 py-1 rounded-full text-[11px] bg-neutral-100/90 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60 transition active:scale-95 cursor-pointer"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/**
 * Image Lightbox Modal for zooming in on attached images
 */
export function ImageLightboxModal({
  url,
  name,
  onClose,
}: {
  url: string;
  name: string;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl"
      >
        <div className="w-full flex items-center justify-between px-4 py-3 bg-neutral-950/80 text-white text-xs border-b border-neutral-800">
          <span className="font-medium truncate max-w-md">{name}</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-2 overflow-auto flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={name}
            className="max-h-[80vh] w-auto object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
