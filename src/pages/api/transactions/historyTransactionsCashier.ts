import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';
import { hasColumn } from '../../../lib/schema';

/**
 * Riwayat transaksi untuk aplikasi kasir, di-paging & difilter di server
 * (dulu seluruh transaksi + item dikirim lalu difilter di tablet).
 *
 * Query (semua opsional):
 *   page   halaman, mulai 1 (default 1)
 *   limit  data per halaman, 1–100 (default 10)
 *   search cocok sebagian dengan nama pelanggan atau kode nota
 *   brand  nama merek; transaksi yang memuat item merek ini
 *   from   ISO datetime, batas awal created_at (inklusif)
 *   to     ISO datetime, batas akhir created_at (inklusif)
 *
 * Respons: { success, transactions, total, page, limit, brands }
 * Bentuk tiap transaksi sama seperti sebelumnya, ditambah customer_name & note.
 */

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const DEFAULT_CUSTOMER = 'Pelanggan Umum';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toIsoDate(value: string | null): string | null {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null;
}

/** Karakter wildcard LIKE dari input pengguna diperlakukan sebagai teks biasa. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

export const GET: APIRoute = async ({ request }) => {
  try {
    const params = new URL(request.url).searchParams;
    const page = toPositiveInt(params.get('page'), 1);
    const limit = Math.min(toPositiveInt(params.get('limit'), DEFAULT_LIMIT), MAX_LIMIT);
    const search = params.get('search')?.trim() ?? '';
    const brand = params.get('brand')?.trim() ?? '';
    const from = toIsoDate(params.get('from'));
    const to = toIsoDate(params.get('to'));

    // ---- Filter (parameterized, aman dari SQL injection) ----
    const conditions: string[] = [];
    const values: unknown[] = [];
    const bind = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };

    if (search) {
      const pattern = bind(`%${escapeLike(search)}%`);
      conditions.push(
        `(COALESCE(NULLIF(t.customer_name, ''), '${DEFAULT_CUSTOMER}') ILIKE ${pattern} OR t.transaction_code ILIKE ${pattern})`,
      );
    }
    if (from) conditions.push(`t.created_at >= ${bind(from)}::timestamptz`);
    if (to) conditions.push(`t.created_at <= ${bind(to)}::timestamptz`);
    if (brand) {
      conditions.push(`EXISTS (
        SELECT 1 FROM transaction_items fi
        JOIN brands fb ON fb.id = fi.brand_id
        WHERE fi.transaction_id = t.id AND fb.name = ${bind(brand)}
      )`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // ---- Total & satu halaman transaksi ----
    // Parameter LIMIT/OFFSET di array terpisah: query hitung memakai `values` apa adanya.
    const pageValues = [...values, limit, (page - 1) * limit];
    const noteColumn = (await hasColumn('transactions', 'note')) ? 't.note' : 'NULL AS note';
    const [countResult, pageResult, brandResult] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM transactions t ${where}`, values),
      pool.query(
        `SELECT t.id, t.transaction_code, t.cashier_id, t.customer_name, ${noteColumn},
                t.payment_method, t.discount_percent, t.discount_amount,
                t.cash_given, t.change_given, t.created_at
           FROM transactions t
           ${where}
          ORDER BY t.created_at DESC, t.id DESC
          LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
        pageValues,
      ),
      pool.query('SELECT name FROM brands ORDER BY name ASC'),
    ]);

    const rows: any[] = pageResult.rows;

    // ---- Item hanya untuk transaksi di halaman ini ----
    const itemsResult = rows.length
      ? await pool.query(
          `SELECT ti.id, ti.transaction_id, ti.product_id,
                  p.name AS product_name, b.name AS brand_name,
                  ti.qty, ti.price_at_sale, ti.subtotal
             FROM transaction_items ti
             LEFT JOIN products p ON ti.product_id = p.id
             LEFT JOIN brands b ON ti.brand_id = b.id
            WHERE ti.transaction_id = ANY($1)`,
          [rows.map((row) => row.id)],
        )
      : { rows: [] as any[] };

    const itemsByTransaction = new Map<string, any[]>();
    for (const item of itemsResult.rows) {
      const key = String(item.transaction_id);
      const group = itemsByTransaction.get(key);
      if (group) group.push(item);
      else itemsByTransaction.set(key, [item]);
    }

    // ---- Bentuk respons (perhitungan grand_total TIDAK BERUBAH) ----
    const transactions = rows.map((trx) => {
      const items = itemsByTransaction.get(String(trx.id)) ?? [];
      const subtotalSum = items.reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0);
      const discountAmount = Number(trx.discount_amount || 0);

      return {
        id: trx.id,
        transaction_code: trx.transaction_code,
        cashier_id: trx.cashier_id,
        customer_name: trx.customer_name,
        note: trx.note,
        payment_method: trx.payment_method,
        discount_percent: Number(trx.discount_percent || 0),
        discount_amount: discountAmount,
        cash_given: Number(trx.cash_given || 0),
        change_given: Number(trx.change_given || 0),
        created_at: trx.created_at,
        grand_total: Math.max(0, subtotalSum - discountAmount),
        items,
      };
    });

    return json({
      success: true,
      transactions,
      total: countResult.rows[0]?.total ?? 0,
      page,
      limit,
      brands: brandResult.rows.map((row: any) => row.name),
    });
  } catch (error: any) {
    console.error('API Get Transactions Error:', error);
    return json({ success: false, message: 'Gagal mengambil data riwayat transaksi' }, 500);
  }
};
