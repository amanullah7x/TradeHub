import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Keys must match the server's category list (server/src/meta.js).
export const CATEGORIES: { key: string; label: string; icon: IconName; tint: string }[] = [
  { key: 'phones', label: 'Phones', icon: 'phone-portrait-outline', tint: '#DBEAFE' },
  { key: 'cars', label: 'Cars', icon: 'car-sport-outline', tint: '#FEE2E2' },
  { key: 'bikes', label: 'Bikes', icon: 'bicycle-outline', tint: '#FFEDD5' },
  { key: 'tvs', label: 'TVs', icon: 'tv-outline', tint: '#E0E7FF' },
  { key: 'audio', label: 'Earphones & Audio', icon: 'headset-outline', tint: '#FCE7F3' },
  { key: 'computers', label: 'Laptops', icon: 'laptop-outline', tint: '#CCFBF1' },
  { key: 'gaming', label: 'Gaming', icon: 'game-controller-outline', tint: '#EDE9FE' },
  { key: 'appliances', label: 'Appliances', icon: 'snow-outline', tint: '#CFFAFE' },
  { key: 'furniture', label: 'Furniture', icon: 'bed-outline', tint: '#FEF3C7' },
  { key: 'fashion', label: 'Fashion & Watches', icon: 'watch-outline', tint: '#F3E8FF' },
  { key: 'other', label: 'Other', icon: 'cube-outline', tint: '#E2E8F0' },
];

export const CONDITIONS = [
  { key: 'new', label: 'New' },
  { key: 'like_new', label: 'Like new' },
  { key: 'good', label: 'Good' },
  { key: 'fair', label: 'Fair' },
];

export const categoryOf = (key: string) => CATEGORIES.find((x) => x.key === key) ?? CATEGORIES[CATEGORIES.length - 1];

export const conditionLabel = (key: string) => CONDITIONS.find((x) => x.key === key)?.label ?? key;
