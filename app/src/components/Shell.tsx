import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { LEGAL_LINKS } from '@/lib/legal';
import { MAX_WIDTH, c } from '@/lib/theme';
import { Logo } from './Logo';
import { Button } from './ui';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { href: string; label: string; icon: IconName; activeIcon: IconName }[] = [
  { href: '/', label: 'Browse', icon: 'home-outline', activeIcon: 'home' },
  { href: '/trades', label: 'My trades', icon: 'swap-horizontal-outline', activeIcon: 'swap-horizontal' },
  { href: '/listing/new', label: 'Post', icon: 'add-circle-outline', activeIcon: 'add-circle' },
  { href: '/premium', label: 'Premium', icon: 'star-outline', activeIcon: 'star' },
  { href: '/profile', label: 'Account', icon: 'person-outline', activeIcon: 'person' },
];

const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

export const useWide = () => useWindowDimensions().width >= 820;

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View style={styles.badge}>
      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

type Props = {
  children: ReactNode;
  // Shown with a back arrow in place of the logo on phones.
  title?: string;
  // Set to false for screens that manage their own scrolling (the chat).
  scroll?: boolean;
  // Narrower column for forms and reading.
  narrow?: boolean;
};

export function Shell({ children, title, scroll = true, narrow }: Props) {
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { user } = useAuth();
  const pending = user?.actionNeeded ?? 0;
  const column = { width: '100%', maxWidth: narrow ? 720 : MAX_WIDTH, alignSelf: 'center' } as const;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={[styles.headerRow, { maxWidth: MAX_WIDTH }]}>
          {title && !wide ? (
            <>
              <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} hitSlop={10}>
                <Ionicons name="arrow-back" size={24} color={c.text} />
              </Pressable>
              <Text numberOfLines={1} style={styles.headerTitle}>
                {title}
              </Text>
            </>
          ) : (
            <Pressable accessibilityRole="link" accessibilityLabel="TradeHub home" onPress={() => router.navigate('/')}>
              <Logo size={wide ? 34 : 30} />
            </Pressable>
          )}
          {wide && (
            <View style={styles.nav}>
              {TABS.filter((t) => t.href !== '/listing/new' && t.href !== '/profile').map((t) => (
                <Pressable key={t.href} accessibilityRole="link" onPress={() => router.navigate(t.href as never)} style={styles.navLink}>
                  <Text style={[styles.navText, isActive(pathname, t.href) && { color: c.primary }]}>{t.label}</Text>
                  {t.href === '/trades' && <Badge count={pending} />}
                </Pressable>
              ))}
              <Pressable accessibilityRole="link" onPress={() => router.navigate('/profile')} style={styles.navLink}>
                <Ionicons name="person-circle-outline" size={22} color={isActive(pathname, '/profile') ? c.primary : c.sub} />
                <Text style={[styles.navText, isActive(pathname, '/profile') && { color: c.primary }]}>
                  {user ? user.name.split(' ')[0] : 'Sign in'}
                </Text>
              </Pressable>
              <Button title="Post an item" icon="add" variant="accent" small onPress={() => router.navigate('/listing/new')} />
            </View>
          )}
        </View>
      </View>

      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
          <View style={[column, styles.content]}>{children}</View>
          {wide && (
            <View style={styles.footer}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20 }}>
                {LEGAL_LINKS.map((link) => (
                  <Pressable key={link.href} accessibilityRole="link" onPress={() => router.push(link.href as never)}>
                    <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600' }}>{link.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={{ color: c.sub, fontSize: 13 }}>
                © {new Date().getFullYear()} TradeHub. Swap what you have for what you want.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={[column, { flex: 1 }]}>{children}</View>
      )}

      {!wide && (
        <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
          {TABS.map((t) => {
            const active = isActive(pathname, t.href);
            const post = t.href === '/listing/new';
            return (
              <Pressable
                key={t.href}
                accessibilityRole="link"
                accessibilityLabel={t.label}
                onPress={() => router.navigate(t.href as never)}
                style={styles.tab}>
                <View style={{ height: 30, justifyContent: 'center' }}>
                  <Ionicons
                    name={active || post ? t.activeIcon : t.icon}
                    size={post ? 30 : 23}
                    color={post ? c.accent : active ? c.primary : c.muted}
                  />
                  {t.href === '/trades' && (
                    <View style={{ position: 'absolute', top: -5, right: -13 }}>
                      <Badge count={pending} />
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: active ? c.primary : c.sub }}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border },
  headerRow: {
    width: '100%',
    alignSelf: 'center',
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: c.text },
  nav: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 22 },
  navLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navText: { fontSize: 15, fontWeight: '700', color: c.sub },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  footer: { marginTop: 'auto', padding: 24, gap: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: c.border },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: c.card,
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 46, justifyContent: 'center' },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
