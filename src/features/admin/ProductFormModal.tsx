import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabaseClient';
import { UploadCloud, Check, X } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../utils/cropImage';

export interface ProductFormData {
  id?: string;
  name_th: string;
  price: number;
  sale_price?: number | null;
  stock: number;
  image_url?: string;
  category?: string;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: ProductFormData | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onSuccess, product }) => {
  const [nameTh, setNameTh] = useState('');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('เครื่องดื่ม');
  
  // Image handling
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropper state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Populate data if editing
  useEffect(() => {
    if (product && isOpen) {
      setNameTh(product.name_th || '');
      setPrice(product.price ? product.price.toString() : '');
      setSalePrice(product.sale_price ? product.sale_price.toString() : '');
      setStock(product.stock !== undefined ? product.stock.toString() : '');
      setCategory(product.category || 'เครื่องดื่ม');
      setCroppedImageUrl(product.image_url || null);
    } else if (!isOpen) {
      // Reset when closed
      setNameTh('');
      setPrice('');
      setSalePrice('');
      setStock('');
      setCategory('เครื่องดื่ม');
      setImageSrc(null);
      setCroppedImageFile(null);
      setCroppedImageUrl(null);
      setError('');
    }
  }, [product, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedFile) {
        setCroppedImageFile(croppedFile);
        setCroppedImageUrl(URL.createObjectURL(croppedFile));
        setIsCropping(false);
      }
    } catch (e) {
      console.error(e);
      setError('Failed to crop image');
    }
  }, [imageSrc, croppedAreaPixels]);

  const cancelCrop = () => {
    setIsCropping(false);
    setImageSrc(null);
    setCroppedImageFile(null);
    // Don't reset croppedImageUrl if we are editing and they cancelled changing the image
    if (!product?.image_url) {
      setCroppedImageUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameTh || !price || !stock) {
      setError('Please fill in all required fields (Name, Price, Stock)');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let finalImageUrl = product?.image_url || null;

      // Only upload if a NEW cropped image was created
      if (croppedImageFile) {
        const fileExt = 'jpg';
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, croppedImageFile);

        if (uploadError) {
          console.error("Supabase Storage Error:", uploadError);
          throw new Error(`Upload Failed: ${uploadError.message || uploadError}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);
          
        finalImageUrl = publicUrl;
      }

      const productData = {
        name_th: nameTh,
        price: parseFloat(price),
        sale_price: salePrice ? parseFloat(salePrice) : null,
        stock: parseInt(stock, 10),
        category: category,
        image_url: finalImageUrl,
      };

      if (product?.id) {
        // UPDATE existing
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);

        if (updateError) throw updateError;
      } else {
        // INSERT new
        const { error: insertError } = await supabase
          .from('products')
          .insert({
            ...productData,
            is_active: true
          });

        if (insertError) throw insertError;
      }
      
      onSuccess();
      onClose();

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error saving product');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCropping && imageSrc) {
    return (
      <Modal isOpen={isOpen} onClose={cancelCrop} title="Crop Image (Square)">
        <div className="flex flex-col gap-4">
          <div className="relative w-full h-80 bg-black rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div className="flex justify-between gap-3">
            <Button variant="secondary" onClick={cancelCrop} className="flex-1">
              <X className="w-5 h-5 mr-1" /> Cancel
            </Button>
            <Button onClick={showCroppedImage} className="flex-1">
              <Check className="w-5 h-5 mr-1" /> Confirm Crop
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product ? "Edit Product" : "Add New Product"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        <div 
          className="w-full aspect-square max-w-[200px] mx-auto bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => fileInputRef.current?.click()}
        >
          {croppedImageUrl ? (
            <div className="relative w-full h-full group">
              <img src={croppedImageUrl} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white font-semibold text-sm flex items-center"><UploadCloud className="w-4 h-4 mr-1" /> Change Image</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-gray-500">
              <UploadCloud className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">Upload Image</span>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {error && <div className="text-ios-danger text-sm font-bold p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl">{error}</div>}

        <Input label="Product Name" value={nameTh} onChange={e => setNameTh(e.target.value)} required />
        
        <div className="grid grid-cols-2 gap-4">
          <Input label="Regular Price (฿)" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
          <Input label="Sale Price (฿) (Optional)" type="number" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} />
        </div>
        
        <Input label="Stock Amount" type="number" value={stock} onChange={e => setStock(e.target.value)} required />
        
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-ios-primary/20 focus:border-ios-primary transition-all shadow-sm outline-none appearance-none"
          >
            <option value="เครื่องดื่ม">เครื่องดื่ม (Drinks)</option>
            <option value="ของกินเล่น">ของกินเล่น (Snacks)</option>
            <option value="ของใช้">ของใช้ (Essentials)</option>
          </select>
        </div>

        <Button type="submit" fullWidth isLoading={isSubmitting} className="mt-2 text-lg font-bold">
          {product ? "Save Changes" : "Save Product"}
        </Button>
      </form>
    </Modal>
  );
};
