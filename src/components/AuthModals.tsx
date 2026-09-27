"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowLeft, Loader2, CheckCircle2, AlertCircle, User as UserIcon, Mail } from "lucide-react";
import { AkshraLogo } from "./icons";
import "react-phone-number-input/style.css";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  mode: "login" | "signup";
  onClose: () => void;
  onSwitchMode: (mode: "login" | "signup") => void;
  onAuthSuccess: (user: AuthUser) => void;
}

export function AuthModal({
  isOpen,
  mode,
  onClose,
  onSwitchMode,
  onAuthSuccess,
}: AuthModalProps) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState<string | undefined>("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Reset modal state on open/close
  useEffect(() => {
    if (!isOpen) return;
    const resetTimer = window.setTimeout(() => {
      setStep("email");
      setOtp("");
      setError(null);
      setInfoMessage(null);
      setResendCountdown(0);
    }, 0);
    return () => window.clearTimeout(resetTimer);
  }, [isOpen]);

  // Countdown timer for resending OTP
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const interval = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCountdown]);

  if (!isOpen) return null;

  // Step 1: Validate input & Send OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (mode === "signup") {
      if (!firstName.trim()) {
        setError("Please enter your first name.");
        return;
      }
      if (!lastName.trim()) {
        setError("Please enter your last name.");
        return;
      }
      if (!mobileNumber || !mobileNumber.trim()) {
        setError("Please enter your mobile number.");
        return;
      }
      if (!isValidPhoneNumber(mobileNumber)) {
        setError("Please enter a valid mobile number for the selected country.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          type: mode,
          name: mode === "signup" ? `${firstName.trim()} ${lastName.trim()}`.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send verification code.");
      }

      setStep("otp");
      setResendCountdown(60);
      setInfoMessage(
        data.devOtp
          ? `Dev Mode: Code is ${data.devOtp} (Check terminal/console).`
          : `Verification code sent to ${trimmedEmail}`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, string> = {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      };

      if (mode === "signup") {
        payload.firstName = firstName.trim();
        payload.lastName = lastName.trim();
        payload.mobileNumber = mobileNumber?.trim() || "";
      }

      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid verification code.");
      }

      onAuthSuccess(data.user);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchMode = (newMode: "login" | "signup") => {
    setError(null);
    setInfoMessage(null);
    setStep("email");
    setOtp("");
    onSwitchMode(newMode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 select-none overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-[440px] max-h-[92vh] overflow-y-auto bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-8 shadow-2xl z-10 text-neutral-900 dark:text-neutral-100 animate-in zoom-in-95 duration-150">
        {/* Top bar buttons */}
        <div className="flex items-center justify-between mb-4">
          {step === "otp" ? (
            <button
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              className="p-1.5 -ml-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-1 text-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center mb-3 shadow-sm">
            <AkshraLogo className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            {step === "email"
              ? mode === "login"
                ? "Welcome back"
                : "Create your account"
              : "Enter verification code"}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-[300px]">
            {step === "email"
              ? mode === "login"
                ? "Sign in to Akshra Ai with your registered email."
                : "Register with your name, mobile, and email to get started."
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {/* Error / Alert banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Info banner */}
        {infoMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{infoMessage}</span>
          </div>
        )}

        {/* STEP 1: Enter Registration Details or Login Email */}
        {step === "email" && (
          <form onSubmit={handleSendOtp} className="space-y-3.5">
            {mode === "signup" ? (
              <>
                {/* First Name & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        autoFocus
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#282828] text-neutral-900 dark:text-white placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
                      />
                      <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#282828] text-neutral-900 dark:text-white placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
                      />
                      <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Mobile Number with Country Code (react-phone-number-input) */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="akshra-phone-container">
                    <PhoneInput
                      international
                      defaultCountry="IN"
                      value={mobileNumber}
                      onChange={setMobileNumber}
                      placeholder="Select country and enter number"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      inputMode="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#282828] text-neutral-900 dark:text-white placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
                    />
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </>
            ) : (
              /* Login Mode: Just Email Address */
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    inputMode="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#282828] text-neutral-900 dark:text-white placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
                  />
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs mt-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {mode === "signup" ? "Verify Email & Register" : "Continue with Email"}
              </span>
            </button>

            <div className="text-center pt-2 text-xs text-neutral-500 dark:text-neutral-400">
              {mode === "login" ? (
                <p>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => handleSwitchMode("signup")}
                    className="text-neutral-900 dark:text-white font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer"
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => handleSwitchMode("login")}
                    className="text-neutral-900 dark:text-white font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer"
                  >
                    Log in
                  </button>
                </p>
              )}
            </div>
          </form>
        )}

        {/* STEP 2: Enter 6-digit OTP */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 text-center">
                6-digit verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                autoFocus
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className="w-full px-3 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#282828] text-neutral-900 dark:text-white placeholder-neutral-400 text-center tracking-[6px] sm:tracking-[8px] font-mono text-lg sm:text-xl font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-2.5 px-4 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{mode === "signup" ? "Complete Registration" : "Verify & Sign In"}</span>
            </button>

            {/* Resend OTP button */}
            <div className="text-center pt-2 text-xs text-neutral-500 dark:text-neutral-400">
              {resendCountdown > 0 ? (
                <p>Resend code in {resendCountdown}s</p>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-neutral-900 dark:text-white font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer"
                >
                  Resend verification code
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
