"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  CameraOff,
  Check,
  X,
  AlertCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  LogOut,
  Search,
  Delete,
  ArrowRight,
  Clock,
  TicketCheck,
  BarChart3,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface HistoryItem {
  id: number;
  code: string;
  prizeName: string;
  guestName: string;
  whatsapp?: string;
  redeemedAt: string;
}

interface ScanResult {
  type: "SUCCESS" | "CHECKED_VALID" | "ALREADY_USED" | "ERROR";
  title: string;
  message: string;
  code?: string;
  prizeName?: string;
  termsConditions?: string;
  guestName?: string;
  whatsapp?: string;
  redeemedAt?: string;
}

export default function CashierPortalPage() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState("");

  // Mode Toggle (Default ON: Instant redeem upon scan)
  const [autoRedeem, setAutoRedeem] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Scanner & Search State
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("");

  // Result Banner & Real-Time History
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [redeemHistory, setRedeemHistory] = useState<HistoryItem[]>([]);
  const [totalRedeemedCount, setTotalRedeemedCount] = useState<number>(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-login from localStorage if remembered
  useEffect(() => {
    const savedPin = localStorage.getItem("gongcha_cashier_pin");
    if (savedPin === "2026") {
      setPin(savedPin);
      setIsAuthenticated(true);
    }
  }, []);

  const verifyPin = (targetPin: string) => {
    if (targetPin === "2026") {
      setIsAuthenticated(true);
      localStorage.setItem("gongcha_cashier_pin", targetPin);
      setPinError("");
    } else {
      setPinError("PIN Kasir tidak sesuai");
      setTimeout(() => setPin(""), 350);
    }
  };

  const handlePinKeyPress = (digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setPinError("");
    if (nextPin.length === 4) {
      verifyPin(nextPin);
    }
  };

  const handlePinBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setPinError("");
  };

  const handleLogout = () => {
    localStorage.removeItem("gongcha_cashier_pin");
    setIsAuthenticated(false);
    setPin("");
    stopScanner();
  };

  // Fetch real-time redeem history from database
  const loadHistory = useCallback(async () => {
    if (!pin) return;
    try {
      setIsLoadingHistory(true);
      const res = await fetch(`/api/cashier?pin=${pin}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.history)) {
          setRedeemHistory(data.history);
        }
        if (typeof data.totalRedeemed === "number") {
          setTotalRedeemedCount(data.totalRedeemed);
        }
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [pin]);

  useEffect(() => {
    if (isAuthenticated) {
      loadHistory();
      const interval = setInterval(loadHistory, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadHistory]);

  // Audio Beep Effects (Success vs Error)
  const playAudioFeedback = (type: "SUCCESS" | "ERROR") => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "SUCCESS") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      }
    } catch {
      // Ignore if audio blocked
    }
  };

  // Format manual code nicely as user types or pastes
  const handleManualInputChange = (val: string) => {
    const raw = val.toUpperCase();
    setManualCode(raw);
  };

  // Process Scanned or Typed Code
  const processVoucherCode = async (
    codeToCheck: string,
    forceRedeem = false
  ) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const code = codeToCheck.trim().toUpperCase();
    if (!code) {
      isProcessingRef.current = false;
      return;
    }

    setIsLoading(true);
    const shouldRedeem = forceRedeem || autoRedeem;

    try {
      const res = await fetch("/api/cashier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          code,
          action: shouldRedeem ? "redeem" : "check",
          autoRedeem: shouldRedeem,
        }),
      });

      const data = await res.json();

      if (res.ok && data.status === "REDEEMED_SUCCESS") {
        playAudioFeedback("SUCCESS");
        setLastScanResult({
          type: "SUCCESS",
          title: "Berhasil Ditukarkan",
          message: "Voucher telah ditandai TERPAKAI di sistem.",
          code: data.voucher.code,
          prizeName: data.voucher.prizeName,
          guestName: data.voucher.guestName,
          whatsapp: data.voucher.whatsapp,
          redeemedAt: data.voucher.redeemedAt,
        });

        setRedeemHistory((prev) => [
          {
            id: data.voucher.id || Date.now(),
            code: data.voucher.code,
            prizeName: data.voucher.prizeName,
            guestName: data.voucher.guestName,
            whatsapp: data.voucher.whatsapp,
            redeemedAt: data.voucher.redeemedAt,
          },
          ...prev.filter((item) => item.code !== data.voucher.code),
        ]);
        setTotalRedeemedCount((prev) => prev + 1);
        setManualCode("");
      } else if (res.ok && data.status === "CHECKED") {
        playAudioFeedback("SUCCESS");
        setLastScanResult({
          type: "CHECKED_VALID",
          title: "Voucher Aktif & Valid",
          message: "Siap ditukarkan. Klik tombol di bawah untuk konfirmasi redeem.",
          code: data.voucher.code,
          prizeName: data.voucher.prizeName,
          termsConditions: data.voucher.termsConditions,
          guestName: data.voucher.guestName,
          whatsapp: data.voucher.whatsapp,
        });
        setManualCode("");
      } else if (res.status === 409 || data.status === "ALREADY_REDEEMED") {
        playAudioFeedback("ERROR");
        setLastScanResult({
          type: "ALREADY_USED",
          title: "Sudah Pernah Digunakan",
          message: data.message || "Voucher ini telah ditukarkan sebelumnya.",
          code: data.voucher?.code || code,
          prizeName: data.voucher?.prizeName,
          guestName: data.voucher?.guestName,
          whatsapp: data.voucher?.whatsapp,
          redeemedAt: data.voucher?.redeemedAt,
        });
      } else {
        playAudioFeedback("ERROR");
        setLastScanResult({
          type: "ERROR",
          title: "Tidak Ditemukan / Tidak Valid",
          message:
            data.error || "Kode voucher tidak terdaftar atau belum diklaim.",
          code,
        });
      }
    } catch (err) {
      console.error(err);
      playAudioFeedback("ERROR");
      setLastScanResult({
        type: "ERROR",
        title: "Gangguan Koneksi",
        message: "Gagal menghubungi server. Periksa koneksi internet perangkat.",
        code,
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1200);
    }
  };

  // Start QR Camera Scanner
  const startScanner = async () => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader");
      }

      setIsScanning(true);

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 20,
          qrbox: { width: 240, height: 240 },
        },
        (decodedText) => {
          processVoucherCode(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error("Camera start error:", err);
      setIsScanning(false);
      alert("Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setIsScanning(false);
  };

  const filteredHistory = redeemHistory.filter((item) => {
    if (!historyFilter.trim()) return true;
    const q = historyFilter.toLowerCase();
    return (
      item.code.toLowerCase().includes(q) ||
      item.guestName.toLowerCase().includes(q) ||
      item.prizeName.toLowerCase().includes(q)
    );
  });

  // =========================================================================
  // PIN GATE VIEW (Clean Neo-Brutalism POS Keypad)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6 bg-[#FAF7F2] text-[#18181B] font-sans antialiased">
        <div className="w-full max-w-[380px] bg-white border-2 border-[#18181B] rounded-2xl p-6 sm:p-7 shadow-[4px_4px_0px_#18181B]">
          {/* Header */}
          <div className="flex items-center gap-3.5 pb-5 mb-6 border-b-2 border-[#18181B]/10">
            <div className="relative w-10 h-11 rounded-xl bg-[#FAF7F2] border-2 border-[#18181B] p-1.5 shrink-0">
              <Image
                src="/gongcha-logo.png"
                alt="Gong cha"
                fill
                className="object-contain p-1"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block px-2 py-0.5 bg-[#FDE047] border border-[#18181B] rounded text-[10px] font-extrabold uppercase tracking-wider">
                  Gong cha POS
                </span>
                <span className="text-xs font-bold text-zinc-500">
                  Central Park UG
                </span>
              </div>
              <h1 className="text-lg font-extrabold text-[#18181B] tracking-tight mt-1">
                Terminal Validasi Voucher
              </h1>
            </div>
          </div>

          {/* PIN Dots Display */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-600">
                Masukkan 4-Digit PIN Kasir
              </label>
              {pinError && (
                <span className="text-xs font-bold text-[#C10230]">
                  {pinError}
                </span>
              )}
            </div>
            <div
              className={`h-13 rounded-xl border-2 border-[#18181B] flex items-center justify-center gap-4 px-4 transition-colors ${
                pinError ? "bg-red-50" : "bg-[#FAF7F2]"
              }`}
            >
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border-2 border-[#18181B] transition-all duration-150 ${
                      filled
                        ? "bg-[#C10230] scale-110"
                        : "bg-white scale-100"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Tactile Neo-Brutalist Keypad */}
          <div className="grid grid-cols-3 gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handlePinKeyPress(digit)}
                className="h-13 rounded-xl bg-white hover:bg-[#FDE047] active:translate-x-[1px] active:translate-y-[1px] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] active:shadow-none text-lg font-extrabold text-[#18181B] transition-all cursor-pointer select-none"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPin("");
                setPinError("");
              }}
              className="h-13 rounded-xl bg-zinc-100 hover:bg-zinc-200 border-2 border-[#18181B] text-xs font-bold text-zinc-700 transition-colors cursor-pointer select-none"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => handlePinKeyPress("0")}
              className="h-13 rounded-xl bg-white hover:bg-[#FDE047] active:translate-x-[1px] active:translate-y-[1px] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] active:shadow-none text-lg font-extrabold text-[#18181B] transition-all cursor-pointer select-none"
            >
              0
            </button>
            <button
              type="button"
              onClick={handlePinBackspace}
              className="h-13 rounded-xl bg-zinc-100 hover:bg-zinc-200 border-2 border-[#18181B] flex items-center justify-center text-[#18181B] transition-colors cursor-pointer select-none"
              aria-label="Hapus"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Hidden keyboard input support for desktop */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyPin(pin);
            }}
            className="sr-only"
          >
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(v);
                if (v.length === 4) verifyPin(v);
              }}
              autoFocus
            />
          </form>
        </div>
      </main>
    );
  }

  // =========================================================================
  // AUTHENTICATED POS WORKSPACE (Clean Neo-Brutalism)
  // =========================================================================
  return (
    <div className="min-h-dvh bg-[#FAF7F2] text-[#18181B] font-sans antialiased flex flex-col">
      {/* Top POS Bar */}
      <header className="sticky top-0 z-30 bg-white border-b-2 border-[#18181B] px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="relative w-8 h-9 rounded-lg bg-[#FAF7F2] border-2 border-[#18181B] p-1 shrink-0">
            <Image
              src="/gongcha-logo.png"
              alt="Gong cha"
              fill
              className="object-contain p-0.5"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-[#18181B] tracking-tight">
                POS Kasir Central Park
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#86EFAC] border border-[#18181B] rounded text-[10px] font-extrabold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#18181B]" />
                Online
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Today/Total Counter Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FEF08A] border-2 border-[#18181B] text-xs font-extrabold text-[#18181B]">
            <TicketCheck className="w-4 h-4 text-[#C10230]" />
            <span>{totalRedeemedCount}</span>
            <span className="hidden xs:inline">terpakai</span>
          </div>

          {/* Link to Admin Dashboard */}
          <Link
            href="/admin"
            className="h-9 px-3 rounded-xl border-2 border-[#18181B] bg-white hover:bg-[#FAF7F2] shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 text-xs font-bold text-[#18181B] transition-all"
            title="Buka Dashboard Analytics & Quota"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#C10230]" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          {/* Audio Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-9 w-9 rounded-xl border-2 border-[#18181B] bg-white hover:bg-[#FAF7F2] shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center text-[#18181B] transition-all cursor-pointer"
            title={soundEnabled ? "Suara Beep Aktif" : "Suara Dimatikan"}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#18181B]" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="h-9 px-3 rounded-xl border-2 border-[#18181B] bg-white hover:bg-red-100 shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 text-xs font-bold text-red-600 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Scanner & Action Deck */}
        <div className="lg:col-span-6 space-y-5">
          {/* Action Result Card */}
          {lastScanResult && (
            <div
              className={`rounded-2xl border-2 border-[#18181B] p-5 shadow-[4px_4px_0px_#18181B] transition-all ${
                lastScanResult.type === "SUCCESS"
                  ? "bg-[#DCFCE7]"
                  : lastScanResult.type === "CHECKED_VALID"
                  ? "bg-[#DBEAFE]"
                  : lastScanResult.type === "ALREADY_USED"
                  ? "bg-[#FEF9C3]"
                  : "bg-[#FEE2E2]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl border-2 border-[#18181B] flex items-center justify-center shrink-0 mt-0.5 ${
                      lastScanResult.type === "SUCCESS"
                        ? "bg-[#86EFAC] text-[#18181B]"
                        : lastScanResult.type === "CHECKED_VALID"
                        ? "bg-[#BFDBFE] text-[#18181B]"
                        : lastScanResult.type === "ALREADY_USED"
                        ? "bg-[#FDE047] text-[#18181B]"
                        : "bg-[#FCA5A5] text-[#18181B]"
                    }`}
                  >
                    {lastScanResult.type === "SUCCESS" ||
                    lastScanResult.type === "CHECKED_VALID" ? (
                      <Check className="w-5 h-5 stroke-[2.8]" />
                    ) : lastScanResult.type === "ALREADY_USED" ? (
                      <AlertCircle className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <X className="w-5 h-5 stroke-[2.8]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-white border border-[#18181B] text-[10px] font-extrabold uppercase tracking-wider text-[#18181B]">
                        {lastScanResult.title}
                      </span>
                    </div>

                    {lastScanResult.prizeName && (
                      <h3 className="text-lg font-extrabold text-[#18181B] mt-1.5 leading-snug">
                        {lastScanResult.prizeName}
                      </h3>
                    )}

                    <p className="text-xs font-semibold text-zinc-700 mt-1 leading-relaxed">
                      {lastScanResult.message}
                    </p>

                    {lastScanResult.code && (
                      <div className="mt-3 pt-3 border-t-2 border-[#18181B]/15 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-extrabold text-[#18181B] bg-white border border-[#18181B] px-2.5 py-1 rounded-md">
                          {lastScanResult.code}
                        </span>
                        {lastScanResult.guestName && (
                          <span className="text-[#18181B] font-bold">
                            {lastScanResult.guestName}
                            {lastScanResult.whatsapp
                              ? ` · ${lastScanResult.whatsapp}`
                              : ""}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Confirm Redeem Button when in "Check First" Mode */}
                    {lastScanResult.type === "CHECKED_VALID" &&
                      lastScanResult.code && (
                        <button
                          type="button"
                          onClick={() =>
                            processVoucherCode(lastScanResult.code!, true)
                          }
                          disabled={isLoading}
                          className="mt-3.5 w-full py-3 px-4 rounded-xl bg-[#86EFAC] hover:brightness-95 text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>Konfirmasi & Gunakan Voucher Sekarang</span>
                        </button>
                      )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLastScanResult(null)}
                  className="w-7 h-7 rounded-lg bg-white border border-[#18181B] flex items-center justify-center text-[#18181B] cursor-pointer"
                  aria-label="Tutup notifikasi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Scanner & Input Card */}
          <div className="bg-white border-2 border-[#18181B] rounded-2xl p-5 sm:p-6 shadow-[4px_4px_0px_#18181B]">
            {/* Segmented Mode Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-5 border-b-2 border-zinc-100">
              <div>
                <h2 className="text-base font-extrabold text-[#18181B]">
                  Mode Pemindaian QR
                </h2>
                <p className="text-xs font-medium text-zinc-500 mt-0.5">
                  {autoRedeem
                    ? "Otomatis potong voucher begitu QR terbaca"
                    : "Periksa status voucher dulu sebelum dipotong"}
                </p>
              </div>

              <div className="inline-flex rounded-xl bg-[#FAF7F2] p-1 border-2 border-[#18181B] shrink-0">
                <button
                  type="button"
                  onClick={() => setAutoRedeem(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    autoRedeem
                      ? "bg-[#FDE047] text-[#18181B] border border-[#18181B]"
                      : "text-zinc-600 hover:text-[#18181B]"
                  }`}
                >
                  Auto-Redeem
                </button>
                <button
                  type="button"
                  onClick={() => setAutoRedeem(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    !autoRedeem
                      ? "bg-[#FDE047] text-[#18181B] border border-[#18181B]"
                      : "text-zinc-600 hover:text-[#18181B]"
                  }`}
                >
                  Cek Dulu
                </button>
              </div>
            </div>

            {/* Camera Viewport */}
            <div className="mb-5">
              <div
                id="reader"
                className={`w-full overflow-hidden rounded-xl border-2 border-[#18181B] bg-zinc-950 ${
                  isScanning ? "block aspect-square max-h-[290px]" : "hidden"
                }`}
              />

              {!isScanning ? (
                <button
                  type="button"
                  onClick={startScanner}
                  className="w-full py-3.5 px-4 bg-[#C10230] hover:bg-[#a30228] active:translate-x-[1px] active:translate-y-[1px] text-white font-extrabold text-sm rounded-xl border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Buka Kamera Scanner QR</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopScanner}
                  className="w-full py-2.5 px-4 mt-3 bg-[#FAF7F2] hover:bg-zinc-200 text-[#18181B] font-extrabold text-xs rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CameraOff className="w-4 h-4" />
                  <span>Matikan Kamera</span>
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="relative flex py-1 items-center mb-5">
              <div className="grow border-t-2 border-zinc-100"></div>
              <span className="shrink mx-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Atau Ketik Kode Manual / Barcode Gun
              </span>
              <div className="grow border-t-2 border-zinc-100"></div>
            </div>

            {/* Manual Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processVoucherCode(manualCode);
              }}
              className="flex gap-2.5"
            >
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => handleManualInputChange(e.target.value)}
                  placeholder="Contoh: GC-XXXX-XXXX"
                  className="w-full h-12 pl-4 pr-9 bg-[#FAF7F2] focus:bg-white border-2 border-[#18181B] rounded-xl font-mono text-sm font-extrabold uppercase tracking-wider text-[#18181B] placeholder:font-sans placeholder:font-medium placeholder:tracking-normal placeholder:text-zinc-400 focus:outline-none transition-colors"
                />
                {manualCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualCode("");
                      inputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#18181B] p-0.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !manualCode.trim()}
                className="h-12 px-5 bg-[#18181B] hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white border-2 border-[#18181B] shadow-[2px_2px_0px_#C10230] disabled:shadow-none rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>{autoRedeem ? "Redeem" : "Cek"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Standby Real-Time History Log */}
        <div className="lg:col-span-6">
          <div className="bg-white border-2 border-[#18181B] rounded-2xl shadow-[4px_4px_0px_#18181B] overflow-hidden flex flex-col">
            {/* History Header */}
            <div className="p-5 border-b-2 border-zinc-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C10230]" />
                <h2 className="text-base font-extrabold text-[#18181B]">
                  Riwayat Penukaran Kasir
                </h2>
                <span className="px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#18181B] text-xs font-bold text-[#18181B]">
                  {redeemHistory.length}
                </span>
              </div>

              <button
                type="button"
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-[#18181B] bg-[#FAF7F2] hover:bg-[#FDE047] text-xs font-bold text-[#18181B] transition-colors cursor-pointer"
              >
                <RotateCcw
                  className={`w-3.5 h-3.5 ${
                    isLoadingHistory ? "animate-spin" : ""
                  }`}
                />
                <span>Segarkan</span>
              </button>
            </div>

            {/* Quick Search in History */}
            {redeemHistory.length > 3 && (
              <div className="px-5 py-3 bg-[#FAF7F2] border-b-2 border-[#18181B]">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value)}
                    placeholder="Cari kode voucher atau nama tamu di riwayat..."
                    className="w-full h-9 pl-9 pr-8 bg-white border-2 border-[#18181B] rounded-xl text-xs font-semibold text-[#18181B] placeholder:text-zinc-400 focus:outline-none"
                  />
                  {historyFilter && (
                    <button
                      type="button"
                      onClick={() => setHistoryFilter("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#18181B]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Ledger Rows */}
            <div className="divide-y divide-zinc-200 max-h-[480px] overflow-y-auto">
              {filteredHistory.length === 0 ? (
                <div className="py-14 px-4 text-center">
                  <p className="text-xs font-semibold text-zinc-500">
                    {historyFilter
                      ? "Tidak ada riwayat yang cocok dengan pencarian."
                      : "Belum ada voucher yang ditukarkan."}
                  </p>
                </div>
              ) : (
                filteredHistory.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="px-5 py-3.5 hover:bg-[#FEF9C3]/60 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-[#18181B] bg-[#FAF7F2] border border-[#18181B] px-2 py-0.5 rounded">
                          {item.code}
                        </span>
                        <span className="text-xs font-extrabold text-[#C10230] truncate">
                          {item.prizeName}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-zinc-600 truncate mt-1">
                        {item.guestName}
                        {item.whatsapp ? ` · ${item.whatsapp}` : ""}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono text-xs font-extrabold text-[#18181B] tabular-nums">
                        {new Date(item.redeemedAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-[11px] font-medium text-zinc-500">
                        {new Date(item.redeemedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
