import { pool } from './db';

/**
 * Cek apakah sebuah kolom sudah ada di database.
 *
 * Dipakai agar kode baru tetap berjalan SEBELUM migrasi (migrations/*.sql)
 * dijalankan di server: fitur yang butuh kolom baru otomatis nonaktif sampai
 * kolomnya ada, alih-alih membuat transaksi gagal.
 *
 * Hasil "ada" disimpan permanen; hasil "belum ada" dicek ulang tiap 60 detik,
 * jadi setelah migrasi dijalankan fitur aktif tanpa perlu restart server.
 */
const RECHECK_MS = 60_000;
const cache = new Map<string, { exists: boolean; checkedAt: number }>();

export async function hasColumn(table: string, column: string): Promise<boolean> {
  const key = `${table}.${column}`;
  const cached = cache.get(key);
  if (cached && (cached.exists || Date.now() - cached.checkedAt < RECHECK_MS)) return cached.exists;

  let exists = false;
  try {
    const result = await pool.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2
        LIMIT 1`,
      [table, column],
    );
    exists = result.rows.length > 0;
  } catch {
    exists = false;
  }

  cache.set(key, { exists, checkedAt: Date.now() });
  return exists;
}
