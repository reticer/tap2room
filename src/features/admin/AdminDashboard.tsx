import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { useTranslation } from 'react-i18next';
import { Home, Package, ShoppingCart, Clock } from 'lucide-react';
import { OrdersManager } from './OrdersManager';
import { ProductsManager } from './ProductsManager';
import { SettingsManager } from './SettingsManager';

export const AdminDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'settings'>('orders');
  const [session, setSession] = useState<any>(null);
  
  // Stats
  const [pendingOrders, setPendingOrders] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

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
    
    const fetchStats = async () => {
      // Fetch pending orders count
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
        
      if (ordersCount !== null) setPendingOrders(ordersCount);

      // Fetch active products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
        
      if (productsCount !== null) setTotalProducts(productsCount);
    };

    fetchStats();

    // Subscribe to changes for live stats updates
    const channel = supabase
      .channel('admin_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  if (!session) return null; // or loading spinner

  return (
    <div className="max-w-7xl mx-auto min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-[env(safe-area-inset-bottom)] overflow-hidden relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-black/70 backdrop-blur-md pt-[48px] md:pt-[env(safe-area-inset-top)] border-b border-gray-200/50 dark:border-gray-800/50 flex justify-between items-center h-16 px-4 md:px-8">
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={() => i18n.changeLanguage(i18n.language === 'th' ? 'en' : 'th')}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-sm shadow-sm transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Switch Language"
          >
            {i18n.language.toUpperCase()}
          </button>
          <button onClick={() => navigate('/')} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full hover:bg-blue-100 transition-colors shadow-sm" title="Return to Home">
            <Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="p-4 md:px-8 max-w-7xl mx-auto pt-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="font-semibold text-gray-600 dark:text-gray-300 text-sm">Pending</span>
            </div>
            <div className="text-3xl font-extrabold text-gray-900 dark:text-white">{pendingOrders}</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-semibold text-gray-600 dark:text-gray-300 text-sm">Products</span>
            </div>
            <div className="text-3xl font-extrabold text-gray-900 dark:text-white">{totalProducts}</div>
          </div>
        </div>
      </div>

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
