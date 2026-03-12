import { Tabs, useRouter } from "expo-router";
import { MessageCircle, User, Home, ShoppingBag, Heart } from "lucide-react-native";
import React, { useCallback, useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";
import { getUnreadMessageCount } from "@/services/firestore";

function TabIcon({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  return <View style={focused ? tabStyles.activeIconBg : undefined}>{children}</View>;
}

function FavoriteTabIcon({ focused }: { focused: boolean }) {
  const pulseAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    if (!focused) {
      pulseAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [focused, pulseAnim]);

  const haloScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.25],
  });

  const haloOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.22],
  });

  return (
    <View style={tabStyles.favoriteIconWrapper}>
      {focused ? (
        <Animated.View
          pointerEvents="none"
          style={[
            tabStyles.favoriteHalo,
            {
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            },
          ]}
        />
      ) : null}
      <View style={focused ? tabStyles.favoriteActiveIconBg : tabStyles.favoriteInactiveIconBg}>
        <Heart
          color={focused ? Colors.white : Colors.textLight}
          size={22}
          strokeWidth={focused ? 2.5 : 2}
          fill={focused ? Colors.danger : "transparent"}
        />
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { isLoggedIn, uid, profile } = useUser();
  const router = useRouter();
  const { showAlert } = useAlert();

  const unreadQuery = useQuery({
    queryKey: ["unreadCount", uid],
    queryFn: () => getUnreadMessageCount(uid!),
    enabled: !!uid && isLoggedIn,
    refetchInterval: 10000,
  });

  const unreadCount = unreadQuery.data ?? 0;

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
  }, [isLoggedIn, router, showAlert]);

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
            <TabIcon focused={focused}>
              <Home color={color} size={22} strokeWidth={focused ? 2.5 : 1.8} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favoriler",
          tabBarIcon: ({ focused }) => <FavoriteTabIcon focused={focused} />,
        }}
        listeners={{
          tabPress: handleAuthTab,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: "Sohbetler",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <MessageCircle color={color} size={22} strokeWidth={focused ? 2.5 : 1.8} />
            </TabIcon>
          ),
          tabBarBadge: isLoggedIn && unreadCount > 0 ? unreadCount : undefined,
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
        name="my-store"
        options={{
          title: "Mağazam",
          href: profile.isStore ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <ShoppingBag color={color} size={22} strokeWidth={focused ? 2.5 : 1.8} />
            </TabIcon>
          ),
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
            <TabIcon focused={focused}>
              <User color={color} size={22} strokeWidth={focused ? 2.5 : 1.8} />
            </TabIcon>
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
  favoriteIconWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteHalo: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.danger,
  },
  favoriteActiveIconBg: {
    backgroundColor: Colors.danger,
    borderRadius: 12,
    padding: 4,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 6,
  },
  favoriteInactiveIconBg: {
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 4,
  },
});

