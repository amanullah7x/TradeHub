import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { ListingRow } from '@/components/ListingCard';
import { Shell, useWide } from '@/components/Shell';
import { Button, Card, Loading, Notice, Pill, styles as ui } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { money } from '@/lib/format';
import { c } from '@/lib/theme';
import type { Listing, Product } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';

type Catalog = { testMode: boolean; freeListingLimit: number; products: Product[] };

function Perk({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <Ionicons name="checkmark-circle" size={18} color={c.success} style={{ marginTop: 2 }} />
      <Text style={[ui.body, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

export default function Premium() {
  const { listing: listingId } = useLocalSearchParams<{ listing?: string }>();
  const wide = useWide();
  const { user, refresh } = useAuth();
  const { data, error, loading, reload } = useLoad(async () => {
    const [catalog, listing] = await Promise.all([
      api<Catalog>('/products'),
      listingId ? api<{ listing: Listing }>(`/listings/${listingId}`) : Promise.resolve(null),
    ]);
    return { catalog, listing: listing?.listing ?? null };
  }, String(listingId));
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  if (!data) {
    return <Shell title="Premium">{loading ? <Loading /> : <Notice text={error} />}</Shell>;
  }

  const { catalog, listing } = data;
  const premium = catalog.products.find((p) => p.kind === 'premium');
  const boosts = catalog.products.filter((p) => p.kind === 'boost');

  const buy = async (product: Product) => {
    if (!user) return router.push({ pathname: '/login', params: { next: '/premium' } });
    setBusy(product.id);
    setMessage(null);
    try {
      await api('/checkout', { body: { product: product.id, listingId: listing?.id } });
      await Promise.all([refresh(), reload()]);
      setMessage({
        ok: true,
        text: product.kind === 'premium' ? 'You are now a Premium member.' : `"${listing?.title}" is now featured.`,
      });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Shell title="Premium" narrow>
      <Text style={ui.h1}>Get more from TradeHub</Text>
      {catalog.testMode && (
        <Notice
          tone="gold"
          text="Payments are in test mode: purchases are applied straight away and no money is charged."
        />
      )}
      {message && <Notice text={message.text} tone={message.ok ? 'success' : 'danger'} />}

      {premium && (
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[ui.h2, { flex: 1 }]}>TradeHub Premium</Text>
            {user?.premium && <Pill label="Active" tone="success" icon="checkmark" />}
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: c.text }}>
            {money(premium.amount)} <Text style={{ fontSize: 14, fontWeight: '600', color: c.sub }}>for {premium.days} days</Text>
          </Text>
          <Perk text="No ads anywhere on TradeHub" />
          <Perk text={`Unlimited listings (free accounts can list ${catalog.freeListingLimit} items at a time)`} />
          <Perk text="A Premium badge that helps other traders trust you" />
          {user?.premium && user.premiumUntil && (
            <Text style={ui.hint}>Your membership runs until {new Date(user.premiumUntil).toLocaleDateString()}.</Text>
          )}
          <Button
            title={user?.premium ? `Add ${premium.days} more days` : 'Go Premium'}
            icon="star"
            variant="accent"
            onPress={() => buy(premium)}
            loading={busy === premium.id}
          />
        </Card>
      )}

      <Card style={{ gap: 12 }}>
        <Text style={ui.h2}>Feature an item</Text>
        <Text style={ui.body}>
          Featured items appear at the top of the list and search results with a Featured badge, so they get seen first.
        </Text>
        {listing ? (
          <>
            <ListingRow listing={listing} right={listing.featured ? <Pill label="Featured" tone="gold" icon="star" /> : undefined} />
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: 10 }}>
              {boosts.map((boost) => (
                <Button
                  key={boost.id}
                  title={`${boost.days} days for ${money(boost.amount)}`}
                  variant="outline"
                  icon="star-outline"
                  onPress={() => buy(boost)}
                  loading={busy === boost.id}
                  disabled={listing.status !== 'active' || listing.owner.id !== user?.id}
                  style={{ flex: wide ? 1 : undefined }}
                />
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={ui.hint}>
              {boosts.map((b) => `${b.days} days for ${money(b.amount)}`).join(' · ')}
            </Text>
            <Button title="Choose one of my items" variant="outline" onPress={() => router.navigate('/profile')} />
          </>
        )}
      </Card>

      <Card style={{ gap: 8 }}>
        <Text style={ui.h2}>Advertise with us</Text>
        <Text style={ui.body}>
          Run a shop or a service? Sponsored placements put your business in front of people who are ready to trade.
          Contact us from the Help and legal section of your account.
        </Text>
      </Card>
    </Shell>
  );
}
