import { adminApi } from "@/api/adminApi";
import type { Category, CategoryType } from "@/api/categoriesApi";
import { confirmAdminAction, showAdminMessage, type CategoryIconComponent } from "@/components/admin/admin-page-shared";
import { BottomPopup, BottomPopupSheet } from "@/components/bottom-popup";
import { Banknote, Briefcase, Car, CircleDollarSign, Gamepad2, Gift, GraduationCap, HeartPulse, Home, MoreHorizontal, PiggyBank, Plane, Receipt, ShoppingBag, Utensils, Wallet } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";

import { useAdminTheme, type AdminTheme } from "@/components/admin/admin-design";
import { navigateAdmin } from "@/components/admin/admin-navigation";
import { useAdminStyles } from "@/components/admin/admin-page-styles";
import { FocusedScreenTransition } from "@/components/screen-transition";
import { useAdminPageActive, useAdminResource } from "@/hooks/use-admin-resource";

type CategoryFormState = {
  icon: string;
  name: string;
  type: CategoryType;
};

type CategoryIconOption = {
  Icon: CategoryIconComponent;
  key: string;
  label: string;
};

const emptyCategoryForm: CategoryFormState = {
  icon: "",
  name: "",
  type: "Expense",
};

const categoryIconOptions: CategoryIconOption[] = [
  { Icon: Utensils, key: "food", label: "Ăn uống" },
  { Icon: Car, key: "transport", label: "Di chuyển" },
  { Icon: Home, key: "home", label: "Nhà cửa" },
  { Icon: ShoppingBag, key: "shopping", label: "Mua sắm" },
  { Icon: HeartPulse, key: "health", label: "Sức khỏe" },
  { Icon: GraduationCap, key: "education", label: "Học tập" },
  { Icon: Gamepad2, key: "entertainment", label: "Giải trí" },
  { Icon: Receipt, key: "bill", label: "Hóa đơn" },
  { Icon: Wallet, key: "wallet", label: "Ví tiền" },
  { Icon: Briefcase, key: "work", label: "Công việc" },
  { Icon: Gift, key: "gift", label: "Quà tặng" },
  { Icon: CircleDollarSign, key: "income", label: "Thu nhập" },
  { Icon: PiggyBank, key: "saving", label: "Tiết kiệm" },
  { Icon: Plane, key: "travel", label: "Du lịch" },
  { Icon: Banknote, key: "cash", label: "Tiền mặt" },
  { Icon: MoreHorizontal, key: "other", label: "Khác" },
];

function getCategoryTypeLabel(type: Category["type"]) {
  return type === "Income" ? "Thu nhập" : "Chi tiêu";
}

function getCategoryIconOption(icon: string | null | undefined) {
  if (!icon) {
    return null;
  }

  return categoryIconOptions.find((option) => option.key === icon) ?? null;
}
async function fetchCategories(signal: AbortSignal) { return (await adminApi.listDefaultCategories(signal)).data; }

export function CategoriesPage() {
  const theme = useAdminTheme();
  const styles = useAdminStyles();
  const view = "categories";
  const pageActive = useAdminPageActive();
  const { data: categories, setData: setCategories, loading: isLoading, refreshing: isRefreshing, error: loadError, reload: loadCategories } =
    useAdminResource(fetchCategories, [] as Category[]);
  const defaultCategories = categories;
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [isCategoryFormVisible, setIsCategoryFormVisible] = useState(false);
  const [isCategoryIconPickerVisible, setIsCategoryIconPickerVisible] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  function openAddDefaultCategory() {
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
    setIsCategoryIconPickerVisible(false);
    setIsCategoryFormVisible(true);
  }

  function openEditDefaultCategory(category: Category) {
    setEditingCategory(category);
    setCategoryForm({
      icon: category.icon ?? "",
      name: category.name,
      type: category.type,
    });
    setIsCategoryIconPickerVisible(false);
    setIsCategoryFormVisible(true);
  }

  function closeCategoryForm() {
    if (isSavingCategory) {
      return;
    }

    setIsCategoryFormVisible(false);
    setIsCategoryIconPickerVisible(false);
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
  }

  async function saveDefaultCategory() {
    const name = categoryForm.name.trim();
    const icon = categoryForm.icon.trim() || "other";

    if (!name) {
      showAdminMessage("Thiếu tên danh mục", "Vui lòng nhập tên category mặc định.");
      return;
    }

    try {
      setIsSavingCategory(true);
      const payload = {
        icon,
        isDefault: true,
        name,
        type: categoryForm.type,
      };

      if (editingCategory) {
        const response = await adminApi.updateDefaultCategory(editingCategory.id, payload);
        setCategories((current) =>
          (current ?? []).map((item) => (item.id === response.data.id ? response.data : item)),
        );
      } else {
        const response = await adminApi.createDefaultCategory(payload);
        setCategories((current) =>
          [...(current ?? []), response.data].sort((left, right) => left.name.localeCompare(right.name)),
        );
      }

      setIsCategoryFormVisible(false);
      setEditingCategory(null);
      setCategoryForm(emptyCategoryForm);
    } catch (error) {
      showAdminMessage("Không lưu được category", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
    } finally {
      setIsSavingCategory(false);
    }
  }

  function requestDeleteDefaultCategory(category: Category) {
    confirmAdminAction("Xóa category mặc định", `Bạn có chắc muốn xóa "${category.name}" không?`, () => void deleteDefaultCategory(category), "Xóa", true);
  }

  async function deleteDefaultCategory(category: Category) {
    try {
      await adminApi.deleteDefaultCategory(category.id);
      setCategories((current) => (current ?? []).filter((item) => item.id !== category.id));
    } catch (error) {
      showAdminMessage("Không xóa được category", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
    }
  }
  return <View style={styles.screen}>
    {loadError ? <View style={styles.loadWarningCard}><Text style={styles.loadWarningText}>{loadError}</Text><Pressable onPress={() => void loadCategories({ refresh: true })}><Text style={styles.inlineLinkText}>Thử tải lại</Text></Pressable></View> : null}
    {isLoading ? <View style={styles.loadingCard}><ActivityIndicator color={theme.primary} /><Text style={styles.loadingText}>Đang tải danh mục…</Text></View> : (
      <FocusedScreenTransition style={styles.screen} triggerKey={view} variant="fade">
        <View style={styles.screen}>
          <View style={styles.header}>
            <Pressable onPress={() => navigateAdmin("dashboard")} hitSlop={12}>
              <Text style={styles.backText}>‹ Admin</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Danh mục mặc định</Text>
            <Pressable style={styles.addButton} onPress={openAddDefaultCategory}>
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.categoryContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadCategories({ refresh: true })}
                tintColor={theme.primary}
              />
            }
          >
            {(defaultCategories ?? []).map((category) => (
              <Pressable key={category.id} style={styles.categoryRow} onPress={() => openEditDefaultCategory(category)}>
                <View style={styles.categoryIcon}>
                  <CategoryIconMark icon={category.icon} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{category.name}</Text>
                  <Text style={styles.rowSubtitle}>
                    {getCategoryTypeLabel(category.type)} · {category.icon ?? "no icon"}
                  </Text>
                </View>
                <Pressable
                  style={styles.deleteCategoryButton}
                  onPress={(event) => {
                    event.stopPropagation();
                    requestDeleteDefaultCategory(category);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.deleteCategoryText}>Xóa</Text>
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>

          <CategoryFormModal
            form={categoryForm}
            iconPickerVisible={pageActive && isCategoryIconPickerVisible}
            isSaving={isSavingCategory}
            onChange={setCategoryForm}
            onClose={closeCategoryForm}
            onCloseIconPicker={() => setIsCategoryIconPickerVisible(false)}
            onOpenIconPicker={() => setIsCategoryIconPickerVisible(true)}
            onSelectIcon={(icon) => {
              setCategoryForm((current) => ({ ...current, icon }));
              setIsCategoryIconPickerVisible(false);
            }}
            onSubmit={saveDefaultCategory}
            theme={theme}
            title={editingCategory ? "Sửa category mặc định" : "Thêm category mặc định"}
            visible={pageActive && isCategoryFormVisible}
          />
        </View>
      </FocusedScreenTransition>
    )}
  </View>;
}
function CategoryIconMark({ icon }: { icon: string | null | undefined }) {
  const theme = useAdminTheme();
  const styles = useAdminStyles();
  const iconOption = getCategoryIconOption(icon);

  if (iconOption) {
    const Icon = iconOption.Icon;

    return <Icon color={theme.primary} size={18} strokeWidth={2.4} />;
  }

  return <Text style={styles.categoryIconText}>{icon?.charAt(0).toUpperCase() ?? "C"}</Text>;
}

function CategoryIconPickerContent({
  onSelect,
  selectedIcon,
}: {
  onSelect: (icon: string) => void;
  selectedIcon: string;
}) {
  const theme = useAdminTheme();
  const styles = useAdminStyles();

  return (
    <ScrollView contentContainerStyle={styles.iconPickerContent}>
      <Pressable
        style={[styles.iconPickerOption, !selectedIcon && styles.iconPickerOptionSelected]}
        onPress={() => onSelect("")}
      >
        <View style={styles.iconPickerBubble}>
          <Text style={styles.iconSelectPreviewText}>C</Text>
        </View>
        <Text style={styles.iconPickerLabel}>Mặc định</Text>
      </Pressable>

      {categoryIconOptions.map((option) => {
        const Icon = option.Icon;
        const isSelected = selectedIcon === option.key;

        return (
          <Pressable
            key={option.key}
            style={[styles.iconPickerOption, isSelected && styles.iconPickerOptionSelected]}
            onPress={() => onSelect(option.key)}
          >
            <View style={styles.iconPickerBubble}>
              <Icon color={theme.primary} size={20} strokeWidth={2.4} />
            </View>
            <Text numberOfLines={1} style={styles.iconPickerLabel}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function CategoryFormModal({
  form,
  iconPickerVisible,
  isSaving,
  onChange,
  onClose,
  onCloseIconPicker,
  onOpenIconPicker,
  onSelectIcon,
  onSubmit,
  theme,
  title,
  visible,
}: {
  form: CategoryFormState;
  iconPickerVisible: boolean;
  isSaving: boolean;
  onChange: (form: CategoryFormState) => void;
  onClose: () => void;
  onCloseIconPicker: () => void;
  onOpenIconPicker: () => void;
  onSelectIcon: (icon: string) => void;
  onSubmit: () => void;
  theme: AdminTheme;
  title: string;
  visible: boolean;
}) {
  const styles = useAdminStyles();
  const selectedIconOption = getCategoryIconOption(form.icon);

  return (
    <BottomPopup
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={iconPickerVisible ? onCloseIconPicker : onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", default: undefined })}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={iconPickerVisible ? onCloseIconPicker : onClose} />
        <BottomPopupSheet style={styles.categoryFormSheet}>
          <View style={styles.formHeader}>
            <Pressable onPress={iconPickerVisible ? onCloseIconPicker : onClose} hitSlop={10}>
              <Text style={styles.formClose}>{iconPickerVisible ? "‹ Form" : "Hủy"}</Text>
            </Pressable>
            <Text style={styles.formTitle}>{iconPickerVisible ? "Chọn icon" : title}</Text>
            {iconPickerVisible ? (
              <View style={styles.headerSpacer} />
            ) : (
              <Pressable onPress={onSubmit} disabled={isSaving} hitSlop={10}>
                <Text style={[styles.formSave, isSaving && styles.disabledText]}>Lưu</Text>
              </Pressable>
            )}
          </View>

          {iconPickerVisible ? (
            <CategoryIconPickerContent onSelect={onSelectIcon} selectedIcon={form.icon} />
          ) : (
            <View style={styles.formBody}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Tên category</Text>
                <TextInput
                  editable={!isSaving}
                  onChangeText={(name) => onChange({ ...form, name })}
                  placeholder="Ăn uống"
                  placeholderTextColor={theme.inputPlaceholder}
                  style={styles.formInput}
                  value={form.name}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Loại</Text>
                <View style={styles.typeToggleRow}>
                  {(["Expense", "Income"] as CategoryType[]).map((type) => {
                    const isSelected = form.type === type;

                    return (
                      <Pressable
                        key={type}
                        style={[styles.typeToggle, isSelected && styles.typeToggleSelected]}
                        onPress={() => onChange({ ...form, type })}
                        disabled={isSaving}
                      >
                        <Text style={[styles.typeToggleText, isSelected && styles.typeToggleTextSelected]}>
                          {getCategoryTypeLabel(type)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Icon</Text>
                <Pressable
                  disabled={isSaving}
                  onPress={onOpenIconPicker}
                  style={[styles.iconSelectButton, isSaving && styles.disabledText]}
                >
                  <View style={styles.iconSelectPreview}>
                    {selectedIconOption ? (
                      <selectedIconOption.Icon color={theme.primary} size={18} strokeWidth={2.4} />
                    ) : (
                      <Text style={styles.iconSelectPreviewText}>C</Text>
                    )}
                  </View>
                  <View style={styles.iconSelectCopy}>
                    <Text style={styles.iconSelectTitle}>{selectedIconOption?.label ?? "Mặc định"}</Text>
                    <Text style={styles.iconSelectSubtitle}>
                      {selectedIconOption ? selectedIconOption.key : "Dùng icon mặc định"}
                    </Text>
                  </View>
                  <Text style={styles.iconSelectChevron}>›</Text>
                </Pressable>
              </View>

              <Pressable
                style={[styles.fullSaveButton, isSaving && styles.disabledText]}
                onPress={onSubmit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={theme.textInverse} />
                ) : (
                  <Text style={styles.fullSaveButtonText}>Lưu category</Text>
                )}
              </Pressable>
            </View>
          )}
        </BottomPopupSheet>
      </KeyboardAvoidingView>
    </BottomPopup>
  );
}
