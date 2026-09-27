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

  // Audio frequency data for 60 FPS visualizer orb (values 0 - 255)
  const audioFrequenciesRef = useRef<Uint8Array>(new Uint8Array(64));

  // AudioContext & Analyser refs for real microphone capture
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const rafVisualizerRef = useRef<number | null>(null);

  // Speech Recognition & Synthesis refs
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const isRecognitionActiveRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingQueueRef = useRef(false);
  const conversationHistoryRef = useRef<VoiceMessageTurn[]>(initialConversation);
  const isMountedRef = useRef(true);
  const isMutedRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentAssistantFullResponseRef = useRef("");

  // Function reference holders to avoid circular hoisting issues
  const stopSessionRef = useRef<() => void>(() => {});
  const processSpeechQueueRef = useRef<() => void>(() => {});

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
        // Prioritize English high-quality neural/natural voices
        const englishVoices = voices.filter(
          (v) => v.lang.startsWith("en") || v.lang.includes("en-")
        );
        const naturalOrNeural = englishVoices.filter(
          (v) =>
            v.name.includes("Natural") ||
            v.name.includes("Neural") ||
            v.name.includes("Google") ||
            v.name.includes("Samantha") ||
            v.name.includes("Daniel") ||
            v.name.includes("Ava")
        );

        const listToUse = englishVoices.length > 0 ? englishVoices : voices;
        setAvailableVoices(listToUse);

        // Retrieve preferred voice or pick the most human-sounding default
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
      stopSessionRef.current();
    };
  }, []);

  // Update selected voice
  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
    try {
      localStorage.setItem("akshra_voice_name", voice.name);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Visualizer loop for real-time audio analysis
  const startVisualizer = useCallback(() => {
    const updateFrequencies = () => {
      if (!isMountedRef.current) return;

      if (analyserRef.current && status === "listening" && !isMutedRef.current) {
        // Real microphone data
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Downsample to 64 points
        const step = Math.floor(dataArray.length / 64) || 1;
        const sampled = new Uint8Array(64);
        for (let i = 0; i < 64; i++) {
          sampled[i] = dataArray[i * step] || 0;
        }
        audioFrequenciesRef.current = sampled;
      } else if (status === "speaking") {
        // Dynamic organic frequencies for AI speaking wave
        const now = performance.now() * 0.005;
        const sampled = new Uint8Array(64);
        for (let i = 0; i < 64; i++) {
          const wave =
            Math.sin(now + i * 0.2) * 50 +
            Math.sin(now * 1.5 + i * 0.1) * 35 +
            Math.cos(now * 0.7 - i * 0.3) * 30 +
            80;
          sampled[i] = Math.max(10, Math.min(255, Math.floor(wave)));
        }
        audioFrequenciesRef.current = sampled;
      } else if (status === "thinking") {
        // Subtle ambient breathing pulse
        const now = performance.now() * 0.003;
        const sampled = new Uint8Array(64);
        for (let i = 0; i < 64; i++) {
          sampled[i] = Math.floor(Math.sin(now + i * 0.1) * 20 + 35);
        }
        audioFrequenciesRef.current = sampled;
      } else {
        // Resting ambient state
        audioFrequenciesRef.current = new Uint8Array(64).fill(12);
      }

      rafVisualizerRef.current = requestAnimationFrame(updateFrequencies);
    };

    if (rafVisualizerRef.current) {
      cancelAnimationFrame(rafVisualizerRef.current);
    }
    rafVisualizerRef.current = requestAnimationFrame(updateFrequencies);
  }, [status]);

  useEffect(() => {
    startVisualizer();
    return () => {
      if (rafVisualizerRef.current) {
        cancelAnimationFrame(rafVisualizerRef.current);
      }
    };
  }, [startVisualizer]);

  // Clean raw markdown so TTS speaks naturally
  const cleanTextForSpeech = (raw: string): string => {
    return raw
      .replace(/[*_#`~>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/```[\s\S]*?```/g, "Code snippet.")
      .replace(/\n+/g, " ")
      .trim();
  };

  // Stop current AI speech & clear queue (used for Barge-in / Interruption)
  const stopAssistantSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    speechQueueRef.current = [];
    isSpeakingQueueRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Process sentence queue sequentially with zero gaps
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
      processSpeechQueueRef.current();
      return;
    }

    isSpeakingQueueRef.current = true;
    setStatus("speaking");

    const utterance = new SpeechSynthesisUtterance(nextSentence.trim());
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = 1.05; // Slightly brisk, natural conversational tempo
    utterance.pitch = 1.0;

    utterance.onend = () => {
      isSpeakingQueueRef.current = false;
      if (speechQueueRef.current.length > 0) {
        processSpeechQueueRef.current();
      } else {
        // Finished speaking entire response
        if (currentAssistantFullResponseRef.current) {
          const fullTurn: VoiceMessageTurn = {
            role: "assistant",
            content: currentAssistantFullResponseRef.current,
          };
          conversationHistoryRef.current.push(fullTurn);
          onTurnComplete?.(fullTurn);
          currentAssistantFullResponseRef.current = "";
        }
        setStatus("listening");
      }
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis notice:", e);
      isSpeakingQueueRef.current = false;
      if (speechQueueRef.current.length > 0) {
        processSpeechQueueRef.current();
      } else {
        setStatus("listening");
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [selectedVoice, onTurnComplete]);

  useEffect(() => {
    processSpeechQueueRef.current = processSpeechQueue;
  }, [processSpeechQueue]);

  // Send user message to OpenRouter via streaming /api/chat with mode: "voice"
  const sendToAI = useCallback(
    async (spokenText: string) => {
      if (!spokenText.trim()) return;

      const userTurn: VoiceMessageTurn = { role: "user", content: spokenText };
      conversationHistoryRef.current.push(userTurn);
      onTurnComplete?.(userTurn);

      setStatus("thinking");
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

        const sentenceBoundaryRegex = /([.?!;:]+[\s\n]+|[\n]{2,})/;

        while (true) {
          if (controller.signal.aborted) break;

          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          sentenceBuffer += chunk;
          accumulatedFull += chunk;
          currentAssistantFullResponseRef.current = accumulatedFull;
          setAssistantTranscript(accumulatedFull);

          // Pipelined sentence extraction: queue first sentence immediately
          let match: RegExpExecArray | null;
          while ((match = sentenceBoundaryRegex.exec(sentenceBuffer)) !== null) {
            const splitIdx = match.index + match[0].length;
            const completeSentence = sentenceBuffer.substring(0, splitIdx);
            sentenceBuffer = sentenceBuffer.substring(splitIdx);

            const cleaned = cleanTextForSpeech(completeSentence);
            if (cleaned.length > 2) {
              speechQueueRef.current.push(cleaned);
              processSpeechQueueRef.current();
            }
          }
        }

        if (sentenceBuffer.trim()) {
          const cleaned = cleanTextForSpeech(sentenceBuffer);
          if (cleaned.length > 1) {
            speechQueueRef.current.push(cleaned);
            processSpeechQueueRef.current();
          }
        }

        abortControllerRef.current = null;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Intentionally aborted due to user interruption (barge-in)
        }
        console.error("Voice AI error:", err);
        const message = err instanceof Error ? err.message : "Failed to generate speech response.";
        setErrorMessage(message);
        setStatus("error");
      }
    },
    [model, onTurnComplete, stopAssistantSpeech]
  );

  // Initialize and start Speech Recognition
  const initSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return;

    const speechWindow = window as unknown as SpeechWindow;
    const SpeechRecognitionClass =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setErrorMessage(
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      setStatus("error");
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isRecognitionActiveRef.current = true;
        if (status !== "speaking" && status !== "thinking") {
          setStatus("listening");
        }
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (isMutedRef.current) return;

        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcriptChunk;
          } else {
            interim += transcriptChunk;
          }
        }

        const currentSaid = (final || interim).trim();

        // Native Barge-In (Interruption):
        if (
          (isSpeakingQueueRef.current || status === "speaking" || status === "thinking") &&
          currentSaid.length > 2
        ) {
          stopAssistantSpeech();
          setStatus("listening");
        }

        if (interim) {
          setUserTranscript(interim);
        }

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        if (final && final.trim().length > 1) {
          setUserTranscript(final.trim());
          sendToAI(final.trim());
        } else if (interim.trim().length > 3) {
          silenceTimerRef.current = setTimeout(() => {
            if (userTranscript.trim().length > 1) {
              const textToSend = userTranscript.trim();
              setUserTranscript(textToSend);
              sendToAI(textToSend);
            }
          }, 950);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "no-speech" || event.error === "aborted") {
          return;
        }
        console.warn("Speech recognition notice:", event.error);
        if (event.error === "not-allowed") {
          setErrorMessage("Microphone access was denied. Please allow microphone permission.");
          setStatus("error");
        }
      };

      recognition.onend = () => {
        isRecognitionActiveRef.current = false;
        if (isMountedRef.current && status !== "idle" && status !== "error") {
          try {
            recognition.start();
          } catch {
            // Already active or restarting
          }
        }
      };

      recognitionRef.current = recognition;
    } catch (err: unknown) {
      console.error("Failed to initialize speech recognition:", err);
      setErrorMessage("Could not initialize microphone speech engine.");
      setStatus("error");
    }
  }, [sendToAI, status, stopAssistantSpeech, userTranscript]);

  // Stop voice call session
  const stopSession = useCallback(() => {
    setStatus("idle");
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
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  }, [stopAssistantSpeech]);

  useEffect(() => {
    stopSessionRef.current = stopSession;
  }, [stopSession]);

  // Start voice call session
  const startSession = useCallback(async () => {
    setErrorMessage(null);
    setStatus("connecting");
    setUserTranscript("");
    setAssistantTranscript("");

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
        } catch {
          // Already running
        }
      }

      setStatus("listening");
    } catch (err: unknown) {
      console.error("Microphone permission error:", err);
      setErrorMessage("Microphone access is required for real-time voice mode.");
      setStatus("error");
    }
  }, [initSpeechRecognition]);

  // Toggle microphone mute
  const toggleMute = useCallback(() => {
    setIsMicMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }

      if (next) {
        if (status === "listening") setStatus("muted");
      } else {
        if (status === "muted") setStatus("listening");
      }

      return next;
    });
  }, [status]);

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
  };
}
