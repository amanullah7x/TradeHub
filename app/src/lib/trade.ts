import type { Tone } from '@/components/ui';
import { money } from './format';
import type { Offer } from './types';

export const firstName = (name: string) => name.split(' ')[0];

// The other person in the trade, from the viewer's side.
export const otherParty = (offer: Offer) => (offer.role === 'offerer' ? offer.to : offer.from);

// Cash the viewer pays (positive) or receives (negative) in this offer.
export const viewerCash = (offer: Offer) => (offer.role === 'offerer' ? offer.cash : -offer.cash);

export function cashSummary(offer: Offer) {
  const cash = viewerCash(offer);
  if (cash > 0) return `You add ${money(cash)}`;
  if (cash < 0) return `${firstName(otherParty(offer).name)} adds ${money(-cash)}`;
  return 'Straight swap, no cash';
}

export function statusOf(offer: Offer): { label: string; tone: Tone } {
  switch (offer.status) {
    case 'accepted':
      return { label: 'Accepted', tone: 'success' };
    case 'declined':
      return { label: 'Declined', tone: 'danger' };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'neutral' };
    default:
      return offer.yourTurn ? { label: 'Your turn', tone: 'accent' } : { label: 'Waiting for reply', tone: 'neutral' };
  }
}
