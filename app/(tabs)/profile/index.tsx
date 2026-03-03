import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  Store,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  Camera,
  Phone,
  Edit3,
  MapPin,
  Mail,
  Crown,
  Clock,
  MailOpen,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";
import { chats } from "@/mocks/chats";
import { uploadAvatar } from "@/services/storage";

const MENU_ITEMS = [
  { id: "store", icon: Store, label: "Magaza Ac", subtitle: "Urunlerinizi satisa sunun", color: Colors.accent, route: "/open-store" },
  { id: "notifications", icon: Bell, label: "Bildirimler", subtitle: "Bildirim ayarlari", color: "#3B82F6", route: "/notifications" },
  { id: "privacy", icon: Shield, label: "Gizlilik", subtitle: "Hesap gizlilik ayarlari", color: "#8B5CF6", route: "/privacy" },
  { id: "help", icon: HelpCircle, label: "Yardim", subtitle: "SSS ve destek", color: "#F59E0B", route: "/help" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile, logout, uid, isSubscriptionActive, getTrialDaysLeft } = useUser();
  const { showAlert } = useAlert();

  const chatCount = chats.length;
  const favoriteCount = profile.favorites.length;
  const subActive = isSubscriptionActive();
  const trialDays = getTrialDaysLeft();
  const unreadMsgCount = profile.systemNotifications?.filter((n) => !n.read).length ?? 0;

  const handleAvatarPress = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        const localUri = result.assets[0].uri;
        updateProfile({ avatar: localUri });
        if (uid) {
          uploadAvatar(uid, localUri).then((remoteUrl) => {
            if (remoteUrl !== localUri) {
              updateProfile({ avatar: remoteUrl });
            }
          }).catch((e) => console.log("Avatar upload failed:", e));
        }
      }
    } catch (error) {
      console.log("Image picker error:", error);
    }
  }, [updateProfile]);

  const handleMenuPress = useCallback((route: string, id: string) => {
    if (id === "store" && profile.isStore) {
      router.push("/open-store" as never);
      return;
    }
    router.push(route as never);
  }, [router, profile.isStore]);

  const handleLogout = useCallback(() => {
    showAlert(
      "Cikis Yap",
      "Hesabinizdan cikis yapmak istediginize emin misiniz?",
      [
        { text: "Iptal", style: "cancel" },
        {
          text: "Cikis Yap",
          style: "destructive",
          onPress: () => {
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            logout();
          },
        },
      ]
    );
  }, [logout, showAlert]);

  const getMenuLabel = (id: string, label: string) => {
    if (id === "store" && profile.isStore) return "Magazam";
    return label;
  };

  const getMenuSubtitle = (id: string, subtitle: string) => {
    if (id === "store" && profile.isStore) return profile.storeName;
    return subtitle;
  };

  const getSubscriptionLabel = () => {
    if (profile.subscriptionPlan === "trial") {
      return trialDays > 0 ? `Deneme: ${trialDays} gun kaldi` : "Deneme suresi doldu";
    }
    if (profile.subscriptionPlan === "monthly") return "Aylik Abonelik";
    if (profile.subscriptionPlan === "yearly") return "Yillik Abonelik";
    return "";
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: profile.avatar }}
              style={styles.avatar}
            />
            <TouchableOpacity
              style={styles.cameraButton}
              testID="change-avatar"
              onPress={handleAvatarPress}
            >
              <Camera size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.nameRow}
            onPress={() => router.push("/edit-profile" as never)}
          >
            <Text style={styles.userName}>{profile.name || "Kullanici"}</Text>
            <Edit3 size={16} color={Colors.textLight} />
          </TouchableOpacity>

          {profile.email ? (
            <View style={styles.infoRow}>
              <Mail size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{profile.email}</Text>
            </View>
          ) : null}

          {profile.phone ? (
            <View style={styles.infoRow}>
              <Phone size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{profile.phone}</Text>
            </View>
          ) : null}

          {profile.isStore && profile.storeCity ? (
            <View style={styles.infoRow}>
              <MapPin size={14} color={Colors.accent} />
              <Text style={styles.infoTextAccent}>{profile.storeCity}</Text>
            </View>
          ) : null}

          {profile.isStore && profile.subscriptionPlan !== "none" && (
            <View style={styles.subscriptionBadge}>
              {profile.subscriptionPlan === "trial" ? (
                <Clock size={14} color="#F59E0B" />
              ) : (
                <Crown size={14} color="#F59E0B" />
              )}
              <Text style={styles.subscriptionText}>{getSubscriptionLabel()}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.messagesButton}
          onPress={() => router.push("/system-messages" as never)}
          activeOpacity={0.7}
          testID="system-messages-btn"
        >
          <MailOpen size={18} color={Colors.primary} />
          <Text style={styles.messagesButtonText}>Mesajlarim</Text>
          {unreadMsgCount > 0 && (
            <View style={styles.msgBadge}>
              <Text style={styles.msgBadgeText}>{unreadMsgCount}</Text>
            </View>
          )}
          <ChevronRight size={16} color={Colors.textLight} />
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Siparis</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{chatCount}</Text>
            <Text style={styles.statLabel}>Sohbet</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{favoriteCount}</Text>
            <Text style={styles.statLabel}>Favori</Text>
          </View>
        </View>
      </View>

      <View style={styles.menuSection}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            testID={`menu-${item.id}`}
            onPress={() => handleMenuPress(item.route, item.id)}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: item.color + "15" }]}>
              <item.icon size={20} color={item.color} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuLabel}>{getMenuLabel(item.id, item.label)}</Text>
              <Text style={styles.menuSubtitle}>{getMenuSubtitle(item.id, item.subtitle)}</Text>
            </View>
            <ChevronRight size={20} color={Colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        testID="logout-button"
        onPress={handleLogout}
      >
        <LogOut size={20} color={Colors.danger} />
        <Text style={styles.logoutText}>Cikis Yap</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>ButikBiz v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  profileHeader: {
    backgroundColor: Colors.white,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarSection: {
    alignItems: "center",
    gap: 6,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 4,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.border,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoTextAccent: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: "600" as const,
  },
  subscriptionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  subscriptionText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#92400E",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 40,
    gap: 0,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  menuSection: {
    backgroundColor: Colors.white,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  menuIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextContainer: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.danger,
  },
  messagesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  messagesButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  msgBadge: {
    backgroundColor: Colors.danger,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  msgBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 16,
    marginBottom: 32,
  },
});
