import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { useTranslation } from 'react-i18next';
import { Home, Package, ShoppingCart, ShoppingBag } from 'lucide-react';
import { OrdersManager } from './OrdersManager';
import { ProductsManager } from './ProductsManager';
import { SettingsManager } from './SettingsManager';
import { AnalyticsManager } from './AnalyticsManager';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, X } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'settings'>('orders');
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  
  // Store Status
  const [storeStatus, setStoreStatus] = useState<'open' | 'closed'>('open');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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
    
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'store_status')
        .single();
        
      if (data) setStoreStatus(data.value as 'open' | 'closed');
    };

    fetchSettings();

    // Subscribe to changes for live settings updates
    const channel = supabase
      .channel('admin_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: 'id=eq.store_status' }, fetchSettings)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const toggleStoreStatus = async () => {
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    const newStatus = storeStatus === 'open' ? 'closed' : 'open';
    
    // Optimistic UI update
    setStoreStatus(newStatus);
    
    const { error } = await supabase
      .from('app_settings')
      .upsert({ 
        id: 'store_status', 
        value: newStatus,
        description: 'Store operating status (open/closed)'
      });
      
    if (error) {
      console.error('Failed to update store status', error);
      // Revert on error
      setStoreStatus(storeStatus);
    }
    setIsUpdatingStatus(false);
  };

  if (!session) return null; // or loading spinner

  return (
    <div className="max-w-7xl mx-auto min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-[env(safe-area-inset-bottom)] overflow-hidden relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-black/70 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="flex justify-between items-center h-16 px-4 md:px-8">
          <div className="flex items-center text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white select-none">
            <span className="mr-0.5">tap</span>
            <div className="relative flex items-center justify-center bg-orange-500 w-[28px] h-[36px] rounded-t-[10px] rounded-b-[2px] border-b-[3px] border-orange-700 mx-0.5 shadow-sm">
                <span className="text-white text-[22px] leading-none z-10 mt-[2px]">2</span>
            </div>
            <span className="ml-0.5">room</span>
            <span className="ml-2.5 text-gray-400 dark:text-gray-500 font-semibold tracking-normal text-lg md:text-xl opacity-80">Admin</span>
          </div>
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
        </div>
      </header>

      {/* Summary Cards */}
      <div className="p-4 md:px-8 max-w-7xl mx-auto pt-6">
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={toggleStoreStatus}
            disabled={isUpdatingStatus}
            className={`bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border flex flex-col justify-between relative overflow-hidden transition-all duration-200 cursor-pointer ${
              storeStatus === 'open' 
                ? 'border-green-100 dark:border-green-900/50 hover:shadow-md' 
                : 'border-red-100 dark:border-red-900/50 hover:shadow-md'
            } ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex justify-between items-start mb-3 relative z-10 w-full">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  storeStatus === 'open' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}>
                  {storeStatus === 'open' ? <ShoppingBag className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-gray-600 dark:text-gray-300 text-sm leading-tight">
                    {isEn ? 'Store Status' : 'สถานะร้าน'}
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                    {storeStatus === 'open' 
                      ? (isEn ? '(Tap to close)' : '(แตะเพื่อปิด)') 
                      : (isEn ? '(Tap to open)' : '(แตะเพื่อเปิด)')}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between relative z-10 mt-2 w-full">
              <span className={`text-xl md:text-2xl font-extrabold ${
                storeStatus === 'open' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-500 dark:text-red-400'
              }`}>
                {storeStatus === 'open' ? (isEn ? 'OPEN' : 'เปิดร้าน') : (isEn ? 'CLOSED' : 'ปิดร้านชั่วคราว')}
              </span>
            </div>
          </button>
          <button 
            onClick={() => setIsAnalyticsOpen(true)}
            className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between text-left hover:border-orange-500/50 transition-colors cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <BarChart3 className="w-16 h-16 text-orange-500 dark:text-orange-400" />
            </div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="font-semibold text-gray-600 dark:text-gray-300 text-sm">
                {isEn ? 'Sales Analytics' : 'สรุปยอดขาย'}
              </span>
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-orange-600 dark:text-orange-400 relative z-10 flex items-center gap-2">
              {isEn ? 'View Report' : 'ดูรายงาน'}
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* Analytics Modal (Island) */}
      <AnimatePresence>
        {isAnalyticsOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsAnalyticsOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: '100%', scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-gray-50 dark:bg-gray-900 w-full md:max-w-4xl h-[90vh] md:h-[85vh] rounded-t-3xl md:rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20">
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-orange-500" />
                  {isEn ? 'Sales Analytics' : 'สรุปยอดขาย'}
                </h2>
                <button 
                  onClick={() => setIsAnalyticsOpen(false)}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pb-8">
                <AnalyticsManager />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex p-4 md:px-8 gap-3 max-w-2xl mx-auto">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-3 px-2 sm:px-4 rounded-2xl flex items-center justify-center gap-1 sm:gap-2 transition-all transform active:scale-95 shadow-sm border ${
            activeTab === 'orders' 
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent' 
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
          }`}
        >
          <ShoppingCart className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold text-sm sm:text-base whitespace-nowrap">{t('orders')}</span>
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-3 px-2 sm:px-4 rounded-2xl flex items-center justify-center gap-1 sm:gap-2 transition-all transform active:scale-95 shadow-sm border ${
            activeTab === 'products' 
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent' 
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
          }`}
        >
          <Package className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold text-sm sm:text-base whitespace-nowrap">{t('products')}</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-none w-12 h-[46px] rounded-2xl flex items-center justify-center transition-all transform active:scale-95 shadow-sm border ${
            activeTab === 'settings' 
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent' 
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
          }`}
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>

      {/* Main Content Area */}
      <main className="p-4 md:px-8 max-w-7xl mx-auto pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'orders' && <OrdersManager key="orders" />}
          {activeTab === 'products' && <ProductsManager key="products" />}
          {activeTab === 'settings' && <SettingsManager key="settings" />}
        </AnimatePresence>
      </main>
    </div>
  );
};
