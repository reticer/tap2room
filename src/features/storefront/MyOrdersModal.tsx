import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ClipboardList, CheckCircle2, PackageSearch, Loader2, Package, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { supabase } from '../../services/supabaseClient';

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({ isOpen, onClose }) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [activeTrackingCodes, setActiveTrackingCodes] = useState<string[]>([]);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const toggleExpand = (orderId: string, index: number) => {
    setExpandedOrders(prev => {
      const isCurrentlyExpanded = prev[orderId] !== undefined ? prev[orderId] : (index === 0);
      return {
        ...prev,
        [orderId]: !isCurrentlyExpanded
      };
    });
  };
  


  // 1. Initialize from localStorage and listen to order placed events
  useEffect(() => {
    const checkActiveOrders = () => {
      const storedStr = localStorage.getItem('tap2room_active_orders');
      if (storedStr) {
        try {
          const codes = JSON.parse(storedStr);
          if (Array.isArray(codes)) {
            // Check if arrays are different
            if (JSON.stringify(codes) !== JSON.stringify(activeTrackingCodes)) {
              setActiveTrackingCodes(codes);
            }
          }
        } catch (e) {
          // Fallback for old single string format
          if (storedStr && !storedStr.startsWith('[')) {
            setActiveTrackingCodes([storedStr]);
            localStorage.setItem('tap2room_active_orders', JSON.stringify([storedStr]));
            localStorage.removeItem('tap2room_active_order'); // Clean up old key
          }
        }
      } else {
        // Check old key just in case
        const oldCode = localStorage.getItem('tap2room_active_order');
        if (oldCode) {
          setActiveTrackingCodes([oldCode]);
          localStorage.setItem('tap2room_active_orders', JSON.stringify([oldCode]));
          localStorage.removeItem('tap2room_active_order');
        } else {
          setActiveTrackingCodes([]);
        }
      }
    };

    if (isOpen) {
      checkActiveOrders();
    }

    // Listen to custom event from CartDrawer
    window.addEventListener('tap2room_order_placed', checkActiveOrders);
    return () => window.removeEventListener('tap2room_order_placed', checkActiveOrders);
  }, [isOpen, activeTrackingCodes]);

  // 2. Initial Fetch
  useEffect(() => {
    if (activeTrackingCodes.length === 0 || !isOpen) {
      if (activeTrackingCodes.length === 0) setOrdersData([]);
      return;
    }

    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*, products(name_th, name_en))')
          .in('tracking_code', activeTrackingCodes)
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error('Failed to fetch orders');
        }

          setOrdersData(data);
          
          // Cleanup codes that don't exist anymore
          let cleanupNeeded = false;
          let remainingCodes = [...activeTrackingCodes];
          
          // Remove codes that weren't found in DB at all
          const foundCodes = data.map(o => o.tracking_code);
          remainingCodes = remainingCodes.filter(code => foundCodes.includes(code));
          if (remainingCodes.length !== activeTrackingCodes.length) cleanupNeeded = true;
          
          if (cleanupNeeded) {
            localStorage.setItem('tap2room_active_orders', JSON.stringify(remainingCodes));
            setActiveTrackingCodes(remainingCodes);
          }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [activeTrackingCodes, isOpen]);

  // 3. Realtime Subscription (Listens to ALL changes on orders table and updates local state if it matches)
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel('public:orders:tracking')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders'
      }, (payload) => {
        // Check if the updated order is in our tracked list
        setOrdersData(prev => {
          const index = prev.findIndex(o => o.id === payload.new.id);
          if (index === -1) return prev;
          
          const newOrders = [...prev];
          newOrders[index] = { ...newOrders[index], ...payload.new };
          return newOrders;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  // 4. (Removed auto-cleanup of completed orders as per user request)



  if (typeof window === 'undefined') return null;

  // Timeline UI Helper
  const getStatusStep = (status: string) => {
    switch(status) {
      case 'pending': return 1;
      case 'preparing': return 2;
      case 'completed': return 3;
      case 'cancelled': return -1;
      default: return 1;
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:items-center sm:justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.1 }}
            className="bg-gray-50 dark:bg-gray-900 rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-lg relative z-10 shadow-lg flex flex-col h-[85vh] sm:h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10 sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center border border-orange-100 dark:border-orange-800">
                  <Package className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-bold text-xl text-gray-900 dark:text-white">
                  {isEn ? 'Track Orders' : 'ติดตามออเดอร์'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto relative p-4 sm:p-6 pb-20">
              {isLoading && ordersData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                  <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                  <p className="text-gray-500 font-medium">{isEn ? 'Searching...' : 'กำลังค้นหาออเดอร์...'}</p>
                </div>
              ) : ordersData.length > 0 ? (
                /* LIVE TRACKING UI (MULTIPLE ORDERS) */
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {ordersData.map((order, index) => {
                    const step = getStatusStep(order.status);
                    const isExpanded = expandedOrders[order.id] !== undefined ? expandedOrders[order.id] : (index === 0);
                    
                    return (
                      <div 
                        key={order.id} 
                        className={`relative rounded-3xl overflow-hidden transition-all duration-500 border-2 ${
                          (order.status === 'completed' || order.status === 'cancelled')
                            ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm'
                            : 'bg-white dark:bg-gray-800 border-orange-100 dark:border-orange-500/30 shadow-[0_8px_24px_rgba(249,115,22,0.08)] dark:shadow-[0_8px_24px_rgba(249,115,22,0.03)]'
                        }`}
                      >
                        {/* Main Content Wrapper (Receives Grayscale Filter) */}
                        <div className={(order.status === 'completed' || order.status === 'cancelled') ? 'opacity-40 grayscale' : ''}>
                          {/* Card Header */}
                          <div 
                            onClick={() => toggleExpand(order.id, index)}
                            className={`p-4 sm:p-5 flex justify-between items-center transition-colors cursor-pointer ${
                              (order.status === 'completed' || order.status === 'cancelled')
                                ? 'bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-800 dark:to-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                : 'bg-gradient-to-b from-orange-50/30 to-white dark:from-gray-800 dark:to-gray-800 hover:bg-orange-50/60 dark:hover:bg-gray-700/50'
                            } ${
                              isExpanded 
                                ? (order.status === 'completed' || order.status === 'cancelled') 
                                  ? 'border-b border-gray-50 dark:border-gray-700/50'
                                  : 'border-b border-orange-50 dark:border-gray-700/50'
                                : ''
                            }`}
                          >
                            <div>
                              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">{isEn ? 'Tracking Code' : 'รหัสติดตาม'}</p>
                              <div className="flex items-center gap-2.5">
                                <p className="font-bold text-lg text-gray-900 dark:text-white leading-none">{order.tracking_code}</p>
                                <div className="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-semibold text-[10px] border border-orange-100 dark:border-orange-800/50 flex items-center gap-1 leading-none">
                                  <span>{isEn ? 'Rm' : 'ห้อง'}</span>
                                  <span>{order.room_number}</span>
                                </div>
                                {!isExpanded && (
                                  <div className={`px-2 py-0.5 rounded-full font-semibold text-[10px] border flex items-center leading-none
                                    ${order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50' : ''}
                                    ${order.status === 'preparing' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50' : ''}
                                    ${order.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50' : ''}
                                    ${order.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/50' : ''}
                                  `}>
                                    {order.status === 'pending' && (isEn ? 'Pending' : 'รับออเดอร์')}
                                    {order.status === 'preparing' && (isEn ? 'Preparing' : 'กำลังเตรียม')}
                                    {order.status === 'completed' && (isEn ? 'Delivered' : 'จัดส่งสำเร็จ')}
                                    {order.status === 'cancelled' && (isEn ? 'Cancelled' : 'ยกเลิก')}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-gray-400 dark:text-gray-500 pl-2">
                              <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                {/* Horizontal Timeline */}
                                <div className="px-4 py-5 sm:px-6 relative overflow-hidden">
                            {order.status === 'cancelled' ? (
                              <div className="flex flex-col items-center justify-center text-center py-2">
                                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2 border border-red-100">
                                  <X className="w-5 h-5" />
                                </div>
                                <h4 className="font-semibold text-red-600 text-sm mb-1">{isEn ? 'Order Cancelled' : 'ออเดอร์ถูกยกเลิก'}</h4>
                                {order.cancelled_at && (
                                  <p className="text-[10px] text-gray-500 font-medium">
                                    {new Date(order.cancelled_at).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="relative">
                                {/* Background Line */}
                                <div className="absolute top-5 left-[16.6%] right-[16.6%] h-1 bg-gray-100 dark:bg-gray-700 rounded-full z-0"></div>
                                
                                {/* Progress Line */}
                                <div 
                                  className="absolute top-5 left-[16.6%] h-1 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full z-0 transition-all duration-700 ease-in-out"
                                  style={{ width: step === 1 ? '0%' : step === 2 ? '33.4%' : '66.8%' }}
                                ></div>
                                
                                <div className="flex justify-between relative z-10">
                                  {/* Step 1: Placed */}
                                  <div className="flex flex-col items-center gap-1.5 w-1/3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border-[2px] transition-all duration-500 bg-white dark:bg-gray-800 relative ${
                                      step === 1 ? 'border-orange-500 text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.3)]' :
                                      step > 1 ? 'border-orange-500 text-orange-500' :
                                      'border-gray-200 text-gray-300 dark:border-gray-600'
                                    }`}>
                                      {step === 1 && (
                                        <div className="absolute inset-0 rounded-full border-2 border-orange-500 animate-ping opacity-30"></div>
                                      )}
                                      <ClipboardList className="w-4 h-4 relative z-10" strokeWidth={2.5} />
                                    </div>
                                    <div className="text-center">
                                      <p className={`text-[11px] font-semibold ${step >= 1 ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                                        {isEn ? 'Placed' : 'รับออเดอร์'}
                                      </p>
                                      <p className="text-[9px] text-gray-400 font-medium mt-0.5">
                                        {new Date(order.created_at).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Step 2: Preparing */}
                                  <div className="flex flex-col items-center gap-1.5 w-1/3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border-[2px] transition-all duration-500 bg-white dark:bg-gray-800 relative ${
                                      step === 1 ? 'border-gray-200 text-gray-300 dark:border-gray-600' :
                                      step === 2 ? 'border-orange-500 text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.3)]' :
                                      'border-orange-500 text-orange-500'
                                    }`}>
                                      {step === 2 && (
                                        <div className="absolute inset-0 rounded-full border-2 border-orange-500 animate-ping opacity-30"></div>
                                      )}
                                      <PackageSearch className="w-4 h-4 relative z-10" strokeWidth={2.5} />
                                    </div>
                                    <div className="text-center">
                                      <p className={`text-[11px] font-semibold ${step >= 2 ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                                        {isEn ? 'Preparing' : 'กำลังเตรียม'}
                                      </p>
                                      {order.preparing_at && step >= 2 && (
                                        <p className="text-[9px] text-gray-400 font-medium mt-0.5">
                                          {new Date(order.preparing_at).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Step 3: Delivered */}
                                  <div className="flex flex-col items-center gap-1.5 w-1/3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border-[2px] transition-all duration-500 bg-white dark:bg-gray-800 ${
                                      step >= 3 ? 'border-green-500 text-green-500' : 'border-gray-200 text-gray-300 dark:border-gray-600'
                                    }`}>
                                      <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                                    </div>
                                    <div className="text-center">
                                      <p className={`text-[11px] font-semibold ${step >= 3 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                        {isEn ? 'Delivered' : 'จัดส่งสำเร็จ'}
                                      </p>
                                      {order.completed_at && step >= 3 && (
                                        <p className="text-[9px] text-gray-400 font-medium mt-0.5">
                                          {new Date(order.completed_at).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Order Details Accordion/Summary */}
                          <div className="bg-gray-50/50 dark:bg-gray-800/50 p-4 border-t border-gray-100 dark:border-gray-700/50">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide">{isEn ? 'Order Summary' : 'รายการสินค้า'}</span>
                              <span className="text-[11px] text-gray-500 font-medium">{order.order_items?.length} items</span>
                            </div>
                            
                            <div className="space-y-1.5 mb-2.5">
                              {order.order_items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span className="text-gray-600 dark:text-gray-400 font-medium line-clamp-1 pr-4">
                                    <span className="text-gray-400 dark:text-gray-500 mr-1.5">{item.quantity}x</span>
                                    {isEn ? item.products?.name_en : item.products?.name_th}
                                  </span>
                                  <span className="font-medium text-gray-800 dark:text-gray-200 shrink-0">฿{item.price * item.quantity}</span>
                                </div>
                              ))}
                            </div>
                            
                            <div className="flex justify-between items-center pt-2.5 border-t border-gray-200/60 dark:border-gray-700 font-bold">
                              <span className="text-sm text-gray-900 dark:text-white">{isEn ? 'Total' : 'ยอดรวม'}</span>
                              <span className="text-base text-orange-600 dark:text-orange-400">฿{order.total_amount}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>


                    );
                  })}
                  
                </div>
              ) : (
                /* EMPTY STATE */
                <div className="flex flex-col items-center justify-center h-full animate-in fade-in pt-10 pb-20">
                  <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 border-4 border-white dark:border-gray-900 shadow-sm relative text-gray-300 dark:text-gray-600">
                    <PackageSearch className="w-10 h-10" />
                  </div>
                  <h4 className="font-bold text-2xl text-gray-900 dark:text-white mb-2">
                    {isEn ? 'No Orders Yet' : 'ตอนนี้ยังไม่มีออเดอร์'}
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-[280px] leading-relaxed">
                    {isEn 
                      ? 'You have not placed any orders recently.' 
                      : 'เมื่อคุณสั่งซื้อสินค้า ออเดอร์ของคุณจะแสดงที่นี่'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
