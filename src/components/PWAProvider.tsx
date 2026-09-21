"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { X, Share, PlusSquare, Download, CheckCircle2, Smartphone } from "lucide-react";
import { AkshraLogo } from "./icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PWAContextType {
  isInstalled: boolean;
  canInstall: boolean;
  isIOS: boolean;
  promptInstall: () => void;
}

const PWAContext = createContext<PWAContextType>({
  isInstalled: false,
  canInstall: false,
  isIOS: false,
  promptInstall: () => {},
});

export function usePWA() {
  return useContext(PWAContext);
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("Akshra Ai Service Worker registered:", reg.scope);
          })
          .catch((err) => {
            console.error("Service Worker registration failed:", err);
          });
      });
    }

    // 2. Check if already running in standalone display mode
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://");
      setIsInstalled(Boolean(isStandalone));

      // 3. Detect iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isAppleMobile = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isAppleMobile);
    }

    // 4. Capture native install prompt for Chrome/Edge/Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log("Akshra Ai was successfully installed!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Trigger Install Action
  const promptInstall = async () => {
    if (isInstalled) return;

    if (deferredPrompt) {
      // Chromium native prompt
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    } else if (isIOS) {
      // iOS Safari guide modal
      setShowIOSModal(true);
    } else {
      // Generic / desktop guidance
      setShowIOSModal(true);
    }
  };

  const canInstall = !isInstalled && (Boolean(deferredPrompt) || isIOS);

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        canInstall,
        isIOS,
        promptInstall,
      }}
    >
      {children}

      {/* iOS & Browser Install Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 select-none">
          <div className="fixed inset-0" onClick={() => setShowIOSModal(false)} />

          <div className="relative w-full max-w-sm bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl z-10 text-neutral-900 dark:text-neutral-100 animate-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center mb-3 shadow-md">
                <AkshraLogo className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold">Install Akshra Ai</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Install as a full screen app on your home screen for quick access.
              </p>
            </div>

            {/* Step-by-step instructions */}
            <div className="space-y-3 mb-6 text-xs text-neutral-700 dark:text-neutral-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
                <div className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-neutral-800 dark:text-neutral-100 shrink-0">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Tap the Share button</p>
                  <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1">
                    Tap <Share className="w-3.5 h-3.5 inline text-blue-500" /> in Safari&apos;s bottom bar
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
                <div className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-neutral-800 dark:text-neutral-100 shrink-0">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Scroll down and tap</p>
                  <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1">
                    Select <PlusSquare className="w-3.5 h-3.5 inline text-neutral-800 dark:text-neutral-200" />{" "}
                    <strong>Add to Home Screen</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
                <div className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-neutral-800 dark:text-neutral-100 shrink-0">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Tap &apos;Add&apos; in the top-right</p>
                  <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Akshra Ai will appear on your phone home screen!
                  </p>
                </div>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold text-xs hover:opacity-90 transition cursor-pointer text-center shadow-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  );
}
