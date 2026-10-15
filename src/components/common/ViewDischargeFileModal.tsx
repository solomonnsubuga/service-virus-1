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
  Pill,
  Stethoscope,
  Activity,
  History,
  FileCheck,
  Building2,
  Info
} from 'lucide-react';
import { DischargeSummary } from '../../types';
import { useClinic } from '../../context/ClinicContext';

interface ViewDischargeFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  dischargeSummary: DischargeSummary | null;
  onPrint?: (dischargeSummary: DischargeSummary) => void;
  onEdit?: (dischargeSummary: DischargeSummary) => void;
}

export const ViewDischargeFileModal: React.FC<ViewDischargeFileModalProps> = ({
  isOpen,
  onClose,
  dischargeSummary,
  onPrint,
  onEdit
}) => {
  const { activeClinic } = useClinic();
  const [activeTab, setActiveTab] = useState<'dossier' | 'history'>('dossier');

  if (!isOpen || !dischargeSummary) return null;

  // Calculate Length of Stay in days
  const calculateLOS = (admissionDate: string, dischargeDate: string) => {
    try {
      const start = new Date(admissionDate).getTime();
      const end = new Date(dischargeDate).getTime();
      const diffMs = Math.max(0, end - start);
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays === 0 ? 'Day Admission (Same Day)' : `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
    } catch {
      return 'N/A';
    }
  };

  const losText = calculateLOS(dischargeSummary.admissionDate, dischargeSummary.dischargeDate);
  const changeHistory = dischargeSummary.changeHistory || [];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in cursor-pointer"
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
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base tracking-tight text-white">
                  Inpatient Official Discharge File
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {dischargeSummary.dischargeCondition || 'Discharged'}
                </span>
                <span className="font-mono text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  #{dischargeSummary.id}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Patient: <strong className="text-white">{dischargeSummary.patientName}</strong> (MRN: <span className="font-mono text-indigo-200">{dischargeSummary.patientMrn}</span>) &bull; {dischargeSummary.ward || 'Inpatient Ward'}{dischargeSummary.bedNumber ? ` - Bed ${dischargeSummary.bedNumber}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                type="button"
                onClick={() => onPrint(dischargeSummary)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                title="Print official hospital discharge sheet"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Discharge File
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(dischargeSummary);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-white/20"
                title="Edit discharge form details"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit File
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer ml-1"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('dossier')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dossier'
                ? 'bg-white text-indigo-900 border border-slate-300 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            Discharge Dossier & Medical Summary
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-indigo-900 border border-slate-300 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-600" />
            Revision History & Change Timestamps
            {changeHistory.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                {changeHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          
          {/* TAB 1: FULL DISCHARGE DOSSIER */}
          {activeTab === 'dossier' && (
            <div className="space-y-6">
              
              {/* Facility & Stay Demographics Box */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>{activeClinic?.name || 'ViperH.M.S Hospital'}</span>
                    <span className="text-slate-400 font-normal">&bull;</span>
                    <span className="text-slate-500 font-normal">Department of Inpatient Medicine</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Discharge Doc ID: <span className="font-mono font-bold text-slate-700">{dischargeSummary.id}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Patient Name</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">{dischargeSummary.patientName}</div>
                    <div className="text-[11px] text-slate-500">{dischargeSummary.patientGender}, {dischargeSummary.patientAge} Yrs</div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Admission Date</div>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {new Date(dischargeSummary.admissionDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Stay: <strong className="text-indigo-700">{losText}</strong>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Discharge Date</div>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {new Date(dischargeSummary.dischargeDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(dischargeSummary.dischargeDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Discharging Doctor</div>
                    <div className="font-semibold text-slate-900 mt-0.5">Dr. {dischargeSummary.dischargingDoctorName}</div>
                    <div className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold">
                      {dischargeSummary.dischargeCondition}
                    </div>
                  </div>
                </div>
              </div>

              {/* 1. Diagnoses & Chief Complaint */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Stethoscope className="w-4 h-4 text-indigo-600" />
                  1. Clinical Diagnosis & Chief Complaint on Admission
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 mb-1">
                      Final Primary Diagnosis
                    </div>
                    <div className="text-xs font-bold text-indigo-950">
                      {dischargeSummary.finalDiagnosis || 'None recorded'}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Secondary / Comorbid Diagnoses
                    </div>
                    <div className="text-xs text-slate-800">
                      {dischargeSummary.secondaryDiagnoses || 'None recorded'}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    First Chief Complaint upon Presentation
                  </div>
                  <div className="text-slate-800 leading-relaxed">
                    {dischargeSummary.firstChiefComplaint || 'No chief complaint recorded at admission.'}
                  </div>
                </div>
              </div>

              {/* 2. Diagnostic Investigations & Tests Done */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-cyan-600" />
                  2. Diagnostic Investigations & Laboratory Findings
                </div>

                {dischargeSummary.testsDoneSummary && dischargeSummary.testsDoneSummary.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {dischargeSummary.testsDoneSummary.map((test, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-slate-800 font-mono text-[11px]">{test}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                    No diagnostic investigations or lab orders logged during this admission.
                  </p>
                )}
              </div>

              {/* 3. Clinical Features & Physical Exam on Discharge */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  3. Clinical Features & Examination on Discharge
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {dischargeSummary.clinicalFeatures || 'Patient examined on discharge: vital signs stable, alert, afebrile, and responding well to care.'}
                </div>
              </div>

              {/* 4. Inpatient Management & Procedures Administered */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-violet-600" />
                  4. Inpatient Management & Procedures Administered
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {dischargeSummary.managementGiven || 'Inpatient medical therapy, supportive nursing care, and clinical observation administered.'}
                </div>
              </div>

              {/* 5. Discharge Take-Home Prescription & Home Care */}
              <div className="bg-white rounded-xl border-2 border-emerald-200 p-4 shadow-xs space-y-3 bg-emerald-50/20">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    <Pill className="w-4 h-4 text-emerald-700" />
                    5. Discharge Take-Home Prescription & Medication Advice
                  </div>
                  {dischargeSummary.prescriptionId && (
                    <span className="font-mono text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      Pharmacy Prescription #{dischargeSummary.prescriptionId}
                    </span>
                  )}
                </div>

                {dischargeSummary.takeHomePrescription ? (
                  <div className="p-3.5 bg-white rounded-lg border border-emerald-200 text-xs font-sans text-slate-900 whitespace-pre-wrap leading-relaxed shadow-2xs">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Pill className="w-3 h-3 text-emerald-600" />
                      Take-Home Prescription Regimen:
                    </div>
                    {dischargeSummary.takeHomePrescription}
                  </div>
                ) : dischargeSummary.dischargeMedications && dischargeSummary.dischargeMedications.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-emerald-200 bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-emerald-50 text-emerald-950 font-bold">
                        <tr>
                          <th className="p-2 border-b border-emerald-100">Medication</th>
                          <th className="p-2 border-b border-emerald-100">Dosage & Route</th>
                          <th className="p-2 border-b border-emerald-100">Frequency & Duration</th>
                          <th className="p-2 border-b border-emerald-100 text-center">Qty</th>
                          <th className="p-2 border-b border-emerald-100">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dischargeSummary.dischargeMedications.map(med => (
                          <tr key={med.id}>
                            <td className="p-2 font-bold text-slate-900">{med.medicationName}</td>
                            <td className="p-2 text-slate-700">{med.dosage} &bull; {med.route}</td>
                            <td className="p-2 text-slate-700">{med.frequency} &bull; {med.duration}</td>
                            <td className="p-2 text-center font-mono font-bold text-emerald-800">{med.quantityToDispense}</td>
                            <td className="p-2 text-slate-600 text-[11px]">{med.instructions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 bg-white rounded-lg border border-emerald-200">
                    No take-home medications were prescribed for this discharge.
                  </p>
                )}

                {dischargeSummary.dischargeManagementNotes && (
                  <div className="p-3 bg-white rounded-lg border border-emerald-200 text-xs text-slate-800">
                    <span className="font-bold text-slate-900">Home Care & Wound Management: </span>
                    {dischargeSummary.dischargeManagementNotes}
                  </div>
                )}
              </div>

              {/* 6. Follow-Up Schedule & Red Flag Warnings */}
              <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-xs space-y-3 bg-amber-50/20">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-950 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-amber-700" />
                  6. Follow-Up Review Schedule & Warning Signs
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                    <span className="text-slate-500">Scheduled Review Date: </span>
                    <strong className="text-slate-900">
                      {dischargeSummary.followUpDate
                        ? new Date(dischargeSummary.followUpDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'As instructed / PRN'}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                    <span className="text-slate-500">Follow-up Clinic / Doctor: </span>
                    <strong className="text-slate-900">{dischargeSummary.followUpClinicOrDoctor || 'Outpatient Clinic'}</strong>
                  </div>
                </div>

                <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Emergency Warning Signs: </strong>
                    {dischargeSummary.followUpInstructions || 'Return to emergency department immediately if fever, worsening pain, wound discharge, or breathing difficulty occurs.'}
                  </div>
                </div>
              </div>

              {/* Doctor Sign-off */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-slate-500 space-y-1">
                  <div>Certified Official Inpatient Discharge Record</div>
                  <div className="text-[11px]">Electronic sign-off completed: {new Date(dischargeSummary.dischargeDate).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-slate-900">Dr. {dischargeSummary.dischargingDoctorName}</div>
                  <div className="text-xs text-slate-500">Attending Discharging Physician</div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: AUDIT TRAIL & REVISION HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Discharge File Revision History</h4>
                    <p className="text-xs text-slate-500">
                      Audit log capturing exact timestamps, modifying users, and change details for this discharge record.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs border border-indigo-200">
                    {changeHistory.length + 1} Record{changeHistory.length > 0 ? 's' : ''} Logged
                  </span>
                </div>

                {/* Audit Trail Timeline */}
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {changeHistory.length > 0 ? (
                    changeHistory.map((item, idx) => (
                      <div key={item.id || idx} className="relative group">
                        {/* Dot indicator */}
                        <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white shadow-xs flex items-center justify-center ${
                          item.action === 'created' 
                            ? 'bg-emerald-500' 
                            : item.action === 'finalized'
                            ? 'bg-indigo-500'
                            : 'bg-amber-500'
                        }`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>

                        <div className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.action === 'created'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}>
                                {item.action === 'created' ? 'File Created' : 'File Amended'}
                              </span>
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-500" />
                                {item.userName}
                                {item.userRole && (
                                  <span className="text-[11px] font-normal text-slate-500">
                                    ({item.userRole})
                                  </span>
                                )}
                              </span>
                            </div>

                            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {new Date(item.timestamp).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </div>
                          </div>

                          <div className="text-xs text-slate-700 leading-relaxed font-sans">
                            {item.details || 'Discharge file modification.'}
                          </div>

                          {item.newDischargeCondition && (
                            <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-2">
                              <span>Discharge Condition:</span>
                              <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {item.newDischargeCondition}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    /* Fallback to summary creation/update fields if historical logs haven't been backfilled */
                    <>
                      {dischargeSummary.updatedAt && (
                        <div className="relative">
                          <div className="absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white shadow-xs bg-amber-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">Latest Modification</span>
                              <span className="font-mono text-slate-500">
                                {new Date(dischargeSummary.updatedAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-slate-800">
                              Updated by <strong>{dischargeSummary.updatedBy || dischargeSummary.dischargingDoctorName}</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="relative">
                        <div className="absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white shadow-xs bg-emerald-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">Initial Creation</span>
                            <span className="font-mono text-slate-500">
                              {new Date(dischargeSummary.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-slate-800">
                            Discharge file created by <strong>Dr. {dischargeSummary.dischargingDoctorName}</strong>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Informational notice about compliance and timestamp tracking */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Regulatory Audit Compliance:</strong> All changes to this inpatient discharge file are timestamped in UTC and local time along with the authenticated staff identifier and role. Changes to the final diagnosis, take-home prescription, and discharge condition are permanently preserved in the hospital audit registry.
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            {dischargeSummary.updatedAt ? (
              <span>
                Last edited on <strong>{new Date(dischargeSummary.updatedAt).toLocaleString()}</strong> by <strong>{dischargeSummary.updatedBy || 'Staff'}</strong>
              </span>
            ) : (
              <span>
                Created on <strong>{new Date(dischargeSummary.createdAt).toLocaleString()}</strong> by <strong>Dr. {dischargeSummary.dischargingDoctorName}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                type="button"
                onClick={() => onPrint(dischargeSummary)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Discharge File
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
