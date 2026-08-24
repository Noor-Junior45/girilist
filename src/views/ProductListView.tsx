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
  Filter, 
  LayoutList, 
  LayoutGrid, 
  RefreshCw, 
  AlertCircle, 
  Zap, 
  HardHat, 
  Boxes, 
  Sparkles, 
  Flame, 
  CheckCircle2, 
  ArrowUpDown,
  Loader2,
  PackageX
} from 'lucide-react';

interface ProductListViewProps {
  onAddProduct: () => void;
  onEditProduct: (id: string) => void;
}

type SortOption = 'updated_desc' | 'name_asc' | 'price_asc' | 'price_desc' | 'stock_asc';

export function ProductListView({
  onAddProduct,
  onEditProduct,
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
      // Order by updated_at descending, fallback to created_at
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

  // Update in-stock state locally on toggle
  const handleStockStatusChange = (productId: string, newInStock: boolean) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, in_stock: newInStock, updated_at: new Date().toISOString() }
          : p
      )
    );
  };

  // Remove deleted product from state
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
        // Category filter
        if (categoryFilter !== 'all' && product.category !== categoryFilter) {
          return false;
        }

        // Stock filter
        if (stockFilter === 'in_stock' && !product.in_stock) return false;
        if (stockFilter === 'out_of_stock' && product.in_stock) return false;
        if (stockFilter === 'low_stock' && product.stock_quantity >= 10) return false;

        // Special tag filter
        if (specialFilter === 'emergency' && !product.is_emergency) return false;
        if (specialFilter === 'bestseller' && !product.is_best_seller) return false;

        // Search query filter (matches name, brand, subcategory, tags, or colors)
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

  // Catalog Summary Metrics
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
    <div className="space-y-6 pb-16">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-amber-500" />
            Product Catalog & Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage live products, pricing, stock levels, specifications, and FAQs directly on Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            id="btn-refresh-products"
            onClick={fetchProducts}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:text-slate-900 shadow-2xs transition"
            title="Refresh product list from database"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          <button
            type="button"
            id="btn-add-new-product"
            onClick={onAddProduct}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 text-sm font-bold rounded-xl shadow-sm transition hover:shadow"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            + Add New Product
          </button>
        </div>
      </div>

      {/* Metrics Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">Total Catalog Items</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {metrics.electricalCount} Electrical • {metrics.constructionCount} Construction
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">Active In Store</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{metrics.inStockCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
            {metrics.total > 0 ? `${Math.round((metrics.inStockCount / metrics.total) * 100)}% available` : '0%'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">Low Stock Alert (&lt;10)</div>
          <div className={`text-2xl font-extrabold mt-1 ${metrics.lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {metrics.lowStockCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {metrics.lowStockCount > 0 ? 'Requires restocking' : 'Stock levels healthy'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">Electrical Goods</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{metrics.electricalCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Wires, switches, conduits</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-xs font-semibold text-slate-500">Estimated Inventory Value</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            ₹{(metrics.totalStockValue / 100000).toFixed(2)}L
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total stock at selling price</div>
        </div>
      </div>

      {/* Search, Category Tabs & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 overflow-x-auto text-xs font-semibold">
            <button
              id="tab-category-all"
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                categoryFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Categories ({products.length})
            </button>
            <button
              id="tab-category-electrical"
              type="button"
              onClick={() => setCategoryFilter('electrical')}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
                categoryFilter === 'electrical'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Electrical ({metrics.electricalCount})
            </button>
            <button
              id="tab-category-construction"
              type="button"
              onClick={() => setCategoryFilter('construction')}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
                categoryFilter === 'construction'
                  ? 'bg-white text-orange-700 shadow-xs'
                  : 'text-slate-600 hover:text-orange-700'
              }`}
            >
              <HardHat className="w-3.5 h-3.5 text-orange-500" />
              Construction ({metrics.constructionCount})
            </button>
          </div>

          {/* View Toggle & Sorting */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                id="select-sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="updated_desc">Recently Updated First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="price_asc">Price (Low to High)</option>
                <option value="price_desc">Price (High to Low)</option>
                <option value="stock_asc">Stock (Lowest First)</option>
              </select>
            </div>

            {/* View Mode Toggle (Table / Grid) */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                id="btn-view-table"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table View"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                type="button"
                id="btn-view-grid"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar & Sub-Filters Row */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="input-search-products"
              type="text"
              placeholder="Search by product name, brand (Havells, Polycab, Tata), subcategory, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs pb-1 sm:pb-0">
            <button
              id="filter-chip-low-stock"
              onClick={() => setStockFilter(stockFilter === 'low_stock' ? 'all' : 'low_stock')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 shrink-0 ${
                stockFilter === 'low_stock'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              Low Stock (&lt;10)
            </button>

            <button
              id="filter-chip-emergency"
              onClick={() => setSpecialFilter(specialFilter === 'emergency' ? 'all' : 'emergency')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 shrink-0 ${
                specialFilter === 'emergency'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              30m Emergency
            </button>

            <button
              id="filter-chip-bestseller"
              onClick={() => setSpecialFilter(specialFilter === 'bestseller' ? 'all' : 'bestseller')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 shrink-0 ${
                specialFilter === 'bestseller'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Best Sellers
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Loading / Error / Empty / Table / Grid */}
      {isLoading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <div className="font-semibold text-slate-800 text-sm">Loading Catalog from Supabase...</div>
          <div className="text-xs text-slate-400">Fetching products, specifications, and live stock levels.</div>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-3xl space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <div className="text-sm font-bold text-rose-900">Database Connection Notice</div>
          <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchProducts}
            className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <PackageX className="w-7 h-7" />
          </div>
          <div className="font-bold text-slate-800 text-base">No Products Found</div>
          <p className="text-xs text-slate-500 max-w-sm">
            {searchQuery || categoryFilter !== 'all' || stockFilter !== 'all'
              ? 'No products matched your search or active filter criteria. Try clearing search filters.'
              : 'Your Supabase products catalog is currently empty. Click "+ Add New Product" to create your first item.'}
          </p>
          {searchQuery || categoryFilter !== 'all' || stockFilter !== 'all' ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setStockFilter('all');
                setSpecialFilter('all');
              }}
              className="mt-2 text-xs text-amber-600 hover:text-amber-700 font-semibold underline"
            >
              Reset All Filters
            </button>
          ) : (
            <button
              onClick={onAddProduct}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-amber-400 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Add Product Now
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 pl-4 pr-3">Product / Brand</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Pricing (₹)</th>
                  <th className="py-3 px-3">Stock Level</th>
                  <th className="py-3 px-3">Live In Store</th>
                  <th className="py-3 px-3">Last Updated</th>
                  <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
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
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Showing {filteredProducts.length} of {products.length} catalog items</span>
            <span className="text-[11px]">Instant updates synced to Supabase</span>
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
          <div className="mt-4 text-center text-xs text-slate-500">
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
