// src/lib/db.ts
import pg from 'pg';

// Pakai destrukturisasi aman untuk Astro/Vite ESM interop
const Pool = pg.Pool || (pg as any).default?.Pool;

/**
 * Kredensial database HANYA dari environment — tidak pernah ditulis di kode,
 * karena repo ini di-push ke GitHub. Contoh lengkap: .env.example.
 *
 * Urutan: variabel environment saat server berjalan (aaPanel / `npm start`
 * yang memuat .env), lalu nilai .env saat dev/build (import.meta.env).
 */
const env = {
  POSTGRES_HOST: process.env.POSTGRES_HOST || import.meta.env.POSTGRES_HOST,
  POSTGRES_PORT: process.env.POSTGRES_PORT || import.meta.env.POSTGRES_PORT,
  POSTGRES_USER: process.env.POSTGRES_USER || import.meta.env.POSTGRES_USER,
  POSTGRES_DB: process.env.POSTGRES_DB || import.meta.env.POSTGRES_DB,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || import.meta.env.POSTGRES_PASSWORD,
};

const missing = (['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_DB', 'POSTGRES_PASSWORD'] as const).filter(
  (name) => !env[name],
);
if (missing.length > 0) {
  console.error(`[db] Variabel belum di-set: ${missing.join(', ')}. Salin .env.example menjadi .env lalu isi nilainya.`);
}

export const pool = new Pool({
  host: env.POSTGRES_HOST,
  port: Number(env.POSTGRES_PORT) || 5432,
  user: env.POSTGRES_USER,
  database: env.POSTGRES_DB,
  password: env.POSTGRES_PASSWORD,
});
