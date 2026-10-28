"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Calendar,
  MapPin,
  Loader2,
  CheckCircle2,
  User,
  Phone,
  Mail,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  X,
} from "lucide-react";
import SpinWheelView from "@/components/SpinWheelView";

interface UserRegistration {
  name: string;
  whatsapp: string;
  email: string;
  userId?: string;
}

function RetroSparkle({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="#F7D046"
      stroke="#382F2D"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2C12.8 7.5 16.5 11.2 22 12C16.5 12.8 12.8 16.5 12 22C11.2 16.5 7.5 12.8 2 12C7.5 11.2 11.2 7.5 12 2Z" />
    </svg>
  );
}

export default function HomePage() {
  // Mobile uses 3 clean in-place steps ("landing" -> "register" -> "spin")
  // Desktop shows "landing" + "register" side-by-side, then transitions to "spin"
  const [step, setStep] = useState<"landing" | "register" | "spin">("landing");

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Real-time verification states
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const phoneDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const emailDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [errors, setErrors] = useState<{
    name?: string;
    whatsapp?: string;
    email?: string;
    terms?: string;
    general?: string;
  }>({});

  const [registeredUser, setRegisteredUser] = useState<UserRegistration | null>(
    null
  );

  // Real-time WhatsApp check (debounce 450ms)
  useEffect(() => {
    const cleaned = whatsapp.replace(/\D/g, "");
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);

    if (cleaned.length < 9) {
      setPhoneVerified(false);
      setIsCheckingPhone(false);
      return;
    }

    setIsCheckingPhone(true);
    setPhoneVerified(false);

    phoneDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/check-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "whatsapp", value: cleaned }),
        });
        const data = await res.json();
        if (data.exists) {
          setErrors((prev) => ({
            ...prev,
            whatsapp:
              data.message || "This WhatsApp number is already registered.",
          }));
          setPhoneVerified(false);
        } else {
          setErrors((prev) => {
            const next = { ...prev };
            delete next.whatsapp;
            return next;
          });
          setPhoneVerified(true);
        }
      } catch (err) {
        console.error("Failed to check phone", err);
      } finally {
        setIsCheckingPhone(false);
      }
    }, 450);

    return () => {
      if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    };
  }, [whatsapp]);

  // Real-time Email check (debounce 450ms)
  useEffect(() => {
    const trimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);

    if (!trimmed || !emailRegex.test(trimmed)) {
      setEmailVerified(false);
      setIsCheckingEmail(false);
      return;
    }

    setIsCheckingEmail(true);
    setEmailVerified(false);

    emailDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/check-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "email", value: trimmed }),
        });
        const data = await res.json();
        if (data.exists) {
          setErrors((prev) => ({
            ...prev,
            email: data.message || "This Email address is already registered.",
          }));
          setEmailVerified(false);
        } else {
          setErrors((prev) => {
            const next = { ...prev };
            delete next.email;
            return next;
          });
          setEmailVerified(true);
        }
      } catch (err) {
        console.error("Failed to check email", err);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 450);

    return () => {
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    };
  }, [email]);

  const validateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: {
      name?: string;
      whatsapp?: string;
      email?: string;
      terms?: string;
      general?: string;
    } = {};

    if (name.trim().length < 2) {
      newErrors.name = "Please enter your full name.";
    }

    const cleanedPhone = whatsapp.replace(/\D/g, "");
    if (cleanedPhone.length < 9 || cleanedPhone.length > 15) {
      newErrors.whatsapp = "Please enter a valid WhatsApp number.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!agreedToTerms) {
      newErrors.terms = "Harap setujui Syarat & Ketentuan serta Kebijakan Privasi.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsLoading(true);
      setErrors({});

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name.trim(),
          whatsapp: cleanedPhone,
          email: email.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({
          general: data.error || "Registration failed. Please try again.",
        });
        setIsLoading(false);
        return;
      }

      setRegisteredUser({
        name: name.trim(),
        whatsapp: cleanedPhone,
        email: email.trim(),
        userId: data.userId,
      });

      setStep("spin");
    } catch (err) {
      console.error(err);
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    name.trim().length >= 2 &&
    phoneVerified &&
    emailVerified &&
    agreedToTerms &&
    !isCheckingPhone &&
    !isCheckingEmail &&
    !errors.name &&
    !errors.whatsapp &&
    !errors.email &&
    !errors.terms;

  const renderRegistrationForm = (buttonText: string) => (
    <form onSubmit={validateAndSubmit} noValidate className="space-y-3.5">
      {/* Full Name Field with Leading Icon Badge */}
      <div>
        <label
          htmlFor="full-name"
          className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#382F2D]/75 mb-1.5"
        >
          Full Name
        </label>
        <div
          className={`group flex items-center gap-3 px-3 py-2.5 bg-white rounded-2xl border-[2px] transition-all ${
            errors.name
              ? "border-[#C10230] bg-[#F5DADF]/15"
              : "border-[#382F2D]/20 hover:border-[#382F2D]/45 focus-within:border-[#382F2D] focus-within:shadow-[3px_3px_0px_#382F2D]"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              errors.name
                ? "bg-[#F5DADF] border-[#C10230]/30 text-[#C10230]"
                : "bg-[#FAF6F0] border-[#382F2D]/15 text-[#382F2D] group-focus-within:bg-[#C10230] group-focus-within:border-[#C10230] group-focus-within:text-white"
            }`}
          >
            <User className="w-4 h-4 stroke-[2.2]" />
          </div>
          <input
            id="full-name"
            type="text"
            autoComplete="name"
            placeholder="e.g. Alex Tan"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({ ...errors, name: undefined });
            }}
            className="w-full bg-transparent text-[16px] sm:text-[14px] font-semibold text-[#382F2D] placeholder:text-[#382F2D]/35 focus:outline-none"
          />
          {name.trim().length >= 2 && !errors.name && (
            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            </span>
          )}
        </div>
        {errors.name && (
          <p className="text-[11px] font-semibold text-[#C10230] mt-1 pl-1">
            {errors.name}
          </p>
        )}
      </div>

      {/* WhatsApp Number Field with Leading Icon Badge & Inline Status Pill */}
      <div>
        <label
          htmlFor="whatsapp"
          className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#382F2D]/75 mb-1.5"
        >
          WhatsApp Number
        </label>
        <div
          className={`group flex items-center gap-3 px-3 py-2.5 bg-white rounded-2xl border-[2px] transition-all ${
            errors.whatsapp
              ? "border-[#C10230] bg-[#F5DADF]/15"
              : "border-[#382F2D]/20 hover:border-[#382F2D]/45 focus-within:border-[#382F2D] focus-within:shadow-[3px_3px_0px_#382F2D]"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              errors.whatsapp
                ? "bg-[#F5DADF] border-[#C10230]/30 text-[#C10230]"
                : "bg-[#FAF6F0] border-[#382F2D]/15 text-[#382F2D] group-focus-within:bg-[#C10230] group-focus-within:border-[#C10230] group-focus-within:text-white"
            }`}
          >
            <Phone className="w-4 h-4 stroke-[2.2]" />
          </div>
          <input
            id="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="e.g. 081234567890"
            value={whatsapp}
            onChange={(e) => {
              setWhatsapp(e.target.value);
              if (errors.whatsapp)
                setErrors({ ...errors, whatsapp: undefined });
            }}
            className="w-full bg-transparent text-[16px] sm:text-[14px] font-semibold text-[#382F2D] placeholder:text-[#382F2D]/35 focus:outline-none"
          />
          {isCheckingPhone && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF6F0] border border-[#382F2D]/15 text-[10px] font-bold text-[#382F2D]/70">
              <Loader2 className="w-3 h-3 animate-spin text-[#C10230]" />
            </span>
          )}
          {phoneVerified && !errors.whatsapp && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Available</span>
            </span>
          )}
        </div>
        {errors.whatsapp && (
          <p className="text-[11px] font-semibold text-[#C10230] mt-1 pl-1">
            {errors.whatsapp}
          </p>
        )}
      </div>

      {/* Email Address Field with Leading Icon Badge & Inline Status Pill */}
      <div>
        <label
          htmlFor="email"
          className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#382F2D]/75 mb-1.5"
        >
          Email Address
        </label>
        <div
          className={`group flex items-center gap-3 px-3 py-2.5 bg-white rounded-2xl border-[2px] transition-all ${
            errors.email
              ? "border-[#C10230] bg-[#F5DADF]/15"
              : "border-[#382F2D]/20 hover:border-[#382F2D]/45 focus-within:border-[#382F2D] focus-within:shadow-[3px_3px_0px_#382F2D]"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              errors.email
                ? "bg-[#F5DADF] border-[#C10230]/30 text-[#C10230]"
                : "bg-[#FAF6F0] border-[#382F2D]/15 text-[#382F2D] group-focus-within:bg-[#C10230] group-focus-within:border-[#C10230] group-focus-within:text-white"
            }`}
          >
            <Mail className="w-4 h-4 stroke-[2.2]" />
          </div>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="e.g. alex@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            className="w-full bg-transparent text-[16px] sm:text-[14px] font-semibold text-[#382F2D] placeholder:text-[#382F2D]/35 focus:outline-none"
          />
          {isCheckingEmail && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF6F0] border border-[#382F2D]/15 text-[10px] font-bold text-[#382F2D]/70">
              <Loader2 className="w-3 h-3 animate-spin text-[#C10230]" />
            </span>
          )}
          {emailVerified && !errors.email && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Available</span>
            </span>
          )}
        </div>
        {errors.email && (
          <p className="text-[11px] font-semibold text-[#C10230] mt-1 pl-1">
            {errors.email}
          </p>
        )}
      </div>

      {/* Terms & Privacy Consent Checkbox (Opsi A) */}
      <div className="pt-1">
        <label
          htmlFor="terms-checkbox"
          className="flex items-start gap-2.5 cursor-pointer group select-none text-left"
        >
          <div className="relative flex items-center justify-center shrink-0 mt-0.5">
            <input
              id="terms-checkbox"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => {
                setAgreedToTerms(e.target.checked);
                if (errors.terms) setErrors({ ...errors, terms: undefined });
              }}
              className="peer sr-only"
            />
            <div
              className={`w-4 h-4 rounded-md border-[1.8px] transition-all flex items-center justify-center ${
                agreedToTerms
                  ? "bg-[#C10230] border-[#382F2D] shadow-[1px_1px_0px_#382F2D]"
                  : errors.terms
                  ? "bg-[#F5DADF] border-[#C10230]"
                  : "bg-white border-[#382F2D]/40 group-hover:border-[#382F2D]"
              }`}
            >
              {agreedToTerms && (
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  className="w-2.5 h-2.5 text-white stroke-current stroke-[2.2]"
                >
                  <path d="M2.5 6L5 8.5L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <p className="text-[11px] sm:text-[12px] leading-tight text-[#382F2D]/80 font-medium">
            Saya menyetujui{" "}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowTermsModal(true);
              }}
              className="font-bold text-[#C10230] hover:underline cursor-pointer inline-flex items-center gap-0.5"
            >
              Syarat & Ketentuan
            </button>{" "}
            serta{" "}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowTermsModal(true);
              }}
              className="font-bold text-[#C10230] hover:underline cursor-pointer inline-flex items-center gap-0.5"
            >
              Kebijakan Privasi
            </button>{" "}
            penggunaan data pengunjung Gong cha.
          </p>
        </label>
        {errors.terms && (
          <p className="text-[11px] font-semibold text-[#C10230] mt-1 pl-6">
            {errors.terms}
          </p>
        )}
      </div>

      <p className="text-[10.5px] font-medium text-[#382F2D]/55 pt-0.5">
        *Limited to 1 spin per WhatsApp & email address.
      </p>

      {errors.general && (
        <div className="p-3.5 bg-[#F5DADF]/80 border-[1.5px] border-[#C10230] text-[#821518] rounded-2xl text-xs font-semibold leading-relaxed">
          {errors.general}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !isFormValid}
        className={`w-full py-3.5 mt-1 font-display text-[20px] sm:text-[21px] tracking-[0.05em] uppercase rounded-2xl border-[2.5px] border-[#382F2D] transition-all select-none flex items-center justify-center gap-2 ${
          isFormValid && !isLoading
            ? "bg-[#C10230] hover:bg-[#821518] text-[#FAF8F2] shadow-[4px_4px_0px_#382F2D] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#382F2D] cursor-pointer"
            : "bg-[#E6E1D8] text-[#382F2D]/40 shadow-[2px_2px_0px_#382F2D]/40 cursor-not-allowed opacity-80"
        }`}
      >
        <span>{isLoading ? "VERIFYING..." : buttonText}</span>
        {!isLoading && (
          <ArrowRight
            className={`w-4 h-4 stroke-[2.5] ${
              isFormValid ? "text-[#FAF8F2]" : "text-[#382F2D]/35"
            }`}
          />
        )}
      </button>
    </form>
  );

  return (
    <main className="min-h-dvh h-dvh w-full animate-base-wash flex flex-col items-center justify-center p-3 sm:p-5 md:p-6 lg:p-8 overflow-y-auto lg:overflow-hidden relative">
      {/* =====================================================================
          DYNAMIC EASING BRAND WORLD GRADIENTS ("Living Tea Aura")
          Smoothly shifts position & hue based on user step (landing -> register -> spin)
         ===================================================================== */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        {/* Subtle Editorial Dot Grid */}
        <div className="absolute inset-0 bg-editorial-dots opacity-[0.06]" />

        {/* Orb 1: Pantone 200 C (#B22434) -> Pantone 715 C (#EB9243) */}
        <div
          className={`absolute w-[420px] h-[420px] sm:w-[580px] sm:h-[580px] rounded-full blur-[75px] animate-aura-one transition-all duration-700 ease-out ${
            step === "landing"
              ? "-top-24 -left-20"
              : step === "register"
              ? "top-1/3 -left-24"
              : "-top-16 left-1/4"
          }`}
          style={{
            background: "linear-gradient(135deg, #B22434 0%, #EB9243 100%)",
          }}
        />

        {/* Orb 2: Pantone 1585 C (#ED7532) -> Pantone 116 C (#F7D046) */}
        <div
          className={`absolute w-[440px] h-[440px] sm:w-[620px] sm:h-[540px] rounded-full blur-[80px] animate-aura-two transition-all duration-700 ease-out ${
            step === "landing"
              ? "-bottom-24 left-1/4"
              : step === "register"
              ? "-top-20 right-0"
              : "bottom-[-60px] right-1/4"
          }`}
          style={{
            background: "linear-gradient(135deg, #ED7532 0%, #F7D046 100%)",
          }}
        />

        {/* Orb 3: Pantone 272 C (#7573BB) -> Pantone 204 C (#DE86A7) */}
        <div
          className={`absolute w-[380px] h-[380px] sm:w-[520px] sm:h-[520px] rounded-full blur-[78px] animate-aura-three transition-all duration-700 ease-out ${
            step === "landing"
              ? "top-1/4 -right-20"
              : step === "register"
              ? "-bottom-20 right-1/4"
              : "top-1/3 -left-16"
          }`}
          style={{
            background: "linear-gradient(135deg, #7573BB 0%, #DE86A7 100%)",
          }}
        />
      </div>

      {step !== "spin" ? (
        <div className="w-full max-w-[480px] sm:max-w-[540px] lg:max-w-[1040px] xl:max-w-[1120px] 2xl:max-w-[1240px] flex flex-col items-center justify-between h-full relative z-10 m-auto">
          {/* ==============================================================
              DESKTOP & TABLET TWO-COLUMN WRAPPER (Visible on lg: screens)
              Scaled adaptively with responsive max-bounds so on 100% zoom it always fits in viewport
             ============================================================== */}
          <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8 xl:gap-12 lg:items-center w-full my-auto py-1 xl:py-4">
            {/* Left Column: Brand Crown Lockup, Mascot Hero, and Date/Location */}
            <div className="lg:col-span-7 flex flex-col items-center text-center">
              <header className="w-full flex flex-col items-center select-none">
                <div className="relative w-[52px] h-[68px] xl:w-[62px] xl:h-[82px] mb-1.5 xl:mb-2.5 drop-shadow-[0_3px_6px_rgba(56,47,45,0.08)]">
                  <Image
                    src="/gongcha-logo.png"
                    alt="Gong cha Official Logo"
                    fill
                    priority
                    sizes="62px"
                    className="object-contain"
                  />
                </div>

                <h1 className="font-display text-[52px] xl:text-[66px] 2xl:text-[72px] leading-[0.88] tracking-[-0.01em] uppercase text-[#382F2D] drop-shadow-[3px_3px_0px_#F1D09F]">
                  GRAND
                  <br />
                  OPENING
                </h1>

                {/* Highlighted Central Park Store Ribbon */}
                <div className="mt-2 xl:mt-3 inline-flex items-center gap-2 xl:gap-2.5 px-4 xl:px-5 py-1 xl:py-1.5 bg-[#C10230] text-[#FAF8F2] border-[2px] border-[#382F2D] rounded-full shadow-[3px_3px_0px_#382F2D]">
                  <RetroSparkle className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                  <span className="font-display text-[17px] xl:text-[21px] 2xl:text-[22px] tracking-[0.04em] leading-none">
                    Gong cha • <span className="text-[#F7D046]">Central Park</span>
                  </span>
                  <RetroSparkle className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                </div>
              </header>

              {/* Mascot Hero Artwork with Subtle Warm Radial Halo */}
              <div className="w-full flex items-center justify-center my-1 xl:my-2 pointer-events-none select-none relative">
                <div
                  aria-hidden="true"
                  className="absolute w-[260px] h-[260px] xl:w-[310px] xl:h-[310px] rounded-full blur-[44px] opacity-35"
                  style={{
                    background:
                      "radial-gradient(circle, #F7D046 0%, #EB9243 60%, transparent 100%)",
                  }}
                />
                <div className="relative w-full max-w-[270px] h-[265px] xl:max-w-[340px] xl:h-[335px] 2xl:max-w-[370px] 2xl:h-[365px]">
                  <Image
                    src="/hero-mascot-hd.png?v=2"
                    alt="Gong cha Mascot"
                    fill
                    priority
                    unoptimized
                    sizes="(min-width: 1280px) 375px, 280px"
                    className="object-contain drop-shadow-[0_12px_22px_rgba(56,47,45,0.15)]"
                  />
                </div>
              </div>

              {/* Event Metadata (Date & Location) */}
              <div className="w-full max-w-[360px] xl:max-w-[410px] grid grid-cols-2 divide-x-[2px] divide-[#382F2D] bg-[#FAF8F2] border-[2px] border-[#382F2D] rounded-2xl shadow-[3px_3px_0px_#382F2D] py-2 xl:py-2.5 mt-0.5 xl:mt-1">
                <div className="flex items-center justify-center gap-2 xl:gap-2.5 pr-2">
                  <Calendar className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-[#C10230] stroke-[2.4] shrink-0" />
                  <div className="text-left">
                    <p className="text-[8px] xl:text-[9px] font-extrabold tracking-[0.16em] uppercase text-[#382F2D]/60 leading-none mb-0.5 xl:mb-1">
                      DATE
                    </p>
                    <p className="font-display text-[15px] xl:text-[18px] leading-none tracking-[0.02em] text-[#382F2D] uppercase">
                      6 NOV 2026
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 xl:gap-2.5 pl-2">
                  <MapPin className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-[#C10230] stroke-[2.4] shrink-0" />
                  <div className="text-left">
                    <p className="text-[8px] xl:text-[9px] font-extrabold tracking-[0.16em] uppercase text-[#C10230] leading-none mb-0.5 xl:mb-1">
                      CENTRAL PARK MALL
                    </p>
                    <p className="font-display text-[15px] xl:text-[18px] leading-none tracking-[0.02em] text-[#382F2D] uppercase">
                      UG FLOOR
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Embedded Registration Card */}
            <div className="lg:col-span-5 w-full flex flex-col items-center relative">
              <div className="relative w-full bg-[#FAF8F2] rounded-[24px] xl:rounded-[28px] border-[2.5px] border-[#382F2D] shadow-[5px_5px_0px_#382F2D] xl:shadow-[6px_6px_0px_#382F2D] p-5 xl:p-7 text-left">
                <div className="mb-4 xl:mb-5 pb-3 xl:pb-4 border-b-[1.5px] border-[#382F2D]/15">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 mb-2 bg-[#F5DADF] border-[1.5px] border-[#382F2D] rounded-full shadow-[2px_2px_0px_#382F2D]">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#C10230]">
                      STEP 1 OF 2 • GUEST REGISTRATION
                    </span>
                  </div>
                  <h2 className="font-display text-[28px] xl:text-[34px] leading-[0.95] uppercase text-[#382F2D]">
                    CLAIM YOUR VOUCHER
                  </h2>
                  <p className="text-xs font-medium text-[#382F2D]/70 mt-1 leading-relaxed">
                    Complete your details below to spin the wheel and unlock your Grand Opening Exclusive Voucher.
                  </p>
                </div>

                {renderRegistrationForm("SPIN THE WHEEL")}
              </div>
            </div>
          </div>

          {/* ==============================================================
              MOBILE & SMALL TABLET IN-PLACE STEP FLOW (Hidden on lg:)
              UX 1 + UX A: Dedicated Centered Step Card Flow (Zero dark bottom-sheet clutter)
             ============================================================== */}
          <div className="flex lg:hidden flex-col items-center justify-between w-full h-full flex-1 py-1 sm:py-2">
            {step === "landing" ? (
              /* MOBILE STEP 1: HERO POSTER STAGE - Bold, Proportional & Roomy */
              <div
                key="mobile-hero"
                className="flex flex-col items-center justify-between w-full h-full flex-1 animate-step-card"
              >
                {/* 1. Top Brand Crown Lockup & Headline */}
                <header className="w-full text-center flex flex-col items-center select-none shrink-0 pt-1">
                  <div className="relative w-[54px] h-[72px] sm:w-[62px] sm:h-[82px] mb-2 drop-shadow-[0_3px_8px_rgba(56,47,45,0.1)]">
                    <Image
                      src="/gongcha-logo.png"
                      alt="Gong cha Official Logo"
                      fill
                      priority
                      sizes="62px"
                      className="object-contain"
                    />
                  </div>

                  <h1 className="font-display text-[52px] sm:text-[62px] leading-[0.88] tracking-[-0.01em] uppercase text-[#382F2D] drop-shadow-[3px_3px_0px_#F1D09F]">
                    GRAND
                    <br />
                    OPENING
                  </h1>

                  {/* Highlighted Central Park Store Ribbon */}
                  <div className="mt-2.5 sm:mt-3.5 inline-flex items-center gap-2 px-5 py-1.5 bg-[#C10230] text-[#FAF8F2] border-[2.2px] border-[#382F2D] rounded-full shadow-[3px_3px_0px_#382F2D]">
                    <RetroSparkle className="w-4 h-4 shrink-0" />
                    <span className="font-display text-[18px] sm:text-[21px] tracking-[0.04em] leading-none">
                      Gong cha • <span className="text-[#F7D046]">Central Park</span>
                    </span>
                    <RetroSparkle className="w-4 h-4 shrink-0" />
                  </div>
                </header>

                {/* 2. Center Mascot Hero Artwork - Expanded & Dominant */}
                <div className="w-full flex-1 flex items-center justify-center pointer-events-none select-none relative my-2 min-h-[240px] max-h-[48vh]">
                  <div
                    aria-hidden="true"
                    className="absolute w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] rounded-full blur-[42px] opacity-40"
                    style={{
                      background:
                        "radial-gradient(circle, #F7D046 0%, #EB9243 65%, transparent 100%)",
                    }}
                  />
                  <div className="relative w-full h-full max-w-[340px] sm:max-w-[400px]">
                    <Image
                      src="/hero-mascot-hd.png?v=2"
                      alt="Gong cha Mascot"
                      fill
                      priority
                      unoptimized
                      sizes="(max-width: 640px) 340px, 400px"
                      className="object-contain drop-shadow-[0_14px_28px_rgba(56,47,45,0.18)]"
                    />
                  </div>
                </div>

                {/* 3. CTA Action & Event Metadata Footer - Fixed to bottom */}
                <div className="w-full flex flex-col items-center space-y-2.5 sm:space-y-3.5 relative z-20 shrink-0 mt-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setStep("register")}
                    className="w-full py-3.5 sm:py-4 bg-[#C10230] hover:bg-[#821518] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#382F2D] text-[#FAF8F2] font-display text-[21px] sm:text-[23px] tracking-[0.06em] uppercase rounded-2xl border-[2.5px] border-[#382F2D] shadow-[4px_4px_0px_#382F2D] transition-all cursor-pointer touch-manipulation select-none flex items-center justify-center gap-2"
                  >
                    <span>GET YOUR VOUCHER</span>
                    <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <footer className="w-full grid grid-cols-2 divide-x-[2px] divide-[#382F2D] bg-[#FAF8F2] border-[2px] border-[#382F2D] rounded-2xl shadow-[3px_3px_0px_#382F2D] py-2.5">
                    <div className="flex items-center justify-center gap-2.5 pr-2">
                      <Calendar className="w-4 h-4 text-[#C10230] stroke-[2.4] shrink-0" />
                      <div className="text-left">
                        <p className="text-[9px] font-extrabold tracking-[0.16em] uppercase text-[#382F2D]/60 leading-none mb-0.5">
                          DATE
                        </p>
                        <p className="font-display text-[16px] sm:text-[18px] leading-none tracking-[0.02em] text-[#382F2D] uppercase">
                          6 NOV 2026
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2.5 pl-2">
                      <MapPin className="w-4 h-4 text-[#C10230] stroke-[2.4] shrink-0" />
                      <div className="text-left">
                        <p className="text-[9px] font-extrabold tracking-[0.16em] uppercase text-[#C10230] leading-none mb-0.5">
                          CENTRAL PARK MALL
                        </p>
                        <p className="font-display text-[16px] sm:text-[18px] leading-none tracking-[0.02em] text-[#382F2D] uppercase">
                          UG FLOOR
                        </p>
                      </div>
                    </div>
                  </footer>
                </div>
              </div>
            ) : (
              /* MOBILE STEP 2: CENTERED FLOATING REGISTRATION CARD (UX 1 + UX A) */
              <div
                key="mobile-register"
                className="w-full flex flex-col items-center justify-center my-auto py-2 animate-step-card"
              >
                {/* Top Navigation & Brand Pill Bar */}
                <div className="w-full flex items-center justify-between mb-3.5 px-1">
                  <button
                    type="button"
                    onClick={() => setStep("landing")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF8F2] border-[2px] border-[#382F2D] shadow-[2px_2px_0px_#382F2D] text-[11px] font-extrabold uppercase tracking-wider text-[#382F2D] hover:bg-[#382F2D] hover:text-[#FAF8F2] active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Back</span>
                  </button>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F1D09F] border-[1.5px] border-[#382F2D] rounded-full shadow-[2px_2px_0px_#382F2D]">
                    <RetroSparkle className="w-3 h-3" />
                    <span className="text-[11px] font-extrabold tracking-[0.05em] text-[#382F2D]">
                      Gong cha • <span className="text-[#C10230]">Central Park</span>
                    </span>
                  </div>
                </div>

                {/* Centered Floating Registration Card */}
                <div className="w-full bg-[#FAF8F2] rounded-[28px] border-[2.5px] border-[#382F2D] shadow-[6px_6px_0px_#382F2D] p-6 sm:p-7 text-left relative">
                  {/* Card Header with Official Gong cha Seal on Top-Right */}
                  <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b-[1.5px] border-[#382F2D]/15">
                    <div>
                      <div className="inline-block px-2.5 py-0.5 mb-2 bg-[#F5DADF] border border-[#C10230]/30 rounded-full">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#C10230]">
                          STEP 1 OF 2 • GUEST PASS
                        </span>
                      </div>
                      <h2 className="font-display text-[32px] leading-[0.95] uppercase text-[#382F2D]">
                        CLAIM YOUR VOUCHER
                      </h2>
                      <p className="text-[12px] font-medium text-[#382F2D]/70 mt-1.5 leading-snug">
                        Enter your details to unlock the Grand Opening Spin Wheel.
                      </p>
                    </div>

                    <div className="relative w-[36px] h-[48px] shrink-0 mt-0.5">
                      <Image
                        src="/gongcha-logo.png"
                        alt="Gong cha Official Logo"
                        fill
                        sizes="36px"
                        className="object-contain"
                      />
                    </div>
                  </div>

                  {/* Redesigned Tactile Input Form */}
                  {renderRegistrationForm("SPIN THE WHEEL")}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        registeredUser && (
          <div
            key="spin-stage"
            className="w-full flex-1 flex flex-col items-center justify-center my-auto relative z-10 animate-step-card"
          >
            {/* Modal Dialog container for desktop / full view for mobile */}
            <div className="w-full max-w-[395px] sm:max-w-[440px] lg:max-w-[940px] lg:bg-[#FAF8F2] lg:p-8 lg:rounded-[36px] lg:border-[3px] lg:border-[#382F2D] lg:shadow-[8px_8px_0px_#382F2D] relative overflow-hidden">
              <SpinWheelView
                user={registeredUser}
                onBack={() => setStep("landing")}
              />
            </div>
          </div>
        )
      )}

      {/* ==============================================================
          TERMS & CONDITIONS & PRIVACY POLICY MODAL
         ============================================================== */}
      {showTermsModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#382F2D]/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowTermsModal(false)}
        >
          <div
            className="w-full max-w-[480px] bg-[#FAF8F2] border-[3px] border-[#382F2D] rounded-[28px] p-6 sm:p-7 shadow-[6px_6px_0px_#382F2D] relative max-h-[85vh] flex flex-col text-left animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3.5 mb-3.5 border-b-[2px] border-[#382F2D]/15">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F5DADF] border-[1.5px] border-[#C10230] text-[#C10230] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-display text-[20px] uppercase text-[#382F2D] leading-none">
                    Syarat & Privasi
                  </h3>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#C10230] mt-0.5">
                    Gong cha Central Park
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="w-8 h-8 rounded-full border-[1.8px] border-[#382F2D] bg-white hover:bg-[#382F2D] hover:text-white flex items-center justify-center cursor-pointer transition-colors shadow-[1.5px_1.5px_0px_#382F2D]"
                aria-label="Tutup"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto pr-1 space-y-4 text-[12px] leading-relaxed text-[#382F2D]/85">
              <div>
                <h4 className="font-bold text-[#382F2D] text-[13px] mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C10230]" />
                  1. Syarat & Ketentuan Grand Opening
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-[#382F2D]/75 text-[11.5px]">
                  <li>Voucher hanya berlaku di outlet <strong>Gong cha Central Park Mall (UG Floor)</strong> mulai tanggal 6 November 2026.</li>
                  <li>Setiap pengunjung berhak mengikuti Spin the Wheel sebanyak <strong>1 (satu) kali</strong> dengan nomor WhatsApp & Email yang valid.</li>
                  <li>Kode voucher wajib ditunjukkan kepada kasir saat pemesanan sebelum pembayaran diproses.</li>
                  <li>Voucher tidak dapat diuangkan, dipindahtangankan secara komersial, atau digabungkan dengan promo eksternal lainnya.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-[#382F2D] text-[13px] mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C10230]" />
                  2. Kebijakan Privasi & Perlindungan Data
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-[#382F2D]/75 text-[11.5px]">
                  <li>Data pribadi (Nama, Nomor WhatsApp, dan Email) yang Anda daftarkan digunakan untuk keperluan verifikasi identitas pemenang serta pengiriman kode unik e-voucher.</li>
                  <li>Gong cha berkomitmen melindungi privasi pengunjung dan <strong>tidak akan memperjualbelikan data Anda</strong> kepada pihak ketiga di luar verifikasi promo ini.</li>
                  <li>Dengan mencentang persetujuan, Anda menyetujui penyimpanan data transaksi voucher ini secara aman pada sistem Gong cha.</li>
                </ul>
              </div>
            </div>

            {/* Modal Action Button */}
            <div className="pt-4 mt-3 border-t-[1.5px] border-[#382F2D]/15">
              <button
                type="button"
                onClick={() => {
                  setAgreedToTerms(true);
                  if (errors.terms) setErrors({ ...errors, terms: undefined });
                  setShowTermsModal(false);
                }}
                className="w-full py-2.5 bg-[#C10230] hover:bg-[#821518] text-[#FAF8F2] font-display text-[16px] tracking-wide uppercase rounded-xl border-[2px] border-[#382F2D] shadow-[3px_3px_0px_#382F2D] transition-all cursor-pointer"
              >
                Saya Mengerti & Setuju
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
