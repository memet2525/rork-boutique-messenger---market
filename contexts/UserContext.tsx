import { useState, useEffect, useCallback, useMemo } from "react";
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

export const [UserProvider, useUser] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [uid, setUid] = useState<string | null>(null);

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
    mutationFn: async (updated: UserProfile) => {
      if (!uid) return updated;
      const { systemNotifications: _sn, ...profileWithoutNotifications } = updated;
      await saveUserProfile(uid, profileWithoutNotifications);
      if (updated.isStore && updated.storeName) {
        const storeSlug = slugify(updated.storeName);
        await saveStore(uid, {
          name: updated.storeName,
          slug: storeSlug,
          avatar: updated.avatar,
          description: updated.storeDescription || "",
          category: updated.storeCategory || "Diger",
          city: updated.storeCity || "",
          phone: updated.storePhone || "",
          rating: 5.0,
          reviewCount: 0,
          isOnline: true,
          ownerId: uid,
          subscriptionPlan: updated.subscriptionPlan,
          subscriptionStatus: updated.subscriptionStatus,
          products: (updated.storeProducts ?? []).map((sp) => ({
            id: sp.id,
            name: sp.name,
            price: sp.price,
            image: sp.image,
            images: sp.images ?? [],
            description: sp.description,
            features: sp.features,
          })),
        });
      } else if (!updated.isStore) {
        await deleteStore(uid);
      }
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["firestoreStores"] });
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      const updated = { ...profile, ...updates };
      setProfile(updated);
      saveMutation.mutate(updated);
    },
    [profile, saveMutation]
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
      saveMutation.mutate(updated);
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
    (productId: string) => {
      const favorites = profile.favorites.includes(productId)
        ? profile.favorites.filter((id) => id !== productId)
        : [...profile.favorites, productId];
      updateProfile({ favorites });
    },
    [profile.favorites, updateProfile]
  );

  const addStoreProduct = useCallback(
    (product: Omit<StoreProduct, "id" | "createdAt">) => {
      const newProduct: StoreProduct = {
        ...product,
        id: `sp_${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const updated = [...profile.storeProducts, newProduct];
      updateProfile({ storeProducts: updated });
      return newProduct;
    },
    [profile.storeProducts, updateProfile]
  );

  const deleteStoreProduct = useCallback(
    (productId: string) => {
      const updated = profile.storeProducts.filter((p) => p.id !== productId);
      updateProfile({ storeProducts: updated });
    },
    [profile.storeProducts, updateProfile]
  );

  const updateStoreProduct = useCallback(
    (productId: string, updates: Partial<StoreProduct>) => {
      const updated = profile.storeProducts.map((p) =>
        p.id === productId ? { ...p, ...updates } : p
      );
      updateProfile({ storeProducts: updated });
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
      updateProfile({ addressSubmissions: updated });
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
      updateProfile({ addressSubmissions: updated });
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
          merged.systemNotifications = Array.isArray(merged.systemNotifications) ? merged.systemNotifications : [];
          setProfile(merged);
          queryClient.setQueryData(["userProfile", userUid], merged);
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
