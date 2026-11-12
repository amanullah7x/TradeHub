import { View } from 'react-native';
import { CURRENCY, digitsOnly } from '@/lib/format';
import { Field, Segmented } from './ui';

export type CashDirection = 'pay' | 'none' | 'receive';

export type CashValue = { direction: CashDirection; amount: string };

// Signed amount from the editing person's point of view: positive means they pay.
export const cashFromEditor = (value: CashValue) => {
  const amount = Number(value.amount) || 0;
  return value.direction === 'pay' ? amount : value.direction === 'receive' ? -amount : 0;
};

export const cashToEditor = (signed: number): CashValue => ({
  direction: signed > 0 ? 'pay' : signed < 0 ? 'receive' : 'none',
  amount: signed ? String(Math.abs(signed)) : '',
});

// Lets one side of a trade say whether they add cash, ask for cash, or neither.
export function CashEditor({ value, onChange }: { value: CashValue; onChange: (value: CashValue) => void }) {
  return (
    <View style={{ gap: 12 }}>
      <Segmented
        options={[
          { key: 'pay', label: 'I add cash' },
          { key: 'none', label: 'No cash' },
          { key: 'receive', label: 'I ask for cash' },
        ]}
        value={value.direction}
        onChange={(direction) => onChange({ ...value, direction })}
      />
      {value.direction !== 'none' && (
        <Field
          label={value.direction === 'pay' ? `Cash I add (${CURRENCY})` : `Cash I ask for (${CURRENCY})`}
          value={value.amount}
          onChangeText={(text) => onChange({ ...value, amount: digitsOnly(text).slice(0, 10) })}
          keyboardType="number-pad"
          placeholder="0"
        />
      )}
    </View>
  );
}
