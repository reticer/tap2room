import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabaseClient';

export const AdminAuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // DEV ONLY: Pre-filled password for convenience
  const [password, setPassword] = useState('tap2room');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'admin@taptoroom.com',
        password: password,
      });

      if (error) {
        throw error;
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        action: 'login',
        details: { email: 'admin@taptoroom.com' }
      });

      onClose();
      navigate('/admin');
    } catch (err) {
      setError('Invalid password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('admin_login')}>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <Input
          type="password"
          label={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
          autoFocus
        />
        <Button type="submit" fullWidth isLoading={isLoading}>
          Login
        </Button>
      </form>
    </Modal>
  );
};
