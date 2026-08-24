export type ProductCategory = 'electrical' | 'construction';

export type DiscountType = 'percentage' | 'flat';
export type CategoryScope = 'all' | 'electrical' | 'construction';
export type OfferScopeMode = 'all' | 'category' | 'specific';

export interface Offer {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number;
  max_discount?: number | null;
  category_scope: CategoryScope;
  banner_image?: string | null;
  valid_from: string;
  valid_until?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Computed / Joined relation fields for UI
  product_count?: number;
  product_ids?: string[];
}

export interface OfferProduct {
  offer_id: string;
  product_id: string;
  created_at?: string;
}

export interface OfferFormData {
  code: string;
  title: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number;
  max_discount: number | null;
  category_scope: CategoryScope;
  banner_image: string | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  scope_mode: OfferScopeMode;
  selected_product_ids: string[];
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  subcategory: string;
  price: number;
  mrp: number | null;
  discount_percent?: number | null; // read-only from DB
  unit: string;
  stock_quantity: number;
  in_stock: boolean;
  image_urls: string[];
  rating_avg?: number | null;
  rating_count?: number | null;
  delivery_minutes: number;
  description: string;
  specifications: Record<string, string>;
  faqs: Array<{ q: string; a: string }>;
  tags: string[];
  colors?: string[] | null;
  is_emergency: boolean;
  is_best_seller: boolean;
  created_at?: string;
  updated_at?: string;
}

// Payload for insert & update - strictly excludes id and discount_percent
export interface ProductFormData {
  name: string;
  brand: string;
  category: ProductCategory;
  subcategory: string;
  price: number;
  mrp: number | null;
  unit: string;
  stock_quantity: number;
  in_stock: boolean;
  image_urls: string[];
  delivery_minutes: number;
  description: string;
  specifications: Record<string, string>;
  faqs: Array<{ q: string; a: string }>;
  tags: string[];
  colors?: string[];
  is_emergency: boolean;
  is_best_seller: boolean;
}

export interface SpecificationItem {
  id: string;
  key: string;
  value: string;
}

export interface FaqItem {
  id: string;
  q: string;
  a: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}
