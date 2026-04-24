import { getFcmToken } from "@/firebase";

export async function setupUserPushNotifications() {
  try {
    const token = await getFcmToken();

    return token;
  } catch (err) {
    console.error("Error setting up push notifications:", err);
  }
}
