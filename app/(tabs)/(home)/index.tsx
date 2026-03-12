import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Animated,
  Pressable,
  Platform,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, RelativePathString } from "expo-router";
import { Search, Star, MapPin, LogIn, X, Download, ShoppingBag, Store as StoreIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { stores, Store, Product } from "@/mocks/stores";
import { useUser } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";
import { getFirestoreStores, getAdminSettings } from "@/services/firestore";
import Footer from "@/components/Footer";

const CATEGORIES = ["Tümü", "Moda", "Teknoloji", "Gıda", "Dekorasyon", "Spor", "Butik", "Diğer"];

function StoreCard({ store, onPress, onProductPress }: { store: Store; onPress: () => void; onProductPress: (productId: string) => void }) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[styles.cardContainer, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`store-card-${store.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.storeInfo}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: store.avatar }} style={styles.storeAvatar} />
              {store.isOnline && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.storeTextInfo}>
              <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
              <View style={styles.ratingRow}>
                <Star size={13} color={Colors.accent} fill={Colors.accent} />
                <Text style={styles.ratingText}>{store.rating}</Text>
                <Text style={styles.reviewText}>({store.reviewCount})</Text>
              </View>
            </View>
          </View>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{store.category}</Text>
          </View>
        </View>

        {store.city ? (
          <View style={styles.cityRow}>
            <MapPin size={12} color={Colors.textLight} />
            <Text style={styles.cityText}>{store.city}</Text>
          </View>
        ) : null}

        <Text style={styles.storeDescription} numberOfLines={2}>
          {store.description}
        </Text>

        <View style={styles.productsRow}>
          {store.products.slice(0, 2).map((product) => (
            <TouchableOpacity key={product.id} style={styles.productItem} onPress={() => onProductPress(product.id)} activeOpacity={0.7}>
              <Image source={{ uri: product.image }} style={styles.productImage} />
              <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
              <Text style={styles.productPrice}>{product.price}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.storeGoButtonFull} onPress={onPress}>
            <Text style={styles.storeGoButtonText}>Mağazaya Git</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Animated.View>
  );
}

let deferredPrompt: any = null;

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

export default function MarketplaceScreen() {
  const router = useRouter();
  const { profile, isLoggedIn, uid } = useUser();
  const _alert = useAlert();
  const [installPrompt, setInstallPrompt] = useState<any>(deferredPrompt);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const standalone = (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    const handler = (e: any) => {
      e.preventDefault();
      deferredPrompt = e;
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPress = useCallback(async () => {
    if (Platform.OS !== 'web') return;

    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const result = await installPrompt.userChoice;
        if (result.outcome === 'accepted') {
          setInstallPrompt(null);
          deferredPrompt = null;
        }
      } catch (err) {
        console.log('Install prompt error:', err);
      }
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert('Ana ekrana eklemek için:\n\n1. Safari tarayıcısında açın\n2. Paylaş butonuna (□↑) dokunun\n3. "Ana Ekrana Ekle" seçeneğini seçin');
      } else {
        alert('Ana ekrana eklemek için:\n\n1. Tarayıcı menüsünü açın (⋮)\n2. "Ana ekrana ekle" veya "Uygulamayı yükle" seçeneğini seçin');
      }
    }
  }, [installPrompt]);

  const firestoreStoresQuery = useQuery({
    queryKey: ["firestoreStores"],
    queryFn: getFirestoreStores,
  });

  const adminSettingsQuery = useQuery({
    queryKey: ["adminSettings"],
    queryFn: async () => {
      const data = await getAdminSettings();
      return data;
    },
    staleTime: 60000,
  });

  const displaySiteName = adminSettingsQuery.data?.siteName || "butikbiz";
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Tümü");

  const allStores = useMemo(() => {
    const list: Store[] = [...stores];
    if (profile.isStore && profile.storeName) {
      const userStore: Store = {
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
      list.unshift(userStore);
    }
    const firestoreData = firestoreStoresQuery.data ?? [];
    const mockIds = new Set(stores.map((s) => s.id));
    for (const fs of firestoreData) {
      if ((fs as any).ownerId === uid) continue;
      if (mockIds.has(fs.id as string)) continue;
      list.push({
        id: fs.id as string,
        name: (fs.name as string) ?? "",
        avatar: (fs.avatar as string) ?? "",
        description: (fs.description as string) ?? "",
        category: (fs.category as string) ?? "Diğer",
        city: (fs.city as string) ?? undefined,
        rating: (fs.rating as number) ?? 5.0,
        reviewCount: (fs.reviewCount as number) ?? 0,
        isOnline: (fs.isOnline as boolean) ?? true,
        products: ((fs.products as Product[]) ?? []),
        ownerId: (fs.ownerId as string) ?? undefined,
      });
    }
    return list;
  }, [profile, firestoreStoresQuery.data, uid]);

  const { filteredStores, matchedProducts } = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const stores: Store[] = [];
    const products: { product: Product; store: Store }[] = [];

    for (const store of allStores) {
      if (!store.isOnline) continue;
      const matchesCategory = selectedCategory === "Tümü" || store.category === selectedCategory;
      if (!matchesCategory) continue;

      if (!query) {
        stores.push(store);
        continue;
      }

      const storeNameMatch = store.name.toLowerCase().includes(query);
      const storeDescMatch = store.description.toLowerCase().includes(query);

      if (storeNameMatch || storeDescMatch) {
        stores.push(store);
      }

      for (const product of store.products) {
        if (product.name.toLowerCase().includes(query)) {
          products.push({ product, store });
        }
      }
    }

    return { filteredStores: stores, matchedProducts: products };
  }, [allStores, searchQuery, selectedCategory]);

  const handleStorePress = useCallback((storeId: string) => {
    router.push(`/store/${storeId}` as any);
  }, [router]);

  const handleProductPress = useCallback((productId: string, storeId: string, resolvedOwnerId: string) => {
    router.push({
      pathname: "/product/[id]" as RelativePathString,
      params: { id: productId, storeId, storeOwnerId: resolvedOwnerId },
    });
  }, [router]);

  const renderStore = useCallback(({ item }: { item: Store }) => (
    <StoreCard
      store={item}
      onPress={() => handleStorePress(item.id)}
      onProductPress={(productId) => handleProductPress(productId, item.id, item.ownerId || item.id)}
    />
  ), [handleStorePress, handleProductPress]);

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const searchInputRef = useRef<TextInput>(null);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    searchInputRef.current?.blur();
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.topBarWrapper, { paddingTop: insets.top + 4 }]}>
        <View style={styles.topBarRow1}>
          <Text style={styles.brandText}>{displaySiteName}</Text>
          <View style={styles.topBarActions}>
            {Platform.OS === 'web' && !isStandalone && (
              <TouchableOpacity
                style={styles.installBtn}
                onPress={handleInstallPress}
                testID="install-app-btn"
                activeOpacity={0.7}
              >
                <Download size={14} color={Colors.white} />
                <Text style={styles.installBtnText}>Ana Ekrana Ekle</Text>
              </TouchableOpacity>
            )}
            {!isLoggedIn && (
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => router.push("/login?mode=register" as never)}
                testID="header-login-btn"
                activeOpacity={0.7}
              >
                <LogIn size={15} color={Colors.white} />
                <Text style={styles.loginBtnText}>Giriş Yap</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.searchBarRow}>
          <View style={[
            styles.searchBar,
            searchFocused && styles.searchBarFocused,
          ]}>
            <Search size={18} color={searchFocused ? Colors.primary : "#8E9AAF"} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Mağaza veya ürün ara..."
              placeholderTextColor="#8E9AAF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              testID="search-input"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color="#8E9AAF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item, index) => `${item}-${index}`}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(item)}
              testID={`category-${item}`}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === item && styles.categoryChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredStores}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderStore}
        contentContainerStyle={styles.storesList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              queryClient.invalidateQueries({ queryKey: ["firestoreStores"] }).then(() => setRefreshing(false)).catch(() => setRefreshing(false));
            }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListHeaderComponent={
          matchedProducts.length > 0 && searchQuery.trim().length > 0 ? (
            <View style={styles.productResultsSection}>
              <View style={styles.sectionHeader}>
                <ShoppingBag size={16} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Ürünler</Text>
                <View style={styles.resultBadge}>
                  <Text style={styles.resultBadgeText}>{matchedProducts.length}</Text>
                </View>
              </View>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={matchedProducts}
                keyExtractor={(item, index) => `product-${item.product.id}-${item.store.id}-${index}`}
                contentContainerStyle={styles.productResultsList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.productResultCard}
                    activeOpacity={0.7}
                    onPress={() => handleProductPress(item.product.id, item.store.id, item.store.ownerId || item.store.id)}
                  >
                    <Image source={{ uri: item.product.image }} style={styles.productResultImage} />
                    <View style={styles.productResultInfo}>
                      <Text style={styles.productResultName} numberOfLines={2}>{item.product.name}</Text>
                      <Text style={styles.productResultPrice}>{item.product.price}</Text>
                      <View style={styles.productResultStore}>
                        <Image source={{ uri: item.store.avatar }} style={styles.productResultStoreAvatar} />
                        <Text style={styles.productResultStoreName} numberOfLines={1}>{item.store.name}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
              {filteredStores.length > 0 && (
                <View style={styles.sectionHeader2}>
                  <StoreIcon size={16} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Mağazalar</Text>
                  <View style={styles.resultBadge}>
                    <Text style={styles.resultBadgeText}>{filteredStores.length}</Text>
                  </View>
                </View>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          matchedProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MapPin size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
              <Text style={styles.emptySubtext}>Farklı bir arama deneyin</Text>
            </View>
          ) : null
        }
        ListFooterComponent={<Footer />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBarWrapper: {
    backgroundColor: Colors.primary,
    paddingBottom: 12,
  },
  topBarRow1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  brandText: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  loginBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  topBarActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  installBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  installBtnText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "700" as const,
  },
  searchBarRow: {
    paddingHorizontal: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchBarFocused: {
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineStyle: "none" as any,
      },
    }),
  },
  categoriesContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  categoriesList: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600" as const,
  },
  categoryChipTextActive: {
    color: Colors.white,
  },
  storesList: {
    padding: 14,
    gap: 14,
  },
  cardContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    paddingBottom: 4,
  },
  storeInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  avatarWrapper: {
    position: "relative",
  },
  storeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.border,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.online,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  storeTextInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  reviewText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  categoryBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600" as const,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  cityText: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: "500" as const,
  },
  storeDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
  },
  productsRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 10,
    paddingBottom: 12,
  },
  productItem: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Colors.background,
  },
  productImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    backgroundColor: Colors.border,
  },
  productName: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: 6,
    paddingHorizontal: 8,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.primary,
    paddingHorizontal: 8,
    paddingBottom: 8,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  storeGoButton: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  storeGoButtonFull: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  storeGoButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700" as const,
  },
  chatButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  chatButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
  },
  productResultsSection: {
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionHeader2: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  resultBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 2,
  },
  resultBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "700" as const,
  },
  productResultsList: {
    gap: 10,
  },
  productResultCard: {
    width: 140,
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  productResultImage: {
    width: "100%",
    height: 130,
    backgroundColor: Colors.border,
  },
  productResultInfo: {
    padding: 8,
  },
  productResultName: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.text,
    lineHeight: 16,
  },
  productResultPrice: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.primary,
    marginTop: 3,
  },
  productResultStore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  productResultStoreAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  productResultStoreName: {
    fontSize: 10,
    color: Colors.textLight,
    fontWeight: "500" as const,
    flex: 1,
  },
});
