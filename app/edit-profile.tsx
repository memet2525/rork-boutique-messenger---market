import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { Camera, Check } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";
import { uploadAvatar } from "@/services/storage";

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile, uid } = useUser();
  const { showAlert } = useAlert();
  const [name, setName] = useState<string>(profile.name);
  const [phone, setPhone] = useState<string>(profile.phone);
  const [avatar, setAvatar] = useState<string>(profile.avatar);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Image picker error:", error);
    }
  };

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSave = async () => {
    if (name.trim().length < 2) {
      showAlert("Hata", "İsim en az 2 karakter olmalıdır.");
      return;
    }
    if (isSaving) return;
    setIsSaving(true);

    try {
      let finalAvatar = avatar;
      if (uid && avatar && !avatar.startsWith("http")) {
        try {
          console.log("Uploading avatar to Firebase Storage...");
          finalAvatar = await uploadAvatar(uid, avatar);
          console.log("Avatar uploaded:", finalAvatar.substring(0, 60));
        } catch (e) {
          console.error("Avatar upload failed:", e);
          showAlert("Uyarı", "Profil fotoğrafı yüklenemedi. Lütfen tekrar deneyin.");
          setIsSaving(false);
          return;
        }
      }

      const trimmedName = name.trim();
      const nameParts = trimmedName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const updates: Record<string, any> = {
        name: trimmedName,
        firstName,
        lastName,
        phone: phone.trim(),
      };
      if (finalAvatar) {
        updates.avatar = finalAvatar;
      }
      console.log("Saving profile - updates:", JSON.stringify(updates).substring(0, 200));
      await updateProfile(updates as any);
      console.log("Profile saved successfully to Firestore");

      setAvatar(finalAvatar);

      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      showAlert("Başarılı", "Profiliniz güncellendi.", [
        { text: "Tamam", onPress: () => router.back() },
      ]);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Profile save error:", errMsg, error);
      showAlert("Hata", `Profil kaydedilirken bir sorun oluştu: ${errMsg.substring(0, 120)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Profili Düzenle",
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.headerText,
          headerTitleStyle: { fontWeight: "700" as const },
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} style={styles.headerSave}>
              <Check size={22} color={Colors.white} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
            <View style={styles.cameraOverlay}>
              <Camera size={22} color={Colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Fotoğrafı Değiştir</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>Ad Soyad</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="Adınız ve soyadınız"
            placeholderTextColor={Colors.textLight}
            maxLength={50}
            testID="edit-name-input"
          />

          <Text style={styles.fieldLabel}>Telefon</Text>
          <TextInput
            style={styles.textInput}
            value={phone}
            onChangeText={setPhone}
            placeholder="+90 5XX XXX XX XX"
            placeholderTextColor={Colors.textLight}
            keyboardType="phone-pad"
            maxLength={20}
            testID="edit-phone-input"
          />
        </View>

        <TouchableOpacity style={[styles.saveButton, isSaving && { opacity: 0.5 }]} onPress={handleSave} disabled={isSaving} testID="save-profile">
          <Text style={styles.saveButtonText}>{isSaving ? "Kaydediliyor..." : "Kaydet"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSave: {
    padding: 4,
  },
  avatarSection: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 8,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.border,
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.white,
  },
  changePhotoText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600" as const,
    marginTop: 10,
  },
  formSection: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: 'none' as any,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
});
