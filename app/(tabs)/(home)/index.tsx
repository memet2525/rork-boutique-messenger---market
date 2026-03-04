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
} from "react-native";
import { Image } from "expo-image";
import { useRouter, RelativePathString } from "expo-router";
import { Search, Star, MapPin, LogIn, X, Download, MessageCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { stores, Store, Product } from "@/mocks/stores";
import { useUser } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";
import { getFirestoreStores, getChatId } from "@/services/firestore";

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
  const { showAlert } = useAlert();
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

  const filteredStores = allStores.filter((store) => {
    if (!store.isOnline) return false;
    const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Tümü" || store.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleStorePress = useCallback((storeId: string) => {
    router.push(`/store/${storeId}` as any);
  }, [router]);

  const handleMessagePress = useCallback((store: Store) => {
    if (!isLoggedIn) {
      showAlert(
        "Üye Olun",
        "Satıcıya mesaj yazabilmek için üye olmanız gerekmektedir.",
        [
          { text: "Vazgeç", style: "cancel" },
          { text: "Giriş Yap / Üye Ol", onPress: () => router.push("/login" as any) },
        ]
      );
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const storeOwnerId = store.ownerId || store.id;
    const chatId = getChatId(uid ?? "anon", storeOwnerId);
    console.log("Starting chat from home - storeOwnerId:", storeOwnerId, "storeId:", store.id, "chatId:", chatId);
    router.push({
      pathname: "/chat/[id]" as RelativePathString,
      params: {
        id: chatId,
        storeId: store.id,
        storeName: store.name,
        storeAvatar: store.avatar,
        storeOwnerId: storeOwnerId,
        isOnline: store.isOnline ? "true" : "false",
      },
    });
  }, [isLoggedIn, uid, router, showAlert]);

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
  ), [handleStorePress, handleMessagePress, handleProductPress]);

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
          <Text style={styles.brandText}>butikbiz</Text>
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
                onPress={() => router.push("/login" as never)}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MapPin size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>Mağaza bulunamadı</Text>
            <Text style={styles.emptySubtext}>Farklı bir arama deneyin</Text>
          </View>
        }
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
});
