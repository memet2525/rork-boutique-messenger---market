import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
  Animated,
  Pressable,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import {
  Store,
  Package,
  FileText,
  Check,
  Plus,
  Trash2,
  Eye,
  Link2,
  ChevronRight,
  Box,
  TrendingUp,
  Edit3,
  AlertCircle,
  ShoppingBag,
  MapPin,
  ClipboardList,
  Phone,
  Clock,
  Crown,
  X,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { useUser, StoreProduct } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";
import { useAdmin, DEFAULT_SELLER_AGREEMENT } from "@/contexts/AdminContext";
import { getStoreLink, getAddressFormLink } from "@/utils/links";

const CITIES = [
  "Adana", "Adiyaman", "Afyonkarahisar", "Agri", "Amasya", "Ankara", "Antalya",
  "Artvin", "Aydin", "Balikesir", "Bilecik", "Bingol", "Bitlis", "Bolu",
  "Burdur", "Bursa", "Canakkale", "Cankiri", "Corum", "Denizli", "Diyarbakir",
  "Edirne", "Elazig", "Erzincan", "Erzurum", "Eskisehir", "Gaziantep", "Giresun",
  "Gumushane", "Hakkari", "Hatay", "Isparta", "Mersin", "Istanbul", "Izmir",
  "Kars", "Kastamonu", "Kayseri", "Kirklareli", "Kirsehir", "Kocaeli", "Konya",
  "Kutahya", "Malatya", "Manisa", "Kahramanmaras", "Mardin", "Mugla", "Mus",
  "Nevsehir", "Nigde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop",
  "Sivas", "Tekirdag", "Tokat", "Trabzon", "Tunceli", "Sanliurfa", "Usak",
  "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kirikkale",
  "Batman", "Sirnak", "Bartin", "Ardahan", "Igdir", "Yalova", "Karabuk",
  "Kilis", "Osmaniye", "Duzce",
];

const CATEGORIES = ["Moda", "Teknoloji", "Gida", "Dekorasyon", "Spor", "Kozmetik", "Aksesuar", "Diger"];



function ProductManageCard({
  product,
  onDelete,
  onUpdateStock,
}: {
  product: StoreProduct;
  onDelete: () => void;
  onUpdateStock: (stock: number) => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { showAlert } = useAlert();
  const isLowStock = product.stock <= 3 && product.stock > 0;
  const isOutOfStock = product.stock === 0;

  const handleDelete = useCallback(() => {
    showAlert("Urunu Sil", `"${product.name}" urununu silmek istediginize emin misiniz?`, [
      { text: "Iptal", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: onDelete },
    ]);
  }, [product.name, onDelete, showAlert]);

  const handleStockChange = useCallback(() => {
    if (Alert.prompt) {
      Alert.prompt("Stok Guncelle", `${product.name} icin yeni stok adedi:`, [
        { text: "Iptal", style: "cancel" },
        {
          text: "Guncelle",
          onPress: (val?: string) => {
            const num = parseInt(val || "0", 10);
            if (!isNaN(num) && num >= 0) onUpdateStock(num);
          },
        },
      ], "plain-text", String(product.stock));
      return;
    }

    const newStock = product.stock > 0 ? product.stock + 5 : 10;
    onUpdateStock(newStock);
  }, [product.name, product.stock, onUpdateStock]);

  return (
    <Animated.View style={[styles.productManageCard, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
        style={styles.productManageInner}
      >
        <Image source={{ uri: product.image }} style={styles.productManageImage} />
        <View style={styles.productManageInfo}>
          <Text style={styles.productManageName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.productManagePrice}>{product.price}</Text>
          <View style={styles.stockRow}>
            {isOutOfStock ? (
              <View style={styles.stockBadgeOut}>
                <AlertCircle size={11} color={Colors.danger} />
                <Text style={styles.stockTextOut}>Stokta yok</Text>
              </View>
            ) : isLowStock ? (
              <View style={styles.stockBadgeLow}>
                <AlertCircle size={11} color="#e67e22" />
                <Text style={styles.stockTextLow}>Az stok: {product.stock}</Text>
              </View>
            ) : (
              <View style={styles.stockBadgeOk}>
                <Box size={11} color={Colors.accent} />
                <Text style={styles.stockTextOk}>Stok: {product.stock}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.productManageActions}>
          <TouchableOpacity style={styles.actionIconBtn} onPress={handleStockChange} testID={`stock-${product.id}`}>
            <Edit3 size={16} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIconBtnDanger} onPress={handleDelete} testID={`delete-${product.id}`}>
            <Trash2 size={16} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function StoreOpenForm() {
  const { profile, updateProfile } = useUser();
  const { showAlert } = useAlert();
  const { settings: adminSettings } = useAdmin();
  const agreementText = adminSettings?.sellerAgreement || DEFAULT_SELLER_AGREEMENT;
  const [storeName, setStoreName] = useState<string>(profile.storeName);
  const [storeDescription, setStoreDescription] = useState<string>("");
  const [storeCategory, setStoreCategory] = useState<string>("");
  const [storePhone, setStorePhone] = useState<string>("");
  const [storeCity, setStoreCity] = useState<string>("");
  const [agreed, setAgreed] = useState<boolean>(false);
  const [showAgreement, setShowAgreement] = useState<boolean>(false);
  const [showCityPicker, setShowCityPicker] = useState<boolean>(false);
  const [citySearch, setCitySearch] = useState<string>("");

  const filteredCities = CITIES.filter((c) =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  const canSubmit = storeName.trim().length >= 3 && storeCategory && storePhone.trim().length >= 10 && storeCity && agreed;

  const formatPhone = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    if (cleaned.length <= 4) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)}`;
  }, []);

  const handlePhoneChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    if (cleaned.length <= 11) {
      setStorePhone(formatPhone(cleaned));
    }
  }, [formatPhone]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (!agreed) {
      showAlert("Sozlesme Gerekli", "Magaza acmak icin satici sozlesmesini okuyup onaylamaniz gerekmektedir.");
      return;
    }

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 14);

    try {
      await updateProfile({
        isStore: true,
        storeName: storeName.trim(),
        storeDescription: storeDescription.trim(),
        storeCategory,
        storePhone: storePhone.trim(),
        storeCity,
        storeNameChangeCount: 0,
        subscriptionPlan: "trial",
        subscriptionStatus: "active",
        trialStartDate: now.toISOString(),
        trialEndDate: trialEnd.toISOString(),
      });

      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      showAlert("Basarili!", `Magazaniz olusturuldu. 14 gunluk ucretsiz deneme sureciniz basladi.\n\nDeneme bitis: ${trialEnd.toLocaleDateString("tr-TR")}`, [
        { text: "Tamam" },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Store open error:", errorMessage, error);
      showAlert("Hata", `Magaza acilirken bir sorun olustu: ${errorMessage.substring(0, 140)}`);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.heroSection}>
        <View style={styles.heroIcon}>
          <Store size={36} color={Colors.primary} />
        </View>
        <Text style={styles.heroTitle}>Magazanizi Acin</Text>
        <Text style={styles.heroSubtitle}>
          ButikBiz{"'"}de urunlerinizi binlerce musteriye ulastirin. 14 gun ucretsiz deneyin!
        </Text>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.fieldLabel}>Magaza Adi *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Orn: Bella Moda"
          placeholderTextColor={Colors.textLight}
          value={storeName}
          onChangeText={setStoreName}
          maxLength={40}
          testID="store-name-input"
        />
        {storeName.length > 0 && storeName.length < 3 && (
          <Text style={styles.errorText}>En az 3 karakter olmalidir</Text>
        )}

        <Text style={styles.fieldLabel}>Telefon Numarasi *</Text>
        <View style={styles.phoneInputWrapper}>
          <Phone size={18} color={Colors.textLight} />
          <TextInput
            style={styles.phoneInput}
            placeholder="0532 123 45 67"
            placeholderTextColor={Colors.textLight}
            value={storePhone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={15}
            testID="store-phone-input"
          />
        </View>

        <Text style={styles.fieldLabel}>Sehir *</Text>
        <TouchableOpacity
          style={styles.cityPicker}
          onPress={() => setShowCityPicker(true)}
          testID="city-picker"
        >
          <MapPin size={18} color={storeCity ? Colors.primary : Colors.textLight} />
          <Text style={[styles.cityPickerText, !storeCity && styles.cityPickerPlaceholder]}>
            {storeCity || "Sehir secin"}
          </Text>
          <ChevronRight size={18} color={Colors.textLight} />
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>Magaza Aciklamasi</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Magazanizi tanitin..."
          placeholderTextColor={Colors.textLight}
          value={storeDescription}
          onChangeText={setStoreDescription}
          multiline
          numberOfLines={4}
          maxLength={200}
          testID="store-description-input"
        />

        <Text style={styles.fieldLabel}>Kategori *</Text>
        <View style={styles.categoriesRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, storeCategory === cat && styles.categoryChipActive]}
              onPress={() => setStoreCategory(cat)}
            >
              <Text style={[styles.categoryChipText, storeCategory === cat && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.trialInfoCard}>
          <Crown size={20} color="#F59E0B" />
          <View style={styles.trialInfoContent}>
            <Text style={styles.trialInfoTitle}>14 Gun Ucretsiz Deneme</Text>
            <Text style={styles.trialInfoText}>
              Magaza actiktan sonra 14 gun boyunca tum ozellikleri ucretsiz kullanabilirsiniz.
              Sonrasinda aylik 199 TL veya yillik 1.999 TL abonelik secmeniz gerekecektir.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.readAgreementBtn}
          onPress={() => setShowAgreement(true)}
          testID="read-agreement"
        >
          <FileText size={18} color={Colors.primary} />
          <Text style={styles.readAgreementText}>Satici Sozlesmesini Oku</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.agreementRow} onPress={() => {
          if (!agreed) {
            showAlert("Sozlesme", "Lutfen once satici sozlesmesini okuyun.", [
              { text: "Oku", onPress: () => setShowAgreement(true) },
              { text: "Zaten Okudum", onPress: () => setAgreed(true) },
            ]);
          } else {
            setAgreed(false);
          }
        }}>
          <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
            {agreed && <Check size={14} color={Colors.white} />}
          </View>
          <Text style={styles.agreementText}>Satici sozlesmesini okudum ve kabul ediyorum</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          testID="submit-store"
        >
          <Store size={20} color={Colors.white} />
          <Text style={styles.submitButtonText}>Magazayi Ac</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showAgreement} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Satici Sozlesmesi</Text>
              <TouchableOpacity onPress={() => setShowAgreement(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.agreementFullText}>{agreementText}</Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalAcceptBtn}
              onPress={() => {
                setAgreed(true);
                setShowAgreement(false);
              }}
            >
              <Check size={18} color={Colors.white} />
              <Text style={styles.modalAcceptText}>Okudum, Kabul Ediyorum</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCityPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sehir Secin</Text>
              <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.citySearchWrapper}>
              <TextInput
                style={styles.citySearchInput}
                placeholder="Sehir ara..."
                placeholderTextColor={Colors.textLight}
                value={citySearch}
                onChangeText={setCitySearch}
              />
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {filteredCities.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[styles.cityItem, storeCity === city && styles.cityItemActive]}
                  onPress={() => {
                    setStoreCity(city);
                    setShowCityPicker(false);
                    setCitySearch("");
                  }}
                >
                  <Text style={[styles.cityItemText, storeCity === city && styles.cityItemTextActive]}>
                    {city}
                  </Text>
                  {storeCity === city && <Check size={18} color={Colors.accent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StoreDashboard() {
  const router = useRouter();
  const { profile, updateProfile, deleteStoreProduct, updateStoreProduct, canChangeStoreName, changeStoreName, isSubscriptionActive, isTrialExpired, getTrialDaysLeft } = useUser();
  const { showAlert } = useAlert();
  const products = profile.storeProducts ?? [];
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock <= 3).length;

  const trialDays = getTrialDaysLeft();
  const subActive = isSubscriptionActive();
  const trialExpired = isTrialExpired();

  const handleShareLink = useCallback(async () => {
    try {
      const storeUrl = getStoreLink(profile.storeName);
      await Share.share({
        message: `${profile.storeName} magazasina goz atin!\n${storeUrl}`,
        title: profile.storeName,
      });
    } catch (e) {
      console.log("Share error:", e);
    }
  }, [profile.storeName]);

  const handlePreview = useCallback(() => {
    router.push({ pathname: "/store/[id]" as any, params: { id: "my-store", preview: "true" } });
  }, [router]);

  const handleCloseStore = useCallback(() => {
    showAlert("Magazayi Kapat", "Magazanizi kapatmak istediginize emin misiniz? Tum urunleriniz silinecektir.", [
      { text: "Iptal", style: "cancel" },
      {
        text: "Kapat",
        style: "destructive",
        onPress: () => {
          void updateProfile({
            isStore: false,
            storeName: "",
            storeProducts: [],
            storeDescription: "",
            storeCategory: "",
            storePhone: "",
            storeCity: "",
            subscriptionPlan: "none",
            subscriptionStatus: "expired",
          });
          router.back();
        },
      },
    ]);
  }, [updateProfile, router, showAlert]);

  const handleChangeStoreName = useCallback(() => {
    if (!canChangeStoreName()) {
      showAlert("Degisiklik Engellendi", "Magaza adi yalnizca 1 kez degistirilebilir. Daha once degisiklik yaptiniz.");
      return;
    }

    if (Alert.prompt) {
      Alert.prompt("Magaza Adi Degistir", "Yeni magaza adinizi girin (Bu islem sadece 1 kez yapilabilir!):", [
        { text: "Iptal", style: "cancel" },
        {
          text: "Degistir",
          onPress: (val?: string) => {
            if (val && val.trim().length >= 3) {
              const success = changeStoreName(val.trim());
              if (success) {
                showAlert("Basarili", "Magaza adiniz degistirildi. Bu islem bir daha yapilamaz.");
              }
            }
          },
        },
      ], "plain-text", profile.storeName);
      return;
    }

    showAlert("Bilgi", "Magaza adi degistirme islemi bu cihazda desteklenmiyor.");
  }, [canChangeStoreName, changeStoreName, profile.storeName, showAlert]);

  const handleDeleteProduct = useCallback(
    (productId: string) => {
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      deleteStoreProduct(productId);
    },
    [deleteStoreProduct]
  );

  const handleUpdateStock = useCallback(
    (productId: string, stock: number) => {
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      updateStoreProduct(productId, { stock });
    },
    [updateStoreProduct]
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.dashboardHeader}>
        <View style={styles.storeActiveIcon}>
          <Check size={28} color={Colors.white} />
        </View>
        <Text style={styles.dashboardTitle}>Magazaniz Aktif</Text>
        <Text style={styles.dashboardSubtitle}>{profile.storeName}</Text>
        {profile.storeCity && (
          <View style={styles.locationRow}>
            <MapPin size={14} color={Colors.textSecondary} />
            <Text style={styles.locationText}>{profile.storeCity}</Text>
          </View>
        )}
      </View>

      {profile.subscriptionPlan === "trial" && !trialExpired && (
        <View style={styles.trialBanner}>
          <Clock size={18} color="#F59E0B" />
          <View style={styles.trialBannerContent}>
            <Text style={styles.trialBannerTitle}>Deneme Suresi: {trialDays} gun kaldi</Text>
            <Text style={styles.trialBannerText}>
              Deneme suresi sonunda abonelik secmeniz gerekecektir.
            </Text>
          </View>
        </View>
      )}

      {trialExpired && profile.subscriptionPlan === "trial" && (
        <View style={styles.expiredBanner}>
          <AlertCircle size={18} color={Colors.danger} />
          <View style={styles.trialBannerContent}>
            <Text style={styles.expiredBannerTitle}>Deneme Suresi Doldu!</Text>
            <Text style={styles.expiredBannerText}>
              Magazanizi aktif tutmak icin abonelik secmeniz gerekiyor.
              Aylik: 199 TL | Yillik: 1.999 TL
            </Text>
          </View>
        </View>
      )}

      {(profile.subscriptionPlan === "monthly" || profile.subscriptionPlan === "yearly") && (
        <View style={styles.subscriptionBanner}>
          <Crown size={18} color="#22C55E" />
          <View style={styles.trialBannerContent}>
            <Text style={styles.subscriptionBannerTitle}>
              {profile.subscriptionPlan === "monthly" ? "Aylik" : "Yillik"} Abonelik - {subActive ? "Aktif" : "Suresi Dolmus"}
            </Text>
            {profile.subscriptionEndDate && (
              <Text style={styles.subscriptionBannerText}>
                Bitis: {new Date(profile.subscriptionEndDate).toLocaleDateString("tr-TR")}
              </Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.primary + "15" }]}>
            <Package size={20} color={Colors.primary} />
          </View>
          <Text style={styles.statValue}>{products.length}</Text>
          <Text style={styles.statLabel}>Urun</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.accent + "15" }]}>
            <Box size={20} color={Colors.accent} />
          </View>
          <Text style={styles.statValue}>{totalStock}</Text>
          <Text style={styles.statLabel}>Toplam Stok</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: lowStockCount > 0 ? "#fff3e0" : Colors.accent + "15" }]}>
            <TrendingUp size={20} color={lowStockCount > 0 ? "#e67e22" : Colors.accent} />
          </View>
          <Text style={[styles.statValue, lowStockCount > 0 && { color: "#e67e22" }]}>{lowStockCount}</Text>
          <Text style={styles.statLabel}>Az Stok</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => router.push("/add-product" as any)}
          testID="add-product-btn"
        >
          <View style={[styles.quickActionIcon, { backgroundColor: Colors.accent }]}>
            <Plus size={20} color={Colors.white} />
          </View>
          <Text style={styles.quickActionLabel}>Urun Ekle</Text>
          <ChevronRight size={18} color={Colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionBtn} onPress={handlePreview} testID="preview-store-btn">
          <View style={[styles.quickActionIcon, { backgroundColor: Colors.primary }]}>
            <Eye size={20} color={Colors.white} />
          </View>
          <Text style={styles.quickActionLabel}>Magazayi On Izle</Text>
          <ChevronRight size={18} color={Colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionBtn} onPress={handleShareLink} testID="share-link-btn">
          <View style={[styles.quickActionIcon, { backgroundColor: "#3b82f6" }]}>
            <Link2 size={20} color={Colors.white} />
          </View>
          <Text style={styles.quickActionLabel}>Magaza Linkini Paylas</Text>
          <ChevronRight size={18} color={Colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={async () => {
            const formUrl = getAddressFormLink(profile.storeName);
            try {
              await Share.share({
                message: `${profile.storeName} - Teslimat Adres Formu\n\nSiparisiz icin teslimat adresinizi asagidaki linkten doldurun:\n${formUrl}`,
                title: `${profile.storeName} - Adres Formu`,
              });
            } catch (e) {
              console.log("Share error:", e);
            }
          }}
          testID="send-address-form-btn"
        >
          <View style={[styles.quickActionIcon, { backgroundColor: "#f59e0b" }]}>
            <MapPin size={20} color={Colors.white} />
          </View>
          <Text style={styles.quickActionLabel}>Adres Formu Gonder</Text>
          <ChevronRight size={18} color={Colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => router.push("/address-list" as any)}
          testID="view-addresses-btn"
        >
          <View style={[styles.quickActionIcon, { backgroundColor: "#8b5cf6" }]}>
            <ClipboardList size={20} color={Colors.white} />
          </View>
          <Text style={styles.quickActionLabel}>Gelen Adresler</Text>
          <ChevronRight size={18} color={Colors.textLight} />
        </TouchableOpacity>

        {canChangeStoreName() && (
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={handleChangeStoreName}
            testID="change-store-name-btn"
          >
            <View style={[styles.quickActionIcon, { backgroundColor: "#ec4899" }]}>
              <Edit3 size={20} color={Colors.white} />
            </View>
            <Text style={styles.quickActionLabel}>Magaza Adini Degistir (1 Hak)</Text>
            <ChevronRight size={18} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.productsManageSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Urunlerim ({products.length})</Text>
          {products.length > 0 && (
            <TouchableOpacity onPress={() => router.push("/add-product" as any)}>
              <Plus size={22} color={Colors.accent} />
            </TouchableOpacity>
          )}
        </View>

        {products.length === 0 ? (
          <View style={styles.emptyProducts}>
            <View style={styles.emptyIcon}>
              <ShoppingBag size={40} color={Colors.textLight} />
            </View>
            <Text style={styles.emptyTitle}>Henuz urun eklemediniz</Text>
            <Text style={styles.emptySubtitle}>Ilk urununuzu ekleyerek satisa baslayin</Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => router.push("/add-product" as any)}
            >
              <Plus size={18} color={Colors.white} />
              <Text style={styles.emptyAddText}>Ilk Urunu Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          products.map((product) => (
            <ProductManageCard
              key={product.id}
              product={product}
              onDelete={() => handleDeleteProduct(product.id)}
              onUpdateStock={(stock) => handleUpdateStock(product.id, stock)}
            />
          ))
        )}
      </View>

      <TouchableOpacity style={styles.closeStoreButton} onPress={handleCloseStore} testID="close-store-btn">
        <Text style={styles.closeStoreText}>Magazayi Kapat</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

export default function OpenStoreScreen() {
  const { profile } = useUser();

  return (
    <>
      <Stack.Screen
        options={{
          title: profile.isStore ? "Magazam" : "Magaza Ac",
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.headerText,
          headerTitleStyle: { fontWeight: "700" as const },
        }}
      />
      {profile.isStore ? <StoreDashboard /> : <StoreOpenForm />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroSection: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 32,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  formSection: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: "none" as any,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 4,
  },
  phoneInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    outlineWidth: 0,
    outlineStyle: "none" as any,
    borderWidth: 0,
  },
  cityPicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  cityPickerText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  cityPickerPlaceholder: {
    color: Colors.textLight,
  },
  categoriesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.white,
  },
  trialInfoCard: {
    flexDirection: "row",
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  trialInfoContent: {
    flex: 1,
  },
  trialInfoTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#92400E",
    marginBottom: 4,
  },
  trialInfoText: {
    fontSize: 12,
    color: "#A16207",
    lineHeight: 18,
  },
  readAgreementBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary + "10",
    borderRadius: 12,
  },
  readAgreementText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  agreementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  agreementText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  agreementFullText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  modalAcceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    marginHorizontal: 20,
    borderRadius: 14,
    paddingVertical: 14,
  },
  modalAcceptText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  citySearchWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  citySearchInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    outlineWidth: 0,
    outlineStyle: "none" as any,
    borderWidth: 0,
  },
  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  cityItemActive: {
    backgroundColor: Colors.accent + "10",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  cityItemText: {
    fontSize: 15,
    color: Colors.text,
  },
  cityItemTextActive: {
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  dashboardHeader: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  storeActiveIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  trialBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  trialBannerContent: {
    flex: 1,
  },
  trialBannerTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#92400E",
  },
  trialBannerText: {
    fontSize: 12,
    color: "#A16207",
    marginTop: 2,
  },
  expiredBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  expiredBannerTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#991B1B",
  },
  expiredBannerText: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 2,
  },
  subscriptionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  subscriptionBannerTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#166534",
  },
  subscriptionBannerText: {
    fontSize: 12,
    color: "#15803D",
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  quickActions: {
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  quickActionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  productsManageSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  emptyProducts: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyAddText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  productManageCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    overflow: "hidden",
  },
  productManageInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  productManageImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: Colors.border,
  },
  productManageInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productManageName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  productManagePrice: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.primary,
    marginTop: 2,
  },
  stockRow: {
    marginTop: 4,
  },
  stockBadgeOk: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accent + "15",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  stockTextOk: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.accent,
  },
  stockBadgeLow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff3e0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  stockTextLow: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#e67e22",
  },
  stockBadgeOut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.danger + "15",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  stockTextOut: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.danger,
  },
  productManageActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconBtnDanger: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.danger + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  closeStoreButton: {
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    alignItems: "center",
  },
  closeStoreText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.danger,
  },
});
