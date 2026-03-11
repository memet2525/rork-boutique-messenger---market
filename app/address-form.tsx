import React, { useState, useCallback, useRef, useEffect } from "react";
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
  Animated,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter, RelativePathString } from "expo-router";
import { Send, Package, MapPin, ChevronRight } from "lucide-react-native";
import { Linking } from "react-native";
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
  const [submitted, setSubmitted] = useState<boolean>(false);

  const storeChipScale = useRef(new Animated.Value(1)).current;
  const storeChipGlow = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (storeId) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(storeChipGlow, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(storeChipGlow, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [storeId, storeChipGlow]);

  const handleStorePress = useCallback(() => {
    if (!storeId) return;
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.sequence([
      Animated.timing(storeChipScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(storeChipScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(() => {
      router.push(`/store/${storeId}` as RelativePathString);
    });
  }, [storeId, storeChipScale, router]);

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
      const targetId = storeOwnerId || storeId;
      if (!targetId || targetId.trim() === "") {
        console.log("No valid store target. storeOwnerId:", storeOwnerId, "storeId:", storeId);
        throw new Error("Mağaza bilgisi bulunamadı. Lütfen tekrar deneyin.");
      }

      const addressData: {
        id: string;
        storeId: string;
        customerName: string;
        customerPhone: string;
        city: string;
        district: string;
        addressLine: string;
        note: string;
        productInfo?: string;
        createdAt: string;
      } = {
        id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        storeId: storeId ?? "unknown",
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        city: city.trim(),
        district: district.trim(),
        addressLine: addressLine.trim(),
        note: note.trim(),
        createdAt: new Date().toISOString(),
      };

      if (productInfo && productInfo.trim() !== "") {
        addressData.productInfo = productInfo.trim();
      }

      console.log("Saving address to target:", targetId, "storeOwnerId:", storeOwnerId, "storeId:", storeId);
      const success = await saveAddressToStoreOwner(targetId, addressData);
      if (!success) {
        throw new Error("Adres kaydedilemedi");
      }

      return addressData;
    },
    onSuccess: () => {
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setSubmitted(true);
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

  if (submitted) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Teslimat Adresi",
            headerStyle: { backgroundColor: Colors.primary },
            headerTintColor: Colors.headerText,
            headerTitleStyle: { fontWeight: "700" as const },
            headerRight: () => (
              <TouchableOpacity
                onPress={() => Linking.openURL("https://butikbiz.com")}
                activeOpacity={0.6}
                style={styles.headerBrandBtn}
              >
                <Text style={styles.headerBrandText}>butikbiz.com</Text>
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Send size={32} color={Colors.white} />
          </View>
          <Text style={styles.successTitle}>Adresiniz Gönderildi!</Text>
          <Text style={styles.successMessage}>
            Adresiniz {storeName ?? "mağazaya"} başarıyla iletildi. Mağaza en kısa sürede siparişinizi hazırlayacaktır.
          </Text>
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => {
              try { router.back(); } catch { router.replace("/"); }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.successBtnText}>Tamam</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Teslimat Adresi",
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.headerText,
          headerTitleStyle: { fontWeight: "700" as const },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => Linking.openURL("https://butikbiz.com")}
              activeOpacity={0.6}
              style={styles.headerBrandBtn}
            >
              <Text style={styles.headerBrandText}>butikbiz.com</Text>
            </TouchableOpacity>
          ),
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
          <Animated.View style={{ transform: [{ scale: storeChipScale }], opacity: storeId ? storeChipGlow : 1 }}>
            <TouchableOpacity
              style={[styles.headerChip, storeId ? styles.headerChipClickable : undefined]}
              activeOpacity={storeId ? 0.6 : 1}
              onPress={handleStorePress}
              disabled={!storeId}
              testID="store-chip"
            >
              <MapPin size={16} color={Colors.primary} />
              <Text style={[styles.headerChipText, storeId ? styles.headerChipTextClickable : undefined]} numberOfLines={1}>
                {storeName ? `${storeName} için teslimat bilgileri` : "Teslimat Bilgileri"}
              </Text>
              {storeId ? <ChevronRight size={14} color={Colors.primary} /> : null}
            </TouchableOpacity>
          </Animated.View>

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

          <TextInput
            style={styles.input}
            placeholder="İl *"
            placeholderTextColor={Colors.textLight}
            value={city}
            onChangeText={setCity}
            maxLength={30}
            testID="address-city"
          />

          <TextInput
            style={styles.input}
            placeholder="İlçe *"
            placeholderTextColor={Colors.textLight}
            value={district}
            onChangeText={setDistrict}
            maxLength={30}
            testID="address-district"
          />


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
  headerChipClickable: {
    borderWidth: 1,
    borderColor: Colors.primary + "30",
    backgroundColor: Colors.primary + "12",
  },
  headerChipText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
    flex: 1,
  },
  headerChipTextClickable: {
    textDecorationLine: "underline" as const,
  },
  headerBrandBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerBrandText: {
    fontSize: 11,
    color: Colors.headerText,
    opacity: 0.45,
    fontWeight: "500" as const,
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
  successContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 10,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  successBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  successBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.white,
  },
});
