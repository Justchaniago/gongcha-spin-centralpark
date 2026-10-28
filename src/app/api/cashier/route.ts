import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const CASHIER_PIN = process.env.CASHIER_PIN || "2026";

// GET endpoint to fetch recent redeemed vouchers for real-time history
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pin = searchParams.get("pin");

    if (pin !== CASHIER_PIN) {
      return NextResponse.json({ error: "Unauthorized PIN" }, { status: 401 });
    }

    const { data: history, error } = await supabaseAdmin
      .from("voucher_codes")
      .select(`
        id,
        unique_code,
        status,
        redeemed_at,
        prizes (
          name
        ),
        guest_users (
          full_name,
          whatsapp
        )
      `)
      .eq("status", "REDEEMED")
      .order("redeemed_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("History fetch error:", error);
      return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted = (history || []).map((h: any) => ({
      id: h.id,
      code: h.unique_code,
      prizeName: h.prizes?.name || "Gong cha Prize",
      guestName: h.guest_users?.full_name || "Guest",
      whatsapp: h.guest_users?.whatsapp,
      redeemedAt: h.redeemed_at,
    }));

    return NextResponse.json({ history: formatted });
  } catch (err) {
    console.error("Cashier GET history error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, autoRedeem } = body;

    // Validate PIN
    if (body.pin !== CASHIER_PIN) {
      return NextResponse.json(
        { error: "PIN Kasir salah. Akses ditolak." },
        { status: 401 }
      );
    }

    // Clean code: trim, remove extra spaces, uppercase
    let cleanedCode = (body.code || "").trim().toUpperCase();

    // If cashier scanned with URL or trailing chars, extract voucher code pattern
    const match = cleanedCode.match(/GC-[A-Z0-9-]+/i);
    if (match) {
      cleanedCode = match[0].toUpperCase();
    }

    // 1. Fetch voucher from database
    const { data: voucher, error: vError } = await supabaseAdmin
      .from("voucher_codes")
      .select(`
        id,
        unique_code,
        status,
        assigned_at,
        redeemed_at,
        prizes (
          id,
          name,
          terms_conditions
        ),
        guest_users (
          id,
          full_name,
          whatsapp,
          email
        )
      `)
      .ilike("unique_code", cleanedCode)
      .maybeSingle();

    if (vError || !voucher) {
      return NextResponse.json(
        { error: `Kode voucher "${cleanedCode}" tidak ditemukan dalam sistem.` },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v: any = voucher;

    // 2. CHECK IF ALREADY REDEEMED
    if (v.status === "REDEEMED") {
      return NextResponse.json(
        {
          status: "ALREADY_REDEEMED",
          error: "VOUCHER_ALREADY_REDEEMED",
          message: `Voucher ini SUDAH PERNAH DIGUNAKAN pada ${new Date(
            v.redeemed_at
          ).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB.`,
          voucher: {
            id: v.id,
            code: v.unique_code,
            prizeName: v.prizes?.name,
            guestName: v.guest_users?.full_name || "Guest",
            whatsapp: v.guest_users?.whatsapp,
            redeemedAt: v.redeemed_at,
          },
        },
        { status: 409 }
      );
    }

    if (v.status === "AVAILABLE") {
      return NextResponse.json(
        {
          error: "Voucher ini belum diklaim oleh pengunjung manapun melalui Spin the Wheel.",
        },
        { status: 400 }
      );
    }

    // 3. AUTO-REDEEM OR MANUAL REDEEM ACTION
    if (action === "redeem" || autoRedeem === true) {
      const nowIso = new Date().toISOString();
      const { error: updateError } = await supabaseAdmin
        .from("voucher_codes")
        .update({
          status: "REDEEMED",
          redeemed_at: nowIso,
        })
        .eq("id", v.id)
        .eq("status", "ASSIGNED"); // atomic concurrency check

      if (updateError) {
        console.error("Redeem update error:", updateError);
        return NextResponse.json(
          { error: "Gagal memperbarui status voucher di database." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        status: "REDEEMED_SUCCESS",
        message: "Voucher berhasil di-redeem!",
        voucher: {
          id: v.id,
          code: v.unique_code,
          prizeName: v.prizes?.name,
          guestName: v.guest_users?.full_name || "Guest",
          whatsapp: v.guest_users?.whatsapp,
          redeemedAt: nowIso,
        },
      });
    }

    // 4. CHECK ONLY (IF NOT AUTO-REDEEM)
    return NextResponse.json({
      success: true,
      status: "CHECKED",
      voucher: {
        id: v.id,
        code: v.unique_code,
        status: v.status,
        prizeName: v.prizes?.name,
        termsConditions: v.prizes?.terms_conditions,
        guestName: v.guest_users?.full_name || "Guest",
        whatsapp: v.guest_users?.whatsapp,
        assignedAt: v.assigned_at,
        redeemedAt: v.redeemed_at,
      },
    });
  } catch (err) {
    console.error("Cashier API error:", err);
    return NextResponse.json(
      { error: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
