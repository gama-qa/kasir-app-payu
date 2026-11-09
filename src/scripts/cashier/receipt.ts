/**
 * Teks struk untuk printer thermal 58 mm (32 karakter per baris).
 * Isi struk sama dengan versi sebelumnya; dipakai saat bayar dan cetak ulang.
 * Hanya karakter ASCII: printer thermal tidak mengenal spasi khusus dari
 * Intl.NumberFormat (mis. "Rp "), jadi angka diformat manual di sini.
 */

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
  subtotal: number;
}

export interface ReceiptData {
  code: string;
  customerName: string;
  /** Catatan pesanan (opsional), mis. "Less ice, takeaway". */
  note?: string | null;
  date: Date;
  items: ReceiptItem[];
  total: number;
  /** Cetak ulang dari riwayat. */
  copy?: boolean;
}

const WIDTH = 32;
const DOUBLE_LINE = '='.repeat(WIDTH);
const SINGLE_LINE = '-'.repeat(WIDTH);
const FEED = '\n\n\n\n';

const amount = (value: number) => Number(value).toLocaleString('id-ID');

function center(text: string): string {
  return ' '.repeat(Math.max(0, Math.floor((WIDTH - text.length) / 2))) + text;
}

export function buildReceipt(receipt: ReceiptData): string {
  const lines = [
    DOUBLE_LINE,
    center('PAYU'),
    `Nota : ${receipt.code}`,
    `Plgn : ${receipt.customerName}`,
    ...(receipt.note ? [`Ctt  : ${receipt.note}`] : []),
    `Tgl  : ${receipt.date.toLocaleString('id-ID')}`,
    SINGLE_LINE,
    ...receipt.items.flatMap((item) => [
      item.name,
      `${item.qty} x ${amount(item.price)} = ${amount(item.subtotal)}`,
    ]),
    SINGLE_LINE,
    `Total : Rp ${amount(receipt.total)}`,
    DOUBLE_LINE,
    center(receipt.copy ? 'Terima Kasih! (Copy)' : 'Terima Kasih!'),
  ];
  return lines.join('\n') + FEED;
}

export function buildTestReceipt(): string {
  return [DOUBLE_LINE, center('TEST PRINT POS'), DOUBLE_LINE, 'Printer Terhubung!', 'Status: OK'].join('\n') + FEED;
}
