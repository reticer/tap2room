import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { useTranslation } from 'react-i18next';
import { Bell, LogOut, Package, ShoppingCart } from 'lucide-react';
import { OrdersManager } from './OrdersManager';
import { ProductsManager } from './ProductsManager';
import { SettingsManager } from './SettingsManager';

export const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'settings'>('orders');
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate('/');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate('/');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!session) return;

    const audio = new Audio('/ding.mp3'); // Sound file
    const channel = supabase
      .channel('public:orders:notifications')
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleSubscribePush = async () => {
    // Stub
  };

  if (!session) return null; // or loading spinner

  return (
    <div className="max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 pb-[env(safe-area-inset-bottom)] shadow-2xl overflow-hidden relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-black/70 backdrop-blur-md pt-[env(safe-area-inset-top)] border-b border-gray-200/50 dark:border-gray-800/50 flex justify-between items-center h-16 px-4 md:px-8">
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={handleLogout} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-full hover:bg-red-100 transition-colors shadow-sm" title="Logout">
            <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      {/* Tabs */}
      <div className="flex p-4 md:px-8 gap-3 max-w-2xl mx-auto">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-sm border ${
            activeTab === 'orders' 
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent' 
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="font-semibold">{t('orders')}</span>
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-sm border ${
            activeTab === 'products' 
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent' 
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="font-semibold">{t('products')}</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-none p-3 rounded-2xl flex items-center justify-center transition-all transform active:scale-95 shadow-sm border ${
            activeTab === 'settings' 
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent' 
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
          }`}
          title="Settings"
        >
          <span className="text-xl">⚙️</span>
        </button>
      </div>

      {/* Content */}
      {/* Content */}
      <main className="p-4 md:px-8 max-w-7xl mx-auto">
        {activeTab === 'orders' && <OrdersManager />}
        {activeTab === 'products' && <ProductsManager />}
        {activeTab === 'settings' && <SettingsManager />}
      </main>
    </div>
  );
};
