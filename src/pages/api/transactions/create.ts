import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';
import { hasColumn } from '../../../lib/schema';

const NOTE_MAX_LENGTH = 200;

export const POST: APIRoute = async ({ request }) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const client = await pool.connect();

  try {
    const body = await request.json();
    const { 
      cashier_id, 
      customer_name, // <-- Tangkap field customer_name
      payment_method, 
      discount_percent,
      discount_amount,
      cash_given, 
      change_given, 
      note, // Catatan pesanan (opsional)
      items // Array: [{ product_id, brand_id, qty, price_at_sale, cost_price_at_sale, subtotal }]
    } = body;

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Keranjang belanja kosong!' 
      }), { status: 400, headers });
    }

    // 1. Hitung Subtotal Kotor Seluruh Item
    const subtotal_amount = items.reduce((acc: number, item: any) => acc + item.subtotal, 0);

    // 2. Hitung Nominal Diskon & Total Bersih
    const discPercent = Number(discount_percent) || 0;
    const discAmount = discount_amount !== undefined 
      ? Number(discount_amount) 
      : Math.round(subtotal_amount * (discPercent / 100));

    // Total bayar akhir setelah dipotong diskon
    const total_amount = Math.max(0, subtotal_amount - discAmount);

    // Generate kode transaksi unik (Contoh: TRX-1722428400000)
    const transaction_code = `TRX-${Date.now()}`;

    // Catatan disimpan hanya bila kolom "note" sudah ada (migrations/2026-11-09-kasir.sql).
    const noteText = typeof note === 'string' ? note.trim().slice(0, NOTE_MAX_LENGTH) : '';
    const saveNote = await hasColumn('transactions', 'note');

    // MULAI DB TRANSACTION
    await client.query('BEGIN');

    // 1. Insert ke tabel transactions (Termasuk customer_name, discount_percent & discount_amount)
    const insertTrxQuery = `
      INSERT INTO transactions 
        (transaction_code, cashier_id, customer_name, total_amount, payment_method, discount_percent, discount_amount, cash_given, change_given${saveNote ? ', note' : ''}, created_at)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9${saveNote ? ', $10' : ''}, NOW())
      RETURNING id
    `;
    const trxRes = await client.query(insertTrxQuery, [
      transaction_code,
      cashier_id || 1,
      customer_name || 'Pelanggan Umum', // Fallback default jika kosong/opsional
      total_amount,
      payment_method || 'CASH',
      discPercent,
      discAmount,
      cash_given || total_amount,
      change_given || 0,
      ...(saveNote ? [noteText || null] : []),
    ]);

    const transaction_id = trxRes.rows[0].id;

    // 2. Loop Insert ke transaction_items & Potong Stok Produk
    for (const item of items) {
      const insertItemQuery = `
        INSERT INTO transaction_items 
          (transaction_id, product_id, brand_id, qty, price_at_sale, cost_price_at_sale, subtotal)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7)
      `;
      await client.query(insertItemQuery, [
        transaction_id,
        item.product_id,
        item.brand_id,
        item.qty,
        item.price_at_sale,
        item.cost_price_at_sale || 0,
        item.subtotal
      ]);

      // Potong stok di tabel products
      const updateStockQuery = `
        UPDATE products 
        SET stock = stock - $1 
        WHERE id = $2
      `;
      await client.query(updateStockQuery, [item.qty, item.product_id]);
    }

    // COMMIT ALL QUERIES
    await client.query('COMMIT');

    return new Response(JSON.stringify({
      success: true,
      message: 'Transaksi berhasil disimpan ke database!',
      transaction_code,
      transaction_id
    }), { status: 200, headers });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error Transaction Rollback:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Gagal menyimpan transaksi!', 
      error: error.message 
    }), { status: 500, headers });
  } finally {
    client.release();
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};