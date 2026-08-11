import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Card } from '../../components/ui/Card';
import { ProductFormModal } from './ProductFormModal';
import type { ProductFormData } from './ProductFormModal';
import { Edit2, ArrowUp, ArrowDown, Save, Plus, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { motion, AnimatePresence } from 'framer-motion';

export const ProductsManager: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductFormData | null>(null);
  
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [isSorting, setIsSorting] = useState(false);
  const [sortedProducts, setSortedProducts] = useState<any[]>([]);
  const [isSavingSort, setIsSavingSort] = useState(false);

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
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

  const moveProduct = (index: number, direction: 'up' | 'down') => {
    const newProducts = [...sortedProducts];
    if (direction === 'up' && index > 0) {
      [newProducts[index - 1], newProducts[index]] = [newProducts[index], newProducts[index - 1]];
    } else if (direction === 'down' && index < newProducts.length - 1) {
      [newProducts[index + 1], newProducts[index]] = [newProducts[index], newProducts[index + 1]];
    }
    setSortedProducts(newProducts);
  };

  const saveSortOrder = async () => {
    setIsSavingSort(true);
    // Update local state first to be snappy
    setProducts(sortedProducts);
    
    // Send bulk update sequentially
    const promises = sortedProducts.map((p, index) => {
      return supabase.from('products').update({ sort_order: index }).eq('id', p.id);
    });
    
    await Promise.all(promises);
    setIsSavingSort(false);
    setIsSorting(false);
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

  const displayProducts = isSorting ? sortedProducts : filteredProducts;

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex justify-between items-center mb-2 px-2">
        <h2 className="font-bold text-xl text-gray-900 dark:text-white">{isEn ? 'Manage Products' : 'จัดการสินค้า'}</h2>
        <div className="flex gap-2.5">
          {isSorting ? (
            <button 
              onClick={saveSortOrder}
              disabled={isSavingSort}
              className="flex items-center gap-1.5 text-white font-bold text-sm bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-2.5 rounded-2xl hover:from-green-600 hover:to-emerald-600 shadow-sm transition-all shadow-green-500/20"
            >
              <Save className="w-4 h-4" /> {isEn ? 'Save Order' : 'บันทึกลำดับ'}
            </button>
          ) : (
            <>
              <button 
                onClick={() => {
                  setCategoryFilter('all');
                  setSortedProducts([...products]);
                  setIsSorting(true);
                }}
                className="text-gray-700 dark:text-gray-200 font-bold text-sm bg-white dark:bg-gray-800 px-4 py-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <ArrowUpDown className="w-4 h-4 mr-1.5" />
                {isEn ? 'Edit Order' : 'จัดเรียง'}
              </button>
              <button 
                onClick={openAddModal}
                className="text-white font-bold text-sm bg-gradient-to-r from-orange-500 to-red-500 px-5 py-2.5 rounded-2xl hover:from-orange-600 hover:to-red-600 transition-all shadow-sm shadow-orange-500/20 flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                {isEn ? 'Add New' : 'เพิ่มสินค้า'}
              </button>
            </>
          )}
        </div>
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

      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.05 } }
        }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2"
      >
        <AnimatePresence mode="popLayout">
        {displayProducts.map((product, index) => (
          <motion.div
            layout={isSorting}
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0 }
            }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            key={product.id}
          >
            <Card className={`flex gap-4 p-4 items-center bg-white dark:bg-gray-800 shadow-[0_2px_10px_rgba(0,0,0,0.05)] border ${isSorting ? 'border-dashed border-blue-300 dark:border-blue-800/50 scale-[0.98]' : 'border-gray-100 dark:border-gray-800'} transition-all h-full`}>
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden flex-shrink-0 relative">
                {product.image_url ? (
                  <img src={getOptimizedImageUrl(product.image_url, 150, 70)} alt="" className="absolute inset-0 w-full h-full object-contain p-1" loading="lazy" decoding="async" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">No Img</div>
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
              {isSorting ? (
                <div className="flex flex-col gap-2 items-end flex-shrink-0">
                  <button 
                    onClick={() => moveProduct(index, 'up')}
                    disabled={index === 0}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm border ${index === 0 ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'}`}
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => moveProduct(index, 'down')}
                    disabled={index === displayProducts.length - 1}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm border ${index === displayProducts.length - 1 ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'}`}
                  >
                    <ArrowDown className="w-5 h-5" />
                  </button>
                </div>
              ) : (
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
              )}
            </Card>
          </motion.div>
        ))}
        </AnimatePresence>
      </motion.div>

      <ProductFormModal 
        isOpen={isFormModalOpen} 
        onClose={() => setFormModalOpen(false)} 
        onSuccess={fetchProducts}
        product={editingProduct}
      />
    </div>
  );
};
