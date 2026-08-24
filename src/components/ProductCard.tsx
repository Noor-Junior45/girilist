import React, { useState } from 'react';
import { Product } from '../types';
import { 
  Edit3, 
  Trash2, 
  Zap, 
  HardHat, 
  Flame, 
  Clock, 
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
      className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col overflow-hidden group"
    >
      {/* Card Header & Thumbnail */}
      <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=60';
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
            <ImageIcon className="w-8 h-8" />
            <span className="text-xs">No image</span>
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/95 text-slate-800 shadow-xs backdrop-blur-xs uppercase tracking-wider">
            {isElectrical ? (
              <Zap className="w-3 h-3 text-amber-500" />
            ) : (
              <HardHat className="w-3 h-3 text-orange-500" />
            )}
            {product.brand}
          </span>
          {product.is_best_seller && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 shadow-xs">
              <Sparkles className="w-2.5 h-2.5" /> Best Seller
            </span>
          )}
          {product.is_emergency && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white shadow-xs">
              <Flame className="w-2.5 h-2.5" /> 30m Emergency
            </span>
          )}
        </div>

        {/* Quick Edit Overlay Button */}
        <button
          type="button"
          onClick={() => onEdit(product.id)}
          className="absolute top-2.5 right-2.5 p-2 rounded-xl bg-white/90 text-slate-700 hover:text-amber-600 hover:bg-white shadow-xs transition"
          title="Edit Product"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="capitalize">{product.category} {product.subcategory ? `• ${product.subcategory}` : ''}</span>
            {product.unit && <span>{product.unit}</span>}
          </div>

          <h3
            onClick={() => onEdit(product.id)}
            className="font-bold text-slate-900 hover:text-amber-600 text-sm leading-snug line-clamp-2 cursor-pointer transition"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Color variants preview */}
          {product.colors && product.colors.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1.5">
              <div className="flex items-center -space-x-1">
                {product.colors.slice(0, 5).map((c) => {
                  const info = getColorInfo(c);
                  return (
                    <span
                      key={c}
                      className={`w-3 h-3 rounded-full inline-block ring-1 ring-white shadow-2xs ${
                        info.isLight ? 'border border-slate-300' : ''
                      }`}
                      style={{ backgroundColor: info.hex }}
                      title={`Color: ${c}`}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                {product.colors.length} {product.colors.length === 1 ? 'color' : 'colors'}
              </span>
            </div>
          )}
        </div>

        {/* Pricing & Stock Grid */}
        <div className="pt-2 border-t border-slate-100 flex items-end justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold text-slate-900">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {product.mrp && product.mrp > product.price && (
                <span className="text-xs text-slate-400 line-through">
                  ₹{product.mrp.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            {product.mrp && product.mrp > product.price && (
              <div className="text-[10px] font-bold text-emerald-600">
                {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% DISCOUNT
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-xs font-semibold text-slate-800">
              {product.stock_quantity} in stock
            </div>
            {isLowStock && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600">
                <AlertCircle className="w-2.5 h-2.5" /> Low
              </span>
            )}
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleInStock}
              disabled={isUpdatingStock}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                product.in_stock ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out flex items-center justify-center ${
                  product.in_stock ? 'translate-x-4' : 'translate-x-0'
                }`}
              >
                {isUpdatingStock && <Loader2 className="w-2.5 h-2.5 animate-spin text-slate-600" />}
              </span>
            </button>
            <span className="text-xs font-medium text-slate-600">
              {product.in_stock ? 'Live' : 'Hidden'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(product.id)}
              className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDeleteRequest(product)}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
