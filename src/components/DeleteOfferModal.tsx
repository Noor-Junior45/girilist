import React, { useState } from 'react';
import { Offer } from '../types';
import { supabase } from '../lib/supabaseClient';
import { AlertTriangle, Trash2, X, Loader2, Tag } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface DeleteOfferModalProps {
  offer: Offer | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (offerId: string) => void;
}

export function DeleteOfferModal({
  offer,
  isOpen,
  onClose,
  onDeleted,
}: DeleteOfferModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  if (!isOpen || !offer) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      // 1. Delete associated offer_products rows first
      const { error: relError } = await supabase
        .from('offer_products')
        .delete()
        .eq('offer_id', offer.id);

      if (relError) {
        console.warn('Non-fatal error deleting offer_products rows:', relError);
      }

      // 2. Delete the offer from offers
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offer.id);

      if (error) throw error;

      showToast({
        type: 'success',
        title: 'Offer Deleted',
        description: `Offer code "${offer.code}" has been permanently removed.`,
      });

      onDeleted(offer.id);
      onClose();
    } catch (err: unknown) {
      console.error('Delete offer error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete offer.';
      showToast({
        type: 'error',
        title: 'Deletion Failed',
        description: msg,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      id="delete-offer-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#1a1716]/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="delete-offer-modal-box"
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
            Delete Offer Voucher
          </h3>
          <p className="text-xs text-[#1a1716]/70 leading-relaxed font-light">
            Are you sure you want to permanently delete offer coupon{' '}
            <strong className="font-mono font-bold text-[#1a1716]">"{offer.code}"</strong>? Customers will immediately lose access to this promotion.
          </p>
        </div>

        {/* Offer Details Box */}
        <div className="mt-4 p-3 bg-[#f2efeb] border border-[#1a1716]/10 font-mono text-[11px] space-y-1">
          <div className="flex justify-between">
            <span className="text-[#1a1716]/60">Offer Code:</span>
            <span className="font-bold text-[#1a1716]">{offer.code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#1a1716]/60">Title:</span>
            <span className="font-medium text-[#1a1716] truncate max-w-[200px]">{offer.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#1a1716]/60">Discount:</span>
            <span className="font-bold text-[#2e4a3d]">
              {offer.discount_type === 'percentage'
                ? `${offer.discount_value}% OFF`
                : `₹${offer.discount_value} FLAT OFF`}
            </span>
          </div>
        </div>

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
