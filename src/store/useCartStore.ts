import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../services/supabaseClient';

export interface Product {
  id: string;
  name_th: string;
  name_en?: string | null;
  price: number;
  sale_price?: number | null;
  image_url: string;
  stock: number;
  category?: string;
  description_th?: string | null;
  description_en?: string | null;
}

export interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isCartOpen: boolean;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setCartOpen: (isOpen: boolean) => void;
  getCartTotal: () => number;
  syncPrices: (products: Product[]) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,
      
      addItem: (product) => {
    // Log activity asynchronously (fire and forget)
    supabase.from('activity_logs').insert({
      action: 'add_to_cart',
      details: { product_name: product.name_th, price: product.sale_price || product.price }
    }).then();

    set((state) => {
      const existingItem = state.items.find(item => item.id === product.id);
      if (existingItem) {
        return {
          items: state.items.map(item =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        };
      }
      return { 
        items: [...state.items, { ...product, quantity: 1 }]
      };
    });
  },
  
  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter(item => item.id !== productId)
    }));
  },
  
  updateQuantity: (productId, quantity) => {
    set((state) => ({
      items: state.items.map(item =>
        item.id === productId ? { ...item, quantity } : item
      ).filter(item => item.quantity > 0)
    }));
  },
  
  clearCart: () => set({ items: [] }),
  
  setCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
  
      getCartTotal: () => {
        const { items } = get();
        return items.reduce((total, item) => {
          const effectivePrice = item.sale_price ? item.sale_price : item.price;
          return total + (effectivePrice * item.quantity);
        }, 0);
      },
      
      syncPrices: (products) => {
        set((state) => {
          const newItems = state.items.map(item => {
            const currentProduct = products.find(p => p.id === item.id);
            if (currentProduct) {
              return {
                ...item,
                price: currentProduct.price,
                sale_price: currentProduct.sale_price,
                stock: currentProduct.stock,
                name_th: currentProduct.name_th,
                name_en: currentProduct.name_en
              };
            }
            return item;
          });
          return { items: newItems };
        });
      }
    }),
    {
      name: 'tap2room-cart',
      // We only want to save the items array in localStorage, not the isCartOpen state
      partialize: (state) => ({ items: state.items }),
    }
  )
);
