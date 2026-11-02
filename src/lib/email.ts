import { Resend } from "resend";
import { getOrCreateVoucherQrCodeUrl } from "./voucher-qr";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL || "Gong cha Indonesia <voucher@gongcha-id.app>";

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

const GONGCHA_LOGO_URL = "https://vuffuslxeovrugjuwkfh.supabase.co/storage/v1/object/public/vouchers/assets/gongcha-logo.png";

interface SendVoucherEmailParams {
  to: string;
  userName: string;
  voucherCode: string;
  prizeName: string;
  termsConditions?: string | null;
  qrCodeUrl?: string;
}

export async function sendVoucherEmail({
  to,
  userName,
  voucherCode,
  prizeName,
  termsConditions,
  qrCodeUrl,
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
    // Obtain permanent hosted QR code image URL and buffer from Supabase Storage
    let directQrUrl = qrCodeUrl;
    let qrBuffer: Buffer | undefined;

    if (!directQrUrl) {
      const qrRes = await getOrCreateVoucherQrCodeUrl(voucherCode);
      directQrUrl = qrRes.url;
      qrBuffer = qrRes.buffer;
    }

    const cidName = `qr-${voucherCode}`;
    const tncText = termsConditions || "1. Berlaku mulai 7 November 2026 hanya di gerai Gong cha Central Park Mall (UG Floor). 2. Tunjukkan QR code ini ke kasir untuk di-scan. 3. Tidak dapat diuangkan atau digabungkan dengan promo lain.";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Voucher Gong cha Grand Opening</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F1EA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #382F2D;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F4F1EA; padding: 36px 16px;">
    <tr>
      <td align="center">

        <!-- Outer Container -->
        <table role="presentation" width="100%" style="max-width: 520px;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Top Greeting Card -->
          <tr>
            <td style="padding: 0 0 20px 0; text-align: center;">
              <h2 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 800; color: #382F2D; letter-spacing: -0.5px;">
                🎉 Selamat, ${userName}!
              </h2>
              <p style="margin: 0; font-size: 14px; color: #574B48; line-height: 1.5;">
                Anda memenangkan E-Voucher perayaan Grand Opening gerai baru <strong>Gong cha Central Park Mall</strong>!
              </p>
            </td>
          </tr>

          <!-- THE EXACT PHYSICAL VOUCHER TICKET (Identical to Spin Wheel Card) -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFFFFF; border-radius: 20px; border: 2.5px solid #382F2D; box-shadow: 5px 5px 0px #382F2D; overflow: hidden;">
                
                <!-- Ticket Header Section -->
                <tr>
                  <td style="padding: 24px 24px 18px 24px; border-bottom: 2px dashed #D6CEC5;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <!-- Left: Badge & Prize Title -->
                        <td valign="top" style="text-align: left;">
                          <div style="display: inline-block; padding: 4px 12px; background-color: #F5DADF; border: 1px solid rgba(193, 2, 48, 0.3); border-radius: 999px; margin-bottom: 10px;">
                            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #C10230; line-height: 1;">
                              GRAND OPENING VOUCHER
                            </span>
                          </div>
                          <h1 style="margin: 0; font-size: 26px; font-weight: 900; line-height: 1.1; text-transform: uppercase; color: #382F2D; letter-spacing: 0.5px;">
                            ${prizeName}
                          </h1>
                        </td>

                        <!-- Right: Official Gong cha Logo Seal -->
                        <td valign="top" align="right" width="60" style="padding-left: 12px;">
                          <img src="${GONGCHA_LOGO_URL}" alt="Gong cha" width="40" height="54" style="display: block; width: 40px; height: 54px; object-fit: contain;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Ticket Middle Body: Unique Code Box + QR Code for Cashier -->
                <tr>
                  <td style="padding: 20px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF6F0; border-radius: 16px; border: 1.8px solid #D6CEC5;">
                      <tr>
                        <td style="padding: 18px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <!-- Code & Instructions -->
                              <td valign="middle" style="text-align: left;">
                                <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #7A6F6B; margin-bottom: 6px;">
                                  🏷️ OFFICIAL VOUCHER CODE
                                </div>
                                <div style="display: inline-block; background-color: #FFFFFF; border: 1.5px solid #382F2D; border-radius: 10px; padding: 8px 16px; box-shadow: 2px 2px 0px #382F2D; margin-bottom: 8px;">
                                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 22px; font-weight: 900; letter-spacing: 3px; color: #C10230;">
                                    ${voucherCode}
                                  </span>
                                </div>
                                <p style="margin: 0; font-size: 11px; font-weight: 600; color: #7A6F6B; line-height: 1.4;">
                                  Scan QR di kasir atau tunjukkan kode saat pemesanan
                                </p>
                              </td>

                              <!-- QR Code Box (Exact same asset) -->
                              <td valign="middle" align="center" width="130" style="padding-left: 12px;">
                                <div style="background-color: #FFFFFF; padding: 8px; border-radius: 12px; border: 1.5px solid #382F2D; box-shadow: 2px 2px 0px #382F2D; display: inline-block; text-align: center;">
                                  <img src="${directQrUrl || `cid:${cidName}`}" alt="QR ${voucherCode}" width="104" height="104" style="display: block; width: 104px; height: 104px; border: 0;" />
                                  <span style="display: block; font-size: 8px; font-weight: 800; letter-spacing: 1.5px; color: #382F2D; text-transform: uppercase; margin-top: 4px;">
                                    SCAN FOR POS
                                  </span>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Ticket Footer: Meta Details & T&C -->
                <tr>
                  <td style="padding: 0 24px 22px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid #ECE6DB; padding-top: 12px;">
                      <tr>
                        <td style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #8F807B;">
                          Guest: <strong>${userName}</strong>
                        </td>
                        <td align="right" style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #8F807B;">
                          Central Park • UG Floor
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 8px;">
                          <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #6E615D;">
                            ${tncText}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Bottom Notice -->
          <tr>
            <td style="padding: 24px 12px 12px 12px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #574B48;">
                📍 Gong cha Central Park Mall (UG Floor) • Mulai Berlaku 7 Nov 2026
              </p>
              <p style="margin: 0; font-size: 11px; color: #9C8E8A;">
                © 2026 Gong cha Indonesia. Tunjukkan tiket ini langsung dari layar ponsel Anda ke kasir.
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

    // Send via Resend with attachment for CID support across all webmail/mobile mail clients
    const attachments = directQrUrl
      ? [
          {
            filename: `qr-${voucherCode}.png`,
            path: directQrUrl,
            content_id: cidName,
          },
        ]
      : qrBuffer
      ? [
          {
            filename: `qr-${voucherCode}.png`,
            content: qrBuffer,
            content_id: cidName,
          },
        ]
      : undefined;

    const { data, error } = await resend.emails.send({
      from: resendFromEmail,
      to,
      subject: `🎉 [Gong cha] Voucher Anda: ${prizeName} (${voucherCode})`,
      html,
      attachments,
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
