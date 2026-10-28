import { adminApi, type AdminUser } from "@/api/adminApi";
import type { Category } from "@/api/categoriesApi";
import { ragDocumentsApi, type RagDocument } from "@/api/ragDocumentsApi";
import { navigateToAdminUser } from "@/components/admin/admin-navigation";
import { AdminUserRow, StatRow, getRequestErrorMessage, type CategoryIconComponent } from "@/components/admin/admin-page-shared";
import { ArrowUpRight, BookOpen, FolderOpen, RotateCw, SlidersHorizontal, Users } from "lucide-react-native";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { useAdminTheme } from "@/components/admin/admin-design";
import { navigateAdmin } from "@/components/admin/admin-navigation";
import { useAdminStyles } from "@/components/admin/admin-page-styles";
import { FocusedScreenTransition } from "@/components/screen-transition";
import { useAdminResource } from "@/hooks/use-admin-resource";

type Overview = { users: AdminUser[]; userTotalCount: number; categories: Category[]; documents: RagDocument[]; warnings: string[] };
async function fetchDashboard(signal: AbortSignal): Promise<Overview> {
  const results = await Promise.allSettled([adminApi.listUsers({ page: 1, pageSize: 5 }, signal), adminApi.listDefaultCategories(signal), ragDocumentsApi.list(signal)]);
  const [users, categories, documents] = results;
  const userData = users.status === "fulfilled" ? users.value.data : null;
  const labels = ["người dùng", "danh mục", "tài liệu RAG"];
  return {
    users: Array.isArray(userData) ? userData.slice(0, 5) : userData?.items ?? [],
    userTotalCount: Array.isArray(userData) ? userData.length : userData?.totalCount ?? 0,
    categories: categories.status === "fulfilled" && Array.isArray(categories.value.data) ? categories.value.data : [],
    documents: documents.status === "fulfilled" ? documents.value.data : [],
    warnings: results.flatMap((result, index) => result.status === "rejected" ? ["Không tải được " + labels[index] + ": " + getRequestErrorMessage(result.reason)] : []),
  };
}

export function DashboardPage() {
  const theme = useAdminTheme();
  const styles = useAdminStyles();
  const view = "dashboard";
  const { data, loading: isLoading, refreshing: isRefreshing, error, reload: loadDashboard } = useAdminResource(fetchDashboard,
    { users: [], userTotalCount: 0, categories: [], documents: [], warnings: [] } as Overview);
  const { users, userTotalCount, categories: defaultCategories, documents: ragDocuments } = data;
  const adminLoadWarnings = error ? [error] : data.warnings;
  return (
    <FocusedScreenTransition style={styles.screen} triggerKey={view} variant="fade">
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadDashboard({ refresh: true })}
              tintColor={theme.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeCopy}>
              <Text style={styles.eyebrow}>KHÔNG GIAN QUẢN TRỊ</Text>
              <Text style={styles.title}>Tổng quan hệ thống</Text>
              <Text style={styles.pageDescription}>Quản lý người dùng, dữ liệu và tri thức trong một không gian.</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => loadDashboard({ refresh: true })} disabled={isRefreshing} style={({ hovered }) => [styles.refreshButton, hovered && styles.hoverSurface]}>
              {isRefreshing ? <ActivityIndicator size="small" color={theme.textMuted} /> : <RotateCw size={14} color={theme.textMuted} />}<Text style={styles.refreshText}>Làm mới</Text>
            </Pressable>
          </View>

          {adminLoadWarnings.length > 0 ? (
            <View style={styles.loadWarningCard}>
              {adminLoadWarnings.map((warning) => (
                <Text key={warning} style={styles.loadWarningText}>{warning}</Text>
              ))}
            </View>
          ) : null}

          {isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.loadingText}>Đang tải dữ liệu admin...</Text>
            </View>
          ) : (
            <>
              <View style={styles.tileGrid}>
                <AdminTile Icon={Users} label="Người dùng" metric={userTotalCount} note="Tài khoản trong hệ thống" onPress={() => navigateAdmin("users")} />
                <AdminTile Icon={FolderOpen} label="Danh mục" metric={defaultCategories.length} note="Danh mục mặc định" onPress={() => navigateAdmin("categories")} />
                <AdminTile Icon={BookOpen} label="Tài liệu tri thức" metric={ragDocuments.length} note="Nguồn dữ liệu cho trợ lý AI" onPress={() => navigateAdmin("documents")} />
              </View>

              <View style={styles.overviewGrid}>
                <View style={styles.overviewMain}>
                  <View style={styles.panelHeading}><View><Text style={styles.panelTitle}>Người dùng</Text><Text style={styles.panelSubtitle}>Tài khoản trong danh sách hiện tại</Text></View><Pressable accessibilityRole="button" onPress={() => navigateAdmin("users")} style={styles.inlineLink}><Text style={styles.inlineLinkText}>Xem tất cả</Text><ArrowUpRight size={14} color={theme.primary} /></Pressable></View>
                  {users.length === 0 ? <Text style={styles.panelEmpty}>Chưa có người dùng để hiển thị.</Text> : users.slice(0, 5).map(user => <AdminUserRow key={user.id} user={user} onPress={() => navigateToAdminUser(user.id)} compact />)}
                </View>
                <View style={styles.overviewAside}>
                  <View style={styles.panelHeading}><View><Text style={styles.panelTitle}>Kho tri thức</Text><Text style={styles.panelSubtitle}>Trạng thái xử lý tài liệu</Text></View><BookOpen size={18} color={theme.textMuted} /></View>
                  <View style={styles.knowledgeStats}>
                    <StatRow label="Đã lập chỉ mục" value={String(ragDocuments.filter(doc => doc.status === "Indexed").length)} />
                    <StatRow label="Đang xử lý" value={String(ragDocuments.filter(doc => doc.status === "Processing").length)} />
                    <StatRow label="Bản nháp" value={String(ragDocuments.filter(doc => doc.status === "Draft").length)} />
                    <StatRow label="Cần kiểm tra" value={String(ragDocuments.filter(doc => doc.status === "Failed").length)} />
                  </View>
                  <Pressable accessibilityRole="button" style={styles.panelFooter} onPress={() => navigateAdmin("documents")}><Text style={styles.inlineLinkText}>Quản lý tài liệu</Text><ArrowUpRight size={14} color={theme.primary} /></Pressable>
                </View>
              </View>
              <Pressable accessibilityRole="button" onPress={() => navigateAdmin("training")} style={({ hovered }) => [styles.trainingEntry, hovered && styles.hoverSurface]}>
                <View style={styles.trainingEntryIcon}><SlidersHorizontal size={20} color={theme.primary} /></View><View style={styles.rowCopy}><Text style={styles.panelTitle}>Mô hình dự báo</Text><Text style={styles.panelSubtitle}>Chọn dữ liệu người dùng và quản lý quá trình huấn luyện.</Text></View><ArrowUpRight size={18} color={theme.textMuted} />
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </FocusedScreenTransition>
  );
}
function AdminTile({ Icon, label, metric, note, onPress }: {
  Icon: CategoryIconComponent; label: string; metric: number; note: string; onPress: () => void;
}) {
  const styles = useAdminStyles();
  const theme = useAdminTheme();
  return (
    <Pressable accessibilityRole="button" style={({ hovered, pressed }) => [styles.tile, (hovered || pressed) && styles.tileHovered]} onPress={onPress}>
      <View style={styles.tileTop}><Text style={styles.tileLabel}>{label}</Text><Icon size={18} strokeWidth={1.6} color={theme.textMuted} /></View>
      <Text style={styles.tileMetric}>{new Intl.NumberFormat("vi-VN").format(metric)}</Text>
      <View style={styles.tileTop}><Text style={styles.tileNote}>{note}</Text><ArrowUpRight size={14} color={theme.textMuted} /></View>
    </Pressable>
  );
}
