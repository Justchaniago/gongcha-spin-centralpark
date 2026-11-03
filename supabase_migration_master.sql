-- ==============================================================================
-- GONG CHA GRAND OPENING - DATABASE SCHEMA ENHANCEMENT & CLEANUP
-- Target Database: PostgreSQL (Supabase)
-- Safe Execution: Idempotent (Menggunakan IF NOT EXISTS, tidak akan menghapus data)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTEND VOUCHER STATUS ENUM
-- Menyediakan 4 status resmi lengkap: AVAILABLE, ASSIGNED, REDEEMED, REVOKED
-- ------------------------------------------------------------------------------
ALTER TYPE voucher_status_enum ADD VALUE IF NOT EXISTS 'REVOKED';

-- ------------------------------------------------------------------------------
-- 2. TAMBAHKAN KOLOM AUDIT & TRACKING PADA voucher_codes
-- Agar history & informasi voucher terbaca sangat rapi di Table Editor Supabase
-- ------------------------------------------------------------------------------
-- Timestamp kapan voucher dibatalkan
ALTER TABLE voucher_codes ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- Alasan pembatalan (misal: "Admin Revoke", "Fraud Suspect", dll)
ALTER TABLE voucher_codes ADD COLUMN IF NOT EXISTS revoked_reason TEXT;

-- Catatan tambahan atau note internal
ALTER TABLE voucher_codes ADD COLUMN IF NOT EXISTS notes TEXT;

-- ------------------------------------------------------------------------------
-- 3. PERBAIKI STATUS 5 VOUCHER YANG SEBELUMNYA DI-REVOKE
-- Mengubah statusnya dari REDEEMED menjadi status resmi REVOKED
-- Serta mengisi waktu revoked_at
-- ------------------------------------------------------------------------------
UPDATE voucher_codes
SET 
  status = 'REVOKED',
  revoked_at = NOW(),
  revoked_reason = 'Dibatalkan oleh Admin melalui Panel Kontrol'
WHERE 
  unique_code LIKE 'REVOKED-%';

-- ------------------------------------------------------------------------------
-- 4. OPTIMASI PERFORMA & INDEX PENCARIAN (KASIR & ADMIN)
-- Mempercepat lookup QR Scanner kasir & filter pencarian customer di admin
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_voucher_codes_status ON voucher_codes(status);
CREATE INDEX IF NOT EXISTS idx_voucher_codes_unique_code ON voucher_codes(unique_code);
CREATE INDEX IF NOT EXISTS idx_voucher_codes_assigned_user ON voucher_codes(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_guest_users_whatsapp ON guest_users(whatsapp);
CREATE INDEX IF NOT EXISTS idx_guest_users_email ON guest_users(email);

-- ------------------------------------------------------------------------------
-- 5. VIEW ANALITIK RAPI (OPTIONAL VIEW UNTUK MEMBACA DATA DENGAN CEPAT)
-- Memberikan ringkasan database yang sangat mudah dibaca langsung dari Supabase
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_customer_vouchers_summary AS
SELECT 
  v.id AS voucher_id,
  v.unique_code AS kode_voucher,
  v.status AS status_voucher,
  p.name AS nama_hadiah,
  g.full_name AS nama_customer,
  g.whatsapp AS no_whatsapp,
  g.email AS email_customer,
  v.assigned_at AS waktu_klaim,
  v.redeemed_at AS waktu_tukar_kasir,
  v.revoked_at AS waktu_dibatalkan,
  v.revoked_reason AS alasan_batal
FROM voucher_codes v
LEFT JOIN prizes p ON v.prize_id = p.id
LEFT JOIN guest_users g ON v.assigned_to_user_id = g.id
ORDER BY v.id ASC;
