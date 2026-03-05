import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Pressable,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, Stack, RelativePathString } from "expo-router";
import {
  Star,
  Package,
  Plus,
  MapPin,
  Settings,
  BarChart3,
  ClipboardList,
  Share2,
  Link,
} from "lucide-react-native";
import { Share } from "react-native";

import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { getAddressFormLink, getStoreLink } from "@/utils/links";

function ProductCard({ product, onPress }: { product: { id: string; name: string; price: string; image: string }; onPress: () => void }) {
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
        testID={`my-store-product-${product.id}`}
      >
        <Image source={{ uri: product.image }} style={styles.productImage} />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.productPrice}>{product.price}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function MyStoreScreen() {
  const router = useRouter();
  const { profile, storeAddresses, refreshAddresses, uid } = useUser();
  const [refreshing, setRefreshing] = React.useState<boolean>(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshAddresses();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refreshAddresses]);

  const newAddressCount = useMemo(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return storeAddresses.filter((a) => a.createdAt > oneDayAgo).length;
  }, [storeAddresses]);

  const handleProductPress = useCallback((productId: string) => {
    router.push({
      pathname: "/product/[id]" as RelativePathString,
      params: { id: productId, storeId: "my-store", storeOwnerId: uid ?? "" },
    });
  }, [router, uid]);

  if (!profile.isStore) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: "Mağazam", headerStyle: { backgroundColor: Colors.primary }, headerTintColor: Colors.headerText, headerTitleStyle: { fontWeight: "700" as const } }} />
        <View style={styles.emptyContainer}>
          <Package size={64} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>Henüz mağazanız yok</Text>
          <Text style={styles.emptySubtitle}>Mağaza açarak ürünlerinizi satışa sunabilirsiniz</Text>
          <TouchableOpacity style={styles.openStoreButton} onPress={() => router.push("/open-store" as never)}>
            <Text style={styles.openStoreButtonText}>Mağaza Aç</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Mağazam",
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.headerText,
          headerTitleStyle: { fontWeight: "700" as const, fontSize: 16 },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.storeHeader}>
          <View style={styles.headerContent}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: profile.avatar }} style={styles.storeAvatar} />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{profile.storeName}</Text>
              <View style={styles.ratingRow}>
                <Star size={14} color={Colors.accent} fill={Colors.accent} />
                <Text style={styles.ratingText}>5.0</Text>
                <Text style={styles.reviewCount}>(0 değerlendirme)</Text>
              </View>
              {profile.storeCity ? (
                <View style={styles.cityRow}>
                  <MapPin size={13} color={Colors.textSecondary} />
                  <Text style={styles.cityText}>{profile.storeCity}</Text>
                </View>
              ) : null}
              <Text style={styles.categoryBadge}>{profile.storeCategory || "Diğer"}</Text>
            </View>
          </View>
          {profile.storeDescription ? (
            <Text style={styles.storeDescription}>{profile.storeDescription}</Text>
          ) : null}
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/add-product" as never)}
            testID="add-product-action"
          >
            <View style={[styles.actionIconBg, { backgroundColor: "rgba(7, 94, 84, 0.1)" }]}>
              <Plus size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Ürün Ekle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/address-list" as never)}
            testID="addresses-action"
          >
            <View style={[styles.actionIconBg, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
              <ClipboardList size={20} color="#F59E0B" />
            </View>
            <Text style={styles.actionLabel}>Adresler</Text>
            {newAddressCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{newAddressCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push({ pathname: "/store/[id]" as RelativePathString, params: { id: "my-store" } })}
            testID="view-store-action"
          >
            <View style={[styles.actionIconBg, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
              <BarChart3 size={20} color="#3B82F6" />
            </View>
            <Text style={styles.actionLabel}>Mağazayı Gör</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/open-store" as never)}
            testID="store-settings-action"
          >
            <View style={[styles.actionIconBg, { backgroundColor: "rgba(139, 92, 246, 0.1)" }]}>
              <Settings size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.actionLabel}>Ayarlar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.shareActions}>
          <TouchableOpacity
            style={styles.shareCard}
            onPress={async () => {
              const link = getAddressFormLink(profile.storeName || "");
              await Share.share({ message: `Adres formumu doldurun: ${link}`, url: link });
            }}
            testID="share-address-form"
          >
            <View style={[styles.shareIconBg, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
              <Share2 size={18} color="#10B981" />
            </View>
            <Text style={styles.shareLabel}>Adres Formunu Paylaş</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareCard}
            onPress={async () => {
              const link = getStoreLink(profile.storeName || "");
              await Share.share({ message: `Mağazamı ziyaret edin: ${link}`, url: link });
            }}
            testID="share-store-link"
          >
            <View style={[styles.shareIconBg, { backgroundColor: "rgba(99, 102, 241, 0.1)" }]}>
              <Link size={18} color="#6366F1" />
            </View>
            <Text style={styles.shareLabel}>Mağaza Linkini Paylaş</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{profile.storeProducts?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Ürün</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{storeAddresses.length}</Text>
            <Text style={styles.statLabel}>Adres</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{newAddressCount}</Text>
            <Text style={styles.statLabel}>Yeni</Text>
          </View>
        </View>

        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ürünlerim ({profile.storeProducts?.length ?? 0})</Text>
            <TouchableOpacity onPress={() => router.push("/add-product" as never)}>
              <Plus size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          {(!profile.storeProducts || profile.storeProducts.length === 0) ? (
            <View style={styles.emptyProducts}>
              <Package size={40} color={Colors.textLight} />
              <Text style={styles.emptyProductsText}>Henüz ürün eklemediniz</Text>
              <TouchableOpacity style={styles.addProductButton} onPress={() => router.push("/add-product" as never)}>
                <Plus size={16} color={Colors.white} />
                <Text style={styles.addProductButtonText}>İlk Ürünü Ekle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {profile.storeProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={() => handleProductPress(product.id)}
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  openStoreButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  openStoreButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700" as const,
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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.border,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 15,
    height: 15,
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
    fontSize: 19,
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
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cityText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  categoryBadge: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600" as const,
    backgroundColor: "rgba(7, 94, 84, 0.08)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
    overflow: "hidden",
  },
  storeDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 12,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.text,
    textAlign: "center",
  },
  badgeContainer: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: Colors.badge,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700" as const,
  },
  shareActions: {
    flexDirection: "row" as const,
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  shareCard: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  shareIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  shareLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  productsSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  emptyProducts: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyProductsText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  addProductButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  addProductButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600" as const,
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
    height: 140,
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
});
