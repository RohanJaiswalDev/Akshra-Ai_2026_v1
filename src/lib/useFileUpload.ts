"use client";

import { useState, useCallback } from "react";
import { FileAttachment } from "@/types/files";

export function useFileUpload() {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const removeAttachment = useCallback((fileId: string) => {
    setAttachments((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
    setUploadError(null);
  }, []);

  const uploadFiles = useCallback(async (files: FileList | File[]): Promise<FileAttachment[]> => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return [];

    setIsUploading(true);
    setUploadError(null);
    const uploadedResults: FileAttachment[] = [];

    for (const file of fileArray) {
      if (file.size > 25 * 1024 * 1024) {
        setUploadError(`File "${file.name}" exceeds the 25 MB size limit.`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Upload failed with status ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.attachment) {
          uploadedResults.push(data.attachment);
          setAttachments((prev) => [...prev, data.attachment]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to upload file.";
        console.error("[useFileUpload error]:", msg);
        setUploadError(msg);
      }
    }

    setIsUploading(false);
    return uploadedResults;
  }, []);

  return {
    attachments,
    setAttachments,
    isUploading,
    uploadError,
    setUploadError,
    isDragging,
    setIsDragging,
    uploadFiles,
    removeAttachment,
    clearAttachments,
  };
}
