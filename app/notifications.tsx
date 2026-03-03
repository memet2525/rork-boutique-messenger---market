import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
} from "react-native";
import { Stack } from "expo-router";
import { Bell, MessageCircle, ShoppingBag, Tag } from "lucide-react-native";

import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";

interface NotificationRowProps {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  value: boolean;
  onToggle: (val: boolean) => void;
}

function NotificationRow({ icon, label, subtitle, value, onToggle }: NotificationRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.accent }}
        thumbColor={Colors.white}
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const { profile, updateProfile } = useUser();

  return (
    <>
      <Stack.Screen
        options={{
          title: "Bildirimler",
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.headerText,
          headerTitleStyle: { fontWeight: "700" as const },
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <View style={styles.masterRow}>
            <Bell size={22} color={Colors.primary} />
            <Text style={styles.masterLabel}>Bildirimleri Aç/Kapat</Text>
            <Switch
              value={profile.notificationsEnabled}
              onValueChange={(val) => updateProfile({ notificationsEnabled: val })}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        <View style={[styles.section, !profile.notificationsEnabled && styles.disabled]}>
          <Text style={styles.sectionTitle}>Bildirim Türleri</Text>
          <NotificationRow
            icon={<MessageCircle size={20} color="#3B82F6" />}
            label="Sohbet Bildirimleri"
            subtitle="Yeni mesaj geldiğinde bildirim al"
            value={profile.chatNotifications && profile.notificationsEnabled}
            onToggle={(val) => updateProfile({ chatNotifications: val })}
          />
          <NotificationRow
            icon={<ShoppingBag size={20} color={Colors.accent} />}
            label="Sipariş Bildirimleri"
            subtitle="Sipariş durumu değiştiğinde bildirim al"
            value={profile.orderNotifications && profile.notificationsEnabled}
            onToggle={(val) => updateProfile({ orderNotifications: val })}
          />
          <NotificationRow
            icon={<Tag size={20} color="#F59E0B" />}
            label="Kampanya Bildirimleri"
            subtitle="İndirim ve kampanyalardan haberdar ol"
            value={profile.promoNotifications && profile.notificationsEnabled}
            onToggle={(val) => updateProfile({ promoNotifications: val })}
          />
        </View>

        <Text style={styles.footerNote}>
          Bildirimleri kapatırsanız önemli güncellemeleri kaçırabilirsiniz.
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
  disabled: {
    opacity: 0.5,
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
  masterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  masterLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    gap: 12,
  },
  rowIcon: {
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
  footerNote: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 20,
    marginHorizontal: 32,
    marginBottom: 32,
  },
});
