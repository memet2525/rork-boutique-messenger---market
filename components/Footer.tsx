import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { FileText, Shield, Cookie, Mail, HelpCircle, Scale } from "lucide-react-native";

import Colors from "@/constants/colors";
import { useAdmin } from "@/contexts/AdminContext";

interface FooterLink {
  key: string;
  label: string;
  type: string;
  icon: React.ReactNode;
}

const FOOTER_LINKS: FooterLink[] = [
  { key: "userAgreement", label: "Kullanici Sozlesmesi", type: "userAgreement", icon: <FileText size={13} color={Colors.textLight} /> },
  { key: "privacyPolicy", label: "Gizlilik Politikasi", type: "privacyPolicy", icon: <Shield size={13} color={Colors.textLight} /> },
  { key: "kvkk", label: "KVKK Metni", type: "kvkk", icon: <Scale size={13} color={Colors.textLight} /> },
  { key: "cookiePolicy", label: "Cerez Politikasi", type: "cookiePolicy", icon: <Cookie size={13} color={Colors.textLight} /> },
  { key: "contactInfo", label: "Iletisim", type: "contactInfo", icon: <Mail size={13} color={Colors.textLight} /> },
  { key: "faq", label: "S.S.S.", type: "faq", icon: <HelpCircle size={13} color={Colors.textLight} /> },
];

export default function Footer() {
  const router = useRouter();
  const { settings } = useAdmin();

  const handlePress = useCallback((type: string) => {
    router.push({ pathname: "/legal-page" as any, params: { type } });
  }, [router]);

  const copyright = settings.footerContent?.copyright || "\u00a9 2024 ButikBiz. Tum haklari saklidir.";

  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <View style={styles.linksGrid}>
        {FOOTER_LINKS.map((link) => (
          <TouchableOpacity
            key={link.key}
            style={styles.linkItem}
            onPress={() => handlePress(link.type)}
            activeOpacity={0.6}
            testID={`footer-link-${link.key}`}
          >
            {link.icon}
            <Text style={styles.linkText} numberOfLines={1}>{link.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.copyrightContainer}>
        <Text style={styles.copyrightText}>{copyright}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 24,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 14,
  },
  linksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  linkText: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: "500" as const,
  },
  copyrightContainer: {
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  copyrightText: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: "400" as const,
    textAlign: "center" as const,
  },
});
