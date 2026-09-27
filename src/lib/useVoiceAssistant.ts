"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceAssistantStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "muted" | "error";

export interface VoiceMessageTurn {
  role: "user" | "assistant";
  content: string;
}

interface UseVoiceAssistantOptions {
  model: string;
  onTurnComplete?: (turn: VoiceMessageTurn) => void;
  initialConversation?: VoiceMessageTurn[];
}

interface SpeechRecognitionResultItem { transcript: string; }
interface SpeechRecognitionResult { isFinal: boolean; [index: number]: SpeechRecognitionResultItem; }
interface SpeechRecognitionEvent {
  results: { length: number; [index: number]: SpeechRecognitionResult };
}
interface SpeechRecognitionErrorEvent { error: string; }
interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
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

type SpeechQueueItem = { requestId: number; text: string };
type ResponseState = { id: number; content: string; streamComplete: boolean; cancelled: boolean; committed: boolean };

function cleanTextForSpeech(raw: string) {
  return raw.replace(/```[\s\S]*?```/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#`~>]/g, "").replace(/\s+/g, " ").trim();
}

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

export function useVoiceAssistant({ model, onTurnComplete, initialConversation = [] }: UseVoiceAssistantOptions) {
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
  const responseRef = useRef<ResponseState>({ id: 0, content: "", streamComplete: false, cancelled: false, committed: false });
  const speechQueueRef = useRef<SpeechQueueItem[]>([]);
  const isSpeakingQueueRef = useRef(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
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

  const stopRecognition = useCallback(() => {
    if (!recognitionRef.current || !isRecognitionRunningRef.current) return;
    try { recognitionRef.current.stop(); } catch { /* browser is already stopping */ }
    isRecognitionRunningRef.current = false;
  }, []);

  const finishAssistantTurn = useCallback((requestId: number) => {
    const response = responseRef.current;
    if (response.id !== requestId || response.cancelled || response.committed || !response.streamComplete) return;
    response.committed = true;
    const content = response.content.trim();
    if (content) {
      const turn: VoiceMessageTurn = { role: "assistant", content };
      conversationHistoryRef.current.push(turn);
      onTurnCompleteRef.current?.(turn);
    }
    restartListeningRef.current();
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
    utterance.rate = 1.05;
    activeUtteranceRef.current = utterance;
    const advance = () => {
      if (activeUtteranceRef.current === utterance) activeUtteranceRef.current = null;
      isSpeakingQueueRef.current = false;
      if (responseRef.current.id === next.requestId && !responseRef.current.cancelled) processSpeechQueueRef.current();
    };
    utterance.onend = advance;
    utterance.onerror = advance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [finishAssistantTurn, selectedVoice, stopRecognition, updateStatus]);

  const restartListening = useCallback(() => {
    if (!isMountedRef.current || !sessionActiveRef.current || isMicMutedRef.current || statusRef.current === "error") return;
    clearSilenceTimer();
    latestTranscriptRef.current = "";
    setUserTranscript("");
    updateStatus("listening");
    if (!recognitionRef.current || isRecognitionRunningRef.current) return;
    try {
      recognitionRef.current.start();
      isRecognitionRunningRef.current = true;
    } catch { /* the browser is transitioning from onend */ }
  }, [clearSilenceTimer, updateStatus]);

  const cancelCurrentResponse = useCallback(() => {
    requestIdRef.current += 1;
    responseRef.current.cancelled = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    speechQueueRef.current = [];
    isSpeakingQueueRef.current = false;
    activeUtteranceRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const enqueueSpeech = useCallback((requestId: number, text: string) => {
    const cleaned = cleanTextForSpeech(text);
    if (!cleaned || responseRef.current.cancelled || responseRef.current.id !== requestId) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    speechQueueRef.current.push({ requestId, text: cleaned });
    processSpeechQueueRef.current();
  }, []);

  const sendToAI = useCallback(async (spokenText: string) => {
    const text = spokenText.trim();
    if (!text || !sessionActiveRef.current || isMicMutedRef.current) return;
    clearSilenceTimer();
    stopRecognition();
    cancelCurrentResponse();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    responseRef.current = { id: requestId, content: "", streamComplete: false, cancelled: false, committed: false };
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
        body: JSON.stringify({ messages: conversationHistoryRef.current.slice(-12), model: modelRef.current, mode: "voice" }),
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
        const lastSpace = speechBuffer.length > 110 ? speechBuffer.lastIndexOf(" ") : -1;
        const splitAt = boundary ? boundary.index! + boundary[0].length : lastSpace > 45 ? lastSpace + 1 : force ? speechBuffer.length : -1;
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
        setAssistantTranscript(responseRef.current.content);
        flushSpeechBuffer();
        if (speechBuffer.length > 55 && speechQueueRef.current.length === 0 && !isSpeakingQueueRef.current) flushSpeechBuffer(true);
      }
      const finalChunk = decoder.decode();
      if (finalChunk) {
        responseRef.current.content += finalChunk;
        speechBuffer += finalChunk;
        setAssistantTranscript(responseRef.current.content);
      }
      flushSpeechBuffer(true);
      if (responseRef.current.id !== requestId || controller.signal.aborted) return;
      responseRef.current.streamComplete = true;
      abortControllerRef.current = null;
      if (speechQueueRef.current.length === 0 && !isSpeakingQueueRef.current) finishAssistantTurn(requestId);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (responseRef.current.id !== requestId || !sessionActiveRef.current) return;
      setErrorMessage(error instanceof Error ? error.message : "Unable to generate a voice response.");
      updateStatus("error");
    }
  }, [cancelCurrentResponse, clearSilenceTimer, enqueueSpeech, finishAssistantTurn, stopRecognition, updateStatus]);

  const createRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setErrorMessage("Live speech recognition is unavailable in this browser. Use Chrome or Edge over HTTPS.");
      updateStatus("error");
      return false;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { isRecognitionRunningRef.current = true; };
    recognition.onresult = (event) => {
      if (!sessionActiveRef.current || isMicMutedRef.current || statusRef.current !== "listening") return;
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
      silenceTimerRef.current = setTimeout(() => sendToAIRef.current(latestTranscriptRef.current), hasFinalResult ? 450 : 800);
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setErrorMessage("Microphone or speech-recognition permission was denied. Allow it in browser settings.");
        updateStatus("error");
      } else if (event.error === "network") {
        setErrorMessage("Speech recognition lost its connection. Check your internet connection and try again.");
        updateStatus("error");
      }
    };
    recognition.onend = () => {
      isRecognitionRunningRef.current = false;
      if (sessionActiveRef.current && statusRef.current === "listening" && !isMicMutedRef.current) {
        window.setTimeout(() => restartListeningRef.current(), 100);
      }
    };
    recognitionRef.current = recognition;
    return true;
  }, [clearSilenceTimer, updateStatus]);

  const stopSession = useCallback(() => {
    sessionGenerationRef.current += 1;
    sessionActiveRef.current = false;
    clearSilenceTimer();
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
  }, [cancelCurrentResponse, clearSilenceTimer, stopRecognition, updateStatus]);

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
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("This browser cannot access a microphone. Use a modern browser over HTTPS.");
      updateStatus("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (sessionGeneration !== sessionGenerationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const speechWindow = window as SpeechWindow;
      const AudioContextClass = window.AudioContext || speechWindow.webkitAudioContext;
      if (!AudioContextClass) throw new Error("Web Audio is not supported in this browser.");
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sessionActiveRef.current = true;
      if (audioContext.state === "suspended") await audioContext.resume();
      if (sessionGeneration !== sessionGenerationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        void audioContext.close().catch(() => undefined);
        return;
      }
      if (!createRecognition()) {
        stream.getTracks().forEach((track) => track.stop());
        void audioContext.close().catch(() => undefined);
        mediaStreamRef.current = null;
        audioContextRef.current = null;
        analyserRef.current = null;
        sessionActiveRef.current = false;
        return;
      }
      restartListeningRef.current();
    } catch (error: unknown) {
      if (sessionGeneration !== sessionGenerationRef.current) return;
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      analyserRef.current = null;
      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
      const name = error instanceof DOMException ? error.name : "";
      setErrorMessage(name === "NotAllowedError" ? "Microphone permission was denied. Allow microphone access and try again." : "Microphone access is required for live voice mode.");
      updateStatus("error");
      sessionActiveRef.current = false;
    }
  }, [createRecognition, stopSession, updateStatus]);

  const toggleMute = useCallback(() => {
    const next = !isMicMutedRef.current;
    isMicMutedRef.current = next;
    setIsMicMuted(next);
    mediaStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
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
    restartListeningRef.current();
  }, [cancelCurrentResponse]);

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
    try { localStorage.setItem("akshra_voice_name", voice.name); } catch { /* storage unavailable */ }
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
      const englishVoices = allVoices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
      const voices = englishVoices.length > 0 ? englishVoices : allVoices;
      const savedVoiceName = localStorage.getItem("akshra_voice_name");
      const preferred = voices.find((voice) => voice.name === savedVoiceName)
        || voices.find((voice) => /natural|neural|google|samantha|jenny|aria|daniel/i.test(voice.name)) || voices[0];
      setAvailableVoices(voices);
      setSelectedVoice((current) => current && voices.some((voice) => voice.name === current.name) ? current : preferred);
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
    onTurnCompleteRef.current = onTurnComplete;
    initialConversationRef.current = initialConversation;
    if (!sessionActiveRef.current) conversationHistoryRef.current = [...initialConversation];
  }, [initialConversation, model, onTurnComplete]);

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
        for (let index = 0; index < data.length; index += 1) data[index] = Math.max(12, Math.min(180, 70 + Math.sin(now + index * 0.3) * 55));
      } else data.fill(12);
      audioFrequenciesRef.current = data;
      visualizerFrameRef.current = requestAnimationFrame(renderVisualizer);
    };
    visualizerFrameRef.current = requestAnimationFrame(renderVisualizer);
    return () => { if (visualizerFrameRef.current) cancelAnimationFrame(visualizerFrameRef.current); };
  }, []);

  return { status, isMicMuted, userTranscript, assistantTranscript, errorMessage, audioFrequenciesRef, availableVoices, selectedVoice, setVoice, startSession, stopSession, toggleMute, interrupt };
}
