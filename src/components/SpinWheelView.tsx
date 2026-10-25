"use client";

import React, { useState, useRef, useEffect } from "react";
import confetti from "canvas-confetti";
import { Download, Camera, ArrowLeft, Home, X } from "lucide-react";
import { toPng } from "html-to-image";

export interface PrizeSegment {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  textColor: string;
  codePrefix: string;
  tnc: string;
}

// Fallback jika API sedang offline / awal loading
const DEFAULT_PRIZE_SEGMENTS: PrizeSegment[] = [
  {
    id: "FREE_PMT",
    label: "FREE PEARL MILK TEA",
    shortLabel: "FREE DRINK",
    color: "#C8202F",
    textColor: "#F5F2E8",
    codePrefix: "GC-PMT",
    tnc: "Valid for 1 Regular Pearl Milk Tea. Valid only at Gong Cha Central Park (UG Floor).",
  },
  {
    id: "BOGO",
    label: "BUY 1 GET 1 FREE",
    shortLabel: "BUY 1 GET 1",
    color: "#F5F2E8",
    textColor: "#111111",
    codePrefix: "GC-BOGO",
    tnc: "Buy any Large drink and get 1 Regular free. Valid only at Gong Cha Central Park (UG Floor).",
  },
  {
    id: "DISC_50",
    label: "50% OFF SECOND CUP",
    shortLabel: "50% OFF",
    color: "#F39C12",
    textColor: "#111111",
    codePrefix: "GC-50OFF",
    tnc: "50% discount on second cup in single receipt. Valid only at Gong Cha Central Park (UG Floor).",
  },
  {
    id: "FREE_UPSIZE",
    label: "FREE LARGE UPSIZE",
    shortLabel: "FREE UPSIZE",
    color: "#F5F2E8",
    textColor: "#111111",
    codePrefix: "GC-UPSZ",
    tnc: "Free upgrade from Regular to Large. Valid only at Gong Cha Central Park (UG Floor).",
  },
  {
    id: "VOUCHER_15K",
    label: "IDR 15K CASHBACK",
    shortLabel: "IDR 15K OFF",
    color: "#C8202F",
    textColor: "#F5F2E8",
    codePrefix: "GC-15K",
    tnc: "IDR 15,000 off min purchase IDR 50,000. Valid only at Gong Cha Central Park (UG Floor).",
  },
  {
    id: "FREE_TOPPING",
    label: "FREE TOPPING",
    shortLabel: "FREE TOPPING",
    color: "#F39C12",
    textColor: "#111111",
    codePrefix: "GC-TOP",
    tnc: "Free Pearl or Milk Foam topping. Valid only at Gong Cha Central Park (UG Floor).",
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

  const spinCountRef = useRef(0);
  const voucherCardRef = useRef<HTMLDivElement>(null);

  // Fetch prizes from Database via API
  useEffect(() => {
    async function loadPrizesFromDB() {
      try {
        const res = await fetch("/api/prizes");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.prizes) && data.prizes.length > 0) {
            setPrizes(data.prizes);
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
    if (isSpinning || wonPrize) return;

    setIsSpinning(true);

    try {
      // 1. Call real backend API if userId is present
      let serverVoucher = null;
      let targetPrizeIndex = -1;

      if (user.userId) {
        const res = await fetch("/api/spin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.userId }),
        });

        const data = await res.json();
        if (res.ok && data.voucher) {
          serverVoucher = data.voucher;
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

      const targetSliceCenter = winningIndex * segmentAngle;
      const randomOffset = (Math.random() - 0.5) * (segmentAngle * 0.5);
      const fullSpins = (spinCountRef.current + 1) * 6 * 360;
      const finalAngle = fullSpins + (360 - targetSliceCenter) + randomOffset;

      spinCountRef.current += 1;
      setRotation(finalAngle);

      const chosenSegment = prizes[winningIndex];
      const finalCode =
        serverVoucher?.uniqueCode ||
        `${chosenSegment.codePrefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Update T&C and Label from database if returned by server
      const updatedSegment: PrizeSegment = {
        ...chosenSegment,
        label: serverVoucher?.prizeName || chosenSegment.label,
        tnc: serverVoucher?.termsConditions || chosenSegment.tnc,
      };

      setTimeout(() => {
        setIsSpinning(false);
        setWonPrize({
          segment: updatedSegment,
          uniqueCode: finalCode,
        });

        confetti({
          particleCount: 65,
          spread: 60,
          origin: { y: 0.5 },
          colors: ["#C8202F", "#F39C12", "#111111", "#F5F2E8"],
        });
      }, 4700);
    } catch (err) {
      console.error(err);
      alert("Something went wrong while spinning.");
      setIsSpinning(false);
    }
  };

  const handleDownloadVoucher = async () => {
    if (!voucherCardRef.current || isSaving) return;
    try {
      setIsSaving(true);
      const dataUrl = await toPng(voucherCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#FFFFFF",
      });

      const fileName = `GongCha-Voucher-${wonPrize?.uniqueCode || "Reward"}.png`;

      // 1. Try Web Share API (native iOS "Save Image" / Files sheet)
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], fileName, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "Gong Cha Central Park Voucher",
              text: `My exclusive voucher: ${wonPrize?.uniqueCode}`,
            });
            setIsSaving(false);
            return;
          }
        } catch (shareErr) {
          // If user cancelled sharing sheet, just exit gracefully
          if ((shareErr as Error).name === "AbortError") {
            setIsSaving(false);
            return;
          }
        }
      }

      // 2. Fallback: Trigger standard anchor download
      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download image", err);
      alert("Please take a screenshot of this voucher card to present at the cashier.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[380px] lg:max-w-full flex-1 flex flex-col items-center justify-between py-1 px-1 select-none">
      {/* 1. Header Area with compact spacing */}
      <header className="w-full text-center flex flex-col items-center relative mb-2">
        {!isSpinning && (
          <button
            type="button"
            onClick={onBack}
            className="absolute left-0 top-0.5 w-8 h-8 rounded-full border-[2px] border-[#111111] flex items-center justify-center bg-[#FAF8F2] hover:bg-[#111111] hover:text-[#F5F2E8] active:translate-y-0.5 cursor-pointer shadow-[2px_2px_0px_#111111] transition-colors"
            aria-label={wonPrize ? "Return to Home" : "Back"}
            title={wonPrize ? "Return to Home" : "Back"}
          >
            {wonPrize ? (
              <X className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        )}

        <p className="text-[11px] lg:text-[12px] font-extrabold tracking-[0.2em] uppercase text-[#111111] mb-0.5">
          GONG CHA • <span className="text-[#C8202F]">CENTRAL PARK</span>
        </p>
        <h1
          className={`font-display uppercase text-[#111111] transition-all duration-300 leading-[0.88] ${
            wonPrize ? "text-[38px] lg:text-[46px]" : "text-[52px] sm:text-[56px] lg:text-[62px]"
          }`}
        >
          {wonPrize ? "VOUCHER UNLOCKED!" : "SPIN TO WIN"}
        </h1>
        <p className="text-[12px] lg:text-[13px] font-bold text-[#111111]/75 mt-1">
          {wonPrize
            ? `Congrats, ${user.name.split(" ")[0]}! Present your voucher at the cashier.`
            : `Hi ${user.name.split(" ")[0]}, tap spin to reveal your exclusive prize!`}
        </p>
      </header>

      {/* Responsive Layout Body: Mobile is vertical stack, Desktop (lg:) is 2 columns (Left: Wheel, Right: Action/Voucher) */}
      <div className="w-full flex flex-col lg:grid lg:grid-cols-12 lg:gap-8 lg:items-center">

        {/* Column Left (Desktop): Wheel Container */}
        <div className="w-full lg:col-span-6 flex flex-col items-center justify-center">
          <div
            className={`relative flex items-center justify-center transition-all duration-300 ${
              wonPrize
                ? "my-1 scale-[0.74] sm:scale-[0.82] lg:scale-100 origin-top"
                : "my-2.5 scale-100"
            }`}
          >
            {/* Top Pointer */}
            <div className="absolute -top-3.5 z-30 drop-shadow-[0_2px_0_#111111]">
              <svg width="32" height="34" viewBox="0 0 36 38" fill="none">
                <path
                  d="M18 36L3 6C1.8 3.6 3.5 1 6.2 1H29.8C32.5 1 34.2 3.6 33 6L18 36Z"
                  fill="#C8202F"
                  stroke="#111111"
                  strokeWidth="3"
                />
                <circle cx="18" cy="11" r="3.5" fill="#F5F2E8" stroke="#111111" strokeWidth="2" />
              </svg>
            </div>

            {/* Outer Rim */}
            <div className="w-[285px] h-[285px] sm:w-[310px] sm:h-[310px] lg:w-[330px] lg:h-[330px] rounded-full bg-[#111111] p-2 shadow-[5px_5px_0px_#111111] relative flex items-center justify-center">
              <div
                className="w-full h-full rounded-full overflow-hidden border-[2.5px] border-[#F5F2E8] relative"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning
                    ? "transform 4.7s cubic-bezier(0.14, 0.85, 0.18, 1)"
                    : "none",
                }}
              >
                <svg viewBox="0 0 300 300" className="w-full h-full">
                  {prizes.map((seg, idx) => {
                    const total = prizes.length;
                    const angle = 360 / total;
                    const startAngle = idx * angle - 90 - angle / 2;
                    const endAngle = startAngle + angle;

                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;

                    const x1 = 150 + 150 * Math.cos(startRad);
                    const y1 = 150 + 150 * Math.sin(startRad);
                    const x2 = 150 + 150 * Math.cos(endRad);
                    const y2 = 150 + 150 * Math.sin(endRad);

                    const pathData = `M 150 150 L ${x1} ${y1} A 150 150 0 0 1 ${x2} ${y2} Z`;
                    const textRotation = idx * angle;

                    return (
                      <g key={seg.id}>
                        <path
                          d={pathData}
                          fill={seg.color}
                          stroke="#111111"
                          strokeWidth="3"
                        />
                        <g transform={`translate(150, 150) rotate(${textRotation})`}>
                          <text
                            x="0"
                            y="-90"
                            fill={seg.textColor}
                            textAnchor="middle"
                            className="font-display text-[15px] tracking-wider uppercase"
                            style={{ fontFamily: "var(--font-anton), sans-serif" }}
                          >
                            {seg.shortLabel}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Center Hub */}
              <div className="absolute w-14 h-14 rounded-full bg-[#F5F2E8] border-[2.5px] border-[#111111] shadow-[2px_2px_0px_#111111] flex flex-col items-center justify-center z-20">
                <div className="w-9 h-9 rounded-full bg-[#C8202F] border-2 border-[#111111] flex items-center justify-center">
                  <span className="font-display text-[10px] text-[#F5F2E8] tracking-wider leading-none text-center">
                    GONG
                    <br />
                    CHA
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column Right (Desktop): Spin Action or Claim Voucher Card */}
        <div className="w-full lg:col-span-6 flex flex-col items-center mt-1 lg:mt-0">
          {!wonPrize ? (
            <div className="w-full flex flex-col items-center space-y-4">
              <div className="hidden lg:block w-full bg-white/70 border-2 border-[#111111] rounded-2xl p-5 shadow-[4px_4px_0px_#111111] text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#C8202F]">
                  READY TO SPIN
                </span>
                <h3 className="font-display text-[26px] uppercase text-[#111111] leading-tight mt-1">
                  TRY YOUR LUCK NOW!
                </h3>
                <p className="text-xs font-semibold text-[#111111]/70 mt-1 leading-relaxed">
                  Every spin is guaranteed to win an exclusive Gong Cha Grand Opening voucher. Valid for dine-in & takeaway.
                </p>
              </div>

              <button
                type="button"
                disabled={isSpinning}
                onClick={handleSpin}
                className="w-full py-4 bg-[#C8202F] hover:bg-[#A81926] disabled:opacity-60 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#111111] text-[#F5F2E8] font-display text-[24px] tracking-[0.06em] uppercase rounded-2xl border-[2.5px] border-[#111111] shadow-[4px_4px_0px_#111111] transition-all cursor-pointer touch-manipulation"
              >
                {isSpinning ? "SPINNING..." : "SPIN THE WHEEL"}
              </button>
            </div>
          ) : (
            /* Won Voucher Card Presentation */
            <div className="w-full flex flex-col items-center space-y-3">
              {/* The Downloadable Card */}
              <div
                ref={voucherCardRef}
                className="w-full bg-white rounded-2xl border-[2.5px] border-[#111111] shadow-[5px_5px_0px_#111111] p-5 text-left relative overflow-hidden"
              >
                {/* Top Meta */}
                <div className="flex items-center justify-between border-b-2 border-dashed border-[#111111]/20 pb-2 mb-2.5">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#C8202F]">
                      EXCLUSIVE VOUCHER REWARD
                    </span>
                    <h3 className="font-display text-[26px] leading-[0.95] text-[#111111] uppercase mt-0.5">
                      {wonPrize.segment.label}
                    </h3>
                  </div>
                </div>

                {/* Unique Code Box */}
                <div className="bg-[#FAF5EB] rounded-xl border-2 border-[#111111] p-3 text-center my-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#111111]/60">
                    UNIQUE VOUCHER CODE
                  </p>
                  <p className="font-mono text-[22px] font-black tracking-widest text-[#111111] mt-0.5 select-all">
                    {wonPrize.uniqueCode}
                  </p>
                </div>

                {/* T&C Details */}
                <p className="text-[11px] font-semibold text-[#111111]/80 mt-2 leading-tight">
                  {wonPrize.segment.tnc}
                </p>
              </div>

              {/* Action Button: Download / Save Voucher */}
              <button
                type="button"
                onClick={handleDownloadVoucher}
                disabled={isSaving}
                className="w-full py-3.5 bg-[#111111] hover:bg-[#222222] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#C8202F] text-[#F5F2E8] font-display text-[18px] tracking-[0.05em] uppercase rounded-xl border-2 border-[#111111] shadow-[3px_3px_0px_#111111] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>{isSaving ? "SAVING VOUCHER..." : "SAVE / DOWNLOAD VOUCHER"}</span>
              </button>

              {/* Return to Home Button */}
              <button
                type="button"
                onClick={onBack}
                className="w-full py-3 bg-[#FAF8F2] hover:bg-[#EDE8D8] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#111111] text-[#111111] font-display text-[16px] tracking-[0.06em] uppercase rounded-xl border-[2px] border-[#111111] shadow-[3px_3px_0px_#111111] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4 stroke-[2.5]" />
                <span>RETURN TO HOME</span>
              </button>

              {/* Helpful Helper Text for Screenshot */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#111111]/70">
                <Camera className="w-3.5 h-3.5 text-[#C8202F] shrink-0" />
                <span>You can also take a screenshot of this voucher!</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
