import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from "react-native";
import Colors from "@/constants/colors";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: "" };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error?.message, error?.stack);
    console.error("[ErrorBoundary] Component stack:", errorInfo?.componentStack);
    this.setState({
      errorInfo: errorInfo?.componentStack ?? "",
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: "" });
  };

  handleReload = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null, errorInfo: "" });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>!</Text>
            </View>
            <Text style={styles.title}>Bir sorun olustu</Text>
            <Text style={styles.message}>
              Uygulama yuklenirken beklenmeyen bir hata meydana geldi.
            </Text>
            {this.state.error?.message ? (
              <ScrollView style={styles.errorBox} contentContainerStyle={styles.errorBoxContent}>
                <Text style={styles.errorText}>{this.state.error.message}</Text>
              </ScrollView>
            ) : null}
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reloadButton} onPress={this.handleReload} activeOpacity={0.8}>
              <Text style={styles.reloadButtonText}>Sayfayi Yenile</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#EF4444",
  },
  title: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  errorBox: {
    maxHeight: 80,
    width: "100%",
    backgroundColor: "rgba(239, 68, 68, 0.06)",
    borderRadius: 10,
    marginBottom: 20,
  },
  errorBoxContent: {
    padding: 10,
  },
  errorText: {
    fontSize: 12,
    color: "#B91C1C",
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  reloadButton: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  reloadButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: "500" as const,
  },
});
