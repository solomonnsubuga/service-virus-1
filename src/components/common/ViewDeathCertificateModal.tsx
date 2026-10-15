import React, { useState } from 'react';
import {
  X,
  FileText,
  Printer,
  Download,
  Clock,
  History,
  ShieldCheck,
  Building2,
  HeartCrack,
  Edit3,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';
import { DeathCertificate, Clinic } from '../../types';
import { exportDeathCertificateToPdf } from '../../utils/deathCertificatePdfExport';
import { useClinic } from '../../context/ClinicContext';

interface ViewDeathCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: DeathCertificate | null;
  onEdit?: (certificate: DeathCertificate) => void;
  onPrintPreview?: (certificate: DeathCertificate) => void;
}

export const ViewDeathCertificateModal: React.FC<ViewDeathCertificateModalProps> = ({
  isOpen,
  onClose,
  certificate,
  onEdit,
  onPrintPreview
}) => {
  const { activeClinic } = useClinic();
  const [activeTab, setActiveTab] = useState<'certificate' | 'history'>('certificate');

  if (!isOpen || !certificate) return null;

  const handleExportPdf = () => {
    exportDeathCertificateToPdf(certificate, activeClinic);
  };

  const handlePrint = () => {
    if (onPrintPreview) {
      onPrintPreview(certificate);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <HeartCrack className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Medical Certificate of Cause of Death
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-800/80">
                  {certificate.certificateNumber || 'DC-OFFICIAL'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Official medical cause of death & deceased record for {certificate.patientName} ({certificate.patientMrn})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('certificate')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'certificate'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Certificate Particulars
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <History className="w-4 h-4" />
              Audit & Amendment History ({certificate.changeHistory?.length || 1})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(certificate)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold cursor-pointer transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Amend Record
              </button>
            )}
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {activeTab === 'certificate' ? (
            <div className="space-y-4">
              {/* Deceased Summary Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Deceased Name</span>
                  <strong className="text-slate-900 text-xs">{certificate.patientName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">MRN</span>
                  <span className="font-mono text-slate-800 font-semibold">{certificate.patientMrn}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Date & Time of Death</span>
                  <strong className="text-rose-700">{certificate.dateOfDeath} {certificate.timeOfDeath} hrs</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Place of Death</span>
                  <span className="text-slate-800">{certificate.placeOfDeath}</span>
                </div>
              </div>

              {/* WHO Standard MCCD Causes */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Medical Cause of Death (WHO Standard Format)
                  </h3>
                  <span className="text-[10px] text-slate-500">Approx. Interval Onset to Death</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wide">
                          Part I (a) Immediate Cause of Death:
                        </span>
                        <div className="text-rose-950 font-bold text-sm mt-0.5">
                          {certificate.immediateCause}
                        </div>
                        <span className="text-[10px] text-slate-500 italic">
                          Disease or condition directly leading to death
                        </span>
                      </div>
                      <div className="text-right font-medium text-slate-700 text-xs">
                        {certificate.immediateCauseInterval || '—'}
                      </div>
                    </div>
                  </div>

                  {certificate.antecedentCause && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                            Part I (b) Antecedent Cause:
                          </span>
                          <div className="text-slate-900 font-semibold text-xs mt-0.5">
                            {certificate.antecedentCause}
                          </div>
                          <span className="text-[10px] text-slate-500 italic">
                            Morbid conditions, if any, giving rise to immediate cause
                          </span>
                        </div>
                        <div className="text-right font-medium text-slate-700 text-xs">
                          {certificate.antecedentCauseInterval || '—'}
                        </div>
                      </div>
                    </div>
                  )}

                  {certificate.underlyingCause && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                            Part I (c) Underlying Cause:
                          </span>
                          <div className="text-slate-900 font-semibold text-xs mt-0.5">
                            {certificate.underlyingCause}
                          </div>
                          <span className="text-[10px] text-slate-500 italic">
                            Underlying condition that initiated train of events
                          </span>
                        </div>
                        <div className="text-right font-medium text-slate-700 text-xs">
                          {certificate.underlyingCauseInterval || '—'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block">
                      Part II: Other Significant Conditions:
                    </span>
                    <p className="text-slate-800 text-xs mt-0.5">
                      {certificate.contributingConditions || 'None documented during admission.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Circumstances & Disposition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Circumstances */}
                <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                    Circumstances & Autopsy
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Manner of Death:</span>
                      <strong className="text-slate-900 capitalize">
                        {String(certificate.mannerOfDeath || 'natural').replace(/_/g, ' ')}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Autopsy Status:</span>
                      <span className="text-slate-800 capitalize">
                        {certificate.autopsyRequested === 'yes' ? 'Requested / Performed' : certificate.autopsyRequested === 'no' ? 'Not Requested' : 'Not Indicated'}
                      </span>
                    </div>
                    {certificate.pregnancyStatus && certificate.pregnancyStatus !== 'not_applicable' && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Pregnancy Status:</span>
                        <span className="text-slate-800 capitalize">{certificate.pregnancyStatus.replace(/_/g, ' ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mortuary & Handover */}
                <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                    Mortuary & Body Disposition
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Released To:</span>
                      <strong className="text-slate-900 uppercase">
                        {String(certificate.bodyReleasedTo || 'hospital_mortuary').replace(/_/g, ' ')}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Facility / Mortuary:</span>
                      <span className="text-slate-800">{certificate.mortuaryName || 'Central Hospital Mortuary'}</span>
                    </div>
                    {certificate.mortuaryTagNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Mortuary Tag Number:</span>
                        <span className="font-mono font-bold text-slate-900">{certificate.mortuaryTagNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Informant & Doctor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                    Informant / Next of Kin
                  </h4>
                  <div className="space-y-1 text-xs">
                    <div><strong className="text-slate-900">{certificate.informantName}</strong></div>
                    <div className="text-slate-600">{certificate.informantRelationship} &bull; {certificate.informantPhone || 'No phone'}</div>
                    {certificate.informantAddress && <div className="text-slate-500">{certificate.informantAddress}</div>}
                    {certificate.informantNotifiedAt && (
                      <div className="text-[11px] text-slate-400 mt-1">Notified: {certificate.informantNotifiedAt}</div>
                    )}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                    Certifying Medical Doctor
                  </h4>
                  <div className="space-y-1 text-xs">
                    <div><strong className="text-slate-900">Dr. {certificate.certifyingDoctorName}</strong></div>
                    <div className="text-slate-600">{certificate.certifyingDoctorRole || 'Attending Physician'}</div>
                    <div className="text-slate-500 font-mono text-[11px]">Lic: {certificate.certifyingDoctorLicenseNumber || 'UMDPC-REG-ACTIVE'}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Certified: {certificate.certifiedAt ? new Date(certificate.certifiedAt).toLocaleString() : certificate.dateOfDeath}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Audit & Change History Tab */
            <div className="space-y-3">
              <div className="text-[11px] text-slate-500 mb-2">
                All clinical amendments, modifications, and legal verifications are logged with permanent timestamps.
              </div>
              {certificate.changeHistory && certificate.changeHistory.length > 0 ? (
                <div className="space-y-2">
                  {certificate.changeHistory.map((item, idx) => (
                    <div key={item.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.action === 'created'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {item.action}
                          </span>
                          <span className="font-semibold text-slate-800 text-xs">
                            {item.userName} ({item.userRole})
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 text-xs mt-1">{item.details}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-center">
                  Original certificate verified at {certificate.createdAt ? new Date(certificate.createdAt).toLocaleString() : certificate.dateOfDeath}.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close Record
          </button>
        </div>
      </div>
    </div>
  );
};
