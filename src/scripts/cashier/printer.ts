/**
 * Layanan printer thermal Bluetooth untuk aplikasi kasir (APK Capacitor +
 * cordova-plugin-bluetooth-serial). Satu sumber status koneksi untuk halaman
 * kasir dan riwayat transaksi.
 *
 * Perbaikan dibanding versi lama:
 * - Status "terhubung" selalu dicek ke plugin (isConnected), bukan ditebak dari
 *   localStorage. localStorage hanya mengingat printer TERAKHIR yang dipilih.
 * - Menunggu plugin siap (deviceready) sebelum dipakai.
 * - Daftar perangkat = perangkat yang sudah di-pair (cepat). Pencarian perangkat
 *   baru (±12 detik, berat) hanya bila diminta, dan tidak pernah dijalankan
 *   otomatis setelah konek (dulu ini mengganggu koneksi yang baru terbentuk).
 * - Konek: mode secure dulu, lalu fallback insecure (dibutuhkan banyak printer
 *   thermal murah), dengan batas waktu dan penahan klik ganda.
 * - Koneksi putus terdeteksi lewat callback plugin + cek berkala ringan, jadi
 *   label status tidak bohong.
 * - Sebelum mencetak, koneksi dicek dan disambung ulang otomatis ke printer
 *   tersimpan.
 *
 * Izin Android 12+ ("Perangkat sekitar") diminta oleh MainActivity.java,
 * karena plugin versi ini tidak memintanya sendiri.
 */

export interface PrinterDevice {
  name: string;
  address: string;
}

export type PrinterStatus = 'unavailable' | 'disconnected' | 'connecting' | 'connected';

export interface PrinterState {
  status: PrinterStatus;
  /** Printer yang sedang/terakhir dipakai. */
  device: PrinterDevice | null;
  /** Pesan singkat untuk pengguna, mis. alasan koneksi gagal. */
  message?: string;
}

export class PrinterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrinterError';
  }
}

interface RawDevice {
  name?: string;
  address?: string;
  id?: string;
}

type Fail = (error?: unknown) => void;

interface BluetoothSerialPlugin {
  isEnabled(success: () => void, failure: Fail): void;
  enable(success: () => void, failure: Fail): void;
  list(success: (devices: RawDevice[]) => void, failure: Fail): void;
  discoverUnpaired(success: (devices: RawDevice[]) => void, failure: Fail): void;
  connect(address: string, success: () => void, failure: Fail): void;
  connectInsecure(address: string, success: () => void, failure: Fail): void;
  disconnect(success?: () => void, failure?: Fail): void;
  isConnected(success: () => void, failure: Fail): void;
  write(data: string, success: () => void, failure: Fail): void;
  showBluetoothSettings(success?: () => void, failure?: Fail): void;
}

declare global {
  interface Window {
    bluetoothSerial?: BluetoothSerialPlugin;
    cordova?: unknown;
    Capacitor?: { isNativePlatform?: () => boolean };
  }
}

// Kunci lama dipertahankan agar printer yang sudah dipilih tidak hilang.
const STORAGE_ADDRESS = 'bt_printer_address';
const STORAGE_NAME = 'bt_printer_name';

const CONNECT_TIMEOUT_MS = 15_000;
const PLUGIN_WAIT_MS = 5_000;
const HEALTH_CHECK_MS = 15_000;

const MESSAGES = {
  unavailable: 'Printer Bluetooth hanya bisa dipakai dari aplikasi kasir (APK) di tablet.',
  bluetoothOff: 'Bluetooth tablet mati. Aktifkan Bluetooth, lalu coba lagi.',
  permission:
    'Izin "Perangkat sekitar" belum diberikan. Buka Pengaturan tablet › Aplikasi › MADEBYPAYU › Izin, lalu izinkan.',
  noPrinter: 'Belum ada printer dipilih. Hubungkan printer dulu.',
  writeFailed: 'Gagal mengirim struk ke printer. Pastikan printer menyala dan kertas terpasang.',
  lost: 'Koneksi printer terputus.',
  connectFailed: (name: string) => `Gagal terhubung ke ${name}. Pastikan printer menyala dan dekat dengan tablet.`,
};

// ------------------------------------------------------------------
// State + pelanggan (UI berlangganan lewat onPrinterChange)
// ------------------------------------------------------------------
let state: PrinterState = { status: 'disconnected', device: readSavedDevice() };
const listeners = new Set<(state: PrinterState) => void>();

let connectAttempt: Promise<void> | null = null;
let linkCounter = 0;
/** id koneksi yang sedang aktif; callback gagal dari koneksi lain diabaikan. */
let activeLink = 0;

export function getPrinterState(): PrinterState {
  return state;
}

/** Daftarkan pendengar perubahan status. Langsung dipanggil sekali dengan status saat ini. */
export function onPrinterChange(listener: (state: PrinterState) => void): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

function setState(next: Partial<PrinterState>): void {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener(state));
}

// ------------------------------------------------------------------
// Penyimpanan printer terakhir
// ------------------------------------------------------------------
function readSavedDevice(): PrinterDevice | null {
  try {
    const address = localStorage.getItem(STORAGE_ADDRESS);
    const name = localStorage.getItem(STORAGE_NAME);
    return address ? { address, name: name || 'Printer thermal' } : null;
  } catch {
    return null;
  }
}

function saveDevice(device: PrinterDevice): void {
  try {
    localStorage.setItem(STORAGE_ADDRESS, device.address);
    localStorage.setItem(STORAGE_NAME, device.name);
  } catch {
    // Penyimpanan penuh/diblokir: koneksi tetap jalan, hanya tidak diingat.
  }
}

function forgetDevice(): void {
  try {
    localStorage.removeItem(STORAGE_ADDRESS);
    localStorage.removeItem(STORAGE_NAME);
  } catch {
    // abaikan
  }
}

// ------------------------------------------------------------------
// Plugin
// ------------------------------------------------------------------
let pluginPromise: Promise<BluetoothSerialPlugin | null> | null = null;

/** Tunggu plugin siap. null bila halaman dibuka di browser biasa (bukan APK). */
function getPlugin(): Promise<BluetoothSerialPlugin | null> {
  pluginPromise ??= new Promise((resolve) => {
    if (window.bluetoothSerial) return resolve(window.bluetoothSerial);

    const isNative = Boolean(window.cordova) || Boolean(window.Capacitor?.isNativePlatform?.());
    if (!isNative) return resolve(null);

    const timer = setTimeout(() => resolve(window.bluetoothSerial ?? null), PLUGIN_WAIT_MS);
    document.addEventListener(
      'deviceready',
      () => {
        clearTimeout(timer);
        resolve(window.bluetoothSerial ?? null);
      },
      { once: true },
    );
  });
  return pluginPromise;
}

async function requirePlugin(): Promise<BluetoothSerialPlugin> {
  const plugin = await getPlugin();
  if (!plugin) throw new PrinterError(MESSAGES.unavailable);
  return plugin;
}

function isLinkUp(plugin: BluetoothSerialPlugin): Promise<boolean> {
  return new Promise((resolve) => plugin.isConnected(() => resolve(true), () => resolve(false)));
}

async function ensureBluetoothOn(plugin: BluetoothSerialPlugin): Promise<void> {
  const enabled = await new Promise<boolean>((resolve) =>
    plugin.isEnabled(() => resolve(true), () => resolve(false)),
  );
  if (enabled) return;

  await new Promise<void>((resolve, reject) =>
    plugin.enable(resolve, () => reject(new PrinterError(MESSAGES.bluetoothOff))),
  );
}

function toDevices(raw: RawDevice[]): PrinterDevice[] {
  const seen = new Set<string>();
  return raw
    .map((device) => ({ name: device.name || 'Perangkat tanpa nama', address: device.address || device.id || '' }))
    .filter((device) => device.address && !seen.has(device.address) && seen.add(device.address));
}

// ------------------------------------------------------------------
// API publik
// ------------------------------------------------------------------

/**
 * Panggil sekali saat halaman dibuka: cek status nyata ke plugin, lalu
 * (opsional) sambung ulang diam-diam ke printer tersimpan.
 */
export async function initPrinter({ autoReconnect = false } = {}): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) {
    setState({ status: 'unavailable', message: MESSAGES.unavailable });
    return;
  }

  const saved = readSavedDevice();
  if (await isLinkUp(plugin)) {
    setState({ status: 'connected', device: saved, message: undefined });
  } else {
    setState({ status: 'disconnected', device: saved, message: undefined });
    if (autoReconnect && saved) connectPrinter(saved).catch(() => undefined);
  }

  startHealthCheck(plugin);
}

/** Perangkat yang sudah di-pair di pengaturan Bluetooth tablet (cepat). */
export async function listPairedDevices(): Promise<PrinterDevice[]> {
  const plugin = await requirePlugin();
  await ensureBluetoothOn(plugin);
  const raw = await new Promise<RawDevice[]>((resolve, reject) =>
    plugin.list(resolve, () => reject(new PrinterError(MESSAGES.permission))),
  );
  return toDevices(raw);
}

/** Cari perangkat baru di sekitar (lambat, ±12 detik). */
export async function discoverDevices(): Promise<PrinterDevice[]> {
  const plugin = await requirePlugin();
  await ensureBluetoothOn(plugin);
  const raw = await new Promise<RawDevice[]>((resolve, reject) =>
    plugin.discoverUnpaired(resolve, () => reject(new PrinterError(MESSAGES.permission))),
  );
  return toDevices(raw);
}

/** Hubungkan ke printer. Klik berulang selama proses berjalan memakai proses yang sama. */
export function connectPrinter(device: PrinterDevice): Promise<void> {
  connectAttempt ??= doConnect(device).finally(() => {
    connectAttempt = null;
  });
  return connectAttempt;
}

export async function disconnectPrinter({ forget = false } = {}): Promise<void> {
  const plugin = await getPlugin();
  activeLink = 0;
  if (plugin) await new Promise<void>((resolve) => plugin.disconnect(resolve, () => resolve()));
  if (forget) forgetDevice();
  setState({ status: 'disconnected', device: forget ? null : state.device, message: undefined });
}

/** Cetak teks. Bila koneksi putus, sambung ulang otomatis ke printer tersimpan. */
export async function printText(text: string): Promise<void> {
  const plugin = await requirePlugin();

  if (!(await isLinkUp(plugin))) {
    const device = state.device ?? readSavedDevice();
    if (!device) throw new PrinterError(MESSAGES.noPrinter);
    await connectPrinter(device);
  }

  try {
    await new Promise<void>((resolve, reject) => plugin.write(text, resolve, reject));
  } catch {
    if (!(await isLinkUp(plugin))) markLost();
    throw new PrinterError(MESSAGES.writeFailed);
  }
}

/** Buka pengaturan Bluetooth Android (untuk pairing printer baru). */
export async function openBluetoothSettings(): Promise<void> {
  const plugin = await requirePlugin();
  plugin.showBluetoothSettings();
}

/** Apakah ada printer yang pernah dipilih (dipakai untuk memutuskan perlu cetak atau tidak). */
export function hasConfiguredPrinter(): boolean {
  return state.status !== 'unavailable' && Boolean(state.device ?? readSavedDevice());
}

// ------------------------------------------------------------------
// Internal
// ------------------------------------------------------------------
async function doConnect(device: PrinterDevice): Promise<void> {
  const plugin = await requirePlugin();
  await ensureBluetoothOn(plugin);
  setState({ status: 'connecting', device, message: undefined });

  try {
    await openLink(plugin, device.address, 'secure').catch(() => openLink(plugin, device.address, 'insecure'));
  } catch {
    const message = MESSAGES.connectFailed(device.name);
    setState({ status: 'disconnected', message });
    throw new PrinterError(message);
  }

  saveDevice(device);
  setState({ status: 'connected', device, message: undefined });
}

function openLink(plugin: BluetoothSerialPlugin, address: string, mode: 'secure' | 'insecure'): Promise<void> {
  const link = ++linkCounter;
  const open = mode === 'secure' ? plugin.connect : plugin.connectInsecure;

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      plugin.disconnect(); // batalkan percobaan yang menggantung
      reject(new Error('timeout'));
    }, CONNECT_TIMEOUT_MS);

    open.call(
      plugin,
      address,
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        activeLink = link;
        resolve();
      },
      (error) => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          reject(error);
          return;
        }
        // Callback gagal SETELAH tersambung = koneksi putus (perilaku plugin).
        if (link === activeLink) markLost();
      },
    );
  });
}

function markLost(): void {
  activeLink = 0;
  setState({ status: 'disconnected', message: MESSAGES.lost });
}

let healthTimer: ReturnType<typeof setInterval> | undefined;

/**
 * Cek ringan berkala + saat aplikasi kembali dibuka. Diperlukan karena setelah
 * pindah halaman, callback "putus" milik halaman sebelumnya tidak sampai ke sini.
 */
function startHealthCheck(plugin: BluetoothSerialPlugin): void {
  if (healthTimer) return;

  const check = async () => {
    if (document.hidden || state.status === 'connecting') return;
    const up = await isLinkUp(plugin);
    if (up && state.status !== 'connected') setState({ status: 'connected', message: undefined });
    if (!up && state.status === 'connected') markLost();
  };

  healthTimer = setInterval(check, HEALTH_CHECK_MS);
  document.addEventListener('visibilitychange', check);
}
