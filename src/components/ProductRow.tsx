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

interface ProductRowProps {
  key?: React.Key;
  product: Product;
  onEdit: (id: string) => void;
  onDeleteRequest: (product: Product) => void;
  onStockStatusChange: (productId: string, newInStock: boolean) => void;
}

export function ProductRow({
  product,
  onEdit,
  onDeleteRequest,
  onStockStatusChange,
}: ProductRowProps) {
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const { showToast } = useToast();

  const thumbnail = product.image_urls?.[0] || '';
  const isLowStock = product.stock_quantity < 10;
  const isElectrical = product.category === 'electrical';

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

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
    <tr
      id={`product-row-${product.id}`}
      className="border-b border-[#1a1716]/8 hover:bg-[#f2efeb]/50 transition-colors group text-xs"
    >
      {/* Product Image & Title */}
      <td className="py-3.5 pl-4 pr-3 max-w-[320px]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#f2efeb] border border-[#1a1716]/15 overflow-hidden shrink-0 relative">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={product.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=60';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#1a1716]/40">
                <ImageIcon className="w-4 h-4" />
              </div>
            )}
            {product.image_urls?.length > 1 && (
              <span className="absolute bottom-0 right-0 bg-[#1a1716] text-white font-mono text-[9px] font-semibold px-1">
                +{product.image_urls.length - 1}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[10px] uppercase font-bold text-[#1a1716]/70 tracking-wider">
                {product.brand}
              </span>
              {product.is_best_seller && (
                <span className="inline-flex items-center gap-0.5 font-mono text-[9px] font-bold px-1.5 py-0.2 bg-[#2e4a3d]/10 text-[#2e4a3d] border border-[#2e4a3d]/20 uppercase">
                  <Sparkles className="w-2.5 h-2.5 text-[#2e4a3d]" /> Best Seller
                </span>
              )}
              {product.is_emergency && (
                <span className="inline-flex items-center gap-0.5 font-mono text-[9px] font-bold px-1.5 py-0.2 bg-rose-50 text-rose-800 border border-rose-200 uppercase">
                  <Flame className="w-2.5 h-2.5 text-rose-600" /> 30m Emergency
                </span>
              )}
            </div>

            <button
              onClick={() => onEdit(product.id)}
              className="text-left font-semibold text-[#1a1716] hover:text-[#2e4a3d] truncate block mt-0.5 text-sm transition cursor-pointer"
              title={product.name}
            >
              {product.name}
            </button>

            <div className="font-mono text-[10px] text-[#1a1716]/60 truncate">
              {product.unit ? `Unit: ${product.unit}` : ''} 
              {product.delivery_minutes ? ` • ${product.delivery_minutes}m delivery` : ''}
            </div>

            {/* Color Swatch Dots */}
            {product.colors && product.colors.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1 font-mono">
                <div className="flex items-center -space-x-1">
                  {product.colors.slice(0, 6).map((c) => {
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
                  {product.colors.length <= 3 ? ` (${product.colors.join(', ')})` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Category / Subcategory */}
      <td className="py-3.5 px-3">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-[10px] uppercase font-semibold border border-[#1a1716]/10 bg-white">
          {isElectrical ? (
            <>
              <Zap className="w-3 h-3 text-[#2e4a3d]" />
              <span className="text-[#1a1716]">Electrical</span>
            </>
          ) : (
            <>
              <HardHat className="w-3 h-3 text-[#2e4a3d]" />
              <span className="text-[#1a1716]">Construction</span>
            </>
          )}
        </div>
        {product.subcategory && (
          <div className="font-mono text-[10px] text-[#1a1716]/60 mt-1 truncate max-w-[140px]">
            {product.subcategory}
          </div>
        )}
      </td>

      {/* Pricing & MRP */}
      <td className="py-3.5 px-3 whitespace-nowrap font-mono">
        <div className="font-bold text-[#1a1716] text-sm">
          ₹{product.price.toLocaleString('en-IN')}
        </div>
        {product.mrp && product.mrp > product.price && (
          <div className="text-[10px] text-[#1a1716]/50 flex items-center gap-1.5">
            <span className="line-through">₹{product.mrp.toLocaleString('en-IN')}</span>
            <span className="font-bold text-[#2e4a3d] bg-[#2e4a3d]/10 px-1 py-0.2">
              {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% off
            </span>
          </div>
        )}
      </td>

      {/* Stock Quantity */}
      <td className="py-3.5 px-3 whitespace-nowrap font-mono">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[#1a1716] text-sm">
            {product.stock_quantity}
          </span>
          <span className="text-[10px] text-[#1a1716]/60">{product.unit || 'units'}</span>
        </div>
        {isLowStock && (
          <div className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold px-1 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 uppercase">
            <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
            Low Stock (&lt;10)
          </div>
        )}
      </td>

      {/* Instant In-Stock Toggle */}
      <td className="py-3.5 px-3 whitespace-nowrap font-mono">
        <button
          type="button"
          id={`btn-toggle-stock-${product.id}`}
          onClick={handleToggleInStock}
          disabled={isUpdatingStock}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
            product.in_stock ? 'bg-[#00c067]' : 'bg-[#cfd4dc]'
          } ${isUpdatingStock ? 'opacity-60 cursor-wait' : ''}`}
          title={product.in_stock ? 'Active in store. Click to hide.' : 'Hidden from store. Click to activate.'}
        >
          <span className="sr-only">Toggle in stock</span>
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.22)] transition duration-200 ease-in-out flex items-center justify-center ${
              product.in_stock ? 'translate-x-5' : 'translate-x-0'
            }`}
          >
            {isUpdatingStock && (
              <Loader2 className="w-2.5 h-2.5 animate-spin text-[#1a1716]/60" />
            )}
          </span>
        </button>
        <div className="text-[10px] font-mono mt-0.5">
          {product.in_stock ? (
            <span className="text-[#009e53] font-bold uppercase">Active</span>
          ) : (
            <span className="text-[#1a1716]/50 uppercase">Hidden</span>
          )}
        </div>
      </td>

      {/* Last Updated Timestamp */}
      <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[10px] text-[#1a1716]/60">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#1a1716]/40" />
          <span>{formatTimestamp(product.updated_at || product.created_at)}</span>
        </div>
      </td>

      {/* Actions */}
      <td className="py-3.5 pl-3 pr-4 whitespace-nowrap text-right font-mono">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            id={`btn-edit-product-${product.id}`}
            onClick={() => onEdit(product.id)}
            className="p-1.5 bg-white text-[#1a1716] hover:text-[#2e4a3d] hover:bg-[#f2efeb] border border-[#1a1716]/15 transition cursor-pointer"
            title="Edit product"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            id={`btn-delete-product-${product.id}`}
            onClick={() => onDeleteRequest(product)}
            className="p-1.5 text-[#1a1716]/40 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
            title="Delete product"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
