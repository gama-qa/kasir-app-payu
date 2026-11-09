#!/usr/bin/env node
/**
 * Migrasi foto produk: base64 di kolom products.image_url → file di folder uploads.
 *
 * Kenapa: foto base64 (bisa >1 MB per menu) ikut terkirim setiap katalog kasir dimuat,
 * berat untuk tablet RAM 4 GB. Setelah migrasi, kolom hanya berisi URL
 * (/uploads/products/<acak>.<ext>) dan foto di-cache oleh WebView tablet.
 *
 * Jalankan DI SERVER, dari folder proyek (folder yang sama dengan aplikasi berjalan,
 * agar file masuk ke folder uploads yang disajikan aplikasi):
 *
 *   node --env-file=.env migrations/2026-11-09-product-images.mjs          # cek saja
 *   node --env-file=.env migrations/2026-11-09-product-images.mjs --apply  # jalankan
 *
 * Kredensial dibaca dari .env (sama dengan aplikasi, lihat .env.example):
 *   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_DB, POSTGRES_PASSWORD, UPLOAD_DIR
 *
 * Aman dijalankan berulang: hanya baris yang masih "data:image/…" yang diproses.
 * Saran: backup tabel products dulu, mis.
 *   CREATE TABLE products_backup_20261109 AS SELECT * FROM products;
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
const PRODUCT_FOLDER = path.join(UPLOAD_ROOT, 'products');

const TYPES = {
  'image/jpeg': { ext: 'jpg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', matches: (b) => b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG' },
  'image/webp': { ext: 'webp', matches: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
};

const REQUIRED_ENV = ['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_DB', 'POSTGRES_PASSWORD'];
const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  console.error(
    `Variabel belum di-set: ${missingEnv.join(', ')}.\nJalankan dengan: node --env-file=.env migrations/2026-11-09-product-images.mjs`,
  );
  process.exit(1);
}

const pool = new pg.Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
});

function decode(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s.exec(dataUrl);
  const type = match && TYPES[match[1]];
  if (!type) return null;
  const data = Buffer.from(match[2], 'base64');
  return data.length > 0 && type.matches(data) ? { data, ext: type.ext } : null;
}

async function main() {
  console.log(`Mode: ${APPLY ? 'JALANKAN (--apply)' : 'CEK SAJA (tambahkan --apply untuk menjalankan)'}`);
  console.log(`Folder file: ${PRODUCT_FOLDER}\n`);

  // Ambil id saja dulu; foto dibaca satu per satu agar hemat memori.
  const { rows } = await pool.query(
    "SELECT id, name FROM products WHERE image_url LIKE 'data:image/%' ORDER BY id",
  );
  if (rows.length === 0) {
    console.log('Tidak ada foto base64. Tidak ada yang perlu dimigrasi.');
    return;
  }

  if (APPLY) await mkdir(PRODUCT_FOLDER, { recursive: true });

  let moved = 0;
  let skipped = 0;
  let totalBytes = 0;

  for (const { id, name } of rows) {
    const { rows: [product] } = await pool.query('SELECT image_url FROM products WHERE id = $1', [id]);
    const image = product?.image_url ? decode(product.image_url) : null;
    if (!image) {
      skipped += 1;
      console.warn(`  [lewati] #${id} ${name}: data foto tidak valid`);
      continue;
    }

    totalBytes += image.data.length;
    const fileName = `${randomUUID()}.${image.ext}`;
    const url = `/uploads/products/${fileName}`;

    if (APPLY) {
      await writeFile(path.join(PRODUCT_FOLDER, fileName), image.data, { flag: 'wx' });
      await pool.query("UPDATE products SET image_url = $1 WHERE id = $2 AND image_url LIKE 'data:image/%'", [url, id]);
    }
    moved += 1;
    console.log(`  ${APPLY ? '[pindah]' : '[akan dipindah]'} #${id} ${name} → ${url} (${(image.data.length / 1024).toFixed(0)} KB)`);
  }

  console.log(
    `\nSelesai. ${moved} foto ${APPLY ? 'dipindahkan' : 'siap dipindahkan'} (${(totalBytes / 1024 / 1024).toFixed(1)} MB), ${skipped} dilewati.`,
  );
}

main()
  .catch((error) => {
    console.error('Migrasi gagal:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
