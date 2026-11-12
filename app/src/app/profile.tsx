import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ListingRow } from '@/components/ListingCard';
import { Shell } from '@/components/Shell';
import { SignInPrompt } from '@/components/SignInPrompt';
import { Button, Card, Empty, Field, Loading, Notice, Pill, confirm, styles as ui } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LEGAL_LINKS } from '@/lib/legal';
import { c } from '@/lib/theme';
import type { Listing, User } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';

export default function Profile() {
  const { user, loading: authLoading, logout, refresh } = useAuth();
  const { data, error } = useLoad(
    () => (user ? api<{ listings: Listing[] }>('/listings?mine=1') : Promise.resolve({ listings: [] })),
    String(user?.id),
  );
  const [form, setForm] = useState({ name: '', city: '', phone: '' });
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (user) setForm({ name: user.name, city: user.city, phone: user.phone });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) return <Shell><Loading /></Shell>;
  if (!user) {
    return (
      <Shell>
        <SignInPrompt text="Sign in to manage your items and your account." />
      </Shell>
    );
  }

  const set = (field: keyof typeof form) => (value: string) => {
    setSaved(false);
    setForm((f) => ({ ...f, [field]: value }));
  };

  const save = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await api<{ user: User }>('/me', { method: 'PATCH', body: form });
      await refresh();
      setSaved(true);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    const ok = await confirm(
      'Delete your account?',
      'Your items are removed, your open offers are closed and your personal details are erased. This cannot be undone.',
      'Delete account',
    );
    if (!ok) return;
    try {
      await api('/me', { method: 'DELETE', body: { password } });
      await logout();
      router.replace('/');
    } catch (err) {
      setDeleteError(errorMessage(err));
    }
  };

  const listings = data?.listings ?? [];

  return (
    <Shell narrow>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={[ui.h1, { flex: 1 }]}>{user.name}</Text>
        {user.premium && <Pill label="Premium" tone="gold" icon="star" />}
      </View>

      {!user.premium && (
        <Card style={{ gap: 10, backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}>
          <Text style={ui.h2}>Go Premium</Text>
          <Text style={ui.body}>No ads, unlimited listings and a Premium badge on your items.</Text>
          <Button title="See Premium" icon="star" variant="accent" onPress={() => router.navigate('/premium')} style={{ alignSelf: 'flex-start' }} />
        </Card>
      )}

      <Card style={{ gap: 12 }}>
        <Text style={ui.h2}>My items</Text>
        <Notice text={error} />
        {listings.length === 0 ? (
          <Empty icon="cube-outline" title="You have not posted anything yet">
            <Button title="Post an item" icon="add" onPress={() => router.navigate('/listing/new')} style={{ marginTop: 8 }} />
          </Empty>
        ) : (
          listings.map((listing) => (
            <Pressable key={listing.id} accessibilityRole="link" onPress={() => router.push(`/listing/${listing.id}`)}>
              <ListingRow
                listing={listing}
                right={
                  listing.status === 'traded' ? (
                    <Pill label="Traded" tone="success" />
                  ) : listing.featured ? (
                    <Pill label="Featured" tone="gold" icon="star" />
                  ) : (
                    <Button
                      small
                      variant="outline"
                      title="Feature"
                      icon="star-outline"
                      onPress={() => router.push({ pathname: '/premium', params: { listing: String(listing.id) } })}
                    />
                  )
                }
              />
            </Pressable>
          ))
        )}
      </Card>

      <Card style={{ gap: 14 }}>
        <Text style={ui.h2}>My details</Text>
        <Text style={ui.hint}>Signed in as {user.email}</Text>
        <Field label="Name" value={form.name} onChangeText={set('name')} maxLength={60} />
        <Field label="City" value={form.city} onChangeText={set('city')} maxLength={60} />
        <Field
          label="Phone number"
          value={form.phone}
          onChangeText={set('phone')}
          keyboardType="phone-pad"
          maxLength={30}
          hint="Only shared with someone after you both accept a trade."
        />
        <Notice text={formError} />
        <Notice text={saved ? 'Your details are saved.' : null} tone="success" />
        <Button title="Save changes" onPress={save} loading={busy} />
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={ui.h2}>Help and legal</Text>
        {LEGAL_LINKS.map((link) => (
          <Pressable key={link.href} accessibilityRole="link" onPress={() => router.push(link.href as never)}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: c.primaryDark, paddingVertical: 4 }}>{link.label}</Text>
          </Pressable>
        ))}
      </Card>

      <Button title="Sign out" variant="outline" icon="log-out-outline" onPress={logout} />

      {deleting ? (
        <Card style={{ gap: 12, borderColor: '#FCA5A5' }}>
          <Text style={ui.h2}>Delete my account</Text>
          <Field label="Enter your password to confirm" value={password} onChangeText={setPassword} secureTextEntry />
          <Notice text={deleteError} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Delete account" variant="danger" onPress={deleteAccount} disabled={!password} style={{ flex: 1 }} />
            <Button title="Keep my account" variant="outline" onPress={() => setDeleting(false)} />
          </View>
        </Card>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setDeleting(true)} style={{ alignSelf: 'center', padding: 8 }}>
          <Text style={{ fontSize: 13, color: c.sub, textDecorationLine: 'underline' }}>Delete my account</Text>
        </Pressable>
      )}
    </Shell>
  );
}
