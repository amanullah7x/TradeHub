import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { c, radius } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'outline' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, small, style }: ButtonProps) {
  const filled = variant === 'primary' || variant === 'accent';
  const color = filled ? '#FFFFFF' : variant === 'danger' ? c.danger : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        variant === 'primary' && { backgroundColor: c.primary },
        variant === 'accent' && { backgroundColor: c.accent },
        !filled && { backgroundColor: c.card, borderWidth: 1, borderColor: variant === 'danger' ? '#FCA5A5' : c.border },
        (disabled || loading) && { opacity: 0.55 },
        pressed && { opacity: 0.8 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        icon && <Ionicons name={icon} size={small ? 16 : 18} color={color} />
      )}
      <Text style={{ color, fontWeight: '700', fontSize: small ? 13 : 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, style, ...input }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...input}
        style={[styles.input, input.multiline && { minHeight: 96, textAlignVertical: 'top' }, style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const TONES = {
  neutral: { bg: '#F1F5F9', fg: c.sub },
  primary: { bg: c.primarySoft, fg: c.primaryDark },
  accent: { bg: c.accentSoft, fg: '#9A3412' },
  success: { bg: c.successSoft, fg: c.success },
  danger: { bg: c.dangerSoft, fg: '#991B1B' },
  gold: { bg: c.goldSoft, fg: c.gold },
};

export type Tone = keyof typeof TONES;

export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      {icon && <Ionicons name={icon} size={12} color={t.fg} />}
      <Text style={{ color: t.fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Notice({ text, tone = 'danger' }: { text: string | null; tone?: Tone }) {
  if (!text) return null;
  const t = TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t.bg }]}>
      <Text style={{ color: t.fg, fontSize: 14, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

// A row of options where exactly one is selected.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.key)}
            style={[styles.segment, active && styles.segmentActive]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: active ? c.primaryDark : c.sub, textAlign: 'center' }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ padding: 48, alignItems: 'center' }}>
      <ActivityIndicator color={c.primary} />
    </View>
  );
}

export function Empty({ icon, title, text, children }: { icon: IconName; title: string; text?: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={c.muted} />
      <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, textAlign: 'center' }}>{title}</Text>
      {text ? <Text style={{ color: c.sub, textAlign: 'center', lineHeight: 20, maxWidth: 360 }}>{text}</Text> : null}
      {children}
    </View>
  );
}

// Alert.alert does nothing on web, so the browser's own dialog is used there.
export function confirm(title: string, message: string, action = 'OK'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: action, onPress: () => resolve(true) },
    ]);
  });
}

export const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: 12, borderRadius: radius.sm },
  label: { fontSize: 13, fontWeight: '700', color: c.text },
  hint: { fontSize: 12, color: c.sub, lineHeight: 17 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: c.text,
    backgroundColor: c.card,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  notice: { padding: 12, borderRadius: radius.md },
  segmented: { flexDirection: 'row', backgroundColor: '#E8ECF1', borderRadius: radius.md, padding: 4, gap: 4 },
  segment: { flex: 1, paddingVertical: 9, paddingHorizontal: 6, borderRadius: radius.sm, justifyContent: 'center' },
  segmentActive: { backgroundColor: c.card },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 16 },
  h1: { fontSize: 24, fontWeight: '800', color: c.text, letterSpacing: -0.4 },
  h2: { fontSize: 17, fontWeight: '800', color: c.text },
  body: { fontSize: 15, color: c.sub, lineHeight: 22 },
});
