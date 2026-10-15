import React, { useState, useEffect, useMemo } from 'react';
import {
  Ambulance,
  X,
  Printer,
  FileCheck,
  Building2,
  HeartPulse,
  AlertTriangle,
  Stethoscope,
  Activity,
  ShieldCheck,
  User,
  Clock,
  Sparkles,
  ChevronRight,
  Download,
  Info
} from 'lucide-react';
import { Patient, PatientReferral, ReferralUrgency, PatientVitals } from '../../../types';
import { useClinic } from '../../../context/ClinicContext';
import { ViewReferralFileModal } from '../../common/ViewReferralFileModal';
import { exportReferralToPdf } from '../../../utils/referralPdfExport';

interface ReferralPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  existingReferral?: PatientReferral | null;
  onReferralSaved?: (referral: PatientReferral) => void;
  onPrintPreview?: (referral: PatientReferral) => void;
}

const COMMON_DESTINATIONS = [
  'Mulago National Referral Hospital',
  'Nakasero Hospital Specialist Centre',
  'St. Francis Hospital Nsambya',
  'Uganda Heart Institute (UHI)',
  'Uganda Cancer Institute (UCI)',
  'Kampala Hospital',
  'Case Medical Centre'
];

const COMMON_REASONS = [
  'Requires tertiary ICU ventilator admission & intensivist management',
  'Emergency neurosurgical evaluation and intervention',
  'Cardiothoracic surgical consultation and urgent catheterization',
  'Advanced neuro-imaging (High-resolution MRI) not locally available',
  'Acute renal failure requiring emergent hemodialysis',
  'Specialized pediatric surgical subspecialty care',
  'Complex polytrauma requiring multidisciplinary surgical team'
];

const CONDITION_PRESETS = [
  'Critical - Intubated & Mechanically Ventilated',
  'Unstable - Hemodynamically guarded, inotropic support',
  'Guarded - Oxygen-dependent (High flow mask)',
  'Fair - Hemodynamically stable on room air',
  'Stable - Ambulatory, conscious and alert'
];

export const ReferralPatientModal: React.FC<ReferralPatientModalProps> = ({
  isOpen,
  onClose,
  patient,
  existingReferral,
  onReferralSaved
}) => {
  const {
    currentUser,
    users,
    activeClinic,
    currentClinicEncounters,
    currentClinicTreatmentCharts,
    currentClinicTestOrders,
    currentClinicRadiologyOrders,
    saveReferral,
    getReferralForPatient
  } = useClinic();

  const doctorsList = useMemo(() => {
    return users.filter(u => u.role === 'doctor');
  }, [users]);

  // Essential User-Prompted Fields
  const [destinationHospital, setDestinationHospital] = useState<string>('');
  const [destinationDepartment, setDestinationDepartment] = useState<string>('Accident & Emergency / ICU');
  const [destinationDoctorOrContact, setDestinationDoctorOrContact] = useState<string>('');
  const [reasonForReferral, setReasonForReferral] = useState<string>('');
  const [conditionBeforeReferral, setConditionBeforeReferral] = useState<string>('Fair - Hemodynamically stable on room air');
  const [urgency, setUrgency] = useState<ReferralUrgency>('urgent');
  const [transportMode, setTransportMode] = useState<string>('Ambulance (Advanced Life Support)');
  const [accompanyingStaff, setAccompanyingStaff] = useState<string>('Critical Care Nurse & Paramedic');
  const [specialPrecautions, setSpecialPrecautions] = useState<string>('Maintain continuous oxygen saturation & vital signs monitoring');

  // Auto-Filled Mandatory Medical Fields
  const [referringDoctorId, setReferringDoctorId] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [secondaryDiagnoses, setSecondaryDiagnoses] = useState<string>('');
  const [clinicalSummary, setClinicalSummary] = useState<string>('');
  const [treatmentsGiven, setTreatmentsGiven] = useState<string>('');
  const [investigationsSummary, setInvestigationsSummary] = useState<string[]>([]);
  const [vitalsAtReferral, setVitalsAtReferral] = useState<PatientVitals>({});

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [viewingReferral, setViewingReferral] = useState<PatientReferral | null>(null);

  // Auto-fill logic on modal open or patient selection
  useEffect(() => {
    if (!isOpen || !patient) {
      setValidationError('');
      setViewingReferral(null);
      return;
    }

    const currentReferral = existingReferral || getReferralForPatient(patient.id);

    if (currentReferral) {
      // Load existing saved referral for editing
      setDestinationHospital(currentReferral.destinationHospital || '');
      setDestinationDepartment(currentReferral.destinationDepartment || 'Accident & Emergency / ICU');
      setDestinationDoctorOrContact(currentReferral.destinationDoctorOrContact || '');
      setReasonForReferral(currentReferral.reasonForReferral || '');
      setConditionBeforeReferral(currentReferral.conditionBeforeReferral || 'Fair - Hemodynamically stable on room air');
      setUrgency(currentReferral.urgency || 'urgent');
      setTransportMode(currentReferral.transportMode || 'Ambulance (Advanced Life Support)');
      setAccompanyingStaff(currentReferral.accompanyingStaff || 'Critical Care Nurse & Paramedic');
      setSpecialPrecautions(currentReferral.specialPrecautions || '');

      setReferringDoctorId(currentReferral.referringDoctorId || currentUser.id);
      setDiagnosis(currentReferral.diagnosis || '');
      setSecondaryDiagnoses(currentReferral.secondaryDiagnoses || '');
      setClinicalSummary(currentReferral.clinicalSummary || '');
      setTreatmentsGiven(currentReferral.treatmentsGiven || '');
      setInvestigationsSummary(currentReferral.investigationsSummary || []);
      setVitalsAtReferral(currentReferral.vitalsAtReferral || {});
      return;
    }

    // New Referral: AUTO-FILL mandatory clinical data from system
    const defaultDoctorId = (currentUser.role === 'doctor' ? currentUser.id : doctorsList[0]?.id) || currentUser.id;
    setReferringDoctorId(defaultDoctorId);

    // 1. Auto-fill Diagnosis and Clinical Summary from patient's encounters
    const patientEncounters = currentClinicEncounters
      .filter(e => e.patientId === patient.id)
      .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());

    const latestEncounter = patientEncounters[patientEncounters.length - 1];
    const earliestEncounter = patientEncounters[0];

    const detectedDiagnosis =
      latestEncounter?.workingDiagnosis ||
      earliestEncounter?.workingDiagnosis ||
      patient.initialComplaint ||
      'Acute Inpatient Medical Condition';
    setDiagnosis(detectedDiagnosis);

    const historyNotes = latestEncounter?.historyOfPresentIllness || earliestEncounter?.historyOfPresentIllness || '';
    const complaintText = earliestEncounter?.chiefComplaint || patient.initialComplaint || 'Acute presentation requiring admission';

    const generatedSummary = `Patient admitted on ${new Date(patient.admissionDate || patient.registeredAt || new Date().toISOString()).toLocaleDateString()} to ${patient.ward || 'Inpatient Ward'}${patient.bedNumber ? ` (Bed ${patient.bedNumber})` : ''} presenting with: ${complaintText}. ${historyNotes ? `\nClinical Notes: ${historyNotes}` : ''}\nManaged under inpatient protocols. Tertiary evaluation recommended for advanced management.`;
    setClinicalSummary(generatedSummary);

    // 2. Auto-fill Vitals from patient record
    const patientVitals: PatientVitals = {
      bloodPressure: patient.vitals?.bloodPressure || '125/82',
      pulseRate: patient.vitals?.pulseRate || 78,
      temperature: patient.vitals?.temperature || 37.0,
      respiratoryRate: patient.vitals?.respiratoryRate || 18,
      spO2: patient.vitals?.spO2 || 97,
      bloodGlucose: patient.vitals?.bloodGlucose || '5.8'
    };
    setVitalsAtReferral(patientVitals);

    // 3. Auto-fill Inpatient Treatments Given from Treatment Charts
    const chart = currentClinicTreatmentCharts.find(tc => tc.patientId === patient.id);
    let autoTreatments = '';
    if (chart && chart.items.length > 0) {
      const medList = chart.items.map(item => `• ${item.medicationOrItemName} ${item.dosage} ${item.route} (${item.frequency})`).join('\n');
      autoTreatments = `Inpatient Medications Administered:\n${medList}\nIV Fluid hydration and routine nursing monitoring provided.`;
    } else {
      autoTreatments = 'Inpatient medical stabilization, continuous vital signs monitoring, and supportive nursing care provided.';
    }
    setTreatmentsGiven(autoTreatments);

    // 4. Auto-fill Diagnostic Tests and Radiology Orders
    const compiledInvestigations: string[] = [];
    const patientLabs = currentClinicTestOrders.filter(t => t.patientId === patient.id);
    patientLabs.forEach(lab => {
      let line = `Lab: ${lab.testName} - Status: ${lab.status.toUpperCase()}`;
      if (lab.results && lab.results.length > 0) {
        const resSnippet = lab.results.slice(0, 3).map(r => `${r.parameter}: ${r.value} ${r.unit}`).join(', ');
        line += ` [${resSnippet}]`;
      }
      compiledInvestigations.push(line);
    });

    const patientScans = currentClinicRadiologyOrders.filter(r => r.patientId === patient.id);
    patientScans.forEach(scan => {
      let line = `Imaging: ${scan.modality} - ${scan.procedureName} - Status: ${scan.status.toUpperCase()}`;
      if (scan.findings) line += ` [Findings: ${scan.findings.slice(0, 60)}...]`;
      else if (scan.impression) line += ` [Impression: ${scan.impression.slice(0, 60)}...]`;
      compiledInvestigations.push(line);
    });

    if (compiledInvestigations.length === 0) {
      compiledInvestigations.push('Bedside glucose, pulse oximetry, and vital signs monitoring conducted.');
    }
    setInvestigationsSummary(compiledInvestigations);

    // Reset user prompted fields if new
    setDestinationHospital('');
    setDestinationDepartment('Accident & Emergency / ICU');
    setDestinationDoctorOrContact('');
    setReasonForReferral('');
    setConditionBeforeReferral('Fair - Hemodynamically stable on room air');
    setUrgency('urgent');
    setTransportMode('Ambulance (Advanced Life Support)');
    setAccompanyingStaff('Critical Care Nurse & Paramedic');
    setSpecialPrecautions('Maintain continuous oxygen saturation & vital signs monitoring');
  }, [isOpen, patient, existingReferral]);

  if (!isOpen || !patient) return null;

  const currentDoctor = doctorsList.find(d => d.id === referringDoctorId) || currentUser;

  const handleSave = (andPrintOrPdf: boolean = false): PatientReferral | null => {
    if (!destinationHospital.trim()) {
      setValidationError('Please specify the Destination Hospital for this referral.');
      return null;
    }
    if (!conditionBeforeReferral.trim()) {
      setValidationError('Please specify the Patient Condition Before Referral.');
      return null;
    }
    if (!reasonForReferral.trim()) {
      setValidationError('Please specify the Reason for Referral.');
      return null;
    }

    setValidationError('');
    setIsSaving(true);

    try {
      const referralPayload: Omit<PatientReferral, 'id' | 'createdAt'> & { id?: string } = {
        id: existingReferral?.id,
        clinicId: activeClinic.id,
        patientId: patient.id,
        patientName: (patient as any).name || `${patient.firstName} ${patient.lastName}`.trim(),
        patientMrn: patient.mrn,
        patientAge: patient.age,
        patientGender: patient.gender,
        patientDob: patient.dob,
        ward: patient.ward || 'Inpatient Ward',
        bedNumber: patient.bedNumber,
        admissionDate: patient.admissionDate || patient.registeredAt || new Date().toISOString(),
        referralDate: new Date().toISOString(),
        referringFacilityName: activeClinic.name,
        referringFacilityCode: activeClinic.id.toUpperCase().slice(0, 6),
        referringFacilityAddress: activeClinic.address,
        referringFacilityPhone: activeClinic.phone,
        referringFacilityEmail: activeClinic.email,
        referringDoctorId: referringDoctorId || currentUser.id,
        referringDoctorName: currentDoctor.name,
        referringDoctorRole: currentDoctor.role,
        destinationHospital: destinationHospital.trim(),
        destinationDepartment: destinationDepartment.trim() || undefined,
        destinationDoctorOrContact: destinationDoctorOrContact.trim() || undefined,
        reasonForReferral: reasonForReferral.trim(),
        conditionBeforeReferral: conditionBeforeReferral.trim(),
        urgency,
        diagnosis: diagnosis.trim() || 'Acute Condition Requiring Referral',
        secondaryDiagnoses: secondaryDiagnoses.trim() || undefined,
        clinicalSummary: clinicalSummary.trim(),
        investigationsSummary,
        treatmentsGiven: treatmentsGiven.trim(),
        knownAllergies: patient.allergies || [],
        specialPrecautions: specialPrecautions.trim() || undefined,
        vitalsAtReferral,
        handoverVitalsRecordedAt: new Date().toISOString(),
        transportMode: transportMode.trim(),
        accompanyingStaff: accompanyingStaff.trim(),
        emergencyContactName: patient.emergencyContactName,
        emergencyContactPhone: patient.emergencyContactPhone,
        status: 'completed'
      };

      const saved = saveReferral(referralPayload);
      if (onReferralSaved) {
        onReferralSaved(saved);
      }

      if (andPrintOrPdf) {
        setViewingReferral(saved);
      } else {
        onClose();
      }
      return saved;
    } catch (err) {
      console.error('Failed to save patient referral:', err);
      setValidationError('Failed to save referral file. Please try again.');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in cursor-pointer"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden my-auto cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Ambulance className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base tracking-tight text-white">
                    {existingReferral ? 'Edit Inpatient Referral Dossier' : 'Refer Inpatient Patient (IPD Referral Form)'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase">
                    Transfer
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Patient: <strong className="text-white">{patient.name || `${patient.firstName} ${patient.lastName}`}</strong> &bull; MRN: <span className="font-mono text-indigo-200">{patient.mrn}</span> &bull; {patient.ward || 'Inpatient Ward'}{patient.bedNumber ? ` (Bed ${patient.bedNumber})` : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Validation Alert */}
          {validationError && (
            <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 px-6">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Form Scrollable Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
            {/* 1. PRIMARY PROMPTED ESSENTIAL FIELDS (Highlighted Section) */}
            <div className="bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/50 rounded-xl border-2 border-indigo-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                  <h4 className="font-bold text-indigo-950 text-sm tracking-tight uppercase">
                    Essential Referral Prompt Fields (Mandatory)
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Required by Receiving Hospital
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1.1 Destination Hospital */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Destination Hospital <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={destinationHospital}
                    onChange={(e) => setDestinationHospital(e.target.value)}
                    placeholder="e.g., Mulago National Referral Hospital"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    required
                  />
                  {/* Quick Select Buttons */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {COMMON_DESTINATIONS.slice(0, 4).map((dest) => (
                      <button
                        key={dest}
                        type="button"
                        onClick={() => setDestinationHospital(dest)}
                        className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded transition-colors cursor-pointer"
                      >
                        + {dest.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1.2 Destination Department / Contact */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Receiving Dept / Unit
                    </label>
                    <input
                      type="text"
                      value={destinationDepartment}
                      onChange={(e) => setDestinationDepartment(e.target.value)}
                      placeholder="e.g., Accident & Emergency / ICU"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact / Admitting Officer
                    </label>
                    <input
                      type="text"
                      value={destinationDoctorOrContact}
                      onChange={(e) => setDestinationDoctorOrContact(e.target.value)}
                      placeholder="Doctor name or phone"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* 1.3 Condition Before Referral */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Condition Before Referral (At Handover) <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">Airway, hemodynamics, neurological status</span>
                  </div>
                  <input
                    type="text"
                    value={conditionBeforeReferral}
                    onChange={(e) => setConditionBeforeReferral(e.target.value)}
                    placeholder="e.g., Critical - Intubated / Fair - Stable with nasal prong O2"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    required
                  />
                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {CONDITION_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setConditionBeforeReferral(preset)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer ${
                          conditionBeforeReferral === preset
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                        }`}
                      >
                        {preset.split(' - ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1.4 Reason for Referral */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Reason for Referral <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={reasonForReferral}
                    onChange={(e) => setReasonForReferral(e.target.value)}
                    placeholder="Specify exact medical rationale, needed interventions, or specialized diagnostic equipment..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-medium"
                    required
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {COMMON_REASONS.slice(0, 3).map((r, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReasonForReferral(r)}
                        className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded transition-colors cursor-pointer"
                      >
                        + {r.slice(0, 35)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1.5 Urgency, Transport & Escort */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Referral Urgency Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setUrgency('emergency')}
                      className={`py-1.5 text-xs font-bold rounded-lg border uppercase transition-colors cursor-pointer ${
                        urgency === 'emergency'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                      }`}
                    >
                      Emergency
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrgency('urgent')}
                      className={`py-1.5 text-xs font-bold rounded-lg border uppercase transition-colors cursor-pointer ${
                        urgency === 'urgent'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      Urgent
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrgency('routine')}
                      className={`py-1.5 text-xs font-bold rounded-lg border uppercase transition-colors cursor-pointer ${
                        urgency === 'routine'
                          ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Routine
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mode of Transport & Escort
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={transportMode}
                      onChange={(e) => setTransportMode(e.target.value)}
                      placeholder="e.g., ALS Ambulance"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={accompanyingStaff}
                      onChange={(e) => setAccompanyingStaff(e.target.value)}
                      placeholder="e.g., Nurse Escort"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. AUTO-FILLED CLINICAL VITALS AT REFERRAL (Auto-Captured) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Handover Vitals (Auto-Filled from Inpatient Records)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> System Auto-Populated
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">BP (mmHg)</label>
                  <input
                    type="text"
                    value={vitalsAtReferral.bloodPressure || ''}
                    onChange={(e) => setVitalsAtReferral(prev => ({ ...prev, bloodPressure: e.target.value }))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Pulse (bpm)</label>
                  <input
                    type="number"
                    value={vitalsAtReferral.pulseRate || ''}
                    onChange={(e) => setVitalsAtReferral(prev => ({ ...prev, pulseRate: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalsAtReferral.temperature || ''}
                    onChange={(e) => setVitalsAtReferral(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Resp (/min)</label>
                  <input
                    type="number"
                    value={vitalsAtReferral.respiratoryRate || ''}
                    onChange={(e) => setVitalsAtReferral(prev => ({ ...prev, respiratoryRate: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    value={vitalsAtReferral.spO2 || ''}
                    onChange={(e) => setVitalsAtReferral(prev => ({ ...prev, spO2: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Glucose (mmol/L)</label>
                  <input
                    type="text"
                    value={vitalsAtReferral.bloodGlucose || ''}
                    onChange={(e) => setVitalsAtReferral(prev => ({ ...prev, bloodGlucose: e.target.value }))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800 text-center"
                  />
                </div>
              </div>
            </div>

            {/* 3. AUTO-FILLED CLINICAL SUMMARY & DIAGNOSIS */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Working Diagnosis & Clinical Course (Auto-Captured)
                </h4>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Pre-filled from Patient Chart
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Working Diagnosis
                  </label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Secondary Diagnoses / Comorbidities
                  </label>
                  <input
                    type="text"
                    value={secondaryDiagnoses}
                    onChange={(e) => setSecondaryDiagnoses(e.target.value)}
                    placeholder="e.g., Hypertension, Type 2 Diabetes"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Summary & Inpatient Hospital Course
                </label>
                <textarea
                  rows={3}
                  value={clinicalSummary}
                  onChange={(e) => setClinicalSummary(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* 4. AUTO-FILLED INPATIENT MEDICATIONS & INVESTIGATIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Treatments Given (Auto-Captured)
                  </h4>
                  <span className="text-[10px] text-slate-400">MAR Chart</span>
                </div>
                <textarea
                  rows={4}
                  value={treatmentsGiven}
                  onChange={(e) => setTreatmentsGiven(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Diagnostic Labs & Scans (Auto-Captured)
                  </h4>
                  <span className="text-[10px] text-slate-400">{investigationsSummary.length} Records</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-28 overflow-y-auto space-y-1.5 text-xs">
                  {investigationsSummary.map((test, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-slate-700">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span>{test}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. ALLERGIES & PRECAUTIONS & SIGN-OFF */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Special Precautions During Transfer
                </label>
                <input
                  type="text"
                  value={specialPrecautions}
                  onChange={(e) => setSpecialPrecautions(e.target.value)}
                  placeholder="e.g., Continuous O2, spinal board, monitor airway"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Referring Medical Officer
                </label>
                <select
                  value={referringDoctorId}
                  onChange={(e) => setReferringDoctorId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  {doctorsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.name} ({doc.role})
                    </option>
                  ))}
                  {!doctorsList.some(d => d.id === currentUser.id) && (
                    <option value={currentUser.id}>
                      {currentUser.name} ({currentUser.role})
                    </option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Auto-captures facility, doctor, vitals & patient identifiers</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Save and directly open the printable form and PDF download"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Save & View / Print / PDF</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save & Finalize Referral'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Direct View / Print / PDF Export Modal on completion */}
      {viewingReferral && (
        <ViewReferralFileModal
          isOpen={Boolean(viewingReferral)}
          onClose={() => {
            setViewingReferral(null);
            onClose();
          }}
          referral={viewingReferral}
          onEdit={() => setViewingReferral(null)}
        />
      )}
    </>
  );
};
