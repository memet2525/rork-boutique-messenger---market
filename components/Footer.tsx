import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { FileText, Shield, Cookie, Mail, HelpCircle, Scale, Eye, TrendingUp } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const VISITOR_STORAGE_KEY = "@visitor_stats";
const BASE_TOTAL = 10000;
const BASE_DAILY = 100;

interface VisitorStats {
  totalVisits: number;
  dailyVisits: number;
  lastDate: string;
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function useVisitorStats() {
  const [stats, setStats] = useState<VisitorStats>({
    totalVisits: BASE_TOTAL,
    dailyVisits: BASE_DAILY,
    lastDate: getTodayStr(),
  });

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(VISITOR_STORAGE_KEY);
        const today = getTodayStr();
        if (raw) {
          const parsed: VisitorStats = JSON.parse(raw);
          if (parsed.lastDate !== today) {
            const updated: VisitorStats = {
              totalVisits: parsed.totalVisits + 1,
              dailyVisits: BASE_DAILY + 1,
              lastDate: today,
            };
            await AsyncStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(updated));
            setStats(updated);
          } else {
            const updated: VisitorStats = {
              ...parsed,
              totalVisits: parsed.totalVisits + 1,
              dailyVisits: parsed.dailyVisits + 1,
            };
            await AsyncStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(updated));
            setStats(updated);
          }
        } else {
          const initial: VisitorStats = {
            totalVisits: BASE_TOTAL + 1,
            dailyVisits: BASE_DAILY + 1,
            lastDate: today,
          };
          await AsyncStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(initial));
          setStats(initial);
        }
      } catch (e) {
        console.log("Visitor stats error:", e);
      }
    })();
  }, []);

  return stats;
}

function formatNumber(n: number): string {
  if (n >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, "") + "B";
  }
  return n.toString();
}

export default function Footer() {
  const router = useRouter();
  const { settings } = useAdmin();
  const stats = useVisitorStats();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

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
      <Animated.View style={[styles.visitorRow, { opacity: fadeAnim }]}>
        <View style={styles.visitorItem}>
          <View style={styles.visitorIconDot}>
            <Eye color="#fff" size={11} strokeWidth={2.5} />
          </View>
          <Text style={styles.visitorValue}>{formatNumber(stats.dailyVisits)}</Text>
          <Text style={styles.visitorLabel}>Bugün</Text>
        </View>
        <View style={styles.visitorDivider} />
        <View style={styles.visitorItem}>
          <View style={[styles.visitorIconDot, { backgroundColor: Colors.primary }]}>
            <TrendingUp color="#fff" size={11} strokeWidth={2.5} />
          </View>
          <Text style={styles.visitorValue}>{formatNumber(stats.totalVisits)}</Text>
          <Text style={styles.visitorLabel}>Toplam</Text>
        </View>
      </Animated.View>
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
  visitorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 12,
  },
  visitorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  visitorIconDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  visitorValue: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  visitorLabel: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: "500" as const,
  },
  visitorDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 4,
  },
});
