import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import {
  Store,
  Users,
  Calendar,
  CalendarDays,
  ToggleLeft,
  ToggleRight,
  ShoppingBag,
  Phone,
  TrendingUp,
  Clock,
  Send,
  Settings,
  Key,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  MapPin,
  FileText,
  RotateCcw,
  Mail,
  UserCheck,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { useAdmin, StoreMember, CustomerMember, PlanType, DEFAULT_SELLER_AGREEMENT, DEFAULT_USER_AGREEMENT } from "@/contexts/AdminContext";

type TabType = "stores" | "customers" | "settings" | "messages";
import { useAlert } from "@/contexts/AlertContext";

function StoreCard({
  store,
  onToggleStatus,
  onUpdatePlan,
  onVerifyPayment,
}: {
  store: StoreMember;
  onToggleStatus: () => void;
  onUpdatePlan: (plan: PlanType) => void;
  onVerifyPayment: () => void;
}) {
  const isActive = store.status === "active";
  const isMonthly = store.planType === "monthly";
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { showAlert } = useAlert();

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim]);

  const handleToggle = useCallback(() => {
    handlePress();
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    showAlert(
      isActive ? "Magazayi Pasif Yap" : "Magazayi Aktif Yap",
      `${store.name} magazasini ${isActive ? "pasif" : "aktif"} hale getirmek istediginize emin misiniz?`,
      [
        { text: "Iptal", style: "cancel" },
        { text: "Evet", onPress: onToggleStatus },
      ]
    );
  }, [isActive, store.name, onToggleStatus, handlePress, showAlert]);

  const handlePlanChange = useCallback(
    (plan: PlanType) => {
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const planLabel = plan === "monthly" ? "Aylik (199 TL)" : "Yillik (1.999 TL)";
      showAlert(
        `${planLabel} Aktif Et`,
        `${store.name} icin ${planLabel.toLowerCase()} plan aktif edilsin mi?`,
        [
          { text: "Iptal", style: "cancel" },
          { text: "Aktif Et", onPress: () => onUpdatePlan(plan) },
        ]
      );
    },
    [store.name, onUpdatePlan, showAlert]
  );

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.cardHeader}>
        <Image source={{ uri: store.avatar }} style={styles.cardAvatar} />
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.cardName}>{store.name}</Text>
          <View style={styles.cardMetaRow}>
            <Text style={styles.cardCategory}>{store.category}</Text>
            <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusPassive]}>
              <View style={[styles.statusDot, { backgroundColor: isActive ? "#22C55E" : "#EF4444" }]} />
              <Text style={[styles.statusText, { color: isActive ? "#15803D" : "#B91C1C" }]}>
                {isActive ? "Aktif" : "Pasif"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Users size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{store.ownerName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Phone size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{store.phone}</Text>
        </View>
        {store.email ? (
          <View style={styles.detailRow}>
            <Mail size={14} color={Colors.textSecondary} />
            <Text style={styles.detailText}>{store.email}</Text>
          </View>
        ) : null}
        {store.city && store.city !== "-" ? (
          <View style={styles.detailRow}>
            <MapPin size={14} color={Colors.textSecondary} />
            <Text style={styles.detailText}>{store.city}</Text>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <Clock size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>Kayit: {store.createdAt}</Text>
        </View>
      </View>

      {!store.paymentVerified && isActive && (
        <View style={styles.paymentWarning}>
          <AlertTriangle size={16} color="#DC2626" />
          <Text style={styles.paymentWarningText}>Odeme dogrulanmadi!</Text>
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={() => {
              showAlert("Odeme Dogrula", `${store.name} icin odeme dogrulansin mi?`, [
                { text: "Iptal", style: "cancel" },
                { text: "Dogrula", onPress: onVerifyPayment },
              ]);
            }}
          >
            <CheckCircle size={14} color="#FFFFFF" />
            <Text style={styles.verifyBtnText}>Dogrula</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.planSection}>
        <Text style={styles.planTitle}>Uyelik Plani</Text>
        <View style={styles.planButtons}>
          <TouchableOpacity
            style={[
              styles.planButton,
              isMonthly && isActive && styles.planButtonActiveMonthly,
            ]}
            onPress={() => handlePlanChange("monthly")}
            testID={`plan-monthly-${store.id}`}
          >
            <Calendar size={16} color={isMonthly && isActive ? "#FFFFFF" : "#F59E0B"} />
            <View>
              <Text style={[styles.planButtonText, isMonthly && isActive && styles.planButtonTextActive]}>
                Aylik Aktif Et
              </Text>
              <Text style={[styles.planPriceText, isMonthly && isActive && styles.planButtonTextActive]}>
                199 TL/ay
              </Text>
            </View>
            {isMonthly && isActive && <View style={styles.planActiveDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planButton,
              !isMonthly && isActive && styles.planButtonActiveYearly,
            ]}
            onPress={() => handlePlanChange("yearly")}
            testID={`plan-yearly-${store.id}`}
          >
            <CalendarDays size={16} color={!isMonthly && isActive ? "#FFFFFF" : "#6366F1"} />
            <View>
              <Text style={[styles.planButtonText, !isMonthly && isActive && styles.planButtonTextActive]}>
                Yillik Aktif Et
              </Text>
              <Text style={[styles.planPriceText, !isMonthly && isActive && styles.planButtonTextActive]}>
                1.999 TL/yil
              </Text>
            </View>
            {!isMonthly && isActive && <View style={styles.planActiveDot} />}
          </TouchableOpacity>
        </View>
        {isActive && (
          <Text style={styles.planDateText}>
            {store.planStartDate} → {store.planEndDate}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.toggleButton, isActive ? styles.toggleActive : styles.togglePassive]}
        onPress={handleToggle}
        testID={`toggle-store-${store.id}`}
      >
        {isActive ? (
          <ToggleRight size={20} color="#15803D" />
        ) : (
          <ToggleLeft size={20} color="#B91C1C" />
        )}
        <Text style={[styles.toggleText, { color: isActive ? "#15803D" : "#B91C1C" }]}>
          {isActive ? "Aktif — Pasif Yap" : "Pasif — Aktif Yap"}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function CustomerCard({
  customer,
  onToggleStatus,
}: {
  customer: CustomerMember;
  onToggleStatus: () => void;
}) {
  const isActive = customer.status === "active";
  const { showAlert } = useAlert();

  const handleToggle = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    showAlert(
      isActive ? "Musteriyi Pasif Yap" : "Musteriyi Aktif Yap",
      `${customer.name} hesabini ${isActive ? "pasif" : "aktif"} hale getirmek istediginize emin misiniz?`,
      [
        { text: "Iptal", style: "cancel" },
        { text: "Evet", onPress: onToggleStatus },
      ]
    );
  }, [isActive, customer.name, onToggleStatus, showAlert]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Image source={{ uri: customer.avatar }} style={styles.cardAvatar} />
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.cardName}>{customer.name}</Text>
          <View style={styles.cardMetaRow}>
            <Text style={styles.freeLabel}>Ucretsiz Uye</Text>
            <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusPassive]}>
              <View style={[styles.statusDot, { backgroundColor: isActive ? "#22C55E" : "#EF4444" }]} />
              <Text style={[styles.statusText, { color: isActive ? "#15803D" : "#B91C1C" }]}>
                {isActive ? "Aktif" : "Pasif"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Phone size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{customer.phone}</Text>
        </View>
        {customer.email ? (
          <View style={styles.detailRow}>
            <Mail size={14} color={Colors.textSecondary} />
            <Text style={styles.detailText}>{customer.email}</Text>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <ShoppingBag size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{customer.orderCount} siparis</Text>
        </View>
        <View style={styles.detailRow}>
          <TrendingUp size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>Toplam: {customer.totalSpent}</Text>
        </View>
        <View style={styles.detailRow}>
          <Clock size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>Kayit: {customer.createdAt}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.toggleButton, isActive ? styles.toggleActive : styles.togglePassive]}
        onPress={handleToggle}
        testID={`toggle-customer-${customer.id}`}
      >
        {isActive ? (
          <ToggleRight size={20} color="#15803D" />
        ) : (
          <ToggleLeft size={20} color="#B91C1C" />
        )}
        <Text style={[styles.toggleText, { color: isActive ? "#15803D" : "#B91C1C" }]}>
          {isActive ? "Aktif — Pasif Yap" : "Pasif — Aktif Yap"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function SettingsTab() {
  const { settings, updateSettings } = useAdmin();
  const { showAlert } = useAlert();
  const [apiKey, setApiKey] = useState<string>(settings.aiApiKey);
  const [provider, setProvider] = useState<string>(settings.aiProvider);
  const [agreementText, setAgreementText] = useState<string>(settings.sellerAgreement);
  const [showAgreementEditor, setShowAgreementEditor] = useState<boolean>(false);
  const [userAgreementText, setUserAgreementText] = useState<string>(settings.userAgreement);
  const [showUserAgreementEditor, setShowUserAgreementEditor] = useState<boolean>(false);

  const handleSave = useCallback(() => {
    updateSettings({ aiApiKey: apiKey, aiProvider: provider });
    showAlert("Kaydedildi", "AI API ayarlari basariyla kaydedildi.");
  }, [apiKey, provider, updateSettings, showAlert]);

  const handleSaveAgreement = useCallback(() => {
    if (!agreementText.trim()) {
      showAlert("Hata", "Sozlesme metni bos olamaz.");
      return;
    }
    updateSettings({ sellerAgreement: agreementText.trim() });
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    showAlert("Kaydedildi", "Satici sozlesmesi basariyla guncellendi.");
    setShowAgreementEditor(false);
  }, [agreementText, updateSettings, showAlert]);

  const handleResetAgreement = useCallback(() => {
    showAlert("Varsayilana Don", "Sozlesme metnini varsayilan haline dondurmek istediginize emin misiniz?", [
      { text: "Iptal", style: "cancel" },
      {
        text: "Sifirla",
        style: "destructive",
        onPress: () => {
          setAgreementText(DEFAULT_SELLER_AGREEMENT);
          updateSettings({ sellerAgreement: DEFAULT_SELLER_AGREEMENT });
          showAlert("Sifirlandi", "Sozlesme metni varsayilan haline dondu.");
        },
      },
    ]);
  }, [updateSettings, showAlert]);

  const handleSaveUserAgreement = useCallback(() => {
    if (!userAgreementText.trim()) {
      showAlert("Hata", "Sozlesme metni bos olamaz.");
      return;
    }
    updateSettings({ userAgreement: userAgreementText.trim() });
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    showAlert("Kaydedildi", "Uye sozlesmesi basariyla guncellendi.");
    setShowUserAgreementEditor(false);
  }, [userAgreementText, updateSettings, showAlert]);

  const handleResetUserAgreement = useCallback(() => {
    showAlert("Varsayilana Don", "Uye sozlesmesini varsayilan haline dondurmek istediginize emin misiniz?", [
      { text: "Iptal", style: "cancel" },
      {
        text: "Sifirla",
        style: "destructive",
        onPress: () => {
          setUserAgreementText(DEFAULT_USER_AGREEMENT);
          updateSettings({ userAgreement: DEFAULT_USER_AGREEMENT });
          showAlert("Sifirlandi", "Uye sozlesmesi varsayilan haline dondu.");
        },
      },
    ]);
  }, [updateSettings, showAlert]);

  return (
    <ScrollView style={styles.settingsContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.settingsCard}>
        <View style={styles.settingsHeader}>
          <Key size={20} color={Colors.primary} />
          <Text style={styles.settingsTitle}>AI Otomatik Yanit Ayarlari</Text>
        </View>
        <Text style={styles.settingsDesc}>
          Magaza sahiplerinin kullanabilecegi AI otomatik yanit icin API anahtari girin.
        </Text>

        <Text style={styles.settingsLabel}>AI Saglayici</Text>
        <View style={styles.providerRow}>
          {["openai", "gemini", "claude"].map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.providerChip, provider === p && styles.providerChipActive]}
              onPress={() => setProvider(p)}
            >
              <Text style={[styles.providerChipText, provider === p && styles.providerChipTextActive]}>
                {p === "openai" ? "OpenAI" : p === "gemini" ? "Gemini" : "Claude"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.settingsLabel}>API Anahtari</Text>
        <TextInput
          style={styles.settingsInput}
          placeholder="sk-... veya API anahtarinizi girin"
          placeholderTextColor={Colors.textLight}
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry
          autoCapitalize="none"
          testID="api-key-input"
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} testID="save-settings">
          <Settings size={18} color={Colors.white} />
          <Text style={styles.saveBtnText}>Ayarlari Kaydet</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.settingsCard, { marginTop: 16 }]}>
        <View style={styles.settingsHeader}>
          <FileText size={20} color="#F59E0B" />
          <Text style={styles.settingsTitle}>Satici Sozlesmesi</Text>
        </View>
        <Text style={styles.settingsDesc}>
          Magaza acarken kullanicilara gosterilen satici sozlesmesi metnini buradan duzenleyebilirsiniz.
        </Text>

        {!showAgreementEditor ? (
          <>
            <View style={styles.agreementPreview}>
              <Text style={styles.agreementPreviewText} numberOfLines={6}>
                {settings.sellerAgreement}
              </Text>
              <View style={styles.agreementFade} />
            </View>
            <TouchableOpacity
              style={styles.agreementEditBtn}
              onPress={() => {
                setAgreementText(settings.sellerAgreement);
                setShowAgreementEditor(true);
              }}
              testID="edit-agreement-btn"
            >
              <FileText size={18} color={Colors.white} />
              <Text style={styles.saveBtnText}>Sozlesmeyi Duzenle</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.agreementTextInput}
              placeholder="Satici sozlesmesi metnini girin..."
              placeholderTextColor={Colors.textLight}
              value={agreementText}
              onChangeText={setAgreementText}
              multiline
              textAlignVertical="top"
              testID="agreement-text-input"
            />
            <Text style={styles.agreementCharCount}>
              {agreementText.length} karakter
            </Text>
            <View style={styles.agreementActions}>
              <TouchableOpacity
                style={styles.agreementResetBtn}
                onPress={handleResetAgreement}
                testID="reset-agreement-btn"
              >
                <RotateCcw size={16} color="#EF4444" />
                <Text style={styles.agreementResetText}>Varsayilana Don</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.agreementCancelBtn}
                onPress={() => setShowAgreementEditor(false)}
              >
                <Text style={styles.agreementCancelText}>Iptal</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, !agreementText.trim() && { opacity: 0.5 }]}
              onPress={handleSaveAgreement}
              disabled={!agreementText.trim()}
              testID="save-agreement-btn"
            >
              <FileText size={18} color={Colors.white} />
              <Text style={styles.saveBtnText}>Sozlesmeyi Kaydet</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={[styles.settingsCard, { marginTop: 16 }]}>
        <View style={styles.settingsHeader}>
          <Users size={20} color="#3B82F6" />
          <Text style={styles.settingsTitle}>Uye Sozlesmesi</Text>
        </View>
        <Text style={styles.settingsDesc}>
          Uye olurken kullanicilara gosterilen ve onaylamalari gereken sozlesme metnini buradan duzenleyebilirsiniz.
        </Text>

        {!showUserAgreementEditor ? (
          <>
            <View style={styles.agreementPreview}>
              <Text style={styles.agreementPreviewText} numberOfLines={6}>
                {settings.userAgreement}
              </Text>
              <View style={styles.agreementFade} />
            </View>
            <TouchableOpacity
              style={[styles.agreementEditBtn, { backgroundColor: "#3B82F6" }]}
              onPress={() => {
                setUserAgreementText(settings.userAgreement);
                setShowUserAgreementEditor(true);
              }}
              testID="edit-user-agreement-btn"
            >
              <FileText size={18} color={Colors.white} />
              <Text style={styles.saveBtnText}>Uye Sozlesmesini Duzenle</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.agreementTextInput}
              placeholder="Uye sozlesmesi metnini girin..."
              placeholderTextColor={Colors.textLight}
              value={userAgreementText}
              onChangeText={setUserAgreementText}
              multiline
              textAlignVertical="top"
              testID="user-agreement-text-input"
            />
            <Text style={styles.agreementCharCount}>
              {userAgreementText.length} karakter
            </Text>
            <View style={styles.agreementActions}>
              <TouchableOpacity
                style={styles.agreementResetBtn}
                onPress={handleResetUserAgreement}
                testID="reset-user-agreement-btn"
              >
                <RotateCcw size={16} color="#EF4444" />
                <Text style={styles.agreementResetText}>Varsayilana Don</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.agreementCancelBtn}
                onPress={() => setShowUserAgreementEditor(false)}
              >
                <Text style={styles.agreementCancelText}>Iptal</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: "#3B82F6" }, !userAgreementText.trim() && { opacity: 0.5 }]}
              onPress={handleSaveUserAgreement}
              disabled={!userAgreementText.trim()}
              testID="save-user-agreement-btn"
            >
              <FileText size={18} color={Colors.white} />
              <Text style={styles.saveBtnText}>Uye Sozlesmesini Kaydet</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function MessagesTab() {
  const { sendMessageToAll, sendMessageToStoreOwners, sendMessageToCustomers } = useAdmin();
  const { showAlert } = useAlert();
  const [title, setTitle] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [target, setTarget] = useState<"all" | "stores" | "customers">("all");

  const handleSend = useCallback(async () => {
    if (!title.trim() || !message.trim()) {
      showAlert("Hata", "Baslik ve mesaj alanlari bos olamaz.");
      return;
    }
    setSending(true);
    try {
      if (target === "all") {
        await sendMessageToAll(title.trim(), message.trim());
      } else if (target === "stores") {
        await sendMessageToStoreOwners(title.trim(), message.trim());
      } else {
        await sendMessageToCustomers(title.trim(), message.trim());
      }
      const targetLabel = target === "all" ? "tum kullanicilara" : target === "stores" ? "magaza sahiplerine" : "musterilere";
      showAlert("Basarili", `Mesaj ${targetLabel} gonderildi.`);
      setTitle("");
      setMessage("");
    } catch (err: any) {
      const errMsg = err?.message || "Mesaj gonderilirken bir hata olustu.";
      showAlert("Hata", errMsg);
      console.log("Admin message send error:", err);
    } finally {
      setSending(false);
    }
  }, [title, message, target, sendMessageToAll, sendMessageToStoreOwners, sendMessageToCustomers, showAlert]);

  return (
    <ScrollView style={styles.settingsContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.settingsCard}>
        <View style={styles.settingsHeader}>
          <MessageCircle size={20} color={Colors.primary} />
          <Text style={styles.settingsTitle}>Toplu Mesaj Gonder</Text>
        </View>

        <Text style={styles.settingsLabel}>Hedef Kitle</Text>
        <View style={styles.providerRow}>
          <TouchableOpacity
            style={[styles.providerChip, target === "all" && styles.providerChipActive]}
            onPress={() => setTarget("all")}
          >
            <Text style={[styles.providerChipText, target === "all" && styles.providerChipTextActive]}>
              Tum Kullanicilar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.providerChip, target === "stores" && styles.providerChipActive]}
            onPress={() => setTarget("stores")}
          >
            <Text style={[styles.providerChipText, target === "stores" && styles.providerChipTextActive]}>
              Magaza Sahipleri
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.providerChip, target === "customers" && styles.providerChipActive]}
            onPress={() => setTarget("customers")}
          >
            <Text style={[styles.providerChipText, target === "customers" && styles.providerChipTextActive]}>
              Musteriler
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.settingsLabel}>Baslik</Text>
        <TextInput
          style={styles.settingsInput}
          placeholder="Bildirim basligi"
          placeholderTextColor={Colors.textLight}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
          testID="message-title-input"
        />

        <Text style={styles.settingsLabel}>Mesaj</Text>
        <TextInput
          style={[styles.settingsInput, { height: 120, textAlignVertical: "top" }]}
          placeholder="Mesajinizi yazin..."
          placeholderTextColor={Colors.textLight}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
          testID="message-body-input"
        />

        <TouchableOpacity
          style={[styles.saveBtn, (!title.trim() || !message.trim()) && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          testID="send-message-btn"
        >
          {sending ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Send size={18} color={Colors.white} />
              <Text style={styles.saveBtnText}>Mesaj Gonder</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("stores");
  const {
    stores,
    customers,
    toggleStoreStatus,
    updateStorePlan,
    verifyPayment,
    toggleCustomerStatus,
    activeStoreCount,
    activeCustomerCount,
    unpaidStores: _unpaidStores,
    totalUserCount,
    refreshData,
    isLoading,
  } = useAdmin();
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 1500);
  }, [refreshData]);

  const switchTab = useCallback(
    (tab: TabType) => {
      setActiveTab(tab);
      if (Platform.OS !== "web") {
        void Haptics.selectionAsync();
      }
    },
    []
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Admin Panel",
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: "700" as const },
        }}
      />

      <View style={styles.statsHeader}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: "#8B5CF620" }]}>
            <UserCheck size={20} color="#8B5CF6" />
          </View>
          <Text style={styles.statNumber}>{totalUserCount}</Text>
          <Text style={styles.statSubtext}>Toplam Uye</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: "#F59E0B20" }]}>
            <Store size={20} color="#F59E0B" />
          </View>
          <Text style={styles.statNumber}>{stores.length}</Text>
          <Text style={styles.statSubtext}>Magaza</Text>
          <Text style={styles.statActiveText}>{activeStoreCount} aktif</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: "#3B82F620" }]}>
            <Users size={20} color="#3B82F6" />
          </View>
          <Text style={styles.statNumber}>{customers.length}</Text>
          <Text style={styles.statSubtext}>Musteri</Text>
          <Text style={styles.statActiveText}>{activeCustomerCount} aktif</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollContainer}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "stores" && styles.tabActive]}
            onPress={() => switchTab("stores")}
            testID="tab-stores"
          >
            <Store size={16} color={activeTab === "stores" ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === "stores" && styles.tabTextActive]}>
              Magazalar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "customers" && styles.tabActive]}
            onPress={() => switchTab("customers")}
            testID="tab-customers"
          >
            <Users size={16} color={activeTab === "customers" ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === "customers" && styles.tabTextActive]}>
              Musteriler
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "messages" && styles.tabActive]}
            onPress={() => switchTab("messages")}
            testID="tab-messages"
          >
            <MessageCircle size={16} color={activeTab === "messages" ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === "messages" && styles.tabTextActive]}>
              Mesajlar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "settings" && styles.tabActive]}
            onPress={() => switchTab("settings")}
            testID="tab-settings"
          >
            <Settings size={16} color={activeTab === "settings" ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === "settings" && styles.tabTextActive]}>
              Ayarlar
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {activeTab === "settings" ? (
        <SettingsTab />
      ) : activeTab === "messages" ? (
        <MessagesTab />
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Kullanicilar yukleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
        >
          {activeTab === "stores" && stores.length === 0 && (
            <View style={styles.emptyState}>
              <Store size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>Henuz magaza bulunmuyor</Text>
            </View>
          )}
          {activeTab === "stores" &&
            stores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                onToggleStatus={() => toggleStoreStatus(store.id)}
                onUpdatePlan={(plan) => updateStorePlan(store.id, plan)}
                onVerifyPayment={() => verifyPayment(store.id)}
              />
            ))}
          {activeTab === "customers" && customers.length === 0 && (
            <View style={styles.emptyState}>
              <Users size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>Henuz musteri bulunmuyor</Text>
            </View>
          )}
          {activeTab === "customers" &&
            customers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onToggleStatus={() => toggleCustomerStatus(customer.id)}
              />
            ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  statsHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#1E293B",
  },
  statSubtext: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  statActiveText: {
    fontSize: 10,
    color: "#22C55E",
    fontWeight: "600" as const,
    marginTop: 2,
  },
  tabScrollContainer: {
    maxHeight: 56,
    marginTop: 12,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 2,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 11,
    gap: 5,
  },
  tabActive: {
    backgroundColor: Colors.primary + "12",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#64748B",
  },
  tabTextActive: {
    color: Colors.primary,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
  },
  cardHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#1E293B",
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardCategory: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500" as const,
  },
  freeLabel: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600" as const,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
  },
  statusActive: {
    backgroundColor: "#DCFCE7",
  },
  statusPassive: {
    backgroundColor: "#FEE2E2",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  cardDetails: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: "#475569",
  },
  paymentWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  paymentWarningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#DC2626",
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#22C55E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  verifyBtnText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  planSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  planTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#1E293B",
    marginBottom: 10,
  },
  planButtons: {
    flexDirection: "row",
    gap: 10,
  },
  planButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  planButtonActiveMonthly: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
  planButtonActiveYearly: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  planButtonText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#475569",
  },
  planPriceText: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#94A3B8",
  },
  planButtonTextActive: {
    color: "#FFFFFF",
  },
  planActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  planDateText: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 8,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  toggleActive: {
    backgroundColor: "#DCFCE7",
  },
  togglePassive: {
    backgroundColor: "#FEE2E2",
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  settingsContainer: {
    flex: 1,
    padding: 16,
  },
  settingsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#1E293B",
  },
  settingsDesc: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 20,
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#1E293B",
    marginBottom: 8,
    marginTop: 12,
  },
  settingsInput: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E293B",
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: "none" as any,
  },
  providerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  providerChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  providerChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  providerChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#64748B",
  },
  providerChipTextActive: {
    color: "#FFFFFF",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 24,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  agreementPreview: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    position: "relative" as const,
    overflow: "hidden",
  },
  agreementPreviewText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },
  agreementFade: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: "rgba(248,250,252,0.9)",
  },
  agreementEditBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    paddingVertical: 14,
  },
  agreementTextInput: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E293B",
    minHeight: 260,
    maxHeight: 400,
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: "none" as any,
    lineHeight: 22,
  },
  agreementCharCount: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "right" as const,
    marginTop: 6,
  },
  agreementActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginTop: 12,
    marginBottom: 8,
  },
  agreementResetBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  agreementResetText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#EF4444",
  },
  agreementCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  agreementCancelText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#64748B",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 15,
    color: "#94A3B8",
    fontWeight: "500" as const,
  },
});
