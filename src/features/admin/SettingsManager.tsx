import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabaseClient';
import { Bell, Activity, LogOut, Trash2, KeyRound, Clock, MessageSquare, Ticket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { subscribeToPushNotifications } from '../../utils/pushUtils';
import { FeedbackListModal } from './FeedbackListModal';
import { CouponManagerModal } from './CouponManagerModal';

export const SettingsManager: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  
  const navigate = useNavigate();
  const [pushEnabled, setPushEnabled] = useState(() => {
    return localStorage.getItem('push_enabled') === 'true';
  });
  const [isLoadingPush, setIsLoadingPush] = useState(false);
  
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  
  // Password change states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  const [messageModal, setMessageModal] = useState<{isOpen: boolean, title: string, message: string}>({
    isOpen: false,
    title: '',
    message: ''
  });

  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);

  useEffect(() => {
    fetchUnreadFeedbackCount();
    
    const channel = supabase
      .channel('public:customer_feedbacks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_feedbacks' }, fetchUnreadFeedbackCount)
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchUnreadFeedbackCount = async () => {
    const { count } = await supabase
      .from('customer_feedbacks')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);
      
    setUnreadFeedbackCount(count || 0);
  };

  // Toggle push notifications
  const handleTogglePush = async () => {
    if (isLoadingPush) return;
    const newState = !pushEnabled;
    
    if (newState) {
      setIsLoadingPush(true);
      const { success, message } = await subscribeToPushNotifications();
      setIsLoadingPush(false);
      
      if (success) {
        setPushEnabled(true);
        localStorage.setItem('push_enabled', 'true');
      } else {
        setPushEnabled(false);
        localStorage.setItem('push_enabled', 'false');
      }
      
      setMessageModal({
        isOpen: true,
        title: success ? (isEn ? 'Success' : 'สำเร็จ') : (isEn ? 'Error' : 'ผิดพลาด'),
        message: message
      });
    } else {
      setPushEnabled(false);
      localStorage.setItem('push_enabled', 'false');
    }
  };

  const handleTestNotification = async () => {
    if (pushEnabled && Notification.permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(isEn ? 'Notification Test 🔔' : 'ทดสอบการแจ้งเตือน 🔔', {
          body: isEn ? 'Background notification system is working!' : 'ระบบการแจ้งเตือนเบื้องหลังทำงานได้อย่างถูกต้อง!',
          icon: '/iconpwa.png'
        });
        setMessageModal({
          isOpen: true,
          title: isEn ? 'Notification Sent' : 'ส่งการแจ้งเตือนแล้ว',
          message: isEn ? 'A test notification has been sent in the background.' : 'ส่งการแจ้งเตือนทดสอบไปทำงานเบื้องหลังแล้วครับ ลองกดดูที่แจ้งเตือนในมือถือได้เลย'
        });
      } catch (e) {
        setMessageModal({
          isOpen: true,
          title: isEn ? 'Error' : 'เกิดข้อผิดพลาด',
          message: "Error testing notification: " + e
        });
      }
    } else {
      setMessageModal({
        isOpen: true,
        title: isEn ? 'Notice' : 'แจ้งเตือน',
        message: isEn ? 'Please enable notifications above first.' : 'กรุณากดเปิดสวิตช์การแจ้งเตือนด้านบนก่อนครับ'
      });
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

  const handleClearActivityLog = async () => {
    if (confirm(isEn ? 'Are you sure you want to clear all activity logs?' : 'คุณแน่ใจหรือไม่ว่าต้องการลบประวัติกิจกรรมทั้งหมด?')) {
      const { error } = await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (!error) {
        setActivities([]);
      } else {
        setMessageModal({
          isOpen: true,
          title: isEn ? 'Error' : 'ผิดพลาด',
          message: error.message
        });
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear(); // Clear session storage as requested
    localStorage.removeItem('supabase.auth.token'); // Fallback clear
    navigate('/');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError(isEn ? 'Password must be at least 6 characters' : 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(isEn ? 'Passwords do not match' : 'รหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsChangingPassword(false);

    if (error) {
      setPasswordError(error.message);
    } else {
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setMessageModal({
        isOpen: true,
        title: isEn ? 'Success' : 'สำเร็จ',
        message: isEn ? 'Password updated successfully' : 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว'
      });
      
      // Log activity
      await supabase.from('activity_logs').insert({
        action: 'change_password',
        details: { status: 'success' }
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-20">
      <h2 className="font-bold text-2xl text-gray-900 dark:text-white px-2">{isEn ? 'Settings' : 'ตั้งค่าระบบ'}</h2>
      
      <Card className="p-4 flex flex-col gap-4">
        
        {/* Manage Coupons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">{isEn ? 'Promo Coupons' : 'คูปองส่วนลด'}</h3>
              <p className="text-xs text-gray-500">{isEn ? 'Manage promotional codes' : 'จัดการโค้ดส่วนลดและโปรโมชั่น'}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsCouponModalOpen(true)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors"
          >
            {isEn ? 'Manage' : 'จัดการ'}
          </button>
        </div>
        
        <div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />

        {/* Customer Feedback */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center relative">
              <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
              {unreadFeedbackCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm">
                  {unreadFeedbackCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">{isEn ? 'Customer Feedback' : 'ข้อเสนอแนะจากลูกค้า'}</h3>
              <p className="text-xs text-gray-500">{isEn ? 'Product requests and suggestions' : 'คำขอเพิ่มสินค้าและคำแนะนำต่างๆ'}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsFeedbackModalOpen(true)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors"
          >
            {isEn ? 'View' : 'เปิดดู'}
          </button>
        </div>
        
        <div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />

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
            disabled={isLoadingPush}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              pushEnabled ? 'bg-ios-primary' : 'bg-gray-300 dark:bg-gray-600'
            } ${isLoadingPush ? 'opacity-50 cursor-not-allowed' : ''}`}
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


        {/* Change Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">{isEn ? 'Change Password' : 'เปลี่ยนรหัสผ่าน'}</h3>
              <p className="text-xs text-gray-500">{isEn ? 'Update admin password' : 'เปลี่ยนรหัสผ่านสำหรับการเข้าสู่ระบบ Admin'}</p>
            </div>
          </div>
          <button 
            onClick={() => { setIsPasswordModalOpen(true); setPasswordError(''); setNewPassword(''); setConfirmPassword(''); }}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors"
          >
            {isEn ? 'Change' : 'เปลี่ยน'}
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
      
      <div className="text-center mt-6 text-gray-400 dark:text-gray-500 text-sm font-medium">
        tap2room V2.0
      </div>

      {/* Activity Log Modal */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title={
          <div className="flex items-center justify-between w-full pr-4">
            <span>{isEn ? "Activity Log" : "ประวัติกิจกรรม"}</span>
            {activities.length > 0 && (
              <button 
                onClick={handleClearActivityLog}
                className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600 transition-colors bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-lg"
              >
                <Trash2 className="w-3 h-3" />
                {isEn ? 'Clear' : 'ลบประวัติ'}
              </button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto py-2 pr-2">
          {isLoadingActivities ? (
            <div className="text-center py-8 text-gray-500">{isEn ? 'Loading logs...' : 'กำลังโหลดประวัติ...'}</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{isEn ? 'No activity logs yet' : 'ยังไม่มีประวัติกิจกรรม'}</div>
          ) : (
            <>
              {activities.map((log) => (
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
                    {new Date(log.created_at).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                  </div>
                </div>
              </div>
              ))}
            </>
          )}
        </div>
      </Modal>

      {/* Password Modal */}
      <Modal 
        isOpen={isPasswordModalOpen} 
        onClose={() => !isChangingPassword && setIsPasswordModalOpen(false)} 
        title={isEn ? 'Change Password' : 'เปลี่ยนรหัสผ่าน'}
      >
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <Input
            type="password"
            label={isEn ? 'New Password' : 'รหัสผ่านใหม่'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isChangingPassword}
            required
          />
          <Input
            type="password"
            label={isEn ? 'Confirm New Password' : 'ยืนยันรหัสผ่านใหม่'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={passwordError}
            disabled={isChangingPassword}
            required
          />
          <div className="flex gap-3 mt-2">
            <Button 
              type="button" 
              variant="secondary" 
              className="flex-1"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={isChangingPassword}
            >
              {isEn ? 'Cancel' : 'ยกเลิก'}
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              isLoading={isChangingPassword}
            >
              {isEn ? 'Save' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Message Modal */}
      <Modal 
        isOpen={messageModal.isOpen} 
        onClose={() => setMessageModal(prev => ({...prev, isOpen: false}))} 
        title={messageModal.title}
      >
        <div className="flex flex-col gap-6">
          <p className="text-gray-600 dark:text-gray-300">{messageModal.message}</p>
          <Button onClick={() => setMessageModal(prev => ({...prev, isOpen: false}))} fullWidth>
            {isEn ? 'Close' : 'ปิด'}
          </Button>
        </div>
      </Modal>

      {/* Feedback Modal */}
      <FeedbackListModal 
        isOpen={isFeedbackModalOpen}
        onClose={() => {
          setIsFeedbackModalOpen(false);
          fetchUnreadFeedbackCount(); // Refresh count on close in case they were marked read
        }} 
      />

      <CouponManagerModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
      />
    </div>
  );
};
