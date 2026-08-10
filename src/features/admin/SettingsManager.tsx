import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../services/supabaseClient';
import { Bell, Activity, Clock } from 'lucide-react';

export const SettingsManager: React.FC = () => {
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
      new Notification('ทดสอบการแจ้งเตือน 🔔', {
        body: 'ระบบการแจ้งเตือนทำงานได้อย่างถูกต้อง!',
      });
    } else {
      alert('กรุณากดเปิดสวิตช์การแจ้งเตือนด้านบน และอนุญาตในเบราว์เซอร์ก่อนครับ');
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

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-20">
      <h2 className="font-bold text-2xl text-gray-900 dark:text-white px-2">ตั้งค่าระบบ (Settings)</h2>
      
      <Card className="p-6 flex flex-col gap-6">
        
        {/* Notification Settings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">การแจ้งเตือน (Notifications)</h3>
              <p className="text-sm text-gray-500">รับการแจ้งเตือนเมื่อมีออเดอร์ใหม่</p>
            </div>
          </div>
          
          {/* Toggle Switch */}
          <button 
            onClick={handleTogglePush}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              pushEnabled ? 'bg-ios-primary' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span 
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
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
              ทดสอบการแจ้งเตือน
            </button>
          </div>
        )}

        <div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />

        {/* Activity Log */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">ประวัติกิจกรรม (Activity Log)</h3>
              <p className="text-sm text-gray-500">ดูประวัติการเข้าสู่ระบบและออเดอร์</p>
            </div>
          </div>
          <button 
            onClick={handleOpenActivityLog}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors"
          >
            เปิดดู
          </button>
        </div>

      </Card>

      {/* Activity Log Modal */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title="ประวัติกิจกรรม"
      >
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto py-2 pr-2">
          {isLoadingActivities ? (
            <div className="text-center py-8 text-gray-500">Loading logs...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">ยังไม่มีประวัติกิจกรรม</div>
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
                    {log.action === 'login' && 'แอดมินเข้าสู่ระบบ'}
                    {log.action === 'place_order' && `มีออเดอร์ใหม่จากห้อง ${log.details?.room}`}
                    {log.action === 'update_order' && `ออเดอร์ห้อง ${log.details?.room} เปลี่ยนสถานะเป็น ${log.details?.status}`}
                    {log.action === 'update_product' && `มีการจัดการข้อมูลสินค้า`}
                    {log.action === 'visit_store' && `มีผู้เข้าชมเว็บไซต์หน้าร้าน`}
                    {log.action === 'add_to_cart' && `หยิบ "${log.details?.product_name}" ลงตะกร้า`}
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
