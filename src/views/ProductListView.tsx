import React, { useEffect, useState, useMemo } from 'react';
import { Product, ProductCategory } from '../types';
import { supabase } from '../lib/supabaseClient';
import { ProductRow } from '../components/ProductRow';
import { ProductCard } from '../components/ProductCard';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { useToast } from '../context/ToastContext';
import { 
  Plus, 
  Search, 
  LayoutList, 
  LayoutGrid, 
  RefreshCw, 
  AlertCircle, 
  Zap, 
  HardHat, 
  Boxes, 
  Sparkles, 
  Flame, 
  Loader2,
  PackageX,
  Tag
} from 'lucide-react';

interface ProductListViewProps {
  onAddProduct: () => void;
  onEditProduct: (id: string) => void;
  onNavigateToOffers?: () => void;
}

type SortOption = 'updated_desc' | 'name_asc' | 'price_asc' | 'price_desc' | 'stock_asc';

export function ProductListView({
  onAddProduct,
  onEditProduct,
  onNavigateToOffers,
}: ProductListViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock' | 'low_stock'>('all');
  const [specialFilter, setSpecialFilter] = useState<'all' | 'emergency' | 'bestseller'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated_desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Deletion Modal State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const { showToast } = useToast();

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('products')
        .select('*')
        .order('updated_at', { ascending: false, nullsFirst: false });

      if (fetchErr) {
        throw fetchErr;
      }

      setProducts(data || []);
    } catch (err: unknown) {
      console.error('Fetch products error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to retrieve products from Supabase.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Fetch Error',
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleStockStatusChange = (productId: string, newInStock: boolean) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, in_stock: newInStock, updated_at: new Date().toISOString() }
          : p
      )
    );
  };

  const handleProductDeleted = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const openDeleteModal = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        if (categoryFilter !== 'all' && product.category !== categoryFilter) {
          return false;
        }
        if (stockFilter === 'in_stock' && !product.in_stock) return false;
        if (stockFilter === 'out_of_stock' && product.in_stock) return false;
        if (stockFilter === 'low_stock' && product.stock_quantity >= 10) return false;
        if (specialFilter === 'emergency' && !product.is_emergency) return false;
        if (specialFilter === 'bestseller' && !product.is_best_seller) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = product.name?.toLowerCase().includes(q);
          const matchBrand = product.brand?.toLowerCase().includes(q);
          const matchSub = product.subcategory?.toLowerCase().includes(q);
          const matchTags = product.tags?.some((t) => t.toLowerCase().includes(q));
          const matchColors = product.colors?.some((c) => c.toLowerCase().includes(q));
          return matchName || matchBrand || matchSub || matchTags || matchColors;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'updated_desc') {
          const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
          const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
          return timeB - timeA;
        }
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'price_asc') {
          return a.price - b.price;
        }
        if (sortBy === 'price_desc') {
          return b.price - a.price;
        }
        if (sortBy === 'stock_asc') {
          return a.stock_quantity - b.stock_quantity;
        }
        return 0;
      });
  }, [products, categoryFilter, stockFilter, specialFilter, searchQuery, sortBy]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = products.length;
    const electricalCount = products.filter((p) => p.category === 'electrical').length;
    const constructionCount = products.filter((p) => p.category === 'construction').length;
    const inStockCount = products.filter((p) => p.in_stock).length;
    const lowStockCount = products.filter((p) => p.stock_quantity < 10).length;
    const totalStockValue = products.reduce((acc, p) => acc + p.price * (p.stock_quantity || 0), 0);

    return {
      total,
      electricalCount,
      constructionCount,
      inStockCount,
      lowStockCount,
      totalStockValue,
    };
  }, [products]);

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-[#1a1716]/10 pb-5">
        <div>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#1a1716]/50 block mb-1">
            System Inventory Directory
          </span>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold italic text-[#1a1716] tracking-tight">
            Product Portfolio & Inventory
          </h1>
          <p className="text-xs sm:text-sm text-[#1a1716]/70 mt-1 max-w-xl font-light">
            Live catalog control for electrical and construction assets. Direct real-time sync with Supabase project <code className="font-mono text-[#2e4a3d] font-semibold">iffdkhzctkbglmvaayeh</code>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            id="btn-refresh-products"
            onClick={fetchProducts}
            disabled={isLoading}
            className="p-3 bg-white border border-[#1a1716]/15 hover:border-[#1a1716]/30 text-[#1a1716] transition cursor-pointer shadow-2xs"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#2e4a3d]' : ''}`} />
          </button>

          {onNavigateToOffers && (
            <button
              type="button"
              id="btn-view-offers"
              onClick={onNavigateToOffers}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-[#2e4a3d]/40 hover:bg-[#2e4a3d]/5 text-[#2e4a3d] text-xs font-mono uppercase tracking-widest font-bold transition cursor-pointer shadow-2xs"
              title="Manage, Edit or Delete Product Offers"
            >
              <Tag className="w-4 h-4" />
              Manage Offers
            </button>
          )}

          <button
            type="button"
            id="btn-add-new-product"
            onClick={onAddProduct}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#1a1716] hover:bg-[#2e4a3d] active:bg-[#233a30] text-white text-xs font-mono uppercase tracking-widest font-semibold transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Add Product
          </button>
        </div>
      </div>

      {/* Architectural Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 border border-[#1a1716]/10 shadow-2xs">
          <div className="font-mono text-[0.65rem] uppercase tracking-wider text-[#1a1716]/60">Total Catalog</div>
          <div className="font-display text-3xl font-semibold italic text-[#1a1716] mt-0.5">{metrics.total}</div>
          <div className="font-mono text-[10px] text-[#1a1716]/50 mt-1">
            {metrics.electricalCount} ELEC • {metrics.constructionCount} CONST
          </div>
        </div>

        <div className="bg-white p-4 border border-[#1a1716]/10 shadow-2xs">
          <div className="font-mono text-[0.65rem] uppercase tracking-wider text-[#1a1716]/60">Active in Store</div>
          <div className="font-display text-3xl font-semibold italic text-[#2e4a3d] mt-0.5">{metrics.inStockCount}</div>
          <div className="font-mono text-[10px] text-[#2e4a3d] font-medium mt-1">
            {metrics.total > 0 ? `${Math.round((metrics.inStockCount / metrics.total) * 100)}% available` : '0%'}
          </div>
        </div>

        <div className="bg-white p-4 border border-[#1a1716]/10 shadow-2xs">
          <div className="font-mono text-[0.65rem] uppercase tracking-wider text-[#1a1716]/60">Low Stock (&lt;10)</div>
          <div className={`font-display text-3xl font-semibold italic mt-0.5 ${metrics.lowStockCount > 0 ? 'text-rose-700' : 'text-[#1a1716]'}`}>
            {metrics.lowStockCount}
          </div>
          <div className="font-mono text-[10px] text-[#1a1716]/50 mt-1">
            {metrics.lowStockCount > 0 ? 'Replenishment needed' : 'Stock optimal'}
          </div>
        </div>

        <div className="bg-white p-4 border border-[#1a1716]/10 shadow-2xs">
          <div className="font-mono text-[0.65rem] uppercase tracking-wider text-[#1a1716]/60">Electrical Lines</div>
          <div className="font-display text-3xl font-semibold italic text-[#1a1716] mt-0.5">{metrics.electricalCount}</div>
          <div className="font-mono text-[10px] text-[#1a1716]/50 mt-1">Wires, switches, conduits</div>
        </div>

        <div className="bg-white p-4 border border-[#1a1716]/10 shadow-2xs col-span-2 sm:col-span-1">
          <div className="font-mono text-[0.65rem] uppercase tracking-wider text-[#1a1716]/60">Inventory Valuation</div>
          <div className="font-display text-3xl font-semibold italic text-[#1a1716] mt-0.5">
            ₹{(metrics.totalStockValue / 100000).toFixed(2)}L
          </div>
          <div className="font-mono text-[10px] text-[#1a1716]/50 mt-1">At active selling MRP/rates</div>
        </div>
      </div>

      {/* Filter & Toolbar Box */}
      <div className="bg-white p-5 border border-[#1a1716]/10 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#f2efeb] border border-[#1a1716]/8 overflow-x-auto font-mono text-[11px]">
            <button
              id="tab-category-all"
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3.5 py-1.5 uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-white text-[#1a1716] font-bold shadow-2xs border border-[#1a1716]/10'
                  : 'text-[#1a1716]/70 hover:text-[#1a1716]'
              }`}
            >
              All Categories ({products.length})
            </button>
            <button
              id="tab-category-electrical"
              type="button"
              onClick={() => setCategoryFilter('electrical')}
              className={`px-3.5 py-1.5 uppercase tracking-wider transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                categoryFilter === 'electrical'
                  ? 'bg-white text-[#2e4a3d] font-bold shadow-2xs border border-[#1a1716]/10'
                  : 'text-[#1a1716]/70 hover:text-[#2e4a3d]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-[#2e4a3d]" />
              Electrical ({metrics.electricalCount})
            </button>
            <button
              id="tab-category-construction"
              type="button"
              onClick={() => setCategoryFilter('construction')}
              className={`px-3.5 py-1.5 uppercase tracking-wider transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                categoryFilter === 'construction'
                  ? 'bg-white text-[#2e4a3d] font-bold shadow-2xs border border-[#1a1716]/10'
                  : 'text-[#1a1716]/70 hover:text-[#2e4a3d]'
              }`}
            >
              <HardHat className="w-3.5 h-3.5 text-[#2e4a3d]" />
              Construction ({metrics.constructionCount})
            </button>
          </div>

          {/* View Toggle & Sorting */}
          <div className="flex items-center gap-2 self-end lg:self-auto font-mono">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                id="select-sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-[11px] uppercase tracking-wider font-mono bg-white border border-[#1a1716]/15 px-3 py-2 text-[#1a1716] focus:outline-none focus:border-[#2e4a3d] cursor-pointer"
              >
                <option value="updated_desc">Recently Updated First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="price_asc">Price (Low to High)</option>
                <option value="price_desc">Price (High to Low)</option>
                <option value="stock_asc">Stock (Lowest First)</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#f2efeb] p-0.5 border border-[#1a1716]/10">
              <button
                type="button"
                id="btn-view-table"
                onClick={() => setViewMode('table')}
                className={`p-1.5 transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-[#1a1716] shadow-2xs' : 'text-[#1a1716]/50 hover:text-[#1a1716]'
                }`}
                title="Table View"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                type="button"
                id="btn-view-grid"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 transition cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-[#1a1716] shadow-2xs' : 'text-[#1a1716]/50 hover:text-[#1a1716]'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar & Sub-Filters Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-[#1a1716]/10">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#1a1716]/40">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="input-search-products"
              type="text"
              placeholder="Search product name, brand (Havells, Polycab), tags, or variants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#f2efeb]/60 border border-[#1a1716]/15 text-[#1a1716] placeholder:text-[#1a1716]/40 focus:outline-none focus:border-[#2e4a3d] focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[10px] font-mono uppercase text-[#1a1716]/50 hover:text-[#1a1716]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto font-mono text-[10px] uppercase tracking-wider pb-1 sm:pb-0">
            <button
              id="filter-chip-low-stock"
              onClick={() => setStockFilter(stockFilter === 'low_stock' ? 'all' : 'low_stock')}
              className={`px-3 py-1.5 transition flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                stockFilter === 'low_stock'
                  ? 'bg-rose-50 text-rose-800 border-rose-300 font-bold'
                  : 'bg-white text-[#1a1716]/70 border-[#1a1716]/15 hover:bg-[#f2efeb]'
              }`}
            >
              <AlertCircle className="w-3 h-3 text-rose-600" />
              Low Stock (&lt;10)
            </button>

            <button
              id="filter-chip-emergency"
              onClick={() => setSpecialFilter(specialFilter === 'emergency' ? 'all' : 'emergency')}
              className={`px-3 py-1.5 transition flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                specialFilter === 'emergency'
                  ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                  : 'bg-white text-[#1a1716]/70 border-[#1a1716]/15 hover:bg-[#f2efeb]'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-600" />
              30m Emergency
            </button>

            <button
              id="filter-chip-bestseller"
              onClick={() => setSpecialFilter(specialFilter === 'bestseller' ? 'all' : 'bestseller')}
              className={`px-3 py-1.5 transition flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                specialFilter === 'bestseller'
                  ? 'bg-[#2e4a3d]/10 text-[#2e4a3d] border-[#2e4a3d]/30 font-bold'
                  : 'bg-white text-[#1a1716]/70 border-[#1a1716]/15 hover:bg-[#f2efeb]'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#2e4a3d]" />
              Best Sellers
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-16 text-center bg-white border border-[#1a1716]/10 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-[#2e4a3d] animate-spin" />
          <div className="font-mono text-xs uppercase tracking-widest text-[#1a1716]">Loading Catalog from Supabase...</div>
          <div className="font-mono text-[10px] text-[#1a1716]/50">Syncing live inventory records</div>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-50 border border-rose-200 space-y-3 font-mono">
          <AlertCircle className="w-7 h-7 text-rose-600 mx-auto" />
          <div className="text-xs font-bold uppercase tracking-wider text-rose-900">Database Connection Notice</div>
          <p className="text-[11px] text-rose-700 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchProducts}
            className="px-4 py-2 bg-rose-700 text-white text-[10px] uppercase tracking-wider font-semibold hover:bg-rose-800 transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-16 text-center bg-white border border-[#1a1716]/10 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 bg-[#f2efeb] text-[#1a1716]/40 flex items-center justify-center">
            <PackageX className="w-6 h-6" />
          </div>
          <div className="font-display text-2xl font-semibold italic text-[#1a1716]">No Products Found</div>
          <p className="text-xs text-[#1a1716]/60 max-w-sm font-light">
            {searchQuery || categoryFilter !== 'all' || stockFilter !== 'all'
              ? 'No products match your active search or filter criteria.'
              : 'Your Supabase catalog is currently empty. Click "+ Add Product" to create your first item.'}
          </p>
          {searchQuery || categoryFilter !== 'all' || stockFilter !== 'all' ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setStockFilter('all');
                setSpecialFilter('all');
              }}
              className="mt-2 text-xs font-mono uppercase tracking-wider text-[#2e4a3d] hover:underline font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          ) : (
            <button
              onClick={onAddProduct}
              className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#1a1716] text-white text-xs font-mono uppercase tracking-widest font-semibold hover:bg-[#2e4a3d] transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Add First Product
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white border border-[#1a1716]/10 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f2efeb] border-b border-[#1a1716]/10 font-mono text-[10px] uppercase tracking-wider text-[#1a1716]/70">
                  <th className="py-3 pl-4 pr-3">Product / Brand</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Pricing (₹)</th>
                  <th className="py-3 px-3">Stock</th>
                  <th className="py-3 px-3">Storefront Status</th>
                  <th className="py-3 px-3">Last Sync</th>
                  <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1716]/5">
                {filteredProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onEdit={onEditProduct}
                    onDeleteRequest={openDeleteModal}
                    onStockStatusChange={handleStockStatusChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3.5 bg-[#f2efeb]/80 border-t border-[#1a1716]/10 font-mono text-[11px] text-[#1a1716]/70 flex items-center justify-between">
            <span>Showing {filteredProducts.length} of {products.length} catalog items</span>
            <span className="text-[10px]">Real-time Supabase sync enabled</span>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={onEditProduct}
                onDeleteRequest={openDeleteModal}
                onStockStatusChange={handleStockStatusChange}
              />
            ))}
          </div>
          <div className="mt-4 text-center font-mono text-[11px] text-[#1a1716]/60">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        product={productToDelete}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        onDeleted={handleProductDeleted}
      />
    </div>
  );
}
