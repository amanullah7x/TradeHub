import { StyleSheet, Text, View } from 'react-native';
import { money } from '@/lib/format';
import { c, radius } from '@/lib/theme';

// Trades within this share of the target item's value count as even.
const FAIR_MARGIN = 0.05;

// Compares what the offerer brings (items plus cash) with the value of the item
// they want. `cash` is positive when the offerer adds money, negative when they ask for it.
export function tradeBalance(itemsValue: number, cash: number, targetValue: number) {
  const gap = itemsValue + cash - targetValue;
  return { gap, fair: Math.abs(gap) <= targetValue * FAIR_MARGIN };
}

type Props = {
  itemsValue: number;
  cash: number;
  targetValue: number;
  // Labels for the two sides, from the viewer's point of view.
  offererLabel: string;
  ownerLabel: string;
  // How to refer to the offer in the verdict line, e.g. "Your offer".
  subject: string;
};

export function TradeBalance({ itemsValue, cash, targetValue, offererLabel, ownerLabel, subject }: Props) {
  const { gap, fair } = tradeBalance(itemsValue, cash, targetValue);
  // Cash is drawn on the side of whoever pays it, so both bars show total value given.
  const left = itemsValue + Math.max(cash, 0);
  const right = targetValue + Math.max(-cash, 0);
  const scale = Math.max(left, right, 1);
  const tone = fair ? c.success : c.accent;

  return (
    <View style={styles.box}>
      <Bar label={offererLabel} total={left} share={left / scale} color={c.primary} />
      <Bar label={ownerLabel} total={right} share={right / scale} color="#64748B" />
      <Text style={{ fontSize: 14, fontWeight: '700', color: tone }}>
        {fair
          ? 'This looks like a fair trade.'
          : gap < 0
            ? `${subject} is ${money(-gap)} short of an even trade.`
            : `${subject} is ${money(gap)} over an even trade.`}
      </Text>
    </View>
  );
}

function Bar({ label, total, share, color }: { label: string; total: number; share: number; color: string }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, color: c.sub }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>{money(total)}</Text>
      </View>
      <View style={styles.track}>
        <View style={{ width: `${Math.max(share * 100, 2)}%`, height: '100%', borderRadius: 4, backgroundColor: color }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: c.border },
  track: { height: 8, borderRadius: 4, backgroundColor: '#E2E8F0', overflow: 'hidden' },
});
