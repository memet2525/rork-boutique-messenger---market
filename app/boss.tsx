import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Store,
  Users,
  Crown,
  Calendar,
  CalendarDays,
  ToggleLeft,
  ToggleRight,
  Phone,
  TrendingUp,
  Clock,
  ShoppingBag,
  LogOut,
  Send,
  Settings,
  Key,
  MessageCircle,
  FileText,
  RotateCcw,
  Globe,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/config/firebase";
import Colors from "@/constants/colors";
import { useAdmin, StoreMember, CustomerMember, PlanType, DEFAULT_SELLER_AGREEMENT, DEFAULT_USER_AGREEMENT, DEFAULT_FOOTER_CONTENT, FooterContent } from "@/contexts/AdminContext";
import { useAlert } from "@/contexts/AlertContext";

const ADMIN_EMAIL = "atlaspelet.com@gmail.com";
const ADMIN_PASSWORD = "meh246890met";

type TabType = "stores" | "customers" | "settings" | "messages";

function StoreCard({
  store,
  onToggleStatus,
  onUpdatePlan,
}: {
  store: StoreMember;
  onToggleStatus: () => void;
  onUpdatePlan: (plan: PlanType) => void;
}) {
  const isActive = store.status === "active";
  const isMonthly = store.planType === "monthly";
  const { showAlert } = useAlert();

  const handleToggle = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    showAlert(
      isActive ? "Mağazayı Pasif Yap" : "Mağazayı Aktif Yap",
      `${store.name} mağazasını ${isActive ? "pasif" : "aktif"} hale getirmek istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        { text: "Evet", onPress: onToggleStatus },
      ]
    );
  }, [isActive, store.name, onToggleStatus, showAlert]);

  const handlePlanChange = useCallback(
    (plan: PlanType) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const planLabel = plan === "monthly" ? "Aylık" : "Yıllık";
      showAlert(
        `${planLabel} Plan Aktif Et`,
        `${store.name} için ${planLabel.toLowerCase()} plan aktif edilsin mi?`,
        [
          { text: "İptal", style: "cancel" },
          { text: "Aktif Et", onPress: () => onUpdatePlan(plan) },
        ]
      );
    },
    [store.name, onUpdatePlan, showAlert]
  );

  return (
    <View style={styles.card}>
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
        <View style={styles.detailRow}>
          <Clock size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>Kayıt: {store.createdAt}</Text>
        </View>
      </View>

      <View style={styles.planSection}>
        <Text style={styles.planTitle}>Üyelik Planı</Text>
        <View style={styles.planButtons}>
          <TouchableOpacity
            style={[styles.planButton, isMonthly && isActive && styles.planButtonActiveMonthly]}
            onPress={() => handlePlanChange("monthly")}
          >
            <Calendar size={16} color={isMonthly && isActive ? "#FFFFFF" : "#F59E0B"} />
            <Text style={[styles.planButtonText, isMonthly && isActive && styles.planButtonTextActive]}>
              Aylık
            </Text>
            {isMonthly && isActive && <View style={styles.planActiveDot} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.planButton, !isMonthly && isActive && styles.planButtonActiveYearly]}
            onPress={() => handlePlanChange("yearly")}
          >
            <CalendarDays size={16} color={!isMonthly && isActive ? "#FFFFFF" : "#6366F1"} />
            <Text style={[styles.planButtonText, !isMonthly && isActive && styles.planButtonTextActive]}>
              Yıllık
            </Text>
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
      >
        {isActive ? <ToggleRight size={20} color="#15803D" /> : <ToggleLeft size={20} color="#B91C1C" />}
        <Text style={[styles.toggleText, { color: isActive ? "#15803D" : "#B91C1C" }]}>
          {isActive ? "Aktif — Pasif Yap" : "Pasif — Aktif Yap"}
        </Text>
      </TouchableOpacity>
    </View>
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    showAlert(
      isActive ? "Müşteriyi Pasif Yap" : "Müşteriyi Aktif Yap",
      `${customer.name} hesabını ${isActive ? "pasif" : "aktif"} hale getirmek istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
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
            <Text style={styles.freeLabel}>Ücretsiz Üye</Text>
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
        <View style={styles.detailRow}>
          <ShoppingBag size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{customer.orderCount} sipariş</Text>
        </View>
        <View style={styles.detailRow}>
          <TrendingUp size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>Toplam: {customer.totalSpent}</Text>
        </View>
        <View style={styles.detailRow}>
          <Clock size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>Kayıt: {customer.createdAt}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.toggleButton, isActive ? styles.toggleActive : styles.togglePassive]}
        onPress={handleToggle}
      >
        {isActive ? <ToggleRight size={20} color="#15803D" /> : <ToggleLeft size={20} color="#B91C1C" />}
        <Text style={[styles.toggleText, { color: isActive ? "#15803D" : "#B91C1C" }]}>
          {isActive ? "Aktif — Pasif Yap" : "Pasif — Aktif Yap"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function AdminLoginForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [resetMode, setResetMode] = useState<boolean>(false);
  const [resetSent, setResetSent] = useState<boolean>(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleSubmit = useCallback(async () => {
    if (email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setError("E-posta veya sifre hatali!");
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        console.log("Admin Firebase Auth sign-in successful");
      } catch (firebaseErr: any) {
        console.log("Admin Firebase Auth sign-in skipped:", firebaseErr?.code);
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setError("");
      onLogin();
    } catch (err: any) {
      console.log("Admin login error:", err);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setError("Giris sirasinda bir hata olustu.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  }, [email, password, onLogin, triggerShake]);

  const handleResetPassword = useCallback(async () => {
    if (!email.trim().includes("@")) {
      setError("Gecerli bir e-posta adresi girin.");
      triggerShake();
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      setError("");
    } catch (err: any) {
      console.log("Admin password reset error:", err);
      setError("Sifre sifirlama e-postasi gonderilemedi.");
      triggerShake();
    }
  }, [email, triggerShake]);

  if (resetMode) {
    return (
      <Animated.View style={[styles.loginContainer, { opacity: fadeAnim }]}>
        <View style={styles.loginIconWrap}>
          <Mail size={48} color={Colors.primary} />
        </View>
        <Text style={styles.loginTitle}>Sifre Sifirlama</Text>
        <Text style={styles.loginSubtitle}>Admin e-posta adresinizi girin</Text>

        {resetSent ? (
          <View style={{ width: "100%", alignItems: "center" }}>
            <Text style={styles.resetSuccessText}>
              Sifre sifirlama baglantisi e-posta adresinize gonderildi.
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => { setResetMode(false); setResetSent(false); setError(""); }}
            >
              <Lock size={18} color={Colors.white} />
              <Text style={styles.loginButtonText}>Girise Don</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={{ transform: [{ translateX: shakeAnim }], width: "100%" }}>
            <View style={styles.loginField}>
              <Mail size={18} color={Colors.textLight} />
              <TextInput
                style={styles.loginInput}
                placeholder="admin@email.com"
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(""); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                testID="admin-reset-email"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.loginButton, !email.trim().includes("@") && styles.loginButtonDisabled]}
              onPress={handleResetPassword}
              disabled={!email.trim().includes("@")}
              testID="admin-reset-btn"
            >
              <Send size={18} color={Colors.white} />
              <Text style={styles.loginButtonText}>Sifirlama Linki Gonder</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLoginBtn}
              onPress={() => { setResetMode(false); setError(""); }}
            >
              <Text style={styles.backToLoginText}>Girise Don</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.loginContainer, { opacity: fadeAnim }]}>
      <View style={styles.loginIconWrap}>
        <Shield size={48} color={Colors.primary} />
      </View>
      <Text style={styles.loginTitle}>Yonetici Girisi</Text>
      <Text style={styles.loginSubtitle}>Admin e-posta ile giris yapin</Text>

      <Animated.View style={{ transform: [{ translateX: shakeAnim }], width: "100%" }}>
        <View style={styles.loginField}>
          <Mail size={18} color={Colors.textLight} />
          <TextInput
            style={styles.loginInput}
            placeholder="Admin e-posta"
            placeholderTextColor={Colors.textLight}
            value={email}
            onChangeText={(t) => { setEmail(t); setError(""); }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            testID="admin-email"
          />
        </View>

        <View style={styles.loginField}>
          <Lock size={18} color={Colors.textLight} />
          <TextInput
            style={styles.loginInput}
            placeholder="Sifre"
            placeholderTextColor={Colors.textLight}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(""); }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            testID="admin-password"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={18} color={Colors.textLight} /> : <Eye size={18} color={Colors.textLight} />}
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => { setResetMode(true); setError(""); }}
        >
          <Text style={styles.forgotBtnText}>Sifremi Unuttum</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, (!email.trim() || !password || loading) && styles.loginButtonDisabled]}
          onPress={handleSubmit}
          disabled={!email.trim() || !password || loading}
          testID="admin-login-btn"
        >
          <Lock size={18} color={Colors.white} />
          <Text style={styles.loginButtonText}>{loading ? "Giris yapiliyor..." : "Giris Yap"}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
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
  const [expandedFooterField, setExpandedFooterField] = useState<keyof FooterContent | null>(null);
  const [footerEditText, setFooterEditText] = useState<string>("");

  const footerContent = settings.footerContent || DEFAULT_FOOTER_CONTENT;

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          testID="boss-api-key-input"
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} testID="boss-save-settings">
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
              testID="boss-edit-agreement-btn"
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
              testID="boss-agreement-text-input"
            />
            <Text style={styles.agreementCharCount}>
              {agreementText.length} karakter
            </Text>
            <View style={styles.agreementActions}>
              <TouchableOpacity
                style={styles.agreementResetBtn}
                onPress={handleResetAgreement}
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
              testID="boss-edit-user-agreement-btn"
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
              testID="boss-user-agreement-text-input"
            />
            <Text style={styles.agreementCharCount}>
              {userAgreementText.length} karakter
            </Text>
            <View style={styles.agreementActions}>
              <TouchableOpacity
                style={styles.agreementResetBtn}
                onPress={handleResetUserAgreement}
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
            >
              <FileText size={18} color={Colors.white} />
              <Text style={styles.saveBtnText}>Uye Sozlesmesini Kaydet</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={[styles.settingsCard, { marginTop: 16 }]}>
        <View style={styles.settingsHeader}>
          <Globe size={20} color={Colors.primary} />
          <Text style={styles.settingsTitle}>Footer Icerik Yonetimi</Text>
        </View>
        <Text style={styles.settingsDesc}>
          Ana sayfanin altinda gorunen yasal metinleri ve bilgileri buradan duzenleyebilirsiniz.
        </Text>
      </View>

      {(Object.keys(BOSS_FOOTER_FIELD_LABELS) as (keyof FooterContent)[]).map((field) => {
        const isExpanded = expandedFooterField === field;
        const color = BOSS_FOOTER_FIELD_COLORS[field];
        return (
          <View key={field} style={[styles.settingsCard, { marginTop: 12 }]}>
            <TouchableOpacity
              style={styles.footerFieldHeader}
              onPress={() => {
                if (expandedFooterField === field) {
                  setExpandedFooterField(null);
                  return;
                }
                setExpandedFooterField(field);
                setFooterEditText(footerContent[field]);
              }}
              activeOpacity={0.7}
              testID={`boss-footer-field-${field}`}
            >
              <View style={[styles.footerFieldDot, { backgroundColor: color }]} />
              <Text style={styles.footerFieldLabel}>{BOSS_FOOTER_FIELD_LABELS[field]}</Text>
              {isExpanded ? (
                <ChevronUp size={18} color={Colors.textSecondary} />
              ) : (
                <ChevronDown size={18} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>

            {!isExpanded && (
              <Text style={styles.footerFieldPreview} numberOfLines={2}>
                {footerContent[field]}
              </Text>
            )}

            {isExpanded && (
              <View style={styles.footerFieldEditor}>
                <TextInput
                  style={styles.agreementTextInput}
                  value={footerEditText}
                  onChangeText={setFooterEditText}
                  multiline
                  textAlignVertical="top"
                  placeholder={`${BOSS_FOOTER_FIELD_LABELS[field]} metnini girin...`}
                  placeholderTextColor={Colors.textLight}
                  testID={`boss-footer-edit-${field}`}
                />
                <Text style={styles.agreementCharCount}>
                  {footerEditText.length} karakter
                </Text>
                <View style={styles.agreementActions}>
                  <TouchableOpacity
                    style={styles.agreementResetBtn}
                    onPress={() => {
                      showAlert("Varsayilana Don", `${BOSS_FOOTER_FIELD_LABELS[field]} varsayilan haline dondurmek istediginize emin misiniz?`, [
                        { text: "Iptal", style: "cancel" },
                        {
                          text: "Sifirla",
                          style: "destructive",
                          onPress: () => {
                            const defaultVal = DEFAULT_FOOTER_CONTENT[field];
                            const updated = { ...footerContent, [field]: defaultVal };
                            updateSettings({ footerContent: updated });
                            setFooterEditText(defaultVal);
                            showAlert("Sifirlandi", `${BOSS_FOOTER_FIELD_LABELS[field]} varsayilan haline dondu.`);
                          },
                        },
                      ]);
                    }}
                  >
                    <RotateCcw size={14} color="#EF4444" />
                    <Text style={styles.agreementResetText}>Varsayilana Don</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.agreementCancelBtn}
                    onPress={() => setExpandedFooterField(null)}
                  >
                    <Text style={styles.agreementCancelText}>Iptal</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: color }, !footerEditText.trim() && { opacity: 0.5 }]}
                  onPress={() => {
                    if (!footerEditText.trim()) {
                      showAlert("Hata", "Icerik bos olamaz.");
                      return;
                    }
                    const updated = { ...footerContent, [field]: footerEditText.trim() };
                    updateSettings({ footerContent: updated });
                    if (Platform.OS !== "web") {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                    showAlert("Kaydedildi", `${BOSS_FOOTER_FIELD_LABELS[field]} basariyla guncellendi.`);
                    setExpandedFooterField(null);
                  }}
                  disabled={!footerEditText.trim()}
                  testID={`boss-footer-save-${field}`}
                >
                  <FileText size={18} color={Colors.white} />
                  <Text style={styles.saveBtnText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const BOSS_FOOTER_FIELD_LABELS: Record<keyof FooterContent, string> = {
  userAgreement: "Kullanici Sozlesmesi",
  privacyPolicy: "Gizlilik Politikasi",
  kvkk: "KVKK Aydinlatma Metni",
  cookiePolicy: "Cerez Politikasi",
  contactInfo: "Iletisim",
  faq: "Sikca Sorulan Sorular",
  copyright: "Telif Hakki Metni",
};

const BOSS_FOOTER_FIELD_COLORS: Record<keyof FooterContent, string> = {
  userAgreement: "#3B82F6",
  privacyPolicy: "#8B5CF6",
  kvkk: "#EF4444",
  cookiePolicy: "#F59E0B",
  contactInfo: "#22C55E",
  faq: "#06B6D4",
  copyright: "#6366F1",
};

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
    } catch (_err) {
      showAlert("Hata", "Mesaj gonderilirken bir hata olustu.");
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
          testID="boss-message-title-input"
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
          testID="boss-message-body-input"
        />

        <TouchableOpacity
          style={[styles.saveBtn, (!title.trim() || !message.trim()) && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          testID="boss-send-message-btn"
        >
          <Send size={18} color={Colors.white} />
          <Text style={styles.saveBtnText}>Mesaj Gonder</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>("stores");
  const {
    stores,
    customers,
    toggleStoreStatus,
    updateStorePlan,
    toggleCustomerStatus,
    activeStoreCount,
    activeCustomerCount,
  } = useAdmin();

  const switchTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  }, []);

  return (
    <View style={styles.dashContainer}>
      <View style={styles.dashHeader}>
        <View style={styles.dashHeaderTop}>
          <View>
            <Text style={styles.dashWelcome}>Hoş Geldiniz</Text>
            <Text style={styles.dashAdminName}>ButikBiz Yönetici</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} testID="admin-logout">
            <LogOut size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsHeader}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: "#F59E0B20" }]}>
            <Store size={20} color="#F59E0B" />
          </View>
          <Text style={styles.statNumber}>{stores.length}</Text>
          <Text style={styles.statSubtext}>Mağaza</Text>
          <Text style={styles.statActiveText}>{activeStoreCount} aktif</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: "#3B82F620" }]}>
            <Users size={20} color="#3B82F6" />
          </View>
          <Text style={styles.statNumber}>{customers.length}</Text>
          <Text style={styles.statSubtext}>Müşteri</Text>
          <Text style={styles.statActiveText}>{activeCustomerCount} aktif</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: "#22C55E20" }]}>
            <Crown size={20} color="#22C55E" />
          </View>
          <Text style={styles.statNumber}>{stores.filter((s) => s.planType === "yearly").length}</Text>
          <Text style={styles.statSubtext}>Yıllık Plan</Text>
          <Text style={styles.statActiveText}>premium</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollContainer}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "stores" && styles.tabActive]}
            onPress={() => switchTab("stores")}
          >
            <Store size={16} color={activeTab === "stores" ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === "stores" && styles.tabTextActive]}>
              Magazalar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "customers" && styles.tabActive]}
            onPress={() => switchTab("customers")}
          >
            <Users size={16} color={activeTab === "customers" ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === "customers" && styles.tabTextActive]}>
              Musteriler
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "messages" && styles.tabActive]}
            onPress={() => switchTab("messages")}
          >
            <MessageCircle size={16} color={activeTab === "messages" ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === "messages" && styles.tabTextActive]}>
              Mesajlar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "settings" && styles.tabActive]}
            onPress={() => switchTab("settings")}
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
      ) : (
        <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {activeTab === "stores" &&
            stores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                onToggleStatus={() => toggleStoreStatus(store.id)}
                onUpdatePlan={(plan) => updateStorePlan(store.id, plan)}
              />
            ))}
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

export default function BossScreen() {
  const [authenticated, setAuthenticated] = useState<boolean>(false);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: authenticated ? "Admin Panel" : "Yönetici Girişi",
          headerStyle: { backgroundColor: "#1E293B" },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: "700" as const },
        }}
      />
      {authenticated ? (
        <AdminDashboard onLogout={() => {
          signOut(auth).catch((err) => console.log("Admin sign-out error:", err));
          setAuthenticated(false);
        }} />
      ) : (
        <AdminLoginForm onLogin={() => setAuthenticated(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  loginContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loginIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: "#1E293B",
    marginBottom: 4,
  },
  loginSubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 32,
  },
  loginField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  loginInput: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
    outlineWidth: 0,
    outlineStyle: 'none' as any,
    borderWidth: 0,
  },
  errorText: {
    fontSize: 13,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "600" as const,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E293B",
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    marginTop: 4,
  },
  loginButtonDisabled: {
    opacity: 0.4,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  dashContainer: {
    flex: 1,
  },
  dashHeader: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  dashHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dashWelcome: {
    fontSize: 13,
    color: "#94A3B8",
  },
  dashAdminName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.white,
    marginTop: 2,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.1)",
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#475569",
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
  tabScrollContainer: {
    maxHeight: 56,
    marginTop: 12,
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
    flexDirection: "row" as const,
    alignItems: "center" as const,
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
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
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
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
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
    overflow: "hidden" as const,
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
  footerFieldHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 4,
  },
  footerFieldDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  footerFieldLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#1E293B",
  },
  footerFieldPreview: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 8,
    lineHeight: 18,
  },
  footerFieldEditor: {
    marginTop: 12,
  },
  forgotBtn: {
    alignSelf: "flex-end" as const,
    marginBottom: 12,
    marginTop: -4,
  },
  forgotBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  backToLoginBtn: {
    alignItems: "center" as const,
    marginTop: 16,
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  resetSuccessText: {
    fontSize: 14,
    color: "#22C55E",
    fontWeight: "600" as const,
    textAlign: "center" as const,
    marginBottom: 24,
    lineHeight: 22,
  },
});
