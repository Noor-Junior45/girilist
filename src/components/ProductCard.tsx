import React, { useState } from 'react';
import { Product } from '../types';
import { 
  Edit3, 
  Trash2, 
  Zap, 
  HardHat, 
  Flame, 
  Sparkles, 
  AlertCircle, 
  Image as ImageIcon,
  Loader2,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { getColorInfo } from '../lib/colorUtils';

interface ProductCardProps {
  key?: React.Key;
  product: Product;
  onEdit: (id: string) => void;
  onDeleteRequest: (product: Product) => void;
  onStockStatusChange: (productId: string, newInStock: boolean) => void;
}

export function ProductCard({
  product,
  onEdit,
  onDeleteRequest,
  onStockStatusChange,
}: ProductCardProps) {
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const { showToast } = useToast();

  const thumbnail = product.image_urls?.[0] || '';
  const isLowStock = product.stock_quantity < 10;
  const isElectrical = product.category === 'electrical';

  const handleToggleInStock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !product.in_stock;
    setIsUpdatingStock(true);

    try {
      const { error } = await supabase
        .from('products')
        .update({ in_stock: newStatus, updated_at: new Date().toISOString() })
        .eq('id', product.id);

      if (error) {
        throw error;
      }

      onStockStatusChange(product.id, newStatus);
      showToast({
        type: 'success',
        title: newStatus ? 'Marked In Stock' : 'Marked Out of Stock',
        description: `Updated status for "${product.name}".`,
      });
    } catch (err: unknown) {
      console.error('Failed to update in_stock status:', err);
      const msg = err instanceof Error ? err.message : 'Database update failed.';
      showToast({
        type: 'error',
        title: 'Update Failed',
        description: msg,
      });
    } finally {
      setIsUpdatingStock(false);
    }
  };

  return (
    <div
      id={`product-card-${product.id}`}
      className="bg-white border border-[#1a1716]/10 flex flex-col justify-between group hover:border-[#2e4a3d]/50 transition-all shadow-2xs"
    >
      <div>
        {/* Thumbnail & Badges Container */}
        <div className="relative aspect-4/3 bg-[#f2efeb] overflow-hidden border-b border-[#1a1716]/10">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#1a1716]/30">
              <ImageIcon className="w-8 h-8" />
            </div>
          )}

          {/* Category Badge */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start font-mono">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 bg-white/95 text-[#1a1716] border border-[#1a1716]/15 uppercase tracking-wider backdrop-blur-xs">
              {isElectrical ? <Zap className="w-2.5 h-2.5 text-[#2e4a3d]" /> : <HardHat className="w-2.5 h-2.5 text-[#2e4a3d]" />}
              {product.category}
            </span>
          </div>

          {/* Quick Special Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end font-mono">
            {product.is_best_seller && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 bg-[#2e4a3d] text-white uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5" /> Best Seller
              </span>
            )}
            {product.is_emergency && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 bg-rose-700 text-white uppercase tracking-wider">
                <Flame className="w-2.5 h-2.5" /> 30m Express
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between font-mono text-[10px] text-[#1a1716]/60">
            <span className="font-bold uppercase text-[#1a1716]/80">{product.brand}</span>
            <span>{product.subcategory || ''}</span>
          </div>

          <h3
            onClick={() => onEdit(product.id)}
            className="font-semibold text-sm text-[#1a1716] hover:text-[#2e4a3d] transition line-clamp-2 cursor-pointer leading-snug"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Color variants preview */}
          {product.colors && product.colors.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1 font-mono">
              <div className="flex items-center -space-x-1">
                {product.colors.slice(0, 5).map((c) => {
                  const info = getColorInfo(c);
                  return (
                    <span
                      key={c}
                      className={`w-2.5 h-2.5 rounded-full inline-block ring-1 ring-white ${
                        info.isLight ? 'border border-[#1a1716]/20' : ''
                      }`}
                      style={{ backgroundColor: info.hex }}
                      title={`Variant: ${c}`}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] text-[#1a1716]/60">
                {product.colors.length} {product.colors.length === 1 ? 'color' : 'colors'}
              </span>
            </div>
          )}
        </div>

        {/* Pricing & Stock Grid */}
        <div className="px-4 py-3 bg-[#f2efeb]/50 border-t border-[#1a1716]/8 flex items-center justify-between font-mono">
          <div>
            <div className="text-base font-bold text-[#1a1716]">
              ₹{product.price.toLocaleString('en-IN')}
            </div>
            {product.mrp && product.mrp > product.price && (
              <div className="text-[10px] text-[#1a1716]/50 flex items-center gap-1">
                <span className="line-through">₹{product.mrp.toLocaleString('en-IN')}</span>
                <span className="font-bold text-[#2e4a3d]">
                  {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% off
                </span>
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-[#1a1716]">
              {product.stock_quantity} <span className="font-normal text-[10px] text-[#1a1716]/60">{product.unit || 'units'}</span>
            </div>
            {isLowStock ? (
              <span className="text-[9px] font-bold text-rose-700 flex items-center gap-0.5 justify-end uppercase">
                <AlertCircle className="w-2.5 h-2.5" /> Low Stock
              </span>
            ) : (
              <span className="text-[9px] text-[#2e4a3d] font-bold uppercase">In Stock</span>
            )}
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="p-3 bg-white border-t border-[#1a1716]/10 flex items-center justify-between font-mono text-[10px]">
        {/* In-Stock status & Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleInStock}
            disabled={isUpdatingStock}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
              product.in_stock ? 'bg-[#00c067]' : 'bg-[#cfd4dc]'
            } ${isUpdatingStock ? 'opacity-60 cursor-wait' : ''}`}
            title="Toggle storefront visibility"
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.22)] transition duration-200 ease-in-out ${
                product.in_stock ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`uppercase font-bold text-[10px] ${product.in_stock ? 'text-[#009e53]' : 'text-[#1a1716]/60'}`}>
            {product.in_stock ? 'Live' : 'Hidden'}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(product.id)}
            className="px-2.5 py-1 bg-white hover:bg-[#f2efeb] text-[#1a1716] border border-[#1a1716]/15 uppercase tracking-wider font-semibold transition cursor-pointer"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(product)}
            className="p-1 text-[#1a1716]/40 hover:text-rose-700 transition cursor-pointer"
            title="Delete product"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
