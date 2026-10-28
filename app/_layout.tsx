import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { setApiAuthExpiredHandler } from '@/api/axiosClient';
import { useAppTheme } from '@/hooks/use-app-theme';
import { clearAuthSession, restoreAuthSession } from '@/stores/persistedAuthSession';
import { restoreThemeMode } from '@/stores/themePreference';

export default function RootLayout() {
  const router = useRouter();
  const theme = useAppTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setApiAuthExpiredHandler(async () => {
      await clearAuthSession();
      router.replace('/auth/login');
    });
    return () => setApiAuthExpiredHandler(null);
  }, [router]);

  useEffect(() => {
    Promise.all([restoreThemeMode(), restoreAuthSession()]).finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <View style={[styles.loading, { backgroundColor: theme.screen }]}><ActivityIndicator color={theme.primary} /></View>;
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.screen } }} />;
}

const styles = StyleSheet.create({ loading: { alignItems: 'center', flex: 1, justifyContent: 'center' } });
