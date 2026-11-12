import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Logo } from '@/components/Logo';
import { Shell } from '@/components/Shell';
import { Button, Card, Field, Notice, Segmented, styles as ui } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { c } from '@/lib/theme';

export default function Login() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', city: '', phone: '' });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (field: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register({ ...form, acceptTerms: agreed });
      // Only follow in-app paths, never a full URL from the address bar.
      router.replace((next && next.startsWith('/') && !next.startsWith('//') ? next : '/') as never);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title={mode === 'login' ? 'Sign in' : 'Create account'} narrow>
      <Card style={{ gap: 16, maxWidth: 440, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 4 }}>
          <Logo size={36} />
          <Text style={[ui.body, { textAlign: 'center' }]}>
            {mode === 'login' ? 'Welcome back. Sign in to trade.' : 'Create a free account to start trading.'}
          </Text>
        </View>
        <Segmented
          options={[
            { key: 'login', label: 'Sign in' },
            { key: 'register', label: 'Create account' },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
        />
        {mode === 'register' && (
          <Field label="Your name" value={form.name} onChangeText={set('name')} autoComplete="name" />
        )}
        <Field
          label="Email"
          value={form.email}
          onChangeText={set('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Field
          label="Password"
          value={form.password}
          onChangeText={set('password')}
          secureTextEntry
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          hint={mode === 'register' ? 'At least 8 characters.' : undefined}
          onSubmitEditing={mode === 'login' ? submit : undefined}
        />
        {mode === 'register' && (
          <>
            <Field label="City" value={form.city} onChangeText={set('city')} />
            <Field
              label="Phone number"
              value={form.phone}
              onChangeText={set('phone')}
              keyboardType="phone-pad"
              autoComplete="tel"
              hint="Only shared with someone after you both accept a trade."
            />
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
                accessibilityLabel="I agree to the Terms of Use and Privacy Policy"
                onPress={() => setAgreed(!agreed)}
                hitSlop={8}>
                <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={24} color={agreed ? c.primary : c.muted} />
              </Pressable>
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.sub }}>
                I am 18 or older and I agree to the{' '}
                <Text accessibilityRole="link" style={{ color: c.primaryDark, fontWeight: '700' }} onPress={() => router.push('/legal/terms')}>
                  Terms of Use
                </Text>{' '}
                and{' '}
                <Text accessibilityRole="link" style={{ color: c.primaryDark, fontWeight: '700' }} onPress={() => router.push('/legal/privacy')}>
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>
          </>
        )}
        <Notice text={error} />
        <Button title={mode === 'login' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} disabled={mode === 'register' && !agreed} />
      </Card>
    </Shell>
  );
}
