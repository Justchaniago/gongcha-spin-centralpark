-- ====================================================================
-- GONG CHA CENTRAL PARK GRAND OPENING - DATABASE SCHEMA & FUNCTIONS
-- ====================================================================
-- Jalankan seluruh script ini di: Supabase Dashboard -> SQL Editor -> Run
-- ====================================================================

-- 1. Bersihkan tabel lama jika ada
DROP TABLE IF EXISTS spin_transactions CASCADE;
DROP TABLE IF EXISTS voucher_codes CASCADE;
DROP TABLE IF EXISTS guest_users CASCADE;
DROP TABLE IF EXISTS prizes CASCADE;
DROP TYPE IF EXISTS voucher_status_enum CASCADE;

-- 2. ENUM status kode voucher
CREATE TYPE voucher_status_enum AS ENUM ('AVAILABLE', 'ASSIGNED', 'REDEEMED');

-- 3. Tabel Kategori Hadiah (Master Prizes)
CREATE TABLE prizes (
    id VARCHAR(50) PRIMARY KEY, -- 'FREE_PMT', 'BOGO', 'DISC_50', 'FREE_UPSIZE', 'VOUCHER_15K', 'FREE_TOPPING'
    name VARCHAR(100) NOT NULL,
    short_label VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    text_color VARCHAR(20) NOT NULL,
    code_prefix VARCHAR(20) NOT NULL,
    terms_conditions TEXT NOT NULL,
    probability_weight INT NOT NULL DEFAULT 10, -- Semakin besar angka, semakin sering keluar di spin
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Seed Data 6 Hadiah Resmi Gong Cha
INSERT INTO prizes (id, name, short_label, color, text_color, code_prefix, terms_conditions, probability_weight) VALUES
('FREE_PMT', 'FREE PEARL MILK TEA', 'FREE DRINK', '#C8202F', '#F5F2E8', 'GC-PMT', 'Valid for 1 Regular Pearl Milk Tea at Gong Cha Central Park.', 10),
('BOGO', 'BUY 1 GET 1 FREE', 'BUY 1 GET 1', '#F5F2E8', '#111111', 'GC-BOGO', 'Buy any Large drink and get 1 Regular Milk Tea Series for free.', 20),
('DISC_50', '50% OFF SECOND CUP', '50% OFF', '#F39C12', '#111111', 'GC-50OFF', '50% discount on your second cup (any series) in a single receipt.', 25),
('FREE_UPSIZE', 'FREE LARGE UPSIZE', 'FREE UPSIZE', '#F5F2E8', '#111111', 'GC-UPSZ', 'Free upgrade from Regular to Large on any Gong Cha drink.', 20),
('VOUCHER_15K', 'IDR 15K CASHBACK', 'IDR 15K OFF', '#C8202F', '#F5F2E8', 'GC-15K', 'IDR 15,000 off with a minimum purchase of IDR 50,000.', 15),
('FREE_TOPPING', 'FREE TOPPING', 'FREE TOPPING', '#F39C12', '#111111', 'GC-TOP', 'Free Pearl or Milk Foam topping with any drink purchase.', 10);

-- 5. Tabel Data Pengunjung (Leads)
CREATE TABLE guest_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    whatsapp VARCHAR(25) NOT NULL UNIQUE, -- 1 nomor HP = 1x hak klaim
    email VARCHAR(150) NOT NULL UNIQUE,    -- 1 email = 1x hak klaim
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel Master Kode Voucher POS (Pool Kode)
CREATE TABLE voucher_codes (
    id BIGSERIAL PRIMARY KEY,
    prize_id VARCHAR(50) NOT NULL REFERENCES prizes(id) ON DELETE RESTRICT,
    unique_code VARCHAR(100) NOT NULL UNIQUE, -- Kode unik dari POS Gong Cha
    status voucher_status_enum NOT NULL DEFAULT 'AVAILABLE',
    assigned_to_user_id UUID REFERENCES guest_users(id),
    assigned_at TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index agar pencarian voucher available berkecepatan tinggi & anti-race condition
CREATE INDEX idx_vouchers_pool ON voucher_codes (prize_id, status) WHERE status = 'AVAILABLE';
CREATE INDEX idx_vouchers_code ON voucher_codes (unique_code);

-- 7. Tabel Transaksi Klaim Spin
CREATE TABLE spin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES guest_users(id) ON DELETE CASCADE,
    prize_id VARCHAR(50) NOT NULL REFERENCES prizes(id),
    voucher_code_id BIGINT NOT NULL REFERENCES voucher_codes(id),
    spun_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_guest_one_spin UNIQUE (user_id)
);

-- 8. Prosedur Atomic: Ambil Kode Tanpa Resiko Ganda (FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION claim_spin_voucher(
    p_user_id UUID,
    p_requested_prize_id VARCHAR(50)
)
RETURNS TABLE (
    voucher_id BIGINT,
    unique_code VARCHAR(100),
    prize_id VARCHAR(50),
    prize_name VARCHAR(100),
    terms_conditions TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_voucher_id BIGINT;
    v_unique_code VARCHAR(100);
    v_final_prize_id VARCHAR(50) := p_requested_prize_id;
    v_prize_name VARCHAR(100);
    v_tnc TEXT;
BEGIN
    -- 1. Cek apakah user sudah pernah spin sebelumnya
    IF EXISTS (SELECT 1 FROM spin_transactions WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'USER_ALREADY_SPUN';
    END IF;

    -- 2. Kunci 1 baris kode yang statusnya 'AVAILABLE' pada prize yang diminta
    SELECT vc.id, vc.unique_code INTO v_voucher_id, v_unique_code
    FROM voucher_codes vc
    WHERE vc.prize_id = v_final_prize_id
      AND vc.status = 'AVAILABLE'
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- 3. Jika stok hadiah tersebut habis, ambil kode dari hadiah lain yang masih tersedia (fallback)
    IF v_voucher_id IS NULL THEN
        SELECT vc.id, vc.unique_code, vc.prize_id INTO v_voucher_id, v_unique_code, v_final_prize_id
        FROM voucher_codes vc
        WHERE vc.status = 'AVAILABLE'
        LIMIT 1
        FOR UPDATE SKIP LOCKED;
    END IF;

    -- 4. Jika seluruh kode promo di database habis total
    IF v_voucher_id IS NULL THEN
        RAISE EXCEPTION 'ALL_VOUCHERS_EXHAUSTED';
    END IF;

    -- 5. Tandai kode tersebut menjadi 'ASSIGNED' ke user ini
    UPDATE voucher_codes
    SET status = 'ASSIGNED',
        assigned_to_user_id = p_user_id,
        assigned_at = NOW()
    WHERE id = v_voucher_id;

    -- 6. Rekam data transaksi spin
    INSERT INTO spin_transactions (user_id, prize_id, voucher_code_id)
    VALUES (p_user_id, v_final_prize_id, v_voucher_id);

    -- 7. Ambil info nama hadiah dan S&K
    SELECT name, terms_conditions INTO v_prize_name, v_tnc
    FROM prizes WHERE id = v_final_prize_id;

    RETURN QUERY SELECT v_voucher_id, v_unique_code, v_final_prize_id, v_prize_name, v_tnc;
END;
$$;

-- 9. Contoh Sample 30 Kode POS untuk Uji Coba Awal (Testing Pool)
INSERT INTO voucher_codes (prize_id, unique_code) VALUES
('FREE_PMT', 'GC-CP-PMT-001'),
('FREE_PMT', 'GC-CP-PMT-002'),
('FREE_PMT', 'GC-CP-PMT-003'),
('FREE_PMT', 'GC-CP-PMT-004'),
('FREE_PMT', 'GC-CP-PMT-005'),
('BOGO', 'GC-CP-BOGO-001'),
('BOGO', 'GC-CP-BOGO-002'),
('BOGO', 'GC-CP-BOGO-003'),
('BOGO', 'GC-CP-BOGO-004'),
('BOGO', 'GC-CP-BOGO-005'),
('DISC_50', 'GC-CP-50OFF-001'),
('DISC_50', 'GC-CP-50OFF-002'),
('DISC_50', 'GC-CP-50OFF-003'),
('DISC_50', 'GC-CP-50OFF-004'),
('DISC_50', 'GC-CP-50OFF-005'),
('FREE_UPSIZE', 'GC-CP-UPSZ-001'),
('FREE_UPSIZE', 'GC-CP-UPSZ-002'),
('FREE_UPSIZE', 'GC-CP-UPSZ-003'),
('FREE_UPSIZE', 'GC-CP-UPSZ-004'),
('FREE_UPSIZE', 'GC-CP-UPSZ-005'),
('VOUCHER_15K', 'GC-CP-15K-001'),
('VOUCHER_15K', 'GC-CP-15K-002'),
('VOUCHER_15K', 'GC-CP-15K-003'),
('VOUCHER_15K', 'GC-CP-15K-004'),
('VOUCHER_15K', 'GC-CP-15K-005'),
('FREE_TOPPING', 'GC-CP-TOP-001'),
('FREE_TOPPING', 'GC-CP-TOP-002'),
('FREE_TOPPING', 'GC-CP-TOP-003'),
('FREE_TOPPING', 'GC-CP-TOP-004'),
('FREE_TOPPING', 'GC-CP-TOP-005')
ON CONFLICT (unique_code) DO NOTHING;
