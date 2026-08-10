import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log("Testing order insertion WITHOUT select()...");
  const { error: orderError } = await supabase
    .from('orders')
    .insert({
      room_number: "Test",
      total_amount: 100,
      note: "Test note",
      status: 'pending',
      payment_method: 'promptpay',
      phone: null
    });

  if (orderError) {
    console.error("Order Insert Error:", orderError);
    return;
  }
  console.log("Order Inserted successfully.");
}

test();
