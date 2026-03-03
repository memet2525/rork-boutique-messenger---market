import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/config/firebase";

export async function uploadImage(uri: string, path: string): Promise<string> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    console.log("Image uploaded:", path);
    return downloadURL;
  } catch (error) {
    console.log("Image upload error:", error);
    return uri;
  }
}

export async function uploadAvatar(uid: string, uri: string): Promise<string> {
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return uploadImage(uri, `avatars/${uid}_${Date.now()}.jpg`);
}

export async function uploadProductImage(storeId: string, uri: string, index: number): Promise<string> {
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return uploadImage(uri, `products/${storeId}/${Date.now()}_${index}.jpg`);
}
