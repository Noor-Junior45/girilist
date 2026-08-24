import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Boxes, 
  PlusCircle, 
  LogOut, 
  ShieldCheck, 
  Zap, 
  HardHat, 
  ExternalLink,
  Store
} from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  productCount?: number;
}

export function Navbar({ currentPath, onNavigate, productCount }: NavbarProps) {
  const { user, signOut } = useAuth();

  return (
    <header id="app-navbar" className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-6">
            <button
              id="brand-logo-btn"
              onClick={() => onNavigate('/')}
              className="flex items-center gap-3 text-left group transition"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <Store className="w-5 h-5 text-slate-950 font-bold" />
              </div>
              <div>
                <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                  Giriraj <span className="text-amber-400 font-medium">Product Manager</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <span>Giriraj Electricals & Construction</span>
                  <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                  <span className="text-emerald-400 text-[10px]">Live Catalog</span>
                </div>
              </div>
            </button>

            {/* Quick Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5 pl-4 border-l border-slate-800 text-xs font-medium">
              <button
                id="nav-all-products"
                onClick={() => onNavigate('/')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  currentPath === '/' || currentPath === '/products'
                    ? 'bg-slate-800 text-white font-semibold shadow-inner'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Boxes className="w-3.5 h-3.5 text-amber-400" />
                Products Catalog
                {productCount !== undefined && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300 text-[10px]">
                    {productCount}
                  </span>
                )}
              </button>

              <button
                id="nav-add-product"
                onClick={() => onNavigate('/products/new')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  currentPath === '/products/new'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                + Add Product
              </button>
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {/* Mobile Add Product button */}
            <button
              id="mobile-nav-add-product"
              onClick={() => onNavigate('/products/new')}
              className="md:hidden flex items-center justify-center p-2 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition"
              title="Add New Product"
            >
              <PlusCircle className="w-4 h-4" />
            </button>

            {/* Admin Badge & Email */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 text-[10px] font-semibold tracking-wider uppercase border border-amber-400/20">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                Admin
              </span>
              <span className="text-slate-300 max-w-[150px] truncate" title={user?.email || 'Admin Staff'}>
                {user?.email || 'staff@giriraj.in'}
              </span>
            </div>

            {/* Sign Out Button */}
            <button
              id="btn-signout"
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700 hover:border-rose-500/30 transition"
              title="Sign Out of Admin Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
