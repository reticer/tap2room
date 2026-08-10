import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Button } from '../../components/ui/Button';
import { useTranslation } from 'react-i18next';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';

export const OrdersManager: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  
  const [dateFilter, setDateFilter] = useState('all');
  
  // Status filter state (persisted in localStorage)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>(() => {
    return (localStorage.getItem('order_status_filter') as any) || 'all';
  });

  const handleSetFilter = (filter: 'all' | 'pending' | 'completed' | 'cancelled') => {
    setStatusFilter(filter);
    localStorage.setItem('order_status_filter', filter);
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

  const fetchOrders = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name_th, name_en))')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        console.log('New order received!', payload);
        // Just fetch the new orders to update the UI
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (id: string, status: string, room: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (!error) {
      setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
      
      // Log activity
      await supabase.from('activity_logs').insert({
        action: 'update_order',
        details: { room, status }
      });
    }
  };

  if (isLoading) return <div>Loading orders...</div>;

  const filteredByDateOrders = orders.filter(order => {
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.created_at);
      const now = new Date();
      const diffTime = now.getTime() - orderDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (dateFilter === '1d' && diffDays > 1) return false;
      if (dateFilter === '3d' && diffDays > 3) return false;
      if (dateFilter === '7d' && diffDays > 7) return false;
      if (dateFilter === '1m' && diffDays > 30) return false;
    }
    return true;
  });

  const filteredOrders = filteredByDateOrders.filter(order => statusFilter === 'all' || order.status === statusFilter);

  const getStatusCount = (status: 'all' | 'pending' | 'completed' | 'cancelled') => {
    if (status === 'all') return filteredByDateOrders.length;
    return filteredByDateOrders.filter(o => o.status === status).length;
  };

  const groupedOrders = filteredOrders.reduce((groups: Record<string, any[]>, order) => {
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
        <h2 className="font-bold text-xl text-gray-900 dark:text-white px-2">{isEn ? 'Manage Orders' : 'จัดการออเดอร์'}</h2>
        
        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 px-2 snap-x scrollbar-hide items-center">
          {/* Date Filter */}
          <div className="relative shrink-0 flex items-center">
            <div className="absolute left-3 flex items-center pointer-events-none">
              <Filter className="w-4 h-4 text-gray-500" />
            </div>
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-9 pr-8 py-2 rounded-full font-semibold text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 appearance-none focus:ring-2 focus:ring-ios-primary focus:outline-none shadow-sm cursor-pointer"
            >
              <option value="all">{isEn ? 'All Time' : 'ทั้งหมด'}</option>
              <option value="1d">{isEn ? 'Past 1 day' : '1 วันที่ผ่านมา'}</option>
              <option value="3d">{isEn ? 'Past 3 days' : '3 วันที่ผ่านมา'}</option>
              <option value="7d">{isEn ? 'Past 7 days' : '7 วันที่ผ่านมา'}</option>
              <option value="1m">{isEn ? 'Past 1 month' : '1 เดือนที่ผ่านมา'}</option>
            </select>
          </div>
          
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1 shrink-0"></div>

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
      
      {filteredOrders.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 flex flex-col items-center justify-center text-gray-500">
          <p>{isEn ? 'No orders in this status' : 'ไม่มีออเดอร์ในสถานะนี้'}</p>
        </div>
      )}
      
      {Object.entries(groupedOrders).map(([date, dateOrders]) => (
        <div key={date} className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-4 px-4 mt-2">
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
            <span className="font-bold text-gray-500 dark:text-gray-400 text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{date}</span>
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2">
          {(dateOrders as any[]).map(order => (
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-3xl p-5 flex flex-col gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 transition-shadow hover:shadow-md">
          <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700/50 pb-3">
            <div>
              <h3 className="font-extrabold text-xl text-gray-900 dark:text-white">{order.room_number}</h3>
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
                  {visibleItems.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-start gap-4 text-sm">
                      <span className="line-clamp-2 text-gray-800 dark:text-gray-200 leading-snug">
                        {item.quantity}x {isEn && item.products?.name_en ? item.products.name_en : (item.products?.name_th || 'Product')}
                      </span>
                      <span className="font-semibold shrink-0">฿{item.price * item.quantity}</span>
                    </div>
                  ))}
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
                onClick={() => updateStatus(order.id, 'cancelled', order.room_number)}
              >
                {isEn ? 'Cancel' : 'ยกเลิก'}
              </Button>
              <Button 
                className="flex-1 !rounded-xl !bg-emerald-500 focus:ring-emerald-500/50 hover:bg-emerald-600 shadow-md"
                onClick={() => updateStatus(order.id, 'completed', order.room_number)}
              >
                {isEn ? 'Complete' : 'เสร็จสิ้น'}
              </Button>
            </div>
          )}
        </div>
      ))}
      </div>
          </div>
        ))}
    </div>
  );
};
