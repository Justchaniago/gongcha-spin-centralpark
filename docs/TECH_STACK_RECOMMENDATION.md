# Rekomendasi Tech Stack: Gong Cha Grand Opening Spin Web App

Untuk kebutuhan **ringan (instant loading di smartphone)**, **cepat (sub-second spin response)**, **durable (transaksional aman tanpa race condition kode dobel)**, dan **scalable (tahan spike ribuan scan serentak)**, berikut adalah arsitektur stack yang paling optimal:

---

## 1. Ringkasan Pilihan Stack (Recommended)

| Layer | Rekomendasi Pilihan | Alasan Utama |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 15 (App Router)** atau **Astro / SvelteKit** | SSR/Static pre-rendering untuk kecepatan instant first-load di HP, SEO-friendly, bundling ringan. |
| **Styling & UI** | **Tailwind CSS + Canvas Confetti + Framer Motion (atau HTML5 Canvas)** | Ringan, animasi 60 FPS di mobile browser tanpa lag memori. |
| **Backend / API** | **Next.js Server Actions / API Routes** (Serverless / Edge) | Terpadu dalam 1 codebase, cold start rendah, auto-scale saat ada traffic surge. |
| **Database** | **PostgreSQL (via Supabase / Neon / Cloud SQL)** | Mendukung **Atomic Transaction (`FOR UPDATE SKIP LOCKED`)** sehingga 100% aman dari voucher dobel. |
| **Cache & Rate Limit** | **Upstash Redis** | Rate limiting per IP/Device ID, mencegah bot spam klik form/spin. |
| **Hosting & CDN** | **Vercel** / **Cloudflare Pages + Workers** | Global CDN edge caching untuk asset gambar/audio, zero devops overhead. |

---

## 2. Mengapa Stack Ini Menjawab 4 Kebutuhan Utama?

### 🚀 1. Ringan (Ultra-Lightweight di Mobile)
- Orang yang scan QR code di venue/mall biasanya menggunakan koneksi 4G/5G seluler yang bervariasi.
- Menggunakan **HTML5 `<canvas>`** untuk animasi roda spin menghasilkan payload JavaScript sangat kecil (< 30-50 KB) dibandingkan library berat berbasis GIF/video.
- Initial page load < 1 detik.

### ⚡ 2. Fast (Koneksi Cepat & Responsif)
- Asset gambar (logo Gong Cha, ilustrasi boba) otomatis terkompresi modern (WebP/AVIF).
- Server API berjarak dekat dengan user (Edge / Region Jakarta / Singapura).
- Ketika user menekan tombol "Spin", penentuan kode voucher dari backend selesai dalam **< 150 ms**, lalu animasi wheel berputar sinkron ke target hasil backend.

### 🛡️ 3. Durable (Anti Voucher Dobel & Anti Fraud)
- **Tantangan utama promo voucher POS:** Dua user tidak boleh mendapatkan satu kode voucher yang sama secara bersamaan.
- PostgreSQL menjamin sifat **ACID Transaksional**:
  ```sql
  -- Mengunci 1 baris kode yang tersedia, mencegah race condition
  SELECT id, unique_code FROM voucher_codes 
  WHERE prize_category = $1 AND status = 'AVAILABLE' 
  LIMIT 1 
  FOR UPDATE SKIP LOCKED;
  ```
- Nomor HP dikunci dengan `UNIQUE constraint` di database, jadi user tidak bisa mengklaim 2x dengan nomor yang sama.

### 📈 4. Scalable (Tahan Serbuan Ribuan Scan Serentak)
- Jika flyer disebar ke 5.000 pengunjung sekaligus, serverless architecture otomatis memperbesar kapasitas instance (auto-scale) tanpa perlu manage server fisik (VPS/Nginx).
- Upstash Redis menjaga endpoint registrasi dari serangan brute-force atau bot spammer.

---

## 3. Alternatif Sederhana (Full-BaaS Stack)

Jika ingin **sangat cepat selesai (quick turnaround)**:
- **Frontend:** Next.js / Vite React.
- **Backend & Database:** **Supabase (PostgreSQL + Built-in Database Functions + Row Level Security)**.
- **Keuntungan:** Tidak perlu bikin custom server manual, import ribuan baris CSV voucher POS bisa langsung lewat Supabase Dashboard atau script SQL bawaan.
