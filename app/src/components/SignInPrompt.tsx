import { router, usePathname } from 'expo-router';
import { Button, Empty } from './ui';

// Shown in place of a screen's content when it needs an account.
export function SignInPrompt({ text }: { text: string }) {
  const pathname = usePathname();
  return (
    <Empty icon="lock-closed-outline" title="Sign in to continue" text={text}>
      <Button
        title="Sign in or create an account"
        onPress={() => router.push({ pathname: '/login', params: { next: pathname } })}
        style={{ marginTop: 8 }}
      />
    </Empty>
  );
}
