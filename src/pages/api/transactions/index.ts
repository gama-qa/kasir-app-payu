import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';

export const GET: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' };
  const url = new URL(request.url);
  const brandId = url.searchParams.get('brand_id');

  if (!brandId) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'brand_id wajib dikirim!' 
    }), { status: 400, headers });
  }

  const client = await pool.connect();

  try {
    // Query ajaib: Mengambil transaksi DAN hanya item yang sesuai brand_id
    const query = `
      SELECT 
        t.id,
        t.transaction_code,
        t.payment_method,
        t.created_at,
        u.name as cashier_name,
        SUM(ti.subtotal) as total_amount_brand, -- Total belanja khusus brand ini saja
        json_agg(
          json_build_object(
            'product_id', ti.product_id,
            'name', p.name,
            'qty', ti.qty,
            'price', ti.price_at_sale,
            'subtotal', ti.subtotal
          )
        ) as items
      FROM transactions t
      JOIN transaction_items ti ON t.id = ti.transaction_id
      JOIN products p ON ti.product_id = p.id
      LEFT JOIN users u ON t.cashier_id = u.id
      WHERE ti.brand_id = $1
      GROUP BY t.id, u.name
      ORDER BY t.created_at DESC
    `;

    const result = await client.query(query, [brandId]);

    return new Response(JSON.stringify({
      success: true,
      data: result.rows
    }), { status: 200, headers });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500, headers });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/transactions?id=<transaction_id>&brand_id=<brand_id>
 *
 * Satu nota bisa berisi item dari beberapa merek. Endpoint ini hanya menghapus
 * item milik `brand_id` dari nota tersebut, lalu:
 *   - mengembalikan stok produk sebanyak qty item yang dihapus;
 *   - menghapus nota (tabel transactions) bila sudah tidak ada item tersisa.
 * Semua langkah dalam satu DB transaction: gagal di tengah = tidak ada yang berubah.
 */
export const DELETE: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' };
  const url = new URL(request.url);
  const transactionId = Number(url.searchParams.get('id'));
  const brandId = Number(url.searchParams.get('brand_id'));

  if (!Number.isInteger(transactionId) || transactionId <= 0 || !Number.isInteger(brandId) || brandId <= 0) {
    return new Response(JSON.stringify({
      success: false,
      message: 'ID transaksi dan brand_id wajib diisi!'
    }), { status: 400, headers });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Hapus hanya item milik merek ini, sekaligus ambil qty untuk pengembalian stok
    const deletedItems = await client.query(
      `DELETE FROM transaction_items
       WHERE transaction_id = $1 AND brand_id = $2
       RETURNING product_id, qty`,
      [transactionId, brandId]
    );

    if (deletedItems.rowCount === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({
        success: false,
        message: 'Transaksi tidak ditemukan untuk merek ini!'
      }), { status: 404, headers });
    }

    // 2. Kembalikan stok (kebalikan dari pemotongan stok di /api/transactions/create)
    for (const item of deletedItems.rows) {
      await client.query(
        'UPDATE products SET stock = stock + $1 WHERE id = $2',
        [item.qty, item.product_id]
      );
    }

    // 3. Hapus nota bila tidak ada item merek lain yang tersisa
    const remaining = await client.query(
      'SELECT 1 FROM transaction_items WHERE transaction_id = $1 LIMIT 1',
      [transactionId]
    );
    const transactionDeleted = remaining.rows.length === 0;
    if (transactionDeleted) {
      await client.query('DELETE FROM transactions WHERE id = $1', [transactionId]);
    }

    await client.query('COMMIT');

    return new Response(JSON.stringify({
      success: true,
      message: 'Transaksi berhasil dihapus!',
      deleted_items: deletedItems.rowCount,
      transaction_deleted: transactionDeleted
    }), { status: 200, headers });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error Delete Transaction Rollback:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Gagal menghapus transaksi!',
      error: error.message
    }), { status: 500, headers });
  } finally {
    client.release();
  }
};