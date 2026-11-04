import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { sendVoucherEmail } from "@/lib/email";
import { getOrCreateVoucherQrCodeUrl } from "@/lib/voucher-qr";

const SpinSchema = z.object({
  userId: z.string().uuid("Invalid user session"),
});

interface PrizeRow {
  id: string;
  probability_weight: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SpinSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid user session id." },
        { status: 400 }
      );
    }

    const { userId } = parsed.data;

    // 0. Check if user is revoked
    const { data: guestCheck } = await supabaseAdmin
      .from("guest_users")
      .select("user_agent")
      .eq("id", userId)
      .maybeSingle();

    if (guestCheck && String(guestCheck.user_agent || "").includes("[REVOKED")) {
      return NextResponse.json(
        {
          error:
            "Hak partisipasi Anda telah dibatalkan (Revoked). Anda tidak dapat melakukan spin kembali.",
        },
        { status: 403 }
      );
    }

    // 1. Double check if user has already spun
    const { data: existingTx } = await supabaseAdmin
      .from("spin_transactions")
      .select("id, voucher_codes(unique_code, status, assigned_to_user_id, prizes(id, name, terms_conditions))")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingTx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vc = (existingTx as any).voucher_codes;
      if (!vc || vc.assigned_to_user_id !== userId) {
        return NextResponse.json(
          {
            error:
              "Voucher Anda telah di-revoke oleh Admin dan Anda tidak dapat melakukan spin ulang.",
          },
          { status: 403 }
        );
      }
      const qrRes = vc?.unique_code
        ? await getOrCreateVoucherQrCodeUrl(vc.unique_code)
        : null;

      return NextResponse.json(
        {
          error: "You have already participated and spun the wheel.",
          voucher: {
            uniqueCode: vc?.unique_code,
            prizeName: vc?.prizes?.name,
            prizeId: vc?.prizes?.id,
            termsConditions: vc?.prizes?.terms_conditions,
            qrCodeUrl: qrRes?.url,
          },
        },
        { status: 400 }
      );
    }

    // 2. Fetch active prizes and calculate server-side RNG
    const { data: prizes, error: prizesError } = await supabaseAdmin
      .from("prizes")
      .select("id, probability_weight")
      .eq("is_active", true);

    if (prizesError || !prizes || prizes.length === 0) {
      return NextResponse.json(
        { error: "Prize pool configuration is unavailable." },
        { status: 500 }
      );
    }

    // Weighted Random Selection (RNG)
    const prizeRows = prizes as PrizeRow[];
    const totalWeight = prizeRows.reduce((acc, p) => acc + p.probability_weight, 0);
    let randomNum = Math.random() * totalWeight;
    let selectedPrizeId = prizeRows[0].id;

    for (const p of prizeRows) {
      if (randomNum < p.probability_weight) {
        selectedPrizeId = p.id;
        break;
      }
      randomNum -= p.probability_weight;
    }

    // 3. Allocate voucher using atomic concurrency CAS (Compare-And-Swap) loop
    // Guarantees zero duplicate voucher allocation even under heavy concurrent spins.
    let assignedVoucher: {
      id: number;
      unique_code: string;
      prize_id: string;
      prize_name?: string;
      terms_conditions?: string;
    } | null = null;

    const maxAllocationAttempts = 5;

    for (let attempt = 0; attempt < maxAllocationAttempts; attempt++) {
      // Step A: Pick top candidate available vouchers for target prize (or any available fallback)
      let { data: candidates } = await supabaseAdmin
        .from("voucher_codes")
        .select("id, unique_code, prize_id, prizes(id, name, terms_conditions)")
        .eq("prize_id", selectedPrizeId)
        .eq("status", "AVAILABLE")
        .limit(10);

      // Fallback if target prize is out of stock: pick from any available prize pool
      if (!candidates || candidates.length === 0) {
        const { data: fallbackPool } = await supabaseAdmin
          .from("voucher_codes")
          .select("id, unique_code, prize_id, prizes(id, name, terms_conditions)")
          .eq("status", "AVAILABLE")
          .limit(10);

        candidates = fallbackPool;
      }

      if (!candidates || candidates.length === 0) {
        break; // Out of stock across all prizes
      }

      // Step B: Attempt atomic lock on candidate vouchers using CAS (.eq("status", "AVAILABLE"))
      // If another user claimed candidate in the same millisecond, .select() returns 0 rows.
      for (const candidate of candidates) {
        const { data: lockedRows, error: lockErr } = await supabaseAdmin
          .from("voucher_codes")
          .update({
            status: "ASSIGNED",
            assigned_to_user_id: userId,
            assigned_at: new Date().toISOString(),
          })
          .eq("id", candidate.id)
          .eq("status", "AVAILABLE") // Strict Atomic Concurrency Guard
          .select("id, unique_code, prize_id");

        if (!lockErr && lockedRows && lockedRows.length > 0) {
          // Successfully and exclusively claimed!
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cObj: any = candidate;
          assignedVoucher = {
            id: lockedRows[0].id,
            unique_code: lockedRows[0].unique_code,
            prize_id: lockedRows[0].prize_id,
            prize_name: cObj.prizes?.name,
            terms_conditions: cObj.prizes?.terms_conditions,
          };
          break;
        }
      }

      if (assignedVoucher) break;
    }

    if (!assignedVoucher) {
      return NextResponse.json(
        { error: "Mohon maaf, seluruh kuota voucher telah habis atau sedang dalam proses klaim. Silakan coba kembali." },
        { status: 410 }
      );
    }

    const finalPrizeId = assignedVoucher.prize_id;
    const finalPrizeName = assignedVoucher.prize_name;
    const finalTnc = assignedVoucher.terms_conditions;
    const voucherId = assignedVoucher.id;
    const uniqueCode = assignedVoucher.unique_code;

    // Fetch user full_name & email for recording and notification
    const { data: uData } = await supabaseAdmin
      .from("guest_users")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    const userFullName = uData?.full_name || "Guest";
    const userEmail = uData?.email;

    // Step C: Record in spin_transactions
    await supabaseAdmin
      .from("spin_transactions")
      .insert({
        user_id: userId,
        full_name: userFullName,
        prize_id: finalPrizeId,
        voucher_code_id: voucherId,
      });

    // Step D: Generate permanent QR code asset and upload to Supabase Storage
    const { url: qrCodeUrl } = await getOrCreateVoucherQrCodeUrl(uniqueCode);

    // Step E: Asynchronously dispatch voucher email via Resend (Non-blocking)
    if (userEmail) {
      sendVoucherEmail({
        to: userEmail,
        userName: userFullName,
        voucherCode: uniqueCode,
        prizeName: finalPrizeName || "Voucher Gong cha",
        termsConditions: finalTnc,
        qrCodeUrl,
      }).catch((emailErr) => {
        console.error("[Email Dispatch Background Error]:", emailErr);
      });
    }

    return NextResponse.json({
      status: "SUCCESS",
      voucher: {
        code: uniqueCode,
        uniqueCode: uniqueCode,
        prizeId: finalPrizeId,
        prizeName: finalPrizeName,
        termsConditions: finalTnc,
        qrCodeUrl,
      },
    });
  } catch (error) {
    console.error("Spin endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
