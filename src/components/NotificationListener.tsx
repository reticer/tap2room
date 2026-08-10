import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export const NotificationListener: React.FC = () => {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    const audio = new Audio('/ding.mp3'); // Sound file
    const channel = supabase
      .channel('public:orders:notifications:global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        // Play sound
        audio.play().catch(e => console.log('Audio play failed', e));
        
        // Show browser notification if enabled
        const pushEnabled = localStorage.getItem('push_enabled') === 'true';
        if (pushEnabled && Notification.permission === 'granted') {
          new Notification('ออเดอร์ใหม่เข้า! 🛒', {
            body: `ห้อง ${payload.new.room_number} สั่งซื้อสินค้า ยอดรวม ฿${payload.new.total_amount}`,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  return null;
};
