import { Tabs, useRouter } from "expo-router";
import { MessageCircle, User, Home, ShoppingBag, Heart, Eye, TrendingUp } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

function VisitorStrip() {
  const stats = useVisitorStats();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[visitorStyles.strip, { opacity: fadeAnim }]}>
      <View style={visitorStyles.statItem}>
        <View style={visitorStyles.iconDot}>
          <Eye color="#fff" size={11} strokeWidth={2.5} />
        </View>
        <Text style={visitorStyles.statValue}>{formatNumber(stats.dailyVisits)}</Text>
        <Text style={visitorStyles.statLabel}>Bugün</Text>
      </View>
      <View style={visitorStyles.divider} />
      <View style={visitorStyles.statItem}>
        <View style={[visitorStyles.iconDot, { backgroundColor: Colors.primary }]}>
          <TrendingUp color="#fff" size={11} strokeWidth={2.5} />
        </View>
        <Text style={visitorStyles.statValue}>{formatNumber(stats.totalVisits)}</Text>
        <Text style={visitorStyles.statLabel}>Toplam</Text>
      </View>
    </Animated.View>
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
    <View style={{ flex: 1 }}>
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
    <VisitorStrip />
    </View>
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

const visitorStyles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F8FA",
    borderTopWidth: 1,
    borderTopColor: "#E8ECF0",
    paddingVertical: 5,
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  iconDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 4,
  },
});
