import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";
import {
  getAdminData,
  saveAdminData,
  getAdminSettings,
  saveAdminSettings,
  getAllUsers,
  getStoreOwners,
  sendSystemNotification,
  sendAdminChatToMultipleUsers,
} from "@/services/firestore";

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
}

export interface AdminSettings {
  aiApiKey: string;
  aiProvider: string;
  sellerAgreement: string;
  userAgreement: string;
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

const MOCK_STORES: StoreMember[] = [
  {
    id: "sm_1",
    name: "Bella Moda",
    ownerName: "Ayse Yildiz",
    phone: "0532 111 22 33",
    avatar: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop",
    category: "Moda",
    city: "Istanbul",
    status: "active",
    planType: "monthly",
    planStartDate: "2026-01-15",
    planEndDate: "2026-02-15",
    createdAt: "2025-06-10",
    paymentVerified: true,
  },
  {
    id: "sm_2",
    name: "Tech Corner",
    ownerName: "Burak Kaya",
    phone: "0544 222 33 44",
    avatar: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200&h=200&fit=crop",
    category: "Teknoloji",
    city: "Ankara",
    status: "active",
    planType: "yearly",
    planStartDate: "2025-08-01",
    planEndDate: "2026-08-01",
    createdAt: "2025-05-20",
    paymentVerified: true,
  },
  {
    id: "sm_3",
    name: "Dogal Lezzetler",
    ownerName: "Fatma Demir",
    phone: "0505 333 44 55",
    avatar: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=200&h=200&fit=crop",
    category: "Gida",
    city: "Izmir",
    status: "passive",
    planType: "monthly",
    planStartDate: "2025-12-01",
    planEndDate: "2026-01-01",
    createdAt: "2025-09-15",
    paymentVerified: false,
  },
  {
    id: "sm_4",
    name: "Ev & Dekor",
    ownerName: "Cemre Arslan",
    phone: "0553 444 55 66",
    avatar: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop",
    category: "Dekorasyon",
    city: "Bursa",
    status: "active",
    planType: "yearly",
    planStartDate: "2025-10-01",
    planEndDate: "2026-10-01",
    createdAt: "2025-04-01",
    paymentVerified: true,
  },
  {
    id: "sm_5",
    name: "Spor Dunyasi",
    ownerName: "Deniz Ozturk",
    phone: "0542 555 66 77",
    avatar: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop",
    category: "Spor",
    city: "Antalya",
    status: "passive",
    planType: "monthly",
    planStartDate: "2025-11-10",
    planEndDate: "2025-12-10",
    createdAt: "2025-07-22",
    paymentVerified: false,
  },
];

const MOCK_CUSTOMERS: CustomerMember[] = [
  {
    id: "cm_1",
    name: "Elif Kaya",
    phone: "0532 456 78 90",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    status: "active",
    orderCount: 8,
    totalSpent: "2.340 TL",
    createdAt: "2025-03-15",
  },
  {
    id: "cm_2",
    name: "Mehmet Demir",
    phone: "0544 321 65 87",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    status: "active",
    orderCount: 15,
    totalSpent: "5.120 TL",
    createdAt: "2025-01-20",
  },
  {
    id: "cm_3",
    name: "Zeynep Arslan",
    phone: "0505 789 01 23",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    status: "active",
    orderCount: 3,
    totalSpent: "890 TL",
    createdAt: "2025-08-10",
  },
  {
    id: "cm_4",
    name: "Ali Ozkan",
    phone: "0553 654 32 10",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    status: "passive",
    orderCount: 1,
    totalSpent: "149 TL",
    createdAt: "2025-11-05",
  },
  {
    id: "cm_5",
    name: "Selin Yilmaz",
    phone: "0542 987 65 43",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    status: "active",
    orderCount: 22,
    totalSpent: "8.750 TL",
    createdAt: "2024-12-01",
  },
  {
    id: "cm_6",
    name: "Can Turkoglu",
    phone: "0535 123 45 67",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
    status: "passive",
    orderCount: 0,
    totalSpent: "0 TL",
    createdAt: "2026-01-18",
  },
];

interface AdminData {
  stores: StoreMember[];
  customers: CustomerMember[];
}

export const [AdminProvider, useAdmin] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [stores, setStores] = useState<StoreMember[]>(MOCK_STORES);
  const [customers, setCustomers] = useState<CustomerMember[]>(MOCK_CUSTOMERS);
  const [settings, setSettings] = useState<AdminSettings>({ aiApiKey: "", aiProvider: "openai", sellerAgreement: DEFAULT_SELLER_AGREEMENT, userAgreement: DEFAULT_USER_AGREEMENT });

  const adminQuery = useQuery({
    queryKey: ["adminData"],
    queryFn: async () => {
      console.log("Loading admin data from Firestore...");
      const data = await getAdminData();
      if (data && Array.isArray(data.stores) && data.stores.length > 0) {
        return {
          stores: data.stores as StoreMember[],
          customers: Array.isArray(data.customers) ? data.customers as CustomerMember[] : MOCK_CUSTOMERS,
        };
      }
      const initial: AdminData = { stores: MOCK_STORES, customers: MOCK_CUSTOMERS };
      await saveAdminData(initial);
      console.log("Admin data seeded to Firestore");
      return initial;
    },
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
        } as AdminSettings;
      }
      return { aiApiKey: "", aiProvider: "openai", sellerAgreement: DEFAULT_SELLER_AGREEMENT, userAgreement: DEFAULT_USER_AGREEMENT } as AdminSettings;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: AdminData) => {
      await saveAdminData(data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminData"] });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: AdminSettings) => {
      await saveAdminSettings(data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSettings"] });
    },
  });

  useEffect(() => {
    if (adminQuery.data) {
      setStores(adminQuery.data.stores);
      setCustomers(adminQuery.data.customers);
    }
  }, [adminQuery.data]);

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const toggleStoreStatus = useCallback(
    (storeId: string) => {
      const updated = stores.map((s) =>
        s.id === storeId
          ? { ...s, status: (s.status === "active" ? "passive" : "active") as MemberStatus }
          : s
      );
      setStores(updated);
      saveMutation.mutate({ stores: updated, customers });
    },
    [stores, customers, saveMutation]
  );

  const updateStorePlan = useCallback(
    (storeId: string, planType: PlanType) => {
      const now = new Date();
      const endDate = new Date(now);
      if (planType === "monthly") {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      const updated = stores.map((s) =>
        s.id === storeId
          ? {
              ...s,
              planType,
              status: "active" as MemberStatus,
              planStartDate: now.toISOString().split("T")[0],
              planEndDate: endDate.toISOString().split("T")[0],
              paymentVerified: false,
            }
          : s
      );
      setStores(updated);
      saveMutation.mutate({ stores: updated, customers });
    },
    [stores, customers, saveMutation]
  );

  const verifyPayment = useCallback(
    (storeId: string) => {
      const updated = stores.map((s) =>
        s.id === storeId ? { ...s, paymentVerified: true } : s
      );
      setStores(updated);
      saveMutation.mutate({ stores: updated, customers });
    },
    [stores, customers, saveMutation]
  );

  const toggleCustomerStatus = useCallback(
    (customerId: string) => {
      const updated = customers.map((c) =>
        c.id === customerId
          ? { ...c, status: (c.status === "active" ? "passive" : "active") as MemberStatus }
          : c
      );
      setCustomers(updated);
      saveMutation.mutate({ stores, customers: updated });
    },
    [stores, customers, saveMutation]
  );

  const updateSettings = useCallback(
    (newSettings: Partial<AdminSettings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      saveSettingsMutation.mutate(updated);
    },
    [settings, saveSettingsMutation]
  );

  const sendMessageToAll = useCallback(
    async (title: string, message: string) => {
      try {
        const users = await getAllUsers();
        const chatText = `📢 ${title}\n\n${message}`;
        const uids = users.map((u) => u.uid);
        await sendAdminChatToMultipleUsers(uids, chatText);
        const notification = {
          id: `notif_${Date.now()}`,
          title,
          message,
          type: "admin_message",
          createdAt: new Date().toISOString(),
          read: false,
        };
        for (const user of users) {
          await sendSystemNotification(user.uid, notification);
        }
        console.log("Message sent to all users:", users.length);
      } catch (error) {
        console.log("Error sending message to all:", error);
        throw error;
      }
    },
    []
  );

  const sendMessageToStoreOwners = useCallback(
    async (title: string, message: string) => {
      try {
        const owners = await getStoreOwners();
        const chatText = `🏪 ${title}\n\n${message}`;
        const uids = owners.map((o) => o.uid);
        await sendAdminChatToMultipleUsers(uids, chatText);
        const notification = {
          id: `notif_${Date.now()}`,
          title,
          message,
          type: "admin_store_message",
          createdAt: new Date().toISOString(),
          read: false,
        };
        for (const owner of owners) {
          await sendSystemNotification(owner.uid, notification);
        }
        console.log("Message sent to store owners:", owners.length);
      } catch (error) {
        console.log("Error sending message to store owners:", error);
        throw error;
      }
    },
    []
  );

  const sendMessageToCustomers = useCallback(
    async (title: string, message: string) => {
      try {
        const allUsers = await getAllUsers();
        const nonStoreUsers = allUsers.filter((u) => !u.isStore);
        const chatText = `👋 ${title}\n\n${message}`;
        const uids = nonStoreUsers.map((u) => u.uid);
        await sendAdminChatToMultipleUsers(uids, chatText);
        const notification = {
          id: `notif_${Date.now()}`,
          title,
          message,
          type: "admin_customer_message",
          createdAt: new Date().toISOString(),
          read: false,
        };
        for (const user of nonStoreUsers) {
          await sendSystemNotification(user.uid, notification);
        }
        console.log("Message sent to customers:", nonStoreUsers.length);
      } catch (error) {
        console.log("Error sending message to customers:", error);
        throw error;
      }
    },
    []
  );

  const activeStoreCount = useMemo(() => stores.filter((s) => s.status === "active").length, [stores]);
  const activeCustomerCount = useMemo(() => customers.filter((c) => c.status === "active").length, [customers]);
  const unpaidStores = useMemo(() => stores.filter((s) => !s.paymentVerified && s.status === "active"), [stores]);

  return {
    stores,
    customers,
    settings,
    toggleStoreStatus,
    updateStorePlan,
    verifyPayment,
    toggleCustomerStatus,
    updateSettings,
    sendMessageToAll,
    sendMessageToStoreOwners,
    sendMessageToCustomers,
    activeStoreCount,
    activeCustomerCount,
    unpaidStores,
    isLoading: adminQuery.isLoading,
  };
});
