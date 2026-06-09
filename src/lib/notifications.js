// 🚀 FIXED: Importing getToken straight from the official source, messaging from local config
import { messaging } from "./firebase";
import { getToken } from "firebase/messaging"; 
import { supabase } from "./supabase"; 

const VAPID_KEY = "BN7Ir1MTxK7PwllwVyFt2OPtDKEBZk4dRHSj99CcVvYKYPx1PQ11cr1ZIxr-xMaAbIzhYVgyYi23-dtMVd5NkEE";

export async function setupNotifications(userId) {
  if (!userId) return;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // Now this has full access to the official Firebase getToken execution block!
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) {
      console.log("No token returned from Firebase.");
      return;
    }

    const { error } = await supabase
      .from("students")
      .update({ fcm_token: token })
      .eq("id", userId);

    if (error) throw error;
    console.log("FCM Token synced to user profile row safely!");

  } catch (err) {
    console.error("FCM setup failed safely:", err);
  }
}

