"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
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
  // PIN GATE VIEW (Clean POS Keypad)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4 bg-[#F4F2EE] text-[#1C1917] font-sans antialiased">
        <div className="w-full max-w-[360px] bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-7 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-3 pb-5 mb-6 border-b border-stone-100">
            <div className="relative w-8 h-10 shrink-0">
              <Image
                src="/gongcha-logo.png"
                alt="Gong cha"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold tracking-tight text-[#C10230]">
                  Gong cha POS
                </span>
                <span className="text-stone-300">•</span>
                <span className="text-xs font-medium text-stone-500">
                  Central Park UG
                </span>
              </div>
              <h1 className="text-base font-semibold text-stone-900 tracking-tight">
                Terminal Validasi Voucher
              </h1>
            </div>
          </div>

          {/* PIN Dots Display */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-stone-500">
                Masukkan 4-Digit PIN Kasir
              </label>
              {pinError && (
                <span className="text-xs font-medium text-[#C10230]">
                  {pinError}
                </span>
              )}
            </div>
            <div
              className={`h-13 rounded-xl border flex items-center justify-center gap-4 px-4 transition-colors ${
                pinError
                  ? "border-red-300 bg-red-50/40"
                  : "border-stone-200 bg-stone-50/70"
              }`}
            >
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3 h-3 rounded-full transition-all duration-150 ${
                      filled
                        ? "bg-[#C10230] scale-110"
                        : "bg-stone-300 scale-100"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Tactile Keypad */}
          <div className="grid grid-cols-3 gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handlePinKeyPress(digit)}
                className="h-13 rounded-xl bg-stone-50 hover:bg-stone-100 active:bg-stone-200/80 border border-stone-200/70 text-lg font-semibold text-stone-800 transition-colors cursor-pointer select-none"
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
              className="h-13 rounded-xl bg-stone-50 hover:bg-stone-100 active:bg-stone-200/80 border border-stone-200/70 text-xs font-medium text-stone-500 transition-colors cursor-pointer select-none"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => handlePinKeyPress("0")}
              className="h-13 rounded-xl bg-stone-50 hover:bg-stone-100 active:bg-stone-200/80 border border-stone-200/70 text-lg font-semibold text-stone-800 transition-colors cursor-pointer select-none"
            >
              0
            </button>
            <button
              type="button"
              onClick={handlePinBackspace}
              className="h-13 rounded-xl bg-stone-50 hover:bg-stone-100 active:bg-stone-200/80 border border-stone-200/70 flex items-center justify-center text-stone-600 transition-colors cursor-pointer select-none"
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
  // AUTHENTICATED POS WORKSPACE
  // =========================================================================
  return (
    <div className="min-h-dvh bg-[#F4F2EE] text-[#1C1917] font-sans antialiased flex flex-col">
      {/* Top POS Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-stone-200/90 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-6 h-8 shrink-0">
            <Image
              src="/gongcha-logo.png"
              alt="Gong cha"
              fill
              className="object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-stone-900 tracking-tight">
              Kasir Central Park
            </span>
            <span className="hidden sm:inline-block text-stone-300">/</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-stone-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Grand Opening Voucher POS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Today/Total Counter Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 text-xs font-medium text-stone-700">
            <TicketCheck className="w-3.5 h-3.5 text-[#C10230]" />
            <span>{totalRedeemedCount}</span>
            <span className="hidden xs:inline text-stone-500">terpakai</span>
          </div>

          {/* Audio Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 w-8 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
            title={soundEnabled ? "Suara Beep Aktif" : "Suara Dimatikan"}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-stone-700" />
            ) : (
              <VolumeX className="w-4 h-4 text-stone-400" />
            )}
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="h-8 px-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-3.5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* LEFT COLUMN: Scanner & Action Deck */}
        <div className="lg:col-span-6 space-y-4">
          {/* Action Result Card (Placed right at the top when triggered so cashier never misses it) */}
          {lastScanResult && (
            <div
              className={`rounded-xl border p-4 bg-white shadow-xs transition-all ${
                lastScanResult.type === "SUCCESS"
                  ? "border-emerald-200 border-l-4 border-l-emerald-600"
                  : lastScanResult.type === "CHECKED_VALID"
                  ? "border-blue-200 border-l-4 border-l-blue-600"
                  : lastScanResult.type === "ALREADY_USED"
                  ? "border-amber-200 border-l-4 border-l-amber-500"
                  : "border-red-200 border-l-4 border-l-red-600"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      lastScanResult.type === "SUCCESS"
                        ? "bg-emerald-50 text-emerald-600"
                        : lastScanResult.type === "CHECKED_VALID"
                        ? "bg-blue-50 text-blue-600"
                        : lastScanResult.type === "ALREADY_USED"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {lastScanResult.type === "SUCCESS" ||
                    lastScanResult.type === "CHECKED_VALID" ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : lastScanResult.type === "ALREADY_USED" ? (
                      <AlertCircle className="w-4 h-4 stroke-[2.2]" />
                    ) : (
                      <X className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider ${
                          lastScanResult.type === "SUCCESS"
                            ? "text-emerald-700"
                            : lastScanResult.type === "CHECKED_VALID"
                            ? "text-blue-700"
                            : lastScanResult.type === "ALREADY_USED"
                            ? "text-amber-700"
                            : "text-red-700"
                        }`}
                      >
                        {lastScanResult.title}
                      </span>
                    </div>

                    {lastScanResult.prizeName && (
                      <h3 className="text-base font-bold text-stone-900 mt-0.5 leading-snug">
                        {lastScanResult.prizeName}
                      </h3>
                    )}

                    <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                      {lastScanResult.message}
                    </p>

                    {lastScanResult.code && (
                      <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
                          {lastScanResult.code}
                        </span>
                        {lastScanResult.guestName && (
                          <span className="text-stone-500 font-medium">
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
                          className="mt-3 w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Konfirmasi & Gunakan Voucher Sekarang</span>
                        </button>
                      )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLastScanResult(null)}
                  className="text-stone-400 hover:text-stone-600 p-1 rounded-md cursor-pointer"
                  aria-label="Tutup notifikasi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Scanner & Input Card */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
            {/* Segmented Mode Selector */}
            <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-stone-100">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">
                  Mode Pemindaian
                </h2>
                <p className="text-xs text-stone-500">
                  {autoRedeem
                    ? "Otomatis potong voucher begitu QR terbaca"
                    : "Periksa status voucher dulu sebelum dipotong"}
                </p>
              </div>

              <div className="inline-flex rounded-lg bg-stone-100 p-0.5 border border-stone-200/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setAutoRedeem(true)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    autoRedeem
                      ? "bg-white text-stone-900 shadow-2xs"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  Auto-Redeem
                </button>
                <button
                  type="button"
                  onClick={() => setAutoRedeem(false)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    !autoRedeem
                      ? "bg-white text-stone-900 shadow-2xs"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  Cek Dulu
                </button>
              </div>
            </div>

            {/* Camera Viewport */}
            <div className="mb-4">
              <div
                id="reader"
                className={`w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-950 ${
                  isScanning ? "block aspect-square max-h-[290px]" : "hidden"
                }`}
              />

              {!isScanning ? (
                <button
                  type="button"
                  onClick={startScanner}
                  className="w-full py-3.5 px-4 bg-[#C10230] hover:bg-[#a30228] active:bg-[#8b0222] text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>Buka Kamera Scanner QR</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopScanner}
                  className="w-full py-2.5 px-4 mt-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Matikan Kamera</span>
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="relative flex py-1 items-center mb-4">
              <div className="grow border-t border-stone-100"></div>
              <span className="shrink mx-3 text-[11px] font-medium text-stone-400 uppercase tracking-wider">
                Atau Input Kode Manual / Barcode Gun
              </span>
              <div className="grow border-t border-stone-100"></div>
            </div>

            {/* Manual Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processVoucherCode(manualCode);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => handleManualInputChange(e.target.value)}
                  placeholder="Contoh: GC-XXXX-XXXX"
                  className="w-full h-11 pl-3.5 pr-8 bg-stone-50 focus:bg-white border border-stone-200 focus:border-stone-400 rounded-xl font-mono text-sm font-semibold uppercase tracking-wider text-stone-900 placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-stone-400 focus:outline-none transition-colors"
                />
                {manualCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualCode("");
                      inputRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !manualCode.trim()}
                className="h-11 px-4 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-xl text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>{autoRedeem ? "Redeem" : "Cek"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Standby Real-Time History Log */}
        <div className="lg:col-span-6">
          <div className="bg-white border border-stone-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col">
            {/* History Header */}
            <div className="p-4 sm:px-5 border-b border-stone-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-400" />
                <h2 className="text-sm font-semibold text-stone-900">
                  Riwayat Penukaran
                </h2>
                <span className="text-xs font-medium text-stone-400">
                  ({redeemHistory.length} terbaru)
                </span>
              </div>

              <button
                type="button"
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-stone-50 text-xs font-medium text-stone-600 transition-colors cursor-pointer"
              >
                <RotateCcw
                  className={`w-3 h-3 ${isLoadingHistory ? "animate-spin" : ""}`}
                />
                <span>Segarkan</span>
              </button>
            </div>

            {/* Quick Search in History */}
            {redeemHistory.length > 3 && (
              <div className="px-4 sm:px-5 py-2.5 bg-stone-50/60 border-b border-stone-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value)}
                    placeholder="Cari kode atau nama tamu di riwayat..."
                    className="w-full h-8 pl-8 pr-7 bg-white border border-stone-200/80 rounded-lg text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
                  />
                  {historyFilter && (
                    <button
                      type="button"
                      onClick={() => setHistoryFilter("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Ledger Rows */}
            <div className="divide-y divide-stone-100 max-h-[460px] overflow-y-auto">
              {filteredHistory.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <p className="text-xs font-medium text-stone-400">
                    {historyFilter
                      ? "Tidak ada riwayat yang cocok dengan pencarian."
                      : "Belum ada voucher yang ditukarkan."}
                  </p>
                </div>
              ) : (
                filteredHistory.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="px-4 sm:px-5 py-3 hover:bg-stone-50/70 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded">
                          {item.code}
                        </span>
                        <span className="text-xs font-semibold text-[#C10230] truncate">
                          {item.prizeName}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 truncate mt-1">
                        {item.guestName}
                        {item.whatsapp ? ` · ${item.whatsapp}` : ""}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono text-xs font-medium text-stone-700 tabular-nums">
                        {new Date(item.redeemedAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-[11px] text-stone-400">
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
