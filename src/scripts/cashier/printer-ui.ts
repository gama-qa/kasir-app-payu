/** Teks & warna status printer untuk UI (indikator header, dialog, badge). */
import { onPrinterChange, PrinterError, type PrinterState } from './printer';

export type PrinterTone = 'success' | 'warning' | 'destructive' | 'muted';

export interface PrinterView {
  tone: PrinterTone;
  label: string;
  detail: string;
}

export function describePrinter(state: PrinterState): PrinterView {
  const name = state.device?.name;

  switch (state.status) {
    case 'unavailable':
      return { tone: 'muted', label: 'Printer tidak tersedia', detail: 'Cetak struk hanya dari aplikasi APK' };
    case 'connecting':
      return { tone: 'warning', label: 'Menghubungkan…', detail: name ?? '' };
    case 'connected':
      return { tone: 'success', label: name ?? 'Printer terhubung', detail: 'Terhubung' };
    default:
      return name
        ? { tone: 'destructive', label: 'Printer terputus', detail: name }
        : { tone: 'muted', label: 'Hubungkan printer', detail: 'Belum ada printer dipilih' };
  }
}

/** Perbarui semua [data-printer-dot|label|detail] di halaman setiap status berubah. */
export function bindPrinterIndicators(root: ParentNode = document): void {
  onPrinterChange((state) => {
    const view = describePrinter(state);
    root.querySelectorAll<HTMLElement>('[data-printer-dot]').forEach((dot) => {
      dot.dataset.tone = view.tone;
    });
    root.querySelectorAll('[data-printer-label]').forEach((element) => {
      element.textContent = view.label;
    });
    root.querySelectorAll('[data-printer-detail]').forEach((element) => {
      element.textContent = view.detail;
    });
  });
}

/** Pesan yang aman ditampilkan untuk error dari layanan printer. */
export function printerErrorMessage(error: unknown): string {
  return error instanceof PrinterError ? error.message : 'Terjadi kesalahan pada printer. Coba lagi.';
}
