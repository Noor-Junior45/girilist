import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Boxes, 
  LogOut, 
  ShieldCheck, 
  Database,
  Building2
} from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  productCount?: number;
}

export function Navbar({ currentPath, onNavigate, productCount }: NavbarProps) {
  const { user, signOut } = useAuth();

  return (
    <header id="app-navbar" className="bg-[#2e4a3d] text-white border-b border-[#1a1716]/20 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-6">
            <button
              id="brand-logo-btn"
              onClick={() => onNavigate('/')}
              className="flex items-center gap-3 text-left group transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-sm bg-white/10 border border-white/20 flex items-center justify-center text-white font-display text-xl font-bold italic group-hover:bg-white/15 transition-colors">
                G
              </div>
              <div>
                <div className="font-display text-lg tracking-tight text-white flex items-center gap-1.5 font-semibold italic">
                  Giriraj <span className="font-sans font-light text-xs not-italic tracking-wider uppercase text-white/70">Product Manager</span>
                </div>
                <div className="font-mono text-[10px] text-white/60 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>SYNC: iffdkhzctkbglmvaayeh</span>
                </div>
              </div>
            </button>

            {/* Quick Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-white/15 text-xs font-mono">
              <button
                id="nav-all-products"
                onClick={() => onNavigate('/')}
                className={`px-3 py-1.5 rounded-sm transition-all flex items-center gap-1.5 uppercase tracking-wider text-[11px] cursor-pointer ${
                  currentPath === '/' || currentPath === '/products'
                    ? 'bg-white text-[#2e4a3d] font-bold shadow-xs'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                Catalog
                {productCount !== undefined && (
                  <span className={`ml-1 px-1.5 py-0.2 rounded-xs text-[10px] ${
                    currentPath === '/' || currentPath === '/products'
                      ? 'bg-[#2e4a3d]/15 text-[#2e4a3d]'
                      : 'bg-white/15 text-white'
                  }`}>
                    {productCount}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {/* Admin Badge & Email */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-sm bg-black/15 border border-white/15 text-xs font-mono">
              <span className="flex items-center gap-1 text-emerald-300 text-[10px] font-semibold tracking-widest uppercase">
                <ShieldCheck className="w-3 h-3 text-emerald-300" />
                Admin
              </span>
              <span className="text-white/80 max-w-[150px] truncate text-[11px]" title={user?.email || 'Admin Staff'}>
                {user?.email || 'staff@giriraj.in'}
              </span>
            </div>

            {/* Sign Out Button */}
            <button
              id="btn-signout"
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-wider text-white/80 hover:text-white hover:bg-rose-900/30 border border-white/20 hover:border-rose-400/40 transition cursor-pointer"
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
