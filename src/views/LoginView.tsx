import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';

interface LoginViewProps {
  onSuccess: () => void;
}

export function LoginView({ onSuccess }: LoginViewProps) {
  const { signIn, retryAdminCheck, verificationError, isVerifying, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const displayError = localError || verificationError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError('Please enter both your email address and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(email, password);
    setIsSubmitting(false);

    if (result.success) {
      onSuccess();
    } else {
      setLocalError(result.error || 'Authorization failed. Please verify your credentials or permissions.');
    }
  };

  const handleRetryVerification = async () => {
    setLocalError(null);
    setIsRetrying(true);
    try {
      const check = await retryAdminCheck();
      if (check.kind === 'admin') {
        onSuccess();
      } else if (check.kind === 'not_admin') {
        setLocalError('This account does not have administrative privileges for Giriraj Product Manager.');
      } else if (check.kind === 'error') {
        setLocalError(`Admin verification check failed: ${check.message}`);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to retry verification check');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2efeb] text-[#1a1716] flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden font-sans">
      {/* Decorative architectural diagonal hatch in background corners */}
      <div 
        className="absolute top-0 right-0 w-[45vw] h-[45vw] max-w-[600px] max-h-[600px] bg-hatch-corner pointer-events-none z-0" 
        aria-hidden="true" 
      />
      <div 
        className="absolute bottom-0 left-0 w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] bg-hatch-corner pointer-events-none z-0" 
        aria-hidden="true" 
      />

      {/* Main Outer Card Container */}
      <div className="w-full max-w-[1300px] min-h-[680px] grid grid-cols-1 lg:grid-cols-12 bg-white shadow-[0_30px_90px_rgba(26,23,22,0.09)] border border-[#1a1716]/5 relative z-10 overflow-hidden">
        
        {/* Left Visual Panel (Editorial Forest Green) */}
        <div className="lg:col-span-6 bg-[#2e4a3d] p-8 sm:p-12 lg:p-16 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle accent hatch background */}
          <div className="absolute inset-0 bg-hatch-accent pointer-events-none" />

          {/* Watermark "G" */}
          <div 
            className="absolute -bottom-16 -right-8 font-display text-[26rem] lg:text-[34rem] leading-none opacity-5 text-white pointer-events-none select-none italic font-semibold"
            aria-hidden="true"
          >
            G
          </div>

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 font-mono text-[0.65rem] tracking-wider uppercase border border-white/30 px-3 py-1.5 backdrop-blur-xs text-white/90">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              System: Secure RLS Connection Established
            </div>

            <div>
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-white/60 block mb-2">
                Node Index 01 / Admin Portal
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold italic leading-[0.95] text-white tracking-tight">
                Giriraj Product Manager
              </h1>
            </div>

            <p className="text-sm sm:text-base text-white/85 font-light leading-relaxed max-w-md pt-2">
              Enterprise inventory control and catalog management for electrical and construction infrastructure specialists.
            </p>
          </div>

          {/* Bottom Visual Panel Meta */}
          <div className="relative z-10 pt-12 lg:pt-0">
            <div className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-white/60">
              Giriraj Electricals & Construction &copy; 2024
            </div>
          </div>
        </div>

        {/* Right Content Panel (Clean Editorial White Form) */}
        <div className="lg:col-span-6 p-8 sm:p-12 lg:p-16 flex flex-col justify-between bg-white relative">
          <div className="max-w-[420px] w-full mx-auto my-auto py-4">
            <header className="mb-8">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#1a1716]/50 block mb-1">
                Authorization Gateway
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold italic text-[#1a1716]">
                Staff Access
              </h2>
            </header>

            {/* Error Message & Retry Box */}
            {displayError && (
              <div 
                id="login-error-box"
                className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono space-y-2.5 animate-in fade-in duration-200"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-snug flex-1">{displayError}</div>
                </div>

                {user && (
                  <div className="pt-2 border-t border-rose-200 flex items-center justify-between">
                    <span className="text-[10px] text-rose-700 font-sans">
                      Signed in as: <strong className="font-mono">{user.email}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleRetryVerification}
                      disabled={isRetrying || isVerifying}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white font-mono text-[10px] uppercase font-bold tracking-wider transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRetrying || isVerifying ? 'animate-spin' : ''}`} />
                      <span>{isRetrying || isVerifying ? 'Verifying...' : 'Retry Verification'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="input-login-email"
                  className="block font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[#1a1716]/80 font-medium"
                >
                  Email ID
                </label>
                <input
                  id="input-login-email"
                  type="email"
                  required
                  placeholder="admin@giriraj.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-2.5 px-0 bg-transparent border-0 border-b border-[#1a1716]/20 text-[#1a1716] text-sm sm:text-base placeholder:text-[#1a1716]/30 focus:outline-none focus:border-[#2e4a3d] focus:ring-0 transition-colors"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label 
                    htmlFor="input-login-password"
                    className="block font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[#1a1716]/80 font-medium"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[0.65rem] font-mono text-[#1a1716]/50 hover:text-[#2e4a3d] transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="input-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-2.5 px-0 bg-transparent border-0 border-b border-[#1a1716]/20 text-[#1a1716] text-sm sm:text-base placeholder:text-[#1a1716]/30 focus:outline-none focus:border-[#2e4a3d] focus:ring-0 transition-colors pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-[#1a1716]/40 hover:text-[#1a1716] p-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="btn-submit-login"
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-4 px-6 bg-[#1a1716] hover:bg-[#2e4a3d] active:bg-[#233a30] text-white font-mono text-[0.75rem] uppercase tracking-[0.2em] font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-sm hover:shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Authorizing Session...</span>
                  </>
                ) : (
                  <>
                    <span>Authorize Session</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Sync Note Box */}
            <div className="mt-8 p-4 bg-[#f2efeb] border border-[#1a1716]/8 font-mono text-[0.65rem] leading-relaxed text-[#1a1716]/80">
              <div className="font-semibold text-[#1a1716] mb-0.5">
                DATABASE_CONTRACT: <span className="text-[#2e4a3d] font-bold">public.admin_users (RLS)</span>
              </div>
              <div>
                Shared Supabase project <span className="font-mono text-[#2e4a3d]">iffdkhzctkbglmvaayeh</span> via verified row-level security.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
