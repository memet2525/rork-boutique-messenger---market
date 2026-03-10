import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Pressable,
  ActivityIndicator,
  GestureResponderEvent,
  Dimensions,
  Share,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, Stack, RelativePathString } from "expo-router";
import {
  Star,
  MessageCircle,
  Share2,
  Heart,
  MapPin,
  ShieldCheck,
  Users,
  Package,
  ChevronLeft,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/colors";
import { stores, Store, Product } from "@/mocks/stores";
import { useUser, type FavoriteProductSnapshot } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";
import { getFirestoreStore, getFirestoreStoreBySlug, getChatId, getOrCreateChat } from "@/services/firestore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COVER_HEIGHT = 180;
const AVATAR_SIZE = 90;

type TabKey = "all" | "new";

function ProductCard({
  product,
  isFavorite,
  onPress,
  onToggleFavorite,
}: {
  product: Product;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const heartScale = React.useRef(new Animated.Value(1)).current;

  const handleFavoritePress = React.useCallback((event: GestureResponderEvent) => {
    event.stopPropagation();
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.2, useNativeDriver: true, speed: 50 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
    onToggleFavorite();
  }, [heartScale, onToggleFavorite]);

  return (
    <Animated.View style={[styles.productCard, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
        }}
        onPressOut={() => {
          Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
        }}
        testID={`product-card-${product.id}`}
      >
        <Image source={{ uri: product.image }} style={styles.productImage} />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.productPrice}>{product.price}</Text>
        </View>
        <TouchableOpacity
          style={[styles.heartButton, isFavorite && styles.heartButtonActive]}
          onPress={handleFavoritePress}
          activeOpacity={0.85}
          testID={`store-product-favorite-${product.id}`}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Heart
              size={16}
              color={isFavorite ? Colors.white : Colors.textLight}
              fill={isFavorite ? Colors.white : "transparent"}
            />
          </Animated.View>
        </TouchableOpacity>
      </Pressable>
    </Animated.View>
  );
}

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, isLoggedIn, uid, toggleFavorite } = useUser();
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const isMockOrOwn = id === "my-store" || !!stores.find((s) => s.id === id);
  const isSlug = !!id && id !== "my-store" && !stores.find((s) => s.id === id) && !id.match(/^[a-zA-Z0-9]{20,}$/);

  const firestoreStoreQuery = useQuery({
    queryKey: ["firestoreStore", id],
    queryFn: () => getFirestoreStore(id!),
    enabled: !!id && !isMockOrOwn && !isSlug,
  });

  const firestoreSlugQuery = useQuery({
    queryKey: ["firestoreStoreBySlug", id],
    queryFn: () => getFirestoreStoreBySlug(id!),
    enabled: !!id && isSlug,
  });

  const firestoreData = firestoreStoreQuery.data ?? firestoreSlugQuery.data ?? null;
  const isLoading = (firestoreStoreQuery.isLoading && !isMockOrOwn && !isSlug) || (firestoreSlugQuery.isLoading && isSlug);

  const resolvedStoreId = useMemo(() => {
    if (id === "my-store") return "my-store";
    const mockStore = stores.find((s) => s.id === id);
    if (mockStore) return mockStore.id;
    if (firestoreData) return (firestoreData.id as string) ?? id ?? "";
    return id ?? "";
  }, [id, firestoreData]);

  const storeOwnerId = useMemo(() => {
    if (id === "my-store" && uid) return uid;
    if (firestoreData && firestoreData.ownerId) return firestoreData.ownerId as string;
    return resolvedStoreId;
  }, [id, uid, firestoreData, resolvedStoreId]);

  const startStoreChatMutation = useMutation({
    mutationFn: async () => {
      if (!uid || !store) throw new Error("No uid or store");
      const chatId = getChatId(uid, storeOwnerId ?? "unknown");
      console.log("Creating chat from store - storeOwnerId:", storeOwnerId, "storeId:", resolvedStoreId, "chatId:", chatId);
      await getOrCreateChat({
        chatId,
        userId: uid,
        storeId: resolvedStoreId ?? "",
        storeName: store.name,
        storeAvatar: store.avatar,
        storeOwnerId: storeOwnerId ?? "unknown",
        customerName: profile.name || profile.firstName || "Müşteri",
        customerAvatar: profile.avatar,
      });
      return chatId;
    },
    onSuccess: (chatId) => {
      void queryClient.invalidateQueries({ queryKey: ["userChats", uid] });
      router.push({
        pathname: "/chat/[id]" as RelativePathString,
        params: {
          id: chatId,
          storeId: resolvedStoreId ?? "",
          storeName: store!.name,
          storeAvatar: store!.avatar,
          storeOwnerId: storeOwnerId ?? "",
          isOnline: store!.isOnline ? "true" : "false",
        },
      });
    },
    onError: (err) => {
      console.log("Chat creation error from store:", err);
      showAlert("Hata", "Sohbet başlatılırken bir hata oluştu. Lütfen tekrar deneyin.");
    },
  });

  const handleProductPress = React.useCallback((productId: string) => {
    router.push({ pathname: "/product/[id]" as RelativePathString, params: { id: productId, storeId: resolvedStoreId ?? "", storeOwnerId: storeOwnerId ?? "" } });
  }, [router, resolvedStoreId, storeOwnerId]);

  const store = useMemo((): Store | undefined => {
    if (id === "my-store" && profile.isStore) {
      return {
        id: "my-store",
        name: profile.storeName,
        avatar: profile.avatar,
        description: profile.storeDescription || "Mağazamıza hoş geldiniz!",
        category: profile.storeCategory || "Diğer",
        city: profile.storeCity || undefined,
        rating: 5.0,
        reviewCount: 0,
        isOnline: true,
        products: (profile.storeProducts ?? []).map((sp) => ({
          id: sp.id,
          name: sp.name,
          price: sp.price,
          image: sp.image,
          images: sp.images,
          description: sp.description,
          features: sp.features,
        })),
      };
    }
    const mockStore = stores.find((s) => s.id === id);
    if (mockStore) return mockStore;
    if (firestoreData) {
      const fs = firestoreData;
      return {
        id: (fs.id as string) ?? id ?? "",
        name: (fs.name as string) ?? "",
        avatar: (fs.avatar as string) ?? "",
        description: (fs.description as string) ?? "",
        category: (fs.category as string) ?? "Diğer",
        city: (fs.city as string) ?? undefined,
        rating: (fs.rating as number) ?? 5.0,
        reviewCount: (fs.reviewCount as number) ?? 0,
        isOnline: (fs.isOnline as boolean) ?? true,
        products: ((fs.products as Product[]) ?? []),
      };
    }
    return undefined;
  }, [id, profile, firestoreData]);

  const handleToggleProductFavorite = React.useCallback((product: Product) => {
    if (!store) {
      return;
    }

    if (!isLoggedIn) {
      showAlert(
        "Giriş Gerekli",
        "Favori ürünlerini kaydetmek için giriş yapman gerekiyor.",
        [
          { text: "İptal", style: "cancel" },
          { text: "Giriş Yap", onPress: () => router.push("/login" as never) },
        ]
      );
      return;
    }

    const favoriteSnapshot: FavoriteProductSnapshot = {
      productId: product.id,
      storeId: resolvedStoreId ?? store.id,
      storeOwnerId: storeOwnerId ?? resolvedStoreId ?? store.id,
      storeName: store.name,
      storeAvatar: store.avatar,
      productName: product.name,
      productPrice: product.price,
      productImage: product.image,
      productDescription: product.description ?? "",
      addedAt: new Date().toISOString(),
    };

    void toggleFavorite(product.id, favoriteSnapshot).catch((error: unknown) => {
      console.error("Store product favorite toggle failed:", error);
      showAlert("Hata", "Favori güncellenirken bir sorun oluştu. Lütfen tekrar deneyin.");
    });
  }, [store, isLoggedIn, showAlert, router, resolvedStoreId, storeOwnerId, toggleFavorite]);

  const filteredProducts = useMemo(() => {
    if (!store) return [];
    if (activeTab === "all") return store.products;
    if (activeTab === "new") return store.products.slice(-6);
    return store.products;
  }, [store, activeTab]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "Tüm Ürünler" },
    { key: "new", label: "Yeni Gelenler" },
  ];

  if (isLoading) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Mağaza bulunamadı</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.coverContainer}>
          <LinearGradient
            colors={[Colors.primary, "#0a7a6e", Colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coverGradient}
          />
          <View style={styles.coverPattern}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.patternCircle,
                  {
                    left: (i % 3) * (SCREEN_WIDTH / 3) + 20,
                    top: Math.floor(i / 3) * 80 + 20,
                    opacity: 0.06 + (i * 0.02),
                    width: 60 + (i * 10),
                    height: 60 + (i * 10),
                    borderRadius: 30 + (i * 5),
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.coverTopBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ChevronLeft size={22} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.coverShareButton}
              onPress={async () => {
                await Share.share({ message: `${store.name} mağazasını keşfet!` });
              }}
            >
              <Share2 size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: store.avatar }} style={styles.storeAvatar} />
            {store.isOnline && <View style={styles.onlineDot} />}
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.storeName}>{store.name}</Text>
              <ShieldCheck size={18} color={Colors.accent} fill={Colors.accent} />
            </View>

            {store.city ? (
              <View style={styles.locationRow}>
                <MapPin size={13} color={Colors.textSecondary} />
                <Text style={styles.locationText}>{store.city}</Text>
              </View>
            ) : null}

            {store.category ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{store.category}</Text>
              </View>
            ) : null}

            <Text style={styles.storeDescription} numberOfLines={3}>{store.description}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: "rgba(37, 211, 102, 0.1)" }]}>
                <Star size={16} color={Colors.accent} fill={Colors.accent} />
              </View>
              <Text style={styles.statValue}>{store.rating}</Text>
              <Text style={styles.statLabel}>Puan</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: "rgba(7, 94, 84, 0.1)" }]}>
                <Users size={16} color={Colors.primary} />
              </View>
              <Text style={styles.statValue}>{store.reviewCount}</Text>
              <Text style={styles.statLabel}>Değerlendirme</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: "rgba(7, 94, 84, 0.08)" }]}>
                <Package size={16} color={Colors.primary} />
              </View>
              <Text style={styles.statValue}>{store.products.length}</Text>
              <Text style={styles.statLabel}>Ürün</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.messageStoreButton}
              onPress={() => {
                if (!isLoggedIn) {
                  showAlert(
                    "Üye Olun",
                    "Satıcıya mesaj gönderebilmek için üye olmanız gerekmektedir.",
                    [
                      { text: "Vazgeç", style: "cancel" },
                      { text: "Giriş Yap / Üye Ol", onPress: () => router.push("/login" as any) },
                    ]
                  );
                  return;
                }
                startStoreChatMutation.mutate();
              }}
              disabled={startStoreChatMutation.isPending}
              activeOpacity={0.8}
              testID="message-store"
            >
              <MessageCircle size={18} color={Colors.white} />
              <Text style={styles.messageStoreText}>Mesaj Gönder</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareActionButton}
              activeOpacity={0.8}
              onPress={async () => {
                await Share.share({ message: `${store.name} mağazasını keşfet!` });
              }}
            >
              <Share2 size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.productsSection}>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Package size={40} color={Colors.textLight} />
              <Text style={styles.emptyProductsText}>Henüz ürün yok</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFavorite={profile.favorites.includes(product.id)}
                  onPress={() => handleProductPress(product.id)}
                  onToggleFavorite={() => handleToggleProductFavorite(product)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  coverContainer: {
    height: COVER_HEIGHT,
    position: "relative",
    overflow: "hidden",
  },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  coverPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  patternCircle: {
    position: "absolute",
    backgroundColor: Colors.white,
  },
  coverTopBar: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverShareButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileSection: {
    backgroundColor: Colors.white,
    marginTop: -(AVATAR_SIZE / 2),
    marginHorizontal: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: AVATAR_SIZE / 2 + 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatarContainer: {
    position: "absolute",
    top: -(AVATAR_SIZE / 2),
    alignSelf: "center",
    left: SCREEN_WIDTH / 2 - AVATAR_SIZE / 2,
    zIndex: 10,
  },
  storeAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
    borderColor: Colors.white,
    backgroundColor: Colors.border,
  },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.online,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  profileInfo: {
    alignItems: "center",
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  storeName: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  categoryBadge: {
    backgroundColor: "rgba(7, 94, 84, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  storeDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 10,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  messageStoreButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  messageStoreText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  shareActionButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  productsSection: {
    padding: 16,
    paddingTop: 12,
  },
  emptyProducts: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyProductsText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  productCard: {
    width: "48%",
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    width: "100%",
    height: 160,
    backgroundColor: Colors.border,
  },
  productInfo: {
    padding: 10,
    gap: 4,
  },
  productName: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.text,
    lineHeight: 17,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  heartButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heartButtonActive: {
    backgroundColor: Colors.danger,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
