import React, { useState, useEffect, useMemo } from 'react';
import { useClinic } from '../../../context/ClinicContext';
import {
  Patient,
  DischargeSummary,
  DischargeMedicationItem,
  DischargeCondition,
  InventoryItem
} from '../../../types';
import { formatPatientAge } from '../../../utils/ageUtils';
import {
  X,
  FileSpreadsheet,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Sparkles,
  ClipboardList,
  Activity,
  Send,
  BedDouble,
  HeartPulse,
  Info,
  ChevronRight,
  Search,
  ExternalLink,
  Eye,
  History
} from 'lucide-react';
import { ViewDischargeFileModal } from '../../common/ViewDischargeFileModal';

interface DischargePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onPrintPreview?: (dischargeSummary: DischargeSummary) => void;
  onDischargeSuccess?: (dischargeSummary: DischargeSummary) => void;
}

export const DischargePatientModal: React.FC<DischargePatientModalProps> = ({
  isOpen,
  onClose,
  patient,
  onPrintPreview,
  onDischargeSuccess
}) => {
  const {
    currentUser,
    activeClinic,
    currentClinicEncounters,
    currentClinicTestOrders,
    currentClinicRadiologyOrders,
    currentClinicTreatmentCharts,
    currentClinicProcedures,
    currentClinicInventory,
    users,
    dischargeSummaries,
    saveDischargeSummary
  } = useClinic();

  // Find existing discharge summary for this patient if any
  const existingSummary = useMemo(() => {
    if (!patient) return undefined;
    return dischargeSummaries.find(ds => ds.patientId === patient.id);
  }, [patient, dischargeSummaries]);

  // Doctors list for selecting discharging doctor
  const doctorsList = useMemo(() => {
    return users.filter(u => u.role === 'doctor');
  }, [users]);

  // Form State
  const [dischargingDoctorId, setDischargingDoctorId] = useState<string>('');
  const [dischargeDate, setDischargeDate] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [firstChiefComplaint, setFirstChiefComplaint] = useState<string>('');
  const [finalDiagnosis, setFinalDiagnosis] = useState<string>('');
  const [secondaryDiagnoses, setSecondaryDiagnoses] = useState<string>('');
  const [testsDoneSummary, setTestsDoneSummary] = useState<string[]>([]);
  const [newCustomTestText, setNewCustomTestText] = useState<string>('');
  
  const [clinicalFeatures, setClinicalFeatures] = useState<string>('');
  const [managementGiven, setManagementGiven] = useState<string>('');
  const [dischargeCondition, setDischargeCondition] = useState<DischargeCondition>('Improved');
  const [dischargeManagementNotes, setDischargeManagementNotes] = useState<string>('');
  const [takeHomePrescription, setTakeHomePrescription] = useState<string>('');
  const [dischargeMedications, setDischargeMedications] = useState<DischargeMedicationItem[]>([]);
  
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [followUpClinicOrDoctor, setFollowUpClinicOrDoctor] = useState<string>('Specialist Outpatient Clinic');
  const [followUpInstructions, setFollowUpInstructions] = useState<string>('');

  // UI status
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessSummary, setSavedSuccessSummary] = useState<DischargeSummary | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'clinical' | 'management' | 'followup'>('clinical');
  const [isViewFileOpen, setIsViewFileOpen] = useState(false);

  // Auto-fill logic on modal open or patient change
  useEffect(() => {
    if (!isOpen || !patient) {
      setSavedSuccessSummary(null);
      return;
    }

    if (existingSummary) {
      // Populate existing saved summary for editing!
      setDischargingDoctorId(existingSummary.dischargingDoctorId || currentUser.id);
      setDischargeDate(
        existingSummary.dischargeDate
          ? new Date(existingSummary.dischargeDate).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16)
      );
      setFirstChiefComplaint(existingSummary.firstChiefComplaint || '');
      setFinalDiagnosis(existingSummary.finalDiagnosis || '');
      setSecondaryDiagnoses(existingSummary.secondaryDiagnoses || '');
      setTestsDoneSummary(existingSummary.testsDoneSummary || []);
      setClinicalFeatures(existingSummary.clinicalFeatures || '');
      setManagementGiven(existingSummary.managementGiven || '');
      setDischargeCondition(existingSummary.dischargeCondition || 'Improved');
      setDischargeManagementNotes(existingSummary.dischargeManagementNotes || '');
      setTakeHomePrescription(
        existingSummary.takeHomePrescription ||
        (existingSummary.dischargeMedications && existingSummary.dischargeMedications.length > 0
          ? existingSummary.dischargeMedications
              .map((m, idx) => `${idx + 1}. ${m.medicationName} ${m.dosage} ${m.route} - ${m.frequency} x ${m.duration} (Qty: ${m.quantityToDispense}). ${m.instructions || ''}`)
              .join('\n')
          : '')
      );
      setDischargeMedications(existingSummary.dischargeMedications || []);
      setFollowUpDate(existingSummary.followUpDate ? existingSummary.followUpDate.slice(0, 10) : '');
      setFollowUpClinicOrDoctor(existingSummary.followUpClinicOrDoctor || 'Specialist Outpatient Clinic');
      setFollowUpInstructions(existingSummary.followUpInstructions || '');
      setSavedSuccessSummary(null);
      return;
    }

    // Auto-fill fresh discharge form
    const defaultDoctorId = (currentUser.role === 'doctor' ? currentUser.id : doctorsList[0]?.id) || currentUser.id;
    setDischargingDoctorId(defaultDoctorId);
    setDischargeDate(new Date().toISOString().slice(0, 16));

    // 1. AUTO-FILL FIRST CHIEF COMPLAINT:
    // Extract from patient's chronologically earliest clinical encounter
    const patientEncounters = currentClinicEncounters
      .filter(e => e.patientId === patient.id)
      .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
    
    const earliestEncounter = patientEncounters[0];
    const latestEncounter = patientEncounters[patientEncounters.length - 1];

    if (earliestEncounter) {
      const complaintText = earliestEncounter.chiefComplaint
        ? earliestEncounter.chiefComplaint
        : earliestEncounter.historyOfPresentIllness
        ? earliestEncounter.historyOfPresentIllness.slice(0, 120)
        : '';
      setFirstChiefComplaint(complaintText);
    } else {
      setFirstChiefComplaint(patient.initialComplaint || 'Admitted for inpatient clinical stabilization and care');
    }

    // Diagnosis default from latest encounter or working diagnosis
    setFinalDiagnosis(
      latestEncounter?.workingDiagnosis ||
      earliestEncounter?.workingDiagnosis ||
      patient.initialComplaint ||
      'Resolved Acute Condition'
    );

    // 2. AUTO-FILL NAMES OF TESTS DONE:
    // Pull all pathology tests and radiology orders for this patient
    const compiledTests: string[] = [];
    
    // Pathology test orders
    const patientLabs = currentClinicTestOrders.filter(t => t.patientId === patient.id);
    patientLabs.forEach(test => {
      let testLine = `Lab: ${test.testName} (${test.testCode || 'Pathology'}) - Status: ${test.status.toUpperCase()}`;
      if (test.results && test.results.length > 0) {
        const resultSnippets = test.results
          .slice(0, 3)
          .map(r => `${r.parameter}: ${r.value} ${r.unit}`)
          .join(', ');
        testLine += ` [Findings: ${resultSnippets}]`;
      }
      compiledTests.push(testLine);
    });

    // Radiology scan orders
    const patientScans = currentClinicRadiologyOrders.filter(r => r.patientId === patient.id);
    patientScans.forEach(scan => {
      let scanLine = `Radiology: ${scan.modality} - ${scan.procedureName} - Status: ${scan.status.toUpperCase()}`;
      if (scan.findings) {
        scanLine += ` [Findings: ${scan.findings.slice(0, 80)}...]`;
      } else if (scan.impression) {
        scanLine += ` [Impression: ${scan.impression.slice(0, 80)}...]`;
      }
      compiledTests.push(scanLine);
    });

    if (compiledTests.length === 0) {
      compiledTests.push('Routine inpatient bedside glucose & baseline vitals monitored');
    }
    setTestsDoneSummary(compiledTests);

    // Initial clinical features template
    setClinicalFeatures(
      `Patient admitted on ${new Date(patient.admissionDate || patient.registeredAt || new Date().toISOString()).toLocaleDateString()} with acute symptoms. Vital signs stabilized throughout hospital admission. Currently alert, oriented, hemodynamically stable, afebrile, and ambulating independently.`
    );

    // Initial management given template
    const chart = currentClinicTreatmentCharts.find(tc => tc.patientId === patient.id);
    let initialManagement = '';
    if (chart && chart.items.length > 0) {
      const activeMeds = chart.items.map(it => `${it.medicationOrItemName} ${it.dosage} ${it.route} (${it.frequency})`).join('; ');
      initialManagement = `Inpatient pharmacological management included: ${activeMeds}. Daily nursing monitoring and clinical reassessment performed.`;
    } else {
      initialManagement = `Inpatient supportive medical care, vital signs monitoring, and standard nursing management administered.`;
    }
    setManagementGiven(initialManagement);

    // Default follow up
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setFollowUpDate(nextWeek.toISOString().slice(0, 10));
    setFollowUpClinicOrDoctor('Specialist Outpatient Clinic');
    setFollowUpInstructions(
      'Take all prescribed discharge take-home medications strictly as directed. Maintain adequate hydration and rest. Return immediately to the Emergency Department / A&E if experiencing severe recurrent fever, persistent vomiting, chest pain, difficulty breathing, or acute worsening of symptoms.'
    );
    setDischargeManagementNotes(
      'Continue home oral hydration and nutritious diet. Avoid strenuous physical exertion for the next 7-10 days. Keep dressing clean and dry if applicable.'
    );

    setDischargeCondition('Improved');
    setDischargeMedications([]);
    setSavedSuccessSummary(null);
  }, [
    isOpen,
    patient,
    existingSummary,
    currentClinicEncounters,
    currentClinicTestOrders,
    currentClinicRadiologyOrders,
    currentClinicTreatmentCharts,
    currentUser,
    doctorsList
  ]);

  if (!isOpen || !patient) return null;

  // Quick preset follow up helpers
  const applyFollowUpDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFollowUpDate(d.toISOString().slice(0, 10));
  };

  // Helper to import medications from inpatient treatment chart
  const handleImportInpatientMeds = () => {
    const chart = currentClinicTreatmentCharts.find(tc => tc.patientId === patient.id);
    if (!chart || chart.items.length === 0) {
      alert("No active inpatient medication items found on this patient's treatment chart.");
      return;
    }
    const lines = chart.items.map((it, idx) => `${idx + 1}. ${it.medicationOrItemName} ${it.dosage} ${it.route} - ${it.frequency}`);
    const text = lines.join('\n');
    setTakeHomePrescription(prev => prev ? `${prev}\n${text}` : text);
  };

  // Helper to insert a sample take-home prescription regimen
  const handleInsertSampleTakeHomeRx = () => {
    const sample = `1. Tab. Amoxicillin/Clavulanate 625mg PO BD x 7 days\n2. Tab. Paracetamol 1g PO TDS PRN for pain or fever\n3. Cap. Omeprazole 20mg PO OD (before breakfast) x 14 days\n4. Syr. Multivitamin 10ml PO OD x 14 days\nTake oral medications with water after meals. Complete full antibiotic course.`;
    setTakeHomePrescription(sample);
  };

  // Add custom test summary
  const handleAddCustomTest = () => {
    if (!newCustomTestText.trim()) return;
    setTestsDoneSummary(prev => [...prev, newCustomTestText.trim()]);
    setNewCustomTestText('');
  };

  const handleRemoveTest = (index: number) => {
    setTestsDoneSummary(prev => prev.filter((_, i) => i !== index));
  };

  // Auto-summarize treatment from inpatient records
  const handleAutoSummarizeInpatientCare = () => {
    const chart = currentClinicTreatmentCharts.find(tc => tc.patientId === patient.id);
    const procedures = currentClinicProcedures.filter(p => p.patientId === patient.id);
    
    let summaryParts: string[] = [];

    if (chart && chart.items.length > 0) {
      const itemsList = chart.items.map(it => {
        const givenCount = it.doses?.filter(d => d.status === 'given').length || 0;
        return `${it.medicationOrItemName} (${it.dosage} ${it.route} ${it.frequency}, ${givenCount} doses administered)`;
      }).join('; ');
      summaryParts.push(`Inpatient Medication Regimen: ${itemsList}`);
    }

    if (procedures.length > 0) {
      const procList = procedures.map(p => `${p.procedureName} (Doctor: Dr. ${p.doctorName} on ${new Date(p.performedAt).toLocaleDateString()}, Outcome: ${p.outcome})`).join('; ');
      summaryParts.push(`Procedures Performed: ${procList}`);
    }

    summaryParts.push(`Continuous nursing clinical surveillance, fluid balance monitoring, and vital checks recorded on MAR treatment chart.`);

    setManagementGiven(prev => {
      const combined = summaryParts.join('\n\n');
      return prev ? `${prev}\n\n${combined}` : combined;
    });
  };

  // Submit Save
  const handleSaveDischarge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalDiagnosis.trim()) {
      alert('Please enter a final discharge diagnosis.');
      return;
    }

    setIsSaving(true);

    try {
      const doctor = doctorsList.find(d => d.id === dischargingDoctorId) || currentUser;

      const summaryData: Omit<DischargeSummary, 'id' | 'createdAt'> & { id?: string } = {
        id: existingSummary?.id,
        clinicId: activeClinic.id,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientMrn: patient.mrn,
        patientAge: patient.age,
        patientGender: patient.gender,
        ward: patient.ward || 'Inpatient Ward',
        bedNumber: patient.bedNumber || undefined,
        admissionDate: patient.admissionDate || patient.registeredDate || new Date().toISOString(),
        dischargeDate: new Date(dischargeDate).toISOString(),
        dischargingDoctorId: doctor.id,
        dischargingDoctorName: doctor.name,
        
        firstChiefComplaint,
        testsDoneSummary,
        
        finalDiagnosis,
        secondaryDiagnoses,
        clinicalFeatures,
        managementGiven,
        dischargeCondition,
        
        takeHomePrescription: takeHomePrescription.trim() || undefined,
        dischargeManagementNotes,
        dischargeMedications: dischargeMedications.length > 0 ? dischargeMedications : undefined,
        prescriptionId: existingSummary?.prescriptionId,
        
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
        followUpClinicOrDoctor,
        followUpInstructions,
        
        status: 'finalized'
      };

      const result = saveDischargeSummary(summaryData);
      setSavedSuccessSummary(result.dischargeSummary);
      if (onDischargeSuccess) {
        onDischargeSuccess(result.dischargeSummary);
      }
    } catch (err: any) {
      console.error('Error saving discharge summary:', err);
      alert('Failed to save discharge summary: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const selectedDoctorObj = doctorsList.find(d => d.id === dischargingDoctorId) || currentUser;

  const getDischargeSummaryForPrint = (): DischargeSummary => {
    return {
      id: savedSuccessSummary?.id || existingSummary?.id || `DRAFT-${patient.mrn}-${Date.now()}`,
      clinicId: activeClinic?.id || '',
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientMrn: patient.mrn,
      patientAge: patient.age,
      patientGender: patient.gender,
      ward: patient.ward || 'Inpatient Ward',
      bedNumber: patient.bedNumber || undefined,
      admissionDate: patient.admissionDate || patient.registeredAt || new Date().toISOString(),
      dischargeDate: dischargeDate ? new Date(dischargeDate).toISOString() : new Date().toISOString(),
      dischargingDoctorId: dischargingDoctorId || currentUser.id,
      dischargingDoctorName: selectedDoctorObj?.name || currentUser.name,
      firstChiefComplaint: firstChiefComplaint.trim(),
      testsDoneSummary: testsDoneSummary,
      finalDiagnosis: finalDiagnosis.trim() || 'Clinical evaluation completed',
      secondaryDiagnoses: secondaryDiagnoses.trim(),
      clinicalFeatures: clinicalFeatures.trim(),
      managementGiven: managementGiven.trim(),
      dischargeCondition: dischargeCondition,
      takeHomePrescription: takeHomePrescription.trim(),
      dischargeManagementNotes: dischargeManagementNotes.trim(),
      dischargeMedications: dischargeMedications,
      prescriptionId: savedSuccessSummary?.prescriptionId || existingSummary?.prescriptionId,
      followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
      followUpClinicOrDoctor: followUpClinicOrDoctor.trim(),
      followUpInstructions: followUpInstructions.trim(),
      createdAt: existingSummary?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.name,
      status: 'finalized',
      changeHistory: existingSummary?.changeHistory || []
    };
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Banner */}
        <div className="px-6 py-4 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {existingSummary ? 'Edit Inpatient Discharge Summary' : 'Inpatient Patient Discharge Form'}
                </h2>
                {existingSummary ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Saved Record #{existingSummary.id}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    New Discharge
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Official hospital discharge record with auto-filled test results & chief complaint, and take-home pharmacy routing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(existingSummary || savedSuccessSummary) && (
              <button
                type="button"
                onClick={() => setIsViewFileOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold cursor-pointer border border-white/20 transition-colors shadow-2xs"
                title="View complete formatted discharge dossier and revision timestamps"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-300" />
                View Discharge File
              </button>
            )}

            {onPrintPreview && (
              <button
                type="button"
                onClick={() => onPrintPreview(getDischargeSummaryForPrint())}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
                title="Print hospital discharge sheet"
              >
                <Printer className="w-3.5 h-3.5" />
                Print File
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Patient Profile Sub-Header Bar */}
        <div className="px-6 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500 font-medium">Patient: </span>
              <span className="font-bold text-slate-900">{patient.firstName} {patient.lastName}</span>
              <span className="text-indigo-700 font-mono ml-2 font-semibold">({patient.mrn})</span>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-slate-500">Demographics: </span>
              <span className="font-semibold text-slate-800">{patient.gender}, {formatPatientAge(patient)}</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 text-purple-800 font-semibold">
              <BedDouble className="w-3.5 h-3.5 text-purple-600" />
              <span>{patient.ward || 'General Ward'} - Bed {patient.bedNumber || 'N/A'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Admission Date: </span>
            <span className="font-semibold text-slate-800">
              {new Date(patient.admissionDate || patient.registeredDate || patient.registeredAt || new Date().toISOString()).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Success Alert Banner if just saved */}
        {savedSuccessSummary && (
          <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-emerald-900">
                  Discharge Summary Saved & Patient Discharged Successfully!
                </div>
                <div className="text-emerald-700">
                  {savedSuccessSummary.takeHomePrescription?.trim() || (savedSuccessSummary.dischargeMedications && savedSuccessSummary.dischargeMedications.length > 0)
                    ? `Discharge take-home prescription routed directly to Pharmacy queue (Prescription #${savedSuccessSummary.prescriptionId || 'Created'}) for Direct Cart population & dispensing.`
                    : 'Patient marked as discharged. No take-home medications were requested.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsViewFileOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-indigo-900 border border-slate-300 rounded-lg font-semibold cursor-pointer shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                View Discharge File
              </button>
              {onPrintPreview && (
                <button
                  type="button"
                  onClick={() => onPrintPreview(savedSuccessSummary)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Discharge Sheet
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 rounded-lg font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Form Body with Tab Navigation */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Tab Selection */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveFormTab('clinical')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeFormTab === 'clinical'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-indigo-600" />
              1. Clinical Features & Tests Done (Auto-Filled)
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('management')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeFormTab === 'management'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Pill className="w-4 h-4 text-emerald-600" />
              2. Management Given & Take-Home Rx (To Pharmacy)
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('followup')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeFormTab === 'followup'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-amber-600" />
              3. Follow-Up & Discharge Condition
            </button>
          </div>

          <form id="discharge-patient-form" onSubmit={handleSaveDischarge} className="space-y-6">
            
            {/* Top Row: Discharging Doctor & Discharge Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Discharging Physician / Medical Officer *
                </label>
                <div className="relative">
                  <select
                    value={dischargingDoctorId}
                    onChange={(e) => setDischargingDoctorId(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {doctorsList.length > 0 ? (
                      doctorsList.map(doc => (
                        <option key={doc.id} value={doc.id}>
                          Dr. {doc.name} ({doc.specialty || 'General Physician'})
                        </option>
                      ))
                    ) : (
                      <option value={currentUser.id}>Dr. {currentUser.name} (Current Staff)</option>
                    )}
                  </select>
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Discharge Date & Time *
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={dischargeDate}
                    onChange={(e) => setDischargeDate(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* TAB 1: CLINICAL FEATURES & TESTS */}
            {activeFormTab === 'clinical' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                
                {/* 1. AUTO-FILLED FIRST CHIEF COMPLAINT */}
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      First Chief Complaint on Admission (Auto-Filled) *
                    </label>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded border border-indigo-200">
                      Auto-populated from initial encounter
                    </span>
                  </div>
                  <input
                    type="text"
                    value={firstChiefComplaint}
                    onChange={(e) => setFirstChiefComplaint(e.target.value)}
                    required
                    placeholder="e.g., High-grade fever for 4 days associated with productive cough and pleuritic chest pain"
                    className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-slate-500">
                    Extracted automatically from the earliest admission encounter. You can edit or clarify the complaint details as needed.
                  </p>
                </div>

                {/* Final Diagnosis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Final Discharge Diagnosis *
                    </label>
                    <input
                      type="text"
                      value={finalDiagnosis}
                      onChange={(e) => setFinalDiagnosis(e.target.value)}
                      required
                      placeholder="e.g., Community Acquired Pneumonia - Resolved"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Secondary / Underlying Diagnoses
                    </label>
                    <input
                      type="text"
                      value={secondaryDiagnoses}
                      onChange={(e) => setSecondaryDiagnoses(e.target.value)}
                      placeholder="e.g., Essential Hypertension, Type 2 Diabetes Mellitus"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* 2. AUTO-FILLED TESTS DONE SUMMARY */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4 text-slate-600" />
                      Diagnostic Investigations & Tests Done (Auto-Filled)
                    </label>
                    <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-300">
                      {testsDoneSummary.length} test(s) recorded
                    </span>
                  </div>

                  {testsDoneSummary.length === 0 ? (
                    <div className="p-3 bg-white rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-500">
                      No diagnostic tests or imaging records found during stay.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {testsDoneSummary.map((testStr, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-800"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span className="font-mono text-xs">{testStr}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveTest(index)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                            title="Remove test entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add additional custom test entry */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newCustomTestText}
                      onChange={(e) => setNewCustomTestText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomTest();
                        }
                      }}
                      placeholder="Add an external lab or imaging scan done..."
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTest}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Add Test
                    </button>
                  </div>
                </div>

                {/* 3. CLINICAL FEATURES */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      Clinical Features, Hospital Course & Examination on Discharge *
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setClinicalFeatures(prev => prev + '\n- Patient afebrile, pulse regular, BP 120/80 mmHg, SpO2 98% on room air.')}
                        className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 cursor-pointer"
                      >
                        + Vitals Stable
                      </button>
                      <button
                        type="button"
                        onClick={() => setClinicalFeatures(prev => prev + '\n- Physical examination unremarkable, chest clear on auscultation, abdomen soft.')}
                        className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 cursor-pointer"
                      >
                        + Exam Clear
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={clinicalFeatures}
                    onChange={(e) => setClinicalFeatures(e.target.value)}
                    required
                    placeholder="Describe presenting symptoms, clinical response to treatment during admission, vital stability, and physical exam findings at the time of discharge..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-sans text-slate-900 leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveFormTab('management')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Proceed to Management & Take-Home Rx
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: MANAGEMENT GIVEN & TAKE-HOME RX */}
            {activeFormTab === 'management' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                
                {/* MANAGEMENT THAT WAS GIVEN */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-indigo-600" />
                      Management That Was Given (Inpatient Care & Procedures) *
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoSummarizeInpatientCare}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 cursor-pointer transition-colors"
                      title="Compile MAR checklist doses and procedures from database"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Auto-Summarize Inpatient MAR & Procedures
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={managementGiven}
                    onChange={(e) => setManagementGiven(e.target.value)}
                    required
                    placeholder="Summarize medical management administered during stay, IV fluids, surgical/clinical procedures, and nursing care provided..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-sans text-slate-900 leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* DISCHARGE MANAGEMENT: TAKE-HOME PRESCRIPTION TO PHARMACY */}
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Pill className="w-4 h-4 text-emerald-700" />
                        <h4 className="text-xs font-bold text-emerald-950">
                          Take-Home Prescription & Medications (Sent to Pharmacy)
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Auto-transfers to Pharmacy
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Provide the take-home prescription in the same way as the prescription for OPD encounters.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleImportInpatientMeds}
                        className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100 px-2.5 py-1 rounded border border-emerald-300 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Copy active medicines from inpatient treatment chart into prescription"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        + Import Inpatient Meds
                      </button>
                      <button
                        type="button"
                        onClick={handleInsertSampleTakeHomeRx}
                        className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100 px-2.5 py-1 rounded border border-emerald-300 transition-colors cursor-pointer shadow-2xs"
                        title="Insert standard post-discharge medication regimen"
                      >
                        + Sample Take-Home Rx
                      </button>
                      {takeHomePrescription && (
                        <button
                          type="button"
                          onClick={() => setTakeHomePrescription('')}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Doctor's Take-Home Prescription Field */}
                  <div>
                    <textarea
                      rows={5}
                      value={takeHomePrescription}
                      onChange={(e) => setTakeHomePrescription(e.target.value)}
                      placeholder="e.g.&#10;1. Tab. Amoxicillin/Clavulanate 625mg PO BD x 7 days&#10;2. Tab. Paracetamol 1g PO TDS PRN for fever / pain&#10;3. Cap. Omeprazole 20mg PO OD (before meals) x 14 days&#10;4. Syr. Multivitamin 10ml PO OD x 14 days&#10;Take oral medications with water after meals. Complete full antibiotic course."
                      className="w-full px-3 py-2.5 bg-white border border-emerald-300 rounded-lg text-xs font-sans text-slate-900 leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Pharmacist Direct Cart -> Indirect Cart Info Note */}
                  <div className="p-2.5 bg-white/80 rounded-lg border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="leading-normal">
                      <strong>Pharmacy Cart Workflow:</strong> The doctor is not prompted to fill or allocate inventory items into carts here. The prescription will be routed to the <strong>Pharmacy Dashboard</strong>, where the pharmacist will populate the <strong>Direct Cart</strong>, submit it for <strong>Accounts payment clearance</strong>, and then transfer any injection room items to the <strong>Indirect Cart</strong> before dispensing.
                    </div>
                  </div>

                  {/* General Discharge Management Notes */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-emerald-950 mb-1">
                      General Discharge Management, Wound Care & Home Advice
                    </label>
                    <textarea
                      rows={3}
                      value={dischargeManagementNotes}
                      onChange={(e) => setDischargeManagementNotes(e.target.value)}
                      placeholder="e.g. Daily wound dressing changes, keep area dry & clean, high protein and vitamin C diet, avoid heavy lifting for 2 weeks..."
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs text-slate-900 leading-relaxed focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveFormTab('clinical')}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Back to Clinical Features
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveFormTab('followup')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Proceed to Follow-Up & Finalize
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: FOLLOW-UP & DISCHARGE CONDITION */}
            {activeFormTab === 'followup' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                
                {/* DISCHARGE CONDITION / OUTCOME */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-900">
                    Patient Condition on Discharge *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {(
                      [
                        'Improved',
                        'Recovered / Cured',
                        'Stable',
                        'Discharged on Request (LAMA)',
                        'Referred / Transferred',
                        'Deceased'
                      ] as DischargeCondition[]
                    ).map(cond => (
                      <label
                        key={cond}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                          dischargeCondition === cond
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="dischargeCondition"
                          checked={dischargeCondition === cond}
                          onChange={() => setDischargeCondition(cond)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{cond}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* FOLLOW UP INSTRUCTIONS & SCHEDULE */}
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-700" />
                    <h4 className="text-xs font-bold text-amber-950">
                      Follow-Up Schedule & Review Instructions *
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-800">
                          Follow-Up Review Date
                        </label>
                        <div className="flex gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => applyFollowUpDays(3)}
                            className="text-amber-800 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded font-semibold cursor-pointer"
                          >
                            +3 Days
                          </button>
                          <button
                            type="button"
                            onClick={() => applyFollowUpDays(7)}
                            className="text-amber-800 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded font-semibold cursor-pointer"
                          >
                            +1 Wk
                          </button>
                          <button
                            type="button"
                            onClick={() => applyFollowUpDays(14)}
                            className="text-amber-800 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded font-semibold cursor-pointer"
                          >
                            +2 Wks
                          </button>
                        </div>
                      </div>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Review Clinic / Attending Doctor
                      </label>
                      <input
                        type="text"
                        value={followUpClinicOrDoctor}
                        onChange={(e) => setFollowUpClinicOrDoctor(e.target.value)}
                        placeholder="e.g. Surgical SOPD / Dr. Consultant"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Patient Follow-Up Instructions & Emergency Warning Signs *
                    </label>
                    <textarea
                      rows={4}
                      value={followUpInstructions}
                      onChange={(e) => setFollowUpInstructions(e.target.value)}
                      required
                      placeholder="Specify review requirements, signs needing urgent medical attention, emergency red-flags..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-sans text-slate-900 leading-relaxed focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveFormTab('management')}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Back to Management
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-colors"
                    >
                      {isSaving ? (
                        <>Saving & Routing to Pharmacy...</>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {existingSummary ? 'Update Discharge Summary & Sync Pharmacy Rx' : 'Save Discharge Form & Send Rx to Pharmacy'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>
              Saving will mark patient as discharged, release bed availability, route take-home medications to Pharmacy, and archive record for future searching.
            </span>
          </div>

          {existingSummary && (
            <div className="flex items-center gap-3">
              {existingSummary.changeHistory && existingSummary.changeHistory.length > 0 && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <History className="w-3.5 h-3.5 text-amber-600" />
                  <span>{existingSummary.changeHistory.length} revision{existingSummary.changeHistory.length > 1 ? 's' : ''} logged</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsViewFileOpen(true)}
                className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-semibold cursor-pointer text-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                View File
              </button>
              {onPrintPreview && (
                <button
                  type="button"
                  onClick={() => onPrintPreview(getDischargeSummaryForPrint())}
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print File
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* View Discharge File Modal */}
      {isViewFileOpen && (
        <ViewDischargeFileModal
          isOpen={isViewFileOpen}
          onClose={() => setIsViewFileOpen(false)}
          dischargeSummary={savedSuccessSummary || existingSummary || null}
          onPrint={(ds) => {
            if (onPrintPreview) onPrintPreview(ds);
          }}
        />
      )}
    </div>
  );
};
