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
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Send, Package, MapPin } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useMutation } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useAlert } from "@/contexts/AlertContext";
import { saveAddressToStoreOwner } from "@/services/firestore";

export default function AddressFormScreen() {
  const { storeName, storeId, storeOwnerId, productInfo } = useLocalSearchParams<{
    storeName?: string;
    storeId?: string;
    storeOwnerId?: string;
    productInfo?: string;
  }>();
  const router = useRouter();
  const { showAlert } = useAlert();

  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [addressLine, setAddressLine] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const canSubmit =
    customerName.trim().length >= 2 &&
    customerPhone.trim().length >= 10 &&
    city.trim().length >= 2 &&
    district.trim().length >= 2 &&
    addressLine.trim().length >= 5;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const addressData = {
        id: `addr_${Date.now()}`,
        storeId: storeId ?? "unknown",
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        city: city.trim(),
        district: district.trim(),
        addressLine: addressLine.trim(),
        note: note.trim(),
        productInfo: productInfo ?? undefined,
        createdAt: new Date().toISOString(),
      };

      if (storeOwnerId) {
        console.log("Saving address to store owner:", storeOwnerId);
        const success = await saveAddressToStoreOwner(storeOwnerId, addressData);
        if (!success) {
          throw new Error("Adres kaydedilemedi");
        }
      } else if (storeId) {
        console.log("Saving address to store owner by storeId:", storeId);
        const success = await saveAddressToStoreOwner(storeId, addressData);
        if (!success) {
          throw new Error("Adres kaydedilemedi");
        }
      } else {
        throw new Error("Mağaza bilgisi bulunamadı");
      }

      return addressData;
    },
    onSuccess: () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showAlert(
        "Adres Gönderildi",
        `Adresiniz ${storeName ?? "mağazaya"} başarıyla iletildi.`,
        [{ text: "Tamam", onPress: () => router.back() }]
      );
    },
    onError: (error: Error) => {
      console.log("Address submit error:", error);
      showAlert("Hata", error.message || "Adres gönderilemedi. Lütfen tekrar deneyin.");
    },
  });

  const { mutate, isPending } = submitMutation;

  const handleSubmit = useCallback(() => {
    if (!canSubmit || isPending) return;
    mutate();
  }, [canSubmit, isPending, mutate]);

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
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.headerChip}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.headerChipText}>
              {storeName ? `${storeName} için teslimat bilgileri` : "Teslimat Bilgileri"}
            </Text>
          </View>

          {productInfo ? (
            <View style={styles.productChip}>
              <Package size={13} color={Colors.primary} />
              <Text style={styles.productChipText} numberOfLines={1}>
                {productInfo}
              </Text>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>Alıcı Bilgileri</Text>

          <TextInput
            style={styles.input}
            placeholder="Ad Soyad *"
            placeholderTextColor={Colors.textLight}
            value={customerName}
            onChangeText={setCustomerName}
            maxLength={60}
            testID="address-name"
          />

          <TextInput
            style={styles.input}
            placeholder="Telefon * (05XX XXX XX XX)"
            placeholderTextColor={Colors.textLight}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
            maxLength={15}
            testID="address-phone"
          />

          <Text style={styles.sectionLabel}>Adres Bilgileri</Text>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="İl *"
              placeholderTextColor={Colors.textLight}
              value={city}
              onChangeText={setCity}
              maxLength={30}
              testID="address-city"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="İlçe *"
              placeholderTextColor={Colors.textLight}
              value={district}
              onChangeText={setDistrict}
              maxLength={30}
              testID="address-district"
            />
          </View>


          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Açık Adres * (Sokak, bina no, daire no...)"
            placeholderTextColor={Colors.textLight}
            value={addressLine}
            onChangeText={setAddressLine}
            multiline
            numberOfLines={3}
            maxLength={200}
            testID="address-line"
          />

          <TextInput
            style={[styles.input, styles.noteArea]}
            placeholder="Sipariş notu (opsiyonel)"
            placeholderTextColor={Colors.textLight}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
            maxLength={200}
            testID="address-note"
          />

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!canSubmit || isPending) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || isPending}
            activeOpacity={0.8}
            testID="submit-address"
          >
            {isPending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Send size={18} color={Colors.white} />
            )}
            <Text style={styles.submitBtnText}>
              {isPending ? "Gönderiliyor..." : "Adresi Gönder"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Bilgileriniz yalnızca kargo gönderimi için kullanılır.
          </Text>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary + "0D",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  headerChipText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
    flex: 1,
  },
  productChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  productChipText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500" as const,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
    marginLeft: 2,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  halfInput: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  textArea: {
    minHeight: 76,
    textAlignVertical: "top",
    paddingTop: 13,
  },
  noteArea: {
    minHeight: 56,
    textAlignVertical: "top",
    paddingTop: 13,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 15,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 16,
  },
});
