import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";

const RegisterSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  whatsapp: z.string().min(9, "Invalid WhatsApp number").max(16, "Invalid WhatsApp number"),
  email: z.string().email("Invalid email address"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { fullName, whatsapp, email } = parsed.data;
    const cleanedPhone = whatsapp.replace(/\D/g, "");

    // 1. Check if user already exists with this phone or email
    const { data: existingUser } = await supabaseAdmin
      .from("guest_users")
      .select("id, full_name, spin_transactions(id, voucher_codes(unique_code, prizes(name, terms_conditions)))")
      .or(`whatsapp.eq.${cleanedPhone},email.eq.${email.trim().toLowerCase()}`)
      .maybeSingle();

    if (existingUser) {
      // If already spun, return their existing claimed voucher
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = (existingUser as any).spin_transactions?.[0];
      if (tx) {
        return NextResponse.json({
          status: "ALREADY_CLAIMED",
          message: "You have already claimed your Grand Opening voucher with this number or email.",
          user: {
            id: existingUser.id,
            name: existingUser.full_name,
          },
          voucher: {
            uniqueCode: tx.voucher_codes?.unique_code,
            prizeName: tx.voucher_codes?.prizes?.name,
            termsConditions: tx.voucher_codes?.prizes?.terms_conditions,
          },
        });
      }

      // Registered but hasn't spun yet
      return NextResponse.json({
        status: "READY_TO_SPIN",
        userId: existingUser.id,
      });
    }

    // 2. Insert new guest user
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const { data: newUser, error: insertError } = await supabaseAdmin
      .from("guest_users")
      .insert({
        full_name: fullName.trim(),
        whatsapp: cleanedPhone,
        email: email.trim().toLowerCase(),
        ip_address: ip,
        user_agent: userAgent,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert user error:", insertError);
      return NextResponse.json(
        { error: "Failed to register user. Please check your data." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "READY_TO_SPIN",
      userId: newUser.id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
