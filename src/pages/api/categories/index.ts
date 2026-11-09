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

    let query = 'SELECT * FROM categories ORDER BY name ASC';
    let params: any[] = [];

    if (brandId) {
      query = 'SELECT * FROM categories WHERE brand_id = $1 ORDER BY name ASC';
      params.push(brandId);
    }

    const result = await pool.query(query, params);

    return new Response(JSON.stringify({
      success: true,
      data: result.rows
    }), { status: 200, headers });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Gagal mengambil data kategori!', 
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
    const { brand_id, name } = body;

    if (!name || !brand_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Nama kategori dan brand ID wajib diisi!' 
      }), { status: 400, headers });
    }

    const insertQuery = 'INSERT INTO categories (brand_id, name) VALUES ($1, $2) RETURNING *';
    const result = await pool.query(insertQuery, [brand_id, name]);

    return new Response(JSON.stringify({
      success: true,
      message: 'Kategori berhasil ditambahkan!',
      data: result.rows[0]
    }), { status: 200, headers });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Gagal menambah kategori!', 
      error: error.message 
    }), { status: 500, headers });
  }
};