import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "@/config/firebase";

export interface RegistrySyncOptions {
  useFallbacks?: boolean;
}

export interface AdminRegistryMemberRecord {
  uid: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  isStore?: boolean;
  storeName?: string;
  storeCategory?: string;
  storeCity?: string;
  storePhone?: string;
  accountStatus?: "active" | "passive";
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminRegistryStoreRecord {
  id: string;
  ownerId: string;
  name?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  category?: string;
  city?: string;
  adminStatus?: "active" | "passive";
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  planStartDate?: string;
  planEndDate?: string;
  paymentVerified?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function getStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getBooleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function getStatusValue(value: unknown): "active" | "passive" | undefined {
  return value === "passive" ? "passive" : value === "active" ? "active" : undefined;
}

function buildNameFromParts(record: Record<string, unknown>): string {
  const firstName = getStringValue(record.firstName);
  const lastName = getStringValue(record.lastName);
  return `${firstName} ${lastName}`.trim();
}

function cleanPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const nextPayload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      nextPayload[key] = value;
    }
  }

  return nextPayload;
}

function toAdminMemberPayload(
  uid: string,
  record: Record<string, unknown>,
  options?: RegistrySyncOptions
): Record<string, unknown> {
  const useFallbacks = options?.useFallbacks ?? false;
  const payload: Record<string, unknown> = {
    uid,
    updatedAt: serverTimestamp(),
  };

  if (hasOwn(record, "name")) {
    const name = getStringValue(record.name);
    if (name) {
      payload.name = name;
    }
  } else if (hasOwn(record, "firstName") || hasOwn(record, "lastName")) {
    const fullName = buildNameFromParts(record);
    if (fullName) {
      payload.name = fullName;
    }
  } else if (useFallbacks) {
    const fallbackName = getStringValue(record.storeName) || getStringValue(record.email).split("@")[0] || getStringValue(record.name);
    if (fallbackName) {
      payload.name = fallbackName;
    }
  }

  if (hasOwn(record, "email")) {
    const email = getStringValue(record.email);
    if (email) {
      payload.email = email;
    }
  }

  if (hasOwn(record, "phone")) {
    const phone = getStringValue(record.phone);
    if (phone) {
      payload.phone = phone;
    }
  } else if (hasOwn(record, "storePhone")) {
    const phone = getStringValue(record.storePhone);
    if (phone) {
      payload.phone = phone;
    }
  } else if (useFallbacks) {
    const phone = getStringValue(record.phone) || getStringValue(record.storePhone);
    if (phone) {
      payload.phone = phone;
    }
  }

  if (hasOwn(record, "avatar")) {
    const avatar = getStringValue(record.avatar);
    if (avatar) {
      payload.avatar = avatar;
    }
  }

  if (hasOwn(record, "isStore")) {
    const isStore = getBooleanValue(record.isStore);
    if (typeof isStore === "boolean") {
      payload.isStore = isStore;
    }
  } else if (useFallbacks) {
    const derivedIsStore = Boolean(getStringValue(record.storeName) || getStringValue(record.ownerId));
    payload.isStore = derivedIsStore;
  }

  if (hasOwn(record, "storeName") || useFallbacks) {
    const storeName = getStringValue(record.storeName);
    if (storeName) {
      payload.storeName = storeName;
    }
  }

  if (hasOwn(record, "storeCategory") || hasOwn(record, "category") || useFallbacks) {
    const storeCategory = getStringValue(record.storeCategory) || getStringValue(record.category);
    if (storeCategory) {
      payload.storeCategory = storeCategory;
    }
  }

  if (hasOwn(record, "storeCity") || hasOwn(record, "city") || useFallbacks) {
    const storeCity = getStringValue(record.storeCity) || getStringValue(record.city);
    if (storeCity) {
      payload.storeCity = storeCity;
    }
  }

  if (hasOwn(record, "storePhone") || hasOwn(record, "phone") || useFallbacks) {
    const storePhone = getStringValue(record.storePhone) || getStringValue(record.phone);
    if (storePhone) {
      payload.storePhone = storePhone;
    }
  }

  if (hasOwn(record, "accountStatus")) {
    const accountStatus = getStatusValue(record.accountStatus);
    if (accountStatus) {
      payload.accountStatus = accountStatus;
    }
  } else if (hasOwn(record, "adminStatus")) {
    const accountStatus = getStatusValue(record.adminStatus);
    if (accountStatus) {
      payload.accountStatus = accountStatus;
    }
  }

  if (hasOwn(record, "subscriptionPlan")) {
    const subscriptionPlan = getStringValue(record.subscriptionPlan);
    if (subscriptionPlan) {
      payload.subscriptionPlan = subscriptionPlan;
    }
  }

  if (hasOwn(record, "subscriptionStatus")) {
    const subscriptionStatus = getStringValue(record.subscriptionStatus);
    if (subscriptionStatus) {
      payload.subscriptionStatus = subscriptionStatus;
    }
  }

  if (hasOwn(record, "createdAt") && record.createdAt != null) {
    payload.createdAt = record.createdAt;
  }

  return cleanPayload(payload);
}

function toAdminStorePayload(
  storeId: string,
  record: Record<string, unknown>,
  options?: RegistrySyncOptions
): Record<string, unknown> {
  const useFallbacks = options?.useFallbacks ?? false;
  const payload: Record<string, unknown> = {
    id: storeId,
    ownerId: getStringValue(record.ownerId) || storeId,
    updatedAt: serverTimestamp(),
  };

  if (hasOwn(record, "name") || useFallbacks) {
    const name = getStringValue(record.name);
    if (name) {
      payload.name = name;
    }
  }

  if (hasOwn(record, "ownerName") || useFallbacks) {
    const ownerName = getStringValue(record.ownerName) || getStringValue(record.name);
    if (ownerName) {
      payload.ownerName = ownerName;
    }
  }

  if (hasOwn(record, "email")) {
    const email = getStringValue(record.email);
    if (email) {
      payload.email = email;
    }
  }

  if (hasOwn(record, "phone") || useFallbacks) {
    const phone = getStringValue(record.phone) || getStringValue(record.storePhone);
    if (phone) {
      payload.phone = phone;
    }
  }

  if (hasOwn(record, "avatar")) {
    const avatar = getStringValue(record.avatar);
    if (avatar) {
      payload.avatar = avatar;
    }
  }

  if (hasOwn(record, "category") || hasOwn(record, "storeCategory") || useFallbacks) {
    const category = getStringValue(record.category) || getStringValue(record.storeCategory);
    if (category) {
      payload.category = category;
    }
  }

  if (hasOwn(record, "city") || hasOwn(record, "storeCity") || useFallbacks) {
    const city = getStringValue(record.city) || getStringValue(record.storeCity);
    if (city) {
      payload.city = city;
    }
  }

  if (hasOwn(record, "adminStatus")) {
    const adminStatus = getStatusValue(record.adminStatus);
    if (adminStatus) {
      payload.adminStatus = adminStatus;
    }
  } else if (hasOwn(record, "accountStatus")) {
    const adminStatus = getStatusValue(record.accountStatus);
    if (adminStatus) {
      payload.adminStatus = adminStatus;
    }
  }

  if (hasOwn(record, "subscriptionPlan")) {
    const subscriptionPlan = getStringValue(record.subscriptionPlan);
    if (subscriptionPlan) {
      payload.subscriptionPlan = subscriptionPlan;
    }
  }

  if (hasOwn(record, "subscriptionStatus")) {
    const subscriptionStatus = getStringValue(record.subscriptionStatus);
    if (subscriptionStatus) {
      payload.subscriptionStatus = subscriptionStatus;
    }
  }

  if (hasOwn(record, "planStartDate")) {
    const planStartDate = getStringValue(record.planStartDate);
    if (planStartDate) {
      payload.planStartDate = planStartDate;
    }
  }

  if (hasOwn(record, "planEndDate")) {
    const planEndDate = getStringValue(record.planEndDate);
    if (planEndDate) {
      payload.planEndDate = planEndDate;
    }
  }

  if (hasOwn(record, "paymentVerified")) {
    const paymentVerified = getBooleanValue(record.paymentVerified);
    if (typeof paymentVerified === "boolean") {
      payload.paymentVerified = paymentVerified;
    }
  }

  if (hasOwn(record, "createdAt") && record.createdAt != null) {
    payload.createdAt = record.createdAt;
  }

  return cleanPayload(payload);
}

export async function syncAdminMemberRegistry(
  uid: string,
  record: Record<string, unknown>,
  options?: RegistrySyncOptions
): Promise<void> {
  try {
    const payload = toAdminMemberPayload(uid, record, options);
    await setDoc(doc(db, "adminMembers", uid), payload, { merge: true });
    console.log("Admin registry member synced:", uid, "keys:", Object.keys(payload).join(", "));
  } catch (error) {
    console.log("Error syncing admin member registry:", uid, error);
  }
}

export async function syncAdminStoreRegistry(
  storeId: string,
  record: Record<string, unknown>,
  options?: RegistrySyncOptions
): Promise<void> {
  try {
    const payload = toAdminStorePayload(storeId, record, options);
    await setDoc(doc(db, "adminStores", storeId), payload, { merge: true });
    console.log("Admin registry store synced:", storeId, "keys:", Object.keys(payload).join(", "));
  } catch (error) {
    console.log("Error syncing admin store registry:", storeId, error);
  }
}

export async function deleteAdminStoreRegistry(storeId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "adminStores", storeId));
    console.log("Admin registry store deleted:", storeId);
  } catch (error) {
    console.log("Error deleting admin store registry:", storeId, error);
  }
}

export async function getAdminRegistryMembers(): Promise<Record<string, unknown>[]> {
  try {
    const snapshot = await getDocs(collection(db, "adminMembers"));
    return snapshot.docs.map((document) => ({ uid: document.id, ...document.data() }));
  } catch (error) {
    console.log("Error loading admin registry members:", error);
    return [];
  }
}

export async function getAdminRegistryStores(): Promise<Record<string, unknown>[]> {
  try {
    const snapshot = await getDocs(collection(db, "adminStores"));
    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  } catch (error) {
    console.log("Error loading admin registry stores:", error);
    return [];
  }
}

export async function backfillAdminRegistry(): Promise<{ users: number; stores: number }> {
  try {
    const [usersSnapshot, storesSnapshot] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "stores")),
    ]);

    const userSyncTasks = usersSnapshot.docs.map((document) =>
      syncAdminMemberRegistry(document.id, { uid: document.id, ...document.data() }, { useFallbacks: true })
    );

    const storeSyncTasks = storesSnapshot.docs.flatMap((document) => {
      const storeRecord = { id: document.id, ownerId: document.id, ...document.data() } as Record<string, unknown>;
      const ownerId = getStringValue(storeRecord.ownerId) || document.id;

      return [
        syncAdminStoreRegistry(ownerId, storeRecord, { useFallbacks: true }),
        syncAdminMemberRegistry(
          ownerId,
          {
            isStore: true,
            accountStatus: storeRecord.adminStatus,
            name: getStringValue(storeRecord.ownerName) || getStringValue(storeRecord.name),
            email: storeRecord.email,
            phone: storeRecord.phone,
            avatar: storeRecord.avatar,
            storeName: storeRecord.name,
            storeCategory: storeRecord.category,
            storeCity: storeRecord.city,
            storePhone: storeRecord.phone,
            subscriptionPlan: storeRecord.subscriptionPlan,
            subscriptionStatus: storeRecord.subscriptionStatus,
            createdAt: storeRecord.createdAt,
          },
          { useFallbacks: true }
        ),
      ];
    });

    await Promise.all([...userSyncTasks, ...storeSyncTasks]);

    console.log(
      "Admin registry backfill completed:",
      usersSnapshot.size,
      "users,",
      storesSnapshot.size,
      "stores"
    );

    return {
      users: usersSnapshot.size,
      stores: storesSnapshot.size,
    };
  } catch (error) {
    console.log("Error backfilling admin registry:", error);
    return {
      users: 0,
      stores: 0,
    };
  }
}
