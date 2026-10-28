import { Check, CheckCircle2, CircleAlert, X } from "lucide-react-native";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { adminStyleSheet, useAdminTheme } from "../admin-design";

export type RagOperationFeedback = {
  status: "loading" | "success" | "error";
  title: string;
  message: string;
  documentTitle?: string;
  details?: string;
  steps?: readonly string[];
  activeStep?: number;
};

export function RagOperationDialog({ feedback, onClose }: {
  feedback: RagOperationFeedback | null;
  onClose: () => void;
}) {
  const theme = useAdminTheme();
  const styles = adminStyleSheet({
    overlay: { flex: 1, backgroundColor: theme.overlayStrong, alignItems: "center", justifyContent: "center", padding: 20 },
    card: { width: "100%", maxWidth: 460, maxHeight: "90%", borderRadius: 16, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, overflow: "hidden" },
    content: { padding: 28, gap: 18 },
    heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    icon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: theme.cardAlt },
    close: { padding: 8, borderRadius: 8 },
    copy: { gap: 8 },
    title: { color: theme.text, fontSize: 20, fontWeight: "600", lineHeight: 28 },
    message: { color: theme.textMuted, fontSize: 14, lineHeight: 22 },
    document: { color: theme.text, fontSize: 13, fontWeight: "500", lineHeight: 20, backgroundColor: theme.cardAlt, borderRadius: 8, padding: 12 },
    steps: { gap: 16, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 18 },
    step: { flexDirection: "row", alignItems: "center", gap: 12 },
    stepIcon: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
    pending: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.borderStrong },
    stepText: { color: theme.textMuted, fontSize: 13, lineHeight: 20, flex: 1 },
    activeText: { color: theme.text, fontWeight: "500" },
    details: { color: theme.textMuted, fontSize: 13, lineHeight: 21, backgroundColor: theme.cardAlt, borderRadius: 8, padding: 14 },
    footer: { paddingHorizontal: 28, paddingBottom: 24 },
    button: { backgroundColor: theme.primary, borderRadius: 8, paddingVertical: 13, alignItems: "center" },
    buttonText: { color: theme.textInverse, fontSize: 14, fontWeight: "600" },
    waiting: { color: theme.textMuted, fontSize: 12, lineHeight: 19, textAlign: "center" },
    hovered: { opacity: 0.85 },
  });

  if (!feedback) return null;
  const loading = feedback.status === "loading";
  const color = feedback.status === "error" ? theme.dangerText : theme.primary;
  const close = () => { if (!loading) onClose(); };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content} bounces={false}>
            <View style={styles.heading}>
              <View style={styles.icon}>
                {loading ? <ActivityIndicator size="large" color={color} />
                  : feedback.status === "success" ? <CheckCircle2 size={30} color={color} strokeWidth={1.8} />
                    : <CircleAlert size={30} color={color} strokeWidth={1.8} />}
              </View>
              {!loading ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" onPress={close}
                  style={({ hovered }) => [styles.close, hovered && styles.hovered]}>
                  <X size={20} color={theme.textMuted} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.copy} accessibilityLiveRegion={feedback.status === "error" ? "assertive" : "polite"}>
              <Text accessibilityRole="header" style={styles.title}>{feedback.title}</Text>
              <Text style={styles.message}>{feedback.message}</Text>
            </View>
            {feedback.documentTitle ? <Text numberOfLines={3} style={styles.document}>{feedback.documentTitle}</Text> : null}
            {loading && feedback.steps ? (
              <View style={styles.steps}>
                {feedback.steps.map((step, index) => (
                  <View key={step} style={styles.step}>
                    <View style={styles.stepIcon}>
                      {index < (feedback.activeStep ?? 0) ? <Check size={18} color={theme.primary} />
                        : index === (feedback.activeStep ?? 0) ? <ActivityIndicator size="small" color={theme.primary} />
                          : <View style={styles.pending} />}
                    </View>
                    <Text style={[styles.stepText, index === feedback.activeStep && styles.activeText]}>{step}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {feedback.details ? <Text selectable style={styles.details}>{feedback.details}</Text> : null}
          </ScrollView>
          <View style={styles.footer}>
            {loading ? <Text style={styles.waiting}>Vui lòng chờ hoàn tất. Quá trình xử lý có thể mất vài phút.</Text> : (
              <Pressable accessibilityRole="button" onPress={close} style={({ hovered, pressed }) => [styles.button, (hovered || pressed) && styles.hovered]}>
                <Text style={styles.buttonText}>{feedback.status === "success" ? "Hoàn tất" : "Đã hiểu"}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
