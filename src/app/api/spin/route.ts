import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";

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

    // 3. Execute PostgreSQL atomic stored procedure (locks 1 AVAILABLE voucher)
    const { data: claimResult, error: claimError } = await supabaseAdmin.rpc(
      "claim_spin_voucher",
      {
        p_user_id: userId,
        p_requested_prize_id: selectedPrizeId,
      }
    );

    if (claimError || !claimResult || claimResult.length === 0) {
      console.error("Claim voucher RPC error:", claimError);
      if (claimError?.message?.includes("ALL_VOUCHERS_EXHAUSTED")) {
        return NextResponse.json(
          { error: "We are sorry, all vouchers have been fully claimed for this event." },
          { status: 410 }
        );
      }
      return NextResponse.json(
        { error: "Failed to allocate voucher code. Please try again." },
        { status: 500 }
      );
    }

    const won = claimResult[0];

    return NextResponse.json({
      status: "SUCCESS",
      voucher: {
        uniqueCode: won.unique_code,
        prizeId: won.prize_id,
        prizeName: won.prize_name,
        termsConditions: won.terms_conditions,
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
