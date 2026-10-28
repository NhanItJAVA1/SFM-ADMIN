import { Redirect, Tabs, router, usePathname } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { authApi } from "@/api/authApi";
import { useAdminFonts, useAdminTheme } from "@/components/admin/admin-design";
import { adminViewFromPath, navigateAdmin } from "@/components/admin/admin-navigation";
import { confirmAdminAction } from "@/components/admin/admin-page-shared";
import { useAdminStyles } from "@/components/admin/admin-page-styles";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAuthAccessToken, getAuthRefreshToken, getAuthUser } from "@/stores/authSession";
import { clearAuthSession } from "@/stores/persistedAuthSession";
import { isAdminUser } from "@/utils/authRole";

export default function AdminLayout() {
  const theme = useAdminTheme();
  const styles = useAdminStyles();
  const [fontsLoaded, fontError] = useAdminFonts();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const currentUser = getAuthUser();

  async function logout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const refreshToken = getAuthRefreshToken();
      await authApi.logout(refreshToken ? { refreshToken } : undefined);
    } catch {
      // Always clear the local session, including when the logout API is unavailable.
    } finally {
      await clearAuthSession();
      setIsLoggingOut(false);
      router.replace("/auth/login");
    }
  }

  if (!getAuthAccessToken()) return <Redirect href="/auth/login" />;
  if (!isAdminUser(currentUser)) {
    return <View style={styles.screen}><View style={styles.deniedCard}>
      <Text style={styles.deniedTitle}>Không có quyền truy cập</Text>
      <Text style={styles.deniedText}>Trang này chỉ dành cho tài khoản Admin.</Text>
    </View></View>;
  }
  if (!fontsLoaded && !fontError) {
    return <View style={[styles.screen, styles.detailLoadingState]}><ActivityIndicator color={theme.primary} /></View>;
  }

  return (
    <AdminShell view={adminViewFromPath(pathname)} onNavigate={navigateAdmin}
      name={currentUser?.displayName ?? currentUser?.username ?? "Admin"} isLoggingOut={isLoggingOut}
      onLogout={() => confirmAdminAction("Đăng xuất", "Bạn muốn đăng xuất khỏi trang Admin?", () => void logout(), "Đăng xuất", true)}>
      {/* Lazy routes retain their local state, including an in-flight training request. */}
      <Tabs backBehavior="history" tabBar={() => null}
        screenOptions={{ headerShown: false, lazy: true, animation: "none", sceneStyle: { backgroundColor: theme.screen } }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="users" />
        <Tabs.Screen name="categories" />
        <Tabs.Screen name="documents" />
        <Tabs.Screen name="training" />
        <Tabs.Screen name="monitoring" />
        <Tabs.Screen name="analysis-config" />
        <Tabs.Screen name="load-testing" options={{ href: __DEV__ ? "/admin/load-testing" : null }} />
      </Tabs>
    </AdminShell>
  );
}
