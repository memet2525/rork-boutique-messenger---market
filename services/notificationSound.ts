import { Audio } from "expo-av";

let soundInstance: Audio.Sound | null = null;
let isInitialized = false;

const NOTIFICATION_SOUND_URL =
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

async function initAudio(): Promise<void> {
  if (isInitialized) return;
  try {
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
    await initAudio();

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

    sound.setOnPlaybackStatusUpdate((status) => {
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

export function cleanupSound(): void {
  if (soundInstance) {
    soundInstance.unloadAsync().catch(() => {});
    soundInstance = null;
  }
}
