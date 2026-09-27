"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  onTurnComplete?: (turn: VoiceMessageTurn) => void;
  initialConversation?: VoiceMessageTurn[];
}

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechWindow extends Window {
  SpeechRecognition?: new () => ISpeechRecognition;
  webkitSpeechRecognition?: new () => ISpeechRecognition;
  webkitAudioContext?: typeof AudioContext;
}

export function useVoiceAssistant({
  model,
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

  // Sync refs to prevent stale closure bugs
  const statusRef = useRef<VoiceAssistantStatus>("idle");
  const isMicMutedRef = useRef(false);
  const latestTranscriptRef = useRef("");
  const isMountedRef = useRef(true);

  const updateStatus = useCallback((newStatus: VoiceAssistantStatus) => {
    statusRef.current = newStatus;
    setStatus(newStatus);
  }, []);

  // Audio frequency data for 60 FPS visualizer orb (values 0 - 255)
  const audioFrequenciesRef = useRef<Uint8Array>(new Uint8Array(64));

  // AudioContext & Analyser refs for real microphone capture
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const rafVisualizerRef = useRef<number | null>(null);

  // Speech Recognition & Synthesis refs
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const isRecognitionRunningRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingQueueRef = useRef(false);
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const conversationHistoryRef = useRef<VoiceMessageTurn[]>(initialConversation);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentAssistantFullResponseRef = useRef("");

  // Sync conversation history
  useEffect(() => {
    conversationHistoryRef.current = initialConversation;
  }, [initialConversation]);

  // Load natural voices from SpeechSynthesis
  useEffect(() => {
    isMountedRef.current = true;

    const loadVoices = () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const englishVoices = voices.filter(
          (v) => v.lang.startsWith("en") || v.lang.includes("en-")
        );
        const naturalOrNeural = englishVoices.filter(
          (v) =>
            v.name.includes("Natural") ||
            v.name.includes("Neural") ||
            v.name.includes("Google") ||
            v.name.includes("Samantha") ||
            v.name.includes("Jenny") ||
            v.name.includes("Aria") ||
            v.name.includes("Daniel")
        );

        const listToUse = englishVoices.length > 0 ? englishVoices : voices;
        setAvailableVoices(listToUse);

        const savedVoiceName = localStorage.getItem("akshra_voice_name");
        const defaultVoice =
          listToUse.find((v) => v.name === savedVoiceName) ||
          naturalOrNeural[0] ||
          listToUse.find((v) => v.name.includes("Google") && v.lang === "en-US") ||
          listToUse[0];

        setSelectedVoice(defaultVoice);
      }
    };

    loadVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      isMountedRef.current = false;
      stopSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update selected voice
  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
    try {
      localStorage.setItem("akshra_voice_name", voice.name);
    } catch {
      // Ignore
    }
  }, []);

  // Visualizer loop for real-time audio analysis
  const startVisualizer = useCallback(() => {
    const updateFrequencies = () => {
      if (!isMountedRef.current) return;

      const currentStatus = statusRef.current;
      if (analyserRef.current && currentStatus === "listening" && !isMicMutedRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const step = Math.floor(dataArray.length / 64) || 1;
        const sampled = new Uint8Array(64);
        for (let i = 0; i < 64; i++) {
          sampled[i] = dataArray[i * step] || 0;
        }
        audioFrequenciesRef.current = sampled;
      } else if (currentStatus === "speaking") {
        const now = performance.now() * 0.006;
        const sampled = new Uint8Array(64);
        for (let i = 0; i < 64; i++) {
          const wave =
            Math.sin(now + i * 0.25) * 55 +
            Math.sin(now * 1.8 + i * 0.15) * 40 +
            Math.cos(now * 0.9 - i * 0.35) * 35 +
            90;
          sampled[i] = Math.max(10, Math.min(255, Math.floor(wave)));
        }
        audioFrequenciesRef.current = sampled;
      } else if (currentStatus === "thinking") {
        const now = performance.now() * 0.004;
        const sampled = new Uint8Array(64);
        for (let i = 0; i < 64; i++) {
          sampled[i] = Math.floor(Math.sin(now + i * 0.12) * 25 + 40);
        }
        audioFrequenciesRef.current = sampled;
      } else {
        audioFrequenciesRef.current = new Uint8Array(64).fill(12);
      }

      rafVisualizerRef.current = requestAnimationFrame(updateFrequencies);
    };

    if (rafVisualizerRef.current) {
      cancelAnimationFrame(rafVisualizerRef.current);
    }
    rafVisualizerRef.current = requestAnimationFrame(updateFrequencies);
  }, []);

  useEffect(() => {
    startVisualizer();
    return () => {
      if (rafVisualizerRef.current) {
        cancelAnimationFrame(rafVisualizerRef.current);
      }
    };
  }, [startVisualizer]);

  // Clean raw markdown for natural human TTS
  const cleanTextForSpeech = (raw: string): string => {
    return raw
      .replace(/[*_#`~>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\n+/g, " ")
      .trim();
  };

  // Chrome speechSynthesis heartbeat fix
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Safe restart of speech recognition
  const restartListening = useCallback(() => {
    if (!isMountedRef.current || statusRef.current === "idle" || statusRef.current === "muted") {
      return;
    }
    updateStatus("listening");
    if (recognitionRef.current && !isRecognitionRunningRef.current) {
      try {
        recognitionRef.current.start();
        isRecognitionRunningRef.current = true;
      } catch {
        // Recognition already active or starting
      }
    }
  }, [updateStatus]);

  // Stop assistant speech & clear queue
  const stopAssistantSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    activeUtterancesRef.current = [];
    speechQueueRef.current = [];
    isSpeakingQueueRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Process sentence queue sequentially
  const processSpeechQueue = useCallback(() => {
    if (
      isSpeakingQueueRef.current ||
      speechQueueRef.current.length === 0 ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    const nextSentence = speechQueueRef.current.shift();
    if (!nextSentence || !nextSentence.trim()) {
      processSpeechQueue();
      return;
    }

    isSpeakingQueueRef.current = true;
    updateStatus("speaking");

    // Temporarily pause recognition while speaking to prevent speaker echo
    if (recognitionRef.current && isRecognitionRunningRef.current) {
      try {
        recognitionRef.current.stop();
        isRecognitionRunningRef.current = false;
      } catch {
        // Ignore
      }
    }

    const utterance = new SpeechSynthesisUtterance(nextSentence.trim());
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Retain utterance in ref array to prevent Chrome V8 garbage collection mid-speech
    activeUtterancesRef.current.push(utterance);

    utterance.onend = () => {
      activeUtterancesRef.current = activeUtterancesRef.current.filter((u) => u !== utterance);
      isSpeakingQueueRef.current = false;

      if (speechQueueRef.current.length > 0) {
        processSpeechQueue();
      } else {
        // Entire answer completed
        if (currentAssistantFullResponseRef.current) {
          const fullTurn: VoiceMessageTurn = {
            role: "assistant",
            content: currentAssistantFullResponseRef.current,
          };
          conversationHistoryRef.current.push(fullTurn);
          onTurnComplete?.(fullTurn);
          currentAssistantFullResponseRef.current = "";
        }
        // Immediately resume listening for the user's next question!
        restartListening();
      }
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis utterance ended:", e);
      activeUtterancesRef.current = activeUtterancesRef.current.filter((u) => u !== utterance);
      isSpeakingQueueRef.current = false;

      if (speechQueueRef.current.length > 0) {
        processSpeechQueue();
      } else {
        restartListening();
      }
    };

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  }, [selectedVoice, onTurnComplete, restartListening, updateStatus]);

  // Send user query to OpenRouter with streaming response
  const sendToAI = useCallback(
    async (spokenText: string) => {
      if (!spokenText.trim()) return;

      const userTurn: VoiceMessageTurn = { role: "user", content: spokenText };
      conversationHistoryRef.current.push(userTurn);
      onTurnComplete?.(userTurn);

      updateStatus("thinking");
      setAssistantTranscript("");
      currentAssistantFullResponseRef.current = "";
      stopAssistantSpeech();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversationHistoryRef.current.slice(-10),
            model: model,
            mode: "voice",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errText = "Failed to communicate with AI.";
          try {
            const errData = (await response.json()) as { error?: string };
            if (errData?.error) errText = errData.error;
          } catch {
            // Raw text fallback
          }
          throw new Error(errText);
        }

        if (!response.body) throw new Error("No response body received.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sentenceBuffer = "";
        let accumulatedFull = "";
        let hasSpokenFirstClause = false;

        // Splitting patterns for sentence boundaries and fast first-clause start
        const sentenceEndRegex = /([.?!;:]+(\s|$)|[\n]+)/;
        const clauseEndRegex = /([,;—]+(\s|$)|[.?!;:]+(\s|$)|[\n]+)/;

        while (true) {
          if (controller.signal.aborted) break;

          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          sentenceBuffer += chunk;
          accumulatedFull += chunk;
          currentAssistantFullResponseRef.current = accumulatedFull;
          setAssistantTranscript(accumulatedFull);

          // ⚡ FAST FIRST CLAUSE: If we have at least 3 words and encounter any pause or punctuation,
          // start speaking immediately (< 300ms time to voice)!
          if (!hasSpokenFirstClause) {
            const wordCount = sentenceBuffer.trim().split(/\s+/).length;
            if (wordCount >= 3) {
              const clauseMatch = clauseEndRegex.exec(sentenceBuffer);
              if (clauseMatch) {
                const splitIdx = clauseMatch.index + clauseMatch[0].length;
                const firstPart = sentenceBuffer.substring(0, splitIdx);
                sentenceBuffer = sentenceBuffer.substring(splitIdx);
                const cleaned = cleanTextForSpeech(firstPart);
                if (cleaned.length > 1) {
                  hasSpokenFirstClause = true;
                  speechQueueRef.current.push(cleaned);
                  processSpeechQueue();
                }
              }
            }
          }

          // Subsequent sentence extraction
          let match: RegExpExecArray | null;
          while ((match = sentenceEndRegex.exec(sentenceBuffer)) !== null) {
            const splitIdx = match.index + match[0].length;
            const completeSentence = sentenceBuffer.substring(0, splitIdx);
            sentenceBuffer = sentenceBuffer.substring(splitIdx);

            const cleaned = cleanTextForSpeech(completeSentence);
            if (cleaned.length > 1) {
              speechQueueRef.current.push(cleaned);
              processSpeechQueue();
            }
          }

          // If buffer becomes too long (> 75 chars) without sentence punctuation, split at last space
          if (sentenceBuffer.length > 75) {
            const lastSpace = sentenceBuffer.lastIndexOf(" ");
            if (lastSpace > 30) {
              const part = sentenceBuffer.substring(0, lastSpace);
              sentenceBuffer = sentenceBuffer.substring(lastSpace + 1);
              const cleaned = cleanTextForSpeech(part);
              if (cleaned.length > 1) {
                speechQueueRef.current.push(cleaned);
                processSpeechQueue();
              }
            }
          }
        }

        // Enqueue any remainder upon stream completion
        if (sentenceBuffer.trim()) {
          const cleaned = cleanTextForSpeech(sentenceBuffer);
          if (cleaned.length > 0) {
            speechQueueRef.current.push(cleaned);
            processSpeechQueue();
          }
        }

        abortControllerRef.current = null;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("Voice AI error:", err);
        const message = err instanceof Error ? err.message : "Failed to generate speech response.";
        setErrorMessage(message);
        updateStatus("error");
      }
    },
    [model, onTurnComplete, processSpeechQueue, stopAssistantSpeech, updateStatus]
  );

  // Initialize Speech Recognition
  const initSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return;

    const speechWindow = window as unknown as SpeechWindow;
    const SpeechRecognitionClass =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setErrorMessage(
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      updateStatus("error");
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isRecognitionRunningRef.current = true;
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (isMicMutedRef.current || statusRef.current === "speaking" || statusRef.current === "thinking") {
          return;
        }

        let interimText = "";
        let isFinalDetected = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          interimText += transcriptChunk;
          if (event.results[i].isFinal) {
            isFinalDetected = true;
          }
        }

        const trimmed = interimText.trim();
        if (!trimmed) return;

        latestTranscriptRef.current = trimmed;
        setUserTranscript(trimmed);

        // Reset silence timer on every voice detection
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        // Fast end-of-speech detection: 550ms after speech pause, immediately trigger AI answer!
        const delay = isFinalDetected ? 400 : 650;
        silenceTimerRef.current = setTimeout(() => {
          const textToCommit = latestTranscriptRef.current.trim();
          if (textToCommit.length > 0 && statusRef.current === "listening") {
            latestTranscriptRef.current = "";
            sendToAI(textToCommit);
          }
        }, delay);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "no-speech" || event.error === "aborted") {
          return;
        }
        console.warn("Speech recognition notice:", event.error);
        if (event.error === "not-allowed") {
          setErrorMessage("Microphone access was denied. Please allow microphone permission.");
          updateStatus("error");
        }
      };

      recognition.onend = () => {
        isRecognitionRunningRef.current = false;
        // If we are in listening mode, automatically restart to keep recognition alive
        if (isMountedRef.current && statusRef.current === "listening" && !isMicMutedRef.current) {
          try {
            recognition.start();
            isRecognitionRunningRef.current = true;
          } catch {
            // Ignore
          }
        }
      };

      recognitionRef.current = recognition;
    } catch (err: unknown) {
      console.error("Failed to initialize speech recognition:", err);
      setErrorMessage("Could not initialize microphone speech engine.");
      updateStatus("error");
    }
  }, [sendToAI, updateStatus]);

  // User manually interrupts AI speech (barge-in button or tap on orb)
  const interrupt = useCallback(() => {
    stopAssistantSpeech();
    setUserTranscript("");
    latestTranscriptRef.current = "";
    restartListening();
  }, [restartListening, stopAssistantSpeech]);

  // Stop voice call session
  const stopSession = useCallback(() => {
    updateStatus("idle");
    stopAssistantSpeech();

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      isRecognitionRunningRef.current = false;
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => { });
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  }, [stopAssistantSpeech, updateStatus]);

  // Start voice call session
  const startSession = useCallback(async () => {
    setErrorMessage(null);
    updateStatus("connecting");
    setUserTranscript("");
    setAssistantTranscript("");
    latestTranscriptRef.current = "";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const speechWindow = window as unknown as SpeechWindow;
      const AudioCtx = window.AudioContext || speechWindow.webkitAudioContext;
      if (!AudioCtx) throw new Error("AudioContext is not supported.");

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      initSpeechRecognition();

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          isRecognitionRunningRef.current = true;
        } catch {
          // Already running
        }
      }

      updateStatus("listening");
    } catch (err: unknown) {
      console.error("Microphone permission error:", err);
      setErrorMessage("Microphone access is required for real-time voice mode.");
      updateStatus("error");
    }
  }, [initSpeechRecognition, updateStatus]);

  // Toggle microphone mute
  const toggleMute = useCallback(() => {
    setIsMicMuted((prev) => {
      const next = !prev;
      isMicMutedRef.current = next;

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }

      if (next) {
        if (recognitionRef.current && isRecognitionRunningRef.current) {
          try {
            recognitionRef.current.stop();
            isRecognitionRunningRef.current = false;
          } catch {
            // Ignore
          }
        }
        updateStatus("muted");
      } else {
        restartListening();
      }

      return next;
    });
  }, [restartListening, updateStatus]);

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
