import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/config/firebase";

export async function getUserProfile(uid: string): Promise<Record<string, any> | null> {
  try {
    const docSnap = await getDoc(doc(db, "users", uid));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.log("Error loading user profile:", error);
    return null;
  }
}

export async function saveUserProfile(uid: string, data: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    console.log("User profile saved to Firestore");
  } catch (error) {
    console.log("Error saving user profile:", error);
  }
}

export async function getFirestoreStores(): Promise<Record<string, any>[]> {
  try {
    const snapshot = await getDocs(collection(db, "stores"));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.log("Error loading stores:", error);
    return [];
  }
}

export async function getFirestoreStore(storeId: string): Promise<Record<string, any> | null> {
  try {
    const docSnap = await getDoc(doc(db, "stores", storeId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.log("Error loading store:", error);
    return null;
  }
}

export async function getFirestoreStoreBySlug(slug: string): Promise<Record<string, any> | null> {
  try {
    const q = query(collection(db, "stores"), where("slug", "==", slug));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log("No store found for slug:", slug);
      return null;
    }
    const d = snapshot.docs[0];
    console.log("Store found by slug:", slug, "=>", d.id);
    return { id: d.id, ...d.data() };
  } catch (error) {
    console.log("Error loading store by slug:", error);
    return null;
  }
}

export async function saveStore(storeId: string, data: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(db, "stores", storeId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    console.log("Store saved to Firestore");
  } catch (error) {
    console.log("Error saving store:", error);
  }
}

export async function deleteStore(storeId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "stores", storeId));
    console.log("Store deleted from Firestore");
  } catch (error) {
    console.log("Error deleting store:", error);
  }
}

export async function getAdminData(): Promise<Record<string, any> | null> {
  try {
    const docSnap = await getDoc(doc(db, "admin", "data"));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.log("Error loading admin data:", error);
    return null;
  }
}

export async function saveAdminData(data: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(db, "admin", "data"), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    console.log("Admin data saved to Firestore");
  } catch (error) {
    console.log("Error saving admin data:", error);
  }
}

export async function getAdminSettings(): Promise<Record<string, any> | null> {
  try {
    const docSnap = await getDoc(doc(db, "admin", "settings"));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.log("Error loading admin settings:", error);
    return null;
  }
}

export async function saveAdminSettings(data: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(db, "admin", "settings"), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    console.log("Admin settings saved to Firestore");
  } catch (error) {
    console.log("Error saving admin settings:", error);
  }
}

export async function getAllUsers(): Promise<Record<string, any>[]> {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));
  } catch (error) {
    console.log("Error loading all users:", error);
    return [];
  }
}

export async function getStoreOwners(): Promise<Record<string, any>[]> {
  try {
    const q = query(collection(db, "users"), where("isStore", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));
  } catch (error) {
    console.log("Error loading store owners:", error);
    return [];
  }
}

export async function sendSystemNotification(
  targetUid: string,
  notification: {
    id: string;
    title: string;
    message: string;
    type: string;
    createdAt: string;
    read: boolean;
  }
): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, "users", targetUid));
    const existing = userDoc.exists() ? userDoc.data() : {};
    const notifications = Array.isArray(existing.systemNotifications) ? existing.systemNotifications : [];
    notifications.unshift(notification);
    await updateDoc(doc(db, "users", targetUid), { systemNotifications: notifications });
    console.log("System notification sent to:", targetUid);
  } catch (error) {
    console.log("Error sending system notification:", error);
  }
}

export async function checkStoreNameExists(name: string, excludeUid?: string): Promise<boolean> {
  try {
    const q = query(collection(db, "stores"), where("name", "==", name));
    const snapshot = await getDocs(q);
    if (excludeUid) {
      return snapshot.docs.some((d) => d.id !== excludeUid);
    }
    return !snapshot.empty;
  } catch (error) {
    console.log("Error checking store name:", error);
    return false;
  }
}

export interface FirestoreMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
  createdAt: any;
  isRead: boolean;
}

export interface FirestoreChat {
  id: string;
  participants: string[];
  storeId: string;
  storeName: string;
  storeAvatar: string;
  storeOwnerId: string;
  customerId: string;
  customerName: string;
  customerAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageTimestamp: any;
  isOnline: boolean;
  createdAt: any;
  updatedAt: any;
  unreadCount?: number;
}

export function getChatId(userId: string, storeId: string): string {
  return `${userId}_${storeId}`;
}

export async function getOrCreateChat(params: {
  chatId: string;
  userId: string;
  storeId: string;
  storeName: string;
  storeAvatar: string;
  storeOwnerId: string;
  customerName: string;
  customerAvatar: string;
}): Promise<FirestoreChat> {
  try {
    const chatRef = doc(db, "chats", params.chatId);
    let chatSnap: any = null;
    try {
      chatSnap = await getDoc(chatRef);
    } catch (readErr: any) {
      console.log("Chat read failed (may not exist yet):", readErr?.code, readErr?.message);
      chatSnap = null;
    }
    if (chatSnap && chatSnap.exists()) {
      return { id: chatSnap.id, ...chatSnap.data() } as FirestoreChat;
    }
    const newChat: Omit<FirestoreChat, "id"> = {
      participants: [params.userId, params.storeOwnerId],
      storeId: params.storeId,
      storeName: params.storeName,
      storeAvatar: params.storeAvatar,
      storeOwnerId: params.storeOwnerId,
      customerId: params.userId,
      customerName: params.customerName,
      customerAvatar: params.customerAvatar,
      lastMessage: "",
      lastMessageTime: "",
      lastMessageTimestamp: serverTimestamp(),
      isOnline: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(chatRef, newChat);
    console.log("Chat created:", params.chatId, "participants:", [params.userId, params.storeOwnerId]);

    if (params.storeOwnerId && params.storeOwnerId !== params.userId) {
      sendChatNotification(
        params.storeOwnerId,
        params.customerName || "Bir kullanıcı",
        `${params.customerName || "Bir kullanıcı"} sizinle sohbet başlattı.`
      ).catch((err) => console.log("Chat notification error:", err));
    }

    return { id: params.chatId, ...newChat };
  } catch (error) {
    console.log("Error creating chat:", error);
    throw error;
  }
}

export async function sendChatNotification(
  targetUid: string,
  senderName: string,
  message: string
): Promise<void> {
  try {
    const notification = {
      id: `chat_notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: "Yeni Sohbet",
      message,
      type: "chat",
      createdAt: new Date().toISOString(),
      read: false,
      senderName,
    };
    await sendSystemNotification(targetUid, notification);
    console.log("Chat notification sent to:", targetUid, "from:", senderName);
  } catch (error) {
    console.log("Error sending chat notification:", error);
  }
}

export async function sendChatMessage(chatId: string, message: {
  text: string;
  senderId: string;
}): Promise<FirestoreMessage> {
  try {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const msgData: FirestoreMessage = {
      id: msgId,
      text: message.text,
      senderId: message.senderId,
      timestamp: timeStr,
      createdAt: now.toISOString(),
      isRead: false,
    };
    const msgRef = doc(db, "chats", chatId, "messages", msgId);
    await setDoc(msgRef, msgData);

    const chatRef = doc(db, "chats", chatId);
    await setDoc(chatRef, {
      lastMessage: message.text,
      lastMessageTime: timeStr,
      lastMessageTimestamp: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    try {
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const chatData = chatSnap.data();
        const participants = (chatData.participants as string[]) ?? [];
        const recipientId = participants.find((p) => p !== message.senderId);
        if (recipientId) {
          const senderName = message.senderId === chatData.storeOwnerId
            ? (chatData.storeName as string) ?? "Ma\u011faza"
            : (chatData.customerName as string) ?? "Kullan\u0131c\u0131";
          const shortText = message.text.length > 60 ? message.text.substring(0, 60) + "..." : message.text;
          sendChatNotification(
            recipientId,
            senderName,
            `${senderName}: ${shortText}`
          ).catch((err) => console.log("Message notification error:", err));
        }
      }
    } catch (notifErr) {
      console.log("Error sending message notification:", notifErr);
    }

    console.log("Message sent:", msgId, "to chat:", chatId);
    return msgData;
  } catch (error) {
    console.log("Error sending message:", error);
    throw error;
  }
}

export async function getChatMessages(chatId: string): Promise<FirestoreMessage[]> {
  try {
    const msgsRef = collection(db, "chats", chatId, "messages");
    const snapshot = await getDocs(msgsRef);
    const messages = snapshot.docs.map((d) => ({ ...d.data() } as FirestoreMessage));
    messages.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
    console.log("Loaded", messages.length, "messages for chat:", chatId);
    return messages;
  } catch (error) {
    console.log("Error loading messages:", error);
    return [];
  }
}

export async function markMessagesAsRead(chatId: string, currentUserId: string): Promise<void> {
  try {
    const msgsRef = collection(db, "chats", chatId, "messages");
    const snapshot = await getDocs(msgsRef);
    const unreadMessages = snapshot.docs.filter((d) => {
      const data = d.data();
      return data.senderId !== currentUserId && !data.isRead;
    });
    if (unreadMessages.length === 0) return;
    const updatePromises = unreadMessages.map((d) =>
      updateDoc(d.ref, { isRead: true })
    );
    await Promise.all(updatePromises);
    console.log("Marked", unreadMessages.length, "messages as read in chat:", chatId);
  } catch (error) {
    console.log("Error marking messages as read:", error);
  }
}

export async function clearChatMessages(chatId: string): Promise<void> {
  try {
    const msgsRef = collection(db, "chats", chatId, "messages");
    const snapshot = await getDocs(msgsRef);
    const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    const chatRef = doc(db, "chats", chatId);
    await setDoc(chatRef, {
      lastMessage: "",
      lastMessageTime: "",
      updatedAt: serverTimestamp(),
    }, { merge: true });

    console.log("Chat messages cleared for:", chatId, "deleted:", snapshot.docs.length);
  } catch (error) {
    console.log("Error clearing chat messages:", error);
    throw error;
  }
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", userId)
    );
    const chatsSnapshot = await getDocs(chatsQuery);
    let totalUnread = 0;
    for (const chatDoc of chatsSnapshot.docs) {
      const msgsRef = collection(db, "chats", chatDoc.id, "messages");
      const msgsSnapshot = await getDocs(msgsRef);
      const unread = msgsSnapshot.docs.filter((d) => {
        const data = d.data();
        return data.senderId !== userId && !data.isRead;
      });
      totalUnread += unread.length;
    }
    console.log("Total unread messages for user:", userId, "count:", totalUnread);
    return totalUnread;
  } catch (error) {
    console.log("Error getting unread count:", error);
    return 0;
  }
}

export async function getUserChats(userId: string): Promise<FirestoreChat[]> {
  try {
    console.log("getUserChats called for userId:", userId);
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", userId)
    );
    const snapshot = await getDocs(q);
    const chatsList = snapshot.docs.map((d) => {
      const data = d.data();
      console.log("Chat found:", d.id, "participants:", data.participants, "storeName:", data.storeName);
      return { id: d.id, ...data } as FirestoreChat;
    });

    const unreadPromises = chatsList.map(async (chat) => {
      try {
        const msgsRef = collection(db, "chats", chat.id, "messages");
        const msgsSnapshot = await getDocs(msgsRef);
        const unreadCount = msgsSnapshot.docs.filter((d) => {
          const data = d.data();
          return data.senderId !== userId && !data.isRead;
        }).length;
        chat.unreadCount = unreadCount;
      } catch (err) {
        console.log("Error counting unread for chat:", chat.id, err);
        chat.unreadCount = 0;
      }
    });
    await Promise.all(unreadPromises);

    chatsList.sort((a, b) => {
      const timeA = a.updatedAt?.seconds ?? 0;
      const timeB = b.updatedAt?.seconds ?? 0;
      return timeB - timeA;
    });
    console.log("Loaded", chatsList.length, "chats for user:", userId);
    return chatsList;
  } catch (error: any) {
    console.log("Error loading user chats:", error?.code, error?.message, error);
    return [];
  }
}

export async function saveAddressToStoreOwner(
  storeOwnerId: string,
  address: {
    id: string;
    storeId: string;
    customerName: string;
    customerPhone: string;
    city: string;
    district: string;
    addressLine: string;
    note: string;
    neighborhood?: string;
    postalCode?: string;
    productInfo?: string;
    createdAt: string;
  }
): Promise<boolean> {
  try {
    if (!storeOwnerId || storeOwnerId === "unknown" || storeOwnerId.trim() === "") {
      console.log("saveAddressToStoreOwner: invalid storeOwnerId:", storeOwnerId);
      throw new Error("Geçersiz mağaza bilgisi. Lütfen tekrar deneyin.");
    }

    const addressId = address.id || `addr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    console.log("saveAddressToStoreOwner called with storeOwnerId:", storeOwnerId, "addressId:", addressId);

    const savedAt = new Date().toISOString();
    const cleanAddress: Record<string, any> = {
      id: addressId,
      storeId: address.storeId || storeOwnerId,
      customerName: address.customerName,
      customerPhone: address.customerPhone,
      city: address.city,
      district: address.district,
      addressLine: address.addressLine,
      note: address.note || "",
      createdAt: address.createdAt || savedAt,
      savedAt,
    };

    if (address.productInfo && address.productInfo.trim() !== "") {
      cleanAddress.productInfo = address.productInfo;
    }
    if (address.neighborhood && address.neighborhood.trim() !== "") {
      cleanAddress.neighborhood = address.neighborhood;
    }
    if (address.postalCode && address.postalCode.trim() !== "") {
      cleanAddress.postalCode = address.postalCode;
    }

    Object.keys(cleanAddress).forEach((key) => {
      if (cleanAddress[key] === undefined || cleanAddress[key] === null) {
        delete cleanAddress[key];
      }
    });

    console.log("saveAddressToStoreOwner: writing to path stores/" + storeOwnerId + "/addresses/" + addressId);
    console.log("saveAddressToStoreOwner: cleanAddress keys:", Object.keys(cleanAddress));

    const addressRef = doc(db, "stores", storeOwnerId, "addresses", addressId);
    await setDoc(addressRef, cleanAddress);
    console.log("Address saved successfully to store subcollection:", storeOwnerId, "address:", addressId);
    return true;
  } catch (error: any) {
    console.log("Error saving address to store:", error?.code, error?.message, error);
    if (error?.code === "permission-denied" || error?.code === "PERMISSION_DENIED") {
      throw new Error("Yetkilendirme hatası. Lütfen giriş yapın ve tekrar deneyin.");
    }
    if (error?.code === "not-found") {
      throw new Error("Mağaza bulunamadı. Lütfen tekrar deneyin.");
    }
    throw new Error(error?.message || "Adres kaydedilemedi. Lütfen tekrar deneyin.");
  }
}

export async function getStoreAddresses(storeOwnerId: string): Promise<Record<string, any>[]> {
  try {
    const snapshot = await getDocs(collection(db, "stores", storeOwnerId, "addresses"));
    const addresses = snapshot.docs.map((d) => ({ ...d.data() }));
    addresses.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    console.log("Loaded", addresses.length, "addresses for store:", storeOwnerId);
    return addresses;
  } catch (error) {
    console.log("Error loading store addresses:", error);
    return [];
  }
}

export async function deleteStoreAddress(storeOwnerId: string, addressId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "stores", storeOwnerId, "addresses", addressId));
    console.log("Address deleted from store:", storeOwnerId, "address:", addressId);
    return true;
  } catch (error) {
    console.log("Error deleting store address:", error);
    return false;
  }
}

export const BUTIKBIZ_ADMIN_ID = "butikbiz_admin";
export const BUTIKBIZ_NAME = "ButikBiz";
export const BUTIKBIZ_AVATAR = "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200&h=200&fit=crop";

export async function getOrCreateAdminChat(targetUid: string): Promise<string> {
  try {
    const chatId = `admin_${targetUid}`;
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      return chatId;
    }
    const newChat: Omit<FirestoreChat, "id"> = {
      participants: [targetUid, BUTIKBIZ_ADMIN_ID],
      storeId: BUTIKBIZ_ADMIN_ID,
      storeName: BUTIKBIZ_NAME,
      storeAvatar: BUTIKBIZ_AVATAR,
      storeOwnerId: BUTIKBIZ_ADMIN_ID,
      customerId: targetUid,
      customerName: "",
      customerAvatar: "",
      lastMessage: "",
      lastMessageTime: "",
      lastMessageTimestamp: serverTimestamp(),
      isOnline: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(chatRef, newChat);
    console.log("Admin chat created for user:", targetUid);
    return chatId;
  } catch (error) {
    console.log("Error creating admin chat:", error);
    throw error;
  }
}

export async function sendAdminChatMessage(
  targetUid: string,
  messageText: string
): Promise<void> {
  try {
    const chatId = await getOrCreateAdminChat(targetUid);
    await sendChatMessage(chatId, {
      text: messageText,
      senderId: BUTIKBIZ_ADMIN_ID,
    });
    console.log("Admin message sent to user:", targetUid, "in chat:", chatId);
  } catch (error) {
    console.log("Error sending admin chat message:", error);
    throw error;
  }
}

export async function createTestChatBetweenStores(): Promise<string | null> {
  try {
    const storesSnapshot = await getDocs(collection(db, "stores"));
    const allStores = storesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log("Found stores:", allStores.map((s: any) => s.name));

    if (allStores.length < 2) {
      console.log("Not enough stores to create test chat");
      return null;
    }

    const storeA = allStores[0] as any;
    const storeB = allStores[1] as any;

    const ownerA = storeA.ownerId || storeA.id;
    const ownerB = storeB.ownerId || storeB.id;

    const chatId = `${ownerA}_${ownerB}`;
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (chatSnap.exists()) {
      console.log("Test chat already exists:", chatId);
      return chatId;
    }

    const newChat: Omit<FirestoreChat, "id"> = {
      participants: [ownerA, ownerB],
      storeId: storeB.id,
      storeName: storeB.name || "Mağaza B",
      storeAvatar: storeB.avatar || "",
      storeOwnerId: ownerB,
      customerId: ownerA,
      customerName: storeA.name || "Mağaza A",
      customerAvatar: storeA.avatar || "",
      lastMessage: "",
      lastMessageTime: "",
      lastMessageTimestamp: serverTimestamp(),
      isOnline: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(chatRef, newChat);
    console.log("Test chat created:", chatId, "between", storeA.name, "and", storeB.name);

    const testMessages = [
      { text: `Merhaba ${storeB.name}! Ürünlerinizi inceliyorum, çok güzel.`, senderId: ownerA },
      { text: `Teşekkürler ${storeA.name}! Herhangi bir sorunuz olursa yazabilirsiniz 😊`, senderId: ownerB },
      { text: "Kargo süreniz ne kadar?", senderId: ownerA },
      { text: "Genelde 2-3 iş günü içinde teslim ediyoruz.", senderId: ownerB },
    ];

    for (let i = 0; i < testMessages.length; i++) {
      const msg = testMessages[i];
      const msgId = `test_msg_${Date.now()}_${i}`;
      const now = new Date(Date.now() + i * 60000);
      const timeStr = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
      const msgData: FirestoreMessage = {
        id: msgId,
        text: msg.text,
        senderId: msg.senderId,
        timestamp: timeStr,
        createdAt: now.toISOString(),
        isRead: true,
      };
      await setDoc(doc(db, "chats", chatId, "messages", msgId), msgData);
    }

    const lastMsg = testMessages[testMessages.length - 1];
    const lastTime = new Date(Date.now() + (testMessages.length - 1) * 60000)
      .toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    await updateDoc(chatRef, {
      lastMessage: lastMsg.text,
      lastMessageTime: lastTime,
      lastMessageTimestamp: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("Test messages added to chat:", chatId);
    return chatId;
  } catch (error) {
    console.log("Error creating test chat:", error);
    return null;
  }
}

export async function sendAdminChatToMultipleUsers(
  targetUids: string[],
  messageText: string
): Promise<number> {
  let sentCount = 0;
  for (const uid of targetUids) {
    try {
      await sendAdminChatMessage(uid, messageText);
      sentCount++;
    } catch (error) {
      console.log("Error sending admin chat to:", uid, error);
    }
  }
  console.log("Admin chat sent to", sentCount, "of", targetUids.length, "users");
  return sentCount;
}
