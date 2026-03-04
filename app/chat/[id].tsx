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
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Send, Check, CheckCheck, Paperclip, Smile, MapPin } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { stores } from "@/mocks/stores";
import { useUser } from "@/contexts/UserContext";
import {
  getChatMessages,
  sendChatMessage,
  getOrCreateChat,
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
        styles.bubbleContainer,
        message.isSent ? styles.sentContainer : styles.receivedContainer,
        { opacity: fadeAnim },
      ]}
    >
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
              <CheckCheck size={14} color={Colors.accent} />
            ) : (
              <Check size={14} color="rgba(255,255,255,0.6)" />
            )
          )}
        </View>
      </View>
      <View style={message.isSent ? styles.sentTail : styles.receivedTail} />
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
          <Check size={14} color="rgba(255,255,255,0.6)" />
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
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, uid } = useUser();
  const [messageText, setMessageText] = useState<string>("");
  const [localMessages, setLocalMessages] = useState<DisplayMessage[]>([]);
  const [productCard, setProductCard] = useState<ProductCard | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const sendScaleAnim = useRef(new Animated.Value(1)).current;
  const hasInjectedProduct = useRef(false);
  const chatInitialized = useRef(false);
  const prevMessageCountRef = useRef<number>(0);

  const isAdminChat = storeId === BUTIKBIZ_ADMIN_ID || id?.startsWith("admin_");
  const resolvedStoreName = isAdminChat ? BUTIKBIZ_NAME : (storeName ?? "Mağaza");
  const resolvedStoreAvatar = isAdminChat ? BUTIKBIZ_AVATAR : (storeAvatar ?? "");
  const resolvedIsOnline = isOnline === "true";

  const messagesQuery = useQuery({
    queryKey: ["chatMessages", id],
    queryFn: () => getChatMessages(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (messagesQuery.data && uid) {
      const display: DisplayMessage[] = messagesQuery.data.map((msg: FirestoreMessage) => ({
        id: msg.id,
        text: msg.text,
        timestamp: msg.timestamp,
        isSent: msg.senderId === uid,
        isRead: msg.isRead,
        isProductCard: msg.text.includes("Bu ürün hakkında bilgi almak istiyorum") && msg.senderId === uid,
      }));

      const prevCount = prevMessageCountRef.current;
      if (prevCount > 0 && display.length > prevCount) {
        const newMessages = display.slice(prevCount);
        const hasIncomingMessage = newMessages.some((msg) => !msg.isSent);
        if (hasIncomingMessage) {
          playNotificationSound();
          console.log("New incoming message detected, playing sound");
        }
      }
      prevMessageCountRef.current = display.length;

      setLocalMessages(display);
      console.log("Messages synced from Firestore:", display.length);
    }
  }, [messagesQuery.data, uid]);

  useEffect(() => {
    if (
      id &&
      uid &&
      storeId &&
      storeName &&
      !chatInitialized.current
    ) {
      chatInitialized.current = true;
      const storeData = stores.find((s) => s.id === storeId);
      const resolvedOwnerId = storeOwnerIdParam || storeId || "unknown";
      console.log("Chat init with storeOwnerId:", resolvedOwnerId, "storeId:", storeId);

      getOrCreateChat({
        chatId: id,
        userId: uid,
        storeId: storeId,
        storeName: storeName ?? "Mağaza",
        storeAvatar: storeAvatar ?? storeData?.avatar ?? "",
        storeOwnerId: resolvedOwnerId,
        customerName: profile.name || profile.firstName || "Müşteri",
        customerAvatar: profile.avatar,
      }).then(() => {
        console.log("Chat initialized:", id);
      }).catch((err) => {
        console.log("Chat init error:", err);
      });
    }
  }, [id, uid, storeId, storeName, storeAvatar, storeOwnerIdParam, profile]);

  const { mutate: sendMessageMutate } = useMutation({
    mutationFn: async (text: string) => {
      if (!id || !uid) throw new Error("Missing chat or user id");
      return sendChatMessage(id, { text, senderId: uid });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatMessages", id] });
      queryClient.invalidateQueries({ queryKey: ["userChats"] });
    },
  });

  useEffect(() => {
    if (productMessage && productName && productPrice && !hasInjectedProduct.current && uid && id) {
      hasInjectedProduct.current = true;

      if (productImage && productName && productPrice) {
        setProductCard({ image: productImage, name: productName, price: productPrice });
      }

      sendMessageMutate(productMessage);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [productMessage, productImage, productName, productPrice, uid, id, sendMessageMutate]);

  const handleSend = useCallback(() => {
    if (!messageText.trim()) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.sequence([
      Animated.timing(sendScaleAnim, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.timing(sendScaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    const text = messageText.trim();
    const now = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

    const optimisticMsg: DisplayMessage = {
      id: `opt-${Date.now()}`,
      text,
      timestamp: now,
      isSent: true,
      isRead: false,
    };
    setLocalMessages((prev) => [...prev, optimisticMsg]);
    setMessageText("");

    sendMessageMutate(text);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messageText, sendScaleAnim, sendMessageMutate]);

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
        <Text style={styles.headerStatus}>
          {resolvedIsOnline ? "çevrimiçi" : "son görülme bugün"}
        </Text>
      </View>
    </TouchableOpacity>
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
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.headerText,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        enabled={Platform.OS !== "web"}
      >
        <View style={styles.chatArea}>
          {messagesQuery.isLoading && localMessages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={localMessages}
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
                onChangeText={setMessageText}
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
  chatArea: {
    flex: 1,
  },
  messagesList: {
    padding: 12,
    paddingBottom: 8,
    gap: 3,
  },
  bubbleContainer: {
    maxWidth: "80%",
    marginVertical: 1,
    position: "relative",
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
  productCardPrice: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#075e54",
    marginTop: 2,
  },
});
