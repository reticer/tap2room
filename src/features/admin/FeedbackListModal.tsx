import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabaseClient';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Check, Trash2 } from 'lucide-react';

interface FeedbackListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackListModal: React.FC<FeedbackListModalProps> = ({ isOpen, onClose }) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFeedbacks();
    }
  }, [isOpen]);

  const fetchFeedbacks = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('customer_feedbacks')
      .select('*')
      .order('is_read', { ascending: true }) // Unread first
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setFeedbacks(data);
    }
    setIsLoading(false);
  };

  const markAsRead = async (id: string, currentStatus: boolean) => {
    if (currentStatus) return; // Already read
    
    // Optimistic update
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, is_read: true } : f));
    
    await supabase
      .from('customer_feedbacks')
      .update({ is_read: true })
      .eq('id', id);
  };

  const confirmDelete = async () => {
    if (!feedbackToDelete) return;
    
    setFeedbacks(prev => prev.filter(f => f.id !== feedbackToDelete));
    await supabase.from('customer_feedbacks').delete().eq('id', feedbackToDelete);
    setFeedbackToDelete(null);
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={
          <div className="flex items-center justify-between w-full pr-4">
            <span>{isEn ? "Customer Feedback" : "ข้อเสนอแนะจากลูกค้า"}</span>
          </div>
        }
      >
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto py-2 pr-2">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">{isEn ? 'Loading...' : 'กำลังโหลด...'}</div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-500 font-medium">{isEn ? 'No feedback yet' : 'ยังไม่มีข้อเสนอแนะจากลูกค้า'}</p>
            </div>
          ) : (
            feedbacks.map((item) => (
              <div 
                key={item.id} 
                onClick={() => markAsRead(item.id, item.is_read)}
                className={`p-4 rounded-xl border transition-all relative ${
                  item.is_read 
                    ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-75' 
                    : 'bg-white dark:bg-gray-800 border-orange-200 dark:border-orange-900/50 shadow-sm cursor-pointer hover:border-orange-300'
                }`}
              >
                {!item.is_read && (
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-orange-500" />
                )}
                
                <p className={`text-[15px] pr-6 ${item.is_read ? 'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-white font-medium'}`}>
                  "{item.message}"
                </p>
                
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                  
                  <div className="flex gap-2">
                    {item.is_read ? (
                      <span className="flex items-center text-[10px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full font-bold">
                        <Check className="w-3 h-3 mr-0.5" /> {isEn ? 'Read' : 'อ่านแล้ว'}
                      </span>
                    ) : (
                      <span className="flex items-center text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full font-bold">
                        {isEn ? 'New' : 'ใหม่'}
                      </span>
                    )}
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFeedbackToDelete(item.id); }}
                      className="w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!feedbackToDelete} 
        onClose={() => setFeedbackToDelete(null)}
        title={isEn ? "Delete Feedback" : "ยืนยันการลบ"}
      >
        <div className="flex flex-col gap-6 pt-2">
          <p className="text-gray-600 dark:text-gray-300 font-medium">
            {isEn ? "Are you sure you want to delete this feedback?" : "คุณแน่ใจหรือไม่ว่าต้องการลบข้อเสนอแนะนี้?"}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setFeedbackToDelete(null)}>
              {isEn ? "Cancel" : "ยกเลิก"}
            </Button>
            <Button className="flex-1 !bg-red-500 hover:!bg-red-600 border-none text-white shadow-sm" onClick={confirmDelete}>
              {isEn ? "Delete" : "ลบเลย"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
