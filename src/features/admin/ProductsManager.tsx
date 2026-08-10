import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Card } from '../../components/ui/Card';
import { ProductFormModal } from './ProductFormModal';
import type { ProductFormData } from './ProductFormModal';
import { Edit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ProductsManager: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductFormData | null>(null);
  
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error) setProducts(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setFormModalOpen(true);
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('products').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) {
      setProducts(products.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
    }
  };

  if (isLoading) return <div>Loading products...</div>;

  const availableCategories = ['เครื่องดื่ม', 'ของกินเล่น', 'ของใช้'];
  
  const getCategoryCount = (cat: string) => {
    if (cat === 'all') return products.length;
    return products.filter(p => p.category === cat).length;
  };
  
  const translateCategory = (cat: string) => {
    if (!isEn) return cat;
    if (cat === 'เครื่องดื่ม') return 'Drinks';
    if (cat === 'ของกินเล่น') return 'Snacks';
    if (cat === 'ของใช้') return 'Utilities';
    return cat;
  };

  const filteredProducts = categoryFilter === 'all' 
    ? products 
    : products.filter(p => p.category === categoryFilter);

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex justify-between items-center mb-2 px-2">
        <h2 className="font-bold text-xl text-gray-900 dark:text-white">{isEn ? 'Manage Products' : 'จัดการสินค้า'}</h2>
        <button 
          onClick={openAddModal}
          className="text-ios-primary font-semibold text-sm bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors"
        >
          {isEn ? '+ Add New' : '+ เพิ่มสินค้า'}
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 px-2 snap-x scrollbar-hide">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`snap-start whitespace-nowrap px-4 py-2 rounded-full font-semibold text-sm transition-all ${
            categoryFilter === 'all' 
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md' 
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
          }`}
        >
          {isEn ? 'All' : 'ทั้งหมด'} ({getCategoryCount('all')})
        </button>
        {availableCategories.map(cat => (
          <button
            key={cat as string}
            onClick={() => setCategoryFilter(cat as string)}
            className={`snap-start whitespace-nowrap px-4 py-2 rounded-full font-semibold text-sm transition-all ${
              categoryFilter === cat 
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            {translateCategory(cat as string)} ({getCategoryCount(cat as string)})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2">
        {filteredProducts.map(product => (
          <Card key={product.id} className="flex gap-4 p-4 items-center bg-white dark:bg-gray-800 shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden flex-shrink-0 relative">
              {product.image_url ? (
                <img src={product.image_url} alt="" className="w-full h-full object-cover aspect-square" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Img</div>
              )}
            </div>
            <div className="flex-grow flex flex-col justify-center min-w-0">
              <h3 className="font-bold text-base line-clamp-1 text-gray-900 dark:text-white">{isEn && product.name_en ? product.name_en : product.name_th}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {product.sale_price ? (
                  <>
                    <p className="text-ios-primary font-bold text-sm">฿{product.sale_price}</p>
                    <p className="text-gray-400 font-medium text-xs line-through">฿{product.price}</p>
                  </>
                ) : (
                  <p className="text-ios-primary font-bold text-sm">฿{product.price}</p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 font-medium bg-gray-100 dark:bg-gray-700 w-fit px-2 py-0.5 rounded-full">
                Stock: {product.stock || 0}
              </p>
            </div>
            <div className="flex flex-col gap-2 items-end flex-shrink-0">
              <button 
                onClick={() => openEditModal(product)}
                className="w-full px-4 py-1.5 rounded-full text-xs font-bold transition-all transform active:scale-95 shadow-sm bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center"
              >
                <Edit2 className="w-3 h-3 mr-1" /> {isEn ? 'Edit' : 'แก้ไข'}
              </button>
              <button 
                onClick={() => toggleStatus(product.id, product.is_active)}
                className={`w-full px-4 py-1.5 rounded-full text-[10px] font-bold transition-all transform active:scale-95 shadow-sm ${product.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}
              >
                {product.is_active ? 'ACTIVE' : 'HIDDEN'}
              </button>
            </div>
          </Card>
        ))}
      </div>

      <ProductFormModal 
        isOpen={isFormModalOpen} 
        onClose={() => setFormModalOpen(false)} 
        onSuccess={fetchProducts}
        product={editingProduct}
      />
    </div>
  );
};
