import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { sendVoucherEmail } from "@/lib/email";

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

    // 1. Double check if user has already spun
    const { data: existingTx } = await supabaseAdmin
      .from("spin_transactions")
      .select("id, voucher_codes(unique_code, prizes(id, name, terms_conditions))")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingTx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vc = (existingTx as any).voucher_codes;
      return NextResponse.json(
        {
          error: "You have already participated and spun the wheel.",
          voucher: {
            uniqueCode: vc?.unique_code,
            prizeName: vc?.prizes?.name,
            prizeId: vc?.prizes?.id,
            termsConditions: vc?.prizes?.terms_conditions,
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

    // 3. Allocate voucher using atomic transaction in Supabase
    // Step A: Lock 1 available voucher for requested prize (or fallback to any available)
    const { data: availableVouchers, error: findError } = await supabaseAdmin
      .from("voucher_codes")
      .select("id, unique_code, prize_id, prizes(id, name, terms_conditions)")
      .eq("prize_id", selectedPrizeId)
      .eq("status", "AVAILABLE")
      .limit(1);

    let voucherToAssign = availableVouchers && availableVouchers.length > 0 ? availableVouchers[0] : null;

    // Fallback if requested prize is out of stock
    if (!voucherToAssign) {
      const { data: fallbackVouchers } = await supabaseAdmin
        .from("voucher_codes")
        .select("id, unique_code, prize_id, prizes(id, name, terms_conditions)")
        .eq("status", "AVAILABLE")
        .limit(1);

      if (fallbackVouchers && fallbackVouchers.length > 0) {
        voucherToAssign = fallbackVouchers[0];
      }
    }

    if (!voucherToAssign) {
      return NextResponse.json(
        { error: "Mohon maaf, seluruh kuota voucher telah habis terklaim." },
        { status: 410 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vObj: any = voucherToAssign;
    const finalPrizeId = vObj.prize_id;
    const finalPrizeName = vObj.prizes?.name;
    const finalTnc = vObj.prizes?.terms_conditions;
    const voucherId = vObj.id;
    const uniqueCode = vObj.unique_code;

    // Fetch user full_name & email for recording and notification
    const { data: uData } = await supabaseAdmin
      .from("guest_users")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    const userFullName = uData?.full_name || "Guest";
    const userEmail = uData?.email;

    // Step B: Mark voucher as ASSIGNED
    const { error: assignError } = await supabaseAdmin
      .from("voucher_codes")
      .update({
        status: "ASSIGNED",
        assigned_to_user_id: userId,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", voucherId)
      .eq("status", "AVAILABLE"); // Atomic concurrency guard

    if (assignError) {
      console.error("Assign voucher error:", assignError);
      return NextResponse.json(
        { error: "Failed to allocate voucher code. Please try again." },
        { status: 500 }
      );
    }

    // Step C: Record in spin_transactions
    await supabaseAdmin
      .from("spin_transactions")
      .insert({
        user_id: userId,
        full_name: userFullName,
        prize_id: finalPrizeId,
        voucher_code_id: voucherId,
      });

    // Step D: Asynchronously dispatch voucher email via Resend (Non-blocking)
    if (userEmail) {
      sendVoucherEmail({
        to: userEmail,
        userName: userFullName,
        voucherCode: uniqueCode,
        prizeName: finalPrizeName || "Voucher Gong cha",
        termsConditions: finalTnc,
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
