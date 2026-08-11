import { supabase } from '../services/supabaseClient';

// This must match the generated VAPID public key
const VAPID_PUBLIC_KEY = 'BPPUa5lo7Qpr8835EsIt2V3bifxPwsb2BuI6mrHuHr_dmes__WPEEivqwyp13dOjmE20HKGgX7cdBDo3FoanjiU';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushSubscriptionResult {
  success: boolean;
  message: string;
}

export async function subscribeToPushNotifications(): Promise<PushSubscriptionResult> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, message: 'Push notifications are not supported in this browser.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Notification permission denied.' };
    }

    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return { success: false, message: 'Service Worker is not registered. Please ensure you are running the built app or have PWA enabled in dev mode.' };
    }
    
    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    const subJson = subscription.toJSON();

    if (!subJson.endpoint || !subJson.keys) {
      throw new Error("Invalid subscription object");
    }

    // Save to Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: session?.user.id || null,
      endpoint: subJson.endpoint,
      keys_p256dh: subJson.keys.p256dh,
      keys_auth: subJson.keys.auth
    }, { onConflict: 'endpoint' });

    if (error) {
      console.error('Error saving subscription:', error);
      return { success: false, message: 'บันทึกการสมัครรับการแจ้งเตือนไม่สำเร็จ: ' + error.message };
    }

    return { success: true, message: 'เปิดการแจ้งเตือนเบื้องหลังสำเร็จ!' };
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + (error as Error).message };
  }
}
