const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log('=== RETEST: After Security Patch ===\n');

  // 1. Can anon read orders?
  const { data: orders, error: ordersErr } = await s.from('orders').select('id, room_number, total_amount, tracking_code, status, coupon_code, phone').limit(5);
  console.log('1. READ orders (anon):', (orders && orders.length > 0) ? 'STILL EXPOSED! Got ' + orders.length : 'BLOCKED ✅');

  // 2. Can anon read coupons?
  const { data: coupons, error: couponsErr } = await s.from('coupons').select('*').limit(5);
  console.log('2. READ coupons (anon):', couponsErr ? 'BLOCKED ✅' : 'Read ' + (coupons||[]).length + ' coupons (check if sensitive fields hidden)');
  if (coupons && coupons.length > 0) console.log('   Fields visible:', Object.keys(coupons[0]).join(', '));

  // 3. Can anon read products? (should still work)
  const { data: products } = await s.from('products').select('id').limit(1);
  console.log('3. READ products (anon):', products ? 'OK (expected) ✅' : 'BROKEN ❌');

  // 4. Can anon UPDATE product price?
  const pid = (products && products[0]) ? products[0].id : '00000000-0000-0000-0000-000000000000';
  const { error: updateErr } = await s.from('products').update({ price: 1 }).eq('id', pid);
  console.log('4. UPDATE product price (anon):', updateErr ? 'BLOCKED ✅' : 'VULNERABLE ❌');

  // 5. Can anon read app_settings? (needed for store_status and promptpay)
  const { data: settings } = await s.from('app_settings').select('*');
  console.log('5. READ app_settings (anon):', settings ? 'Readable (' + settings.length + ' items)' : 'BLOCKED');

  // 6. Can anon UPDATE store_status?
  const { error: storeErr } = await s.from('app_settings').update({ value: 'closed' }).eq('id', 'store_status');
  console.log('6. UPDATE store_status (anon):', storeErr ? 'BLOCKED ✅' : 'VULNERABLE ❌');

  // 7. Can anon read activity_logs?
  const { data: logs, error: logsErr } = await s.from('activity_logs').select('*').limit(3);
  console.log('7. READ activity_logs (anon):', (logs && logs.length > 0) ? 'STILL EXPOSED ❌ Got ' + logs.length : 'BLOCKED ✅');

  // 8. Can anon INSERT activity_log? (should still work for tracking)
  const { error: logInsertErr } = await s.from('activity_logs').insert({ action: 'test_anon_insert', details: { test: true } });
  console.log('8. INSERT activity_log (anon):', logInsertErr ? 'BROKEN (may affect tracking) ⚠️ ' + logInsertErr.message : 'OK (expected) ✅');

  // 9. Can anon read customer_feedbacks?
  const { data: feedbacks, error: fbErr } = await s.from('customer_feedbacks').select('*').limit(3);
  console.log('9. READ customer_feedbacks (anon):', (feedbacks && feedbacks.length >= 0 && !fbErr) ? 'EXPOSED ❌' : 'BLOCKED ✅');

  // 10. Can anon INSERT customer_feedback? (should still work)
  const { error: fbInsertErr } = await s.from('customer_feedbacks').insert({ message: 'test from hacker script' });
  console.log('10. INSERT customer_feedback (anon):', fbInsertErr ? 'BROKEN ⚠️ ' + fbInsertErr.message : 'OK (expected) ✅');

  // 11. Can anon read push_subscriptions?
  const { data: push, error: pushErr } = await s.from('push_subscriptions').select('*').limit(3);
  console.log('11. READ push_subscriptions (anon):', (push && push.length >= 0 && !pushErr) ? 'EXPOSED ❌' : 'BLOCKED ✅');

  // 12. Can anon read order_items?
  const { data: oi, error: oiErr } = await s.from('order_items').select('*').limit(3);
  console.log('12. READ order_items (anon):', (oi && oi.length >= 0 && !oiErr) ? 'EXPOSED ❌' : 'BLOCKED ✅');

  // 13. Can anon UPDATE order status?
  const { error: statusErr } = await s.from('orders').update({ status: 'completed' }).eq('room_number', 'NONEXISTENT');
  console.log('13. UPDATE order status (anon):', statusErr ? 'BLOCKED ✅' : 'VULNERABLE ❌');

  // 14. Can anon DELETE orders?
  const { error: delOrderErr } = await s.from('orders').delete().eq('room_number', 'NONEXISTENT');
  console.log('14. DELETE orders (anon):', delOrderErr ? 'BLOCKED ✅' : 'VULNERABLE ❌');

  // 15. Can anon update coupon used_count?
  const { error: couponUpErr } = await s.from('coupons').update({ used_count: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('15. UPDATE coupon used_count (anon):', couponUpErr ? 'BLOCKED ✅' : 'VULNERABLE ❌');

  // 16. Can anon INSERT coupon?
  const { error: couponInsErr } = await s.from('coupons').insert({ code: 'HACKER', discount_type: 'fixed', discount_value: 9999 });
  console.log('16. INSERT fake coupon (anon):', couponInsErr ? 'BLOCKED ✅' : 'VULNERABLE ❌');

  // 17. Can anon DELETE coupon?
  const { error: couponDelErr } = await s.from('coupons').delete().eq('code', 'HACKER');
  console.log('17. DELETE coupon (anon):', couponDelErr ? 'BLOCKED ✅' : 'VULNERABLE ❌');

  // 18. Test RPC still works (place_order_secure uses SECURITY DEFINER)
  const { error: rpcErr } = await s.rpc('place_order_secure', {
    p_room_number: 'TEST_SECURITY',
    p_note: null,
    p_payment_method: 'cod',
    p_phone: '0000000000',
    p_items: JSON.stringify([{ product_id: pid, quantity: 1 }]),
    p_coupon_code: null,
    p_discount_amount: 0
  });
  const rpcBlocked = rpcErr && (rpcErr.message.includes('permission') || rpcErr.code === '42501');
  console.log('18. RPC place_order_secure:', rpcBlocked ? 'BROKEN (RPC permission issue) ❌' : 'OK (RPC works) ✅');
  if (rpcErr && !rpcBlocked) console.log('    RPC error (expected):', rpcErr.message.substring(0, 80));

  // Cleanup test data
  await s.from('activity_logs').delete().eq('action', 'test_anon_insert');
  await s.from('customer_feedbacks').delete().eq('message', 'test from hacker script');

  console.log('\n=== RETEST COMPLETE ===');
}

test().catch(console.error);
