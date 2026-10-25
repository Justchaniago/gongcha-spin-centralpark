# Gong Cha Spin & Win — Premium Design System & Experience Guideline

Dokumen ini mendefinisikan standar visual dan interaksi agar web app aktivasi Grand Opening Gong Cha terlihat **luks, mewah, eksklusif, dan premium** (jauh dari kesan template murah atau judi online).

---

## 1. Brand Identity & Color Palette (Royal Gong Cha Aesthetic)

Gong Cha memiliki warisan tradisi teh kekaisaran (*Royal Tea*). Palet warna harus mencerminkan kemewahan teh artisan, aksen emas eksklusif, dan kontras yang elegan.

### Palette Codes:
- **Imperial Red (Primary Brand):** `#8C1824` / `#A6192E` (Merah marun khas Gong Cha yang anggun, bukan merah terang neon).
- **Royal Champagne Gold (Accents):** `#D4AF37` / `#F3E5AB` / `#C5A059` (Untuk rim roda, badge voucher eksklusif, gradasi bingkai).
- **Warm Porcelain Cream (Background Base):** `#FDFBF7` / `#FAF6F0` (Nuansa kertas teh tradisional & porselen premium).
- **Deep Obsidian Slate (Typography / Dark elements):** `#1E1E24` (Teks kontras tinggi yang tajam & bersih).
- **Card Background Glass:** `rgba(255, 255, 255, 0.85)` dengan `backdrop-filter: blur(16px)` (Efek glassmorphism modern).

---

## 2. Tipografi Elegan (Editorial & Modern Sans)

1. **Heading / Display:**
   - Rekomendasi: `Playfair Display` atau `Cormorant Garamond` (Font serif elegan yang memancarkan sentuhan *royal tea house heritage*).
   - Contoh: *"An Exclusive Grand Opening Invitation"*, *"The Imperial Wheel of Fortune"*.
2. **Body & Form Inputs:**
   - Rekomendasi: `Plus Jakarta Sans` atau `Inter` (Sangat bersih, modern, dan mudah dibaca di layar smartphone).
   - Letter spacing sedikit longgar (`tracking-wide`) pada sub-header untuk nuansa luxury branding.

---

## 3. Komponen Visual Premium

### 3.1. Roda Keberuntungan (Bespoke Artisan Wheel)
- **Bukan Roda Kasino:** Hindari warna pelangi acak (hijau neon, kuning norak). Roda menggunakan kombinasi warna harmonis: selang-seling *Imperial Burgundy*, *Warm Cream*, dan garis pemisah beraksen emas (*Gold Trim*).
- **Centerpiece Hub:** Logo siluet Gong Cha / lambang stempel dinasti bergradasi logam emas di poros tengah roda.
- **Stopper / Pointer:** Jarum penunjuk berdesain elegan minimalis menyerupai daun teh (*Tea Leaf Pointer*) atau pin emas presisi.
- **Micro-shadows & 3D Depth:** Efek bevel metalik tipis di bibir luar roda agar terlihat seperti objek fisik berkualitas tinggi.

### 3.2. E-Voucher Card (Luxury Member Pass)
- Kartu voucher didesain menyerupai kartu member metal/VIP:
  - Tekstur kartu dengan aksen subtle foil reflection atau watermark motif teh klasik.
  - Border tipis bergradasi emas (`border-gold-gradient`).
  - Barcode / QR Code kasir terintegrasi rapi di bagian bawah kartu dengan nomor voucher ber-font *monospaced tracking* elegan (e.g., `GC • GO2026 • 88X9`).
  - Cap stempel digital: *"Verified Official Grand Opening Ticket"*.

---

## 4. Audio-Haptics & Animasi Halus (Tactile Delight)

Kesan premium ditentukan oleh kehalusan respon saat disentuh:

1. **Inersia Putaran Realistis (Cubic-Bezier Easing):**
   - Roda tidak mendadak berhenti atau berputar kasar. Roda mulai berakselerasi halus, berputar cepat, lalu melambat perlahan (*decelerate*) hingga jarum bergetar lembut saat jatuh di segmen hadiah.
2. **Haptic Feedback:**
   - Memanfaatkan Web Vibration API (`navigator.vibrate`) pada perangkat Android saat roda berdetik di setiap paku pembatas roda.
3. **Sound FX Mewah (Opsional dengan Mute toggle):**
   - Suara klik roda halus kayu/logam berpresisi tinggi (bukan klakson arcade).
   - Suara denting lonceng/chime lembut (*luxury chime*) saat hadiah terbuka.
4. **Celebration Effects:**
   - Konfeti berwarna *Gold Foil & Burgundy Petals*, bukan konfeti warna-warni pesta anak.

---

## 5. UI Layout & Copywriting Eksklusif

- Form leads dibuat bersih (*clean floating inputs*), dengan pesan privasi yang meyakinkan:
  - *"Data Anda aman dan hanya digunakan untuk verifikasi voucher resmi Grand Opening Gong Cha."*
- Tombol CTA utama (Call to Action):
  - Menggunakan gradasi merah marun tua dengan kilau cahaya halus (*shimmer animation*).
  - Teks: *"Putar Roda Keberuntungan"* atau *"Klaim Hadiah Eksklusif"*.
