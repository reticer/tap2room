import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const OrdersManager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Status filter state (persisted in localStorage)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>(() => {
    return (localStorage.getItem('order_status_filter') as any) || 'all';
  });

  const handleSetFilter = (filter: 'all' | 'pending' | 'completed' | 'cancelled') => {
    setStatusFilter(filter);
    localStorage.setItem('order_status_filter', filter);
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

  const filteredOrders = orders.filter(order => statusFilter === 'all' || order.status === statusFilter);

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex flex-col gap-4 mb-2">
        <h2 className="font-bold text-xl text-gray-900 dark:text-white px-2">Recent Orders</h2>
        
        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 px-2 snap-x scrollbar-hide">
          <button
            onClick={() => handleSetFilter('all')}
            className={`snap-start whitespace-nowrap px-4 py-2 rounded-full font-semibold text-sm transition-all ${
              statusFilter === 'all' 
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            ทั้งหมด (All)
          </button>
          <button
            onClick={() => handleSetFilter('pending')}
            className={`snap-start whitespace-nowrap px-4 py-2 rounded-full font-semibold text-sm transition-all ${
              statusFilter === 'pending' 
                ? 'bg-orange-500 text-white shadow-md' 
                : 'bg-white dark:bg-gray-800 text-orange-600 border border-orange-200 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-900/20'
            }`}
          >
            กำลังดำเนินการ (Pending)
          </button>
          <button
            onClick={() => handleSetFilter('completed')}
            className={`snap-start whitespace-nowrap px-4 py-2 rounded-full font-semibold text-sm transition-all ${
              statusFilter === 'completed' 
                ? 'bg-green-500 text-white shadow-md' 
                : 'bg-white dark:bg-gray-800 text-green-600 border border-green-200 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-900/20'
            }`}
          >
            เสร็จสิ้น (Completed)
          </button>
          <button
            onClick={() => handleSetFilter('cancelled')}
            className={`snap-start whitespace-nowrap px-4 py-2 rounded-full font-semibold text-sm transition-all ${
              statusFilter === 'cancelled' 
                ? 'bg-red-500 text-white shadow-md' 
                : 'bg-white dark:bg-gray-800 text-red-600 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20'
            }`}
          >
            ยกเลิก (Cancelled)
          </button>
        </div>
      </div>
      
      {filteredOrders.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 flex flex-col items-center justify-center text-gray-500">
          <p>ไม่มีออเดอร์ในสถานะนี้</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2">
      {filteredOrders.map(order => (
        <Card key={order.id} className="p-4 flex flex-col gap-3">
          <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-2">
            <div>
              <h3 className="font-bold text-lg">Room {order.room_number}</h3>
              <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold 
              ${order.status === 'pending' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : ''}
              ${order.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
              ${order.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
            `}>
              {order.status.toUpperCase()}
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            {order.order_items?.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.products?.name_th || 'Product'}</span>
                <span>฿{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          
          {order.note && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
              <span className="font-bold">Note:</span> {order.note}
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400">Payment:</span>
              <span className={`font-bold ${order.payment_method === 'cod' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {order.payment_method === 'cod' ? '💵 จ่ายเงินปลายทาง (COD)' : '💳 สแกนจ่าย (PromptPay)'}
              </span>
            </div>
            {order.payment_method === 'cod' && order.phone && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">Phone:</span>
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
            <span>Total</span>
            <span className="text-ios-primary text-lg">฿{order.total_amount}</span>
          </div>

          {order.status === 'pending' && (
            <div className="flex gap-2 mt-2">
              <Button 
                variant="secondary" 
                className="flex-1"
                onClick={() => updateStatus(order.id, 'cancelled', order.room_number)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 !bg-ios-success focus:ring-ios-success/50 hover:bg-green-600"
                onClick={() => updateStatus(order.id, 'completed', order.room_number)}
              >
                Complete
              </Button>
            </div>
          )}
        </Card>
      ))}
      </div>
    </div>
  );
};
