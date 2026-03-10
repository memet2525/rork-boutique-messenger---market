import React, { useMemo, useState, useRef } from "react";
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
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, Stack, RelativePathString } from "expo-router";
import {
  MessageCircle,
  Share2,
  Heart,
  MapPin,
  ShieldCheck,
  Package,
  ChevronLeft,
  Search,
  Grid3X3,
  SlidersHorizontal,
  UserPlus,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { getStoreLink } from "@/utils/links";
import { stores, Store, Product } from "@/mocks/stores";
import { useUser, type FavoriteProductSnapshot } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";
import { getFirestoreStore, getFirestoreStoreBySlug, getChatId, getOrCreateChat, getStoreFollowerCount } from "@/services/firestore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COVER_HEIGHT = 200;
const AVATAR_SIZE = 80;

type TabKey = "all" | "campaign" | "new";

function formatFollowers(count: number): string {
  if (count >= 1000000000) return (count / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
  if (count >= 1000000) return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (count >= 1000) return (count / 1000).toFixed(1).replace(/\.0$/, "") + "B";
  return count.toString();
}

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
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

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
        <View style={styles.productImageWrap}>
          <Image source={{ uri: product.image }} style={styles.productImage} />
          <TouchableOpacity
            style={[styles.heartButton, isFavorite && styles.heartButtonActive]}
            onPress={handleFavoritePress}
            activeOpacity={0.85}
            testID={`store-product-favorite-${product.id}`}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Heart
                size={16}
                color={isFavorite ? Colors.white : "#999"}
                fill={isFavorite ? Colors.white : "transparent"}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.productPrice}>{product.price}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, isLoggedIn, uid, toggleFavorite, toggleFollowStore } = useUser();
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [followerDelta, setFollowerDelta] = useState<number>(0);

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
    if (!store) return;

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
    if (activeTab === "campaign") return store.products.slice(0, 4);
    return store.products;
  }, [store, activeTab]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "Tüm Ürünler" },
    { key: "campaign", label: "Kampanyalı" },
    { key: "new", label: "Yeni Gelenler" },
  ];

  const resolvedFollowStoreId = useMemo(() => {
    if (firestoreData && firestoreData.ownerId) return firestoreData.ownerId as string;
    if (id === "my-store" && uid) return uid;
    return resolvedStoreId;
  }, [firestoreData, id, uid, resolvedStoreId]);

  const isFollowing = useMemo(() => {
    const following = Array.isArray(profile.followingStores) ? profile.followingStores : [];
    return following.includes(resolvedFollowStoreId);
  }, [profile.followingStores, resolvedFollowStoreId]);

  const followerCountQuery = useQuery({
    queryKey: ["storeFollowerCount", resolvedFollowStoreId],
    queryFn: () => getStoreFollowerCount(resolvedFollowStoreId),
    enabled: !!resolvedFollowStoreId && resolvedFollowStoreId !== "my-store",
  });

  const handleFollow = React.useCallback(() => {
    if (!isLoggedIn) {
      showAlert(
        "Giriş Gerekli",
        "Mağazayı takip edebilmek için giriş yapmanız gerekiyor.",
        [
          { text: "İptal", style: "cancel" },
          { text: "Giriş Yap", onPress: () => router.push("/login" as never) },
        ]
      );
      return;
    }
    const willFollow = !isFollowing;
    setFollowerDelta((prev) => prev + (willFollow ? 1 : -1));
    toggleFollowStore(resolvedFollowStoreId).catch(() => {
      setFollowerDelta((prev) => prev + (willFollow ? -1 : 1));
      showAlert("Hata", "Takip işlemi sırasında bir hata oluştu.");
    });
  }, [isLoggedIn, isFollowing, showAlert, router, toggleFollowStore, resolvedFollowStoreId]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Mağaza bulunamadı</Text>
      </View>
    );
  }

  const baseFollowerCount = followerCountQuery.data ?? (store.reviewCount > 0 ? store.reviewCount * 5 : 0);
  const followerCount = Math.max(0, baseFollowerCount + followerDelta);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} bounces={true}>
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: store.avatar }}
            style={styles.coverImage}
            contentFit="cover"
          />
          <View style={styles.coverOverlay} />

          <View style={styles.coverTopBar}>
            <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()} testID="store-back-btn">
              <ChevronLeft size={22} color="#1a1a1a" />
            </TouchableOpacity>
            <View style={styles.topBarRight}>
              <TouchableOpacity style={styles.topBarBtn} testID="store-search-btn">
                <Search size={18} color="#1a1a1a" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.topBarBtn}
                onPress={async () => {
                  const storeLink = getStoreLink(store.name);
                  await Share.share({ message: `${store.name} mağazasını keşfet! ${storeLink}` });
                }}
                testID="store-share-btn"
              >
                <Share2 size={18} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: store.avatar }} style={styles.storeAvatar} />
              {store.isOnline && <View style={styles.onlineDot} />}
            </View>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followButtonActive]}
              onPress={handleFollow}
              activeOpacity={0.8}
              testID="store-follow-btn"
            >
              {!isFollowing && <UserPlus size={14} color={Colors.white} />}
              <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>
                {isFollowing ? "Takip Ediliyor" : "Takip Et"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <Text style={styles.storeName}>{store.name}</Text>
              <ShieldCheck size={18} color="#1DA1F2" fill="#1DA1F2" />
            </View>

            {store.city ? (
              <View style={styles.locationRow}>
                <MapPin size={13} color={Colors.textSecondary} />
                <Text style={styles.locationText}>{store.city}</Text>
              </View>
            ) : null}

            <Text style={styles.storeDescription} numberOfLines={3}>{store.description}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{store.rating}</Text>
              <Text style={styles.statLabel}>DEĞERLENDİRME</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatFollowers(followerCount)}</Text>
              <Text style={styles.statLabel}>TAKİPÇİ</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{store.products.length}</Text>
              <Text style={styles.statLabel}>ÜRÜN</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
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
          </ScrollView>
          <View style={styles.tabIndicatorBar} />
        </View>

        <View style={styles.productsSectionHeader}>
          <Text style={styles.productCount}>{filteredProducts.length} ÜRÜN</Text>
          <View style={styles.productControls}>
            <TouchableOpacity style={styles.controlBtn} activeOpacity={0.7}>
              <Grid3X3 size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} activeOpacity={0.7}>
              <SlidersHorizontal size={16} color={Colors.textSecondary} />
              <Text style={styles.controlText}>Sırala</Text>
            </TouchableOpacity>
          </View>
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

        <View style={styles.chatFloatingSection}>
          <TouchableOpacity
            style={styles.chatFloatingButton}
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
            <MessageCircle size={20} color={Colors.white} />
            <Text style={styles.chatFloatingText}>Satıcıya Yaz</Text>
          </TouchableOpacity>
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
  loadingContainer: {
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
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  coverTopBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 36,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topBarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topBarRight: {
    flexDirection: "row",
    gap: 8,
  },
  profileSection: {
    backgroundColor: Colors.white,
    marginTop: 0,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: -(AVATAR_SIZE / 2 + 20),
    marginBottom: 14,
  },
  avatarContainer: {
    position: "relative",
  },
  storeAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: Colors.white,
    backgroundColor: Colors.border,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.online,
    borderWidth: 2.5,
    borderColor: Colors.white,
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  followButtonActive: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  followButtonTextActive: {
    color: Colors.text,
  },
  nameSection: {
    gap: 5,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  storeName: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.3,
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
  storeDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderRadius: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  tabsWrapper: {
    backgroundColor: Colors.white,
    paddingTop: 4,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: Colors.background,
  },
  tabActive: {
    backgroundColor: Colors.text,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  tabIndicatorBar: {
    height: 1,
    backgroundColor: Colors.border,
  },
  productsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  productCount: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  productControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  controlBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  controlText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  productsSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
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
    gap: 10,
  },
  productCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productImageWrap: {
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: 170,
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
  chatFloatingSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  chatFloatingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  chatFloatingText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },
});
