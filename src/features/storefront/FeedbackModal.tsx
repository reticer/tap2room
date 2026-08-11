import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabaseClient';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, MessageSquare } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Reset state when opened/closed
  React.useEffect(() => {
    if (isOpen) {
      setMessage('');
      setIsSuccess(false);
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const { error: submitError } = await supabase
        .from('customer_feedbacks')
        .insert({ message: message.trim() });

      if (submitError) throw submitError;

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000); // Close automatically after 2s
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error submitting feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEn ? "Suggest a Product" : "แนะนำสินค้าใหม่"}
      bgClass="bg-[#FFFDF9] dark:bg-gray-900"
    >
      {isSuccess ? (
        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {isEn ? "Thank You!" : "ขอบคุณสำหรับคำแนะนำ!"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isEn ? "We will consider adding it to our store soon." : "ทางเราจะพิจารณาเพิ่มสินค้าที่คุณแนะนำในเร็วๆ นี้ครับ"}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-2 px-1">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {isEn ? "Can't find what you're looking for? Let us know what we should add!" : "หาสินค้าไม่เจอใช่ไหม? พิมพ์บอกเราได้เลยว่าอยากให้มีอะไรขายบ้าง"}
            </p>
          </div>

          {error && (
            <div className="text-red-500 text-sm font-bold p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isEn ? "E.g. I would like to buy Pepsi Max 1 Liter..." : "เช่น อยากให้มีเป๊ปซี่แม็กซ์ขวดลิตร..."}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none resize-none min-h-[120px] shadow-sm"
              required
            />
          </div>

          <Button 
            type="submit" 
            fullWidth 
            isLoading={isSubmitting} 
            disabled={!message.trim()}
            className="mt-2 text-base font-bold bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 shadow-md shadow-orange-500/20"
          >
            {isEn ? "Submit Request" : "ส่งคำแนะนำ"}
          </Button>
        </form>
      )}
    </Modal>
  );
};
