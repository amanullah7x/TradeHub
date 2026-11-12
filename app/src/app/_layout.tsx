import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { AuthProvider } from '@/lib/auth';
import { c } from '@/lib/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      {/* Every screen draws its own header and tab bar through <Shell>. */}
      <Stack
        screenOptions={{
          headerShown: false,
          title: 'TradeHub',
          contentStyle: { backgroundColor: c.bg },
          // Page changes on the website should be instant, like any other site.
          animation: Platform.OS === 'web' ? 'none' : 'default',
        }}
      />
    </AuthProvider>
  );
}
