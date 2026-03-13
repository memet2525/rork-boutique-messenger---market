import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyDj8rf8Wc3YuDrKohjVzUlEChIWU1irQrQ",
  authDomain: "butikbiz-66195.firebaseapp.com",
  projectId: "butikbiz-66195",
  storageBucket: "butikbiz-66195.firebasestorage.app",
  messagingSenderId: "531473670069",
  appId: "1:531473670069:web:31e92959cffb18d4f343fc",
  measurementId: "G-YX48NHB2B2",
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  if (getApps().length === 1 && Platform.OS === "web") {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
    console.log("[Firebase] Firestore initialized with long polling (web)");
  } else {
    db = getFirestore(app);
  }
  auth = getAuth(app);
  storage = getStorage(app);
  console.log("[Firebase] Initialized successfully");
} catch (e) {
  console.error("[Firebase] Initialization error:", e);
  app = {} as FirebaseApp;
  db = {} as Firestore;
  auth = {} as Auth;
  storage = {} as FirebaseStorage;
}

export { db, auth, storage };
export default app;
