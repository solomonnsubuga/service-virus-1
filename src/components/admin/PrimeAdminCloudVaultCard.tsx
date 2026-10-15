import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { ClinicalAttachment } from '../../types';
import { ClinicalAttachmentModal } from '../common/ClinicalAttachmentModal';
import {
  Cloud,
  FileText,
  Paperclip,
  Download,
  Eye,
  Search,
  Filter,
  Microscope,
  Film,
  HardDrive,
  CheckCircle2,
  Calendar,
  User,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface PrimeAdminCloudVaultCardProps {
  isFullTab?: boolean;
}

interface VaultDocumentRecord {
  id: string;
  department: 'Pathology' | 'Radiology';
  orderId: string;
  orderTitle: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  completedBy?: string;
  completedAt?: string;
  attachment: ClinicalAttachment;
}

export const PrimeAdminCloudVaultCard: React.FC<PrimeAdminCloudVaultCardProps> = ({ isFullTab = false }) => {
  const {
    activeClinic,
    currentClinicTestOrders,
    currentClinicRadiologyOrders
  } = useClinic();

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<'all' | 'Pathology' | 'Radiology'>('all');
  const [selectedDocument, setSelectedDocument] = useState<{
    attachment: ClinicalAttachment;
    patientName?: string;
    orderTitle?: string;
  } | null>(null);

  // Aggregate all clinical documents saved in Prime Admin's cloud account partition
  const vaultDocuments = useMemo(() => {
    const records: VaultDocumentRecord[] = [];

    // 1. Pathology Test Order Attachments
    currentClinicTestOrders.forEach((test) => {
      if (test.attachments && test.attachments.length > 0) {
        test.attachments.forEach((att) => {
          records.push({
            id: `vault-lab-${test.id}-${att.id}`,
            department: 'Pathology',
            orderId: test.id,
            orderTitle: test.testName,
            patientId: test.patientId,
            patientName: test.patientName,
            patientMrn: test.patientMrn,
            doctorId: test.doctorId,
            doctorName: test.doctorName,
            completedBy: test.completedBy || 'Clinical Pathologist',
            completedAt: test.completedAt || att.uploadedAt,
            attachment: att
          });
        });
      }
    });

    // 2. Radiology Scan Order Attachments
    currentClinicRadiologyOrders.forEach((scan) => {
      if (scan.attachments && scan.attachments.length > 0) {
        scan.attachments.forEach((att) => {
          records.push({
            id: `vault-rad-${scan.id}-${att.id}`,
            department: 'Radiology',
            orderId: scan.id,
            orderTitle: scan.procedureName,
            patientId: scan.patientId,
            patientName: scan.patientName,
            patientMrn: scan.patientMrn,
            doctorId: scan.doctorId,
            doctorName: scan.doctorName,
            completedBy: scan.completedBy || 'Radiologist',
            completedAt: scan.completedAt || att.uploadedAt,
            attachment: att
          });
        });
      }
    });

    // Sort descending by upload timestamp
    return records.sort((a, b) => {
      const timeA = new Date(a.attachment.uploadedAt || a.completedAt || 0).getTime();
      const timeB = new Date(b.attachment.uploadedAt || b.completedAt || 0).getTime();
      return timeB - timeA;
    });
  }, [currentClinicTestOrders, currentClinicRadiologyOrders]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return vaultDocuments.filter((doc) => {
      if (departmentFilter !== 'all' && doc.department !== departmentFilter) {
        return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = doc.attachment.name.toLowerCase().includes(query);
        const matchesPatient = doc.patientName.toLowerCase().includes(query) || doc.patientMrn.toLowerCase().includes(query);
        const matchesOrder = doc.orderTitle.toLowerCase().includes(query);
        const matchesStaff = (doc.completedBy || '').toLowerCase().includes(query) || doc.doctorName.toLowerCase().includes(query);
        if (!matchesName && !matchesPatient && !matchesOrder && !matchesStaff) {
          return false;
        }
      }

      return true;
    });
  }, [vaultDocuments, departmentFilter, searchTerm]);

  // Aggregate storage metrics
  const totalSizeBytes = useMemo(() => {
    return vaultDocuments.reduce((acc, doc) => acc + (doc.attachment.size || 0), 0);
  }, [vaultDocuments]);

  const pathologyCount = useMemo(() => {
    return vaultDocuments.filter((d) => d.department === 'Pathology').length;
  }, [vaultDocuments]);

  const radiologyCount = useMemo(() => {
    return vaultDocuments.filter((d) => d.department === 'Radiology').length;
  }, [vaultDocuments]);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
      {/* Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-slate-900">
                Prime Admin Cloud Storage & Document Vault
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Live Cloud Partition
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure central repository storing all clinical attachments uploaded during pathology result entry and radiology reporting for {activeClinic.name}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 flex items-center gap-1.5 font-medium">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>Partition: <strong className="text-slate-900 font-mono">prime_admin_cloud</strong></span>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-400">Total Cloud Documents</div>
          <div className="text-xl font-bold text-slate-800 mt-0.5">{vaultDocuments.length} files</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Archived in Prime Admin vault</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-400">Total Cloud Storage</div>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">{formatFileSize(totalSizeBytes)}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Firestore & Blob Storage</div>
        </div>

        <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
          <div className="text-[10px] uppercase font-bold text-amber-700">Pathology Documents</div>
          <div className="text-xl font-bold text-amber-900 mt-0.5">{pathologyCount} files</div>
          <div className="text-[10px] text-amber-700 mt-0.5">Lab slips, analyzers, reports</div>
        </div>

        <div className="p-3 bg-cyan-50/60 rounded-lg border border-cyan-200">
          <div className="text-[10px] uppercase font-bold text-cyan-700">Radiology Attachments</div>
          <div className="text-xl font-bold text-cyan-900 mt-0.5">{radiologyCount} files</div>
          <div className="text-[10px] text-cyan-700 mt-0.5">Scans, DICOM images, X-rays</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by document name, patient name, MRN, or test..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Filter:
          </span>
          <div className="flex rounded-md border border-slate-300 overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setDepartmentFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                departmentFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({vaultDocuments.length})
            </button>
            <button
              type="button"
              onClick={() => setDepartmentFilter('Pathology')}
              className={`px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer border-l border-slate-200 ${
                departmentFilter === 'Pathology' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Pathology ({pathologyCount})
            </button>
            <button
              type="button"
              onClick={() => setDepartmentFilter('Radiology')}
              className={`px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer border-l border-slate-200 ${
                departmentFilter === 'Radiology' ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Radiology ({radiologyCount})
            </button>
          </div>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-10 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl space-y-2">
          <Cloud className="w-10 h-10 text-slate-400 mx-auto" />
          <h4 className="font-bold text-slate-700 text-sm">
            {vaultDocuments.length === 0 ? 'No Cloud Documents Uploaded Yet' : 'No Documents Match Search'}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {vaultDocuments.length === 0
              ? 'When lab technicians in Pathology or radiology technologists record patient results and attach files, they will be archived here directly under the Prime Admin Cloud account.'
              : 'Try clearing or modifying your search query to view archived patient result attachments.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredDocuments.map((doc) => {
            const isImage = doc.attachment.type.startsWith('image/') || doc.attachment.dataUrl.startsWith('data:image/');
            const isPath = doc.department === 'Pathology';

            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all p-3.5 shadow-2xs flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Top Bar with Department Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        isPath
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                      }`}
                    >
                      {isPath ? <Microscope className="w-3 h-3 text-amber-700" /> : <Film className="w-3 h-3 text-cyan-700" />}
                      {doc.department}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                      <Cloud className="w-2.5 h-2.5 text-emerald-600" />
                      Prime Cloud
                    </span>
                  </div>

                  {/* Attachment Preview & Title */}
                  <div className="flex items-start gap-2.5">
                    {isImage ? (
                      <img
                        src={doc.attachment.dataUrl}
                        alt={doc.attachment.name}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border ${
                          isPath ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-cyan-50 border-cyan-200 text-cyan-600'
                        }`}
                      >
                        <FileText className="w-6 h-6" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs text-slate-900 truncate" title={doc.attachment.name}>
                        {doc.attachment.name}
                      </h4>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                        {doc.orderTitle}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {formatFileSize(doc.attachment.size)} &bull; {doc.attachment.type || 'Clinical file'}
                      </div>
                    </div>
                  </div>

                  {/* Patient & Uploader Details */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Patient:</span>
                      <strong className="text-slate-900 font-semibold truncate max-w-[140px]">
                        {doc.patientName} ({doc.patientMrn})
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[10px]">
                      <span>Ordered By:</span>
                      <span className="text-slate-700">Dr. {doc.doctorName}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[10px]">
                      <span>Uploaded By:</span>
                      <span className="text-slate-700">{doc.attachment.uploadedBy || doc.completedBy}</span>
                    </div>
                    {doc.attachment.uploadedAt && (
                      <div className="flex items-center justify-between text-slate-400 text-[9px]">
                        <span>Timestamp:</span>
                        <span>{new Date(doc.attachment.uploadedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDocument({
                        attachment: doc.attachment,
                        patientName: doc.patientName,
                        orderTitle: doc.orderTitle
                      })
                    }
                    className="flex-1 py-1 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Eye className="w-3 h-3 text-cyan-400" />
                    <span>View Document</span>
                  </button>

                  <a
                    href={doc.attachment.dataUrl}
                    download={doc.attachment.name}
                    className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors border border-slate-200"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Save</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-Screen Attachment Viewer Modal */}
      {selectedDocument && (
        <ClinicalAttachmentModal
          isOpen={!!selectedDocument}
          onClose={() => setSelectedDocument(null)}
          attachment={selectedDocument.attachment}
          patientName={selectedDocument.patientName}
          orderTitle={selectedDocument.orderTitle}
        />
      )}
    </div>
  );
};
