import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Shell } from '@/components/Shell';
import { SignInPrompt } from '@/components/SignInPrompt';
import { Button, Card, Empty, Field, Loading, Notice, styles as ui } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { c } from '@/lib/theme';

// Keys must match REPORT_REASONS in server/src/routes/moderation.js.
const REASONS = [
  { key: 'prohibited', label: 'It is a prohibited item' },
  { key: 'counterfeit', label: 'It is fake or counterfeit' },
  { key: 'stolen', label: 'It may be stolen' },
  { key: 'scam', label: 'It looks like a scam' },
  { key: 'copyright', label: 'Copyright or trademark problem' },
  { key: 'offensive', label: 'Offensive or inappropriate' },
  { key: 'other', label: 'Something else' },
];

export default function Report() {
  const { listing } = useLocalSearchParams<{ listing: string }>();
  const { user, loading } = useAuth();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (loading) return <Shell title="Report item"><Loading /></Shell>;
  if (!user) {
    return (
      <Shell title="Report item">
        <SignInPrompt text="Sign in to report an item." />
      </Shell>
    );
  }
  if (sent) {
    return (
      <Shell title="Report item" narrow>
        <Empty icon="checkmark-circle-outline" title="Thank you for telling us" text="Our team will review this item and remove it if it breaks the rules.">
          <Button title="Back to browsing" onPress={() => router.replace('/')} style={{ marginTop: 8 }} />
        </Empty>
      </Shell>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/listings/${listing}/report`, { body: { reason, details } });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Report item" narrow>
      <Text style={ui.h1}>Report this item</Text>
      <Card style={{ gap: 14 }}>
        <Text style={ui.label}>What is wrong with it?</Text>
        <View accessibilityRole="radiogroup" style={{ gap: 4 }}>
          {REASONS.map((r) => {
            const selected = r.key === reason;
            return (
              <Pressable
                key={r.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setReason(r.key)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? c.primary : c.muted} />
                <Text style={{ fontSize: 15, color: c.text }}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Field
          label="Anything else we should know? (optional)"
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={1000}
        />
        <Notice text={error} />
        <Button title="Send report" onPress={submit} loading={busy} disabled={!reason} />
      </Card>
    </Shell>
  );
}
