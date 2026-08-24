import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Product, ProductCategory } from '../types';
import { 
  Search, 
  Check, 
  X, 
  Layers, 
  Loader2, 
  Package, 
  Sparkles,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react';

interface ProductPickerProps {
  selectedProductIds: string[];
  onChange: (ids: string[]) => void;
}

export function ProductPicker({ selectedProductIds, onChange }: ProductPickerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');

  useEffect(() => {
    let isMounted = true;
    async function loadProducts() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, brand, category, subcategory, price, mrp, unit, image_urls, in_stock')
          .order('name', { ascending: true });

        if (error) throw error;
        if (isMounted && data) {
          setProducts(data as Product[]);
        }
      } catch (err) {
        console.error('Failed to load products for picker:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute unique brands
  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(q));

      const matchesCat =
        categoryFilter === 'all' || p.category === categoryFilter;

      const matchesBrand =
        brandFilter === 'all' || p.brand === brandFilter;

      return matchesSearch && matchesCat && matchesBrand;
    });
  }, [products, searchQuery, categoryFilter, brandFilter]);

  // Selected products details map
  const selectedProducts = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => {
      if (selectedProductIds.includes(p.id)) {
        map.set(p.id, p);
      }
    });
    return selectedProductIds
      .map((id) => map.get(id))
      .filter((p): p is Product => Boolean(p));
  }, [products, selectedProductIds]);

  const toggleProduct = (id: string) => {
    if (selectedProductIds.includes(id)) {
      onChange(selectedProductIds.filter((item) => item !== id));
    } else {
      onChange([...selectedProductIds, id]);
    }
  };

  const removeProduct = (id: string) => {
    onChange(selectedProductIds.filter((item) => item !== id));
  };

  const selectAllFiltered = () => {
    const idsToAdd = filteredProducts.map((p) => p.id);
    const set = new Set([...selectedProductIds, ...idsToAdd]);
    onChange(Array.from(set));
  };

  const clearAllSelected = () => {
    onChange([]);
  };

  return (
    <div className="space-y-4" id="product-picker-container">
      {/* Header with counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1a1716]/10">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
            Selected Applicable Products ({selectedProductIds.length})
          </label>
          <p className="text-[11px] text-[#1a1716]/60">
            This offer will exclusively apply to these exact items in customer carts.
          </p>
        </div>
        {selectedProductIds.length > 0 && (
          <button
            type="button"
            onClick={clearAllSelected}
            className="text-[11px] font-mono text-rose-700 hover:underline uppercase tracking-wider self-start sm:self-auto cursor-pointer"
          >
            Clear All ({selectedProductIds.length})
          </button>
        )}
      </div>

      {/* Selected Chips Strip */}
      {selectedProducts.length > 0 ? (
        <div className="p-3 bg-[#f2efeb]/80 border border-[#1a1716]/15 max-h-48 overflow-y-auto space-y-2">
          <div className="flex flex-wrap gap-2">
            {selectedProducts.map((p) => (
              <div
                key={p.id}
                id={`chip-product-${p.id}`}
                className="inline-flex items-center gap-2 pl-1.5 pr-2 py-1 bg-white border border-[#1a1716]/20 shadow-2xs text-xs font-mono"
              >
                {/* Thumbnail */}
                <div className="w-5 h-5 bg-[#f2efeb] border border-[#1a1716]/10 shrink-0 overflow-hidden flex items-center justify-center">
                  {p.image_urls?.[0] ? (
                    <img
                      src={p.image_urls[0]}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Package className="w-3 h-3 text-[#1a1716]/40" />
                  )}
                </div>
                <span className="font-semibold text-[#1a1716] max-w-[180px] truncate" title={p.name}>
                  {p.name}
                </span>
                <span className="text-[#1a1716]/50 text-[10px]">₹{p.price}</span>
                <button
                  type="button"
                  onClick={() => removeProduct(p.id)}
                  className="p-0.5 text-[#1a1716]/40 hover:text-rose-600 transition cursor-pointer"
                  title="Remove from offer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>No specific products selected yet. Search and pick items from the catalog below.</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 font-mono text-xs">
        {/* Search */}
        <div className="sm:col-span-6 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#1a1716]/40" />
          <input
            id="input-product-picker-search"
            type="text"
            placeholder="Search by product name, brand, or subcategory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#1a1716]/40 hover:text-[#1a1716]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Select */}
        <div className="sm:col-span-3">
          <select
            id="select-product-picker-category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-2.5 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d] uppercase font-mono text-[11px]"
          >
            <option value="all">All Categories</option>
            <option value="electrical">⚡ Electrical</option>
            <option value="construction">🏗️ Construction</option>
          </select>
        </div>

        {/* Brand Select */}
        <div className="sm:col-span-3">
          <select
            id="select-product-picker-brand"
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="w-full px-2.5 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d] font-mono text-[11px]"
          >
            <option value="all">All Brands ({brands.length})</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Select All Action Bar */}
      <div className="flex items-center justify-between text-xs font-mono text-[#1a1716]/70 px-1">
        <span>
          Showing {filteredProducts.length} of {products.length} products
        </span>
        {filteredProducts.length > 0 && (
          <button
            type="button"
            onClick={selectAllFiltered}
            className="text-[#2e4a3d] hover:underline font-bold uppercase tracking-wider text-[10px] cursor-pointer"
          >
            + Add All {filteredProducts.length} Filtered Items
          </button>
        )}
      </div>

      {/* Product Items Table / Grid */}
      <div className="border border-[#1a1716]/15 bg-white max-h-72 overflow-y-auto divide-y divide-[#1a1716]/10">
        {isLoading ? (
          <div className="p-8 text-center font-mono text-xs text-[#1a1716]/60 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#2e4a3d]" />
            Loading catalog inventory...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-[#1a1716]/50">
            No products match the search filters.
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isSelected = selectedProductIds.includes(p.id);
            return (
              <div
                key={p.id}
                id={`picker-item-${p.id}`}
                onClick={() => toggleProduct(p.id)}
                className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  isSelected ? 'bg-[#2e4a3d]/5 hover:bg-[#2e4a3d]/10' : 'hover:bg-[#f2efeb]/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Checkbox Icon */}
                  <div className="shrink-0 text-[#2e4a3d]">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#2e4a3d]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#1a1716]/30" />
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div className="w-9 h-9 bg-[#f2efeb] border border-[#1a1716]/10 shrink-0 overflow-hidden flex items-center justify-center">
                    {p.image_urls?.[0] ? (
                      <img
                        src={p.image_urls[0]}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Package className="w-4 h-4 text-[#1a1716]/30" />
                    )}
                  </div>

                  {/* Text details */}
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-[#1a1716] truncate font-sans">
                      {p.name}
                    </div>
                    <div className="font-mono text-[10px] text-[#1a1716]/60 flex items-center gap-2">
                      <span className="uppercase font-bold text-[#2e4a3d]">{p.brand}</span>
                      <span>•</span>
                      <span className="uppercase">{p.category}</span>
                      {p.subcategory && (
                        <>
                          <span>•</span>
                          <span>{p.subcategory}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price & Unit */}
                <div className="shrink-0 text-right font-mono">
                  <div className="text-xs font-bold text-[#1a1716]">₹{p.price.toLocaleString('en-IN')}</div>
                  {p.unit && <div className="text-[10px] text-[#1a1716]/50">{p.unit}</div>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
