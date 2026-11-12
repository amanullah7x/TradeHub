import { useId } from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { c } from '@/lib/theme';

// Same artwork as branding/logo-mark.svg.
export function LogoMark({ size = 32 }: { size?: number }) {
  // Several screens can be mounted at once on the web, and each gradient needs its own id.
  const gradient = `logo-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#14B8A6" />
          <Stop offset="1" stopColor="#0F766E" />
        </LinearGradient>
      </Defs>
      <Rect width="64" height="64" rx="16" fill={`url(#${gradient})`} />
      <Path
        d="M17 24H46M38.5 16.5L46 24L38.5 31.5"
        stroke="#FFFFFF"
        strokeWidth={5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M47 40H18M25.5 32.5L18 40L25.5 47.5"
        stroke="#FDBA74"
        strokeWidth={5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.28 }}>
      <LogoMark size={size} />
      <Text style={{ fontSize: size * 0.66, fontWeight: '800', color: c.text, letterSpacing: -0.5 }}>
        Trade<Text style={{ color: c.primary }}>Hub</Text>
      </Text>
    </View>
  );
}
