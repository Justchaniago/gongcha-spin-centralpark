import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendVoucherEmail } from "@/lib/email";

const ADMIN_PIN = process.env.ADMIN_PIN || process.env.CASHIER_PIN || "2026";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pin = searchParams.get("pin");

    if (pin !== ADMIN_PIN) {
      return NextResponse.json({ error: "Unauthorized PIN" }, { status: 401 });
    }

    // 1. Fetch all prizes
    const { data: prizes, error: prizesError } = await supabaseAdmin
      .from("prizes")
      .select("*")
      .order("probability_weight", { ascending: false });

    // 2. Fetch all voucher codes with prize and guest details
    const { data: vouchers, error: vouchersError } = await supabaseAdmin
      .from("voucher_codes")
      .select(`
        id,
        prize_id,
        unique_code,
        status,
        assigned_to_user_id,
        assigned_at,
        redeemed_at,
        created_at,
        prizes (
          id,
          name,
          short_label,
          color,
          code_prefix,
          terms_conditions
        ),
        guest_users (
          id,
          full_name,
          whatsapp,
          email,
          ip_address,
          created_at
        )
      `)
      .order("id", { ascending: true });

    // 3. Fetch all guest users with their spin transactions
    const { data: guests, error: guestsError } = await supabaseAdmin
      .from("guest_users")
      .select(`
        id,
        full_name,
        whatsapp,
        email,
        ip_address,
        user_agent,
        created_at,
        spin_transactions (
          id,
          prize_id,
          voucher_code_id,
          spun_at
        )
      `)
      .order("created_at", { ascending: false });

    if (prizesError || vouchersError || guestsError) {
      console.error("Admin fetch error:", {
        prizesError,
        vouchersError,
        guestsError,
      });
    }

    const safePrizes = prizes || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeVouchers: any[] = vouchers || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeGuests: any[] = guests || [];

    // Aggregate per-prize inventory
    const totalWeight = safePrizes.reduce(
      (sum, p) => sum + (p.is_active ? p.probability_weight : 0),
      0
    );

    const prizeStats = safePrizes.map((p) => {
      const pVouchers = safeVouchers.filter((v) => v.prize_id === p.id);
      const total = pVouchers.length;
      const available = pVouchers.filter((v) => v.status === "AVAILABLE").length;
      const assigned = pVouchers.filter((v) => v.status === "ASSIGNED").length;
      const redeemed = pVouchers.filter((v) => v.status === "REDEEMED").length;
      const claimedTotal = assigned + redeemed;

      return {
        id: p.id,
        name: p.name,
        shortLabel: p.short_label,
        color: p.color,
        codePrefix: p.code_prefix,
        termsConditions: p.terms_conditions,
        probabilityWeight: p.probability_weight,
        theoreticalShare:
          totalWeight > 0 && p.is_active
            ? Math.round((p.probability_weight / totalWeight) * 1000) / 10
            : 0,
        isActive: p.is_active,
        total,
        available,
        assigned,
        redeemed,
        claimedTotal,
      };
    });

    // Overall KPI counters
    const totalVouchers = safeVouchers.length;
    const totalAvailable = safeVouchers.filter((v) => v.status === "AVAILABLE").length;
    const totalAssigned = safeVouchers.filter((v) => v.status === "ASSIGNED").length;
    const totalRedeemed = safeVouchers.filter((v) => v.status === "REDEEMED").length;
    const totalClaimed = totalAssigned + totalRedeemed;
    const totalGuests = safeGuests.length;

    // Enrich guests with voucher info for instant customer lookup
    const voucherByUserId = new Map();
    const voucherById = new Map();
    for (const v of safeVouchers) {
      voucherById.set(v.id, v);
      if (v.assigned_to_user_id) {
        voucherByUserId.set(v.assigned_to_user_id, v);
      }
    }

    const enrichedCustomers = safeGuests.map((g) => {
      const tx = Array.isArray(g.spin_transactions)
        ? g.spin_transactions[0]
        : g.spin_transactions;
      const vByUser = voucherByUserId.get(g.id);
      const vByTx = tx?.voucher_code_id ? voucherById.get(tx.voucher_code_id) : null;

      // Determine if this user's voucher was REVOKED:
      // A user is REVOKED if they have a spin_transaction (or user_agent tag "[REVOKED]"),
      // AND the voucher from their spin_transaction is no longer assigned to them (returned to AVAILABLE or assigned to someone else).
      const isRevoked =
        Boolean(g.user_agent && String(g.user_agent).includes("[REVOKED")) ||
        Boolean(tx && !vByUser && vByTx && vByTx.assigned_to_user_id !== g.id);

      const activeVoucher = isRevoked ? null : vByUser || vByTx;

      // Extract revoked metadata if stored in user_agent tag: [REVOKED:CODE:PRIZE:TIMESTAMP]
      let revokedVoucherInfo: {
        code: string;
        prizeId: string;
        prizeName: string;
        revokedAt: string | null;
      } | null = null;

      if (isRevoked) {
        const ua = String(g.user_agent || "");
        const match = ua.match(/\[REVOKED:([^:]+):([^:]+):([^\]]+)\]/);
        if (match) {
          revokedVoucherInfo = {
            code: match[1],
            prizeId: tx?.prize_id || "",
            prizeName: match[2],
            revokedAt: match[3],
          };
        } else if (vByTx) {
          revokedVoucherInfo = {
            code: vByTx.unique_code,
            prizeId: vByTx.prize_id,
            prizeName: vByTx.prizes?.name || vByTx.prize_id,
            revokedAt: tx?.spun_at || null,
          };
        }
      }

      return {
        id: g.id,
        fullName: g.full_name,
        whatsapp: g.whatsapp,
        email: g.email,
        ipAddress: g.ip_address || "—",
        userAgent: g.user_agent || "—",
        registeredAt: g.created_at,
        hasSpun: !!tx || !!vByUser || isRevoked,
        isRevoked,
        revokedInfo: revokedVoucherInfo,
        spunAt: tx?.spun_at || vByUser?.assigned_at || null,
        voucher: isRevoked
          ? {
              id: vByTx?.id || 0,
              code: revokedVoucherInfo?.code || vByTx?.unique_code || "REVOKED",
              status: "REVOKED",
              prizeId: revokedVoucherInfo?.prizeId || tx?.prize_id || "",
              prizeName:
                revokedVoucherInfo?.prizeName ||
                vByTx?.prizes?.name ||
                tx?.prize_id ||
                "Hadiah",
              shortLabel: vByTx?.prizes?.short_label || "REVOKED",
              termsConditions: vByTx?.prizes?.terms_conditions || "",
              assignedAt: tx?.spun_at || null,
              redeemedAt: null,
              revokedAt: revokedVoucherInfo?.revokedAt || null,
            }
          : activeVoucher
          ? {
              id: activeVoucher.id,
              code: activeVoucher.unique_code,
              status: activeVoucher.status,
              prizeId: activeVoucher.prize_id,
              prizeName: activeVoucher.prizes?.name || activeVoucher.prize_id,
              shortLabel:
                activeVoucher.prizes?.short_label || activeVoucher.prize_id,
              termsConditions: activeVoucher.prizes?.terms_conditions || "",
              assignedAt: activeVoucher.assigned_at,
              redeemedAt: activeVoucher.redeemed_at,
              revokedAt: null,
            }
          : null,
      };
    });

    const totalRevoked = enrichedCustomers.filter((c) => c.isRevoked).length;

    // Fraud / Anomaly insights: Check duplicate IP addresses
    interface IpEntry {
      ip: string;
      count: number;
      names: string[];
      emails: string[];
    }
    const ipMap = new Map<string, IpEntry>();
    for (const c of enrichedCustomers) {
      if (c.ipAddress && c.ipAddress !== "unknown" && c.ipAddress !== "—") {
        const existing = ipMap.get(c.ipAddress);
        const entry: IpEntry = existing || {
          ip: c.ipAddress,
          count: 0,
          names: [],
          emails: [],
        };
        entry.count += 1;
        entry.names.push(String(c.fullName || "Guest"));
        entry.emails.push(String(c.email || ""));
        ipMap.set(c.ipAddress, entry);
      }
    }

    const suspiciousIps = Array.from(ipMap.values())
      .filter((item) => item.count >= 2)
      .sort((a, b) => b.count - a.count);

    // Recent Activity Feed (Spins + Redemptions sorted by time)
    const recentActivities: {
      id: string;
      type: "SPIN_CLAIM" | "REDEEMED";
      timestamp: string;
      guestName: string;
      whatsapp: string;
      email: string;
      code: string;
      prizeName: string;
      prizeId: string;
    }[] = [];

    for (const v of safeVouchers) {
      if (v.assigned_at) {
        recentActivities.push({
          id: `claim-${v.id}`,
          type: "SPIN_CLAIM",
          timestamp: v.assigned_at,
          guestName: v.guest_users?.full_name || "Guest",
          whatsapp: v.guest_users?.whatsapp || "",
          email: v.guest_users?.email || "",
          code: v.unique_code,
          prizeName: v.prizes?.name || v.prize_id,
          prizeId: v.prize_id,
        });
      }
      if (v.redeemed_at) {
        recentActivities.push({
          id: `redeem-${v.id}`,
          type: "REDEEMED",
          timestamp: v.redeemed_at,
          guestName: v.guest_users?.full_name || "Guest",
          whatsapp: v.guest_users?.whatsapp || "",
          email: v.guest_users?.email || "",
          code: v.unique_code,
          prizeName: v.prizes?.name || v.prize_id,
          prizeId: v.prize_id,
        });
      }
    }

    recentActivities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      kpis: {
        totalGuests,
        totalSpins: totalClaimed,
        totalVouchers,
        totalAvailable,
        totalAssigned,
        totalRedeemed,
        totalRevoked,
        redemptionRate:
          totalClaimed > 0
            ? Math.round((totalRedeemed / totalClaimed) * 1000) / 10
            : 0,
        stockBurnRate:
          totalVouchers > 0
            ? Math.round((totalClaimed / totalVouchers) * 1000) / 10
            : 0,
      },
      prizeStats,
      customers: enrichedCustomers,
      recentActivities: recentActivities.slice(0, 60),
      suspiciousIps,
    });
  } catch (err) {
    console.error("Admin GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin, action } = body;

    if (pin !== ADMIN_PIN) {
      return NextResponse.json({ error: "PIN Admin tidak valid" }, { status: 401 });
    }

    // ACTION 1: Generate / Top-up Stock Vouchers for a Prize Category
    if (action === "topup_stock") {
      const { prizeId, count = 10 } = body;
      const safeCount = Math.min(Math.max(Number(count) || 5, 1), 200);

      const { data: prize } = await supabaseAdmin
        .from("prizes")
        .select("id, code_prefix, name")
        .eq("id", prizeId)
        .single();

      if (!prize) {
        return NextResponse.json({ error: "Prize tidak ditemukan" }, { status: 404 });
      }

      // Generate unique POS codes with prefix + random alphanumeric suffix
      const newCodes = [];
      const prefix = prize.code_prefix || "GC-CP";
      for (let i = 0; i < safeCount; i++) {
        const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        const numPart = String(Math.floor(100 + Math.random() * 900));
        newCodes.push({
          prize_id: prizeId,
          unique_code: `${prefix}-${numPart}${randPart}`,
          status: "AVAILABLE",
        });
      }

      const { error: insertErr } = await supabaseAdmin
        .from("voucher_codes")
        .insert(newCodes);

      if (insertErr) {
        console.error("Topup error:", insertErr);
        return NextResponse.json(
          { error: "Gagal menambahkan stok kode voucher" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil menambahkan +${safeCount} kuota voucher untuk ${prize.name}`,
      });
    }

    // ACTION 2: Update Prize Weight or Active Status
    if (action === "update_prize") {
      const { prizeId, probabilityWeight, isActive } = body;
      const updatePayload: Record<string, unknown> = {};
      if (typeof probabilityWeight === "number") {
        updatePayload.probability_weight = Math.max(0, Math.min(100, probabilityWeight));
      }
      if (typeof isActive === "boolean") {
        updatePayload.is_active = isActive;
      }

      const { error: updateErr } = await supabaseAdmin
        .from("prizes")
        .update(updatePayload)
        .eq("id", prizeId);

      if (updateErr) {
        return NextResponse.json(
          { error: "Gagal mengubah konfigurasi hadiah" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Konfigurasi hadiah berhasil diperbarui",
      });
    }

    // ACTION 3: Toggle Voucher Status (Mark REDEEMED or Undo to ASSIGNED)
    if (action === "set_voucher_status") {
      const { voucherId, newStatus } = body;
      if (!["ASSIGNED", "REDEEMED"].includes(newStatus)) {
        return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
      }

      const updateData =
        newStatus === "REDEEMED"
          ? { status: "REDEEMED", redeemed_at: new Date().toISOString() }
          : { status: "ASSIGNED", redeemed_at: null };

      const { error } = await supabaseAdmin
        .from("voucher_codes")
        .update(updateData)
        .eq("id", voucherId);

      if (error) {
        return NextResponse.json(
          { error: "Gagal mengubah status voucher" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Status voucher berhasil diubah ke ${newStatus}`,
      });
    }

    // ACTION 4: Resend Voucher Email via Resend (Single or Batch)
    if (action === "resend_email") {
      const { email, userName, voucherCode, prizeName, termsConditions } = body;
      const result = await sendVoucherEmail({
        to: email,
        userName,
        voucherCode,
        prizeName,
        termsConditions,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Gagal mengirim ulang email" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `E-Voucher ${voucherCode} berhasil dikirim ulang ke ${email}`,
      });
    }

    // ACTION 4B: BATCH RESEND EMAIL (Multiple or All with Throttling & REVOKED skip)
    if (action === "batch_resend_email") {
      const { customerIds, filterMode, targetPrizeId } = body;
      // customerIds: string[] (optional for selected), or filterMode: 'all' | 'unredeemed' | 'redeemed'

      // Fetch all eligible customer records with active voucher
      let query = supabaseAdmin
        .from("guest_users")
        .select(`
          id,
          full_name,
          email,
          user_agent,
          spin_transactions (
            id,
            voucher_codes (
              id,
              unique_code,
              status,
              prize_id,
              prizes (
                name,
                terms_conditions
              )
            )
          )
        `);

      if (Array.isArray(customerIds) && customerIds.length > 0) {
        query = query.in("id", customerIds);
      }

      const { data: users, error: fetchErr } = await query;

      if (fetchErr || !users) {
        return NextResponse.json(
          { error: "Gagal mengambil data customer untuk broadcast email" },
          { status: 500 }
        );
      }

      interface TargetItem {
        email: string;
        userName: string;
        voucherCode: string;
        prizeName: string;
        termsConditions?: string;
      }

      const targets: TargetItem[] = [];

      for (const u of users) {
        // Skip revoked users
        if (String(u.user_agent || "").includes("[REVOKED")) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const txList = u.spin_transactions as any[];
        const tx = Array.isArray(txList) && txList.length > 0 ? txList[0] : null;
        const vc = tx?.voucher_codes;

        if (!vc || vc.status === "REVOKED") continue;

        // Filter status if filterMode is set
        if (filterMode === "unredeemed" && vc.status !== "ASSIGNED") continue;
        if (filterMode === "redeemed" && vc.status !== "REDEEMED") continue;

        // Filter prize if targetPrizeId specified
        if (targetPrizeId && targetPrizeId !== "ALL" && vc.prize_id !== targetPrizeId) continue;

        if (u.email && u.email.includes("@")) {
          targets.push({
            email: u.email,
            userName: u.full_name || "Customer",
            voucherCode: vc.unique_code,
            prizeName: vc.prizes?.name || "Voucher Gong cha",
            termsConditions: vc.prizes?.terms_conditions,
          });
        }
      }

      if (targets.length === 0) {
        return NextResponse.json({
          success: true,
          total: 0,
          sent: 0,
          failed: 0,
          message: "Tidak ada customer valid yang memenuhi kriteria pengiriman",
        });
      }

      // Execute throttled sending (~120ms between dispatches to safely stay within Resend tier rate limits)
      let sentCount = 0;
      let failedCount = 0;
      const failures: { email: string; error: string }[] = [];

      for (const target of targets) {
        try {
          const res = await sendVoucherEmail({
            to: target.email,
            userName: target.userName,
            voucherCode: target.voucherCode,
            prizeName: target.prizeName,
            termsConditions: target.termsConditions,
          });

          if (res.success) {
            sentCount++;
          } else {
            failedCount++;
            failures.push({ email: target.email, error: res.error || "Gagal" });
          }
        } catch (dispatchErr: any) {
          failedCount++;
          failures.push({ email: target.email, error: dispatchErr?.message || "Exception" });
        }

        // 120ms throttle delay
        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      return NextResponse.json({
        success: true,
        total: targets.length,
        sent: sentCount,
        failed: failedCount,
        failures: failures.slice(0, 10),
        message: `Berhasil mengirim ${sentCount} dari ${targets.length} email voucher`,
      });
    }

    // ACTION 5: REVOKE VOUCHER (Permanently invalidate old code, generate fresh replacement code to pool, & lock user)
    if (action === "revoke_voucher") {
      const { userId, voucherId, voucherCode, prizeName } = body;
      if (!userId) {
        return NextResponse.json(
          { error: "User ID diperlukan untuk revoke" },
          { status: 400 }
        );
      }

      const nowIso = new Date().toISOString();

      // 1. Permanently invalidate old voucher code by prefixing with REVOKED- so it can never be used at cashier
      let targetPrizeId: string | null = null;
      if (voucherId) {
        const { data: currentVoucher } = await supabaseAdmin
          .from("voucher_codes")
          .select("id, unique_code, prize_id")
          .eq("id", voucherId)
          .maybeSingle();

        if (currentVoucher) {
          targetPrizeId = currentVoucher.prize_id;
          const oldCode = currentVoucher.unique_code;
          const safeRevokedCode = oldCode.startsWith("REVOKED-")
            ? oldCode
            : `REVOKED-${oldCode}`;

          await supabaseAdmin
            .from("voucher_codes")
            .update({
              unique_code: safeRevokedCode,
              status: "REVOKED",
              revoked_at: nowIso,
              revoked_reason: "Dibatalkan oleh Admin melalui Panel Kontrol",
            })
            .eq("id", voucherId);

          // 2. Generate a FRESH, unique voucher code and insert into AVAILABLE pool for this prize
          const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
          let part1 = "";
          let part2 = "";
          for (let i = 0; i < 4; i++) part1 += chars[Math.floor(Math.random() * chars.length)];
          for (let i = 0; i < 4; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
          const newCode = `GC-${part1}-${part2}`;

          await supabaseAdmin
            .from("voucher_codes")
            .insert({
              prize_id: targetPrizeId,
              unique_code: newCode,
              status: "AVAILABLE",
              created_at: nowIso,
            });
        }
      }

      // 3. Mark guest_users record with [REVOKED:...] tag and keep spin_transactions row intact
      // Keeping spin_transactions row ensures uq_guest_one_spin & /api/register & /api/spin permanently block this user
      const { data: existingGuest } = await supabaseAdmin
        .from("guest_users")
        .select("user_agent")
        .eq("id", userId)
        .maybeSingle();

      const cleanUa = String(existingGuest?.user_agent || "").replace(
        /\s*\[REVOKED:[^\]]+\]/g,
        ""
      );
      const revokedTag = `[REVOKED:${voucherCode || "CODE"}:${
        prizeName || "PRIZE"
      }:${nowIso}]`;

      await supabaseAdmin
        .from("guest_users")
        .update({
          user_agent: `${cleanUa} ${revokedTag}`.trim(),
        })
        .eq("id", userId);

      return NextResponse.json({
        success: true,
        revokedAt: nowIso,
        message: `Voucher ${
          voucherCode || ""
        } telah dibatalkan permanen. Sistem telah menambahkan 1 kode voucher baru ke kuota hadiah. User diblokir dari spin ulang.`,
      });
    }

    return NextResponse.json({ error: "Action tidak dikenali" }, { status: 400 });
  } catch (err) {
    console.error("Admin POST error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
