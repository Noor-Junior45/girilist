import React, { useState, useEffect } from 'react';
import { Offer, DiscountType, CategoryScope, OfferScopeMode } from '../types';
import { supabase } from '../lib/supabaseClient';
import { OfferBannerUploader } from './OfferBannerUploader';
import { ProductPicker } from './ProductPicker';
import { useToast } from '../context/ToastContext';
import { 
  X, 
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

interface OfferFormModalProps {
  offer: Offer | null; // If null, create mode
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedOffer: Offer, isForCurrentProduct?: boolean) => void;
  currentProductContext?: {
    id?: string;
    name?: string;
    category?: CategoryScope;
    isNewProduct?: boolean;
  };
}

export function OfferFormModal({
  offer,
  isOpen,
  onClose,
  onSaved,
  currentProductContext,
}: OfferFormModalProps) {
  const isEditing = Boolean(offer?.id);
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
  const [isLoadingRelations, setIsLoadingRelations] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync state with incoming offer prop
  useEffect(() => {
    if (!isOpen) return;

    setFormError(null);

    if (offer) {
      setCode(offer.code || '');
      setTitle(offer.title || '');
      setDescription(offer.description || '');
      setDiscountType(offer.discount_type || 'percentage');
      setDiscountValue(offer.discount_value !== undefined ? String(offer.discount_value) : '10');
      setMinOrderValue(offer.min_order_value !== undefined ? String(offer.min_order_value) : '0');
      setMaxDiscount(offer.max_discount !== null && offer.max_discount !== undefined ? String(offer.max_discount) : '');
      
      if (offer.valid_from) {
        setValidFrom(offer.valid_from.split('T')[0]);
      } else {
        setValidFrom(new Date().toISOString().split('T')[0]);
      }
      if (offer.valid_until) {
        setValidUntil(offer.valid_until.split('T')[0]);
      } else {
        setValidUntil('');
      }

      setIsActive(offer.is_active ?? true);
      setBannerImage(offer.banner_image || null);

      // Load specific product relations if offer exists
      let isMounted = true;
      async function loadOfferProducts() {
        setIsLoadingRelations(true);
        try {
          const { data: relData, error: relError } = await supabase
            .from('offer_products')
            .select('product_id')
            .eq('offer_id', offer!.id);

          if (relError) throw relError;

          if (isMounted) {
            const pIds = (relData || []).map((r) => r.product_id);
            setSelectedProductIds(pIds);

            if (pIds.length > 0) {
              setScopeMode('specific');
              setCategoryScope(offer!.category_scope || 'all');
            } else if (offer!.category_scope === 'electrical' || offer!.category_scope === 'construction') {
              setScopeMode('category');
              setCategoryScope(offer!.category_scope);
            } else {
              setScopeMode('all');
              setCategoryScope('all');
            }
          }
        } catch (err) {
          console.warn('Error loading offer products in modal:', err);
        } finally {
          if (isMounted) setIsLoadingRelations(false);
        }
      }

      loadOfferProducts();

      return () => {
        isMounted = false;
      };
    } else {
      // Create mode reset
      const prodName = currentProductContext?.name?.trim() || '';
      const cleanProdTag = prodName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
      
      if (currentProductContext) {
        setCode(cleanProdTag ? `OFFER-${cleanProdTag}10` : 'SPECIAL10');
        setTitle(prodName ? `Special Deal on ${prodName}` : 'Exclusive Product Offer');
        setScopeMode('current_product');
        setCategoryScope(currentProductContext.category || 'all');
      } else {
        setCode('');
        setTitle('');
        setScopeMode('all');
        setCategoryScope('all');
      }

      setDescription('');
      setDiscountType('percentage');
      setDiscountValue('10');
      setMinOrderValue('0');
      setMaxDiscount('');
      setValidFrom(new Date().toISOString().split('T')[0]);
      setValidUntil('');
      setIsActive(true);
      setBannerImage(null);
      setSelectedProductIds(currentProductContext?.id ? [currentProductContext.id] : []);
    }
  }, [isOpen, offer, currentProductContext]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

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
        setIsSubmitting(false);
        return;
      }

      let isForCurrentProd = false;
      if (scopeMode === 'current_product') {
        isForCurrentProd = true;
      } else if (scopeMode === 'specific' && currentProductContext?.id) {
        isForCurrentProd = selectedProductIds.includes(currentProductContext.id);
      }

      setIsSubmitting(true);

      try {
        // Check code uniqueness
        const checkQuery = supabase
          .from('offers')
          .select('id, code')
          .ilike('code', cleanCode);

        if (isEditing && offer?.id) {
          checkQuery.neq('id', offer.id);
        }

        const { data: existingCodes, error: checkError } = await checkQuery;
        if (checkError) throw checkError;

        if (existingCodes && existingCodes.length > 0) {
          setFormError(`Coupon code "${cleanCode}" is already taken by another offer.`);
          setIsSubmitting(false);
          return;
        }

        let finalCategoryScope: CategoryScope = 'all';
        if (scopeMode === 'category') {
          finalCategoryScope = categoryScope;
        } else if (scopeMode === 'specific' || scopeMode === 'current_product') {
          finalCategoryScope = 'all';
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
          updated_at: new Date().toISOString(),
        };

        let savedRecord: Offer;

        if (isEditing && offer?.id) {
          const { data: updatedData, error: updateError } = await supabase
            .from('offers')
            .update(offerPayload)
            .eq('id', offer.id)
            .select('*')
            .single();

          if (updateError) throw updateError;
          savedRecord = updatedData;
        } else {
          const { data: insertedData, error: insertError } = await supabase
            .from('offers')
            .insert(offerPayload)
            .select('*')
            .single();

          if (insertError) throw insertError;
          savedRecord = insertedData;
        }

        // Sync offer_products relations
        const { error: deleteRelError } = await supabase
          .from('offer_products')
          .delete()
          .eq('offer_id', savedRecord.id);

        if (deleteRelError) {
          console.warn('Error clearing old offer_products:', deleteRelError);
        }

        if (scopeMode === 'specific' && selectedProductIds.length > 0) {
          const relationRows = selectedProductIds.map((pid) => ({
            offer_id: savedRecord.id,
            product_id: pid,
          }));

          const { error: insertRelError } = await supabase
            .from('offer_products')
            .insert(relationRows);

          if (insertRelError) {
            console.warn('Error inserting offer_products:', insertRelError);
          }
        } else if (scopeMode === 'current_product' && currentProductContext?.id) {
          const { error: insertCurrentRelError } = await supabase
            .from('offer_products')
            .insert([{ offer_id: savedRecord.id, product_id: currentProductContext.id }]);

          if (insertCurrentRelError) {
            console.warn('Error inserting current product offer relation:', insertCurrentRelError);
          }
        }

        showToast({
          type: 'success',
          title: isEditing ? 'Offer Updated' : 'Offer Created',
          description: `Promo voucher "${savedRecord.code}" saved successfully.`,
        });

        onSaved(savedRecord, isForCurrentProd);
        onClose();
      } catch (err: unknown) {
        console.error('Error saving offer in modal:', err);
        const msg = err instanceof Error ? err.message : 'Failed to save offer.';
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

  return (
    <div
      id="offer-form-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#1a1716]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="offer-form-modal-box"
        className="bg-white max-w-2xl w-full my-8 p-6 sm:p-8 shadow-2xl border border-[#1a1716]/15 animate-in fade-in zoom-in-95 duration-150 font-sans max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-[#1a1716]/40 hover:text-[#1a1716] p-1.5 transition cursor-pointer"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 pr-8 border-b border-[#1a1716]/10 pb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#2e4a3d]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#2e4a3d] font-bold">
              {isEditing ? 'Modify Promo Code' : 'Create New Offer'}
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-[#1a1716]">
            {isEditing ? `Edit Offer: ${offer?.code}` : 'New Promotional Offer'}
          </h2>
          <p className="text-xs text-[#1a1716]/60">
            Configure discount rates, applicability across all products or categories, and campaign dates.
          </p>
        </div>

        {formError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Coupon Code & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1716]/80 mb-1">
                Coupon Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. MONSOON25"
                className="w-full text-xs font-mono font-bold px-3 py-2 bg-[#f2efeb]/30 border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1716]/80 mb-1">
                Offer Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 15% Off Electrical & Wires"
                className="w-full text-xs px-3 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1716]/80 mb-1">
              Description / Terms (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Valid on all Havells, Polycab & anchor wiring purchases above ₹1,000"
              className="w-full text-xs px-3 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
            />
          </div>

          {/* Discount Type & Value */}
          <div className="p-4 bg-[#f2efeb]/40 border border-[#1a1716]/10 space-y-4">
            <label className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1716]/80">
              Discount Calculation
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDiscountType('percentage')}
                className={`p-3 border flex items-center gap-3 transition cursor-pointer text-left ${
                  discountType === 'percentage'
                    ? 'bg-white border-[#2e4a3d] ring-1 ring-[#2e4a3d] shadow-2xs'
                    : 'bg-white/50 border-[#1a1716]/15 hover:bg-white'
                }`}
              >
                <div className="p-2 bg-[#2e4a3d]/10 text-[#2e4a3d]">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-[#1a1716]">Percentage Discount</div>
                  <div className="text-[10px] text-[#1a1716]/60">e.g. 10% or 20% off item price</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDiscountType('flat')}
                className={`p-3 border flex items-center gap-3 transition cursor-pointer text-left ${
                  discountType === 'flat'
                    ? 'bg-white border-[#2e4a3d] ring-1 ring-[#2e4a3d] shadow-2xs'
                    : 'bg-white/50 border-[#1a1716]/15 hover:bg-white'
                }`}
              >
                <div className="p-2 bg-amber-500/10 text-amber-800">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-[#1a1716]">Flat Rupee Discount</div>
                  <div className="text-[10px] text-[#1a1716]/60">e.g. Flat ₹500 off order</div>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-mono text-[10px] text-[#1a1716]/80 mb-1 font-semibold">
                  {discountType === 'percentage' ? 'Discount % *' : 'Flat Discount (₹) *'}
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-[#1a1716]/80 mb-1 font-semibold">
                  Min Order Value (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(e.target.value)}
                  placeholder="0 (No minimum)"
                  className="w-full text-xs font-mono px-3 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
                />
              </div>

              {discountType === 'percentage' && (
                <div>
                  <label className="block font-mono text-[10px] text-[#1a1716]/80 mb-1 font-semibold">
                    Max Cap (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="No upper limit"
                    className="w-full text-xs font-mono px-3 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Scope Mode (Storewide vs Category vs Specific vs Current Product) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1716]/80">
                Applicability & Scope across Products
              </label>
              {currentProductContext && (
                <span className="font-mono text-[9px] px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-700" />
                  Listing: {currentProductContext.name || 'New Product'}
                </span>
              )}
            </div>

            <div className={`grid grid-cols-1 ${currentProductContext ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'} gap-2.5`}>
              {currentProductContext && (
                <button
                  type="button"
                  onClick={() => setScopeMode('current_product')}
                  className={`p-2.5 border text-left flex flex-col justify-between gap-1.5 transition cursor-pointer relative overflow-hidden ${
                    scopeMode === 'current_product'
                      ? 'bg-[#2e4a3d] text-white border-[#2e4a3d] ring-1 ring-[#2e4a3d]'
                      : 'bg-emerald-50/50 border-emerald-300 text-emerald-950 hover:bg-emerald-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold flex items-center gap-1">
                      <Sparkles className={`w-3 h-3 ${scopeMode === 'current_product' ? 'text-amber-300' : 'text-emerald-700'}`} />
                      This Product Only
                    </span>
                    {scopeMode === 'current_product' && <Check className="w-3.5 h-3.5 text-amber-300" />}
                  </div>
                  <span className={`text-[10px] ${scopeMode === 'current_product' ? 'text-emerald-100' : 'text-emerald-800/80'}`}>
                    {currentProductContext.isNewProduct ? 'Exclusive for this new listing' : 'Exclusive to this item'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setScopeMode('all')}
                className={`p-2.5 border text-left flex flex-col justify-between gap-1.5 transition cursor-pointer ${
                  scopeMode === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-[#1a1716]/15 text-[#1a1716] hover:border-[#1a1716]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold">All Products</span>
                  {scopeMode === 'all' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <span className={`text-[10px] ${scopeMode === 'all' ? 'text-white/70' : 'text-[#1a1716]/50'}`}>
                  Storewide on entire catalog
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScopeMode('category')}
                className={`p-2.5 border text-left flex flex-col justify-between gap-1.5 transition cursor-pointer ${
                  scopeMode === 'category'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-[#1a1716]/15 text-[#1a1716] hover:border-[#1a1716]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold">Category Scope</span>
                  {scopeMode === 'category' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <span className={`text-[10px] ${scopeMode === 'category' ? 'text-white/70' : 'text-[#1a1716]/50'}`}>
                  Auto-applies to category
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScopeMode('specific')}
                className={`p-2.5 border text-left flex flex-col justify-between gap-1.5 transition cursor-pointer ${
                  scopeMode === 'specific'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-[#1a1716]/15 text-[#1a1716] hover:border-[#1a1716]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold">Specific Products</span>
                  {scopeMode === 'specific' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <span className={`text-[10px] ${scopeMode === 'specific' ? 'text-white/70' : 'text-[#1a1716]/50'}`}>
                  Multiple selected items
                </span>
              </button>
            </div>

            {scopeMode === 'current_product' && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-950 font-mono text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-900 text-[11px] uppercase tracking-wide">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Individual Product Exclusive Offer
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  This offer will be specifically attached to <strong>"{currentProductContext?.name || 'this new item'}"</strong>. {currentProductContext?.isNewProduct ? 'It will be automatically linked as soon as you finish and publish this product listing.' : 'It will be attached immediately.'}
                </p>
              </div>
            )}

            {scopeMode === 'category' && (
              <div className="p-3 bg-[#f2efeb]/50 border border-[#1a1716]/10 flex items-center gap-3">
                <span className="font-mono text-xs text-[#1a1716] font-semibold">Select Category:</span>
                <select
                  value={categoryScope}
                  onChange={(e) => setCategoryScope(e.target.value as CategoryScope)}
                  className="text-xs px-3 py-1.5 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d] font-mono font-bold uppercase"
                >
                  <option value="electrical">Electrical Goods</option>
                  <option value="construction">Construction Materials</option>
                </select>
              </div>
            )}

            {scopeMode === 'specific' && (
              <div className="p-3 bg-[#f2efeb]/40 border border-[#1a1716]/10">
                <ProductPicker
                  selectedProductIds={selectedProductIds}
                  onChange={setSelectedProductIds}
                />
              </div>
            )}
          </div>

          {/* Campaign Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1716]/80 mb-1">
                Valid From
              </label>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#1a1716]/80 mb-1">
                Valid Until (Optional Expiry)
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
              />
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200">
            <div>
              <div className="font-mono text-xs font-bold text-[#1a1716]">Active Campaign Status</div>
              <div className="text-[10px] text-[#1a1716]/60">Inactive offers cannot be claimed by buyers at checkout.</div>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                isActive ? 'bg-[#2e4a3d]' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#1a1716]/10 flex items-center justify-end gap-3 font-mono text-xs">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-[#1a1716]/70 hover:text-[#1a1716] uppercase font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#1a1716] hover:bg-[#2e4a3d] text-white uppercase font-bold tracking-wider transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Offer...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Save Changes' : 'Create Offer'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
