import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log("Testing order insertion...");
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert({
      room_number: "Test",
      total_amount: 100,
      note: "Test note",
      status: 'pending',
      payment_method: 'promptpay',
      phone: null
    })
    .select()
    .single();

  if (orderError) {
    console.error("Order Insert Error:", orderError);
    return;
  }
  console.log("Order Inserted:", orderData);
  
  console.log("Testing activity log insertion...");
  const { error: activityError } = await supabase.from('activity_logs').insert({
    action: 'place_order',
    details: { room: "Test", total: 100, method: 'promptpay' }
  });
  
  if (activityError) {
    console.error("Activity Log Insert Error:", activityError);
    return;
  }
  console.log("Activity Log Inserted.");
}

test();
