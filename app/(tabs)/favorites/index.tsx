import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { RelativePathString, useRouter } from "expo-router";
import { Heart, Store, RefreshCw, ChevronRight, Users, ShoppingBag, BarChart3, X, TrendingUp } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useAlert } from "@/contexts/AlertContext";
import { useUser, type FavoriteProductSnapshot, type StoreProduct } from "@/contexts/UserContext";
import { stores as mockStores, type Product } from "@/mocks/stores";
import { getFirestoreStores, getAllUsers } from "@/services/firestore";

type TabType = "favorites" | "following";

interface ResolvedStore {
  id: string;
  ownerId: string;
  name: string;
  avatar: string;
  category: string;
  isOnline: boolean;
  rating: number;
  products: Product[];
}

interface FavoriteResolvedItem {
  snapshot: FavoriteProductSnapshot;
  store: ResolvedStore;
  currentProduct: Product | null;
  changeLabels: string[];
}

function mapStoreProducts(products: StoreProduct[]): Product[] {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.image,
    images: product.images,
    description: product.description,
    features: product.features,
  }));
}

function buildFallbackStore(snapshot: FavoriteProductSnapshot): ResolvedStore {
  return {
    id: snapshot.storeId || snapshot.storeOwnerId || snapshot.productId,
    ownerId: snapshot.storeOwnerId || snapshot.storeId || snapshot.productId,
    name: snapshot.storeName || "Mağaza",
    avatar: snapshot.storeAvatar,
    category: "Favori",
    isOnline: true,
    rating: 5,
    products: [],
  };
}

function findFavoriteSource(
  allStores: ResolvedStore[],
  snapshot: Pick<FavoriteProductSnapshot, "productId" | "storeId">,
): { store: ResolvedStore | null; product: Product | null } {
  const preferredStore = allStores.find((store) => store.id === snapshot.storeId);

  if (preferredStore) {
    const productInPreferredStore = preferredStore.products.find((product) => product.id === snapshot.productId) ?? null;
    if (productInPreferredStore) {
      return { store: preferredStore, product: productInPreferredStore };
    }
  }

  for (const store of allStores) {
    const product = store.products.find((candidate) => candidate.id === snapshot.productId);
    if (product) {
      return { store, product };
    }
  }

  return { store: preferredStore ?? null, product: null };
}

function buildChangeLabels(snapshot: FavoriteProductSnapshot, currentProduct: Product | null): string[] {
  if (!currentProduct) {
    return ["Ürün yayından kalktı"];
  }

  const labels: string[] = [];
  const currentDescription = currentProduct.description ?? "";

  if (snapshot.productPrice !== currentProduct.price) {
    labels.push(`Fiyat ${snapshot.productPrice || "?"} → ${currentProduct.price}`);
  }
  if (snapshot.productName !== currentProduct.name) {
    labels.push("Başlık yenilendi");
  }
  if (snapshot.productImage !== currentProduct.image) {
    labels.push("Görsel güncellendi");
  }
  if (snapshot.productDescription !== currentDescription) {
    labels.push("Açıklama güncellendi");
  }

  return labels;
}

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function FavoritesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();
  const {
    profile,
    uid,
    isLoggedIn,
    updateProfile,
    toggleFavorite,
  } = useUser();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>("favorites");
  const [showFavStats, setShowFavStats] = useState<boolean>(false);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: activeTab === "favorites" ? 0 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  }, [activeTab, indicatorAnim]);

  const firestoreStoresQuery = useQuery({
    queryKey: ["favoriteStoresFeed"],
    queryFn: getFirestoreStores,
    refetchInterval: 15000,
  });

  const allStores = useMemo(() => {
    const mappedMockStores: ResolvedStore[] = mockStores.map((store) => ({
      id: store.id,
      ownerId: store.ownerId ?? store.id,
      name: store.name,
      avatar: store.avatar,
      category: store.category,
      isOnline: store.isOnline,
      rating: store.rating,
      products: store.products,
    }));

    const list: ResolvedStore[] = [...mappedMockStores];

    if (profile.isStore && profile.storeName) {
      list.unshift({
        id: "my-store",
        ownerId: uid ?? "my-store",
        name: profile.storeName,
        avatar: profile.avatar,
        category: profile.storeCategory || "Diğer",
        isOnline: true,
        rating: 5,
        products: mapStoreProducts(profile.storeProducts ?? []),
      });
    }

    const mockStoreIds = new Set(mappedMockStores.map((store) => store.id));
    const firestoreStores = firestoreStoresQuery.data ?? [];

    for (const firestoreStore of firestoreStores) {
      if (mockStoreIds.has((firestoreStore.id as string) ?? "")) {
        continue;
      }

      if ((firestoreStore.ownerId as string | undefined) === uid) {
        continue;
      }

      list.push({
        id: (firestoreStore.id as string) ?? "",
        ownerId: (firestoreStore.ownerId as string) ?? ((firestoreStore.id as string) ?? ""),
        name: (firestoreStore.name as string) ?? "",
        avatar: (firestoreStore.avatar as string) ?? "",
        category: (firestoreStore.category as string) ?? "Diğer",
        isOnline: (firestoreStore.isOnline as boolean) ?? true,
        rating: (firestoreStore.rating as number) ?? 5,
        products: Array.isArray(firestoreStore.products) ? (firestoreStore.products as Product[]) : [],
      });
    }

    return list;
  }, [firestoreStoresQuery.data, profile, uid]);

  const normalizedSnapshots = useMemo(() => {
    const favoriteIds = new Set(profile.favorites);
    const existingSnapshots = (profile.favoriteSnapshots ?? []).filter((snapshot) => favoriteIds.has(snapshot.productId));
    const snapshotIds = new Set(existingSnapshots.map((snapshot) => snapshot.productId));

    const missingSnapshots = profile.favorites
      .filter((productId) => !snapshotIds.has(productId))
      .map((productId) => {
        const source = findFavoriteSource(allStores, { productId, storeId: "" });
        return {
          productId,
          storeId: source.store?.id ?? "",
          storeOwnerId: source.store?.ownerId ?? "",
          storeName: source.store?.name ?? "",
          storeAvatar: source.store?.avatar ?? "",
          productName: source.product?.name ?? "",
          productPrice: source.product?.price ?? "",
          productImage: source.product?.image ?? "",
          productDescription: source.product?.description ?? "",
          addedAt: new Date().toISOString(),
        } satisfies FavoriteProductSnapshot;
      });

    return [...existingSnapshots, ...missingSnapshots];
  }, [allStores, profile.favoriteSnapshots, profile.favorites]);

  const favoriteItems = useMemo(() => {
    const items: FavoriteResolvedItem[] = normalizedSnapshots.map((snapshot) => {
      const source = findFavoriteSource(allStores, snapshot);
      const resolvedStore = source.store ?? buildFallbackStore(snapshot);
      const changeLabels = buildChangeLabels(snapshot, source.product);

      return {
        snapshot,
        store: resolvedStore,
        currentProduct: source.product,
        changeLabels,
      };
    });

    return items.sort((left, right) => {
      const changeDiff = right.changeLabels.length - left.changeLabels.length;
      if (changeDiff !== 0) {
        return changeDiff;
      }

      const leftTime = new Date(left.snapshot.addedAt || 0).getTime();
      const rightTime = new Date(right.snapshot.addedAt || 0).getTime();
      return rightTime - leftTime;
    });
  }, [allStores, normalizedSnapshots]);

  const changedCount = useMemo(() => {
    return favoriteItems.filter((item) => item.changeLabels.length > 0).length;
  }, [favoriteItems]);

  const followingStores = useMemo(() => {
    const ids = Array.isArray(profile.followingStores) ? profile.followingStores : [];
    return allStores.filter((s) => ids.includes(s.id) || ids.includes(s.ownerId));
  }, [profile.followingStores, allStores]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["favoriteStoresFeed"] }),
        uid ? queryClient.invalidateQueries({ queryKey: ["userProfile", uid] }) : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, uid]);

  const handleOpenProduct = useCallback((item: FavoriteResolvedItem) => {
    const targetStoreId = item.store.id || item.snapshot.storeId || "";
    const targetOwnerId = item.store.ownerId || item.snapshot.storeOwnerId || targetStoreId;

    router.push({
      pathname: "/product/[id]" as RelativePathString,
      params: {
        id: item.snapshot.productId,
        storeId: targetStoreId,
        storeOwnerId: targetOwnerId,
      },
    });
  }, [router]);

  const handleUnfavorite = useCallback((item: FavoriteResolvedItem) => {
    void toggleFavorite(item.snapshot.productId, item.snapshot).catch((error: unknown) => {
      console.error("Removing favorite failed:", error);
      showAlert("Hata", "Favori kaldırılırken bir sorun oluştu. Lütfen tekrar deneyin.");
    });
  }, [showAlert, toggleFavorite]);

  const handleSyncTracking = useCallback((item: FavoriteResolvedItem) => {
    const currentProduct = item.currentProduct;

    if (!currentProduct) {
      return;
    }

    const updatedSnapshots = normalizedSnapshots.map((snapshot) => {
      if (snapshot.productId !== item.snapshot.productId) {
        return snapshot;
      }

      return {
        ...snapshot,
        storeId: item.store.id,
        storeOwnerId: item.store.ownerId,
        storeName: item.store.name,
        storeAvatar: item.store.avatar,
        productName: currentProduct.name,
        productPrice: currentProduct.price,
        productImage: currentProduct.image,
        productDescription: currentProduct.description ?? "",
      } satisfies FavoriteProductSnapshot;
    });

    void updateProfile({ favoriteSnapshots: updatedSnapshots }).catch((error: unknown) => {
      console.error("Favorite tracking sync failed:", error);
      showAlert("Hata", "Takip durumu güncellenirken bir sorun oluştu. Lütfen tekrar deneyin.");
    });
  }, [normalizedSnapshots, showAlert, updateProfile]);

  const handleOpenStore = useCallback((store: ResolvedStore) => {
    router.push({
      pathname: "/store/[id]" as RelativePathString,
      params: { id: store.ownerId || store.id },
    });
  }, [router]);

  const favStatsQuery = useQuery({
    queryKey: ["favStatsAllUsers"],
    queryFn: getAllUsers,
    enabled: showFavStats && profile.isStore,
    staleTime: 60000,
  });

  const favStats = useMemo(() => {
    if (!profile.isStore || !favStatsQuery.data) return { products: [] as { id: string; name: string; image: string; price: string; favCount: number; users: string[] }[], totalFavs: 0, uniqueUsers: 0 };

    const myProducts = profile.storeProducts ?? [];
    const myProductIds = new Set(myProducts.map((p) => p.id));
    const allUsersData = favStatsQuery.data;

    const productMap = new Map<string, { name: string; image: string; price: string; favCount: number; users: string[] }>();
    myProducts.forEach((p) => productMap.set(p.id, { name: p.name, image: p.image, price: p.price, favCount: 0, users: [] }));

    const uniqueUserSet = new Set<string>();

    for (const user of allUsersData) {
      const userUid = (user.uid as string) ?? "";
      if (userUid === uid) continue;
      const userFavs: string[] = Array.isArray(user.favorites) ? user.favorites : [];
      const userName = (user.name as string) || (user.firstName as string) || "Anonim";
      for (const favId of userFavs) {
        if (myProductIds.has(favId)) {
          const entry = productMap.get(favId);
          if (entry) {
            entry.favCount += 1;
            entry.users.push(userName);
            uniqueUserSet.add(userUid);
          }
        }
      }
    }

    const products = Array.from(productMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.favCount - a.favCount);

    const totalFavs = products.reduce((sum, p) => sum + p.favCount, 0);

    return { products, totalFavs, uniqueUsers: uniqueUserSet.size };
  }, [profile.isStore, profile.storeProducts, favStatsQuery.data, uid]);

  const handleOpenFavStats = useCallback(() => {
    setShowFavStats(true);
    Animated.spring(modalScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 280,
      friction: 22,
    }).start();
  }, [modalScaleAnim]);

  const handleCloseFavStats = useCallback(() => {
    Animated.timing(modalScaleAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setShowFavStats(false));
  }, [modalScaleAnim]);

  const switchTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  const tabIndicatorTranslateX = indicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (SCREEN_WIDTH - 32 - 8) / 2],
  });

  const renderTabBar = () => (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBarInner}>
        <Animated.View
          style={[
            styles.tabIndicator,
            { transform: [{ translateX: tabIndicatorTranslateX }] },
          ]}
        />
        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.7}
          onPress={() => switchTab("favorites")}
          testID="tab-favorites"
        >
          <Heart
            size={16}
            color={activeTab === "favorites" ? Colors.danger : Colors.textLight}
            fill={activeTab === "favorites" ? Colors.danger : "transparent"}
          />
          <Text style={[styles.tabButtonText, activeTab === "favorites" && styles.tabButtonTextActive]}>
            Favorilerim
          </Text>
          {favoriteItems.length > 0 && (
            <View style={[styles.tabBadge, activeTab === "favorites" ? styles.tabBadgeActive : styles.tabBadgeInactive]}>
              <Text style={[styles.tabBadgeText, activeTab === "favorites" && styles.tabBadgeTextActive]}>
                {favoriteItems.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.7}
          onPress={() => switchTab("following")}
          testID="tab-following"
        >
          <Users
            size={16}
            color={activeTab === "following" ? Colors.primary : Colors.textLight}
          />
          <Text style={[styles.tabButtonText, activeTab === "following" && styles.tabButtonTextActive]}>
            Takip Edilenler
          </Text>
          {followingStores.length > 0 && (
            <View style={[styles.tabBadge, activeTab === "following" ? styles.tabBadgeActive : styles.tabBadgeInactive]}>
              <Text style={[styles.tabBadgeText, activeTab === "following" && styles.tabBadgeTextActive]}>
                {followingStores.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isLoggedIn) {
    return (
      <View style={styles.emptyState}>
        <Heart size={42} color={Colors.textLight} />
        <Text style={styles.emptyTitle}>Favorileri görmek için giriş yap</Text>
        <Text style={styles.emptySubtitle}>Kaydettiğin ürünler ve değişiklikleri burada toplanır.</Text>
      </View>
    );
  }

  if (firestoreStoresQuery.isLoading && favoriteItems.length === 0) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (activeTab === "following") {
    return (
      <View style={styles.container}>
        {renderTabBar()}
        <FlatList
          data={followingStores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={followingStores.length === 0 ? styles.emptyListContent : styles.followingListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyStateInner}>
              <View style={styles.emptyIconWrap}>
                <Users size={36} color={Colors.textLight} />
              </View>
              <Text style={styles.emptyTitle}>Henüz takip ettiğin mağaza yok</Text>
              <Text style={styles.emptySubtitle}>Mağaza profillerinden takip et butonuna dokun.</Text>
            </View>
          }
          renderItem={({ item: store }) => (
            <TouchableOpacity
              style={styles.followingStoreCard}
              activeOpacity={0.85}
              onPress={() => handleOpenStore(store)}
              testID={`following-store-${store.id}`}
            >
              <View style={styles.followingStoreLeft}>
                <View style={styles.followingStoreAvatarWrap}>
                  <Image source={{ uri: store.avatar }} style={styles.followingStoreAvatar} />
                  <View style={[styles.onlineDot, !store.isOnline && styles.offlineDot]} />
                </View>
                <View style={styles.followingStoreInfo}>
                  <Text style={styles.followingStoreName} numberOfLines={1}>{store.name}</Text>
                  <Text style={styles.followingStoreCategory} numberOfLines={1}>{store.category}</Text>
                  <Text style={styles.followingStoreProducts}>
                    {store.products.length} ürün
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={Colors.textLight} />
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  const renderFavStatsModal = () => (
    <Modal
      visible={showFavStats}
      transparent
      animationType="fade"
      onRequestClose={handleCloseFavStats}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalContainer, { transform: [{ scale: modalScaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }], opacity: modalScaleAnim }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <BarChart3 size={20} color={Colors.primary} />
              <Text style={styles.modalTitle}>Favori İstatistikleri</Text>
            </View>
            <TouchableOpacity onPress={handleCloseFavStats} style={styles.modalCloseBtn} testID="close-fav-stats">
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {favStatsQuery.isLoading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.modalLoadingText}>Veriler yükleniyor...</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.statsOverview}>
                <View style={styles.statsCard}>
                  <Heart size={22} color={Colors.danger} fill={Colors.danger} />
                  <Text style={styles.statsCardNumber}>{favStats.totalFavs}</Text>
                  <Text style={styles.statsCardLabel}>Toplam Favori</Text>
                </View>
                <View style={styles.statsCard}>
                  <Users size={22} color={Colors.primary} />
                  <Text style={styles.statsCardNumber}>{favStats.uniqueUsers}</Text>
                  <Text style={styles.statsCardLabel}>Farklı Kişi</Text>
                </View>
                <View style={styles.statsCard}>
                  <ShoppingBag size={22} color="#F59E0B" />
                  <Text style={styles.statsCardNumber}>{favStats.products.filter((p) => p.favCount > 0).length}</Text>
                  <Text style={styles.statsCardLabel}>Beğenilen Ürün</Text>
                </View>
              </View>

              {favStats.products.length === 0 ? (
                <View style={styles.noStatsState}>
                  <Text style={styles.noStatsText}>Henüz mağazanızda ürün yok.</Text>
                </View>
              ) : (
                <View style={styles.productStatsList}>
                  {favStats.products.map((product, index) => (
                    <View key={product.id} style={styles.productStatRow}>
                      <View style={styles.productStatRank}>
                        <Text style={styles.productStatRankText}>{index + 1}</Text>
                      </View>
                      <Image source={{ uri: product.image }} style={styles.productStatImage} />
                      <View style={styles.productStatInfo}>
                        <Text style={styles.productStatName} numberOfLines={1}>{product.name}</Text>
                        <Text style={styles.productStatPrice}>{product.price}</Text>
                        {product.favCount > 0 && product.users.length > 0 ? (
                          <Text style={styles.productStatUsers} numberOfLines={1}>
                            {product.users.slice(0, 3).join(", ")}{product.users.length > 3 ? ` +${product.users.length - 3}` : ""}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.productStatBadge, product.favCount > 0 ? styles.productStatBadgeActive : styles.productStatBadgeEmpty]}>
                        <Heart size={12} color={product.favCount > 0 ? Colors.danger : Colors.textLight} fill={product.favCount > 0 ? Colors.danger : "transparent"} />
                        <Text style={[styles.productStatBadgeText, product.favCount > 0 ? styles.productStatBadgeTextActive : styles.productStatBadgeTextEmpty]}>
                          {product.favCount}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderTabBar()}
      {renderFavStatsModal()}
      <FlatList
        data={favoriteItems}
        keyExtractor={(item) => item.snapshot.productId}
        contentContainerStyle={favoriteItems.length === 0 ? styles.emptyListContent : styles.listContent}
        ListHeaderComponent={
          <>
            {profile.isStore ? (
              <TouchableOpacity
                style={styles.favStatsButton}
                activeOpacity={0.8}
                onPress={handleOpenFavStats}
                testID="fav-stats-btn"
              >
                <View style={styles.favStatsButtonLeft}>
                  <View style={styles.favStatsIconWrap}>
                    <TrendingUp size={18} color={Colors.white} />
                  </View>
                  <View>
                    <Text style={styles.favStatsButtonTitle}>Ürünlerim Kimler Tarafından Beğenildi?</Text>
                    <Text style={styles.favStatsButtonSub}>Favori istatistiklerini görüntüle</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.primary} />
              </TouchableOpacity>
            ) : null}
            {changedCount > 0 ? (
              <View style={styles.changesInfoBar}>
                <RefreshCw size={14} color={Colors.danger} />
                <Text style={styles.changesInfoText}>{changedCount} üründe değişiklik var</Text>
              </View>
            ) : null}
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyStateInner}>
            <View style={styles.emptyIconWrap}>
              <ShoppingBag size={36} color={Colors.textLight} />
            </View>
            <Text style={styles.emptyTitle}>Henüz favori ürünün yok</Text>
            <Text style={styles.emptySubtitle}>Ürün detayındaki kalbe dokun, burada birikmeye başlasın.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const previewImage = item.currentProduct?.image ?? item.snapshot.productImage;
          const previewName = item.currentProduct?.name ?? (item.snapshot.productName || "Ürün");
          const previewPrice = item.currentProduct?.price ?? (item.snapshot.productPrice || "Fiyat yok");
          const hasChanges = item.changeLabels.length > 0;
          const isUnavailable = item.currentProduct === null;

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => handleOpenProduct(item)}
              testID={`favorite-card-${item.snapshot.productId}`}
            >
              <Image source={{ uri: previewImage }} style={styles.cardImage} contentFit="cover" />
              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <View style={styles.storeBadge}>
                    <Store size={12} color={Colors.primary} />
                    <Text style={styles.storeBadgeText} numberOfLines={1}>{item.store.name}</Text>
                  </View>
                  <ChevronRight size={16} color={Colors.textLight} />
                </View>

                <Text style={styles.productTitle} numberOfLines={2}>{previewName}</Text>
                <Text style={styles.productPrice}>{previewPrice}</Text>

                <View style={styles.statusRowWrap}>
                  <View style={[styles.statusChip, hasChanges ? styles.statusChipAlert : styles.statusChipStable]}>
                    <Text style={[styles.statusChipText, hasChanges ? styles.statusChipTextAlert : styles.statusChipTextStable]}>
                      {isUnavailable ? "Artık aktif değil" : hasChanges ? "Yeni değişiklik var" : "Takip güncel"}
                    </Text>
                  </View>
                  {item.snapshot.addedAt ? (
                    <Text style={styles.addedAtText}>{new Date(item.snapshot.addedAt).toLocaleDateString("tr-TR")}</Text>
                  ) : null}
                </View>

                {item.changeLabels.length > 0 ? (
                  <View style={styles.changeList}>
                    {item.changeLabels.map((label) => (
                      <View key={label} style={styles.changeChip}>
                        <Text style={styles.changeChipText}>{label}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, styles.removeButton]}
                    onPress={() => handleUnfavorite(item)}
                    testID={`favorite-remove-${item.snapshot.productId}`}
                  >
                    <Text style={styles.removeButtonText}>Favoriden Çıkar</Text>
                  </TouchableOpacity>
                  {hasChanges && !isUnavailable ? (
                    <TouchableOpacity
                      style={[styles.secondaryButton, styles.syncButton]}
                      onPress={() => handleSyncTracking(item)}
                      testID={`favorite-sync-${item.snapshot.productId}`}
                    >
                      <Text style={styles.syncButtonText}>Takibi Güncelle</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBarContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tabBarInner: {
    flexDirection: "row" as const,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 4,
    position: "relative" as const,
  },
  tabIndicator: {
    position: "absolute" as const,
    top: 4,
    left: 4,
    width: "50%" as const,
    height: 40,
    backgroundColor: Colors.white,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    height: 40,
    borderRadius: 10,
    gap: 6,
    zIndex: 1,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textLight,
  },
  tabButtonTextActive: {
    color: Colors.text,
    fontWeight: "700" as const,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 6,
  },
  tabBadgeActive: {
    backgroundColor: "rgba(7, 94, 84, 0.12)",
  },
  tabBadgeInactive: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: Colors.primary,
  },
  changesInfoBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  changesInfoText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.danger,
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  followingListContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 28,
  },
  emptyListContent: {
    flexGrow: 1,
    padding: 16,
  },
  emptyStateInner: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 28,
    paddingTop: 80,
    gap: 10,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.borderLight,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 8,
  },
  followingStoreCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  followingStoreLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  followingStoreAvatarWrap: {
    position: "relative" as const,
  },
  followingStoreAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.border,
  },
  onlineDot: {
    position: "absolute" as const,
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.online,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  offlineDot: {
    backgroundColor: Colors.textLight,
  },
  followingStoreInfo: {
    flex: 1,
  },
  followingStoreName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  followingStoreCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  followingStoreProducts: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    overflow: "hidden" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  cardImage: {
    width: "100%" as const,
    height: 190,
    backgroundColor: Colors.border,
  },
  cardBody: {
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 10,
  },
  storeBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    maxWidth: "88%" as const,
    backgroundColor: "rgba(7, 94, 84, 0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  storeBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  productTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.text,
  },
  productPrice: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.primary,
  },
  statusRowWrap: {
    marginTop: 12,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusChipAlert: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  statusChipStable: {
    backgroundColor: "rgba(37, 211, 102, 0.14)",
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  statusChipTextAlert: {
    color: Colors.danger,
  },
  statusChipTextStable: {
    color: Colors.primary,
  },
  addedAtText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  changeList: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginTop: 14,
  },
  changeChip: {
    backgroundColor: "#FFF4E8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  changeChipText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#C2410C",
  },
  actionRow: {
    flexDirection: "row" as const,
    gap: 10,
    marginTop: 16,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 12,
  },
  removeButton: {
    backgroundColor: "rgba(17, 24, 39, 0.06)",
  },
  removeButtonText: {
    color: Colors.text,
    fontWeight: "700" as const,
    fontSize: 13,
  },
  syncButton: {
    backgroundColor: Colors.primary,
  },
  syncButtonText: {
    color: Colors.white,
    fontWeight: "700" as const,
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 28,
    gap: 10,
    backgroundColor: Colors.background,
  },
  loadingState: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.background,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.text,
    textAlign: "center" as const,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center" as const,
    color: Colors.textSecondary,
  },
  favStatsButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(7, 94, 84, 0.1)",
  },
  favStatsButtonLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  favStatsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  favStatsButtonTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  favStatsButtonSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 20,
  },
  modalContainer: {
    width: "100%" as const,
    maxHeight: "85%" as const,
    backgroundColor: Colors.white,
    borderRadius: 24,
    overflow: "hidden" as const,
  },
  modalHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: Colors.text,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.borderLight,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  modalLoading: {
    paddingVertical: 60,
    alignItems: "center" as const,
    gap: 12,
  },
  modalLoadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  modalBody: {
    padding: 16,
  },
  statsOverview: {
    flexDirection: "row" as const,
    gap: 10,
    marginBottom: 20,
  },
  statsCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center" as const,
    gap: 6,
  },
  statsCardNumber: {
    fontSize: 22,
    fontWeight: "900" as const,
    color: Colors.text,
  },
  statsCardLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    textAlign: "center" as const,
  },
  noStatsState: {
    paddingVertical: 40,
    alignItems: "center" as const,
  },
  noStatsText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  productStatsList: {
    gap: 8,
    paddingBottom: 20,
  },
  productStatRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  productStatRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(7, 94, 84, 0.1)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  productStatRankText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: Colors.primary,
  },
  productStatImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.border,
  },
  productStatInfo: {
    flex: 1,
  },
  productStatName: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  productStatPrice: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
    marginTop: 2,
  },
  productStatUsers: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
  },
  productStatBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  productStatBadgeActive: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  productStatBadgeEmpty: {
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  productStatBadgeText: {
    fontSize: 13,
    fontWeight: "800" as const,
  },
  productStatBadgeTextActive: {
    color: Colors.danger,
  },
  productStatBadgeTextEmpty: {
    color: Colors.textLight,
  },
});
