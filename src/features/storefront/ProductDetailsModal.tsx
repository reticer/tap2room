import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/ui/Modal';
import type { Product } from '../../store/useCartStore';
import { useCartStore } from '../../store/useCartStore';
import { Plus, Minus, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { getOptimizedImageUrl } from '../../utils/imageUtils';

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

  const lastProductRef = React.useRef<Product | null>(null);
  if (product) {
    lastProductRef.current = product;
  }
  const displayProduct = product ?? lastProductRef.current;

  const cartItem = displayProduct ? cartItems.find(item => item.id === displayProduct.id) : undefined;
  const quantityInCart = cartItem?.quantity || 0;

  const handleAdd = () => {
    if (displayProduct && displayProduct.stock > 0) {
      addItem(displayProduct);
      onClose();
    }
  };

  const handleIncrement = () => {
    if (displayProduct && displayProduct.stock > quantityInCart) {
      updateQuantity(displayProduct.id, quantityInCart + 1);
    }
  };

  const handleDecrement = () => {
    if (!displayProduct) return;
    if (quantityInCart > 1) {
      updateQuantity(displayProduct.id, quantityInCart - 1);
    } else {
      removeItem(displayProduct.id);
    }
  };

  return (
    <Modal isOpen={isOpen && !!product} onClose={onClose} title={t('product_details')}>
      {displayProduct && (
      <div className="flex flex-col gap-4">
        <div className="relative px-6 flex justify-center">
          <div className="w-48 h-48 md:w-56 md:h-56 bg-white dark:bg-gray-800 relative overflow-hidden rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-orange-100/50 dark:border-gray-700 shrink-0">
            {displayProduct.image_url ? (
              <img src={getOptimizedImageUrl(displayProduct.image_url, 400, 85)} alt={displayProduct.name_th} className={`absolute inset-0 w-full h-full object-contain p-2 ${displayProduct.stock === 0 ? 'grayscale opacity-60' : ''}`} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                {t('no_image')}
              </div>
            )}
            
            {/* Out of stock badge */}
            {displayProduct.stock === 0 && (
              <div className="absolute inset-0 bg-white/40 dark:bg-black/60 flex items-center justify-center z-10">
                <span className="bg-gray-900/95 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wider">
                  {i18n.language === 'en' ? 'OUT OF STOCK' : 'สินค้าหมด'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-relaxed pt-1">
            {i18n.language === 'en' && displayProduct.name_en ? displayProduct.name_en : displayProduct.name_th}
          </h2>
          {/* Description support if available */}
          {(displayProduct.description_en || displayProduct.description_th) && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {i18n.language === 'en' && displayProduct.description_en ? displayProduct.description_en : (displayProduct.description_th || t('product_desc_empty'))}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1 pt-1">
            {displayProduct.sale_price ? (
              <>
                <span className="text-2xl font-bold text-ios-primary leading-normal">฿{displayProduct.sale_price.toLocaleString()}</span>
                <span className="text-sm font-medium text-gray-400 line-through mt-1">฿{displayProduct.price.toLocaleString()}</span>
              </>
            ) : (
              <span className="text-2xl font-bold text-ios-primary leading-normal">฿{displayProduct.price.toLocaleString()}</span>
            )}
          </div>
          <p className="text-sm text-gray-500 font-medium">{displayProduct.stock} {t('stock_left')}</p>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          {quantityInCart === 0 ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAdd}
              disabled={displayProduct.stock === 0}
              className={`w-full py-4 rounded-full font-bold flex items-center justify-center gap-2 text-lg shadow-sm transition-all duration-200 ${
                displayProduct.stock === 0
                  ? 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                  : 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 shadow-md shadow-orange-500/20'
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
                disabled={quantityInCart >= displayProduct.stock}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${
                  quantityInCart >= displayProduct.stock
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
      )}
    </Modal>
  );
};
