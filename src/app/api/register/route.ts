import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { checkDisposableEmail, checkIpVelocity } from "@/lib/antispam";

const RegisterSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(60, "Name is too long")
    .regex(/^[a-zA-Z0-9\s'.-]+$/, "Name contains invalid characters"),
  whatsapp: z
    .string()
    .min(9, "Invalid WhatsApp number")
    .max(16, "Invalid WhatsApp number"),
  email: z.string().email("Invalid email address").max(100, "Email is too long"),
  website_hp: z.string().optional(), // Invisible Honeypot
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

    const { fullName, whatsapp, email, website_hp } = parsed.data;

    // 0A. Invisible Honeypot check (Silent bot trap)
    if (website_hp && website_hp.trim().length > 0) {
      console.warn("[Anti-Bot Honeypot Triggered] Ignored bot submission:", { ip: req.headers.get("x-forwarded-for") });
      // Fake success response to confuse and waste bot's time
      return NextResponse.json({ status: "READY_TO_SPIN", userId: "00000000-0000-0000-0000-000000000000" });
    }

    // 0B. Disposable Burner Email filter
    if (checkDisposableEmail(email)) {
      return NextResponse.json(
        { error: "Mohon gunakan alamat email pribadi aktif (Gmail, Yahoo, iCloud, dll)." },
        { status: 400 }
      );
    }

    // 0C. Smart IP Velocity Cooldown Check
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const velocity = checkIpVelocity(ip);
    if (!velocity.allowed) {
      return NextResponse.json(
        {
          error: "QUEUE_ACTIVE",
          message: "Pendaftaran lagi ramai nih! Tunggu sebentar ya.",
          cooldownRemaining: velocity.cooldownRemaining,
        },
        { status: 429 }
      );
    }

    const cleanedPhone = whatsapp.replace(/\D/g, "");

    // 1. Check if user already exists with this phone or email
    const { data: existingUser } = await supabaseAdmin
      .from("guest_users")
      .select("id, full_name, user_agent, spin_transactions(id, voucher_codes(unique_code, prizes(name, terms_conditions)))")
      .or(`whatsapp.eq.${cleanedPhone},email.eq.${email.trim().toLowerCase()}`)
      .maybeSingle();

    if (existingUser) {
      // If already spun or revoked, immediately REJECT with 409 Conflict
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = (existingUser as any).spin_transactions;
      const isRevoked = String((existingUser as any).user_agent || "").includes("[REVOKED");
      const hasSpun = isRevoked || (Array.isArray(tx) ? tx.length > 0 : !!tx);

      if (hasSpun) {
        return NextResponse.json(
          {
            error: isRevoked
              ? "Hak partisipasi akun ini telah dibatalkan (Revoked). Anda tidak dapat melakukan spin kembali."
              : "This WhatsApp number or Email has already participated. Each guest is limited to 1 voucher.",
          },
          { status: 409 }
        );
      }

      // Registered but hasn't spun yet
      return NextResponse.json({
        status: "READY_TO_SPIN",
        userId: existingUser.id,
      });
    }

    // 2. Insert new guest user
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
