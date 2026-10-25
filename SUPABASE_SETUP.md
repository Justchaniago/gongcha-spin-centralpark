# Supabase Setup Guide: Gong Cha Central Park

Ikuti 3 langkah mudah ini untuk mengaktifkan database Supabase:

---

### Langkah 1: Buat Project Baru di Supabase
1. Buka [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Klik tombol **"New Project"**.
3. Isi form:
   - **Name:** `gongcha-central-park-activation` (atau bebas)
   - **Database Password:** Buat password yang kuat & simpan.
   - **Region:** Pilih **Singapore (ap-southeast-1)** agar kecepatan akses dari Indonesia maksimal.
4. Klik **"Create new project"** (tunggu ~1-2 menit hingga statusnya ready).

---

### Langkah 2: Jalankan Script SQL Schema
1. Di sidebar kiri dashboard Supabase, buka menu **SQL Editor** (ikon tanda kurung `>_`).
2. Klik **"New Query"**.
3. Buka file [supabase_schema.sql](file:///Users/f/Projects/01-Active/gongcha-webapp-spin/supabase_schema.sql) di repo ini, copy seluruh kodenya, dan paste ke SQL Editor Supabase.
4. Klik tombol **"Run"** (berwarna hijau di pojok kanan bawah editor).
5. Selesai! Seluruh tabel (`prizes`, `voucher_codes`, `guest_users`, `spin_transactions`), fungsi atomic anti-voucher dobel, serta sample 30 kode POS testing sudah otomatis aktif.

---

### Langkah 3: Ambil Kredensial API
Di sidebar kiri dashboard Supabase:
1. Buka **Project Settings** (ikon gerigi di paling bawah) -> **API** (atau **Data API**).
2. Copy 2 nilai berikut:
   - **Project URL** (contoh: `https://xyzcompany.supabase.co`)
   - **service_role secret key** (bukan anon key, karena backend kita perlu hak update voucher atomic).
3. Buat file `.env.local` di folder root project ini:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
   ```
