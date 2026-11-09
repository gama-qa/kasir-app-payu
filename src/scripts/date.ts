/**
 * Tanggal berbasis waktu LOKAL perangkat (WIB di tablet kasir).
 * Jangan pakai toISOString().split('T')[0] untuk input date: itu tanggal UTC,
 * sehingga pukul 00.00–07.00 WIB jatuh ke tanggal kemarin.
 */

const pad = (value: number) => String(value).padStart(2, '0');

/** Date → "YYYY-MM-DD" (lokal), untuk <input type="date">. */
export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DD" → ISO awal hari (00:00:00.000 lokal), untuk dikirim ke server. */
export function startOfDayIso(dateValue: string): string {
  return new Date(`${dateValue}T00:00:00`).toISOString();
}

/** "YYYY-MM-DD" → ISO akhir hari (23:59:59.999 lokal), untuk dikirim ke server. */
export function endOfDayIso(dateValue: string): string {
  return new Date(`${dateValue}T23:59:59.999`).toISOString();
}

export type QuickRange = 'today' | 'week' | 'month' | 'all';

/** Rentang preset: minggu mulai hari Minggu, bulan mulai tanggal 1 (sama seperti sebelumnya). */
export function quickRangeDates(range: QuickRange, now = new Date()): { start: string; end: string } {
  const today = toDateInputValue(now);
  if (range === 'today') return { start: today, end: today };
  if (range === 'week') {
    return { start: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())), end: today };
  }
  if (range === 'month') return { start: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)), end: today };
  return { start: '', end: '' };
}
