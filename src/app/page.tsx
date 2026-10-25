"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Calendar, Clock, MapPin, X } from "lucide-react";
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
  const [errors, setErrors] = useState<{
    name?: string;
    whatsapp?: string;
    email?: string;
    general?: string;
  }>({});

  const [registeredUser, setRegisteredUser] = useState<UserRegistration | null>(
    null
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
    <main className="min-h-dvh w-full bg-[#F5F2E8] flex flex-col items-center justify-between px-6 py-7 sm:py-10 overflow-x-hidden relative">
      {step === "landing" ? (
        <div className="w-full max-w-[380px] flex-1 flex flex-col items-center justify-between relative z-10">
          {/* 1. Top Header & Display Headline */}
          <header className="w-full text-center flex flex-col items-center select-none">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#C8202F]/10 border border-[#C8202F]/25 mb-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="w-2 h-2 rounded-full bg-[#C8202F] animate-pulse" />
              <p className="text-[12px] sm:text-[13px] font-black tracking-[0.2em] uppercase text-[#C8202F]">
                GONG CHA • CENTRAL PARK
              </p>
            </div>

            <h1 className="font-display text-[76px] sm:text-[84px] leading-[0.88] tracking-[-0.01em] uppercase text-[#111111]">
              GRAND
              <br />
              OPENING
            </h1>
          </header>

          {/* 2. Center Hero Artwork */}
          <div className="w-full flex items-center justify-center my-2 pointer-events-none select-none">
            <div className="relative w-[290px] sm:w-[320px] aspect-[1200/1408]">
              <Image
                src="/hero-gongcha.png"
                alt="Gong Cha Grand Opening Mascots"
                fill
                priority
                sizes="(max-width: 640px) 290px, 320px"
                className="object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.06)]"
              />
            </div>
          </div>

          {/* 3. CTA Action & Event Metadata Footer */}
          <div className="w-full flex flex-col items-center space-y-6 relative z-20">
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
              className="w-full py-4 bg-[#C8202F] hover:bg-[#A81926] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#111111] text-[#F5F2E8] font-display text-[24px] tracking-[0.06em] uppercase rounded-2xl border-[2.5px] border-[#111111] shadow-[4px_4px_0px_#111111] transition-all cursor-pointer touch-manipulation select-none"
            >
              GET YOUR VOUCHER
            </button>

            <footer className="w-full grid grid-cols-2 gap-4 px-2 py-3 bg-[#EDE8D8]/70 border-[2px] border-[#111111]/15 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#C8202F]">
                  <Calendar className="w-5 h-5 text-[#F5F2E8] stroke-[2.2]" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#111111]/60">Date</span>
                  <p className="font-display text-[20px] leading-tight text-[#111111] uppercase">
                    3 NOV 2026
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#C8202F]">
                  <MapPin className="w-5 h-5 text-[#F5F2E8] stroke-[2.2]" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#111111]/60">Location</span>
                  <p className="font-display text-[18px] leading-tight text-[#111111] uppercase">
                    UG FLOOR
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </div>
      ) : (
        registeredUser && (
          <SpinWheelView
            user={registeredUser}
            onBack={() => setStep("landing")}
          />
        )
      )}

      {/* Smooth Slide-Up Bottom Sheet Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end items-center">
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-backdrop"
          />

          {/* Sheet Container */}
          <div className="relative w-full max-w-[430px] bg-[#F5F2E8] rounded-t-[28px] border-t-[3px] border-x-[3px] border-[#111111] shadow-[0_-8px_0_#111111] px-6 pt-4 pb-8 z-10 animate-slide-up-sheet">
          {/* Drag Handle Bar */}
          <div className="w-12 h-1.5 bg-[#111111]/25 rounded-full mx-auto mb-4" />

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close drawer"
            className="absolute top-5 right-5 w-8 h-8 rounded-full border-2 border-[#111111] flex items-center justify-center text-[#111111] hover:bg-[#111111] hover:text-[#F5F2E8] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Header */}
          <div className="mb-5">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#C8202F]">
              STEP 1 OF 2 • GUEST REGISTRATION
            </span>
            <h2 className="font-display text-[36px] leading-[0.95] uppercase text-[#111111] mt-1">
              UNLOCK YOUR SPIN
            </h2>
            <p className="text-xs font-semibold text-[#111111]/70 mt-1">
              Complete your details below to spin the wheel and get your Grand Opening Exclusive Voucher.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={validateAndSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="full-name"
                className="block text-[11px] font-extrabold uppercase tracking-wider text-[#111111] mb-1.5"
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
                className="w-full px-4 py-3 bg-white rounded-xl border-2 border-[#111111] text-sm font-bold text-[#111111] placeholder:text-[#111111]/35 focus:outline-none focus:ring-2 focus:ring-[#C8202F]"
              />
              {errors.name && (
                <p className="text-[11px] font-bold text-[#C8202F] mt-1">
                  {errors.name}
                </p>
              )}
            </div>

            {/* WhatsApp Number */}
            <div>
              <label
                htmlFor="whatsapp"
                className="block text-[11px] font-extrabold uppercase tracking-wider text-[#111111] mb-1.5"
              >
                WhatsApp Number
              </label>
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
                className="w-full px-4 py-3 bg-white rounded-xl border-2 border-[#111111] text-sm font-bold text-[#111111] placeholder:text-[#111111]/35 focus:outline-none focus:ring-2 focus:ring-[#C8202F]"
              />
              {errors.whatsapp && (
                <p className="text-[11px] font-bold text-[#C8202F] mt-1">
                  {errors.whatsapp}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-extrabold uppercase tracking-wider text-[#111111] mb-1.5"
              >
                Email Address
              </label>
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
                className="w-full px-4 py-3 bg-white rounded-xl border-2 border-[#111111] text-sm font-bold text-[#111111] placeholder:text-[#111111]/35 focus:outline-none focus:ring-2 focus:ring-[#C8202F]"
              />
              {errors.email && (
                <p className="text-[11px] font-bold text-[#C8202F] mt-1">
                  {errors.email}
                </p>
              )}
            </div>

            <p className="text-[11px] font-semibold text-[#111111]/60 pt-0.5">
              *Limited to 1 spin per WhatsApp number & email address.
            </p>

            {errors.general && (
              <div className="p-3 bg-red-100 border-2 border-[#C8202F] text-[#C8202F] rounded-xl text-xs font-bold">
                {errors.general}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 mt-1 bg-[#C8202F] hover:bg-[#A81926] disabled:opacity-60 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#111111] text-[#F5F2E8] font-display text-[22px] tracking-[0.06em] uppercase rounded-xl border-[2.5px] border-[#111111] shadow-[4px_4px_0px_#111111] transition-all cursor-pointer"
            >
              {isLoading ? "VERIFYING..." : "CONTINUE TO SPIN WHEEL"}
            </button>
          </form>
        </div>
      </div>
      )}
    </main>
  );
}
