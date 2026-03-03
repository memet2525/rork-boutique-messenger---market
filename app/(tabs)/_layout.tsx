import { Tabs, useRouter } from "expo-router";
import { Store, MessageCircle, User, Home } from "lucide-react-native";
import React, { useCallback } from "react";
import { Platform, StyleSheet, View } from "react-native";

import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";

export default function TabLayout() {
  const { isLoggedIn } = useUser();
  const router = useRouter();
  const { showAlert } = useAlert();

  const handleAuthTab = useCallback((e: { preventDefault: () => void }) => {
    if (!isLoggedIn) {
      e.preventDefault();
      showAlert(
        "Giriş Gerekli",
        "Bu özelliği kullanmak için giriş yapmanız gerekiyor.",
        [
          { text: "İptal", style: "cancel" },
          { text: "Giriş Yap", onPress: () => router.push("/login" as never) },
        ]
      );
    }
  }, [isLoggedIn, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: "#B0B8C1",
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: "#E8ECF0",
          borderTopWidth: 1,
          height: Platform.select({ ios: 90, android: 78, web: 64 }),
          paddingBottom: Platform.select({ ios: 30, android: 20, web: 8 }),
          paddingTop: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600" as const,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Keşfet",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabStyles.activeIconBg : undefined}>
              <Home color={color} size={22} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: "Sohbetler",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabStyles.activeIconBg : undefined}>
              <MessageCircle color={color} size={22} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
          tabBarBadge: isLoggedIn ? 2 : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors.badge,
            fontSize: 10,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            top: -2,
          },
        }}
        listeners={{
          tabPress: handleAuthTab,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabStyles.activeIconBg : undefined}>
              <User color={color} size={22} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }}
        listeners={{
          tabPress: handleAuthTab,
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  activeIconBg: {
    backgroundColor: "rgba(7, 94, 84, 0.08)",
    borderRadius: 12,
    padding: 4,
  },
});
