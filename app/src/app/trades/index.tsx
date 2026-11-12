import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ListingThumb } from '@/components/ListingCard';
import { Shell } from '@/components/Shell';
import { SignInPrompt } from '@/components/SignInPrompt';
import { Button, Empty, Loading, Notice, Pill, Segmented, styles as ui } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import { c, radius } from '@/lib/theme';
import { cashSummary, firstName, statusOf } from '@/lib/trade';
import type { Offer } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';

function OfferCard({ offer }: { offer: Offer }) {
  const status = statusOf(offer);
  const offered = offer.items.map((item) => item.title).join(', ');
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(`/trades/${offer.id}`)}
      style={({ pressed }) => [ui.card, { flexDirection: 'row', gap: 12 }, pressed && { opacity: 0.85 }]}>
      <ListingThumb listing={offer.listing} style={{ width: 76, borderRadius: radius.sm, alignSelf: 'flex-start' }} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Pill label={status.label} tone={status.tone} />
          <Text style={{ fontSize: 12, color: c.muted }}>{timeAgo(offer.updatedAt)}</Text>
        </View>
        <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: '800', color: c.text }}>
          {offer.listing.title}
        </Text>
        <Text numberOfLines={2} style={{ fontSize: 13, color: c.sub, lineHeight: 19 }}>
          {offer.role === 'offerer' ? 'You offered' : `${firstName(offer.from.name)} offers`} {offered}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.primaryDark }}>{cashSummary(offer)}</Text>
      </View>
    </Pressable>
  );
}

export default function Trades() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'owner' | 'offerer'>('owner');
  const { data, error, loading } = useLoad(
    () => (user ? api<{ offers: Offer[] }>('/offers') : Promise.resolve({ offers: [] })),
    String(user?.id),
  );

  if (authLoading) return <Shell><Loading /></Shell>;
  if (!user) {
    return (
      <Shell>
        <SignInPrompt text="Sign in to see the trade offers you have sent and received." />
      </Shell>
    );
  }

  const offers = data?.offers ?? [];
  const shown = offers.filter((offer) => offer.role === tab);
  const waiting = (role: Offer['role']) => offers.filter((o) => o.role === role && o.yourTurn).length;
  const label = (text: string, role: Offer['role']) => (waiting(role) ? `${text} (${waiting(role)})` : text);

  return (
    <Shell narrow>
      <Text style={ui.h1}>My trades</Text>
      <Segmented
        options={[
          { key: 'owner', label: label('Offers on my items', 'owner') },
          { key: 'offerer', label: label('Offers I made', 'offerer') },
        ]}
        value={tab}
        onChange={setTab}
      />
      <Notice text={error} />
      {loading && !data ? (
        <Loading />
      ) : shown.length === 0 ? (
        <Empty
          icon="swap-horizontal-outline"
          title={tab === 'owner' ? 'No offers on your items yet' : 'You have not made any offers yet'}
          text={
            tab === 'owner'
              ? 'When someone wants to trade for one of your items, their offer shows up here.'
              : 'Find something you like and offer one of your items for it.'
          }>
          <Button
            title={tab === 'owner' ? 'Post an item' : 'Browse items'}
            onPress={() => router.navigate(tab === 'owner' ? '/listing/new' : '/')}
            style={{ marginTop: 8 }}
          />
        </Empty>
      ) : (
        shown.map((offer) => <OfferCard key={offer.id} offer={offer} />)
      )}
    </Shell>
  );
}
