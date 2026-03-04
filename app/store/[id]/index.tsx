import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, Stack, RelativePathString } from "expo-router";
import {
  Star,
  MessageCircle,
  Share2,
  Heart,
  MapPin,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { stores, Store, Product } from "@/mocks/stores";
import { useUser } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";
import { getFirestoreStore, getFirestoreStoreBySlug, getChatId, getOrCreateChat } from "@/services/firestore";

function ProductCard({ product, storeId, onPress }: { product: Product; storeId: string; onPress: () => void }) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

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
        <TouchableOpacity style={styles.heartButton}>
          <Heart size={18} color={Colors.textLight} />
        </TouchableOpacity>
      </Pressable>
    </Animated.View>
  );
}

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, isLoggedIn, uid } = useUser();
  const { showAlert } = useAlert();

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
      queryClient.invalidateQueries({ queryKey: ["userChats", uid] });
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
          headerShown: true,
          title: store.name,
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.headerText,
          headerTitleStyle: { fontWeight: "700" as const, fontSize: 14 },
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.storeHeader}>
          <View style={styles.headerContent}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: store.avatar }} style={styles.storeAvatar} />
              {store.isOnline && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{store.name}</Text>
              <View style={styles.ratingRow}>
                <Star size={14} color={Colors.accent} fill={Colors.accent} />
                <Text style={styles.ratingText}>{store.rating}</Text>
                <Text style={styles.reviewCount}>({store.reviewCount} değerlendirme)</Text>
              </View>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: store.isOnline ? Colors.online : Colors.textLight }]} />
                <Text style={styles.statusText}>
                  {store.isOnline ? "Çevrimiçi" : "Çevrimdışı"}
                </Text>
              </View>
              {store.city ? (
                <View style={styles.cityRow}>
                  <MapPin size={13} color={Colors.textSecondary} />
                  <Text style={styles.cityText}>{store.city}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Text style={styles.storeDescription}>{store.description}</Text>

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
              testID="message-store"
            >
              <MessageCircle size={18} color={Colors.white} />
              <Text style={styles.messageStoreText}>Mesaj Gönder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton}>
              <Share2 size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Ürünler ({store.products.length})</Text>
          <View style={styles.productsGrid}>
            {store.products.map((product) => (
              <ProductCard key={product.id} product={product} storeId={store.id} onPress={() => handleProductPress(product.id)} />
            ))}
          </View>
        </View>
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
  storeHeader: {
    backgroundColor: Colors.white,
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerContent: {
    flexDirection: "row",
    gap: 14,
  },
  avatarWrapper: {
    position: "relative",
  },
  storeAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
  storeInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 3,
  },
  storeName: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  reviewCount: {
    fontSize: 13,
    color: Colors.textLight,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  cityText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  storeDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 14,
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
    borderRadius: 12,
    paddingVertical: 12,
  },
  messageStoreText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  shareButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  productsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 14,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  productCard: {
    width: "48%",
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: "100%",
    height: 150,
    backgroundColor: Colors.border,
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.primary,
    marginTop: 4,
  },
  heartButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
});
