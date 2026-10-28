import { Eye, Pencil, RotateCw, Trash2 } from "lucide-react-native";
import type { ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import type { RagDocument } from "@/api/ragDocumentsApi";
import { useAdminTheme, type AdminTheme } from "@/components/admin/admin-design";
import { useAdminStyles } from "@/components/admin/admin-page-styles";
import { InfoRow, formatDate } from "@/components/admin/admin-page-shared";
import { BottomPopup, BottomPopupSheet } from "@/components/bottom-popup";
import type { RagDocumentsController, RagMetadataFormState, RagUploadFormState } from "./use-rag-documents";

function RagDeleteConfirmationModal({ document, onClose, onConfirm }: {
  document: RagDocument | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const theme = useAdminTheme();
  const styles = useAdminStyles();
  return (
    <BottomPopup transparent visible={document !== null} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <BottomPopupSheet style={styles.categoryFormSheet}>
          <View style={styles.formHeader}>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={10}><Text style={styles.formClose}>Hủy</Text></Pressable>
            <Text style={styles.formTitle}>Xóa tài liệu RAG?</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.formBody}>
            <Text style={styles.rowTitle}>{document?.title}</Text>
            <Text style={styles.documentDescription}>Tài liệu, tệp gốc và dữ liệu tra cứu liên quan sẽ bị xóa. Thao tác này không thể hoàn tác.</Text>
            <Pressable accessibilityRole="button" onPress={onConfirm} style={[styles.fullSaveButton, { backgroundColor: theme.danger }]}>
              <Text style={[styles.fullSaveButtonText, { color: "#ffffff" }]}>Xóa tài liệu</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.documentActionButton}>
              <Text style={styles.documentActionText}>Giữ lại tài liệu</Text>
            </Pressable>
          </View>
        </BottomPopupSheet>
      </View>
    </BottomPopup>
  );
}

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

export function RagDocumentModals({ controller }: { controller: RagDocumentsController }) {
  const theme = useAdminTheme();
  return <>
    <RagUploadModal {...controller.upload} theme={theme} />
    <RagActionMenuModal {...controller.menu} />
    <RagDetailModal {...controller.detail} />
    <RagMetadataModal {...controller.metadata} theme={theme} />
    <RagDeleteConfirmationModal {...controller.deleteConfirmation} />
  </>;
}

// Keep the status label consistent between the document list and detail dialog.
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
  isProcessing,
  onClose,
  onDelete,
  onDetail,
  onEdit,
  onReindex,
}: {
  document: RagDocument | null;
  isProcessing: boolean;
  onClose: () => void;
  onDelete: () => void;
  onDetail: () => void;
  onEdit: () => void;
  onReindex: () => void;
}) {
  const theme = useAdminTheme();
  const styles = useAdminStyles();
  const statusLabel = document ? getRagDocumentStatusLabel(document) : "";
  const canReindex = statusLabel.toLowerCase() !== "draft";

  return (
    <BottomPopup animationType="fade" transparent visible={Boolean(document)} onRequestClose={onClose}>
      <View style={styles.actionMenuOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <BottomPopupSheet style={styles.actionMenuSheet}>
          <Text numberOfLines={1} style={styles.actionMenuTitle}>
            {document?.title ?? "Tài liệu RAG"}
          </Text>
          <ActionMenuItem
            icon={<Eye color={theme.primary} size={18} strokeWidth={2.4} />}
            label="Xem chi tiết"
            onPress={onDetail}
          />
          <ActionMenuItem
            disabled={!canReindex || isProcessing}
            icon={
              isProcessing ? (
                <ActivityIndicator color={theme.primary} size="small" />
              ) : (
                <RotateCw color={theme.primary} size={18} strokeWidth={2.4} />
              )
            }
            label="Reindex"
            onPress={onReindex}
          />
          <ActionMenuItem
            disabled={isProcessing}
            icon={<Pencil color={theme.primary} size={18} strokeWidth={2.4} />}
            label="Sửa metadata"
            onPress={onEdit}
          />
          <ActionMenuItem
            danger
            disabled={isProcessing}
            icon={<Trash2 color={theme.dangerText} size={18} strokeWidth={2.4} />}
            label="Xóa"
            onPress={onDelete}
          />
        </BottomPopupSheet>
      </View>
    </BottomPopup>
  );
}

function ActionMenuItem({
  danger = false,
  disabled = false,
  icon,
  label,
  onPress,
}: {
  danger?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onPress: () => void;
}) {
  const styles = useAdminStyles();

  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionMenuItem, disabled && styles.disabledText]}
    >
      <View style={styles.actionMenuIcon}>{icon}</View>
      <Text style={[styles.actionMenuLabel, danger && styles.actionMenuDangerLabel]}>{label}</Text>
    </Pressable>
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
}: {
  document: RagDocument | null;
  isLoading: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onReindex: () => void;
  visible: boolean;
}) {
  const styles = useAdminStyles();
  const statusLabel = document ? getRagDocumentStatusLabel(document) : "";
  const canReindex = statusLabel.toLowerCase() !== "draft";

  return (
    <BottomPopup animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <BottomPopupSheet style={styles.categoryFormSheet}>
          <View style={styles.formHeader}>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.formClose}>Đóng</Text>
            </Pressable>
            <Text style={styles.formTitle}>Chi tiết RAG</Text>
            <View style={styles.headerSpacer} />
          </View>

          {isLoading && !document ? (
            <View style={styles.detailLoadingState}>
              <ActivityIndicator />
            </View>
          ) : document ? (
            <ScrollView contentContainerStyle={styles.detailContent}>
              {isLoading ? (
                <View style={styles.loadingCard} accessibilityLiveRegion="polite">
                  <ActivityIndicator />
                  <Text style={styles.loadingText}>Đang tải chi tiết mới nhất…</Text>
                </View>
              ) : null}
              <View style={styles.documentCard}>
                <View style={styles.documentTopRow}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{document.title}</Text>
                    <Text style={styles.rowSubtitle}>{document.fileName}</Text>
                  </View>
                  <RagDocumentStatusBadge document={document} />
                </View>
                <Text style={styles.documentDescription}>{document.description || "Không có mô tả"}</Text>
                {document.errorMessage ? <Text style={styles.documentError}>{document.errorMessage}</Text> : null}
              </View>

              <View style={styles.infoCard}>
                <InfoRow label="ID" value={String(document.id)} />
                <InfoRow label="S3 Key" value={document.s3Key} />
                <InfoRow label="File type" value={document.fileType} />
                <InfoRow label="RAG category" value={document.ragCategory ?? "General"} />
                <InfoRow label="Version" value={String(document.version)} />
                <InfoRow label="Chunk count" value={String(document.chunkCount)} />
                <InfoRow label="Created by" value={String(document.createdBy)} />
                <InfoRow label="Ngày tạo" value={formatDate(document.createdAt)} />
                <InfoRow label="Cập nhật" value={formatDate(document.updatedAt)} />
              </View>

              <View style={styles.documentActions}>
                <Pressable
                  style={[styles.documentActionButton, (!canReindex || isProcessing) && styles.disabledText]}
                  onPress={onReindex}
                  disabled={!canReindex || isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Text style={styles.documentActionText}>Reindex</Text>
                  )}
                </Pressable>
                <Pressable style={styles.documentActionButton} onPress={onEdit} disabled={isProcessing}>
                  <Text style={styles.documentActionText}>Sửa metadata</Text>
                </Pressable>
                <Pressable style={styles.documentDeleteButton} onPress={onDelete} disabled={isProcessing}>
                  <Text style={styles.documentDeleteText}>Xóa</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : null}
        </BottomPopupSheet>
      </View>
    </BottomPopup>
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
}: {
  form: RagUploadFormState;
  isUploading: boolean;
  onChange: (form: RagUploadFormState) => void;
  onClose: () => void;
  onPickFile: () => void;
  onSubmit: () => void;
  theme: AdminTheme;
  visible: boolean;
}) {
  const styles = useAdminStyles();

  return (
    <BottomPopup animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", default: undefined })}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <BottomPopupSheet style={styles.categoryFormSheet}>
          <View style={styles.formHeader}>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.formClose}>Hủy</Text>
            </Pressable>
            <Text style={styles.formTitle}>Upload tài liệu RAG</Text>
            <Pressable onPress={onSubmit} disabled={isUploading} hitSlop={10}>
              <Text style={[styles.formSave, isUploading && styles.disabledText]}>Lưu</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.formBody}>
            <Pressable style={styles.filePickerButton} onPress={onPickFile} disabled={isUploading}>
              <Text style={styles.filePickerTitle}>{form.asset ? form.asset.name : "Chọn file tài liệu"}</Text>
              <Text style={styles.filePickerSubtitle}>
                {form.asset ? `${formatFileSize(form.asset.size)} · ${form.fileType}` : ".txt, .md, .pdf hoặc .docx"}
              </Text>
            </Pressable>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Tiêu đề</Text>
              <TextInput
                editable={!isUploading}
                onChangeText={(title) => onChange({ ...form, title })}
                placeholder="Tiết kiệm và lãi suất"
                placeholderTextColor={theme.inputPlaceholder}
                style={styles.formInput}
                value={form.title}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Mô tả</Text>
              <TextInput
                editable={!isUploading}
                multiline
                onChangeText={(description) => onChange({ ...form, description })}
                placeholder="File tài liệu kiến thức tài chính"
                placeholderTextColor={theme.inputPlaceholder}
                style={[styles.formInput, styles.multilineInput]}
                value={form.description}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>RAG category</Text>
              <TextInput
                autoCapitalize="none"
                editable={!isUploading}
                onChangeText={(ragCategory) => onChange({ ...form, ragCategory })}
                placeholder="General"
                placeholderTextColor={theme.inputPlaceholder}
                style={styles.formInput}
                value={form.ragCategory}
              />
            </View>

            <Pressable
              style={[styles.fullSaveButton, isUploading && styles.disabledText]}
              onPress={onSubmit}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color={theme.textInverse} />
              ) : (
                <Text style={styles.fullSaveButtonText}>Upload và index</Text>
              )}
            </Pressable>
          </ScrollView>
        </BottomPopupSheet>
      </KeyboardAvoidingView>
    </BottomPopup>
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
}: {
  form: RagMetadataFormState;
  isSaving: boolean;
  onChange: (form: RagMetadataFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  theme: AdminTheme;
  visible: boolean;
}) {
  const styles = useAdminStyles();

  return (
    <BottomPopup animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", default: undefined })}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <BottomPopupSheet style={styles.categoryFormSheet}>
          <View style={styles.formHeader}>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.formClose}>Hủy</Text>
            </Pressable>
            <Text style={styles.formTitle}>Sửa metadata</Text>
            <Pressable onPress={onSubmit} disabled={isSaving} hitSlop={10}>
              <Text style={[styles.formSave, isSaving && styles.disabledText]}>Lưu</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Tiêu đề</Text>
              <TextInput
                editable={!isSaving}
                onChangeText={(title) => onChange({ ...form, title })}
                placeholder="Tiêu đề tài liệu"
                placeholderTextColor={theme.inputPlaceholder}
                style={styles.formInput}
                value={form.title}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Mô tả</Text>
              <TextInput
                editable={!isSaving}
                multiline
                onChangeText={(description) => onChange({ ...form, description })}
                placeholder="Mô tả tài liệu"
                placeholderTextColor={theme.inputPlaceholder}
                style={[styles.formInput, styles.multilineInput]}
                value={form.description}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>RAG category</Text>
              <TextInput
                autoCapitalize="none"
                editable={!isSaving}
                onChangeText={(ragCategory) => onChange({ ...form, ragCategory })}
                placeholder="General"
                placeholderTextColor={theme.inputPlaceholder}
                style={styles.formInput}
                value={form.ragCategory}
              />
            </View>
            <Pressable style={[styles.fullSaveButton, isSaving && styles.disabledText]} onPress={onSubmit} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color={theme.textInverse} />
              ) : (
                <Text style={styles.fullSaveButtonText}>Lưu metadata</Text>
              )}
            </Pressable>
          </ScrollView>
        </BottomPopupSheet>
      </KeyboardAvoidingView>
    </BottomPopup>
  );
}
