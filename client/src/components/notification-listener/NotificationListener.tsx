import { subscribeForegroundMessages } from "@/firebase";
import { useEffect, useRef, useState } from "react";
import {
  NotificationDisplay,
  type InAppNotification,
} from "./NotificationDisplay";

export function NotificationListener() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const timeoutMapRef = useRef<Record<string, number>>({});

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));

    const timeoutId = timeoutMapRef.current[id];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete timeoutMapRef.current[id];
    }
  };

  useEffect(() => {
    // Subscribe and render in-app foreground notifications.
    subscribeForegroundMessages(async (payload) => {
      const notification = payload.notification || {};
      const data = payload.data || {};

      const title = notification.title || data.title || "New Notification";
      const body = notification.body || data.body || "You have a new message.";
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const receivedAt = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      setNotifications((prev) => [{ id, title, body, receivedAt }, ...prev].slice(0, 4));

      // Read token *at the time of notification*, not at render
      const token = localStorage.getItem("token");
      console.log("[Foreground] current token:", token);

      if (!token) {
        console.log("[Foreground] No token, skipping auto-refresh");
        return;
      }

      // Show toast
      // toastInfo({
      //   title,
      //   description: body,
      //   variant: "default",
      //   size: "md",
      // });

      console.log("[Foreground] message:", payload);

      const timeoutId = window.setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((notificationItem) => notificationItem.id !== id)
        );
        delete timeoutMapRef.current[id];
      }, 6000);

      timeoutMapRef.current[id] = timeoutId;
    });

    return () => {
      Object.values(timeoutMapRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutMapRef.current = {};
    };
  }, []);

  return (
    <NotificationDisplay
      notifications={notifications}
      onDismiss={dismissNotification}
    />
  );
}
