"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Zap,
  Clock,
  History,
  Check,
  User,
  Phone,
  Gift,
  Volume2,
  VolumeX,
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
  type: "SUCCESS" | "ALREADY_USED" | "ERROR";
  title: string;
  message: string;
  code?: string;
  prizeName?: string;
  guestName?: string;
  redeemedAt?: string;
}

export default function CashierPortalPage() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState("");

  // Auto-Redeem Mode Toggle (Default ON: Instant redeem upon scan)
  const [autoRedeem, setAutoRedeem] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Scanner & Search State
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Result Banner & Real-Time History
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [redeemHistory, setRedeemHistory] = useState<HistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // Auto-login from localStorage if remembered
  useEffect(() => {
    const savedPin = localStorage.getItem("gongcha_cashier_pin");
    if (savedPin) {
      setPin(savedPin);
      setIsAuthenticated(true);
    }
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      setPinError("Masukkan 4 digit PIN Kasir");
      return;
    }
    if (pin === "2026") {
      setIsAuthenticated(true);
      localStorage.setItem("gongcha_cashier_pin", pin);
      setPinError("");
    } else {
      setPinError("PIN Kasir Salah");
    }
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
      // Auto-poll history every 10 seconds so multi-cashiers stay in sync
      const interval = setInterval(loadHistory, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadHistory]);

  // Audio Beep Effects (Success vs Error)
  const playAudioFeedback = (type: "SUCCESS" | "ERROR") => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "SUCCESS") {
        // High joyful double beep
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08); // D6
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else {
        // Low alert buzz
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio context blocked
    }
  };

  // Process Scanned Code with Auto-Redeem
  const processVoucherCode = async (codeToCheck: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const code = codeToCheck.trim().toUpperCase();
    if (!code) {
      isProcessingRef.current = false;
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/cashier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          code,
          action: autoRedeem ? "redeem" : "check",
          autoRedeem,
        }),
      });

      const data = await res.json();

      if (res.ok && data.status === "REDEEMED_SUCCESS") {
        // SUCCESSFUL INSTANT REDEEM
        playAudioFeedback("SUCCESS");
        setLastScanResult({
          type: "SUCCESS",
          title: "VOUCHER BERHASIL DI-REDEEM!",
          message: "Status voucher otomatis ditandai TERPAKAI di database.",
          code: data.voucher.code,
          prizeName: data.voucher.prizeName,
          guestName: data.voucher.guestName,
          redeemedAt: data.voucher.redeemedAt,
        });

        // Prepend to history table immediately
        setRedeemHistory((prev) => [
          {
            id: data.voucher.id || Date.now(),
            code: data.voucher.code,
            prizeName: data.voucher.prizeName,
            guestName: data.voucher.guestName,
            whatsapp: data.voucher.whatsapp,
            redeemedAt: data.voucher.redeemedAt,
          },
          ...prev,
        ]);
        setManualCode("");
      } else if (res.status === 409 || data.status === "ALREADY_REDEEMED") {
        // ALREADY REDEEMED ALERT
        playAudioFeedback("ERROR");
        setLastScanResult({
          type: "ALREADY_USED",
          title: "PERINGATAN: VOUCHER SUDAH PERNAH DIGUNAKAN!",
          message: data.message || "Voucher ini sudah ditukarkan sebelumnya.",
          code: data.voucher?.code || code,
          prizeName: data.voucher?.prizeName,
          guestName: data.voucher?.guestName,
          redeemedAt: data.voucher?.redeemedAt,
        });
      } else {
        // NOT FOUND / INVALID
        playAudioFeedback("ERROR");
        setLastScanResult({
          type: "ERROR",
          title: "VOUCHER TIDAK VALID",
          message: data.error || "Kode voucher tidak ditemukan dalam database.",
          code,
        });
      }
    } catch (err) {
      console.error(err);
      playAudioFeedback("ERROR");
      setLastScanResult({
        type: "ERROR",
        title: "KONEKSI GAGAL",
        message: "Periksa sambungan internet kasir.",
        code,
      });
    } finally {
      setIsLoading(false);
      // Cooldown delay of 1.2s before accepting next camera frame to prevent accidental double-reads
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1200);
    }
  };

  // Start QR Camera Scanner (Continuous Stream Mode)
  const startScanner = async () => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader");
      }

      setIsScanning(true);

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 20, // 20 frames/sec for rapid recognition
          qrbox: { width: 260, height: 260 },
        },
        (decodedText) => {
          // Continuous scanning: don't close camera, instantly process!
          processVoucherCode(decodedText);
        },
        () => {
          // Frame read pass
        }
      );
    } catch (err) {
      console.error("Camera start error:", err);
      setIsScanning(false);
      alert("Tidak dapat mengakses kamera. Pastikan izin kamera aktif.");
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

  // If not authenticated, show PIN Login Gate
  if (!isAuthenticated) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4 bg-[#F6F1E6] text-[#382F2D] selection:bg-[#F1D09F]">
        <div className="w-full max-w-[390px] bg-[#FAF8F2] border-[3px] border-[#382F2D] rounded-[28px] p-7 shadow-[6px_6px_0px_#382F2D] text-center">
          <div className="relative w-[48px] h-[64px] mx-auto mb-3">
            <Image
              src="/gongcha-logo.png"
              alt="Gong cha Official Logo"
              fill
              className="object-contain"
            />
          </div>

          <span className="inline-block px-3 py-0.5 mb-2 bg-[#F5DADF] border border-[#C10230]/30 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-[#C10230]">
            OUTLET KASIR • CENTRAL PARK
          </span>

          <h1 className="font-display text-[28px] uppercase text-[#382F2D] leading-tight">
            KASIR AUTO-SCANNER
          </h1>
          <p className="text-xs text-[#382F2D]/70 mt-1 mb-5">
            Masukkan PIN Kasir untuk mengaktifkan scanner tiket grand opening.
          </p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setPinError("");
              }}
              placeholder="PIN Kasir (2026)"
              className="w-full py-3.5 px-4 text-center text-[22px] tracking-[0.3em] font-mono font-bold bg-white border-[2px] border-[#382F2D] rounded-2xl shadow-[3px_3px_0px_#382F2D] focus:outline-none focus:border-[#C10230]"
            />

            {pinError && (
              <p className="text-xs font-semibold text-[#C10230]">{pinError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#C10230] hover:bg-[#821518] text-[#FAF8F2] font-display text-[18px] tracking-wide uppercase rounded-2xl border-[2.5px] border-[#382F2D] shadow-[4px_4px_0px_#382F2D] cursor-pointer transition-all active:translate-x-[2px] active:translate-y-[2px]"
            >
              MASUK KE TERMINAL KASIR
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-start p-3 sm:p-6 bg-[#F6F1E6] text-[#382F2D] selection:bg-[#F1D09F]">
      <div className="w-full max-w-[620px] flex flex-col items-center">
        {/* Top Header Bar */}
        <header className="w-full flex items-center justify-between py-2 mb-3 border-b-[2px] border-[#382F2D]/20">
          <div className="flex items-center gap-2.5">
            <div className="relative w-[32px] h-[42px]">
              <Image
                src="/gongcha-logo.png"
                alt="Gong cha Logo"
                fill
                className="object-contain"
              />
            </div>
            <div className="text-left">
              <h1 className="font-display text-[19px] uppercase leading-none text-[#382F2D]">
                KASIR • CENTRAL PARK
              </h1>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#C10230] mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                AUTO-REDEEM ACTIVE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-white border-[1.8px] border-[#382F2D] text-[#382F2D] cursor-pointer shadow-[1.5px_1.5px_0px_#382F2D]"
              title={soundEnabled ? "Suara Aktif" : "Suara Senyap"}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#382F2D]/50" />
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-full bg-white border-[1.8px] border-[#382F2D] text-[11px] font-bold text-[#382F2D] hover:bg-[#382F2D] hover:text-white cursor-pointer shadow-[1.5px_1.5px_0px_#382F2D]"
            >
              Keluar
            </button>
          </div>
        </header>

        {/* Scanner Terminal Card */}
        <div className="w-full bg-[#FAF8F2] border-[2.5px] border-[#382F2D] rounded-[24px] p-4 sm:p-5 shadow-[4px_4px_0px_#382F2D] mb-4 text-center">
          {/* Mode Switch & Controls */}
          <div className="flex items-center justify-between gap-2 mb-3 bg-white p-2.5 rounded-2xl border-[1.8px] border-[#382F2D]/20">
            <div className="flex items-center gap-2 text-left">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                  autoRedeem
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                    : "bg-gray-100 border-gray-400 text-gray-600"
                }`}
              >
                <Zap className="w-4 h-4 stroke-[2.4]" />
              </div>
              <div>
                <p className="text-[12px] font-extrabold uppercase leading-none text-[#382F2D]">
                  Mode Auto-Redeem
                </p>
                <p className="text-[10px] text-[#382F2D]/60 mt-0.5">
                  {autoRedeem
                    ? "Otomatis redeem & tandai terpakai saat scan"
                    : "Cek data dulu sebelum redeem"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAutoRedeem(!autoRedeem)}
              className={`px-3 py-1.5 rounded-full font-display text-[12px] uppercase border-[1.8px] border-[#382F2D] cursor-pointer transition-colors shadow-[1.5px_1.5px_0px_#382F2D] ${
                autoRedeem
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-200 text-[#382F2D]"
              }`}
            >
              {autoRedeem ? "ON" : "OFF"}
            </button>
          </div>

          {/* Camera Viewport */}
          <div className="relative mb-3">
            <div
              id="reader"
              className={`w-full overflow-hidden rounded-2xl border-[2.5px] border-[#382F2D] bg-black ${
                isScanning ? "block aspect-square max-h-[300px]" : "hidden"
              }`}
            />

            {!isScanning ? (
              <button
                type="button"
                onClick={startScanner}
                className="w-full py-4 bg-[#C10230] hover:bg-[#821518] text-[#FAF8F2] font-display text-[18px] sm:text-[20px] tracking-wide uppercase rounded-2xl border-[2.5px] border-[#382F2D] shadow-[4px_4px_0px_#382F2D] transition-all cursor-pointer flex items-center justify-center gap-2.5 active:translate-x-[2px] active:translate-y-[2px]"
              >
                <Camera className="w-5 h-5 stroke-[2.2]" />
                <span>AKTIFKAN KAMERA SCANNER</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopScanner}
                className="w-full py-3 bg-[#382F2D] hover:bg-black text-[#FAF8F2] font-display text-[15px] tracking-wide uppercase rounded-xl border-[2px] border-[#382F2D] cursor-pointer mt-2"
              >
                TUTUP KAMERA SCANNER
              </button>
            )}
          </div>

          {/* Manual Input for Scanner Barcode Gun / Keyboard */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              processVoucherCode(manualCode);
            }}
            className="flex gap-2 mt-2"
          >
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="Scan Barcode Gun / Ketik Kode..."
              className="flex-1 py-2.5 px-3.5 bg-white border-[2px] border-[#382F2D] rounded-xl font-mono text-[15px] font-bold uppercase tracking-wider focus:outline-none focus:border-[#C10230]"
            />
            <button
              type="submit"
              disabled={isLoading || !manualCode.trim()}
              className="px-4 py-2.5 bg-[#C10230] hover:bg-[#821518] disabled:opacity-60 text-white border-[2px] border-[#382F2D] rounded-xl font-display text-[15px] uppercase tracking-wide cursor-pointer transition-colors"
            >
              Proses
            </button>
          </form>
        </div>

        {/* Real-time Scan Result Banner */}
        {lastScanResult && (
          <div
            className={`w-full rounded-[24px] border-[2.5px] border-[#382F2D] p-4 sm:p-5 shadow-[4px_4px_0px_#382F2D] mb-4 text-left animate-modal-pop ${
              lastScanResult.type === "SUCCESS"
                ? "bg-emerald-50 border-emerald-800"
                : lastScanResult.type === "ALREADY_USED"
                ? "bg-amber-50 border-amber-800"
                : "bg-rose-50 border-rose-800"
            }`}
          >
            <div className="flex items-start gap-3">
              {lastScanResult.type === "SUCCESS" ? (
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 border-[2px] border-[#382F2D]">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
              ) : lastScanResult.type === "ALREADY_USED" ? (
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 border-[2px] border-[#382F2D]">
                  <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 border-[2px] border-[#382F2D]">
                  <XCircle className="w-5 h-5 stroke-[2.5]" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider mb-1 ${
                    lastScanResult.type === "SUCCESS"
                      ? "bg-emerald-200 text-emerald-900"
                      : lastScanResult.type === "ALREADY_USED"
                      ? "bg-amber-200 text-amber-900"
                      : "bg-rose-200 text-rose-900"
                  }`}
                >
                  {lastScanResult.type === "SUCCESS"
                    ? "BERHASIL DITUKARKAN"
                    : lastScanResult.type === "ALREADY_USED"
                    ? "DITOLAK: SUDAH PERNAH DIGUNAKAN"
                    : "KODE TIDAK VALID"}
                </span>

                <h3 className="font-display text-[20px] sm:text-[22px] uppercase leading-tight text-[#382F2D]">
                  {lastScanResult.prizeName || lastScanResult.title}
                </h3>

                <p className="text-xs font-semibold text-[#382F2D]/80 mt-1">
                  {lastScanResult.message}
                </p>

                {lastScanResult.code && (
                  <div className="mt-2.5 pt-2.5 border-t border-[#382F2D]/15 flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[#382F2D]">
                      KODE: {lastScanResult.code}
                    </span>
                    {lastScanResult.guestName && (
                      <span className="font-bold text-[#C10230]">
                        Guest: {lastScanResult.guestName}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live Redeem History (Always Standby at Bottom) */}
        <div className="w-full bg-[#FAF8F2] border-[2.5px] border-[#382F2D] rounded-[24px] p-4 sm:p-5 shadow-[4px_4px_0px_#382F2D] text-left">
          <div className="flex items-center justify-between pb-3 mb-3 border-b-[2px] border-[#382F2D]/15">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#C10230] stroke-[2.4]" />
              <h2 className="font-display text-[18px] uppercase text-[#382F2D] leading-none">
                Riwayat Redeem Real-Time
              </h2>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#382F2D]/30 text-[10px] font-bold text-[#382F2D] hover:bg-[#382F2D] hover:text-white cursor-pointer transition-colors"
            >
              <RotateCcw className={`w-3 h-3 ${isLoadingHistory ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* History List */}
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {redeemHistory.length === 0 ? (
              <div className="py-8 text-center text-xs font-semibold text-[#382F2D]/50 uppercase tracking-wider">
                Belum ada voucher yang di-redeem hari ini.
              </div>
            ) : (
              redeemHistory.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="bg-white rounded-xl border-[1.5px] border-[#382F2D]/20 p-3 flex items-center justify-between gap-3 shadow-[1px_1px_0px_#382F2D]/20 hover:border-[#382F2D] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-extrabold text-[#382F2D]">
                        {item.code}
                      </span>
                      <span className="inline-block px-2 py-0.2 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[9px] font-extrabold uppercase">
                        REDEEMED
                      </span>
                    </div>

                    <p className="font-display text-[15px] uppercase text-[#C10230] leading-snug truncate mt-0.5">
                      {item.prizeName}
                    </p>

                    <p className="text-[11px] font-semibold text-[#382F2D]/70 truncate">
                      {item.guestName} {item.whatsapp ? `• ${item.whatsapp}` : ""}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-[12px] font-bold text-[#382F2D]">
                      {new Date(item.redeemedAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      WIB
                    </span>
                    <p className="text-[9px] text-[#382F2D]/50 font-medium">
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
  );
}
