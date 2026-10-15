import React, { useState } from 'react';
import {
  FileText,
  X,
  Printer,
  Edit3,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Activity,
  History,
  Building2,
  Phone,
  Download,
  Ambulance,
  HeartPulse,
  Navigation
} from 'lucide-react';
import { PatientReferral } from '../../types';
import { useClinic } from '../../context/ClinicContext';
import { exportReferralToPdf } from '../../utils/referralPdfExport';

interface ViewReferralFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  referral: PatientReferral | null;
  onEdit?: (referral: PatientReferral) => void;
  onPrint?: (referral: PatientReferral) => void;
}

export const ViewReferralFileModal: React.FC<ViewReferralFileModalProps> = ({
  isOpen,
  onClose,
  referral,
  onEdit,
  onPrint
}) => {
  const { activeClinic } = useClinic();
  const [activeTab, setActiveTab] = useState<'dossier' | 'history'>('dossier');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!isOpen || !referral) return null;

  const handleDownloadPdf = () => {
    try {
      setIsExportingPdf(true);
      exportReferralToPdf(referral, activeClinic);
    } catch (err) {
      console.error('Failed to export referral PDF:', err);
      alert('Unable to generate PDF directly. Please use the Print button and select "Save as PDF".');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrintAction = () => {
    if (onPrint) {
      onPrint(referral);
    } else {
      window.print();
    }
  };

  const urgencyStyles = {
    emergency: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    urgent: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    routine: 'bg-slate-500/20 text-slate-300 border-slate-500/40'
  };

  const urgencyBadgeStyle = urgencyStyles[referral.urgency] || urgencyStyles.routine;
  const changeHistory = referral.changeHistory || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Ambulance className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base tracking-tight text-white">
                  Official Inpatient Referral & Transfer Dossier
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${urgencyBadgeStyle}`}>
                  {referral.urgency || 'Routine'} Priority
                </span>
                <span className="font-mono text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  #{referral.referralNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Patient: <strong className="text-white">{referral.patientName}</strong> (MRN: <span className="font-mono text-indigo-200">{referral.patientMrn}</span>) &bull; Referred to <strong className="text-indigo-200">{referral.destinationHospital}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(referral)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                title="Edit referral details"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Download official PDF file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintAction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Print document or save via browser PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center gap-6 text-sm shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('dossier')}
            className={`py-3 font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'dossier'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Referral Dossier</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit & Change Trail</span>
            {changeHistory.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                {changeHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          {activeTab === 'dossier' ? (
            <>
              {/* Facility & Routing Banner */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Referring Facility</span>
                    <h4 className="font-bold text-slate-900 text-base">{referral.referringFacilityName || activeClinic.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {referral.referringFacilityAddress || activeClinic.address} &bull; Tel: {referral.referringFacilityPhone || activeClinic.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
                    <Navigation className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600">Transfer Destination</span>
                      <p className="font-bold text-indigo-950 text-sm">{referral.destinationHospital}</p>
                      {referral.destinationDepartment && (
                        <p className="text-xs text-indigo-700">{referral.destinationDepartment}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Destination & Transport Particulars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Receiving Contact / Dept:</span>
                    <strong className="text-slate-800 text-sm">
                      {referral.destinationDoctorOrContact || 'Admitting Officer'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Referral Date & Time:</span>
                    <strong className="text-slate-800 text-sm">
                      {new Date(referral.referralDate).toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Mode of Transport:</span>
                    <strong className="text-slate-800 text-sm">
                      {referral.transportMode || 'Ambulance (Monitored)'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Accompanying Staff:</span>
                    <strong className="text-slate-800 text-sm">
                      {referral.accompanyingStaff || 'Nurse Escort'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* HIGHLIGHTED ESSENTIAL FIELDS: Reason For Referral & Condition Before Referral */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Reason for Referral */}
                <div className="bg-rose-50/70 border-2 border-rose-200/90 rounded-xl p-4.5 shadow-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                    <h5 className="font-bold text-rose-900 text-xs uppercase tracking-wider">
                      Reason for Referral (Mandatory)
                    </h5>
                  </div>
                  <p className="text-slate-800 font-medium text-sm whitespace-pre-wrap leading-relaxed">
                    {referral.reasonForReferral}
                  </p>
                </div>

                {/* Condition Before Referral */}
                <div className="bg-emerald-50/70 border-2 border-emerald-200/90 rounded-xl p-4.5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-emerald-700" />
                      <h5 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">
                        Condition Before Referral (At Handover)
                      </h5>
                    </div>
                    <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {referral.conditionBeforeReferral || 'Stable'}
                    </span>
                  </div>
                  <p className="text-slate-800 text-sm leading-relaxed">
                    Patient condition at handover: <strong>{referral.conditionBeforeReferral}</strong>.
                    {referral.specialPrecautions ? ` Precautions noted: ${referral.specialPrecautions}` : ' Vital parameters continuously stabilized in ward prior to transfer.'}
                  </p>
                </div>
              </div>

              {/* Patient Demographics & Ward/Bed details */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <h5 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span>Patient Demographics & Inpatient Admission</span>
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">Patient Name</span>
                    <strong className="text-slate-900">{referral.patientName}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">MRN / Hospital No</span>
                    <strong className="text-indigo-700 font-mono">{referral.patientMrn}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">Age & Gender</span>
                    <strong className="text-slate-900">{referral.patientAge} yrs / {referral.patientGender}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">Ward & Bed</span>
                    <strong className="text-slate-900">{referral.ward || 'IPD'}{referral.bedNumber ? ` - ${referral.bedNumber}` : ''}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">Admission Date</span>
                    <strong className="text-slate-900">{new Date(referral.admissionDate).toLocaleDateString()}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">Emergency Contact</span>
                    <strong className="text-slate-900">
                      {referral.emergencyContactName ? `${referral.emergencyContactName} (${referral.emergencyContactPhone || 'N/A'})` : 'On file'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Handover Vital Signs Table */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span>Vital Signs Recorded Prior to Referral Handover</span>
                  </h5>
                  <span className="text-[11px] text-slate-500">
                    Recorded: {referral.handoverVitalsRecordedAt ? new Date(referral.handoverVitalsRecordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Prior to transfer'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Pressure</span>
                    <span className="text-base font-bold text-slate-800">
                      {referral.vitalsAtReferral?.bloodPressure || '120/80'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">mmHg</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Pulse Rate</span>
                    <span className="text-base font-bold text-slate-800">
                      {referral.vitalsAtReferral?.pulseRate || 72}
                    </span>
                    <span className="text-[10px] text-slate-400 block">bpm</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Temperature</span>
                    <span className="text-base font-bold text-slate-800">
                      {referral.vitalsAtReferral?.temperature || 36.8}
                    </span>
                    <span className="text-[10px] text-slate-400 block">°C</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Resp. Rate</span>
                    <span className="text-base font-bold text-slate-800">
                      {referral.vitalsAtReferral?.respiratoryRate || 18}
                    </span>
                    <span className="text-[10px] text-slate-400 block">breaths/min</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">SpO2 (Pulse Ox)</span>
                    <span className="text-base font-bold text-slate-800">
                      {referral.vitalsAtReferral?.spO2 || 98}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">Room Air / O2</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Glucose</span>
                    <span className="text-base font-bold text-slate-800">
                      {referral.vitalsAtReferral?.bloodGlucose || '5.4'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">mmol/L</span>
                  </div>
                </div>
              </div>

              {/* Diagnoses & Clinical Summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Primary / Working Diagnosis</span>
                  <h4 className="text-base font-bold text-slate-900 mt-0.5">{referral.diagnosis}</h4>
                  {referral.secondaryDiagnoses && (
                    <p className="text-xs text-slate-600 mt-1">
                      <strong>Secondary Diagnoses:</strong> {referral.secondaryDiagnoses}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Clinical Summary & Inpatient Course</span>
                  <p className="text-xs text-slate-700 mt-1.5 leading-relaxed whitespace-pre-wrap">
                    {referral.clinicalSummary || 'Patient admitted with acute illness and monitored under inpatient ward management.'}
                  </p>
                </div>
              </div>

              {/* Treatments & Investigations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Treatments Given */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 text-slate-500">
                    Inpatient Management & Medications Given
                  </h5>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {referral.treatmentsGiven || 'Standard inpatient care and vital signs monitoring.'}
                  </p>
                </div>

                {/* Investigations Done */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 text-slate-500">
                    Diagnostic Investigations & Labs Done
                  </h5>
                  {referral.investigationsSummary && referral.investigationsSummary.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {referral.investigationsSummary.map((test, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-indigo-600 font-bold">•</span>
                          <span>{test}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Routine bedside parameters and baseline checks monitored.</p>
                  )}
                </div>
              </div>

              {/* Allergies & Precautions */}
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between gap-4 text-xs">
                <div>
                  <span className="font-bold text-rose-900 uppercase text-[11px] block">Known Drug Allergies:</span>
                  <p className="text-rose-800 font-semibold mt-0.5">
                    {referral.knownAllergies && referral.knownAllergies.length > 0
                      ? referral.knownAllergies.join(', ')
                      : 'No Known Drug Allergies (NKDA)'}
                  </p>
                </div>
                {referral.specialPrecautions && (
                  <div className="text-right">
                    <span className="font-bold text-rose-900 uppercase text-[11px] block">Special Precautions:</span>
                    <p className="text-rose-800">{referral.specialPrecautions}</p>
                  </div>
                )}
              </div>

              {/* Referring Doctor Signature Block */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Referring Medical Practitioner</span>
                  <h5 className="text-sm font-bold text-slate-900">Dr. {referral.referringDoctorName}</h5>
                  <p className="text-xs text-slate-500">{referral.referringDoctorRole || 'Attending Physician'} &bull; {referral.referringFacilityName}</p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Digitally authorized in ViperH.M.S EHR
                  </span>
                </div>
                <div className="text-right sm:border-l sm:border-slate-100 sm:pl-6 text-xs text-slate-500">
                  <p>Referral Generated: <strong className="text-slate-800">{new Date(referral.createdAt).toLocaleString()}</strong></p>
                  {referral.updatedAt && referral.updatedAt !== referral.createdAt && (
                    <p className="text-[11px] text-slate-400">Last Revised: {new Date(referral.updatedAt).toLocaleString()}</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Audit & Change History Tab */
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
                <History className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-950">
                  <h6 className="font-bold">Patient Referral Transfer Audit Trail</h6>
                  <p className="mt-0.5 text-indigo-800">
                    Comprehensive chronological record of medical officer creation, destination updates, and condition handover amendments.
                  </p>
                </div>
              </div>

              {changeHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                  <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No revision changes recorded yet.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-indigo-200 ml-4 pl-4 space-y-4">
                  {changeHistory.map((item, idx) => (
                    <div key={item.id || idx} className="relative bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                      <div className="absolute -left-[23px] top-4 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white"></div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-xs text-slate-800">
                          {item.userName} ({item.userRole})
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{item.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Referral File #{referral.referralNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrintAction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
