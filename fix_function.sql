-- FIX AMBIGUOUS COLUMN IN FUNCTION
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
SET search_path = public
AS $$
DECLARE
    v_voucher_id BIGINT;
    v_unique_code VARCHAR(100);
    v_final_prize_id VARCHAR(50) := p_requested_prize_id;
    v_prize_name VARCHAR(100);
    v_terms TEXT;
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

    -- 7. Ambil info nama hadiah dan S&K secara eksplisit
    SELECT p.name, p.terms_conditions INTO v_prize_name, v_terms
    FROM prizes p WHERE p.id = v_final_prize_id;

    RETURN QUERY SELECT v_voucher_id, v_unique_code, v_final_prize_id, v_prize_name, v_terms;
END;
$$;
