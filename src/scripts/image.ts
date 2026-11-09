/**
 * Perkecil foto di browser sebelum diunggah (tanpa library).
 * Foto kamera 3–5 MB menjadi ±50–150 KB, sehingga katalog kasir di tablet
 * jauh lebih ringan dan cepat dimuat.
 */

export interface ResizeOptions {
  /** Sisi terpanjang dalam piksel. */
  maxSize?: number;
  /** Kualitas 0–1 untuk WebP/JPEG. */
  quality?: number;
}

/** File gambar → data URL WebP (atau JPEG bila browser tidak mendukung WebP). */
export async function resizeImage(file: Blob, { maxSize = 800, quality = 0.8 }: ResizeOptions = {}): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas tidak tersedia.');
  // Latar putih: bagian transparan (PNG) tidak menjadi hitam bila disimpan sebagai JPEG.
  context.fillStyle = 'white';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const webp = canvas.toDataURL('image/webp', quality);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality);
}
