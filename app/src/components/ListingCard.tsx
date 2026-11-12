import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { imageUrl } from '@/lib/api';
import { categoryOf, conditionLabel } from '@/lib/catalog';
import { money } from '@/lib/format';
import { c, radius } from '@/lib/theme';
import type { Listing } from '@/lib/types';
import { Pill } from './ui';

// The item's first photo, or a tinted category icon when it has none.
export function ListingThumb({ listing, style }: { listing: Listing; style?: StyleProp<ViewStyle> }) {
  const category = categoryOf(listing.category);
  return (
    <View style={[{ aspectRatio: 4 / 3, backgroundColor: category.tint, overflow: 'hidden' }, style]}>
      {listing.images[0] ? (
        <Image
          source={{ uri: imageUrl(listing.images[0]) }}
          accessibilityLabel={listing.title}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name={category.icon} size={44} color={c.sub} />
        </View>
      )}
    </View>
  );
}

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(`/listing/${listing.id}`)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View>
        <ListingThumb listing={listing} />
        {listing.featured && (
          <View style={styles.featured}>
            <Pill label="Featured" tone="gold" icon="star" />
          </View>
        )}
      </View>
      <View style={{ padding: 12, gap: 4 }}>
        <Text numberOfLines={2} style={styles.title}>
          {listing.title}
        </Text>
        <Text style={styles.value}>{money(listing.value)}</Text>
        <Text numberOfLines={1} style={styles.meta}>
          {conditionLabel(listing.condition)} · {listing.city}
        </Text>
        {listing.wants ? (
          <View style={styles.wants}>
            <Ionicons name="swap-horizontal" size={13} color={c.primary} style={{ marginTop: 2 }} />
            <Text numberOfLines={2} style={{ flex: 1, fontSize: 12, color: c.primaryDark, lineHeight: 17 }}>
              {listing.wants}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// Compact one-line version used inside offers and pickers.
export function ListingRow({ listing, right }: { listing: Listing; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <ListingThumb listing={listing} style={{ width: 64, borderRadius: radius.sm }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '700', color: c.text }}>
          {listing.title}
        </Text>
        <Text style={{ fontSize: 13, color: c.sub }}>
          {money(listing.value)} · {conditionLabel(listing.condition)}
        </Text>
      </View>
      {right}
    </View>
  );
}

export function ListingGrid({ listings }: { listings: Listing[] }) {
  const { width } = useWindowDimensions();
  const columns = width < 560 ? 2 : width < 900 ? 3 : 4;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -6 }}>
      {listings.map((listing) => (
        <View key={listing.id} style={{ width: `${100 / columns}%`, padding: 6 }}>
          <ListingCard listing={listing} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: c.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  featured: { position: 'absolute', top: 8, left: 8 },
  title: { fontSize: 14, fontWeight: '700', color: c.text, lineHeight: 19 },
  value: { fontSize: 16, fontWeight: '800', color: c.text },
  meta: { fontSize: 12, color: c.sub },
  wants: { flexDirection: 'row', gap: 5, marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
