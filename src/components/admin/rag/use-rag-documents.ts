import * as DocumentPicker from "expo-document-picker";
import { useEffect, useRef, useState } from "react";

import { RAG_DOCUMENT_UPLOAD_CONTENT_TYPE, ragDocumentsApi, type RagDocument } from "@/api/ragDocumentsApi";
import { getRequestErrorMessage } from "@/components/admin/admin-page-shared";
import { useAdminPageActive, useAdminResource } from "@/hooks/use-admin-resource";
import type { RagOperationFeedback } from "./rag-operation-dialog";

export type RagUploadFormState = {
  title: string;
  description: string;
  fileName: string;
  fileType: string;
  ragCategory: string;
  asset: DocumentPicker.DocumentPickerAsset | null;
};

export type RagMetadataFormState = {
  title: string;
  description: string;
  ragCategory: string;
};
const emptyRagUploadForm: RagUploadFormState = {
  asset: null,
  description: "",
  fileName: "",
  fileType: "",
  ragCategory: "General",
  title: "",
};

const emptyRagMetadataForm: RagMetadataFormState = {
  description: "",
  ragCategory: "General",
  title: "",
};

const supportedRagFileExtensions = new Set(["txt", "md", "pdf", "docx"]);

const ragUploadSteps = ["Tạo tài liệu", "Tải tệp lên", "Lập chỉ mục"] as const;

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.trim().toLowerCase();

  return extension && extension !== fileName.toLowerCase() ? extension : "txt";
}

function isSupportedRagFileType(fileType: string) {
  return supportedRagFileExtensions.has(fileType.toLowerCase());
}

async function fetchDocuments(signal: AbortSignal) { return (await ragDocumentsApi.list(signal)).data; }

/** Owns RAG state and operations so the page and dialogs stay presentational. */
export function useRagDocuments() {
  const pageActive = useAdminPageActive();

  const { data: ragDocuments, setData: setRagDocuments, loading: isLoading, refreshing: isRefreshing, error: loadError, reload: loadDocuments } =
    useAdminResource(fetchDocuments, [] as RagDocument[]);

  const ragLoadWarning = loadError ? "Không tải được tài liệu RAG: " + loadError : undefined;

  const [selectedRagDocument, setSelectedRagDocument] = useState<RagDocument | null>(null);

  const [actionMenuRagDocument, setActionMenuRagDocument] = useState<RagDocument | null>(null);

  const [editingRagDocument, setEditingRagDocument] = useState<RagDocument | null>(null);

  const [ragUploadForm, setRagUploadForm] = useState<RagUploadFormState>(emptyRagUploadForm);

  const [ragMetadataForm, setRagMetadataForm] = useState<RagMetadataFormState>(emptyRagMetadataForm);

  const [isRagDetailVisible, setIsRagDetailVisible] = useState(false);

  const [isRagUploadVisible, setIsRagUploadVisible] = useState(false);

  const [isRagMetadataVisible, setIsRagMetadataVisible] = useState(false);

  const [isLoadingRagDetail, setIsLoadingRagDetail] = useState(false);

  const [isUploadingRagDocument, setIsUploadingRagDocument] = useState(false);

  const [isSavingRagMetadata, setIsSavingRagMetadata] = useState(false);

  const [processingDocumentId, setProcessingDocumentId] = useState<number | null>(null);

  const [ragFeedback, setRagFeedback] = useState<RagOperationFeedback | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<RagDocument | null>(null);

  const ragOperationInFlightRef = useRef(false);

  const ragMetadataOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (ragMetadataOpenTimerRef.current) clearTimeout(ragMetadataOpenTimerRef.current); }, []);

  function openRagUpload() {
    setRagUploadForm(emptyRagUploadForm);
    setIsRagUploadVisible(true);
  }

  async function pickRagDocumentFile() {
    let result: DocumentPicker.DocumentPickerResult;
    try {
      result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: "*/*",
      });
    } catch (error) {
      setRagFeedback({ status: "error", title: "Không mở được tệp", message: "Vui lòng chọn lại tài liệu.", details: getRequestErrorMessage(error) });
      return;
    }

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const fileType = getFileExtension(asset.name);

    if (!isSupportedRagFileType(fileType)) {
      setRagFeedback({ status: "error", title: "Định dạng chưa hỗ trợ", message: "Vui lòng chọn tài liệu .txt, .md, .pdf hoặc .docx." });
      return;
    }

    const title = ragUploadForm.title.trim() || asset.name.replace(/\.[^/.]+$/, "");

    setRagUploadForm((current) => ({
      ...current,
      asset,
      fileName: asset.name,
      fileType,
      title,
    }));
  }

  async function uploadRagDocument() {
    if (ragOperationInFlightRef.current) return;
    const title = ragUploadForm.title.trim();
    const description = ragUploadForm.description.trim();
    const ragCategory = ragUploadForm.ragCategory.trim() || "General";
    const asset = ragUploadForm.asset;
    const fileType = ragUploadForm.fileType || (asset ? getFileExtension(asset.name) : "");
    let createdDocumentId: number | null = null;

    if (!asset) {
      setRagFeedback({ status: "error", title: "Chưa chọn tệp", message: "Vui lòng chọn tài liệu cần tải lên." });
      return;
    }

    if (!title) {
      setRagFeedback({ status: "error", title: "Thiếu tiêu đề", message: "Vui lòng nhập tiêu đề tài liệu." });
      return;
    }

    if (!isSupportedRagFileType(fileType)) {
      setRagFeedback({ status: "error", title: "Định dạng chưa hỗ trợ", message: "Vui lòng chọn tài liệu .txt, .md, .pdf hoặc .docx." });
      return;
    }

    try {
      ragOperationInFlightRef.current = true;
      setIsUploadingRagDocument(true);
      setRagFeedback({ status: "loading", title: "Đang tạo tài liệu", message: "Đang chuẩn bị tải tài liệu lên kho tri thức.", documentTitle: title, steps: ragUploadSteps, activeStep: 0 });
      const uploadUrlResponse = await ragDocumentsApi.createUploadUrl({
        contentType: RAG_DOCUMENT_UPLOAD_CONTENT_TYPE,
        description: description || null,
        fileName: ragUploadForm.fileName || asset.name,
        fileType,
        ragCategory: ragCategory || null,
        title,
      });

      createdDocumentId = uploadUrlResponse.data.documentId;

      setRagFeedback({ status: "loading", title: "Đang tải tệp lên", message: "Đang tải nội dung tài liệu. Vui lòng giữ trang mở.", documentTitle: title, steps: ragUploadSteps, activeStep: 1 });
      await ragDocumentsApi.uploadFileToPresignedUrl(uploadUrlResponse.data.uploadUrl, asset.uri, asset.file ?? null);
      setRagFeedback({ status: "loading", title: "Đang lập chỉ mục", message: "Đang xử lý tài liệu để sẵn sàng tra cứu trong kho tri thức.", documentTitle: title, steps: ragUploadSteps, activeStep: 2 });
      await ragDocumentsApi.confirm(createdDocumentId);
      setIsRagUploadVisible(false);
      setRagUploadForm(emptyRagUploadForm);
      setRagFeedback({ status: "success", title: "Tải lên thành công", message: "Tài liệu đã được tải lên và lập chỉ mục, sẵn sàng sử dụng trong kho tri thức.", documentTitle: title });
      void loadDocuments({ refresh: true, silent: true });
    } catch (error) {
      if (createdDocumentId !== null) {
        setIsRagUploadVisible(false);
        void loadDocuments({ refresh: true, silent: true });
      }

      setRagFeedback({
        status: "error", title: createdDocumentId === null ? "Không tạo được tài liệu" : "Chưa hoàn tất tải lên",
        message: createdDocumentId === null ? "Vui lòng kiểm tra thông tin và thử lại." : "Bản ghi tài liệu đã được tạo. Hãy kiểm tra trạng thái trong danh sách trước khi tải lại.",
        documentTitle: title, details: getRequestErrorMessage(error)
      });
    } finally {
      setIsUploadingRagDocument(false);
      ragOperationInFlightRef.current = false;
    }
  }

  function openEditRagMetadata(document: RagDocument) {
    setEditingRagDocument(document);
    setRagMetadataForm({
      description: document.description ?? "",
      ragCategory: document.ragCategory ?? "General",
      title: document.title,
    });
    setIsRagMetadataVisible(true);
  }

  function queueOpenEditRagMetadata(document: RagDocument, { closeDetail = false } = {}) {
    if (ragMetadataOpenTimerRef.current) {
      clearTimeout(ragMetadataOpenTimerRef.current);
    }

    setActionMenuRagDocument(null);

    if (closeDetail) {
      setIsRagDetailVisible(false);
    }

    ragMetadataOpenTimerRef.current = setTimeout(() => {
      ragMetadataOpenTimerRef.current = null;
      openEditRagMetadata(document);
    }, 250);
  }

  async function saveRagMetadata() {
    if (!editingRagDocument || ragOperationInFlightRef.current) {
      return;
    }

    const title = ragMetadataForm.title.trim();
    const description = ragMetadataForm.description.trim();
    const ragCategory = ragMetadataForm.ragCategory.trim() || "General";

    if (!title) {
      setRagFeedback({ status: "error", title: "Thiếu tiêu đề", message: "Vui lòng nhập tiêu đề tài liệu." });
      return;
    }

    try {
      ragOperationInFlightRef.current = true;
      setIsSavingRagMetadata(true);
      setRagFeedback({ status: "loading", title: "Đang lưu thay đổi", message: "Đang cập nhật thông tin tài liệu trong kho tri thức.", documentTitle: title });
      await ragDocumentsApi.updateMetadata(editingRagDocument.id, {
        description,
        ragCategory,
        title,
      });
      // Lưu thành công vẫn là thành công nếu request tải lại chi tiết gặp lỗi.
      let refreshWarning: string | undefined;
      let updatedDocument: RagDocument = { ...editingRagDocument, title, description, ragCategory };
      try {
        updatedDocument = (await ragDocumentsApi.get(editingRagDocument.id)).data;
      } catch {
        refreshWarning = "Thay đổi đã được lưu nhưng chưa tải lại được chi tiết. Bạn có thể làm mới danh sách sau khi đóng thông báo.";
      }
      setRagDocuments((current) =>
        (current ?? []).map((document) => (document.id === editingRagDocument.id ? updatedDocument : document)),
      );
      setSelectedRagDocument((current) => (current?.id === editingRagDocument.id ? updatedDocument : current));
      setIsRagMetadataVisible(false);
      setEditingRagDocument(null);
      setRagMetadataForm(emptyRagMetadataForm);
      setRagFeedback({ status: "success", title: "Đã lưu thay đổi", message: "Thông tin tài liệu đã được cập nhật.", documentTitle: title, details: refreshWarning });
    } catch (error) {
      setRagFeedback({ status: "error", title: "Không lưu được thay đổi", message: "Vui lòng kiểm tra thông báo lỗi và thử lại.", documentTitle: title, details: getRequestErrorMessage(error) });
    } finally {
      setIsSavingRagMetadata(false);
      ragOperationInFlightRef.current = false;
    }
  }

  function requestDeleteRagDocument(document: RagDocument) {
    if (ragOperationInFlightRef.current) return;
    setActionMenuRagDocument(null);
    if (document.status === "Processing") {
      setRagFeedback({ status: "error", title: "Tài liệu đang được xử lý", message: "Vui lòng chờ quá trình lập chỉ mục hoàn tất trước khi xóa.", documentTitle: document.title });
      return;
    }
    setDocumentToDelete(document);
  }

  async function deleteRagDocument(document: RagDocument) {
    if (ragOperationInFlightRef.current) return;
    try {
      ragOperationInFlightRef.current = true;
      setProcessingDocumentId(document.id);
      setIsRagDetailVisible(false);
      setRagFeedback({ status: "loading", title: "Đang xóa tài liệu", message: "Đang xóa tài liệu và dữ liệu liên quan khỏi kho tri thức.", documentTitle: document.title });
      await ragDocumentsApi.remove(document.id);
      setRagDocuments((current) => (current ?? []).filter((item) => item.id !== document.id));
      if (selectedRagDocument?.id === document.id) {
        setSelectedRagDocument(null);
        setIsRagDetailVisible(false);
      }
      setRagFeedback({ status: "success", title: "Đã xóa tài liệu", message: "Tài liệu, tệp gốc và dữ liệu tra cứu liên quan đã được xóa.", documentTitle: document.title });
    } catch (error) {
      setRagFeedback({ status: "error", title: "Yêu cầu xóa chưa hoàn tất", message: "Vui lòng kiểm tra thông báo lỗi và thử xóa lại. Danh sách đang được cập nhật theo trạng thái mới nhất.", documentTitle: document.title, details: getRequestErrorMessage(error) });
      void loadDocuments({ refresh: true, silent: true });
    } finally {
      setProcessingDocumentId(null);
      ragOperationInFlightRef.current = false;
    }
  }

  async function openRagDocumentDetail(document: RagDocument) {
    try {
      setSelectedRagDocument(document);
      setIsRagDetailVisible(true);
      setIsLoadingRagDetail(true);
      const response = await ragDocumentsApi.get(document.id);

      setSelectedRagDocument(response.data);
      setRagDocuments((current) =>
        (current ?? []).map((item) => (item.id === document.id ? response.data : item)),
      );
    } catch (error) {
      setRagFeedback({ status: "error", title: "Không tải được tài liệu", message: "Vui lòng thử mở lại chi tiết tài liệu.", documentTitle: document.title, details: getRequestErrorMessage(error) });
    } finally {
      setIsLoadingRagDetail(false);
    }
  }

  async function reindexRagDocument(document: RagDocument) {
    if (ragOperationInFlightRef.current) return;
    try {
      ragOperationInFlightRef.current = true;
      setProcessingDocumentId(document.id);
      setRagFeedback({ status: "loading", title: "Đang lập chỉ mục lại", message: "Đang xử lý lại tài liệu. Bạn sẽ nhận được thông báo khi hoàn tất.", documentTitle: document.title });
      await ragDocumentsApi.reindex(document.id);
      let refreshWarning: string | undefined;
      let updatedDocument: RagDocument = { ...document, status: "Indexed", errorMessage: null };
      try {
        updatedDocument = (await ragDocumentsApi.get(document.id)).data;
      } catch {
        refreshWarning = "Lập chỉ mục đã hoàn tất nhưng chưa tải lại được chi tiết. Hãy làm mới danh sách để xem số liệu mới nhất.";
      }
      setRagDocuments((current) =>
        (current ?? []).map((item) => (item.id === document.id ? updatedDocument : item)),
      );
      setSelectedRagDocument((current) => (current?.id === document.id ? updatedDocument : current));
      setRagFeedback({ status: "success", title: "Lập chỉ mục lại thành công", message: "Tài liệu đã được xử lý lại và sẵn sàng tra cứu.", documentTitle: document.title, details: refreshWarning });
    } catch (error) {
      setRagFeedback({ status: "error", title: "Không lập chỉ mục lại được", message: "Hãy kiểm tra thông báo lỗi và thử lại khi tài liệu sẵn sàng.", documentTitle: document.title, details: getRequestErrorMessage(error) });
      // Lấy lại trạng thái Failed/ErrorMessage mà backend đã lưu sau lỗi index.
      try {
        const response = await ragDocumentsApi.get(document.id);
        setRagDocuments((current) =>
          (current ?? []).map((item) => (item.id === document.id ? response.data : item)),
        );
        setSelectedRagDocument((current) => (current?.id === document.id ? response.data : current));
      } catch {
        // Giữ nguyên lỗi reindex để hiển thị nếu request làm mới cũng thất bại.
      }
    } finally {
      setProcessingDocumentId(null);
      ragOperationInFlightRef.current = false;
    }
  }
  return {
    documents: ragDocuments,
    loading: isLoading,
    refreshing: isRefreshing,
    loadWarning: ragLoadWarning,
    reload: loadDocuments,
    processingDocumentId,
    openUpload: openRagUpload,
    openMenu: setActionMenuRagDocument,
    requestDelete: requestDeleteRagDocument,
    feedback: pageActive ? ragFeedback : null,
    closeFeedback: () => setRagFeedback(current => current?.status === "loading" ? current : null),
    deleteConfirmation: {
      document: pageActive ? documentToDelete : null,
      onClose: () => setDocumentToDelete(null),
      onConfirm: () => {
        if (!documentToDelete || ragOperationInFlightRef.current) return;
        const document = documentToDelete;
        setDocumentToDelete(null);
        void deleteRagDocument(document);
      },
    },
    upload: {
      form: ragUploadForm,
      isUploading: isUploadingRagDocument,
      onChange: setRagUploadForm,
      onClose: () => {
        if (!isUploadingRagDocument) {
          setIsRagUploadVisible(false);
        }
      },
      onPickFile: pickRagDocumentFile,
      onSubmit: uploadRagDocument,
      visible: pageActive && isRagUploadVisible
    },
    menu: {
      document: pageActive ? actionMenuRagDocument : null,
      isProcessing: actionMenuRagDocument ? processingDocumentId === actionMenuRagDocument.id || actionMenuRagDocument.status === "Processing" : false,
      onClose: () => setActionMenuRagDocument(null),
      onDelete: () => {
        if (actionMenuRagDocument) {
          requestDeleteRagDocument(actionMenuRagDocument);
        }
      },
      onDetail: () => {
        if (actionMenuRagDocument) {
          const document = actionMenuRagDocument;

          setActionMenuRagDocument(null);
          void openRagDocumentDetail(document);
        }
      },
      onEdit: () => {
        if (actionMenuRagDocument) {
          queueOpenEditRagMetadata(actionMenuRagDocument);
        }
      },
      onReindex: () => {
        if (actionMenuRagDocument) {
          const document = actionMenuRagDocument;

          setActionMenuRagDocument(null);
          void reindexRagDocument(document);
        }
      }
    },
    detail: {
      document: selectedRagDocument,
      isLoading: isLoadingRagDetail,
      isProcessing: selectedRagDocument ? processingDocumentId === selectedRagDocument.id || selectedRagDocument.status === "Processing" : false,
      onClose: () => {
        setIsRagDetailVisible(false);
        setSelectedRagDocument(null);
      },
      onDelete: () => {
        if (selectedRagDocument) {
          requestDeleteRagDocument(selectedRagDocument);
        }
      },
      onEdit: () => {
        if (selectedRagDocument) {
          queueOpenEditRagMetadata(selectedRagDocument, { closeDetail: true });
        }
      },
      onReindex: () => {
        if (selectedRagDocument) {
          void reindexRagDocument(selectedRagDocument);
        }
      },
      visible: pageActive && isRagDetailVisible
    },
    metadata: {
      form: ragMetadataForm,
      isSaving: isSavingRagMetadata,
      onChange: setRagMetadataForm,
      onClose: () => {
        if (!isSavingRagMetadata) {
          setIsRagMetadataVisible(false);
          setEditingRagDocument(null);
        }
      },
      onSubmit: saveRagMetadata,
      visible: pageActive && isRagMetadataVisible
    }
  };
}

export type RagDocumentsController = ReturnType<typeof useRagDocuments>;
