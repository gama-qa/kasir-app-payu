/**
 * Helper DOM kecil untuk script halaman dashboard.
 * Semua teks dimasukkan lewat textContent, jadi aman dari HTML di data.
 */

export interface ToastOptions {
  title: string;
  message?: string;
  variant?: 'success' | 'error';
  duration?: number;
}

declare global {
  interface Window {
    /** Didefinisikan oleh components/ui/Toast.astro (dipasang di DashboardLayout). */
    showToast?: (options: ToastOptions) => void;
  }
}

/** Ambil elemen yang wajib ada. Error jelas bila markup dan script tidak sinkron. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Elemen #${id} tidak ditemukan.`);
  return element as T;
}

/** Seperti byId, tetapi mencari di dalam `root` (mis. baris hasil cloneTemplate). */
export function query<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Elemen ${selector} tidak ditemukan.`);
  return element;
}

export function cloneTemplate(id: string): DocumentFragment {
  return byId<HTMLTemplateElement>(id).content.cloneNode(true) as DocumentFragment;
}

/** Isi setiap elemen [data-field="<nama>"] di dalam `root`. */
export function setFields(root: ParentNode, fields: Record<string, string>): void {
  for (const [name, value] of Object.entries(fields)) {
    const element = root.querySelector<HTMLElement>(`[data-field="${name}"]`);
    if (element) element.textContent = value;
  }
}

/**
 * Tampilkan satu state (loading / ready / empty / error / …) di dalam
 * [data-block="<block>"] dan sembunyikan anak [data-view] lainnya.
 */
export function showView(block: string, view: string): void {
  document.querySelectorAll<HTMLElement>(`[data-block="${block}"] > [data-view]`).forEach((element) => {
    element.hidden = element.dataset.view !== view;
  });
}

/** Tampilkan pesan (mis. error di dialog), atau sembunyikan bila `message` kosong. */
export function setMessage(element: HTMLElement, message: string | null): void {
  element.textContent = message ?? '';
  element.hidden = !message;
}

/**
 * Kunci tombol selama proses berjalan dan ganti labelnya sementara.
 * Bila tombol punya ikon, bungkus teksnya dengan <span data-label> agar ikon tidak ikut terhapus.
 */
export function setBusy(button: HTMLButtonElement, busy: boolean, busyLabel = 'Memproses…'): void {
  const label = button.querySelector<HTMLElement>('[data-label]') ?? button;
  if (busy) {
    button.dataset.idleLabel ??= label.textContent?.trim() ?? '';
    label.textContent = busyLabel;
  } else if (button.dataset.idleLabel !== undefined) {
    label.textContent = button.dataset.idleLabel;
  }
  button.disabled = busy;
}

/** Isi ulang <select> dan pertahankan pilihan lama bila opsinya masih ada. */
export function setOptions(select: HTMLSelectElement, options: HTMLOptionElement[], preferred = select.value): void {
  select.replaceChildren(...options);
  if (options.some((option) => option.value === preferred)) select.value = preferred;
}

export function toast(options: ToastOptions): void {
  window.showToast?.(options);
}
