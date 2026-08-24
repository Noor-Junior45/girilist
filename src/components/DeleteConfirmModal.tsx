import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { supabase } from '../lib/supabaseClient';
import { AlertTriangle, Trash2, X, Loader2, Info } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface DeleteConfirmModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (productId: string) => void;
}

export function DeleteConfirmModal({
  product,
  isOpen,
  onClose,
  onDeleted,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingRelations, setIsCheckingRelations] = useState(false);
  const [relatedOrdersCount, setRelatedOrdersCount] = useState<number>(0);
  const [relatedReviewsCount, setRelatedReviewsCount] = useState<number>(0);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen || !product) {
      setRelatedOrdersCount(0);
      setRelatedReviewsCount(0);
      return;
    }

    let isMounted = true;

    async function checkRelations() {
      setIsCheckingRelations(true);
      try {
        const { count: orderItemsCount, error: orderErr } = await supabase
          .from('order_items')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', product.id);

        const { count: reviewsCount, error: revErr } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', product.id);

        if (isMounted) {
          if (!orderErr && orderItemsCount !== null) {
            setRelatedOrdersCount(orderItemsCount);
          }
          if (!revErr && reviewsCount !== null) {
            setRelatedReviewsCount(reviewsCount);
          }
        }
      } catch (err) {
        console.warn('Relation check non-fatal error:', err);
      } finally {
        if (isMounted) {
          setIsCheckingRelations(false);
        }
      }
    }

    checkRelations();

    return () => {
      isMounted = false;
    };
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) {
        throw error;
      }

      showToast({
        type: 'success',
        title: 'Product Deleted',
        description: `"${product.name}" has been permanently removed from the Supabase catalog.`,
      });

      onDeleted(product.id);
      onClose();
    } catch (err: unknown) {
      console.error('Delete product error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete product from database.';
      showToast({
        type: 'error',
        title: 'Deletion Failed',
        description: msg,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasHistory = relatedOrdersCount > 0 || relatedReviewsCount > 0;

  return (
    <div
      id="delete-confirm-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#1a1716]/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="delete-confirm-modal-box"
        className="bg-white max-w-md w-full p-6 shadow-2xl border border-[#1a1716]/15 animate-in fade-in zoom-in-95 duration-150 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon & Close */}
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#1a1716]/40 hover:text-[#1a1716] p-1 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4 space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-rose-700 font-bold block">
            Destructive Action
          </span>
          <h3 className="font-display text-2xl font-semibold italic text-[#1a1716]">
            Confirm Product Deletion
          </h3>
          <p className="text-xs text-[#1a1716]/70 leading-relaxed font-light">
            Are you sure you want to permanently remove <strong className="font-semibold text-[#1a1716]">"{product.name}"</strong>?
          </p>
        </div>

        {/* Product Details Box */}
        <div className="mt-4 p-3 bg-[#f2efeb] border border-[#1a1716]/10 font-mono text-[11px] space-y-1">
          <div className="flex justify-between">
            <span className="text-[#1a1716]/60">Brand / Category:</span>
            <span className="font-bold text-[#1a1716] uppercase">{product.brand} • {product.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#1a1716]/60">Current Price:</span>
            <span className="font-bold text-[#1a1716]">₹{product.price.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#1a1716]/60">In Stock:</span>
            <span className="font-bold text-[#1a1716]">{product.stock_quantity} {product.unit || 'units'}</span>
          </div>
        </div>

        {/* Related Data Warning */}
        {isCheckingRelations ? (
          <div className="mt-3 text-[10px] font-mono text-[#1a1716]/50 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin text-[#2e4a3d]" />
            Checking associated order items and reviews...
          </div>
        ) : hasHistory ? (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-mono flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold uppercase">Associated Historical Data Found</div>
              <div className="text-[10px] mt-0.5">
                {relatedOrdersCount > 0 && `• ${relatedOrdersCount} past order line items\n`}
                {relatedReviewsCount > 0 && `• ${relatedReviewsCount} user reviews`}
              </div>
            </div>
          </div>
        ) : null}

        {/* Modal Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5 font-mono text-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-[#1a1716]/70 hover:text-[#1a1716] uppercase tracking-wider font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white uppercase tracking-wider font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
