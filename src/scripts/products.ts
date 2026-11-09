/**
 * Tipe & aturan tampilan produk. Dipakai frontmatter dan script
 * src/pages/dashboard/products.astro.
 * Bentuk data mengikuti respons GET /api/products dan /api/categories.
 */

export interface Product {
  id: number;
  brand_id: number;
  category_id: number | null;
  name: string;
  /** Kolom numeric PostgreSQL bisa datang sebagai string. */
  price: number | string;
  cost_price: number | string;
  stock: number;
  is_active: boolean;
  image_url: string | null;
  category_name: string | null;
  brand_name: string | null;
  /** true bila produk sudah dipakai di transaksi, sehingga tidak boleh dihapus. */
  has_transactions: boolean;
}

export interface Category {
  id: number;
  brand_id: number;
  name: string;
}

/** Stok di bawah atau sama dengan batas ini dianggap perlu restok. */
export const LOW_STOCK_LIMIT = 20;

export type StockStatus = 'ok' | 'low' | 'out';

export function getStockStatus(stock: number | string): StockStatus {
  const value = Number(stock);
  if (value <= 0) return 'out';
  if (value <= LOW_STOCK_LIMIT) return 'low';
  return 'ok';
}

/** Estimasi untung per porsi = harga jual − HPP. */
export function getMargin(product: Pick<Product, 'price' | 'cost_price'>): number {
  return Number(product.price) - (Number(product.cost_price) || 0);
}

/** Kode tampilan produk (format lama dipertahankan). */
export function getProductCode(product: Pick<Product, 'id'>): string {
  return `#PROD-00${product.id}`;
}
