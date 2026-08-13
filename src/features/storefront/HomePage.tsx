import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useCartStore } from '../../store/useCartStore';
import type { Product } from '../../store/useCartStore';
import { Plus, Minus, ShoppingBag, PackageOpen, Headphones, ClipboardList } from 'lucide-react';
import { CartDrawer } from '../cart/CartDrawer';
import { AdminAuthModal } from '../admin/AdminAuthModal';
import { ProductDetailsModal } from './ProductDetailsModal';
import { FeedbackModal } from './FeedbackModal';
import { MyOrdersModal } from './MyOrdersModal';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';

const CATEGORIES = [
  { id: 'ทั้งหมด', key: 'cat_all' },
  { id: 'เครื่องดื่ม', key: 'cat_drinks' },
  { id: 'ของกินเล่น', key: 'cat_snacks' },
  { id: 'ของใช้', key: 'cat_utilities' }
];

export const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addItem = useCartStore(state => state.addItem);
  const removeItem = useCartStore(state => state.removeItem);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const cartItems = useCartStore(state => state.items);
  const setCartOpen = useCartStore(state => state.setCartOpen);
  const getCartTotal = useCartStore(state => state.getCartTotal);
  
  const [isAdminModalOpen, setAdminModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [isMyOrdersModalOpen, setMyOrdersModalOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [storeStatus, setStoreStatus] = useState<'open' | 'closed'>('open');

  useEffect(() => {
    // Initial delay before showing
    const initialTimeout = setTimeout(() => {
      setShowTooltip(true);
    }, 1000);
    
    return () => clearTimeout(initialTimeout);
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (showTooltip) {
      // Hide after 10 seconds
      timeout = setTimeout(() => setShowTooltip(false), 10000);
    } else {
      // Show again after 5 seconds
      timeout = setTimeout(() => setShowTooltip(true), 5000);
    }
    return () => clearTimeout(timeout);
  }, [showTooltip]);

  useEffect(() => {
    const hasVisited = sessionStorage.getItem('has_visited');

    if (!hasVisited) {
      sessionStorage.setItem('has_visited', 'true');
      
      // Fire and forget
      supabase.from('activity_logs').insert({
        action: 'visit_store',
        details: { url: window.location.pathname }
      }).then();
    }
    
    // Subscribe to real-time changes on products table
    const channel = supabase
      .channel('public:products:changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        // Invalidate and refetch whenever products table changes
        queryClient.invalidateQueries({ queryKey: ['products'] });
      })
      .subscribe();
      
    // Fetch initial store status
    const fetchStoreStatus = async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('id', 'store_status').single();
      if (data) setStoreStatus(data.value as 'open' | 'closed');
    };
    fetchStoreStatus();

    // Subscribe to real-time changes on app_settings for store_status
    const settingsChannel = supabase
      .channel('public:settings:changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: 'id=eq.store_status' }, (payload: any) => {
        if (payload.new && payload.new.value) {
          setStoreStatus(payload.new.value as 'open' | 'closed');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(settingsChannel);
    };
  }, [queryClient]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const productList = data as Product[];
      
      // Sort to push out-of-stock items to the bottom, while maintaining sort_order
      return productList.sort((a, b) => {
        const aOut = a.stock === 0 ? 1 : 0;
        const bOut = b.stock === 0 ? 1 : 0;
        if (aOut !== bOut) return aOut - bOut;
        return 0; // maintain original order from Supabase
      });
    }
  });

  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = getCartTotal();

  // Click counter for hidden admin access (requires 5 clicks)
  const clickCountRef = React.useRef(0);
  const clickTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoClick = async () => {
    clickCountRef.current += 1;
    
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 1500);

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/admin');
      } else {
        setAdminModalOpen(true);
      }
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="max-w-5xl mx-auto min-h-screen bg-gray-50 dark:bg-black relative pb-32 shadow-lg overflow-hidden">
      
      {/* Store Closed Banner (Not Grayscaled) */}
      <AnimatePresence>
        {storeStatus === 'closed' && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 md:top-[calc(env(safe-area-inset-top)+4.5rem)] left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-black/95 border border-white/10 rounded-2xl p-4 shadow-lg shadow-black/50 flex flex-col items-center justify-center text-center mt-4"
          >
            <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-2">
              <PackageOpen className="w-6 h-6" />
            </div>
            <h3 className="text-white font-extrabold text-lg">{i18n.language === 'en' ? 'Temporarily Closed' : 'ขณะนี้ปิดรับออร์เดอร์ชั่วคราว'}</h3>
            <p className="text-gray-300 text-sm mt-1">{i18n.language === 'en' ? 'We are not accepting orders at the moment. Please come back later.' : 'ขออภัยครับ ขณะนี้เรายังไม่เปิดรับออร์เดอร์ กรุณากลับมาใหม่ภายหลัง'}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Sticky Glassmorphism Header (Interactive even when closed) */}
      <header className="fixed top-0 w-full max-w-5xl z-40 bg-white/95 dark:bg-black/95 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="flex justify-between items-center h-14 px-4 md:px-8 relative z-50">
          {/* Empty spacer on mobile, hidden on desktop */}
          <div className="w-10 md:hidden"></div>
          
          <div 
            className="flex items-center text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white select-none cursor-pointer hover:opacity-80 transition-opacity absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0"
            onClick={handleLogoClick}
          >
            <span className="mr-0.5">tap</span>
            
            {/* บานประตูแบบมินิมอล (ไม่มีลูกบิด + เลข 2 อยู่ตรงกลางพอดี) */}
            <div className="relative flex items-center justify-center bg-orange-500 w-[28px] h-[36px] rounded-t-[10px] rounded-b-[2px] border-b-[3px] border-orange-700 mx-0.5 shadow-sm">
                <span className="text-white text-[22px] leading-none z-10 mt-[2px]">2</span>
            </div>
            
            <span className="ml-0.5">room</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Desktop Feedback Button */}
            <button 
              onClick={() => setFeedbackModalOpen(true)}
              className={`hidden md:flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-4 py-1.5 rounded-full transition-colors shadow-sm shrink-0 ${storeStatus === 'closed' ? 'opacity-50 pointer-events-none' : 'hover:bg-orange-200 dark:hover:bg-orange-900/50'}`}
              title={i18n.language === 'en' ? 'Contact Admin' : 'ติดต่อแอดมิน'}
            >
              <Headphones className="w-4 h-4" />
              <span className="text-sm font-bold">{i18n.language === 'en' ? 'Contact' : 'ติดต่อแอดมิน'}</span>
            </button>
            
            {/* Desktop Cart Button */}
            <button 
              onClick={() => setCartOpen(true)}
              className={`hidden md:flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-1.5 rounded-full transition-colors shadow-sm relative shrink-0 ${storeStatus === 'closed' ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-800'}`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="text-sm font-bold">{t('cart')}</span>
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900 shadow-sm">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* My Orders Button */}
            <button 
              onClick={() => setMyOrdersModalOpen(true)}
              className={`flex items-center justify-center gap-1.5 text-sm font-bold bg-gray-100 dark:bg-gray-800 w-8 h-8 md:w-auto md:h-auto md:px-3 md:py-1.5 rounded-full transition-colors shadow-sm text-gray-700 dark:text-gray-200 shrink-0 ${storeStatus === 'closed' ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-200'}`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">{i18n.language === 'en' ? 'My Orders' : 'ออเดอร์ของฉัน'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className={`transition-all duration-700 ease-in-out min-h-screen ${storeStatus === 'closed' ? 'grayscale-[0.9] opacity-70' : ''}`}>
        
        {/* Main Content padding-top to account for fixed header + safe area */}
        <main className="pt-14 md:pt-[calc(env(safe-area-inset-top)+3.5rem)]">
          
          <div className={storeStatus === 'closed' ? 'pointer-events-none' : ''}>
            {/* 3. Hero / Welcome Banner */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="px-4 pt-4 mb-6"
            >
              <div className="relative w-full overflow-hidden rounded-3xl border border-[#FDE1C8] p-5 md:p-6 shadow-sm flex items-center justify-between bg-white">
                
                {/* Dynamic Animated Gradient Background */}
                <motion.div 
                  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                  transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
                  className="absolute inset-0 z-0"
                  style={{
                    backgroundImage: 'linear-gradient(270deg, #FAE8D4, #FFFFFF, #FFEDD5, #FFF9F0, #FCE6D2)',
                    backgroundSize: '400% 400%'
                  }}
                />
                
                {/* Left Column Content */}
                <div className="relative z-10 flex flex-col items-start max-w-[65%] space-y-2.5">
                  <span className="relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FF4D4D] text-white text-[11px] md:text-xs font-semibold shadow-sm">
                    <motion.span 
                      animate={{ x: ['-150%', '250%'] }} 
                      transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 1 }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-[50%] h-full -skew-x-12"
                    />
                    🔥 {i18n.language === 'en' ? 'August Special' : 'โปรเด็ดเดือนสิงหาคม'}
                  </span>
                  <h2 className="text-xl md:text-3xl font-black text-[#5C3D2E] leading-[1.15] tracking-tight">
                    {i18n.language === 'en' ? <>Hungry?<br/>Order now! 🛵</> : <>หิวไหม?<br/>สั่งเลยเดี๋ยวไปส่ง 🛵</>}
                  </h2>
                  <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-[#8A5A44]">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                    {i18n.language === 'en' ? 'Free delivery to your door!' : 'ส่งฟรีถึงหน้าห้อง!'}
                  </div>
                </div>

                {/* Right Column Graphics */}
                <div className="absolute right-0 md:right-6 bottom-0 h-full flex items-end justify-end pointer-events-none pr-2 pb-2 scale-100 md:scale-[1.35] md:origin-bottom-right">
                  
                  {/* Shopping Bag SVG (Peach) */}
                  <motion.div
                    animate={{ rotate: [-2, 2, -2], y: [0, -2, 0] }}
                    transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                    className="z-10 absolute right-10 bottom-0 md:-bottom-2 will-change-transform"
                  >
                    <div className="drop-shadow-xl dark:drop-shadow-[0_10px_15px_rgba(255,255,255,0.07)]">
                      <svg width="80" height="90" viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M25 30 C25 5 55 5 55 30" stroke="#F5A97F" strokeWidth="6" strokeLinecap="round"/>
                        <rect x="10" y="30" width="60" height="55" rx="8" fill="#FDBA74"/>
                        <rect x="25" y="55" width="30" height="12" rx="6" fill="#F5A97F"/>
                      </svg>
                    </div>
                  </motion.div>

                  {/* Cup SVG (Yellow/Peach) */}
                  <motion.div
                    animate={{ rotate: [2, -2, 2], y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 0.5 }}
                    className="z-20 origin-bottom right-0 bottom-0 md:-bottom-1 will-change-transform"
                  >
                    <div className="drop-shadow-xl dark:drop-shadow-[0_10px_15px_rgba(255,255,255,0.07)]">
                      <svg width="70" height="90" viewBox="0 0 70 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="33" y="5" width="4" height="25" rx="2" fill="#D97706"/>
                        <path d="M10 30 L60 30 L50 20 L20 20 Z" fill="#FDE047"/>
                        <path d="M15 30 L55 30 L45 80 L25 80 Z" fill="#FCD34D"/>
                        <path d="M18 45 L52 45 L49 60 L21 60 Z" fill="#FBBF24"/>
                      </svg>
                    </div>
                  </motion.div>

                  {/* Sparkle 1 */}
                  <motion.div 
                    animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8], rotate: [0, 90, 180] }} 
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }} 
                    className="absolute top-6 right-2 text-[#FBBF24] z-30"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
                    </svg>
                  </motion.div>

                  {/* Sparkle 2 */}
                  <motion.div 
                    animate={{ opacity: [0, 1, 0], scale: [0.6, 1, 0.6], rotate: [180, 90, 0] }} 
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 1 }} 
                    className="absolute top-2 right-12 text-[#FCD34D] z-30"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
                    </svg>
                  </motion.div>

                </div>

              </div>
            </motion.div>

            {/* 4. Horizontal Scroll Categories */}
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.06 } }
              }}
              className="flex overflow-x-auto gap-2 px-4 mb-6 hide-scrollbar pb-1 sticky top-14 md:top-[calc(env(safe-area-inset-top)+3.5rem)] z-30 bg-gray-50/95 dark:bg-black/95 pt-2"
            >
              {CATEGORIES.map(category => (
                <motion.button
                  key={category.id}
                  variants={{
                    hidden: { opacity: 0, scale: 0.8 },
                    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25 } }
                  }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setActiveCategory(category.id)}
                  className={`whitespace-nowrap px-5 py-2 text-sm font-medium transition-colors ${
                    activeCategory === category.id 
                      ? 'bg-orange-500 text-white rounded-full shadow-md' 
                      : 'bg-white text-gray-600 hover:bg-orange-50 hover:text-orange-600 rounded-full border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                  }`}
                >
                  {i18n.language === 'en' ? (
                    category.id === 'ทั้งหมด' ? 'All' :
                    category.id === 'เครื่องดื่ม' ? 'Drinks' :
                    category.id === 'ของกินเล่น' ? 'Snacks' :
                    category.id === 'ของใช้' ? 'Utilities' : category.id
                  ) : category.id}
                </motion.button>
              ))}
            </motion.div>

            {/* 5. Product Grid */}
            <div className="mt-2">
              {isLoading ? (
                <div className="flex flex-col justify-center items-center h-64 gap-4 text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                </div>
              ) : products?.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col justify-center items-center h-64 gap-4 text-gray-400"
                >
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-2">
                    <PackageOpen className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="font-medium text-sm text-gray-500">{t('no_products')}</p>
                </motion.div>
              ) : (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 px-4"
                >
                  {products?.filter(p => activeCategory === 'ทั้งหมด' || p.category === activeCategory).map((product) => {
                    const cartItem = cartItems.find(item => item.id === product.id);
                    const quantityInCart = cartItem?.quantity || 0;

                    return (
                    <motion.div key={product.id} variants={itemVariants} whileTap={{ scale: 0.96 }}>
                      <div 
                        className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col h-full overflow-hidden group relative cursor-pointer dark:bg-gray-800 dark:border-gray-800"
                        onClick={() => setSelectedProduct(product)}
                      >
                        
                        <div className="w-full aspect-square bg-orange-50/50 dark:bg-gray-900 relative overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <img 
                              src={getOptimizedImageUrl(product.image_url, 400, 80)} 
                              alt={product.name_th} 
                              className={`absolute inset-0 w-full h-full object-contain ${product.stock === 0 ? 'grayscale opacity-60' : ''}`}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                              {t('no_image')}
                            </div>
                          )}
                          
                          {/* SALE Badge */}
                          {product.sale_price && (
                            <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm z-10">
                              {i18n.language === 'en' ? 'SALE' : 'ราคาพิเศษ'}
                            </div>
                          )}
                          
                          {/* Out of stock badge */}
                          {product.stock === 0 && (
                            <div className="absolute inset-0 bg-white/40 dark:bg-black/60 flex items-center justify-center z-10">
                              <span className="bg-gray-900/95 text-white px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider">
                                {i18n.language === 'en' ? 'OUT OF STOCK' : 'สินค้าหมด'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="p-3 flex-1 flex flex-col bg-orange-50 dark:bg-gray-800/80">
                          <h3 className="text-[13px] md:text-sm font-medium text-gray-800 leading-snug line-clamp-2 min-h-[2.75rem] md:min-h-[3rem] dark:text-gray-100">
                            {i18n.language === 'en' && product.name_en ? product.name_en : product.name_th}
                          </h3>
                          
                          <div className="mt-auto pt-3 flex items-end justify-between">
                            <div className="flex flex-col">
                              {product.sale_price ? (
                                <div className="flex items-center gap-1.5 flex-wrap min-h-[28px]">
                                  <span className="text-orange-600 font-bold text-lg md:text-xl leading-none">฿{product.sale_price.toLocaleString()}</span>
                                  <span className="font-medium text-gray-400 text-sm line-through">฿{product.price.toLocaleString()}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 flex-wrap min-h-[28px] pb-[2px]">
                                  <span className="text-gray-600 dark:text-gray-300 font-bold text-lg md:text-xl leading-none">฿{product.price.toLocaleString()}</span>
                                </div>
                              )}
                            </div>

                            {/* Add Button */}
                            <div 
                              className="flex items-center z-20 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                            {quantityInCart === 0 ? (
                              <motion.button 
                                whileTap={{ scale: 0.9 }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                                  product.stock === 0 
                                    ? 'bg-gray-200 text-gray-400 dark:bg-gray-700 cursor-not-allowed' 
                                    : 'bg-orange-500 hover:bg-orange-600 text-white transition-colors'
                                }`}
                                onClick={() => product.stock > 0 && addItem(product)}
                                disabled={product.stock === 0}
                              >
                                <Plus className="w-5 h-5" />
                              </motion.button>
                            ) : (
                              <div className="flex items-center bg-orange-500 text-white rounded-full h-8 shadow-sm">
                                <motion.button 
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => quantityInCart > 1 ? updateQuantity(product.id, quantityInCart - 1) : removeItem(product.id)}
                                  className="w-8 h-8 flex items-center justify-center"
                                >
                                  <Minus className="w-4 h-4" />
                                </motion.button>
                                <span className="font-bold text-sm min-w-[20px] text-center">{quantityInCart}</span>
                                <motion.button 
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => quantityInCart < product.stock && updateQuantity(product.id, quantityInCart + 1)}
                                  disabled={quantityInCart >= product.stock}
                                  className={`w-8 h-8 flex items-center justify-center ${quantityInCart >= product.stock ? 'opacity-50' : ''}`}
                                >
                                  <Plus className="w-4 h-4" />
                                </motion.button>
                              </div>
                            )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* 6. Floating Action Buttons (Mobile Only) */}
      {storeStatus === 'open' && (
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50 mb-[env(safe-area-inset-bottom)] pointer-events-none flex items-end justify-between">
        
        {/* Left: Feedback Button */}
        <div className="relative pointer-events-auto flex flex-col items-center">
          {/* Tooltip bubble */}
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={showTooltip ? { opacity: 1, y: [0, -5, 0], scale: 1 } : { opacity: 0, y: 15, scale: 0.9 }}
            transition={showTooltip ? { 
              opacity: { duration: 0.4 },
              scale: { duration: 0.4, type: "spring", stiffness: 300 },
              y: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
            } : {
              duration: 0.4, ease: "easeOut"
            }}
            className="absolute -top-12 left-0 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-200 text-xs font-bold px-3 py-2 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 whitespace-nowrap origin-bottom-left"
          >
            {i18n.language === 'en' ? 'Looking for something?' : 'หาสินค้าไม่เจอใช่ไหม?'}
            {/* Tooltip triangle */}
            <div className="absolute -bottom-1.5 left-5 w-3 h-3 bg-gray-50 dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 rotate-45" />
          </motion.div>

          <button 
            onClick={() => setFeedbackModalOpen(true)}
            className="w-[58px] h-[58px] bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg border border-gray-200 dark:border-gray-700 active:scale-95 transition-transform"
          >
            <Headphones className="w-6 h-6 text-orange-500" />
          </button>
        </div>

        {/* Right: Cart Button */}
        <AnimatePresence>
          {cartItemCount > 0 && (
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="pointer-events-auto"
            >
              <div 
                className="bg-white dark:bg-gray-900 border-2 border-[#FFF4EB] dark:border-gray-800 rounded-[2rem] p-1.5 shadow-[0_8px_30px_rgb(255,100,0,0.12)] flex items-center gap-3 cursor-pointer active:scale-95 transition-transform h-[58px]"
                onClick={() => setCartOpen(true)}
              >
                <div className="flex items-center ml-1">
                  <div className="bg-[#FFF4EB] dark:bg-orange-900/30 w-11 h-11 rounded-full flex items-center justify-center relative">
                    <ShoppingBag className="w-5 h-5 text-orange-500" />
                    <span className="absolute -top-1 -right-1 bg-[#FF4D4D] text-white text-[11px] font-bold min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full border-[1.5px] border-white dark:border-gray-900 shadow-sm">
                      {cartItemCount}
                    </span>
                  </div>
                  <div className="ml-2.5 flex flex-col justify-center min-w-[2.5rem]">
                    <span className="text-[10px] text-gray-400 dark:text-gray-400 font-medium leading-none mb-1 text-center">{i18n.language === 'en' ? 'Total' : 'ราคารวม'}</span>
                    <span className="text-[15px] font-bold text-[#0B1C33] dark:text-white leading-none tracking-tight">฿{cartTotal.toLocaleString()}</span>
                  </div>
                </div>
                <div className="bg-[#FF7A00] text-white h-full px-5 rounded-[2rem] font-bold text-[13px] flex items-center gap-1.5">
                  {i18n.language === 'en' ? 'Cart' : 'ดูตะกร้า'}
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* Modals outside grayscale */}
      <CartDrawer />
      <ProductDetailsModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        product={selectedProduct} 
      />
      <FeedbackModal 
        isOpen={isFeedbackModalOpen} 
        onClose={() => setFeedbackModalOpen(false)} 
      />
      <MyOrdersModal
        isOpen={isMyOrdersModalOpen}
        onClose={() => setMyOrdersModalOpen(false)}
      />
      <AdminAuthModal isOpen={isAdminModalOpen} onClose={() => setAdminModalOpen(false)} />
    </div>
  );
};
