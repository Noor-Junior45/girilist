import React, { useState, useEffect } from 'react';
import { Offer, DiscountType, CategoryScope, OfferScopeMode } from '../types';
import { supabase } from '../lib/supabaseClient';
import { OfferBannerUploader } from '../components/OfferBannerUploader';
import { ProductPicker } from '../components/ProductPicker';
import { useToast } from '../context/ToastContext';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  AlertCircle, 
  Tag, 
  Percent, 
  Coins, 
  Calendar, 
  Sparkles, 
  Layers, 
  Package, 
  Check, 
  Info,
  ShieldAlert
} from 'lucide-react';

interface OfferFormViewProps {
  offerId?: string | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function OfferFormView({
  offerId,
  onCancel,
  onSuccess,
}: OfferFormViewProps) {
  const isEditing = Boolean(offerId);
  const { showToast } = useToast();

  // Form Fields
  const [code, setCode] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('10');
  const [minOrderValue, setMinOrderValue] = useState<string>('0');
  const [maxDiscount, setMaxDiscount] = useState<string>('');

  // Validity Dates
  const [validFrom, setValidFrom] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [validUntil, setValidUntil] = useState<string>('');

  // Status Toggle
  const [isActive, setIsActive] = useState<boolean>(true);

  // Banner
  const [bannerImage, setBannerImage] = useState<string | null>(null);

  // Scope Configuration
  const [scopeMode, setScopeMode] = useState<OfferScopeMode>('all');
  const [categoryScope, setCategoryScope] = useState<CategoryScope>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // UI state
  const [isLoadingOffer, setIsLoadingOffer] = useState<boolean>(isEditing);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch offer & relations if in editing mode
  useEffect(() => {
    if (!offerId) return;

    let isMounted = true;

    async function loadOfferData() {
      setIsLoadingOffer(true);
      try {
        // 1. Fetch offer record
        const { data: offerData, error: offerError } = await supabase
          .from('offers')
          .select('*')
          .eq('id', offerId)
          .single();

        if (offerError) throw offerError;

        // 2. Fetch specific products from offer_products join table
        const { data: relData, error: relError } = await supabase
          .from('offer_products')
          .select('product_id')
          .eq('offer_id', offerId);

        if (relError) {
          console.warn('Could not fetch offer_products:', relError);
        }

        if (isMounted && offerData) {
          setCode(offerData.code || '');
          setTitle(offerData.title || '');
          setDescription(offerData.description || '');
          setDiscountType(offerData.discount_type || 'percentage');
          setDiscountValue(offerData.discount_value !== undefined ? String(offerData.discount_value) : '10');
          setMinOrderValue(offerData.min_order_value !== undefined ? String(offerData.min_order_value) : '0');
          setMaxDiscount(offerData.max_discount !== null && offerData.max_discount !== undefined ? String(offerData.max_discount) : '');
          
          if (offerData.valid_from) {
            setValidFrom(offerData.valid_from.split('T')[0]);
          }
          if (offerData.valid_until) {
            setValidUntil(offerData.valid_until.split('T')[0]);
          }

          setIsActive(offerData.is_active ?? true);
          setBannerImage(offerData.banner_image || null);

          // Determine scope mode from existing data
          const existingProductIds = (relData || []).map((r) => r.product_id);
          setSelectedProductIds(existingProductIds);

          if (existingProductIds.length > 0) {
            setScopeMode('specific');
            setCategoryScope(offerData.category_scope || 'all');
          } else if (offerData.category_scope === 'electrical' || offerData.category_scope === 'construction') {
            setScopeMode('category');
            setCategoryScope(offerData.category_scope);
          } else {
            setScopeMode('all');
            setCategoryScope('all');
          }
        }
      } catch (err: unknown) {
        console.error('Error fetching offer for edit:', err);
        const msg = err instanceof Error ? err.message : 'Failed to load offer from database.';
        setFormError(msg);
        showToast({
          type: 'error',
          title: 'Load Failed',
          description: msg,
        });
      } finally {
        if (isMounted) setIsLoadingOffer(false);
      }
    }

    loadOfferData();

    return () => {
      isMounted = false;
    };
  }, [offerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanCode) {
      setFormError('Coupon code is required (e.g. GIRIRAJ10).');
      return;
    }

    if (!title.trim()) {
      setFormError('Offer title is required.');
      return;
    }

    const parsedVal = parseFloat(discountValue);
    if (isNaN(parsedVal) || parsedVal <= 0) {
      setFormError('Valid positive discount value is required.');
      return;
    }

    if (discountType === 'percentage' && parsedVal > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    const parsedMinOrder = parseFloat(minOrderValue) || 0;
    const parsedMaxDiscount =
      discountType === 'percentage' && maxDiscount.trim()
        ? parseFloat(maxDiscount)
        : null;

    if (scopeMode === 'specific' && selectedProductIds.length === 0) {
      setFormError('Please select at least 1 product for the specific products scope, or change the scope mode.');
      return;
    }

    // Check code uniqueness if inserting or changing code
    setIsSubmitting(true);

    try {
      // 1. Verify code uniqueness
      const checkQuery = supabase
        .from('offers')
        .select('id, code')
        .ilike('code', cleanCode);

      if (isEditing && offerId) {
        checkQuery.neq('id', offerId);
      }

      const { data: existingCodes, error: checkError } = await checkQuery;
      if (checkError) throw checkError;

      if (existingCodes && existingCodes.length > 0) {
        setFormError(`Coupon code "${cleanCode}" is already taken by another offer. Please choose a unique code.`);
        setIsSubmitting(false);
        return;
      }

      // Determine final category_scope column value
      let finalCategoryScope: CategoryScope = 'all';
      if (scopeMode === 'category') {
        finalCategoryScope = categoryScope;
      } else if (scopeMode === 'specific') {
        finalCategoryScope = 'all'; // Fallback label since offer_products table takes priority
      }

      const offerPayload: Partial<Offer> = {
        code: cleanCode,
        title: title.trim(),
        description: description.trim() || null,
        discount_type: discountType,
        discount_value: parsedVal,
        min_order_value: parsedMinOrder,
        max_discount: parsedMaxDiscount,
        category_scope: finalCategoryScope,
        banner_image: bannerImage || null,
        valid_from: validFrom ? new Date(validFrom).toISOString() : new Date().toISOString(),
        valid_until: validUntil ? new Date(`${validUntil}T23:59:59Z`).toISOString() : null,
        is_active: isActive,
      };

      let currentOfferId = offerId;

      if (isEditing && offerId) {
        // UPDATE existing offer
        const { error: updateError } = await supabase
          .from('offers')
          .update(offerPayload)
          .eq('id', offerId);

        if (updateError) throw updateError;
      } else {
        // INSERT new offer
        const { data: insertedOffer, error: insertError } = await supabase
          .from('offers')
          .insert(offerPayload)
          .select('id')
          .single();

        if (insertError) throw insertError;
        currentOfferId = insertedOffer.id;
      }

      if (!currentOfferId) {
        throw new Error('Unable to determine offer ID after saving.');
      }

      // 2. Sync offer_products join table
      // Always delete existing associations for this offer
      const { error: deleteRelError } = await supabase
        .from('offer_products')
        .delete()
        .eq('offer_id', currentOfferId);

      if (deleteRelError) {
        console.warn('Error clearing old offer_products:', deleteRelError);
      }

      // If specific products scope was chosen, insert the new relations
      if (scopeMode === 'specific' && selectedProductIds.length > 0) {
        const relationRows = selectedProductIds.map((pid) => ({
          offer_id: currentOfferId,
          product_id: pid,
        }));

        const { error: insertRelError } = await supabase
          .from('offer_products')
          .insert(relationRows);

        if (insertRelError) {
          throw insertRelError;
        }
      }

      showToast({
        type: 'success',
        title: isEditing ? 'Offer Updated' : 'Offer Published',
        description: `Promo voucher "${cleanCode}" is now saved.`,
      });

      onSuccess();
    } catch (err: unknown) {
      console.error('Save offer error:', err);
      const msg = err instanceof Error ? err.message : 'Database error saving offer.';
      setFormError(msg);
      showToast({
        type: 'error',
        title: 'Save Failed',
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingOffer) {
    return (
      <div className="p-16 text-center bg-white border border-[#1a1716]/10 flex flex-col items-center justify-center gap-3 font-mono">
        <Loader2 className="w-8 h-8 text-[#2e4a3d] animate-spin" />
        <div className="text-xs uppercase tracking-widest text-[#1a1716]">Loading Offer Details...</div>
        <div className="text-[10px] text-[#1a1716]/50">Reading coupon rules and mapped inventory rows</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-20 font-sans" id="offer-editor-form">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-16 bg-[#f2efeb]/95 backdrop-blur-xs py-3 z-30 border-b border-[#1a1716]/10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="btn-back-to-offers"
            onClick={onCancel}
            className="p-2.5 bg-white border border-[#1a1716]/15 hover:border-[#1a1716]/30 text-[#1a1716] shadow-2xs transition cursor-pointer"
            title="Back to Offers List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#1a1716]/50 block mb-0.5">
              {isEditing ? `Voucher ID: ${offerId}` : 'New Promotional Voucher'}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold italic text-[#1a1716] tracking-tight">
              {isEditing ? 'Edit Promotional Offer' : 'Create New Offer'}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <button
            type="button"
            id="btn-cancel-offer-form"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-[#1a1716]/70 hover:text-[#1a1716] uppercase tracking-wider transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            id="btn-submit-offer-form"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a1716] hover:bg-[#2e4a3d] active:bg-[#233a30] text-white uppercase tracking-widest font-semibold transition cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Update Offer' : 'Publish Offer'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Validation Error Alert */}
      {formError && (
        <div
          id="offer-form-error-alert"
          className="p-4 bg-rose-50 border border-rose-200 text-xs font-mono text-rose-900 flex items-start gap-3"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold uppercase tracking-wider">Validation Error</div>
            <div className="mt-0.5 text-rose-800">{formError}</div>
          </div>
        </div>
      )}

      {/* Form Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Core Coupon Codes & Title */}
          <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs space-y-4">
            <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1716] flex items-center gap-2 border-b border-[#1a1716]/10 pb-3">
              <Tag className="w-4 h-4 text-[#2e4a3d]" />
              Offer Code & Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Code */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                  Coupon Code <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="input-offer-code"
                    type="text"
                    required
                    placeholder="e.g. GIRIRAJ10, MONSOON500"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    className="w-full text-sm font-mono font-bold tracking-wider uppercase px-3.5 py-2.5 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d] text-[#1a1716]"
                  />
                </div>
                <p className="font-mono text-[10px] text-[#1a1716]/50">
                  Customer promo code entered at cart/checkout.
                </p>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                  Offer Title <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-offer-title"
                  type="text"
                  required
                  placeholder="e.g. 10% Off Electricals on Orders Above ₹2000"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d] font-medium"
                />
                <p className="font-mono text-[10px] text-[#1a1716]/50">
                  Public customer-facing heading.
                </p>
              </div>

              {/* Description */}
              <div className="sm:col-span-2 space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                  Terms & Description
                </label>
                <textarea
                  id="textarea-offer-description"
                  rows={2}
                  placeholder="e.g. Applicable on all premium Polycab and Havells wire coils. Valid once per customer."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs leading-relaxed px-3.5 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d] placeholder:text-[#1a1716]/30 text-[#1a1716]"
                />
              </div>
            </div>
          </div>

          {/* 2. Discount Valuation & Limits */}
          <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs space-y-4">
            <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1716] flex items-center gap-2 border-b border-[#1a1716]/10 pb-3">
              <Percent className="w-4 h-4 text-[#2e4a3d]" />
              Discount Calculation & Limits
            </h2>

            {/* Discount Type Segmented Selector */}
            <div className="space-y-1.5 font-mono">
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                Discount Mechanism <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="btn-select-percentage-discount"
                  onClick={() => setDiscountType('percentage')}
                  className={`p-3 border text-left transition cursor-pointer flex items-center gap-3 ${
                    discountType === 'percentage'
                      ? 'bg-[#2e4a3d] text-white border-[#2e4a3d] shadow-2xs'
                      : 'bg-white text-[#1a1716] border-[#1a1716]/15 hover:border-[#1a1716]/30'
                  }`}
                >
                  <Percent className={`w-5 h-5 ${discountType === 'percentage' ? 'text-emerald-300' : 'text-[#2e4a3d]'}`} />
                  <div>
                    <div className="text-xs font-bold uppercase">Percentage %</div>
                    <div className={`text-[10px] ${discountType === 'percentage' ? 'text-white/80' : 'text-[#1a1716]/50'}`}>
                      Deducts % of order/product value
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  id="btn-select-flat-discount"
                  onClick={() => setDiscountType('flat')}
                  className={`p-3 border text-left transition cursor-pointer flex items-center gap-3 ${
                    discountType === 'flat'
                      ? 'bg-[#2e4a3d] text-white border-[#2e4a3d] shadow-2xs'
                      : 'bg-white text-[#1a1716] border-[#1a1716]/15 hover:border-[#1a1716]/30'
                  }`}
                >
                  <Coins className={`w-5 h-5 ${discountType === 'flat' ? 'text-emerald-300' : 'text-[#2e4a3d]'}`} />
                  <div>
                    <div className="text-xs font-bold uppercase">Flat Cash ₹</div>
                    <div className={`text-[10px] ${discountType === 'flat' ? 'text-white/80' : 'text-[#1a1716]/50'}`}>
                      Deducts direct rupee value
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Discount Value */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                  {discountType === 'percentage' ? 'Discount Percentage (%)' : 'Flat Discount (₹)'}{' '}
                  <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#1a1716]/40 text-xs font-mono font-bold">
                    {discountType === 'percentage' ? '%' : '₹'}
                  </span>
                  <input
                    id="input-discount-value"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={discountType === 'percentage' ? 100 : undefined}
                    required
                    placeholder={discountType === 'percentage' ? '10' : '500'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 bg-white border border-[#1a1716]/15 text-sm font-mono font-bold text-[#1a1716] focus:outline-none focus:border-[#2e4a3d]"
                  />
                </div>
              </div>

              {/* Min Order Value */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                  Minimum Order Value (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#1a1716]/40 text-xs font-mono font-bold">
                    ₹
                  </span>
                  <input
                    id="input-min-order-value"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 bg-white border border-[#1a1716]/15 text-sm font-mono text-[#1a1716] focus:outline-none focus:border-[#2e4a3d]"
                  />
                </div>
                <p className="font-mono text-[10px] text-[#1a1716]/50">0 for no minimum threshold.</p>
              </div>

              {/* Max Discount (Only for percentage) */}
              {discountType === 'percentage' && (
                <div className="space-y-1">
                  <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                    Max Discount Cap (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#1a1716]/40 text-xs font-mono font-bold">
                      ₹
                    </span>
                    <input
                      id="input-max-discount-cap"
                      type="number"
                      step="1"
                      min="1"
                      placeholder="e.g. 1500"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 bg-white border border-[#1a1716]/15 text-sm font-mono text-[#1a1716] focus:outline-none focus:border-[#2e4a3d]"
                    />
                  </div>
                  <p className="font-mono text-[10px] text-[#1a1716]/50">Optional maximum rebate cap.</p>
                </div>
              )}
            </div>
          </div>

          {/* 3. Scope Selector (All vs Category vs Specific Products) */}
          <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs space-y-4">
            <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1716] flex items-center gap-2 border-b border-[#1a1716]/10 pb-3">
              <Layers className="w-4 h-4 text-[#2e4a3d]" />
              Offer Scope & Target Products
            </h2>

            {/* Scope Mode Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
              {/* Option 1: All Products */}
              <button
                type="button"
                id="btn-scope-all-products"
                onClick={() => {
                  setScopeMode('all');
                  setCategoryScope('all');
                }}
                className={`p-3 border text-left transition cursor-pointer flex flex-col justify-between ${
                  scopeMode === 'all'
                    ? 'bg-[#2e4a3d]/10 border-[#2e4a3d] text-[#1a1716] ring-1 ring-[#2e4a3d]'
                    : 'bg-white border-[#1a1716]/15 text-[#1a1716]/70 hover:border-[#1a1716]/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs uppercase">🌐 All Products</div>
                  {scopeMode === 'all' && <Check className="w-4 h-4 text-[#2e4a3d]" />}
                </div>
                <div className="text-[10px] text-[#1a1716]/60 mt-1">
                  Applies storewide to every catalog item.
                </div>
              </button>

              {/* Option 2: Category Scope */}
              <button
                type="button"
                id="btn-scope-category"
                onClick={() => {
                  setScopeMode('category');
                  if (categoryScope === 'all') setCategoryScope('electrical');
                }}
                className={`p-3 border text-left transition cursor-pointer flex flex-col justify-between ${
                  scopeMode === 'category'
                    ? 'bg-[#2e4a3d]/10 border-[#2e4a3d] text-[#1a1716] ring-1 ring-[#2e4a3d]'
                    : 'bg-white border-[#1a1716]/15 text-[#1a1716]/70 hover:border-[#1a1716]/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs uppercase">⚡ Category Only</div>
                  {scopeMode === 'category' && <Check className="w-4 h-4 text-[#2e4a3d]" />}
                </div>
                <div className="text-[10px] text-[#1a1716]/60 mt-1">
                  Applies to an entire department.
                </div>
              </button>

              {/* Option 3: Specific Products */}
              <button
                type="button"
                id="btn-scope-specific"
                onClick={() => setScopeMode('specific')}
                className={`p-3 border text-left transition cursor-pointer flex flex-col justify-between ${
                  scopeMode === 'specific'
                    ? 'bg-[#2e4a3d]/10 border-[#2e4a3d] text-[#1a1716] ring-1 ring-[#2e4a3d]'
                    : 'bg-white border-[#1a1716]/15 text-[#1a1716]/70 hover:border-[#1a1716]/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs uppercase">🎯 Specific Items</div>
                  {scopeMode === 'specific' && <Check className="w-4 h-4 text-[#2e4a3d]" />}
                </div>
                <div className="text-[10px] text-[#1a1716]/60 mt-1">
                  Hand-picked product mapping.
                </div>
              </button>
            </div>

            {/* Scope Mode Details */}
            {scopeMode === 'all' && (
              <div className="p-3 bg-[#f2efeb] border border-[#1a1716]/10 text-xs font-mono text-[#1a1716]/70 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#2e4a3d] shrink-0" />
                <span>This offer will be eligible for all products in the Giriraj catalog.</span>
              </div>
            )}

            {scopeMode === 'category' && (
              <div className="p-4 bg-[#f2efeb] border border-[#1a1716]/10 space-y-3 font-mono">
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]">
                  Select Target Category <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCategoryScope('electrical')}
                    className={`p-3 border text-left font-bold text-xs uppercase transition cursor-pointer ${
                      categoryScope === 'electrical'
                        ? 'bg-[#2e4a3d] text-white border-[#2e4a3d]'
                        : 'bg-white text-[#1a1716] border-[#1a1716]/15'
                    }`}
                  >
                    ⚡ Electricals
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryScope('construction')}
                    className={`p-3 border text-left font-bold text-xs uppercase transition cursor-pointer ${
                      categoryScope === 'construction'
                        ? 'bg-[#2e4a3d] text-white border-[#2e4a3d]'
                        : 'bg-white text-[#1a1716] border-[#1a1716]/15'
                    }`}
                  >
                    🏗️ Construction
                  </button>
                </div>
              </div>
            )}

            {scopeMode === 'specific' && (
              <div className="pt-2">
                <ProductPicker
                  selectedProductIds={selectedProductIds}
                  onChange={setSelectedProductIds}
                />
              </div>
            )}
          </div>

          {/* 4. Banner Upload Section */}
          <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs">
            <OfferBannerUploader
              bannerUrl={bannerImage}
              onChange={setBannerImage}
            />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Active Status Toggle */}
          <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs space-y-4">
            <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1716] border-b border-[#1a1716]/10 pb-3">
              Offer Status & Activation
            </h2>

            {/* Active Toggle Switch */}
            <div className="flex items-center justify-between gap-3 p-3 bg-[#f2efeb]/60 border border-[#1a1716]/10 font-mono">
              <div>
                <div className="text-[11px] font-bold uppercase text-[#1a1716]">Active in Store</div>
                <div className="text-[10px] text-[#1a1716]/60">
                  {isActive ? 'Live & redeemable at checkout' : 'Paused / Inactive'}
                </div>
              </div>
              <button
                type="button"
                id="toggle-offer-is-active"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? 'bg-[#00c067]' : 'bg-[#cfd4dc]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.22)] transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Validity Schedule Dates */}
          <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs space-y-4 font-mono">
            <h2 className="text-xs uppercase tracking-wider font-bold text-[#1a1716] border-b border-[#1a1716]/10 pb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#2e4a3d]" />
              Schedule & Validity
            </h2>

            {/* Valid From */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                Start Date (Valid From) <span className="text-rose-600">*</span>
              </label>
              <input
                id="input-offer-valid-from"
                type="date"
                required
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
              />
            </div>

            {/* Valid Until */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                  Expiry Date (Valid Until)
                </label>
                {validUntil && (
                  <button
                    type="button"
                    onClick={() => setValidUntil('')}
                    className="text-[10px] text-rose-700 hover:underline uppercase"
                  >
                    Clear Expiry
                  </button>
                )}
              </div>
              <input
                id="input-offer-valid-until"
                type="date"
                min={validFrom}
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
              />
              <p className="text-[10px] text-[#1a1716]/50">
                Leave empty for an ongoing offer with no expiration.
              </p>
            </div>
          </div>

          {/* Live Voucher Summary Card */}
          <div className="bg-[#2e4a3d] text-white p-5 border border-[#1a1716]/20 space-y-3 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Voucher Summary Preview
            </div>
            
            <div className="bg-black/20 p-3 border border-white/10 rounded-xs space-y-2">
              <div className="text-sm font-bold tracking-widest uppercase text-white font-mono flex items-center justify-between">
                <span>{code || 'COUPON_CODE'}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-400/20 text-emerald-300 rounded-xs">
                  {discountType === 'percentage' ? `${discountValue || 0}% OFF` : `₹${discountValue || 0} OFF`}
                </span>
              </div>
              <div className="text-[11px] text-white/80 font-sans font-medium line-clamp-2">
                {title || 'Voucher headline preview'}
              </div>
            </div>

            <div className="text-[10px] text-white/70 space-y-1">
              <div>• Scope: <strong className="text-white uppercase">{scopeMode === 'specific' ? `${selectedProductIds.length} Products` : scopeMode === 'category' ? categoryScope : 'All Catalog'}</strong></div>
              <div>• Min Order: <strong className="text-white">₹{minOrderValue || 0}</strong></div>
              {discountType === 'percentage' && maxDiscount && (
                <div>• Max Cap: <strong className="text-white">₹{maxDiscount}</strong></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
