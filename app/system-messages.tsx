import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import {
  Mail,
  MailOpen,
  Store,
  Users,
  Megaphone,
  Clock,
  CheckCheck,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { useUser, SystemNotification } from "@/contexts/UserContext";

function getNotificationIcon(type: string) {
  switch (type) {
    case "admin_store_message":
      return { Icon: Store, color: "#F59E0B", bg: "#FEF3C7" };
    case "admin_customer_message":
      return { Icon: Users, color: "#3B82F6", bg: "#DBEAFE" };
    case "admin_message":
    default:
      return { Icon: Megaphone, color: Colors.primary, bg: "#D1FAE5" };
  }
}

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Simdi";
    if (diffMins < 60) return `${diffMins} dk once`;
    if (diffHours < 24) return `${diffHours} saat once`;
    if (diffDays < 7) return `${diffDays} gun once`;
    return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function MessageCard({
  notification,
  onPress,
}: {
  notification: SystemNotification;
  onPress: () => void;
}) {
  const { Icon, color, bg } = getNotificationIcon(notification.type);
  const isRead = notification.read;

  return (
    <TouchableOpacity
      style={[styles.messageCard, !isRead && styles.messageCardUnread]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`msg-${notification.id}`}
    >
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={[styles.messageTitle, !isRead && styles.messageTitleUnread]} numberOfLines={1}>
            {notification.title}
          </Text>
          {!isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.messageBody} numberOfLines={2}>
          {notification.message}
        </Text>
        <View style={styles.messageFooter}>
          <Clock size={12} color={Colors.textLight} />
          <Text style={styles.messageTime}>{formatDate(notification.createdAt)}</Text>
          {isRead && (
            <View style={styles.readBadge}>
              <CheckCheck size={12} color={Colors.accent} />
              <Text style={styles.readText}>Okundu</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SystemMessagesScreen() {
  const { profile, markNotificationRead } = useUser();

  const notifications = [...(profile.systemNotifications || [])].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeB - timeA;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handlePress = useCallback(
    (notification: SystemNotification) => {
      if (!notification.read) {
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        markNotificationRead(notification.id);
      }
    },
    [markNotificationRead]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Mesajlarim",
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: "700" as const },
        }}
      />

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Mail size={16} color={Colors.primary} />
          <Text style={styles.unreadBannerText}>
            {unreadCount} okunmamis mesajiniz var
          </Text>
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <MailOpen size={48} color={Colors.textLight} />
          </View>
          <Text style={styles.emptyTitle}>Henuz mesaj yok</Text>
          <Text style={styles.emptySubtitle}>
            Yonetimden gelen mesajlar burada gorunecek
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {notifications.map((notification) => (
            <MessageCard
              key={notification.id}
              notification={notification}
              onPress={() => handlePress(notification)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#A7F3D0",
  },
  unreadBannerText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  messageCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  messageCardUnread: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    shadowOpacity: 0.08,
    elevation: 2,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  messageContent: {
    flex: 1,
    gap: 4,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#1E293B",
    flex: 1,
  },
  messageTitleUnread: {
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginLeft: 8,
  },
  messageBody: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: Colors.textLight,
  },
  readBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: 8,
  },
  readText: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: "500" as const,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#1E293B",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },
});
