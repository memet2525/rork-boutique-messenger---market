import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Stack } from "expo-router";
import { Eye, Clock, CheckCheck, ChevronRight, Shield } from "lucide-react-native";

import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";

const VISIBILITY_OPTIONS: { value: "everyone" | "contacts" | "nobody"; label: string }[] = [
  { value: "everyone", label: "Herkes" },
  { value: "contacts", label: "Kişilerim" },
  { value: "nobody", label: "Kimse" },
];

export default function PrivacyScreen() {
  const { profile, updateProfile } = useUser();

  return (
    <>
      <Stack.Screen
        options={{
          title: "Gizlilik",
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.headerText,
          headerTitleStyle: { fontWeight: "700" as const },
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil Gizliliği</Text>
          <View style={styles.row}>
            <View style={styles.rowIconBox}>
              <Eye size={20} color="#8B5CF6" />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Profil Fotoğrafı Görünürlüğü</Text>
              <Text style={styles.rowSubtitle}>Profil fotoğrafınızı kimler görebilir</Text>
            </View>
          </View>
          <View style={styles.optionsRow}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionChip,
                  profile.profileVisibility === opt.value && styles.optionChipActive,
                ]}
                onPress={() => updateProfile({ profileVisibility: opt.value })}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    profile.profileVisibility === opt.value && styles.optionChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mesajlaşma Gizliliği</Text>
          <View style={styles.toggleRow}>
            <View style={styles.rowIconBox}>
              <Clock size={20} color="#3B82F6" />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Son Görülme</Text>
              <Text style={styles.rowSubtitle}>Son çevrimiçi zamanınızı gösterin</Text>
            </View>
            <Switch
              value={profile.lastSeenVisible}
              onValueChange={(val) => updateProfile({ lastSeenVisible: val })}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.white}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.rowIconBox}>
              <CheckCheck size={20} color={Colors.accent} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Okundu Bilgisi</Text>
              <Text style={styles.rowSubtitle}>Mesajları okuduğunuzda mavi tik gösterin</Text>
            </View>
            <Switch
              value={profile.readReceipts}
              onValueChange={(val) => updateProfile({ readReceipts: val })}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.dangerRow}>
            <View style={styles.rowIconBox}>
              <Shield size={20} color={Colors.danger} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: Colors.danger }]}>Hesabı Sil</Text>
              <Text style={styles.rowSubtitle}>Hesabınız ve tüm verileriniz kalıcı olarak silinir</Text>
            </View>
            <ChevronRight size={18} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Gizlilik ayarlarınız tüm kullanıcılar için geçerlidir.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  section: {
    backgroundColor: Colors.white,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textLight,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    gap: 12,
  },
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  rowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  rowSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  optionsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  optionChipTextActive: {
    color: Colors.white,
  },
  footerNote: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 20,
    marginHorizontal: 32,
    marginBottom: 32,
  },
});
