import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Files,
  MoreHorizontal,
  RotateCw,
  Search,
  Upload,
  X,
} from "lucide-react-native";
import { useRef, useState, type ComponentRef, type CSSProperties } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import type { RagDocument } from "@/api/ragDocumentsApi";
import {
  adminStyleSheet,
  useAdminTheme,
  type AdminTheme,
} from "@/components/admin/admin-design";
import { formatDate } from "@/components/admin/admin-page-shared";
import {
  RagDocumentModals,
  RagDocumentStatusBadge,
} from "./rag-document-modals";
import { RagOperationDialog } from "./rag-operation-dialog";
import {
  useRagDocuments,
  type RagDocumentSort,
  type RagMenuAnchor,
  type RagStatusFilter,
} from "./use-rag-documents";

const statusFilters: { value: RagStatusFilter; label: string }[] = [
  { value: "All", label: "Tất cả" },
  { value: "Indexed", label: "Sẵn sàng" },
  { value: "Processing", label: "Đang xử lý" },
  { value: "Draft", label: "Bản nháp" },
  { value: "Failed", label: "Lỗi xử lý" },
];
const sortOptions: { value: RagDocumentSort; label: string }[] = [
  { value: "updated", label: "Mới cập nhật" },
  { value: "name", label: "Tên A → Z" },
  { value: "chunks", label: "Nhiều đoạn nhất" },
];
export function DocumentsPage() {
  const theme = useAdminTheme();
  const { width } = useWindowDimensions();
  const [panelWidth, setPanelWidth] = useState(0);
  const table = panelWidth >= 900;
  const styles = createRagPageStyles(theme);
  const rag = useRagDocuments();
  const list = rag.list;
  const css = createTableStyles(theme);
  const empty = (
    <RagEmptyState
      filtered={list.hasFilters}
      onAction={list.hasFilters ? list.clearFilters : rag.openUpload}
    />
  );
  const loading = (
    <View style={styles.empty}>
      <ActivityIndicator color={theme.primary} />
      <Text style={styles.muted}>Đang tải tài liệu…</Text>
    </View>
  );
  const row = (document: RagDocument) => (
    <RagDocumentRow
      key={document.id}
      document={document}
      table={table}
      isProcessing={
        rag.processingDocumentId === document.id ||
        document.status === "Processing"
      }
      menuOpen={rag.menu.document?.id === document.id}
      onOpen={() => void rag.openDetail(document)}
      onMore={(anchor) => rag.openMenu(document, anchor)}
    />
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { padding: width >= 1000 ? 32 : 18 },
        ]}
      >
        <View style={styles.pageHeader}>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>KHO TRI THỨC</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Tài liệu RAG
            </Text>
            <Text style={styles.subtitle}>
              Quản lý nguồn kiến thức được sử dụng bởi trợ lý AI.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              disabled={rag.loading || rag.refreshing}
              onPress={() => void rag.reload({ refresh: true })}
              style={({ hovered }) => [
                styles.secondaryButton,
                hovered && styles.hover,
                (rag.loading || rag.refreshing) && styles.disabled,
              ]}
            >
              {rag.refreshing ? (
                <ActivityIndicator size="small" color={theme.textMuted} />
              ) : (
                <RotateCw size={15} color={theme.textMuted} />
              )}
              <Text style={styles.secondaryText}>Làm mới</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={rag.openUpload}
              style={({ hovered }) => [
                styles.primaryButton,
                hovered && styles.buttonHover,
              ]}
            >
              <Upload size={16} color={theme.textInverse} />
              <Text style={styles.primaryText}>Tải tài liệu lên</Text>
            </Pressable>
          </View>
        </View>

        {rag.loadWarning && !rag.loading ? (
          <View accessibilityLiveRegion="polite" style={styles.warning}>
            <AlertCircle size={18} color={theme.dangerText} />
            <Text style={styles.warningText}>{rag.loadWarning}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={rag.refreshing}
              onPress={() => void rag.reload({ refresh: true })}
            >
              <Text style={styles.link}>Thử lại</Text>
            </Pressable>
          </View>
        ) : null}

        <View
          style={styles.panel}
          onLayout={({ nativeEvent }) => setPanelWidth(nativeEvent.layout.width)}
        >
          <View style={styles.panelHeading}>
            <View style={styles.headingCopy}>
              <Text style={styles.panelTitle}>Danh sách tài liệu</Text>
              <Text style={styles.muted}>
                Theo dõi trạng thái và quản lý nội dung trong kho tri thức.
              </Text>
            </View>
            {rag.refreshing ? (
              <View style={styles.inline}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={styles.muted}>Đang cập nhật</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.toolbar}>
            <View style={styles.search}>
              <Search size={17} color={theme.textMuted} />
              <TextInput
                accessibilityLabel="Tìm tài liệu"
                placeholder="Tìm tên tài liệu, tên tệp hoặc mô tả…"
                placeholderTextColor={theme.inputPlaceholder}
                autoCapitalize="none"
                value={list.search}
                onChangeText={list.setSearch}
                style={styles.searchInput}
              />
              {list.search ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Xóa từ khóa tìm kiếm"
                  onPress={() => list.setSearch("")}
                >
                  <X size={15} color={theme.textMuted} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.selectors}>
              <RagSelect
                label="Lọc nhóm tài liệu"
                value={list.category}
                options={[
                  { value: "", label: "Mọi nhóm tài liệu" },
                  ...list.categories.map((value) => ({ value, label: value })),
                ]}
                onChange={list.setCategory}
              />
              <RagSelect
                label="Sắp xếp tài liệu"
                value={list.sort}
                options={sortOptions}
                onChange={list.setSort}
              />
            </View>
          </View>
          <View accessibilityRole="tablist" style={styles.filterTabs}>
            {statusFilters.map(({ value, label }) => (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: list.status === value }}
                onPress={() => list.setStatus(value)}
                style={[
                  styles.filterTab,
                  list.status === value && styles.activeTab,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    list.status === value && styles.activeText,
                  ]}
                >
                  {label}
                </Text>
                <Text
                  style={[
                    styles.filterCount,
                    list.status === value && styles.activeCount,
                  ]}
                >
                  {list.counts[value]}
                </Text>
              </Pressable>
            ))}
          </View>

          {table ? (
            <View style={styles.tableContainer}>
              <table aria-label="Danh sách tài liệu RAG" style={css.table}>
                <thead>
                  <tr>
                    {[
                      "Tài liệu",
                      "Nhóm",
                      "Trạng thái",
                      "Đoạn nội dung",
                      "Cập nhật",
                      "",
                    ].map((label, index) => (
                      <th
                        key={index}
                        scope="col"
                        style={{
                          ...css.th,
                          width: [undefined, "12%", "16%", "12%", "16%", 104][
                            index
                          ],
                          ...(index === 3 ? { textAlign: "right" } : {}),
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rag.loading ||
                  (!list.documents.length && rag.refreshing) ? (
                    <tr>
                      <td colSpan={6}>{loading}</td>
                    </tr>
                  ) : list.documents.length ? (
                    list.documents.map(row)
                    ) : (
                      <tr>
                        <td colSpan={6}>
                          {rag.loadWarning ? (
                            <View style={styles.empty}>
                              <Text style={styles.muted}>
                                Chưa tải được danh sách tài liệu.
                              </Text>
                            </View>
                          ) : (
                            empty
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </View>
          ) : (
            <View style={styles.mobileList}>
              {rag.loading || (!list.documents.length && rag.refreshing)
                ? loading
                : list.documents.length
                  ? list.documents.map(row)
                  : rag.loadWarning
                    ? null
                    : empty}
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.muted}>
              {list.filteredCount
                ? (list.page - 1) * list.pageSize +
                  1 +
                  "–" +
                  Math.min(list.page * list.pageSize, list.filteredCount) +
                  " trong " +
                  list.filteredCount +
                  " tài liệu"
                : "0 tài liệu"}
            </Text>
            <View style={styles.pagination}>
              <RagSelect
                compact
                label="Số tài liệu mỗi trang"
                value={String(list.pageSize)}
                options={[10, 20, 50].map((size) => ({
                  value: String(size),
                  label: size + " / trang",
                }))}
                onChange={(value) => list.setPageSize(Number(value))}
              />
              <Text style={styles.muted}>
                Trang {list.page} / {list.totalPages}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Trang trước"
                disabled={list.page <= 1}
                onPress={() => list.setPage(list.page - 1)}
                style={[styles.iconButton, list.page <= 1 && styles.disabled]}
              >
                <ChevronLeft size={16} color={theme.textMuted} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Trang sau"
                disabled={list.page >= list.totalPages}
                onPress={() => list.setPage(list.page + 1)}
                style={[
                  styles.iconButton,
                  list.page >= list.totalPages && styles.disabled,
                ]}
              >
                <ChevronRight size={16} color={theme.textMuted} />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
      <RagDocumentModals controller={rag} />
      <RagOperationDialog feedback={rag.feedback} onClose={rag.closeFeedback} />
    </View>
  );
}

// Browser-native selects provide keyboard navigation without additional dropdown state.
function RagSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  compact = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  const theme = useAdminTheme();
  return (
    <View
      style={
        compact
          ? { width: 104 }
          : { flexGrow: 1, flexBasis: 150, minWidth: 140 }
      }
    >
      <select
        aria-label={label}
        value={value}
        onChange={(event) => {
          const option = options.find(
            (item) => item.value === event.target.value,
          );
          if (option) onChange(option.value);
        }}
        style={{
          width: "100%",
          height: 39,
          appearance: "none",
          border: "1px solid " + theme.border,
          borderRadius: 8,
          padding: "8px 30px 8px 12px",
          background: theme.card,
          color: theme.text,
          fontFamily: "AdminInter, system-ui, sans-serif",
          fontSize: 12,
          cursor: "pointer",
          outlineColor: theme.primary,
          boxSizing: "border-box",
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <View
        pointerEvents="none"
        style={{ position: "absolute", right: 10, top: 12 }}
      >
        <ChevronDown size={14} color={theme.textMuted} />
      </View>
    </View>
  );
}

function RagEmptyState({
  filtered,
  onAction,
}: {
  filtered: boolean;
  onAction: () => void;
}) {
  const theme = useAdminTheme(),
    styles = createRagPageStyles(theme);
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Files size={28} color={theme.textMuted} strokeWidth={1.4} />
      </View>
      <Text style={styles.panelTitle}>
        {filtered
          ? "Không tìm thấy tài liệu phù hợp"
          : "Kho tri thức chưa có tài liệu"}
      </Text>
      <Text style={[styles.muted, { textAlign: "center", maxWidth: 360 }]}>
        {filtered
          ? "Thử từ khóa khác hoặc xóa bộ lọc để xem lại toàn bộ tài liệu."
          : "Tải tài liệu đầu tiên lên để bổ sung nguồn kiến thức cho trợ lý AI."}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onAction}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryText}>
          {filtered ? "Xóa bộ lọc" : "Tải tài liệu đầu tiên"}
        </Text>
      </Pressable>
    </View>
  );
}

function RagDocumentRow({
  document,
  table,
  isProcessing,
  menuOpen,
  onOpen,
  onMore,
}: {
  document: RagDocument;
  table: boolean;
  isProcessing: boolean;
  menuOpen: boolean;
  onOpen: () => void;
  onMore: (anchor: RagMenuAnchor | null) => void;
}) {
  const theme = useAdminTheme(),
    styles = createRagPageStyles(theme),
    css = createTableStyles(theme);
  const trigger = useRef<ComponentRef<typeof Pressable>>(null);
  const [hovered, setHovered] = useState(false);
  const fileColor =
    document.fileType === "pdf"
      ? theme.dangerText
      : document.fileType === "docx"
        ? theme.link
        : theme.primary;
  const identity = (
    <View style={styles.identity}>
      <View style={[styles.fileIcon, { backgroundColor: fileColor + "12" }]}>
        <Text style={[styles.fileType, { color: fileColor }]}>
          {document.fileType.toUpperCase()}
        </Text>
      </View>
      <View style={styles.fileCopy}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={"Xem tài liệu " + document.title}
          onPress={onOpen}
        >
          <Text
            numberOfLines={1}
            style={[styles.fileTitle, hovered && { color: theme.primary }]}
          >
            {document.title}
          </Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.fileName}>
          {document.fileName} · v{document.version}
        </Text>
        {document.errorMessage ? (
          <Text numberOfLines={1} style={styles.errorHint}>
            {document.errorMessage}
          </Text>
        ) : null}
      </View>
    </View>
  );
  const actions = (
    <View style={styles.rowActions}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={"Xem chi tiết " + document.title}
        onPress={onOpen}
        style={({ hovered }) => [styles.iconButton, hovered && styles.hover]}
      >
        <Eye size={16} color={theme.textMuted} />
      </Pressable>
      <Pressable
        ref={trigger}
        accessibilityRole="button"
        accessibilityLabel={"Thao tác với tài liệu " + document.title}
        accessibilityState={{ expanded: menuOpen, disabled: isProcessing }}
        disabled={isProcessing}
        onPress={() => {
          if (!trigger.current) return onMore(null);
          trigger.current.measureInWindow((x, y, width, height) =>
            onMore({ x, y, width, height }),
          );
        }}
        style={({ hovered }) => [
          styles.iconButton,
          (hovered || menuOpen) && styles.hover,
          menuOpen && { borderColor: theme.primary },
          isProcessing && styles.disabled,
        ]}
      >
        <MoreHorizontal
          size={19}
          color={menuOpen ? theme.primary : theme.textMuted}
        />
      </Pressable>
    </View>
  );
  const updated = document.updatedAt || document.createdAt;
  const date = Number.isNaN(Date.parse(updated)) ? "—" : formatDate(updated);
  if (table)
    return (
      <tr
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered
            ? theme.cardAlt
            : menuOpen
              ? theme.primaryPressed
              : theme.card,
        }}
      >
        <td style={css.td}>{identity}</td>
        <td style={css.td}>
          <Text numberOfLines={1} style={styles.category}>
            {document.ragCategory || "General"}
          </Text>
        </td>
        <td style={css.td}>
          <View style={{ alignItems: "flex-start" }}>
            <RagDocumentStatusBadge document={document} />
          </View>
        </td>
        <td style={{ ...css.td, textAlign: "right" }}>
          <Text style={[styles.cellText, { textAlign: "right" }]}>
            {document.chunkCount.toLocaleString("vi-VN")}
          </Text>
        </td>
        <td style={css.td}>
          <Text style={styles.cellText}>{date}</Text>
        </td>
        <td style={css.td}>{actions}</td>
      </tr>
    );
  return (
    <View style={styles.mobileCard}>
      <View style={styles.mobileRow}>
        {identity}
        {actions}
      </View>
      {document.description ? (
        <Text numberOfLines={2} style={styles.muted}>
          {document.description}
        </Text>
      ) : null}
      <View style={styles.mobileMeta}>
        <RagDocumentStatusBadge document={document} />
        <Text style={styles.category}>{document.ragCategory || "General"}</Text>
        <Text style={styles.muted}>
          {document.chunkCount} đoạn · {date}
        </Text>
      </View>
    </View>
  );
}

function createTableStyles(theme: AdminTheme): {
  table: CSSProperties;
  th: CSSProperties;
  td: CSSProperties;
} {
  return {
    table: { borderCollapse: "collapse", width: "100%", maxWidth: "100%", tableLayout: "fixed", boxSizing: "border-box" },
    th: {
      padding: "13px 14px",
      fontSize: 11,
      fontWeight: 500,
      color: theme.textMuted,
      textAlign: "left",
      background: theme.cardAlt,
      borderBottom: "1px solid " + theme.border,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      fontFamily: "AdminInter, system-ui, sans-serif",
    },
    td: {
      padding: "16px 14px",
      verticalAlign: "middle",
      borderBottom: "1px solid " + theme.border,
      overflow: "hidden",
      overflowWrap: "anywhere",
    },
  };
}

function createRagPageStyles(theme: AdminTheme) {
  return adminStyleSheet({
    root: { flex: 1, minWidth: 0, backgroundColor: theme.screen },
    content: { width: "100%", maxWidth: 1440, alignSelf: "center", gap: 24, paddingBottom: 48, },
    pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20, },
    headingCopy: { gap: 6, flexShrink: 1 },
    eyebrow: { color: theme.textMuted, fontSize: 10, fontWeight: "500", letterSpacing: 1.6, },
    title: { fontSize: 27, lineHeight: 36, fontWeight: "600", color: theme.text, letterSpacing: -0.7, },
    subtitle: { color: theme.textMuted, fontSize: 13, lineHeight: 21 },
    headerActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center", },
    primaryButton: { backgroundColor: theme.primary, borderRadius: 8, minHeight: 40, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", },
    primaryText: { fontSize: 12, fontWeight: "600", color: theme.textInverse },
    secondaryButton: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 8, minHeight: 40, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", },
    secondaryText: { color: theme.text, fontSize: 12, fontWeight: "500" },
    buttonHover: { opacity: 0.9 },
    hover: { backgroundColor: theme.cardAlt },
    disabled: { opacity: 0.4 },
    panel: { minWidth: 0, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, overflow: "hidden", },
    tableContainer: { width: "100%", minWidth: 0 },
    panelHeading: { padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, },
    panelTitle: { fontSize: 15, fontWeight: "600", color: theme.text },
    muted: { fontSize: 12, color: theme.textMuted, lineHeight: 19 },
    inline: { flexDirection: "row", gap: 7, alignItems: "center" },
    toolbar: { paddingHorizontal: 20, paddingBottom: 18, flexDirection: "row", flexWrap: "wrap", gap: 12, },
    search: { flexGrow: 1, flexBasis: 280, minWidth: 200, flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 12, height: 40, },
    searchInput: { flex: 1, minWidth: 0, paddingVertical: 8, color: theme.text, fontSize: 12, },
    selectors: { flexGrow: 1, flexShrink: 1, flexBasis: 350, minWidth: 0, flexDirection: "row", flexWrap: "wrap", gap: 10, },
    filterTabs: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, columnGap: 20, borderBottomWidth: 1, borderBottomColor: theme.border, },
    filterTab: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent", },
    activeTab: { borderBottomColor: theme.primary },
    filterText: { fontSize: 12, color: theme.textMuted, fontWeight: "500" },
    activeText: { color: theme.primary },
    filterCount: { fontSize: 10, lineHeight: 17, minWidth: 19, textAlign: "center", paddingHorizontal: 5, borderRadius: 5, backgroundColor: theme.cardAlt, color: theme.textMuted, },
    activeCount: { backgroundColor: theme.primaryPressed, color: theme.primary, },
    footer: { padding: 16, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, },
    pagination: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", },
    iconButton: { width: 32, height: 34, borderRadius: 7, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center", },
    identity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0, },
    fileIcon: { width: 40, height: 43, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0, },
    fileType: { fontSize: 9, fontWeight: "600", letterSpacing: 0.3 },
    fileCopy: { flex: 1, minWidth: 0, overflow: "hidden", gap: 4 },
    fileTitle: { fontSize: 13, fontWeight: "600", color: theme.text, lineHeight: 19, },
    fileName: { fontSize: 11, color: theme.textMuted, lineHeight: 17 },
    errorHint: { fontSize: 11, lineHeight: 17, color: theme.dangerText },
    category: { fontSize: 11, color: theme.textMuted, backgroundColor: theme.cardAlt, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 5, maxWidth: 130, alignSelf: "flex-start", },
    cellText: { fontSize: 12, lineHeight: 20, color: theme.textMuted },
    rowActions: { flexShrink: 0, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "flex-end", },
    empty: { alignItems: "center", justifyContent: "center", padding: 40, gap: 12, minHeight: 250, },
    emptyIcon: { backgroundColor: theme.cardAlt, width: 64, height: 64, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4, },
    warning: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderWidth: 1, borderColor: theme.danger + "40", backgroundColor: theme.card, borderRadius: 8, },
    warningText: { flex: 1, color: theme.dangerText, fontSize: 12, lineHeight: 19, },
    link: { color: theme.primary, fontSize: 12, fontWeight: "600" },
    mobileList: { paddingHorizontal: 16 },
    mobileCard: { paddingVertical: 18, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border, },
    mobileRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, },
    mobileMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, },
  });
}
