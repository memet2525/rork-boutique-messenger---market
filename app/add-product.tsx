import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import {
  Camera,
  Plus,
  X,
  Package,
  DollarSign,
  FileText,
  Tag,
  Layers,
  ImagePlus,

} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";
import { uploadProductImage } from "@/services/storage";

const CATEGORIES = ["Moda", "Teknoloji", "Gıda", "Dekorasyon", "Spor", "Aksesuar", "Ev", "Diğer"];
const MAX_IMAGES = 6;

export default function AddProductScreen() {
  const router = useRouter();
  const { addStoreProduct, uid } = useUser();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { showAlert } = useAlert();

  const [name, setName] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [stock, setStock] = useState<string>("1");
  const [category, setCategory] = useState<string>("");
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [features, setFeatures] = useState<string[]>([""]);

  const canSubmit =
    name.trim().length >= 2 &&
    price.trim().length > 0 &&
    images.length > 0 &&
    category.length > 0 &&
    parseInt(stock, 10) >= 0;

  const pickImages = useCallback(async () => {
    if (images.length >= MAX_IMAGES) {
      showAlert("Limit", `En fazla ${MAX_IMAGES} görsel ekleyebilirsiniz.`);
      return;
    }

    try {
      const remaining = MAX_IMAGES - images.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setImages((prev) => [...prev, ...result.assets].slice(0, MAX_IMAGES));
        if (Platform.OS !== "web") {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (error) {
      console.log("Image picker error:", error);
      showAlert("Hata", "Görsel seçilirken bir hata oluştu.");
    }
  }, [images.length, showAlert]);

  const takePhoto = useCallback(async () => {
    if (images.length >= MAX_IMAGES) {
      showAlert("Limit", `En fazla ${MAX_IMAGES} görsel ekleyebilirsiniz.`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showAlert("İzin Gerekli", "Kamera kullanmak için izin vermeniz gerekiyor.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets.length > 0) {
        setImages((prev) => [...prev, result.assets[0]].slice(0, MAX_IMAGES));
        if (Platform.OS !== "web") {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (error) {
      console.log("Camera error:", error);
      showAlert("Hata", "Fotoğraf çekilirken bir hata oluştu.");
    }
  }, [images.length, showAlert]);

  const removeImage = useCallback((index: number) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddFeature = useCallback(() => {
    if (features.length < 6) {
      setFeatures([...features, ""]);
    }
  }, [features]);

  const handleUpdateFeature = useCallback(
    (index: number, value: string) => {
      const updated = [...features];
      updated[index] = value;
      setFeatures(updated);
    },
    [features]
  );

  const handleRemoveFeature = useCallback(
    (index: number) => {
      if (features.length > 1) {
        setFeatures(features.filter((_, i) => i !== index));
      }
    },
    [features]
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      let uploadedImages: string[] = [];
      if (uid) {
        try {
          console.log("Uploading", images.length, "product images...");

          for (const [index, imageAsset] of images.entries()) {
            console.log("Uploading product image", index + 1, "of", images.length, "uri:", imageAsset.uri.substring(0, 120));
            const uploadedImage = await uploadProductImage(uid, imageAsset, index);
            uploadedImages.push(uploadedImage);
          }

          console.log("All product images uploaded successfully");
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("Product image upload failed:", errorMessage, error);
          showAlert("Hata", `Görseller yüklenemedi: ${errorMessage.substring(0, 140)}`);
          setIsSubmitting(false);
          return;
        }
      } else {
        uploadedImages = images.map((imageAsset) => imageAsset.uri);
      }

      const priceFormatted = price.includes("₺") ? price.trim() : `₺${price.trim()}`;

      addStoreProduct({
        name: name.trim(),
        price: priceFormatted,
        image: uploadedImages[0],
        images: uploadedImages,
        description: description.trim(),
        stock: parseInt(stock, 10) || 0,
        category,
        features: features.filter((f) => f.trim().length > 0),
      });

      showAlert("Başarılı!", `"${name.trim()}" ürünü mağazanıza eklendi.`, [
        { text: "Tamam", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.log("Submit error:", error);
      showAlert("Hata", "Ürün eklenirken bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, isSubmitting, name, price, images, description, stock, category, features, addStoreProduct, router, showAlert, uid]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Ürün Ekle",
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.headerText,
          headerTitleStyle: { fontWeight: "700" as const },
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Ürün Görseli *</Text>
            <Text style={styles.sectionHint}>
              Cihazınızdan görsel seçin veya fotoğraf çekin (maks. {MAX_IMAGES})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {images.map((imageAsset, index) => (
                <View key={`img-${index}`} style={styles.imageWrapper}>
                  <Image source={{ uri: imageAsset.uri }} style={styles.imageOptionImg} />
                  {index === 0 && (
                    <View style={styles.mainBadge}>
                      <Text style={styles.mainBadgeText}>Ana</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={12} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ))}

              {images.length < MAX_IMAGES && (
                <>
                  <TouchableOpacity
                    style={styles.addImageBtn}
                    onPress={pickImages}
                    testID="pick-images"
                  >
                    <ImagePlus size={24} color={Colors.accent} />
                    <Text style={styles.addImageText}>Galeri</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addImageBtn}
                    onPress={takePhoto}
                    testID="take-photo"
                  >
                    <Camera size={24} color={Colors.primary} />
                    <Text style={styles.addImageCameraText}>Kamera</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            {images.length > 0 && (
              <Text style={styles.imageCount}>
                {images.length}/{MAX_IMAGES} görsel eklendi
              </Text>
            )}
          </View>

          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Package size={18} color={Colors.primary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Ürün Adı *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: Kablosuz Kulaklık"
                  placeholderTextColor={Colors.textLight}
                  value={name}
                  onChangeText={setName}
                  maxLength={60}
                  testID="product-name-input"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <DollarSign size={18} color={Colors.primary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Fiyat (₺) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: 299"
                  placeholderTextColor={Colors.textLight}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  maxLength={10}
                  testID="product-price-input"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Layers size={18} color={Colors.primary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Stok Adedi *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: 10"
                  placeholderTextColor={Colors.textLight}
                  value={stock}
                  onChangeText={setStock}
                  keyboardType="numeric"
                  maxLength={6}
                  testID="product-stock-input"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <FileText size={18} color={Colors.primary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Açıklama</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Ürünü tanımlayın..."
                  placeholderTextColor={Colors.textLight}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  maxLength={300}
                  testID="product-desc-input"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Kategori *</Text>
            <View style={styles.categoriesWrap}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, category === cat && styles.catChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.featuresHeader}>
              <Text style={styles.sectionLabel}>Özellikler</Text>
              {features.length < 6 && (
                <TouchableOpacity onPress={handleAddFeature} style={styles.addFeatureBtn}>
                  <Plus size={16} color={Colors.accent} />
                  <Text style={styles.addFeatureText}>Ekle</Text>
                </TouchableOpacity>
              )}
            </View>
            {features.map((feat, idx) => (
              <View key={idx} style={styles.featureRow}>
                <Tag size={14} color={Colors.textLight} />
                <TextInput
                  style={styles.featureInput}
                  placeholder={`Özellik ${idx + 1}`}
                  placeholderTextColor={Colors.textLight}
                  value={feat}
                  onChangeText={(val) => handleUpdateFeature(idx, val)}
                  maxLength={50}
                />
                {features.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveFeature(idx)}>
                    <X size={16} color={Colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit || isSubmitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            testID="submit-product"
          >
            <Plus size={20} color={Colors.white} />
            <Text style={styles.submitBtnText}>{isSubmitting ? "Yükleniyor..." : "Ürünü Ekle"}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  imageScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  imageWrapper: {
    width: 88,
    height: 88,
    borderRadius: 14,
    marginRight: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.accent,
    position: "relative",
  },
  imageOptionImg: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.border,
  },
  mainBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(37,211,102,0.85)",
    paddingVertical: 2,
    alignItems: "center",
  },
  mainBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  addImageBtn: {
    width: 88,
    height: 88,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    gap: 4,
  },
  addImageText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.accent,
  },
  addImageCameraText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  imageCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: "right",
  },
  formCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputGroup: {
    flexDirection: "row",
    padding: 14,
    alignItems: "flex-start",
  },
  inputIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  textInput: {
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 4,
    outlineWidth: 0,
    outlineStyle: 'none' as any,
    borderWidth: 0,
  },
  textArea: {
    height: 70,
    textAlignVertical: "top",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 62,
  },
  categoriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  catChipTextActive: {
    color: Colors.white,
  },
  featuresHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  addFeatureBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addFeatureText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.accent,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  featureInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    outlineWidth: 0,
    outlineStyle: 'none' as any,
    borderWidth: 0,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    marginHorizontal: 16,
    marginTop: 28,
    borderRadius: 14,
    paddingVertical: 15,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
});
