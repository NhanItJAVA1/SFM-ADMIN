import { MoreVertical, Trash2 } from "lucide-react-native";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import type { RagDocument } from "@/api/ragDocumentsApi";
import { useAdminTheme } from "@/components/admin/admin-design";
import { navigateAdmin } from "@/components/admin/admin-navigation";
import { useAdminStyles } from "@/components/admin/admin-page-styles";
import { formatDate } from "@/components/admin/admin-page-shared";
import { FocusedScreenTransition } from "@/components/screen-transition";
import { RagDocumentModals, RagDocumentStatusBadge } from "./rag-document-modals";
import { RagOperationDialog } from "./rag-operation-dialog";
import { useRagDocuments } from "./use-rag-documents";

export function DocumentsPage() {
  const theme = useAdminTheme();
  const styles = useAdminStyles();
  const view = "documents";
  const rag = useRagDocuments();

  return <>
    <FocusedScreenTransition style={styles.screen} triggerKey={view} variant="fade">
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigateAdmin("dashboard")} hitSlop={12}>
            <Text style={styles.backText}>‹ Admin</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Tài liệu RAG</Text>
          <Pressable style={styles.addButton} onPress={rag.openUpload}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.documentContent}
          refreshControl={
            <RefreshControl
              refreshing={rag.refreshing}
              onRefresh={() => rag.reload({ refresh: true })}
              tintColor={theme.primary}
            />
          }
        >
          {rag.loadWarning && !rag.loading ? (
            <View style={styles.loadWarningCard} accessibilityLiveRegion="polite">
              <Text style={styles.loadWarningText}>{rag.loadWarning}</Text>
              <Pressable accessibilityRole="button" style={styles.fullSaveButton} disabled={rag.refreshing}
                onPress={() => void rag.reload({ refresh: true, silent: true })}>
                <Text style={styles.fullSaveButtonText}>{rag.refreshing ? "Đang tải lại…" : "Thử tải lại"}</Text>
              </Pressable>
            </View>
          ) : null}
          {rag.loading || rag.refreshing ? (
            <View style={styles.loadingCard} accessibilityLiveRegion="polite">
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.loadingText}>{rag.loading ? "Đang tải tài liệu…" : "Đang làm mới danh sách…"}</Text>
            </View>
          ) : null}
          {rag.loading || (rag.refreshing && rag.documents.length === 0) ? null : rag.documents.length === 0 ? (rag.loadWarning ? null : (
            <View style={styles.emptyDocumentCard}>
              <Text style={styles.emptyDocumentTitle}>Chưa có tài liệu</Text>
              <Text style={styles.emptyDocumentText}>Upload tài liệu đầu tiên để tạo nguồn dữ liệu RAG.</Text>
              <Pressable style={styles.fullSaveButton} onPress={rag.openUpload}>
                <Text style={styles.fullSaveButtonText}>Upload tài liệu</Text>
              </Pressable>
            </View>
          )) : (
            rag.documents.map((document) => (
              <RagDocumentRow
                key={document.id}
                document={document}
                isProcessing={rag.processingDocumentId === document.id || document.status === "Processing"}
                onDelete={() => rag.requestDelete(document)}
                onMore={() => rag.openMenu(document)}
              />
            ))
          )}
        </ScrollView>

      </View>
    </FocusedScreenTransition>
    <RagDocumentModals controller={rag} />
    <RagOperationDialog feedback={rag.feedback} onClose={rag.closeFeedback} />
  </>;
}

function RagDocumentRow({
  document,
  isProcessing,
  onDelete,
  onMore,
}: {
  document: RagDocument;
  isProcessing: boolean;
  onDelete: () => void;
  onMore: () => void;
}) {
  const theme = useAdminTheme();
  const styles = useAdminStyles();

  return (
    <View style={styles.documentListCard}>
      <View style={styles.documentListMain}>
        <View style={styles.documentTopRow}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{document.title}</Text>
            <Text style={styles.rowSubtitle}>
              {document.fileName} · v{document.version} · {document.chunkCount} chunks
            </Text>
          </View>
          <RagDocumentStatusBadge document={document} />
        </View>

        <Text numberOfLines={2} style={styles.documentDescription}>
          {document.description || "Không có mô tả"}
        </Text>
        <View style={styles.documentMetaRow}>
          <Text style={styles.documentMetaText}>{document.ragCategory ?? "General"}</Text>
          <Text style={styles.documentMetaText}>{document.fileType}</Text>
          <Text style={styles.documentMetaText}>{formatDate(document.updatedAt ?? document.createdAt)}</Text>
        </View>
        {document.errorMessage ? <Text style={styles.documentError}>{document.errorMessage}</Text> : null}
      </View>

      <View style={styles.documentActionRail}>
        <Pressable
          accessibilityLabel="Xóa tài liệu"
          style={[styles.documentIconDeleteButton, isProcessing && styles.disabledText]}
          onPress={onDelete}
          disabled={isProcessing}
        >
          <Trash2 color={theme.dangerText} size={18} strokeWidth={2.4} />
        </Pressable>
        <Pressable
          accessibilityLabel="Mở thêm thao tác tài liệu"
          style={styles.documentIconButton}
          onPress={onMore}
          disabled={isProcessing}
        >
          <MoreVertical color={theme.primary} size={18} strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}
