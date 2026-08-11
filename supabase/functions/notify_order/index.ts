import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import webPush from "npm:web-push@3.6.7"

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log("Webhook payload:", payload)
    
    // We only care about new orders
    if (payload.type !== 'INSERT' || payload.table !== 'orders') {
      return new Response(JSON.stringify({ message: "Not an order insert" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    }

    const order = payload.record;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Setup web-push
    webPush.setVapidDetails(
      'mailto:admin@tap2room.com',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    )

    // Fetch subscriptions
    const { data: subscriptions, error } = await supabaseClient
      .from('push_subscriptions')
      .select('*')

    if (error) {
      console.error("Error fetching subscriptions:", error)
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found")
      return new Response(JSON.stringify({ message: "No subscriptions" }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    let roomStr = String(order.room_number).trim();
    if (!roomStr.startsWith('ห้อง')) {
      roomStr = `ห้อง ${roomStr}`;
    }

    const notificationPayload = JSON.stringify({
      title: 'ออเดอร์ใหม่เข้า! 🛒',
      body: `${roomStr} สั่งซื้อสินค้า ยอดรวม ฿${order.total_amount}`,
      url: '/admin'
    })

    const pushPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          auth: sub.keys_auth,
          p256dh: sub.keys_p256dh
        }
      }

      try {
        await webPush.sendNotification(pushSubscription, notificationPayload)
        console.log("Push sent to", sub.id)
      } catch (err) {
        console.error("Push failed for", sub.id, err)
        // If gone (410), we can delete it from DB
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseClient.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    })

    await Promise.all(pushPromises)

    return new Response(JSON.stringify({ message: "Push sent successfully" }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})
