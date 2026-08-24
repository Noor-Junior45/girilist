import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  UploadCloud, 
  X, 
  Image as ImageIcon, 
  Loader2, 
  Link as LinkIcon,
  Check
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface OfferBannerUploaderProps {
  bannerUrl: string | null;
  onChange: (url: string | null) => void;
}

export function OfferBannerUploader({ bannerUrl, onChange }: OfferBannerUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast({
        type: 'warning',
        title: 'Invalid File',
        description: 'Please upload a valid image file (JPG, PNG, WebP).'
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      // Store in offers/ sub-folder within existing product-images bucket
      const fileName = `offers/${crypto.randomUUID()}-${cleanName}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      if (publicUrlData?.publicUrl) {
        onChange(publicUrlData.publicUrl);
        showToast({
          type: 'success',
          title: 'Banner Uploaded',
          description: 'Promotional offer banner image uploaded successfully.'
        });
      }
    } catch (err: unknown) {
      console.error('Banner upload error:', err);
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      showToast({
        type: 'error',
        title: 'Upload Failed',
        description: msg
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleAddCustomUrl = () => {
    if (!customUrl.trim()) return;
    try {
      new URL(customUrl.trim());
      onChange(customUrl.trim());
      setCustomUrl('');
      setShowUrlInput(false);
      showToast({
        type: 'success',
        title: 'Banner Link Attached',
        description: 'External image URL configured for offer banner.'
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Invalid URL',
        description: 'Please enter a valid HTTP/HTTPS image URL.'
      });
    }
  };

  return (
    <div className="space-y-3" id="offer-banner-uploader-section">
      <div className="flex items-center justify-between">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-[#1a1716]/80">
            Promotional Banner Image <span className="text-[#1a1716]/50 font-normal">(Optional)</span>
          </label>
          <p className="text-[11px] text-[#1a1716]/60 mt-0.5">
            Shown in the storefront top carousel, offer drawer, or category banner.
          </p>
        </div>
        <button
          type="button"
          id="btn-toggle-offer-banner-url"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs font-mono text-[#2e4a3d] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <LinkIcon className="w-3 h-3" />
          {showUrlInput ? 'Cancel URL' : 'Link via URL'}
        </button>
      </div>

      {showUrlInput && (
        <div className="flex items-center gap-2 p-3 bg-[#f2efeb] border border-[#1a1716]/15">
          <ImageIcon className="w-4 h-4 text-[#2e4a3d] shrink-0" />
          <input
            id="input-offer-banner-url"
            type="url"
            placeholder="https://example.com/banners/offer-banner.jpg"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomUrl();
              }
            }}
            className="flex-1 text-xs px-3 py-1.5 bg-white border border-[#1a1716]/15 focus:outline-none focus:border-[#2e4a3d]"
          />
          <button
            type="button"
            id="btn-confirm-banner-url"
            onClick={handleAddCustomUrl}
            className="px-3 py-1.5 bg-[#1a1716] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#2e4a3d] transition cursor-pointer"
          >
            Apply
          </button>
        </div>
      )}

      {bannerUrl ? (
        <div className="relative border border-[#1a1716]/20 bg-white p-2 shadow-2xs group">
          <div className="aspect-[21/9] sm:aspect-[3/1] max-h-48 w-full overflow-hidden bg-[#f2efeb] relative flex items-center justify-center">
            <img
              src={bannerUrl}
              alt="Offer Banner Preview"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=60';
              }}
            />
            <div className="absolute top-2 right-2 flex items-center gap-1.5">
              <button
                type="button"
                id="btn-remove-offer-banner"
                onClick={() => onChange(null)}
                className="p-1.5 bg-[#1a1716]/80 hover:bg-rose-700 text-white shadow-sm transition cursor-pointer"
                title="Remove banner image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-[#1a1716]/60 px-1">
            <span className="truncate max-w-[80%]">{bannerUrl}</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> Attached
            </span>
          </div>
        </div>
      ) : (
        <div
          id="offer-banner-dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-[#2e4a3d] bg-[#2e4a3d]/5 scale-[0.99]'
              : 'border-[#1a1716]/20 hover:border-[#2e4a3d] bg-white hover:bg-[#f2efeb]/50'
          }`}
        >
          <input
            ref={fileInputRef}
            id="file-input-offer-banner"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && e.target.files[0] && handleFileUpload(e.target.files[0])}
          />

          <div className="flex flex-col items-center justify-center gap-2 font-mono">
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 text-[#2e4a3d] animate-spin" />
                <div className="text-xs font-semibold text-[#1a1716]">Uploading Banner to Storage...</div>
                <div className="text-[10px] text-[#1a1716]/50">Path: product-images/offers/*</div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 bg-[#2e4a3d]/10 text-[#2e4a3d] flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-[#1a1716]">
                  <span className="text-[#2e4a3d] underline">Click to upload</span> or drag banner graphic
                </div>
                <p className="text-[10px] text-[#1a1716]/50">
                  Recommended size: 1200×400px (JPG, PNG, WebP)
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
