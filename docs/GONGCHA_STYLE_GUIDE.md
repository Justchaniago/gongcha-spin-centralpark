# Gong Cha Official Design System & Style Guide
**Source:** Extracted directly from official website [gong-cha.com](https://www.gong-cha.com)

Dokumen ini berisi spesifikasi resmi warna (Color Palette) dan tipografi (Typography) dari website Gong Cha global untuk dijadikan referensi desain UI/UX dan implementasi styling pada web app ini.

---

## 1. 🔤 Typography (Tipografi)

Sistem tipografi website Gong Cha memadukan nuansa elegan oriental / display modern dengan sans-serif geometris yang bersih dan mudah dibaca:

### A. Primary Display / Headings: `Vidaloka`
* **Font Family:** `Vidaloka, serif` / `sans-serif`
* **Kategori:** Modern Didone / Serif Display
* **Kegunaan:**
  * Headline utama, Hero banner, Judul Section, Banner promo.
* **Karakteristik:** Memiliki kontras tebal-tipis tinggi, lengkungan elegan, merepresentasikan sentuhan premium & warisan otentik teh Gong Cha.
* **Google Fonts:** [Google Fonts: Vidaloka](https://fonts.google.com/specimen/Vidaloka)

### B. Body & User Interface: `Public Sans`
* **Font Family:** `Public Sans, sans-serif`
* **Kategori:** Geometric Sans-Serif
* **Bobot yang Digunakan:**
  * Thin (100)
  * ExtraLight (200)
  * Light (300)
  * Regular (400) - Teks isi / paragraf
  * Medium (500) - Label form, metadata
  * SemiBold (600) - Subheadings, highlight
  * Bold (700) / ExtraBold (800) / Black (900) - Button CTA, badge, angka harga
* **Kegunaan:** Seluruh body text, formulir, menu navigasi, kartu produk, dan button UI.
* **Google Fonts:** [Google Fonts: Public Sans](https://fonts.google.com/specimen/Public+Sans)

---

## 2. 🎨 Color Palette (Sistem Warna)

Gong Cha menggunakan token warna yang terinspirasi langsung dari bahan dasar teh, susu, dan buah-buahan mereka.

### A. Core Brand Identity (Warna Utama)
| Token Key | HEX | RGB | Peran & Penggunaan |
| :--- | :--- | :--- | :--- |
| `gongcha-red` | `#C10230` | `rgb(193, 2, 48)` | **Primary Brand Color** (Tombol utama, aksen logo, footer, active tab) |
| `gongcha-red-dark` | `#821518` | `rgb(130, 21, 24)` | Hover state tombol utama, header border, aksen gelap |
| `gongcha-red-light` | `#F5DADF` | `rgb(245, 218, 223)` | Background kartu highlight merah, tag, badge soft |
| `gongcha-black` | `#382F2D` | `rgb(56, 47, 45)` | Teks heading & body text (warm dark charcoal, bukan hitam pekat) |

### B. Flavor Accents (Varian Menu & Karakter UI)
| Token Key | HEX | RGB | Asosiasi Varian / Elemen UI |
| :--- | :--- | :--- | :--- |
| `gongcha-pearl-milk` | `#F1D09F` | `rgb(241, 208, 159)` | Pearl Milk Tea (Krim/Creamy warm accent) |
| `gongcha-caramel` | `#E7CDB4` | `rgb(231, 205, 180)` | Warm Caramel brown |
| `gongcha-matcha` | `#A0AA4E` | `rgb(160, 170, 78)` | Matcha / Fresh Herbal Green |
| `gongcha-green-light` | `#D0DEBB` | `rgb(208, 222, 187)` | Soft matcha / green tea background |
| `gongcha-taro` | `#E0C7E6` | `rgb(224, 199, 230)` | Taro milk tea / Pastel purple card |
| `gongcha-purple` | `#9D7692` | `rgb(157, 118, 146)` | Deep Grape / Taro accent |
| `gongcha-strawberry` / `pink` | `#E78F93` | `rgb(231, 143, 147)` | Strawberry / Berry drinks |
| `gongcha-peach` | `#EB9E9C` | `rgb(235, 158, 156)` | Peach flavor / Soft coral |
| `gongcha-passionfruit` | `#F5D349` | `rgb(245, 211, 73)` | Passionfruit / Citrus bright yellow |
| `gongcha-orange-dark` | `#FF8F1C` | `rgb(255, 143, 28)` | Bright Orange (Alert, highlight promosi) |
| `gongcha-orange-light` | `#F3CFB3` | `rgb(243, 207, 179)` | Soft orange cream |
| `gongcha-chocolate` | `#8C3A1A` | `rgb(140, 58, 26)` | Chocolate / Dark Roasted Oolong |
| `gongcha-blue-dark` | `#48A9C5` | `rgb(72, 169, 197)` | Refreshing Cool Blue |
| `gongcha-blue-light` | `#BBDDE6` | `rgb(187, 221, 230)` | Ice / Sky blue background |

### C. Neutrals & Backgrounds
| Token Key | HEX | RGB | Penggunaan |
| :--- | :--- | :--- | :--- |
| `white` | `#FFFFFF` | `rgb(255, 255, 255)` | Latar card, popup modal, kontras font di atas merah |
| `gongcha-grey-light` | `#EAEAEA` | `rgb(234, 234, 234)` | Garis pembatas (border), disabled background |
| `gongcha-grey` | `#BBBCBD` | `rgb(187, 188, 189)` | Teks placeholder, subtitle sekunder, icon muted |

---

## 3. 💻 Tailwind CSS Configuration Snippet

Jika ingin mengintegrasikan token ini ke konfigurasi Tailwind CSS (`tailwind.config.ts` atau `tailwind.config.js`), gunakan struktur berikut:

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        vidaloka: ["var(--font-vidaloka)", "Vidaloka", "serif"],
        sans: ["var(--font-public-sans)", "Public Sans", "sans-serif"],
      },
      colors: {
        gongcha: {
          red: {
            DEFAULT: "#C10230",
            dark: "#821518",
            light: "#F5DADF",
          },
          black: "#382F2D",
          pearl: {
            milk: "#F1D09F",
          },
          caramel: "#E7CDB4",
          matcha: "#A0AA4E",
          green: {
            dark: "#A0AA4E",
            light: "#D0DEBB",
          },
          taro: "#E0C7E6",
          purple: "#9D7692",
          strawberry: "#E78F93",
          pink: "#E78F93",
          peach: "#EB9E9C",
          passionfruit: "#F5D349",
          orange: {
            dark: "#FF8F1C",
            light: "#F3CFB3",
          },
          chocolate: "#8C3A1A",
          blue: {
            dark: "#48A9C5",
            light: "#BBDDE6",
          },
          grey: {
            DEFAULT: "#BBBCBD",
            light: "#EAEAEA",
          },
        },
      },
    },
  },
};

export default config;
```

---

## 4. 🌐 Import Font di Next.js (App Router)

```tsx
// app/layout.tsx
import { Vidaloka, Public_Sans } from "next/font/google";

const vidaloka = Vidaloka({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vidaloka",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-public-sans",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${vidaloka.variable} ${publicSans.variable}`}>
      <body className="font-sans text-gongcha-black antialiased">
        {children}
      </body>
    </html>
  );
}
```
