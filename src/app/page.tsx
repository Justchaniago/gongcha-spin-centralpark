"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Calendar, MapPin, X, Loader2, CheckCircle2 } from "lucide-react";
import SpinWheelView from "@/components/SpinWheelView";

interface UserRegistration {
  name: string;
  whatsapp: string;
  email: string;
  userId?: string;
}

export default function HomePage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [step, setStep] = useState<"landing" | "spin">("landing");

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
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
            whatsapp: data.message || "This WhatsApp number is already registered.",
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

  const renderRegistrationForm = (buttonText: string) => (
    <form onSubmit={validateAndSubmit} noValidate className="space-y-4">
      {/* Full Name */}
      <div>
        <label
          htmlFor="full-name"
          className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#111111]/70 mb-1"
        >
          Full Name
        </label>
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
          className="w-full px-4 py-3 bg-[#FAF8F2] rounded-xl border-[2px] border-[#111111] shadow-[2px_2px_0px_#111111] text-sm font-bold text-[#111111] placeholder:text-[#111111]/30 focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_#C8202F] transition-all"
        />
        {errors.name && (
          <p className="text-[11px] font-bold text-[#C8202F] mt-1.5 flex items-center gap-1">
            <span>•</span> {errors.name}
          </p>
        )}
      </div>

      {/* WhatsApp Number */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="whatsapp"
            className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#111111]/70"
          >
            WhatsApp Number
          </label>
          {isCheckingPhone && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#111111]/60">
              <Loader2 className="w-3 h-3 animate-spin text-[#C8202F]" /> Checking...
            </span>
          )}
          {phoneVerified && !errors.whatsapp && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Available
            </span>
          )}
        </div>
        <div className="relative">
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
            className={`w-full px-4 py-3 bg-[#FAF8F2] rounded-xl border-[2px] ${
              errors.whatsapp
                ? "border-[#C8202F] shadow-[2px_2px_0px_#C8202F]"
                : "border-[#111111] shadow-[2px_2px_0px_#111111]"
            } text-sm font-bold text-[#111111] placeholder:text-[#111111]/30 focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_#C8202F] transition-all`}
          />
        </div>
        {errors.whatsapp && (
          <p className="text-[11px] font-bold text-[#C8202F] mt-1.5 flex items-center gap-1">
            <span>•</span> {errors.whatsapp}
          </p>
        )}
      </div>

      {/* Email Address */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="email"
            className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#111111]/70"
          >
            Email Address
          </label>
          {isCheckingEmail && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#111111]/60">
              <Loader2 className="w-3 h-3 animate-spin text-[#C8202F]" /> Checking...
            </span>
          )}
          {emailVerified && !errors.email && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Available
            </span>
          )}
        </div>
        <div className="relative">
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
            className={`w-full px-4 py-3 bg-[#FAF8F2] rounded-xl border-[2px] ${
              errors.email
                ? "border-[#C8202F] shadow-[2px_2px_0px_#C8202F]"
                : "border-[#111111] shadow-[2px_2px_0px_#111111]"
            } text-sm font-bold text-[#111111] placeholder:text-[#111111]/30 focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_#C8202F] transition-all`}
          />
        </div>
        {errors.email && (
          <p className="text-[11px] font-bold text-[#C8202F] mt-1.5 flex items-center gap-1">
            <span>•</span> {errors.email}
          </p>
        )}
      </div>

      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#111111]/50 pt-0.5">
        *Limited to 1 spin per WhatsApp & email address
      </p>

      {errors.general && (
        <div className="p-3 bg-[#C8202F]/10 border-[2px] border-[#C8202F] text-[#C8202F] rounded-xl text-xs font-bold shadow-[2px_2px_0px_#C8202F]">
          {errors.general}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 mt-1 bg-[#C8202F] hover:bg-[#A81926] disabled:opacity-60 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#111111] text-[#F5F2E8] font-display text-[22px] tracking-[0.06em] uppercase rounded-2xl border-[2.5px] border-[#111111] shadow-[4px_4px_0px_#111111] transition-all cursor-pointer select-none"
      >
        {isLoading ? "VERIFYING..." : buttonText}
      </button>
    </form>
  );

  const validateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; whatsapp?: string; email?: string; general?: string } = {};

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
        setErrors({ general: data.error || "Registration failed. Please try again." });
        setIsLoading(false);
        return;
      }

      setRegisteredUser({
        name: name.trim(),
        whatsapp: cleanedPhone,
        email: email.trim(),
        userId: data.userId,
      });

      setIsDrawerOpen(false);
      setTimeout(() => {
        setStep("spin");
      }, 280);
    } catch (err) {
      console.error(err);
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-dvh w-full bg-[#F5F2E8] flex flex-col items-center justify-between px-5 py-5 sm:py-8 lg:py-10 lg:px-8 overflow-x-hidden relative">
      {step === "landing" ? (
        <div className="w-full max-w-[380px] lg:max-w-[960px] flex-1 flex flex-col items-center justify-between relative z-10">
          
          {/* DESKTOP & TABLET TWO-COLUMN WRAPPER (Visible on lg: screens) */}
          <div className="hidden lg:grid lg:grid-cols-12 lg:gap-12 lg:items-center w-full my-auto py-6">
            
            {/* Left Column: Brand, Mascot Hero, and Date/Location */}
            <div className="lg:col-span-7 flex flex-col items-center text-center">
              <header className="w-full flex flex-col items-center select-none">
                <div className="relative w-[42px] h-[56px] mb-2.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
                  <Image
                    src="/gongcha-logo.png"
                    alt="Gong Cha Official Logo"
                    fill
                    priority
                    sizes="42px"
                    className="object-contain"
                  />
                </div>

                <div className="inline-block px-3.5 py-1 mb-2.5 bg-[#EDE8D8] border-[1.5px] border-[#111111] rounded-full shadow-[2px_2px_0px_#111111]">
                  <p className="text-[12px] font-extrabold tracking-[0.18em] uppercase text-[#111111]">
                    GONG CHA • <span className="text-[#C8202F]">CENTRAL PARK</span>
                  </p>
                </div>

                <h1 className="font-display text-[78px] leading-[0.88] tracking-[-0.01em] uppercase text-[#111111]">
                  GRAND
                  <br />
                  OPENING
                </h1>
              </header>

              {/* Mascot Hero Artwork */}
              <div className="w-full flex items-center justify-center my-3 pointer-events-none select-none">
                <div className="relative w-[280px] aspect-[1200/1408]">
                  <Image
                    src="/hero-gongcha.png"
                    alt="Gong Cha Grand Opening Mascots"
                    fill
                    priority
                    sizes="280px"
                    className="object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.08)]"
                  />
                </div>
              </div>

              {/* Event Metadata (Date & Location) */}
              <div className="w-full max-w-[360px] grid grid-cols-2 divide-x-[1.5px] divide-[#111111]/20 border-y-[1.5px] border-[#111111]/20 py-3 mt-1">
                <div className="flex items-center justify-center gap-2.5 pr-2">
                  <Calendar className="w-4 h-4 text-[#C8202F] stroke-[2.2] shrink-0" />
                  <div className="text-left">
                    <p className="text-[9px] font-extrabold tracking-[0.16em] uppercase text-[#111111]/50 leading-none mb-1">
                      DATE
                    </p>
                    <p className="font-display text-[19px] leading-none tracking-[0.02em] text-[#111111] uppercase">
                      3 NOV 2026
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2.5 pl-2">
                  <MapPin className="w-4 h-4 text-[#C8202F] stroke-[2.2] shrink-0" />
                  <div className="text-left">
                    <p className="text-[9px] font-extrabold tracking-[0.16em] uppercase text-[#111111]/50 leading-none mb-1">
                      LOCATION
                    </p>
                    <p className="font-display text-[19px] leading-none tracking-[0.02em] text-[#111111] uppercase">
                      UG FLOOR
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Embedded Registration Card */}
            <div className="lg:col-span-5 w-full flex flex-col items-center">
              <div className="w-full bg-[#EDE8D8] rounded-[28px] border-[2.5px] border-[#111111] shadow-[6px_6px_0px_#111111] p-7 text-left">
                <div className="mb-5 pb-4 border-b-[1.5px] border-[#111111]/20">
                  <div className="inline-block px-3 py-0.5 mb-2.5 bg-[#FAF8F2] border-[1.5px] border-[#111111] rounded-full shadow-[2px_2px_0px_#111111]">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#C8202F]">
                      STEP 1 OF 2 • GUEST REGISTRATION
                    </span>
                  </div>
                  <h2 className="font-display text-[34px] leading-[0.95] uppercase text-[#111111]">
                    UNLOCK YOUR SPIN
                  </h2>
                  <p className="text-xs font-semibold text-[#111111]/70 mt-1.5 leading-relaxed">
                    Fill in your details below to spin the wheel and claim your Grand Opening exclusive voucher.
                  </p>
                </div>

                {renderRegistrationForm("SPIN THE WHEEL NOW")}
              </div>
            </div>

          </div>


          {/* MOBILE VIEW LAYOUT (Unchanged, 100% strictly preserved on screens < lg) */}
          <div className="lg:hidden w-full flex-1 flex flex-col items-center justify-between">
            {/* 1. Top Header: Logo, Sub-badge & Display Headline */}
            <header className="w-full text-center flex flex-col items-center select-none pt-1">
              <div className="relative w-[36px] h-[48px] mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
                <Image
                  src="/gongcha-logo.png"
                  alt="Gong Cha Official Logo"
                  fill
                  priority
                  sizes="36px"
                  className="object-contain"
                />
              </div>

              <div className="inline-block px-3 py-0.5 mb-2 bg-[#EDE8D8] border-[1.5px] border-[#111111] rounded-full shadow-[2px_2px_0px_#111111]">
                <p className="text-[11px] sm:text-[12px] font-extrabold tracking-[0.18em] uppercase text-[#111111]">
                  GONG CHA • <span className="text-[#C8202F]">CENTRAL PARK</span>
                </p>
              </div>

              <h1 className="font-display text-[68px] sm:text-[76px] leading-[0.88] tracking-[-0.01em] uppercase text-[#111111]">
                GRAND
                <br />
                OPENING
              </h1>
            </header>

            {/* 2. Center Hero Artwork */}
            <div className="w-full flex items-center justify-center my-1 pointer-events-none select-none">
              <div className="relative w-[235px] sm:w-[260px] aspect-[1200/1408]">
                <Image
                  src="/hero-gongcha.png"
                  alt="Gong Cha Grand Opening Mascots"
                  fill
                  priority
                  sizes="(max-width: 640px) 235px, 260px"
                  className="object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.06)]"
                />
              </div>
            </div>

            {/* 3. CTA Action & Event Metadata Footer */}
            <div className="w-full flex flex-col items-center space-y-4 relative z-20 pb-1">
              <button
                type="button"
                onClick={() => {
                  console.log("Button clicked!");
                  setIsDrawerOpen(true);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  setIsDrawerOpen(true);
                }}
                className="w-full py-3.5 bg-[#C8202F] hover:bg-[#A81926] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#111111] text-[#F5F2E8] font-display text-[22px] tracking-[0.06em] uppercase rounded-2xl border-[2.5px] border-[#111111] shadow-[4px_4px_0px_#111111] transition-all cursor-pointer touch-manipulation select-none"
              >
                GET YOUR VOUCHER
              </button>

              <footer className="w-full grid grid-cols-2 divide-x-[1.5px] divide-[#111111]/20 border-y-[1.5px] border-[#111111]/20 py-3">
                <div className="flex items-center justify-center gap-2.5 pr-2">
                  <Calendar className="w-4 h-4 text-[#C8202F] stroke-[2.2] shrink-0" />
                  <div className="text-left">
                    <p className="text-[9px] font-extrabold tracking-[0.16em] uppercase text-[#111111]/50 leading-none mb-1">
                      DATE
                    </p>
                    <p className="font-display text-[19px] leading-none tracking-[0.02em] text-[#111111] uppercase">
                      3 NOV 2026
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2.5 pl-2">
                  <MapPin className="w-4 h-4 text-[#C8202F] stroke-[2.2] shrink-0" />
                  <div className="text-left">
                    <p className="text-[9px] font-extrabold tracking-[0.16em] uppercase text-[#111111]/50 leading-none mb-1">
                      LOCATION
                    </p>
                    <p className="font-display text-[19px] leading-none tracking-[0.02em] text-[#111111] uppercase">
                      UG FLOOR
                    </p>
                  </div>
                </div>
              </footer>
            </div>
          </div>

        </div>
      ) : (
        registeredUser && (
          <div className="w-full flex-1 flex flex-col items-center justify-center my-auto">
            {/* Modal Dialog container for desktop / full view for mobile */}
            <div className="w-full max-w-[380px] lg:max-w-[880px] lg:bg-[#EDE8D8]/95 lg:p-8 lg:rounded-[36px] lg:border-[3px] lg:border-[#111111] lg:shadow-[8px_8px_0px_#111111]">
              <SpinWheelView
                user={registeredUser}
                onBack={() => setStep("landing")}
              />
            </div>
          </div>
        )
      )}

      {/* Smooth Slide-Up Bottom Sheet Modal (Mobile only, triggered by Get Your Voucher) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end items-center">
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-backdrop"
          />

          {/* Sheet Container */}
          <div className="relative w-full max-w-[430px] bg-[#EDE8D8] rounded-t-[28px] border-t-[3px] border-x-[3px] border-[#111111] shadow-[0_-8px_0_#111111] px-6 pt-4 pb-8 z-10 animate-slide-up-sheet">
            {/* Drag Handle Bar */}
            <div className="w-12 h-1 bg-[#111111]/30 rounded-full mx-auto mb-4" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close drawer"
              className="absolute top-5 right-5 w-8 h-8 rounded-full border-[2px] border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center bg-[#FAF8F2] text-[#111111] hover:bg-[#111111] hover:text-[#F5F2E8] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Header */}
            <div className="mb-5 pb-4 border-b-[1.5px] border-[#111111]/20">
              <div className="inline-block px-3 py-0.5 mb-2 bg-[#FAF8F2] border-[1.5px] border-[#111111] rounded-full shadow-[2px_2px_0px_#111111]">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#C8202F]">
                  STEP 1 OF 2 • GUEST REGISTRATION
                </span>
              </div>
              <h2 className="font-display text-[34px] leading-[0.95] uppercase text-[#111111]">
                UNLOCK YOUR SPIN
              </h2>
              <p className="text-xs font-semibold text-[#111111]/70 mt-1 leading-relaxed">
                Complete your details below to spin the wheel and get your Grand Opening Exclusive Voucher.
              </p>
            </div>

            {/* Form */}
            {renderRegistrationForm("CONTINUE TO SPIN WHEEL")}
          </div>
        </div>
      )}
    </main>
  );
}
