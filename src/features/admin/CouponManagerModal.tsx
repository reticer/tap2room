import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../services/supabaseClient';
import { useTranslation } from 'react-i18next';
import { Trash2, Plus, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CouponManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CouponManagerModal: React.FC<CouponManagerModalProps> = ({ isOpen, onClose }) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // New Coupon Form
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limitPerRoom, setLimitPerRoom] = useState(false);
  
  // Confirm Delete
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCoupons();
    } else {
      setIsCreating(false);
      resetForm();
    }
  }, [isOpen]);

  const fetchCoupons = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setCoupons(data);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setCode('');
    setDiscountType('fixed');
    setDiscountValue('');
    setMinPurchase('');
    setUsageLimit('');
    setStartDate('');
    setEndDate('');
    setLimitPerRoom(false);
  };

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discountValue) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('coupons')
      .insert([{
        code: code.toUpperCase().trim(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        min_purchase: minPurchase ? parseFloat(minPurchase) : 0,
        usage_limit: usageLimit ? parseInt(usageLimit) : null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        limit_per_room: limitPerRoom
      }])
      .select();

    if (!error && data) {
      setCoupons([data[0], ...coupons]);
      setIsCreating(false);
      resetForm();
    } else {
      alert(isEn ? 'Failed to create coupon, code might already exist.' : 'สร้างคูปองไม่สำเร็จ โค้ดนี้อาจมีอยู่แล้ว');
    }
    setIsLoading(false);
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
    await supabase.from('coupons').update({ is_active: !currentStatus }).eq('id', id);
  };

  const confirmDelete = async () => {
    if (!couponToDelete) return;
    setCoupons(prev => prev.filter(c => c.id !== couponToDelete));
    await supabase.from('coupons').delete().eq('id', couponToDelete);
    setCouponToDelete(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? 'Manage Coupons' : 'จัดการคูปองส่วนลด'}
    >
      <div className="flex flex-col h-[70vh] max-h-[600px]">
        {/* Header Actions */}
        <div className="mb-4">
          <Button 
            onClick={() => setIsCreating(true)}
            className="w-full !rounded-xl !bg-ios-primary/10 !text-ios-primary hover:!bg-ios-primary/20 flex items-center justify-center gap-2 font-bold py-3"
          >
            <Plus className="w-5 h-5" />
            {isEn ? 'Create New Coupon' : 'สร้างคูปองส่วนลดใหม่'}
          </Button>
        </div>

        {/* Coupons List */}
        <div className="flex-1 overflow-y-auto pr-1 pb-20 space-y-3">
          {isLoading && coupons.length === 0 ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
              {isEn ? 'No coupons found.' : 'ยังไม่มีคูปองส่วนลด'}
            </div>
          ) : (
            coupons.map((coupon) => (
              <div key={coupon.id} className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm relative">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="bg-orange-50 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 font-extrabold text-sm px-3 py-1 rounded-xl">
                      {coupon.code}
                    </div>
                    <div className="font-extrabold text-orange-500 dark:text-orange-400 text-[17px]">
                      {isEn ? 'Discount' : 'ลด'} {coupon.discount_value} {coupon.discount_type === 'percent' ? '%' : '฿'}
                    </div>
                    {coupon.limit_per_room && (
                      <div className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 border border-purple-100 dark:border-purple-800/50">
                        <Ticket className="w-3 h-3" />
                        {isEn ? '1/Room' : '1 สิทธิ์/ห้อง'}
                      </div>
                    )}
                  </div>
                  
                  {/* Status Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={coupon.is_active}
                      onChange={() => toggleStatus(coupon.id, coupon.is_active)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl flex flex-col mb-1">
                  <div className="p-3.5 flex justify-between items-center text-sm font-medium text-gray-600 dark:text-gray-400">
                    <span>{isEn ? 'Min:' : 'ขั้นต่ำ:'} ฿{coupon.min_purchase}</span>
                    <span>{isEn ? 'Used:' : 'ใช้แล้ว:'} {coupon.used_count} / {coupon.usage_limit || '∞'}</span>
                  </div>
                  {(coupon.start_date || coupon.end_date) && (
                    <div className="px-3.5 pb-3.5 flex justify-between items-center text-xs font-medium text-gray-400 dark:text-gray-500">
                      <span>{coupon.start_date ? new Date(coupon.start_date).toLocaleDateString('th-TH') : '-'}</span>
                      <span className="opacity-50">-</span>
                      <span>{coupon.end_date ? new Date(coupon.end_date).toLocaleDateString('th-TH') : '-'}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button 
                    onClick={() => setCouponToDelete(coupon.id)}
                    className="text-red-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" onClick={() => setIsCreating(false)} />
            <motion.div initial={{ scale: 0.95, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 20, opacity: 0 }} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] w-full max-w-[380px] relative z-10 shadow-lg border border-gray-100 dark:border-gray-700">
              <h3 className="font-extrabold text-xl mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                <Ticket className="w-6 h-6 text-orange-500" />
                {isEn ? 'New Coupon' : 'คูปองส่วนลดใหม่'}
              </h3>
              
              <form onSubmit={createCoupon} className="flex flex-col gap-4">
                <Input
                  placeholder={isEn ? 'CODE (e.g. NEW20)' : 'โค้ดส่วนลด (เช่น NEW20)'}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  className="w-full !rounded-2xl bg-gray-50 dark:bg-gray-900 border-transparent focus:border-orange-500 focus:ring-orange-500/20"
                />
                
                <div className="flex gap-3">
                  <select 
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-900 border-transparent rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none w-1/3 text-gray-900 dark:text-white font-medium"
                  >
                    <option value="fixed">{isEn ? 'THB' : 'บาท'}</option>
                    <option value="percent">%</option>
                  </select>
                  <Input
                    type="number"
                    placeholder={isEn ? 'Amount' : 'จำนวนส่วนลด'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    required
                    min="1"
                    className="flex-1 !rounded-2xl bg-gray-50 dark:bg-gray-900 border-transparent focus:border-orange-500 focus:ring-orange-500/20"
                  />
                </div>

                <div className="flex gap-3">
                  <Input
                    type="number"
                    placeholder={isEn ? 'Min. Purchase' : 'ยอดซื้อขั้นต่ำ (ไม่บังคับ)'}
                    value={minPurchase}
                    onChange={(e) => setMinPurchase(e.target.value)}
                    className="flex-1 !rounded-2xl bg-gray-50 dark:bg-gray-900 border-transparent focus:border-orange-500 focus:ring-orange-500/20 text-sm"
                  />
                  <Input
                    type="number"
                    placeholder={isEn ? 'Limit' : 'จำกัดสิทธิ์ (ไม่บังคับ)'}
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="flex-1 !rounded-2xl bg-gray-50 dark:bg-gray-900 border-transparent focus:border-orange-500 focus:ring-orange-500/20 text-sm"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-3">
                  <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <span className="text-[11px] text-gray-500 font-bold ml-1 sm:ml-2">{isEn ? 'Start Date (Optional)' : 'เริ่มวันที่ (ไม่บังคับ)'}</span>
                    <Input
                      type="text"
                      placeholder={isEn ? "dd/mm/yyyy" : "วว/ดด/ปปปป"}
                      onFocus={(e) => (e.target.type = 'date')}
                      onBlur={(e) => {
                        if (!e.target.value) e.target.type = 'text';
                      }}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-sm px-4 !rounded-2xl bg-gray-50 border-transparent focus:border-orange-500 focus:ring-orange-500/20"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <span className="text-[11px] text-gray-500 font-bold ml-1 sm:ml-2">{isEn ? 'End Date (Optional)' : 'หมดอายุ (ไม่บังคับ)'}</span>
                    <Input
                      type="text"
                      placeholder={isEn ? "dd/mm/yyyy" : "วว/ดด/ปปปป"}
                      onFocus={(e) => (e.target.type = 'date')}
                      onBlur={(e) => {
                        if (!e.target.value) e.target.type = 'text';
                      }}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-sm px-4 !rounded-2xl bg-gray-50 border-transparent focus:border-orange-500 focus:ring-orange-500/20"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer p-2">
                  <input
                    type="checkbox"
                    checked={limitPerRoom}
                    onChange={(e) => setLimitPerRoom(e.target.checked)}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{isEn ? 'Limit 1 use per room' : 'จำกัดการใช้ 1 สิทธิ์ต่อห้อง'}</span>
                </label>

                <div className="flex gap-3 pt-4 mt-2">
                  <Button 
                    type="button"
                    variant="secondary" 
                    onClick={() => setIsCreating(false)}
                    className="flex-1 !rounded-2xl py-3.5 font-bold !bg-gray-100 hover:!bg-gray-200 dark:!bg-gray-800 dark:hover:!bg-gray-700 !text-gray-700 dark:!text-gray-300"
                  >
                    {isEn ? 'Cancel' : 'ยกเลิก'}
                  </Button>
                  <Button 
                    type="submit" 
                    isLoading={isLoading}
                    className="flex-1 !rounded-2xl py-3.5 font-bold shadow-lg shadow-orange-500/30 !bg-orange-500 hover:!bg-orange-600 !text-white"
                  >
                    {isEn ? 'Save' : 'บันทึก'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {couponToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" onClick={() => setCouponToDelete(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-gray-800 p-6 rounded-3xl w-full max-w-[320px] relative z-10 text-center shadow-md">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-lg mb-2 dark:text-white">{isEn ? 'Delete Coupon?' : 'ลบคูปองนี้?'}</h3>
              <p className="text-gray-500 text-sm mb-6">{isEn ? 'This action cannot be undone.' : 'การกระทำนี้ไม่สามารถย้อนกลับได้'}</p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setCouponToDelete(null)} className="flex-1 !rounded-xl">{isEn ? 'Cancel' : 'ยกเลิก'}</Button>
                <Button onClick={confirmDelete} className="flex-1 !rounded-xl !bg-red-500 hover:!bg-red-600">{isEn ? 'Delete' : 'ลบทิ้ง'}</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Modal>
  );
};
