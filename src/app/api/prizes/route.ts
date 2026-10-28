import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { data: prizes, error } = await supabaseAdmin
      .from("prizes")
      .select("id, name, short_label, color, text_color, code_prefix, terms_conditions, probability_weight")
      .eq("is_active", true)
      .order("probability_weight", { ascending: false });

    if (error || !prizes || prizes.length === 0) {
      console.error("Fetch prizes error:", error);
      return NextResponse.json(
        { error: "Failed to fetch prizes from database" },
        { status: 500 }
      );
    }

    const formattedPrizes = prizes.map((p) => ({
      id: p.id,
      label: p.name,
      shortLabel: p.short_label,
      color: p.color,
      textColor: p.text_color,
      codePrefix: p.code_prefix,
      tnc: p.terms_conditions,
    }));

    return NextResponse.json({ prizes: formattedPrizes });
  } catch (err) {
    console.error("Prizes route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
