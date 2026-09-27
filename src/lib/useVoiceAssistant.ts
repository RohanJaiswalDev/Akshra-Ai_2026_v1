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
function cleanTextForSpeech(raw: string) {
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

// Unlocks AudioContext and SpeechSynthesis on mobile direct user interaction
export function unlockAudioAndSpeech() {
  if (typeof window === "undefined") return;

  try {
    const speechWindow = window as SpeechWindow;
    const AudioContextClass = window.AudioContext || speechWindow.webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
  } catch {
    // Ignore
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
  const audioFrequenciesRef = useRef<Uint8Array>(new Uint8Array(64));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const visualizerFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const isRecognitionRunningRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const sessionGenerationRef = useRef(0);
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
    // Give mobile speaker a 150ms quiet window so the microphone doesn't catch trailing echo
    setTimeout(() => {
      restartListeningRef.current();
    }, 150);
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

    // Anchor on window to protect against mobile engine garbage collection bug
    (window as unknown as SpeechWindow).__activeUtterance = utterance;

    const advance = () => {
      clearWatchdog();
      if (activeUtteranceRef.current === utterance) activeUtteranceRef.current = null;
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
        console.warn("[VoiceAssistant] Speech utterance timed out on mobile device, advancing queue.");
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

        const flushSpeechBuffer = (force = false) => {
          const boundary = speechBuffer.match(/[.!?;:]+(?:\s|$)|\n+/);
          const lastSpace = speechBuffer.length > 90 ? speechBuffer.lastIndexOf(" ") : -1;
          const splitAt = boundary
            ? boundary.index! + boundary[0].length
            : lastSpace > 35
              ? lastSpace + 1
              : force
                ? speechBuffer.length
                : -1;

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
            speechBuffer.length > 45 &&
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

    // Critical fix for iOS / WebKit and Mobile Android:
    // Continuous = true causes mobile WebKit to immediately terminate with aborted or no-speech.
    // Setting continuous = false on mobile ensures reliable recognition turns!
    recognition.continuous = !isMobile;
    recognition.interimResults = true;
    recognition.lang = languageRef.current || navigator.language || "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isRecognitionRunningRef.current = true;
    };

    recognition.onresult = (event) => {
      if (!sessionActiveRef.current || isMicMutedRef.current || statusRef.current !== "listening") {
        return;
      }
      let transcript = "";
      let hasFinalResult = false;
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
        hasFinalResult ||= event.results[index].isFinal;
      }
      transcript = transcript.trim();
      if (!transcript) return;

      latestTranscriptRef.current = transcript;
      setUserTranscript(transcript);
      clearSilenceTimer();

      // Slightly faster response timer on mobile touch devices
      const silenceDelay = hasFinalResult ? (isMobile ? 350 : 450) : (isMobile ? 700 : 800);
      silenceTimerRef.current = setTimeout(
        () => sendToAIRef.current(latestTranscriptRef.current),
        silenceDelay
      );
    };

    recognition.onerror = (event) => {
      // no-speech or aborted is very frequent on mobile when the user pauses
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
        // Auto-recover from transient network hiccups on mobile devices
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
  }, [clearSilenceTimer, updateStatus]);

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
    analyserRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
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

    // On mobile devices, opening a getUserMedia stream concurrently often locks the hardware mic
    // exclusively away from webkitSpeechRecognition. We try getUserMedia gracefully; if on mobile or if it fails,
    // we continue straight to SpeechRecognition so the user's voice always works!
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

    // Initialize Web Audio Context if available
    try {
      const speechWindow = window as SpeechWindow;
      const AudioContextClass = window.AudioContext || speechWindow.webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        if (stream) {
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 128;
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);
          analyserRef.current = analyser;
          mediaStreamRef.current = stream;
        }
        audioContextRef.current = audioContext;
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
      }
    } catch {
      // AudioContext fallback
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

  const interrupt = useCallback(() => {
    cancelCurrentResponse();
    setAssistantTranscript("");
    unlockAudioAndSpeech();
    restartListeningRef.current();
  }, [cancelCurrentResponse]);

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

  // Dynamic visualizer frequencies
  useEffect(() => {
    const renderVisualizer = () => {
      const data = new Uint8Array(64);
      if (analyserRef.current && statusRef.current === "listening" && !isMicMutedRef.current) {
        const source = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(source);
        const step = Math.max(1, Math.floor(source.length / data.length));
        for (let index = 0; index < data.length; index += 1) data[index] = source[index * step] || 0;
      } else if (statusRef.current === "speaking" || statusRef.current === "thinking") {
        const now = performance.now() * (statusRef.current === "speaking" ? 0.007 : 0.004);
        for (let index = 0; index < data.length; index += 1) {
          data[index] = Math.max(12, Math.min(180, 70 + Math.sin(now + index * 0.3) * 55));
        }
      } else if (statusRef.current === "listening") {
        // Natural subtle resting breathe animation when listening on mobile
        const now = performance.now() * 0.003;
        for (let index = 0; index < data.length; index += 1) {
          data[index] = Math.max(12, Math.min(60, 24 + Math.sin(now + index * 0.25) * 16));
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
