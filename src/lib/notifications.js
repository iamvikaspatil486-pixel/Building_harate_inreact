import { messaging } from "./firebase";
import { getToken } from "firebase/messaging";
import { supabase } from "./supabase";

const VAPID_KEY = "BN7Ir1MTxK7PwllwVyFt2OPtDKEBZk4dRHSj99CcVvYKYPx1PQ11cr1ZIxr-xMaAbIzhYVgyYi23-dtMVd5NkEE";

export async function setupNotifications(userId) {
  if (!userId || !messaging) return;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return;

    const { error } = await supabase
      .from("students")
      .update({ fcm_token: token })
      .eq("id", userId);

    if (error) throw error;
    console.log("FCM token saved!");
  } catch (err) {
    console.error("FCM setup failed:", err);
  }
}
