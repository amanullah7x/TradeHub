import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AdSlot } from '@/components/AdSlot';
import { ListingThumb } from '@/components/ListingCard';
import { Shell, useWide } from '@/components/Shell';
import { Button, Card, Empty, Loading, Notice, Pill, confirm, styles as ui } from '@/components/ui';
import { api, errorMessage, imageUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { categoryOf, conditionLabel } from '@/lib/catalog';
import { money, timeAgo } from '@/lib/format';
import { c, radius } from '@/lib/theme';
import type { Listing } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wide = useWide();
  const { user } = useAuth();
  const { data, error, loading } = useLoad(() => api<{ listing: Listing }>(`/listings/${id}`), id);
  const [photo, setPhoto] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const listing = data?.listing;

  if (!listing) {
    return (
      <Shell title="Item">
        {loading ? <Loading /> : <Empty icon="alert-circle-outline" title="Item not available" text={error ?? undefined} />}
      </Shell>
    );
  }

  const mine = user?.id === listing.owner.id;
  const active = listing.status === 'active';

  const offer = () => {
    const target = { pathname: '/offer/new', params: { listing: String(listing.id) } } as const;
    if (user) router.push(target);
    else router.push({ pathname: '/login', params: { next: `/offer/new?listing=${listing.id}` } });
  };

  const remove = async () => {
    const ok = await confirm('Remove this item?', 'It will be taken off TradeHub and any open offers on it will be closed.', 'Remove');
    if (!ok) return;
    try {
      await api(`/listings/${listing.id}`, { method: 'DELETE' });
      router.replace('/profile');
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  return (
    <Shell title="Item">
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20, alignItems: wide ? 'flex-start' : 'stretch' }}>
        <View style={{ flex: wide ? 1.2 : undefined, gap: 10 }}>
          {listing.images.length > 0 ? (
            <View style={styles.photo}>
              <Image
                source={{ uri: imageUrl(listing.images[photo] ?? listing.images[0]) }}
                accessibilityLabel={listing.title}
                resizeMode="contain"
                style={StyleSheet.absoluteFill}
              />
            </View>
          ) : (
            <ListingThumb listing={listing} style={{ borderRadius: radius.lg }} />
          )}
          {listing.images.length > 1 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {listing.images.map((image, i) => (
                <Pressable
                  key={image}
                  accessibilityLabel={`Photo ${i + 1}`}
                  onPress={() => setPhoto(i)}
                  style={[styles.thumb, i === photo && { borderColor: c.primary }]}>
                  <Image source={{ uri: imageUrl(image) }} resizeMode="cover" style={StyleSheet.absoluteFill} />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={{ flex: wide ? 1 : undefined, gap: 14 }}>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {listing.featured && <Pill label="Featured" tone="gold" icon="star" />}
              {listing.status === 'traded' && <Pill label="Traded" tone="success" icon="checkmark" />}
              <Pill label={categoryOf(listing.category).label} />
              <Pill label={conditionLabel(listing.condition)} tone="primary" />
            </View>
            <Text style={ui.h1}>{listing.title}</Text>
            <Text style={{ fontSize: 13, color: c.sub }}>Estimated value</Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: c.text, marginTop: -6 }}>{money(listing.value)}</Text>
            <Text style={{ fontSize: 13, color: c.sub }}>
              <Ionicons name="location-outline" size={13} /> {listing.city} · Posted {timeAgo(listing.createdAt)}
              {mine ? ` · ${listing.views} views` : ''}
            </Text>
          </View>

          <View style={styles.wants}>
            <Ionicons name="swap-horizontal" size={20} color={c.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: c.primaryDark }}>Would like in return</Text>
              <Text style={{ fontSize: 15, color: c.text, lineHeight: 21 }}>
                {listing.wants || 'Open to offers. Show them what you have.'}
              </Text>
            </View>
          </View>

          <Notice text={actionError} />
          {active && !mine && <Button title="Offer a trade" icon="swap-horizontal" onPress={offer} />}
          {active && mine && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                title={listing.featured ? 'Extend featuring' : 'Feature this item'}
                icon="star"
                variant="accent"
                style={{ flex: 1 }}
                onPress={() => router.push({ pathname: '/premium', params: { listing: String(listing.id) } })}
              />
              <Button title="Remove" icon="trash-outline" variant="danger" onPress={remove} />
            </View>
          )}

          {listing.description ? (
            <Card style={{ gap: 6 }}>
              <Text style={ui.h2}>Details</Text>
              <Text style={ui.body}>{listing.description}</Text>
            </Card>
          ) : null}

          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: c.primaryDark }}>
                {listing.owner.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: c.text }}>{listing.owner.name}</Text>
                {listing.owner.premium && <Pill label="Premium" tone="gold" icon="star" />}
              </View>
              <Text style={{ fontSize: 13, color: c.sub }}>
                {listing.owner.city ? `${listing.owner.city} · ` : ''}Member since{' '}
                {new Date(listing.owner.memberSince).getFullYear()}
              </Text>
            </View>
          </Card>

          {!mine && (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push({ pathname: '/report', params: { listing: String(listing.id) } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 }}>
              <Ionicons name="flag-outline" size={15} color={c.sub} />
              <Text style={{ fontSize: 13, color: c.sub, textDecorationLine: 'underline' }}>Report this item</Text>
            </Pressable>
          )}

          <AdSlot slot="listing" />
        </View>
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  photo: { aspectRatio: 4 / 3, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#0F172A' },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 2, borderColor: c.border },
  wants: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: c.primarySoft,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
