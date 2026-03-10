import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Mail, Lock, User, ArrowRight, Store, Eye, EyeOff, Check, FileText } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";
import { DEFAULT_USER_AGREEMENT } from "@/contexts/AdminContext";

type AuthMode = "login" | "register" | "forgot";

export default function LoginScreen() {
  const router = useRouter();
  const { login, register, resetPassword } = useUser();
  const { showAlert } = useAlert();

  const [mode, setMode] = useState<AuthMode>("login");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [agreementAccepted, setAgreementAccepted] = useState<boolean>(false);
  const [showAgreementModal, setShowAgreementModal] = useState<boolean>(false);

  const buttonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const signupPulse = useRef(new Animated.Value(1)).current;
  const signupGlow = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  React.useEffect(() => {
    if (mode === "login") {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(signupPulse, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(signupPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(signupGlow, { toValue: 1, duration: 800, useNativeDriver: false }),
          Animated.timing(signupGlow, { toValue: 0, duration: 800, useNativeDriver: false }),
        ])
      );
      pulseLoop.start();
      glowLoop.start();
      return () => {
        pulseLoop.stop();
        glowLoop.stop();
      };
    }
  }, [mode, signupPulse, signupGlow]);

  const signupBgColor = signupGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(7,94,84,0)", "rgba(7,94,84,0.1)"],
  });

  const canLogin = email.trim().length > 3 && password.trim().length >= 6;
  const canRegister =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    email.trim().includes("@") &&
    password.trim().length >= 6 &&
    password === confirmPassword &&
    agreementAccepted;
  const canReset = email.trim().includes("@");

  const getFirebaseErrorMessage = (code: string): string => {
    switch (code) {
      case "auth/email-already-in-use":
        return "Bu e-posta adresi zaten kullanilmaktadir.";
      case "auth/invalid-email":
        return "Gecersiz e-posta adresi.";
      case "auth/weak-password":
        return "Sifre en az 6 karakter olmalidir.";
      case "auth/user-not-found":
        return "Bu e-posta adresiyle kayitli kullanici bulunamadi.";
      case "auth/wrong-password":
        return "Hatali sifre. Tekrar deneyin.";
      case "auth/invalid-credential":
        return "E-posta veya sifre hatali.";
      case "auth/too-many-requests":
        return "Cok fazla deneme. Lutfen daha sonra tekrar deneyin.";
      default:
        return "Bir hata olustu. Lutfen tekrar deneyin.";
    }
  };

  const handleLogin = useCallback(async () => {
    if (!canLogin || loading) return;
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showAlert("Hos Geldiniz!", "Basariyla giris yaptiniz.", [
        { text: "Tamam", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const msg = getFirebaseErrorMessage(error?.code || "");
      showAlert("Giris Hatasi", msg);
    } finally {
      setLoading(false);
    }
  }, [canLogin, loading, email, password, login, router, showAlert]);

  const handleRegister = useCallback(async () => {
    if (!canRegister || loading) return;
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLoading(true);
    try {
      await register(firstName.trim(), lastName.trim(), email.trim(), password);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showAlert("Kayit Basarili!", "Hesabiniz olusturuldu. Hos geldiniz!", [
        { text: "Tamam", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const msg = getFirebaseErrorMessage(error?.code || "");
      showAlert("Kayit Hatasi", msg);
    } finally {
      setLoading(false);
    }
  }, [canRegister, loading, firstName, lastName, email, password, register, router, showAlert]);

  const handleResetPassword = useCallback(async () => {
    if (!canReset || loading) return;
    setLoading(true);
    try {
      await resetPassword(email.trim());
      showAlert(
        "E-posta Gonderildi",
        "Sifre sifirlama baglantisi e-posta adresinize gonderildi. Lutfen gelen kutunuzu kontrol edin.",
        [{ text: "Tamam", onPress: () => setMode("login") }]
      );
    } catch (error: any) {
      const msg = getFirebaseErrorMessage(error?.code || "");
      showAlert("Hata", msg);
    } finally {
      setLoading(false);
    }
  }, [canReset, loading, email, resetPassword, showAlert]);

  const handleButtonPressIn = useCallback(() => {
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
  }, [buttonScale]);

  const handleButtonPressOut = useCallback(() => {
    Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  }, [buttonScale]);

  const switchMode = useCallback((newMode: AuthMode) => {
    setMode(newMode);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setAgreementAccepted(false);
  }, []);

  const getTitle = () => {
    if (mode === "login") return "Giris Yap";
    if (mode === "register") return "Uye Ol";
    return "Sifremi Unuttum";
  };

  const getSubtitle = () => {
    if (mode === "login") return "E-posta ve sifrenizle giris yapin";
    if (mode === "register") return "Hemen ucretsiz hesap olusturun";
    return "E-posta adresinize sifre sifirlama baglantisi gonderilecek";
  };

  const canSubmit = mode === "login" ? canLogin : mode === "register" ? canRegister : canReset;
  const handleSubmit = mode === "login" ? handleLogin : mode === "register" ? handleRegister : handleResetPassword;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "",
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.white,
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <Store size={32} color={Colors.white} />
            </View>
            <Text style={styles.brandName}>ButikBiz</Text>
            <Text style={styles.headerSubtitle}>Butikler icin akilli satis platformu</Text>
          </View>

          <Animated.View
            style={[
              styles.formCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.formTitle}>{getTitle()}</Text>
            <Text style={styles.formSubtitle}>{getSubtitle()}</Text>

            {mode === "register" && (
              <>
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Ad</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === "firstName" && styles.inputWrapperFocused,
                    ]}
                  >
                    <User size={18} color={focusedField === "firstName" ? Colors.primary : Colors.textLight} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Adiniz"
                      placeholderTextColor={Colors.textLight}
                      value={firstName}
                      onChangeText={setFirstName}
                      onFocus={() => setFocusedField("firstName")}
                      onBlur={() => setFocusedField("")}
                      maxLength={30}
                      autoCapitalize="words"
                      testID="first-name-input"
                    />
                  </View>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Soyad</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === "lastName" && styles.inputWrapperFocused,
                    ]}
                  >
                    <User size={18} color={focusedField === "lastName" ? Colors.primary : Colors.textLight} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Soyadiniz"
                      placeholderTextColor={Colors.textLight}
                      value={lastName}
                      onChangeText={setLastName}
                      onFocus={() => setFocusedField("lastName")}
                      onBlur={() => setFocusedField("")}
                      maxLength={30}
                      autoCapitalize="words"
                      testID="last-name-input"
                    />
                  </View>
                </View>
              </>
            )}

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>E-posta</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === "email" && styles.inputWrapperFocused,
                ]}
              >
                <Mail size={18} color={focusedField === "email" ? Colors.primary : Colors.textLight} />
                <TextInput
                  style={styles.textInput}
                  placeholder="ornek@email.com"
                  placeholderTextColor={Colors.textLight}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField("")}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={100}
                  testID="email-input"
                />
              </View>
            </View>

            {mode !== "forgot" && (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Sifre</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === "password" && styles.inputWrapperFocused,
                  ]}
                >
                  <Lock size={18} color={focusedField === "password" ? Colors.primary : Colors.textLight} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="En az 6 karakter"
                    placeholderTextColor={Colors.textLight}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField("")}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    maxLength={50}
                    testID="password-input"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={18} color={Colors.textLight} />
                    ) : (
                      <Eye size={18} color={Colors.textLight} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {mode === "register" && (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Sifre Tekrar</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === "confirmPassword" && styles.inputWrapperFocused,
                  ]}
                >
                  <Lock size={18} color={focusedField === "confirmPassword" ? Colors.primary : Colors.textLight} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Sifrenizi tekrar girin"
                    placeholderTextColor={Colors.textLight}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setFocusedField("confirmPassword")}
                    onBlur={() => setFocusedField("")}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    maxLength={50}
                    testID="confirm-password-input"
                  />
                </View>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <Text style={styles.errorText}>Sifreler eslesmiyor</Text>
                )}
              </View>
            )}

            {mode === "register" && (
              <View style={styles.agreementContainer}>
                <TouchableOpacity
                  style={styles.agreementCheckboxRow}
                  onPress={() => setAgreementAccepted(!agreementAccepted)}
                  activeOpacity={0.7}
                  testID="agreement-checkbox"
                >
                  <View style={[styles.checkbox, agreementAccepted && styles.checkboxChecked]}>
                    {agreementAccepted && <Check size={14} color={Colors.white} />}
                  </View>
                  <Text style={styles.agreementLabel}>
                    <Text
                      style={styles.agreementLink}
                      onPress={() => setShowAgreementModal(true)}
                    >
                      Kullanici Sozlesmesi
                    </Text>
                    <Text>{"'"}ni okudum ve kabul ediyorum.</Text>
                  </Text>
                </TouchableOpacity>
                {!agreementAccepted && firstName.trim().length >= 2 && lastName.trim().length >= 2 && (
                  <Text style={styles.agreementWarning}>Devam etmek icin sozlesmeyi kabul etmelisiniz.</Text>
                )}
              </View>
            )}

            {mode === "login" && (
              <TouchableOpacity
                style={styles.forgotButton}
                onPress={() => switchMode("forgot")}
                testID="forgot-password"
              >
                <Text style={styles.forgotText}>Sifremi Unuttum</Text>
              </TouchableOpacity>
            )}

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.loginButton, !canSubmit && styles.loginButtonDisabled]}
                onPress={handleSubmit}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                disabled={!canSubmit || loading}
                testID="submit-button"
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>
                      {mode === "login" ? "Giris Yap" : mode === "register" ? "Kayit Ol" : "Sifirla"}
                    </Text>
                    <ArrowRight size={20} color={Colors.white} />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.switchContainer}>
              {mode === "login" ? (
                <TouchableOpacity onPress={() => switchMode("register")} testID="switch-register">
                  <View style={styles.switchRow}>
                    <Text style={styles.switchText}>Hesabiniz yok mu? </Text>
                    <Animated.View style={[styles.signupBadge, { transform: [{ scale: signupPulse }], backgroundColor: signupBgColor }]}>
                      <Text style={styles.signupBadgeText}>Uye Ol</Text>
                    </Animated.View>
                  </View>
                </TouchableOpacity>
              ) : mode === "register" ? (
                <TouchableOpacity onPress={() => switchMode("login")} testID="switch-login">
                  <Text style={styles.switchText}>
                    Zaten hesabiniz var mi? <Text style={styles.switchLink}>Giris Yap</Text>
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => switchMode("login")} testID="switch-back">
                  <Text style={styles.switchText}>
                    <Text style={styles.switchLink}>Giris sayfasina don</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.termsText}>
              Giris yaparak, Kullanim Kosullarini ve Gizlilik Politikasini kabul etmis olursunuz.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showAgreementModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAgreementModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <FileText size={22} color={Colors.primary} />
            <Text style={styles.modalTitle}>Kullanici Sozlesmesi</Text>
            <TouchableOpacity
              onPress={() => setShowAgreementModal(false)}
              style={styles.modalCloseBtn}
              testID="close-agreement-modal"
            >
              <Text style={styles.modalCloseText}>Kapat</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.modalAgreementText}>{DEFAULT_USER_AGREEMENT}</Text>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalAcceptBtn}
              onPress={() => {
                setAgreementAccepted(true);
                setShowAgreementModal(false);
              }}
              testID="accept-agreement-btn"
            >
              <Check size={18} color={Colors.white} />
              <Text style={styles.modalAcceptText}>Okudum ve Kabul Ediyorum</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerSection: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 32,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandName: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.white,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  formCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 28,
  },
  fieldContainer: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  inputWrapperFocused: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary + "40",
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    outlineWidth: 0,
    outlineStyle: "none" as any,
    borderWidth: 0,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: 8,
    marginTop: -8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  switchContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  switchText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  switchLink: {
    color: Colors.primary,
    fontWeight: "700" as const,
  },
  switchRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  signupBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  signupBadgeText: {
    color: Colors.primary,
    fontWeight: "800" as const,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  termsText: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 16,
  },
  agreementContainer: {
    marginBottom: 12,
    marginTop: -4,
  },
  agreementCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textLight,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  agreementLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  agreementLink: {
    color: Colors.primary,
    fontWeight: "700" as const,
    textDecorationLine: "underline" as const,
  },
  agreementWarning: {
    fontSize: 11,
    color: "#F59E0B",
    marginTop: 6,
    marginLeft: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 10,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  modalCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalAgreementText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  modalAcceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
  },
  modalAcceptText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.white,
  },
});
