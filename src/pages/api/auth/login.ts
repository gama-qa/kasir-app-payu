import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Username dan password wajib diisi!' 
      }), { status: 400, headers });
    }

    // Query nyari berdasarkan kolom 'username' yang baru di-rename
    const query = `
      SELECT 
        u.id, 
        u.name, 
        u.username, 
        u.password_hash, 
        u.role, 
        u.brand_id,
        b.name as brand_name
      FROM users u
      LEFT JOIN brands b ON u.brand_id = b.id
      WHERE u.username = $1
    `;
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Username tidak ditemukan!' 
      }), { status: 401, headers });
    }

    const user = result.rows[0];

    // Cek password
    if (user.password_hash !== password) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Kata sandi salah!' 
      }), { status: 401, headers });
    }

    // Return Data User
    const userData = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role, // 'cashier' atau 'brand_owner'
      brand_id: user.brand_id,
      brand_name: user.brand_name || 'Semua Brand',
    };

    return new Response(JSON.stringify({
      success: true,
      message: 'Login berhasil!',
      user: userData,
    }), { status: 200, headers });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Gagal melakukan login!', 
      error: error.message 
    }), { status: 500, headers });
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