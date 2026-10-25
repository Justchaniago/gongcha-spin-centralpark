import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = body.type; // "whatsapp" | "email"
    const value = body.value?.trim();

    if (!type || !value) {
      return NextResponse.json({ error: "Missing type or value" }, { status: 400 });
    }

    if (type === "whatsapp") {
      const cleanedPhone = value.replace(/\D/g, "");
      if (cleanedPhone.length < 9) {
        return NextResponse.json({ exists: false });
      }

      const { data: existingUser } = await supabaseAdmin
        .from("guest_users")
        .select("id, spin_transactions(id)")
        .eq("whatsapp", cleanedPhone)
        .maybeSingle();

      if (existingUser) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = (existingUser as any).spin_transactions;
        const hasSpun = Array.isArray(tx) ? tx.length > 0 : !!tx;
        return NextResponse.json({
          exists: true,
          hasSpun,
          message: hasSpun
            ? "This WhatsApp number has already claimed a voucher."
            : "This WhatsApp number is already registered.",
        });
      }

      return NextResponse.json({ exists: false });
    }

    if (type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return NextResponse.json({ exists: false });
      }

      const { data: existingUser } = await supabaseAdmin
        .from("guest_users")
        .select("id, spin_transactions(id)")
        .eq("email", value.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = (existingUser as any).spin_transactions;
        const hasSpun = Array.isArray(tx) ? tx.length > 0 : !!tx;
        return NextResponse.json({
          exists: true,
          hasSpun,
          message: hasSpun
            ? "This Email address has already claimed a voucher."
            : "This Email address is already registered.",
        });
      }

      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ error: "Invalid check type" }, { status: 400 });
  } catch (err) {
    console.error("Check user error:", err);
    return NextResponse.json({ error: "Failed to check user" }, { status: 500 });
  }
}
