import type { AdminUser, AdminUserStatus } from "@/api/adminApi";
import { ArrowUpRight } from "lucide-react-native";
import type { ComponentType } from "react";
import { Alert, Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useAdminTheme } from "./admin-design";
import { useAdminStyles } from "./admin-page-styles";
export type CategoryIconComponent = ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

export function showAdminMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}

${message}`);
    return;
  }

  Alert.alert(title, message);
}

export function confirmAdminAction(title: string, message: string, onConfirm: () => void, confirmLabel: string, destructive = false) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}

${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { style: "cancel", text: "Hủy" },
    { onPress: onConfirm, style: destructive ? "destructive" : "default", text: confirmLabel },
  ]);
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function getRequestErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { status?: number; data?: unknown } }).response;
    const data = response?.data;

    if (typeof data === "object" && data !== null && "message" in data) {
      return `HTTP ${response?.status ?? "?"}: ${String(data.message)}`;
    }
  }

  return error instanceof Error ? error.message : "Vui lòng thử lại sau.";
}

export function getUserStatusLabel(status: AdminUserStatus | string | null | undefined) {
  if (status === "Active") {
    return "Đang hoạt động";
  }

  if (status === "Inactive") {
    return "Không hoạt động";
  }

  if (status === "Suspended") {
    return "Bị đình chỉ";
  }

  return status || "Chưa cập nhật";
}

export function AdminUserRow({ user, onPress, compact = false }: { user: AdminUser; onPress: () => void; compact?: boolean }) {
  const styles = useAdminStyles();
  const theme = useAdminTheme();
  const desktop = useWindowDimensions().width >= 1100;
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ hovered, pressed }) => [styles.userRow, compact && styles.compactUserRow, (hovered || pressed) && styles.hoverSurface]}>
    <View style={styles.userMiniAvatar}><Text style={styles.userMiniAvatarText}>{(user.displayName || user.username || "U").charAt(0).toUpperCase()}</Text></View>
    <View style={styles.rowCopy}><Text numberOfLines={1} style={styles.rowTitle}>{user.displayName || user.username}</Text><Text numberOfLines={1} style={styles.rowSubtitle}>{user.email}</Text></View>
    {!compact && desktop ? <View style={styles.userStatusColumn}><View style={styles.statusLine}><View style={[styles.statusDot, { backgroundColor: user.status === "Active" ? theme.primary : theme.textMuted }]} /><Text style={styles.rowSubtitle}>{getUserStatusLabel(user.status)}</Text></View><Text style={styles.rowSubtitle}>{formatDate(user.createdAt)}</Text></View> : null}
    {!compact && !desktop ? <Text style={styles.mobileStatus}>{getUserStatusLabel(user.status)}</Text> : null}
    <View style={[styles.roleBadge, user.role === "Admin" && styles.roleBadgeAdmin]}><Text style={[styles.roleBadgeText, user.role === "Admin" && styles.roleBadgeTextAdmin]}>{user.role === "Admin" ? "Quản trị" : "Thành viên"}</Text></View>
    {desktop && !compact ? <ArrowUpRight size={15} color={theme.textMuted} /> : null}
  </Pressable>;
}

export function StatRow({ label, value }: { label: string; value: string }) {
  const styles = useAdminStyles();

  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const styles = useAdminStyles();

  return (
    <Pressable style={[styles.filterChip, selected && styles.filterChipSelected]} onPress={onPress}>
      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  const styles = useAdminStyles();

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}
