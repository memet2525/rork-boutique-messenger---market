import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { RelativePathString, useRouter } from "expo-router";
import { Heart, Store, RefreshCw, ChevronRight, Users } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useAlert } from "@/contexts/AlertContext";
import { useUser, type FavoriteProductSnapshot, type StoreProduct } from "@/contexts/UserContext";
import { stores as mockStores, type Product } from "@/mocks/stores";
import { getFirestoreStores } from "@/services/firestore";

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

  const followingStores = useMemo(() => {
    const ids = Array.isArray(profile.followingStores) ? profile.followingStores : [];
    return allStores.filter((s) => ids.includes(s.id) || ids.includes(s.ownerId));
  }, [profile.followingStores, allStores]);

  const handleOpenStore = useCallback((store: ResolvedStore) => {
    router.push({
      pathname: "/store/[id]" as RelativePathString,
      params: { id: store.ownerId || store.id },
    });
  }, [router]);

  const renderHeader = useMemo(() => {
    return (
      <View style={styles.headerWrap}>
        <View style={styles.cardsRow}>
          <View style={[styles.miniCard, styles.favMiniCard]}>
            <View style={styles.miniCardIcon}>
              <Heart size={18} color={Colors.danger} fill={Colors.danger} />
            </View>
            <Text style={styles.miniCardValue}>{favoriteItems.length}</Text>
            <Text style={styles.miniCardLabel}>Favori ürün</Text>
            <View style={styles.miniCardDivider} />
            <View style={styles.miniCardRow}>
              <RefreshCw size={12} color={Colors.danger} />
              <Text style={styles.miniCardSub}>{changedCount} değişiklik</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.miniCard, styles.storeMiniCard]}
            activeOpacity={0.85}
            onPress={() => {
              if (followingStores.length > 0) {
                handleOpenStore(followingStores[0]);
              }
            }}
          >
            <View style={styles.miniCardIcon}>
              <Users size={18} color={Colors.primary} />
            </View>
            <Text style={styles.miniCardValue}>{followingStores.length}</Text>
            <Text style={styles.miniCardLabel}>Takip edilen</Text>
            <View style={styles.miniCardDivider} />
            {followingStores.length > 0 ? (
              <View style={styles.storeAvatarRow}>
                {followingStores.slice(0, 3).map((s) => (
                  <Image
                    key={s.id}
                    source={{ uri: s.avatar }}
                    style={styles.storeAvatarMini}
                  />
                ))}
                {followingStores.length > 3 ? (
                  <View style={styles.storeAvatarMore}>
                    <Text style={styles.storeAvatarMoreText}>+{followingStores.length - 3}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.miniCardRow}>
                <Store size={12} color={Colors.textLight} />
                <Text style={styles.miniCardSub}>Henüz yok</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {followingStores.length > 0 ? (
          <View style={styles.followingSection}>
            <View style={styles.followingSectionHeader}>
              <Text style={styles.followingSectionTitle}>Takip Ettiklerin</Text>
              <Text style={styles.followingSectionCount}>{followingStores.length} mağaza</Text>
            </View>
            <FlatList
              data={followingStores}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.followingList}
              renderItem={({ item: store }) => (
                <TouchableOpacity
                  style={styles.followingCard}
                  activeOpacity={0.85}
                  onPress={() => handleOpenStore(store)}
                  testID={`following-store-${store.id}`}
                >
                  <Image source={{ uri: store.avatar }} style={styles.followingAvatar} />
                  <Text style={styles.followingName} numberOfLines={1}>{store.name}</Text>
                  <Text style={styles.followingCategory} numberOfLines={1}>{store.category}</Text>
                  <View style={[styles.followingOnline, !store.isOnline && styles.followingOffline]} />
                </TouchableOpacity>
              )}
            />
          </View>
        ) : null}
      </View>
    );
  }, [changedCount, favoriteItems.length, followingStores, handleOpenStore]);

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

  return (
    <FlatList
      data={favoriteItems}
      keyExtractor={(item) => item.snapshot.productId}
      contentContainerStyle={favoriteItems.length === 0 ? styles.emptyListContent : styles.listContent}
      ListHeaderComponent={renderHeader}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Store size={42} color={Colors.textLight} />
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
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
    backgroundColor: Colors.background,
  },
  emptyListContent: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: Colors.background,
  },
  headerWrap: {
    marginBottom: 14,
    gap: 14,
  },
  cardsRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  miniCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    alignItems: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  favMiniCard: {
    borderTopWidth: 3,
    borderTopColor: Colors.danger,
  },
  storeMiniCard: {
    borderTopWidth: 3,
    borderTopColor: Colors.primary,
  },
  miniCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 8,
  },
  miniCardValue: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.text,
  },
  miniCardLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600" as const,
    marginTop: 2,
  },
  miniCardDivider: {
    width: "80%" as const,
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  miniCardRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  miniCardSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  storeAvatarRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  storeAvatarMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.white,
    marginLeft: -6,
  },
  storeAvatarMore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginLeft: -6,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  storeAvatarMoreText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: Colors.textSecondary,
  },
  followingSection: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  followingSectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  followingSectionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  followingSectionCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  followingList: {
    paddingHorizontal: 14,
    gap: 10,
  },
  followingCard: {
    width: 80,
    alignItems: "center" as const,
    position: "relative" as const,
  },
  followingAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.border,
    marginBottom: 6,
  },
  followingName: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.text,
    textAlign: "center" as const,
  },
  followingCategory: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginTop: 1,
  },
  followingOnline: {
    position: "absolute" as const,
    top: 40,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.online,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  followingOffline: {
    backgroundColor: Colors.textLight,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  cardImage: {
    width: "100%",
    height: 190,
    backgroundColor: Colors.border,
  },
  cardBody: {
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  storeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "88%",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    flexDirection: "row",
    flexWrap: "wrap",
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
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 10,
    backgroundColor: Colors.background,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.text,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: Colors.textSecondary,
  },
});
