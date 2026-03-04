import React, { useCallback, useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  Pressable,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, RelativePathString, useFocusEffect } from "expo-router";
import {
  MessageSquarePlus,
  Bot,
  AlertCircle,
  Crown,
  X,
  Search,
  Store,
  FlaskConical,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";
import { getUserChats, FirestoreChat, BUTIKBIZ_ADMIN_ID, BUTIKBIZ_NAME, BUTIKBIZ_AVATAR, sendAdminChatMessage, createTestChatBetweenStores, getFirestoreStores, getChatId, getOrCreateChat } from "@/services/firestore";
import { playNotificationSound } from "@/services/notificationSound";

function ChatItem({ chat, onPress, currentUid }: { chat: FirestoreChat; onPress: () => void; currentUid: string }) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const isAdminChat = chat.storeOwnerId === BUTIKBIZ_ADMIN_ID;
  const isStoreOwner = currentUid === chat.storeOwnerId;
  const displayName = isAdminChat ? BUTIKBIZ_NAME : (isStoreOwner ? chat.customerName : chat.storeName);
  const displayAvatar = isAdminChat ? BUTIKBIZ_AVATAR : (isStoreOwner ? chat.customerAvatar : chat.storeAvatar);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.chatItem}
        testID={`chat-item-${chat.id}`}
      >
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: displayAvatar }} style={styles.avatar} />
          {chat.isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatTopRow}>
            <Text style={styles.chatName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.chatTime}>
              {chat.lastMessageTime || ""}
            </Text>
          </View>
          <View style={styles.chatBottomRow}>
            <View style={styles.lastMessageRow}>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {chat.lastMessage || "Henüz mesaj yok"}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

interface FirestoreStoreItem {
  id: string;
  name?: string;
  avatar?: string;
  category?: string;
  ownerId?: string;
  city?: string;
}

function StorePickerItem({ store, onPress }: { store: FirestoreStoreItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.storePickerItem} onPress={onPress} activeOpacity={0.7}>
      <Image
        source={{ uri: store.avatar || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop" }}
        style={styles.storePickerAvatar}
      />
      <View style={styles.storePickerInfo}>
        <Text style={styles.storePickerName} numberOfLines={1}>{store.name || "Mağaza"}</Text>
        <Text style={styles.storePickerCategory} numberOfLines={1}>
          {[store.category, store.city].filter(Boolean).join(" · ") || "Mağaza"}
        </Text>
      </View>
      <View style={styles.storePickerArrow}>
        <MessageSquarePlus size={18} color={Colors.accent} />
      </View>
    </TouchableOpacity>
  );
}

export default function ChatsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, updateProfile, isSubscriptionActive, isTrialExpired, isLoggedIn, uid } = useUser();
  const { showAlert } = useAlert();
  const welcomeSentRef = React.useRef(false);
  const [showStorePicker, setShowStorePicker] = useState<boolean>(false);
  const [storeSearch, setStoreSearch] = useState<string>("");

  const testChatMutation = useMutation({
    mutationFn: () => createTestChatBetweenStores(),
    onSuccess: (chatId) => {
      if (chatId) {
        queryClient.invalidateQueries({ queryKey: ["userChats", uid] });
        showAlert("Test Sohbet", "İki mağaza arasında test sohbeti oluşturuldu! Sohbet listenizde görünecek.");
      } else {
        showAlert("Hata", "Test sohbeti oluşturulamadı. En az 2 mağaza olmalı.");
      }
    },
    onError: () => {
      showAlert("Hata", "Test sohbeti oluşturulurken bir hata oluştu.");
    },
  });

  const storesQuery = useQuery({
    queryKey: ["firestoreStores"],
    queryFn: () => getFirestoreStores(),
    enabled: showStorePicker,
  });

  const filteredStores = React.useMemo(() => {
    const allStores = (storesQuery.data ?? []) as FirestoreStoreItem[];
    const ownStores = allStores.filter((s) => s.ownerId !== uid);
    if (!storeSearch.trim()) return ownStores;
    const q = storeSearch.toLowerCase();
    return ownStores.filter((s) =>
      (s.name || "").toLowerCase().includes(q) ||
      (s.category || "").toLowerCase().includes(q) ||
      (s.city || "").toLowerCase().includes(q)
    );
  }, [storesQuery.data, storeSearch, uid]);

  const startChatMutation = useMutation({
    mutationFn: async (store: FirestoreStoreItem) => {
      if (!uid) throw new Error("Giriş yapmalısınız");
      const storeOwnerId = store.ownerId || store.id;
      const chatId = getChatId(uid, store.id);
      await getOrCreateChat({
        chatId,
        userId: uid,
        storeId: store.id,
        storeName: store.name || "Mağaza",
        storeAvatar: store.avatar || "",
        storeOwnerId,
        customerName: profile.name || profile.firstName || "Müşteri",
        customerAvatar: profile.avatar,
      });
      return { chatId, store, storeOwnerId };
    },
    onSuccess: ({ chatId, store, storeOwnerId }) => {
      setShowStorePicker(false);
      setStoreSearch("");
      queryClient.invalidateQueries({ queryKey: ["userChats", uid] });
      router.push({
        pathname: "/chat/[id]" as RelativePathString,
        params: {
          id: chatId,
          storeId: store.id,
          storeName: store.name || "Mağaza",
          storeAvatar: store.avatar || "",
          storeOwnerId,
          isOnline: "true",
        },
      });
    },
    onError: () => {
      showAlert("Hata", "Sohbet başlatılırken bir hata oluştu.");
    },
  });

  const handleStartChat = useCallback(() => {
    if (!isLoggedIn) {
      showAlert(
        "Üye Olun",
        "Sohbet başlatabilmek için üye olmanız gerekmektedir.",
        [
          { text: "Vazgeç", style: "cancel" },
          { text: "Giriş Yap / Üye Ol", onPress: () => router.push("/login" as any) },
        ]
      );
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowStorePicker(true);
  }, [isLoggedIn, showAlert, router]);

  const isStoreOwner = profile.isStore;
  const subActive = isSubscriptionActive();
  const trialExp = isTrialExpired();
  const isPro = subActive && !trialExp && (profile.subscriptionPlan === "monthly" || profile.subscriptionPlan === "yearly");

  const chatsQuery = useQuery({
    queryKey: ["userChats", uid],
    queryFn: () => getUserChats(uid!),
    enabled: !!uid && isLoggedIn,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  useFocusEffect(
    useCallback(() => {
      if (uid && isLoggedIn) {
        console.log("Chats screen focused, refetching chats for:", uid);
        queryClient.invalidateQueries({ queryKey: ["userChats", uid] });
      }
    }, [uid, isLoggedIn, queryClient])
  );

  const handleChatPress = useCallback((chat: FirestoreChat) => {
    if (!isLoggedIn) {
      showAlert(
        "Üye Olun",
        "Mesajları görüntüleyebilmek için üye olmanız gerekmektedir.",
        [
          { text: "Vazgeç", style: "cancel" },
          { text: "Giriş Yap / Üye Ol", onPress: () => router.push("/login" as any) },
        ]
      );
      return;
    }
    const isOwner = uid === chat.storeOwnerId;
    router.push({
      pathname: "/chat/[id]" as RelativePathString,
      params: {
        id: chat.id,
        storeId: chat.storeId,
        storeName: isOwner ? chat.customerName : chat.storeName,
        storeAvatar: isOwner ? chat.customerAvatar : chat.storeAvatar,
        isOnline: chat.isOnline ? "true" : "false",
      },
    });
  }, [router, isLoggedIn, showAlert, uid]);

  const handleToggleAI = useCallback(() => {
    if (!isPro) {
      showAlert(
        "Pro Ozellik",
        "AI otomatik yanit ozelligi sadece abonelik sahibi (Pro) kullanicilar icin aktiftir. Lutfen abonelik satin alin.",
      );
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    updateProfile({ aiAutoReplyEnabled: !profile.aiAutoReplyEnabled });
    showAlert(
      profile.aiAutoReplyEnabled ? "AI Yanit Kapatildi" : "AI Yanit Acildi",
      profile.aiAutoReplyEnabled
        ? "Otomatik AI yanitlari kapatildi."
        : "Gelen mesajlara otomatik AI yanit verilecek.",
    );
  }, [isPro, profile.aiAutoReplyEnabled, updateProfile, showAlert]);

  const renderChat = useCallback(({ item }: { item: FirestoreChat }) => (
    <ChatItem chat={item} onPress={() => handleChatPress(item)} currentUid={uid ?? ""} />
  ), [handleChatPress, uid]);

  const renderSeparator = useCallback(() => (
    <View style={styles.separator} />
  ), []);

  const showPaymentWarning = isStoreOwner && trialExp && profile.subscriptionPlan === "trial";
  const showSubExpiredWarning = isStoreOwner && profile.subscriptionStatus === "pending_payment";

  const chatsList = React.useMemo(() => chatsQuery.data ?? [], [chatsQuery.data]);
  const prevLastMessagesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (
      isLoggedIn &&
      uid &&
      profile.name &&
      !chatsQuery.isLoading &&
      !welcomeSentRef.current
    ) {
      welcomeSentRef.current = true;
      const hasAdminChat = chatsList.some(
        (c) => c.storeOwnerId === BUTIKBIZ_ADMIN_ID || c.id === `admin_${uid}`
      );
      if (!hasAdminChat) {
        console.log("No admin chat found, creating welcome message for:", uid);
        sendAdminChatMessage(
          uid,
          `\u{1F44B} Hoş geldiniz ${profile.name}!\n\nButikBiz platformuna hoş geldiniz! Burada binlerce butik mağaza ve ürünleri keşfedebilir, güvenle alışveriş yapabilirsiniz.\n\nHerhangi bir sorunuz olursa bize buradan yazabilirsiniz. İyi alışverişler! \u{1F6CD}\uFE0F`
        )
          .then(() => {
            console.log("Welcome chat created successfully");
            queryClient.invalidateQueries({ queryKey: ["userChats", uid] });
          })
          .catch((err) => console.log("Welcome chat error:", err));
      }
    }
  }, [isLoggedIn, uid, profile.name, chatsQuery.isLoading, chatsList, queryClient]);

  useEffect(() => {
    if (chatsList.length > 0 && uid) {
      const prevMap = prevLastMessagesRef.current;
      const hasPrev = Object.keys(prevMap).length > 0;

      if (hasPrev) {
        for (const chat of chatsList) {
          const prevMsg = prevMap[chat.id];
          if (prevMsg !== undefined && chat.lastMessage && chat.lastMessage !== prevMsg) {
            const isFromOther = chat.storeOwnerId !== uid
              ? true
              : chat.customerId !== uid;
            if (isFromOther) {
              playNotificationSound();
              console.log("New message in chat list, playing sound for chat:", chat.id);
              break;
            }
          }
        }
      }

      const newMap: Record<string, string> = {};
      for (const chat of chatsList) {
        newMap[chat.id] = chat.lastMessage || "";
      }
      prevLastMessagesRef.current = newMap;
    }
  }, [chatsList, uid]);

  return (
    <View style={styles.container}>


      {isStoreOwner && (
        <View style={styles.aiToggleSection}>
          <View style={styles.aiToggleLeft}>
            <Bot size={20} color={profile.aiAutoReplyEnabled ? Colors.accent : Colors.textLight} />
            <View>
              <Text style={styles.aiToggleTitle}>AI Otomatik Yanit</Text>
              <Text style={styles.aiToggleSubtitle}>
                {isPro ? (profile.aiAutoReplyEnabled ? "Acik" : "Kapali") : "Pro ozellik"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.aiToggleBtn,
              profile.aiAutoReplyEnabled && isPro && styles.aiToggleBtnActive,
              !isPro && styles.aiToggleBtnLocked,
            ]}
            onPress={handleToggleAI}
            testID="ai-toggle"
          >
            {!isPro && <Crown size={14} color="#F59E0B" />}
            <Text style={[
              styles.aiToggleBtnText,
              profile.aiAutoReplyEnabled && isPro && styles.aiToggleBtnTextActive,
            ]}>
              {isPro ? (profile.aiAutoReplyEnabled ? "Acik" : "Kapat") : "Pro"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isStoreOwner && (showPaymentWarning || showSubExpiredWarning) && (
        <View style={styles.warningBanner}>
          <AlertCircle size={18} color="#DC2626" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Odeme Uyarisi</Text>
            <Text style={styles.warningText}>
              {showPaymentWarning
                ? "Deneme suresiniz doldu. Magazanizi aktif tutmak icin abonelik satin alin."
                : "Abonelik odemeniz alinamadi. Lutfen odeme bilgilerinizi guncelleyin."}
            </Text>
          </View>
        </View>
      )}



      {!isLoggedIn ? (
        <View style={styles.emptyContainer}>
          <MessageSquarePlus size={56} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>Mesajlaşmak için üye olun</Text>
          <Text style={styles.emptySubtext}>
            Mağazalarla iletişime geçmek için giriş yapın veya üye olun.
          </Text>
          <TouchableOpacity
            style={styles.loginPromptButton}
            onPress={() => router.push("/login" as any)}
            testID="chats-login-button"
          >
            <Text style={styles.loginPromptButtonText}>Giriş Yap / Üye Ol</Text>
          </TouchableOpacity>
        </View>
      ) : chatsQuery.isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.emptySubtext}>Sohbetler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={chatsList}
          keyExtractor={(item) => item.id}
          renderItem={renderChat}
          ItemSeparatorComponent={renderSeparator}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageSquarePlus size={56} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>Henüz sohbet yok</Text>
              <Text style={styles.emptySubtext}>
                Pazar yerinden bir mağaza ile iletişime geçin
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showStorePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowStorePicker(false); setStoreSearch(""); }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Mağaza Seçin</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => { setShowStorePicker(false); setStoreSearch(""); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Search size={18} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Mağaza ara..."
              placeholderTextColor={Colors.textLight}
              value={storeSearch}
              onChangeText={setStoreSearch}
              autoFocus={false}
            />
          </View>

          {storesQuery.isLoading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.modalLoadingText}>Mağazalar yükleniyor...</Text>
            </View>
          ) : filteredStores.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Store size={48} color={Colors.textLight} />
              <Text style={styles.modalEmptyTitle}>
                {storeSearch ? "Sonuç bulunamadı" : "Henüz mağaza yok"}
              </Text>
              <Text style={styles.modalEmptySubtext}>
                {storeSearch ? "Farklı bir arama deneyin" : "Mağazalar eklendiğinde burada görünecek"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredStores}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <StorePickerItem
                  store={item}
                  onPress={() => startChatMutation.mutate(item)}
                />
              )}
              contentContainerStyle={styles.storeList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.storeSeparator} />}
            />
          )}

          {startChatMutation.isPending && (
            <View style={styles.chatCreatingOverlay}>
              <View style={styles.chatCreatingBox}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.chatCreatingText}>Sohbet başlatılıyor...</Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#991B1B",
  },
  warningText: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 2,
    lineHeight: 17,
  },

  listContent: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: Colors.white,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.border,
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: Colors.online,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  chatContent: {
    flex: 1,
  },
  chatTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: Colors.textLight,
  },
  chatBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 3,
  },
  lastMessageRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 3,
    marginRight: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  separator: {
    height: 0.5,
    backgroundColor: Colors.border,
    marginLeft: 80,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 120,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  loginPromptButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  loginPromptButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700" as const,
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  newChatButtonText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  testChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  testChatButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#6366F1",
  },
  aiToggleSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  aiToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  aiToggleTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  aiToggleSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  aiToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aiToggleBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  aiToggleBtnLocked: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  aiToggleBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  aiToggleBtnTextActive: {
    color: Colors.white,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 16 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 0,
  },
  storeList: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  storeSeparator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 64,
  },
  storePickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  storePickerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.border,
  },
  storePickerInfo: {
    flex: 1,
  },
  storePickerName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  storePickerCategory: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  storePickerArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  modalLoadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  modalEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 8,
  },
  modalEmptyTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: 8,
  },
  modalEmptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: "center",
  },
  chatCreatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  chatCreatingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  chatCreatingText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
});
