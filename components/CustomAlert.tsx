import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import Colors from "@/constants/colors";

export type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

export type AlertConfig = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

type Props = {
  visible: boolean;
  config: AlertConfig | null;
  onDismiss: () => void;
};

export default function CustomAlert({ visible, config, onDismiss }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.88,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!config) return null;

  const buttons = config.buttons && config.buttons.length > 0
    ? config.buttons
    : [{ text: "Tamam", style: "default" as const }];

  const handlePress = (btn: AlertButton) => {
    onDismiss();
    setTimeout(() => {
      btn.onPress?.();
    }, 160);
  };

  const primaryButtons = buttons.filter((b) => b.style !== "cancel");
  const cancelButton = buttons.find((b) => b.style === "cancel");

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale: scaleAnim }], opacity: fadeAnim },
          ]}
        >
          <View style={styles.iconStripe} />

          <View style={styles.content}>
            <Text style={styles.title}>{config.title}</Text>
            {config.message ? (
              <Text style={styles.message}>{config.message}</Text>
            ) : null}
          </View>

          <View style={styles.divider} />

          <View style={styles.buttonContainer}>
            {primaryButtons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.primaryButton,
                  btn.style === "destructive" && styles.destructiveButton,
                ]}
                onPress={() => handlePress(btn)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    btn.style === "destructive" && styles.destructiveButtonText,
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}

            {cancelButton && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handlePress(cancelButton)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>{cancelButton.text}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    width: "100%",
    maxWidth: 340,
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 20px 60px rgba(0,0,0,0.3)" } as object
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
          elevation: 12,
        }),
  },
  iconStripe: {
    height: 5,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  destructiveButton: {
    backgroundColor: "#EF4444",
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
  destructiveButtonText: {
    color: Colors.white,
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: "500" as const,
    letterSpacing: -0.2,
  },
});
