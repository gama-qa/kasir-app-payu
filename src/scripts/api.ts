/**
 * Pembungkus fetch untuk API internal dashboard (sisi browser).
 *
 * Semua request yang mengubah data WAJIB lewat sini, karena:
 *
 * 1. Content-Type JSON selalu dikirim. Cek origin bawaan Astro
 *    (security.checkOrigin) menolak POST/DELETE tanpa Content-Type, atau
 *    bertipe form, bila header Origin dari browser berbeda dengan URL yang
 *    dilihat server. Di balik reverse proxy (Nginx aaPanel + HTTPS) keduanya
 *    selalu berbeda, sehingga DELETE tanpa header ini selalu gagal 403
 *    "Cross-site DELETE form submissions are forbidden".
 *    Request JSON tetap terlindung dari CSRF: browser mewajibkan preflight
 *    CORS untuk request lintas situs ber-Content-Type JSON.
 *
 * 2. Respons yang bukan JSON (403 dari Astro, 413/502 dari Nginx) diubah
 *    menjadi pesan yang menyebut kode status, sehingga penyebab error di
 *    server langsung terlihat di layar, bukan sekadar "error jaringan".
 */

/** Bentuk respons standar semua endpoint di src/pages/api. */
export interface ApiBody<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export class ApiError extends Error {
  /** Kode HTTP; 0 bila server tidak terjangkau sama sekali. */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type Method = 'GET' | 'POST' | 'DELETE';

interface RequestOptions {
  method?: Method;
  /** Dikirim sebagai JSON. */
  body?: unknown;
}

const NETWORK_ERROR_MESSAGE = 'Tidak dapat terhubung ke server. Periksa koneksi, lalu coba lagi.';

/**
 * Kirim request ke API internal. Mengembalikan body bila `success: true`,
 * selain itu melempar ApiError berisi pesan dari server atau kode statusnya.
 *
 * `TBody` untuk endpoint yang mengirim field lain di luar `data`, mis.
 * apiRequest<never, ApiBody<never> & { transaction_code: string }>(…).
 */
export async function apiRequest<T = unknown, TBody extends ApiBody<T> = ApiBody<T>>(
  url: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<TBody> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers:
        method === 'GET'
          ? { Accept: 'application/json' }
          : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  }

  const payload = await readJson<TBody>(response);
  if (response.ok && payload?.success) return payload;

  throw new ApiError(payload?.message || describeStatus(response.status), response.status);
}

/** Pesan yang aman ditampilkan ke pengguna untuk error apa pun. */
export function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Terjadi kesalahan yang tidak terduga. Coba lagi.';
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null; // mis. halaman HTML dari Nginx atau teks polos dari Astro
  }
}

function describeStatus(status: number): string {
  if (status === 403) return 'Permintaan ditolak server (kode 403).';
  if (status === 404) return 'Alamat API tidak ditemukan di server (kode 404).';
  if (status === 413) return 'Data terlalu besar untuk diterima server (kode 413). Coba foto yang lebih kecil.';
  if (status >= 500) return `Server sedang bermasalah (kode ${status}). Coba lagi nanti.`;
  return `Permintaan gagal (kode ${status}).`;
}
