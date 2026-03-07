import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/config/firebase";
import { Platform } from "react-native";

async function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (Platform.OS === "web") {
      fetch(uri)
        .then((res) => res.blob())
        .then(resolve)
        .catch(reject);
    } else {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response as Blob);
      xhr.onerror = () => reject(new Error("XHR blob conversion failed"));
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    }
  });
}

export async function uploadImage(uri: string, path: string): Promise<string> {
  try {
    console.log("Uploading image to:", path, "from URI type:", uri.substring(0, 30));
    const blob = await uriToBlob(uri);
    const storageRef = ref(storage, path);
    const metadata = { contentType: "image/jpeg" };
    await uploadBytes(storageRef, blob, metadata);
    const downloadURL = await getDownloadURL(storageRef);
    console.log("Image uploaded successfully:", path, downloadURL.substring(0, 60));
    return downloadURL;
  } catch (error) {
    console.error("Image upload error for path:", path, error);
    throw error;
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
