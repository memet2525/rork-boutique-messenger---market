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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  MapPin,
  User,
  Phone,
  Building2,
  Map,
  Home,
  FileText,
  Send,
  Package,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";

export default function AddressFormScreen() {
  const { storeName, storeId, productInfo } = useLocalSearchParams<{
    storeName?: string;
    storeId?: string;
    productInfo?: string;
  }>();
  const router = useRouter();
  const { addAddressSubmission } = useUser();
  const { showAlert } = useAlert();

  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [addressLine, setAddressLine] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const canSubmit =
    customerName.trim().length >= 2 &&
    customerPhone.trim().length >= 10 &&
    city.trim().length >= 2 &&
    district.trim().length >= 2 &&
    addressLine.trim().length >= 5;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    addAddressSubmission({
      storeId: storeId ?? "unknown",
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      city: city.trim(),
      district: district.trim(),
      neighborhood: neighborhood.trim(),
      addressLine: addressLine.trim(),
      postalCode: postalCode.trim(),
      note: note.trim(),
      productInfo: productInfo ?? undefined,
    });

    showAlert(
      "Adres Gönderildi ✓",
      `Adresiniz ${storeName ?? "mağazaya"} başarıyla iletildi. Kargo bilgileriniz en kısa sürede paylaşılacaktır.`,
      [{ text: "Tamam", onPress: () => router.back() }]
    );
  }, [
    canSubmit,
    customerName,
    customerPhone,
    city,
    district,
    neighborhood,
    addressLine,
    postalCode,
    note,
    storeId,
    storeName,
    productInfo,
    addAddressSubmission,
    router,
  ]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Teslimat Adresi",
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.headerText,
          headerTitleStyle: { fontWeight: "700" as const },
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerBanner}>
            <View style={styles.headerIconWrap}>
              <MapPin size={28} color={Colors.white} />
            </View>
            <Text style={styles.headerTitle}>Teslimat Bilgileri</Text>
            {storeName ? (
              <Text style={styles.headerSubtitle}>
                {storeName} için adres formu
              </Text>
            ) : null}
            {productInfo ? (
              <View style={styles.productInfoBanner}>
                <Package size={14} color={Colors.primary} />
                <Text style={styles.productInfoText} numberOfLines={2}>
                  {productInfo}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <User size={18} color={Colors.primary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Ad Soyad *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Alıcı adı soyadı"
                  placeholderTextColor={Colors.textLight}
                  value={customerName}
                  onChangeText={setCustomerName}
                  maxLength={60}
                  testID="address-name"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Phone size={18} color={Colors.primary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Telefon *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="05XX XXX XX XX"
                  placeholderTextColor={Colors.textLight}
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  keyboardType="phone-pad"
                  maxLength={15}
                  testID="address-phone"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Building2 size={18} color={Colors.primary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>İl *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: İstanbul"
                  placeholderTextColor={Colors.textLight}
                  value={city}
                  onChangeText={setCity}
                  maxLength={30}
                  testID="address-city"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Map size={18} color={Colors.primary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>İlçe *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: Kadıköy"
                  placeholderTextColor={Colors.textLight}
                  value={district}
                  onChangeText={setDistrict}
                  maxLength={30}
                  testID="address-district"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Home size={18} color={Colors.primary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Mahalle</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: Caferağa Mah."
                  placeholderTextColor={Colors.textLight}
                  value={neighborhood}
                  onChangeText={setNeighborhood}
                  maxLength={50}
                  testID="address-neighborhood"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <MapPin size={18} color={Colors.primary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Açık Adres *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Sokak, bina no, daire no..."
                  placeholderTextColor={Colors.textLight}
                  value={addressLine}
                  onChangeText={setAddressLine}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                  testID="address-line"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <FileText size={18} color={Colors.primary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Posta Kodu</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: 34710"
                  placeholderTextColor={Colors.textLight}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  keyboardType="numeric"
                  maxLength={5}
                  testID="address-postal"
                />
              </View>
            </View>
          </View>

          <View style={styles.noteSection}>
            <Text style={styles.noteSectionLabel}>Sipariş Notu</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Kargo ile ilgili özel notunuz varsa yazın..."
              placeholderTextColor={Colors.textLight}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              maxLength={200}
              testID="address-note"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            testID="submit-address"
          >
            <Send size={20} color={Colors.white} />
            <Text style={styles.submitBtnText}>Adresi Gönder</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Adres bilgileriniz yalnızca kargo gönderimi için kullanılacaktır.
          </Text>

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
  headerBanner: {
    backgroundColor: Colors.primary,
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },
  productInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    maxWidth: "90%",
  },
  productInfoText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500" as const,
    flex: 1,
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
    height: 60,
    textAlignVertical: "top",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 62,
  },
  noteSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  noteSectionLabel: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    minHeight: 70,
    textAlignVertical: "top",
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: 'none' as any,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.accent,
    marginHorizontal: 16,
    marginTop: 28,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 16,
    marginHorizontal: 32,
    lineHeight: 18,
  },
});
