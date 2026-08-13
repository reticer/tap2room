import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, ShoppingBag, DollarSign, Calendar } from 'lucide-react';

interface OrderData {
  id: string;
  total_amount: number;
  created_at: string;
}

export const AnalyticsManager: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7' | '30'>('7');

  useEffect(() => {
    const fetchSalesData = async () => {
      setIsLoading(true);
      try {
        // Calculate the date X days ago
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - parseInt(timeRange));
        dateLimit.setHours(0, 0, 0, 0);

        // Fetch orders that are preparing or completed (meaning payment is verified/successful)
        const { data, error } = await supabase
          .from('orders')
          .select('id, total_amount, created_at')
          .in('status', ['preparing', 'completed'])
          .gte('created_at', dateLimit.toISOString())
          .order('created_at', { ascending: true });

        if (!error && data) {
          setOrders(data);
        }
      } catch (err) {
        console.error('Failed to fetch sales data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesData();
  }, [timeRange]);

  const { chartData, totalRevenue, totalOrders, averageOrderValue } = useMemo(() => {
    // Group by date string (YYYY-MM-DD)
    const groupedData: Record<string, number> = {};
    let revenue = 0;
    
    // Initialize dates in the range with 0 to ensure we have continuous points
    const now = new Date();
    for (let i = parseInt(timeRange) - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      groupedData[dateString] = 0;
    }

    orders.forEach(order => {
      const dateString = order.created_at.split('T')[0];
      const amount = Number(order.total_amount) || 0;
      if (groupedData[dateString] !== undefined) {
         groupedData[dateString] += amount;
      }
      revenue += amount;
    });

    // Format for Recharts
    const chartData = Object.entries(groupedData).map(([dateStr, amount]) => {
      // Format date for display e.g., "13 Aug"
      const dateObj = new Date(dateStr);
      const formattedDate = dateObj.toLocaleDateString(isEn ? 'en-US' : 'th-TH', { month: 'short', day: 'numeric' });
      return {
        date: formattedDate,
        amount,
        rawDate: dateStr
      };
    });

    const orderCount = orders.length;
    const aov = orderCount > 0 ? revenue / orderCount : 0;

    return { chartData, totalRevenue: revenue, totalOrders: orderCount, averageOrderValue: aov };
  }, [orders, timeRange, isEn]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto flex flex-col gap-6"
    >
      <div className="flex justify-between items-center px-4 md:px-8 mt-2">
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
          {isEn ? 'Sales Analytics' : 'สรุปยอดขาย'}
        </h2>
        <div className="relative">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7' | '30')}
            className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 pl-4 pr-10 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm text-sm cursor-pointer"
          >
            <option value="7">{isEn ? 'Last 7 Days' : '7 วันล่าสุด'}</option>
            <option value="30">{isEn ? 'Last 30 Days' : '30 วันล่าสุด'}</option>
          </select>
          <Calendar className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 md:px-8">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="font-bold text-gray-500 dark:text-gray-400 text-sm">
              {isEn ? 'Total Revenue' : 'รายได้ทั้งหมด'}
            </span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
            ฿{totalRevenue.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="font-bold text-gray-500 dark:text-gray-400 text-sm">
              {isEn ? 'Total Orders' : 'จำนวนออเดอร์'}
            </span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
            {totalOrders.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="font-bold text-gray-500 dark:text-gray-400 text-sm">
              {isEn ? 'Average Order Value' : 'ยอดเฉลี่ยต่อบิล'}
            </span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
            ฿{Math.round(averageOrderValue).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8">
        <div className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 mt-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
            {isEn ? 'Revenue Trend' : 'แนวโน้มยอดขาย'}
          </h3>
          <div className="h-[300px] w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }} 
                  tickFormatter={(value) => `฿${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)'
                  }}
                  itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                  formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, isEn ? 'Revenue' : 'ยอดขาย']}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#f97316" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#f97316' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
