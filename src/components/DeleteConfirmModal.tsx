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
        // Check order_items count if table exists
        const { count: orderItemsCount, error: orderErr } = await supabase
          .from('order_items')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', product.id);

        // Check reviews count if table exists
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
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="delete-confirm-modal-box"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon & Close */}
        <div className="flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4">
          <h3 className="text-lg font-bold text-slate-900">
            Delete Product?
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Are you sure you want to delete <strong className="text-slate-900">{product.name}</strong> ({product.brand})? This action will remove it from the live store immediately.
          </p>

          {/* Relation Warning */}
          {isCheckingRelations ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              <span>Checking order references...</span>
            </div>
          ) : (
            hasHistory && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Associated Data Notice:</div>
                  <p className="mt-0.5 text-amber-800">
                    This product is referenced in {relatedOrdersCount} order item(s){relatedReviewsCount > 0 ? ` and ${relatedReviewsCount} review(s)` : ''}. Because references are set to preserve past transactions, historical customer orders will remain intact.
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            id="btn-cancel-delete"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-confirm-delete"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Permanently
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
