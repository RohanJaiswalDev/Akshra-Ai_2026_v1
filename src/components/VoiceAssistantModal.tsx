"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Sparkles,
  ChevronDown,
  AlertCircle,
  Radio,
  Square,
} from "lucide-react";
import {
  useVoiceAssistant,
  type VoiceMessageTurn,
  type VoiceAssistantStatus,
} from "@/lib/useVoiceAssistant";

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: string;
  personality?: "natural" | "professional" | "friendly" | "teacher" | "developer";
  speechRate?: number;
  language?: string;
  onNewMessageTurn?: (turn: VoiceMessageTurn) => void;
  conversationHistory?: VoiceMessageTurn[];
}

export function VoiceAssistantModal({
  isOpen,
  onClose,
  model,
  personality = "natural",
  speechRate = 1.05,
  language = "en-US",
  onNewMessageTurn,
  conversationHistory = [],
}: VoiceAssistantModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isVoicePickerOpen, setIsVoicePickerOpen] = useState(false);
  const voicePickerRef = useRef<HTMLDivElement | null>(null);

  const {
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
  } = useVoiceAssistant({
    model,
    personality,
    speechRate,
    language,
    onTurnComplete: onNewMessageTurn,
    initialConversation: conversationHistory,
  });

  // Start voice call session when modal opens, stop when closed
  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      stopSession();
    }
  }, [isOpen, startSession, stopSession]);

  // Close voice picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        voicePickerRef.current &&
        !voicePickerRef.current.contains(e.target as Node)
      ) {
        setIsVoicePickerOpen(false);
      }
    };
    if (isVoicePickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isVoicePickerOpen]);

  // 🌟 60 FPS Fluid Dynamic Soundwave Orb Canvas Renderer
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      // High-DPI Canvas resolution handling
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Base radius responsive to viewport
      const baseRadius = Math.min(width, height) * 0.22;

      // Average energy from frequencies
      const frequencies = audioFrequenciesRef.current;
      let totalEnergy = 0;
      for (let i = 0; i < frequencies.length; i++) {
        totalEnergy += frequencies[i];
      }
      const avgEnergy = totalEnergy / frequencies.length; // 0 to 255
      const normalizedEnergy = Math.min(1.8, Math.max(0.1, avgEnergy / 45));

      phase += 0.035;

      // Draw multi-layered organic fluid soundwave orb
      const layers = [
        {
          radiusMult: 1.35,
          opacity: 0.12,
          speedMult: 0.7,
          colorStart: "rgba(56, 189, 248, 0.4)", // Sky blue
          colorEnd: "rgba(168, 85, 247, 0.1)", // Purple
        },
        {
          radiusMult: 1.15,
          opacity: 0.22,
          speedMult: 1.2,
          colorStart: "rgba(99, 102, 241, 0.6)", // Indigo
          colorEnd: "rgba(236, 72, 153, 0.2)", // Pink
        },
        {
          radiusMult: 1.0,
          opacity: 0.7,
          speedMult: 1.0,
          colorStart:
            status === "speaking"
              ? "rgba(147, 51, 234, 0.9)" // Vibrant violet
              : status === "thinking"
                ? "rgba(234, 179, 8, 0.9)" // Amber
                : status === "muted"
                  ? "rgba(239, 68, 68, 0.8)" // Red
                  : "rgba(14, 165, 233, 0.9)", // Cyan / Blue for listening
          colorEnd:
            status === "speaking"
              ? "rgba(236, 72, 153, 0.8)"
              : status === "thinking"
                ? "rgba(249, 115, 22, 0.8)"
                : "rgba(99, 102, 241, 0.8)",
        },
      ];

      layers.forEach((layer, layerIdx) => {
        ctx.beginPath();
        const numPoints = 64;
        const currentRadius = baseRadius * layer.radiusMult * (0.9 + normalizedEnergy * 0.2);

        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          const freqIndex = i % frequencies.length;
          const freqValue = (frequencies[freqIndex] || 0) / 255;

          // Organic harmonic distortion
          const wave1 = Math.sin(angle * 4 + phase * layer.speedMult + layerIdx);
          const wave2 = Math.cos(angle * 6 - phase * 0.8 + layerIdx);
          const offset =
            (wave1 * 12 + wave2 * 8) * normalizedEnergy +
            freqValue * 28 * (status === "speaking" || status === "listening" ? 1.2 : 0.4);

          const r = currentRadius + offset;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        // Create radiant luminous gradient fill
        const gradient = ctx.createRadialGradient(
          centerX - currentRadius * 0.3,
          centerY - currentRadius * 0.3,
          currentRadius * 0.1,
          centerX,
          centerY,
          currentRadius * 1.3
        );
        gradient.addColorStop(0, layer.colorStart);
        gradient.addColorStop(1, layer.colorEnd);

        ctx.fillStyle = gradient;
        ctx.shadowColor = layer.colorStart;
        ctx.shadowBlur = layerIdx === 2 ? 30 * normalizedEnergy : 15;
        ctx.fill();
      });

      // Central core celestial highlight
      ctx.beginPath();
      const coreRadius = baseRadius * 0.45 * (0.85 + normalizedEnergy * 0.25);
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      const coreGradient = ctx.createRadialGradient(
        centerX - coreRadius * 0.4,
        centerY - coreRadius * 0.4,
        0,
        centerX,
        centerY,
        coreRadius
      );
      coreGradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      coreGradient.addColorStop(0.5, "rgba(224, 231, 255, 0.4)");
      coreGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = coreGradient;
      ctx.shadowBlur = 0;
      ctx.fill();

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen, status, audioFrequenciesRef]);

  if (!isOpen) return null;

  const getStatusBadge = (currentStatus: VoiceAssistantStatus) => {
    switch (currentStatus) {
      case "listening":
        return {
          label: "Listening...",
          style: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          icon: <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />,
        };
      case "thinking":
        return {
          label: "Thinking...",
          style: "bg-amber-500/20 text-amber-400 border-amber-500/30",
          icon: <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />,
        };
      case "speaking":
        return {
          label: "Akshra is speaking...",
          style: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
          icon: <Volume2 className="w-3.5 h-3.5 animate-bounce text-indigo-400" />,
        };
      case "muted":
        return {
          label: "Microphone Muted",
          style: "bg-red-500/20 text-red-400 border-red-500/30",
          icon: <MicOff className="w-3.5 h-3.5 text-red-400" />,
        };
      case "connecting":
        return {
          label: "Connecting...",
          style: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          icon: <Sparkles className="w-3.5 h-3.5 animate-pulse text-blue-400" />,
        };
      case "error":
        return {
          label: "Error",
          style: "bg-red-500/20 text-red-400 border-red-500/30",
          icon: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
        };
      default:
        return {
          label: "Ready",
          style: "bg-neutral-800 text-neutral-300 border-neutral-700",
          icon: <Radio className="w-3.5 h-3.5 text-neutral-400" />,
        };
    }
  };

  const badge = getStatusBadge(status);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black/92 backdrop-blur-2xl text-white select-none transition-all duration-300">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-linear-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              Akshra Voice Mode
              <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Live
              </span>
            </h2>
            <p className="text-xs text-neutral-400">Live streamed conversation</p>
          </div>
        </div>

        {/* Dynamic Status Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium backdrop-blur-md transition-all ${badge.style}`}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Main Center Stage: Fluid 60FPS Canvas Soundwave Orb */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-0 px-4">
        {/* Subtle Ambient Aurora Light in Background */}
        <div className="absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-linear-to-br from-indigo-600/20 via-cyan-500/10 to-transparent blur-3xl pointer-events-none" />

        <div className="w-full max-w-lg aspect-square max-h-[380px] sm:max-h-[440px] flex items-center justify-center relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain cursor-pointer"
            onClick={status === "speaking" ? interrupt : toggleMute}
            title={
              status === "speaking"
                ? "Tap to interrupt"
                : isMicMuted
                  ? "Click to unmute"
                  : "Click to mute"
            }
          />
        </div>

        {/* Tap to Interrupt Button when AI is speaking */}
        {status === "speaking" && (
          <button
            type="button"
            onClick={interrupt}
            className="mt-1 mb-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs text-neutral-200 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm animate-pulse"
            title="Interrupt AI and speak"
          >
            <Square className="w-2.5 h-2.5 fill-current" />
            <span>Tap to interrupt</span>
          </button>
        )}

        {/* Live Subtitles / Transcription Feed */}
        <div className="w-full max-w-xl mx-auto px-4 text-center mt-2 min-h-[70px] flex flex-col items-center justify-center">
          {errorMessage ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 px-4 py-2 rounded-xl">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => void startSession()}
                className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/20"
              >
                Try again
              </button>
            </div>
          ) : status === "speaking" && assistantTranscript ? (
            <p className="text-sm sm:text-base text-neutral-200 font-medium line-clamp-3 leading-relaxed animate-in fade-in duration-200">
              &ldquo;{assistantTranscript}&rdquo;
            </p>
          ) : userTranscript ? (
            <p className="text-sm sm:text-base text-cyan-300 font-medium line-clamp-2 leading-relaxed animate-in fade-in duration-200">
              &ldquo;{userTranscript}&rdquo;
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-neutral-400 italic">
              Speak naturally. You can interrupt Akshra anytime while she talks.
            </p>
          )}
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="w-full max-w-xl mx-auto px-4 py-6 sm:py-8 flex flex-col items-center gap-4">
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          {/* Voice Selector Picker */}
          <div className="relative" ref={voicePickerRef}>
            <button
              type="button"
              onClick={() => setIsVoicePickerOpen(!isVoicePickerOpen)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 text-xs sm:text-sm text-neutral-300 transition-all active:scale-95 cursor-pointer shadow-md"
              title="Change Voice"
            >
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span className="max-w-[110px] sm:max-w-[140px] truncate">
                {selectedVoice ? selectedVoice.name.split(" ")[0] : "Default Voice"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {isVoicePickerOpen && availableVoices.length > 0 && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 max-h-56 overflow-y-auto bg-neutral-900 border border-white/10 rounded-2xl p-1.5 shadow-2xl z-50 text-left">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 border-b border-white/10">
                  Select Natural Voice
                </div>
                {availableVoices.slice(0, 8).map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => {
                      setVoice(v);
                      setIsVoicePickerOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${selectedVoice?.name === v.name
                      ? "bg-cyan-500/20 text-cyan-300 font-medium"
                      : "text-neutral-300 hover:bg-white/5"
                      }`}
                  >
                    <span className="truncate">{v.name}</span>
                    <span className="text-[10px] text-neutral-500 shrink-0 ml-1">
                      {v.lang}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mute / Unmute Button */}
          <button
            type="button"
            onClick={toggleMute}
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg active:scale-90 ${isMicMuted
              ? "bg-red-500 text-white shadow-red-500/30 hover:bg-red-600"
              : "bg-white/10 text-white border border-white/15 hover:bg-white/20"
              }`}
            title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
            aria-label="Mute or Unmute"
          >
            {isMicMuted ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6 text-cyan-300" />
            )}
          </button>

          {/* End Call / Close Button (Distinct Red Circle like ChatGPT Voice) */}
          <button
            type="button"
            onClick={onClose}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg shadow-red-600/30 active:scale-90"
            title="End Voice Conversation"
            aria-label="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

        <p className="text-[11px] text-neutral-500 text-center">
          Tap the red phone button to exit voice mode. All turns are saved to chat.
        </p>
      </div>
    </div>
  );
}
