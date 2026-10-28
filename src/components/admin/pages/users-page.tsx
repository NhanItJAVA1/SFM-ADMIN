import { adminApi, type AdminUser, type AdminUserRole, type AdminUserStatus } from "@/api/adminApi";
import { AdminUserRow, FilterChip, InfoRow, confirmAdminAction, formatDate, getUserStatusLabel, showAdminMessage } from "@/components/admin/admin-page-shared";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";

import { useAdminTheme } from "@/components/admin/admin-design";
import { navigateAdmin } from "@/components/admin/admin-navigation";
import { useAdminStyles } from "@/components/admin/admin-page-styles";
import { FocusedScreenTransition } from "@/components/screen-transition";
import { useAdminResource } from "@/hooks/use-admin-resource";

const userStatusOptions: AdminUserStatus[] = ["Active", "Inactive", "Suspended"];
const userRoleOptions: AdminUserRole[] = ["User", "Admin"];

export function UsersPage() {
  const theme = useAdminTheme();
  const styles = useAdminStyles();
  const view = "users";
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<AdminUserRole | "All">("All");
  const [userStatusFilter, setUserStatusFilter] = useState<AdminUserStatus | "All">("All");
  const [userPage, setUserPage] = useState(1);
  const [userPageSize] = useState(20);
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);
  const fetchUsers = useCallback(async (signal: AbortSignal) => {
    const { data } = await adminApi.listUsers({
      page: userPage, pageSize: userPageSize,
      role: userRoleFilter === "All" ? undefined : userRoleFilter,
      search: userSearch.trim() || undefined, status: userStatusFilter === "All" ? undefined : userStatusFilter
    }, signal);
    if (Array.isArray(data)) {
      const search = userSearch.trim().toLowerCase();
      const filtered = data.filter(user => (userRoleFilter === "All" || user.role === userRoleFilter) &&
        (userStatusFilter === "All" || !user.status || user.status === userStatusFilter) &&
        (!search || [user.username, user.email, user.displayName ?? ""].some(value => value.toLowerCase().includes(search))));
      const page = Math.min(userPage, Math.max(1, Math.ceil(filtered.length / userPageSize)));
      return { items: filtered.slice((page - 1) * userPageSize, page * userPageSize), totalCount: filtered.length, page };
    }
    return { items: Array.isArray(data.items) ? data.items : [], totalCount: data.totalCount ?? 0, page: data.page ?? userPage };
  }, [userPage, userPageSize, userRoleFilter, userSearch, userStatusFilter]);
  const { data, setData, loading, refreshing: isRefreshing, error: loadError, reload: loadUsers } =
    useAdminResource(fetchUsers, { items: [] as AdminUser[], totalCount: 0, page: 1 });
  const users = data.items;
  const userTotalCount = data.totalCount;
  const userTotalPages = Math.max(1, Math.ceil(userTotalCount / userPageSize));
  const isLoadingUsers = loading || isRefreshing;
  const setUsers = (update: SetStateAction<AdminUser[]>) => setData(current => ({
    ...current,
    items: typeof update === "function" ? update(current.items) : update
  }));
  useEffect(() => { setUserPage(data.page); }, [data.page]);
  useFocusEffect(useCallback(() => {
    if (!userId || !/^\d+$/.test(userId)) return;
    let disposed = false;
    const id = Number(userId);
    setProcessingUserId(id);
    void adminApi.getUser(id).then(({ data: user }) => {
      if (!disposed) setSelectedUser(user);
    }).catch(error => {
      if (!disposed) showAdminMessage("Không tải được thông tin user", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
    }).finally(() => { if (!disposed) setProcessingUserId(null); });
    return () => { disposed = true; };
  }, [userId]));
  async function openUserDetail(user: AdminUser) {
    try {
      setSelectedUser(user);
      setProcessingUserId(user.id);
      const response = await adminApi.getUser(user.id);

      setSelectedUser(response.data);
      setUsers((current) => (current ?? []).map((item) => (item.id === user.id ? response.data : item)));
    } catch (error) {
      showAdminMessage("Không tải được thông tin user", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
    } finally {
      setProcessingUserId(null);
    }
  }

  function updateUserSearch(nextSearch: string) {
    setUserSearch(nextSearch);
    setUserPage(1);
  }

  function updateUserRoleFilter(nextRole: AdminUserRole | "All") {
    setUserRoleFilter(nextRole);
    setUserPage(1);
  }

  function updateUserStatusFilter(nextStatus: AdminUserStatus | "All") {
    setUserStatusFilter(nextStatus);
    setUserPage(1);
  }

  function requestUpdateUserStatus(user: AdminUser, status: AdminUserStatus) {
    if (user.status === status) {
      return;
    }

    confirmAdminAction("Cập nhật trạng thái", `Đổi trạng thái ${user.username} thành "${getUserStatusLabel(status)}"?`, () => void updateUserStatus(user, status), "Cập nhật");
  }

  async function updateUserStatus(user: AdminUser, status: AdminUserStatus) {
    try {
      setProcessingUserId(user.id);
      const response = await adminApi.updateUserStatus(user.id, { status });

      setUsers((current) => (current ?? []).map((item) => (item.id === user.id ? response.data : item)));
      setSelectedUser((current) => (current?.id === user.id ? response.data : current));
    } catch (error) {
      showAdminMessage("Không cập nhật được trạng thái", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
    } finally {
      setProcessingUserId(null);
    }
  }

  function requestUpdateUserRole(user: AdminUser, role: AdminUserRole) {
    if (user.role === role) {
      return;
    }

    confirmAdminAction("Cập nhật vai trò", `Đổi vai trò ${user.username} thành "${role}"?`, () => void updateUserRole(user, role), "Cập nhật");
  }

  async function updateUserRole(user: AdminUser, role: AdminUserRole) {
    try {
      setProcessingUserId(user.id);
      const response = await adminApi.updateUserRole(user.id, { role });

      setUsers((current) => (current ?? []).map((item) => (item.id === user.id ? response.data : item)));
      setSelectedUser((current) => (current?.id === user.id ? response.data : current));
    } catch (error) {
      showAdminMessage("Không cập nhật được vai trò", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
    } finally {
      setProcessingUserId(null);
    }
  }
  if (selectedUser) {
    return (
      <FocusedScreenTransition style={styles.screen} triggerKey="admin-user-detail" variant="fade">
        <View style={styles.screen}>
          <View style={styles.header}>
            <Pressable onPress={() => { setSelectedUser(null); router.setParams({ userId: undefined }); }} hitSlop={12}>
              <Text style={styles.backText}>‹ Danh sách</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Thông tin người dùng</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.detailContent}>
            <View style={styles.userDetailCard}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {(selectedUser.displayName ?? selectedUser.username ?? "U").charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.userDetailName}>{selectedUser.displayName ?? selectedUser.username}</Text>
              <Text style={styles.userDetailEmail}>{selectedUser.email}</Text>
            </View>

            <View style={styles.infoCard}>
              <InfoRow label="ID" value={String(selectedUser.id)} />
              <InfoRow label="Username" value={selectedUser.username} />
              <InfoRow label="Email" value={selectedUser.email} />
              <InfoRow label="Display name" value={selectedUser.displayName ?? "Chưa có"} />
              <InfoRow label="Role" value={selectedUser.role} />
              <InfoRow label="Status" value={getUserStatusLabel(selectedUser.status)} />
              <InfoRow label="Ngày tạo" value={formatDate(selectedUser.createdAt)} />
              <InfoRow label="Avatar" value={selectedUser.avatarUrl ? "Có" : "Không"} />
            </View>

            <View style={styles.userControlCard}>
              <Text style={styles.sectionLabel}>Trạng thái</Text>
              <View style={styles.typeToggleRow}>
                {userStatusOptions.map((status) => (
                  <Pressable
                    key={status}
                    disabled={processingUserId === selectedUser.id}
                    onPress={() => requestUpdateUserStatus(selectedUser, status)}
                    style={[styles.typeToggle, selectedUser.status === status && styles.typeToggleSelected]}
                  >
                    <Text
                      style={[
                        styles.typeToggleText,
                        selectedUser.status === status && styles.typeToggleTextSelected,
                      ]}
                    >
                      {getUserStatusLabel(status)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Vai trò</Text>
              <View style={styles.typeToggleRow}>
                {userRoleOptions.map((role) => (
                  <Pressable
                    key={role}
                    disabled={processingUserId === selectedUser.id}
                    onPress={() => requestUpdateUserRole(selectedUser, role)}
                    style={[styles.typeToggle, selectedUser.role === role && styles.typeToggleSelected]}
                  >
                    <Text
                      style={[styles.typeToggleText, selectedUser.role === role && styles.typeToggleTextSelected]}
                    >
                      {role}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </FocusedScreenTransition>
    );
  }
  return (
    <FocusedScreenTransition style={styles.screen} triggerKey={view} variant="fade">
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigateAdmin("dashboard")} hitSlop={12}>
            <Text style={styles.backText}>‹ Admin</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Người dùng</Text>
          <Text style={styles.headerCount}>{userTotalCount}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadUsers({ refresh: true })}
              tintColor={theme.primary}
            />
          }
        >
          <View style={styles.userFilterCard}>
            <TextInput
              autoCapitalize="none"
              onChangeText={updateUserSearch}
              placeholder="Tìm theo tên hoặc email…"
              placeholderTextColor={theme.inputPlaceholder}
              style={styles.formInput}
              value={userSearch}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(["All", ...userRoleOptions] as (AdminUserRole | "All")[]).map((role) => (
                <FilterChip
                  key={role}
                  label={role === "All" ? "Tất cả vai trò" : role === "Admin" ? "Quản trị viên" : "Người dùng"}
                  selected={userRoleFilter === role}
                  onPress={() => updateUserRoleFilter(role)}
                />
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(["All", ...userStatusOptions] as (AdminUserStatus | "All")[]).map((status) => (
                <FilterChip
                  key={status}
                  label={status === "All" ? "Tất cả trạng thái" : getUserStatusLabel(status)}
                  selected={userStatusFilter === status}
                  onPress={() => updateUserStatusFilter(status)}
                />
              ))}
            </ScrollView>
          </View>

          {loadError ? <View style={styles.loadWarningCard} accessibilityLiveRegion="polite"><Text style={styles.loadWarningText}>{loadError}</Text><Pressable onPress={() => void loadUsers({ refresh: true })}><Text style={styles.inlineLinkText}>Thử tải lại</Text></Pressable></View> : null}
          {isLoadingUsers ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.loadingText}>Đang tải user...</Text>
            </View>
          ) : users.length === 0 ? (
            <View style={styles.emptyDocumentCard}>
              <Text style={styles.emptyDocumentTitle}>Không có user</Text>
              <Text style={styles.emptyDocumentText}>Thử đổi từ khóa tìm kiếm hoặc bộ lọc.</Text>
            </View>
          ) : (
            <View style={styles.userTable}>
              <View style={styles.tableHeading}><Text style={styles.tableHeadingText}>NGƯỜI DÙNG</Text><Text style={styles.tableHeadingText}>{userTotalCount} tài khoản</Text></View>
              {(users ?? []).map(user => <AdminUserRow key={user.id} user={user} onPress={() => openUserDetail(user)} />)}
            </View>
          )}

          <View style={styles.paginationRow}>
            <Pressable
              disabled={userPage <= 1 || isRefreshing}
              onPress={() => setUserPage((page) => Math.max(1, page - 1))}
              style={[styles.paginationButton, (userPage <= 1 || isRefreshing) && styles.disabledText]}
            >
              <Text style={styles.paginationButtonText}>Trước</Text>
            </Pressable>
            <Text style={styles.paginationText}>
              Trang {userPage}/{userTotalPages}
            </Text>
            <Pressable
              disabled={userPage >= userTotalPages || isRefreshing}
              onPress={() => setUserPage((page) => Math.min(userTotalPages, page + 1))}
              style={[
                styles.paginationButton,
                (userPage >= userTotalPages || isRefreshing) && styles.disabledText,
              ]}
            >
              <Text style={styles.paginationButtonText}>Sau</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </FocusedScreenTransition>
  );
}
