import { Platform } from "react-native";

let AudioModule: any = null;
let soundInstance: any = null;
let addressSoundInstance: any = null;
let isInitialized = false;

const NOTIFICATION_SOUND_URL =
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const ADDRESS_SOUND_URL =
  "https://assets.mixkit.co/active_storage/sfx/1518/1518-preview.mp3";

async function getAudio(): Promise<any> {
  if (AudioModule) return AudioModule;
  try {
    const mod = await import("expo-av");
    AudioModule = mod.Audio;
    return AudioModule;
  } catch (e) {
    console.log("[NotificationSound] expo-av import failed:", e);
    return null;
  }
}

function playWebAudio(url: string, volume: number): void {
  try {
    if (typeof window !== "undefined" && typeof window.Audio !== "undefined") {
      const audio = new window.Audio(url);
      audio.volume = volume;
      audio.play().catch((e: unknown) => console.log("Web audio play failed:", e));
    }
  } catch (e) {
    console.log("Web audio error:", e);
  }
}

async function initAudio(): Promise<void> {
  if (isInitialized) return;
  try {
    const Audio = await getAudio();
    if (!Audio) return;
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });
    isInitialized = true;
    console.log("Audio mode initialized");
  } catch (error) {
    console.log("Error initializing audio mode:", error);
  }
}

export async function playNotificationSound(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      playWebAudio(NOTIFICATION_SOUND_URL, 0.7);
      return;
    }

    await initAudio();
    const Audio = await getAudio();
    if (!Audio) return;

    if (soundInstance) {
      try {
        await soundInstance.unloadAsync();
      } catch {
        // ignore
      }
      soundInstance = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: NOTIFICATION_SOUND_URL },
      { shouldPlay: true, volume: 0.7 }
    );
    soundInstance = sound;

    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (soundInstance === sound) {
          soundInstance = null;
        }
      }
    });

    console.log("Notification sound played");
  } catch (error) {
    console.log("Error playing notification sound:", error);
  }
}

export async function playAddressNotificationSound(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      playWebAudio(ADDRESS_SOUND_URL, 0.8);
      return;
    }

    await initAudio();
    const Audio = await getAudio();
    if (!Audio) return;

    if (addressSoundInstance) {
      try {
        await addressSoundInstance.unloadAsync();
      } catch {
        // ignore
      }
      addressSoundInstance = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: ADDRESS_SOUND_URL },
      { shouldPlay: true, volume: 0.8 }
    );
    addressSoundInstance = sound;

    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (addressSoundInstance === sound) {
          addressSoundInstance = null;
        }
      }
    });

    console.log("Address notification sound played");
  } catch (error) {
    console.log("Error playing address notification sound:", error);
  }
}

export function cleanupSound(): void {
  try {
    if (soundInstance) {
      soundInstance.unloadAsync().catch(() => {});
      soundInstance = null;
    }
    if (addressSoundInstance) {
      addressSoundInstance.unloadAsync().catch(() => {});
      addressSoundInstance = null;
    }
  } catch (e) {
    console.log("Cleanup sound error:", e);
  }
}
