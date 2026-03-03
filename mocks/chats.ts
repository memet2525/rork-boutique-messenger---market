export interface Message {
  id: string;
  text: string;
  timestamp: string;
  isSent: boolean;
  isRead: boolean;
}

export interface Chat {
  id: string;
  storeName: string;
  storeAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  messages: Message[];
}

export const chats: Chat[] = [
  {
    id: "c1",
    storeName: "Bella Moda",
    storeAvatar: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop",
    lastMessage: "Elbise için kargo bugün çıkacak 📦",
    lastMessageTime: "14:32",
    unreadCount: 2,
    isOnline: true,
    messages: [
      { id: "m1", text: "Merhaba, yazlık elbise hala mevcut mu?", timestamp: "14:20", isSent: true, isRead: true },
      { id: "m2", text: "Merhaba! Evet, S ve M bedenleri mevcut 😊", timestamp: "14:22", isSent: false, isRead: true },
      { id: "m3", text: "M beden alayım, nasıl ödeme yapabilirim?", timestamp: "14:25", isSent: true, isRead: true },
      { id: "m4", text: "Havale veya EFT ile ödeme yapabilirsiniz. IBAN bilgisi göndereceğim.", timestamp: "14:28", isSent: false, isRead: true },
      { id: "m5", text: "TR12 3456 7890 1234 5678 9012 34", timestamp: "14:29", isSent: false, isRead: true },
      { id: "m6", text: "Tamam, hemen gönderiyorum!", timestamp: "14:30", isSent: true, isRead: true },
      { id: "m7", text: "Elbise için kargo bugün çıkacak 📦", timestamp: "14:32", isSent: false, isRead: false },
    ],
  },
  {
    id: "c2",
    storeName: "Tech Corner",
    storeAvatar: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200&h=200&fit=crop",
    lastMessage: "Kulaklık için garanti 2 yıldır",
    lastMessageTime: "12:15",
    unreadCount: 0,
    isOnline: true,
    messages: [
      { id: "m8", text: "Kablosuz kulaklığın garanti süresi ne kadar?", timestamp: "12:10", isSent: true, isRead: true },
      { id: "m9", text: "Kulaklık için garanti 2 yıldır", timestamp: "12:15", isSent: false, isRead: true },
    ],
  },
  {
    id: "c3",
    storeName: "Doğal Lezzetler",
    storeAvatar: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=200&h=200&fit=crop",
    lastMessage: "Teşekkür ederiz, afiyet olsun! 🍯",
    lastMessageTime: "Dün",
    unreadCount: 0,
    isOnline: false,
    messages: [
      { id: "m10", text: "Balınız gerçekten harika, tekrar sipariş vermek istiyorum", timestamp: "Dün 10:30", isSent: true, isRead: true },
      { id: "m11", text: "Teşekkür ederiz, afiyet olsun! 🍯", timestamp: "Dün 10:45", isSent: false, isRead: true },
    ],
  },
  {
    id: "c4",
    storeName: "Ev & Dekor",
    storeAvatar: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop",
    lastMessage: "Vazo kırılmadan ulaştı, çok güzel!",
    lastMessageTime: "Pzt",
    unreadCount: 0,
    isOnline: true,
    messages: [
      { id: "m12", text: "Sipariş ne zaman kargoya verilir?", timestamp: "Pzt 09:00", isSent: true, isRead: true },
      { id: "m13", text: "Bugün kargoya vereceğiz!", timestamp: "Pzt 09:30", isSent: false, isRead: true },
      { id: "m14", text: "Vazo kırılmadan ulaştı, çok güzel!", timestamp: "Pzt 18:00", isSent: true, isRead: true },
    ],
  },
];
