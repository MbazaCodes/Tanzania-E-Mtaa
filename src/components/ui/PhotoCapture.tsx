// src/components/ui/PhotoCapture.tsx
// Reusable photo capture component: camera capture + file upload + preview
import React, { useRef, useState, useCallback } from 'react';
import { Camera, Upload, X, RefreshCw, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PhotoCaptureProps {
  /** Label shown above the capture area */
  label: string;
  /** Optional sub-label / description */
  description?: string;
  /** Called with base64 data-URL when a photo is captured/selected */
  onChange: (dataUrl: string | null) => void;
  /** Current value (base64 data URL or null) */
  value?: string | null;
  /** Whether the field is required */
  required?: boolean;
  /** Language: 'sw' | 'en' */
  lang?: 'sw' | 'en';
  /** Additional wrapper class */
  className?: string;
  /** Accept filters for file upload – defaults to images */
  accept?: string;
  /** Max file size in bytes – defaults to 5 MB */
  maxSize?: number;
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export function PhotoCapture({
  label,
  description,
  onChange,
  value,
  required = false,
  lang = 'sw',
  className,
  accept = 'image/jpeg,image/png,image/webp',
  maxSize = DEFAULT_MAX_SIZE,
}: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      if (file.size > maxSize) {
        setError(
          lang === 'sw'
            ? `Faili ni kubwa sana. Kiwango cha juu ni ${Math.round(maxSize / 1024 / 1024)}MB.`
            : `File is too large. Maximum is ${Math.round(maxSize / 1024 / 1024)}MB.`
        );
        return;
      }
      setLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        onChange(e.target?.result as string);
        setLoading(false);
      };
      reader.onerror = () => {
        setError(lang === 'sw' ? 'Imeshindwa kusoma faili.' : 'Failed to read file.');
        setLoading(false);
      };
      reader.readAsDataURL(file);
    },
    [maxSize, lang, onChange]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // reset so same file can be re-selected
      e.target.value = '';
    },
    [processFile]
  );

  const handleRemove = () => {
    onChange(null);
    setError(null);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <label className="block text-sm font-bold text-stone-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-stone-500 -mt-1">{description}</p>
      )}

      {/* Preview */}
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-300 bg-stone-100 group">
          <img
            src={value}
            alt={label}
            className="w-full max-h-52 object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            {/* Replace */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-white text-stone-700 rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow"
              title={lang === 'sw' ? 'Badilisha picha' : 'Replace photo'}
            >
              <RefreshCw size={14} />
              {lang === 'sw' ? 'Badilisha' : 'Replace'}
            </button>
            {/* Remove */}
            <button
              type="button"
              onClick={handleRemove}
              className="bg-red-500 text-white rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow"
              title={lang === 'sw' ? 'Ondoa picha' : 'Remove photo'}
            >
              <X size={14} />
              {lang === 'sw' ? 'Ondoa' : 'Remove'}
            </button>
          </div>
          {/* Verified badge */}
          <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1">
            <CheckCircle size={14} />
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors',
            error ? 'border-red-300 bg-red-50' : 'border-stone-300 hover:border-emerald-400 bg-stone-50 hover:bg-emerald-50'
          )}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          aria-label={lang === 'sw' ? 'Pakia picha au chagua faili' : 'Upload or capture photo'}
        >
          {loading ? (
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                <Upload size={26} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-stone-700">
                  {lang === 'sw' ? 'Bonyeza kupakia picha' : 'Click to upload photo'}
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {lang === 'sw'
                    ? `JPEG, PNG, WEBP • Hadi ${Math.round(maxSize / 1024 / 1024)}MB`
                    : `JPEG, PNG, WEBP • Up to ${Math.round(maxSize / 1024 / 1024)}MB`}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {!value && (
        <div className="flex gap-2">
          {/* Upload from gallery */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-stone-300 rounded-xl text-stone-600 hover:bg-stone-50 text-sm font-medium transition-all"
          >
            <Upload size={16} />
            {lang === 'sw' ? 'Chagua Faili' : 'Choose File'}
          </button>
          {/* Capture from camera (mobile only effectively) */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-emerald-300 bg-emerald-50 rounded-xl text-emerald-700 hover:bg-emerald-100 text-sm font-medium transition-all"
          >
            <Camera size={16} />
            {lang === 'sw' ? 'Piga Picha' : 'Take Photo'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 font-medium flex items-center gap-1">
          <X size={12} />
          {error}
        </p>
      )}

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      {/* Camera capture input (capture="environment" for rear camera) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
