# kasir-app — Project Guide

@AGENTS.md

## Konteks
Aplikasi POS (kasir) yang dibangun dengan **Astro** (SSR, `@astrojs/node`). Sedang dalam fase **refactor**, bukan rewrite.

**Fokus saat ini: halaman kasir** (`src/pages/cashier/*`): login kasir, layar kasir, riwayat transaksi.
- Dipakai di **tablet Android (RAM 4 GB)** lewat APK Capacitor. APK memuat situs dari server (`capacitor.config.json` → `server.url`), jadi perubahan web cukup di-deploy ke server; perubahan native (`android/`) wajib build ulang APK.
- Printer thermal Bluetooth lewat `cordova-plugin-bluetooth-serial`.
- Halaman dashboard (`src/pages/dashboard/*`) sudah selesai direfaktor; sentuh hanya untuk perbaikan atau bila diminta.

## Aturan Keras (jangan dilanggar)
1. **Tetap Astro murni.** Dilarang menambah React, Vue, Svelte, Solid, atau framework island apa pun. Tidak ada `@astrojs/react`, tidak ada `client:*` directive baru.
2. Interaktivitas = `<script>` biasa di `.astro` (vanilla TS/JS). Kalau perlu state kecil, pakai `data-*` attribute + event listener.
3. **Jangan ubah logic bisnis tanpa diminta**: API routes di `src/pages/api`, helper di `src/lib`, query/DB, perhitungan transaksi. Bila memang diminta:
   - perubahan skema DB ditulis sebagai file SQL di `migrations/` (idempoten, mis. `ADD COLUMN IF NOT EXISTS`);
   - kode harus tetap jalan **sebelum dan sesudah** migrasi dijalankan;
   - **jangan pernah menjalankan migrasi/skrip ke database produksi tanpa izin eksplisit.**
4. **Jangan tambah dependency** tanpa bertanya dulu. Terpasang: `tailwindcss`, `@tailwindcss/vite`, `lucide-static`.
5. Perubahan harus kecil dan bisa di-review per langkah. Satu halaman / satu komponen per iterasi.
6. Setelah tiap langkah, jalankan `npm run build` dan perbaiki error sebelum lanjut.
7. Teks UI dalam **Bahasa Indonesia**. Format uang selalu `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })` (pakai `formatRupiah` di `src/scripts/format.ts`). Format tanggal `id-ID`. Tanggal untuk filter dihitung dari waktu lokal, bukan `toISOString()` (UTC).
8. Semua `fetch` ke API internal lewat `apiRequest` (`src/scripts/api.ts`): selalu mengirim `Content-Type: application/json` agar lolos cek origin Astro di balik proxy (aaPanel/Nginx + HTTPS).
9. **Kredensial (database, token, dll.) hanya di `.env`** — tidak pernah ditulis di kode, karena repo di-push ke GitHub. Variabel baru wajib ditambahkan ke `.env.example` (tanpa nilai). Jangan menampilkan isi `.env` di output.

## Stack UI
- Styling: **Tailwind CSS v4** (hasil build, `src/styles/global.css`) + CSS variables ala shadcn (`--background`, `--foreground`, `--muted`, `--border`, `--primary`, dst.). **Dilarang Tailwind CDN.**
- Komponen: pendekatan **shadcn tanpa React** — komponen `.astro` buatan sendiri di `src/components/ui`. Jangan install `shadcn/ui` versi React.
- Ikon: **Lucide** via `lucide-static` (daftarkan di `src/components/ui/icons.ts`). Dilarang emoji sebagai ikon.
- Font: dashboard **Inter**; kasir **Plus Jakarta Sans** (tema `<html data-theme="cashier">`). `font-feature-settings: "tnum"` untuk angka di tabel.

## Struktur
```
src/
  layouts/
    DashboardLayout.astro     # shell dashboard: sidebar + topbar + footer
    CashierLayout.astro       # shell kasir: tema kasir, toast kiri-bawah
  components/
    ui/                       # primitif generik, tanpa logic bisnis
      Button, Card, Badge, Input, Select, Table, Dialog, EmptyState,
      Toast, Pagination, Icon (+ icons.ts), Footer
    dashboard/                # Sidebar, Topbar, StatCard, PageHeader
    cashier/                  # PrinterDialog, PrinterIndicator, QtyStepper
  scripts/                    # TS sisi browser, dipakai lintas halaman
    api.ts  format.ts  date.ts  ui.ts  products.ts  image.ts
    cashier/                  # printer.ts, printer-ui.ts, receipt.ts, session.ts
  lib/                        # sisi server: db.ts, schema.ts (cek kolom), uploads.ts (file foto)
  pages/uploads/[...path].ts  # menyajikan file unggahan (/uploads/…)
  styles/
    global.css                # token (termasuk tema kasir) + base layer
migrations/                   # SQL & skrip migrasi (dijalankan manual di server)
uploads/                      # file foto produk di server (di-ignore git)
```
- Props di-type dengan `interface Props`. Variasi via prop (`variant`, `size`), bukan copy-paste class.
- Tidak ada class Tailwind panjang yang diulang >3x. Jadikan komponen atau konstanta di frontmatter.
- Data dari JS dirender lewat `<template>` + `textContent` (bukan `innerHTML`), event lewat delegasi `data-action`.

## Arah Desain (anti "AI slop")
Target: tools internal profesional — tenang, padat informasi, rapi. Kasir mengikuti referensi POS modern (katalog kartu + panel pesanan di kanan).

**WAJIB**
- Palet netral + **satu** warna aksen (`--primary`). Warna data `--chart-1…4` (sudah divalidasi buta warna) hanya untuk ikon metrik & grafik, urutan tetap. Warna semantik (hijau/merah/kuning) hanya untuk status.
- Kasir memakai palet kasir: krem `#F7F4EF`, coklat `#3E2723`, garis `#E3DAC9`, hijau `#059669` untuk tombol bayar — semuanya lewat token tema kasir, bukan hex di komponen.
- Skala spacing 4px konsisten (4/8/12/16/24/32). Radius: 6px kontrol, 8px dialog/panel, 12px kartu.
- Hierarki tipografi jelas: judul halaman 20–24px semibold, label 12–13px muted, body 14px.
- Border tipis 1px (`--border`) untuk memisahkan area; bayangan maksimal `shadow-xs`.
- Tabel rapat (row height ~40–44px), header muted, angka rata kanan + tabular-nums, hover row halus.
- Setiap data view punya state: **loading, empty, error**.
- Fokus keyboard terlihat (`focus-visible` ring), kontras teks memadai.
- Layout responsif: sidebar dashboard jadi drawer di mobile; panel pesanan kasir jadi panel geser di bawah 1024px.

**DILARANG**
- Gradient dekoratif (ungu/biru/pink), gradient pada teks, glow, glassmorphism, blur background. (Isian area grafik yang memudar diperbolehkan.)
- Emoji di heading/tombol/kartu.
- Shadow besar, kartu dalam kartu dalam kartu.
- Hero banner/greeting besar di halaman admin.
- Ikon berwarna di lingkaran pastel.
- Animasi berlebihan (bounce, pulse, scale on hover). Transisi maksimal 150ms untuk warna/opacity.
- Copywriting generik/lebay. Pakai label singkat dan fungsional.
- Data dummy palsu yang tidak ada di database.

## Aturan Khusus Kasir (tablet APK, RAM 4 GB)
- Ringan: tanpa library UI/animasi tambahan, tanpa blur/animasi berulang, font maksimal 3 ketebalan.
- Jangan render ulang seluruh daftar untuk perubahan kecil (mis. tambah item → perbarui kartu itu saja). Pencarian di-debounce.
- Gambar produk berupa file (`/uploads/products/…`), bukan base64 di database; selalu `loading="lazy"` + `decoding="async"`.
- Data besar (riwayat) di-paging di server, bukan diambil semua lalu difilter di browser.
- Target sentuh minimal 32–36px; tombol aksi utama 48px. Toast tidak boleh menutupi tombol Bayar.
- Bluetooth hanya lewat `src/scripts/cashier/printer.ts`. Status "terhubung" selalu dicek ke plugin (`isConnected`), **tidak pernah** ditebak dari `localStorage`.
- Struk: teks ASCII 32 kolom (`src/scripts/cashier/receipt.ts`), tanpa spasi khusus dari `Intl`.
- Transaksi disimpan dulu, baru dicetak. Gagal cetak tidak boleh membatalkan transaksi.
- `capacitor.config.json` → `webDir` **harus** `capacitor-web` (halaman offline saja). **Jangan** `dist`: isinya kode server termasuk kredensial database, dan akan ikut terbungkus di APK.
- Build APK: `npx cap sync android`, lalu build di Android Studio. Gradle wrapper 8.14.3 tidak jalan di Java 25; pakai JDK 17/21 atau Gradle 9.x.

## Checklist Sebelum Selesai
- [ ] `npm run build` lolos (dan `npx astro check` kalau tersedia)
- [ ] Tidak ada dependency React/framework baru
- [ ] Perubahan di `lib/` dan `api/` hanya yang diminta (cek `git diff --stat`); migrasi DB ada di `migrations/`
- [ ] Tidak ada emoji / gradient dekoratif / shadow berlebihan
- [ ] Ada state loading, empty, error
- [ ] Tampilan dicek di 375px, 768px, 1280px; kasir juga di tablet 1280×800 dan 800×1280
- [ ] Tidak ada hardcoded warna hex di komponen (pakai token)
- [ ] Perubahan di `android/` → ingatkan untuk build ulang APK

## Cara Kerja
1. Baca dulu file terkait, jangan menebak struktur.
2. Tulis rencana singkat (file yang disentuh + alasannya), tunggu konfirmasi untuk perubahan besar.
3. Kerjakan bertahap, commit-friendly.
4. Di akhir, ringkas: apa yang berubah, apa yang sengaja tidak diubah, dan hal yang perlu dicek manual.
