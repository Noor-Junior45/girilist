import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  UploadCloud, 
  X, 
  Star, 
  ArrowLeft, 
  ArrowRight, 
  Image as ImageIcon, 
  Loader2, 
  Plus, 
  Link as LinkIcon,
  Check
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ImageUploaderProps {
  imageUrls: string[];
  onChange: (urls: string[]) => void;
}

export function ImageUploader({ imageUrls, onChange }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (fileArray.length === 0) {
      showToast({
        type: 'warning',
        title: 'No Valid Images',
        description: 'Please select valid image files (JPG, PNG, WebP, SVG).'
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(`Uploading 0 of ${fileArray.length}...`);

    const newUrls: string[] = [];
    let failureCount = 0;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgress(`Uploading ${i + 1} of ${fileArray.length}: ${file.name}...`);
      
      try {
        // Sanitize filename and create unique storage path
        const fileExt = file.name.split('.').pop() || 'jpg';
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${crypto.randomUUID()}-${cleanName}`;

        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Storage upload error:', error);
          failureCount++;
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(data.path);

        if (publicUrlData?.publicUrl) {
          newUrls.push(publicUrlData.publicUrl);
        }
      } catch (err) {
        console.error('Upload exception:', err);
        failureCount++;
      }
    }

    setIsUploading(false);
    setUploadProgress('');

    if (newUrls.length > 0) {
      onChange([...imageUrls, ...newUrls]);
      showToast({
        type: 'success',
        title: 'Images Uploaded',
        description: `Successfully uploaded and linked ${newUrls.length} image(s).`
      });
    }

    if (failureCount > 0) {
      showToast({
        type: 'error',
        title: 'Upload Issue',
        description: `${failureCount} file(s) failed to upload. Check Supabase storage bucket permissions.`
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (index: number) => {
    const updated = imageUrls.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const target = imageUrls[index];
    const rest = imageUrls.filter((_, i) => i !== index);
    onChange([target, ...rest]);
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= imageUrls.length) return;

    const newArr = [...imageUrls];
    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;
    onChange(newArr);
  };

  const handleAddCustomUrl = () => {
    if (!customUrl.trim()) return;
    try {
      new URL(customUrl.trim());
      onChange([...imageUrls, customUrl.trim()]);
      setCustomUrl('');
      setShowUrlInput(false);
      showToast({
        type: 'success',
        title: 'Image URL Added',
        description: 'External image link attached to product gallery.'
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
    <div className="space-y-4" id="product-image-uploader-section">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-semibold text-slate-800">
            Product Images <span className="text-rose-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            The first image will be displayed as the main catalog thumbnail. At least 1 image is required.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-toggle-custom-url"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-xs font-medium text-slate-600 hover:text-amber-600 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-amber-300 bg-white transition"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            {showUrlInput ? 'Hide URL Input' : 'Add by URL'}
          </button>
        </div>
      </div>

      {/* Direct URL Input Row */}
      {showUrlInput && (
        <div className="flex items-center gap-2 p-3 bg-amber-50/50 border border-amber-200 rounded-xl">
          <ImageIcon className="w-4 h-4 text-amber-600 shrink-0" />
          <input
            id="input-custom-image-url"
            type="url"
            placeholder="https://example.com/images/havells-wire.jpg"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomUrl();
              }
            }}
            className="flex-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="button"
            id="btn-add-custom-url"
            onClick={handleAddCustomUrl}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-semibold rounded-lg transition shrink-0"
          >
            Add URL
          </button>
        </div>
      )}

      {/* Dropzone Container */}
      <div
        id="image-dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-amber-500 bg-amber-50/60 scale-[0.99]'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          id="file-input-product-images"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center gap-2">
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <div className="text-xs font-medium text-slate-700">{uploadProgress}</div>
              <div className="text-[11px] text-slate-500">Uploading to Supabase "product-images" bucket...</div>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center shadow-inner">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-sm font-medium text-slate-800">
                <span className="text-amber-600 font-semibold hover:underline">Click to upload</span> or drag & drop product photos
              </div>
              <p className="text-xs text-slate-500">
                Supports multiple JPG, PNG, WebP files. Uploads directly to Supabase storage bucket.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Image Gallery / Thumbnail Strip */}
      {imageUrls.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Attached Images ({imageUrls.length}) • Drag or use arrows to reorder
            </span>
            <span className="text-amber-600 font-medium flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> First image is Main
            </span>
          </div>

          <div
            id="image-thumbnail-grid"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
          >
            {imageUrls.map((url, index) => {
              const isMain = index === 0;
              return (
                <div
                  key={`${url}-${index}`}
                  id={`image-card-${index}`}
                  className={`group relative rounded-xl border overflow-hidden bg-white shadow-sm transition-all ${
                    isMain ? 'ring-2 ring-amber-500 border-amber-500' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Image Aspect Box */}
                  <div className="aspect-square w-full bg-slate-100 relative">
                    <img
                      src={url}
                      alt={`Product image ${index + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // Fallback placeholder on broken URL
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=60';
                      }}
                    />

                    {/* Main Tag Badge */}
                    {isMain && (
                      <div className="absolute top-1.5 left-1.5 bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-slate-950" />
                        MAIN
                      </div>
                    )}

                    {/* Remove Button */}
                    <button
                      type="button"
                      id={`btn-remove-image-${index}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(index);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition shadow"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Ordering Controls Bar */}
                  <div className="p-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        id={`btn-move-left-${index}`}
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'left')}
                        className={`p-1 rounded hover:bg-slate-200 transition ${
                          index === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-700'
                        }`}
                        title="Move image earlier"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        id={`btn-move-right-${index}`}
                        disabled={index === imageUrls.length - 1}
                        onClick={() => handleMove(index, 'right')}
                        className={`p-1 rounded hover:bg-slate-200 transition ${
                          index === imageUrls.length - 1 ? 'opacity-30 cursor-not-allowed' : 'text-slate-700'
                        }`}
                        title="Move image later"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    {!isMain && (
                      <button
                        type="button"
                        id={`btn-set-main-${index}`}
                        onClick={() => handleSetPrimary(index)}
                        className="text-[10px] text-amber-700 hover:text-amber-800 font-semibold px-1 rounded hover:bg-amber-100/60"
                        title="Make this the primary catalog thumbnail"
                      >
                        Set Main
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
