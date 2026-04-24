import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBQGqnajgWpgbXOXdx_9A5-3PdbjqWJGWM",
  authDomain: "leftover-link-13fa4.firebaseapp.com",
  projectId: "leftover-link-13fa4",
  storageBucket: "leftover-link-13fa4.firebasestorage.app",
  messagingSenderId: "842423527759",
  appId: "1:842423527759:web:11b2c77358dc0856d07d3a",
};

const app = initializeApp(firebaseConfig);

let messagingPromise: Promise<Messaging | null> | null = null;

if (typeof window !== "undefined") {
  messagingPromise = isSupported().then((supported) =>
    supported ? getMessaging(app) : null
  );
}

export async function getFcmToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("Notifications not supported in this environment.");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.log("Notification permission:", permission);
    return null;
  }

  const messaging = await messagingPromise;
  if (!messaging) {
    console.warn("Firebase messaging not supported in this browser.");
    return null;
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.error(
      "VAPID key is missing. Check .env (VITE_FIREBASE_VAPID_KEY)."
    );
    return null;
  }

  console.log("VAPID KEY (first 10 chars):", vapidKey.slice(0, 10));

  const token = await getToken(messaging, {
    vapidKey, // uses /firebase-messaging-sw.js by default
  });

  console.log("FCM token:", token);
  localStorage.setItem("fcmToken", token);
  return token;
}

export function subscribeForegroundMessages(callback: (payload: any) => void) {
  if (!messagingPromise) {
    console.warn("[firebase] messagingPromise is null (probably SSR).");
    return;
  }

  messagingPromise
    .then((messaging) => {
      if (!messaging) {
        console.warn("[firebase] Messaging not supported in this browser.");
        return;
      }

      onMessage(messaging, (payload) => {
        console.log("[firebase] onMessage foreground payload:", payload);
        callback(payload);
      });
    })
    .catch((err) => {
      console.error("[firebase] Error attaching foreground listener:", err);
    });
}
