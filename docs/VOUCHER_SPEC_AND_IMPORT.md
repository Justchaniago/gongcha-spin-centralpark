# Format & Panduan Impor Voucher POS

Dokumen ini menjelaskan format data dan prosedur impor kode voucher dari sistem POS Gong Cha ke dalam database Web App.

---

## 1. Format File CSV (`vouchers_seed.csv`)

Sebelum kampanye diluncurkan ke publik, seluruh kode voucher unik yang telah di-generate di sistem POS Gong Cha harus diunggah ke database.

### Contoh Struktur Kolom:

| prize_category | unique_code | valid_until | notes |
| :--- | :--- | :--- | :--- |
| FREE_PEARL_MILK_TEA | GCGO-FPMT-001 | 2026-11-30 | Gratis Pearl Milk Tea Reguler |
| FREE_PEARL_MILK_TEA | GCGO-FPMT-002 | 2026-11-30 | Gratis Pearl Milk Tea Reguler |
| DISC_50_PERSEN | GCGO-D50-001 | 2026-11-30 | Diskon 50% Min Transaksi 50k |
| BUY_1_GET_1 | GCGO-BOGO-001 | 2026-11-30 | Beli 1 Gratis 1 Menu Tertentu |
| DISC_10RB | GCGO-POT10-001 | 2026-11-30 | Potongan Langsung Rp 10.000 |

### Contoh Raw CSV:
```csv
prize_category,unique_code,valid_until,notes
FREE_PEARL_MILK_TEA,GCGO-FPMT-001,2026-11-30,Gratis Pearl Milk Tea Reguler
FREE_PEARL_MILK_TEA,GCGO-FPMT-002,2026-11-30,Gratis Pearl Milk Tea Reguler
DISC_50_PERSEN,GCGO-D50-001,2026-11-30,Diskon 50% Min Transaksi 50k
BUY_1_GET_1,GCGO-BOGO-001,2026-11-30,Beli 1 Gratis 1 Menu Tertentu
DISC_10RB,GCGO-POT10-001,2026-11-30,Potongan Langsung Rp 10.000
```

---

## 2. Mekanisme Alokasi Kode (Spin Logic)

1. Ketika user menekan tombol **Spin**:
   - Backend menghitung probabilitas tier hadiah (RNG weighted random).
   - Backend mengeksekusi query atomic untuk mengambil 1 kode dengan status `AVAILABLE` pada tier tersebut:
     ```sql
     -- Contoh skenario PostgreSQL
     UPDATE voucher_codes
     SET status = 'ASSIGNED',
         assigned_to_user_id = :userId,
         assigned_at = NOW()
     WHERE id = (
       SELECT id FROM voucher_codes
       WHERE prize_category = :selectedCategory AND status = 'AVAILABLE'
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING unique_code;
     ```
2. Kode yang sudah `ASSIGNED` **tidak akan pernah** diberikan ke pengguna lain.
3. Jika kuota tier hadiah tertentu sudah habis (`AVAILABLE` = 0), algoritma otomatis mengalihkan probabilitas ke tier hadiah fallback/tersedia berikutnya.

---

## 3. Validasi di POS Gong Cha (In-Store Flow)

1. Pelanggan datang ke kasir Grand Opening Gong Cha membawa smartphone yang menampilkan halaman e-voucher.
2. Kasir memindai Barcode / QR Code voucher menggunakan scanner kasir, atau menginput nomor kode teks (misal: `GCGO-FPMT-001`).
3. POS membaca kode tersebut dan memotong tagihan sesuai skema promo yang sudah terkonfigurasi.
