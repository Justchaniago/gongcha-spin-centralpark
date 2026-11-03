"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  Download,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Users,
  Ticket,
  Sparkles,
  Mail,
  MessageCircle,
  ExternalLink,
  X,
  Delete,
  LogOut,
  Sliders,
  Eye,
  RotateCcw,
  Check,
  Copy,
  Layers,
  Activity,
  QrCode,
  Zap,
  Ban,
  Send,
  CheckSquare,
  Square,
  Radio,
} from "lucide-react";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface PrizeStat {
  id: string;
  name: string;
  shortLabel: string;
  color: string;
  codePrefix: string;
  termsConditions: string;
  probabilityWeight: number;
  theoreticalShare: number;
  isActive: boolean;
  total: number;
  available: number;
  assigned: number;
  redeemed: number;
  claimedTotal: number;
}

interface CustomerVoucher {
  id: number;
  code: string;
  status: "AVAILABLE" | "ASSIGNED" | "REDEEMED" | "REVOKED";
  prizeId: string;
  prizeName: string;
  shortLabel: string;
  termsConditions: string;
  assignedAt: string | null;
  redeemedAt: string | null;
  revokedAt?: string | null;
}

interface CustomerRecord {
  id: string;
  fullName: string;
  whatsapp: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  registeredAt: string;
  hasSpun: boolean;
  isRevoked?: boolean;
  spunAt: string | null;
  voucher: CustomerVoucher | null;
}

interface ActivityItem {
  id: string;
  type: "SPIN_CLAIM" | "REDEEMED";
  timestamp: string;
  guestName: string;
  whatsapp: string;
  email: string;
  code: string;
  prizeName: string;
  prizeId: string;
}

interface SuspiciousIp {
  ip: string;
  count: number;
  names: string[];
  emails: string[];
}

interface DashboardKPIs {
  totalGuests: number;
  totalSpins: number;
  totalVouchers: number;
  totalAvailable: number;
  totalAssigned: number;
  totalRedeemed: number;
  redemptionRate: number;
  stockBurnRate: number;
}

// ============================================================================
// DEMO DATA FALLBACK
// ============================================================================
const DEMO_DATA: {
  kpis: DashboardKPIs;
  prizeStats: PrizeStat[];
  customers: CustomerRecord[];
  recentActivities: ActivityItem[];
  suspiciousIps: SuspiciousIp[];
} = {
  kpis: {
    totalGuests: 428,
    totalSpins: 412,
    totalVouchers: 600,
    totalAvailable: 188,
    totalAssigned: 146,
    totalRedeemed: 266,
    redemptionRate: 64.6,
    stockBurnRate: 68.7,
  },
  prizeStats: [
    {
      id: "FREE_PMT",
      name: "FREE PEARL MILK TEA",
      shortLabel: "FREE DRINK",
      color: "#EF4444",
      codePrefix: "GC-PMT",
      termsConditions: "Valid for 1 Regular Pearl Milk Tea at Gong Cha Central Park.",
      probabilityWeight: 10,
      theoreticalShare: 10.0,
      isActive: true,
      total: 60,
      available: 4,
      assigned: 14,
      redeemed: 42,
      claimedTotal: 56,
    },
    {
      id: "BOGO",
      name: "BUY 1 GET 1 FREE",
      shortLabel: "BUY 1 GET 1",
      color: "#3B82F6",
      codePrefix: "GC-BOGO",
      termsConditions: "Buy any Large drink and get 1 Regular free.",
      probabilityWeight: 20,
      theoreticalShare: 20.0,
      isActive: true,
      total: 120,
      available: 36,
      assigned: 28,
      redeemed: 56,
      claimedTotal: 84,
    },
    {
      id: "DISC_50",
      name: "50% OFF SECOND CUP",
      shortLabel: "50% OFF",
      color: "#F59E0B",
      codePrefix: "GC-50OFF",
      termsConditions: "50% discount on second cup in single receipt.",
      probabilityWeight: 25,
      theoreticalShare: 25.0,
      isActive: true,
      total: 150,
      available: 48,
      assigned: 39,
      redeemed: 63,
      claimedTotal: 102,
    },
    {
      id: "FREE_UPSIZE",
      name: "FREE LARGE UPSIZE",
      shortLabel: "FREE UPSIZE",
      color: "#10B981",
      codePrefix: "GC-UPSZ",
      termsConditions: "Free upgrade from Regular to Large.",
      probabilityWeight: 20,
      theoreticalShare: 20.0,
      isActive: true,
      total: 120,
      available: 52,
      assigned: 26,
      redeemed: 42,
      claimedTotal: 68,
    },
    {
      id: "VOUCHER_15K",
      name: "IDR 15K CASHBACK",
      shortLabel: "IDR 15K OFF",
      color: "#8B5CF6",
      codePrefix: "GC-15K",
      termsConditions: "IDR 15,000 off min purchase IDR 50,000.",
      probabilityWeight: 15,
      theoreticalShare: 15.0,
      isActive: true,
      total: 90,
      available: 28,
      assigned: 22,
      redeemed: 40,
      claimedTotal: 62,
    },
    {
      id: "FREE_TOPPING",
      name: "FREE TOPPING",
      shortLabel: "FREE TOPPING",
      color: "#EC4899",
      codePrefix: "GC-TOP",
      termsConditions: "Free Pearl or Milk Foam topping.",
      probabilityWeight: 10,
      theoreticalShare: 10.0,
      isActive: true,
      total: 60,
      available: 20,
      assigned: 17,
      redeemed: 23,
      claimedTotal: 40,
    },
  ],
  customers: [
    {
      id: "demo-1",
      fullName: "Clarissa Aurelia",
      whatsapp: "6281288991023",
      email: "clarissa.aurelia@gmail.com",
      ipAddress: "114.122.104.19",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)",
      registeredAt: "2026-11-01T16:10:00.000Z",
      hasSpun: true,
      spunAt: "2026-11-01T16:11:00.000Z",
      voucher: {
        id: 1001,
        code: "GC-CP-PMT-042",
        status: "REDEEMED",
        prizeId: "FREE_PMT",
        prizeName: "FREE PEARL MILK TEA",
        shortLabel: "FREE DRINK",
        termsConditions: "Valid for 1 Regular Pearl Milk Tea at Gong Cha Central Park.",
        assignedAt: "2026-11-01T16:11:00.000Z",
        redeemedAt: "2026-11-01T16:15:00.000Z",
      },
    },
    {
      id: "demo-2",
      fullName: "Kevin Sanjaya Putra",
      whatsapp: "628119482731",
      email: "kevin.sanjaya@outlook.com",
      ipAddress: "182.253.88.42",
      userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S928B)",
      registeredAt: "2026-11-01T16:02:00.000Z",
      hasSpun: true,
      spunAt: "2026-11-01T16:03:00.000Z",
      voucher: {
        id: 1002,
        code: "GC-CP-BOGO-088",
        status: "ASSIGNED",
        prizeId: "BOGO",
        prizeName: "BUY 1 GET 1 FREE",
        shortLabel: "BUY 1 GET 1",
        termsConditions: "Buy any Large drink and get 1 Regular free.",
        assignedAt: "2026-11-01T16:03:00.000Z",
        redeemedAt: null,
      },
    },
    {
      id: "demo-3",
      fullName: "Nadia Kusuma",
      whatsapp: "6285719283746",
      email: "nadiakusuma99@yahoo.com",
      ipAddress: "103.144.12.90",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      registeredAt: "2026-11-01T15:50:00.000Z",
      hasSpun: true,
      spunAt: "2026-11-01T15:51:00.000Z",
      voucher: {
        id: 1003,
        code: "GC-CP-15K-019",
        status: "REDEEMED",
        prizeId: "VOUCHER_15K",
        prizeName: "IDR 15K CASHBACK",
        shortLabel: "IDR 15K OFF",
        termsConditions: "IDR 15,000 off min purchase IDR 50,000.",
        assignedAt: "2026-11-01T15:51:00.000Z",
        redeemedAt: "2026-11-01T16:08:00.000Z",
      },
    },
    {
      id: "demo-4",
      fullName: "Reynaldi Pratama",
      whatsapp: "6287882341190",
      email: "reynaldi.p@gmail.com",
      ipAddress: "103.144.12.90",
      userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7)",
      registeredAt: "2026-11-01T15:40:00.000Z",
      hasSpun: true,
      spunAt: "2026-11-01T15:41:00.000Z",
      voucher: {
        id: 1004,
        code: "GC-CP-50OFF-112",
        status: "ASSIGNED",
        prizeId: "DISC_50",
        prizeName: "50% OFF SECOND CUP",
        shortLabel: "50% OFF",
        termsConditions: "50% discount on second cup in single receipt.",
        assignedAt: "2026-11-01T15:41:00.000Z",
        redeemedAt: null,
      },
    },
    {
      id: "demo-5",
      fullName: "Michelle Tan",
      whatsapp: "6281377281992",
      email: "michelle.tan@icloud.com",
      ipAddress: "103.144.12.90",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X)",
      registeredAt: "2026-11-01T15:30:00.000Z",
      hasSpun: true,
      spunAt: "2026-11-01T15:31:00.000Z",
      voucher: {
        id: 1005,
        code: "GC-CP-UPSZ-054",
        status: "REDEEMED",
        prizeId: "FREE_UPSIZE",
        prizeName: "FREE LARGE UPSIZE",
        shortLabel: "FREE UPSIZE",
        termsConditions: "Free upgrade from Regular to Large.",
        assignedAt: "2026-11-01T15:31:00.000Z",
        redeemedAt: "2026-11-01T15:55:00.000Z",
      },
    },
  ],
  recentActivities: [
    {
      id: "act-1",
      type: "REDEEMED",
      timestamp: "2026-11-01T16:15:00.000Z",
      guestName: "Clarissa Aurelia",
      whatsapp: "6281288991023",
      email: "clarissa.aurelia@gmail.com",
      code: "GC-CP-PMT-042",
      prizeName: "FREE PEARL MILK TEA",
      prizeId: "FREE_PMT",
    },
    {
      id: "act-2",
      type: "SPIN_CLAIM",
      timestamp: "2026-11-01T16:11:00.000Z",
      guestName: "Clarissa Aurelia",
      whatsapp: "6281288991023",
      email: "clarissa.aurelia@gmail.com",
      code: "GC-CP-PMT-042",
      prizeName: "FREE PEARL MILK TEA",
      prizeId: "FREE_PMT",
    },
    {
      id: "act-3",
      type: "REDEEMED",
      timestamp: "2026-11-01T16:08:00.000Z",
      guestName: "Nadia Kusuma",
      whatsapp: "6285719283746",
      email: "nadiakusuma99@yahoo.com",
      code: "GC-CP-15K-019",
      prizeName: "IDR 15K CASHBACK",
      prizeId: "VOUCHER_15K",
    },
    {
      id: "act-4",
      type: "SPIN_CLAIM",
      timestamp: "2026-11-01T16:03:00.000Z",
      guestName: "Kevin Sanjaya Putra",
      whatsapp: "628119482731",
      email: "kevin.sanjaya@outlook.com",
      code: "GC-CP-BOGO-088",
      prizeName: "BUY 1 GET 1 FREE",
      prizeId: "BOGO",
    },
    {
      id: "act-5",
      type: "REDEEMED",
      timestamp: "2026-11-01T15:55:00.000Z",
      guestName: "Michelle Tan",
      whatsapp: "6281377281992",
      email: "michelle.tan@icloud.com",
      code: "GC-CP-UPSZ-054",
      prizeName: "FREE LARGE UPSIZE",
      prizeId: "FREE_UPSIZE",
    },
  ],
  suspiciousIps: [
    {
      ip: "103.144.12.90",
      count: 3,
      names: ["Nadia Kusuma", "Reynaldi Pratama", "Michelle Tan"],
      emails: [
        "nadiakusuma99@yahoo.com",
        "reynaldi.p@gmail.com",
        "michelle.tan@icloud.com",
      ],
    },
  ],
};

// ============================================================================
// MAIN CLEAN NEO-BRUTALISM DASHBOARD
// ============================================================================
export default function AdminDashboardPage() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState("");

  // Data States
  const [isLoading, setIsLoading] = useState(false);
  const [useDemoData, setUseDemoData] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("—");

  const [kpis, setKpis] = useState<DashboardKPIs>(DEMO_DATA.kpis);
  const [prizeStats, setPrizeStats] = useState<PrizeStat[]>(DEMO_DATA.prizeStats);
  const [customers, setCustomers] = useState<CustomerRecord[]>(DEMO_DATA.customers);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>(
    DEMO_DATA.recentActivities
  );
  const [suspiciousIps, setSuspiciousIps] = useState<SuspiciousIp[]>(
    DEMO_DATA.suspiciousIps
  );

  // Navigation & Filters
  const [activeTab, setActiveTab] = useState<
    "overview" | "customers" | "quotas" | "fraud"
  >("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ASSIGNED" | "REDEEMED" | "REVOKED" | "NO_SPIN"
  >("ALL");
  const [prizeFilter, setPrizeFilter] = useState<string>("ALL");

  // Modals
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(
    null
  );
  const [cmdKOpen, setCmdKOpen] = useState(false);
  const [cmdKQuery, setCmdKQuery] = useState("");

  // Multi-select & Batch Resend Email States
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(
    new Set()
  );
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchMode, setBatchMode] = useState<"selected" | "unredeemed" | "all">(
    "selected"
  );
  const [batchPrizeFilter, setBatchPrizeFilter] = useState<string>("ALL");
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    total: number;
    sent: number;
    failed: number;
  } | null>(null);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const savedPin = localStorage.getItem("gongcha_cashier_pin");
    if (savedPin === "2026") {
      setPin(savedPin);
      setIsAuthenticated(true);
    }
  }, []);

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdKOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setCmdKOpen(false);
        setSelectedCustomer(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch Live DB
  const fetchDashboardData = useCallback(
    async (silent = false) => {
      if (!pin || useDemoData) return;
      if (!silent) setIsLoading(true);
      try {
        const res = await fetch(`/api/admin?pin=${pin}`);
        if (res.ok) {
          const data = await res.json();
          setKpis(data.kpis);
          setPrizeStats(data.prizeStats);
          setCustomers(data.customers);
          setRecentActivities(data.recentActivities);
          setSuspiciousIps(data.suspiciousIps);
          setLastRefreshed(new Date().toLocaleTimeString("id-ID"));
        }
      } catch (err) {
        console.error("Failed to fetch admin stats:", err);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [pin, useDemoData]
  );

  useEffect(() => {
    if (isAuthenticated && !useDemoData) {
      fetchDashboardData();
      const interval = setInterval(() => fetchDashboardData(true), 12000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, useDemoData, fetchDashboardData]);

  const handleToggleDemo = () => {
    const nextDemo = !useDemoData;
    setUseDemoData(nextDemo);
    if (nextDemo) {
      setKpis(DEMO_DATA.kpis);
      setPrizeStats(DEMO_DATA.prizeStats);
      setCustomers(DEMO_DATA.customers);
      setRecentActivities(DEMO_DATA.recentActivities);
      setSuspiciousIps(DEMO_DATA.suspiciousIps);
      showToast("Simulasi Data Demo Aktif", "success");
    } else {
      fetchDashboardData();
      showToast("Kembali ke Database Live Supabase", "success");
    }
  };

  const verifyPin = (targetPin: string) => {
    if (targetPin === "2026") {
      setIsAuthenticated(true);
      localStorage.setItem("gongcha_cashier_pin", targetPin);
      setPinError("");
    } else {
      setPinError("PIN Admin tidak sesuai");
      setTimeout(() => setPin(""), 350);
    }
  };

  const handleTopupStock = async (prizeId: string, count: number) => {
    if (useDemoData) {
      setPrizeStats((prev) =>
        prev.map((p) =>
          p.id === prizeId
            ? { ...p, total: p.total + count, available: p.available + count }
            : p
        )
      );
      setKpis((prev) => ({
        ...prev,
        totalVouchers: prev.totalVouchers + count,
        totalAvailable: prev.totalAvailable + count,
      }));
      showToast(`[Demo] +${count} kuota ditambahkan ke ${prizeId}`);
      return;
    }

    setActionLoading(`topup-${prizeId}`);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, action: "topup_stock", prizeId, count }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Berhasil tambah +${count} voucher`);
        fetchDashboardData(true);
      } else {
        showToast(data.error || "Gagal menambah stok", "error");
      }
    } catch {
      showToast("Gagal menghubungi server", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleVoucherStatus = async (
    customer: CustomerRecord,
    newStatus: "ASSIGNED" | "REDEEMED"
  ) => {
    if (!customer.voucher) return;

    if (useDemoData) {
      const nowIso = newStatus === "REDEEMED" ? new Date().toISOString() : null;
      const updatedCustomer: CustomerRecord = {
        ...customer,
        voucher: {
          ...customer.voucher,
          status: newStatus,
          redeemedAt: nowIso,
        },
      };
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? updatedCustomer : c))
      );
      setSelectedCustomer(updatedCustomer);
      showToast(`[Demo] Status voucher diubah ke ${newStatus}`);
      return;
    }

    setActionLoading(`status-${customer.voucher.id}`);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          action: "set_voucher_status",
          voucherId: customer.voucher.id,
          newStatus,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        await fetchDashboardData(true);
        setSelectedCustomer((prev) =>
          prev && prev.voucher
            ? {
                ...prev,
                voucher: {
                  ...prev.voucher,
                  status: newStatus,
                  redeemedAt:
                    newStatus === "REDEEMED" ? new Date().toISOString() : null,
                },
              }
            : null
        );
      } else {
        showToast(data.error || "Gagal mengubah status", "error");
      }
    } catch {
      showToast("Gagal menghubungi server", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendEmail = async (customer: CustomerRecord) => {
    if (!customer.voucher) return;
    if (useDemoData) {
      showToast(
        `[Demo] Email voucher ${customer.voucher.code} dikirim ke ${customer.email}`
      );
      return;
    }

    setActionLoading(`email-${customer.id}`);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          action: "resend_email",
          email: customer.email,
          userName: customer.fullName,
          voucherCode: customer.voucher.code,
          prizeName: customer.voucher.prizeName,
          termsConditions: customer.voucher.termsConditions,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
      } else {
        showToast(data.error || "Gagal mengirim email", "error");
      }
    } catch {
      showToast("Gagal menghubungi server", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // REVOKE VOUCHER: Returns voucher to AVAILABLE quota & blocks user from re-spinning
  const handleRevokeVoucher = async (customer: CustomerRecord) => {
    if (!customer.voucher || customer.voucher.status === "REVOKED") return;

    const confirmed = window.confirm(
      `Yakin ingin REVOKE voucher ${customer.voucher.code} milik ${customer.fullName}?\n\n• Kode voucher akan dikembalikan ke kuota tersedia (+1).\n• Status customer menjadi REVOKED dan tidak bisa ikut spin lagi.`
    );
    if (!confirmed) return;

    // Deselect if currently selected in batch set
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      next.delete(customer.id);
      return next;
    });

    if (useDemoData) {
      const nowIso = new Date().toISOString();
      const prevStatus = customer.voucher.status;
      const targetPrizeId = customer.voucher.prizeId;

      const updatedCustomer: CustomerRecord = {
        ...customer,
        isRevoked: true,
        voucher: {
          ...customer.voucher,
          status: "REVOKED",
          revokedAt: nowIso,
        },
      };

      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? updatedCustomer : c))
      );
      setSelectedCustomer(updatedCustomer);

      setPrizeStats((prev) =>
        prev.map((p) =>
          p.id === targetPrizeId
            ? {
                ...p,
                available: p.available + 1,
                assigned:
                  prevStatus === "ASSIGNED" ? Math.max(0, p.assigned - 1) : p.assigned,
                redeemed:
                  prevStatus === "REDEEMED" ? Math.max(0, p.redeemed - 1) : p.redeemed,
                claimedTotal: Math.max(0, p.claimedTotal - 1),
              }
            : p
        )
      );
      setKpis((prev) => ({
        ...prev,
        totalAvailable: prev.totalAvailable + 1,
        totalAssigned:
          prevStatus === "ASSIGNED"
            ? Math.max(0, prev.totalAssigned - 1)
            : prev.totalAssigned,
        totalRedeemed:
          prevStatus === "REDEEMED"
            ? Math.max(0, prev.totalRedeemed - 1)
            : prev.totalRedeemed,
      }));

      showToast(
        `[Demo] Voucher ${customer.voucher.code} di-REVOKE & kembali ke kuota!`
      );
      return;
    }

    setActionLoading(`revoke-${customer.id}`);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          action: "revoke_voucher",
          userId: customer.id,
          voucherId: customer.voucher.id,
          voucherCode: customer.voucher.code,
          prizeName: customer.voucher.prizeName,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        await fetchDashboardData(true);
        setSelectedCustomer((prev) =>
          prev && prev.voucher
            ? {
                ...prev,
                isRevoked: true,
                voucher: {
                  ...prev.voucher,
                  status: "REVOKED",
                  revokedAt: data.revokedAt || new Date().toISOString(),
                },
              }
            : null
        );
      } else {
        showToast(data.error || "Gagal melakukan revoke voucher", "error");
      }
    } catch {
      showToast("Gagal menghubungi server", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle selection for a single customer
  const toggleSelectCustomer = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle select all visible eligible customers
  const toggleSelectAllVisible = () => {
    const eligibleVisible = filteredCustomers.filter(
      (c) => c.voucher && c.voucher.status !== "REVOKED"
    );
    const allSelected = eligibleVisible.every((c) =>
      selectedCustomerIds.has(c.id)
    );

    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        eligibleVisible.forEach((c) => next.delete(c.id));
      } else {
        eligibleVisible.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const handleOpenBatchModal = (mode: "selected" | "unredeemed" | "all") => {
    setBatchMode(mode);
    setBatchResult(null);
    setBatchModalOpen(true);
  };

  const handleExecuteBatchResend = async () => {
    setIsSendingBatch(true);
    setBatchResult(null);

    try {
      const payload: Record<string, unknown> = {
        pin,
        action: "batch_resend_email",
        targetPrizeId: batchPrizeFilter,
      };

      if (batchMode === "selected") {
        payload.customerIds = Array.from(selectedCustomerIds);
      } else if (batchMode === "unredeemed") {
        payload.filterMode = "unredeemed";
      } else if (batchMode === "all") {
        payload.filterMode = "all";
      }

      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBatchResult({
          total: data.total || 0,
          sent: data.sent || 0,
          failed: data.failed || 0,
        });
        showToast(data.message || `Berhasil mengirim ${data.sent} email`);
        if (batchMode === "selected") {
          setSelectedCustomerIds(new Set());
        }
      } else {
        showToast(data.error || "Gagal melakukan batch broadcast email", "error");
      }
    } catch {
      showToast("Gagal menghubungi server", "error");
    } finally {
      setIsSendingBatch(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Full Name",
      "WhatsApp",
      "Email",
      "Registered At",
      "Has Spun",
      "Voucher Code",
      "Prize Name",
      "Voucher Status",
      "Assigned At",
      "Redeemed At",
      "IP Address",
    ];
    const rows = customers.map((c) => [
      `"${(c.fullName || "").replace(/"/g, '""')}"`,
      `"${c.whatsapp}"`,
      `"${c.email}"`,
      `"${c.registeredAt}"`,
      c.hasSpun ? "YES" : "NO",
      `"${c.voucher?.code || "-"}"`,
      `"${c.voucher?.prizeName || "-"}"`,
      `"${c.voucher?.status || "UNCLAIMED"}"`,
      `"${c.voucher?.assignedAt || "-"}"`,
      `"${c.voucher?.redeemedAt || "-"}"`,
      `"${c.ipAddress}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `gongcha-spinwheel-leads-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${customers.length} baris ke CSV`);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter === "ASSIGNED" && c.voucher?.status !== "ASSIGNED")
        return false;
      if (statusFilter === "REDEEMED" && c.voucher?.status !== "REDEEMED")
        return false;
      if (statusFilter === "REVOKED" && c.voucher?.status !== "REVOKED")
        return false;
      if (statusFilter === "NO_SPIN" && c.hasSpun) return false;
      if (prizeFilter !== "ALL" && c.voucher?.prizeId !== prizeFilter)
        return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.whatsapp.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.voucher?.code && c.voucher.code.toLowerCase().includes(q)) ||
        (c.voucher?.prizeName && c.voucher.prizeName.toLowerCase().includes(q))
      );
    });
  }, [customers, statusFilter, prizeFilter, searchQuery]);

  const cmdKResults = useMemo(() => {
    if (!cmdKQuery.trim()) return customers.slice(0, 6);
    const q = cmdKQuery.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.whatsapp.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.voucher?.code && c.voucher.code.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [customers, cmdKQuery]);

  const lowStockPrizes = useMemo(
    () => prizeStats.filter((p) => p.isActive && p.available <= 5),
    [prizeStats]
  );

  const formatRelativeTime = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ============================================================================
  // PIN LOGIN VIEW (CLEAN NEO-BRUTALISM)
  // ============================================================================
  if (!isAuthenticated) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6 bg-[#FAF7F2] text-[#18181B] font-sans antialiased">
        <div className="w-full max-w-[380px] bg-white border-2 border-[#18181B] rounded-2xl p-7 shadow-[4px_4px_0px_#18181B]">
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
              <span className="inline-block px-2 py-0.5 bg-[#FDE047] border border-[#18181B] rounded text-[10px] font-bold uppercase tracking-wider">
                Gong cha Central Park
              </span>
              <h1 className="text-lg font-extrabold text-[#18181B] tracking-tight mt-1">
                Dashboard Admin
              </h1>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-600">
                Masukkan 4-Digit PIN (2026)
              </label>
              {pinError && (
                <span className="text-xs font-bold text-red-600">
                  {pinError}
                </span>
              )}
            </div>
            <div
              className={`h-13 rounded-xl border-2 border-[#18181B] flex items-center justify-center gap-4 px-4 ${
                pinError ? "bg-red-50" : "bg-[#FAF7F2]"
              }`}
            >
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border-2 border-[#18181B] transition-all ${
                      filled ? "bg-[#C10230] scale-110" : "bg-white"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => {
                  if (pin.length < 4) {
                    const next = pin + digit;
                    setPin(next);
                    setPinError("");
                    if (next.length === 4) verifyPin(next);
                  }
                }}
                className="h-13 rounded-xl bg-white hover:bg-[#FDE047] active:translate-x-[1px] active:translate-y-[1px] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] active:shadow-none text-lg font-bold text-[#18181B] transition-all cursor-pointer select-none"
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
              className="h-13 rounded-xl bg-zinc-100 hover:bg-zinc-200 border-2 border-[#18181B] text-xs font-bold text-zinc-700 transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                if (pin.length < 4) {
                  const next = pin + "0";
                  setPin(next);
                  setPinError("");
                  if (next.length === 4) verifyPin(next);
                }
              }}
              className="h-13 rounded-xl bg-white hover:bg-[#FDE047] active:translate-x-[1px] active:translate-y-[1px] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] active:shadow-none text-lg font-bold text-[#18181B] transition-all cursor-pointer select-none"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin((p) => p.slice(0, -1))}
              className="h-13 rounded-xl bg-zinc-100 hover:bg-zinc-200 border-2 border-[#18181B] flex items-center justify-center text-[#18181B] transition-colors cursor-pointer"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ============================================================================
  // MAIN AUTHENTICATED DASHBOARD (STRUCTURED, SPACIOUS NEO-BRUTALISM)
  // ============================================================================
  return (
    <div className="min-h-dvh bg-[#FAF7F2] text-[#18181B] font-sans antialiased">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 border-[#18181B] shadow-[4px_4px_0px_#18181B] text-sm font-bold ${
            toast.type === "success"
              ? "bg-[#86EFAC] text-[#18181B]"
              : "bg-[#FCA5A5] text-[#18181B]"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* =====================================================================
          TOP HEADER BAR (Clean alignment, generous spacing)
          ===================================================================== */}
      <header className="sticky top-0 z-30 bg-white border-b-2 border-[#18181B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-18 flex items-center justify-between gap-4">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="relative w-9 h-10 rounded-lg bg-[#FAF7F2] border-2 border-[#18181B] p-1 shrink-0">
              <Image
                src="/gongcha-logo.png"
                alt="Gong cha"
                fill
                className="object-contain p-0.5"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#18181B]">
                  Spinwheel Panel
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-[#FDE047] border border-[#18181B] rounded text-[11px] font-bold">
                  Central Park UG
                </span>
              </div>
              <p className="text-xs text-zinc-500 hidden sm:block">
                Monitoring Kuota Voucher & Lookup Customer
              </p>
            </div>
          </div>

          {/* Center: Quick Customer Search Bar (Cmd+K) */}
          <div className="flex-1 max-w-md hidden md:block">
            <button
              type="button"
              onClick={() => setCmdKOpen(true)}
              className="w-full h-10 px-3.5 rounded-xl bg-[#FAF7F2] hover:bg-zinc-100 border-2 border-[#18181B] flex items-center justify-between text-xs font-medium text-zinc-600 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-4 h-4 text-[#18181B] shrink-0" />
                <span>Cari customer, No. WA, Email, atau Kode Voucher...</span>
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white text-[#18181B] rounded border border-[#18181B]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCmdKOpen(true)}
              className="md:hidden h-10 w-10 rounded-xl bg-[#FAF7F2] border-2 border-[#18181B] flex items-center justify-center"
              aria-label="Cari Customer"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Demo vs Live Toggle */}
            <button
              type="button"
              onClick={handleToggleDemo}
              className={`h-10 px-3.5 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                useDemoData ? "bg-[#FDE047]" : "bg-[#86EFAC]"
              }`}
              title="Beralih antara Data Live Supabase dan Simulasi Data Demo"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{useDemoData ? "Data Demo" : "Live DB"}</span>
            </button>

            {/* Terminal Kasir Link */}
            <Link
              href="/kasir"
              className="h-10 px-3.5 rounded-xl bg-white hover:bg-[#FAF7F2] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs font-bold hidden sm:flex items-center gap-1.5 transition-all"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>POS Kasir</span>
            </Link>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-10 px-3.5 rounded-xl bg-white hover:bg-[#FAF7F2] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs font-bold hidden lg:flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => fetchDashboardData()}
              disabled={isLoading || useDemoData}
              className="h-10 w-10 rounded-xl bg-white hover:bg-[#FAF7F2] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center transition-all cursor-pointer disabled:opacity-40"
              title="Refresh Data"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("gongcha_cashier_pin");
                setIsAuthenticated(false);
                setPin("");
              }}
              className="h-10 w-10 rounded-xl bg-white hover:bg-red-100 border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center text-red-600 transition-all cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clean Horizontal Navigation Bar */}
        <div className="bg-[#FAF7F2] border-t-2 border-[#18181B]">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between overflow-x-auto">
            <div className="flex items-center gap-2 py-2.5">
              {[
                { id: "overview", label: "Ringkasan & Kuota", icon: Layers },
                {
                  id: "customers",
                  label: `Lookup Customer (${customers.length})`,
                  icon: Users,
                },
                {
                  id: "quotas",
                  label: "Atur Stok Voucher",
                  icon: Sliders,
                  badge: lowStockPrizes.length || undefined,
                },
                {
                  id: "fraud",
                  label: "Deteksi IP Ganda",
                  icon: ShieldAlert,
                  badge: suspiciousIps.length || undefined,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        tab.id as "overview" | "customers" | "quotas" | "fraud"
                      )
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border-2 transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? "bg-[#18181B] text-white border-[#18181B] shadow-[2px_2px_0px_#C10230]"
                        : "bg-white text-zinc-700 border-transparent hover:border-[#18181B]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-[#FDE047] text-[#18181B] border border-[#18181B]">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-zinc-500">
              <span>Update terakhir: {lastRefreshed}</span>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          MAIN CONTAINER (Consistent spacing & padding)
          ===================================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Low Stock Alert Banner */}
        {lowStockPrizes.length > 0 && (
          <div className="bg-[#FEF08A] border-2 border-[#18181B] rounded-2xl p-5 shadow-[4px_4px_0px_#18181B] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#18181B] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-[#18181B]">
                  Stok Voucher Menipis ({lowStockPrizes.length} Kategori)
                </h2>
                <p className="text-xs font-medium text-zinc-700 mt-0.5">
                  {lowStockPrizes
                    .map((p) => `${p.name} (tersisa ${p.available})`)
                    .join(" • ")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {lowStockPrizes.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleTopupStock(p.id, 20)}
                  disabled={actionLoading === `topup-${p.id}`}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#86EFAC] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah +20 {p.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1. FOUR KPI SUMMARY CARDS (Clean Neo-Brutalist Cards) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* KPI 1: Total Spins */}
          <div className="bg-white border-2 border-[#18181B] rounded-2xl p-5 shadow-[4px_4px_0px_#18181B] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Total Spin Klaim
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#FEF08A] border-2 border-[#18181B] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#18181B]" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-3xl font-extrabold text-[#18181B] tabular-nums tracking-tight">
                {kpis.totalSpins.toLocaleString("id-ID")}
              </div>
            </div>
            <div className="pt-3 border-t border-zinc-200 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Total Pendaftar</span>
              <span className="font-bold text-[#18181B]">
                {kpis.totalGuests} orang
              </span>
            </div>
          </div>

          {/* KPI 2: Sisa Kuota Voucher */}
          <div className="bg-white border-2 border-[#18181B] rounded-2xl p-5 shadow-[4px_4px_0px_#18181B] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Sisa Kuota Tersedia
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#BFDBFE] border-2 border-[#18181B] flex items-center justify-center">
                <Ticket className="w-4 h-4 text-[#18181B]" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-3xl font-extrabold text-[#18181B] tabular-nums tracking-tight">
                {kpis.totalAvailable.toLocaleString("id-ID")}
              </div>
            </div>
            <div className="pt-3 border-t border-zinc-200 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Total Pool Voucher</span>
              <span className="font-bold text-[#18181B]">
                {kpis.totalVouchers} kode
              </span>
            </div>
          </div>

          {/* KPI 3: Redeemed di Kasir */}
          <div className="bg-white border-2 border-[#18181B] rounded-2xl p-5 shadow-[4px_4px_0px_#18181B] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Sudah Diredeem
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#86EFAC] border-2 border-[#18181B] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-[#18181B]" />
              </div>
            </div>
            <div className="my-3 flex items-baseline justify-between">
              <div className="text-3xl font-extrabold text-[#18181B] tabular-nums tracking-tight">
                {kpis.totalRedeemed.toLocaleString("id-ID")}
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[#86EFAC] border border-[#18181B] text-xs font-bold">
                {kpis.redemptionRate}%
              </span>
            </div>
            <div className="pt-3 border-t border-zinc-200 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Konversi Kasir</span>
              <span className="font-bold text-emerald-700">Tervalidasi POS</span>
            </div>
          </div>

          {/* KPI 4: Menunggu Kedatangan (Assigned) */}
          <div className="bg-white border-2 border-[#18181B] rounded-2xl p-5 shadow-[4px_4px_0px_#18181B] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Belum Ditukar
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#FECACA] border-2 border-[#18181B] flex items-center justify-center">
                <Users className="w-4 h-4 text-[#18181B]" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-3xl font-extrabold text-[#18181B] tabular-nums tracking-tight">
                {kpis.totalAssigned.toLocaleString("id-ID")}
              </div>
            </div>
            <div className="pt-3 border-t border-zinc-200 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Status Voucher</span>
              <span className="font-bold text-zinc-800">Aktif di Customer</span>
            </div>
          </div>
        </section>

        {/* ===================================================================
            TAB 1: OVERVIEW (Quota Progress + Quick Customer Lookup + Live Feed)
            =================================================================== */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT 7 COLUMNS: QUOTA & REDEMPTION BREAKDOWN */}
            <section className="lg:col-span-7 bg-white border-2 border-[#18181B] rounded-2xl p-6 shadow-[4px_4px_0px_#18181B]">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b-2 border-zinc-100">
                <div>
                  <h2 className="text-lg font-extrabold text-[#18181B]">
                    Kuota & Redeem Voucher per Hadiah
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Pantau sisa kuota tersedia vs voucher yang sudah ditukarkan di kasir
                  </p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#22C55E] border border-[#18181B] inline-block" />
                    Redeemed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#3B82F6] border border-[#18181B] inline-block" />
                    Assigned
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-zinc-200 border border-[#18181B] inline-block" />
                    Sisa
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {prizeStats.map((prize) => {
                  const redeemedPct =
                    prize.total > 0
                      ? Math.round((prize.redeemed / prize.total) * 100)
                      : 0;
                  const assignedPct =
                    prize.total > 0
                      ? Math.round((prize.assigned / prize.total) * 100)
                      : 0;
                  const isLow = prize.available <= 5;

                  return (
                    <div
                      key={prize.id}
                      className={`p-4 rounded-xl border-2 border-[#18181B] transition-colors ${
                        isLow ? "bg-[#FEF9C3]" : "bg-[#FAF7F2]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-extrabold text-sm text-[#18181B]">
                            {prize.name}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white border border-[#18181B] font-mono text-[11px] font-bold text-zinc-700">
                            {prize.codePrefix}
                          </span>
                          {isLow && (
                            <span className="px-2 py-0.5 rounded bg-[#FCA5A5] border border-[#18181B] text-[10px] font-extrabold uppercase">
                              Sisa {prize.available}!
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-xs font-bold text-zinc-700 tabular-nums">
                            <span className="text-emerald-700">
                              {prize.redeemed} redeem
                            </span>{" "}
                            •{" "}
                            <span className="text-blue-700">
                              {prize.assigned} klaim
                            </span>{" "}
                            •{" "}
                            <span className="text-[#18181B] font-extrabold">
                              {prize.available}/{prize.total} sisa
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTopupStock(prize.id, 10)}
                            disabled={actionLoading === `topup-${prize.id}`}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FDE047] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                            title="Tambah +10 kuota voucher"
                          >
                            <Plus className="w-3 h-3" />
                            <span>10</span>
                          </button>
                        </div>
                      </div>

                      {/* Clean Stacked Bar */}
                      <div className="w-full h-3.5 bg-white rounded-lg border-2 border-[#18181B] overflow-hidden flex">
                        {redeemedPct > 0 && (
                          <div
                            className="h-full bg-[#22C55E] border-r border-[#18181B] transition-all duration-500"
                            style={{ width: `${redeemedPct}%` }}
                            title={`Redeemed: ${prize.redeemed}`}
                          />
                        )}
                        {assignedPct > 0 && (
                          <div
                            className="h-full bg-[#3B82F6] border-r border-[#18181B] transition-all duration-500"
                            style={{ width: `${assignedPct}%` }}
                            title={`Assigned: ${prize.assigned}`}
                          />
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-zinc-600 font-medium">
                        <span>
                          Peluang RNG: <strong>{prize.theoreticalShare}%</strong>{" "}
                          (Bobot {prize.probabilityWeight})
                        </span>
                        <span>
                          Total Keluar:{" "}
                          <strong>
                            {prize.claimedTotal} voucher (
                            {prize.total > 0
                              ? Math.round(
                                  (prize.claimedTotal / prize.total) * 100
                                )
                              : 0}
                            %)
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* RIGHT 5 COLUMNS: QUICK CUSTOMER LOOKUP + LIVE FEED */}
            <div className="lg:col-span-5 space-y-6">
              {/* QUICK CUSTOMER LOOKUP CARD */}
              <section className="bg-white border-2 border-[#18181B] rounded-2xl p-6 shadow-[4px_4px_0px_#18181B]">
                <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-zinc-100">
                  <div>
                    <h2 className="text-lg font-extrabold text-[#18181B]">
                      Lookup Cepat Customer
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Klik nama customer untuk lihat detail & aksi voucher
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("customers")}
                    className="px-3 py-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#FDE047] border-2 border-[#18181B] text-xs font-bold transition-colors cursor-pointer"
                  >
                    Semua ({customers.length})
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative mb-4">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ketik Nama, No. WA, Email, atau Kode GC-..."
                    className="w-full h-11 pl-10 pr-9 rounded-xl bg-[#FAF7F2] border-2 border-[#18181B] text-xs font-semibold text-[#18181B] placeholder:text-zinc-400 focus:outline-none focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#18181B]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Customer List */}
                <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
                  {filteredCustomers.slice(0, 6).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCustomer(c)}
                      className="p-3.5 rounded-xl bg-[#FAF7F2] hover:bg-[#FEF08A] border-2 border-[#18181B] flex items-center justify-between gap-3 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs text-[#18181B] truncate">
                          {c.fullName}
                        </div>
                        <div className="text-[11px] font-medium text-zinc-600 truncate mt-0.5">
                          {c.whatsapp} • {c.email}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {c.voucher ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-white border border-[#18181B]">
                              {c.voucher.code}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border border-[#18181B] ${
                                c.voucher.status === "REDEEMED"
                                  ? "bg-[#86EFAC] text-[#18181B]"
                                  : c.voucher.status === "REVOKED"
                                  ? "bg-[#FCA5A5] text-[#18181B]"
                                  : "bg-[#BFDBFE] text-[#18181B]"
                              }`}
                            >
                              {c.voucher.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-200 border border-[#18181B]">
                            BELUM SPIN
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredCustomers.length === 0 && (
                    <div className="py-8 text-center text-xs font-medium text-zinc-500">
                      Customer tidak ditemukan.
                    </div>
                  )}
                </div>
              </section>

              {/* LIVE ACTIVITY STREAM CARD */}
              <section className="bg-white border-2 border-[#18181B] rounded-2xl p-6 shadow-[4px_4px_0px_#18181B]">
                <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-zinc-100">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#C10230]" />
                    <h2 className="text-base font-extrabold text-[#18181B]">
                      Aktivitas Real-Time
                    </h2>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#86EFAC] border border-[#18181B] text-[10px] font-extrabold uppercase">
                    Live Feed
                  </span>
                </div>

                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                  {recentActivities.slice(0, 8).map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl bg-[#FAF7F2] border border-zinc-300 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#18181B] truncate">
                          {act.guestName}{" "}
                          <span className="font-normal text-zinc-500">
                            {act.type === "REDEEMED"
                              ? "menukar voucher di kasir"
                              : "klaim hadiah spin"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[11px] font-extrabold px-1.5 py-0.2 rounded bg-white border border-[#18181B]">
                            {act.code}
                          </span>
                          <span className="text-[11px] font-semibold text-zinc-600 truncate">
                            {act.prizeName}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-500 shrink-0">
                        {formatRelativeTime(act.timestamp)}
                      </span>
                    </div>
                  ))}

                  {recentActivities.length === 0 && (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      Belum ada aktivitas.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: FULL CUSTOMER DIRECTORY TABLE
            =================================================================== */}
        {activeTab === "customers" && (
          <section className="bg-white border-2 border-[#18181B] rounded-2xl p-6 shadow-[4px_4px_0px_#18181B] space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b-2 border-zinc-100">
              <div>
                <h2 className="text-xl font-extrabold text-[#18181B]">
                  Database Pengunjung & Voucher ({filteredCustomers.length})
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Klik baris customer untuk mengirim ulang voucher via WA/Email atau mengubah status redeem
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: "ALL", label: "Semua" },
                    { id: "ASSIGNED", label: "Belum Tukar (Assigned)" },
                    { id: "REDEEMED", label: "Sudah Dipakai (Redeemed)" },
                    { id: "REVOKED", label: "Dibatalkan (Revoked)" },
                    { id: "NO_SPIN", label: "Belum Spin" },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border-2 border-[#18181B] transition-all cursor-pointer ${
                      statusFilter === st.id
                        ? "bg-[#FDE047] text-[#18181B] shadow-[2px_2px_0px_#18181B]"
                        : "bg-[#FAF7F2] text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search, Category Select, and Broadcast Action */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, WA, email, atau voucher..."
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#FAF7F2] border-2 border-[#18181B] text-sm font-semibold text-[#18181B] placeholder:text-zinc-400 focus:outline-none focus:bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="md:col-span-4">
                <select
                  value={prizeFilter}
                  onChange={(e) => setPrizeFilter(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#FAF7F2] border-2 border-[#18181B] text-xs font-bold text-[#18181B] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Kategori Hadiah</option>
                  {prizeStats.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.claimedTotal} klaim)
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenBatchModal("all")}
                  className="w-full h-11 px-3 rounded-xl bg-[#C10230] hover:bg-[#821518] text-white border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all"
                  title="Kirim ulang email voucher ke semua customer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Broadcast Email</span>
                </button>
              </div>
            </div>

            {/* Clean Table with Multi-Select Checkboxes */}
            <div className="overflow-x-auto rounded-xl border-2 border-[#18181B]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b-2 border-[#18181B] text-xs font-extrabold uppercase text-zinc-700">
                    <th className="py-3.5 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={toggleSelectAllVisible}
                        className="p-1 rounded text-zinc-700 hover:text-[#18181B] cursor-pointer"
                        title="Pilih semua yang terlihat"
                      >
                        {filteredCustomers.length > 0 &&
                        filteredCustomers
                          .filter((c) => c.voucher && c.voucher.status !== "REVOKED")
                          .every((c) => selectedCustomerIds.has(c.id)) ? (
                          <CheckSquare className="w-4 h-4 text-[#C10230]" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-4">Nama Customer</th>
                    <th className="py-3.5 px-4">Kontak (WA & Email)</th>
                    <th className="py-3.5 px-4">Kode Voucher</th>
                    <th className="py-3.5 px-4">Hadiah</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs">
                  {filteredCustomers.map((c) => {
                    const isSelected = selectedCustomerIds.has(c.id);
                    const isEligible = !!c.voucher && c.voucher.status !== "REVOKED";

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#FEF08A]/70"
                            : "hover:bg-[#FEF9C3]/60"
                        }`}
                      >
                        <td
                          className="py-4 px-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isEligible ? (
                            <button
                              type="button"
                              onClick={(e) => toggleSelectCustomer(c.id, e)}
                              className="p-1 rounded text-zinc-700 hover:text-[#18181B] cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#C10230]" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-400" />
                              )}
                            </button>
                          ) : (
                            <span className="text-zinc-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-extrabold text-sm text-[#18181B]">
                            {c.fullName}
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            IP: {c.ipAddress}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-mono font-bold text-[#18181B]">
                            {c.whatsapp}
                          </div>
                          <div className="text-zinc-500 mt-0.5">{c.email}</div>
                        </td>
                        <td className="py-4 px-4">
                          {c.voucher ? (
                            <span className="font-mono font-extrabold text-xs px-2.5 py-1 rounded-md bg-[#FAF7F2] border border-[#18181B]">
                              {c.voucher.code}
                            </span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-bold text-[#18181B]">
                          {c.voucher ? c.voucher.prizeName : "Belum Spin"}
                        </td>
                        <td className="py-4 px-4">
                          {c.voucher ? (
                            <span
                              className={`inline-block px-2.5 py-1 rounded-md border border-[#18181B] text-[11px] font-extrabold ${
                                c.voucher.status === "REDEEMED"
                                  ? "bg-[#86EFAC] text-[#18181B]"
                                  : c.voucher.status === "REVOKED"
                                  ? "bg-[#FCA5A5] text-[#18181B]"
                                  : "bg-[#BFDBFE] text-[#18181B]"
                              }`}
                            >
                              {c.voucher.status}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-md bg-zinc-200 text-[10px] font-bold">
                              REGISTERED
                            </span>
                          )}
                        </td>
                        <td
                          className="py-4 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {c.voucher && c.voucher.status !== "REVOKED" && (
                              <button
                                type="button"
                                onClick={() => handleResendEmail(c)}
                                disabled={actionLoading === `email-${c.id}`}
                                className="p-1.5 rounded-lg bg-white hover:bg-[#FAF7F2] border-2 border-[#18181B] text-zinc-700 hover:text-[#C10230] shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
                                title="Kirim ulang email voucher"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedCustomer(c)}
                              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#FDE047] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ===================================================================
            TAB 3: QUOTA & STOCK CONTROL
            =================================================================== */}
        {activeTab === "quotas" && (
          <section className="bg-white border-2 border-[#18181B] rounded-2xl p-6 shadow-[4px_4px_0px_#18181B] space-y-6">
            <div className="pb-5 border-b-2 border-zinc-100">
              <h2 className="text-xl font-extrabold text-[#18181B]">
                Manajemen Stok Voucher & Probabilitas RNG
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Tambahkan kuota kode voucher baru kapan saja tanpa menghentikan operasional spinwheel
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {prizeStats.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border-2 border-[#18181B] bg-[#FAF7F2] p-5 shadow-[3px_3px_0px_#18181B] flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-md bg-white border border-[#18181B]">
                        {p.codePrefix}-***
                      </span>
                      <span
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-md border border-[#18181B] ${
                          p.available > 5 ? "bg-[#86EFAC]" : "bg-[#FCA5A5]"
                        }`}
                      >
                        Sisa {p.available}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-[#18181B] mt-3">
                      {p.name}
                    </h3>
                    <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                      {p.termsConditions}
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-zinc-300 text-xs font-medium">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Total Pool:</span>
                      <span className="font-extrabold">{p.total} voucher</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Assigned (Di User):</span>
                      <span className="font-extrabold text-blue-700">
                        {p.assigned} voucher
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Redeemed (Di Kasir):</span>
                      <span className="font-extrabold text-emerald-700">
                        {p.redeemed} voucher
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Bobot RNG:</span>
                      <span className="font-extrabold">
                        {p.theoreticalShare}% (Weight {p.probabilityWeight})
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleTopupStock(p.id, 10)}
                      disabled={actionLoading === `topup-${p.id}`}
                      className="flex-1 py-2.5 rounded-xl bg-white hover:bg-[#FDE047] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] text-xs font-extrabold cursor-pointer"
                    >
                      +10 Kuota
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTopupStock(p.id, 50)}
                      disabled={actionLoading === `topup-${p.id}`}
                      className="flex-1 py-2.5 rounded-xl bg-[#18181B] hover:bg-zinc-800 text-white border-2 border-[#18181B] shadow-[2px_2px_0px_#C10230] text-xs font-extrabold cursor-pointer"
                    >
                      +50 Kuota
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===================================================================
            TAB 4: FRAUD & IP TELEMETRY
            =================================================================== */}
        {activeTab === "fraud" && (
          <section className="bg-white border-2 border-[#18181B] rounded-2xl p-6 shadow-[4px_4px_0px_#18181B] space-y-6">
            <div className="pb-5 border-b-2 border-zinc-100">
              <h2 className="text-xl font-extrabold text-[#18181B]">
                Deteksi Multi-Akun & IP Address Sama
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Memantau apabila ada 1 perangkat/jaringan yang mendaftar berkali-kali dengan nomor berbeda
              </p>
            </div>

            {suspiciousIps.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#86EFAC]/40 border-2 border-[#18181B] text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
                <h3 className="text-sm font-extrabold text-[#18181B]">
                  Tidak Ada Indikasi Duplikasi IP
                </h3>
                <p className="text-xs text-zinc-600">
                  Seluruh pendaftar berasal dari alamat IP yang wajar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {suspiciousIps.map((item) => (
                  <div
                    key={item.ip}
                    className="p-4 rounded-xl bg-[#FEF9C3] border-2 border-[#18181B] flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-extrabold bg-white px-2.5 py-1 rounded border border-[#18181B]">
                          IP: {item.ip}
                        </span>
                        <span className="px-2.5 py-0.5 rounded bg-[#FCA5A5] border border-[#18181B] text-xs font-extrabold">
                          {item.count} Akun Terkait
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#18181B] mt-2">
                        Nama Customer: {item.names.join(", ")}
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        Email: {item.emails.join(" • ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery(item.names[0] || "");
                        setActiveTab("customers");
                      }}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-[#FDE047] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] font-bold text-xs cursor-pointer"
                    >
                      Lihat Customer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* =====================================================================
          CMD + K INSTANT SEARCH MODAL
          ===================================================================== */}
      {cmdKOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20 p-4"
          onClick={() => setCmdKOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border-2 border-[#18181B] bg-white shadow-[6px_6px_0px_#18181B] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-[#FAF7F2] border-b-2 border-[#18181B] flex items-center gap-3">
              <Search className="w-5 h-5 text-[#18181B] shrink-0" />
              <input
                type="text"
                autoFocus
                value={cmdKQuery}
                onChange={(e) => setCmdKQuery(e.target.value)}
                placeholder="Ketik Nama Customer, No. WA, Email, atau Kode GC-..."
                className="w-full bg-transparent text-sm font-bold text-[#18181B] placeholder:text-zinc-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setCmdKOpen(false)}
                className="px-2 py-1 rounded bg-white border border-[#18181B] text-xs font-bold cursor-pointer"
              >
                ESC
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-200 p-2">
              {cmdKResults.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomer(c);
                    setCmdKOpen(false);
                  }}
                  className="p-3 rounded-xl hover:bg-[#FEF08A] flex items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-extrabold text-sm text-[#18181B] flex items-center gap-2">
                      <span>{c.fullName}</span>
                      {c.voucher && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded border border-[#18181B] font-extrabold ${
                            c.voucher.status === "REDEEMED"
                              ? "bg-[#86EFAC]"
                              : c.voucher.status === "REVOKED"
                              ? "bg-[#FCA5A5]"
                              : "bg-[#BFDBFE]"
                          }`}
                        >
                          {c.voucher.status}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-600 mt-0.5">
                      WA: {c.whatsapp} • {c.email}
                    </div>
                  </div>
                  {c.voucher && (
                    <div className="text-right">
                      <div className="font-mono text-xs font-extrabold bg-white px-2 py-0.5 rounded border border-[#18181B]">
                        {c.voucher.code}
                      </div>
                      <div className="text-[10px] font-semibold text-zinc-500 mt-0.5">
                        {c.voucher.prizeName}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          CUSTOMER DETAIL & ACTION MODAL
          ===================================================================== */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border-2 border-[#18181B] bg-white p-6 shadow-[6px_6px_0px_#18181B] space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b-2 border-zinc-100 pb-4">
              <div>
                <span className="inline-block px-2 py-0.5 bg-[#FDE047] border border-[#18181B] rounded text-[10px] font-extrabold uppercase">
                  Profil Customer
                </span>
                <h3 className="text-xl font-extrabold text-[#18181B] mt-1">
                  {selectedCustomer.fullName}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Terdaftar: {formatRelativeTime(selectedCustomer.registeredAt)} • IP:{" "}
                  {selectedCustomer.ipAddress}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-lg bg-[#FAF7F2] hover:bg-zinc-200 border border-[#18181B] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-xl bg-[#FAF7F2] border-2 border-[#18181B]">
                <div className="text-[11px] font-bold text-zinc-500">
                  Nomor WhatsApp
                </div>
                <div className="font-mono text-sm font-extrabold text-[#18181B] mt-0.5">
                  {selectedCustomer.whatsapp}
                </div>
                <a
                  href={`https://wa.me/${selectedCustomer.whatsapp.replace(
                    /\D/g,
                    ""
                  )}?text=${encodeURIComponent(
                    `Halo ${selectedCustomer.fullName}, berikut informasi E-Voucher Gong cha Central Park Anda: ${
                      selectedCustomer.voucher?.code || ""
                    } (${selectedCustomer.voucher?.prizeName || ""}).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#86EFAC] border border-[#18181B] text-xs font-bold text-[#18181B]"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Kirim WA</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF7F2] border-2 border-[#18181B]">
                <div className="text-[11px] font-bold text-zinc-500">
                  Alamat Email
                </div>
                <div className="text-xs font-extrabold text-[#18181B] truncate mt-0.5">
                  {selectedCustomer.email}
                </div>
                {selectedCustomer.voucher && (
                  <button
                    type="button"
                    onClick={() => handleResendEmail(selectedCustomer)}
                    disabled={actionLoading === `email-${selectedCustomer.id}`}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#BFDBFE] border border-[#18181B] text-xs font-bold text-[#18181B] cursor-pointer disabled:opacity-50"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>
                      {actionLoading === `email-${selectedCustomer.id}`
                        ? "Mengirim..."
                        : "Kirim Ulang Email"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {selectedCustomer.voucher ? (
              <div
                className={`p-4 rounded-xl border-2 border-[#18181B] space-y-3 ${
                  selectedCustomer.voucher.status === "REVOKED"
                    ? "bg-red-50"
                    : "bg-[#FEF9C3]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-[#18181B]">
                    {selectedCustomer.voucher.prizeName}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded border border-[#18181B] text-[11px] font-extrabold ${
                      selectedCustomer.voucher.status === "REDEEMED"
                        ? "bg-[#86EFAC]"
                        : selectedCustomer.voucher.status === "REVOKED"
                        ? "bg-[#FCA5A5]"
                        : "bg-[#BFDBFE]"
                    }`}
                  >
                    {selectedCustomer.voucher.status}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border-2 border-[#18181B]">
                  <span
                    className={`font-mono text-lg font-extrabold tracking-wider ${
                      selectedCustomer.voucher.status === "REVOKED"
                        ? "line-through text-zinc-400"
                        : "text-[#18181B]"
                    }`}
                  >
                    {selectedCustomer.voucher.code}
                  </span>
                  {selectedCustomer.voucher.status !== "REVOKED" && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          selectedCustomer.voucher?.code || ""
                        );
                        setCopiedCode(selectedCustomer.voucher?.code || null);
                        setTimeout(() => setCopiedCode(null), 1500);
                      }}
                      className="px-3 py-1 rounded-lg bg-[#FAF7F2] hover:bg-[#FDE047] border border-[#18181B] text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCode === selectedCustomer.voucher.code ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {selectedCustomer.voucher.status === "REVOKED" ? (
                  <div className="p-3 rounded-xl bg-[#FCA5A5]/40 border border-[#18181B] text-xs font-bold text-red-950 flex items-start gap-2">
                    <Ban className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      Voucher ini telah di-REVOKE dan dikembalikan ke kuota tersedia. Customer ini tidak dapat melakukan spin ulang.
                    </div>
                  </div>
                ) : (
                  <div className="pt-1 space-y-2.5">
                    {selectedCustomer.voucher.status === "ASSIGNED" ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleVoucherStatus(selectedCustomer, "REDEEMED")
                        }
                        disabled={
                          actionLoading === `status-${selectedCustomer.voucher.id}`
                        }
                        className="w-full py-2.5 rounded-xl bg-[#86EFAC] hover:brightness-95 text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] font-extrabold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Tandai Sudah Redeem</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleVoucherStatus(selectedCustomer, "ASSIGNED")
                        }
                        disabled={
                          actionLoading === `status-${selectedCustomer.voucher.id}`
                        }
                        className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] font-extrabold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Batalkan Redeem (Kembalikan ke ASSIGNED)</span>
                      </button>
                    )}

                    {/* REVOKE VOUCHER & RETURN TO QUOTA BUTTON */}
                    <button
                      type="button"
                      onClick={() => handleRevokeVoucher(selectedCustomer)}
                      disabled={actionLoading === `revoke-${selectedCustomer.id}`}
                      className="w-full py-2.5 rounded-xl bg-[#FCA5A5] hover:bg-red-400 text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] font-extrabold text-xs uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Ban className="w-4 h-4" />
                      <span>
                        {actionLoading === `revoke-${selectedCustomer.id}`
                          ? "Memproses Revoke..."
                          : "Revoke Voucher & Kembalikan ke Kuota"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#FAF7F2] border-2 border-[#18181B] text-center text-xs font-semibold text-zinc-600">
                Pengunjung ini belum memutar Spinwheel.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          FLOATING BATCH ACTION BAR (When 1+ Customers Selected)
          ===================================================================== */}
      {selectedCustomerIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-xl bg-[#18181B] text-white rounded-2xl border-2 border-[#18181B] p-4 shadow-[6px_6px_0px_rgba(0,0,0,0.4)] flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-[#FDE047] text-[#18181B] font-extrabold text-sm flex items-center justify-center">
              {selectedCustomerIds.size}
            </span>
            <div>
              <div className="font-extrabold text-sm text-[#FAF7F2]">
                Customer Terpilih
              </div>
              <div className="text-[11px] text-zinc-400">
                Siap untuk kirim ulang email voucher
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCustomerIds(new Set())}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleOpenBatchModal("selected")}
              className="px-4 py-2 rounded-xl bg-[#C10230] hover:bg-[#821518] text-white border border-white/20 shadow-[2px_2px_0px_#FFFFFF] font-extrabold text-xs uppercase flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Email ({selectedCustomerIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          BATCH RESEND EMAIL CONFIRMATION / PROGRESS MODAL
          ===================================================================== */}
      {batchModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => !isSendingBatch && setBatchModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border-2 border-[#18181B] bg-white p-6 shadow-[6px_6px_0px_#18181B] space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b-2 border-zinc-100 pb-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 bg-[#C10230] text-white border border-[#18181B] rounded text-[10px] font-extrabold uppercase tracking-wider">
                  Broadcast / Resend Email
                </span>
                <h3 className="text-xl font-extrabold text-[#18181B] mt-1.5">
                  Kirim Ulang Tiket E-Voucher
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Setiap customer akan menerima email dengan kartu tiket voucher dan QR code resmi
                </p>
              </div>
              {!isSendingBatch && (
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-[#FAF7F2] hover:bg-zinc-200 border border-[#18181B] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Scope / Filter Mode Selector (Only if not in 'selected' mode) */}
            {batchMode !== "selected" && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-700 block">
                  Pilih Target Penerima:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSendingBatch}
                    onClick={() => setBatchMode("unredeemed")}
                    className={`p-3 rounded-xl border-2 border-[#18181B] text-left transition-all cursor-pointer ${
                      batchMode === "unredeemed"
                        ? "bg-[#FEF08A] shadow-[2px_2px_0px_#18181B]"
                        : "bg-[#FAF7F2] hover:bg-zinc-100"
                    }`}
                  >
                    <div className="font-extrabold text-xs text-[#18181B]">
                      Hanya Belum Tukar
                    </div>
                    <div className="text-[11px] text-zinc-600 mt-0.5">
                      Status ASSIGNED (Belum redeem)
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isSendingBatch}
                    onClick={() => setBatchMode("all")}
                    className={`p-3 rounded-xl border-2 border-[#18181B] text-left transition-all cursor-pointer ${
                      batchMode === "all"
                        ? "bg-[#FEF08A] shadow-[2px_2px_0px_#18181B]"
                        : "bg-[#FAF7F2] hover:bg-zinc-100"
                    }`}
                  >
                    <div className="font-extrabold text-xs text-[#18181B]">
                      Semua Customer Aktif
                    </div>
                    <div className="text-[11px] text-zinc-600 mt-0.5">
                      Termasuk yang sudah REDEEMED
                    </div>
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">
                    Filter Kategori Hadiah:
                  </label>
                  <select
                    disabled={isSendingBatch}
                    value={batchPrizeFilter}
                    onChange={(e) => setBatchPrizeFilter(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF7F2] border-2 border-[#18181B] text-xs font-bold text-[#18181B]"
                  >
                    <option value="ALL">Semua Kategori Hadiah</option>
                    {prizeStats.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Target Summary Box */}
            <div className="p-4 rounded-xl bg-[#FAF7F2] border-2 border-[#18181B] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-medium">Mode Pengiriman:</span>
                <span className="font-extrabold text-[#18181B] uppercase">
                  {batchMode === "selected"
                    ? `${selectedCustomerIds.size} Customer Terpilih`
                    : batchMode === "unredeemed"
                    ? "Broadcast: Belum Tukar Saja"
                    : "Broadcast: Seluruh Customer"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-medium">Perlindungan Revoke:</span>
                <span className="font-extrabold text-emerald-700">
                  Aktif (Customer REVOKED otomatis dilewati)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-medium">Rate Throttling:</span>
                <span className="font-extrabold text-zinc-800">
                  Aman (~120ms jeda per email untuk Resend)
                </span>
              </div>
            </div>

            {/* Live Progress / Result Box */}
            {isSendingBatch && (
              <div className="p-4 rounded-xl bg-[#FEF9C3] border-2 border-[#18181B] text-center space-y-2">
                <RefreshCw className="w-5 h-5 text-[#C10230] animate-spin mx-auto" />
                <div className="text-xs font-extrabold text-[#18181B]">
                  Sedang Mengirim Email Batch...
                </div>
                <div className="text-[11px] text-zinc-600">
                  Mohon jangan menutup jendela ini hingga proses selesai.
                </div>
              </div>
            )}

            {batchResult && (
              <div
                className={`p-4 rounded-xl border-2 border-[#18181B] text-xs space-y-1 ${
                  batchResult.failed === 0 ? "bg-[#DCFCE7]" : "bg-[#FEF08A]"
                }`}
              >
                <div className="font-extrabold text-sm text-[#18181B]">
                  Laporan Pengiriman Email:
                </div>
                <div className="text-zinc-700">
                  • Total target: <strong>{batchResult.total}</strong> email
                </div>
                <div className="text-emerald-700 font-bold">
                  • Berhasil terkirim: <strong>{batchResult.sent}</strong> email
                </div>
                {batchResult.failed > 0 && (
                  <div className="text-red-700 font-bold">
                    • Gagal: <strong>{batchResult.failed}</strong> email
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-zinc-100">
              <button
                type="button"
                disabled={isSendingBatch}
                onClick={() => setBatchModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-zinc-200 border-2 border-[#18181B] font-bold text-xs cursor-pointer"
              >
                {batchResult ? "Tutup" : "Batal"}
              </button>

              {!batchResult && (
                <button
                  type="button"
                  disabled={
                    isSendingBatch ||
                    (batchMode === "selected" && selectedCustomerIds.size === 0)
                  }
                  onClick={handleExecuteBatchResend}
                  className="px-5 py-2.5 rounded-xl bg-[#C10230] hover:bg-[#821518] text-white border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] font-extrabold text-xs uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSendingBatch ? "Mengirim..." : "Kirim Sekarang"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
