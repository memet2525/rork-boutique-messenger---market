import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useCallback, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform, TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";

import { UserProvider } from "@/contexts/UserContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { AlertProvider } from "@/contexts/AlertContext";
import ErrorBoundary from "@/components/ErrorBoundary";

try {
  require("@/config/firebase");
} catch (e) {
  console.error("[RootLayout] Firebase initialization error:", e);
}

try {
  void SplashScreen.preventAutoHideAsync();
} catch (e) {
  console.error("[RootLayout] SplashScreen.preventAutoHideAsync error:", e);
}

const queryClient = new QueryClient();

function setupWebMeta() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  try {
    const html = document.documentElement;
    html.setAttribute('lang', 'tr');
    html.setAttribute('translate', 'no');

    const metaTranslate = document.createElement('meta');
    metaTranslate.setAttribute('name', 'google');
    metaTranslate.setAttribute('content', 'notranslate');
    document.head.appendChild(metaTranslate);

    const metaTranslateMs = document.createElement('meta');
    metaTranslateMs.setAttribute('http-equiv', 'content-language');
    metaTranslateMs.setAttribute('content', 'tr');
    document.head.appendChild(metaTranslateMs);

    document.body.classList.add('notranslate');

    const existingViewport = document.querySelector('meta[name="viewport"]');
    if (existingViewport) {
      existingViewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    } else {
      const metaViewport = document.createElement('meta');
      metaViewport.setAttribute('name', 'viewport');
      metaViewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
      document.head.appendChild(metaViewport);
    }

    const metaTheme = document.createElement('meta');
    metaTheme.setAttribute('name', 'theme-color');
    metaTheme.setAttribute('content', '#075E54');
    document.head.appendChild(metaTheme);

    const metaApple = document.createElement('meta');
    metaApple.setAttribute('name', 'apple-mobile-web-app-capable');
    metaApple.setAttribute('content', 'yes');
    document.head.appendChild(metaApple);

    const metaAppleStatus = document.createElement('meta');
    metaAppleStatus.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
    metaAppleStatus.setAttribute('content', 'black-translucent');
    document.head.appendChild(metaAppleStatus);

    const metaAppleTitle = document.createElement('meta');
    metaAppleTitle.setAttribute('name', 'apple-mobile-web-app-title');
    metaAppleTitle.setAttribute('content', 'ButikBiz');
    document.head.appendChild(metaAppleTitle);

    const metaFormat = document.createElement('meta');
    metaFormat.setAttribute('name', 'format-detection');
    metaFormat.setAttribute('content', 'telephone=no');
    document.head.appendChild(metaFormat);

    const metaMsApp = document.createElement('meta');
    metaMsApp.setAttribute('name', 'mobile-web-app-capable');
    metaMsApp.setAttribute('content', 'yes');
    document.head.appendChild(metaMsApp);

    const existingAppleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (existingAppleIcon) {
      existingAppleIcon.setAttribute('href', '/assets/images/icon.png');
    } else {
      const appleIcon = document.createElement('link');
      appleIcon.setAttribute('rel', 'apple-touch-icon');
      appleIcon.setAttribute('sizes', '180x180');
      appleIcon.setAttribute('href', '/assets/images/icon.png');
      document.head.appendChild(appleIcon);
    }

    const appleIcon152 = document.createElement('link');
    appleIcon152.setAttribute('rel', 'apple-touch-icon');
    appleIcon152.setAttribute('sizes', '152x152');
    appleIcon152.setAttribute('href', '/assets/images/icon.png');
    document.head.appendChild(appleIcon152);

    const appleIcon120 = document.createElement('link');
    appleIcon120.setAttribute('rel', 'apple-touch-icon');
    appleIcon120.setAttribute('sizes', '120x120');
    appleIcon120.setAttribute('href', '/assets/images/icon.png');
    document.head.appendChild(appleIcon120);

    const existingIcon32 = document.querySelector('link[rel="icon"][sizes="32x32"]');
    if (!existingIcon32) {
      const icon32 = document.createElement('link');
      icon32.setAttribute('rel', 'icon');
      icon32.setAttribute('type', 'image/png');
      icon32.setAttribute('sizes', '32x32');
      icon32.setAttribute('href', '/assets/images/icon.png');
      document.head.appendChild(icon32);
    }

    const existingIcon192 = document.querySelector('link[rel="icon"][sizes="192x192"]');
    if (!existingIcon192) {
      const icon192 = document.createElement('link');
      icon192.setAttribute('rel', 'icon');
      icon192.setAttribute('type', 'image/png');
      icon192.setAttribute('sizes', '192x192');
      icon192.setAttribute('href', '/assets/images/icon.png');
      document.head.appendChild(icon192);
    }

    const existingFavicons = document.querySelectorAll('link[rel="shortcut icon"], link[rel="icon"]:not([sizes])');
    existingFavicons.forEach((el) => {
      el.setAttribute('href', '/assets/images/icon.png');
    });

    const style = document.createElement('style');
    style.textContent = `
      * { -webkit-tap-highlight-color: transparent; }
      html, body, #root { 
        height: 100%; 
        width: 100%; 
        overflow: hidden; 
        margin: 0; 
        padding: 0;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: none;
      }
      body { 
        position: fixed; 
        top: 0; left: 0; right: 0; bottom: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      input, textarea, select { 
        font-size: 16px !important; 
      }
      ::-webkit-scrollbar { display: none; }
    `;
    document.head.appendChild(style);
  } catch (e) {
    console.error('[RootLayout] setupWebMeta error:', e);
  }
}

function CustomHeaderBack({ tintColor }: { tintColor?: string }) {
  const router = useRouter();
  const handleBack = useCallback(() => {
    try {
      router.back();
    } catch {
      router.replace('/');
    }
  }, [router]);
  return (
    <TouchableOpacity onPress={handleBack} hitSlop={8} style={{ marginLeft: Platform.OS === 'web' ? 8 : 0, padding: 4 }}>
      <ChevronLeft size={26} color={tintColor || "#FFFFFF"} strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

function useWebDeepLink() {
  const router = useRouter();
  const hasHandled = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || hasHandled.current) return;
    hasHandled.current = true;

    try {
      const params = new URLSearchParams(window.location.search);
      const deepPath = params.get('_path');
      if (deepPath) {
        const decoded = decodeURIComponent(deepPath);
        console.log('[WebDeepLink] Detected _path param:', decoded);
        setTimeout(() => {
          try {
            window.history.replaceState(null, '', decoded);
            router.replace(decoded as any);
            console.log('[WebDeepLink] Navigated to:', decoded);
          } catch (e) {
            console.log('[WebDeepLink] Navigation error:', e);
          }
        }, 300);
      }
    } catch (e) {
      console.log('[WebDeepLink] Error:', e);
    }
  }, [router]);
}

function RootLayoutNav() {
  useWebDeepLink();

  return (
    <Stack screenOptions={{
      headerBackTitle: "Geri",
      headerLeft: ({ tintColor }) => <CustomHeaderBack tintColor={tintColor} />,
    }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="store/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: true }} />
      <Stack.Screen name="notifications" options={{ headerShown: true }} />
      <Stack.Screen name="privacy" options={{ headerShown: true }} />
      <Stack.Screen name="help" options={{ headerShown: true }} />
      <Stack.Screen name="open-store" options={{ headerShown: true }} />
      <Stack.Screen name="add-product" options={{ headerShown: true }} />
      <Stack.Screen name="address-form" options={{ headerShown: true }} />
      <Stack.Screen name="address-list" options={{ headerShown: true }} />
      <Stack.Screen name="admin" options={{ headerShown: true }} />
      <Stack.Screen name="boss" options={{ headerShown: true }} />
      <Stack.Screen name="system-messages" options={{ headerShown: true }} />
      <Stack.Screen name="legal-page" options={{ headerShown: true }} />
      <Stack.Screen name="login" options={{ headerShown: true, presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    try {
      void SplashScreen.hideAsync();
    } catch (e) {
      console.error('[RootLayout] SplashScreen.hideAsync error:', e);
    }
    setupWebMeta();
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        document.title = 'ButikBiz - Butikler icin akilli satis';
      } catch (e) {
        console.error('[RootLayout] document.title error:', e);
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AlertProvider>
          <UserProvider>
            <AdminProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <StatusBar style="light" />
                <RootLayoutNav />
              </GestureHandlerRootView>
            </AdminProvider>
          </UserProvider>
        </AlertProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
