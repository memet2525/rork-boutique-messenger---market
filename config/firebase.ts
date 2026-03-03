import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDj8rf8Wc3YuDrKohjVzUlEChIWU1irQrQ",
  authDomain: "butikbiz-66195.firebaseapp.com",
  projectId: "butikbiz-66195",
  storageBucket: "butikbiz-66195.firebasestorage.app",
  messagingSenderId: "531473670069",
  appId: "1:531473670069:web:31e92959cffb18d4f343fc",
  measurementId: "G-YX48NHB2B2",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
