import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Penyimpanan file unggahan (foto produk) di disk server.
 *
 * Lokasi: UPLOAD_DIR (env) atau <folder kerja aplikasi>/uploads.
 * File disajikan oleh src/pages/uploads/[...path].ts di URL /uploads/…
 * (opsional: arahkan Nginx aaPanel langsung ke folder ini agar lebih cepat).
 */
export const UPLOAD_ROOT = path.resolve(
  process.env.UPLOAD_DIR || import.meta.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
);

const PRODUCT_IMAGE_FOLDER = 'products';
export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadError';
  }
}

interface ImageType {
  ext: string;
  /** Cek "magic bytes": isi file benar-benar gambar, bukan sekadar label MIME. */
  matches: (data: Buffer) => boolean;
}

const IMAGE_TYPES: Record<string, ImageType> = {
  'image/jpeg': { ext: 'jpg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': {
    ext: 'png',
    matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/webp': {
    ext: 'webp',
    matches: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
};

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** "data:image/webp;base64,…" → isi file yang sudah divalidasi. */
export function decodeImageDataUrl(dataUrl: string): { data: Buffer; ext: string } {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new UploadError('Format foto harus JPG, PNG, atau WEBP.');

  const type = IMAGE_TYPES[match[1]];
  const data = Buffer.from(match[2], 'base64');
  if (data.length === 0) throw new UploadError('Foto kosong.');
  if (data.length > MAX_PRODUCT_IMAGE_BYTES) throw new UploadError('Ukuran foto maksimal 2 MB.');
  if (!type.matches(data)) throw new UploadError('File bukan gambar yang valid.');

  return { data, ext: type.ext };
}

/** Simpan foto produk dengan nama acak, kembalikan URL publiknya. */
export async function saveProductImage(data: Buffer, ext: string): Promise<string> {
  const folder = path.join(UPLOAD_ROOT, PRODUCT_IMAGE_FOLDER);
  await mkdir(folder, { recursive: true });

  const fileName = `${randomUUID()}.${ext}`;
  await writeFile(path.join(folder, fileName), data, { flag: 'wx' });
  return `/uploads/${PRODUCT_IMAGE_FOLDER}/${fileName}`;
}

/** Path file di dalam UPLOAD_ROOT untuk URL /uploads/…; null bila tidak sah (mis. "../"). */
export function resolveUploadFile(relativePath: string): { filePath: string; contentType: string } | null {
  const filePath = path.resolve(UPLOAD_ROOT, relativePath);
  if (!filePath.startsWith(UPLOAD_ROOT + path.sep)) return null;

  const contentType = CONTENT_TYPES[path.extname(filePath).slice(1).toLowerCase()];
  return contentType ? { filePath, contentType } : null;
}
