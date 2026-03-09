import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Send, CheckCheck, Paperclip, Smile, MapPin, MoreVertical, Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { stores } from "@/mocks/stores";
import { useUser } from "@/contexts/UserContext";
import {
  sendChatMessage,
  getOrCreateChat,
  clearChatMessages,
  markMessagesAsRead,
  setTypingStatus,
  subscribeToChatMessages,
  getChatMessages,
  subscribeToTypingStatus,
  FirestoreMessage,
  BUTIKBIZ_ADMIN_ID,
  BUTIKBIZ_NAME,
  BUTIKBIZ_AVATAR,
} from "@/services/firestore";
import { playNotificationSound } from "@/services/notificationSound";

interface DisplayMessage {
  id: string;
  text: string;
  timestamp: string;
  isSent: boolean;
  isRead: boolean;
  isProductCard?: boolean;
  isOptimistic?: boolean;
}

interface ProductCard {
  image: string;
  name: string;
  price: string;
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        message.isSent ? styles.sentRow : styles.receivedRow,
        { opacity: fadeAnim },
      ]}
    >
      <View style={[styles.bubbleContainer, message.isSent ? styles.sentContainer : styles.receivedContainer]}>
        <View
          style={[
            styles.bubble,
            message.isSent ? styles.sentBubble : styles.receivedBubble,
          ]}
        >
          <Text style={[styles.messageText, message.isSent ? styles.sentText : styles.receivedText]}>
            {message.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.timestamp, message.isSent && styles.sentTimestamp]}>
              {message.timestamp}
            </Text>
            {message.isSent && (
              message.isRead ? (
                <CheckCheck size={14} color="#34B7F1" />
              ) : (
                <CheckCheck size={14} color="#92A4A3" />
              )
            )}
          </View>
        </View>
        <View style={message.isSent ? styles.sentTail : styles.receivedTail} />
      </View>
    </Animated.View>
  );
}

function ProductMessageBubble({ product, timestamp }: { product: ProductCard; timestamp: string }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.bubbleContainer, styles.sentContainer, { opacity: fadeAnim }]}>
      <View style={[styles.bubble, styles.sentBubble, { padding: 0, overflow: "hidden" as const }]}>
        <Image source={{ uri: product.image }} style={styles.productCardImage} contentFit="cover" />
        <View style={styles.productCardInfo}>
          <Text style={[styles.messageText, styles.sentText, { fontWeight: "700" as const, fontSize: 14 }]}>{product.name}</Text>
          <Text style={[styles.productCardPrice]}>{product.price}</Text>
          <Text style={[styles.messageText, styles.sentText, { fontSize: 13, marginTop: 4 }]}>Bu ürün hakkında bilgi almak istiyorum.</Text>
        </View>
        <View style={[styles.messageFooter, { paddingHorizontal: 12, paddingBottom: 6 }]}>
          <Text style={[styles.timestamp, styles.sentTimestamp]}>{timestamp}</Text>
          <CheckCheck size={14} color="#92A4A3" />
        </View>
      </View>
      <View style={styles.sentTail} />
    </Animated.View>
  );
}

export default function ChatDetailScreen() {
  const {
    id,
    storeId,
    storeName,
    storeAvatar,
    storeOwnerId: storeOwnerIdParam,
    isOnline,
    productMessage,
    productImage,
    productName,
    productPrice,
    customerName: customerNameParam,
    customerAvatar: customerAvatarParam,
  } = useLocalSearchParams<{
    id: string;
    storeId?: string;
    storeName?: string;
    storeAvatar?: string;
    storeOwnerId?: string;
    isOnline?: string;
    productMessage?: string;
    productImage?: string;
    productName?: string;
    productPrice?: string;
    customerName?: string;
    customerAvatar?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, uid } = useUser();
  const [messageText, setMessageText] = useState<string>("");
  const [firestoreMessages, setFirestoreMessages] = useState<FirestoreMessage[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<DisplayMessage[]>([]);
  const [productCard, setProductCard] = useState<ProductCard | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(true);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [isOtherTyping, setIsOtherTyping] = useState<boolean>(false);
  const flatListRef = useRef<FlatList>(null);
  const sendScaleAnim = useRef(new Animated.Value(1)).current;
  const hasInjectedProduct = useRef(false);
  const chatInitialized = useRef(false);
  const chatInitDone = useRef(false);
  const prevMessageCountRef = useRef<number>(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingDotAnim = useRef(new Animated.Value(0)).current;
  const subscriptionRef = useRef<(() => void) | null>(null);
  const typingSubRef = useRef<(() => void) | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdminChat = storeId === BUTIKBIZ_ADMIN_ID || id?.startsWith("admin_");
  const initialIsOwner = !!(uid && storeOwnerIdParam && uid === storeOwnerIdParam);

  const [liveStoreName, setLiveStoreName] = useState<string>(
    initialIsOwner && customerNameParam ? customerNameParam : (storeName ?? "Mağaza")
  );
  const [liveStoreAvatar, setLiveStoreAvatar] = useState<string>(
    initialIsOwner && customerAvatarParam ? customerAvatarParam : (storeAvatar ?? "")
  );

  const resolvedStoreName = isAdminChat ? BUTIKBIZ_NAME : liveStoreName;
  const resolvedStoreAvatar = isAdminChat ? BUTIKBIZ_AVATAR : liveStoreAvatar;
  const resolvedIsOnline = isOnline === "true";

  const mergedMessages = React.useMemo(() => {
    if (!uid) return [];
    const display: DisplayMessage[] = firestoreMessages.map((msg: FirestoreMessage) => ({
      id: msg.id,
      text: msg.text,
      timestamp: msg.timestamp,
      isSent: msg.senderId === uid,
      isRead: msg.isRead,
      isProductCard: msg.text.includes("Bu ürün hakkında bilgi almak istiyorum") && msg.senderId === uid,
    }));

    const firestoreTexts = new Set(firestoreMessages.map((m) => `${m.text}::${m.senderId}`));
    const pendingOptimistic = optimisticMessages.filter(
      (opt) => !firestoreTexts.has(`${opt.text}::${uid}`)
    );

    return [...display, ...pendingOptimistic];
  }, [firestoreMessages, optimisticMessages, uid]);

  useEffect(() => {
    if (isOtherTyping) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(typingDotAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(typingDotAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      typingDotAnim.setValue(0);
    }
  }, [isOtherTyping, typingDotAnim]);

  useEffect(() => {
    if (!id || !uid || isAdminChat) return;

    console.log("Starting typing subscription for chat:", id);
    const unsub = subscribeToTypingStatus(id, uid, (typing) => {
      setIsOtherTyping(typing);
    });
    typingSubRef.current = unsub;

    return () => {
      if (typingSubRef.current) {
        typingSubRef.current();
        typingSubRef.current = null;
      }
    };
  }, [id, uid, isAdminChat]);

  const handleTextChange = useCallback((text: string) => {
    setMessageText(text);
    if (!id || !uid || isAdminChat) return;

    if (text.trim().length > 0) {
      void setTypingStatus(id, uid, true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        if (id && uid) {
          void setTypingStatus(id, uid, false);
        }
      }, 5000);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      void setTypingStatus(id, uid, false);
    }
  }, [id, uid, isAdminChat]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (id && uid) {
        void setTypingStatus(id, uid, false);
      }
    };
  }, [id, uid]);

  const startSubscription = useCallback(() => {
    if (!id) return;

    if (subscriptionRef.current) {
      subscriptionRef.current();
      subscriptionRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    console.log("Starting message subscription for chat:", id);
    const unsubscribe = subscribeToChatMessages(
      id,
      (messages) => {
        console.log("Realtime messages received:", messages.length, "for chat:", id);
        setFirestoreMessages(messages);
        setIsLoadingMessages(false);
      },
      (error) => {
        console.log("Message subscription error:", error?.code || error?.message || error);
        setIsLoadingMessages(false);

        getChatMessages(id).then((msgs) => {
          if (msgs.length > 0) {
            setFirestoreMessages(msgs);
            console.log("Fallback fetch loaded", msgs.length, "messages");
          }
        }).catch((fetchErr) => {
          console.log("Fallback fetch also failed:", fetchErr);
        });

        retryTimerRef.current = setTimeout(() => {
          console.log("Retrying subscription for chat:", id);
          startSubscription();
        }, 5000);
      }
    );
    subscriptionRef.current = unsubscribe;
  }, [id]);

  useEffect(() => {
    if (!id) return;

    console.log("Chat opened, starting subscription immediately for:", id);
    startSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [id, startSubscription]);

  useEffect(() => {
    if (id && uid && firestoreMessages.length > 0) {
      const hasUnread = firestoreMessages.some(
        (msg: FirestoreMessage) => msg.senderId !== uid && !msg.isRead
      );
      if (hasUnread) {
        void markMessagesAsRead(id, uid).then(() => {
          void queryClient.invalidateQueries({ queryKey: ["userChats", uid] });
        });
      }
    }
  }, [id, uid, firestoreMessages, queryClient]);

  useEffect(() => {
    if (firestoreMessages.length > 0 && uid) {
      const prevCount = prevMessageCountRef.current;
      if (prevCount > 0 && firestoreMessages.length > prevCount) {
        const newMsgs = firestoreMessages.slice(prevCount);
        const hasIncoming = newMsgs.some((msg) => msg.senderId !== uid);
        if (hasIncoming) {
          void playNotificationSound();
          console.log("New incoming message detected, playing sound");
        }
      }
      prevMessageCountRef.current = firestoreMessages.length;
    }
  }, [firestoreMessages, uid]);

  useEffect(() => {
    if (id && uid && !chatInitialized.current) {
      chatInitialized.current = true;
      if (storeId) {
        const storeData = stores.find((s) => s.id === storeId);
        const resolvedOwnerId = storeOwnerIdParam || storeId || "unknown";
        console.log("Chat init with storeOwnerId:", resolvedOwnerId, "storeId:", storeId, "uid:", uid, "chatId:", id);

        const correctStoreName = initialIsOwner
          ? (profile.storeName || storeName || "Mağaza")
          : (storeName || "Mağaza");
        const correctStoreAvatar = initialIsOwner
          ? (profile.avatar || storeAvatar || "")
          : (storeAvatar ?? storeData?.avatar ?? "");

        getOrCreateChat({
          chatId: id,
          userId: uid,
          storeId: storeId,
          storeName: correctStoreName,
          storeAvatar: correctStoreAvatar,
          storeOwnerId: resolvedOwnerId,
          customerName: initialIsOwner ? (customerNameParam || "Müşteri") : (profile.name || profile.firstName || "Müşteri"),
          customerAvatar: initialIsOwner ? (customerAvatarParam || "") : (profile.avatar || ""),
        }).then((chatData) => {
          console.log("Chat created/initialized:", id);
          chatInitDone.current = true;
          if (chatData) {
            const isOwner = uid === chatData.storeOwnerId;
            const freshName = isOwner ? chatData.customerName : chatData.storeName;
            const freshAvatar = isOwner ? chatData.customerAvatar : chatData.storeAvatar;
            if (freshName) setLiveStoreName(freshName);
            if (freshAvatar) setLiveStoreAvatar(freshAvatar);
          }
          void queryClient.invalidateQueries({ queryKey: ["userChats", uid] });
        }).catch((err: any) => {
          console.error("Chat init error:", err?.message, err);
          chatInitDone.current = true;
        });
      } else {
        console.log("Chat opened without storeId, ready:", id);
        chatInitDone.current = true;
      }
    }
  }, [id, uid, storeId, storeName, storeAvatar, storeOwnerIdParam, profile, queryClient, initialIsOwner, customerNameParam, customerAvatarParam]);

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing chat id");
      return clearChatMessages(id);
    },
    onSuccess: () => {
      setFirestoreMessages([]);
      setOptimisticMessages([]);
      setProductCard(null);
      prevMessageCountRef.current = 0;
      void queryClient.invalidateQueries({ queryKey: ["userChats", uid] });
      setMenuVisible(false);
      console.log("Chat cleared successfully");
    },
    onError: (err) => {
      console.log("Clear chat error:", err);
    },
  });

  const { mutate: clearChat } = clearChatMutation;

  const handleClearChat = useCallback(() => {
    if (Platform.OS === "web") {
      if (window.confirm("Sohbeti temizlemek istediğinize emin misiniz?")) {
        clearChat();
      } else {
        setMenuVisible(false);
      }
    } else {
      Alert.alert(
        "Sohbeti Temizle",
        "Tüm mesajlar silinecek. Emin misiniz?",
        [
          { text: "İptal", style: "cancel" as const, onPress: () => setMenuVisible(false) },
          { text: "Temizle", style: "destructive" as const, onPress: () => clearChat() },
        ]
      );
    }
  }, [clearChat]);

  const { mutate: sendMessageMutate } = useMutation({
    mutationFn: async (text: string) => {
      if (!id || !uid) throw new Error("Missing chat or user id");
      return sendChatMessage(id, { text, senderId: uid });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["userChats", uid] });
    },
    onError: (error) => {
      console.log("Send message error:", error);
    },
  });

  useEffect(() => {
    if (productMessage && productName && productPrice && !hasInjectedProduct.current && uid && id) {
      const waitForInit = () => {
        if (chatInitDone.current || !storeId) {
          hasInjectedProduct.current = true;

          if (productImage && productName && productPrice) {
            setProductCard({ image: productImage, name: productName, price: productPrice });
          }

          console.log("Sending product message:", id);
          sendMessageMutate(productMessage);

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 300);
        } else {
          setTimeout(waitForInit, 200);
        }
      };
      waitForInit();
    }
  }, [productMessage, productImage, productName, productPrice, uid, id, storeId, sendMessageMutate]);

  const handleSend = useCallback(() => {
    if (!messageText.trim()) return;

    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.sequence([
      Animated.timing(sendScaleAnim, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.timing(sendScaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    if (id && uid) {
      void setTypingStatus(id, uid, false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const text = messageText.trim();
    const now = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

    const optimisticMsg: DisplayMessage = {
      id: `opt-${Date.now()}`,
      text,
      timestamp: now,
      isSent: true,
      isRead: false,
      isOptimistic: true,
    };
    setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    setMessageText("");

    sendMessageMutate(text);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messageText, sendScaleAnim, sendMessageMutate, id, uid]);

  const findStoreId = useCallback(() => {
    if (storeId) return storeId;
    const matchedStore = stores.find((s) => s.name === resolvedStoreName);
    if (matchedStore) return matchedStore.id;
    if (profile.isStore && profile.storeName === resolvedStoreName) return "my-store";
    return null;
  }, [storeId, resolvedStoreName, profile]);

  const handleHeaderPress = useCallback(() => {
    const sId = findStoreId();
    if (sId) {
      router.push(`/store/${sId}` as any);
    }
  }, [findStoreId, router]);

  const headerTitle = () => (
    <TouchableOpacity style={styles.headerTitleContainer} onPress={handleHeaderPress} activeOpacity={0.7}>
      <Image source={{ uri: resolvedStoreAvatar }} style={styles.headerAvatar} />
      <View>
        <Text style={styles.headerName}>{resolvedStoreName}</Text>
        {isOtherTyping ? (
          <Text style={styles.headerTyping}>yazıyor...</Text>
        ) : (
          <Text style={styles.headerStatus}>
            {resolvedIsOnline ? "çevrimiçi" : "son görülme bugün"}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const headerRight = () => (
    <View>
      <TouchableOpacity
        onPress={() => setMenuVisible((v) => !v)}
        style={styles.menuButton}
        testID="chat-menu-button"
      >
        <MoreVertical size={22} color={Colors.headerText} />
      </TouchableOpacity>
    </View>
  );

  const renderMessage = ({ item }: { item: DisplayMessage }) => {
    if (item.isProductCard && productCard) {
      return <ProductMessageBubble product={productCard} timestamp={item.timestamp} />;
    }
    return <MessageBubble message={item} />;
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: headerTitle,
          headerRight: headerRight,
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.headerText,
        }}
      />
      {menuVisible && (
        <>
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          />
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={handleClearChat}
              testID="clear-chat-button"
            >
              <Trash2 size={18} color={Colors.danger} />
              <Text style={styles.dropdownItemText}>Sohbeti temizle</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        enabled={Platform.OS !== "web"}
      >
        <View style={styles.chatArea}>
          {isLoadingMessages && mergedMessages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={mergedMessages}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }}
            />
          )}
        </View>

        {isAdminChat ? (
          <View style={styles.adminInputDisabled}>
            <Text style={styles.adminInputDisabledText}>Bu sohbete mesaj gönderemezsiniz</Text>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.inputAction}>
              <Smile size={24} color={Colors.textLight} />
            </TouchableOpacity>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Mesaj yazın..."
                placeholderTextColor={Colors.textLight}
                value={messageText}
                onChangeText={handleTextChange}
                multiline
                maxLength={1000}
                testID="message-input"
              />
              <TouchableOpacity
                style={styles.attachButton}
                onPress={() => {
                  router.push({
                    pathname: "/store/[id]/form" as any,
                    params: {
                      id: storeId ?? id ?? "unknown",
                      productInfo: "",
                    },
                  });
                }}
                testID="send-address-form"
              >
                <MapPin size={20} color={Colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachButton}>
                <Paperclip size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            <Animated.View style={{ transform: [{ scale: sendScaleAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  messageText.trim() ? styles.sendButtonActive : {},
                ]}
                onPress={handleSend}
                disabled={!messageText.trim()}
                testID="send-button"
              >
                <Send size={20} color={Colors.white} />
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.chatBackground,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: -8,
  },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
  },
  headerName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.headerText,
    lineHeight: 17,
  },
  headerStatus: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 13,
  },
  headerTyping: {
    fontSize: 10,
    color: "#A5F5A5",
    lineHeight: 13,
    fontWeight: "500" as const,
  },
  chatArea: {
    flex: 1,
  },
  messagesList: {
    padding: 12,
    paddingBottom: 8,
    gap: 3,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 1,
    maxWidth: "85%",
  },
  sentRow: {
    alignSelf: "flex-end",
  },
  receivedRow: {
    alignSelf: "flex-start",
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 6,
    marginBottom: 2,
    backgroundColor: Colors.border,
  },
  bubbleContainer: {
    maxWidth: "100%",
    position: "relative",
    flexShrink: 1,
  },
  sentContainer: {
    alignSelf: "flex-end",
  },
  receivedContainer: {
    alignSelf: "flex-start",
  },
  bubble: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    minWidth: 80,
  },
  sentBubble: {
    backgroundColor: Colors.messageSent,
    borderTopRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: Colors.messageReceived,
    borderTopLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.06,
    shadowRadius: 1,
    elevation: 1,
  },
  sentTail: {
    position: "absolute",
    top: 0,
    right: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: Colors.messageSent,
    borderTopWidth: 8,
    borderTopColor: "transparent",
  },
  receivedTail: {
    position: "absolute",
    top: 0,
    left: -4,
    width: 0,
    height: 0,
    borderRightWidth: 8,
    borderRightColor: Colors.messageReceived,
    borderTopWidth: 8,
    borderTopColor: "transparent",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  sentText: {
    color: Colors.text,
  },
  receivedText: {
    color: Colors.text,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    marginTop: 2,
    paddingBottom: 2,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textLight,
  },
  sentTimestamp: {
    color: Colors.textSecondary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    gap: 6,
  },
  inputAction: {
    paddingBottom: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.white,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 42,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 4,
    maxHeight: 100,
    outlineWidth: 0,
    outlineStyle: 'none' as any,
    borderWidth: 0,
  },
  attachButton: {
    paddingLeft: 8,
    paddingBottom: 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.textLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonActive: {
    backgroundColor: Colors.accent,
  },
  productCardImage: {
    width: "100%",
    height: 160,
    backgroundColor: Colors.border,
  },
  productCardInfo: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  adminInputDisabled: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#F1F5F9",
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  adminInputDisabledText: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: "500" as const,
  },
  menuButton: {
    padding: 6,
  },
  menuOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  dropdownMenu: {
    position: "absolute" as const,
    top: 4,
    right: 12,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 4,
    minWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.danger,
    fontWeight: "500" as const,
  },
  productCardPrice: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#075e54",
    marginTop: 2,
  },
});
