import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Pencil,
  RotateCw,
  Trash2,
  Upload,
  X,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { useAdminStyles } from "@/components/admin/admin-page-styles";
import { formatDate } from "@/components/admin/admin-page-shared";
import { BottomPopup, BottomPopupSheet } from "@/components/bottom-popup";
import type {
  RagDocumentsController,
  RagMenuAnchor,
  RagMetadataFormState,
} from "./use-rag-documents";

function getRagDocumentStatusLabel(document: RagDocument) {
  return document.statusName || document.status;
}

function formatFileSize(size?: number) {
  if (!size) {
    return "Không rõ dung lượng";
  }

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function RagDocumentModals({
  controller,
}: {
  controller: RagDocumentsController;
}) {
  const theme = useAdminTheme();
  return (
    <>
      <RagUploadModal {...controller.upload} theme={theme} />
      <RagActionMenuModal {...controller.menu} />
      <RagDetailModal key={controller.detail.document?.id ?? "empty"} {...controller.detail} />
      <RagMetadataModal {...controller.metadata} theme={theme} />
      <RagDeleteConfirmationModal {...controller.deleteConfirmation} />
    </>
  );
}

export function RagDocumentStatusBadge({ document }: { document: RagDocument }) {
  const theme = useAdminTheme();
  const styles = useAdminStyles();
  const status = document.status;
  const label = { Indexed: "Sẵn sàng", Processing: "Đang xử lý", Failed: "Lỗi xử lý", Draft: "Bản nháp" }[status] ?? getRagDocumentStatusLabel(document);
  const color = status === "Failed" ? theme.dangerText : status === "Indexed" ? theme.goodText : status === "Processing" ? theme.warning : theme.textMuted;
  return (
    <View style={[styles.documentStatusBadge, status === "Indexed" && styles.documentStatusGood,
    status === "Failed" && styles.documentStatusDanger, status === "Processing" && styles.documentStatusWarning]}>
      {status === "Processing" ? <ActivityIndicator size="small" color={color} /> : null}
      <Text style={[styles.documentStatusText, { color }]}>{label}</Text>
    </View>
  );
}

function RagActionMenuModal({
  document,
  anchor,
  isProcessing,
  onClose,
  onDelete,
  onDetail,
  onEdit,
  onReindex,
}: {
  document: RagDocument | null;
  anchor: RagMenuAnchor | null;
  isProcessing: boolean;
  onClose: () => void;
  onDelete: () => void;
  onDetail: () => void;
  onEdit: () => void;
  onReindex: () => void;
}) {
  const theme = useAdminTheme();
  const styles = createRagMenuStyles(theme);
  const { width, height } = useWindowDimensions();
  const [measuredHeight, setMeasuredHeight] = useState(340);
  const desktop = width >= 768;
  const menuWidth = desktop ? 320 : Math.min(420, width - 24);
  const maxHeight = Math.max(0, height - 32);
  const position = getRagMenuPosition(anchor, width, height, menuWidth, Math.min(measuredHeight, maxHeight));
  const canReindex = Boolean(document && document.status !== "Draft");
  const Popup = desktop ? Modal : BottomPopup;
  const Panel = desktop ? View : BottomPopupSheet;

  return (
    <Popup transparent animationType="fade" visible={Boolean(document)} onRequestClose={onClose}>
      <View style={[styles.overlay, !desktop && styles.mobileOverlay]}>
        <Pressable accessible={false} focusable={false} onPress={onClose}
          style={[StyleSheet.absoluteFill, !desktop && { backgroundColor: theme.overlay }]} />
        <Panel onLayout={({ nativeEvent }) => {
          const nextHeight = nativeEvent.layout.height;
          if (Math.abs(nextHeight - measuredHeight) > 1) setMeasuredHeight(nextHeight);
        }} style={[styles.panel, { width: menuWidth, maxHeight }, desktop && { position: "absolute", ...position }]}>
          {!desktop ? <View style={styles.handle} /> : null}
          <View style={styles.header}>
            <View style={styles.fileIcon}><FileText color={theme.primary} size={18} strokeWidth={1.7} /></View>
            <View style={styles.headingCopy}>
              <Text numberOfLines={1} style={styles.title}>{document?.title ?? "Tài liệu RAG"}</Text>
              <Text numberOfLines={1} style={styles.fileName}>{document?.fileName}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng menu thao tác" hitSlop={8} onPress={onClose}
              style={({ hovered, pressed }) => [styles.close, (hovered || pressed) && styles.hover]}>
              <X color={theme.textMuted} size={16} strokeWidth={1.8} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.items} bounces={false}>
            <ActionMenuItem icon={<Eye color={theme.textMuted} size={17} strokeWidth={1.7} />}
              label="Xem chi tiết" description="Thông tin và trạng thái tài liệu" onPress={onDetail} />
            <ActionMenuItem disabled={isProcessing} icon={<Pencil color={theme.textMuted} size={17} strokeWidth={1.7} />}
              label="Chỉnh sửa thông tin" description="Tiêu đề, mô tả và nhóm tài liệu" onPress={onEdit} />
            <ActionMenuItem disabled={!canReindex || isProcessing}
              icon={isProcessing ? <ActivityIndicator size="small" color={theme.primary} /> : <RotateCw color={theme.textMuted} size={17} strokeWidth={1.7} />}
              label="Lập chỉ mục lại" description={canReindex ? "Xử lý lại tài liệu để cập nhật tra cứu" : "Cần hoàn tất tải lên tài liệu trước"} onPress={onReindex} />
            <View style={styles.divider} />
            <ActionMenuItem danger disabled={isProcessing} icon={<Trash2 color={theme.dangerText} size={17} strokeWidth={1.7} />}
              label="Xóa tài liệu" description="Xóa tệp và dữ liệu tra cứu liên quan" onPress={onDelete} />
          </ScrollView>
        </Panel>
      </View>
    </Popup>
  );
}

function getRagMenuPosition(anchor: RagMenuAnchor | null, width: number, height: number, panelWidth: number, panelHeight: number) {
  const margin = 16;
  const rightEdge = width - panelWidth - margin;
  const left = Math.max(margin, Math.min(anchor ? anchor.x + anchor.width - panelWidth : rightEdge, rightEdge));
  const below = anchor ? anchor.y + anchor.height + 8 : 80;
  const preferredTop = below + panelHeight <= height - margin ? below : (anchor?.y ?? below) - panelHeight - 8;
  return { left, top: Math.max(margin, Math.min(preferredTop, height - panelHeight - margin)) };
}

function createRagMenuStyles(theme: AdminTheme) {
  return adminStyleSheet({
    overlay: { flex: 1 },
    mobileOverlay: { padding: 12, justifyContent: "flex-end", alignItems: "center" },
    panel: { backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.border, overflow: "hidden", boxShadow: "0 12px 40px rgba(0, 0, 0, 0.18)" },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderStrong, alignSelf: "center", marginTop: 10 },
    header: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
    fileIcon: { width: 34, height: 36, borderRadius: 9, backgroundColor: theme.primaryPressed, alignItems: "center", justifyContent: "center" },
    headingCopy: { flex: 1, minWidth: 0, gap: 3 },
    title: { color: theme.text, fontSize: 13, fontWeight: "600", lineHeight: 19 },
    fileName: { color: theme.textMuted, fontSize: 11, lineHeight: 16 },
    close: { width: 28, height: 28, borderRadius: 7, alignItems: "center", justifyContent: "center" },
    items: { padding: 6, gap: 2 },
    item: { flexDirection: "row", alignItems: "center", gap: 11, padding: 10, minHeight: 58, borderRadius: 9 },
    icon: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.cardAlt, alignItems: "center", justifyContent: "center" },
    copy: { flex: 1, minWidth: 0, gap: 3 },
    label: { color: theme.text, fontSize: 13, fontWeight: "500", lineHeight: 18 },
    description: { color: theme.textMuted, fontSize: 11, lineHeight: 17 },
    dangerText: { color: theme.dangerText },
    hover: { backgroundColor: theme.cardAlt },
    dangerHover: { backgroundColor: `${theme.danger}12` },
    divider: { height: 1, backgroundColor: theme.border, marginHorizontal: 10, marginVertical: 5 },
    disabled: { opacity: 0.45 },
  });
}

function ActionMenuItem({
  danger = false,
  disabled = false,
  icon,
  label,
  description,
  onPress,
}: {
  danger?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  description: string;
  onPress: () => void;
}) {
  const styles = createRagMenuStyles(useAdminTheme());

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ hovered, pressed }) => [styles.item, (hovered || pressed) && !disabled && (danger ? styles.dangerHover : styles.hover), disabled && styles.disabled]}
    >
      <View style={styles.icon}>{icon}</View>
      <View style={styles.copy}>
        <Text style={[styles.label, danger && styles.dangerText]}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </Pressable>
  );
}

/** Desktop dialogs share one frame; narrow browser windows keep a compact bottom sheet. */
function RagDialogFrame({
  visible,
  title,
  description,
  onClose,
  children,
  footer,
  busy = false,
  wide = false,
}: {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  busy?: boolean;
  wide?: boolean;
}) {
  const theme = useAdminTheme(),
    styles = createRagDialogStyles(theme);
  const { width, height } = useWindowDimensions();
  const desktop = width >= 768;
  const Popup = desktop ? Modal : BottomPopup;
  const Panel = desktop ? View : BottomPopupSheet;
  const close = () => {
    if (!busy) onClose();
  };
  return (
    <Popup
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[
          styles.overlay,
          desktop ? styles.desktopOverlay : styles.mobileOverlay,
        ]}
      >
        <Pressable
          accessible={false}
          focusable={false}
          onPress={close}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]}
        />
        <Panel
          accessibilityViewIsModal
          style={[
            styles.panel,
            {
              width: desktop ? Math.min(wide ? 760 : 580, width - 48) : width,
              maxHeight: Math.max(160, height - (desktop ? 64 : 24)),
              borderRadius: desktop ? 14 : 0,
            },
            !desktop && styles.mobilePanel,
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headingCopy}>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              {description ? (
                <Text style={styles.muted}>{description}</Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng hộp thoại"
              disabled={busy}
              onPress={close}
              hitSlop={6}
              style={({ hovered }) => [
                styles.iconButton,
                hovered && styles.hover,
                busy && styles.disabled,
              ]}
            >
              <X color={theme.textMuted} size={18} />
            </Pressable>
          </View>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          <View style={styles.footer}>{footer}</View>
        </Panel>
      </KeyboardAvoidingView>
    </Popup>
  );
}

function RagDialogButton({
  label,
  onPress,
  primary = false,
  danger = false,
  disabled = false,
  busy = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
}) {
  const theme = useAdminTheme(),
    styles = createRagDialogStyles(theme);
  const color = primary
    ? danger
      ? "#ffffff"
      : theme.textInverse
    : danger
      ? theme.dangerText
      : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.button,
        primary && {
          backgroundColor: danger ? theme.danger : theme.primary,
          borderColor: "transparent",
        },
        (hovered || pressed) && (primary ? styles.buttonHover : styles.hover),
        (disabled || busy) && styles.disabled,
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={color} /> : icon}
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function RagMetadataFields({
  form,
  onChange,
  disabled,
}: {
  form: RagMetadataFormState;
  onChange: (form: RagMetadataFormState) => void;
  disabled: boolean;
}) {
  const theme = useAdminTheme(),
    styles = createRagDialogStyles(theme);
  return (
    <View style={styles.fields}>
      <View style={styles.field}>
        <Text style={styles.label}>
          Tên tài liệu <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          accessibilityLabel="Tên tài liệu"
          editable={!disabled}
          maxLength={255}
          value={form.title}
          onChangeText={(title) => onChange({ ...form, title })}
          placeholder="Ví dụ: Hướng dẫn tiết kiệm và lãi suất"
          placeholderTextColor={theme.inputPlaceholder}
          style={styles.input}
        />
      </View>
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Mô tả</Text>
          <Text style={styles.counter}>{form.description.length}/1000</Text>
        </View>
        <TextInput
          accessibilityLabel="Mô tả tài liệu"
          editable={!disabled}
          multiline
          maxLength={1000}
          value={form.description}
          onChangeText={(description) => onChange({ ...form, description })}
          placeholder="Mô tả ngắn về nội dung và mục đích sử dụng tài liệu…"
          placeholderTextColor={theme.inputPlaceholder}
          style={[styles.input, styles.textarea]}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Nhóm tài liệu</Text>
        <TextInput
          accessibilityLabel="Nhóm tài liệu"
          editable={!disabled}
          maxLength={100}
          autoCapitalize="none"
          value={form.ragCategory}
          onChangeText={(ragCategory) => onChange({ ...form, ragCategory })}
          placeholder="General"
          placeholderTextColor={theme.inputPlaceholder}
          style={styles.input}
        />
        <Text style={styles.help}>
          Dùng nhóm để lọc và quản lý tài liệu. Để trống sẽ sử dụng nhóm
          General.
        </Text>
      </View>
    </View>
  );
}

function RagUploadModal({
  form,
  isUploading,
  onChange,
  onClose,
  onPickFile,
  onSubmit,
  theme,
  visible,
}: RagDocumentsController["upload"] & { theme: AdminTheme }) {
  const styles = createRagDialogStyles(theme);
  return (
    <RagDialogFrame
      visible={visible}
      title="Tải tài liệu lên"
      description="Bổ sung tài liệu vào kho kiến thức của trợ lý AI."
      onClose={onClose}
      busy={isUploading}
      footer={
        <>
          <RagDialogButton
            label="Hủy"
            onPress={onClose}
            disabled={isUploading}
          />
          <RagDialogButton
            primary
            label={isUploading ? "Đang xử lý…" : "Tải lên và lập chỉ mục"}
            busy={isUploading}
            onPress={onSubmit}
            icon={<Upload size={15} color={theme.textInverse} />}
          />
        </>
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          form.asset ? "Đổi tệp tài liệu" : "Chọn tệp tài liệu"
        }
        disabled={isUploading}
        onPress={onPickFile}
        style={({ hovered }) => [
          styles.filePicker,
          hovered && { borderColor: theme.primary },
          form.asset && styles.selectedFile,
          isUploading && styles.disabled,
        ]}
      >
        <View style={styles.uploadIcon}>
          {form.asset ? (
            <FileText size={25} color={theme.primary} strokeWidth={1.5} />
          ) : (
            <Upload size={25} color={theme.primary} strokeWidth={1.5} />
          )}
        </View>
        <Text numberOfLines={2} style={styles.fileTitle}>
          {form.asset ? form.asset.name : "Chọn tài liệu từ máy tính"}
        </Text>
        <Text style={styles.help}>
          {form.asset
            ? formatFileSize(form.asset.size) +
              " · " +
              form.fileType.toUpperCase()
            : "Hỗ trợ TXT, MD, PDF và DOCX"}
        </Text>
        <View style={styles.chooseFile}>
          <Text style={styles.chooseFileText}>
            {form.asset ? "Đổi tệp" : "Chọn tệp"}
          </Text>
          {form.asset ? <CheckCircle2 size={14} color={theme.primary} /> : null}
        </View>
      </Pressable>
      <RagMetadataFields
        form={form}
        onChange={(metadata) => onChange({ ...form, ...metadata })}
        disabled={isUploading}
      />
      <Text style={styles.help}>
        Tài liệu sẽ được lập chỉ mục sau khi tải lên để sẵn sàng sử dụng trong
        kho tri thức.
      </Text>
    </RagDialogFrame>
  );
}

function RagMetadataModal({
  form,
  isSaving,
  onChange,
  onClose,
  onSubmit,
  theme,
  visible,
}: RagDocumentsController["metadata"] & { theme: AdminTheme }) {
  return (
    <RagDialogFrame
      visible={visible}
      title="Chỉnh sửa thông tin"
      description="Cập nhật tên, mô tả và nhóm của tài liệu."
      busy={isSaving}
      onClose={onClose}
      footer={
        <>
          <RagDialogButton label="Hủy" onPress={onClose} disabled={isSaving} />
          <RagDialogButton
            primary
            label={isSaving ? "Đang lưu…" : "Lưu thay đổi"}
            busy={isSaving}
            onPress={onSubmit}
            icon={<CheckCircle2 size={15} color={theme.textInverse} />}
          />
        </>
      }
    >
      <RagMetadataFields form={form} onChange={onChange} disabled={isSaving} />
    </RagDialogFrame>
  );
}

function RagDetailModal({
  document,
  isLoading,
  isProcessing,
  onClose,
  onDelete,
  onEdit,
  onReindex,
  visible,
}: RagDocumentsController["detail"]) {
  const theme = useAdminTheme(),
    styles = createRagDialogStyles(theme);
  const [showStorage, setShowStorage] = useState(false);
  const canReindex = Boolean(
    document && document.status !== "Draft" && !isProcessing,
  );
  const details = document
    ? [
        ["Định dạng", document.fileType.toUpperCase()],
        ["Nhóm tài liệu", document.ragCategory || "General"],
        ["Phiên bản", "v" + document.version],
        ["Đoạn nội dung", document.chunkCount.toLocaleString("vi-VN")],
        ["Ngày tạo", formatDate(document.createdAt)],
        [
          "Cập nhật",
          document.updatedAt ? formatDate(document.updatedAt) : "Chưa cập nhật",
        ],
      ]
    : [];
  return (
    <RagDialogFrame
      visible={visible}
      wide
      title="Chi tiết tài liệu"
      description={document ? "Thông tin tài liệu #" + document.id : undefined}
      onClose={onClose}
      footer={
        <>
          <RagDialogButton
            danger
            label="Xóa"
            onPress={onDelete}
            disabled={isProcessing || !document}
            icon={<Trash2 size={15} color={theme.dangerText} />}
          />
          <View style={{ flex: 1 }} />
          <RagDialogButton label="Đóng" onPress={onClose} />
          <RagDialogButton
            label="Chỉnh sửa"
            onPress={onEdit}
            disabled={isProcessing || !document}
            icon={<Pencil size={15} color={theme.textMuted} />}
          />
          <RagDialogButton
            primary
            label="Lập chỉ mục lại"
            onPress={onReindex}
            disabled={!canReindex}
            icon={<RotateCw size={15} color={theme.textInverse} />}
          />
        </>
      }
    >
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={styles.help}>Đang tải thông tin mới nhất…</Text>
        </View>
      ) : null}
      {document ? (
        <>
          <View style={styles.detailHero}>
            <View style={styles.uploadIcon}>
              <FileText size={27} color={theme.primary} strokeWidth={1.5} />
            </View>
            <View style={styles.headingCopy}>
              <Text style={styles.documentTitle}>{document.title}</Text>
              <Text style={styles.muted}>{document.fileName}</Text>
            </View>
            <RagDocumentStatusBadge document={document} />
          </View>
          <Text style={styles.description}>
            {document.description || "Tài liệu chưa có mô tả."}
          </Text>
          {document.errorMessage ? (
            <View style={styles.errorBox}>
              <AlertTriangle size={17} color={theme.dangerText} />
              <Text selectable style={styles.errorText}>
                {document.errorMessage}
              </Text>
            </View>
          ) : null}
          {document.status === "Draft" ? (
            <Text style={styles.help}>
              Tài liệu đang là bản nháp. Cần hoàn tất tải lên trước khi lập chỉ
              mục lại.
            </Text>
          ) : null}
          <View style={styles.detailGrid}>
            {details.map(([label, value]) => (
              <View key={label} style={styles.detailCell}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
              </View>
            ))}
          </View>
          <View style={styles.storage}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showStorage }}
              onPress={() => setShowStorage((value) => !value)}
              style={styles.storageHeading}
            >
              <Text style={styles.help}>Thông tin lưu trữ</Text>
              {showStorage ? (
                <ChevronUp size={15} color={theme.textMuted} />
              ) : (
                <ChevronDown size={15} color={theme.textMuted} />
              )}
            </Pressable>
            {showStorage ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.help}>
                  Người tạo: #{document.createdBy}
                </Text>
                <Text selectable style={styles.storageKey}>
                  {document.s3Key}
                </Text>
              </View>
            ) : null}
          </View>
        </>
      ) : !isLoading ? (
        <Text style={styles.muted}>Không tìm thấy thông tin tài liệu.</Text>
      ) : null}
    </RagDialogFrame>
  );
}

function RagDeleteConfirmationModal({
  document,
  onClose,
  onConfirm,
}: RagDocumentsController["deleteConfirmation"]) {
  const theme = useAdminTheme(),
    styles = createRagDialogStyles(theme);
  return (
    <RagDialogFrame
      visible={document !== null}
      title="Xóa tài liệu?"
      onClose={onClose}
      footer={
        <>
          <RagDialogButton label="Giữ lại tài liệu" onPress={onClose} />
          <RagDialogButton
            primary
            danger
            label="Xóa tài liệu"
            onPress={onConfirm}
            icon={<Trash2 size={15} color="#ffffff" />}
          />
        </>
      }
    >
      <View style={styles.deleteContext}>
        <View
          style={[styles.uploadIcon, { backgroundColor: theme.danger + "12" }]}
        >
          <Trash2 size={25} color={theme.dangerText} strokeWidth={1.6} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.fileTitle}>{document?.title}</Text>
          <Text style={styles.help}>{document?.fileName}</Text>
        </View>
      </View>
      <Text style={styles.description}>
        Tài liệu, tệp gốc và dữ liệu tra cứu liên quan sẽ bị xóa khỏi kho tri
        thức. Thao tác này không thể hoàn tác.
      </Text>
    </RagDialogFrame>
  );
}

function createRagDialogStyles(theme: AdminTheme) {
  return adminStyleSheet({
    overlay: { flex: 1 },
    desktopOverlay: { alignItems: "center", justifyContent: "center", padding: 24, },
    mobileOverlay: { justifyContent: "flex-end" },
    panel: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, overflow: "hidden", boxShadow: "0 16px 60px rgba(0,0,0,0.18)", },
    mobilePanel: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    header: { padding: 24, paddingBottom: 20, flexDirection: "row", alignItems: "flex-start", gap: 16, borderBottomWidth: 1, borderBottomColor: theme.border, },
    headingCopy: { flex: 1, minWidth: 0, gap: 5 },
    title: { fontSize: 19, lineHeight: 27, fontWeight: "600", color: theme.text, },
    muted: { fontSize: 12, lineHeight: 20, color: theme.textMuted },
    body: { padding: 24, gap: 22 },
    footer: { padding: 18, paddingHorizontal: 24, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap", gap: 10, borderTopWidth: 1, borderTopColor: theme.border, },
    button: { minHeight: 40, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: theme.border, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.card, },
    buttonText: { fontSize: 12, fontWeight: "500" },
    iconButton: { width: 28, height: 28, borderRadius: 7, alignItems: "center", justifyContent: "center", },
    hover: { backgroundColor: theme.cardAlt },
    buttonHover: { opacity: 0.88 },
    disabled: { opacity: 0.45 },
    fields: { gap: 20 },
    field: { gap: 8 },
    label: { fontSize: 12, fontWeight: "500", color: theme.text },
    required: { color: theme.dangerText },
    labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", },
    counter: { fontSize: 10, color: theme.textMuted },
    input: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, backgroundColor: theme.card, color: theme.text, fontSize: 13, minHeight: 42, paddingHorizontal: 12, paddingVertical: 10, },
    textarea: { minHeight: 100, textAlignVertical: "top" },
    help: { fontSize: 11, lineHeight: 18, color: theme.textMuted },
    filePicker: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.borderStrong, borderStyle: "dashed", borderRadius: 10, padding: 24, gap: 10, backgroundColor: theme.screen, },
    selectedFile: { borderColor: theme.primary, backgroundColor: theme.primaryPressed, },
    uploadIcon: { width: 50, height: 50, borderRadius: 12, backgroundColor: theme.primaryPressed, alignItems: "center", justifyContent: "center", },
    fileTitle: { fontSize: 13, lineHeight: 21, fontWeight: "600", color: theme.text, },
    chooseFile: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: theme.border, borderRadius: 7, backgroundColor: theme.card, paddingHorizontal: 12, paddingVertical: 7, marginTop: 2, },
    chooseFileText: { fontSize: 11, fontWeight: "500", color: theme.primary },
    loading: { flexDirection: "row", alignItems: "center", gap: 9 },
    detailHero: { flexDirection: "row", alignItems: "center", gap: 14, flexWrap: "wrap", },
    documentTitle: { fontSize: 18, lineHeight: 27, fontWeight: "600", color: theme.text, },
    description: { fontSize: 13, lineHeight: 22, color: theme.textMuted },
    detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 20, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 18, },
    detailCell: { flexGrow: 1, flexBasis: "43%", gap: 7 },
    detailLabel: { fontSize: 11, color: theme.textMuted },
    detailValue: { fontSize: 13, lineHeight: 21, fontWeight: "500", color: theme.text, },
    errorBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 8, backgroundColor: theme.danger + "10", borderWidth: 1, borderColor: theme.danger + "30", },
    errorText: { flex: 1, fontSize: 12, lineHeight: 20, color: theme.dangerText, },
    storage: { gap: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16, },
    storageHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", },
    storageKey: { fontSize: 11, lineHeight: 19, color: theme.textMuted, backgroundColor: theme.cardAlt, borderRadius: 7, padding: 12, },
    deleteContext: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 9, backgroundColor: theme.screen, },
  });
}
