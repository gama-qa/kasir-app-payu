/** Format angka & uang untuk tampilan (id-ID). */

const rupiahFormat = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat('id-ID');

/** Rp 32.000. Nilai kosong/tidak valid ditampilkan sebagai Rp 0. */
export function formatRupiah(value: number | string | null | undefined): string {
  return rupiahFormat.format(Number(value) || 0);
}

/** 1.250 */
export function formatNumber(value: number | string | null | undefined): string {
  return numberFormat.format(Number(value) || 0);
}
