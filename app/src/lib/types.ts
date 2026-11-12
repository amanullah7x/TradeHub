export type User = {
  id: number;
  name: string;
  email: string;
  city: string;
  phone: string;
  premium: boolean;
  premiumUntil: string | null;
  createdAt: string;
  // Open offers that are waiting on this user to respond.
  actionNeeded?: number;
};

export type Listing = {
  id: number;
  title: string;
  description: string;
  category: string;
  condition: string;
  value: number;
  city: string;
  wants: string;
  images: string[];
  status: 'active' | 'traded' | 'removed';
  featured: boolean;
  featuredUntil: string | null;
  views: number;
  createdAt: string;
  owner: { id: number; name: string; city: string; premium: boolean; memberSince: string };
};

export type Message = { id: number; senderId: number | null; body: string; createdAt: string };

export type Offer = {
  id: number;
  listing: Listing;
  items: Listing[];
  // What the offerer pays the owner on top of their items. Negative: the offerer asks for cash.
  cash: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  from: { id: number; name: string };
  to: { id: number; name: string };
  role: 'offerer' | 'owner';
  yourTurn: boolean;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  contact?: { name: string; email: string; phone: string; city: string };
};

export type Product = { id: string; kind: 'boost' | 'premium'; days: number; amount: number; name: string };

export type Ad = { id: number; title: string; body: string; cta: string; url: string };
