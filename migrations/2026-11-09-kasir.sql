-- =====================================================================
-- Migrasi aplikasi kasir — 2026-11-09
-- Aman dijalankan berulang kali (IF NOT EXISTS).
--
-- Cara menjalankan di server (contoh dengan psql):
--   psql "postgresql://USER:PASSWORD@HOST:5432/madebypayu_pos" -f migrations/2026-11-09-kasir.sql
-- atau tempel isinya di menu Database aaPanel / pgAdmin.
--
-- Kode aplikasi sudah aman dijalankan sebelum migrasi ini: tanpa kolom
-- "note", catatan pesanan hanya dicetak di struk dan tidak disimpan.
-- =====================================================================

-- 1. Catatan pesanan dari kasir (mis. "Less ice, takeaway").
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS note TEXT;

-- 2. Indeks untuk riwayat transaksi yang kini di-paging di server.
--    CONCURRENTLY: tidak mengunci tabel saat dibuat (transaksi kasir tetap jalan).
--    Catatan: CONCURRENTLY tidak boleh dijalankan di dalam BEGIN … COMMIT.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_created_at
  ON transactions (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaction_items_transaction_id
  ON transaction_items (transaction_id);
