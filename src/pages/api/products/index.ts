import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';

export const GET: APIRoute = async ({ request }) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const url = new URL(request.url);
    const brandId = url.searchParams.get('brand_id');

    let query = `
      SELECT 
        p.id,
        p.brand_id,
        p.category_id,
        p.name,
        COALESCE(p.price, 0) as price,
        COALESCE(p.cost_price, 0) as cost_price,
        COALESCE(p.stock, 0) as stock,
        COALESCE(p.is_active, true) as is_active,
        p.image_url,
        c.name as category_name, 
        b.name as brand_name,
        EXISTS (
          SELECT 1 FROM transaction_items ti WHERE ti.product_id = p.id
        ) as has_transactions
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ORDER BY p.id ASC
    `;
    let params: any[] = [];

    if (brandId) {
      query = `
        SELECT 
          p.id,
          p.brand_id,
          p.category_id,
          p.name,
          COALESCE(p.price, 0) as price,
          COALESCE(p.cost_price, 0) as cost_price,
          COALESCE(p.stock, 0) as stock,
          COALESCE(p.is_active, true) as is_active,
          p.image_url,
          c.name as category_name, 
          b.name as brand_name,
          EXISTS (
            SELECT 1 FROM transaction_items ti WHERE ti.product_id = p.id
          ) as has_transactions
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.brand_id = $1 
        ORDER BY p.id ASC
      `;
      params.push(Number(brandId));
    }

    const result = await pool.query(query, params);

    return new Response(JSON.stringify({
      success: true,
      data: result.rows
    }), { status: 200, headers });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Gagal mengambil data produk!', 
      error: error.message 
    }), { status: 500, headers });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = await request.json();
    const { id, brand_id, category_id, name, price, cost_price, stock, is_active, image_url } = body;

    if (!name || price === undefined) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Nama dan harga produk wajib diisi!' 
      }), { status: 400, headers });
    }

    const activeBrandId = Number(brand_id) || 1;

    // UPDATE PRODUK
    if (id && id !== 'null' && id !== '' && Number(id) > 0) {
      const updateQuery = `
        UPDATE products 
        SET category_id = $1, name = $2, price = $3, cost_price = $4, stock = $5, is_active = $6, image_url = $7
        WHERE id = $8 AND brand_id = $9
      `;
      await pool.query(updateQuery, [
        category_id ? Number(category_id) : null, 
        name, 
        Number(price), 
        Number(cost_price) || 0, 
        Number(stock), 
        is_active ?? true, 
        image_url || null, 
        Number(id), 
        activeBrandId
      ]);
    } else {
      // INSERT PRODUK BARU
      const insertQuery = `
        INSERT INTO products (brand_id, category_id, name, price, cost_price, stock, is_active, image_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      await pool.query(insertQuery, [
        activeBrandId, 
        category_id ? Number(category_id) : null, 
        name, 
        Number(price), 
        Number(cost_price) || 0, 
        Number(stock), 
        is_active ?? true, 
        image_url || null
      ]);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Data produk berhasil disimpan!'
    }), { status: 200, headers });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Gagal menyimpan produk!', 
      error: error.message 
    }), { status: 500, headers });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    const brandIdParam = url.searchParams.get('brand_id');

    if (!idParam) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'ID produk wajib diberikan!' 
      }), { status: 400, headers });
    }

    const productId = Number(idParam);
    const brandId = Number(brandIdParam) || 1;

    // Proteksi Tambahan di Backend: Cek apakah ada riwayat transaksi
    const checkTx = await pool.query('SELECT 1 FROM transaction_items WHERE product_id = $1 LIMIT 1', [productId]);
    if (checkTx.rows.length > 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Produk tidak dapat dihapus karena sudah memiliki riwayat transaksi!' 
      }), { status: 400, headers });
    }

    // Keamanan: Hapus produk HANYA jika ID & brand_id sesuai pemilik
    const deleteQuery = 'DELETE FROM products WHERE id = $1 AND brand_id = $2';
    const result = await pool.query(deleteQuery, [productId, brandId]);

    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Produk tidak ditemukan atau Anda tidak memiliki akses!' 
      }), { status: 404, headers });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Produk berhasil dihapus!'
    }), { status: 200, headers });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Gagal menghapus produk: ' + error.message, 
      error: error.message 
    }), { status: 500, headers });
  }
};