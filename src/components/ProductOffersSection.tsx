import React, { useState } from 'react';
import { Offer, ProductCategory } from '../types';
import { supabase } from '../lib/supabaseClient';
import { OfferFormModal } from './OfferFormModal';
import { DeleteOfferModal } from './DeleteOfferModal';
import { useToast } from '../context/ToastContext';
import { 
  Tag, 
  Percent, 
  Sparkles, 
  Check, 
  Info, 
  Calendar, 
  Coins, 
  ExternalLink,
  Layers,
  Flame,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Plus,
  SlidersHorizontal,
  Power,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';

interface ProductOffersSectionProps {
  category: ProductCategory;
  price: string;
  offers: Offer[];
  selectedOfferIds: string[];
  onChangeSelectedOffers: (offerIds: string[]) => void;
  isLoadingOffers?: boolean;
  onOfferSaved?: (savedOffer: Offer) => void;
  onOfferDeleted?: (deletedOfferId: string) => void;
}

export function ProductOffersSection({
  category,
  price,
  offers,
  selectedOfferIds,
  onChangeSelectedOffers,
  isLoadingOffers = false,
  onOfferSaved,
  onOfferDeleted,
}: ProductOffersSectionProps) {
  const [activeTab, setActiveTab] = useState<'applicable' | 'all_catalog'>('applicable');
  const [filterQuery, setFilterQuery] = useState('');
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingOffer, setDeletingOffer] = useState<Offer | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [togglingOfferId, setTogglingOfferId] = useState<string | null>(null);

  const { showToast } = useToast();
  const numericPrice = parseFloat(price) || 0;

  // 1. Auto-applied offers (Global storewide or Category scope matching this product's category)
  const autoAppliedOffers = offers.filter((offer) => {
    if (!offer.is_active) return false;
    if (offer.category_scope === 'all') return true;
    if (offer.category_scope === category) return true;
    return false;
  });

  // 2. Specific offers that can be explicitly attached to this product
  const specificOffers = offers.filter((offer) => {
    const isAuto = offer.category_scope === 'all' || offer.category_scope === category;
    return !isAuto;
  });

  // Filter lists by search query
  const filterList = (list: Offer[]) => {
    if (!filterQuery) return list;
    const q = filterQuery.toLowerCase();
    return list.filter((o) =>
      o.code.toLowerCase().includes(q) ||
      o.title.toLowerCase().includes(q) ||
      (o.description && o.description.toLowerCase().includes(q))
    );
  };

  const filteredSpecificOffers = filterList(specificOffers);
  const filteredAllOffers = filterList(offers);

  const toggleOfferSelection = (offerId: string) => {
    if (selectedOfferIds.includes(offerId)) {
      onChangeSelectedOffers(selectedOfferIds.filter((id) => id !== offerId));
    } else {
      onChangeSelectedOffers([...selectedOfferIds, offerId]);
    }
  };

  // Quick toggle active status on any offer
  const handleQuickToggleActive = async (offer: Offer, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setTogglingOfferId(offer.id);
      const newStatus = !offer.is_active;

      const { data, error } = await supabase
        .from('offers')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', offer.id)
        .select('*')
        .single();

      if (error) throw error;

      showToast({
        type: 'success',
        title: newStatus ? 'Offer Activated' : 'Offer Deactivated',
        description: `Offer "${offer.code}" is now ${newStatus ? 'active' : 'inactive'}.`,
      });

      if (onOfferSaved && data) {
        onOfferSaved(data);
      }
    } catch (err: unknown) {
      console.error('Toggle active error:', err);
      showToast({
        type: 'error',
        title: 'Status Update Failed',
        description: err instanceof Error ? err.message : 'Failed to update offer status.',
      });
    } finally {
      setTogglingOfferId(null);
    }
  };

  // Helper to calculate effective price with an offer
  const calculateEffectivePrice = (offer: Offer, basePrice: number) => {
    if (basePrice <= 0) return null;
    let discountAmount = 0;
    if (offer.discount_type === 'percentage') {
      discountAmount = (basePrice * offer.discount_value) / 100;
      if (offer.max_discount && offer.max_discount > 0) {
        discountAmount = Math.min(discountAmount, offer.max_discount);
      }
    } else {
      discountAmount = offer.discount_value;
    }
    const finalPrice = Math.max(0, basePrice - discountAmount);
    return {
      discountAmount: Number(discountAmount.toFixed(2)),
      finalPrice: Number(finalPrice.toFixed(2)),
    };
  };

  // Find best offer applicable for live preview
  const allApplicableOffers = [
    ...autoAppliedOffers,
    ...offers.filter((o) => selectedOfferIds.includes(o.id) && o.is_active),
  ];

  let bestOfferPreview: {
    offer: Offer;
    discountAmount: number;
    finalPrice: number;
  } | null = null;

  if (numericPrice > 0 && allApplicableOffers.length > 0) {
    allApplicableOffers.forEach((offer) => {
      const calc = calculateEffectivePrice(offer, numericPrice);
      if (calc) {
        if (!bestOfferPreview || calc.discountAmount > bestOfferPreview.discountAmount) {
          bestOfferPreview = {
            offer,
            discountAmount: calc.discountAmount,
            finalPrice: calc.finalPrice,
          };
        }
      }
    });
  }

  const isExpired = (offer: Offer) => {
    if (!offer.valid_until) return false;
    return new Date(offer.valid_until) < new Date();
  };

  const handleOpenEdit = (offer: Offer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOffer(offer);
    setIsEditModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingOffer(null);
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (offer: Offer, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingOffer(offer);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs space-y-6" id="product-offers-section">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1a1716]/10 pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#2e4a3d]" />
            <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1716]">
              Promotional Offers & Coupons
            </h2>
            <span className="font-mono text-[10px] px-2 py-0.5 bg-[#2e4a3d]/10 text-[#2e4a3d] font-bold">
              {allApplicableOffers.length} Active for Product
            </span>
          </div>
          <p className="font-mono text-[10px] text-[#1a1716]/60">
            Manage, edit, or delete offers applicable to this product or across the entire store.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2e4a3d] hover:bg-[#1a1716] text-white font-mono text-[11px] font-bold uppercase tracking-wider transition cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Offer</span>
          </button>

          <a
            href="/offers"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#1a1716]/20 hover:bg-[#f2efeb] text-[#1a1716] font-mono text-[10px] font-bold uppercase transition"
            title="Open Full Offers Manager in New Tab"
          >
            <span>Offers Hub</span>
            <ExternalLink className="w-3 h-3 text-[#1a1716]/60" />
          </a>
        </div>
      </div>

      {/* Tabs: Relevant to this product VS All store offers */}
      <div className="flex items-center justify-between gap-3 border-b border-[#1a1716]/10 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('applicable')}
            className={`px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'applicable'
                ? 'bg-[#1a1716] text-white'
                : 'bg-transparent text-[#1a1716]/70 hover:text-[#1a1716] hover:bg-[#f2efeb]'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>This Product's Offers ({allApplicableOffers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all_catalog')}
            className={`px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all_catalog'
                ? 'bg-[#1a1716] text-white'
                : 'bg-transparent text-[#1a1716]/70 hover:text-[#1a1716] hover:bg-[#f2efeb]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Catalog Offers ({offers.length})</span>
          </button>
        </div>

        {(offers.length > 2 || filterQuery) && (
          <input
            type="text"
            placeholder="Search offers by code or title..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-44 sm:w-56 text-xs px-2.5 py-1 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d] font-mono"
          />
        )}
      </div>

      {/* Live Price Impact Preview Box */}
      {numericPrice > 0 && bestOfferPreview && (
        <div 
          id="product-offer-price-preview-banner"
          className="p-3.5 bg-gradient-to-r from-emerald-50 via-emerald-50/70 to-teal-50 border border-emerald-200/80 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-emerald-950 flex items-center gap-1.5 uppercase text-[11px]">
                <span>Best Promo Applied:</span>
                <span className="px-1.5 py-0.2 bg-emerald-200/70 text-emerald-900 font-extrabold tracking-wider">
                  {bestOfferPreview.offer.code}
                </span>
                <span className="text-emerald-700 font-normal">
                  ({bestOfferPreview.offer.discount_type === 'percentage' 
                    ? `${bestOfferPreview.offer.discount_value}% OFF` 
                    : `₹${bestOfferPreview.offer.discount_value} FLAT OFF`})
                </span>
              </div>
              <div className="text-[10px] text-emerald-800/80 mt-0.5">
                {bestOfferPreview.offer.title}
              </div>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-emerald-200/70 sm:pl-4">
            <div className="text-[10px] text-emerald-800 line-through">
              Selling Price: ₹{numericPrice.toLocaleString('en-IN')}
            </div>
            <div className="text-sm font-bold text-emerald-950 font-mono flex items-center gap-1 sm:justify-end">
              <span>Effective: ₹{bestOfferPreview.finalPrice.toLocaleString('en-IN')}</span>
              <span className="text-[10px] font-normal text-emerald-700 bg-white/80 px-1 py-0.5 border border-emerald-300">
                Save ₹{bestOfferPreview.discountAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Applicable Offers & Attachments */}
      {activeTab === 'applicable' && (
        <div className="space-y-6">
          {/* 1. Category & Store-Wide Auto Applied Offers */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1716]/80 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#2e4a3d]" />
                Category & Storewide Offers (Auto-Applied)
              </label>
              <span className="font-mono text-[10px] text-[#1a1716]/50">
                Matches "{category}" or storewide scope
              </span>
            </div>

            {autoAppliedOffers.length === 0 ? (
              <div className="p-3 bg-[#f2efeb]/40 border border-[#1a1716]/10 text-xs font-mono text-[#1a1716]/60 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#1a1716]/40 shrink-0" />
                <span>No category-wide offers currently active for "{category}".</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" id="auto-applied-offers-list">
                {autoAppliedOffers.map((offer) => {
                  const expired = isExpired(offer);
                  return (
                    <div
                      key={offer.id}
                      id={`auto-offer-${offer.id}`}
                      className="p-3 bg-slate-50 border border-slate-200/90 relative flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 bg-[#1a1716] text-white tracking-wider">
                              {offer.code}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-[#2e4a3d] bg-[#2e4a3d]/10 px-1.5 py-0.5">
                              {offer.discount_type === 'percentage'
                                ? `${offer.discount_value}% OFF`
                                : `₹${offer.discount_value} FLAT`}
                            </span>
                            <span className="font-mono text-[9px] uppercase font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Auto Applied
                            </span>
                          </div>
                          <div className="font-semibold text-xs text-[#1a1716] line-clamp-1 mt-1">
                            {offer.title}
                          </div>
                        </div>

                        {/* Edit & Delete Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(offer, e)}
                            className="p-1 text-slate-500 hover:text-[#2e4a3d] hover:bg-emerald-50 border border-slate-200 rounded transition cursor-pointer"
                            title="Edit this Offer"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenDelete(offer, e)}
                            className="p-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded transition cursor-pointer"
                            title="Delete this Offer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between font-mono text-[10px] text-[#1a1716]/60">
                        <div>
                          {offer.category_scope === 'all' ? 'All Catalog Scope' : `${offer.category_scope.toUpperCase()} Scope`}
                        </div>
                        {offer.valid_until && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#1a1716]/40" />
                            <span>Valid till {new Date(offer.valid_until).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Specific Product-Level Coupon Attachments */}
          <div className="space-y-3 pt-4 border-t border-[#1a1716]/10">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1716]/80 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-[#2e4a3d]" />
                Attach Specific Product Offers
              </label>
              <p className="font-mono text-[10px] text-[#1a1716]/50 mt-0.5">
                Toggle the checkbox to link or unlink specific promo codes to this product. Use the action buttons to edit or delete any offer directly.
              </p>
            </div>

            {isLoadingOffers ? (
              <div className="p-6 text-center text-xs font-mono text-[#1a1716]/50 flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-[#2e4a3d] border-t-transparent animate-spin rounded-full" />
                Loading offer database...
              </div>
            ) : filteredSpecificOffers.length === 0 ? (
              <div className="p-4 bg-[#f2efeb]/30 border border-dashed border-[#1a1716]/20 text-center font-mono space-y-1">
                <div className="text-xs font-bold text-[#1a1716]/70">No specific product coupons found</div>
                <div className="text-[10px] text-[#1a1716]/50">
                  Click "Create Offer" above to add a new promotion.
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1" id="specific-offers-selectable-list">
                {filteredSpecificOffers.map((offer) => {
                  const isSelected = selectedOfferIds.includes(offer.id);
                  const expired = isExpired(offer);

                  return (
                    <div
                      key={offer.id}
                      id={`selectable-offer-row-${offer.id}`}
                      onClick={() => toggleOfferSelection(offer.id)}
                      className={`p-3 border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-50/60 border-amber-400/90 shadow-2xs'
                          : 'bg-white border-[#1a1716]/15 hover:border-[#1a1716]/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Custom Checkbox */}
                        <div
                          className={`w-4 h-4 shrink-0 border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#1a1716] border-[#1a1716] text-white'
                              : 'border-[#1a1716]/30 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 bg-slate-900 text-white tracking-wider">
                              {offer.code}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5">
                              {offer.discount_type === 'percentage'
                                ? `${offer.discount_value}% OFF`
                                : `₹${offer.discount_value} FLAT`}
                            </span>
                            {!offer.is_active && (
                              <span className="font-mono text-[9px] text-rose-700 bg-rose-50 px-1.5 py-0.5 font-bold uppercase">
                                Inactive
                              </span>
                            )}
                            {expired && (
                              <span className="font-mono text-[9px] text-amber-800 bg-amber-50 px-1.5 py-0.5 font-bold uppercase">
                                Expired
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-semibold text-[#1a1716] truncate">
                            {offer.title}
                          </div>

                          {offer.description && (
                            <div className="text-[10px] text-[#1a1716]/60 truncate">
                              {offer.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Min order / details + Edit & Delete Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right font-mono text-[10px] text-[#1a1716]/60 hidden sm:block">
                          <div>Min Order: ₹{offer.min_order_value || 0}</div>
                          {offer.valid_until && (
                            <div className="text-[9px] text-[#1a1716]/40">
                              Exp: {new Date(offer.valid_until).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(offer, e)}
                            className="p-1.5 text-slate-500 hover:text-[#2e4a3d] hover:bg-emerald-50 border border-slate-200 rounded transition cursor-pointer"
                            title="Edit Offer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenDelete(offer, e)}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded transition cursor-pointer"
                            title="Delete Offer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ALL CATALOG OFFERS (Browse, Edit, Delete Any Offer) */}
      {activeTab === 'all_catalog' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] text-[#1a1716]/70">
              Directly edit parameters, activate/deactivate, or delete any offer across all products in the store:
            </p>
          </div>

          {filteredAllOffers.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-[#1a1716]/50 bg-[#f2efeb]/40 border border-dashed border-[#1a1716]/20">
              No offers match your query.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredAllOffers.map((offer) => {
                const expired = isExpired(offer);
                const isAuto = offer.category_scope === 'all' || offer.category_scope === category;
                const isSelected = selectedOfferIds.includes(offer.id);

                return (
                  <div
                    key={offer.id}
                    className="p-3 bg-white border border-[#1a1716]/15 hover:border-[#1a1716]/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 bg-[#1a1716] text-white tracking-wider">
                          {offer.code}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-[#2e4a3d] bg-[#2e4a3d]/10 px-1.5 py-0.5">
                          {offer.discount_type === 'percentage'
                            ? `${offer.discount_value}% OFF`
                            : `₹${offer.discount_value} FLAT`}
                        </span>
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-slate-100 text-slate-700 font-semibold">
                          Scope: {offer.category_scope.toUpperCase()}
                        </span>
                        {offer.is_active ? (
                          <span className="font-mono text-[9px] uppercase font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5">
                            Active
                          </span>
                        ) : (
                          <span className="font-mono text-[9px] uppercase font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5">
                            Disabled
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-[#1a1716]">
                        {offer.title}
                      </div>

                      {offer.description && (
                        <div className="text-[10px] text-[#1a1716]/60 truncate max-w-lg">
                          {offer.description}
                        </div>
                      )}
                    </div>

                    {/* Action Controls for this Offer */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {/* Active toggle button */}
                      <button
                        type="button"
                        onClick={(e) => handleQuickToggleActive(offer, e)}
                        disabled={togglingOfferId === offer.id}
                        className={`px-2 py-1 font-mono text-[10px] font-bold uppercase transition flex items-center gap-1 border cursor-pointer ${
                          offer.is_active
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                        title="Toggle Active Status"
                      >
                        <Power className="w-3 h-3" />
                        <span>{offer.is_active ? 'Active' : 'Disabled'}</span>
                      </button>

                      {/* Edit Offer button */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(offer, e)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-[#1a1716]/20 text-[#1a1716] font-mono text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                        title="Edit Offer details"
                      >
                        <Edit2 className="w-3 h-3 text-[#2e4a3d]" />
                        <span>Edit</span>
                      </button>

                      {/* Delete Offer button */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenDelete(offer, e)}
                        className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-mono text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                        title="Delete Offer permanently"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Offer Modal */}
      <OfferFormModal
        offer={editingOffer}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingOffer(null);
        }}
        onSaved={(savedOffer) => {
          if (onOfferSaved) {
            onOfferSaved(savedOffer);
          }
        }}
      />

      {/* Delete Offer Modal */}
      <DeleteOfferModal
        offer={deletingOffer}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingOffer(null);
        }}
        onDeleted={(deletedId) => {
          if (onOfferDeleted) {
            onOfferDeleted(deletedId);
          }
          if (selectedOfferIds.includes(deletedId)) {
            onChangeSelectedOffers(selectedOfferIds.filter((id) => id !== deletedId));
          }
        }}
      />
    </div>
  );
}
