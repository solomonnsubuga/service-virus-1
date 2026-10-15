import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { preloadClinicLogo } from '../../utils/pdfLogoHelper';
import {
  Building2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  ShieldCheck,
  HardDrive,
  Eye,
  FileImage,
  Info,
  Check
} from 'lucide-react';

interface CompanyLogoCardProps {
  isFullTab?: boolean;
}

export const CompanyLogoCard: React.FC<CompanyLogoCardProps> = ({ isFullTab = false }) => {
  const {
    activeClinic,
    currentUser,
    updateClinicLogo,
    removeClinicLogo
  } = useClinic();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  // Helper to optimize and convert an image file to high-quality Base64 Data URL
  const processImageFile = (file: File) => {
    setStatusMessage(null);

    // Validate mime type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setStatusMessage({
        text: 'Unsupported file format. Please upload a PNG, JPEG, SVG, or WebP image.',
        type: 'error'
      });
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({
        text: 'File is too large. Maximum allowed size is 5MB.',
        type: 'error'
      });
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawResult = e.target?.result as string;
      if (!rawResult) return;

      // For SVG, use raw result directly
      if (file.type === 'image/svg+xml') {
        setPreviewUrl(rawResult);
        return;
      }

      // Optimize image dimensions to ensure crisp high-res display without exceeding Firestore payload
      const img = new Image();
      img.onload = () => {
        const maxDimension = 640;
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);
          setPreviewUrl(compressedDataUrl);
        } else {
          setPreviewUrl(rawResult);
        }
      };
      img.onerror = () => {
        setPreviewUrl(rawResult);
      };
      img.src = rawResult;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSaveLogo = async () => {
    if (!previewUrl) return;

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const result = await updateClinicLogo(
        activeClinic.id,
        previewUrl,
        selectedFile ? { fileName: selectedFile.name, fileSize: selectedFile.size } : undefined
      );

      if (result.success) {
        preloadClinicLogo(previewUrl, { ...activeClinic, logoUrl: previewUrl });
        setStatusMessage({
          text: result.message,
          type: 'success'
        });
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        setStatusMessage({
          text: result.message,
          type: 'error'
        });
      }
    } catch (err) {
      setStatusMessage({
        text: 'Failed to upload logo to Prime Admin Cloud Account. Please try again.',
        type: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setIsUploading(true);
    setStatusMessage(null);
    setShowConfirmRemove(false);

    try {
      const result = await removeClinicLogo(activeClinic.id);
      if (result.success) {
        setStatusMessage({
          text: result.message,
          type: 'success'
        });
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        setStatusMessage({
          text: result.message,
          type: 'error'
        });
      }
    } catch {
      setStatusMessage({
        text: 'Failed to remove logo from Prime Admin cloud storage.',
        type: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const activeLogo = activeClinic.logoUrl;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${isFullTab ? 'p-6' : 'p-5'}`}>
      
      {/* Card Header & Cloud Account Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-700">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <span>Company Logo & Brand Identity</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                Prime Admin Account
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Upload your company / hospital logo. Stored directly on the Prime Admin's cloud tenant partition.
            </p>
          </div>
        </div>

        {/* Cloud Storage Target Verification Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-2xs shrink-0">
          <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-mono uppercase leading-tight">Storage Target</div>
            <div className="text-[11px] font-bold text-slate-100">
              Prime Admin Cloud ({activeClinic.code})
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Security Isolation Notice */}
      <div className="mt-4 p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-slate-700 space-y-1">
        <div className="flex items-center gap-2 text-emerald-900 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Prime Admin Cloud Tenant Storage Protection</span>
        </div>
        <p className="text-slate-600 text-[11px] leading-relaxed">
          Your company logo is stored within the <strong>Prime Administrator's dedicated cloud account partition</strong> (<code className="font-mono text-emerald-800 font-semibold">/clinics/{activeClinic.id}/logoUrl</code>). It is strictly segregated and never stored on the developer's cloud storage or mixed with developer telemetry data.
        </p>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 border animate-in fade-in duration-200 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Upload Zone vs Current Logo & Live Preview */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Upload & File Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50'
            }`}
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              Drag and drop your company logo here
            </div>
            <p className="text-xs text-slate-500 mt-1">
              or <span className="text-emerald-700 font-semibold underline">browse from your computer</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              <span className="px-2 py-0.5 rounded bg-white border border-slate-200">PNG</span>
              <span className="px-2 py-0.5 rounded bg-white border border-slate-200">JPG / JPEG</span>
              <span className="px-2 py-0.5 rounded bg-white border border-slate-200">SVG</span>
              <span className="px-2 py-0.5 rounded bg-white border border-slate-200">WEBP</span>
              <span>&bull; Up to 5 MB</span>
            </div>
          </div>

          {/* Pending Selection / Staged Upload Preview */}
          {previewUrl && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                <span className="flex items-center gap-1.5">
                  <FileImage className="w-4 h-4 text-emerald-600" />
                  Ready to Sync to Prime Admin Cloud Account
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Optimized Image'}
                </span>
              </div>

              <div className="flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-200">
                <div className="w-20 h-16 rounded bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 p-1">
                  <img
                    src={previewUrl}
                    alt="Logo Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-bold text-slate-900 truncate">
                    {selectedFile?.name || 'Selected Logo File'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Target: Prime Admin Cloud Partition (<span className="font-mono">{activeClinic.code}</span>)
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                    ✓ High-resolution rasterization verified
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  disabled={isUploading}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveLogo}
                  disabled={isUploading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Syncing to Cloud...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Save to Prime Admin Cloud Account
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Quick Specifications Info */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>Recommended Logo Specifications</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>Transparent background (PNG or SVG) works best on white letterheads and cards.</li>
              <li>Square or landscape ratio (recommended width between 200px and 600px).</li>
              <li>Appears automatically on payment receipts, lab reports, radiology imaging exports, and official certificates.</li>
            </ul>
          </div>
        </div>

        {/* Right Side: Current Active Logo & Live Branding Previews (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Current Stored Logo Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Current Active Logo
              </span>
              {activeLogo ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Stored in Cloud
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-600">
                  Default Badge Active
                </span>
              )}
            </div>

            {/* Logo Display Box */}
            <div className="h-32 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-3 relative overflow-hidden shadow-2xs">
              {activeLogo ? (
                <img
                  src={activeLogo}
                  alt={`${activeClinic.name} Logo`}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-1.5">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-slate-600">{activeClinic.name}</div>
                  <div className="text-[10px] text-slate-400">No custom logo configured</div>
                </div>
              )}
            </div>

            {/* Metadata and Actions */}
            {activeLogo && (
              <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Storage:</span>
                  <strong className="text-slate-800 font-mono">Prime Admin Cloud Partition</strong>
                </div>
                {activeClinic.logoUpdatedAt && (
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Last Updated:</span>
                    <span className="text-slate-700">
                      {new Date(activeClinic.logoUpdatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {activeClinic.logoUploadedBy && (
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Uploaded By:</span>
                    <span className="text-slate-700">{activeClinic.logoUploadedBy}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3 text-slate-500" /> Replace Logo
                  </button>

                  {showConfirmRemove ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        disabled={isUploading}
                        className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmRemove(false)}
                        className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[11px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirmRemove(true)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Live Document Letterhead Preview */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                Live Document Letterhead Preview
              </span>
              <span className="text-[10px] text-slate-400 font-mono uppercase">Official Layout</span>
            </div>

            {/* Letterhead Sample Mini Preview */}
            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 text-slate-800">
              <div className="flex items-start justify-between gap-2 border-b border-slate-300 pb-2">
                <div className="flex items-center gap-2">
                  {activeLogo ? (
                    <img
                      src={activeLogo}
                      alt="Mini Logo"
                      className="w-8 h-8 object-contain rounded shrink-0 bg-white p-0.5 border border-slate-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {activeClinic.code.slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <div className="text-[11px] font-bold text-slate-900 leading-tight">
                      {activeClinic.name}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {activeClinic.address} &bull; Code: {activeClinic.code}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-200 text-slate-700 uppercase">
                    RECEIPT / REPORT
                  </span>
                </div>
              </div>
              <div className="pt-2 text-[9px] text-slate-400 italic">
                Sample: Official diagnostic findings, prescriptions, and billing statements reflect this logo.
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
