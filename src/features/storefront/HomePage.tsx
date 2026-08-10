import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useCartStore } from '../../store/useCartStore';
import type { Product } from '../../store/useCartStore';
import { Plus, Minus, ShoppingBag, PackageOpen } from 'lucide-react';
import { CartDrawer } from '../cart/CartDrawer';
import { AdminAuthModal } from '../admin/AdminAuthModal';
import { ProductDetailsModal } from './ProductDetailsModal';
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
  const addItem = useCartStore(state => state.addItem);
  const removeItem = useCartStore(state => state.removeItem);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const cartItems = useCartStore(state => state.items);
  const setCartOpen = useCartStore(state => state.setCartOpen);
  const getCartTotal = useCartStore(state => state.getCartTotal);
  
  const [isAdminModalOpen, setAdminModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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
  }, []);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Product[];
    }
  });

  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = getCartTotal();

  // Changed to 1 click as requested for easier dev access
  const handleLogoClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate('/admin');
    } else {
      setAdminModalOpen(true);
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
    <div className="max-w-7xl mx-auto min-h-screen bg-white dark:bg-black relative pb-24 shadow-2xl overflow-hidden">
      
      {/* 2. Sticky Glassmorphism Header */}
      <header className="fixed top-0 w-full max-w-7xl z-40 bg-white/70 dark:bg-black/70 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 pt-[48px] md:pt-[env(safe-area-inset-top)]">
        <div className="flex justify-between items-center h-14 px-4 md:px-8">
          {/* Empty spacer on mobile, hidden on desktop */}
          <div className="w-10 md:hidden"></div>
          
          <h1 
            className="text-lg md:text-xl font-extrabold tracking-tight cursor-pointer select-none bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0"
            onClick={handleLogoClick}
          >
            {t('app_name')}
          </h1>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => i18n.changeLanguage(i18n.language === 'th' ? 'en' : 'th')}
              className="text-[10px] md:text-xs font-bold bg-gray-100 dark:bg-gray-800 px-3 py-1.5 md:py-2 rounded-full hover:bg-gray-200 transition-colors shadow-sm text-gray-700 dark:text-gray-200"
            >
              {i18n.language.toUpperCase()}
            </button>
            
            {/* Desktop Cart Button */}
            <button 
              onClick={() => setCartOpen(true)}
              className="hidden md:flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-1.5 rounded-full hover:bg-gray-800 transition-colors shadow-sm relative"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="text-sm font-bold">{t('cart')}</span>
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content padding-top to account for fixed header + safe area */}
      <main className="pt-[104px] md:pt-[calc(env(safe-area-inset-top)+4rem)]">
        
        {/* 3. Hero / Welcome Banner */}
        <div className="px-4 md:px-8 mb-6">
          <div className="rounded-[2rem] bg-gradient-to-br from-blue-50 via-white to-blue-50/50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 p-6 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden">
            <div className="relative z-10 md:max-w-lg">
              <h2 className="text-2xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2 md:mb-4 leading-tight">
                {t('hero_title_1')} <br className="md:hidden" />{t('hero_title_2')}
              </h2>
              <p className="text-sm md:text-base font-medium text-gray-600 dark:text-gray-300 mt-2">
                {t('hero_subtitle')}
              </p>
            </div>
            {/* Decorative shape */}
            <div className="absolute -right-6 -bottom-6 md:right-10 md:-bottom-20 w-32 md:w-64 h-32 md:h-64 bg-blue-200/50 dark:bg-gray-700/50 rounded-full blur-2xl md:blur-3xl"></div>
          </div>
        </div>

        {/* 4. Horizontal Scroll Categories */}
        <div className="flex overflow-x-auto gap-3 px-4 md:px-8 pb-4 hide-scrollbar sticky top-[104px] md:top-[calc(env(safe-area-inset-top)+3.5rem)] z-30 bg-white/90 dark:bg-black/90 backdrop-blur-sm py-2">
          {CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-semibold transition-all transform active:scale-95 ${
                activeCategory === category.id 
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t(category.key)}
            </button>
          ))}
        </div>

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
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 px-4 md:px-8"
            >
              {products?.filter(p => activeCategory === 'ทั้งหมด' || p.category === activeCategory).map((product) => {
                const cartItem = cartItems.find(item => item.id === product.id);
                const quantityInCart = cartItem?.quantity || 0;

                return (
                <motion.div key={product.id} variants={itemVariants} whileTap={{ scale: 0.96 }}>
                  <div 
                    className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-3xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-800 relative group overflow-hidden cursor-pointer transition-shadow"
                    onClick={() => setSelectedProduct(product)}
                  >
                    
                    <div className="aspect-square bg-gray-50 dark:bg-gray-900 relative">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name_th} 
                          className="w-full h-full object-cover rounded-t-2xl"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          {t('no_image')}
                        </div>
                      )}
                      
                      {/* Stock Badges */}
                      {product.stock <= 5 && product.stock > 0 && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                          {product.stock} {t('stock_left')}
                        </div>
                      )}
                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center rounded-t-2xl z-10">
                          <span className="bg-gray-900 text-white px-3 py-1 rounded-full text-[10px] font-bold">{t('sold_out')}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex-1 flex flex-col gap-2">
                      <h3 className="font-semibold text-sm line-clamp-2 text-gray-800 dark:text-gray-100 leading-normal min-h-[3rem]">
                        {i18n.language === 'en' && product.name_en ? product.name_en : product.name_th}
                      </h3>
                      
                      <div className="mt-auto flex items-end justify-between gap-2">
                        <div className="flex flex-col">
                          {product.sale_price ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-lg leading-none text-ios-primary dark:text-blue-400">฿{product.sale_price.toLocaleString()}</span>
                              <span className="font-medium text-gray-400 text-xs line-through">฿{product.price.toLocaleString()}</span>
                            </div>
                          ) : (
                            <span className="font-extrabold text-lg leading-none text-ios-primary dark:text-blue-400">฿{product.price.toLocaleString()}</span>
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
                            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                              product.stock === 0 
                                ? 'bg-gray-200 text-gray-400 dark:bg-gray-700 cursor-not-allowed' 
                                : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800'
                            }`}
                            onClick={() => product.stock > 0 && addItem(product)}
                            disabled={product.stock === 0}
                          >
                            <Plus className="w-5 h-5" />
                          </motion.button>
                        ) : (
                          <div className="flex items-center bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full h-8 shadow-md">
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
      </main>

      {/* 6. Floating Action Cart (Mobile Only) */}
      <AnimatePresence>
        {cartItemCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[calc(28rem-2rem)] z-50 mb-[env(safe-area-inset-bottom)]"
          >
            <div 
              className="bg-gray-900 dark:bg-gray-800 text-white rounded-full p-1 shadow-2xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform border border-gray-800 dark:border-gray-700"
              onClick={() => setCartOpen(true)}
            >
              <div className="flex items-center">
                <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center relative ml-1">
                  <ShoppingBag className="w-5 h-5 text-white" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-gray-900">
                    {cartItemCount}
                  </span>
                </div>
                <div className="ml-3 flex flex-col">
                  <span className="text-xs text-gray-300 font-medium">{t('total_price')}</span>
                  <span className="text-sm font-bold tracking-wide">฿{cartTotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-white text-gray-900 px-5 py-2.5 rounded-full mr-1 font-bold text-sm flex items-center gap-1">
                {t('checkout')}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer />
      <ProductDetailsModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        product={selectedProduct} 
      />
      <AdminAuthModal isOpen={isAdminModalOpen} onClose={() => setAdminModalOpen(false)} />
    </div>
  );
};
