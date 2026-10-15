import React from 'react';
import { ClinicalAttachment } from '../../types';
import {
  X,
  Download,
  Paperclip,
  Cloud,
  FileText,
  Calendar,
  User,
  HardDrive,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';

interface ClinicalAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: ClinicalAttachment | null;
  patientName?: string;
  orderTitle?: string;
}

export const ClinicalAttachmentModal: React.FC<ClinicalAttachmentModalProps> = ({
  isOpen,
  onClose,
  attachment,
  patientName,
  orderTitle
}) => {
  const [zoomLevel, setZoomLevel] = React.useState<number>(1);

  React.useEffect(() => {
    setZoomLevel(1);
  }, [attachment]);

  if (!isOpen || !attachment) return null;

  const isImage = attachment.type.startsWith('image/') || attachment.dataUrl.startsWith('data:image/');
  const isPdf = attachment.type === 'application/pdf' || attachment.name.toLowerCase().endsWith('.pdf') || attachment.dataUrl.startsWith('data:application/pdf');

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formattedDate = attachment.uploadedAt
    ? new Date(attachment.uploadedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Recently';

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-400">
              <Paperclip className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-white truncate max-w-md">
                  {attachment.name}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Cloud className="w-3 h-3 text-emerald-400" />
                  Prime Admin Cloud Storage
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-300 mt-0.5">
                <span>{formatFileSize(attachment.size)}</span>
                {orderTitle && (
                  <>
                    <span>&bull;</span>
                    <span className="text-slate-300">{orderTitle}</span>
                  </>
                )}
                {patientName && (
                  <>
                    <span>&bull;</span>
                    <span className="text-cyan-300">Patient: {patientName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isImage && (
              <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 mr-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.max(0.5, prev - 0.25))}
                  className="p-1.5 hover:text-white text-slate-300 rounded cursor-pointer transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono text-[10px] text-slate-300">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
                  className="p-1.5 hover:text-white text-slate-300 rounded cursor-pointer transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 hover:text-white text-slate-300 rounded cursor-pointer transition-colors border-l border-slate-700 ml-0.5"
                  title="Reset Zoom"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <a
              href={attachment.dataUrl}
              download={attachment.name}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Download file to device"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Area */}
        <div className="p-4 sm:p-6 overflow-auto flex-1 flex items-center justify-center bg-slate-900/95 min-h-[350px] max-h-[calc(90vh-140px)]">
          {isImage ? (
            <div className="overflow-auto max-w-full max-h-full flex items-center justify-center p-2">
              <img
                src={attachment.dataUrl}
                alt={attachment.name}
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-150 border border-slate-700 bg-slate-950"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-[65vh] rounded-lg overflow-hidden border border-slate-700 bg-white shadow-xl">
              <iframe
                src={attachment.dataUrl}
                title={attachment.name}
                className="w-full h-full border-none"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-xl max-w-md w-full">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-base text-white truncate px-2">{attachment.name}</h4>
              <p className="text-xs text-slate-400 mt-1">
                Document type: <strong className="text-slate-300">{attachment.type || 'Clinical Document'}</strong> ({formatFileSize(attachment.size)})
              </p>
              <div className="mt-4 p-3 bg-slate-900/90 rounded-xl border border-slate-700 text-left text-[11px] text-slate-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Storage Account:</span>
                  <span className="font-semibold text-emerald-400">Prime Admin Cloud Vault</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Uploaded By:</span>
                  <span className="font-semibold text-white">{attachment.uploadedBy || 'Clinical Staff'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Date Timestamp:</span>
                  <span className="font-semibold text-white">{formattedDate}</span>
                </div>
              </div>
              <a
                href={attachment.dataUrl}
                download={attachment.name}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <Download className="w-4 h-4" /> Download Document
              </a>
            </div>
          )}
        </div>

        {/* Footer Metadata Banner */}
        <div className="px-5 py-2.5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium">
              <User className="w-3.5 h-3.5 text-slate-500" />
              Uploaded by: <strong className="text-slate-800">{attachment.uploadedBy || 'Staff'}</strong>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
              Partition: <strong className="text-emerald-700">Prime Admin Cloud Account</strong>
            </span>
          </div>

          <div className="text-[10px] text-slate-500 italic">
            Certified Clinical Record &bull; Viewable by Authorized Doctors & Prime Admin
          </div>
        </div>
      </div>
    </div>
  );
};
