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
  Modal,
  PanResponder,
  GestureResponderEvent,
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { stores } from "@/mocks/stores";
import { useUser, type FavoriteProductSnapshot } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";
import { getProductLink } from "@/utils/links";
import { getChatId, getFirestoreStore, getOrCreateChat } from "@/services/firestore";

interface ZoomableImageProps {
  uri: string;
  width: number;
  height: number;
}

function ZoomableImage({ uri, width, height }: ZoomableImageProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);
  const initialDistance = useRef(0);
  const lastTap = useRef(0);
  const isPinching = useRef(false);
  const initialPinchX = useRef(0);
  const initialPinchY = useRef(0);

  const getDistance = (touches: GestureResponderEvent["nativeEvent"]["touches"]) => {
    if (!touches || touches.length < 2) return 0;
    const dx = (touches[0]?.pageX ?? 0) - (touches[1]?.pageX ?? 0);
    const dy = (touches[0]?.pageY ?? 0) - (touches[1]?.pageY ?? 0);
    return Math.sqrt(dx * dx + dy * dy);
  };

  const resetZoom = useCallback(() => {
    lastScale.current = 1;
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 7 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 7 }),
    ]).start();
  }, [scale, translateX, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2 || isPinching.current;
      },
      onPanResponderGrant: (evt) => {
        const now = Date.now();
        if (evt.nativeEvent.touches.length === 1 && now - lastTap.current < 300) {
          if (lastScale.current > 1.1) {
            resetZoom();
          } else {
            lastScale.current = 2.5;
            lastTranslateX.current = 0;
            lastTranslateY.current = 0;
            Animated.parallel([
              Animated.spring(scale, { toValue: 2.5, useNativeDriver: true, friction: 7 }),
              Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 7 }),
              Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 7 }),
            ]).start();
          }
          lastTap.current = 0;
          return;
        }
        lastTap.current = now;

        if (evt.nativeEvent.touches.length >= 2) {
          isPinching.current = true;
          initialDistance.current = getDistance(evt.nativeEvent.touches);
          initialPinchX.current = lastTranslateX.current;
          initialPinchY.current = lastTranslateY.current;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (evt.nativeEvent.touches.length >= 2) {
          isPinching.current = true;
          const dist = getDistance(evt.nativeEvent.touches);
          if (initialDistance.current > 0 && dist > 0) {
            const newScale = Math.min(Math.max(lastScale.current * (dist / initialDistance.current), 1), 5);
            scale.setValue(newScale);
          }
        } else if (lastScale.current > 1.05 && !isPinching.current) {
          const newX = lastTranslateX.current + gestureState.dx;
          const newY = lastTranslateY.current + gestureState.dy;
          translateX.setValue(newX);
          translateY.setValue(newY);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (isPinching.current) {
          const currentScale = (scale as any).__getValue?.() ?? lastScale.current;
          if (currentScale < 1.1) {
            resetZoom();
          } else {
            lastScale.current = currentScale;
            lastTranslateX.current = initialPinchX.current;
            lastTranslateY.current = initialPinchY.current;
          }
          isPinching.current = false;
          initialDistance.current = 0;
        } else if (lastScale.current > 1.05) {
          lastTranslateX.current += gestureState.dx;
          lastTranslateY.current += gestureState.dy;
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        width,
        height,
        overflow: "hidden" as const,
      }}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={{
          width,
          height,
          transform: [
            { translateX },
            { translateY },
            { scale },
          ],
        }}
      >
        <Image
          source={{ uri }}
          style={{ width, height, borderRadius: 12, backgroundColor: "transparent" }}
          contentFit="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

export default function ProductDetailScreen() {
  const { id, storeId, storeOwnerId: storeOwnerIdParam } = useLocalSearchParams<{ id: string; storeId: string; storeOwnerId?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, isLoggedIn, uid, toggleFavorite: toggleFavoriteProduct } = useUser();
  const { showAlert } = useAlert();
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [imageViewerVisible, setImageViewerVisible] = useState<boolean>(false);
  const [viewerImageIndex, setViewerImageIndex] = useState<number>(0);
  const viewerOpacity = useRef(new Animated.Value(0)).current;
  const viewerScale = useRef(new Animated.Value(0.85)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const favoritePulse = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const imageHeight = windowWidth * 0.85;
  const viewerImageHeight = windowHeight * 0.75;

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

  const isMockStore = !!storeId && (storeId === "my-store" || !!stores.find((s) => s.id === storeId));

  const firestoreStoreQuery = useQuery({
    queryKey: ["firestoreStore", storeId],
    queryFn: () => getFirestoreStore(storeId!),
    enabled: !!storeId && !isMockStore,
  });

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
    if (firestoreStoreQuery.data) {
      const fs = firestoreStoreQuery.data;
      const products = (fs.products as any[]) ?? [];
      const fp = products.find((p: any) => p.id === id);
      if (fp) {
        return {
          product: {
            id: fp.id as string,
            name: (fp.name as string) ?? "",
            price: (fp.price as string) ?? "",
            image: (fp.image as string) ?? "",
            images: (fp.images as string[]) ?? [],
            description: (fp.description as string) ?? "",
            features: (fp.features as string[]) ?? [],
          },
          store: {
            id: (fs.id as string) ?? storeId ?? "",
            name: (fs.name as string) ?? "",
            avatar: (fs.avatar as string) ?? "",
            category: (fs.category as string) ?? "Diğer",
            rating: (fs.rating as number) ?? 5.0,
            isOnline: (fs.isOnline as boolean) ?? true,
          },
        };
      }
    }
    return null;
  }, [id, storeId, profile.storeProducts, userStore, firestoreStoreQuery.data]);

  const productData = result?.product;
  const storeData = result?.store;

  const isFavorite = useMemo(() => {
    if (!id) return false;
    return profile.favorites.includes(id);
  }, [id, profile.favorites]);

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

  const onViewerScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / windowWidth);
      setViewerImageIndex(index);
    },
    [windowWidth]
  );

  const openImageViewer = useCallback((index: number) => {
    setViewerImageIndex(index);
    setImageViewerVisible(true);
    Animated.parallel([
      Animated.timing(viewerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(viewerScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }),
    ]).start();
  }, [viewerOpacity, viewerScale]);

  const closeImageViewer = useCallback(() => {
    Animated.parallel([
      Animated.timing(viewerOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(viewerScale, { toValue: 0.85, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setImageViewerVisible(false);
    });
  }, [viewerOpacity, viewerScale]);

  const handleToggleFavorite = useCallback(() => {
    if (!productData) {
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

    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Animated.parallel([
      Animated.sequence([
        Animated.spring(heartScale, {
          toValue: 1.26,
          useNativeDriver: true,
          speed: 50,
        }),
        Animated.spring(heartScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(favoritePulse, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(favoritePulse, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const favoriteSnapshot: FavoriteProductSnapshot = {
      productId: productData.id,
      storeId: storeData?.id ?? storeId ?? "",
      storeOwnerId: storeOwnerIdParam ?? ((firestoreStoreQuery.data?.ownerId as string | undefined) ?? (storeData?.id ?? storeId ?? "")),
      storeName: storeData?.name ?? "Mağaza",
      storeAvatar: storeData?.avatar ?? "",
      productName: productData.name ?? "",
      productPrice: productData.price ?? "",
      productImage: productData.image ?? "",
      productDescription: productData.description ?? "",
      addedAt: new Date().toISOString(),
    };

    void toggleFavoriteProduct(productData.id, favoriteSnapshot).catch((error: unknown) => {
      console.error("Favorite toggle failed:", error);
      showAlert("Hata", "Favori güncellenirken bir sorun oluştu. Lütfen tekrar deneyin.");
    });
  }, [productData, isLoggedIn, showAlert, router, heartScale, favoritePulse, toggleFavoriteProduct, storeData, storeId, storeOwnerIdParam, firestoreStoreQuery.data]);

  const bestProductImage = useMemo(() => {
    if (!productData) return "";
    const isValidUrl = (val: unknown): val is string =>
      typeof val === "string" && val.trim().length > 5 && (val.trim().startsWith("http://") || val.trim().startsWith("https://"));

    const imgs = (productData as any).images as string[] | undefined;
    if (imgs && Array.isArray(imgs)) {
      for (const img of imgs) {
        if (isValidUrl(img)) {
          console.log("bestProductImage: found from images array:", img.substring(0, 80));
          return img.trim();
        }
      }
    }
    if (isValidUrl(productData.image)) {
      console.log("bestProductImage: found from image field:", productData.image.substring(0, 80));
      return productData.image.trim();
    }
    if (isValidUrl(storeData?.avatar)) {
      console.log("bestProductImage: fallback to store avatar:", storeData!.avatar.substring(0, 80));
      return storeData!.avatar.trim();
    }
    console.log("bestProductImage: no valid image found for product:", productData.name, "image field:", productData.image, "images:", imgs);
    return "";
  }, [productData, storeData]);

  const handleShare = useCallback(async () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const productUrl = getProductLink(productData?.name ?? "", storeData?.name);
      const shareMessage = `${productData?.name} - ${productData?.price}\n${storeData?.name} mağazasında bu ürüne göz at!\n${productUrl}`;
      if (Platform.OS === "ios") {
        await Share.share({
          message: shareMessage,
          url: productUrl,
          title: productData?.name ?? "Ürün",
        });
      } else {
        await Share.share({
          message: shareMessage,
          title: productData?.name ?? "Ürün",
        });
      }
    } catch (error) {
      console.log("Share error:", error);
    }
  }, [productData, storeData]);

  const resolvedStoreOwnerId = useMemo(() => {
    if (storeOwnerIdParam) return storeOwnerIdParam;
    if (firestoreStoreQuery.data && firestoreStoreQuery.data.ownerId) {
      return firestoreStoreQuery.data.ownerId as string;
    }
    const targetStoreId = storeData?.id ?? storeId ?? "unknown";
    return targetStoreId;
  }, [storeOwnerIdParam, storeData, storeId, firestoreStoreQuery.data]);

  const startChatMutation = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("Giriş yapmalısınız");
      const targetStoreId = storeData?.id ?? storeId ?? "unknown";
      if (!resolvedStoreOwnerId || resolvedStoreOwnerId === "unknown") {
        throw new Error("Mağaza bilgisi alınamadı. Lütfen tekrar deneyin.");
      }
      const chatId = getChatId(uid, resolvedStoreOwnerId);
      console.log("Creating chat from product - storeOwnerId:", resolvedStoreOwnerId, "storeId:", targetStoreId, "chatId:", chatId, "uid:", uid);
      await getOrCreateChat({
        chatId,
        userId: uid,
        storeId: targetStoreId,
        storeName: storeData?.name ?? "Mağaza",
        storeAvatar: storeData?.avatar ?? "",
        storeOwnerId: resolvedStoreOwnerId,
        customerName: profile.name || profile.firstName || "Müşteri",
        customerAvatar: profile.avatar || "",
      });
      return { chatId, targetStoreId };
    },
    onSuccess: ({ chatId, targetStoreId }) => {
      console.log("Product chat created successfully:", chatId);
      void queryClient.invalidateQueries({ queryKey: ["userChats", uid] });
      const productInfo = `🛍️ ${productData?.name}\n💰 ${productData?.price}\n\nBu ürün hakkında bilgi almak istiyorum.`;
      const safeProductImage = bestProductImage || "";
      console.log("Product chat navigate - bestProductImage:", bestProductImage, "safeProductImage:", safeProductImage.substring(0, 120));
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
          productImage: safeProductImage,
          productName: productData?.name ?? "",
          productPrice: productData?.price ?? "",
        },
      });
    },
    onError: (err: any) => {
      console.error("Chat creation error from product:", err?.message, err);
      showAlert("Hata", err?.message || "Sohbet başlatılırken bir hata oluştu. Lütfen tekrar deneyin.");
    },
  });

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
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    startChatMutation.mutate();
  }, [isLoggedIn, showAlert, router, startChatMutation]);

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
                renderItem={({ item, index }) => (
                  <TouchableOpacity activeOpacity={0.9} onPress={() => openImageViewer(index)}>
                    <Image
                      source={{ uri: item }}
                      style={[styles.productImage, { width: windowWidth, height: imageHeight }]}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
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
            <TouchableOpacity activeOpacity={0.9} onPress={() => openImageViewer(0)}>
              <Image
                source={{ uri: productData.image }}
                style={[styles.productImage, { width: windowWidth, height: imageHeight }]}
                contentFit="cover"
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 10 }]}
            onPress={() => router.back()}
            testID="product-back"
          >
            <X size={22} color={Colors.text} />
          </TouchableOpacity>

          <View style={[styles.imageActions, { top: insets.top + 10 }]}> 
            <View style={styles.favoriteActionWrap}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.favoriteHalo,
                  {
                    opacity: favoritePulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.28],
                    }),
                    transform: [{
                      scale: favoritePulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1.45],
                      }),
                    }],
                  },
                ]}
              />
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <TouchableOpacity
                  style={[
                    styles.actionCircle,
                    isFavorite && styles.actionCircleFavorite,
                  ]}
                  onPress={handleToggleFavorite}
                  testID="product-favorite"
                >
                  <Heart
                    size={22}
                    color={isFavorite ? Colors.white : Colors.text}
                    fill={isFavorite ? Colors.white : "transparent"}
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>

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

        <Modal
          visible={imageViewerVisible}
          transparent
          animationType="none"
          onRequestClose={closeImageViewer}
          statusBarTranslucent
        >
          <Animated.View style={[styles.viewerOverlay, { opacity: viewerOpacity }]}>
            <TouchableOpacity
              style={styles.viewerCloseArea}
              activeOpacity={1}
              onPress={closeImageViewer}
            />
            <Animated.View
              style={[
                styles.viewerContent,
                {
                  height: viewerImageHeight,
                  transform: [{ scale: viewerScale }],
                },
              ]}
            >
              {productImages.length > 1 ? (
                <>
                  <FlatList
                    data={productImages}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={onViewerScroll}
                    scrollEventThrottle={16}
                    initialScrollIndex={viewerImageIndex}
                    getItemLayout={(_, index) => ({
                      length: windowWidth - 32,
                      offset: (windowWidth - 32) * index,
                      index,
                    })}
                    keyExtractor={(item, index) => `viewer-${item}-${index}`}
                    renderItem={({ item }) => (
                      <ZoomableImage
                        uri={item}
                        width={windowWidth - 32}
                        height={viewerImageHeight}
                      />
                    )}
                  />
                  <View style={styles.viewerPagination}>
                    {productImages.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.viewerDot,
                          viewerImageIndex === index && styles.viewerDotActive,
                        ]}
                      />
                    ))}
                  </View>
                </>
              ) : (
                <ZoomableImage
                  uri={productData.image}
                  width={windowWidth - 32}
                  height={viewerImageHeight}
                />
              )}
            </Animated.View>
            <TouchableOpacity
              style={styles.viewerCloseButton}
              onPress={closeImageViewer}
              testID="image-viewer-close"
            >
              <X size={24} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.viewerCounter}>
              <Text style={styles.viewerCounterText}>
                {viewerImageIndex + 1} / {productImages.length}
              </Text>
            </View>
          </Animated.View>
        </Modal>

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
  favoriteActionWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteHalo: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.danger,
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
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerCloseArea: {
    ...StyleSheet.absoluteFillObject,
  },
  viewerContent: {
    width: "100%",
    paddingHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  viewerImage: {
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  viewerPagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  viewerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  viewerDotActive: {
    backgroundColor: Colors.white,
    width: 20,
    borderRadius: 4,
  },
  viewerCloseButton: {
    position: "absolute",
    top: 54,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerCounter: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  viewerCounterText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600" as const,
  },
});
