import React, { useState, useEffect, useMemo } from 'react';
import { Offer, CategoryScope, DiscountType } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { DeleteOfferModal } from '../components/DeleteOfferModal';
import { 
  Tag, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  Edit, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  Percent, 
  Coins, 
  Layers, 
  Package, 
  Sparkles, 
  ExternalLink,
  Copy,
  ChevronRight,
  Info
} from 'lucide-react';

interface OffersListViewProps {
  onCreateOffer: () => void;
  onEditOffer: (id: string) => void;
}

export function OffersListView({
  onCreateOffer,
  onEditOffer,
}: OffersListViewProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatingOfferId, setUpdatingOfferId] = useState<string | null>(null);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'percentage' | 'flat'>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'all_catalog' | 'electrical' | 'construction' | 'specific'>('all');

  const { showToast } = useToast();

  const fetchOffers = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch offers
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (offersError) throw offersError;

      // 2. Fetch all offer_products relations to compute specific products count
      const { data: relationsData, error: relError } = await supabase
        .from('offer_products')
        .select('offer_id, product_id');

      if (relError) {
        console.warn('Could not fetch offer_products relations:', relError);
      }

      // Group product IDs by offer_id
      const relationsMap = new Map<string, string[]>();
      if (relationsData) {
        relationsData.forEach((rel) => {
          const list = relationsMap.get(rel.offer_id) || [];
          list.push(rel.product_id);
          relationsMap.set(rel.offer_id, list);
        });
      }

      const enrichedOffers: Offer[] = (offersData || []).map((off) => {
        const prodIds = relationsMap.get(off.id) || [];
        return {
          ...off,
          product_count: prodIds.length,
          product_ids: prodIds,
        };
      });

      setOffers(enrichedOffers);
    } catch (err: unknown) {
      console.error('Fetch offers error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load offers from Supabase.';
      showToast({
        type: 'error',
        title: 'Load Failed',
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  // Quick toggle is_active
  const handleToggleActive = async (offer: Offer, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !offer.is_active;
    setUpdatingOfferId(offer.id);

    // Optimistic UI update
    setOffers((prev) =>
      prev.map((o) => (o.id === offer.id ? { ...o, is_active: newStatus } : o))
    );

    try {
      const { error } = await supabase
        .from('offers')
        .update({ is_active: newStatus })
        .eq('id', offer.id);

      if (error) throw error;

      showToast({
        type: 'success',
        title: newStatus ? 'Offer Activated' : 'Offer Deactivated',
        description: `Promo code "${offer.code}" is now ${newStatus ? 'live' : 'paused'}.`,
      });
    } catch (err: unknown) {
      console.error('Toggle offer status error:', err);
      // Revert on error
      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, is_active: offer.is_active } : o))
      );
      const msg = err instanceof Error ? err.message : 'Database error.';
      showToast({
        type: 'error',
        title: 'Update Failed',
        description: msg,
      });
    } finally {
      setUpdatingOfferId(null);
    }
  };

  const copyCodeToClipboard = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    showToast({
      type: 'info',
      title: 'Code Copied',
      description: `Coupon "${code}" copied to clipboard.`,
    });
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = offers.length;
    const active = offers.filter((o) => o.is_active).length;
    const percentage = offers.filter((o) => o.discount_type === 'percentage').length;
    const flat = offers.filter((o) => o.discount_type === 'flat').length;
    const specific = offers.filter((o) => (o.product_count ?? 0) > 0).length;

    return { total, active, percentage, flat, specific };
  }, [offers]);

  // Filtered offers
  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.code.toLowerCase().includes(q) ||
        o.title.toLowerCase().includes(q) ||
        (o.description && o.description.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? o.is_active
          : !o.is_active;

      const matchesType =
        typeFilter === 'all' ? true : o.discount_type === typeFilter;

      let matchesScope = true;
      if (scopeFilter === 'all_catalog') {
        matchesScope = (o.product_count ?? 0) === 0 && o.category_scope === 'all';
      } else if (scopeFilter === 'electrical') {
        matchesScope = (o.product_count ?? 0) === 0 && o.category_scope === 'electrical';
      } else if (scopeFilter === 'construction') {
        matchesScope = (o.product_count ?? 0) === 0 && o.category_scope === 'construction';
      } else if (scopeFilter === 'specific') {
        matchesScope = (o.product_count ?? 0) > 0;
      }

      return matchesSearch && matchesStatus && matchesType && matchesScope;
    });
  }, [offers, searchQuery, statusFilter, typeFilter, scopeFilter]);

  // Date format helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const isExpired = (validUntil?: string | null) => {
    if (!validUntil) return false;
    const until = new Date(validUntil).setHours(23, 59, 59, 999);
    return until < Date.now();
  };

  return (
    <div className="space-y-6 font-sans pb-16" id="offers-list-view">
      {/* Header & Main Call to Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a1716]/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1a1716]/50">
              Promotions & Vouchers Engine
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c067]"></span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold italic text-[#1a1716] tracking-tight">
            Offers & Discount Coupons
          </h1>
        </div>

        <button
          id="btn-create-new-offer"
          type="button"
          onClick={onCreateOffer}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a1716] hover:bg-[#2e4a3d] active:bg-[#233a30] text-white font-mono text-xs uppercase tracking-widest font-semibold transition cursor-pointer shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create New Offer</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        <div className="bg-white p-4 border border-[#1a1716]/10 shadow-2xs">
          <div className="text-[10px] uppercase tracking-wider text-[#1a1716]/60">Total Offers</div>
          <div className="text-2xl font-bold text-[#1a1716] mt-1">{metrics.total}</div>
          <div className="text-[10px] text-[#1a1716]/40 mt-0.5">Configured promotion codes</div>
        </div>

        <div className="bg-white p-4 border border-[#1a1716]/10 shadow-2xs">
          <div className="text-[10px] uppercase tracking-wider text-[#009e53] font-bold">Active in Store</div>
          <div className="text-2xl font-bold text-[#009e53] mt-1">{metrics.active}</div>
          <div className="text-[10px] text-[#1a1716]/40 mt-0.5">Eligible at checkout</div>
        </div>

        <div className="bg-white p-4 border border-[#1a1716]/10 shadow-2xs">
          <div className="text-[10px] uppercase tracking-wider text-[#2e4a3d] font-bold">Discount Types</div>
          <div className="text-sm font-bold text-[#1a1716] mt-2 flex items-center gap-2">
            <span>{metrics.percentage} Percentage</span>
            <span>•</span>
            <span>{metrics.flat} Flat</span>
          </div>
          <div className="text-[10px] text-[#1a1716]/40 mt-0.5">% or direct rupee rebates</div>
        </div>

        <div className="bg-white p-4 border border-[#1a1716]/10 shadow-2xs">
          <div className="text-[10px] uppercase tracking-wider text-[#1a1716]/60">Targeted Scopes</div>
          <div className="text-sm font-bold text-[#1a1716] mt-2 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-[#2e4a3d]" />
            <span>{metrics.specific} Specific Products</span>
          </div>
          <div className="text-[10px] text-[#1a1716]/40 mt-0.5">Mapped via join records</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 border border-[#1a1716]/10 shadow-2xs space-y-3 font-mono text-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#1a1716]/40" />
            <input
              id="input-offers-search"
              type="text"
              placeholder="Search coupon code, title, details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
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

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              id="select-offers-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d] uppercase text-[11px]"
            >
              <option value="all">All Statuses ({offers.length})</option>
              <option value="active">Active Only ({metrics.active})</option>
              <option value="inactive">Inactive / Paused ({metrics.total - metrics.active})</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="md:col-span-2">
            <select
              id="select-offers-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d] uppercase text-[11px]"
            >
              <option value="all">All Types</option>
              <option value="percentage">% Percentage</option>
              <option value="flat">₹ Flat Cash</option>
            </select>
          </div>

          {/* Scope Filter */}
          <div className="md:col-span-3">
            <select
              id="select-offers-scope"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d] uppercase text-[11px]"
            >
              <option value="all">All Scopes</option>
              <option value="all_catalog">🌐 All Products</option>
              <option value="electrical">⚡ Electrical Only</option>
              <option value="construction">🏗️ Construction Only</option>
              <option value="specific">📦 Specific Products ({metrics.specific})</option>
            </select>
          </div>
        </div>

        {/* Results Counter & Reset */}
        <div className="flex items-center justify-between text-[11px] text-[#1a1716]/60 pt-2 border-t border-[#1a1716]/10">
          <div>
            Showing <strong className="text-[#1a1716] font-bold">{filteredOffers.length}</strong> of {offers.length} offers
          </div>
          {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || scopeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setTypeFilter('all');
                setScopeFilter('all');
              }}
              className="text-[#2e4a3d] hover:underline uppercase tracking-wider font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Offers Grid / Cards */}
      {isLoading ? (
        <div className="p-16 text-center bg-white border border-[#1a1716]/10 flex flex-col items-center justify-center gap-3 font-mono">
          <Loader2 className="w-8 h-8 text-[#2e4a3d] animate-spin" />
          <div className="text-xs uppercase tracking-widest text-[#1a1716]">Loading Promo Offers...</div>
          <div className="text-[10px] text-[#1a1716]/50">Synchronizing with Supabase tables</div>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="p-16 text-center bg-white border border-[#1a1716]/10 space-y-3 font-mono">
          <Tag className="w-10 h-10 text-[#1a1716]/30 mx-auto" />
          <div className="text-sm font-bold uppercase text-[#1a1716]">No Offers Found</div>
          <p className="text-xs text-[#1a1716]/60 max-w-sm mx-auto font-sans">
            {offers.length === 0
              ? 'No promotional coupon codes exist in the database yet. Click "+ Create New Offer" to build your first discount voucher.'
              : 'No offers match your search/filter parameters. Try clearing the filter criteria.'}
          </p>
          {offers.length === 0 && (
            <button
              type="button"
              onClick={onCreateOffer}
              className="mt-2 px-4 py-2 bg-[#1a1716] text-white text-xs uppercase tracking-wider hover:bg-[#2e4a3d] transition cursor-pointer"
            >
              Create First Offer
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOffers.map((offer) => {
            const hasSpecificProducts = (offer.product_count ?? 0) > 0;
            const isUpdating = updatingOfferId === offer.id;
            const expired = isExpired(offer.valid_until);

            return (
              <div
                key={offer.id}
                id={`offer-card-${offer.id}`}
                className="bg-white border border-[#1a1716]/15 hover:border-[#1a1716]/30 transition shadow-2xs flex flex-col justify-between"
              >
                {/* Banner image if present */}
                {offer.banner_image && (
                  <div className="aspect-[3/1] w-full overflow-hidden bg-[#f2efeb] border-b border-[#1a1716]/10 relative">
                    <img
                      src={offer.banner_image}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#1a1716]/80 text-white font-mono text-[9px] uppercase tracking-wider">
                      Promo Banner
                    </div>
                  </div>
                )}

                <div className="p-5 space-y-4 flex-1">
                  {/* Top Bar: Code Badge + Toggle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Code Badge */}
                      <button
                        type="button"
                        onClick={(e) => copyCodeToClipboard(offer.code, e)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1a1716] text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-[#2e4a3d] transition cursor-pointer group shadow-2xs"
                        title="Click to copy code"
                      >
                        <span>{offer.code}</span>
                        <Copy className="w-3 h-3 text-white/60 group-hover:text-white" />
                      </button>

                      {/* Discount Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#2e4a3d]/10 text-[#2e4a3d] font-mono text-xs font-bold">
                        {offer.discount_type === 'percentage' ? (
                          <>
                            <Percent className="w-3 h-3" />
                            {offer.discount_value}% OFF
                          </>
                        ) : (
                          <>
                            <Coins className="w-3 h-3" />
                            ₹{offer.discount_value.toLocaleString('en-IN')} FLAT OFF
                          </>
                        )}
                      </span>

                      {/* Expired Tag */}
                      {expired && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 font-mono text-[10px] font-bold uppercase">
                          Expired
                        </span>
                      )}
                    </div>

                    {/* Active/Inactive Toggle */}
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <button
                        type="button"
                        id={`btn-toggle-offer-${offer.id}`}
                        onClick={(e) => handleToggleActive(offer, e)}
                        disabled={isUpdating}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                          offer.is_active ? 'bg-[#00c067]' : 'bg-[#cfd4dc]'
                        } ${isUpdating ? 'opacity-60 cursor-wait' : ''}`}
                        title={offer.is_active ? 'Offer Active. Click to pause.' : 'Offer Inactive. Click to activate.'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.22)] transition duration-200 ease-in-out flex items-center justify-center ${
                            offer.is_active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        >
                          {isUpdating && (
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-[#1a1716]/60" />
                          )}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-display text-xl font-semibold italic text-[#1a1716]">
                      {offer.title}
                    </h3>
                    {offer.description && (
                      <p className="text-xs text-[#1a1716]/70 mt-1 line-clamp-2 leading-relaxed">
                        {offer.description}
                      </p>
                    )}
                  </div>

                  {/* Rules & Conditions Grid */}
                  <div className="p-3 bg-[#f2efeb] border border-[#1a1716]/10 font-mono text-[11px] space-y-1.5">
                    {/* Scope row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#1a1716]/60">Scope:</span>
                      {hasSpecificProducts ? (
                        <span className="font-bold text-[#2e4a3d] flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" />
                          {offer.product_count} Specific Products
                        </span>
                      ) : offer.category_scope === 'electrical' ? (
                        <span className="font-bold text-amber-800 uppercase">⚡ Electrical Only</span>
                      ) : offer.category_scope === 'construction' ? (
                        <span className="font-bold text-blue-900 uppercase">🏗️ Construction Only</span>
                      ) : (
                        <span className="font-bold text-[#1a1716] uppercase">🌐 All Products</span>
                      )}
                    </div>

                    {/* Min Order & Max Discount */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#1a1716]/60">Min Order:</span>
                      <span className="font-semibold text-[#1a1716]">
                        {offer.min_order_value > 0 ? `₹${offer.min_order_value.toLocaleString('en-IN')}` : 'None'}
                      </span>
                    </div>

                    {offer.discount_type === 'percentage' && offer.max_discount && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#1a1716]/60">Max Discount:</span>
                        <span className="font-semibold text-[#2e4a3d]">
                          Capped at ₹{offer.max_discount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {/* Validity Period */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#1a1716]/10 text-[10px]">
                      <span className="text-[#1a1716]/60 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Validity:
                      </span>
                      <span className="text-[#1a1716]">
                        {formatDate(offer.valid_from)}
                        {offer.valid_until ? ` → ${formatDate(offer.valid_until)}` : ' (No Expiry)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-5 py-3 bg-[#f2efeb]/50 border-t border-[#1a1716]/10 flex items-center justify-between font-mono text-xs">
                  <div className="text-[10px] text-[#1a1716]/50">
                    ID: {offer.id.slice(0, 8)}...
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id={`btn-edit-offer-${offer.id}`}
                      onClick={() => onEditOffer(offer.id)}
                      className="px-3 py-1 bg-white border border-[#1a1716]/15 hover:border-[#1a1716]/40 text-[#1a1716] uppercase tracking-wider text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3 text-[#2e4a3d]" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      id={`btn-delete-offer-${offer.id}`}
                      onClick={() => {
                        setOfferToDelete(offer);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-1 text-[#1a1716]/40 hover:text-rose-700 transition cursor-pointer"
                      title="Delete Offer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteOfferModal
        offer={offerToDelete}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setOfferToDelete(null);
        }}
        onDeleted={(deletedId) => {
          setOffers((prev) => prev.filter((o) => o.id !== deletedId));
        }}
      />
    </div>
  );
}
