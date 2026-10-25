# Spesifikasi Arsitektur Database & Backend: Voucher Pool Gong Cha

Dokumen teknis ini mendefinisikan skema database, logika alokasi kode voucher (anti-race condition), dan endpoint API untuk aktivasi Grand Opening Gong Cha Central Park.

---

## 1. Skema Database (PostgreSQL / Supabase DDL)

```sql
-- 1. Tabel Kategori Hadiah (Prize Catalog & Weights)
CREATE TABLE prizes (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'FREE_PMT', 'BOGO', 'DISC_50', 'FREE_UPSIZE', 'VOUCHER_15K', 'FREE_TOPPING'
    name VARCHAR(100) NOT NULL,
    short_label VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    text_color VARCHAR(20) NOT NULL,
    terms_conditions TEXT NOT NULL,
    probability_weight INT NOT NULL DEFAULT 10, -- Bobot pengundian (RNG)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Master Data Kode Voucher POS (Pre-seeded Pool)
CREATE TYPE voucher_status AS ENUM ('AVAILABLE', 'ASSIGNED', 'REDEEMED');

CREATE TABLE voucher_codes (
    id BIGSERIAL PRIMARY KEY,
    prize_id VARCHAR(50) NOT NULL REFERENCES prizes(id) ON DELETE RESTRICT,
    unique_code VARCHAR(100) NOT NULL UNIQUE, -- Kode unik dari POS Gong Cha
    status voucher_status NOT NULL DEFAULT 'AVAILABLE',
    assigned_to_user_id UUID,
    assigned_at TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vouchers_available ON voucher_codes (prize_id, status) WHERE status = 'AVAILABLE';
CREATE INDEX idx_vouchers_unique_code ON voucher_codes (unique_code);

-- 3. Tabel Data Pengunjung / Lead Capture
CREATE TABLE guest_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL UNIQUE, -- Mencegah nomor yang sama klaim 2x
    email VARCHAR(150) NOT NULL UNIQUE,    -- Mencegah email yang sama klaim 2x
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Transaksi Partisipasi Spin
CREATE TABLE spin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES guest_users(id) ON DELETE CASCADE,
    prize_id VARCHAR(50) NOT NULL REFERENCES prizes(id),
    voucher_code_id BIGINT NOT NULL REFERENCES voucher_codes(id),
    spun_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_one_spin UNIQUE (user_id) -- 1 user tepat 1 kali spin
);
```

---

## 2. Core Logic: Atomic Voucher Allocation (`FOR UPDATE SKIP LOCKED`)

Tantangan utama promo grand opening adalah jika ada ribuan orang yang spin bersamaan, sistem tidak boleh mengeluarkan satu kode unik POS yang sama kepada 2 user berbeda.

### Prosedur Transaksional (Database Function / Server Action):
```sql
CREATE OR REPLACE FUNCTION claim_spin_voucher(
    p_user_id UUID,
    p_selected_prize_id VARCHAR(50)
)
RETURNS TABLE (
    voucher_id BIGINT,
    unique_code VARCHAR(100),
    prize_id VARCHAR(50)
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_voucher_id BIGINT;
    v_unique_code VARCHAR(100);
BEGIN
    -- 1. Kunci dan ambil 1 kode yang masih AVAILABLE secara aman dari concurrency
    SELECT id, voucher_codes.unique_code INTO v_voucher_id, v_unique_code
    FROM voucher_codes
    WHERE voucher_codes.prize_id = p_selected_prize_id
      AND voucher_codes.status = 'AVAILABLE'
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- 2. Jika kuota kategori tersebut habis, ambil fallback dari kategori yang masih tersedia
    IF v_voucher_id IS NULL THEN
        SELECT id, voucher_codes.unique_code, voucher_codes.prize_id 
        INTO v_voucher_id, v_unique_code, p_selected_prize_id
        FROM voucher_codes
        WHERE voucher_codes.status = 'AVAILABLE'
        LIMIT 1
        FOR UPDATE SKIP LOCKED;
    END IF;

    IF v_voucher_id IS NULL THEN
        RAISE EXCEPTION 'ALL_VOUCHERS_EXHAUSTED';
    END IF;

    -- 3. Update status kode menjadi ASSIGNED
    UPDATE voucher_codes
    SET status = 'ASSIGNED',
        assigned_to_user_id = p_user_id,
        assigned_at = NOW()
    WHERE id = v_voucher_id;

    -- 4. Catat riwayat spin
    INSERT INTO spin_transactions (user_id, prize_id, voucher_code_id)
    VALUES (p_user_id, p_selected_prize_id, v_voucher_id);

    RETURN QUERY SELECT v_voucher_id, v_unique_code, p_selected_prize_id;
END;
$$;
```

---

## 3. Rencana API Endpoints (Next.js App Router API Routes)

1. **`POST /api/register`**:
   - Validasi data input: Name, WhatsApp, Email (pakai `zod`).
   - Cek apakah WhatsApp / Email sudah pernah terdaftar.
   - Mengembalikan `guest_id` bertoken (JWT / secure session cookie) agar tidak bisa ditembak langsung tanpa registrasi.

2. **`POST /api/spin`**:
   - Wajib menyertakan token auth/session dari langkah registrasi.
   - Backend menghitung RNG bobot hadiah (*weighted probability*).
   - Backend memanggil prosedur atomic allocation di DB.
   - Mengembalikan index segmen roda dan `unique_code` resmi POS ke frontend.

3. **`POST /api/admin/import-vouchers` (Admin CLI Script / API)**:
   - Skrip pembaca CSV / Excel yang memuat ratusan/ribuan kode POS untuk dimasukkan ke tabel `voucher_codes`.
