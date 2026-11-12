import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CashEditor, cashFromEditor, cashToEditor, type CashValue } from '@/components/CashEditor';
import { ListingRow } from '@/components/ListingCard';
import { Shell, useWide } from '@/components/Shell';
import { SignInPrompt } from '@/components/SignInPrompt';
import { TradeBalance } from '@/components/TradeBalance';
import { Button, Card, Empty, Loading, Notice, Pill, confirm, styles as ui } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { money, timeAgo } from '@/lib/format';
import { c, radius } from '@/lib/theme';
import { firstName, otherParty, statusOf, viewerCash } from '@/lib/trade';
import type { Listing, Offer } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';

// How often an open trade checks for new messages and counter-offers.
const POLL_MS = 6000;

function Side({ title, listings, cash, wide }: { title: string; listings: Listing[]; cash: number; wide: boolean }) {
  return (
    <View style={{ flex: wide ? 1 : undefined, gap: 10 }}>
      <Text style={styles.sideTitle}>{title}</Text>
      {listings.map((listing) => (
        <Pressable key={listing.id} accessibilityRole="link" onPress={() => router.push(`/listing/${listing.id}`)}>
          <ListingRow listing={listing} />
        </Pressable>
      ))}
      {cash > 0 && (
        <View style={styles.cash}>
          <Ionicons name="cash-outline" size={18} color={c.success} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: c.success }}>+ {money(cash)} cash</Text>
        </View>
      )}
    </View>
  );
}

export default function TradeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wide = useWide();
  const { user, loading: authLoading, refresh } = useAuth();
  const { data, setData, error, loading, reload } = useLoad(
    () => (user ? api<{ offer: Offer }>(`/offers/${id}`) : Promise.resolve(null)),
    `${id}:${user?.id}`,
  );
  const [draft, setDraft] = useState('');
  const [counter, setCounter] = useState<CashValue | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const offer = data?.offer;
  const open = offer?.status === 'pending';

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [open, reload]);

  if (authLoading || (loading && !data)) return <Shell title="Trade"><Loading /></Shell>;
  if (!user) {
    return (
      <Shell title="Trade">
        <SignInPrompt text="Sign in to see this trade." />
      </Shell>
    );
  }
  if (!offer) {
    return (
      <Shell title="Trade">
        <Empty icon="alert-circle-outline" title="Trade not found" text={error ?? undefined} />
      </Shell>
    );
  }

  const other = otherParty(offer);
  const status = statusOf(offer);
  const pays = viewerCash(offer);
  const isOfferer = offer.role === 'offerer';

  const act = async (action: string, body?: unknown) => {
    setBusy(action);
    setActionError(null);
    try {
      setData(await api<{ offer: Offer }>(`/offers/${offer.id}/${action}`, { method: 'POST', body }));
      setCounter(null);
      refresh();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const accept = async () => {
    const ok = await confirm('Accept this trade?', `You and ${other.name} will see each other's contact details to arrange the swap.`, 'Accept');
    if (ok) act('accept');
  };

  const decline = async () => {
    if (await confirm('Decline this offer?', 'This closes the offer for both of you.', 'Decline')) act('decline');
  };

  const cancel = async () => {
    if (await confirm('Cancel your offer?', 'This closes the offer for both of you.', 'Cancel offer')) act('cancel');
  };

  const sendCounter = () => {
    if (!counter) return;
    const mine = cashFromEditor(counter);
    // The server stores cash from the offerer's side.
    act('counter', { cash: isOfferer ? mine : -mine });
  };

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    try {
      setData(await api<{ offer: Offer }>(`/offers/${offer.id}/messages`, { body: { body } }));
    } catch (err) {
      setDraft(body);
      setActionError(errorMessage(err));
    }
  };

  return (
    <Shell title="Trade" narrow>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text style={[ui.h1, { flex: 1 }]}>Trade with {firstName(other.name)}</Text>
        <Pill label={status.label} tone={status.tone} />
      </View>

      <Card style={{ gap: 16 }}>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16 }}>
          <Side title="You give" listings={isOfferer ? offer.items : [offer.listing]} cash={Math.max(pays, 0)} wide={wide} />
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={wide ? 'swap-horizontal' : 'swap-vertical'} size={24} color={c.muted} />
          </View>
          <Side title="You get" listings={isOfferer ? [offer.listing] : offer.items} cash={Math.max(-pays, 0)} wide={wide} />
        </View>
        <TradeBalance
          itemsValue={offer.items.reduce((sum, item) => sum + item.value, 0)}
          cash={offer.cash}
          targetValue={offer.listing.value}
          offererLabel={isOfferer ? 'You give' : `${firstName(offer.from.name)} gives`}
          ownerLabel={isOfferer ? `${firstName(offer.to.name)} gives` : 'You give'}
          subject={isOfferer ? 'Your offer' : `${firstName(offer.from.name)}'s offer`}
        />
      </Card>

      {open && (
        <Card style={{ gap: 12 }}>
          {offer.yourTurn ? (
            <>
              <Text style={ui.h2}>It is your turn to respond</Text>
              {counter ? (
                <>
                  <CashEditor value={counter} onChange={setCounter} />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Button title="Send counter-offer" onPress={sendCounter} loading={busy === 'counter'} style={{ flex: 1 }} />
                    <Button title="Back" variant="outline" onPress={() => setCounter(null)} />
                  </View>
                </>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <Button title="Accept" icon="checkmark" onPress={accept} loading={busy === 'accept'} style={{ flexGrow: 1 }} />
                  <Button
                    title="Counter"
                    icon="swap-horizontal"
                    variant="outline"
                    onPress={() => setCounter(cashToEditor(pays))}
                    style={{ flexGrow: 1 }}
                  />
                  <Button title="Decline" variant="danger" onPress={decline} loading={busy === 'decline'} style={{ flexGrow: 1 }} />
                </View>
              )}
            </>
          ) : (
            <Text style={ui.body}>Waiting for {firstName(other.name)} to respond.</Text>
          )}
          {isOfferer && !counter && (
            <Button title="Cancel my offer" variant="outline" small onPress={cancel} loading={busy === 'cancel'} style={{ alignSelf: 'flex-start' }} />
          )}
          <Notice text={actionError} />
        </Card>
      )}

      {offer.contact && (
        <Card style={{ gap: 8, borderColor: '#86EFAC', backgroundColor: '#F0FDF4' }}>
          <Text style={ui.h2}>Trade agreed. Arrange the swap with {firstName(offer.contact.name)}</Text>
          {offer.contact.phone ? (
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`tel:${offer.contact!.phone.replace(/\s/g, '')}`)}>
              <Text style={styles.contact}>
                <Ionicons name="call-outline" size={15} /> {offer.contact.phone}
              </Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${offer.contact!.email}`)}>
            <Text style={styles.contact}>
              <Ionicons name="mail-outline" size={15} /> {offer.contact.email}
            </Text>
          </Pressable>
          <Text style={ui.hint}>
            Meet in a busy public place, check the item carefully, and only hand over cash in person.
          </Text>
        </Card>
      )}

      <Card style={{ gap: 12 }}>
        <Text style={ui.h2}>Messages</Text>
        {(offer.messages ?? []).map((message) => {
          if (message.senderId === null) {
            return (
              <Text key={message.id} style={styles.system}>
                {message.body}
              </Text>
            );
          }
          const mine = message.senderId === user.id;
          return (
            <View key={message.id} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={{ fontSize: 15, lineHeight: 21, color: mine ? '#FFFFFF' : c.text }}>{message.body}</Text>
              <Text style={{ fontSize: 11, color: mine ? '#CCFBF1' : c.muted, alignSelf: 'flex-end' }}>
                {timeAgo(message.createdAt)}
              </Text>
            </View>
          );
        })}
        {!open && <Notice text={actionError} />}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <TextInput
            accessibilityLabel="Write a message"
            value={draft}
            onChangeText={setDraft}
            placeholder={`Message ${firstName(other.name)}`}
            placeholderTextColor={c.muted}
            multiline
            maxLength={1000}
            style={[ui.input, { flex: 1, maxHeight: 120 }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={send}
            disabled={!draft.trim()}
            style={[styles.send, !draft.trim() && { opacity: 0.5 }]}>
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </Card>
    </Shell>
  );
}

const styles = StyleSheet.create({
  sideTitle: { fontSize: 12, fontWeight: '800', color: c.sub, textTransform: 'uppercase', letterSpacing: 0.6 },
  cash: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: c.successSoft,
  },
  contact: { fontSize: 16, fontWeight: '700', color: c.primaryDark },
  system: { fontSize: 13, color: c.sub, textAlign: 'center', lineHeight: 19, paddingHorizontal: 12 },
  bubble: { maxWidth: '85%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.lg, gap: 2 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: c.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4 },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
