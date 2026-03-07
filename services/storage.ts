import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Platform } from "react-native";

import { auth, storage } from "@/config/firebase";

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const PRODUCT_MAX_BYTES = 10 * 1024 * 1024;

type UploadImageSource = string | {
  uri: string;
  file?: Blob | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

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
  const normalizedMessage = errorMessage.toLowerCase();

  if (errorCode === "storage/unauthorized" || errorCode === "storage/unauthenticated") {
    return new Error("Oturum doğrulanamadı. Lütfen hesabınıza tekrar giriş yapıp yeniden deneyin.");
  }

  if (errorCode === "storage/canceled") {
    return new Error("Görsel yükleme iptal edildi.");
  }

  if (errorCode === "storage/retry-limit-exceeded") {
    return new Error("Bağlantı zayıf görünüyor. İnternetinizi kontrol edip tekrar deneyin.");
  }

  if (normalizedMessage.includes("network request failed")) {
    return new Error("Görsel okunamadı. Farklı bir görsel seçip tekrar deneyin.");
  }

  if (normalizedMessage.includes("permission") || normalizedMessage.includes("unauthorized")) {
    return new Error("Depolama izni reddedildi. Lütfen tekrar giriş yapıp yeniden deneyin.");
  }

  return new Error(errorMessage);
}

function isUploadAsset(source: UploadImageSource): source is Exclude<UploadImageSource, string> {
  return typeof source === "object" && source !== null && "uri" in source;
}

function getSourceUri(source: UploadImageSource): string {
  return typeof source === "string" ? source : source.uri;
}

function isRemoteHttpUri(uri: string): boolean {
  return uri.startsWith("http://") || uri.startsWith("https://");
}

function getKnownFileSize(source: UploadImageSource): number | null {
  if (!isUploadAsset(source)) {
    return null;
  }

  if (typeof source.file?.size === "number") {
    return source.file.size;
  }

  if (typeof source.fileSize === "number") {
    return source.fileSize;
  }

  return null;
}

function inferContentTypeFromUri(uri: string): string {
  const normalizedUri = uri.toLowerCase();

  if (normalizedUri.startsWith("data:image/")) {
    const match = normalizedUri.match(/^data:(image\/[a-z0-9.+-]+);/);
    if (match?.[1]) {
      return match[1];
    }
  }

  if (normalizedUri.endsWith(".png")) {
    return "image/png";
  }

  if (normalizedUri.endsWith(".webp")) {
    return "image/webp";
  }

  if (normalizedUri.endsWith(".gif")) {
    return "image/gif";
  }

  return "image/jpeg";
}

function resolveContentType(source: UploadImageSource, blob?: Blob): string {
  if (isUploadAsset(source) && typeof source.mimeType === "string" && source.mimeType.trim().length > 0) {
    return source.mimeType;
  }

  if (typeof blob?.type === "string" && blob.type.trim().length > 0) {
    return blob.type;
  }

  return inferContentTypeFromUri(getSourceUri(source));
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

async function sourceToBlob(source: UploadImageSource): Promise<Blob> {
  if (isUploadAsset(source) && source.file && typeof source.file.size === "number") {
    console.log("[UPLOAD] Using provided picker file directly, size:", source.file.size, "type:", source.file.type || "unknown");
    return source.file;
  }

  return uriToBlob(getSourceUri(source));
}

async function uploadWithRetry(
  blob: Blob,
  path: string,
  contentType: string,
  maxRetries: number = 3,
): Promise<string> {
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

export async function uploadImage(source: UploadImageSource, path: string): Promise<string> {
  const uri = getSourceUri(source);
  const knownFileSize = getKnownFileSize(source);
  const maxBytes = getMaxBytesForPath(path);

  console.log("[UPLOAD] === START uploadImage ===");
  console.log("[UPLOAD] Path:", path);
  console.log("[UPLOAD] URI:", uri.substring(0, 120));
  console.log("[UPLOAD] Platform:", Platform.OS);
  console.log("[UPLOAD] Auth user:", auth.currentUser?.uid ?? "NONE");
  console.log("[UPLOAD] Known picker size:", knownFileSize ?? "unknown");

  if (!auth.currentUser) {
    throw new Error("Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.");
  }

  if (typeof knownFileSize === "number" && knownFileSize > maxBytes) {
    throw new Error(`Görsel çok büyük. En fazla ${formatMegabytes(maxBytes)} MB dosya yükleyebilirsiniz.`);
  }

  const blob = await sourceToBlob(source);
  const blobSize = blob.size;
  const finalSize = blobSize > 0 ? blobSize : knownFileSize ?? 0;
  const contentType = resolveContentType(source, blob);

  console.log("[UPLOAD] Blob ready, size:", blobSize, "final size:", finalSize, "type:", contentType);

  if (finalSize === 0) {
    throw new Error("Görsel okunamadı. Lütfen başka bir görsel deneyin.");
  }

  if (finalSize > maxBytes) {
    throw new Error(`Görsel çok büyük. En fazla ${formatMegabytes(maxBytes)} MB dosya yükleyebilirsiniz.`);
  }

  const downloadURL = await uploadWithRetry(blob, path, contentType);
  console.log("[UPLOAD] === DONE uploadImage ===", downloadURL.substring(0, 120));
  return downloadURL;
}

export async function uploadAvatar(uid: string, source: UploadImageSource): Promise<string> {
  const uri = getSourceUri(source);

  if (isRemoteHttpUri(uri)) {
    return uri;
  }

  return uploadImage(source, `avatars/${uid}_${Date.now()}.jpg`);
}

export async function uploadProductImage(storeId: string, source: UploadImageSource, index: number): Promise<string> {
  const uri = getSourceUri(source);

  if (isRemoteHttpUri(uri)) {
    return uri;
  }

  return uploadImage(source, `products/${storeId}/${Date.now()}_${index}.jpg`);
}
