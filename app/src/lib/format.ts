// Shown in front of every amount. Change it here and in the server's CURRENCY setting.
export const CURRENCY = process.env.EXPO_PUBLIC_CURRENCY_SYMBOL || 'Rs';

export function money(amount: number) {
  const digits = Math.abs(Math.round(amount)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${amount < 0 ? '-' : ''}${CURRENCY} ${digits}`;
}

export function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? 'yesterday' : `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

export const digitsOnly = (s: string) => s.replace(/[^0-9]/g, '');
