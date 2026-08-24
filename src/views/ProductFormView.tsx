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
  Zap, 
  HardHat, 
  Check, 
  Layers, 
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

        if (error) {
          throw error;
        }

        if (data && mounted) {
          setName(data.name || '');
          setBrand(data.brand || '');
          setCategory(data.category === 'construction' ? 'construction' : 'electrical');
          setSubcategory(data.subcategory || '');
          setUnit(data.unit || '');
          setPrice(data.price !== undefined && data.price !== null ? String(data.price) : '');
          setMrp(data.mrp !== undefined && data.mrp !== null ? String(data.mrp) : '');
          setStockQuantity(data.stock_quantity !== undefined && data.stock_quantity !== null ? String(data.stock_quantity) : '0');
          setDeliveryMinutes(data.delivery_minutes !== undefined && data.delivery_minutes !== null ? String(data.delivery_minutes) : '30');
          setDescription(data.description || '');

          setInStock(data.in_stock ?? true);
          setIsEmergency(data.is_emergency ?? false);
          setIsBestSeller(data.is_best_seller ?? false);

          setImageUrls(Array.isArray(data.image_urls) ? data.image_urls : []);
          setTags(Array.isArray(data.tags) ? data.tags : []);
          setColors(Array.isArray(data.colors) ? data.colors : []);

          // Convert specifications jsonb object to key-value list
          if (data.specifications && typeof data.specifications === 'object') {
            const specList: SpecificationItem[] = Object.entries(data.specifications).map(
              ([k, v]) => ({
                id: Math.random().toString(36).substring(2, 9),
                key: k,
                value: String(v),
              })
            );
            setSpecifications(specList);
          } else {
            setSpecifications([]);
          }

          // Convert faqs jsonb array to FaqItem array
          if (Array.isArray(data.faqs)) {
            const faqList: FaqItem[] = data.faqs.map((f: { q?: string; a?: string }) => ({
              id: Math.random().toString(36).substring(2, 9),
              q: f.q || '',
              a: f.a || '',
            }));
            setFaqs(faqList);
          } else {
            setFaqs([]);
          }
        }
      } catch (err: unknown) {
        console.error('Error fetching product for edit:', err);
        const msg = err instanceof Error ? err.message : 'Failed to load product details.';
        setFormError(msg);
        showToast({
          type: 'error',
          title: 'Product Load Failed',
          description: msg,
        });
      } finally {
        if (mounted) {
          setIsLoadingProduct(false);
        }
      }
    }

    fetchProduct();

    return () => {
      mounted = false;
    };
  }, [productId, showToast]);

  // Live discount % calculation preview
  const numPrice = parseFloat(price) || 0;
  const numMrp = parseFloat(mrp) || 0;
  const discountPercentPreview =
    numMrp > 0 && numPrice > 0 && numMrp > numPrice
      ? Math.round(((numMrp - numPrice) / numMrp) * 100)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!name.trim()) {
      setFormError('Product Name is required.');
      return;
    }
    if (!brand.trim()) {
      setFormError('Brand is required.');
      return;
    }
    if (!category) {
      setFormError('Category is required.');
      return;
    }
    if (!price.trim() || isNaN(numPrice) || numPrice <= 0) {
      setFormError('A valid Selling Price (greater than 0) is required.');
      return;
    }
    if (imageUrls.length === 0) {
      setFormError('At least 1 product image is required.');
      return;
    }

    // Convert specifications array back to JSON object
    const specsObject: Record<string, string> = {};
    for (const item of specifications) {
      if (item.key.trim() && item.value.trim()) {
        specsObject[item.key.trim()] = item.value.trim();
      }
    }

    // Convert FAQs array back to clean {q, a} list
    const cleanFaqs = faqs
      .filter((f) => f.q.trim() && f.a.trim())
      .map((f) => ({ q: f.q.trim(), a: f.a.trim() }));

    // Clean tags
    const cleanTags = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);

    // Clean colors
    const cleanColors = colors.map((c) => c.trim()).filter(Boolean);

    // Construct Payload — STRICTLY EXCLUDING `id` and `discount_percent`
    const payload = {
      name: name.trim(),
      brand: brand.trim(),
      category,
      subcategory: subcategory.trim(),
      price: numPrice,
      mrp: numMrp > 0 ? numMrp : null,
      unit: unit.trim() || '1 pc',
      stock_quantity: parseInt(stockQuantity, 10) || 0,
      in_stock: inStock,
      image_urls: imageUrls,
      delivery_minutes: parseInt(deliveryMinutes, 10) || 30,
      description: description.trim(),
      specifications: specsObject,
      faqs: cleanFaqs,
      tags: cleanTags,
      colors: cleanColors,
      is_emergency: isEmergency,
      is_best_seller: isBestSeller,
      updated_at: new Date().toISOString(),
    };

    setIsSubmitting(true);

    try {
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
          description: `"${name}" changes have been saved to Supabase.`,
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
      <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <div className="font-semibold text-slate-800 text-sm">Loading Product Record...</div>
        <div className="text-xs text-slate-400">Fetching specifications and stored images from Supabase.</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-20" id="product-editor-form">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-16 bg-slate-50/95 backdrop-blur-xs py-3 z-30 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="btn-back-to-list"
            onClick={onCancel}
            className="p-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:text-slate-900 shadow-2xs transition"
            title="Back to Product List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-xs text-slate-500">
              {isEditing
                ? `Updating product ID: ${productId}`
                : 'Fill details below to publish directly to the live catalog'}
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            id="btn-cancel-form"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            id="btn-submit-product-form"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving to Supabase...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditing ? 'Update Product' : 'Publish Product'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message Box */}
      {formError && (
        <div
          id="form-error-alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start gap-3 animate-in fade-in duration-150"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Validation or Database Error</div>
            <div className="mt-0.5 text-rose-800">{formError}</div>
          </div>
        </div>
      )}

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: Main Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Basic Product Info Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Package className="w-4 h-4 text-amber-500" />
              General Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-product-name"
                  type="text"
                  required
                  placeholder="e.g. Havells Life Line Plus 1.5 Sqmm Single Core Copper Wire"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                />
              </div>

              {/* Brand */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Brand Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-product-brand"
                  type="text"
                  required
                  placeholder="e.g. Havells, Polycab, Tata Tiscon, Anchor"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  id="select-product-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800"
                >
                  <option value="electrical">⚡ Electrical</option>
                  <option value="construction">🏗️ Construction</option>
                </select>
              </div>

              {/* Subcategory */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subcategory
                </label>
                <input
                  id="input-product-subcategory"
                  type="text"
                  placeholder="e.g. FR PVC Wires, TMT Steel, Modular Switches, Conduits"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Unit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unit of Sale
                </label>
                <input
                  id="input-product-unit"
                  type="text"
                  placeholder='e.g. "1 Coil (90m)", "1 pc", "1 Bundle", "1 Meter"'
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Pricing & Stock Inventory Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Percent className="w-4 h-4 text-emerald-500" />
              Pricing, Inventory & Delivery
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Selling Price */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Selling Price (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-bold">
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
                    className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Final price charged to customer.</p>
              </div>

              {/* MRP (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Maximum Retail Price / MRP (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-bold">
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
                    className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                {discountPercentPreview !== null ? (
                  <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Preview: {discountPercentPreview}% OFF
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">Optional printed list price.</p>
                )}
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Warehouse Stock Quantity
                </label>
                <input
                  id="input-product-stock-quantity"
                  type="number"
                  min="0"
                  placeholder="50"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {parseInt(stockQuantity, 10) < 10 ? (
                    <span className="text-rose-600 font-semibold">Low stock warning (&lt;10)</span>
                  ) : (
                    'Available units in stock'
                  )}
                </p>
              </div>
            </div>

            {/* Delivery minutes */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Estimated Delivery Time (Minutes)
                </label>
                <p className="text-[11px] text-slate-400">
                  Default is 30 mins for rapid emergency warehouse dispatch.
                </p>
              </div>
              <div className="w-32">
                <input
                  id="input-product-delivery-minutes"
                  type="number"
                  min="5"
                  step="5"
                  value={deliveryMinutes}
                  onChange={(e) => setDeliveryMinutes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Image Upload Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <ImageUploader
              imageUrls={imageUrls}
              onChange={setImageUrls}
            />
          </div>

          {/* 4. Product Description Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-4 h-4 text-amber-500" />
              Product Description
            </h2>
            <textarea
              id="textarea-product-description"
              rows={4}
              placeholder="Detailed description of product features, certifications, materials, applications, installation recommendations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs leading-relaxed px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400 text-slate-800"
            />
          </div>

          {/* 5. Specifications Builder */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <SpecificationsBuilder
              items={specifications}
              onChange={setSpecifications}
              category={category}
            />
          </div>

          {/* 6. FAQ Builder */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <FaqBuilder
              items={faqs}
              onChange={setFaqs}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Toggles & Tagging */}
        <div className="space-y-6">
          {/* Status & Catalog Visibility Toggles */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Catalog Visibility & Badges
            </h2>

            {/* In Stock Toggle */}
            <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <div className="text-xs font-bold text-slate-800">In Stock / Live in Store</div>
                <div className="text-[11px] text-slate-500">
                  {inStock ? 'Visible and purchasable by customers' : 'Hidden from storefront catalog'}
                </div>
              </div>
              <button
                type="button"
                id="toggle-form-in-stock"
                onClick={() => setInStock(!inStock)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  inStock ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    inStock ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 30m Emergency Delivery Toggle */}
            <div className="flex items-center justify-between gap-3 p-3 bg-rose-50/60 rounded-xl border border-rose-200/80">
              <div>
                <div className="text-xs font-bold text-rose-950 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-600" />
                  30m Emergency Dispatch
                </div>
                <div className="text-[11px] text-rose-800">
                  Highlight for urgent repair orders
                </div>
              </div>
              <button
                type="button"
                id="toggle-form-is-emergency"
                onClick={() => setIsEmergency(!isEmergency)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isEmergency ? 'bg-rose-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isEmergency ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Best Seller Badge Toggle */}
            <div className="flex items-center justify-between gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
              <div>
                <div className="text-xs font-bold text-amber-950 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Best Seller Badge
                </div>
                <div className="text-[11px] text-amber-800">
                  Showcase on homepage curated carousel
                </div>
              </div>
              <button
                type="button"
                id="toggle-form-is-bestseller"
                onClick={() => setIsBestSeller(!isBestSeller)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isBestSeller ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isBestSeller ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Colors / Variant Options */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <ColorsInput colors={colors} onChange={setColors} />
          </div>

          {/* Tags & Search Keywords */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <TagsInput tags={tags} onChange={setTags} />
          </div>

          {/* Database & Supabase Sync Note */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="font-bold flex items-center gap-1.5 text-amber-400">
              <Info className="w-4 h-4" /> Live Sync Direct to Supabase
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              When saved, this record writes straight to the <code className="font-mono text-amber-300">products</code> table. Discount percentage is auto-computed by Postgres.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
