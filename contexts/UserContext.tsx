import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/config/firebase";
import {
  getUserProfile,
  saveUserProfile,
  saveStore,
  deleteStore,
  sendAdminChatMessage,
  getStoreAddresses,
  deleteStoreAddress,
} from "@/services/firestore";
import { slugify } from "@/utils/links";

export interface AddressSubmission {
  id: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  city: string;
  district: string;
  neighborhood: string;
  addressLine: string;
  postalCode: string;
  note: string;
  productInfo?: string;
  createdAt: string;
}

export interface StoreProduct {
  id: string;
  name: string;
  price: string;
  image: string;
  images?: string[];
  description: string;
  stock: number;
  category: string;
  features: string[];
  createdAt: string;
}

export interface FavoriteProductSnapshot {
  productId: string;
  storeId: string;
  storeOwnerId: string;
  storeName: string;
  storeAvatar: string;
  productName: string;
  productPrice: string;
  productImage: string;
  productDescription: string;
  addedAt: string;
}

export type SubscriptionPlan = "none" | "trial" | "monthly" | "yearly";
export type SubscriptionStatus = "active" | "expired" | "pending_payment";

export interface UserProfile {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  isStore: boolean;
  storeName: string;
  storeDescription: string;
  storeCategory: string;
  storeCity: string;
  storePhone: string;
  storeProducts: StoreProduct[];
  addressSubmissions: AddressSubmission[];
  favorites: string[];
  favoriteSnapshots: FavoriteProductSnapshot[];
  notificationsEnabled: boolean;
  chatNotifications: boolean;
  orderNotifications: boolean;
  promoNotifications: boolean;
  profileVisibility: "everyone" | "contacts" | "nobody";
  lastSeenVisible: boolean;
  readReceipts: boolean;
  storeNameChangeCount: number;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  trialStartDate: string;
  trialEndDate: string;
  aiAutoReplyEnabled: boolean;
  systemNotifications: SystemNotification[];
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  read: boolean;
}

const DEFAULT_PROFILE: UserProfile = {
  firstName: "",
  lastName: "",
  name: "",
  email: "",
  phone: "",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
  isStore: false,
  storeName: "",
  storeDescription: "",
  storeCategory: "",
  storeCity: "",
  storePhone: "",
  storeProducts: [],
  addressSubmissions: [],
  favorites: [],
  favoriteSnapshots: [],
  notificationsEnabled: true,
  chatNotifications: true,
  orderNotifications: true,
  promoNotifications: false,
  profileVisibility: "everyone",
  lastSeenVisible: true,
  readReceipts: true,
  storeNameChangeCount: 0,
  subscriptionPlan: "none",
  subscriptionStatus: "expired",
  subscriptionStartDate: "",
  subscriptionEndDate: "",
  trialStartDate: "",
  trialEndDate: "",
  aiAutoReplyEnabled: false,
  systemNotifications: [
    {
      id: "notif_test_1",
      title: "ButikBiz'e Hos Geldiniz!",
      message: "Merhaba! ButikBiz platformuna hosgeldiniz. Burada binlerce butik magaza ve urunleri kesfedebilir, guvenle alisveris yapabilirsiniz. Iyi alisverisler!",
      type: "admin_message",
      createdAt: new Date().toISOString(),
      read: false,
    },
  ],
};

interface SaveProfileMutationInput {
  nextProfile: UserProfile;
  profilePatch: Partial<UserProfile>;
}

function buildStorePayload(ownerId: string, nextProfile: UserProfile): Record<string, unknown> {
  const displayName = nextProfile.name.trim() || `${nextProfile.firstName} ${nextProfile.lastName}`.trim() || nextProfile.storeName.trim();

  return {
    name: nextProfile.storeName,
    slug: slugify(nextProfile.storeName),
    avatar: nextProfile.avatar,
    description: nextProfile.storeDescription || "",
    category: nextProfile.storeCategory || "Diger",
    city: nextProfile.storeCity || "",
    phone: nextProfile.storePhone || nextProfile.phone || "",
    rating: 5.0,
    reviewCount: 0,
    isOnline: true,
    ownerId,
    ownerName: displayName,
    email: nextProfile.email || "",
    subscriptionPlan: nextProfile.subscriptionPlan,
    subscriptionStatus: nextProfile.subscriptionStatus,
    planStartDate: nextProfile.subscriptionStartDate || nextProfile.trialStartDate || "",
    planEndDate: nextProfile.subscriptionEndDate || nextProfile.trialEndDate || "",
    products: (nextProfile.storeProducts ?? []).map((sp) => ({
      id: sp.id,
      name: sp.name,
      price: sp.price,
      image: sp.image,
      images: sp.images ?? [],
      description: sp.description,
      features: sp.features,
    })),
  };
}

export const [UserProvider, useUser] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const profileRef = useRef<UserProfile>(DEFAULT_PROFILE);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Firebase Auth state:", user?.uid ?? "signed out");
      if (user) {
        setUid(user.uid);
        setIsLoggedIn(true);
      } else {
        setUid(null);
        setIsLoggedIn(false);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const profileQuery = useQuery({
    queryKey: ["userProfile", uid],
    queryFn: async () => {
      if (!uid) return DEFAULT_PROFILE;
      console.log("Loading profile from Firestore:", uid);
      const data = await getUserProfile(uid);
      if (data) {
        const merged = { ...DEFAULT_PROFILE, ...data } as UserProfile;
        merged.storeProducts = Array.isArray(merged.storeProducts) ? merged.storeProducts : [];
        merged.addressSubmissions = Array.isArray(merged.addressSubmissions) ? merged.addressSubmissions : [];
        merged.favorites = Array.isArray(merged.favorites) ? merged.favorites : [];
        merged.favoriteSnapshots = Array.isArray(merged.favoriteSnapshots) ? merged.favoriteSnapshots : [];
        merged.systemNotifications = Array.isArray(merged.systemNotifications) ? merged.systemNotifications : [];
        return merged;
      }
      return DEFAULT_PROFILE;
    },
    enabled: !!uid,
    refetchInterval: 30000,
  });

  const storeAddressesQuery = useQuery({
    queryKey: ["storeAddresses", uid],
    queryFn: async () => {
      if (!uid) return [];
      console.log("Loading store addresses from subcollection:", uid);
      const addresses = await getStoreAddresses(uid);
      return addresses as AddressSubmission[];
    },
    enabled: !!uid && profile.isStore,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ nextProfile, profilePatch }: SaveProfileMutationInput) => {
      if (!uid) {
        console.log("saveMutation: uid is null, skipping save");
        return nextProfile;
      }

      const { systemNotifications: _ignoredSystemNotifications, ...profileWithoutNotifications } = profilePatch;
      const patchKeys = Object.keys(profileWithoutNotifications);
      console.log(
        "Saving profile patch to Firestore...",
        uid,
        "keys:",
        patchKeys.join(", ") || "none",
        "name:",
        nextProfile.name,
        "avatar:",
        nextProfile.avatar?.substring(0, 60)
      );

      try {
        if (patchKeys.length > 0) {
          await saveUserProfile(uid, profileWithoutNotifications as Record<string, unknown>);
        }
        console.log("Profile saved successfully to Firestore for uid:", uid);
      } catch (saveErr) {
        console.error("CRITICAL: saveUserProfile failed:", saveErr);
        throw saveErr;
      }

      if (nextProfile.isStore && nextProfile.storeName) {
        await saveStore(uid, buildStorePayload(uid, nextProfile));
      } else if (!nextProfile.isStore) {
        await deleteStore(uid);
      }

      return nextProfile;
    },
    onSuccess: (savedProfile) => {
      if (uid && savedProfile) {
        console.log("Mutation success: updating query cache for uid:", uid);
        queryClient.setQueryData(["userProfile", uid], savedProfile);
      }
      void queryClient.invalidateQueries({ queryKey: ["firestoreStores"] });
      void queryClient.invalidateQueries({ queryKey: ["adminAllUsers"] });
      void queryClient.invalidateQueries({ queryKey: ["adminAllStores"] });
      void queryClient.invalidateQueries({ queryKey: ["adminRegistryUsers"] });
      void queryClient.invalidateQueries({ queryKey: ["adminRegistryStores"] });
    },
    onError: (error) => {
      console.error("saveMutation ERROR:", error);
    },
  });

  const lastSaveTimeRef = useRef<number>(0);

  useEffect(() => {
    if (profileQuery.data) {
      const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
      if (timeSinceLastSave < 5000) {
        console.log("Skipping profileQuery sync - recent save detected (", timeSinceLastSave, "ms ago)");
        return;
      }
      console.log("Syncing profile from Firestore query data, name:", profileQuery.data.name);
      setProfile(profileQuery.data);
      profileRef.current = profileQuery.data;
    }
  }, [profileQuery.data]);

  const lastReconciledSignatureRef = useRef<string>("");

  useEffect(() => {
    if (!uid || !profileQuery.data || authLoading) {
      return;
    }

    const authEmail = auth.currentUser?.email ?? "";
    const nextProfile = { ...DEFAULT_PROFILE, ...profileQuery.data } as UserProfile;
    const resolvedName = nextProfile.name.trim()
      || `${nextProfile.firstName} ${nextProfile.lastName}`.trim()
      || (authEmail ? authEmail.split("@")[0] : "");
    const resolvedEmail = nextProfile.email || authEmail;
    const reconciliationSignature = JSON.stringify({
      uid,
      resolvedName,
      resolvedEmail,
      isStore: nextProfile.isStore,
      storeName: nextProfile.storeName,
      storeCategory: nextProfile.storeCategory,
      storeCity: nextProfile.storeCity,
      storePhone: nextProfile.storePhone,
      subscriptionPlan: nextProfile.subscriptionPlan,
      subscriptionStatus: nextProfile.subscriptionStatus,
      storeProductsCount: nextProfile.storeProducts.length,
    });

    if (lastReconciledSignatureRef.current === reconciliationSignature) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        const profilePatch: Partial<UserProfile> = {};

        if (resolvedName && nextProfile.name !== resolvedName) {
          profilePatch.name = resolvedName;
        }

        if (resolvedEmail && nextProfile.email !== resolvedEmail) {
          profilePatch.email = resolvedEmail;
        }

        if (Object.keys(profilePatch).length > 0) {
          await saveUserProfile(uid, profilePatch as Record<string, unknown>);
        }

        if (nextProfile.isStore && nextProfile.storeName.trim().length > 0) {
          const syncedProfile = {
            ...nextProfile,
            ...profilePatch,
          } as UserProfile;
          await saveStore(uid, buildStorePayload(uid, syncedProfile));
        }

        if (!isCancelled) {
          lastReconciledSignatureRef.current = reconciliationSignature;
        }
      } catch (error) {
        console.log("Profile reconciliation error:", error);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [uid, profileQuery.data, authLoading]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<void> => {
      const latestProfile = profileRef.current;
      const updated = { ...latestProfile, ...updates };
      console.log("updateProfile called with updates:", Object.keys(updates), "name:", updated.name, "avatar:", updated.avatar?.substring(0, 60));
      setProfile(updated);
      profileRef.current = updated;
      lastSaveTimeRef.current = Date.now();
      try {
        await saveMutation.mutateAsync({
          nextProfile: updated,
          profilePatch: updates,
        });
        lastSaveTimeRef.current = Date.now();
        console.log("updateProfile: save completed successfully");
      } catch (err) {
        console.error("updateProfile: save FAILED, reverting to latest from ref:", err);
        lastSaveTimeRef.current = 0;
        throw err;
      }
    },
    [saveMutation]
  );

  const canChangeStoreName = useCallback(() => {
    return profile.storeNameChangeCount < 1;
  }, [profile.storeNameChangeCount]);

  const changeStoreName = useCallback(
    (newName: string) => {
      if (profile.storeNameChangeCount >= 1) {
        console.log("Store name change blocked: already changed once");
        return false;
      }
      const updated = {
        ...profile,
        storeName: newName,
        storeNameChangeCount: profile.storeNameChangeCount + 1,
      };
      setProfile(updated);
      saveMutation.mutate({
        nextProfile: updated,
        profilePatch: {
          storeName: newName,
          storeNameChangeCount: profile.storeNameChangeCount + 1,
        },
      });
      return true;
    },
    [profile, saveMutation]
  );

  const isSubscriptionActive = useCallback(() => {
    if (profile.subscriptionPlan === "trial") {
      const trialEnd = new Date(profile.trialEndDate);
      return trialEnd > new Date();
    }
    if (profile.subscriptionPlan === "monthly" || profile.subscriptionPlan === "yearly") {
      return profile.subscriptionStatus === "active";
    }
    return false;
  }, [profile]);

  const isTrialExpired = useCallback(() => {
    if (!profile.trialStartDate) return false;
    const trialEnd = new Date(profile.trialEndDate);
    return trialEnd <= new Date();
  }, [profile]);

  const getTrialDaysLeft = useCallback(() => {
    if (!profile.trialEndDate) return 0;
    const end = new Date(profile.trialEndDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [profile]);

  const toggleFavorite = useCallback(
    async (productId: string, snapshot?: FavoriteProductSnapshot): Promise<boolean> => {
      const latestProfile = profileRef.current;
      const currentFavorites = Array.isArray(latestProfile.favorites) ? latestProfile.favorites : [];
      const currentSnapshots = Array.isArray(latestProfile.favoriteSnapshots) ? latestProfile.favoriteSnapshots : [];
      const isCurrentlyFavorite = currentFavorites.includes(productId);

      const favorites = isCurrentlyFavorite
        ? currentFavorites.filter((id) => id !== productId)
        : [...currentFavorites, productId];

      const fallbackSnapshot: FavoriteProductSnapshot = {
        productId,
        storeId: "",
        storeOwnerId: "",
        storeName: "",
        storeAvatar: "",
        productName: "",
        productPrice: "",
        productImage: "",
        productDescription: "",
        addedAt: new Date().toISOString(),
      };

      const favoriteSnapshots = isCurrentlyFavorite
        ? currentSnapshots.filter((item) => item.productId !== productId)
        : [
            ...currentSnapshots.filter((item) => item.productId !== productId),
            snapshot ?? fallbackSnapshot,
          ];

      await updateProfile({ favorites, favoriteSnapshots });
      return !isCurrentlyFavorite;
    },
    [updateProfile]
  );

  const addStoreProduct = useCallback(
    async (product: Omit<StoreProduct, "id" | "createdAt">): Promise<StoreProduct> => {
      if (!uid) {
        throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
      }

      const latestProfile = profileRef.current;
      if (!latestProfile.isStore || latestProfile.storeName.trim().length === 0) {
        throw new Error("Ürün eklemek için önce mağaza açmanız gerekiyor.");
      }

      const newProduct: StoreProduct = {
        ...product,
        id: `sp_${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const latestProducts = Array.isArray(latestProfile.storeProducts) ? latestProfile.storeProducts : [];
      const updated = [...latestProducts, newProduct];

      await updateProfile({ storeProducts: updated });
      return newProduct;
    },
    [uid, updateProfile]
  );

  const deleteStoreProduct = useCallback(
    (productId: string) => {
      const updated = profile.storeProducts.filter((p) => p.id !== productId);
      void updateProfile({ storeProducts: updated });
    },
    [profile.storeProducts, updateProfile]
  );

  const updateStoreProduct = useCallback(
    (productId: string, updates: Partial<StoreProduct>) => {
      const updated = profile.storeProducts.map((p) =>
        p.id === productId ? { ...p, ...updates } : p
      );
      void updateProfile({ storeProducts: updated });
    },
    [profile.storeProducts, updateProfile]
  );

  const storeAddresses = useMemo(() => {
    return storeAddressesQuery.data ?? profile.addressSubmissions ?? [];
  }, [storeAddressesQuery.data, profile.addressSubmissions]);

  const addAddressSubmission = useCallback(
    (address: Omit<AddressSubmission, "id" | "createdAt">) => {
      const newAddress: AddressSubmission = {
        ...address,
        id: `addr_${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const updated = [...profile.addressSubmissions, newAddress];
      void updateProfile({ addressSubmissions: updated });
      return newAddress;
    },
    [profile.addressSubmissions, updateProfile]
  );

  const deleteAddressSubmission = useCallback(
    async (addressId: string) => {
      if (uid) {
        const success = await deleteStoreAddress(uid, addressId);
        if (success) {
          void queryClient.invalidateQueries({ queryKey: ["storeAddresses", uid] });
        }
      }
      const updated = profile.addressSubmissions.filter((a) => a.id !== addressId);
      void updateProfile({ addressSubmissions: updated });
    },
    [profile.addressSubmissions, updateProfile, uid, queryClient]
  );

  const refreshAddresses = useCallback(() => {
    if (uid) {
      void queryClient.invalidateQueries({ queryKey: ["storeAddresses", uid] });
    }
  }, [uid, queryClient]);

  const register = useCallback(
    async (firstName: string, lastName: string, email: string, password: string) => {
      try {
        console.log("Creating account with email:", email);
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const userUid = credential.user.uid;
        console.log("Account created:", userUid);

        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const newProfile: UserProfile = {
          ...DEFAULT_PROFILE,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: fullName,
          email: email.trim(),
        };

        setProfile(newProfile);
        queryClient.setQueryData(["userProfile", userUid], newProfile);
        await saveUserProfile(userUid, newProfile);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["adminAllUsers"] }),
          queryClient.invalidateQueries({ queryKey: ["adminRegistryUsers"] }),
        ]);

        try {
          await sendAdminChatMessage(
            userUid,
            `👋 Hoş geldiniz ${fullName}!\n\nButikBiz platformuna hoş geldiniz! Burada binlerce butik mağaza ve ürünleri keşfedebilir, güvenle alışveriş yapabilirsiniz.\n\nHerhangi bir sorunuz olursa bize buradan yazabilirsiniz. İyi alışverişler! 🛍️`
          );
          console.log("Welcome chat message sent to:", userUid);
        } catch (err) {
          console.log("Welcome message error:", err);
        }
      } catch (error) {
        console.log("Register error:", error);
        throw error;
      }
    },
    [queryClient]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        console.log("Signing in with email:", email);
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const userUid = credential.user.uid;
        console.log("Sign in success:", userUid);

        const existingData = await getUserProfile(userUid);
        if (existingData) {
          const merged = { ...DEFAULT_PROFILE, ...existingData } as UserProfile;
          merged.storeProducts = Array.isArray(merged.storeProducts) ? merged.storeProducts : [];
          merged.addressSubmissions = Array.isArray(merged.addressSubmissions) ? merged.addressSubmissions : [];
          merged.favorites = Array.isArray(merged.favorites) ? merged.favorites : [];
          merged.favoriteSnapshots = Array.isArray(merged.favoriteSnapshots) ? merged.favoriteSnapshots : [];
          merged.systemNotifications = Array.isArray(merged.systemNotifications) ? merged.systemNotifications : [];

          const profilePatch: Partial<UserProfile> = {};
          if (!merged.email && credential.user.email) {
            profilePatch.email = credential.user.email;
          }
          if (!merged.name.trim()) {
            profilePatch.name = credential.user.email?.split("@")[0] ?? email.trim().split("@")[0] ?? "Kullanici";
          }

          const syncedProfile = {
            ...merged,
            ...profilePatch,
          } as UserProfile;

          if (Object.keys(profilePatch).length > 0) {
            await saveUserProfile(userUid, profilePatch as Record<string, unknown>);
          }

          if (syncedProfile.isStore && syncedProfile.storeName.trim().length > 0) {
            await saveStore(userUid, buildStorePayload(userUid, syncedProfile));
          }

          setProfile(syncedProfile);
          queryClient.setQueryData(["userProfile", userUid], syncedProfile);
        } else {
          const fallbackName = credential.user.email?.split("@")[0] ?? email.trim().split("@")[0] ?? "Kullanici";
          const fallbackProfile: UserProfile = {
            ...DEFAULT_PROFILE,
            name: fallbackName,
            email: credential.user.email ?? email.trim(),
          };

          setProfile(fallbackProfile);
          queryClient.setQueryData(["userProfile", userUid], fallbackProfile);
          await saveUserProfile(userUid, fallbackProfile);
        }
      } catch (error) {
        console.log("Login error:", error);
        throw error;
      }
    },
    [queryClient]
  );

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log("Password reset email sent to:", email);
    } catch (error) {
      console.log("Password reset error:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.log("Logout error:", error);
    }
    setProfile(DEFAULT_PROFILE);
    setIsLoggedIn(false);
    setUid(null);
    queryClient.clear();
  }, [queryClient]);

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      setProfile((prev) => ({
        ...prev,
        systemNotifications: prev.systemNotifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
      }));
      if (uid) {
        try {
          const { getUserProfile: getFn, saveUserProfile: saveFn } = await import("@/services/firestore");
          const freshData = await getFn(uid);
          const freshNotifications = Array.isArray(freshData?.systemNotifications) ? freshData.systemNotifications : [];
          const updatedNotifications = freshNotifications.map((n: SystemNotification) =>
            n.id === notificationId ? { ...n, read: true } : n
          );
          await saveFn(uid, { systemNotifications: updatedNotifications });
          setProfile((prev) => ({ ...prev, systemNotifications: updatedNotifications }));
          console.log("Notification marked as read in Firestore:", notificationId);
        } catch (err) {
          console.log("Error marking notification read:", err);
        }
      }
    },
    [uid]
  );

  const unreadNotificationCount = profile.systemNotifications.filter((n) => !n.read).length;

  return useMemo(() => ({
    profile,
    isLoggedIn,
    authLoading,
    uid,
    updateProfile,
    toggleFavorite,
    addStoreProduct,
    deleteStoreProduct,
    updateStoreProduct,
    addAddressSubmission,
    deleteAddressSubmission,
    storeAddresses,
    refreshAddresses,
    register,
    login,
    logout,
    resetPassword,
    canChangeStoreName,
    changeStoreName,
    isSubscriptionActive,
    isTrialExpired,
    getTrialDaysLeft,
    markNotificationRead,
    unreadNotificationCount,
    isLoading: profileQuery.isLoading,
  }), [
    profile, isLoggedIn, authLoading, uid, updateProfile, toggleFavorite,
    addStoreProduct, deleteStoreProduct, updateStoreProduct, addAddressSubmission,
    deleteAddressSubmission, storeAddresses, refreshAddresses, register, login,
    logout, resetPassword, canChangeStoreName, changeStoreName, isSubscriptionActive,
    isTrialExpired, getTrialDaysLeft, markNotificationRead, unreadNotificationCount,
    profileQuery.isLoading,
  ]);
});
