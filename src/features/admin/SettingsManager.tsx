import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../services/supabaseClient';
import { Bell, Activity, Clock, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const SettingsManager: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  
  const navigate = useNavigate();
  const [pushEnabled, setPushEnabled] = useState(() => {
    return localStorage.getItem('push_enabled') === 'true';
  });
  
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Toggle push notifications
  const handleTogglePush = async () => {
    const newState = !pushEnabled;
    setPushEnabled(newState);
    localStorage.setItem('push_enabled', newState.toString());

    if (newState) {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Push notifications permission denied by browser.');
          setPushEnabled(false);
          localStorage.setItem('push_enabled', 'false');
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleTestNotification = () => {
    if (pushEnabled && Notification.permission === 'granted') {
      new Notification(isEn ? 'Notification Test 🔔' : 'ทดสอบการแจ้งเตือน 🔔', {
        body: isEn ? 'The notification system is working correctly!' : 'ระบบการแจ้งเตือนทำงานได้อย่างถูกต้อง!',
      });
    } else {
      alert(isEn ? 'Please enable notifications above and allow permission in your browser.' : 'กรุณากดเปิดสวิตช์การแจ้งเตือนด้านบน และอนุญาตในเบราว์เซอร์ก่อนครับ');
    }
  };

  const fetchActivities = async () => {
    setIsLoadingActivities(true);
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (!error && data) {
      setActivities(data);
    }
    setIsLoadingActivities(false);
  };

  const handleOpenActivityLog = () => {
    fetchActivities();
    setIsActivityModalOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear(); // Clear session storage as requested
    localStorage.removeItem('supabase.auth.token'); // Fallback clear
    navigate('/');
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-20">
      <h2 className="font-bold text-2xl text-gray-900 dark:text-white px-2">{isEn ? 'Settings' : 'ตั้งค่าระบบ'}</h2>
      
      <Card className="p-4 flex flex-col gap-4">
        
        {/* Notification Settings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">{isEn ? 'Notifications' : 'การแจ้งเตือน'}</h3>
              <p className="text-xs text-gray-500">{isEn ? 'Receive notifications for new orders' : 'รับการแจ้งเตือนเมื่อมีออเดอร์ใหม่'}</p>
            </div>
          </div>
          
          {/* Toggle Switch */}
          <button 
            onClick={handleTogglePush}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              pushEnabled ? 'bg-ios-primary' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span 
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                pushEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Test Notification Button */}
        {pushEnabled && (
          <div className="flex justify-end -mt-4">
            <button 
              onClick={handleTestNotification}
              className="text-sm font-semibold text-ios-primary hover:underline"
            >
              {isEn ? 'Test Notification' : 'ทดสอบการแจ้งเตือน'}
            </button>
          </div>
        )}

        <div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />

        {/* Activity Log */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">{isEn ? 'Activity Log' : 'ประวัติกิจกรรม'}</h3>
              <p className="text-xs text-gray-500">{isEn ? 'View login and order history' : 'ดูประวัติการเข้าสู่ระบบและออเดอร์'}</p>
            </div>
          </div>
          <button 
            onClick={handleOpenActivityLog}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors"
          >
            {isEn ? 'View' : 'เปิดดู'}
          </button>
        </div>
        
        <div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />

        {/* Logout */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-red-600 dark:text-red-400">{isEn ? 'Logout' : 'ออกจากระบบ'}</h3>
              <p className="text-xs text-gray-500">{isEn ? 'Sign out from the admin dashboard' : 'ออกจากระบบการจัดการร้านค้า'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-bold rounded-xl transition-colors shadow-sm"
          >
            {isEn ? 'Logout' : 'ออกจากระบบ'}
          </button>
        </div>

      </Card>

      {/* Activity Log Modal */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title={isEn ? "Activity Log" : "ประวัติกิจกรรม"}
      >
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto py-2 pr-2">
          {isLoadingActivities ? (
            <div className="text-center py-8 text-gray-500">{isEn ? 'Loading logs...' : 'กำลังโหลดประวัติ...'}</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{isEn ? 'No activity logs yet' : 'ยังไม่มีประวัติกิจกรรม'}</div>
          ) : (
            activities.map((log) => (
              <div key={log.id} className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="mt-1 text-xl">
                  {log.action === 'login' ? '👤' : 
                   log.action === 'place_order' ? '🛒' : 
                   log.action === 'update_order' ? '📦' : 
                   log.action === 'visit_store' ? '👁️' :
                   log.action === 'add_to_cart' ? '➕' : '⚙️'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {log.action === 'login' && (isEn ? 'Admin logged in' : 'แอดมินเข้าสู่ระบบ')}
                    {log.action === 'place_order' && (isEn ? `New order from Room ${log.details?.room}` : `มีออเดอร์ใหม่จากห้อง ${log.details?.room}`)}
                    {log.action === 'update_order' && (isEn ? `Order for Room ${log.details?.room} status changed to ${log.details?.status}` : `ออเดอร์ห้อง ${log.details?.room} เปลี่ยนสถานะเป็น ${log.details?.status}`)}
                    {log.action === 'update_product' && (isEn ? `Product data updated` : `มีการจัดการข้อมูลสินค้า`)}
                    {log.action === 'visit_store' && (isEn ? `Storefront visited` : `มีผู้เข้าชมเว็บไซต์หน้าร้าน`)}
                    {log.action === 'add_to_cart' && (isEn ? `Added "${log.details?.product_name}" to cart` : `หยิบ "${log.details?.product_name}" ลงตะกร้า`)}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};
