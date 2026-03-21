// Client-side notification helper

const STORAGE_KEY = "vestra_notifications";
const MAX_NOTIFICATIONS = 20;

export interface ClientNotification {
  id: string;
  message: string;
  date: string;
  read: boolean;
}

function getNotifications(): ClientNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(items: ClientNotification[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addNotification(message: string): void {
  const notifications = getNotifications();
  const newNotification: ClientNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    message,
    date: new Date().toISOString(),
    read: false,
  };
  // Add new one at the beginning, keep max 20
  const updated = [newNotification, ...notifications].slice(0, MAX_NOTIFICATIONS);
  saveNotifications(updated);
}

export function getUnreadCount(): number {
  const notifications = getNotifications();
  return notifications.filter((n) => !n.read).length;
}
