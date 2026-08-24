import React, { useState } from 'react';
import { Offer, ProductCategory, DiscountType } from '../types';
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
  PackageCheck,
  ChevronDown,
  ChevronUp,
  Link,
  Unlink,
  Loader2,
  Zap
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
  productName?: string;
  productId?: string;
  isNewProduct?: boolean;
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
  productName = '',
  productId,
  isNewProduct = true,
}: ProductOffersSectionProps) {
  const [activeTab, setActiveTab] = useState<'applicable' | 'all_catalog'>('applicable');
  const [filterQuery, setFilterQuery] = useState('');
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingOffer, setDeletingOffer] = useState<Offer | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [togglingOfferId, setTogglingOfferId] = useState<string | null>(null);

  // Quick Inline Individual Offer Creator State
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCode, setQuickCode] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDiscountType, setQuickDiscountType] = useState<DiscountType>('percentage');
  const [quickDiscountVal, setQuickDiscountVal] = useState('10');
  const [quickMinOrder, setQuickMinOrder] = useState('0');
  const [quickMaxDiscount, setQuickMaxDiscount] = useState('');
  const [quickValidUntil, setQuickValidUntil] = useState('');
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const { showToast } = useToast();
  const numericPrice = parseFloat(price) || 0;

  // Generate suggested quick code and title when opening quick create
  const handleOpenQuickCreate = () => {
    const cleanTag = productName.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
    setQuickCode(cleanTag ? `LAUNCH-${cleanTag}10` : `LAUNCH${Math.floor(100 + Math.random() * 900)}`);
    setQuickTitle(productName.trim() ? `Launch Promo on ${productName.trim()}` : 'Special Launch Discount');
    setQuickDiscountType('percentage');
    setQuickDiscountVal('10');
    setQuickMinOrder('0');
    setQuickMaxDiscount('');
    setQuickValidUntil('');
    setQuickError(null);
    setIsQuickCreateOpen((prev) => !prev);
  };

  // Submit Quick Inline Offer
  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError(null);

    const cleanCode = quickCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanCode) {
      setQuickError('Coupon code is required.');
      return;
    }

    if (!quickTitle.trim()) {
      setQuickError('Offer title is required.');
      return;
    }

    const val = parseFloat(quickDiscountVal);
    if (isNaN(val) || val <= 0) {
      setQuickError('Valid positive discount value is required.');
      return;
    }

    if (quickDiscountType === 'percentage' && val > 100) {
      setQuickError('Percentage discount cannot exceed 100%.');
      return;
    }

    const minOrder = parseFloat(quickMinOrder) || 0;
    const maxDisc =
      quickDiscountType === 'percentage' && quickMaxDiscount.trim()
        ? parseFloat(quickMaxDiscount)
        : null;

    setIsQuickSubmitting(true);

    try {
      // Check uniqueness
      const { data: existingCodes, error: checkErr } = await supabase
        .from('offers')
        .select('id, code')
        .ilike('code', cleanCode);

      if (checkErr) throw checkErr;
      if (existingCodes && existingCodes.length > 0) {
        setQuickError(`Coupon code "${cleanCode}" already exists.`);
        setIsQuickSubmitting(false);
        return;
      }

      const payload: Partial<Offer> = {
        code: cleanCode,
        title: quickTitle.trim(),
        description: `Exclusive offer for ${productName.trim() || 'this product'}`,
        discount_type: quickDiscountType,
        discount_value: val,
        min_order_value: minOrder,
        max_discount: maxDisc,
        category_scope: 'all',
        valid_from: new Date().toISOString(),
        valid_until: quickValidUntil ? new Date(`${quickValidUntil}T23:59:59Z`).toISOString() : null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const { data: insertedOffer, error: insertErr } = await supabase
        .from('offers')
        .insert(payload)
        .select('*')
        .single();

      if (insertErr) throw insertErr;

      // If productId exists (existing product), link to offer_products immediately
      if (productId) {
        await supabase
          .from('offer_products')
          .insert([{ offer_id: insertedOffer.id, product_id: productId }]);
      }

      // Link to selectedOfferIds so that parent product form attaches it
      if (!selectedOfferIds.includes(insertedOffer.id)) {
        onChangeSelectedOffers([...selectedOfferIds, insertedOffer.id]);
      }

      showToast({
        type: 'success',
        title: 'Individual Offer Created',
        description: `Promo voucher "${insertedOffer.code}" is linked to this product.`,
      });

      if (onOfferSaved) {
        onOfferSaved(insertedOffer);
      }

      setIsQuickCreateOpen(false);
    } catch (err: unknown) {
      console.error('Quick offer create error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create individual offer.';
      setQuickError(msg);
      showToast({
        type: 'error',
        title: 'Error Creating Offer',
        description: msg,
      });
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  // 1. Auto-applied offers (Global storewide or Category scope matching this product's category)
  const autoAppliedOffers = offers.filter((offer) => {
    if (!offer.is_active) return false;
    if (offer.category_scope === 'all') return true;
    if (offer.category_scope === category) return true;
    return false;
  });

  // 2. Specific offers attached to this product
  const attachedIndividualOffers = offers.filter((offer) => {
    return selectedOfferIds.includes(offer.id);
  });

  // 3. Specific offers available to be attached (not auto-applied and not already attached)
  const otherSpecificOffers = offers.filter((offer) => {
    const isAuto = offer.category_scope === 'all' || offer.category_scope === category;
    const isAttached = selectedOfferIds.includes(offer.id);
    return !isAuto && !isAttached;
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

  const filteredAttachedOffers = filterList(attachedIndividualOffers);
  const filteredOtherSpecificOffers = filterList(otherSpecificOffers);
  const filteredAllOffers = filterList(offers);

  const toggleOfferSelection = (offerId: string) => {
    if (selectedOfferIds.includes(offerId)) {
      onChangeSelectedOffers(selectedOfferIds.filter((id) => id !== offerId));
    } else {
      onChangeSelectedOffers([...selectedOfferIds, offerId]);
    }
  };

  const removeOfferSelection = (offerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeSelectedOffers(selectedOfferIds.filter((id) => id !== offerId));
    showToast({
      type: 'info',
      title: 'Offer Unlinked',
      description: 'Coupon unlinked from this product listing.',
    });
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

  const handleOpenCreateModal = () => {
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
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-4 h-4 text-[#2e4a3d]" />
            <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1716]">
              Promotional Offers & Coupons
            </h2>
            <span className="font-mono text-[10px] px-2 py-0.5 bg-[#2e4a3d]/10 text-[#2e4a3d] font-bold">
              {allApplicableOffers.length} Active for Product
            </span>
            {attachedIndividualOffers.length > 0 && (
              <span className="font-mono text-[10px] px-2 py-0.5 bg-amber-100 text-amber-900 font-bold flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                {attachedIndividualOffers.length} Individual Offers Attached
              </span>
            )}
          </div>
          <p className="font-mono text-[10px] text-[#1a1716]/60">
            Create individual exclusive offers for this product listing or link existing promotional vouchers.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Add Launch Deal Button */}
          <button
            type="button"
            id="btn-quick-create-individual-offer"
            onClick={handleOpenQuickCreate}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition cursor-pointer border shadow-2xs ${
              isQuickCreateOpen
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-emerald-50 hover:bg-emerald-100 text-[#2e4a3d] border-emerald-300'
            }`}
            title="Fast inline creator for individual product offer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isQuickCreateOpen ? 'Hide Quick Creator' : 'Quick Individual Offer'}</span>
          </button>

          {/* Full Create Modal Button */}
          <button
            type="button"
            id="btn-create-offer-modal"
            onClick={handleOpenCreateModal}
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
            title="Open Full Offers Hub in New Tab"
          >
            <span>Offers Hub</span>
            <ExternalLink className="w-3 h-3 text-[#1a1716]/60" />
          </a>
        </div>
      </div>

      {/* QUICK INLINE CREATOR WIDGET */}
      {isQuickCreateOpen && (
        <form
          onSubmit={handleQuickCreateSubmit}
          className="p-5 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white border-2 border-emerald-300 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-150"
          id="quick-individual-offer-form"
        >
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-600 text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-mono text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  Create Individual Offer for {productName.trim() ? `"${productName.trim()}"` : 'this new product'}
                </h3>
                <p className="font-mono text-[10px] text-emerald-800">
                  {isNewProduct 
                    ? 'This coupon will be exclusively tied to this listing and attached automatically when published.'
                    : 'This coupon will be exclusively attached to this item.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsQuickCreateOpen(false)}
              className="text-emerald-800/70 hover:text-emerald-950 font-mono text-xs font-bold p-1 cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          {quickError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 font-mono text-[11px]">
              {quickError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Promo Code */}
            <div>
              <label className="block font-mono text-[10px] uppercase font-bold text-emerald-950 mb-1">
                Coupon Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. LAUNCH10"
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-emerald-300 focus:outline-none focus:border-emerald-700 text-emerald-950"
              />
            </div>

            {/* Title */}
            <div>
              <label className="block font-mono text-[10px] uppercase font-bold text-emerald-950 mb-1">
                Offer Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Special Launch Offer"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-emerald-300 focus:outline-none focus:border-emerald-700 text-emerald-950"
              />
            </div>

            {/* Discount Type */}
            <div>
              <label className="block font-mono text-[10px] uppercase font-bold text-emerald-950 mb-1">
                Discount Type
              </label>
              <div className="flex border border-emerald-300 bg-white">
                <button
                  type="button"
                  onClick={() => setQuickDiscountType('percentage')}
                  className={`flex-1 py-1.5 text-center font-mono text-[10px] font-bold transition cursor-pointer ${
                    quickDiscountType === 'percentage'
                      ? 'bg-emerald-700 text-white'
                      : 'text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  % Percentage
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDiscountType('flat')}
                  className={`flex-1 py-1.5 text-center font-mono text-[10px] font-bold transition cursor-pointer ${
                    quickDiscountType === 'flat'
                      ? 'bg-emerald-700 text-white'
                      : 'text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  ₹ Flat
                </button>
              </div>
            </div>

            {/* Discount Value */}
            <div>
              <label className="block font-mono text-[10px] uppercase font-bold text-emerald-950 mb-1">
                {quickDiscountType === 'percentage' ? 'Discount % *' : 'Flat Discount (₹) *'}
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={quickDiscountVal}
                onChange={(e) => setQuickDiscountVal(e.target.value)}
                className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-emerald-300 focus:outline-none focus:border-emerald-700 text-emerald-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block font-mono text-[10px] font-semibold text-emerald-950 mb-1">
                Min Order (₹)
              </label>
              <input
                type="number"
                min="0"
                value={quickMinOrder}
                onChange={(e) => setQuickMinOrder(e.target.value)}
                placeholder="0"
                className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-emerald-300 focus:outline-none focus:border-emerald-700"
              />
            </div>

            {quickDiscountType === 'percentage' && (
              <div>
                <label className="block font-mono text-[10px] font-semibold text-emerald-950 mb-1">
                  Max Cap (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={quickMaxDiscount}
                  onChange={(e) => setQuickMaxDiscount(e.target.value)}
                  placeholder="Optional Cap"
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-emerald-300 focus:outline-none focus:border-emerald-700"
                />
              </div>
            )}

            <div>
              <label className="block font-mono text-[10px] font-semibold text-emerald-950 mb-1">
                Valid Until
              </label>
              <input
                type="date"
                value={quickValidUntil}
                onChange={(e) => setQuickValidUntil(e.target.value)}
                className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-emerald-300 focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200/80">
            <button
              type="button"
              onClick={() => setIsQuickCreateOpen(false)}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-mono text-xs font-bold uppercase transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isQuickSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isQuickSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving & Linking...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Attach & Apply Offer</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

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
          {/* 1. Attached Individual Product Offers */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1716]/80 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Attached Individual Offers (Exclusive to this Product)
              </label>
              <span className="font-mono text-[10px] text-amber-900/70 bg-amber-50 px-2 py-0.5 border border-amber-200 font-semibold">
                {filteredAttachedOffers.length} Linked to this listing
              </span>
            </div>

            {filteredAttachedOffers.length === 0 ? (
              <div className="p-4 bg-amber-50/30 border border-dashed border-amber-300/60 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-[#1a1716]/80">No individual offers attached yet</div>
                  <div className="text-[10px] text-[#1a1716]/50">
                    Create a custom launch coupon or select from available catalog vouchers below.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenQuickCreate}
                  className="px-3 py-1.5 bg-[#2e4a3d] hover:bg-[#1a1716] text-white font-mono text-[10px] font-bold uppercase transition shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Individual Offer</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2" id="attached-individual-offers-list">
                {filteredAttachedOffers.map((offer) => {
                  const expired = isExpired(offer);
                  return (
                    <div
                      key={offer.id}
                      id={`attached-offer-${offer.id}`}
                      className="p-3 bg-amber-50/40 border border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 bg-slate-900 text-white tracking-wider">
                            {offer.code}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5">
                            {offer.discount_type === 'percentage'
                              ? `${offer.discount_value}% OFF`
                              : `₹${offer.discount_value} FLAT`}
                          </span>
                          <span className="font-mono text-[9px] uppercase font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Attached to this product
                          </span>
                          {!offer.is_active && (
                            <span className="font-mono text-[9px] uppercase font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5">
                              Disabled
                            </span>
                          )}
                        </div>

                        <div className="font-semibold text-xs text-[#1a1716] truncate">
                          {offer.title}
                        </div>
                        {offer.description && (
                          <div className="text-[10px] text-[#1a1716]/60 truncate max-w-md">
                            {offer.description}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200">
                        {/* Unlink button */}
                        <button
                          type="button"
                          onClick={(e) => removeOfferSelection(offer.id, e)}
                          className="px-2 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-mono text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                          title="Unlink this coupon from this product"
                        >
                          <Unlink className="w-3 h-3" />
                          <span>Unlink</span>
                        </button>

                        {/* Edit button */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(offer, e)}
                          className="p-1.5 text-slate-600 hover:text-[#2e4a3d] hover:bg-emerald-50 bg-white border border-slate-300 rounded transition cursor-pointer"
                          title="Edit Offer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenDelete(offer, e)}
                          className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 bg-white border border-slate-300 rounded transition cursor-pointer"
                          title="Delete Offer permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Category & Store-Wide Auto Applied Offers */}
          <div className="space-y-2.5 pt-4 border-t border-[#1a1716]/10">
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

          {/* 3. Other Available Specific Catalog Coupons */}
          {filteredOtherSpecificOffers.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[#1a1716]/10">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1716]/80 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#2e4a3d]" />
                  Other Available Catalog Coupons
                </label>
                <p className="font-mono text-[10px] text-[#1a1716]/50 mt-0.5">
                  Check any of these existing coupons to link them to this product.
                </p>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filteredOtherSpecificOffers.map((offer) => {
                  const isSelected = selectedOfferIds.includes(offer.id);

                  return (
                    <div
                      key={offer.id}
                      onClick={() => toggleOfferSelection(offer.id)}
                      className={`p-3 border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-50/60 border-amber-400/90 shadow-2xs'
                          : 'bg-white border-[#1a1716]/15 hover:border-[#1a1716]/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
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
                          </div>
                          <div className="text-xs font-semibold text-[#1a1716] truncate">
                            {offer.title}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[10px] text-[#2e4a3d] font-bold">
                          + Click to Link
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
                        {isSelected && (
                          <span className="font-mono text-[9px] uppercase font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5">
                            Attached
                          </span>
                        )}
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

      {/* Edit / Create Offer Modal */}
      <OfferFormModal
        offer={editingOffer}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingOffer(null);
        }}
        currentProductContext={{
          id: productId,
          name: productName,
          category,
          isNewProduct,
        }}
        onSaved={(savedOffer, isForCurrentProd) => {
          if (onOfferSaved) {
            onOfferSaved(savedOffer);
          }
          if (isForCurrentProd && !selectedOfferIds.includes(savedOffer.id)) {
            onChangeSelectedOffers([...selectedOfferIds, savedOffer.id]);
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
