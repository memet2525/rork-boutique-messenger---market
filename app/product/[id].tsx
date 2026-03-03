import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Share,
  Platform,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, Stack, RelativePathString } from "expo-router";
import {
  Heart,
  Share2,
  Check,
  ShoppingBag,
  MessageCircle,
  X,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { stores } from "@/mocks/stores";
import { useUser } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";
import { getProductLink } from "@/utils/links";
import { getChatId } from "@/services/firestore";

export default function ProductDetailScreen() {
  const { id, storeId, storeOwnerId: storeOwnerIdParam } = useLocalSearchParams<{ id: string; storeId: string; storeOwnerId?: string }>();
  const router = useRouter();
  const { profile, isLoggedIn, uid } = useUser();
  const { showAlert } = useAlert();
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const heartScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = Dimensions.get("window");
  const imageHeight = windowWidth * 0.85;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const userStore = useMemo(() => {
    if (!profile.isStore) return null;
    return {
      id: "my-store",
      name: profile.storeName,
      avatar: profile.avatar,
      category: profile.storeCategory || "Diğer",
      rating: 5.0,
      isOnline: true,
    };
  }, [profile]);

  const result = useMemo(() => {
    for (const sp of (profile.storeProducts ?? [])) {
      if (sp.id === id) {
        return {
          product: {
            id: sp.id,
            name: sp.name,
            price: sp.price,
            image: sp.image,
            images: sp.images,
            description: sp.description,
            features: sp.features,
          },
          store: userStore,
        };
      }
    }
    if (storeId && storeId !== "my-store") {
      const s = stores.find((st) => st.id === storeId);
      if (s) {
        const p = s.products.find((pr) => pr.id === id);
        if (p) return { product: p, store: s };
      }
    }
    for (const s of stores) {
      const p = s.products.find((pr) => pr.id === id);
      if (p) return { product: p, store: s };
    }
    return null;
  }, [id, storeId, profile.storeProducts, userStore]);

  const productData = result?.product;
  const storeData = result?.store;

  const productImages = useMemo(() => {
    if (!productData) return [];
    const imgs = (productData as any).images as string[] | undefined;
    if (imgs && imgs.length > 0) return imgs;
    return productData.image ? [productData.image] : [];
  }, [productData]);

  const onImageScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / windowWidth);
      setActiveImageIndex(index);
    },
    [windowWidth]
  );

  const toggleFavorite = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsFavorite((prev) => !prev);
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.3,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heartScale]);

  const handleShare = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const productUrl = getProductLink(productData?.name ?? "", storeData?.name);
      await Share.share({
        message: `${productData?.name} - ${productData?.price}\n${storeData?.name} mağazasında bu ürüne göz at!\n${productUrl}`,
        title: productData?.name ?? "Ürün",
      });
    } catch (error) {
      console.log("Share error:", error);
    }
  }, [productData, storeData]);

  const resolvedStoreOwnerId = useMemo(() => {
    if (storeOwnerIdParam) return storeOwnerIdParam;
    const targetStoreId = storeData?.id ?? storeId ?? "unknown";
    return targetStoreId;
  }, [storeOwnerIdParam, storeData, storeId]);

  const handleMessageStore = useCallback(() => {
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
    const targetStoreId = storeData?.id ?? storeId ?? "unknown";
    const chatId = getChatId(uid ?? "anon", resolvedStoreOwnerId);
    const productInfo = `🛍️ ${productData?.name}\n💰 ${productData?.price}\n\nBu ürün hakkında bilgi almak istiyorum.`;
    router.push({
      pathname: "/chat/[id]" as RelativePathString,
      params: {
        id: chatId,
        storeId: targetStoreId,
        storeName: storeData?.name ?? "",
        storeAvatar: storeData?.avatar ?? "",
        storeOwnerId: resolvedStoreOwnerId,
        isOnline: storeData?.isOnline ? "true" : "false",
        productMessage: productInfo,
        productImage: productData?.image ?? "",
        productName: productData?.name ?? "",
        productPrice: productData?.price ?? "",
      },
    });
  }, [router, productData, storeData, storeId, uid, isLoggedIn, showAlert, resolvedStoreOwnerId]);

  if (!productData) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: "Ürün Detayı",
            headerStyle: { backgroundColor: Colors.primary },
            headerTintColor: Colors.headerText,
          }}
        />
        <View style={styles.errorContainer}>
          <ShoppingBag size={48} color={Colors.textLight} />
          <Text style={styles.errorText}>Ürün bulunamadı</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={[styles.imageSection, { width: windowWidth, height: imageHeight }]}>
          {productImages.length > 1 ? (
            <>
              <FlatList
                data={productImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onImageScroll}
                scrollEventThrottle={16}
                keyExtractor={(item, index) => `${item}-${index}`}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item }}
                    style={[styles.productImage, { width: windowWidth, height: imageHeight }]}
                    contentFit="cover"
                  />
                )}
              />
              <View style={styles.pagination}>
                {productImages.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      activeImageIndex === index && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <Image
              source={{ uri: productData.image }}
              style={[styles.productImage, { width: windowWidth, height: imageHeight }]}
              contentFit="cover"
            />
          )}

          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 10 }]}
            onPress={() => router.back()}
            testID="product-back"
          >
            <X size={22} color={Colors.text} />
          </TouchableOpacity>

          <View style={[styles.imageActions, { top: insets.top + 10 }]}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <TouchableOpacity
                style={[
                  styles.actionCircle,
                  isFavorite && styles.actionCircleFavorite,
                ]}
                onPress={toggleFavorite}
                testID="product-favorite"
              >
                <Heart
                  size={22}
                  color={isFavorite ? Colors.white : Colors.text}
                  fill={isFavorite ? Colors.danger : "transparent"}
                />
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={styles.actionCircle}
              onPress={handleShare}
              testID="product-share"
            >
              <Share2 size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.priceTag}>
            <Text style={styles.priceTagText}>{productData.price}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.detailsSection}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.detailsContent}
        >
          <Text style={styles.productName}>{productData.name}</Text>

          {storeData ? (
            <TouchableOpacity
              style={styles.storeRow}
              onPress={() => router.push(`/store/${storeData.id}` as any)}
              testID="product-store-link"
            >
              <Image source={{ uri: storeData.avatar }} style={styles.storeAvatar} />
              <View style={styles.storeTextInfo}>
                <Text style={styles.storeNameText}>{storeData.name}</Text>
                <Text style={styles.storeCategoryText}>{storeData.category}</Text>
              </View>
              <View style={styles.storeRatingBadge}>
                <Text style={styles.storeRatingText}>★ {storeData.rating}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {productData.description ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Açıklama</Text>
              <Text style={styles.descriptionText}>{productData.description}</Text>
            </View>
          ) : null}

          {productData.features && productData.features.length > 0 ? (
            <View style={styles.featuresSection}>
              <Text style={styles.sectionTitle}>Özellikler</Text>
              <View style={styles.featuresGrid}>
                {productData.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Check size={14} color={Colors.accent} />
                    </View>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              Fiyat ve stok bilgisi için satıcıyla iletişime geçin.
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={handleMessageStore}
            testID="product-message"
          >
            <MessageCircle size={20} color={Colors.white} />
            <Text style={styles.messageButtonText}>Satıcıya Yaz</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  imageSection: {
    position: "relative",
  },
  productImage: {
    backgroundColor: Colors.border,
  },
  pagination: {
    position: "absolute",
    bottom: 52,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  paginationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  paginationDotActive: {
    backgroundColor: Colors.white,
    width: 20,
    borderRadius: 4,
  },
  backButton: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageActions: {
    position: "absolute",
    right: 16,
    gap: 10,
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionCircleFavorite: {
    backgroundColor: Colors.danger,
  },
  priceTag: {
    position: "absolute",
    bottom: 16,
    left: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  priceTagText: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  detailsSection: {
    flex: 1,
  },
  detailsContent: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
    gap: 10,
  },
  storeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
  },
  storeTextInfo: {
    flex: 1,
  },
  storeNameText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  storeCategoryText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 1,
  },
  storeRatingBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  storeRatingText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  descriptionSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  featuresSection: {
    marginTop: 20,
  },
  featuresGrid: {
    gap: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(37, 211, 102, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  infoNote: {
    marginTop: 20,
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#FFC107",
  },
  infoNoteText: {
    fontSize: 13,
    color: "#795548",
    lineHeight: 18,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
});
