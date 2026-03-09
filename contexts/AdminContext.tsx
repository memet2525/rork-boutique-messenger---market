import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";
import {
  getAdminSettings,
  saveAdminSettings,
  getAllUsers,
  getStoreOwners,
  getFirestoreStores,
  sendSystemNotification,
  sendAdminChatToMultipleUsers,
  updateUserStatus,
  updateStoreStatusAdmin,
  updateStorePlanAdmin,
  verifyStorePaymentAdmin,
} from "@/services/firestore";
import {
  backfillAdminRegistry,
  getAdminRegistryMembers,
  getAdminRegistryStores,
  syncAdminMemberRegistry,
  syncAdminStoreRegistry,
} from "@/services/adminRegistry";

export type PlanType = "monthly" | "yearly";
export type MemberStatus = "active" | "passive";

export interface StoreMember {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  avatar: string;
  category: string;
  city: string;
  status: MemberStatus;
  planType: PlanType;
  planStartDate: string;
  planEndDate: string;
  createdAt: string;
  paymentVerified: boolean;
  email: string;
}

export interface CustomerMember {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  status: MemberStatus;
  orderCount: number;
  totalSpent: string;
  createdAt: string;
  email: string;
  isStore: boolean;
}

export interface FooterContent {
  userAgreement: string;
  privacyPolicy: string;
  kvkk: string;
  cookiePolicy: string;
  contactInfo: string;
  faq: string;
  copyright: string;
}

export interface AdminSettings {
  aiApiKey: string;
  aiProvider: string;
  sellerAgreement: string;
  userAgreement: string;
  footerContent: FooterContent;
  siteName: string;
}

export const DEFAULT_USER_AGREEMENT = `KULLANICI SOZLESMESI

Bu sozlesme, ButikBiz platformuna uye olan kullanicilar ile platform arasindaki iliskiyi duzenler.

1. TARAFLAR
Bu sozlesme, ButikBiz platformu ("Platform") ile platforma uye olan kullanici ("Kullanici") arasinda akdedilmistir.

2. HIZMET KAPSAMI
Platform, Kullanici'ya online alisveris yapma, magaza urunlerini inceleme ve satin alma imkani saglar.

3. KULLANICI YUKUMLULUKLERI
- Kullanici, kayit sirasinda dogru ve guncel bilgiler vermekle yukumludur.
- Kullanici, hesap bilgilerini gizli tutmakla sorumludur.
- Kullanici, platform kurallarini ihlal etmeyecegini kabul eder.
- Kullanici, diger kullanicilara saygili davranmakla yukumludur.

4. GIZLILIK
- Platform, kullanici bilgilerini ucuncu taraflarla paylasmaz.
- Kullanici verileri guvenli ortamda saklanir.

5. HESAP ASKIYA ALMA
- Platform kurallarina aykiri davranan kullanicilarin hesaplari askiya alinabilir.

6. FESIH
Kullanici istediginde hesabini kapatabilir.

Bu sozlesmeyi okuyup kabul ettiginizi onaylayin.`;

export const DEFAULT_FOOTER_CONTENT: FooterContent = {
  userAgreement: `KULLANICI SOZLESMESI

Bu sozlesme, ButikBiz platformuna uye olan kullanicilar ile platform arasindaki iliskiyi duzenler.

1. TARAFLAR
Bu sozlesme, ButikBiz platformu ("Platform") ile platforma uye olan kullanici ("Kullanici") arasinda akdedilmistir.

2. HIZMET KAPSAMI
Platform, Kullanici'ya online alisveris yapma, magaza urunlerini inceleme ve satin alma imkani saglar.

3. KULLANICI YUKUMLULUKLERI
- Kullanici, kayit sirasinda dogru ve guncel bilgiler vermekle yukumludur.
- Kullanici, hesap bilgilerini gizli tutmakla sorumludur.
- Kullanici, platform kurallarini ihlal etmeyecegini kabul eder.

4. GIZLILIK
Platform, kullanici bilgilerini ucuncu taraflarla paylasmaz.

5. FESIH
Kullanici istediginde hesabini kapatabilir.`,
  privacyPolicy: `GIZLILIK POLITIKASI

ButikBiz olarak kullanicilarimizin gizliligine onem veriyoruz.

1. TOPLANAN VERILER
- Ad, soyad, e-posta adresi, telefon numarasi
- Magaza bilgileri (saticilar icin)
- Kullanim verileri ve cerez bilgileri

2. VERILERIN KULLANIMI
- Hizmetlerimizi sunmak ve iyilestirmek
- Kullanici deneyimini kisisellestirmek
- Guvenlik ve dolandiricilik onleme

3. VERILERIN PAYLASILMASI
Kisisel verileriniz ucuncu taraflarla paylasilmaz. Yasal zorunluluklar haric.

4. VERI GUVENILIGI
Verileriniz sifrelenmis ortamda guvenli sekilde saklanir.

5. HAKLARINIZ
Verilerinize erisim, duzeltme ve silme hakkiniz bulunmaktadir.`,
  kvkk: `KISISEL VERILERIN KORUNMASI HAKKINDA AYDINLATMA METNI

6698 sayili Kisisel Verilerin Korunmasi Kanunu ("KVKK") uyarinca, ButikBiz olarak kisisel verilerinizin korunmasina onem veriyoruz.

1. VERI SORUMLUSU
ButikBiz platformu veri sorumlusu sifatiyla hareket etmektedir.

2. ISLENEN KISISEL VERILER
- Kimlik bilgileri (ad, soyad)
- Iletisim bilgileri (telefon, e-posta, adres)
- Musteri islem bilgileri
- Pazarlama bilgileri

3. KISISEL VERILERIN ISLENME AMACI
- Urun ve hizmetlerin sunulmasi
- Sozlesme sureclerinin yurutulmesi
- Musteri iliskilerinin yonetilmesi

4. KISISEL VERILERIN AKTARILMASI
Kisisel verileriniz yasal yuksumluluklerin yerine getirilmesi amaciyla yetkili kurumlara aktarilabilir.

5. HAKLARINIZ
KVKK'nin 11. maddesi kapsaminda;
- Verilerinizin islenip islenmedigini ogrenme
- Verilerinizin duzeltilmesini isteme
- Verilerinizin silinmesini isteme
- Verilerin aktarildigi ucuncu kisileri ogrenme
haklarina sahipsiniz.`,
  cookiePolicy: `CEREZ POLITIKASI

ButikBiz platformu, kullanici deneyimini iyilestirmek icin cerezler kullanmaktadir.

1. CEREZ NEDIR?
Cerezler, web sitelerinin cihaziniza yerlestirdigi kucuk metin dosyalaridir.

2. KULLANILAN CEREZ TURLERI
- Zorunlu Cerezler: Platformun duzgun calismasi icin gereklidir.
- Performans Cerezleri: Kullanim istatistiklerini toplar.
- Islevsellik Cerezleri: Tercihlerinizi hatirlar.
- Hedefleme Cerezleri: Size uygun icerik sunmak icin kullanilir.

3. CEREZ YONETIMI
Tarayici ayarlarinizdan cerezleri yonetebilir veya silebilirsiniz.

4. UCUNCU TARAF CEREZLERI
Analitik ve reklam amacli ucuncu taraf cerezleri kullanilabilir.`,
  contactInfo: `ILETISIM BILGILERI

ButikBiz Musteri Hizmetleri

E-posta: destek@butikbiz.com
Telefon: 0850 123 45 67
Calisma Saatleri: Hafta ici 09:00 - 18:00

Adres: Istanbul, Turkiye

Sosyal Medya:
- Instagram: @butikbiz
- Twitter: @butikbiz

Destek talepleriniz icin bize e-posta gonderebilir veya uygulama ici sohbet ozelligini kullanabilirsiniz.`,
  faq: `SIKCA SORULAN SORULAR

1. Nasil magaza acabilirim?
Profil sayfasindan 'Magaza Ac' secenegine tiklayarak magaza acma formunu doldurabilirsiniz.

2. Odeme nasil yapilir?
Uygulama icinde dogrudan odeme sistemi bulunmamaktadir. Satici ile sohbet uzerinden anlasarak odeme detaylarini belirleyebilirsiniz.

3. Siparis takibi nasil yapilir?
Satici ile sohbet ekrani uzerinden siparis durumunuzu takip edebilirsiniz.

4. Urun iade/degisim yapabilir miyim?
Iade ve degisim kosullari saticiya gore degisir. Satin alma oncesinde satici ile iletisime gecerek iade kosullarini ogrenmenizi oneririz.

5. Hesabimi nasil silebilirim?
Profil > Gizlilik > Hesabi Sil seceneginden hesabinizi kalici olarak silebilirsiniz.

6. Bildirimler gelmiyor, ne yapmaliyim?
Profil > Bildirimler bolumunden bildirim ayarlarinizi kontrol edin.`,
  copyright: `© 2024 ButikBiz. Tum haklari saklidir.`,
};

export const DEFAULT_SELLER_AGREEMENT = `SATICI SOZLESMESI

Bu sozlesme, ButikBiz platformunda magaza acan saticilar ile platform arasindaki iliskiyi duzenler.

1. TARAFLAR
Bu sozlesme, ButikBiz platformu ("Platform") ile platformda magaza acan satici ("Satici") arasinda akdedilmistir.

2. HIZMET KAPSAMI
Platform, Satici'ya online magaza acma, urun listeleme ve satis yapma imkani saglar.

3. SATICI YUKUMLULUKLERI
- Satici, listelenen urunlerin yasal ve gercek oldugunu taahhut eder.
- Satici, musteri bilgilerini gizli tutmakla yukumludur.
- Satici, siparis ve teslimat sureclerini zamaninda yonetmekle sorumludur.
- Satici, platform kurallarini ihlal etmeyecegini kabul eder.

4. UCRETLENDIRME
- Magaza acilisinda 14 gunluk ucretsiz deneme suresi baslar.
- Deneme suresi sonunda satici aylik (199 TL) veya yillik (1.999 TL) abonelik secmek zorundadir.
- Odeme yapilmamasi durumunda magaza askiya alinir.

5. MAGAZA ADI DEGISIKLIGI
- Magaza adi yalnizca 1 (bir) kez degistirilebilir. Ikinci degisiklige izin verilmez.

6. FESIH
Her iki taraf da 30 gun onceden bildirimde bulunarak sozlesmeyi feshedebilir.

7. GIZLILIK
Platform, satici bilgilerini ucuncu taraflarla paylasmaz.

Bu sozlesmeyi okuyup kabul ettiginizi onaylayin.`;

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("tr-TR", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return "-";
  }
}

function getFirestoreDate(data: Record<string, any>, field: string): string {
  const val = data[field];
  if (!val) return "";
  if (typeof val === "string") return val;
  if (val?.seconds) return new Date(val.seconds * 1000).toISOString();
  if (val?.toDate) return val.toDate().toISOString();
  return "";
}

export const [AdminProvider, useAdmin] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [stores, setStores] = useState<StoreMember[]>([]);
  const [customers, setCustomers] = useState<CustomerMember[]>([]);
  const [settings, setSettings] = useState<AdminSettings>({ aiApiKey: "", aiProvider: "openai", sellerAgreement: DEFAULT_SELLER_AGREEMENT, userAgreement: DEFAULT_USER_AGREEMENT, footerContent: DEFAULT_FOOTER_CONTENT, siteName: "butikbiz" });

  const realUsersQuery = useQuery({
    queryKey: ["adminAllUsers"],
    queryFn: async () => {
      console.log("Admin: Loading all users from Firestore...");
      const allUsers = await getAllUsers();
      console.log("Admin: Loaded", allUsers.length, "users from Firestore");
      if (allUsers.length > 0) {
        console.log("Admin: First user keys:", Object.keys(allUsers[0]).join(", "));
        console.log("Admin: User UIDs:", allUsers.map(u => u.uid).join(", "));
      }
      return allUsers;
    },
    refetchInterval: 10000,
    retry: 3,
    retryDelay: 2000,
  });

  const realStoresQuery = useQuery({
    queryKey: ["adminAllStores"],
    queryFn: async () => {
      console.log("Admin: Loading all stores from Firestore...");
      const allStores = await getFirestoreStores();
      console.log("Admin: Loaded", allStores.length, "stores from Firestore");
      return allStores;
    },
    refetchInterval: 10000,
    retry: 3,
    retryDelay: 2000,
  });

  const registryUsersQuery = useQuery({
    queryKey: ["adminRegistryUsers"],
    queryFn: async () => {
      console.log("Admin: Loading admin registry users...");
      const registryUsers = await getAdminRegistryMembers();
      console.log("Admin: Loaded", registryUsers.length, "registry users");
      return registryUsers;
    },
    refetchInterval: 10000,
    retry: 3,
    retryDelay: 2000,
  });

  const registryStoresQuery = useQuery({
    queryKey: ["adminRegistryStores"],
    queryFn: async () => {
      console.log("Admin: Loading admin registry stores...");
      const registryStores = await getAdminRegistryStores();
      console.log("Admin: Loaded", registryStores.length, "registry stores");
      return registryStores;
    },
    refetchInterval: 10000,
    retry: 3,
    retryDelay: 2000,
  });

  const settingsQuery = useQuery({
    queryKey: ["adminSettings"],
    queryFn: async () => {
      const data = await getAdminSettings();
      if (data) {
        return {
          aiApiKey: data.aiApiKey || "",
          aiProvider: data.aiProvider || "openai",
          sellerAgreement: data.sellerAgreement || DEFAULT_SELLER_AGREEMENT,
          userAgreement: data.userAgreement || DEFAULT_USER_AGREEMENT,
          footerContent: data.footerContent ? { ...DEFAULT_FOOTER_CONTENT, ...data.footerContent } : DEFAULT_FOOTER_CONTENT,
          siteName: data.siteName || "butikbiz",
        } as AdminSettings;
      }
      return { aiApiKey: "", aiProvider: "openai", sellerAgreement: DEFAULT_SELLER_AGREEMENT, userAgreement: DEFAULT_USER_AGREEMENT, footerContent: DEFAULT_FOOTER_CONTENT, siteName: "butikbiz" } as AdminSettings;
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: AdminSettings) => {
      await saveAdminSettings(data);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["adminSettings"] });
    },
  });

  const lastBackfillSignatureRef = useRef<string>("");

  useEffect(() => {
    const sourceUsers = realUsersQuery.data ?? [];
    const sourceStores = realStoresQuery.data ?? [];
    const hasSourceData = sourceUsers.length > 0 || sourceStores.length > 0;

    if (!hasSourceData) {
      return;
    }

    const backfillSignature = `${sourceUsers.length}_${sourceStores.length}`;
    if (lastBackfillSignatureRef.current === backfillSignature) {
      return;
    }

    lastBackfillSignatureRef.current = backfillSignature;

    console.log("Admin: Running registry backfill for", sourceUsers.length, "users,", sourceStores.length, "stores");
    void backfillAdminRegistry()
      .then((result) => {
        console.log("Admin: Registry backfill completed", result);
        void queryClient.invalidateQueries({ queryKey: ["adminRegistryUsers"] });
        void queryClient.invalidateQueries({ queryKey: ["adminRegistryStores"] });
      })
      .catch((error) => {
        console.log("Admin: Registry backfill failed", error);
      });
  }, [realUsersQuery.data, realStoresQuery.data, queryClient]);

  useEffect(() => {
    const allUsers = realUsersQuery.data ?? [];
    const allStores = realStoresQuery.data ?? [];
    const registryUsers = registryUsersQuery.data ?? [];
    const registryStores = registryStoresQuery.data ?? [];

    console.log("Admin merge: allUsers=", allUsers.length, "allStores=", allStores.length, "regUsers=", registryUsers.length, "regStores=", registryStores.length);

    const mergedUserMap = new Map<string, Record<string, any>>();
    const mergedStoreMap = new Map<string, Record<string, any>>();
    const storeOwnerIds = new Set<string>();

    for (const store of allStores) {
      const ownerId = typeof store.ownerId === "string" ? store.ownerId : typeof store.id === "string" ? store.id : "";
      if (!ownerId) continue;
      mergedStoreMap.set(ownerId, { ...(mergedStoreMap.get(ownerId) ?? {}), ...store });
      storeOwnerIds.add(ownerId);
    }

    for (const registryStore of registryStores) {
      const ownerId = typeof registryStore.ownerId === "string"
        ? registryStore.ownerId
        : typeof registryStore.id === "string"
          ? registryStore.id
          : "";
      if (!ownerId) continue;
      mergedStoreMap.set(ownerId, { ...(mergedStoreMap.get(ownerId) ?? {}), ...registryStore });
      storeOwnerIds.add(ownerId);
    }

    for (const user of allUsers) {
      const userId = typeof user.uid === "string" ? user.uid : typeof user.id === "string" ? user.id : "";
      if (!userId) continue;
      mergedUserMap.set(userId, { ...(mergedUserMap.get(userId) ?? {}), ...user });
      if (user.isStore === true) {
        storeOwnerIds.add(userId);
      }
    }

    for (const registryUser of registryUsers) {
      const userId = typeof registryUser.uid === "string"
        ? registryUser.uid
        : typeof registryUser.id === "string"
          ? registryUser.id
          : "";
      if (!userId) continue;
      mergedUserMap.set(userId, { ...(mergedUserMap.get(userId) ?? {}), ...registryUser });
      if (registryUser.isStore === true) {
        storeOwnerIds.add(userId);
      }
    }

    const storeMembers: StoreMember[] = [];
    const customerMembers: CustomerMember[] = [];

    for (const [userId, user] of mergedUserMap.entries()) {
      const storeData = mergedStoreMap.get(userId);
      const userName = user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || storeData?.ownerName || user.storeName || "Isimsiz";
      const userPhone = user.phone || user.storePhone || storeData?.phone || "-";
      const userAvatar = user.avatar || storeData?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop";
      const userEmail = user.email || storeData?.email || "";
      const createdAtRaw = getFirestoreDate(user, "createdAt") || getFirestoreDate(storeData ?? {}, "createdAt") || getFirestoreDate(user, "updatedAt") || "";
      const accountStatus = (storeData?.adminStatus || user.accountStatus || "active") as MemberStatus;
      const isStoreAccount = storeOwnerIds.has(userId);

      console.log("Admin merge user:", userId, "name:", userName, "isStore:", isStoreAccount, "user.isStore:", user.isStore, "hasStoreData:", !!storeData);

      if (isStoreAccount) {
        const storeName = user.storeName || storeData?.name || userName;
        const storeCategory = user.storeCategory || storeData?.category || "Diger";
        const storeCity = user.storeCity || storeData?.city || "-";
        const planSource = user.subscriptionPlan || storeData?.subscriptionPlan || "monthly";
        const planType = (planSource === "yearly" ? "yearly" : "monthly") as PlanType;
        const planStartDate = user.subscriptionStartDate || storeData?.planStartDate || user.trialStartDate || "";
        const planEndDate = user.subscriptionEndDate || storeData?.planEndDate || user.trialEndDate || "";
        const paymentVerified = storeData?.paymentVerified ?? (user.subscriptionStatus === "active" && planSource !== "trial");

        storeMembers.push({
          id: userId,
          name: storeName,
          ownerName: userName,
          phone: userPhone,
          avatar: storeData?.avatar || userAvatar,
          category: storeCategory,
          city: storeCity,
          status: accountStatus === "passive" ? "passive" : "active",
          planType,
          planStartDate: formatDate(planStartDate),
          planEndDate: formatDate(planEndDate),
          createdAt: formatDate(createdAtRaw),
          paymentVerified,
          email: userEmail,
        });
      } else {
        customerMembers.push({
          id: userId,
          name: userName,
          phone: userPhone,
          avatar: userAvatar,
          status: accountStatus === "passive" ? "passive" : "active",
          orderCount: user.orderCount || 0,
          totalSpent: user.totalSpent || "0 TL",
          createdAt: formatDate(createdAtRaw),
          email: userEmail,
          isStore: false,
        });
      }
    }

    for (const [ownerId, store] of mergedStoreMap.entries()) {
      const alreadyAdded = storeMembers.some((member) => member.id === ownerId);
      if (alreadyAdded) {
        continue;
      }

      const storeStatus = store.adminStatus || store.accountStatus || "active";
      const planType = (store.subscriptionPlan === "yearly" ? "yearly" : "monthly") as PlanType;

      storeMembers.push({
        id: ownerId,
        name: store.name || "Isimsiz Magaza",
        ownerName: store.ownerName || store.name || "-",
        phone: store.phone || store.storePhone || "-",
        avatar: store.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
        category: store.category || store.storeCategory || "Diger",
        city: store.city || store.storeCity || "-",
        status: storeStatus === "passive" ? "passive" : "active",
        planType,
        planStartDate: formatDate(store.planStartDate || store.subscriptionStartDate || store.trialStartDate || ""),
        planEndDate: formatDate(store.planEndDate || store.subscriptionEndDate || store.trialEndDate || ""),
        createdAt: formatDate(getFirestoreDate(store, "createdAt") || getFirestoreDate(store, "updatedAt")),
        paymentVerified: store.paymentVerified ?? false,
        email: store.email || "",
      });
    }

    console.log("Admin: Final mapped", storeMembers.length, "stores,", customerMembers.length, "customers, storeOwnerIds:", Array.from(storeOwnerIds).join(","));
    setStores(storeMembers);
    setCustomers(customerMembers);
  }, [realUsersQuery.data, realStoresQuery.data, registryUsersQuery.data, registryStoresQuery.data, queryClient]);

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const toggleStoreStatus = useCallback(
    async (storeId: string) => {
      const store = stores.find((s) => s.id === storeId);
      if (!store) return;
      const newStatus: MemberStatus = store.status === "active" ? "passive" : "active";
      const updated = stores.map((s) =>
        s.id === storeId ? { ...s, status: newStatus } : s
      );
      setStores(updated);
      try {
        await updateStoreStatusAdmin(storeId, newStatus);
        await syncAdminStoreRegistry(storeId, { adminStatus: newStatus });
        await syncAdminMemberRegistry(storeId, { accountStatus: newStatus, isStore: true });
        try {
          await updateUserStatus(storeId, newStatus);
        } catch (userStatusError) {
          console.log("Admin: store user status sync skipped:", userStatusError);
        }
        console.log("Store status toggled:", storeId, "->", newStatus);
      } catch (error) {
        console.log("Error toggling store status:", error);
        setStores(stores);
      }
    },
    [stores]
  );

  const updateStorePlan = useCallback(
    async (storeId: string, planType: PlanType) => {
      const now = new Date();
      const endDate = new Date(now);
      if (planType === "monthly") {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      const startStr = now.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];

      const updated = stores.map((s) =>
        s.id === storeId
          ? {
              ...s,
              planType,
              status: "active" as MemberStatus,
              planStartDate: formatDate(startStr),
              planEndDate: formatDate(endStr),
              paymentVerified: false,
            }
          : s
      );
      setStores(updated);
      try {
        await updateStorePlanAdmin(storeId, {
          planType,
          planStartDate: startStr,
          planEndDate: endStr,
          paymentVerified: false,
          subscriptionPlan: planType,
          subscriptionStatus: "active",
        });
        await updateStoreStatusAdmin(storeId, "active");
        await syncAdminStoreRegistry(storeId, {
          adminStatus: "active",
          subscriptionPlan: planType,
          subscriptionStatus: "active",
          planStartDate: startStr,
          planEndDate: endStr,
          paymentVerified: false,
        });
        await syncAdminMemberRegistry(storeId, {
          isStore: true,
          accountStatus: "active",
          subscriptionPlan: planType,
          subscriptionStatus: "active",
        });
        console.log("Store plan updated:", storeId, planType);
      } catch (error) {
        console.log("Error updating store plan:", error);
        setStores(stores);
      }
    },
    [stores]
  );

  const verifyPayment = useCallback(
    async (storeId: string) => {
      const updated = stores.map((s) =>
        s.id === storeId ? { ...s, paymentVerified: true } : s
      );
      setStores(updated);
      try {
        await verifyStorePaymentAdmin(storeId);
        await syncAdminStoreRegistry(storeId, { paymentVerified: true });
        console.log("Payment verified:", storeId);
      } catch (error) {
        console.log("Error verifying payment:", error);
        setStores(stores);
      }
    },
    [stores]
  );

  const toggleCustomerStatus = useCallback(
    async (customerId: string) => {
      const customer = customers.find((c) => c.id === customerId);
      if (!customer) return;
      const newStatus: MemberStatus = customer.status === "active" ? "passive" : "active";
      const updated = customers.map((c) =>
        c.id === customerId ? { ...c, status: newStatus } : c
      );
      setCustomers(updated);
      try {
        await updateUserStatus(customerId, newStatus);
        await syncAdminMemberRegistry(customerId, { accountStatus: newStatus, isStore: false });
        console.log("Customer status toggled:", customerId, "->", newStatus);
      } catch (error) {
        console.log("Error toggling customer status:", error);
        setCustomers(customers);
      }
    },
    [customers]
  );

  const updateSettings = useCallback(
    (newSettings: Partial<AdminSettings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      saveSettingsMutation.mutate(updated);
    },
    [settings, saveSettingsMutation]
  );

  const refreshData = useCallback(() => {
    lastBackfillSignatureRef.current = "";
    void queryClient.invalidateQueries({ queryKey: ["adminAllUsers"] });
    void queryClient.invalidateQueries({ queryKey: ["adminAllStores"] });
    void backfillAdminRegistry()
      .then((result) => {
        console.log("Admin: Manual registry backfill completed", result);
        void queryClient.invalidateQueries({ queryKey: ["adminRegistryUsers"] });
        void queryClient.invalidateQueries({ queryKey: ["adminRegistryStores"] });
      })
      .catch((error) => {
        console.log("Admin: Manual registry backfill failed", error);
      });
    console.log("Admin: Data refresh triggered");
  }, [queryClient]);

  const sendMessageToAll = useCallback(
    async (title: string, message: string) => {
      console.log("sendMessageToAll: Starting...");
      const users = await getAllUsers();
      console.log("sendMessageToAll: Got", users.length, "users");
      if (users.length === 0) {
        throw new Error("Kullanici bulunamadi. Firestore 'users' koleksiyonunu kontrol edin.");
      }
      const chatText = `\u{1F4E2} ${title}\n\n${message}`;
      const validUids = users.map((u) => u.uid).filter((uid) => uid && uid.trim() !== "");
      console.log("sendMessageToAll: Sending to", validUids.length, "valid UIDs");

      let chatResult = { sentCount: 0, failCount: 0, errors: [] as string[] };
      try {
        chatResult = await sendAdminChatToMultipleUsers(validUids, chatText);
        console.log("Chat results:", chatResult);
      } catch (chatErr: any) {
        console.log("sendMessageToAll: Chat send error:", chatErr?.message);
      }

      let notifSuccess = 0;
      let notifFail = 0;
      const baseTime = Date.now();
      for (let i = 0; i < users.length; i++) {
        const uid = users[i].uid;
        if (!uid || uid.trim() === "") continue;
        try {
          const notification = {
            id: `notif_${baseTime}_${i}_${Math.random().toString(36).substr(2, 6)}`,
            title,
            message,
            type: "admin_message",
            createdAt: new Date().toISOString(),
            read: false,
          };
          await sendSystemNotification(uid, notification);
          notifSuccess++;
        } catch (err: any) {
          notifFail++;
          console.log("Notification failed for:", uid, err?.code, err?.message);
        }
      }
      console.log("Message sent to all - chat:", chatResult.sentCount, "/", validUids.length, "notif:", notifSuccess, "/", users.length, "notifFail:", notifFail);

      if (chatResult.sentCount === 0 && notifSuccess === 0) {
        throw new Error(`Mesaj gonderilemedi. Chat: ${chatResult.errors.length > 0 ? chatResult.errors[0] : "hata yok"} | Notif basarisiz: ${notifFail}`);
      }
    },
    []
  );

  const sendMessageToStoreOwners = useCallback(
    async (title: string, message: string) => {
      console.log("sendMessageToStoreOwners: Starting...");
      const owners = await getStoreOwners();
      console.log("sendMessageToStoreOwners: Got", owners.length, "owners");
      if (owners.length === 0) {
        const allUsers = await getAllUsers();
        const storeUsers = allUsers.filter((u) => u.isStore === true);
        if (storeUsers.length === 0) {
          throw new Error("Magaza sahibi bulunamadi.");
        }
        const chatText = `\u{1F3EA} ${title}\n\n${message}`;
        const validUids = storeUsers.map((u) => u.uid).filter((uid) => uid && uid.trim() !== "");
        const chatResult = await sendAdminChatToMultipleUsers(validUids, chatText);
        let notifSuccess = 0;
        const baseTime = Date.now();
        for (let i = 0; i < storeUsers.length; i++) {
          const uid = storeUsers[i].uid;
          if (!uid || uid.trim() === "") continue;
          try {
            await sendSystemNotification(uid, { id: `notif_${baseTime}_${i}_${Math.random().toString(36).substr(2, 6)}`, title, message, type: "admin_store_message", createdAt: new Date().toISOString(), read: false });
            notifSuccess++;
          } catch (err) { console.log("Notification failed for store owner:", uid, err); }
        }
        if (chatResult.sentCount === 0 && notifSuccess === 0) {
          throw new Error("Mesaj gonderilemedi.");
        }
        return;
      }
      const chatText = `\u{1F3EA} ${title}\n\n${message}`;
      const validUids = owners.map((o) => o.uid).filter((uid) => uid && uid.trim() !== "");

      let chatResult = { sentCount: 0, failCount: 0, errors: [] as string[] };
      try {
        chatResult = await sendAdminChatToMultipleUsers(validUids, chatText);
      } catch (chatErr: any) {
        console.log("sendMessageToStoreOwners: Chat error:", chatErr?.message);
      }

      let notifSuccess = 0;
      const baseTime = Date.now();
      for (let i = 0; i < owners.length; i++) {
        const uid = owners[i].uid;
        if (!uid || uid.trim() === "") continue;
        try {
          const notification = {
            id: `notif_${baseTime}_${i}_${Math.random().toString(36).substr(2, 6)}`,
            title,
            message,
            type: "admin_store_message",
            createdAt: new Date().toISOString(),
            read: false,
          };
          await sendSystemNotification(uid, notification);
          notifSuccess++;
        } catch (err) {
          console.log("Notification failed for store owner:", uid, err);
        }
      }
      console.log("Message sent to store owners - chat:", chatResult.sentCount, "notif:", notifSuccess);

      if (chatResult.sentCount === 0 && notifSuccess === 0) {
        throw new Error(`Mesaj gonderilemedi. ${chatResult.errors.length > 0 ? chatResult.errors[0] : ""}`);
      }
    },
    []
  );

  const sendMessageToCustomers = useCallback(
    async (title: string, message: string) => {
      console.log("sendMessageToCustomers: Starting...");
      const allUsers = await getAllUsers();
      console.log("sendMessageToCustomers: Got", allUsers.length, "total users");
      const nonStoreUsers = allUsers.filter((u) => !u.isStore);
      console.log("sendMessageToCustomers: Found", nonStoreUsers.length, "non-store users");
      if (nonStoreUsers.length === 0) {
        throw new Error("Musteri bulunamadi. Toplam kullanici: " + allUsers.length);
      }
      const chatText = `\u{1F44B} ${title}\n\n${message}`;
      const validUids = nonStoreUsers.map((u) => u.uid).filter((uid) => uid && uid.trim() !== "");
      console.log("Sending admin message to", validUids.length, "customers");

      let chatResult = { sentCount: 0, failCount: 0, errors: [] as string[] };
      try {
        chatResult = await sendAdminChatToMultipleUsers(validUids, chatText);
      } catch (chatErr: any) {
        console.log("sendMessageToCustomers: Chat error:", chatErr?.message);
      }

      let notifSuccess = 0;
      const baseTime = Date.now();
      for (let i = 0; i < nonStoreUsers.length; i++) {
        const uid = nonStoreUsers[i].uid;
        if (!uid || uid.trim() === "") continue;
        try {
          const notification = {
            id: `notif_${baseTime}_${i}_${Math.random().toString(36).substr(2, 6)}`,
            title,
            message,
            type: "admin_customer_message",
            createdAt: new Date().toISOString(),
            read: false,
          };
          await sendSystemNotification(uid, notification);
          notifSuccess++;
        } catch (err) {
          console.log("Notification failed for customer:", uid, err);
        }
      }
      console.log("Message sent to customers - chat:", chatResult.sentCount, "notif:", notifSuccess);

      if (chatResult.sentCount === 0 && notifSuccess === 0) {
        throw new Error(`Mesaj gonderilemedi. ${chatResult.errors.length > 0 ? chatResult.errors[0] : ""}`);
      }
    },
    []
  );

  const activeStoreCount = useMemo(() => stores.filter((s) => s.status === "active").length, [stores]);
  const activeCustomerCount = useMemo(() => customers.filter((c) => c.status === "active").length, [customers]);
  const unpaidStores = useMemo(() => stores.filter((s) => !s.paymentVerified && s.status === "active"), [stores]);
  const totalUserCount = useMemo(() => stores.length + customers.length, [stores, customers]);

  return useMemo(() => ({
    stores,
    customers,
    settings,
    toggleStoreStatus,
    updateStorePlan,
    verifyPayment,
    toggleCustomerStatus,
    updateSettings,
    refreshData,
    sendMessageToAll,
    sendMessageToStoreOwners,
    sendMessageToCustomers,
    activeStoreCount,
    activeCustomerCount,
    unpaidStores,
    totalUserCount,
    isLoading: realUsersQuery.isLoading || realStoresQuery.isLoading || registryUsersQuery.isLoading || registryStoresQuery.isLoading,
  }), [
    stores, customers, settings, toggleStoreStatus, updateStorePlan,
    verifyPayment, toggleCustomerStatus, updateSettings, refreshData,
    sendMessageToAll, sendMessageToStoreOwners, sendMessageToCustomers,
    activeStoreCount, activeCustomerCount, unpaidStores, totalUserCount,
    realUsersQuery.isLoading, realStoresQuery.isLoading,
    registryUsersQuery.isLoading, registryStoresQuery.isLoading,
  ]);
});
