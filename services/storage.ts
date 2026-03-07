import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/config/firebase";
import { Platform } from "react-native";

async function uriToBlob(uri: string): Promise<Blob> {
  console.log("[UPLOAD] Converting URI to blob:", uri.substring(0, 80));

  if (Platform.OS === "web") {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`[UPLOAD] Web fetch failed: ${response.status}`);
    }
    const blob = await response.blob();
    console.log("[UPLOAD] Web blob ready, size:", blob.size);
    return blob;
  }

  return new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const blob = xhr.response as Blob;
      if (blob && blob.size > 0) {
        console.log("[UPLOAD] XHR blob success, size:", blob.size);
        resolve(blob);
      } else {
        reject(new Error("XHR returned empty blob"));
      }
    };
    xhr.onerror = () => {
      console.error("[UPLOAD] XHR blob failed:", xhr.statusText);
      reject(new Error("XHR blob conversion failed: " + xhr.statusText));
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

async function uploadWithRetry(
  blob: Blob,
  path: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[UPLOAD] Attempt ${attempt}/${maxRetries} for path: ${path}`);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("[UPLOAD] No authenticated user - cannot upload");
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
      console.log("[UPLOAD] Download URL obtained:", downloadURL.substring(0, 80));
      return downloadURL;
    } catch (error: any) {
      lastError = error;
      console.error(`[UPLOAD] Attempt ${attempt} failed:`, error?.code, error?.message, error);

      if (
        error?.code === "storage/unauthorized" ||
        error?.code === "storage/unauthenticated"
      ) {
        console.error("[UPLOAD] Auth error - refreshing token...");
        const user = auth.currentUser;
        if (user) {
          try {
            await user.getIdToken(true);
            console.log("[UPLOAD] Token refreshed for retry");
          } catch (tokenErr) {
            console.error("[UPLOAD] Token refresh failed:", tokenErr);
          }
        }
      }

      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        console.log(`[UPLOAD] Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

export async function uploadImage(uri: string, path: string): Promise<string> {
  console.log("[UPLOAD] === START uploadImage ===");
  console.log("[UPLOAD] Path:", path);
  console.log("[UPLOAD] URI:", uri.substring(0, 60));
  console.log("[UPLOAD] Platform:", Platform.OS);
  console.log("[UPLOAD] Auth user:", auth.currentUser?.uid ?? "NONE");

  if (!auth.currentUser) {
    throw new Error("Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.");
  }

  const blob = await uriToBlob(uri);
  console.log("[UPLOAD] Blob ready, size:", blob.size, "type:", blob.type);

  if (blob.size === 0) {
    throw new Error("Görsel okunamadı (0 byte). Lütfen başka bir görsel deneyin.");
  }

  const downloadURL = await uploadWithRetry(blob, path);
  console.log("[UPLOAD] === DONE uploadImage ===", downloadURL.substring(0, 80));
  return downloadURL;
}

export async function uploadAvatar(uid: string, uri: string): Promise<string> {
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return uploadImage(uri, `avatars/${uid}_${Date.now()}.jpg`);
}

export async function uploadProductImage(
  storeId: string,
  uri: string,
  index: number
): Promise<string> {
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return uploadImage(uri, `products/${storeId}/${Date.now()}_${index}.jpg`);
}
