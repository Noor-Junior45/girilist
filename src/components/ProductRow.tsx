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

  // Format updated_at timestamp
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
      className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group text-sm"
    >
      {/* Product Image & Title */}
      <td className="py-3.5 pl-4 pr-3 max-w-[320px]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative">
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
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <ImageIcon className="w-5 h-5" />
              </div>
            )}
            {product.image_urls?.length > 1 && (
              <span className="absolute bottom-0.5 right-0.5 bg-slate-900/80 text-white text-[9px] font-semibold px-1 rounded">
                +{product.image_urls.length - 1}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 uppercase tracking-wider">
                {product.brand}
              </span>
              {product.is_best_seller && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                  <Sparkles className="w-2.5 h-2.5 text-amber-600" /> Best Seller
                </span>
              )}
              {product.is_emergency && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                  <Flame className="w-2.5 h-2.5 text-rose-600" /> 30m Emergency
                </span>
              )}
            </div>

            <button
              onClick={() => onEdit(product.id)}
              className="text-left font-semibold text-slate-900 hover:text-amber-600 truncate block mt-0.5 text-sm transition"
              title={product.name}
            >
              {product.name}
            </button>

            <div className="text-[11px] text-slate-500 truncate">
              {product.unit ? `Unit: ${product.unit}` : ''} 
              {product.delivery_minutes ? ` • ${product.delivery_minutes} mins delivery` : ''}
            </div>

            {/* Color Swatch Dots for products with variants */}
            {product.colors && product.colors.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex items-center -space-x-1">
                  {product.colors.slice(0, 6).map((c) => {
                    const info = getColorInfo(c);
                    return (
                      <span
                        key={c}
                        className={`w-3 h-3 rounded-full inline-block ring-1 ring-white shadow-2xs ${
                          info.isLight ? 'border border-slate-300' : ''
                        }`}
                        style={{ backgroundColor: info.hex }}
                        title={`Color option: ${c}`}
                      />
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
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
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border capitalize whitespace-nowrap bg-white shadow-xs">
          {isElectrical ? (
            <>
              <Zap className="w-3 h-3 text-amber-500" />
              <span className="text-slate-700">Electrical</span>
            </>
          ) : (
            <>
              <HardHat className="w-3 h-3 text-orange-500" />
              <span className="text-slate-700">Construction</span>
            </>
          )}
        </div>
        {product.subcategory && (
          <div className="text-xs text-slate-500 mt-1 truncate max-w-[140px]">
            {product.subcategory}
          </div>
        )}
      </td>

      {/* Pricing & MRP */}
      <td className="py-3.5 px-3 whitespace-nowrap">
        <div className="font-bold text-slate-900 text-sm">
          ₹{product.price.toLocaleString('en-IN')}
        </div>
        {product.mrp && product.mrp > product.price && (
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="line-through">₹{product.mrp.toLocaleString('en-IN')}</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded">
              {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% off
            </span>
          </div>
        )}
      </td>

      {/* Stock Quantity & Badge */}
      <td className="py-3.5 px-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-800 text-sm">
            {product.stock_quantity}
          </span>
          <span className="text-xs text-slate-500">{product.unit || 'units'}</span>
        </div>
        {isLowStock && (
          <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
            Low Stock (&lt;10)
          </div>
        )}
      </td>

      {/* Instant In-Stock Toggle Switch */}
      <td className="py-3.5 px-3 whitespace-nowrap">
        <button
          type="button"
          id={`btn-toggle-stock-${product.id}`}
          onClick={handleToggleInStock}
          disabled={isUpdatingStock}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
            product.in_stock ? 'bg-emerald-500' : 'bg-slate-300'
          } ${isUpdatingStock ? 'opacity-60 cursor-wait' : ''}`}
          title={product.in_stock ? 'Product is visible in store. Click to mark out of stock.' : 'Product is out of stock. Click to mark in stock.'}
        >
          <span className="sr-only">Toggle in stock</span>
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
              product.in_stock ? 'translate-x-5' : 'translate-x-0'
            }`}
          >
            {isUpdatingStock ? (
              <Loader2 className="w-3 h-3 animate-spin text-slate-600" />
            ) : product.in_stock ? (
              <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
            ) : null}
          </span>
        </button>
        <div className="text-[10px] font-medium mt-0.5 text-slate-500">
          {product.in_stock ? (
            <span className="text-emerald-700 font-semibold">Active</span>
          ) : (
            <span className="text-slate-400">Hidden</span>
          )}
        </div>
      </td>

      {/* Last Updated Timestamp */}
      <td className="py-3.5 px-3 whitespace-nowrap text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{formatTimestamp(product.updated_at || product.created_at)}</span>
        </div>
      </td>

      {/* Row Actions */}
      <td className="py-3.5 pl-3 pr-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            id={`btn-edit-product-${product.id}`}
            onClick={() => onEdit(product.id)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition shadow-2xs"
            title="Edit product details"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            id={`btn-delete-product-${product.id}`}
            onClick={() => onDeleteRequest(product)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
            title="Delete product"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
