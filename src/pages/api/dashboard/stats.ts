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
    const period = url.searchParams.get('period') || 'week'; // 'today', 'week', 'month'

    if (!brandId) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Parameter brand_id wajib disertakan!' 
      }), { status: 400, headers });
    }

    // Filter Tanggal berdasarkan tabel transactions (t.created_at)
    let dateFilter = "t.created_at >= NOW() - INTERVAL '7 DAYS'";
    if (period === 'today') {
      dateFilter = "DATE(t.created_at) = CURRENT_DATE";
    } else if (period === 'month') {
      dateFilter = "t.created_at >= NOW() - INTERVAL '30 DAYS'";
    }

    // 1. Query 4 Card Atas (Statistik Utama)
    const statsQuery = `
      SELECT 
        COALESCE(SUM(ti.subtotal), 0) as total_omset,
        COALESCE(SUM((ti.price_at_sale - ti.cost_price_at_sale) * ti.qty), 0) as total_profit,
        COALESCE(SUM(ti.qty), 0) as total_porsi_terjual,
        COUNT(DISTINCT ti.transaction_id) as total_nota
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE ti.brand_id = $1 AND ${dateFilter}
    `;
    const statsResult = await pool.query(statsQuery, [brandId]);

    // 2. Query Grafik Tren Penjualan Harian
    const chartQuery = `
      SELECT 
        TO_CHAR(t.created_at, 'YYYY-MM-DD') as date_key,
        TO_CHAR(t.created_at, 'Dy') as day_name,
        COALESCE(SUM(ti.subtotal), 0) as omset
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE ti.brand_id = $1 AND ${dateFilter}
      GROUP BY date_key, day_name
      ORDER BY date_key ASC
    `;
    const chartResult = await pool.query(chartQuery, [brandId]);

    // 3. Query Chart Menu Terlaris (Pie/Donut Chart)
    const topMenuQuery = `
      SELECT 
        p.name as product_name,
        COALESCE(SUM(ti.qty), 0) as total_qty
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      JOIN products p ON ti.product_id = p.id
      WHERE ti.brand_id = $1 AND ${dateFilter}
      GROUP BY p.name
      ORDER BY total_qty DESC
      LIMIT 5
    `;
    const topMenuResult = await pool.query(topMenuQuery, [brandId]);

    // 4. Query Tabel Transaksi Terakhir (5 Trx Terbaru)
    const recentTrxQuery = `
      SELECT 
        t.transaction_code,
        TO_CHAR(t.created_at, 'DD/MM HH24:MI') as waktu,
        p.name as menu_terbeli,
        ti.qty,
        ti.subtotal,
        t.payment_method
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      JOIN products p ON ti.product_id = p.id
      WHERE ti.brand_id = $1
      ORDER BY t.created_at DESC
      LIMIT 5
    `;
    const recentTrxResult = await pool.query(recentTrxQuery, [brandId]);

    // Response Lengkap Mengcover Seluruh UI Dashboard
    return new Response(JSON.stringify({
      success: true,
      brand_id: Number(brandId),
      period,
      summary: {
        total_omset: Number(statsResult.rows[0].total_omset),
        total_profit: Number(statsResult.rows[0].total_profit),
        total_porsi_terjual: Number(statsResult.rows[0].total_porsi_terjual),
        total_nota: Number(statsResult.rows[0].total_nota)
      },
      sales_chart: chartResult.rows,
      top_menu: topMenuResult.rows,
      recent_transactions: recentTrxResult.rows
    }), { status: 200, headers });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Gagal mengambil data dashboard!', 
      error: error.message 
    }), { status: 500, headers });
  }
};