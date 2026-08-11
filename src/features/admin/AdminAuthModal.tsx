import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabaseClient';
import { Lock } from 'lucide-react';

export const AdminAuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Rate limiting states
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);

  // Check lock status when modal opens
  useEffect(() => {
    if (isOpen) {
      checkLockStatus();
    } else {
      // Reset state when closed
      setPassword('');
      setError('');
      setLockCountdown(null);
      setIsLocked(false);
    }
  }, [isOpen]);

  // Handle countdown timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLocked && lockCountdown !== null && lockCountdown > 0) {
      interval = setInterval(() => {
        setLockCountdown((prev) => {
          if (prev && prev > 1) return prev - 1;
          setIsLocked(false);
          setError('');
          return null;
        });
      }, 1000);
    } else if (lockCountdown === 0) {
      setIsLocked(false);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockCountdown]);

  const checkLockStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('check_login_status');
      if (error) {
        console.error('Error checking lock status:', error);
        return;
      }
      
      handleStatusResponse(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusResponse = (data: any) => {
    if (!data) return;
    
    if (data.is_locked && data.locked_until) {
      setIsLocked(true);
      const lockedUntilDate = new Date(data.locked_until);
      const now = new Date();
      const diffSeconds = Math.ceil((lockedUntilDate.getTime() - now.getTime()) / 1000);
      
      if (diffSeconds > 0) {
        setLockCountdown(diffSeconds);
        setError(`System locked due to multiple failed attempts.`);
      } else {
        setIsLocked(false);
        setLockCountdown(null);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    
    setError('');
    setIsLoading(true);

    try {
      // 1. Verify we are not locked just in case
      const { data: statusData } = await supabase.rpc('check_login_status');
      if (statusData?.is_locked) {
        handleStatusResponse(statusData);
        setIsLoading(false);
        return;
      }

      // 2. Attempt login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: 'admin@taptoroom.com',
        password: password,
      });

      if (signInError) {
        // 3. Record failed login globally
        const { data: failData, error: rpcError } = await supabase.rpc('record_failed_login');
        if (!rpcError && failData) {
          handleStatusResponse(failData);
          if (!failData.is_locked) {
            setError(`Invalid password (${failData.failed_attempts}/3 attempts)`);
          }
        } else {
          setError('Invalid password');
        }
        throw signInError;
      }

      // 4. Reset counter on success
      await supabase.rpc('reset_login_attempts');

      // Log activity
      await supabase.from('activity_logs').insert({
        action: 'login',
        details: { email: 'admin@taptoroom.com' }
      });

      onClose();
      navigate('/admin');
    } catch (err) {
      // Error is handled above
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('admin_login')}>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        
        {isLocked && lockCountdown !== null && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-start gap-3 border border-red-100 dark:border-red-900/30">
            <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Access Temporarily Locked</p>
              <p className="text-sm mt-1">Please try again in <span className="font-mono font-bold text-lg">{formatTime(lockCountdown)}</span></p>
            </div>
          </div>
        )}

        <Input
          type="password"
          label={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={!isLocked ? error : undefined}
          disabled={isLocked || isLoading}
          autoFocus
        />
        <Button 
          type="submit" 
          fullWidth 
          isLoading={isLoading} 
          disabled={isLocked}
          className={isLocked ? "opacity-50 cursor-not-allowed" : ""}
        >
          {isLocked ? 'Locked' : 'Login'}
        </Button>
      </form>
    </Modal>
  );
};
