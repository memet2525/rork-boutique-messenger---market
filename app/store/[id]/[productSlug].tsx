import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack, Redirect, RelativePathString } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Home } from "lucide-react-native";

import Colors from "@/constants/colors";
import { stores } from "@/mocks/stores";
import { slugify } from "@/utils/links";
import { getFirestoreStoreBySlug, getFirestoreStore } from "@/services/firestore";

export default function ProductSlugScreen() {
  const { id: storeParam, productSlug } = useLocalSearchParams<{ id: string; productSlug: string }>();
  const router = useRouter();

  const isMockStore = !!storeParam && (storeParam === "my-store" || !!stores.find((s) => s.id === storeParam));
  const isSlug = !!storeParam && !isMockStore && !storeParam.match(/^[a-zA-Z0-9]{20,}$/);

  const firestoreStoreQuery = useQuery({
    queryKey: ["firestoreStore", storeParam],
    queryFn: () => getFirestoreStore(storeParam!),
    enabled: !!storeParam && !isMockStore && !isSlug,
  });

  const firestoreSlugQuery = useQuery({
    queryKey: ["firestoreStoreBySlug", storeParam],
    queryFn: () => getFirestoreStoreBySlug(storeParam!),
    enabled: !!storeParam && isSlug,
  });

  const firestoreData = firestoreStoreQuery.data ?? firestoreSlugQuery.data ?? null;
  const isLoading = (firestoreStoreQuery.isLoading && !isMockStore && !isSlug) || (firestoreSlugQuery.isLoading && isSlug);

  const resolved = useMemo(() => {
    const normalizedSlug = productSlug?.toLowerCase() ?? "";

    const mockStore = stores.find((s) => s.id === storeParam) ?? stores.find((s) => slugify(s.name) === storeParam);
    if (mockStore) {
      const product = mockStore.products.find((p) => slugify(p.name) === normalizedSlug);
      if (product) {
        return { productId: product.id, storeId: mockStore.id, storeOwnerId: mockStore.ownerId ?? mockStore.id };
      }
    }

    if (firestoreData) {
      const products = (firestoreData.products as any[]) ?? [];
      const product = products.find((p: any) => slugify(p.name ?? "") === normalizedSlug);
      if (product) {
        return {
          productId: product.id as string,
          storeId: (firestoreData.id as string) ?? storeParam ?? "",
          storeOwnerId: (firestoreData.ownerId as string) ?? (firestoreData.id as string) ?? storeParam ?? "",
        };
      }
    }

    return null;
  }, [storeParam, productSlug, firestoreData]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: "Yükleniyor...",
            headerStyle: { backgroundColor: Colors.primary },
            headerTintColor: Colors.headerText,
          }}
        />
        <View style={styles.container}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Ürün aranıyor...</Text>
        </View>
      </>
    );
  }

  if (resolved) {
    return (
      <Redirect
        href={{
          pathname: "/product/[id]" as RelativePathString,
          params: {
            id: resolved.productId,
            storeId: resolved.storeId,
            storeOwnerId: resolved.storeOwnerId,
          },
        }}
      />
    );
  }

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
      <View style={styles.container}>
        <ShoppingBag size={48} color={Colors.textLight} />
        <Text style={styles.errorText}>Ürün bulunamadı</Text>
        <Text style={styles.errorSubText}>Bu ürün kaldırılmış veya link hatalı olabilir.</Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.replace("/")}
          testID="go-home"
        >
          <Home size={18} color={Colors.white} />
          <Text style={styles.homeButtonText}>Ana Sayfaya Dön</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: 12,
    padding: 20,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: 8,
  },
  errorSubText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  homeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  homeButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.white,
  },
});
