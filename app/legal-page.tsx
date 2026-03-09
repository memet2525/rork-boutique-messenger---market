import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import Colors from "@/constants/colors";
import { useAdmin, FooterContent } from "@/contexts/AdminContext";

const PAGE_TITLES: Record<keyof FooterContent, string> = {
  userAgreement: "Kullanici Sozlesmesi",
  privacyPolicy: "Gizlilik Politikasi",
  kvkk: "KVKK Aydinlatma Metni",
  cookiePolicy: "Cerez Politikasi",
  contactInfo: "Iletisim",
  faq: "Sikca Sorulan Sorular",
  copyright: "Telif Hakki",
};

export default function LegalPageScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { settings } = useAdmin();

  const pageKey = (type || "userAgreement") as keyof FooterContent;
  const title = PAGE_TITLES[pageKey] || "Bilgi";
  const content = settings.footerContent?.[pageKey] || "";

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.headerText,
          headerTitleStyle: { fontWeight: "700" as const },
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.pageTitle}>{title}</Text>
          <View style={styles.divider} />
          <Text style={styles.contentText}>{content}</Text>
        </View>
        <Text style={styles.footerNote}>
          {settings.footerContent?.copyright || "© 2024 ButikBiz. Tum haklari saklidir."}
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
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  contentText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  footerNote: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center" as const,
    marginTop: 24,
  },
});
