#!/bin/bash

echo "========================================="
echo "  ButikBiz Firebase Deploy"
echo "========================================="
echo ""

# 1. Firebase CLI kontrolu
if ! command -v firebase &> /dev/null; then
  echo "Firebase CLI bulunamadi. Kuruluyor..."
  npm install -g firebase-tools
  echo ""
fi

# 2. Firebase giris
echo "1) Firebase hesabiniza giris yapin:"
firebase login
echo ""

# 3. Proje baglantisi
echo "2) Firebase projenizi baglayalim..."
firebase use butikbiz-66195
echo ""

# 4. Firestore kurallari deploy
echo "3) Firestore kurallari yukleniyor..."
firebase deploy --only firestore:rules
echo ""

# 5. Firestore indexleri deploy
echo "4) Firestore indexleri yukleniyor..."
firebase deploy --only firestore:indexes
echo ""

# 6. Storage kurallari deploy
echo "5) Storage kurallari yukleniyor..."
firebase deploy --only storage
echo ""

# 7. Web build (opsiyonel - hosting icin)
echo "6) Web build baslatiliyor..."
npx expo export -p web
echo ""

# 8. Hosting deploy
echo "7) Hosting yukleniyor..."
firebase deploy --only hosting
echo ""

echo "========================================="
echo "  Deploy tamamlandi!"
echo "========================================="
echo ""
echo "Firestore koleksiyonlari:"
echo "  - users/{uid}        : Kullanici profilleri"
echo "  - stores/{storeId}   : Magaza bilgileri"
echo "  - chats/{chatId}     : Sohbet verileri"
echo "  - chats/{chatId}/messages/{msgId} : Mesajlar"
echo "  - admin/data         : Admin verileri"
echo "  - admin/settings     : Admin ayarlari"
echo ""
echo "Storage klasorleri:"
echo "  - avatars/           : Profil resimleri"
echo "  - products/{storeId} : Urun gorselleri"
echo ""
echo "Web: https://butikbiz-66195.web.app"
echo "========================================="
