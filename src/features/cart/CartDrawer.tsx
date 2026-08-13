import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCartStore } from '../../store/useCartStore';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Minus, Plus, Trash2, ShoppingCart, X } from 'lucide-react';
import generatePayload from 'promptpay-qr';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { useQueryClient } from '@tanstack/react-query';

export const CartDrawer: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const queryClient = useQueryClient();
  const { items, isCartOpen, setCartOpen, updateQuantity, removeItem, getCartTotal, clearCart, syncPrices } = useCartStore();
  
  const [roomNumber, setRoomNumber] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  
  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isCouponExpanded, setIsCouponExpanded] = useState(false);
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'promptpay' | 'cod'>('promptpay');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  // Modal states
  const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isCodModalOpen, setCodModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [promptPayId, setPromptPayId] = useState('0000000000'); // Fallback while loading

  React.useEffect(() => {
    if (isCartOpen || isCheckoutModalOpen) {
      const fetchSettings = async () => {
        try {
          const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('id', 'promptpay_id')
            .single();
          
          if (!error && data?.value) {
            setPromptPayId(data.value);
          } else if (error) {
            console.error('Supabase error fetching promptpay settings:', error);
          }
        } catch (err) {
          console.error('Error fetching promptpay settings:', err);
        }
      };
      fetchSettings();
    }
    
    // Sync cart items with latest DB prices to prevent checking out with old prices
    if (isCartOpen && items.length > 0) {
      const syncCartPrices = async () => {
        const itemIds = items.map(item => item.id);
        const { data, error } = await supabase.from('products').select('*').in('id', itemIds);
        if (!error && data) {
          syncPrices(data);
        }
      };
      syncCartPrices();
    }
  }, [isCartOpen, isCheckoutModalOpen]);

  const handleCheckout = async () => {
    if (!roomNumber.trim()) {
      setError(t('room_number') + ' is required');
      return;
    }
    setError('');

    // Validation: Limit per room for coupon
    if (appliedCoupon && appliedCoupon.limit_per_room) {
      setIsSubmitting(true);
      const cleanRoomNumber = roomNumber.replace(/^(ห้อง|room)\s*/i, '').trim();
      const { data: hasUsed } = await supabase.rpc('check_coupon_usage', {
        p_room: cleanRoomNumber,
        p_code: appliedCoupon.code
      });
        
      setIsSubmitting(false);
      if (hasUsed) {
        setCouponError(isEn ? 'This room has already used this coupon code.' : 'ห้องนี้เคยใช้โค้ดส่วนลดนี้ไปแล้ว');
        setAppliedCoupon(null);
        setIsCouponExpanded(true);
        return;
      }
    }
    
    // Close cart drawer first so the payment modal is clearly visible
    setCartOpen(false);
    
    // Slight delay to allow the drawer to animate down before modal pops up (optional, but good for UX)
    setTimeout(() => {
      if (paymentMethod === 'promptpay') {
        setCheckoutModalOpen(true);
      } else {
        setCodModalOpen(true);
      }
    }, 300);
  };

  const submitOrder = async () => {
    setIsSubmitting(true);
    try {
      // Strip "ห้อง" or "room" prefix if user typed it, to prevent double prefix in Edge Function
      const cleanRoomNumber = roomNumber.replace(/^(ห้อง|room)\s*/i, '').trim();

      // Transform items to the format expected by the RPC
      const orderItemsJson = items.map(item => ({
        product_id: item.id,
        quantity: item.quantity
      }));

      // Validation is already done in handleCheckout, but we keep a fallback check just in case
      if (appliedCoupon && appliedCoupon.limit_per_room) {
        const { data: hasUsed } = await supabase.rpc('check_coupon_usage', {
          p_room: cleanRoomNumber,
          p_code: appliedCoupon.code
        });
          
        if (hasUsed) {
          setCouponError(isEn ? 'This room has already used this coupon code.' : 'ห้องนี้เคยใช้โค้ดส่วนลดนี้ไปแล้ว');
          setAppliedCoupon(null);
          setIsCouponExpanded(true);
          setCartOpen(true);
          setCheckoutModalOpen(false);
          setCodModalOpen(false);
          setIsSubmitting(false);
          return;
        }
      }

      // Calculate final discount amount to send to backend
      let finalDiscountAmount = 0;
      if (appliedCoupon) {
        const subtotal = getCartTotal();
        if (appliedCoupon.discount_type === 'percent') {
          finalDiscountAmount = subtotal * (appliedCoupon.discount_value / 100);
        } else {
          finalDiscountAmount = appliedCoupon.discount_value;
        }
        if (finalDiscountAmount > subtotal) finalDiscountAmount = subtotal;
      }

      // Call the Secure RPC function to handle calculation and insertion on the server
      const { data: trackingCode, error: orderError } = await supabase.rpc('place_order_secure', {
        p_room_number: cleanRoomNumber,
        p_note: note || null,
        p_payment_method: paymentMethod,
        p_phone: paymentMethod === 'cod' ? phoneNumber : null,
        p_items: orderItemsJson,
        p_coupon_code: appliedCoupon ? appliedCoupon.code : null,
        p_discount_amount: finalDiscountAmount
      });

      if (orderError) throw orderError;

      if (trackingCode) {
        // Read existing array or initialize empty
        const stored = localStorage.getItem('tap2room_active_orders');
        let activeOrders: string[] = [];
        try {
          if (stored) activeOrders = JSON.parse(stored);
        } catch(e) {}
        
        // Add new tracking code if not exists
        if (!activeOrders.includes(trackingCode)) {
          activeOrders.push(trackingCode);
          localStorage.setItem('tap2room_active_orders', JSON.stringify(activeOrders));
        }
        
        // Force an event so other components (like HomePage or MyOrdersModal) can detect the change
        window.dispatchEvent(new Event('tap2room_order_placed'));
      }

      // Note: Stock is now deducted securely inside the place_order_secure RPC.

      // Manually trigger product refetch to update stock on screen immediately
      queryClient.invalidateQueries({ queryKey: ['products'] });

      setOrderSuccess(true);
      setTimeout(() => {
        clearCart();
        setCartOpen(false);
        setCheckoutModalOpen(false);
        setCodModalOpen(false);
        setOrderSuccess(false);
        setRoomNumber('');
        setNote('');
        setPhoneNumber('');
        setAppliedCoupon(null);
        setCouponCode('');
        // We will just let the success animation show and close the cart automatically.
      }, 3000);

    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('relation "activity_logs" does not exist')) {
        setError('Error: Please run the SQL command to create the activity_logs table.');
      } else if (err.message && err.message.includes('column "payment_method" of relation "orders" does not exist')) {
        setError('Error: Please run the SQL command to add payment columns to orders table.');
      } else {
        setError(`Error: ${err.message || JSON.stringify(err)}`);
      }
      // Re-open cart drawer if error
      setCartOpen(true);
      setCheckoutModalOpen(false);
      setCodModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodConfirm = () => {
    if (!phoneNumber.trim() || phoneNumber.length < 9) {
      setPhoneError(t('invalid_phone_error'));
      return;
    }
    setPhoneError('');
    submitOrder();
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError('');
    
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase().trim())
      .eq('is_active', true)
      .single();

    setIsApplyingCoupon(false);
    
    if (error || !data) {
      setCouponError(isEn ? 'Invalid or expired coupon' : 'โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุ');
      return;
    }
    
    // Check usage limit
    if (data.usage_limit !== null && data.used_count >= data.usage_limit) {
      setCouponError(isEn ? 'Coupon usage limit reached' : 'โค้ดส่วนลดถูกใช้ครบตามจำนวนแล้ว');
      return;
    }
    
    // Check min purchase
    const currentSubtotal = getCartTotal();
    if (data.min_purchase && currentSubtotal < data.min_purchase) {
      setCouponError(isEn ? `Minimum purchase of ฿${data.min_purchase} required` : `ต้องซื้อขั้นต่ำ ฿${data.min_purchase}`);
      return;
    }
    
    // Check start date
    if (data.start_date) {
      const startDate = new Date(data.start_date);
      startDate.setHours(0, 0, 0, 0);
      if (startDate > new Date()) {
        setCouponError(isEn ? 'Coupon is not yet valid' : 'โค้ดส่วนลดนี้ยังไม่ถึงเวลาใช้งาน');
        return;
      }
    }

    // Check expiration date
    if (data.end_date) {
      const endDate = new Date(data.end_date);
      endDate.setHours(23, 59, 59, 999);
      if (endDate < new Date()) {
        setCouponError(isEn ? 'Coupon expired' : 'โค้ดส่วนลดหมดอายุแล้ว');
        return;
      }
    }
    
    setAppliedCoupon(data);
    setCouponCode('');
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const subtotal = getCartTotal();
  const originalTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const hasDiscount = originalTotal > subtotal;
  
  let finalDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percent') {
      finalDiscount = subtotal * (appliedCoupon.discount_value / 100);
    } else {
      finalDiscount = appliedCoupon.discount_value;
    }
    if (finalDiscount > subtotal) finalDiscount = subtotal;
  }
  
  const total = subtotal - finalDiscount;
  
  const qrPayload = generatePayload(promptPayId, { amount: total });

  return (
    <>
      <BottomSheet
        isOpen={isCartOpen}
        onClose={() => setCartOpen(false)}
        title={t('cart')}
        bgClass="bg-[#FFFDF9] dark:bg-gray-900"
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-gray-400">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="font-medium text-lg text-gray-500">{t('cart_empty_title')}</p>
            <p className="text-sm mt-1">{t('cart_empty_subtitle')}</p>
          </div>
        ) : (
          <div className="flex flex-col h-full relative">
            {/* Scrollable item list */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-6">
              <div className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, x: -20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, x: 20, height: 0, padding: 0, margin: 0, border: 0 }}
                    className="flex items-center gap-4 bg-white dark:bg-ios-darkCard p-3 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-50 dark:border-gray-800"
                  >
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden flex-shrink-0 relative">
                      {item.image_url ? (
                        <img src={getOptimizedImageUrl(item.image_url, 150, 70)} alt="" className="absolute inset-0 w-full h-full object-contain" />
                      ) : (
                        <div className="absolute inset-0 flex justify-center items-center text-[10px] text-gray-400">No Img</div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-semibold text-sm line-clamp-1 text-gray-800 dark:text-gray-100">
                        {i18n.language === 'en' && item.name_en ? item.name_en : item.name_th}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.sale_price ? (
                          <>
                            <span className="text-gray-400 line-through text-xs font-medium">฿{item.price.toLocaleString()}</span>
                            <span className="text-ios-primary font-bold">฿{item.sale_price.toLocaleString()}</span>
                          </>
                        ) : (
                          <span className="text-ios-primary font-bold">฿{item.price.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-full px-1 py-1 border border-gray-200/50 dark:border-gray-700">
                      <button 
                        onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                      >
                        {item.quantity > 1 ? <Minus className="w-4 h-4 text-gray-600 dark:text-gray-300" /> : <Trash2 className="w-4 h-4 text-ios-danger" />}
                      </button>
                      <span className="w-4 text-center font-bold text-sm">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus className={`w-4 h-4 ${item.quantity >= item.stock ? 'text-gray-300' : 'text-gray-600 dark:text-gray-300'}`} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              </div>
            </div>

            {/* Fade effect for scroll */}
            <div className="w-full h-10 bg-gradient-to-t from-[#FFFDF9] dark:from-gray-900 to-transparent pointer-events-none -mt-10 z-10 relative" />

            {/* Pinned checkout section - always visible at bottom */}
            <motion.div layout className="relative z-20 flex-shrink-0 border-t border-orange-100/50 dark:border-gray-800 px-6 pt-3 pb-5 bg-[#FFFDF9] dark:bg-gray-900 flex flex-col gap-3">
              <motion.div layout className="flex gap-3 items-end">
                <div className="w-[35%] flex flex-col gap-1">
                  <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 truncate">{t('room_number')}</label>
                  <select
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className={`w-full bg-gray-50 dark:bg-gray-800 border ${error ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl px-3 h-11 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-ios-primary/20 focus:border-ios-primary transition-all shadow-sm outline-none appearance-none`}
                  >
                    <option value="" disabled>{t('select_room_placeholder')}</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16].map(num => (
                      <option key={num} value={`ห้อง ${num}`}>ห้อง {num}</option>
                    ))}
                    <option value="ห้องล่างสุด">ห้องล่างสุด</option>
                  </select>
                </div>
                <div className="w-[65%] flex flex-col gap-1">
                  <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 truncate">หมายเหตุ (เช่น เคาะประตู)</label>
                  <input 
                    placeholder="Optional..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 h-11 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-ios-primary/20 focus:border-ios-primary transition-all shadow-sm outline-none"
                  />
                </div>
              </motion.div>
              {error && <span className="text-xs font-bold text-red-500 -mt-2">{error}</span>}

              {/* Payment Method Selector */}
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">{t('payment_method_title')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('promptpay')}
                    className={`flex items-center justify-center gap-1.5 h-11 rounded-xl border-2 transition-all ${
                      paymentMethod === 'promptpay' 
                        ? 'border-ios-primary bg-orange-50 dark:bg-ios-primary/10 text-ios-primary font-bold' 
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 font-semibold'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <span className="text-[13px]">{t('scan_to_pay')}</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('cod')}
                    className={`flex items-center justify-center gap-1.5 h-11 rounded-xl border-2 transition-all ${
                      paymentMethod === 'cod' 
                        ? 'border-green-500 bg-green-50 dark:bg-green-500/10 text-green-600 font-bold' 
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 font-semibold'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-[13px]">{t('cash_on_delivery')}</span>
                  </button>
                </div>
              </div>

              {/* Promo Code Section */}
              <motion.div layout className="flex flex-col gap-1 mt-1 border-t border-gray-100 dark:border-gray-800 pt-3">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => !appliedCoupon && setIsCouponExpanded(!isCouponExpanded)}>
                  <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 pointer-events-none">{isEn ? 'Promo Code' : 'โค้ดส่วนลด'}</label>
                  {!appliedCoupon && !isCouponExpanded && (
                    <button 
                      type="button"
                      className="text-ios-primary text-xs font-bold bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg"
                    >
                      {isEn ? '+ Add Code' : '+ ใส่โค้ดส่วนลด'}
                    </button>
                  )}
                </div>
                
                <AnimatePresence>
                  {appliedCoupon ? (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2.5 mt-1"
                    >
                      <div className="flex items-center gap-2">
                        <div className="bg-green-500 text-white p-1 rounded-full"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>
                        <span className="font-bold text-green-700 dark:text-green-400 text-sm">{appliedCoupon.code}</span>
                        <span className="text-xs text-green-600 dark:text-green-500">(-฿{finalDiscount.toLocaleString()})</span>
                      </div>
                      <button onClick={removeCoupon} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ) : isCouponExpanded ? (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder={isEn ? "Enter code" : "ใส่โค้ดส่วนลด"}
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className={`flex-1 bg-gray-50 dark:bg-gray-800 border ${couponError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl px-3 h-11 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-ios-primary/20 focus:border-ios-primary transition-all outline-none`}
                        />
                        <button 
                          onClick={applyCoupon}
                          disabled={!couponCode.trim() || isApplyingCoupon}
                          className="bg-ios-primary hover:bg-orange-600 text-white font-bold px-4 rounded-xl h-11 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isApplyingCoupon ? '...' : (isEn ? 'Apply' : 'ใช้โค้ด')}
                        </button>
                      </div>
                      {couponError && <p className="text-xs font-bold text-red-500 mt-1.5">{couponError}</p>}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
              
              <div className="flex flex-col gap-1 mt-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                {appliedCoupon && (
                  <div className="flex justify-between items-center text-sm font-bold text-green-600 dark:text-green-400">
                    <span>{isEn ? 'Discount' : 'ส่วนลด'} ({appliedCoupon.code})</span>
                    <span>-฿{finalDiscount.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center text-xl font-extrabold mt-0.5">
                  <span>{t('total')}</span>
                  <div className="flex items-center gap-3">
                    {hasDiscount && (
                      <span className="text-gray-400 line-through text-lg font-medium">฿{originalTotal.toLocaleString()}</span>
                    )}
                    <span className="text-ios-primary text-2xl">฿{total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <Button fullWidth size="lg" onClick={handleCheckout} isLoading={isSubmitting} className="shadow-lg shadow-ios-primary/30 mt-1 font-bold text-lg">
                {t('checkout')}
              </Button>
            </motion.div>
          </div>
        )}
      </BottomSheet>

      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => !orderSuccess && !isSubmitting && setCheckoutModalOpen(false)}
        title={t('pay_now')}
      >
        {orderSuccess ? (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center py-10 gap-6"
          >
            <div className="w-24 h-24 bg-ios-success/20 text-ios-success rounded-full flex items-center justify-center">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-extrabold text-ios-success">{t('order_success')}</h3>
            <p className="text-gray-500 font-medium text-center">
              {i18n.language === 'en' 
                ? 'Your order is confirmed.' 
                : 'ทางเราได้รับออเดอร์แล้ว'}
              <br/>
              <span className="text-sm mt-1 inline-block text-orange-600 dark:text-orange-400">
                {i18n.language === 'en' 
                  ? 'Track your status in "My Orders"' 
                  : 'ติดตามสถานะได้ที่ "ออเดอร์ของฉัน"'}
              </span>
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="text-center px-4 bg-orange-50 dark:bg-orange-900/20 py-3 rounded-xl border border-orange-100 dark:border-orange-800 w-full">
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 leading-relaxed">
                {t('qr_instruction_1')}<br/>
                {t('qr_instruction_2')}<br/>
                <span className="text-red-500 font-bold mt-1 inline-block">{t('qr_instruction_3')}</span>
              </p>
            </div>
            
            <div className="p-5 bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100">
              <QRCodeSVG value={qrPayload} size={220} />
            </div>
            
            <div className="text-center flex flex-col gap-1">
              <p className="text-sm text-gray-500 font-medium tracking-wide uppercase">PromptPay QR</p>
              <p className="font-extrabold text-3xl tracking-tight text-ios-primary">฿{total.toLocaleString()}</p>
              <p className="font-bold text-gray-800 dark:text-gray-200 text-lg mt-1">{t('account_name')}</p>
            </div>
            <Button 
              fullWidth 
              size="lg" 
              onClick={submitOrder}
              isLoading={isSubmitting}
              className="mt-2 font-bold text-lg shadow-md"
            >
              {t('i_have_paid')}
            </Button>
          </div>
        )}
      </Modal>

      {/* COD Modal */}
      <Modal
        isOpen={isCodModalOpen}
        onClose={() => !orderSuccess && !isSubmitting && setCodModalOpen(false)}
        title={t('cash_on_delivery')}
      >
        {orderSuccess ? (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center py-10 gap-6"
          >
            <div className="w-24 h-24 bg-ios-success/20 text-ios-success rounded-full flex items-center justify-center">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-extrabold text-ios-success">{t('order_success')}</h3>
            <p className="text-gray-500 font-medium text-center">
              {i18n.language === 'en' 
                ? 'Your order is confirmed.' 
                : 'ทางเราได้รับออเดอร์แล้ว'}
              <br/>
              <span className="text-sm mt-1 inline-block text-orange-600 dark:text-orange-400">
                {i18n.language === 'en' 
                  ? 'Track your status in "My Orders"' 
                  : 'ติดตามสถานะได้ที่ "ออเดอร์ของฉัน"'}
              </span>
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-6 py-4">
            <div className="text-center px-4 bg-green-50 dark:bg-green-900/20 py-3 rounded-xl border border-green-100 dark:border-green-800">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200 leading-relaxed">
                {t('cod_instruction_1')}<br/>
                {t('cod_instruction_2')}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl flex items-center gap-4">
              <div className="bg-green-100 dark:bg-green-800 p-3 rounded-full text-green-600 dark:text-green-300">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{t('cod_amount_title')}</p>
                <p className="text-xl font-extrabold text-green-600 dark:text-green-400">฿{total.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('phone_number_label')} <span className="text-red-500">*</span></label>
              <input
                type="tel"
                placeholder="08X-XXX-XXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className={`w-full bg-white dark:bg-gray-800 border ${phoneError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-ios-primary/20 focus:border-ios-primary transition-all shadow-sm outline-none`}
              />
              {phoneError && <span className="text-xs font-bold text-red-500">{phoneError}</span>}
              <p className="text-xs text-gray-500 mt-1">{t('phone_number_hint')}</p>
            </div>

            <Button 
              fullWidth 
              size="lg" 
              onClick={handleCodConfirm}
              isLoading={isSubmitting}
              className="mt-2 font-bold text-lg shadow-md !bg-green-500 hover:!bg-green-600"
            >
              {t('confirm_order')}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
};
