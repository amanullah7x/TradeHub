import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createElement, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { c, radius } from '@/lib/theme';
import type { Ad } from '@/lib/types';

// Google AdSense (web only). Set both to show AdSense units in place of the
// directly sold sponsor cards, e.g. EXPO_PUBLIC_ADSENSE_CLIENT=ca-pub-1234567890.
const ADSENSE_CLIENT = process.env.EXPO_PUBLIC_ADSENSE_CLIENT;
const ADSENSE_SLOT = process.env.EXPO_PUBLIC_ADSENSE_SLOT;
const useAdSense = Platform.OS === 'web' && !!ADSENSE_CLIENT && !!ADSENSE_SLOT;

function AdSenseUnit() {
  useEffect(() => {
    if (!document.getElementById('adsense-script')) {
      const script = document.createElement('script');
      script.id = 'adsense-script';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      document.head.appendChild(script);
    }
    const w = window as unknown as { adsbygoogle?: unknown[] };
    (w.adsbygoogle = w.adsbygoogle || []).push({});
  }, []);
  return createElement('ins', {
    className: 'adsbygoogle',
    style: { display: 'block', minHeight: 90 },
    'data-ad-client': ADSENSE_CLIENT,
    'data-ad-slot': ADSENSE_SLOT,
    'data-ad-format': 'auto',
    'data-full-width-responsive': 'true',
  });
}

// An advertising placement. Premium members never see ads.
export function AdSlot({ slot }: { slot: string }) {
  const { user, loading } = useAuth();
  const [ad, setAd] = useState<Ad | null>(null);
  const hidden = loading || !!user?.premium;

  useEffect(() => {
    if (hidden || useAdSense) return;
    let current = true;
    api<{ ad: Ad | null }>(`/ads?slot=${encodeURIComponent(slot)}`)
      .then((res) => current && setAd(res.ad))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [slot, hidden]);

  if (hidden) return null;
  if (useAdSense) return <AdSenseUnit />;
  if (!ad) return null;

  const open = () => {
    api(`/ads/${ad.id}/click`, { method: 'POST' }).catch(() => {});
    if (ad.url.startsWith('/')) router.push(ad.url as never);
    else Linking.openURL(ad.url);
  };

  return (
    <Pressable accessibilityRole="link" onPress={open} style={({ pressed }) => [styles.ad, pressed && { opacity: 0.85 }]}>
      <View style={styles.icon}>
        <Ionicons name="megaphone-outline" size={22} color={c.gold} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.sponsored}>Sponsored</Text>
        <Text style={{ fontSize: 15, fontWeight: '800', color: c.text }}>{ad.title}</Text>
        {ad.body ? <Text style={{ fontSize: 13, color: c.sub, lineHeight: 18 }}>{ad.body}</Text> : null}
      </View>
      <View style={styles.cta}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>{ad.cta}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radius.lg,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsored: { fontSize: 11, fontWeight: '700', color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5 },
  cta: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
});
