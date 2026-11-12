import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CashEditor, cashFromEditor, cashToEditor, type CashValue } from '@/components/CashEditor';
import { ListingRow } from '@/components/ListingCard';
import { Shell } from '@/components/Shell';
import { SignInPrompt } from '@/components/SignInPrompt';
import { TradeBalance, tradeBalance } from '@/components/TradeBalance';
import { Button, Card, Empty, Field, Loading, Notice, styles as ui } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { money } from '@/lib/format';
import { c, radius } from '@/lib/theme';
import type { Listing, Offer } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';

export default function NewOffer() {
  const { listing: listingId } = useLocalSearchParams<{ listing: string }>();
  const { user, loading: authLoading, refresh } = useAuth();
  const { data, error, loading } = useLoad(async () => {
    const [target, mine] = await Promise.all([
      api<{ listing: Listing }>(`/listings/${listingId}`),
      user ? api<{ listings: Listing[] }>('/listings?mine=1') : Promise.resolve({ listings: [] }),
    ]);
    return { target: target.listing, mine: mine.listings.filter((l) => l.status === 'active') };
  }, `${listingId}:${user?.id}`);
  const [picked, setPicked] = useState<number[]>([]);
  const [cash, setCash] = useState<CashValue>({ direction: 'none', amount: '' });
  const [message, setMessage] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (authLoading || (loading && !data)) return <Shell title="Offer a trade"><Loading /></Shell>;
  if (!user) {
    return (
      <Shell title="Offer a trade">
        <SignInPrompt text="Sign in to offer one of your items in trade." />
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell title="Offer a trade">
        <Empty icon="alert-circle-outline" title="Item not available" text={error ?? undefined} />
      </Shell>
    );
  }

  const { target, mine } = data;
  const itemsValue = mine.filter((l) => picked.includes(l.id)).reduce((sum, l) => sum + l.value, 0);
  const cashAmount = cashFromEditor(cash);
  const balance = tradeBalance(itemsValue, cashAmount, target.value);
  // The cash that would make the two sides exactly even.
  const evenCash = target.value - itemsValue;

  const toggle = (id: number) =>
    setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const submit = async () => {
    setBusy(true);
    setSubmitError(null);
    try {
      const { offer } = await api<{ offer: Offer }>('/offers', {
        body: { listingId: target.id, itemIds: picked, cash: cashAmount, message },
      });
      refresh();
      router.replace(`/trades/${offer.id}`);
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Offer a trade" narrow>
      <Text style={ui.h1}>Offer a trade</Text>

      <Card style={{ gap: 10 }}>
        <Text style={ui.h2}>You want</Text>
        <ListingRow listing={target} />
        {target.wants ? (
          <Text style={{ fontSize: 13, color: c.sub, lineHeight: 19 }}>
            {target.owner.name} would like: {target.wants}
          </Text>
        ) : null}
      </Card>

      <Card style={{ gap: 12 }}>
        <Text style={ui.h2}>You offer</Text>
        {mine.length === 0 ? (
          <Empty icon="cube-outline" title="You have no items listed yet" text="Post the item you want to trade, then come back to make your offer.">
            <Button title="Post an item" icon="add" onPress={() => router.push('/listing/new')} style={{ marginTop: 8 }} />
          </Empty>
        ) : (
          mine.map((listing) => {
            const selected = picked.includes(listing.id);
            return (
              <Pressable
                key={listing.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => toggle(listing.id)}
                style={[styles.option, selected && styles.optionSelected]}>
                <ListingRow
                  listing={listing}
                  right={
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={selected ? c.primary : c.muted}
                    />
                  }
                />
              </Pressable>
            );
          })
        )}
      </Card>

      {mine.length > 0 && (
        <>
          <Card style={{ gap: 12 }}>
            <Text style={ui.h2}>Cash to make it fair</Text>
            <CashEditor value={cash} onChange={setCash} />
            {picked.length > 0 && (
              <>
                <TradeBalance
                  itemsValue={itemsValue}
                  cash={cashAmount}
                  targetValue={target.value}
                  offererLabel="You give"
                  ownerLabel={`${target.owner.name.split(' ')[0]} gives`}
                  subject="Your offer"
                />
                {!balance.fair && evenCash !== cashAmount && (
                  <Button
                    small
                    variant="outline"
                    title={
                      evenCash > 0
                        ? `Add ${money(evenCash)} to make it even`
                        : evenCash < 0
                          ? `Ask for ${money(-evenCash)} to make it even`
                          : 'Make it a straight swap'
                    }
                    onPress={() => setCash(cashToEditor(evenCash))}
                    style={{ alignSelf: 'flex-start' }}
                  />
                )}
              </>
            )}
          </Card>

          <Card style={{ gap: 12 }}>
            <Field
              label="Message (optional)"
              value={message}
              onChangeText={setMessage}
              placeholder="Say hello and tell them about your item"
              multiline
              maxLength={1000}
            />
            <Notice text={submitError} />
            <Button
              title="Send trade offer"
              icon="paper-plane-outline"
              onPress={submit}
              loading={busy}
              disabled={picked.length === 0}
            />
            {picked.length === 0 && <Text style={ui.hint}>Pick at least one of your items to offer.</Text>}
          </Card>
        </>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  option: { padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: c.border },
  optionSelected: { borderColor: c.primary, backgroundColor: '#F0FDFA' },
});
