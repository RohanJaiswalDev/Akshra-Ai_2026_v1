"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceAssistantStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "muted"
  | "error";

export interface VoiceMessageTurn {
  role: "user" | "assistant";
  content: string;
}

interface UseVoiceAssistantOptions {
  model: string;
  personality?: "natural" | "professional" | "friendly" | "teacher" | "developer";
  speechRate?: number;
  language?: string;
  onTurnComplete?: (turn: VoiceMessageTurn) => void;
  initialConversation?: VoiceMessageTurn[];
}

interface SpeechRecognitionResultItem {
  transcript: string;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionResultItem;
}
interface SpeechRecognitionEvent {
  results: { length: number;[index: number]: SpeechRecognitionResult };
}
interface SpeechRecognitionErrorEvent {
  error: string;
}
interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
interface SpeechWindow extends Window {
  SpeechRecognition?: new () => ISpeechRecognition;
  webkitSpeechRecognition?: new () => ISpeechRecognition;
  webkitAudioContext?: typeof AudioContext;
  __activeUtterance?: SpeechSynthesisUtterance | null;
}

type SpeechQueueItem = { requestId: number; text: string };
type ResponseState = {
  id: number;
  content: string;
  streamComplete: boolean;
  cancelled: boolean;
  committed: boolean;
};

// Clean markdown, code blocks, URLs, and asterisks for smooth human speech
export function cleanTextForSpeech(raw: string) {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "") // Filter thinking tags
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#`~>]/g, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

export function isMobileOrTabletDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) ||
    window.innerWidth < 768
  );
}

// 🌟 Reusable AudioContext Singleton across UI interactions and voice turns
let sharedAudioContext: AudioContext | null = null;

export function getOrCreateSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechWindow;
  const AudioContextClass = window.AudioContext || speechWindow.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    try {
      sharedAudioContext = new AudioContextClass();
    } catch {
      return null;
    }
  }

  if (sharedAudioContext.state === "suspended") {
    void sharedAudioContext.resume().catch(() => undefined);
  }

  return sharedAudioContext;
}

// Unlocks AudioContext and SpeechSynthesis on direct user interaction (reusing single context)
export function unlockAudioAndSpeech() {
  if (typeof window === "undefined") return;

  try {
    const ctx = getOrCreateSharedAudioContext();
    if (ctx) {
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      // Prime destination with a single silent buffer
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
  } catch {
    // Ignore unlock issues
  }

  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
      const silent = new SpeechSynthesisUtterance("");
      silent.volume = 0;
      window.speechSynthesis.speak(silent);
    }
  } catch {
    // Ignore
  }
}

/**
 * 🌟 Intelligent Semantic Turn Detection & Adaptive VAD Delay Calculator
 * Eliminates early cut-offs ("I was saying something and Akshra started answering too early")
 * by analyzing phrase completeness, trailing conjunctions, hesitations, and punctuation.
 */
export function calculateSemanticTurnDelay(
  text: string,
  isFinal: boolean,
  isMobile: boolean
): number {
  const trimmed = text.trim();
  if (!trimmed) return 1000;

  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lastWord = words[words.length - 1].toLowerCase().replace(/[^a-z]/g, "");

  // 1. Hesitation markers and trailing conjunctions / prepositions
  // When a user pauses after 'and', 'because', 'so', 'to', 'um', they are formulating their thought!
  const trailingConnectors = new Set([
    "and",
    "or",
    "but",
    "because",
    "so",
    "if",
    "when",
    "while",
    "that",
    "to",
    "for",
    "with",
    "as",
    "at",
    "by",
    "from",
    "about",
    "like",
    "plus",
    "which",
    "where",
    "how",
    "who",
    "also",
    "then",
    "uh",
    "um",
    "er",
    "ah",
    "hmm",
    "well",
    "wait",
  ]);

  if (trailingConnectors.has(lastWord)) {
    // Give extended breathing room
    return isMobile ? 1600 : 1850;
  }

  // 2. Very short utterances (1-3 words) without complete predicate
  if (wordCount <= 3) {
    const quickCommands = new Set([
      "yes",
      "no",
      "stop",
      "cancel",
      "thanks",
      "thank you",
      "hello",
      "hi",
      "hey",
      "bye",
      "goodbye",
    ]);
    if (quickCommands.has(trimmed.toLowerCase())) {
      return isFinal ? (isMobile ? 500 : 600) : 950;
    }
    return isFinal ? (isMobile ? 1200 : 1400) : (isMobile ? 1400 : 1650);
  }

  // 3. Complete sentences with terminal punctuation (. ? !)
  const hasTerminalPunctuation = /[.?!]$/.test(trimmed);
  if (hasTerminalPunctuation && wordCount >= 4) {
    // Definite complete sentence: crisp natural pause
    return isFinal ? (isMobile ? 550 : 650) : (isMobile ? 950 : 1150);
  }

  // 4. Question openers without question mark ("What is...", "Can you tell me...", "How do I...")
  const firstWord = words[0].toLowerCase();
  const questionOpeners = new Set([
    "what",
    "how",
    "why",
    "when",
    "where",
    "who",
    "which",
    "can",
    "could",
    "would",
    "will",
    "is",
    "are",
    "do",
    "does",
    "should",
    "explain",
    "tell",
  ]);
  if (questionOpeners.has(firstWord) && !hasTerminalPunctuation) {
    return isFinal ? (isMobile ? 850 : 1050) : (isMobile ? 1250 : 1450);
  }

  // 5. Standard clause completion
  if (isFinal) {
    return isMobile ? 650 : 750;
  } else {
    return isMobile ? 1150 : 1350;
  }
}

export function useVoiceAssistant({
  model,
  personality = "natural",
  speechRate = 1.05,
  language = "en-US",
  onTurnComplete,
  initialConversation = [],
}: UseVoiceAssistantOptions) {
  const [status, setStatus] = useState<VoiceAssistantStatus>("idle");
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [assistantTranscript, setAssistantTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const statusRef = useRef<VoiceAssistantStatus>("idle");
  const isMicMutedRef = useRef(false);
  const isMountedRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const latestTranscriptRef = useRef("");
  const modelRef = useRef(model);
  const personalityRef = useRef(personality);
  const speechRateRef = useRef(speechRate);
  const languageRef = useRef(language);
  const onTurnCompleteRef = useRef(onTurnComplete);
  const initialConversationRef = useRef(initialConversation);
  const conversationHistoryRef = useRef<VoiceMessageTurn[]>(initialConversation);

  // Audio Context & Analysis
  const audioFrequenciesRef = useRef<Uint8Array>(new Uint8Array(64));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const visualizerFrameRef = useRef<number | null>(null);

  // Dynamic visualizer reactivity refs
  const speechVisualEnergyRef = useRef<number>(0.15);
  const lastTranscriptChangeTimeRef = useRef<number>(0);
  const lastTranscriptLengthRef = useRef<number>(0);

  // Recognition & Turn Detection
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const isRecognitionRunningRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const sessionGenerationRef = useRef(0);

  // Response & True Barge-in Tracking
  const responseRef = useRef<ResponseState>({
    id: 0,
    content: "",
    streamComplete: false,
    cancelled: false,
    committed: false,
  });
  const speechQueueRef = useRef<SpeechQueueItem[]>([]);
  const isSpeakingQueueRef = useRef(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // True Barge-in: Spoken Audio Reconciliation Refs
  const spokenChunksRef = useRef<string[]>([]);
  const currentChunkTextRef = useRef<string>("");
  const currentChunkCharIndexRef = useRef<number>(0);
  const speechStartTimeRef = useRef<number>(0);

  const processSpeechQueueRef = useRef<() => void>(() => undefined);
  const restartListeningRef = useRef<() => void>(() => undefined);
  const sendToAIRef = useRef<(text: string) => void>(() => undefined);

  const updateStatus = useCallback((nextStatus: VoiceAssistantStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    if (!recognitionRef.current || !isRecognitionRunningRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      /* browser already stopping */
    }
    isRecognitionRunningRef.current = false;
  }, []);

  const finishAssistantTurn = useCallback((requestId: number) => {
    const response = responseRef.current;
    if (
      response.id !== requestId ||
      response.cancelled ||
      response.committed ||
      !response.streamComplete
    ) {
      return;
    }
    response.committed = true;
    const content = response.content.trim();
    if (content) {
      const turn: VoiceMessageTurn = { role: "assistant", content };
      conversationHistoryRef.current.push(turn);
      onTurnCompleteRef.current?.(turn);
    }

    spokenChunksRef.current = [];
    currentChunkTextRef.current = "";
    currentChunkCharIndexRef.current = 0;

    // Brief quiet window to prevent microphone feedback echo
    setTimeout(() => {
      restartListeningRef.current();
    }, 180);
  }, []);

  const processSpeechQueue = useCallback(() => {
    if (isSpeakingQueueRef.current) return;
    const next = speechQueueRef.current.shift();
    if (!next) {
      const response = responseRef.current;
      if (response.streamComplete) finishAssistantTurn(response.id);
      return;
    }
    if (next.requestId !== responseRef.current.id || responseRef.current.cancelled) {
      processSpeechQueueRef.current();
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      processSpeechQueueRef.current();
      return;
    }

    isSpeakingQueueRef.current = true;
    updateStatus("speaking");
    stopRecognition();

    const utterance = new SpeechSynthesisUtterance(next.text);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = speechRateRef.current || 1.05;
    activeUtteranceRef.current = utterance;
    currentChunkTextRef.current = next.text;
    currentChunkCharIndexRef.current = 0;
    speechStartTimeRef.current = performance.now();

    // Word boundary tracking for exact audio position reconciliation & visualizer sync
    utterance.onboundary = (event) => {
      if (event.name === "word" || typeof event.charIndex === "number") {
        currentChunkCharIndexRef.current = Math.max(
          currentChunkCharIndexRef.current,
          event.charIndex + (event.charLength || 4)
        );
        // Synchronize visualizer pulse with actual spoken words
        speechVisualEnergyRef.current = Math.min(1.8, speechVisualEnergyRef.current + 0.35);
      }
    };

    // Anchor on window to protect against mobile engine garbage collection bug
    (window as unknown as SpeechWindow).__activeUtterance = utterance;

    const advance = () => {
      clearWatchdog();
      if (activeUtteranceRef.current === utterance) {
        activeUtteranceRef.current = null;
        // Chunk finished completely: record it into spokenChunksRef
        spokenChunksRef.current.push(next.text);
        currentChunkTextRef.current = "";
        currentChunkCharIndexRef.current = 0;
      }
      (window as unknown as SpeechWindow).__activeUtterance = null;
      isSpeakingQueueRef.current = false;
      if (responseRef.current.id === next.requestId && !responseRef.current.cancelled) {
        processSpeechQueueRef.current();
      }
    };

    utterance.onend = advance;
    utterance.onerror = advance;

    // Mobile watchdog: if mobile browser silently drops onend, advance queue automatically
    const wordCount = next.text.split(/\s+/).length;
    const maxSpeechDurationMs = Math.max(2200, wordCount * 550 + 2000);
    clearWatchdog();
    watchdogTimerRef.current = setTimeout(() => {
      if (isSpeakingQueueRef.current && activeUtteranceRef.current === utterance) {
        console.warn("[VoiceAssistant] Speech utterance timed out on device, advancing queue.");
        advance();
      }
    }, maxSpeechDurationMs);

    // Resume speech synthesis if paused by mobile OS
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // Clean playback avoiding Android Chrome cancel bug
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setTimeout(() => {
        if (activeUtteranceRef.current === utterance) {
          window.speechSynthesis.speak(utterance);
        }
      }, 35);
    } else {
      window.speechSynthesis.speak(utterance);
    }
  }, [clearWatchdog, finishAssistantTurn, selectedVoice, stopRecognition, updateStatus]);

  const restartListening = useCallback(() => {
    if (
      !isMountedRef.current ||
      !sessionActiveRef.current ||
      isMicMutedRef.current ||
      statusRef.current === "error" ||
      isSpeakingQueueRef.current
    ) {
      return;
    }
    clearSilenceTimer();
    latestTranscriptRef.current = "";
    setUserTranscript("");
    updateStatus("listening");

    if (!recognitionRef.current || isRecognitionRunningRef.current) return;
    try {
      recognitionRef.current.start();
      isRecognitionRunningRef.current = true;
    } catch {
      /* the browser is transitioning from onend */
    }
  }, [clearSilenceTimer, updateStatus]);

  const cancelCurrentResponse = useCallback(() => {
    clearWatchdog();
    requestIdRef.current += 1;
    responseRef.current.cancelled = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    speechQueueRef.current = [];
    isSpeakingQueueRef.current = false;
    activeUtteranceRef.current = null;
    if (typeof window !== "undefined") {
      (window as unknown as SpeechWindow).__activeUtterance = null;
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [clearWatchdog]);

  /**
   * 🌟 True Barge-in Interruption & Audio Context Reconciliation
   * Slices the assistant's response to EXACTLY what the user actually heard so far.
   * Reconciles conversation history to prevent hallucinating unspoken context.
   */
  const interrupt = useCallback(() => {
    // 1. Calculate what text was actually voiced aloud
    let heardText = spokenChunksRef.current.join(" ").trim();
    if (currentChunkTextRef.current) {
      let spokenSlice = "";
      if (currentChunkCharIndexRef.current > 0) {
        spokenSlice = currentChunkTextRef.current
          .slice(0, currentChunkCharIndexRef.current)
          .trim();
      } else {
        // Fallback: estimate voiced words from elapsed time if onboundary was absent
        const elapsedSec = (performance.now() - speechStartTimeRef.current) / 1000;
        if (elapsedSec > 0.35) {
          const words = currentChunkTextRef.current.split(/\s+/);
          const wordsSpoken = Math.min(words.length, Math.floor(elapsedSec * 3.1));
          if (wordsSpoken > 0) spokenSlice = words.slice(0, wordsSpoken).join(" ");
        }
      }
      if (spokenSlice) {
        heardText = heardText ? `${heardText} ${spokenSlice}` : spokenSlice;
      }
    }

    // 2. Reconcile context: commit only what was heard
    if (heardText && !responseRef.current.committed) {
      responseRef.current.committed = true;
      const reconciledTurn: VoiceMessageTurn = {
        role: "assistant",
        content: `${heardText}...`,
      };
      conversationHistoryRef.current.push(reconciledTurn);
      onTurnCompleteRef.current?.(reconciledTurn);
    }

    // 3. Reset pipeline
    cancelCurrentResponse();
    spokenChunksRef.current = [];
    currentChunkTextRef.current = "";
    currentChunkCharIndexRef.current = 0;
    setAssistantTranscript(heardText ? `${heardText}...` : "");
    unlockAudioAndSpeech();
    restartListeningRef.current();
  }, [cancelCurrentResponse]);

  const enqueueSpeech = useCallback((requestId: number, text: string) => {
    const cleaned = cleanTextForSpeech(text);
    if (!cleaned || responseRef.current.cancelled || responseRef.current.id !== requestId) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    speechQueueRef.current.push({ requestId, text: cleaned });
    processSpeechQueueRef.current();
  }, []);

  const sendToAI = useCallback(
    async (spokenText: string) => {
      const text = spokenText.trim();
      if (!text || !sessionActiveRef.current || isMicMutedRef.current) return;
      clearSilenceTimer();
      stopRecognition();
      cancelCurrentResponse();

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      responseRef.current = {
        id: requestId,
        content: "",
        streamComplete: false,
        cancelled: false,
        committed: false,
      };

      spokenChunksRef.current = [];
      currentChunkTextRef.current = "";
      currentChunkCharIndexRef.current = 0;

      const userTurn: VoiceMessageTurn = { role: "user", content: text };
      conversationHistoryRef.current.push(userTurn);
      onTurnCompleteRef.current?.(userTurn);
      setUserTranscript(text);
      setAssistantTranscript("");
      updateStatus("thinking");

      const controller = new AbortController();
      abortControllerRef.current = controller;
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversationHistoryRef.current.slice(-12),
            model: modelRef.current,
            mode: "voice",
            personality: personalityRef.current,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || "The voice assistant could not reach the AI service.");
        }
        if (!response.body) throw new Error("The AI service returned an empty response.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let speechBuffer = "";
        let hasEnqueuedFirstChunk = false;

        // 🌟 Ultra-Low Latency First-Chunk Micro-Sentence Dispatch (<300ms TTFA)
        const flushSpeechBuffer = (force = false) => {
          if (!speechBuffer) return;

          let splitAt = -1;

          // For the very first chunk, emit immediately on first short clause or comma
          if (!hasEnqueuedFirstChunk) {
            const firstClauseMatch = speechBuffer.match(/^([^,.;:!?—\n]+[,.;:!?—\n])/);
            if (firstClauseMatch && firstClauseMatch[0].trim().length >= 8) {
              splitAt = firstClauseMatch[0].length;
              hasEnqueuedFirstChunk = true;
            } else if (speechBuffer.length >= 32) {
              const spaceIdx = speechBuffer.lastIndexOf(" ", 32);
              if (spaceIdx > 12) {
                splitAt = spaceIdx + 1;
                hasEnqueuedFirstChunk = true;
              }
            }
          }

          // Subsequent chunks: split on sentence boundaries or natural commas
          if (splitAt <= 0) {
            const boundary = speechBuffer.match(/[.!?;:]+(?:\s|$)|\n+/);
            const lastSpace = speechBuffer.length > 85 ? speechBuffer.lastIndexOf(" ") : -1;
            splitAt = boundary
              ? boundary.index! + boundary[0].length
              : lastSpace > 40
                ? lastSpace + 1
                : force
                  ? speechBuffer.length
                  : -1;
          }

          if (splitAt <= 0) return;
          const chunk = speechBuffer.slice(0, splitAt);
          speechBuffer = speechBuffer.slice(splitAt);
          enqueueSpeech(requestId, chunk);
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (controller.signal.aborted || responseRef.current.id !== requestId) return;
          const chunk = decoder.decode(value, { stream: true });
          responseRef.current.content += chunk;
          speechBuffer += chunk;
          setAssistantTranscript(cleanTextForSpeech(responseRef.current.content));
          flushSpeechBuffer();

          if (
            speechBuffer.length > 35 &&
            speechQueueRef.current.length === 0 &&
            !isSpeakingQueueRef.current
          ) {
            flushSpeechBuffer(true);
          }
        }

        const finalChunk = decoder.decode();
        if (finalChunk) {
          responseRef.current.content += finalChunk;
          speechBuffer += finalChunk;
          setAssistantTranscript(cleanTextForSpeech(responseRef.current.content));
        }
        flushSpeechBuffer(true);

        if (responseRef.current.id !== requestId || controller.signal.aborted) return;
        responseRef.current.streamComplete = true;
        abortControllerRef.current = null;

        if (speechQueueRef.current.length === 0 && !isSpeakingQueueRef.current) {
          finishAssistantTurn(requestId);
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (responseRef.current.id !== requestId || !sessionActiveRef.current) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to generate a voice response."
        );
        updateStatus("error");
      }
    },
    [
      cancelCurrentResponse,
      clearSilenceTimer,
      enqueueSpeech,
      finishAssistantTurn,
      stopRecognition,
      updateStatus,
    ]
  );

  const createRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setErrorMessage(
        "Live speech recognition is unavailable in this browser. Use Chrome, Edge, or Safari over HTTPS."
      );
      updateStatus("error");
      return false;
    }

    const isMobile = isMobileOrTabletDevice();
    const recognition = new SpeechRecognition();

    recognition.continuous = !isMobile;
    recognition.interimResults = true;
    recognition.lang = languageRef.current || navigator.language || "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isRecognitionRunningRef.current = true;
    };

    recognition.onresult = (event) => {
      if (!sessionActiveRef.current || isMicMutedRef.current) return;

      // 🌟 True Barge-in: if the assistant is speaking and the user speaks, interrupt immediately!
      if (statusRef.current === "speaking" || isSpeakingQueueRef.current) {
        interrupt();
      }

      let transcript = "";
      let hasFinalResult = false;
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
        hasFinalResult ||= event.results[index].isFinal;
      }
      transcript = transcript.trim();
      if (!transcript) return;

      // Modulate speech visual energy according to vocal activity
      const lengthDelta = Math.abs(transcript.length - lastTranscriptLengthRef.current);
      if (lengthDelta > 0) {
        lastTranscriptChangeTimeRef.current = performance.now();
        lastTranscriptLengthRef.current = transcript.length;
        speechVisualEnergyRef.current = Math.min(1.8, Math.max(0.4, 0.4 + lengthDelta * 0.15));
      }

      latestTranscriptRef.current = transcript;
      setUserTranscript(transcript);
      clearSilenceTimer();

      // 🌟 Intelligent Semantic Turn Detection & Adaptive VAD Delay
      const silenceDelay = calculateSemanticTurnDelay(transcript, hasFinalResult, isMobile);
      silenceTimerRef.current = setTimeout(
        () => sendToAIRef.current(latestTranscriptRef.current),
        silenceDelay
      );
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        isRecognitionRunningRef.current = false;
        if (
          sessionActiveRef.current &&
          statusRef.current === "listening" &&
          !isMicMutedRef.current &&
          !isSpeakingQueueRef.current
        ) {
          window.setTimeout(() => restartListeningRef.current(), isMobile ? 180 : 300);
        }
        return;
      }

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setErrorMessage(
          "Microphone or speech-recognition permission was denied. Allow microphone access in your browser settings."
        );
        updateStatus("error");
      } else if (event.error === "network") {
        isRecognitionRunningRef.current = false;
        if (sessionActiveRef.current && statusRef.current === "listening") {
          window.setTimeout(() => restartListeningRef.current(), 800);
        }
      }
    };

    recognition.onend = () => {
      isRecognitionRunningRef.current = false;
      if (
        sessionActiveRef.current &&
        statusRef.current === "listening" &&
        !isMicMutedRef.current &&
        !isSpeakingQueueRef.current
      ) {
        window.setTimeout(() => restartListeningRef.current(), isMobile ? 120 : 180);
      }
    };

    recognitionRef.current = recognition;
    return true;
  }, [clearSilenceTimer, interrupt, updateStatus]);

  const stopSession = useCallback(() => {
    sessionGenerationRef.current += 1;
    sessionActiveRef.current = false;
    clearSilenceTimer();
    clearWatchdog();
    cancelCurrentResponse();
    stopRecognition();
    recognitionRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {
        /* ignore */
      }
      analyserRef.current = null;
    }

    // Do not destroy sharedAudioContext here so it stays reusable across toggles
    audioContextRef.current = null;
    updateStatus("idle");
  }, [cancelCurrentResponse, clearSilenceTimer, clearWatchdog, stopRecognition, updateStatus]);

  const startSession = useCallback(async () => {
    stopSession();
    const sessionGeneration = sessionGenerationRef.current;
    setErrorMessage(null);
    setUserTranscript("");
    setAssistantTranscript("");
    setIsMicMuted(false);
    isMicMutedRef.current = false;
    conversationHistoryRef.current = [...initialConversationRef.current];
    updateStatus("connecting");

    // Gesture unlock helper on mobile
    unlockAudioAndSpeech();

    const isMobile = isMobileOrTabletDevice();

    let stream: MediaStream | null = null;
    if (!isMobile && navigator.mediaDevices?.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (err) {
        console.warn("Hardware mediaStream capture skipped, speech recognition will run directly:", err);
      }
    }

    if (sessionGeneration !== sessionGenerationRef.current) {
      stream?.getTracks().forEach((track) => track.stop());
      return;
    }

    // Reusable AudioContext Singleton
    const audioContext = getOrCreateSharedAudioContext();
    if (audioContext) {
      audioContextRef.current = audioContext;
      if (stream) {
        try {
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 128;
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);
          analyserRef.current = analyser;
          mediaStreamRef.current = stream;
        } catch {
          // ignore stream connection issues
        }
      }
      if (audioContext.state === "suspended") {
        await audioContext.resume().catch(() => undefined);
      }
    }

    if (sessionGeneration !== sessionGenerationRef.current) {
      stream?.getTracks().forEach((track) => track.stop());
      return;
    }

    sessionActiveRef.current = true;

    if (!createRecognition()) {
      stream?.getTracks().forEach((track) => track.stop());
      sessionActiveRef.current = false;
      return;
    }

    restartListeningRef.current();
  }, [createRecognition, stopSession, updateStatus]);

  const toggleMute = useCallback(() => {
    const next = !isMicMutedRef.current;
    isMicMutedRef.current = next;
    setIsMicMuted(next);
    mediaStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });

    if (next) {
      clearSilenceTimer();
      stopRecognition();
      updateStatus("muted");
    } else {
      restartListeningRef.current();
    }
  }, [clearSilenceTimer, stopRecognition, updateStatus]);

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
    try {
      localStorage.setItem("akshra_voice_name", voice.name);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    processSpeechQueueRef.current = processSpeechQueue;
  }, [processSpeechQueue]);

  useEffect(() => {
    restartListeningRef.current = restartListening;
  }, [restartListening]);

  useEffect(() => {
    sendToAIRef.current = sendToAI;
  }, [sendToAI]);

  useEffect(() => {
    isMountedRef.current = true;
    const loadVoices = () => {
      if (!("speechSynthesis" in window)) return;
      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices.length === 0) return;

      const englishVoices = allVoices.filter((voice) =>
        voice.lang.toLowerCase().startsWith("en")
      );
      const voices = englishVoices.length > 0 ? englishVoices : allVoices;
      const savedVoiceName = localStorage.getItem("akshra_voice_name");
      const preferred =
        voices.find((voice) => voice.name === savedVoiceName) ||
        voices.find((voice) =>
          /natural|neural|google|samantha|karen|moira|daniel|rishi|serena/i.test(voice.name)
        ) ||
        voices[0];

      setAvailableVoices(voices);
      setSelectedVoice((current) =>
        current && voices.some((voice) => voice.name === current.name) ? current : preferred
      );
    };

    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
      isMountedRef.current = false;
      stopSession();
    };
  }, [stopSession]);

  useEffect(() => {
    modelRef.current = model;
    personalityRef.current = personality;
    speechRateRef.current = speechRate;
    languageRef.current = language;
    onTurnCompleteRef.current = onTurnComplete;
    initialConversationRef.current = initialConversation;
    if (!sessionActiveRef.current) {
      conversationHistoryRef.current = [...initialConversation];
    }
  }, [initialConversation, language, model, onTurnComplete, personality, speechRate]);

  // 🌟 Dynamic Real-Time Visualizer Frequencies Loop
  // Reacts directly to hardware mic or speech cadence & token arrival
  useEffect(() => {
    const renderVisualizer = () => {
      const data = new Uint8Array(64);
      const now = performance.now();

      if (analyserRef.current && statusRef.current === "listening" && !isMicMutedRef.current) {
        // Direct hardware mic analyser available
        const source = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(source);
        const step = Math.max(1, Math.floor(source.length / data.length));
        for (let index = 0; index < data.length; index += 1) {
          data[index] = source[index * step] || 0;
        }
      } else if (statusRef.current === "listening" && !isMicMutedRef.current) {
        // Mobile / Web Speech cadence simulation: pulses reactively with user speech
        const timeSinceSpoken = now - lastTranscriptChangeTimeRef.current;
        if (timeSinceSpoken < 450) {
          const energy = speechVisualEnergyRef.current;
          for (let index = 0; index < data.length; index += 1) {
            const bell = Math.exp(-Math.pow((index - 14) / 10, 2));
            const val =
              35 + bell * 125 * energy + Math.sin(now * 0.02 + index * 0.4) * 28 * energy;
            data[index] = Math.max(15, Math.min(220, Math.floor(val)));
          }
        } else {
          // Natural resting breath animation
          const breathe = Math.sin(now * 0.003);
          for (let index = 0; index < data.length; index += 1) {
            data[index] = Math.max(
              12,
              Math.min(50, Math.floor(22 + breathe * 12 + Math.sin(now * 0.006 + index * 0.2) * 8))
            );
          }
        }
      } else if (statusRef.current === "speaking") {
        // Dynamic speech cadence pulsed by utterance word boundaries
        const speechPulse = speechVisualEnergyRef.current;
        speechVisualEnergyRef.current = Math.max(0.3, speechVisualEnergyRef.current * 0.94);
        for (let index = 0; index < data.length; index += 1) {
          const bell = Math.exp(-Math.pow((index - 18) / 12, 2));
          const val = 50 + bell * 135 * speechPulse + Math.sin(now * 0.008 + index * 0.35) * 45;
          data[index] = Math.max(15, Math.min(240, Math.floor(val)));
        }
      } else if (statusRef.current === "thinking") {
        // Thinking pulse
        for (let index = 0; index < data.length; index += 1) {
          data[index] = Math.max(
            12,
            Math.min(105, Math.floor(42 + Math.sin(now * 0.005 + index * 0.25) * 38))
          );
        }
      } else {
        data.fill(12);
      }

      audioFrequenciesRef.current = data;
      visualizerFrameRef.current = requestAnimationFrame(renderVisualizer);
    };

    visualizerFrameRef.current = requestAnimationFrame(renderVisualizer);
    return () => {
      if (visualizerFrameRef.current) cancelAnimationFrame(visualizerFrameRef.current);
    };
  }, []);

  return {
    status,
    isMicMuted,
    userTranscript,
    assistantTranscript,
    errorMessage,
    audioFrequenciesRef,
    availableVoices,
    selectedVoice,
    setVoice,
    startSession,
    stopSession,
    toggleMute,
    interrupt,
  };
}
