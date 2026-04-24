importScripts(
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyBQGqnajgWpgbXOXdx_9A5-3PdbjqWJGWM",
  authDomain: "leftover-link-13fa4.firebaseapp.com",
  projectId: "leftover-link-13fa4",
  storageBucket: "leftover-link-13fa4.firebasestorage.app",
  messagingSenderId: "842423527759",
  appId: "1:842423527759:web:11b2c77358dc0856d07d3a",
});

const messaging = firebase.messaging();

/**
 * Build notification from any FCM/raw payload
 */
function buildNotification(payload) {
  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || data.title || "New notification";
  const body = notification.body || data.body || "You have a new message.";

  // Web notifications only care about standard NotificationOptions
  const icon = notification.icon || data.icon || "/pwa-192x192.png";
  const url = data.url || data.click_action || "/";

  return {
    title,
    options: {
      body,
      icon,
      data: {
        url,
        ...data,
      },
      vibrate: [150, 80, 150],
      requireInteraction: false, // won't affect popup vs non-popup on Android
    },
  };
}

/**
 * Firebase background/terminated handler
 */
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Firebase onBackgroundMessage:", payload);

  const data = payload.data || {};
  if (data.silent === "true" || data.silent === true) {
    console.log("[SW] Silent background message → no notification");
    return;
  }

  const { title, options } = buildNotification(payload);
  self.registration.showNotification(title, options);
});

/**
 * Manual raw push handler (for testing non-FCM or custom payloads)
 * Keep this log-only to avoid duplicate notifications.
 */
self.addEventListener("push", (event) => {
  console.log("[SW] Raw push received:", event.data?.text());
  // Do NOT call showNotification here unless you're deliberately bypassing FCM
});

/**
 * Notification click: focus existing tab or open a new one.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const targetUrl = new URL(url, self.location.origin).href;

      for (const client of allClients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })()
  );
});
