import React, { useState, useEffect } from 'react';
import { Product, ProductCategory, SpecificationItem, FaqItem } from '../types';
import { supabase } from '../lib/supabaseClient';
import { ImageUploader } from '../components/ImageUploader';
import { SpecificationsBuilder } from '../components/SpecificationsBuilder';
import { FaqBuilder } from '../components/FaqBuilder';
import { TagsInput } from '../components/TagsInput';
import { ColorsInput } from '../components/ColorsInput';
import { useToast } from '../context/ToastContext';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  Flame, 
  Percent, 
  Info,
  Package,
  FileText
} from 'lucide-react';

interface ProductFormViewProps {
  productId?: string | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function ProductFormView({
  productId,
  onCancel,
  onSuccess,
}: ProductFormViewProps) {
  const isEditing = Boolean(productId);
  const { showToast } = useToast();

  // Form State
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('electrical');
  const [subcategory, setSubcategory] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState<string>('');
  const [mrp, setMrp] = useState<string>('');
  const [stockQuantity, setStockQuantity] = useState<string>('50');
  const [deliveryMinutes, setDeliveryMinutes] = useState<string>('30');
  const [description, setDescription] = useState('');

  // Toggles
  const [inStock, setInStock] = useState<boolean>(true);
  const [isEmergency, setIsEmergency] = useState<boolean>(false);
  const [isBestSeller, setIsBestSeller] = useState<boolean>(false);

  // Nested structured builders
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [specifications, setSpecifications] = useState<SpecificationItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);

  // UI state
  const [isLoadingProduct, setIsLoadingProduct] = useState<boolean>(isEditing);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch product for editing
  useEffect(() => {
    if (!productId) return;

    let mounted = true;

    async function fetchProduct() {
      setIsLoadingProduct(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (error) throw error;

        if (data && mounted) {
          setName(data.name || '');
          setBrand(data.brand || '');
          setCategory(data.category || 'electrical');
          setSubcategory(data.subcategory || '');
          setUnit(data.unit || '');
          setPrice(data.price !== undefined ? String(data.price) : '');
          setMrp(data.mrp !== undefined && data.mrp !== null ? String(data.mrp) : '');
          setStockQuantity(data.stock_quantity !== undefined ? String(data.stock_quantity) : '50');
          setDeliveryMinutes(data.delivery_minutes !== undefined ? String(data.delivery_minutes) : '30');
          setDescription(data.description || '');
          setInStock(data.in_stock ?? true);
          setIsEmergency(data.is_emergency ?? false);
          setIsBestSeller(data.is_best_seller ?? false);

          setImageUrls(Array.isArray(data.image_urls) ? data.image_urls : []);
          setSpecifications(Array.isArray(data.specifications) ? data.specifications : []);
          setFaqs(Array.isArray(data.faqs) ? data.faqs : []);
          setTags(Array.isArray(data.tags) ? data.tags : []);
          setColors(Array.isArray(data.colors) ? data.colors : []);
        }
      } catch (err: unknown) {
        console.error('Error fetching product for editing:', err);
        const msg = err instanceof Error ? err.message : 'Could not fetch product from Supabase.';
        setFormError(msg);
        showToast({
          type: 'error',
          title: 'Load Failed',
          description: msg,
        });
      } finally {
        if (mounted) setIsLoadingProduct(false);
      }
    }

    fetchProduct();

    return () => {
      mounted = false;
    };
  }, [productId]);

  // Compute discount preview
  const numPrice = parseFloat(price) || 0;
  const numMrp = parseFloat(mrp) || 0;
  const discountPercentPreview =
    numMrp > numPrice && numPrice > 0
      ? Math.round(((numMrp - numPrice) / numMrp) * 100)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Form Validations
    if (!name.trim()) {
      setFormError('Product Name is required.');
      return;
    }

    if (!brand.trim()) {
      setFormError('Brand Name is required.');
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setFormError('Valid positive selling price is required.');
      return;
    }

    const parsedMrp = mrp.trim() ? parseFloat(mrp) : null;
    if (parsedMrp !== null && (isNaN(parsedMrp) || parsedMrp < 0)) {
      setFormError('MRP must be a valid positive number if provided.');
      return;
    }

    const parsedStock = parseInt(stockQuantity, 10);
    const parsedDelivery = parseInt(deliveryMinutes, 10);

    setIsSubmitting(true);

    try {
      const payload: Partial<Product> = {
        name: name.trim(),
        brand: brand.trim(),
        category,
        subcategory: subcategory.trim() || undefined,
        unit: unit.trim() || undefined,
        price: parsedPrice,
        mrp: parsedMrp !== null ? parsedMrp : undefined,
        stock_quantity: !isNaN(parsedStock) ? parsedStock : 0,
        delivery_minutes: !isNaN(parsedDelivery) ? parsedDelivery : 30,
        description: description.trim() || undefined,
        in_stock: inStock,
        is_emergency: isEmergency,
        is_best_seller: isBestSeller,
        image_urls: imageUrls.filter((url) => Boolean(url && url.trim())),
        specifications: specifications.filter((s) => s.key.trim() && s.value.trim()),
        faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
        tags: tags.filter((t) => t.trim()),
        colors: colors.filter((c) => c.trim()),
        updated_at: new Date().toISOString(),
      };

      if (isEditing && productId) {
        // UPDATE existing product
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', productId);

        if (error) {
          throw error;
        }

        showToast({
          type: 'success',
          title: 'Product Updated',
          description: `"${name}" has been updated in the catalog.`,
        });
      } else {
        // INSERT new product
        const { error } = await supabase
          .from('products')
          .insert(payload);

        if (error) {
          throw error;
        }

        showToast({
          type: 'success',
          title: 'Product Created',
          description: `"${name}" is now live in the Giriraj catalog.`,
        });
      }

      onSuccess();
    } catch (err: unknown) {
      console.error('Save product error:', err);
      const msg = err instanceof Error ? err.message : 'Database error while saving product.';
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

  if (isLoadingProduct) {
    return (
      <div className="p-16 text-center bg-white border border-[#1a1716]/10 flex flex-col items-center justify-center gap-3 font-mono">
        <Loader2 className="w-8 h-8 text-[#2e4a3d] animate-spin" />
        <div className="text-xs uppercase tracking-widest text-[#1a1716]">Loading Product Record...</div>
        <div className="text-[10px] text-[#1a1716]/50">Fetching specifications and stored assets</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-20 font-sans" id="product-editor-form">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-16 bg-[#f2efeb]/95 backdrop-blur-xs py-3 z-30 border-b border-[#1a1716]/10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="btn-back-to-list"
            onClick={onCancel}
            className="p-2.5 bg-white border border-[#1a1716]/15 hover:border-[#1a1716]/30 text-[#1a1716] shadow-2xs transition cursor-pointer"
            title="Back to Product List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#1a1716]/50 block mb-0.5">
              {isEditing ? `Catalog Entry: ${productId}` : 'New Inventory Item'}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold italic text-[#1a1716] tracking-tight">
              {isEditing ? 'Edit Product Specification' : 'Add New Product'}
            </h1>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <button
            type="button"
            id="btn-cancel-form"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-[#1a1716]/70 hover:text-[#1a1716] uppercase tracking-wider transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            id="btn-submit-product-form"
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
                <span>{isEditing ? 'Update Record' : 'Publish Product'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message Box */}
      {formError && (
        <div
          id="form-error-alert"
          className="p-4 bg-rose-50 border border-rose-200 text-xs font-mono text-rose-900 flex items-start gap-3"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold uppercase tracking-wider">Validation Error</div>
            <div className="mt-0.5 text-rose-800">{formError}</div>
          </div>
        </div>
      )}

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: Main Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Basic Product Info Card */}
          <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs space-y-4">
            <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1716] flex items-center gap-2 border-b border-[#1a1716]/10 pb-3">
              <Package className="w-4 h-4 text-[#2e4a3d]" />
              General Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name */}
              <div className="sm:col-span-2 space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                  Product Name <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-product-name"
                  type="text"
                  required
                  placeholder="e.g. Havells Life Line Plus 1.5 Sqmm Single Core Copper Wire"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d] font-medium"
                />
              </div>

              {/* Brand */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                  Brand <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-product-brand"
                  type="text"
                  required
                  placeholder="e.g. Havells, Polycab, Tata Tiscon"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
                />
              </div>

              {/* Category Dropdown */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                  Category <span className="text-rose-600">*</span>
                </label>
                <select
                  id="select-product-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d] font-mono font-semibold text-[#1a1716] uppercase"
                >
                  <option value="electrical">⚡ Electrical</option>
                  <option value="construction">🏗️ Construction</option>
                </select>
              </div>

              {/* Subcategory */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                  Subcategory
                </label>
                <input
                  id="input-product-subcategory"
                  type="text"
                  placeholder="e.g. FR PVC Wires, TMT Steel, Conduits"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
                />
              </div>

              {/* Unit */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                  Unit of Sale
                </label>
                <input
                  id="input-product-unit"
                  type="text"
                  placeholder='e.g. "1 Coil (90m)", "1 pc", "1 Bundle"'
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
                />
              </div>
            </div>
          </div>

          {/* 2. Pricing & Stock Inventory Card */}
          <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs space-y-4">
            <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1716] flex items-center gap-2 border-b border-[#1a1716]/10 pb-3">
              <Percent className="w-4 h-4 text-[#2e4a3d]" />
              Pricing, Inventory & Logistics
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Selling Price */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                  Selling Price (₹) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#1a1716]/40 text-xs font-mono font-bold">
                    ₹
                  </span>
                  <input
                    id="input-product-price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="1250"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 bg-white border border-[#1a1716]/15 text-sm font-mono font-bold text-[#1a1716] focus:outline-none focus:border-[#2e4a3d]"
                  />
                </div>
                <p className="font-mono text-[10px] text-[#1a1716]/50">Customer billing rate.</p>
              </div>

              {/* MRP */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                  List MRP (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#1a1716]/40 text-xs font-mono font-bold">
                    ₹
                  </span>
                  <input
                    id="input-product-mrp"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="1500"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 bg-white border border-[#1a1716]/15 text-sm font-mono text-[#1a1716] focus:outline-none focus:border-[#2e4a3d]"
                  />
                </div>
                {discountPercentPreview !== null ? (
                  <p className="font-mono text-[10px] font-bold text-[#2e4a3d] flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Preview: {discountPercentPreview}% OFF
                  </p>
                ) : (
                  <p className="font-mono text-[10px] text-[#1a1716]/50">Optional retail label price.</p>
                )}
              </div>

              {/* Stock Quantity */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
                  Stock Units
                </label>
                <input
                  id="input-product-stock-quantity"
                  type="number"
                  min="0"
                  placeholder="50"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#1a1716]/15 text-sm font-mono font-bold text-[#1a1716] focus:outline-none focus:border-[#2e4a3d]"
                />
                <p className="font-mono text-[10px] text-[#1a1716]/50">
                  {parseInt(stockQuantity, 10) < 10 ? (
                    <span className="text-rose-700 font-bold uppercase">Low Stock (&lt;10)</span>
                  ) : (
                    'Available in warehouse'
                  )}
                </p>
              </div>
            </div>

            {/* Delivery minutes */}
            <div className="pt-3 border-t border-[#1a1716]/10 flex items-center justify-between gap-4 font-mono">
              <div>
                <label className="text-[11px] font-bold text-[#1a1716] flex items-center gap-1.5 uppercase">
                  <Clock className="w-3.5 h-3.5 text-[#2e4a3d]" />
                  Estimated Delivery Time (Minutes)
                </label>
                <p className="text-[10px] text-[#1a1716]/50">
                  Default is 30m for rapid infrastructure dispatch.
                </p>
              </div>
              <div className="w-28">
                <input
                  id="input-product-delivery-minutes"
                  type="number"
                  min="5"
                  step="5"
                  value={deliveryMinutes}
                  onChange={(e) => setDeliveryMinutes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold font-mono bg-white border border-[#1a1716]/15 text-right focus:outline-none focus:border-[#2e4a3d]"
                />
              </div>
            </div>
          </div>

          {/* 3. Image Upload Section */}
          <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs">
            <ImageUploader
              imageUrls={imageUrls}
              onChange={setImageUrls}
            />
          </div>

          {/* 4. Product Description Card */}
          <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs space-y-3">
            <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1716] flex items-center gap-2 border-b border-[#1a1716]/10 pb-3">
              <FileText className="w-4 h-4 text-[#2e4a3d]" />
              Product Description
            </h2>
            <textarea
              id="textarea-product-description"
              rows={4}
              placeholder="Detailed description of product features, ISI/BIS certifications, gauge, conductor grade, applications..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs leading-relaxed px-3.5 py-2.5 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d] placeholder:text-[#1a1716]/30 text-[#1a1716]"
            />
          </div>

          {/* 5. Specifications Builder */}
          <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs">
            <SpecificationsBuilder
              items={specifications}
              onChange={setSpecifications}
              category={category}
            />
          </div>

          {/* 6. FAQ Builder */}
          <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs">
            <FaqBuilder
              items={faqs}
              onChange={setFaqs}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Toggles & Tagging */}
        <div className="space-y-6">
          {/* Status & Catalog Visibility Toggles */}
          <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs space-y-4">
            <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1716] border-b border-[#1a1716]/10 pb-3">
              Store Visibility & Flags
            </h2>

            {/* In Stock Toggle */}
            <div className="flex items-center justify-between gap-3 p-3 bg-[#f2efeb]/60 border border-[#1a1716]/10 font-mono">
              <div>
                <div className="text-[11px] font-bold uppercase text-[#1a1716]">Active in Store</div>
                <div className="text-[10px] text-[#1a1716]/60">
                  {inStock ? 'Visible to storefront buyers' : 'Hidden from public'}
                </div>
              </div>
              <button
                type="button"
                id="toggle-form-in-stock"
                onClick={() => setInStock(!inStock)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                  inStock ? 'bg-[#00c067]' : 'bg-[#cfd4dc]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.22)] transition duration-200 ease-in-out ${
                    inStock ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 30m Emergency Delivery Toggle */}
            <div className="flex items-center justify-between gap-3 p-3 bg-rose-50/70 border border-rose-200 font-mono">
              <div>
                <div className="text-[11px] font-bold text-rose-950 flex items-center gap-1 uppercase">
                  <Flame className="w-3.5 h-3.5 text-rose-600" />
                  30m Emergency Dispatch
                </div>
                <div className="text-[10px] text-rose-800">
                  Tag for urgent repair calls
                </div>
              </div>
              <button
                type="button"
                id="toggle-form-is-emergency"
                onClick={() => setIsEmergency(!isEmergency)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                  isEmergency ? 'bg-[#ea4335]' : 'bg-[#cfd4dc]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.22)] transition duration-200 ease-in-out ${
                    isEmergency ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Best Seller Badge Toggle */}
            <div className="flex items-center justify-between gap-3 p-3 bg-blue-50/50 border border-blue-200/60 font-mono">
              <div>
                <div className="text-[11px] font-bold text-blue-950 flex items-center gap-1 uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Best Seller Badge
                </div>
                <div className="text-[10px] text-blue-800/80">
                  Feature in highlighted carousel
                </div>
              </div>
              <button
                type="button"
                id="toggle-form-is-bestseller"
                onClick={() => setIsBestSeller(!isBestSeller)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                  isBestSeller ? 'bg-[#1a73e8]' : 'bg-[#cfd4dc]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.22)] transition duration-200 ease-in-out ${
                    isBestSeller ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Colors / Variant Options */}
          <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs">
            <ColorsInput colors={colors} onChange={setColors} />
          </div>

          {/* Tags & Search Keywords */}
          <div className="bg-white p-6 border border-[#1a1716]/10 shadow-2xs">
            <TagsInput tags={tags} onChange={setTags} />
          </div>

          {/* Database & Supabase Sync Note */}
          <div className="bg-[#2e4a3d] text-white p-5 border border-[#1a1716]/20 space-y-2 font-mono text-xs">
            <div className="font-bold flex items-center gap-1.5 text-emerald-300 uppercase tracking-wider text-[11px]">
              <Info className="w-3.5 h-3.5" /> Direct Data Sync
            </div>
            <p className="text-white/80 text-[10px] leading-relaxed">
              Target Supabase project <code className="font-mono text-white font-bold">iffdkhzctkbglmvaayeh</code>. Changes reflect immediately on the public storefront upon publication.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
