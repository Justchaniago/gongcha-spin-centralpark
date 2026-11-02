import QRCode from "qrcode";
import { supabaseAdmin } from "./supabase";

/**
 * Returns the permanent public CDN URL for a voucher's QR code in Supabase Storage.
 * Generates and stores the QR PNG (~1.4 KB, 280x280) on-demand if it does not exist yet.
 */
export async function getOrCreateVoucherQrCodeUrl(voucherCode: string): Promise<{
  url: string;
  buffer?: Buffer;
}> {
  const filePath = `qrcodes/${voucherCode}.png`;
  const storage = supabaseAdmin.storage.from("vouchers");

  // Fast check: get public URL first
  const { data: publicUrlData } = storage.getPublicUrl(filePath);
  const publicUrl = publicUrlData.publicUrl;

  try {
    // Generate crisp, lightweight QR code buffer (~1.4KB)
    const qrBuffer = await QRCode.toBuffer(voucherCode, {
      width: 280,
      margin: 1,
      color: {
        dark: "#18181B",
        light: "#FFFFFF",
      },
    });

    // Upload / upsert to Supabase storage bucket "vouchers"
    const { error: uploadError } = await storage.upload(filePath, qrBuffer, {
      contentType: "image/png",
      upsert: true,
    });

    if (uploadError) {
      console.warn(`[Voucher QR] Supabase storage upload warning for ${voucherCode}:`, uploadError.message);
    }

    return {
      url: publicUrl,
      buffer: qrBuffer,
    };
  } catch (err) {
    console.error(`[Voucher QR] Failed to generate/store QR code for ${voucherCode}:`, err);
    return { url: publicUrl };
  }
}
