import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCartStore } from '../../store/useCartStore';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import generatePayload from 'promptpay-qr';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

export const CartDrawer: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { items, isCartOpen, setCartOpen, updateQuantity, removeItem, getCartTotal, clearCart } = useCartStore();
  
  const [roomNumber, setRoomNumber] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'promptpay' | 'cod'>('promptpay');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  // Modal states
  const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isCodModalOpen, setCodModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const PROMPTPAY_ID = "0801234567";

  const handleCheckout = () => {
    if (!roomNumber.trim()) {
      setError(t('room_number') + ' is required');
      return;
    }
    setError('');
    
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
      const totalAmount = getCartTotal();
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          room_number: roomNumber,
          total_amount: totalAmount,
          note: note,
          status: 'pending',
          payment_method: paymentMethod,
          phone: paymentMethod === 'cod' ? phoneNumber : null
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.sale_price ? item.sale_price : item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Log activity
      await supabase.from('activity_logs').insert({
        action: 'place_order',
        details: { room: roomNumber, total: totalAmount, method: paymentMethod }
      });

      // Also deduct stock for each item (in a real app, this should be done securely in a DB function/trigger)
      for (const item of items) {
        await supabase.rpc('decrement_stock', { p_id: item.id, qty: item.quantity });
      }

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

  const total = getCartTotal();
  const qrPayload = generatePayload(PROMPTPAY_ID, { amount: total });

  return (
    <>
      <BottomSheet
        isOpen={isCartOpen}
        onClose={() => setCartOpen(false)}
        title={t('cart')}
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="font-medium text-lg text-gray-500">{t('cart_empty_title')}</p>
            <p className="text-sm mt-1">{t('cart_empty_subtitle')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 h-full">
            <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1 pb-4">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                    className="flex items-center gap-4 bg-white dark:bg-ios-darkCard p-3 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-50 dark:border-gray-800"
                  >
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden flex-shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex justify-center items-center text-[10px] text-gray-400">No Img</div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-semibold text-sm line-clamp-1 text-gray-800 dark:text-gray-100">
                        {i18n.language === 'en' && item.name_en ? item.name_en : item.name_th}
                      </h4>
                      <p className="text-ios-primary font-bold mt-0.5">
                        ฿{item.sale_price ? item.sale_price.toLocaleString() : item.price.toLocaleString()}
                      </p>
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

            <div className="border-t border-gray-100 dark:border-gray-800 pt-5 flex flex-col gap-4 bg-ios-card dark:bg-ios-darkCard sticky bottom-0">
              <div className="flex flex-col gap-4">
                <div className="w-full flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('room_number')}</label>
                  <select
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className={`w-full bg-white dark:bg-gray-800 border ${error ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-ios-primary/20 focus:border-ios-primary transition-all shadow-sm outline-none appearance-none`}
                  >
                    <option value="" disabled>{t('select_room_placeholder')}</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16].map(num => (
                      <option key={num} value={`ห้อง ${num}`}>ห้อง {num}</option>
                    ))}
                    <option value="ห้องล่างสุด">{t('room_lowest')}</option>
                  </select>
                  {error && <span className="text-xs font-bold text-red-500">{error}</span>}
                </div>
                <Input 
                  label={t('order_note')}
                  placeholder="Optional..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Payment Method Selector */}
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('payment_method_title')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('promptpay')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                      paymentMethod === 'promptpay' 
                        ? 'border-ios-primary bg-blue-50 dark:bg-ios-primary/10 text-ios-primary font-bold' 
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 font-semibold'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    {t('scan_to_pay')}
                  </button>
                  <button
                    onClick={() => setPaymentMethod('cod')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                      paymentMethod === 'cod' 
                        ? 'border-green-500 bg-green-50 dark:bg-green-500/10 text-green-600 font-bold' 
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 font-semibold'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {t('cash_on_delivery')}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-xl font-extrabold mt-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                <span>{t('total')}</span>
                <span className="text-ios-primary text-2xl">฿{total.toLocaleString()}</span>
              </div>
              
              <Button fullWidth size="lg" onClick={handleCheckout} className="shadow-lg shadow-ios-primary/30 mt-2 font-bold text-lg">
                {t('checkout')}
              </Button>
            </div>
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
            <p className="text-gray-500 font-medium">Your order has been sent to the admin.</p>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="p-5 bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100">
              <QRCodeSVG value={qrPayload} size={220} />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1 font-medium tracking-wide uppercase">PromptPay QR</p>
              <p className="font-extrabold text-3xl tracking-tight text-ios-primary">฿{total.toLocaleString()}</p>
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
            <p className="text-gray-500 font-medium">Your order has been sent to the admin.</p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-6 py-4">
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
