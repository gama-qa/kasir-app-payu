import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    // Coba ping query paling ringan ke PostgreSQL
    const result = await pool.query('SELECT NOW()');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'BERHASIL KONEK KE POSTGRESQL! 🚀', 
      db_time: result.rows[0].now 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'GAGAL KONEK KE DATABASE!', 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};