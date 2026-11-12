export const CATEGORIES = [
  'phones',
  'cars',
  'bikes',
  'tvs',
  'audio',
  'computers',
  'gaming',
  'appliances',
  'furniture',
  'fashion',
  'other',
];

export const CONDITIONS = ['new', 'like_new', 'good', 'fair'];

// Shown in front of amounts in system messages. Keep in sync with the app's EXPO_PUBLIC_CURRENCY_SYMBOL.
export const CURRENCY = process.env.CURRENCY || 'Rs';

// Free accounts can keep this many items listed at once; Premium is unlimited.
export const FREE_LISTING_LIMIT = 10;

// Things people can pay for. Amounts are in whole units of CURRENCY.
export const PRODUCTS = {
  boost_7: { kind: 'boost', days: 7, amount: 500, name: 'Featured for 7 days' },
  boost_30: { kind: 'boost', days: 30, amount: 1500, name: 'Featured for 30 days' },
  premium_30: { kind: 'premium', days: 30, amount: 999, name: 'Premium for 30 days' },
};
