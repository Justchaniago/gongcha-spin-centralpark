import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL || "Gong cha Indonesia <onboarding@resend.dev>";

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface SendVoucherEmailParams {
  to: string;
  userName: string;
  voucherCode: string;
  prizeName: string;
  termsConditions?: string | null;
}

export async function sendVoucherEmail({
  to,
  userName,
  voucherCode,
  prizeName,
  termsConditions,
}: SendVoucherEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.warn("[Resend Email] RESEND_API_KEY is not defined. Email dispatch skipped.");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  if (!to || !to.includes("@")) {
    console.warn(`[Resend Email] Invalid recipient email: ${to}`);
    return { success: false, error: "Invalid recipient email" };
  }

  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Voucher Gong cha Grand Opening</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F1EA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #382F2D;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F4F1EA; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #ECE6DB;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #C10230; padding: 36px 24px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Gong cha</h1>
              <p style="margin: 6px 0 0 0; color: #FFD4DC; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">
                Grand Opening • Central Park Mall
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #574B48;">
                Halo <strong>${userName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #574B48;">
                Selamat! Anda berhasil memenangkan E-Voucher eksklusif perayaan Grand Opening gerai baru <strong>Gong cha Central Park Mall (UG Floor)</strong>!
              </p>

              <!-- Voucher Box -->
              <div style="background-color: #FAF8F2; border: 2px dashed #C10230; border-radius: 16px; padding: 24px 16px; text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; font-size: 11px; font-weight: 7px; color: #C10230; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;">
                  Hadiah Anda
                </span>
                <div style="font-size: 22px; font-weight: 800; color: #C10230; margin-bottom: 14px;">
                  ${prizeName}
                </div>
                
                <div style="display: inline-block; background-color: #FFFFFF; border: 1px solid #E8DFD1; border-radius: 10px; padding: 10px 20px; margin: 4px 0;">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 22px; font-weight: 900; letter-spacing: 3px; color: #382F2D;">
                    ${voucherCode}
                  </span>
                </div>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #8F807B;">
                  Tunjukkan kode atau email ini ke kasir saat memesan
                </p>
              </div>

              <!-- Event Details -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8F6F0; border-radius: 12px; padding: 14px 16px; margin-bottom: 24px;">
                <tr>
                  <td style="font-size: 13px; line-height: 1.6; color: #574B48;">
                    📍 <strong>Lokasi:</strong> Gong cha Central Park Mall (UG Floor)<br>
                    🗓️ <strong>Mulai Berlaku:</strong> 6 November 2026<br>
                    ⏰ <strong>Waktu:</strong> Sesuai jam operasional mall
                  </td>
                </tr>
              </table>

              <!-- Terms & Conditions -->
              ${
                termsConditions
                  ? `
              <div style="border-top: 1px solid #ECE6DB; padding-top: 16px; margin-top: 16px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #382F2D;">Syarat & Ketentuan:</p>
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #7A6F6B;">
                  ${termsConditions}
                </p>
              </div>
              `
                  : ""
              }

              <p style="margin: 28px 0 0 0; font-size: 14px; text-align: center; color: #8F807B;">
                Sampai jumpa di Gong cha Central Park Mall! 🧋✨
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF8F2; border-top: 1px solid #ECE6DB; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #9C8E8A;">
                © 2026 Gong cha Indonesia. All rights reserved.<br>
                Email ini dikirim otomatis sebagai konfirmasi kepemilikan voucher.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const { data, error } = await resend.emails.send({
      from: resendFromEmail,
      to,
      subject: `🎉 [Gong cha] Voucher Anda: ${prizeName} (${voucherCode})`,
      html,
    });

    if (error) {
      console.error("[Resend Email Error]:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Resend Email Sent] Successfully sent voucher to ${to}, ID: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("[Resend Email Exception]:", err);
    return { success: false, error: err?.message || "Unknown error" };
  }
}
