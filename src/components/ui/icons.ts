// Daftar ikon Lucide yang dipakai aplikasi (lucide-static, lisensi ISC).
// Import per file agar hanya ikon yang dipakai ikut ter-bundle.
// Untuk ikon baru: cari namanya di https://lucide.dev/icons lalu tambahkan di sini.
import arrowLeft from 'lucide-static/icons/arrow-left.svg?raw';
import arrowRight from 'lucide-static/icons/arrow-right.svg?raw';
import banknote from 'lucide-static/icons/banknote.svg?raw';
import bluetooth from 'lucide-static/icons/bluetooth.svg?raw';
import bluetoothSearching from 'lucide-static/icons/bluetooth-searching.svg?raw';
import calendar from 'lucide-static/icons/calendar.svg?raw';
import chartLine from 'lucide-static/icons/chart-line.svg?raw';
import chartPie from 'lucide-static/icons/chart-pie.svg?raw';
import chevronDown from 'lucide-static/icons/chevron-down.svg?raw';
import chevronLeft from 'lucide-static/icons/chevron-left.svg?raw';
import chevronRight from 'lucide-static/icons/chevron-right.svg?raw';
import circleAlert from 'lucide-static/icons/circle-alert.svg?raw';
import circleCheck from 'lucide-static/icons/circle-check.svg?raw';
import creditCard from 'lucide-static/icons/credit-card.svg?raw';
import crown from 'lucide-static/icons/crown.svg?raw';
import download from 'lucide-static/icons/download.svg?raw';
import externalLink from 'lucide-static/icons/external-link.svg?raw';
import history from 'lucide-static/icons/history.svg?raw';
import image from 'lucide-static/icons/image.svg?raw';
import imageUp from 'lucide-static/icons/image-up.svg?raw';
import inbox from 'lucide-static/icons/inbox.svg?raw';
import landmark from 'lucide-static/icons/landmark.svg?raw';
import lock from 'lucide-static/icons/lock.svg?raw';
import logOut from 'lucide-static/icons/log-out.svg?raw';
import menu from 'lucide-static/icons/menu.svg?raw';
import minus from 'lucide-static/icons/minus.svg?raw';
import monitor from 'lucide-static/icons/monitor.svg?raw';
import packageIcon from 'lucide-static/icons/package.svg?raw';
import packagePlus from 'lucide-static/icons/package-plus.svg?raw';
import pencil from 'lucide-static/icons/pencil.svg?raw';
import plus from 'lucide-static/icons/plus.svg?raw';
import printer from 'lucide-static/icons/printer.svg?raw';
import qrCode from 'lucide-static/icons/qr-code.svg?raw';
import receiptText from 'lucide-static/icons/receipt-text.svg?raw';
import refreshCw from 'lucide-static/icons/refresh-cw.svg?raw';
import rotateCcw from 'lucide-static/icons/rotate-ccw.svg?raw';
import search from 'lucide-static/icons/search.svg?raw';
import settings from 'lucide-static/icons/settings.svg?raw';
import shoppingBag from 'lucide-static/icons/shopping-bag.svg?raw';
import soup from 'lucide-static/icons/soup.svg?raw';
import sparkles from 'lucide-static/icons/sparkles.svg?raw';
import store from 'lucide-static/icons/store.svg?raw';
import trash2 from 'lucide-static/icons/trash-2.svg?raw';
import trendingUp from 'lucide-static/icons/trending-up.svg?raw';
import utensilsCrossed from 'lucide-static/icons/utensils-crossed.svg?raw';
import wallet from 'lucide-static/icons/wallet.svg?raw';
import warehouse from 'lucide-static/icons/warehouse.svg?raw';
import x from 'lucide-static/icons/x.svg?raw';

export const icons = {
  'arrow-left': arrowLeft,
  'arrow-right': arrowRight,
  banknote,
  bluetooth,
  'bluetooth-searching': bluetoothSearching,
  calendar,
  'chart-line': chartLine,
  'chart-pie': chartPie,
  'chevron-down': chevronDown,
  'chevron-left': chevronLeft,
  'chevron-right': chevronRight,
  'circle-alert': circleAlert,
  'circle-check': circleCheck,
  'credit-card': creditCard,
  crown,
  download,
  'external-link': externalLink,
  history,
  image,
  'image-up': imageUp,
  inbox,
  landmark,
  lock,
  'log-out': logOut,
  menu,
  minus,
  monitor,
  package: packageIcon,
  'package-plus': packagePlus,
  pencil,
  plus,
  printer,
  'qr-code': qrCode,
  'receipt-text': receiptText,
  'refresh-cw': refreshCw,
  'rotate-ccw': rotateCcw,
  search,
  settings,
  'shopping-bag': shoppingBag,
  soup,
  sparkles,
  store,
  'trash-2': trash2,
  'trending-up': trendingUp,
  'utensils-crossed': utensilsCrossed,
  wallet,
  warehouse,
  x,
};

export type IconName = keyof typeof icons;
