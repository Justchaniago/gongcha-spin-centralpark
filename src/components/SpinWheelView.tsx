"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { Download, Camera, ArrowLeft, Home, X, Check, Copy, QrCode } from "lucide-react";
import { toPng } from "html-to-image";
import { QRCodeSVG } from "qrcode.react";

export interface PrizeSegment {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  textColor: string;
  codePrefix: string;
  tnc: string;
}

// Cohesive Gong cha Alternating Wheel (Crimson & Warm Cream)
const GONGCHA_WHEEL_THEMES = [
  { color: "#C10230", textColor: "#FAF8F2" }, // Gong cha Crimson
  { color: "#FAF8F2", textColor: "#382F2D" }, // Warm Milk Cream
  { color: "#C10230", textColor: "#FAF8F2" }, // Gong cha Crimson
  { color: "#FAF8F2", textColor: "#382F2D" }, // Warm Milk Cream
];

// Fallback jika API sedang offline / awal loading
const DEFAULT_PRIZE_SEGMENTS: PrizeSegment[] = [
  {
    id: "B1G1",
    label: "B1G1 SELECTED MENU",
    shortLabel: "B1G1 MENU",
    color: "#C10230",
    textColor: "#FAF8F2",
    codePrefix: "GC",
    tnc: "Buy 1 Get 1 free untuk varian menu pilihan. Berlaku mulai 6 November 2026 hanya di Gong cha Central Park Mall (UG Floor).",
  },
  {
    id: "DISC_50",
    label: "50% OFF (MAX. POTONGAN 25K)",
    shortLabel: "50% OFF",
    color: "#FAF8F2",
    textColor: "#382F2D",
    codePrefix: "GC",
    tnc: "Diskon 50% dengan maksimal potongan Rp 25.000. Berlaku mulai 6 November 2026 hanya di Gong cha Central Park Mall (UG Floor).",
  },
  {
    id: "VOUCHER_50K",
    label: "VOUCHER 50K (MIN. 100K)",
    shortLabel: "VOUCHER 50K",
    color: "#C10230",
    textColor: "#FAF8F2",
    codePrefix: "GC",
    tnc: "Potongan Rp 50.000 dengan minimal belanja Rp 100.000. Berlaku mulai 6 November 2026 hanya di Gong cha Central Park Mall (UG Floor).",
  },
  {
    id: "VOUCHER_100K",
    label: "VOUCHER 100K (MIN. 200K)",
    shortLabel: "VOUCHER 100K",
    color: "#FAF8F2",
    textColor: "#382F2D",
    codePrefix: "GC",
    tnc: "Grand Prize Potongan Rp 100.000 dengan minimal belanja Rp 200.000. Berlaku mulai 6 November 2026 hanya di Gong cha Central Park Mall (UG Floor).",
  },
];

interface SpinWheelViewProps {
  user: {
    name: string;
    whatsapp: string;
    email: string;
    userId?: string;
  };
  onBack: () => void;
}

function splitWheelLabel(label: string): [string, string?] {
  const words = label.trim().split(/\s+/);
  if (words.length <= 1) return [label];
  if (words.length === 2) return [words[0], words[1]];
  if (words.length === 3) {
    return [`${words[0]} ${words[1]}`, words[2]];
  }
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export default function SpinWheelView({ user, onBack }: SpinWheelViewProps) {
  const [prizes, setPrizes] = useState<PrizeSegment[]>(DEFAULT_PRIZE_SEGMENTS);
  const [isLoadingPrizes, setIsLoadingPrizes] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState<{
    segment: PrizeSegment;
    uniqueCode: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const spinCountRef = useRef(0);
  const voucherCardRef = useRef<HTMLDivElement>(null);

  // Fetch prizes from Database via API & harmonize with Gong cha 2-Tone Palette
  useEffect(() => {
    async function loadPrizesFromDB() {
      try {
        const res = await fetch("/api/prizes");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.prizes) && data.prizes.length > 0) {
            const harmonized = data.prizes.map(
              (p: PrizeSegment, index: number) => {
                const theme =
                  GONGCHA_WHEEL_THEMES[index % GONGCHA_WHEEL_THEMES.length];
                return {
                  ...p,
                  color: theme.color,
                  textColor: theme.textColor,
                };
              }
            );
            setPrizes(harmonized);
          }
        }
      } catch (err) {
        console.error("Failed to load prizes from database:", err);
      } finally {
        setIsLoadingPrizes(false);
      }
    }
    loadPrizesFromDB();
  }, []);

  const handleSpin = async () => {
    if (isSpinning || wonPrize || isLoadingPrizes) return;

    setIsSpinning(true);

    try {
      let targetPrizeIndex = -1;
      let serverVoucherCode = "";
      let serverPrize: PrizeSegment | null = null;

      if (user.userId) {
        const res = await fetch("/api/spin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.userId }),
        });

        const data = await res.json();

        if (res.ok && data.voucher) {
          serverVoucherCode = data.voucher.uniqueCode || data.voucher.code;
          const matchedFromState = prizes.find(
            (s) => s.id === data.voucher.prizeId
          );
          serverPrize = matchedFromState || {
            id: data.voucher.prizeId,
            label: data.voucher.prizeName,
            shortLabel: data.voucher.shortLabel || data.voucher.prizeName,
            color: data.voucher.color || "#C10230",
            textColor: data.voucher.textColor || "#FAF8F2",
            codePrefix: "GC",
            tnc: data.voucher.termsConditions || data.voucher.tnc,
          };
          targetPrizeIndex = prizes.findIndex(
            (s) => s.id === data.voucher.prizeId
          );
        } else {
          alert(data.error || "Failed to spin. Please try again.");
          setIsSpinning(false);
          return;
        }
      }

      const totalSegments = prizes.length;
      const segmentAngle = 360 / totalSegments;

      const winningIndex =
        targetPrizeIndex !== -1
          ? targetPrizeIndex
          : Math.floor(Math.random() * totalSegments);

      // 1. Precise Target Calculation:
      // In SVG: slice idx center is located at (idx * segmentAngle) degrees.
      // Top pointer is at 0° (12 o'clock).
      // To bring slice `winningIndex` center exactly under the pointer:
      const sliceTargetAtZero = (360 - (winningIndex * segmentAngle)) % 360;

      // 2. Safe Random Jitter (keeps pointer firmly in the inner 50% safe-zone of the slice, never near borders)
      const safeJitter = (Math.random() - 0.5) * (segmentAngle * 0.46);

      // 3. Continuous Multi-Turn Momentum (5 to 6 full rotations = 1800° - 2160° for crisp suspense)
      const currentMod = rotation % 360;
      const baseLaps = 5 * 360; // 5 full turns
      const deltaAngle = (sliceTargetAtZero - currentMod + 360) % 360;
      const finalAngle = rotation + baseLaps + deltaAngle + safeJitter;

      spinCountRef.current += 1;
      setRotation(finalAngle);

      const selectedSegment = serverPrize || prizes[winningIndex];
      const randomChars = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
      const generatedCode =
        serverVoucherCode || `${selectedSegment.codePrefix}-${randomChars}`;

      // Optimized duration: 3.8s (3800ms) - peak thrilling tension without feeling sluggish
      setTimeout(() => {
        setIsSpinning(false);
        setWonPrize({
          segment: selectedSegment,
          uniqueCode: generatedCode,
        });

        confetti({
          particleCount: 85,
          spread: 68,
          origin: { y: 0.55 },
          colors: ["#C10230", "#FAF8F2", "#F1D09F", "#382F2D"],
        });
      }, 3800);
    } catch (err) {
      console.error("Spin error:", err);
      alert("Network error occurred while spinning. Please try again.");
      setIsSpinning(false);
    }
  };

  const handleCopyCode = async () => {
    if (!wonPrize) return;
    try {
      await navigator.clipboard.writeText(wonPrize.uniqueCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownloadVoucher = async () => {
    if (!voucherCardRef.current || !wonPrize || isSaving) return;

    try {
      setIsSaving(true);
      const dataUrl = await toPng(voucherCardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#F6F1E6",
      });

      const fileName = `Gongcha-Voucher-${wonPrize.uniqueCode}.png`;

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile && navigator.canShare) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], fileName, { type: "image/png" });

        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Gong cha Central Park Voucher",
              text: `My Gong cha Grand Opening Voucher: ${wonPrize.segment.label} (${wonPrize.uniqueCode})`,
            });
            setIsSaving(false);
            return;
          } catch (shareErr) {
            if ((shareErr as Error).name === "AbortError") {
              setIsSaving(false);
              return;
            }
          }
        }
      }

      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download image", err);
      alert(
        "Please take a screenshot of this voucher card to present at the cashier."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const WHEEL_RADIUS = 160;
  const WHEEL_CENTER = 200;

  return (
    <div className="w-full max-w-[395px] sm:max-w-[440px] lg:max-w-full flex-1 flex flex-col items-center justify-center py-1 sm:py-2 px-1 select-none my-auto">
      {/* 1. Symmetrical Header Area with Safe Padding for Back Button */}
      <header className="w-full text-center flex flex-col items-center relative mb-2 sm:mb-4 lg:mb-5 px-10">
        {!isSpinning && (
          <button
            type="button"
            onClick={onBack}
            className="absolute left-0 top-0 w-9 h-9 rounded-full border-[2px] border-[#382F2D] flex items-center justify-center bg-white hover:bg-[#382F2D] hover:text-[#FAF8F2] active:translate-y-0.5 cursor-pointer shadow-[2px_2px_0px_#382F2D] transition-colors"
            aria-label={wonPrize ? "Return to Home" : "Back"}
            title={wonPrize ? "Return to Home" : "Back"}
          >
            {wonPrize ? (
              <X className="w-4 h-4 stroke-[2.4]" />
            ) : (
              <ArrowLeft className="w-4 h-4 stroke-[2.4]" />
            )}
          </button>
        )}

        <div className="inline-block px-3.5 py-0.5 mb-2 bg-[#F1D09F] border-[1.5px] border-[#382F2D] rounded-full shadow-[2px_2px_0px_#382F2D]">
          <p className="text-[11px] lg:text-[12px] font-extrabold tracking-[0.06em] text-[#382F2D]">
            Gong cha • <span className="text-[#C10230]">Central Park</span>
          </p>
        </div>

        <h1
          className={`font-display uppercase text-[#382F2D] drop-shadow-[2.5px_2.5px_0px_#F1D09F] transition-all duration-300 leading-[0.92] ${
            wonPrize
              ? "text-[34px] sm:text-[40px] lg:text-[48px]"
              : "text-[44px] sm:text-[52px] lg:text-[60px]"
          }`}
        >
          {wonPrize ? "VOUCHER UNLOCKED" : "SPIN TO WIN"}
        </h1>
        <p className="text-[12px] lg:text-[13px] font-semibold text-[#382F2D]/75 mt-1.5">
          {wonPrize
            ? `Congrats, ${user.name.split(" ")[0]}! Present your voucher at the cashier.`
            : `Hi ${user.name.split(" ")[0]}, tap spin to reveal your exclusive prize!`}
        </p>
      </header>

      {/* 2. Responsive Body:
          - On Mobile (< lg): Shows Wheel when spinning/idle; when wonPrize is true, hides Wheel so Voucher Card takes clean center stage without cramping or clipping!
          - On Desktop (lg+): Shows 2-Column side-by-side (Left: Wheel, Right: Action/Voucher). */}
      <div className="w-full flex flex-col lg:grid lg:grid-cols-12 lg:gap-10 lg:items-center">
        {/* Column Left: Pure Concentric SVG Spin Wheel (Hidden on mobile once voucher is unlocked) */}
        <div
          className={`w-full lg:col-span-6 flex-col items-center justify-center ${
            wonPrize ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="relative aspect-square w-[280px] sm:w-[325px] lg:w-[340px] xl:w-[370px] flex items-center justify-center my-1 sm:my-2">
            {/* Unified Master SVG — 100% Mathematical Concentricity around (200, 200) */}
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full overflow-visible block"
            >
              <defs>
                <clipPath id="wheelSlicesClip">
                  <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={WHEEL_RADIUS} />
                </clipPath>
              </defs>

              {/* 1. Symmetrical Outer Aura Ring */}
              <circle
                cx={WHEEL_CENTER}
                cy={WHEEL_CENTER}
                r="190"
                fill="#382F2D"
                opacity="0.1"
              />

              {/* 2. Outer Dark Frame Ring */}
              <circle
                cx={WHEEL_CENTER}
                cy={WHEEL_CENTER}
                r="184"
                fill="#382F2D"
              />

              {/* 3. Outer Trim Ring (Cream #FAF8F2) */}
              <circle
                cx={WHEEL_CENTER}
                cy={WHEEL_CENTER}
                r="167"
                fill="#FAF8F2"
                stroke="#382F2D"
                strokeWidth="3"
              />

              {/* 4. 12 Symmetrical Stud Pegs along the Dark Rim (r = 175.5) */}
              {Array.from({ length: 12 }).map((_, i) => {
                const deg = i * 30;
                const rad = ((deg - 90) * Math.PI) / 180;
                const cx = WHEEL_CENTER + 175.5 * Math.cos(rad);
                const cy = WHEEL_CENTER + 175.5 * Math.sin(rad);
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r="4"
                    fill={i % 2 === 0 ? "#C10230" : "#FAF8F2"}
                    stroke="#382F2D"
                    strokeWidth="1.8"
                  />
                );
              })}

              {/* 5. Rotating Wheel Group — Rotates strictly around center (200, 200) */}
              <g clipPath="url(#wheelSlicesClip)">
                <g
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: "200px 200px",
                    transition: isSpinning
                      ? "transform 3.8s cubic-bezier(0.15, 0.95, 0.2, 1.02)"
                      : "none",
                  }}
                >
                  {prizes.map((seg, idx) => {
                    const total = prizes.length;
                    const angle = 360 / total;
                    const startAngle = idx * angle - 90 - angle / 2;
                    const endAngle = startAngle + angle;

                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;

                    const R = 162;
                    const x1 = WHEEL_CENTER + R * Math.cos(startRad);
                    const y1 = WHEEL_CENTER + R * Math.sin(startRad);
                    const x2 = WHEEL_CENTER + R * Math.cos(endRad);
                    const y2 = WHEEL_CENTER + R * Math.sin(endRad);

                    const pathData = `M ${WHEEL_CENTER} ${WHEEL_CENTER} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
                    const textRotation = idx * angle;
                    const [line1, line2] = splitWheelLabel(seg.shortLabel);

                    return (
                      <g key={seg.id}>
                        <path
                          d={pathData}
                          fill={seg.color}
                          stroke="#382F2D"
                          strokeWidth="3.5"
                          strokeLinejoin="round"
                        />

                        {/* Symmetrical Stacked Typography in Each Wedge */}
                        <g
                          transform={`translate(${WHEEL_CENTER}, ${WHEEL_CENTER}) rotate(${textRotation})`}
                        >
                          {line2 ? (
                            <>
                              <text
                                x="0"
                                y="-114"
                                fill={seg.textColor}
                                textAnchor="middle"
                                dominantBaseline="central"
                                style={{
                                  fontFamily:
                                    "var(--font-public-sans), Public Sans, sans-serif",
                                  fontWeight: 900,
                                  fontSize: "13px",
                                  letterSpacing: "0.06em",
                                }}
                              >
                                {line1}
                              </text>
                              <text
                                x="0"
                                y="-96"
                                fill={seg.textColor}
                                textAnchor="middle"
                                dominantBaseline="central"
                                style={{
                                  fontFamily:
                                    "var(--font-public-sans), Public Sans, sans-serif",
                                  fontWeight: 900,
                                  fontSize: "14.5px",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                {line2}
                              </text>
                            </>
                          ) : (
                            <text
                              x="0"
                              y="-105"
                              fill={seg.textColor}
                              textAnchor="middle"
                              dominantBaseline="central"
                              style={{
                                fontFamily:
                                  "var(--font-public-sans), Public Sans, sans-serif",
                                fontWeight: 900,
                                fontSize: "14px",
                                letterSpacing: "0.06em",
                              }}
                            >
                              {line1}
                            </text>
                          )}
                        </g>
                      </g>
                    );
                  })}
                </g>
              </g>

              {/* 6. Crisp Inner Ring Border Over Clip Edge */}
              <circle
                cx={WHEEL_CENTER}
                cy={WHEEL_CENTER}
                r={WHEEL_RADIUS}
                fill="none"
                stroke="#382F2D"
                strokeWidth="3.5"
              />

              {/* 7. Stationary Center Hub Rings (Concentric at 200, 200) */}
              <circle
                cx={WHEEL_CENTER}
                cy={WHEEL_CENTER + 2}
                r="46"
                fill="#382F2D"
                opacity="0.24"
              />
              {/* Outer Crimson Hub Ring */}
              <circle
                cx={WHEEL_CENTER}
                cy={WHEEL_CENTER}
                r="45"
                fill="#C10230"
                stroke="#382F2D"
                strokeWidth="3.2"
              />
              {/* Inner Cream Medallion Ring */}
              <circle
                cx={WHEEL_CENTER}
                cy={WHEEL_CENTER}
                r="38"
                fill="#FAF8F2"
                stroke="#382F2D"
                strokeWidth="2.2"
              />

              {/* 8. Top Pointer Pin (Centered at X = 200) */}
              <g>
                <path
                  d="M200 44L184 12C182.4 8.8 184.7 5 188.3 5H211.7C215.3 5 217.6 8.8 216 12L200 44Z"
                  fill="#C10230"
                  stroke="#382F2D"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                <circle
                  cx="200"
                  cy="15"
                  r="4.5"
                  fill="#FAF8F2"
                  stroke="#382F2D"
                  strokeWidth="2.5"
                />
              </g>
            </svg>

            {/* Properly Proportioned Stationary Gong cha Logo inside Center Hub */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="relative w-[33px] h-[44px] sm:w-[36px] sm:h-[48px] lg:w-[38px] lg:h-[50px]">
                <Image
                  src="/gongcha-logo.png"
                  alt="Gong cha Official Logo"
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Column Right (Desktop) / Main Action Area (Mobile) */}
        <div className="w-full lg:col-span-6 flex flex-col items-center justify-center mt-4 lg:mt-0">
          {!wonPrize ? (
            <div className="w-full flex flex-col items-center space-y-4">
              {/* Clean Symmetrical Card on Desktop */}
              <div className="hidden lg:block w-full bg-white border-[2.5px] border-[#382F2D] rounded-2xl p-6 shadow-[4px_4px_0px_#382F2D] text-left">
                <span className="inline-block px-3 py-0.5 mb-2.5 bg-[#F5DADF] border border-[#C10230]/30 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-[#C10230]">
                  STEP 2 OF 2 • GUARANTEED PRIZE
                </span>
                <h3 className="font-display text-[28px] uppercase text-[#382F2D] leading-tight">
                  TRY YOUR LUCK NOW!
                </h3>
                <p className="text-xs font-medium text-[#382F2D]/75 mt-1.5 leading-relaxed">
                  Every spin is guaranteed to win an exclusive Gong cha Grand Opening voucher. Valid for dine-in & takeaway at Central Park Mall (UG Floor).
                </p>
              </div>

              <button
                type="button"
                disabled={isSpinning}
                onClick={handleSpin}
                className="w-full py-4 bg-[#C10230] hover:bg-[#821518] disabled:opacity-60 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#382F2D] text-[#FAF8F2] font-display text-[23px] sm:text-[24px] tracking-[0.06em] uppercase rounded-2xl border-[2.5px] border-[#382F2D] shadow-[4px_4px_0px_#382F2D] transition-all cursor-pointer touch-manipulation"
              >
                {isSpinning ? "SPINNING..." : "SPIN THE WHEEL"}
              </button>

              <p className="lg:hidden text-[11px] font-semibold text-[#382F2D]/60 text-center">
                100% Guaranteed Grand Opening Reward • Dine-In & Takeaway
              </p>
            </div>
          ) : (
            /* Clean & Editorial Won Voucher Ticket Presentation */
            <div className="w-full flex flex-col items-center space-y-3">
              {/* The Downloadable Voucher Ticket */}
              <div
                ref={voucherCardRef}
                className="w-full bg-white rounded-2xl border-[2.5px] border-[#382F2D] shadow-[5px_5px_0px_#382F2D] p-5 sm:p-6 text-left relative overflow-hidden"
              >
                {/* Ticket Header: Badge + Prize Name + Properly Spaced Official Logo */}
                <div className="flex items-start justify-between gap-4 border-b-[1.5px] border-dashed border-[#382F2D]/20 pb-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <span className="inline-block px-2.5 py-0.5 mb-2 bg-[#F5DADF] border border-[#C10230]/25 rounded-full text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#C10230]">
                      GRAND OPENING VOUCHER
                    </span>
                    <h3 className="font-display text-[26px] sm:text-[30px] leading-[0.98] text-[#382F2D] uppercase">
                      {wonPrize.segment.label}
                    </h3>
                  </div>

                  {/* Cleanly Proportioned Gong cha Logo Seal */}
                  <div className="relative w-[34px] h-[45px] shrink-0 mt-0.5">
                    <Image
                      src="/gongcha-logo.png"
                      alt="Gong cha Official Logo"
                      fill
                      sizes="34px"
                      className="object-contain"
                    />
                  </div>
                </div>

                {/* Unique Code & QR Code Verification Section */}
                <div className="bg-[#FAF6F0] rounded-2xl border-[1.8px] border-[#382F2D]/25 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative">
                  {/* Left: Unique Code Details */}
                  <div className="text-left w-full sm:w-auto flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <QrCode className="w-3.5 h-3.5 text-[#C10230]" />
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#382F2D]/60">
                        OFFICIAL VOUCHER CODE
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[22px] sm:text-[24px] font-black tracking-[0.12em] text-[#C10230] select-all leading-none">
                        {wonPrize.uniqueCode}
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="p-1.5 rounded-lg bg-white border border-[#382F2D]/20 text-[#382F2D]/70 hover:text-[#C10230] hover:border-[#C10230]/40 transition-colors cursor-pointer"
                        title="Copy voucher code"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 stroke-[2.2]" />
                        )}
                      </button>
                    </div>

                    <p className="text-[10px] font-semibold text-[#382F2D]/60 mt-1">
                      Scan QR at cashier or mention code
                    </p>
                  </div>

                  {/* Right: High-Contrast QR Code for Cashier Scanner */}
                  <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl border-[1.5px] border-[#382F2D]/20 shadow-[2px_2px_0px_#382F2D]/15 shrink-0">
                    <QRCodeSVG
                      value={wonPrize.uniqueCode}
                      size={88}
                      level="M"
                      fgColor="#382F2D"
                      bgColor="#FFFFFF"
                    />
                    <span className="text-[8px] font-extrabold tracking-widest text-[#382F2D]/50 uppercase mt-1">
                      SCAN FOR POS
                    </span>
                  </div>
                </div>

                {/* Metadata & T&C Details */}
                <div className="mt-3.5 pt-3 border-t border-[#382F2D]/10 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#382F2D]/60">
                    <span>Guest: {user.name}</span>
                    <span>Central Park • UG Floor</span>
                  </div>
                  <p className="text-[11px] font-medium text-[#382F2D]/75 mt-1 leading-relaxed">
                    {wonPrize.segment.tnc}
                  </p>
                </div>
              </div>

              {/* Action Button: Download / Save Voucher */}
              <button
                type="button"
                onClick={handleDownloadVoucher}
                disabled={isSaving}
                className="w-full py-3.5 bg-[#C10230] hover:bg-[#821518] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#382F2D] text-[#FAF8F2] font-display text-[19px] tracking-[0.05em] uppercase rounded-2xl border-[2.5px] border-[#382F2D] shadow-[4px_4px_0px_#382F2D] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {isSaving ? "SAVING VOUCHER..." : "DOWNLOAD TIKET VOUCHER"}
                </span>
              </button>

              {/* Return to Home Button */}
              <button
                type="button"
                onClick={onBack}
                className="w-full py-3 bg-white hover:bg-[#FAF8F2] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#382F2D] text-[#382F2D] font-display text-[16px] tracking-[0.06em] uppercase rounded-2xl border-[2px] border-[#382F2D] shadow-[3px_3px_0px_#382F2D] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4 stroke-[2.4]" />
                <span>RETURN TO HOME</span>
              </button>

              {/* Helpful Helper Text for Screenshot */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#382F2D]/70 pt-0.5">
                <Camera className="w-3.5 h-3.5 text-[#C10230] shrink-0" />
                <span>You can also take a screenshot of this voucher!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
