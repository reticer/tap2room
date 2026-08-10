import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('order_items').select('*').limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("order_items columns:", data.length > 0 ? Object.keys(data[0]) : "Empty table, but it works");
    if (data.length === 0) {
        // Insert a dummy to see if it fails
        const { error: insertErr } = await supabase.from('order_items').insert({
            order_id: '58c7c858-e283-407a-bbff-81ef1165dd04', // the one I just inserted
            product_id: '123e4567-e89b-12d3-a456-426614174000', // random uuid
            quantity: 1,
            unit_price: 100
        });
        console.log("Insert with unit_price:", insertErr);
        
        const { error: insertErr2 } = await supabase.from('order_items').insert({
            order_id: '58c7c858-e283-407a-bbff-81ef1165dd04', // the one I just inserted
            product_id: '123e4567-e89b-12d3-a456-426614174000', // random uuid
            quantity: 1,
            price: 100
        });
        console.log("Insert with price:", insertErr2);
    }
  }
}

test();
