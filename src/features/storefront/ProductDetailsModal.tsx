import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/ui/Modal';
import type { Product } from '../../store/useCartStore';
import { useCartStore } from '../../store/useCartStore';
import { Plus, Minus, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const cartItems = useCartStore(state => state.items);
  const addItem = useCartStore(state => state.addItem);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);

  if (!product) return null;

  const cartItem = cartItems.find(item => item.id === product.id);
  const quantityInCart = cartItem?.quantity || 0;

  const handleAdd = () => {
    if (product.stock > 0) {
      addItem(product);
      onClose();
    }
  };

  const handleIncrement = () => {
    if (product.stock > quantityInCart) {
      updateQuantity(product.id, quantityInCart + 1);
    }
  };

  const handleDecrement = () => {
    if (quantityInCart > 1) {
      updateQuantity(product.id, quantityInCart - 1);
    } else {
      removeItem(product.id);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('product_details')}>
      <div className="flex flex-col gap-4">
        {/* Image */}
        <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden relative">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name_th} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">{t('no_image')}</div>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-10">
              <span className="bg-gray-900 text-white px-4 py-2 rounded-full font-bold">{t('sold_out')}</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
            {i18n.language === 'en' && product.name_en ? product.name_en : product.name_th}
          </h2>
          {/* Description support if available */}
          {(product.description_en || product.description_th) && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {i18n.language === 'en' && product.description_en ? product.description_en : (product.description_th || t('product_desc_empty'))}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1">
            {product.sale_price ? (
              <>
                <span className="text-2xl font-bold text-ios-primary">฿{product.sale_price.toLocaleString()}</span>
                <span className="text-sm font-medium text-gray-400 line-through mt-1">฿{product.price.toLocaleString()}</span>
              </>
            ) : (
              <span className="text-2xl font-bold text-ios-primary">฿{product.price.toLocaleString()}</span>
            )}
          </div>
          <p className="text-sm text-gray-500 font-medium">{product.stock} {t('stock_left')}</p>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          {quantityInCart === 0 ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAdd}
              disabled={product.stock === 0}
              className={`w-full py-4 rounded-full font-bold flex items-center justify-center gap-2 text-lg shadow-sm transition-colors ${
                product.stock === 0
                  ? 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                  : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              {t('add_to_cart_btn')}
            </motion.button>
          ) : (
            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-full p-2 h-[60px]">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={handleDecrement}
                className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm text-gray-900 dark:text-white"
              >
                <Minus className="w-5 h-5" />
              </motion.button>
              <span className="font-bold text-xl w-12 text-center">{quantityInCart}</span>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={handleIncrement}
                disabled={quantityInCart >= product.stock}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${
                  quantityInCart >= product.stock
                    ? 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                <Plus className="w-5 h-5" />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
