import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Button } from '../../components/ui/Button';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, ListChecks, CheckSquare, Square, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useInfiniteQuery, useQueryClient, useQuery } from '@tanstack/react-query';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, subtitle, confirmText, cancelText, isDestructive }: any) => {
  if (typeof window === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", duration: 0.4, bounce: 0.2 }} className="bg-[#f9fafb] dark:bg-gray-800 rounded-3xl w-full max-w-[320px] relative z-10 shadow-2xl flex flex-col p-6 border border-gray-100 dark:border-gray-700/50">
            <div className="flex flex-col items-center text-center">
              {isDestructive ? (
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
              )}
              
              <h3 className="font-extrabold text-[1.15rem] text-gray-900 dark:text-white leading-snug mb-2">
                {title}
              </h3>
              
              {subtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <button 
                onClick={onClose} 
                className="flex-1 py-3.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-colors"
              >
                {cancelText}
              </button>
              <button 
                onClick={() => { onConfirm(); onClose(); }} 
                className={`flex-1 py-3.5 text-white font-bold rounded-2xl transition-colors shadow-sm ${
                  isDestructive 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};


export const OrdersManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const queryClient = useQueryClient();
  
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    orderId: string;
    roomNumber: string;
    action: 'cancelled' | 'completed';
  }>({ isOpen: false, orderId: '', roomNumber: '', action: 'completed' });

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkConfirmState, setBulkConfirmState] = useState(false);

  // Status filter state (persisted in localStorage)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>(() => {
    return (localStorage.getItem('order_status_filter') as any) || 'all';
  });

  const handleSetFilter = (filter: 'all' | 'pending' | 'completed' | 'cancelled') => {
    setStatusFilter(filter);
    localStorage.setItem('order_status_filter', filter);
  };

  const { data: allStatuses } = useQuery({
    queryKey: ['orders_statuses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('status');
      if (error) throw error;
      return data || [];
    }
  });

  const getStatusCount = (status: 'all' | 'pending' | 'completed' | 'cancelled') => {
    if (!allStatuses) return 0;
    if (status === 'all') return allStatuses.length;
    return allStatuses.filter(o => o.status === status).length;
  };

  const toggleExpand = (orderId: string) => {
    const newSet = new Set(expandedOrders);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setExpandedOrders(newSet);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedOrderIds(new Set());
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedOrderIds(newSet);
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['orders_infinite', statusFilter],
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const limit = 20;
      const start = pageParam * limit;
      const end = start + limit - 1;
      
      let query = supabase
        .from('orders')
        .select('*, order_items(*, products(name_th, name_en))')
        .order('created_at', { ascending: false });
        
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
        
      const { data, error } = await query.range(start, end);
        
      if (error) throw error;
      return (data as any[]) || [];
    },
    getNextPageParam: (lastPage: any[], allPages: any[][]) => {
      return lastPage.length === 20 ? allPages.length : undefined;
    }
  });

  const orders = data?.pages.flat() || [];

  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomBoundaryRef = useCallback((node: HTMLDivElement) => {
    if (status === 'pending' || isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [status, isFetchingNextPage, hasNextPage, fetchNextPage]);

  useEffect(() => {
    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        // Invalidate and refetch whenever orders table changes
        queryClient.invalidateQueries({ queryKey: ['orders_infinite'] });
        queryClient.invalidateQueries({ queryKey: ['orders_statuses'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const updateStatus = async (id: string, newStatus: string, room: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    if (!error) {
      // Optimistic UI update or just wait for real-time invalidate
      queryClient.setQueryData(['orders_infinite'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => 
            page.map((order: any) => 
              order.id === id ? { ...order, status: newStatus } : order
            )
          )
        };
      });
      
      // Log activity
      await supabase.from('activity_logs').insert({
        action: 'update_order',
        details: { room, status: newStatus }
      });
    }
  };

  const deleteSelectedOrders = async () => {
    if (selectedOrderIds.size === 0) return;
    const ids = Array.from(selectedOrderIds);
    const { error } = await supabase.from('orders').delete().in('id', ids);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['orders_infinite'] });
      queryClient.invalidateQueries({ queryKey: ['orders_statuses'] });
      setIsSelectionMode(false);
      setSelectedOrderIds(new Set());
      setBulkConfirmState(false);
    } else {
      console.error(error);
    }
  };

  if (status === 'pending') return <div className="text-center p-8 text-gray-500">Loading orders...</div>;

  const groupedOrders = orders.reduce((groups: Record<string, any[]>, order: any) => {
    const d = new Date(order.created_at);
    const dateKey = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(order);
    return groups;
  }, {});

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex flex-col gap-4 mb-2">
        <div className="flex justify-between items-center px-2">
          <h2 className="font-bold text-xl text-gray-900 dark:text-white">{isEn ? 'Manage Orders' : 'จัดการออเดอร์'}</h2>
          <button 
            onClick={toggleSelectionMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${
              isSelectionMode 
                ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50' 
                : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            {isEn ? (isSelectionMode ? 'Cancel Selection' : 'Select Orders') : (isSelectionMode ? 'ยกเลิก' : 'เลือกออเดอร์')}
          </button>
        </div>
        
        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 px-2 snap-x scrollbar-hide items-center">
          <button
            onClick={() => handleSetFilter('all')}
            className={`snap-start whitespace-nowrap px-4 py-2 rounded-full font-semibold text-sm transition-all ${
              statusFilter === 'all' 
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            {isEn ? 'All' : 'ทั้งหมด'} ({getStatusCount('all')})
          </button>
          <button
            onClick={() => handleSetFilter('pending')}
            className={`snap-start whitespace-nowrap px-4 py-2 rounded-full font-semibold text-sm transition-all ${
              statusFilter === 'pending' 
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            {isEn ? 'Pending' : 'กำลังดำเนินการ'} ({getStatusCount('pending')})
          </button>
          <button
            onClick={() => handleSetFilter('completed')}
            className={`snap-start whitespace-nowrap px-4 py-2 rounded-full font-semibold text-sm transition-all ${
              statusFilter === 'completed' 
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            {isEn ? 'Completed' : 'เสร็จสิ้น'} ({getStatusCount('completed')})
          </button>
          <button
            onClick={() => handleSetFilter('cancelled')}
            className={`snap-start whitespace-nowrap px-4 py-2 rounded-full font-semibold text-sm transition-all ${
              statusFilter === 'cancelled' 
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            {isEn ? 'Cancelled' : 'ยกเลิก'} ({getStatusCount('cancelled')})
          </button>
        </div>
      </div>
      
      {orders.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 flex flex-col items-center justify-center text-gray-500">
          <p>{isEn ? 'No orders yet' : 'ยังไม่มีออเดอร์'}</p>
        </div>
      )}
      
      {Object.entries(groupedOrders).map(([date, dateOrders]) => (
        <div key={date} className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-4 px-4 mt-2">
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
            <span className="font-bold text-gray-500 dark:text-gray-400 text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{date}</span>
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
          </div>
          <motion.div 
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.05 } }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2"
          >
          {(dateOrders as any[]).map(order => (
            <motion.div 
              key={order.id} 
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 }
              }}
              onClick={() => {
                if (isSelectionMode) toggleOrderSelection(order.id);
              }}
              style={{ cursor: isSelectionMode ? 'pointer' : 'default' }}
              className={`bg-white dark:bg-gray-800 rounded-3xl p-5 flex flex-col gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)] border transition-all hover:shadow-md relative overflow-hidden ${
                isSelectionMode && selectedOrderIds.has(order.id) 
                  ? 'border-blue-500 bg-blue-50/30 dark:border-blue-500/50 dark:bg-blue-900/10' 
                  : 'border-gray-100 dark:border-gray-800'
              }`}
            >
              {isSelectionMode && (
                <div className="absolute top-4 right-4 z-10 pointer-events-none">
                  {selectedOrderIds.has(order.id) ? (
                    <CheckSquare className="w-6 h-6 text-blue-500 fill-blue-50 dark:fill-blue-900/20" />
                  ) : (
                    <Square className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                  )}
                </div>
              )}
              
              <div className={`flex justify-between items-start border-b border-gray-100 dark:border-gray-700/50 pb-3 ${isSelectionMode ? 'pr-8' : ''}`}>
                <div>
                  <h3 className="font-extrabold text-xl text-gray-900 dark:text-white">
                    {String(order.room_number).startsWith('ห้อง') || String(order.room_number).toLowerCase().startsWith('room') 
                      ? order.room_number 
                      : `ห้อง ${order.room_number}`}
                  </h3>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border
                  ${order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50' : ''}
                  ${order.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50' : ''}
                  ${order.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/50' : ''}
                `}>
                  {order.status.toUpperCase()}
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                {(() => {
                  const items = order.order_items || [];
                  const isExpanded = expandedOrders.has(order.id);
                  const visibleItems = isExpanded ? items : items.slice(0, 2);
                  
                  return (
                    <>
                      <AnimatePresence initial={false}>
                        {visibleItems.map((item: any) => (
                          <motion.div 
                            key={item.id} 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex justify-between items-start gap-4 text-sm overflow-hidden"
                          >
                            <span className="line-clamp-2 text-gray-800 dark:text-gray-200 leading-snug py-0.5">
                              {item.quantity}x {isEn && item.products?.name_en ? item.products.name_en : (item.products?.name_th || 'Product')}
                            </span>
                            <span className="font-semibold shrink-0 py-0.5">฿{item.price * item.quantity}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {items.length > 2 && (
                        <button 
                          onClick={() => toggleExpand(order.id)}
                          className="text-gray-900 dark:text-white text-xs font-bold flex items-center gap-1 mt-1 hover:underline transition-all"
                        >
                          {isExpanded ? (
                            <><ChevronUp className="w-3 h-3" /> {isEn ? 'Show less' : 'แสดงน้อยลง'}</>
                          ) : (
                            <><ChevronDown className="w-3 h-3" /> {isEn ? `+${items.length - 2} more items` : `ดูเพิ่มเติมอีก ${items.length - 2} รายการ`}</>
                          )}
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
              
              {order.note && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                  <span className="font-bold">Note:</span> {order.note}
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">{isEn ? 'Payment:' : 'ช่องทางชำระ:'}</span>
                  <span className={`font-bold ${order.payment_method === 'cod' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {order.payment_method === 'cod' ? (isEn ? '💵 Cash on Delivery' : '💵 จ่ายเงินปลายทาง') : (isEn ? '💳 PromptPay' : '💳 สแกนจ่าย')}
                  </span>
                </div>
                {order.payment_method === 'cod' && order.phone && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">{isEn ? 'Phone:' : 'เบอร์ติดต่อ:'}</span>
                    <a href={`tel:${order.phone}`} className="font-bold text-ios-primary hover:underline flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {order.phone}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-1 font-bold">
                <span>{isEn ? 'Total' : 'ยอดรวม'}</span>
                <span className="text-ios-primary text-lg">฿{order.total_amount}</span>
              </div>

              {order.status === 'pending' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                  <Button 
                    variant="secondary" 
                    className="flex-1 !rounded-xl !bg-rose-50 !text-rose-600 hover:!bg-rose-100 dark:!bg-rose-900/20 dark:!text-rose-400 dark:hover:!bg-rose-900/40"
                    onClick={() => setConfirmState({ isOpen: true, orderId: order.id, roomNumber: order.room_number, action: 'cancelled' })}
                  >
                    {isEn ? 'Cancel' : 'ยกเลิก'}
                  </Button>
                  <Button 
                    className="flex-1 !rounded-xl !bg-emerald-500 focus:ring-emerald-500/50 hover:bg-emerald-600 shadow-md px-1"
                    onClick={() => setConfirmState({ isOpen: true, orderId: order.id, roomNumber: order.room_number, action: 'completed' })}
                  >
                    {t('delivered_successfully')}
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
          </motion.div>
        </div>
      ))}
      
      {hasNextPage && (
        <div ref={bottomBoundaryRef} className="py-8 flex justify-center">
          {isFetchingNextPage ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ios-primary"></div>
          ) : (
            <div className="h-8"></div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isSelectionMode && selectedOrderIds.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
          >
            <button 
              onClick={() => setBulkConfirmState(true)}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-3 rounded-full shadow-[0_8px_30px_rgb(239,68,68,0.3)] flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap"
            >
              <Trash2 className="w-5 h-5" />
              {isEn ? `Delete ${selectedOrderIds.size} Orders` : `ลบ ${selectedOrderIds.size} รายการ`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={bulkConfirmState}
        onClose={() => setBulkConfirmState(false)}
        onConfirm={deleteSelectedOrders}
        title={isEn ? 'Delete Selected Orders?' : 'ลบออเดอร์ที่เลือก?'}
        subtitle={isEn ? `You are about to permanently delete ${selectedOrderIds.size} orders. This action cannot be undone.` : `คุณกำลังจะลบออเดอร์ถาวรจำนวน ${selectedOrderIds.size} รายการ ข้อมูลนี้จะไม่สามารถกู้คืนได้`}
        confirmText={isEn ? 'Delete All' : 'ลบทิ้งทั้งหมด'}
        cancelText={isEn ? 'Cancel' : 'ยกเลิก'}
        isDestructive={true}
      />

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => updateStatus(confirmState.orderId, confirmState.action, confirmState.roomNumber)}
        title={confirmState.action === 'cancelled' ? t('confirm_cancel_order') : t('confirm_complete_order')}
        subtitle={
          confirmState.action === 'cancelled'
            ? (isEn ? 'This action cannot be undone.' : 'ข้อมูลจะถูกลบออกจากระบบทันที')
            : (isEn ? 'Confirm delivery of this order.' : 'ยืนยันการจัดส่งสินค้านี้')
        }
        confirmText={isEn ? 'Confirm' : 'ยืนยัน'}
        cancelText={isEn ? 'Cancel' : 'ยกเลิก'}
        isDestructive={confirmState.action === 'cancelled'}
      />
    </div>
  );
};
