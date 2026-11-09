/**
 * Paket langganan akun & daftar fitur premium.
 * Dipakai frontmatter (halaman fitur premium) dan script layout (label paket di topbar).
 *
 * Belum ada sistem langganan di database: semua akun dianggap paket Gratis.
 * Bila nanti API login mengirim `plan: 'premium'` di data user, label & logika
 * di sini otomatis mengikuti.
 */
import type { IconName } from '../components/ui/icons';

export type Plan = 'free' | 'premium';

export const PLAN_LABELS: Record<Plan, string> = {
  free: 'Gratis',
  premium: 'Premium',
};

export function getPlan(session: { plan?: unknown } | null | undefined): Plan {
  return session?.plan === 'premium' ? 'premium' : 'free';
}

/**
 * Tautan tombol "Upgrade ke Premium" (mis. https://wa.me/62xxxxxxxxxx).
 * Selama masih null, halaman fitur premium menampilkan petunjuk kontak tanpa tombol.
 */
export const UPGRADE_URL: string | null = null;

export type PremiumFeatureKey = 'inventory' | 'finance' | 'insights';

export interface PremiumFeature {
  title: string;
  /** Satu kalimat di bawah judul halaman. */
  summary: string;
  icon: IconName;
  href: string;
  /** Yang didapat dengan paket Premium (singkat & fungsional). */
  benefits: string[];
}

export const PREMIUM_FEATURES: Record<PremiumFeatureKey, PremiumFeature> = {
  inventory: {
    title: 'Inventori & Bahan Baku',
    summary: 'Stok bahan baku, resep per menu, dan pembelian ke pemasok.',
    icon: 'warehouse',
    href: '/dashboard/inventory',
    benefits: [
      'Stok bahan baku berkurang otomatis setiap menu terjual',
      'Resep & takaran per menu untuk HPP yang lebih akurat',
      'Peringatan bahan yang hampir habis',
      'Riwayat pembelian bahan dari pemasok',
    ],
  },
  finance: {
    title: 'Keuangan',
    summary: 'Pengeluaran operasional, laba rugi, dan arus kas merek Anda.',
    icon: 'landmark',
    href: '/dashboard/finance',
    benefits: [
      'Catat pengeluaran operasional (sewa, gaji, listrik)',
      'Laporan laba rugi bulanan',
      'Arus kas harian per metode bayar',
      'Ekspor laporan ke Excel atau PDF',
    ],
  },
  insights: {
    title: 'AI & Insight',
    summary: 'Rekomendasi otomatis dari data penjualan Anda.',
    icon: 'sparkles',
    href: '/dashboard/insights',
    benefits: [
      'Perkiraan menu terlaris minggu depan',
      'Saran restok sebelum bahan habis',
      'Jam ramai untuk mengatur jadwal kasir',
      'Ringkasan performa mingguan otomatis',
    ],
  },
};
