import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Platform } from "react-native";

import { auth, storage } from "@/config/firebase";

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const PRODUCT_MAX_BYTES = 10 * 1024 * 1024;

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function getMaxBytesForPath(path: string): number {
  if (path.startsWith("avatars/")) {
    return AVATAR_MAX_BYTES;
  }

  return PRODUCT_MAX_BYTES;
}

function extractErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return "";
  }

  const rawCode = (error as { code?: unknown }).code;
  return typeof rawCode === "string" ? rawCode : "";
}

function normalizeUploadError(error: unknown): Error {
  const errorCode = extractErrorCode(error);
  const errorMessage = error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : "Bilinmeyen yükleme hatası";

  if (errorCode === "storage/unauthorized" || errorCode === "storage/unauthenticated") {
    return new Error("Oturum doğrulanamadı. Lütfen hesabınıza tekrar giriş yapıp yeniden deneyin.");
  }

  if (errorCode === "storage/canceled") {
    return new Error("Görsel yükleme iptal edildi.");
  }

  if (errorCode === "storage/retry-limit-exceeded") {
    return new Error("Bağlantı zayıf görünüyor. İnternetinizi kontrol edip tekrar deneyin.");
  }

  if (errorMessage.toLowerCase().includes("network request failed")) {
    return new Error("Görsel okunamadı. Farklı bir görsel seçip tekrar deneyin.");
  }

  return new Error(errorMessage);
}

async function fetchBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error(`[UPLOAD] Fetch failed: ${response.status}`);
  }

  const blob = await response.blob();
  console.log("[UPLOAD] Fetch blob ready, size:", blob.size, "type:", blob.type || "unknown");
  return blob;
}

async function xhrBlob(uri: string): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.onload = () => {
      const blob = xhr.response as Blob;

      if (blob && blob.size > 0) {
        console.log("[UPLOAD] XHR blob success, size:", blob.size, "type:", blob.type || "unknown");
        resolve(blob);
        return;
      }

      reject(new Error("XHR returned empty blob"));
    };

    xhr.onerror = () => {
      console.error("[UPLOAD] XHR blob failed:", xhr.statusText);
      reject(new Error(`XHR blob conversion failed: ${xhr.statusText}`));
    };

    xhr.ontimeout = () => {
      reject(new Error("XHR blob conversion timed out"));
    };

    xhr.responseType = "blob";
    xhr.timeout = 30000;
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
}

async function uriToBlob(uri: string): Promise<Blob> {
  console.log("[UPLOAD] Converting URI to blob:", uri.substring(0, 120));

  try {
    return await fetchBlob(uri);
  } catch (fetchError) {
    console.error("[UPLOAD] Fetch blob failed:", fetchError);

    if (Platform.OS === "web") {
      throw normalizeUploadError(fetchError);
    }
  }

  return xhrBlob(uri);
}

async function uploadWithRetry(blob: Blob, path: string, maxRetries: number = 3): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      console.log(`[UPLOAD] Attempt ${attempt}/${maxRetries} for path: ${path}`);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.");
      }

      console.log("[UPLOAD] Auth user:", currentUser.uid);
      await currentUser.getIdToken(true);
      console.log("[UPLOAD] Fresh token obtained");

      const storageRef = ref(storage, path);
      const contentType = blob.type && blob.type !== "" ? blob.type : "image/jpeg";
      const metadata = { contentType };

      console.log("[UPLOAD] Content type:", contentType, "Blob size:", blob.size);
      await uploadBytes(storageRef, blob, metadata);
      console.log("[UPLOAD] Upload completed successfully");

      const downloadURL = await getDownloadURL(storageRef);
      console.log("[UPLOAD] Download URL obtained:", downloadURL.substring(0, 120));
      return downloadURL;
    } catch (error) {
      lastError = error;
      const normalizedError = normalizeUploadError(error);
      console.error(`[UPLOAD] Attempt ${attempt} failed:`, normalizedError.message, error);

      const errorCode = extractErrorCode(error);

      if (errorCode === "storage/unauthorized" || errorCode === "storage/unauthenticated") {
        const user = auth.currentUser;

        if (user) {
          try {
            console.log("[UPLOAD] Auth error detected, refreshing token...");
            await user.getIdToken(true);
            console.log("[UPLOAD] Token refreshed for retry");
          } catch (tokenError) {
            console.error("[UPLOAD] Token refresh failed:", tokenError);
          }
        }
      }

      if (attempt < maxRetries) {
        const delay = attempt * 1500;
        console.log(`[UPLOAD] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw normalizeUploadError(lastError);
}

export async function uploadImage(uri: string, path: string): Promise<string> {
  console.log("[UPLOAD] === START uploadImage ===");
  console.log("[UPLOAD] Path:", path);
  console.log("[UPLOAD] URI:", uri.substring(0, 120));
  console.log("[UPLOAD] Platform:", Platform.OS);
  console.log("[UPLOAD] Auth user:", auth.currentUser?.uid ?? "NONE");

  if (!auth.currentUser) {
    throw new Error("Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.");
  }

  const blob = await uriToBlob(uri);
  console.log("[UPLOAD] Blob ready, size:", blob.size, "type:", blob.type || "unknown");

  if (blob.size === 0) {
    throw new Error("Görsel okunamadı. Lütfen başka bir görsel deneyin.");
  }

  const maxBytes = getMaxBytesForPath(path);
  if (blob.size > maxBytes) {
    throw new Error(`Görsel çok büyük. En fazla ${formatMegabytes(maxBytes)} MB dosya yükleyebilirsiniz.`);
  }

  const downloadURL = await uploadWithRetry(blob, path);
  console.log("[UPLOAD] === DONE uploadImage ===", downloadURL.substring(0, 120));
  return downloadURL;
}

export async function uploadAvatar(uid: string, uri: string): Promise<string> {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  return uploadImage(uri, `avatars/${uid}_${Date.now()}.jpg`);
}

export async function uploadProductImage(storeId: string, uri: string, index: number): Promise<string> {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  return uploadImage(uri, `products/${storeId}/${Date.now()}_${index}.jpg`);
}
