import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AdSlot } from '@/components/AdSlot';
import { ListingGrid } from '@/components/ListingCard';
import { Shell, useWide } from '@/components/Shell';
import { Button, Empty, Loading, Notice, styles as ui } from '@/components/ui';
import { api } from '@/lib/api';
import { CATEGORIES } from '@/lib/catalog';
import { c, radius } from '@/lib/theme';
import type { Listing } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';

const STEPS = [
  { icon: 'camera-outline', title: 'List your item', text: 'Add photos, its value and what you would like in return.' },
  { icon: 'swap-horizontal-outline', title: 'Offer a trade', text: 'Offer your item for someone else’s, and add cash to even it out.' },
  { icon: 'checkmark-circle-outline', title: 'Agree and swap', text: 'Chat, counter-offer, and meet up once you both accept.' },
] as const;

export default function Home() {
  const wide = useWide();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  // Wait for a pause in typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (category) params.set('category', category);
  const key = params.toString();
  const { data, error, loading } = useLoad(() => api<{ listings: Listing[] }>(`/listings?${key}`), key);
  const filtering = !!query || !!category;

  return (
    <Shell>
      {!filtering && (
        <View style={[styles.hero, wide && { padding: 32 }]}>
          <Text style={[styles.heroTitle, wide && { fontSize: 34, lineHeight: 40 }]}>
            Swap what you have for what you want
          </Text>
          <Text style={styles.heroText}>
            Trade phones, cars, TVs and more with people near you. If the items are not worth the same, one side adds
            cash to make it fair.
          </Text>
          <Button
            title="Post an item to trade"
            icon="add"
            variant="accent"
            onPress={() => router.navigate('/listing/new')}
            style={{ alignSelf: 'flex-start', marginTop: 6 }}
          />
        </View>
      )}

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={c.muted} />
        <TextInput
          accessibilityLabel="Search items"
          value={search}
          onChangeText={setSearch}
          placeholder="Search for an iPhone, a Civic, a PS5..."
          placeholderTextColor={c.muted}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {search ? (
          <Pressable accessibilityLabel="Clear search" onPress={() => setSearch('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={c.muted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, flexGrow: 0 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
          {[{ key: '', label: 'All', icon: 'apps-outline' as const }, ...CATEGORIES].map((cat) => {
            const active = cat.key === category;
            return (
              <Pressable
                key={cat.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setCategory(cat.key)}
                style={[styles.chip, active && styles.chipActive]}>
                <Ionicons name={cat.icon} size={16} color={active ? '#FFFFFF' : c.sub} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#FFFFFF' : c.text }}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <AdSlot slot="home" />

      <Text style={ui.h2}>{filtering ? 'Results' : 'Up for trade'}</Text>
      <Notice text={error} />
      {loading && !data ? (
        <Loading />
      ) : data && data.listings.length === 0 ? (
        <Empty
          icon="search-outline"
          title={filtering ? 'Nothing matches yet' : 'No items yet'}
          text={filtering ? 'Try a different search or category.' : 'Be the first to post something to trade.'}
        />
      ) : (
        data && <ListingGrid listings={data.listings} />
      )}

      {!filtering && (
        <View style={{ gap: 12, marginTop: 8 }}>
          <Text style={ui.h2}>How TradeHub works</Text>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 12 }}>
            {STEPS.map((step, i) => (
              <View key={step.title} style={styles.step}>
                <Ionicons name={step.icon} size={26} color={c.primary} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: c.text }}>
                    {i + 1}. {step.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: c.sub, lineHeight: 19 }}>{step.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: c.primaryDark, borderRadius: radius.lg, padding: 20, gap: 8 },
  heroTitle: { color: '#FFFFFF', fontSize: 25, lineHeight: 31, fontWeight: '800', letterSpacing: -0.5 },
  heroText: { color: '#CCFBF1', fontSize: 15, lineHeight: 22, maxWidth: 560 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    minHeight: 48,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
  },
  searchInput: { flex: 1, fontSize: 15, color: c.text, paddingVertical: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  step: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: c.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
});
