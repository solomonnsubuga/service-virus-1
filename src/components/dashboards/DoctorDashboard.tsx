import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { recordFirestoreRead } from '../../services/developerTelemetry';
import { buildFiveThenTenPagination, GroupPaginationTopBar, GroupPaginationBottomBar } from '../../utils/groupPagination';
import { Patient, PrescriptionItem, TestOrder, RadiologyOrder, AvailableTest, DischargeSummary, ClinicalAttachment } from '../../types';
import {
  Stethoscope,
  Pill,
  Microscope,
  Film,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Activity,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Building2,
  Sparkles,
  BedDouble,
  Edit3,
  Scale,
  HeartPulse,
  Thermometer,
  ShieldCheck,
  Users,
  Check,
  Layers,
  Tag,
  X,
  FlaskConical,
  Scan,
  ListChecks,
  PlusCircle,
  Filter,
  Scissors,
  History,
  DoorOpen,
  LogOut,
  Eye,
  Ambulance,
  HeartCrack,
  RotateCcw,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Paperclip,
  Download,
  Cloud
} from 'lucide-react';
import { PrintReceiptModal } from '../common/PrintReceiptModal';
import { ClinicalAttachmentModal } from '../common/ClinicalAttachmentModal';
import { EditPatientModal } from '../common/EditPatientModal';
import { EditAnthropometryModal } from '../common/EditAnthropometryModal';
import { PatientMovementHistoryModal } from '../common/PatientMovementHistoryModal';
import { ManageLocationsModal } from '../common/ManageLocationsModal';
import { ClinicalWorkupCard } from './doctor/ClinicalWorkupCard';
import { ProceduresManager } from './doctor/ProceduresManager';
import { ProcedureInventoryManager } from './doctor/ProcedureInventoryManager';
import { DischargePatientModal } from './nursing/DischargePatientModal';
import { ViewDischargeFileModal } from '../common/ViewDischargeFileModal';
import { ReferralPatientModal } from './nursing/ReferralPatientModal';
import { ViewReferralFileModal } from '../common/ViewReferralFileModal';
import { formatPatientAge, getAgeInYears } from '../../utils/ageUtils';
import { ReportDeceasedModal } from './nursing/ReportDeceasedModal';
import { ViewDeathCertificateModal } from '../common/ViewDeathCertificateModal';

interface SelectedLabTestItem {
  id: string;
  testName: string;
  testCode: string;
  category: TestOrder['category'];
  cost: number;
  baseCost?: number;
  isInsurancePrice?: boolean;
  insurancePolicyName?: string;
  sampleType?: string;
  turnaroundTime?: string;
  isCustom?: boolean;
}

interface SelectedRadiologyItem {
  id: string;
  procedureName: string;
  procedureCode: string;
  modality: RadiologyOrder['modality'];
  bodyPart: string;
  cost: number;
  baseCost?: number;
  isInsurancePrice?: boolean;
  insurancePolicyName?: string;
  contrastRequired?: boolean;
  isCustom?: boolean;
}

export const DoctorDashboard: React.FC = () => {
  const {
    activeClinic,
    currentUser,
    currentClinicPatients,
    currentClinicDepartments,
    currentClinicWards,
    currentClinicInventory,
    createPrescription,
    updatePrescription,
    createTestOrder,
    createRadiologyOrder,
    saveEncounter,
    updateEncounter,
    deleteEncounter,
    currentClinicEncounters,
    currentClinicProcedures,
    saveProcedure,
    updateProcedure,
    deleteProcedure,
    currentClinicPrescriptions,
    currentClinicTestOrders,
    currentClinicRadiologyOrders,
    currentClinicAvailableTests,
    getTestPrice,
    getPatientLedger,
    currentClinicDischargeSummaries,
    currentClinicReferrals,
    currentClinicDeathCertificates,
    getDeathCertificateForPatient
  } = useClinic();

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    currentClinicPatients.length > 0 ? currentClinicPatients[0].id : ''
  );

  const [activeTab, setActiveTab] = useState<'consultation' | 'workup' | 'procedures' | 'pathology' | 'radiology' | 'history'>('consultation');
  const [editingEncounterId, setEditingEncounterId] = useState<string | null>(null);
  const [editReasonNote, setEditReasonNote] = useState<string>('');
  const [expandedEncounterHistoryId, setExpandedEncounterHistoryId] = useState<string | null>(null);

  // Modals state
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [isEditVitalsOpen, setIsEditVitalsOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isLocationsModalOpen, setIsLocationsModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [isViewDischargeFileOpen, setIsViewDischargeFileOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isViewReferralFileOpen, setIsViewReferralFileOpen] = useState(false);
  const [isReportDeceasedModalOpen, setIsReportDeceasedModalOpen] = useState(false);
  const [isViewDeathCertModalOpen, setIsViewDeathCertModalOpen] = useState(false);
  const [queueSearchTerm, setQueueSearchTerm] = useState('');
  const [queueSortKey, setQueueSortKey] = useState<'date' | 'name' | 'mrn' | 'age'>('date');
  const [queueSortOrder, setQueueSortOrder] = useState<'asc' | 'desc'>('desc');
  const [queueTypeFilter, setQueueTypeFilter] = useState<'all' | 'OPD' | 'IPD' | 'revisit'>('all');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>('all');
  const [selectedBedFilter, setSelectedBedFilter] = useState<string>('all');

  // Read-Optimized Pagination States (Initial 5 items on page 0, then groups of 10)
  const [queuePage, setQueuePage] = useState<number>(0);
  const [labCatalogPage, setLabCatalogPage] = useState<number>(0);
  const [radCatalogPage, setRadCatalogPage] = useState<number>(0);
  const [visitsHistoryPage, setVisitsHistoryPage] = useState<number>(0);
  const [encountersHistoryPage, setEncountersHistoryPage] = useState<number>(0);
  const [prescriptionsHistoryPage, setPrescriptionsHistoryPage] = useState<number>(0);
  const [labResultsHistoryPage, setLabResultsHistoryPage] = useState<number>(0);
  const [radResultsHistoryPage, setRadResultsHistoryPage] = useState<number>(0);

  // Track which pagination groups have already triggered Firestore reads in this session
  const fetchedReadGroupsRef = useRef<Set<string>>(new Set());

  // Collapsible UI state
  const [isPatientDetailsCollapsed, setIsPatientDetailsCollapsed] = useState(false);
  const [expandedLabResultId, setExpandedLabResultId] = useState<string | null>(null);
  const [expandedRadResultId, setExpandedRadResultId] = useState<string | null>(null);

  // Viewing Clinical Attachment Modal (Lab & Radiology Documents saved in Prime Admin Cloud)
  const [viewingAttachment, setViewingAttachment] = useState<{
    attachment: ClinicalAttachment;
    patientName?: string;
    orderTitle?: string;
  } | null>(null);

  // In-Consultation Diagnostic Review Drawer / Card State
  const [showConsultationDiagnostics, setShowConsultationDiagnostics] = useState(true);
  const [consultationDiagFilter, setConsultationDiagFilter] = useState<'all' | 'attachments' | 'pathology' | 'radiology'>('all');

  // Print modal state
  const [printModal, setPrintModal] = useState<{
    isOpen: boolean;
    type: 'receipt' | 'prescription' | 'lab_report' | 'radiology_report' | 'ledger' | 'workup' | 'procedure' | 'case_file' | 'discharge_summary' | 'referral_form' | 'death_certificate';
    data: any;
  }>({
    isOpen: false,
    type: 'prescription',
    data: null
  });

  // Clinical Consultation State
  const [encounterForm, setEncounterForm] = useState({
    chiefComplaint: '',
    historyOfPresentIllness: '',
    vitals: {
      bloodPressure: '120/80',
      pulseRate: 72,
      temperature: 36.8,
      respiratoryRate: 16,
      weightKg: 70,
      heightCm: 170,
      spO2: 99
    },
    physicalExamNotes: '',
    generalExam: '',
    systemicExam: '',
    workingDiagnosis: '',
    differentialDiagnosis: '',
    clinicalPlan: '',
    followUpDate: ''
  });

  // Available tests from clinic catalog
  const availablePathologyTests = currentClinicAvailableTests.filter(t => t.department === 'pathology' && t.isActive);
  const availableRadiologyScans = currentClinicAvailableTests.filter(t => t.department === 'radiology' && t.isActive);

  // Pathology Multi-Select Order State
  const [selectedLabTests, setSelectedLabTests] = useState<SelectedLabTestItem[]>([]);
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [labCategoryFilter, setLabCategoryFilter] = useState<string>('ALL');
  const [labPriority, setLabPriority] = useState<TestOrder['priority']>('Routine');
  const [labClinicalIndication, setLabClinicalIndication] = useState('');
  const [showCustomLabForm, setShowCustomLabForm] = useState(false);
  const [customLabForm, setCustomLabForm] = useState({
    name: '',
    code: '',
    category: 'Hematology' as TestOrder['category'],
    cost: 30.00,
    sampleType: 'Whole Blood (EDTA)'
  });

  // Radiology Multi-Select Order State
  const [selectedRadScans, setSelectedRadScans] = useState<SelectedRadiologyItem[]>([]);
  const [radSearchQuery, setRadSearchQuery] = useState('');
  const [radModalityFilter, setRadModalityFilter] = useState<string>('ALL');
  const [radPriority, setRadPriority] = useState<RadiologyOrder['priority']>('Routine');
  const [radClinicalHistory, setRadClinicalHistory] = useState('');
  const [radContrastRequired, setRadContrastRequired] = useState(false);
  const [showCustomRadForm, setShowCustomRadForm] = useState(false);
  const [customRadForm, setCustomRadForm] = useState({
    name: '',
    code: '',
    modality: 'X-Ray' as RadiologyOrder['modality'],
    bodyPart: 'Chest / Thorax',
    cost: 65.00
  });

  // Pathology Preset Bundles
  const LAB_BUNDLES = [
    {
      id: 'full_blood',
      name: 'Full Blood & Infection Screen',
      desc: 'CBC + Malaria RDT + ESR',
      icon: '🩸',
      matchKeys: ['Complete Blood Count', 'CBC', 'Malaria', 'ESR', 'Erythrocyte']
    },
    {
      id: 'metabolic_renal',
      name: 'Metabolic & Renal Panel',
      desc: 'Creatinine + Urea/BUN + Blood Sugar + Electrolytes',
      icon: '🧪',
      matchKeys: ['Creatinine', 'Urea', 'Blood Sugar', 'Glucose', 'Electrolyte']
    },
    {
      id: 'liver_panel',
      name: 'Liver Function Panel (LFT)',
      desc: 'Total Bilirubin + SGOT/AST + SGPT/ALT + Albumin',
      icon: '🫁',
      matchKeys: ['Liver Function', 'LFT', 'Bilirubin', 'AST', 'ALT', 'Albumin']
    },
    {
      id: 'lipid_cardiac',
      name: 'Cardio & Lipid Profile',
      desc: 'Lipid Profile + Cardiac Enzymes',
      icon: '🫀',
      matchKeys: ['Lipid', 'Cholesterol', 'Troponin', 'Cardiac']
    },
    {
      id: 'urinalysis_renal',
      name: 'Urinalysis & Kidney Screen',
      desc: 'Urinalysis Dipstick + Urine Microscopy',
      icon: '💧',
      matchKeys: ['Urinalysis', 'Urine', 'Microscopy']
    },
    {
      id: 'antenatal',
      name: 'Antenatal Screening Panel',
      desc: 'CBC + Blood Group/Rh + Syphilis + HIV + Hep B',
      icon: '🤰',
      matchKeys: ['Complete Blood Count', 'CBC', 'Blood Group', 'Syphilis', 'VDRL', 'HIV', 'Hepatitis']
    }
  ];

  // Radiology Preset Bundles
  const RAD_BUNDLES = [
    {
      id: 'cardiopulmonary',
      name: 'Cardiopulmonary Survey',
      desc: 'Chest X-Ray PA View + Lateral',
      icon: '🩻',
      matchKeys: ['Chest X-Ray', 'PA View', 'Lateral', 'Chest']
    },
    {
      id: 'abdo_pelvic',
      name: 'Abdominal & Pelvic Assessment',
      desc: 'Abdominal Ultrasound + Pelvic Ultrasound',
      icon: '🩺',
      matchKeys: ['Abdominal Ultrasound', 'Pelvic Ultrasound', 'Abdomen', 'Pelvis']
    },
    {
      id: 'spine_trauma',
      name: 'Spine & Trauma Series',
      desc: 'Cervical Spine X-Ray + Lumbar Spine X-Ray + Pelvis',
      icon: '🦴',
      matchKeys: ['Cervical Spine', 'Lumbar Spine', 'Spine', 'Pelvis']
    },
    {
      id: 'neuro_imaging',
      name: 'Neurological Workup',
      desc: 'Brain CT Scan / MRI Brain',
      icon: '🧠',
      matchKeys: ['Brain', 'Head', 'Cranial']
    },
    {
      id: 'msk_extremity',
      name: 'Musculoskeletal Survey',
      desc: 'Knee X-Ray + Shoulder/Ankle X-Ray',
      icon: '🦵',
      matchKeys: ['Knee', 'Ankle', 'Shoulder', 'Extremity']
    }
  ];

  // Pathology Multi-Select Helpers
  const toggleLabTest = (test: AvailableTest) => {
    setSelectedLabTests(prev => {
      const exists = prev.some(t => t.id === test.id);
      if (exists) {
        return prev.filter(t => t.id !== test.id);
      } else {
        const policy = selectedPatient?.insurancePolicyName || selectedPatient?.insuranceProvider;
        const effectiveCost = getTestPrice(test, policy);
        const isInsurance = Boolean(policy && effectiveCost !== test.price);

        return [
          ...prev,
          {
            id: test.id,
            testName: test.name,
            testCode: test.code,
            category: test.category as TestOrder['category'],
            cost: effectiveCost,
            baseCost: test.price,
            isInsurancePrice: isInsurance,
            insurancePolicyName: isInsurance ? policy : undefined,
            sampleType: test.sampleOrBodyPart,
            turnaroundTime: test.turnaroundTime
          }
        ];
      }
    });
  };

  const isLabTestSelected = (testId: string) => {
    return selectedLabTests.some(t => t.id === testId);
  };

  const applyLabBundle = (bundle: typeof LAB_BUNDLES[0]) => {
    const matching = availablePathologyTests.filter(t => 
      bundle.matchKeys.some(k => 
        t.name.toLowerCase().includes(k.toLowerCase()) || 
        t.code.toLowerCase().includes(k.toLowerCase()) ||
        t.category.toLowerCase().includes(k.toLowerCase())
      )
    );

    if (matching.length === 0) {
      alert(`No active tests matching "${bundle.name}" were found in the clinic catalog.`);
      return;
    }

    const policy = selectedPatient?.insurancePolicyName || selectedPatient?.insuranceProvider;

    setSelectedLabTests(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const toAdd: SelectedLabTestItem[] = [];

      matching.forEach(t => {
        if (!existingIds.has(t.id)) {
          const effectiveCost = getTestPrice(t, policy);
          const isInsurance = Boolean(policy && effectiveCost !== t.price);

          toAdd.push({
            id: t.id,
            testName: t.name,
            testCode: t.code,
            category: t.category as TestOrder['category'],
            cost: effectiveCost,
            baseCost: t.price,
            isInsurancePrice: isInsurance,
            insurancePolicyName: isInsurance ? policy : undefined,
            sampleType: t.sampleOrBodyPart,
            turnaroundTime: t.turnaroundTime
          });
        }
      });

      if (toAdd.length === 0) {
        // If all already selected, remove them as a toggle
        const matchingIds = new Set(matching.map(m => m.id));
        return prev.filter(p => !matchingIds.has(p.id));
      }

      return [...prev, ...toAdd];
    });
  };

  const handleAddCustomLabTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLabForm.name.trim()) return;

    const customId = `custom-lab-${Date.now()}`;
    const code = customLabForm.code.trim() || `LAB-CUS-${Date.now().toString().slice(-4)}`;

    setSelectedLabTests(prev => [
      ...prev,
      {
        id: customId,
        testName: customLabForm.name.trim(),
        testCode: code,
        category: customLabForm.category,
        cost: Number(customLabForm.cost) || 25.00,
        sampleType: customLabForm.sampleType.trim() || 'Specimen Sample',
        turnaroundTime: 'Same Day',
        isCustom: true
      }
    ]);

    setCustomLabForm({
      name: '',
      code: '',
      category: 'Hematology',
      cost: 30.00,
      sampleType: 'Whole Blood (EDTA)'
    });
    setShowCustomLabForm(false);
  };

  const removeLabTest = (id: string) => {
    setSelectedLabTests(prev => prev.filter(t => t.id !== id));
  };

  const clearAllLabTests = () => {
    setSelectedLabTests([]);
  };

  // Radiology Multi-Select Helpers
  const toggleRadScan = (scan: AvailableTest) => {
    setSelectedRadScans(prev => {
      const exists = prev.some(s => s.id === scan.id);
      if (exists) {
        return prev.filter(s => s.id !== scan.id);
      } else {
        const policy = selectedPatient?.insurancePolicyName || selectedPatient?.insuranceProvider;
        const effectiveCost = getTestPrice(scan, policy);
        const isInsurance = Boolean(policy && effectiveCost !== scan.price);
        const modality = (scan.category === 'CT Scan' ? 'CT Scan' : scan.category === 'Ultrasound' ? 'Ultrasound' : scan.category === 'MRI' ? 'MRI' : 'X-Ray') as RadiologyOrder['modality'];
        return [
          ...prev,
          {
            id: scan.id,
            procedureName: scan.name,
            procedureCode: scan.code,
            modality,
            bodyPart: scan.sampleOrBodyPart || 'General',
            cost: effectiveCost,
            baseCost: scan.price,
            isInsurancePrice: isInsurance,
            insurancePolicyName: isInsurance ? policy : undefined,
            contrastRequired: radContrastRequired
          }
        ];
      }
    });
  };

  const isRadScanSelected = (scanId: string) => {
    return selectedRadScans.some(s => s.id === scanId);
  };

  const applyRadBundle = (bundle: typeof RAD_BUNDLES[0]) => {
    const matching = availableRadiologyScans.filter(s => 
      bundle.matchKeys.some(k => 
        s.name.toLowerCase().includes(k.toLowerCase()) || 
        s.code.toLowerCase().includes(k.toLowerCase()) ||
        s.category.toLowerCase().includes(k.toLowerCase()) ||
        (s.sampleOrBodyPart && s.sampleOrBodyPart.toLowerCase().includes(k.toLowerCase()))
      )
    );

    if (matching.length === 0) {
      alert(`No active procedures matching "${bundle.name}" were found in the clinic catalog.`);
      return;
    }

    const policy = selectedPatient?.insurancePolicyName || selectedPatient?.insuranceProvider;

    setSelectedRadScans(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      const toAdd: SelectedRadiologyItem[] = [];

      matching.forEach(s => {
        if (!existingIds.has(s.id)) {
          const effectiveCost = getTestPrice(s, policy);
          const isInsurance = Boolean(policy && effectiveCost !== s.price);
          const modality = (s.category === 'CT Scan' ? 'CT Scan' : s.category === 'Ultrasound' ? 'Ultrasound' : s.category === 'MRI' ? 'MRI' : 'X-Ray') as RadiologyOrder['modality'];
          toAdd.push({
            id: s.id,
            procedureName: s.name,
            procedureCode: s.code,
            modality,
            bodyPart: s.sampleOrBodyPart || 'General',
            cost: effectiveCost,
            baseCost: s.price,
            isInsurancePrice: isInsurance,
            insurancePolicyName: isInsurance ? policy : undefined,
            contrastRequired: radContrastRequired
          });
        }
      });

      if (toAdd.length === 0) {
        // If all already selected, toggle off
        const matchingIds = new Set(matching.map(m => m.id));
        return prev.filter(p => !matchingIds.has(p.id));
      }

      return [...prev, ...toAdd];
    });
  };

  const handleAddCustomRadScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRadForm.name.trim()) return;

    const customId = `custom-rad-${Date.now()}`;
    const code = customRadForm.code.trim() || `RAD-CUS-${Date.now().toString().slice(-4)}`;

    setSelectedRadScans(prev => [
      ...prev,
      {
        id: customId,
        procedureName: customRadForm.name.trim(),
        procedureCode: code,
        modality: customRadForm.modality,
        bodyPart: customRadForm.bodyPart.trim() || 'General Area',
        cost: Number(customRadForm.cost) || 60.00,
        contrastRequired: radContrastRequired,
        isCustom: true
      }
    ]);

    setCustomRadForm({
      name: '',
      code: '',
      modality: 'X-Ray',
      bodyPart: 'Chest / Thorax',
      cost: 65.00
    });
    setShowCustomRadForm(false);
  };

  const removeRadScan = (id: string) => {
    setSelectedRadScans(prev => prev.filter(s => s.id !== id));
  };

  const clearAllRadScans = () => {
    setSelectedRadScans([]);
  };

  const selectedPatient = currentClinicPatients.find(p => p.id === selectedPatientId) || currentClinicPatients[0] || null;
  const patientLedger = selectedPatient ? getPatientLedger(selectedPatient.id) : null;
  const patientEncounters = [...currentClinicEncounters]
    .filter(e => e.patientId === selectedPatient?.id)
    .sort((a, b) => new Date(b.createdAt || b.visitDate).getTime() - new Date(a.createdAt || a.visitDate).getTime());
  const patientProcedures = [...currentClinicProcedures]
    .filter(p => p.patientId === selectedPatient?.id)
    .sort((a, b) => new Date(b.performedAt || b.createdAt).getTime() - new Date(a.performedAt || a.createdAt).getTime());
  const patientPrescriptions = [...currentClinicPrescriptions]
    .filter(p => p.patientId === selectedPatient?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const patientTestOrders = [...currentClinicTestOrders]
    .filter(t => t.patientId === selectedPatient?.id)
    .sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime());
  const patientRadOrders = [...currentClinicRadiologyOrders]
    .filter(r => r.patientId === selectedPatient?.id)
    .sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime());
  const selectedPatientDischargeSummary = (currentClinicDischargeSummaries || []).find(
    ds => ds.patientId === selectedPatient?.id
  );
  const isSelectedPatientDischarged = selectedPatient?.currentStatus === 'discharged' || !!selectedPatientDischargeSummary;

  const selectedPatientReferral = (currentClinicReferrals || []).find(
    r => r.patientId === selectedPatient?.id
  );

  const selectedPatientDeathCert = (currentClinicDeathCertificates || []).find(
    d => d.patientId === selectedPatient?.id
  );
  const isSelectedPatientDeceased = selectedPatient?.currentStatus === 'deceased' || !!selectedPatientDeathCert;

  // Sync encounter form when selected patient or their vitals change (only if not currently in edit mode)
  useEffect(() => {
    if (selectedPatient && !editingEncounterId) {
      const v = selectedPatient.anthropometry || selectedPatient.vitals;
      if (v) {
        setEncounterForm(prev => ({
          ...prev,
          vitals: {
            bloodPressure: v.bloodPressure || '120/80',
            pulseRate: v.pulseRate !== undefined ? v.pulseRate : 72,
            temperature: v.temperature !== undefined ? v.temperature : 36.8,
            respiratoryRate: v.respiratoryRate !== undefined ? v.respiratoryRate : 16,
            weightKg: v.weightKg !== undefined ? v.weightKg : 70,
            heightCm: v.heightCm !== undefined ? v.heightCm : 170,
            spO2: v.spO2 !== undefined ? v.spO2 : 99
          }
        }));
      }
    }
  }, [selectedPatient?.id, selectedPatient?.vitals?.lastUpdated, selectedPatient?.anthropometry?.lastUpdated, editingEncounterId]);

  // Load a previously saved encounter into the consultation form for editing
  const handleLoadEncounterForEditing = (enc: any) => {
    setEditingEncounterId(enc.id);
    setEditReasonNote('');
    if (enc.patientId && enc.patientId !== selectedPatientId) {
      setSelectedPatientId(enc.patientId);
    }
    setEncounterForm({
      chiefComplaint: enc.chiefComplaint || '',
      historyOfPresentIllness: enc.historyOfPresentIllness || '',
      vitals: {
        bloodPressure: enc.vitals?.bloodPressure || '120/80',
        pulseRate: enc.vitals?.pulseRate !== undefined ? enc.vitals.pulseRate : 72,
        temperature: enc.vitals?.temperature !== undefined ? enc.vitals.temperature : 36.8,
        respiratoryRate: enc.vitals?.respiratoryRate !== undefined ? enc.vitals.respiratoryRate : 16,
        weightKg: enc.vitals?.weightKg !== undefined ? enc.vitals.weightKg : 70,
        heightCm: enc.vitals?.heightCm !== undefined ? enc.vitals.heightCm : 170,
        spO2: enc.vitals?.spO2 !== undefined ? enc.vitals.spO2 : 99
      },
      physicalExamNotes: enc.physicalExamNotes || '',
      generalExam: enc.generalExam || '',
      systemicExam: enc.systemicExam || '',
      workingDiagnosis: enc.workingDiagnosis || '',
      differentialDiagnosis: enc.differentialDiagnosis || '',
      clinicalPlan: enc.clinicalPlan || '',
      followUpDate: enc.followUpDate || ''
    });
    setActiveTab('consultation');
  };

  // Reset form to blank new consultation
  const handleResetEncounterForm = () => {
    setEditingEncounterId(null);
    setEditReasonNote('');
    const v = selectedPatient?.anthropometry || selectedPatient?.vitals;
    setEncounterForm({
      chiefComplaint: '',
      historyOfPresentIllness: '',
      vitals: {
        bloodPressure: v?.bloodPressure || '120/80',
        pulseRate: v?.pulseRate !== undefined ? v.pulseRate : 72,
        temperature: v?.temperature !== undefined ? v.temperature : 36.8,
        respiratoryRate: v?.respiratoryRate !== undefined ? v.respiratoryRate : 16,
        weightKg: v?.weightKg !== undefined ? v.weightKg : 70,
        heightCm: v?.heightCm !== undefined ? v.heightCm : 170,
        spO2: v?.spO2 !== undefined ? v.spO2 : 99
      },
      physicalExamNotes: '',
      generalExam: '',
      systemicExam: '',
      workingDiagnosis: '',
      differentialDiagnosis: '',
      clinicalPlan: '',
      followUpDate: ''
    });
  };

  const handleDeleteEncounter = (encId: string) => {
    if (window.confirm('Are you sure you want to delete this clinical encounter record? This action cannot be undone.')) {
      deleteEncounter(encId);
      if (editingEncounterId === encId) {
        handleResetEncounterForm();
      }
    }
  };

  // Helper to extract timestamp reliably for date sorting
  const getPatientTimestamp = (p: Patient): number => {
    const raw = p.registeredAt || (p as any).admissionDate || (p as any).createdAt || '';
    if (!raw) return 0;
    const time = new Date(raw).getTime();
    return isNaN(time) ? 0 : time;
  };

  // Base waiting queue in active clinic (all undischarged patients)
  const baseWaitingQueue = useMemo(() => {
    return currentClinicPatients.filter(p => p.currentStatus !== 'discharged');
  }, [currentClinicPatients]);

  // Unique list of available clinical departments
  const availableDepartments = useMemo(() => {
    const deptSet = new Set<string>();
    if (currentClinicDepartments && Array.isArray(currentClinicDepartments)) {
      currentClinicDepartments.forEach(d => {
        if (d.name) deptSet.add(d.name);
      });
    }
    baseWaitingQueue.forEach(p => {
      if (p.department) deptSet.add(p.department);
    });
    if (deptSet.size === 0 && baseWaitingQueue.length > 0) {
      deptSet.add('General Outpatient (OPD)');
    }
    return Array.from(deptSet).sort();
  }, [currentClinicDepartments, baseWaitingQueue]);

  // Unique list of available consultation rooms (reactive to selected department)
  const availableRooms = useMemo(() => {
    const roomSet = new Set<string>();
    if (selectedDepartmentFilter !== 'all') {
      const targetDept = currentClinicDepartments?.find(d => d.name === selectedDepartmentFilter);
      if (targetDept?.rooms) {
        targetDept.rooms.forEach(r => roomSet.add(r));
      }
      baseWaitingQueue
        .filter(p => (p.department || 'General Outpatient (OPD)') === selectedDepartmentFilter || p.department === selectedDepartmentFilter)
        .forEach(p => {
          if (p.doctorRoom) roomSet.add(p.doctorRoom);
        });
    } else {
      if (currentClinicDepartments && Array.isArray(currentClinicDepartments)) {
        currentClinicDepartments.forEach(d => {
          if (d.rooms) d.rooms.forEach(r => roomSet.add(r));
        });
      }
      baseWaitingQueue.forEach(p => {
        if (p.doctorRoom) roomSet.add(p.doctorRoom);
      });
    }
    return Array.from(roomSet).sort();
  }, [currentClinicDepartments, baseWaitingQueue, selectedDepartmentFilter]);

  // Unique list of available clinical wards
  const availableWards = useMemo(() => {
    const wardSet = new Set<string>();
    if (currentClinicWards && Array.isArray(currentClinicWards)) {
      currentClinicWards.forEach(w => {
        if (w.name) wardSet.add(w.name);
      });
    }
    baseWaitingQueue.forEach(p => {
      if (p.ward) wardSet.add(p.ward);
    });
    return Array.from(wardSet).sort();
  }, [currentClinicWards, baseWaitingQueue]);

  // Unique list of available bed numbers (reactive to selected ward)
  const availableBeds = useMemo(() => {
    const bedSet = new Set<string>();
    if (selectedWardFilter !== 'all') {
      const targetWard = currentClinicWards?.find(w => w.name === selectedWardFilter);
      if (targetWard?.beds) {
        targetWard.beds.forEach(b => bedSet.add(b));
      }
      baseWaitingQueue
        .filter(p => p.ward === selectedWardFilter)
        .forEach(p => {
          if (p.bedNumber) bedSet.add(p.bedNumber);
        });
    } else {
      if (currentClinicWards && Array.isArray(currentClinicWards)) {
        currentClinicWards.forEach(w => {
          if (w.beds) w.beds.forEach(b => bedSet.add(b));
        });
      }
      baseWaitingQueue.forEach(p => {
        if (p.bedNumber) bedSet.add(p.bedNumber);
      });
    }
    return Array.from(bedSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [currentClinicWards, baseWaitingQueue, selectedWardFilter]);

  // Active Clinic Waiting Queue with user-selected sorting and filtering
  const activeWaitingQueue = useMemo(() => {
    let list = [...baseWaitingQueue];

    // Filter by patient admission/revisit type
    if (queueTypeFilter === 'OPD') {
      list = list.filter(p => p.patientType === 'OPD' || !p.patientType);
    } else if (queueTypeFilter === 'IPD') {
      list = list.filter(p => p.patientType === 'IPD');
    } else if (queueTypeFilter === 'revisit') {
      list = list.filter(p => Boolean(p.isRevisit));
    }

    // Filter by clinical department
    if (selectedDepartmentFilter !== 'all') {
      list = list.filter(p => {
        const pDept = p.department || (p.patientType === 'IPD' ? 'Inpatient Ward' : 'General Outpatient (OPD)');
        return pDept.toLowerCase() === selectedDepartmentFilter.toLowerCase() || p.department === selectedDepartmentFilter;
      });
    }

    // Filter by consultation room
    if (selectedRoomFilter !== 'all') {
      list = list.filter(p => {
        const pRoom = p.doctorRoom || (p.patientType === 'IPD' ? (p.ward || 'Ward') : 'Consultation Room 1');
        return pRoom.toLowerCase() === selectedRoomFilter.toLowerCase() || p.doctorRoom === selectedRoomFilter;
      });
    }

    // Filter by ward name
    if (selectedWardFilter !== 'all') {
      list = list.filter(p => {
        return p.ward && p.ward.toLowerCase() === selectedWardFilter.toLowerCase();
      });
    }

    // Filter by bed number
    if (selectedBedFilter !== 'all') {
      list = list.filter(p => {
        return p.bedNumber && p.bedNumber.toLowerCase() === selectedBedFilter.toLowerCase();
      });
    }

    // Filter by search query
    if (queueSearchTerm.trim()) {
      const term = queueSearchTerm.toLowerCase().trim();
      list = list.filter(p => {
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        return (
          fullName.includes(term) ||
          p.mrn.toLowerCase().includes(term) ||
          (p.patientType && p.patientType.toLowerCase().includes(term)) ||
          (p.department && p.department.toLowerCase().includes(term)) ||
          (p.ward && p.ward.toLowerCase().includes(term)) ||
          (p.doctorRoom && p.doctorRoom.toLowerCase().includes(term)) ||
          (p.assignedDoctorName && p.assignedDoctorName.toLowerCase().includes(term)) ||
          (p.phone && p.phone.includes(term))
        );
      });
    }

    // Sort queue by selected criteria (name, date, mrn, age)
    list.sort((a, b) => {
      if (queueSortKey === 'date') {
        const timeA = getPatientTimestamp(a);
        const timeB = getPatientTimestamp(b);
        return queueSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      if (queueSortKey === 'name') {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        return queueSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (queueSortKey === 'mrn') {
        const mrnA = (a.mrn || '').toLowerCase();
        const mrnB = (b.mrn || '').toLowerCase();
        return queueSortOrder === 'asc'
          ? mrnA.localeCompare(mrnB, undefined, { numeric: true })
          : mrnB.localeCompare(mrnA, undefined, { numeric: true });
      }
      if (queueSortKey === 'age') {
        const ageA = getAgeInYears(a);
        const ageB = getAgeInYears(b);
        return queueSortOrder === 'asc' ? ageA - ageB : ageB - ageA;
      }
      return 0;
    });

    return list;
  }, [baseWaitingQueue, queueTypeFilter, selectedDepartmentFilter, selectedRoomFilter, selectedWardFilter, selectedBedFilter, queueSearchTerm, queueSortKey, queueSortOrder]);

  // Reset pagination to initial 5 display when filters, search, or active clinic/patient change
  useEffect(() => {
    setQueuePage(0);
  }, [
    queueSearchTerm,
    queueTypeFilter,
    selectedDepartmentFilter,
    selectedRoomFilter,
    selectedWardFilter,
    selectedBedFilter,
    queueSortKey,
    queueSortOrder,
    activeClinic.id
  ]);

  useEffect(() => {
    setLabCatalogPage(0);
  }, [labSearchQuery, labCategoryFilter, activeClinic.id]);

  useEffect(() => {
    setRadCatalogPage(0);
  }, [radSearchQuery, radModalityFilter, activeClinic.id]);

  useEffect(() => {
    setVisitsHistoryPage(0);
    setEncountersHistoryPage(0);
    setPrescriptionsHistoryPage(0);
    setLabResultsHistoryPage(0);
    setRadResultsHistoryPage(0);
  }, [selectedPatient?.id, activeClinic.id]);

  // Filtered Pathology & Radiology Catalogs
  const filteredLabCatalog = useMemo(() => {
    return availablePathologyTests.filter(t => {
      const matchesCat = labCategoryFilter === 'ALL' || t.category === labCategoryFilter;
      const matchesSearch =
        !labSearchQuery.trim() ||
        t.name.toLowerCase().includes(labSearchQuery.toLowerCase()) ||
        t.code.toLowerCase().includes(labSearchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(labSearchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [availablePathologyTests, labCategoryFilter, labSearchQuery]);

  const filteredRadCatalog = useMemo(() => {
    return availableRadiologyScans.filter(s => {
      const modality =
        s.category === 'CT Scan'
          ? 'CT Scan'
          : s.category === 'Ultrasound'
          ? 'Ultrasound'
          : s.category === 'MRI'
          ? 'MRI'
          : 'X-Ray';
      const matchesMod = radModalityFilter === 'ALL' || modality === radModalityFilter || s.category === radModalityFilter;
      const matchesSearch =
        !radSearchQuery.trim() ||
        s.name.toLowerCase().includes(radSearchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(radSearchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(radSearchQuery.toLowerCase()) ||
        (s.sampleOrBodyPart && s.sampleOrBodyPart.toLowerCase().includes(radSearchQuery.toLowerCase()));
      return matchesMod && matchesSearch;
    });
  }, [availableRadiologyScans, radModalityFilter, radSearchQuery]);

  // Registered Visits History for selectedPatient
  const sortedPatientVisits = useMemo(() => {
    if (!selectedPatient) return [];
    const rawVisits = selectedPatient.visits || [];
    const displayVisits =
      rawVisits.length > 0
        ? rawVisits
        : [
            {
              id: `v-initial-${selectedPatient.id}`,
              patientId: selectedPatient.id,
              visitNumber: 1,
              visitDate: selectedPatient.registeredAt || selectedPatient.createdAt || new Date().toISOString(),
              visitTimestamp: selectedPatient.registeredAt || selectedPatient.createdAt || new Date().toISOString(),
              visitMrn: selectedPatient.initialMrn || selectedPatient.mrn,
              patientType: selectedPatient.patientType || 'OPD',
              department: selectedPatient.department || 'General Outpatient (OPD)',
              doctorRoom: selectedPatient.doctorRoom,
              ward: selectedPatient.ward,
              bedNumber: selectedPatient.bedNumber,
              assignedDoctorName: selectedPatient.assignedDoctorName,
              revisitReason: 'Initial Clinical Intake & Registration',
              notes: selectedPatient.notes,
              vitals: selectedPatient.vitals || selectedPatient.anthropometry
            }
          ];

    return [...displayVisits].sort((a, b) => {
      const timeA = new Date(a.visitTimestamp || a.visitDate).getTime() || 0;
      const timeB = new Date(b.visitTimestamp || b.visitDate).getTime() || 0;
      return timeB - timeA;
    });
  }, [selectedPatient]);

  // 5-then-10 Pagination Metadata for all lists in Doctor's Dashboard
  const queuePagination = useMemo(
    () => buildFiveThenTenPagination(activeWaitingQueue, queuePage),
    [activeWaitingQueue, queuePage]
  );

  const labCatalogPagination = useMemo(
    () => buildFiveThenTenPagination(filteredLabCatalog, labCatalogPage),
    [filteredLabCatalog, labCatalogPage]
  );

  const radCatalogPagination = useMemo(
    () => buildFiveThenTenPagination(filteredRadCatalog, radCatalogPage),
    [filteredRadCatalog, radCatalogPage]
  );

  const visitsHistoryPagination = useMemo(
    () => buildFiveThenTenPagination(sortedPatientVisits, visitsHistoryPage),
    [sortedPatientVisits, visitsHistoryPage]
  );

  const encountersHistoryPagination = useMemo(
    () => buildFiveThenTenPagination(patientEncounters, encountersHistoryPage),
    [patientEncounters, encountersHistoryPage]
  );

  const prescriptionsHistoryPagination = useMemo(
    () => buildFiveThenTenPagination(patientPrescriptions, prescriptionsHistoryPage),
    [patientPrescriptions, prescriptionsHistoryPage]
  );

  const labResultsHistoryPagination = useMemo(
    () => buildFiveThenTenPagination(patientTestOrders, labResultsHistoryPage),
    [patientTestOrders, labResultsHistoryPage]
  );

  const radResultsHistoryPagination = useMemo(
    () => buildFiveThenTenPagination(patientRadOrders, radResultsHistoryPage),
    [patientRadOrders, radResultsHistoryPage]
  );

  // Helper to record Firestore reads when stepping into subsequent groups of 10
  const trackGroupRead = (listKey: string, colName: string, targetPage: number, visibleItems: any[]) => {
    const groupKey = `${activeClinic.id}:doctor:${listKey}:${targetPage}`;
    if (targetPage > 0 && !fetchedReadGroupsRef.current.has(groupKey) && visibleItems.length > 0) {
      fetchedReadGroupsRef.current.add(groupKey);
      recordFirestoreRead(colName, visibleItems, activeClinic.id);
    }
  };

  const handleSelectQueueGroup = (targetPage: number) => {
    const next = buildFiveThenTenPagination(activeWaitingQueue, targetPage);
    trackGroupRead('queue', 'patients', next.safePage, next.visibleItems);
    setQueuePage(next.safePage);
  };

  const handleSelectLabCatalogGroup = (targetPage: number) => {
    const next = buildFiveThenTenPagination(filteredLabCatalog, targetPage);
    trackGroupRead('labCatalog', 'availableTests', next.safePage, next.visibleItems);
    setLabCatalogPage(next.safePage);
  };

  const handleSelectRadCatalogGroup = (targetPage: number) => {
    const next = buildFiveThenTenPagination(filteredRadCatalog, targetPage);
    trackGroupRead('radCatalog', 'availableTests', next.safePage, next.visibleItems);
    setRadCatalogPage(next.safePage);
  };

  const handleSelectVisitsHistoryGroup = (targetPage: number) => {
    const next = buildFiveThenTenPagination(sortedPatientVisits, targetPage);
    trackGroupRead(`visits:${selectedPatient?.id || 'none'}`, 'patients', next.safePage, next.visibleItems);
    setVisitsHistoryPage(next.safePage);
  };

  const handleSelectEncountersHistoryGroup = (targetPage: number) => {
    const next = buildFiveThenTenPagination(patientEncounters, targetPage);
    trackGroupRead(`encounters:${selectedPatient?.id || 'none'}`, 'encounters', next.safePage, next.visibleItems);
    setEncountersHistoryPage(next.safePage);
  };

  const handleSelectPrescriptionsHistoryGroup = (targetPage: number) => {
    const next = buildFiveThenTenPagination(patientPrescriptions, targetPage);
    trackGroupRead(`prescriptions:${selectedPatient?.id || 'none'}`, 'prescriptions', next.safePage, next.visibleItems);
    setPrescriptionsHistoryPage(next.safePage);
  };

  const handleSelectLabResultsHistoryGroup = (targetPage: number) => {
    const next = buildFiveThenTenPagination(patientTestOrders, targetPage);
    trackGroupRead(`testOrders:${selectedPatient?.id || 'none'}`, 'testOrders', next.safePage, next.visibleItems);
    setLabResultsHistoryPage(next.safePage);
  };

  const handleSelectRadResultsHistoryGroup = (targetPage: number) => {
    const next = buildFiveThenTenPagination(patientRadOrders, targetPage);
    trackGroupRead(`radOrders:${selectedPatient?.id || 'none'}`, 'radiologyOrders', next.safePage, next.visibleItems);
    setRadResultsHistoryPage(next.safePage);
  };

  // Options for the top Active Patient Selector (uses currently loaded queue group + selectedPatient so opening only displays 5 patients)
  const selectorPatientOptions = useMemo(() => {
    const base =
      queuePagination.visibleItems.length > 0
        ? queuePagination.visibleItems
        : currentClinicPatients.slice(0, 5);
    if (selectedPatient && !base.some(p => p.id === selectedPatient.id)) {
      return [selectedPatient, ...base];
    }
    return base;
  }, [queuePagination.visibleItems, currentClinicPatients, selectedPatient]);

  // Calculate live BMI for display
  const currentVitals = selectedPatient?.anthropometry || selectedPatient?.vitals || encounterForm.vitals;
  const bmiVal = currentVitals.weightKg && currentVitals.heightCm && currentVitals.heightCm > 0
    ? Number((currentVitals.weightKg / ((currentVitals.heightCm / 100) * (currentVitals.heightCm / 100))).toFixed(1))
    : null;

  // Submit Encounter & Save Workup Card (Supports both New Encounter and Updating Existing Encounter)
  const handleSaveEncounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    if (editingEncounterId) {
      updateEncounter(
        editingEncounterId,
        {
          chiefComplaint: encounterForm.chiefComplaint,
          historyOfPresentIllness: encounterForm.historyOfPresentIllness,
          vitals: encounterForm.vitals,
          physicalExamNotes: encounterForm.physicalExamNotes,
          generalExam: encounterForm.generalExam,
          systemicExam: encounterForm.systemicExam,
          workingDiagnosis: encounterForm.workingDiagnosis,
          differentialDiagnosis: encounterForm.differentialDiagnosis,
          clinicalPlan: encounterForm.clinicalPlan,
          followUpDate: encounterForm.followUpDate,
          status: 'completed'
        },
        editReasonNote.trim() || undefined
      );

      // Update linked prescription if it exists
      const linkedRx = currentClinicPrescriptions.find(p => p.encounterId === editingEncounterId);
      if (linkedRx) {
        updatePrescription(linkedRx.id, {
          diagnosis: encounterForm.workingDiagnosis,
          clinicalNotes: encounterForm.clinicalPlan,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name
        });
      } else if (encounterForm.clinicalPlan && encounterForm.clinicalPlan.trim()) {
        const isIPDPatient = selectedPatient.patientType === 'IPD' || (selectedPatient as any).admissionType === 'IPD';
        createPrescription({
          patientId: selectedPatient.id,
          patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
          patientMrn: selectedPatient.mrn,
          patientType: isIPDPatient ? 'IPD' : 'OPD',
          targetDepartment: isIPDPatient ? 'nursing' : 'pharmacy',
          clinicId: activeClinic.id,
          doctorId: currentUser.id,
          doctorName: currentUser.name,
          encounterId: editingEncounterId,
          diagnosis: encounterForm.workingDiagnosis || 'Clinical Consultation',
          clinicalNotes: encounterForm.clinicalPlan,
          items: []
        });
      }

      alert(`Clinical encounter #${editingEncounterId} updated successfully! Revision timestamp and user credentials have been permanently logged.`);
      setEditingEncounterId(null);
      setEditReasonNote('');
      setActiveTab('workup');
      return;
    }

    const isIPDPatient = selectedPatient.patientType === 'IPD' || (selectedPatient as any).admissionType === 'IPD';

    saveEncounter({
      patientId: selectedPatient.id,
      patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
      patientMrn: selectedPatient.mrn,
      patientType: isIPDPatient ? 'IPD' : 'OPD',
      clinicId: activeClinic.id,
      doctorId: currentUser.id,
      doctorName: currentUser.name,
      visitDate: new Date().toISOString().split('T')[0],
      chiefComplaint: encounterForm.chiefComplaint,
      historyOfPresentIllness: encounterForm.historyOfPresentIllness,
      vitals: encounterForm.vitals,
      physicalExamNotes: encounterForm.physicalExamNotes,
      generalExam: encounterForm.generalExam,
      systemicExam: encounterForm.systemicExam,
      workingDiagnosis: encounterForm.workingDiagnosis,
      differentialDiagnosis: encounterForm.differentialDiagnosis,
      clinicalPlan: encounterForm.clinicalPlan,
      followUpDate: encounterForm.followUpDate,
      status: 'completed'
    });

    if (encounterForm.clinicalPlan && encounterForm.clinicalPlan.trim()) {
      if (isIPDPatient) {
        alert('Inpatient (IPD) clinical encounter saved!\n\nThe clinical workplan & prescription orders have been sent directly to the Nursing Dashboard for patient checklist treatment chart population and administration.');
      } else {
        alert('Clinical encounter saved! Your Clinical Workplan & Management Orders have been copied and transferred to the Pharmacy dashboard for pharmacist cart population (Direct / Indirect Carts) and dispensing.');
      }
    } else {
      alert('Clinical encounter saved! A dedicated Clinical Workup card has been created. You can view, print, or export it as PDF.');
    }
    setActiveTab('workup');
  };

  // Submit Batch Lab Test Orders
  const handleOrderLabTests = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (selectedLabTests.length === 0) {
      alert('Please select at least one laboratory investigation to dispatch.');
      return;
    }
    if (!labClinicalIndication.trim()) {
      alert('Please provide clinical indication & relevant history.');
      return;
    }

    const timestamp = Date.now();
    const createdOrders: TestOrder[] = [];

    selectedLabTests.forEach((test, idx) => {
      const newOrder = createTestOrder({
        patientId: selectedPatient.id,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        patientMrn: selectedPatient.mrn,
        clinicId: activeClinic.id,
        doctorId: currentUser.id,
        doctorName: currentUser.name,
        encounterId: `enc-${timestamp}-${idx}`,
        testName: test.testName,
        testCode: test.testCode,
        category: test.category,
        clinicalIndication: labClinicalIndication.trim(),
        priority: labPriority,
        cost: test.cost,
        baseCost: test.baseCost,
        isInsurancePrice: test.isInsurancePrice,
        insurancePolicyName: test.insurancePolicyName
      });
      createdOrders.push(newOrder);
    });

    const totalFee = selectedLabTests.reduce((sum, t) => sum + t.cost, 0);
    alert(`Successfully dispatched ${createdOrders.length} pathology investigation(s) (Total: $${totalFee.toFixed(2)}) to Laboratory for ${selectedPatient.firstName} ${selectedPatient.lastName}.`);
    
    setSelectedLabTests([]);
    setLabClinicalIndication('');
    setActiveTab('history');
  };

  // Submit Batch Radiology Scan Orders
  const handleOrderRadiologyScans = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (selectedRadScans.length === 0) {
      alert('Please select at least one radiological imaging procedure to dispatch.');
      return;
    }
    if (!radClinicalHistory.trim()) {
      alert('Please provide clinical history and area of interest.');
      return;
    }

    const timestamp = Date.now();
    const createdOrders: RadiologyOrder[] = [];

    selectedRadScans.forEach((scan, idx) => {
      const newOrder = createRadiologyOrder({
        patientId: selectedPatient.id,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        patientMrn: selectedPatient.mrn,
        clinicId: activeClinic.id,
        doctorId: currentUser.id,
        doctorName: currentUser.name,
        encounterId: `enc-${timestamp}-${idx}`,
        procedureName: scan.procedureName,
        procedureCode: scan.procedureCode,
        modality: scan.modality,
        bodyPart: scan.bodyPart,
        clinicalHistory: `${radClinicalHistory.trim()}${scan.contrastRequired || radContrastRequired ? ' [IV/Oral Contrast Requested: YES]' : ''}`,
        priority: radPriority,
        cost: scan.cost,
        baseCost: scan.baseCost,
        isInsurancePrice: scan.isInsurancePrice,
        insurancePolicyName: scan.insurancePolicyName
      });
      createdOrders.push(newOrder);
    });

    const totalFee = selectedRadScans.reduce((sum, s) => sum + s.cost, 0);
    alert(`Successfully dispatched ${createdOrders.length} radiological imaging procedure(s) (Total: $${totalFee.toFixed(2)}) to Radiology Department for ${selectedPatient.firstName} ${selectedPatient.lastName}.`);

    setSelectedRadScans([]);
    setRadClinicalHistory('');
    setActiveTab('history');
  };

  return (
    <div className="space-y-5">
      
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">Doctor Clinical Suite</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                Dr. {currentUser.name.replace('Dr. ', '')}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Consultation &bull; Real-time Catalog Investigation Orders &bull; Diagnostic Results
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLocationsModalOpen(true)}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <BedDouble className="w-3.5 h-3.5 text-purple-600" />
            Wards & Rooms
          </button>

          {/* Patient Selector Strip */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-xs">
            <User className="w-4 h-4 text-slate-500 ml-1.5" />
            <span className="font-semibold text-slate-700">Active Patient:</span>
            {currentClinicPatients.length > 0 ? (
              <>
                <select
                  value={selectedPatient?.id || ''}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="p-1 border border-slate-300 rounded bg-white font-medium text-slate-900 text-xs"
                >
                  {selectorPatientOptions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.patientType === 'IPD' ? 'IPD' : 'OPD'}: {p.mrn}) &bull; [{p.patientType || 'OPD'}] &bull; {formatPatientAge(p, 'short')} {p.gender[0]} &bull; {p.currentStatus.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                {queuePagination.totalGroups > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectQueueGroup(
                        queuePagination.hasNext ? queuePagination.safePage + 1 : 0
                      )
                    }
                    className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] cursor-pointer transition-colors"
                    title="Load next group of patients into the active selector and waiting queue"
                  >
                    {queuePagination.hasNext
                      ? `Next (${queuePagination.nextGroupSize})`
                      : 'Initial 5'}
                  </button>
                )}
              </>
            ) : (
              <span className="text-slate-400 italic px-2">No patients registered at {activeClinic.name}</span>
            )}
          </div>
        </div>
      </div>

      {/* Active Clinic Waiting Queue Section (Syncs with Reception Queue) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-xs">Active Clinic Waiting Queue</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                  {activeWaitingQueue.length} Active Patients
                </span>
                <span className="text-[10px] text-purple-900 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <SlidersHorizontal className="w-2.5 h-2.5 text-purple-600" />
                  Sorted by {queueSortKey === 'name' ? 'Name' : queueSortKey === 'date' ? 'Date & Time' : queueSortKey === 'mrn' ? 'OPD/IPD #' : 'Age'} ({queueSortOrder === 'asc' ? 'Asc' : 'Desc'})
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Click any patient to load consultation chart and initiate clinical encounter
              </p>
            </div>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search queue by name, OPD/IPD #, room..."
                value={queueSearchTerm}
                onChange={(e) => setQueueSearchTerm(e.target.value)}
                className="pl-8 pr-7 py-1.5 border border-slate-200 rounded-md text-xs bg-slate-50 focus:bg-white text-slate-900 w-56 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              {queueSearchTerm && (
                <button
                  type="button"
                  onClick={() => setQueueSearchTerm('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Sort Filter Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
              <SlidersHorizontal className="w-3 h-3 text-purple-600" />
              <span className="text-[10px] font-bold text-slate-600">Sort:</span>
              <select
                value={queueSortKey}
                onChange={(e) => setQueueSortKey(e.target.value as any)}
                className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
              >
                <option value="date">Date & Time</option>
                <option value="name">Patient Name (A-Z)</option>
                <option value="mrn">OPD / IPD #</option>
                <option value="age">Age</option>
              </select>
            </div>

            {/* Order Direction Toggle */}
            <button
              type="button"
              onClick={() => setQueueSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 rounded-md font-bold text-xs cursor-pointer transition-colors shadow-2xs"
              title={`Toggle sort order (currently ${queueSortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
            >
              {queueSortOrder === 'asc' ? (
                <>
                  <ArrowUp className="w-3 h-3 text-purple-700" />
                  <span>{queueSortKey === 'name' ? 'A → Z' : queueSortKey === 'date' ? 'Oldest First' : 'Asc'}</span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-3 h-3 text-purple-700" />
                  <span>{queueSortKey === 'name' ? 'Z → A' : queueSortKey === 'date' ? 'Newest First' : 'Desc'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Filter Pills & Record Counter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              Type:
            </span>
            <button
              type="button"
              onClick={() => setQueueTypeFilter('all')}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                queueTypeFilter === 'all'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All ({baseWaitingQueue.length})
            </button>
            <button
              type="button"
              onClick={() => setQueueTypeFilter('OPD')}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                queueTypeFilter === 'OPD'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200'
              }`}
            >
              OPD Only ({baseWaitingQueue.filter(p => p.patientType === 'OPD' || !p.patientType).length})
            </button>
            <button
              type="button"
              onClick={() => setQueueTypeFilter('IPD')}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                queueTypeFilter === 'IPD'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              IPD Inpatients ({baseWaitingQueue.filter(p => p.patientType === 'IPD').length})
            </button>
            <button
              type="button"
              onClick={() => setQueueTypeFilter('revisit')}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                queueTypeFilter === 'revisit'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Revisits ({baseWaitingQueue.filter(p => Boolean(p.isRevisit)).length})
            </button>
          </div>

          <div className="text-slate-500 font-semibold text-[10px]">
            Showing{' '}
            <strong className="text-slate-900">
              {queuePagination.totalItems === 0
                ? '0'
                : `${queuePagination.startIndex + 1}–${queuePagination.endIndex}`}
            </strong>{' '}
            ({queuePagination.safePage === 0 ? 'Initial 5' : `Group ${queuePagination.safePage + 1} of ${queuePagination.totalGroups}`}) of{' '}
            <strong className="text-slate-900">{activeWaitingQueue.length}</strong> waiting patients
          </div>
        </div>

        {/* Department, Consultation Room, Ward & Bed Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Department Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-600">Dept:</span>
              <select
                value={selectedDepartmentFilter}
                onChange={(e) => {
                  setSelectedDepartmentFilter(e.target.value);
                  setSelectedRoomFilter('all');
                }}
                className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[170px] truncate"
              >
                <option value="all">All Departments ({baseWaitingQueue.length})</option>
                {availableDepartments.map(dept => {
                  const count = baseWaitingQueue.filter(p => {
                    const pDept = p.department || (p.patientType === 'IPD' ? 'Inpatient Ward' : 'General Outpatient (OPD)');
                    return pDept.toLowerCase() === dept.toLowerCase() || p.department === dept;
                  }).length;
                  return (
                    <option key={dept} value={dept}>
                      {dept} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Consultation Room Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <DoorOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-600">Room:</span>
              <select
                value={selectedRoomFilter}
                onChange={(e) => setSelectedRoomFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[160px] truncate"
              >
                <option value="all">All Rooms</option>
                {availableRooms.map(room => {
                  const count = baseWaitingQueue.filter(p => {
                    const matchesDept = selectedDepartmentFilter === 'all' ||
                      (p.department || (p.patientType === 'IPD' ? 'Inpatient Ward' : 'General Outpatient (OPD)')).toLowerCase() === selectedDepartmentFilter.toLowerCase();
                    const pRoom = p.doctorRoom || (p.patientType === 'IPD' ? (p.ward || 'Ward') : 'Consultation Room 1');
                    return matchesDept && (pRoom.toLowerCase() === room.toLowerCase() || p.doctorRoom === room);
                  }).length;
                  return (
                    <option key={room} value={room}>
                      {room} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Ward Name Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <BedDouble className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-600">Ward:</span>
              <select
                value={selectedWardFilter}
                onChange={(e) => {
                  setSelectedWardFilter(e.target.value);
                  setSelectedBedFilter('all');
                }}
                className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[160px] truncate"
              >
                <option value="all">All Wards ({baseWaitingQueue.filter(p => p.ward).length} IPD)</option>
                {availableWards.map(ward => {
                  const count = baseWaitingQueue.filter(p => p.ward && p.ward.toLowerCase() === ward.toLowerCase()).length;
                  return (
                    <option key={ward} value={ward}>
                      {ward} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Bed Number Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Tag className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-600">Bed:</span>
              <select
                value={selectedBedFilter}
                onChange={(e) => setSelectedBedFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="all">All Beds</option>
                {availableBeds.map(bed => {
                  const count = baseWaitingQueue.filter(p => {
                    const matchesWard = selectedWardFilter === 'all' || (p.ward && p.ward.toLowerCase() === selectedWardFilter.toLowerCase());
                    return matchesWard && p.bedNumber && p.bedNumber.toLowerCase() === bed.toLowerCase();
                  }).length;
                  return (
                    <option key={bed} value={bed}>
                      Bed {bed} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Clear Filter Action if Department, Room, Ward, or Bed is active */}
            {(selectedDepartmentFilter !== 'all' || selectedRoomFilter !== 'all' || selectedWardFilter !== 'all' || selectedBedFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDepartmentFilter('all');
                  setSelectedRoomFilter('all');
                  setSelectedWardFilter('all');
                  setSelectedBedFilter('all');
                }}
                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset Department, Room, Ward, and Bed filters"
              >
                <X className="w-3 h-3 text-rose-600" />
                Clear Location Filters
              </button>
            )}
          </div>

          {/* Active Filter Tags */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
            {selectedDepartmentFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
                Dept: {selectedDepartmentFilter}
              </span>
            )}
            {selectedRoomFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                Room: {selectedRoomFilter}
              </span>
            )}
            {selectedWardFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold border border-teal-200">
                Ward: {selectedWardFilter}
              </span>
            )}
            {selectedBedFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 font-bold border border-cyan-200">
                Bed: {selectedBedFilter}
              </span>
            )}
          </div>
        </div>

        {/* Top Read-Saving Pagination Prompt & Group Controls for Active Waiting Queue */}
        <GroupPaginationTopBar
          pagination={queuePagination}
          onSelectPage={handleSelectQueueGroup}
          itemNoun="patient(s)"
          accentColor="purple"
        />

        {/* Horizontal Queue Cards Strip (Initial 5 patients on page 0, then groups of 10) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          {queuePagination.visibleItems.map((p) => {
            const isSelected = selectedPatient?.id === p.id;
            const pVitals = p.anthropometry || p.vitals;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedPatientId(p.id);
                  if (p.currentStatus === 'waiting' || p.currentStatus === 'in_triage') {
                    // Start consultation
                  }
                }}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-500 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="font-bold text-slate-900 text-xs truncate">
                      {p.firstName} {p.lastName}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {p.isRevisit && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-0.5">
                          <RotateCcw className="w-2 h-2 text-purple-700" />
                          Revisit
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        p.patientType === 'IPD' ? 'bg-indigo-100 text-indigo-800' : 'bg-sky-100 text-sky-800'
                      }`}>
                        {p.patientType || 'OPD'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 truncate mb-1">
                    {p.patientType === 'IPD' ? 'IPD No.' : 'OPD No.'}: {p.mrn}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] mb-1">
                    <span className={`px-1.5 py-0.2 rounded font-semibold uppercase ${
                      p.currentStatus === 'waiting'
                        ? 'bg-amber-100 text-amber-800'
                        : p.currentStatus === 'in_consultation'
                        ? 'bg-emerald-100 text-emerald-800'
                        : p.currentStatus === 'in_triage'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {p.currentStatus.replace('_', ' ')}
                    </span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-600">{formatPatientAge(p, 'short')} ({p.gender[0]})</span>
                  </div>

                  {/* Department, Consultation Room, Ward & Bed Location Tag */}
                  <div className="flex items-center gap-1 text-[10px] text-slate-600 mt-1 truncate">
                    {p.patientType === 'IPD' || p.ward ? (
                      <>
                        <BedDouble className="w-2.5 h-2.5 text-teal-600 shrink-0" />
                        <span className="truncate font-semibold text-teal-900">{p.ward || 'General Ward'}</span>
                        <span className="text-slate-400">&bull;</span>
                        <span className="px-1 py-0.2 rounded bg-teal-50 text-teal-800 font-mono font-bold text-[9px] border border-teal-200 shrink-0">
                          Bed {p.bedNumber || 'Unassigned'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Building2 className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                        <span className="truncate font-semibold text-slate-800">{p.department || 'General OPD'}</span>
                        <span className="text-slate-400">&bull;</span>
                        <DoorOpen className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                        <span className="truncate text-slate-600 font-medium">
                          {p.doctorRoom || 'Consultation Office'}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Registered Timestamp */}
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                    <Calendar className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                    <span>Reg: <strong className="text-slate-700">{p.registeredAt || 'Today'}</strong></span>
                  </div>
                </div>

                {pVitals?.bloodPressure && (
                  <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                    <span>BP: <strong className="text-slate-800">{pVitals.bloodPressure}</strong></span>
                    <span>Pulse: <strong className="text-slate-800">{pVitals.pulseRate}</strong></span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Next/Previous Group Prompt for Active Waiting Queue */}
        <GroupPaginationBottomBar
          pagination={queuePagination}
          onSelectPage={handleSelectQueueGroup}
          itemNoun="patient(s)"
          accentColor="purple"
        />

        {activeWaitingQueue.length === 0 && (
          <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg text-xs space-y-2 border border-slate-200">
            <Clock className="w-7 h-7 text-slate-300 mx-auto" />
            <div className="font-semibold text-slate-700">
              {baseWaitingQueue.length === 0
                ? `No active patients currently waiting in ${activeClinic.name}.`
                : `No active patients match your search, department, room, ward, or bed filter criteria.`}
            </div>
            {baseWaitingQueue.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQueueSearchTerm('');
                  setQueueTypeFilter('all');
                  setSelectedDepartmentFilter('all');
                  setSelectedRoomFilter('all');
                  setSelectedWardFilter('all');
                  setSelectedBedFilter('all');
                }}
                className="text-purple-600 hover:text-purple-800 font-bold underline cursor-pointer text-xs"
              >
                Reset all queue filters and criteria
              </button>
            )}
          </div>
        )}
      </div>

      {/* Patient Vitals & Demographics Card (Collapsible to avoid overcrowding) */}
      {selectedPatient && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all">
          <div className="p-3.5 bg-slate-50/90 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPatientDetailsCollapsed(!isPatientDetailsCollapsed)}
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded cursor-pointer flex items-center gap-1 font-bold text-xs"
                title="Toggle Patient Details View"
              >
                {isPatientDetailsCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-sky-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-sky-600" />
                )}
                <span className="text-sm font-bold text-slate-900">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </span>
              </button>

              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                selectedPatient.patientType === 'IPD'
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                  : 'bg-sky-50 text-sky-800 border-sky-300'
              }`}>
                {selectedPatient.patientType || 'OPD'}
              </span>

              {selectedPatient.isRevisit && (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1 shadow-2xs">
                  <RotateCcw className="w-3 h-3 text-purple-700" />
                  <span>Revisit (Visit #{selectedPatient.visits?.length || (selectedPatient.revisitCount ? selectedPatient.revisitCount + 1 : 2)})</span>
                </span>
              )}

              <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-50 text-emerald-800 border-emerald-200">
                {selectedPatient.ageCategory || (getAgeInYears(selectedPatient.age) <= 2 ? 'INFANT' : getAgeInYears(selectedPatient.age) <= 12 ? 'CHILD' : getAgeInYears(selectedPatient.age) >= 60 ? 'ELDER' : 'ADULT')}
              </span>

              {isSelectedPatientDeceased && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-rose-100 text-rose-800 border-rose-300 flex items-center gap-1">
                  <HeartCrack className="w-3 h-3 text-rose-700" />
                  <span>DECEASED ({selectedPatientDeathCert?.dateOfDeath || selectedPatient?.dateOfDeath || 'Reported'})</span>
                </span>
              )}

              <span className="text-slate-500">
                {selectedPatient.patientType === 'IPD' ? 'IPD No.' : 'OPD No.'}: <span className="font-mono font-semibold text-slate-800">{selectedPatient.mrn}</span> &bull; {formatPatientAge(selectedPatient)} &bull; {selectedPatient.gender}
                {selectedPatient.bloodGroup && <span> &bull; Blood: <strong>{selectedPatient.bloodGroup}</strong></span>}
                {selectedPatient.phone && <span> &bull; Tel: {selectedPatient.phone}</span>}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* View Past Visits button */}
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="px-2.5 py-1 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-900 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="View all registered visits and past clinical encounter proceedings"
              >
                <RotateCcw className="w-3 h-3 text-purple-700" />
                <span>Past Visits ({selectedPatient.visits?.length || 1})</span>
              </button>

              {/* Admit / Transfer Patient Button */}
              <button
                type="button"
                onClick={() => setIsMovementModalOpen(true)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                  selectedPatient.patientType === 'IPD'
                    ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-300'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
                title={selectedPatient.patientType === 'IPD' ? 'Transfer Ward/Bed or View Movement Path' : 'Admit Patient to IPD Ward & Bed or Transfer'}
              >
                <History className="w-3 h-3 text-indigo-600" />
                {selectedPatient.patientType === 'IPD' ? 'Transfer / Bed Trail' : 'Admit to IPD Ward'}
              </button>

              {/* Level 2 Edit Patient Details Button */}
              <button
                type="button"
                onClick={() => setIsEditPatientOpen(true)}
                className="px-2.5 py-1 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-800 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="Edit Patient Demographics & Profile (Level 2 Clearance)"
              >
                <Edit3 className="w-3 h-3 text-purple-600" />
                Edit Details
              </button>

              {/* Edit Anthropometry Button */}
              <button
                type="button"
                onClick={() => setIsEditVitalsOpen(true)}
                className="px-2.5 py-1 bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-800 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="Record or update patient vital signs & anthropometric measurements"
              >
                <Activity className="w-3 h-3 text-sky-600" />
                Vitals
              </button>

              {selectedPatient.allergies && selectedPatient.allergies.length > 0 && selectedPatient.allergies[0] !== 'None Reported' ? (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Allergies: {selectedPatient.allergies.join(', ')}
                </div>
              ) : (
                <span className="text-slate-400 text-[11px]">No allergies</span>
              )}

              {patientLedger && (
                <button
                  onClick={() => setPrintModal({ isOpen: true, type: 'ledger', data: patientLedger })}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <FileText className="w-3 h-3" />
                  Ledger (${patientLedger.totalBilled.toFixed(2)})
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsPatientDetailsCollapsed(!isPatientDetailsCollapsed)}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                {isPatientDetailsCollapsed ? 'Show Vitals' : 'Collapse Details'}
              </button>
            </div>
          </div>

          {/* Location & Room/Ward Status Bar */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between text-[11px]">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 font-semibold text-slate-800">
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Dept: {selectedPatient.department || 'General Outpatient'}</span>
              </div>
              <span className="text-slate-300">|</span>
              {selectedPatient.patientType === 'IPD' ? (
                <div className="flex items-center gap-1 font-bold text-indigo-900">
                  <BedDouble className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ward: {selectedPatient.ward || 'Inpatient Ward'} &bull; {selectedPatient.bedNumber || 'Bed Unassigned'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-slate-700">
                  <DoorOpen className="w-3.5 h-3.5 text-slate-500" />
                  <span>Consult Room: {selectedPatient.doctorRoom || 'Consultation Office'}</span>
                </div>
              )}
              {selectedPatient.assignedDoctorName && (
                <>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1 text-sky-800 font-medium">
                    <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                    <span>In-Charge: {selectedPatient.assignedDoctorName}</span>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsMovementModalOpen(true)}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <History className="w-3 h-3" />
              <span>View Movement Trail ({(selectedPatient.movementHistory || []).length} Transfers)</span>
            </button>
          </div>

          {/* Vitals & Anthropometry Grid (Collapsible Section) */}
          {!isPatientDetailsCollapsed && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs bg-white">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Blood Pressure</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{encounterForm.vitals.bloodPressure} mmHg</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Pulse Rate</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{encounterForm.vitals.pulseRate} bpm</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Body Temp</span>
                <div className={`font-bold text-sm mt-0.5 ${encounterForm.vitals.temperature > 37.5 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {encounterForm.vitals.temperature} &deg;C
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">SpO2 Oxygen</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{encounterForm.vitals.spO2}%</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Weight / Height</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{encounterForm.vitals.weightKg}kg / {encounterForm.vitals.heightCm}cm</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Calculated BMI</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  {bmiVal ? `${bmiVal} kg/m²` : 'N/A'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clinical Workspace Tabs */}
      <div className="border-b border-slate-200 flex flex-wrap items-center gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('consultation')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'consultation' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          1. Clinical Consultation & Exam
        </button>

        <button
          onClick={() => setActiveTab('workup')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'workup' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>2. Clinical Workup Card</span>
          {patientEncounters.length > 0 && (
            <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold">
              {patientEncounters.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('procedures')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'procedures' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>3. Procedures Done</span>
          {patientProcedures.length > 0 && (
            <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded-full text-[10px] font-bold">
              {patientProcedures.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('pathology')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'pathology' ? 'border-amber-600 text-amber-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Microscope className="w-3.5 h-3.5" />
          <span>4. Order Pathology Tests</span>
          {selectedLabTests.length > 0 ? (
            <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
              {selectedLabTests.length}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">({availablePathologyTests.length})</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('radiology')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'radiology' ? 'border-cyan-600 text-cyan-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>5. Order Radiology Scans</span>
          {selectedRadScans.length > 0 ? (
            <span className="px-1.5 py-0.2 bg-cyan-500 text-white rounded-full text-[10px] font-bold">
              {selectedRadScans.length}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">({availableRadiologyScans.length})</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'history' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Past Records ({patientEncounters.length + patientPrescriptions.length + patientTestOrders.length + patientRadOrders.length})
        </button>

        {/* Discharge Patient Button alongside other workspace buttons */}
        <button
          type="button"
          onClick={() => {
            if (selectedPatient) {
              setIsDischargeModalOpen(true);
            }
          }}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer font-bold ${
            isSelectedPatientDischarged
              ? 'border-amber-600 text-amber-700 hover:text-amber-800'
              : 'border-emerald-600 text-emerald-700 hover:text-emerald-800'
          }`}
          title={isSelectedPatientDischarged ? 'Review or edit patient discharge summary form' : 'Fill and submit patient discharge summary & Rx'}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{isSelectedPatientDischarged ? 'Edit Discharge Form' : 'Discharge Patient'}</span>
          {isSelectedPatientDischarged ? (
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
              Discharged
            </span>
          ) : (
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
              Discharge
            </span>
          )}
        </button>

        {/* View & Print Discharge File Option when patient has a discharge summary */}
        {selectedPatientDischargeSummary && (
          <div className="flex items-center gap-1.5 pb-2">
            <button
              type="button"
              onClick={() => setIsViewDischargeFileOpen(true)}
              className="px-2.5 py-1 text-xs rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1 transition-colors cursor-pointer font-bold"
              title="View the official inpatient discharge file, print, and inspect timestamped change history"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>View File</span>
              {selectedPatientDischargeSummary.changeHistory && selectedPatientDischargeSummary.changeHistory.length > 0 && (
                <span className="px-1.5 py-0.2 bg-indigo-200 text-indigo-900 rounded-full text-[10px] font-bold">
                  {selectedPatientDischargeSummary.changeHistory.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setPrintModal({
                  isOpen: true,
                  type: 'discharge_summary',
                  data: selectedPatientDischargeSummary
                });
              }}
              className="px-2.5 py-1 text-xs rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1 transition-colors cursor-pointer font-bold"
              title="Export official hospital discharge sheet as PDF"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export PDF</span>
            </button>
          </div>
        )}

        {/* Refer Patient Button */}
        <button
          type="button"
          onClick={() => {
            if (selectedPatient) {
              setIsReferralModalOpen(true);
            }
          }}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer font-bold ${
            selectedPatientReferral
              ? 'border-amber-600 text-amber-700 hover:text-amber-800'
              : 'border-indigo-600 text-indigo-700 hover:text-indigo-800'
          }`}
          title={selectedPatientReferral ? 'Review or edit patient referral form' : 'Refer patient to external hospital'}
        >
          <Ambulance className="w-3.5 h-3.5" />
          <span>{selectedPatientReferral ? 'Edit Referral Form' : 'Refer Patient'}</span>
          {selectedPatientReferral ? (
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
              Referred
            </span>
          ) : (
            <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold">
              Referral
            </span>
          )}
        </button>

        {/* View & Print Referral Option */}
        {selectedPatientReferral && (
          <div className="flex items-center gap-1.5 pb-2">
            <button
              type="button"
              onClick={() => setIsViewReferralFileOpen(true)}
              className="px-2.5 py-1 text-xs rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1 transition-colors cursor-pointer font-bold"
              title="View the official referral file, print, and export PDF"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>View Referral</span>
              {selectedPatientReferral.changeHistory && selectedPatientReferral.changeHistory.length > 0 && (
                <span className="px-1.5 py-0.2 bg-indigo-200 text-indigo-900 rounded-full text-[10px] font-bold">
                  {selectedPatientReferral.changeHistory.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setPrintModal({
                  isOpen: true,
                  type: 'referral_form',
                  data: selectedPatientReferral
                });
              }}
              className="px-2.5 py-1 text-xs rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1 transition-colors cursor-pointer font-bold"
              title="Export official hospital referral form as PDF"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export PDF</span>
            </button>
          </div>
        )}

        {/* Report Deceased / Death Certificate Button */}
        <button
          type="button"
          onClick={() => {
            if (selectedPatient) {
              setIsReportDeceasedModalOpen(true);
            }
          }}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer font-bold ${
            isSelectedPatientDeceased
              ? 'border-rose-700 text-rose-700 hover:text-rose-800'
              : 'border-rose-600 text-rose-600 hover:text-rose-700'
          }`}
          title={isSelectedPatientDeceased ? 'Review or amend official Medical Certificate of Cause of Death' : 'Declare death and certify medical cause of death'}
        >
          <HeartCrack className="w-3.5 h-3.5" />
          <span>{isSelectedPatientDeceased ? 'Edit Death Cert' : 'Report Deceased'}</span>
          {isSelectedPatientDeceased && (
            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold">
              Deceased
            </span>
          )}
        </button>

        {/* View & Print Death Certificate Option */}
        {selectedPatientDeathCert && (
          <div className="flex items-center gap-1.5 pb-2">
            <button
              type="button"
              onClick={() => setIsViewDeathCertModalOpen(true)}
              className="px-2.5 py-1 text-xs rounded-md bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200 flex items-center gap-1 transition-colors cursor-pointer font-bold"
              title="View the official death certificate, print, and export PDF"
            >
              <Eye className="w-3.5 h-3.5 text-slate-700" />
              <span>View Cert</span>
              {selectedPatientDeathCert.changeHistory && selectedPatientDeathCert.changeHistory.length > 0 && (
                <span className="px-1.5 py-0.2 bg-slate-300 text-slate-900 rounded-full text-[10px] font-bold">
                  {selectedPatientDeathCert.changeHistory.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setPrintModal({
                  isOpen: true,
                  type: 'death_certificate',
                  data: selectedPatientDeathCert
                });
              }}
              className="px-2.5 py-1 text-xs rounded-md bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 flex items-center gap-1 transition-colors cursor-pointer font-bold"
              title="Export official Medical Certificate of Cause of Death as PDF"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              <span>Export PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Clinical Consultation */}
      {activeTab === 'consultation' && (
        <div className="space-y-4">
          {/* Returning Patient Revisit Banner */}
          {selectedPatient?.isRevisit && (
            <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-slate-50 border-2 border-purple-200 rounded-xl space-y-2 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-purple-950 text-xs uppercase tracking-wide">
                        Patient Revisit Notice &bull; Visit #{selectedPatient.visits?.length || (selectedPatient.revisitCount ? selectedPatient.revisitCount + 1 : 2)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                        Active {selectedPatient.patientType || 'OPD'} No: {selectedPatient.mrn}
                      </span>
                      {selectedPatient.initialMrn && selectedPatient.initialMrn !== selectedPatient.mrn && (
                        <span className="text-[10px] text-purple-700">
                          (First Visit: <strong className="font-mono">{selectedPatient.initialMrn}</strong>)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-purple-800 mt-0.5">
                      This patient is returning to the clinic. All prior consultations, lab tests, prescriptions, and radiology reports are available in the history tab.
                      {selectedPatient.notes && (
                        <span className="ml-1 text-purple-950 font-semibold">&ldquo;{selectedPatient.notes}&rdquo;</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View Past Visits ({selectedPatient.visits?.length || 1})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Edit Mode Banner */}
          {editingEncounterId && (() => {
            const currentEditingEncounter = patientEncounters.find(e => e.id === editingEncounterId);
            return (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-950 text-xs">
                          Editing Saved Clinical Encounter ({editingEncounterId})
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/90 text-amber-900 border border-amber-300">
                          Active Edit Mode
                        </span>
                        {currentEditingEncounter?.editHistory && currentEditingEncounter.editHistory.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            {currentEditingEncounter.editHistory.length} previous {currentEditingEncounter.editHistory.length === 1 ? 'revision' : 'revisions'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-amber-900 mt-0.5">
                        Originally created by <strong>Dr. {currentEditingEncounter?.doctorName || 'Clinician'}</strong> on <strong>{currentEditingEncounter?.visitDate}</strong>
                        {currentEditingEncounter?.updatedAt && (
                          <span className="ml-2 text-amber-800">
                            &bull; Last modified by <strong>{currentEditingEncounter.updatedBy || 'Doctor'}</strong> on {new Date(currentEditingEncounter.updatedAt).toLocaleDateString()} at {new Date(currentEditingEncounter.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetEncounterForm}
                      className="px-3 py-1.5 bg-white hover:bg-amber-100/70 text-amber-900 border border-amber-300 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel Edit (Start New)
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quick Saved Encounters Selector */}
          {selectedPatient && patientEncounters.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-600" />
                  Saved Encounters for {selectedPatient.firstName} ({patientEncounters.length}):
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {patientEncounters.map((enc, idx) => {
                  const isCurrent = editingEncounterId === enc.id;
                  return (
                    <button
                      key={enc.id}
                      type="button"
                      onClick={() => handleLoadEncounterForEditing(enc)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-amber-500 border-amber-600 text-white shadow-2xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                      }`}
                      title={`Click to edit encounter from ${enc.visitDate}: ${enc.workingDiagnosis}`}
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                      <span>{enc.visitDate}: {enc.workingDiagnosis || 'Encounter'}</span>
                      {idx === 0 && <span className="text-[9px] opacity-75 font-normal">(Latest)</span>}
                    </button>
                  );
                })}
                {editingEncounterId && (
                  <button
                    type="button"
                    onClick={handleResetEncounterForm}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-50 border border-sky-300 text-sky-700 hover:bg-sky-100 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ New Consultation</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Diagnostic Investigation Results & Prime Admin Cloud Attachments in Consultation */}
          {(patientTestOrders.length > 0 || patientRadOrders.length > 0) && (() => {
            const totalAttachments = patientTestOrders.reduce((sum, t) => sum + (t.attachments?.length || 0), 0) +
              patientRadOrders.reduce((sum, r) => sum + (r.attachments?.length || 0), 0);

            const displayLabTests = consultationDiagFilter === 'all'
              ? patientTestOrders
              : consultationDiagFilter === 'attachments'
              ? patientTestOrders.filter(t => t.attachments && t.attachments.length > 0)
              : consultationDiagFilter === 'pathology'
              ? patientTestOrders
              : [];

            const displayRadScans = consultationDiagFilter === 'all'
              ? patientRadOrders
              : consultationDiagFilter === 'attachments'
              ? patientRadOrders.filter(r => r.attachments && r.attachments.length > 0)
              : consultationDiagFilter === 'radiology'
              ? patientRadOrders
              : [];

            return (
              <div className="bg-gradient-to-r from-sky-50/70 via-indigo-50/40 to-slate-50 border border-sky-200 rounded-xl p-4 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
                      <FlaskConical className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                          Patient Diagnostic Results & Prime Cloud Attachments
                        </span>
                        {totalAttachments > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Paperclip className="w-3 h-3 text-emerald-600" />
                            {totalAttachments} Cloud Document{totalAttachments > 1 ? 's' : ''} Attached
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {patientTestOrders.length} Lab / {patientRadOrders.length} Imaging
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Review investigations, parameter readings, and verified attachments saved in the Prime Admin Cloud account for {selectedPatient?.firstName} {selectedPatient?.lastName}.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex rounded-md border border-slate-300 overflow-hidden bg-white text-[11px]">
                      <button
                        type="button"
                        onClick={() => setConsultationDiagFilter('all')}
                        className={`px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                          consultationDiagFilter === 'all' ? 'bg-sky-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        All ({patientTestOrders.length + patientRadOrders.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsultationDiagFilter('attachments')}
                        className={`px-2.5 py-1 font-semibold transition-colors cursor-pointer border-l border-slate-200 ${
                          consultationDiagFilter === 'attachments' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Attached Files ({totalAttachments})
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsultationDiagFilter('pathology')}
                        className={`px-2.5 py-1 font-semibold transition-colors cursor-pointer border-l border-slate-200 ${
                          consultationDiagFilter === 'pathology' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Lab ({patientTestOrders.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsultationDiagFilter('radiology')}
                        className={`px-2.5 py-1 font-semibold transition-colors cursor-pointer border-l border-slate-200 ${
                          consultationDiagFilter === 'radiology' ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Imaging ({patientRadOrders.length})
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowConsultationDiagnostics(!showConsultationDiagnostics)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {showConsultationDiagnostics ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> Expand
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {showConsultationDiagnostics && (
                  <div className="space-y-3 pt-2 border-t border-sky-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Pathology Tests Cards */}
                      {displayLabTests.map(t => {
                        const isCompleted = t.status === 'completed';
                        const hasAttachments = t.attachments && t.attachments.length > 0;
                        return (
                          <div
                            key={t.id}
                            className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="p-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                    <Microscope className="w-3 h-3" />
                                  </span>
                                  <strong className="text-slate-900 text-xs">{t.testName}</strong>
                                  <span className="font-mono text-[10px] text-slate-400">({t.testCode})</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Ordered: {new Date(t.orderedAt).toLocaleDateString()} &bull; Priority: {t.priority}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {t.status.replace('_', ' ')}
                                </span>
                                {isCompleted && (
                                  <button
                                    type="button"
                                    onClick={() => setPrintModal({ isOpen: true, type: 'lab_report', data: t })}
                                    className="p-1 px-2 bg-slate-900 text-white rounded text-[10px] font-bold hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                                    title="Export certified pathology PDF report"
                                  >
                                    <Download className="w-2.5 h-2.5" /> Export PDF
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Parameter Summary / Findings */}
                            {t.results && t.results.length > 0 && (
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                                <div className="text-[10px] font-bold text-slate-600 uppercase">
                                  Recorded Parameters ({t.results.length}):
                                </div>
                                <div className="space-y-0.5 max-h-28 overflow-y-auto pr-1">
                                  {t.results.map((r, i) => (
                                    <div key={i} className="flex items-center justify-between text-[11px]">
                                      <span className="text-slate-700 truncate max-w-[140px]">{r.parameter}</span>
                                      <div className="flex items-center gap-1.5">
                                        <span className={`font-bold ${r.flag !== 'Normal' ? 'text-rose-600' : 'text-slate-900'}`}>
                                          {r.value} {r.unit}
                                        </span>
                                        {r.flag !== 'Normal' && (
                                          <span className="px-1 py-0.2 bg-rose-100 text-rose-800 font-bold text-[9px] rounded">
                                            {r.flag}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {t.labTechnicianNotes && (
                              <div className="text-[10px] text-amber-900 bg-amber-50 p-2 rounded border border-amber-200">
                                <strong className="font-semibold">Pathologist Remarks:</strong> {t.labTechnicianNotes}
                              </div>
                            )}

                            {/* Attached Lab Documents */}
                            {hasAttachments && (
                              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1.5">
                                <div className="flex items-center justify-between text-[10px] font-bold text-emerald-950">
                                  <span className="flex items-center gap-1">
                                    <Paperclip className="w-3 h-3 text-emerald-600" />
                                    Attached Patient Lab Documents ({t.attachments?.length}):
                                  </span>
                                  <span className="text-[9px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-semibold">
                                    Prime Admin Cloud
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  {t.attachments?.map((att) => (
                                    <div
                                      key={att.id}
                                      className="flex items-center justify-between p-1.5 bg-white rounded border border-emerald-200 text-[11px]"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        {att.type.startsWith('image/') ? (
                                          <img
                                            src={att.dataUrl}
                                            alt={att.name}
                                            className="w-6 h-6 rounded object-cover border border-slate-200 shrink-0"
                                          />
                                        ) : (
                                          <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                                        )}
                                        <span className="font-semibold text-slate-800 truncate text-[11px] max-w-[130px]" title={att.name}>
                                          {att.name}
                                        </span>
                                        <span className="text-[9px] text-slate-400">
                                          ({(att.size / 1024).toFixed(0)} KB)
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => setViewingAttachment({ attachment: att, patientName: t.patientName, orderTitle: t.testName })}
                                          className="p-1 px-1.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded flex items-center gap-1 cursor-pointer"
                                          title="View attachment full-screen"
                                        >
                                          <Eye className="w-2.5 h-2.5" /> View
                                        </button>
                                        <a
                                          href={att.dataUrl}
                                          download={att.name}
                                          className="p-1 text-slate-500 hover:text-emerald-700 rounded cursor-pointer"
                                          title="Download attachment"
                                        >
                                          <Download className="w-3 h-3" />
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Radiology Scans Cards */}
                      {displayRadScans.map(r => {
                        const isCompleted = r.status === 'completed';
                        const hasAttachments = r.attachments && r.attachments.length > 0;
                        return (
                          <div
                            key={r.id}
                            className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="p-1 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
                                    <Film className="w-3 h-3" />
                                  </span>
                                  <strong className="text-slate-900 text-xs">{r.procedureName}</strong>
                                  <span className="font-mono text-[10px] text-slate-400">({r.modality})</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Ordered: {new Date(r.orderedAt).toLocaleDateString()} &bull; Body Part: {r.bodyPart}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {r.status}
                                </span>
                                {isCompleted && (
                                  <button
                                    type="button"
                                    onClick={() => setPrintModal({ isOpen: true, type: 'radiology_report', data: r })}
                                    className="p-1 px-2 bg-slate-900 text-white rounded text-[10px] font-bold hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                                    title="Export certified radiology PDF report"
                                  >
                                    <Download className="w-2.5 h-2.5" /> Export PDF
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Findings & Impressions */}
                            {r.impression && (
                              <div className="p-2 bg-cyan-50 rounded-lg border border-cyan-200 text-[11px] text-cyan-950">
                                <span className="font-bold text-[10px] uppercase text-cyan-900 block mb-0.5">Diagnostic Impression:</span>
                                {r.impression}
                              </div>
                            )}

                            {r.findings && !r.impression && (
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-800">
                                <span className="font-bold text-[10px] uppercase text-slate-700 block mb-0.5">Findings:</span>
                                {r.findings}
                              </div>
                            )}

                            {/* Attached Scan Documents */}
                            {hasAttachments && (
                              <div className="p-2.5 bg-cyan-50/70 border border-cyan-200 rounded-lg space-y-1.5">
                                <div className="flex items-center justify-between text-[10px] font-bold text-cyan-950">
                                  <span className="flex items-center gap-1">
                                    <Paperclip className="w-3 h-3 text-cyan-600" />
                                    Attached Diagnostic Scans & Images ({r.attachments?.length}):
                                  </span>
                                  <span className="text-[9px] text-cyan-800 bg-cyan-100 px-1.5 py-0.2 rounded font-semibold">
                                    Prime Admin Cloud
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  {r.attachments?.map((att) => (
                                    <div
                                      key={att.id}
                                      className="flex items-center justify-between p-1.5 bg-white rounded border border-cyan-200 text-[11px]"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        {att.type.startsWith('image/') ? (
                                          <img
                                            src={att.dataUrl}
                                            alt={att.name}
                                            className="w-6 h-6 rounded object-cover border border-slate-200 shrink-0"
                                          />
                                        ) : (
                                          <Film className="w-5 h-5 text-cyan-600 shrink-0" />
                                        )}
                                        <span className="font-semibold text-slate-800 truncate text-[11px] max-w-[130px]" title={att.name}>
                                          {att.name}
                                        </span>
                                        <span className="text-[9px] text-slate-400">
                                          ({(att.size / 1024).toFixed(0)} KB)
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => setViewingAttachment({ attachment: att, patientName: r.patientName, orderTitle: r.procedureName })}
                                          className="p-1 px-1.5 text-[10px] font-bold bg-cyan-100 text-cyan-800 hover:bg-cyan-200 rounded flex items-center gap-1 cursor-pointer"
                                          title="View scan/document full-screen"
                                        >
                                          <Eye className="w-2.5 h-2.5" /> View
                                        </button>
                                        <a
                                          href={att.dataUrl}
                                          download={att.name}
                                          className="p-1 text-slate-500 hover:text-cyan-700 rounded cursor-pointer"
                                          title="Download attachment"
                                        >
                                          <Download className="w-3 h-3" />
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <form onSubmit={handleSaveEncounter} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chief Complaint & Duration *</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Fever and productive cough for 4 days..."
                  value={encounterForm.chiefComplaint}
                  onChange={(e) => setEncounterForm({ ...encounterForm, chiefComplaint: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-sky-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">History of Present Illness (HPI)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Associated with chills, no shortness of breath, aggravated at night..."
                  value={encounterForm.historyOfPresentIllness}
                  onChange={(e) => setEncounterForm({ ...encounterForm, historyOfPresentIllness: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>
            </div>

            {/* Examination Findings: General & Systemic */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-sky-600" />
                Physical Examination Performed
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">General State / Appearance</label>
                  <input
                    type="text"
                    placeholder="e.g. Conscious, alert, oriented, mild pallor, no jaundice, hydrated"
                    value={encounterForm.generalExam}
                    onChange={(e) => setEncounterForm({ ...encounterForm, generalExam: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Systemic Examination (CVS / RS / GIT / CNS)</label>
                  <input
                    type="text"
                    placeholder="e.g. Chest: bilateral vesicular sounds; CVS: S1+S2 dual; Abdomen: soft"
                    value={encounterForm.systemicExam}
                    onChange={(e) => setEncounterForm({ ...encounterForm, systemicExam: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Detailed Examination Notes & Observations</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Bilateral lower lung fields with fine inspiratory crackles. ENT: hyperemic posterior pharyngeal wall with no tonsillar exudate."
                  value={encounterForm.physicalExamNotes}
                  onChange={(e) => setEncounterForm({ ...encounterForm, physicalExamNotes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                />
              </div>
            </div>

            {/* Diagnoses: Working Diagnosis & Differential */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-lg">
                <label className="block font-bold text-sky-900 mb-1">Working Clinical Diagnosis *</label>
                <input
                  type="text"
                  placeholder="e.g. Acute Community-Acquired Pneumonia / Viral URTI"
                  value={encounterForm.workingDiagnosis}
                  onChange={(e) => setEncounterForm({ ...encounterForm, workingDiagnosis: e.target.value })}
                  className="w-full p-2 border border-sky-300 rounded bg-white font-semibold text-slate-900"
                  required
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="block font-bold text-slate-700 mb-1">Differential Diagnoses</label>
                <input
                  type="text"
                  placeholder="e.g. Acute Bronchitis, Pulmonary Tuberculosis, Viral Pharyngitis"
                  value={encounterForm.differentialDiagnosis}
                  onChange={(e) => setEncounterForm({ ...encounterForm, differentialDiagnosis: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                />
              </div>
            </div>

            {/* Clinical Plan & Workup Strategy */}
            <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-indigo-950">Clinical Workplan, Orders & Management Strategy</label>
                {(selectedPatient?.patientType === 'IPD' || (selectedPatient as any)?.admissionType === 'IPD') ? (
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                    🏷️ IPD: Routes to Nursing Dashboard
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded border border-indigo-200">
                    Auto-transfers to Pharmacy for Cart Population
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                placeholder="e.g. Order CBC and Chest X-Ray PA View.&#10;1. Start Tab. Azithromycin 500mg OD x 3 days&#10;2. Tab. Paracetamol 1g TDS PRN&#10;3. Oral fluid hydration & rest&#10;Review with lab reports."
                value={encounterForm.clinicalPlan}
                onChange={(e) => setEncounterForm({ ...encounterForm, clinicalPlan: e.target.value })}
                className="w-full p-2.5 border border-indigo-200 rounded-lg bg-white text-slate-900 text-xs focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-600">
                {(selectedPatient?.patientType === 'IPD' || (selectedPatient as any)?.admissionType === 'IPD') ? (
                  <span className="text-purple-800 font-medium">
                    🏷️ <strong>IPD Inpatient Flow:</strong> Clinical workplan & prescription orders entered here will be sent directly to the <strong>Nursing Dashboard</strong>, where the ward nurse populates the patient checklist treatment chart for drug administration.
                  </span>
                ) : (
                  <span>
                    Prescription medications & clinical orders entered here are copied and routed directly to the <strong>Pharmacy Dashboard</strong>, where the pharmacist populates and allocates items into Direct (OPD) carts for dispensing.
                  </span>
                )}
              </p>
            </div>

            {/* When in Edit Mode: Reason for Modification / Clinical Addendum */}
            {editingEncounterId && (
              <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-amber-950 text-xs flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-amber-600" />
                    Clinical Reason for Revision / Addendum Note
                  </label>
                  <span className="text-[10px] text-amber-800 font-semibold bg-amber-200/70 px-2 py-0.5 rounded border border-amber-300">
                    Audit Log Entry
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Adjusted diagnosis and treatment plan following lab results and clinical reassessment"
                  value={editReasonNote}
                  onChange={(e) => setEditReasonNote(e.target.value)}
                  className="w-full p-2 border border-amber-300 rounded bg-white text-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[10px] text-amber-800">
                  Your name (<strong>{currentUser.name}</strong>), role (<strong>{currentUser.role}</strong>), and the exact timestamp will be permanently attached to this encounter revision record.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500 text-[11px]">
                {editingEncounterId
                  ? 'Modifying previously saved encounter updates the workup record and logs user audit timestamps.'
                  : 'Saving encounter registers consultation fee ($50.00) on the patient ledger and generates a printable Workup Card.'}
              </span>
              <div className="flex items-center gap-2">
                {editingEncounterId && (
                  <button
                    type="button"
                    onClick={handleResetEncounterForm}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className={`px-6 py-2.5 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                    editingEncounterId
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-sky-600 hover:bg-sky-700'
                  }`}
                >
                  {editingEncounterId ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Save & Update Clinical Encounter Changes
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Save Clinical Encounter & Create Workup Card
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Quick Workup Card Preview if patient already has saved encounters */}
          {selectedPatient && patientEncounters.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-700 text-xs">Latest Saved Workup Card for {selectedPatient.firstName}:</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('workup')}
                  className="text-indigo-600 hover:text-indigo-800 font-bold text-xs underline cursor-pointer"
                >
                  Open Workup Workspace ({patientEncounters.length} Saved) &rarr;
                </button>
              </div>
              <ClinicalWorkupCard
                currentEncounter={patientEncounters[0]}
                patientEncounters={patientEncounters}
                selectedPatient={selectedPatient}
                onEditEncounter={handleLoadEncounterForEditing}
                onPrintWorkup={(enc) => setPrintModal({ isOpen: true, type: 'workup', data: enc })}
              />
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Dedicated Clinical Workup Card View */}
      {activeTab === 'workup' && selectedPatient && (
        <ClinicalWorkupCard
          currentEncounter={patientEncounters[0] || null}
          patientEncounters={patientEncounters}
          selectedPatient={selectedPatient}
          onEditEncounter={handleLoadEncounterForEditing}
          onPrintWorkup={(enc) => setPrintModal({ isOpen: true, type: 'workup', data: enc })}
        />
      )}

      {/* Tab 3: Clinical Procedures Manager */}
      {activeTab === 'procedures' && (
        selectedPatient ? (
          <ProceduresManager
            selectedPatient={selectedPatient}
            onPrintProcedure={(proc) => setPrintModal({ isOpen: true, type: 'procedure', data: proc })}
          />
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-center justify-between">
              <span>Select a patient from the queue or active consultations to record clinical procedures, or manage master procedure inventory and insurance company tariffs below.</span>
            </div>
            <ProcedureInventoryManager />
          </div>
        )
      )}

      {/* Tab 4: Order Pathology Tests (Multi-Selection Suite) */}
      {activeTab === 'pathology' && (
        <div className="space-y-4 text-xs">
          {/* Header & Requisition Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <Microscope className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  Pathology Multi-Investigation Requisition
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Select multiple diagnostic investigations for {selectedPatient?.firstName} {selectedPatient?.lastName} ({selectedPatient?.mrn}). Orders are automatically dispatched to the Laboratory Queue.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full font-bold text-xs border flex items-center gap-1.5 ${
                selectedLabTests.length > 0
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <ListChecks className="w-3.5 h-3.5" />
                <span>{selectedLabTests.length} Test{selectedLabTests.length === 1 ? '' : 's'} Selected</span>
                {selectedLabTests.length > 0 && (
                  <span className="font-mono font-black text-amber-900 border-l border-amber-300 pl-1.5">
                    ${selectedLabTests.reduce((sum, t) => sum + t.cost, 0).toFixed(2)}
                  </span>
                )}
              </span>

              {selectedLabTests.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllLabTests}
                  className="px-2.5 py-1 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer text-[11px] flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowCustomLabForm(!showCustomLabForm)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors cursor-pointer text-[11px] flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                {showCustomLabForm ? 'Close Custom' : 'Add Unlisted Test'}
              </button>
            </div>
          </div>

          {/* Quick Preset Diagnostic Bundles */}
          <div className="bg-amber-50/40 rounded-xl border border-amber-200/80 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                1-Click Clinical Screening Panels / Bundles
              </span>
              <span className="text-[10px] text-amber-700 font-medium">Click any panel to batch-toggle items</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {LAB_BUNDLES.map(bundle => {
                const bundleMatches = availablePathologyTests.filter(t => 
                  bundle.matchKeys.some(k => 
                    t.name.toLowerCase().includes(k.toLowerCase()) || 
                    t.code.toLowerCase().includes(k.toLowerCase())
                  )
                );
                const allSelected = bundleMatches.length > 0 && bundleMatches.every(m => isLabTestSelected(m.id));
                const someSelected = bundleMatches.some(m => isLabTestSelected(m.id));

                return (
                  <button
                    key={bundle.id}
                    type="button"
                    onClick={() => applyLabBundle(bundle)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      allSelected
                        ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                        : someSelected
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-white hover:bg-amber-50/60 border-amber-200/60 text-slate-800'
                    }`}
                  >
                    <span className="text-base leading-none">{bundle.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`font-bold text-[11px] truncate ${allSelected ? 'text-white' : 'text-slate-900'}`}>
                          {bundle.name}
                        </span>
                        {allSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                      </div>
                      <p className={`text-[10px] truncate ${allSelected ? 'text-amber-100' : 'text-slate-500'}`}>
                        {bundle.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Lab Test Inline Form */}
          {showCustomLabForm && (
            <form onSubmit={handleAddCustomLabTest} className="bg-slate-900 text-white rounded-xl p-4 space-y-3 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add Custom / Unlisted Pathology Investigation
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomLabForm(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Test Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Serum Ferritin / Anti-dsDNA"
                    value={customLabForm.name}
                    onChange={(e) => setCustomLabForm({ ...customLabForm, name: e.target.value })}
                    className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={customLabForm.category}
                    onChange={(e) => setCustomLabForm({ ...customLabForm, category: e.target.value as any })}
                    className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white text-xs"
                  >
                    <option value="Hematology">Hematology</option>
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Immunology">Immunology</option>
                    <option value="Parasitology">Parasitology</option>
                    <option value="Serology">Serology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Fee ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={customLabForm.cost}
                    onChange={(e) => setCustomLabForm({ ...customLabForm, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white text-xs font-bold font-mono"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCustomLabForm(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg cursor-pointer"
                >
                  Add to Requisition List
                </button>
              </div>
            </form>
          )}

          {/* Main 2-Column Interface: Catalog Selector + Requisition Basket */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Test Catalog with Search, Filters & Multi-Selection (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  Available Tests Catalog ({availablePathologyTests.length})
                </span>
                <span className="text-[10px] text-slate-500">
                  Click any card or checkbox to add/remove
                </span>
              </div>

              {/* Insurance Policy Active Banner */}
              {(selectedPatient?.insurancePolicyName || selectedPatient?.insuranceProvider) && (
                <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Insurance Tariff Scheme: <strong>{selectedPatient.insurancePolicyName || selectedPatient.insuranceProvider}</strong></span>
                  </div>
                  <span className="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded font-semibold">
                    Tariff Rates Active
                  </span>
                </div>
              )}

              {/* Search & Category Filter Pills */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by test name, code (e.g. CBC, ESR, Malaria, LFT, Lipid)..."
                    value={labSearchQuery}
                    onChange={(e) => setLabSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-amber-500"
                  />
                  {labSearchQuery && (
                    <button
                      onClick={() => setLabSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                  {['ALL', 'Hematology', 'Biochemistry', 'Microbiology', 'Parasitology', 'Serology', 'Immunology'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setLabCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                        labCategoryFilter === cat
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Read-Optimized Pagination for Pathology Catalog (Initial 5, then groups of 10) */}
              <GroupPaginationTopBar
                pagination={labCatalogPagination}
                onSelectPage={handleSelectLabCatalogGroup}
                itemNoun="test(s)"
                accentColor="amber"
              />

              {/* Catalog Items List with Checkboxes */}
              <div className="space-y-1.5">
                {labCatalogPagination.visibleItems.map(test => {
                    const selected = isLabTestSelected(test.id);
                    const patientPolicy = selectedPatient?.insurancePolicyName || selectedPatient?.insuranceProvider;
                    const effectivePrice = getTestPrice(test, patientPolicy);
                    const isInsurance = Boolean(patientPolicy && effectivePrice !== test.price);

                    return (
                      <div
                        key={test.id}
                        onClick={() => toggleLabTest(test)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          selected
                            ? 'bg-amber-50/80 border-amber-400 text-amber-950 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {}} // handled by parent div onClick
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-900 truncate">
                              {test.name}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                                {test.code}
                              </span>
                              <span>&bull;</span>
                              <span className="text-amber-800 font-medium">{test.category}</span>
                              {test.sampleOrBodyPart && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-slate-500">{test.sampleOrBodyPart}</span>
                                </>
                              )}
                              {test.turnaroundTime && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-emerald-700">{test.turnaroundTime}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold text-xs text-slate-900 font-mono">
                            ${effectivePrice.toFixed(2)}
                          </div>
                          {isInsurance ? (
                            <span className="block text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded mt-0.5">
                              {patientPolicy} (Std: ${test.price.toFixed(2)})
                            </span>
                          ) : (
                            <span className={`text-[10px] font-medium ${selected ? 'text-amber-700 font-bold' : 'text-slate-400'}`}>
                              {selected ? 'Selected' : '+ Add'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <GroupPaginationBottomBar
                pagination={labCatalogPagination}
                onSelectPage={handleSelectLabCatalogGroup}
                itemNoun="test(s)"
                accentColor="amber"
              />
            </div>

            {/* Right Column: Selected Requisition Basket & Dispatch Form (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
                    Selected Tests ({selectedLabTests.length})
                  </h4>
                  <span className="text-xs font-mono font-black text-amber-900">
                    Total: ${selectedLabTests.reduce((sum, t) => sum + t.cost, 0).toFixed(2)}
                  </span>
                </div>

                {/* Selected Items Tray */}
                {selectedLabTests.length === 0 ? (
                  <div className="p-6 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                    <Microscope className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">No Tests Selected Yet</p>
                    <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                      Click tests from the catalog on the left or select a 1-click clinical screening bundle.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                    {selectedLabTests.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-2 rounded-lg bg-amber-50/60 border border-amber-200/80 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {index + 1}. {item.testName}
                          </div>
                          <div className="text-[10px] text-amber-900 flex items-center gap-1.5">
                            <span className="font-mono">{item.testCode}</span>
                            <span>&bull;</span>
                            <span>{item.category}</span>
                            {item.isInsurancePrice && item.insurancePolicyName && (
                              <span className="px-1 py-0.2 bg-indigo-100 text-indigo-800 rounded text-[9px] font-bold">
                                {item.insurancePolicyName}
                              </span>
                            )}
                            {item.isCustom && (
                              <span className="px-1 py-0.2 bg-amber-200 text-amber-900 rounded text-[9px] font-bold">
                                Custom
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            ${item.cost.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeLabTest(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Remove test"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Priority Selection */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Investigation Priority</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['Routine', 'Urgent', 'STAT'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setLabPriority(p)}
                        className={`py-1.5 px-2 rounded-md font-bold text-[11px] border text-center transition-all cursor-pointer ${
                          labPriority === p
                            ? p === 'STAT'
                              ? 'bg-rose-600 border-rose-700 text-white shadow-xs'
                              : p === 'Urgent'
                              ? 'bg-amber-600 border-amber-700 text-white shadow-xs'
                              : 'bg-slate-800 border-slate-900 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Clinical Indication Chips */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Clinical Indication & Relevant History *
                  </label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {[
                      'Suspected Malaria & Febrile Illness',
                      'Routine Wellness Health Check',
                      'Anemia / Fatigue Investigation',
                      'Renal & Metabolic Monitoring',
                      'Pre-Operative Clearance'
                    ].map(chip => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setLabClinicalIndication(prev => prev ? `${prev}; ${chip}` : chip)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 rounded text-[10px] font-medium transition-colors cursor-pointer"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    placeholder="e.g. Patient presents with high-grade intermittent fever, chills, and fatigue. Evaluate for malaria parasites and microcytic anemia..."
                    value={labClinicalIndication}
                    onChange={(e) => setLabClinicalIndication(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Submit Dispatch Action */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={selectedLabTests.length === 0}
                  onClick={handleOrderLabTests}
                  className={`w-full py-2.5 font-bold rounded-lg shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all ${
                    selectedLabTests.length > 0
                      ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Microscope className="w-4 h-4" />
                  <span>
                    Dispatch {selectedLabTests.length} Investigation{selectedLabTests.length === 1 ? '' : 's'} to Lab (${selectedLabTests.reduce((sum, t) => sum + t.cost, 0).toFixed(2)})
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Patient's Existing Pathology Orders & Attached Cloud Documents */}
          {patientTestOrders.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                    <Microscope className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Existing Pathology Orders & Results for {selectedPatient?.firstName} {selectedPatient?.lastName} ({patientTestOrders.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Review previous test results and document attachments saved in Prime Admin Cloud.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {patientTestOrders.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{t.testName}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(t.orderedAt).toLocaleDateString()} &bull; Priority: {t.priority} &bull; Dr. {t.doctorName}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                        {t.status === 'completed' && (
                          <button
                            type="button"
                            onClick={() => setPrintModal({ isOpen: true, type: 'lab_report', data: t })}
                            className="p-1 px-1.5 bg-slate-900 text-white rounded text-[10px] font-bold hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                            title="Export certified pathology PDF report"
                          >
                            <Download className="w-2.5 h-2.5" /> PDF
                          </button>
                        )}
                      </div>
                    </div>

                    {t.results && t.results.length > 0 && (
                      <div className="text-[11px] bg-white p-2 rounded border border-slate-200 space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Parameters:</div>
                        {t.results.slice(0, 3).map((r, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-slate-600 truncate max-w-[150px]">{r.parameter}</span>
                            <span className={`font-semibold ${r.flag !== 'Normal' ? 'text-rose-600' : 'text-slate-900'}`}>
                              {r.value} {r.unit}
                            </span>
                          </div>
                        ))}
                        {t.results.length > 3 && (
                          <div className="text-[10px] text-slate-400 italic">+{t.results.length - 3} more parameters</div>
                        )}
                      </div>
                    )}

                    {t.attachments && t.attachments.length > 0 && (
                      <div className="p-2 bg-emerald-50 rounded border border-emerald-200 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-emerald-950">
                          <span className="flex items-center gap-1">
                            <Paperclip className="w-3 h-3 text-emerald-600" /> Attached Documents ({t.attachments.length}):
                          </span>
                          <span className="text-[9px] text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded font-semibold">Prime Cloud</span>
                        </div>
                        {t.attachments.map((att) => (
                          <div key={att.id} className="flex items-center justify-between bg-white p-1.5 rounded border border-emerald-200 text-[11px]">
                            <span className="truncate max-w-[140px] font-medium text-slate-800">{att.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setViewingAttachment({ attachment: att, patientName: t.patientName, orderTitle: t.testName })}
                                className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded hover:bg-emerald-200 cursor-pointer"
                              >
                                View
                              </button>
                              <a href={att.dataUrl} download={att.name} className="p-0.5 text-slate-500 hover:text-emerald-700 cursor-pointer">
                                <Download className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Order Radiology Scans (Multi-Selection Suite) */}
      {activeTab === 'radiology' && (
        <div className="space-y-4 text-xs">
          {/* Header & Requisition Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200">
                  <Film className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  Radiology & Imaging Multi-Procedure Requisition
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Select multiple radiological imaging studies for {selectedPatient?.firstName} {selectedPatient?.lastName} ({selectedPatient?.mrn}). Orders are queued directly for the Radiology Technicians.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full font-bold text-xs border flex items-center gap-1.5 ${
                selectedRadScans.length > 0
                  ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <Scan className="w-3.5 h-3.5" />
                <span>{selectedRadScans.length} Procedure{selectedRadScans.length === 1 ? '' : 's'} Selected</span>
                {selectedRadScans.length > 0 && (
                  <span className="font-mono font-black text-cyan-900 border-l border-cyan-300 pl-1.5">
                    ${selectedRadScans.reduce((sum, s) => sum + s.cost, 0).toFixed(2)}
                  </span>
                )}
              </span>

              {selectedRadScans.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllRadScans}
                  className="px-2.5 py-1 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer text-[11px] flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowCustomRadForm(!showCustomRadForm)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors cursor-pointer text-[11px] flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                {showCustomRadForm ? 'Close Custom' : 'Add Unlisted Scan'}
              </button>
            </div>
          </div>

          {/* Quick Preset Imaging Bundles */}
          <div className="bg-cyan-50/40 rounded-xl border border-cyan-200/80 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-950 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                1-Click Radiological Imaging Protocols / Series
              </span>
              <span className="text-[10px] text-cyan-700 font-medium">Click any series to batch-toggle imaging procedures</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {RAD_BUNDLES.map(bundle => {
                const bundleMatches = availableRadiologyScans.filter(s => 
                  bundle.matchKeys.some(k => 
                    s.name.toLowerCase().includes(k.toLowerCase()) || 
                    s.code.toLowerCase().includes(k.toLowerCase()) ||
                    (s.sampleOrBodyPart && s.sampleOrBodyPart.toLowerCase().includes(k.toLowerCase()))
                  )
                );
                const allSelected = bundleMatches.length > 0 && bundleMatches.every(m => isRadScanSelected(m.id));
                const someSelected = bundleMatches.some(m => isRadScanSelected(m.id));

                return (
                  <button
                    key={bundle.id}
                    type="button"
                    onClick={() => applyRadBundle(bundle)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      allSelected
                        ? 'bg-cyan-600 border-cyan-700 text-white shadow-xs'
                        : someSelected
                        ? 'bg-cyan-100 border-cyan-300 text-cyan-900'
                        : 'bg-white hover:bg-cyan-50/60 border-cyan-200/60 text-slate-800'
                    }`}
                  >
                    <span className="text-base leading-none">{bundle.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`font-bold text-[11px] truncate ${allSelected ? 'text-white' : 'text-slate-900'}`}>
                          {bundle.name}
                        </span>
                        {allSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                      </div>
                      <p className={`text-[10px] truncate ${allSelected ? 'text-cyan-100' : 'text-slate-500'}`}>
                        {bundle.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Radiology Scan Inline Form */}
          {showCustomRadForm && (
            <form onSubmit={handleAddCustomRadScan} className="bg-slate-900 text-white rounded-xl p-4 space-y-3 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-xs text-cyan-400 flex items-center gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add Custom / Unlisted Radiological Procedure
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomRadForm(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Procedure Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. High-Resolution CT Chest / MRI Knee"
                    value={customRadForm.name}
                    onChange={(e) => setCustomRadForm({ ...customRadForm, name: e.target.value })}
                    className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Modality</label>
                  <select
                    value={customRadForm.modality}
                    onChange={(e) => setCustomRadForm({ ...customRadForm, modality: e.target.value as any })}
                    className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white text-xs"
                  >
                    <option value="X-Ray">X-Ray</option>
                    <option value="Ultrasound">Ultrasound</option>
                    <option value="CT Scan">CT Scan</option>
                    <option value="MRI">MRI</option>
                    <option value="Mammography">Mammography</option>
                    <option value="Fluoroscopy">Fluoroscopy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Fee ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={customRadForm.cost}
                    onChange={(e) => setCustomRadForm({ ...customRadForm, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white text-xs font-bold font-mono"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCustomRadForm(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold rounded-lg cursor-pointer"
                >
                  Add to Requisition List
                </button>
              </div>
            </form>
          )}

          {/* Main 2-Column Interface: Procedures Catalog + Requisition Basket */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Procedures Catalog with Search, Filters & Multi-Selection (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-600" />
                  Available Imaging Catalog ({availableRadiologyScans.length})
                </span>
                <span className="text-[10px] text-slate-500">
                  Click any procedure or checkbox to add/remove
                </span>
              </div>

              {/* Insurance Policy Active Banner */}
              {(selectedPatient?.insurancePolicyName || selectedPatient?.insuranceProvider) && (
                <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Insurance Tariff Scheme: <strong>{selectedPatient.insurancePolicyName || selectedPatient.insuranceProvider}</strong></span>
                  </div>
                  <span className="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded font-semibold">
                    Tariff Rates Active
                  </span>
                </div>
              )}

              {/* Search & Modality Filter Pills */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by procedure name, modality, body part (e.g. Chest, Abdomen, Brain, Spine, Pelvis)..."
                    value={radSearchQuery}
                    onChange={(e) => setRadSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-cyan-500"
                  />
                  {radSearchQuery && (
                    <button
                      onClick={() => setRadSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Modality Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                  {['ALL', 'X-Ray', 'Ultrasound', 'CT Scan', 'MRI', 'Mammography'].map(mod => (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => setRadModalityFilter(mod)}
                      className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                        radModalityFilter === mod
                          ? 'bg-cyan-600 text-white font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {mod}
                    </button>
                  ))}
                </div>
              </div>

              {/* Read-Optimized Pagination for Radiology Catalog (Initial 5, then groups of 10) */}
              <GroupPaginationTopBar
                pagination={radCatalogPagination}
                onSelectPage={handleSelectRadCatalogGroup}
                itemNoun="procedure(s)"
                accentColor="cyan"
              />

              {/* Catalog Items List with Checkboxes */}
              <div className="space-y-1.5">
                {radCatalogPagination.visibleItems.map(scan => {
                    const selected = isRadScanSelected(scan.id);
                    const patientPolicy = selectedPatient?.insurancePolicyName || selectedPatient?.insuranceProvider;
                    const effectivePrice = getTestPrice(scan, patientPolicy);
                    const isInsurance = Boolean(patientPolicy && effectivePrice !== scan.price);
                    const modality = (scan.category === 'CT Scan' ? 'CT Scan' : scan.category === 'Ultrasound' ? 'Ultrasound' : scan.category === 'MRI' ? 'MRI' : 'X-Ray');
                    
                    return (
                      <div
                        key={scan.id}
                        onClick={() => toggleRadScan(scan)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          selected
                            ? 'bg-cyan-50/80 border-cyan-400 text-cyan-950 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {}} // handled by parent div onClick
                            className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300 cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-900 truncate">
                              {scan.name}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                                {scan.code}
                              </span>
                              <span>&bull;</span>
                              <span className={`font-semibold ${
                                modality === 'CT Scan'
                                  ? 'text-purple-700'
                                  : modality === 'MRI'
                                  ? 'text-indigo-700'
                                  : modality === 'Ultrasound'
                                  ? 'text-emerald-700'
                                  : 'text-cyan-800'
                              }`}>
                                {modality}
                              </span>
                              {scan.sampleOrBodyPart && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-slate-600">{scan.sampleOrBodyPart}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold text-xs text-slate-900 font-mono">
                            ${effectivePrice.toFixed(2)}
                          </div>
                          {isInsurance ? (
                            <span className="block text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded mt-0.5">
                              {patientPolicy} (Std: ${scan.price.toFixed(2)})
                            </span>
                          ) : (
                            <span className={`text-[10px] font-medium ${selected ? 'text-cyan-700 font-bold' : 'text-slate-400'}`}>
                              {selected ? 'Selected' : '+ Add'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <GroupPaginationBottomBar
                pagination={radCatalogPagination}
                onSelectPage={handleSelectRadCatalogGroup}
                itemNoun="procedure(s)"
                accentColor="cyan"
              />
            </div>

            {/* Right Column: Selected Procedures Tray & Dispatch Form (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Scan className="w-3.5 h-3.5 text-cyan-600" />
                    Selected Scans ({selectedRadScans.length})
                  </h4>
                  <span className="text-xs font-mono font-black text-cyan-900">
                    Total: ${selectedRadScans.reduce((sum, s) => sum + s.cost, 0).toFixed(2)}
                  </span>
                </div>

                {/* Selected Scans Tray */}
                {selectedRadScans.length === 0 ? (
                  <div className="p-6 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                    <Film className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">No Scans Selected Yet</p>
                    <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                      Click imaging procedures from the catalog or pick a 1-click clinical protocol.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                    {selectedRadScans.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-2 rounded-lg bg-cyan-50/60 border border-cyan-200/80 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {index + 1}. {item.procedureName}
                          </div>
                          <div className="text-[10px] text-cyan-900 flex items-center gap-1.5">
                            <span className="font-mono">{item.procedureCode}</span>
                            <span>&bull;</span>
                            <span className="font-semibold">{item.modality}</span>
                            <span>&bull;</span>
                            <span className="text-slate-600 truncate">{item.bodyPart}</span>
                            {item.isInsurancePrice && item.insurancePolicyName && (
                              <span className="px-1 py-0.2 bg-indigo-100 text-indigo-800 rounded text-[9px] font-bold">
                                {item.insurancePolicyName}
                              </span>
                            )}
                            {item.isCustom && (
                              <span className="px-1 py-0.2 bg-cyan-200 text-cyan-900 rounded text-[9px] font-bold">
                                Custom
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            ${item.cost.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeRadScan(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Remove procedure"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Priority & Contrast Requirements */}
                <div className="space-y-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['Routine', 'Urgent', 'STAT'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setRadPriority(p)}
                          className={`py-1.5 px-2 rounded-md font-bold text-[11px] border text-center transition-all cursor-pointer ${
                            radPriority === p
                              ? p === 'STAT'
                                ? 'bg-rose-600 border-rose-700 text-white shadow-xs'
                                : p === 'Urgent'
                                ? 'bg-cyan-700 border-cyan-800 text-white shadow-xs'
                                : 'bg-slate-800 border-slate-900 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={radContrastRequired}
                      onChange={(e) => setRadContrastRequired(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500 border-slate-300 cursor-pointer"
                    />
                    <div className="text-[11px]">
                      <span className="font-semibold text-slate-800">Contrast Medium Required (IV / Oral)</span>
                      <p className="text-[10px] text-slate-500">Flags radiology team to perform pre-contrast creatinine/allergy check.</p>
                    </div>
                  </label>
                </div>

                {/* Quick Clinical History Chips */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Clinical History & Area of Interest *
                  </label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {[
                      'Persistent Cough & Chest Pain (Rule out Pneumonia)',
                      'Trauma / Fall Evaluation (Rule out Fracture)',
                      'Acute Abdominal Pain Workup',
                      'Chronic Lumbar / Cervical Radiculopathy',
                      'Post-Op Alignment Check'
                    ].map(chip => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setRadClinicalHistory(prev => prev ? `${prev}; ${chip}` : chip)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-cyan-100 text-slate-600 hover:text-cyan-900 rounded text-[10px] font-medium transition-colors cursor-pointer"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    placeholder="e.g. Severe chronic low back pain with left L5-S1 dermatomal radiation following lifting injury. Rule out lumbar disc herniation..."
                    value={radClinicalHistory}
                    onChange={(e) => setRadClinicalHistory(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                </div>
              </div>

              {/* Submit Dispatch Action */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={selectedRadScans.length === 0}
                  onClick={handleOrderRadiologyScans}
                  className={`w-full py-2.5 font-bold rounded-lg shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all ${
                    selectedRadScans.length > 0
                      ? 'bg-cyan-600 hover:bg-cyan-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Film className="w-4 h-4" />
                  <span>
                    Dispatch {selectedRadScans.length} Procedure{selectedRadScans.length === 1 ? '' : 's'} to Radiology (${selectedRadScans.reduce((sum, s) => sum + s.cost, 0).toFixed(2)})
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Patient's Existing Radiology Scans & Attached Cloud Documents */}
          {patientRadOrders.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200">
                    <Film className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Existing Radiology Scans & Results for {selectedPatient?.firstName} {selectedPatient?.lastName} ({patientRadOrders.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Review previous imaging reports, impressions, and scan documents saved in Prime Admin Cloud.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {patientRadOrders.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{r.procedureName}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(r.orderedAt).toLocaleDateString()} &bull; {r.modality} - {r.bodyPart} &bull; Dr. {r.doctorName}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status}
                        </span>
                        {r.status === 'completed' && (
                          <button
                            type="button"
                            onClick={() => setPrintModal({ isOpen: true, type: 'radiology_report', data: r })}
                            className="p-1 px-1.5 bg-slate-900 text-white rounded text-[10px] font-bold hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                            title="Export certified radiology PDF report"
                          >
                            <Download className="w-2.5 h-2.5" /> PDF
                          </button>
                        )}
                      </div>
                    </div>

                    {r.impression && (
                      <div className="text-[11px] bg-cyan-50 text-cyan-950 p-2 rounded border border-cyan-200">
                        <span className="font-bold text-[10px] uppercase block text-cyan-900">Impression:</span>
                        {r.impression}
                      </div>
                    )}

                    {r.findings && !r.impression && (
                      <div className="text-[11px] bg-white text-slate-800 p-2 rounded border border-slate-200">
                        <span className="font-bold text-[10px] uppercase block text-slate-600">Findings:</span>
                        {r.findings}
                      </div>
                    )}

                    {r.attachments && r.attachments.length > 0 && (
                      <div className="p-2 bg-cyan-50 rounded border border-cyan-200 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-cyan-950">
                          <span className="flex items-center gap-1">
                            <Paperclip className="w-3 h-3 text-cyan-600" /> Attached Scans ({r.attachments.length}):
                          </span>
                          <span className="text-[9px] text-cyan-800 bg-cyan-100 px-1 py-0.2 rounded font-semibold">Prime Cloud</span>
                        </div>
                        {r.attachments.map((att) => (
                          <div key={att.id} className="flex items-center justify-between bg-white p-1.5 rounded border border-cyan-200 text-[11px]">
                            <span className="truncate max-w-[140px] font-medium text-slate-800">{att.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setViewingAttachment({ attachment: att, patientName: r.patientName, orderTitle: r.procedureName })}
                                className="px-1.5 py-0.5 text-[10px] font-bold bg-cyan-100 text-cyan-800 rounded hover:bg-cyan-200 cursor-pointer"
                              >
                                View
                              </button>
                              <a href={att.dataUrl} download={att.name} className="p-0.5 text-slate-500 hover:text-cyan-700 cursor-pointer">
                                <Download className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Patient Records & Orders History (With Collapsible Results) */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6 text-xs">
          
          {/* Registered Visits & Revisit Attendance History */}
          {selectedPatient && (() => {
            const rawVisits = selectedPatient.visits || [];
            // If no explicit visits array but patient exists, build the initial visit
            const displayVisits = rawVisits.length > 0 ? rawVisits : [
              {
                id: `v-initial-${selectedPatient.id}`,
                patientId: selectedPatient.id,
                visitNumber: 1,
                visitDate: selectedPatient.registeredAt || selectedPatient.createdAt || new Date().toISOString(),
                visitTimestamp: selectedPatient.registeredAt || selectedPatient.createdAt || new Date().toISOString(),
                visitMrn: selectedPatient.initialMrn || selectedPatient.mrn,
                patientType: selectedPatient.patientType || 'OPD',
                department: selectedPatient.department || 'General Outpatient (OPD)',
                doctorRoom: selectedPatient.doctorRoom,
                ward: selectedPatient.ward,
                bedNumber: selectedPatient.bedNumber,
                assignedDoctorName: selectedPatient.assignedDoctorName,
                revisitReason: 'Initial Clinical Intake & Registration',
                notes: selectedPatient.notes,
                vitals: selectedPatient.vitals || selectedPatient.anthropometry
              }
            ];

            const sortedVisits = [...displayVisits].sort((a, b) => {
              const timeA = new Date(a.visitTimestamp || a.visitDate).getTime() || 0;
              const timeB = new Date(b.visitTimestamp || b.visitDate).getTime() || 0;
              return timeB - timeA;
            });

            return (
              <div className="p-5 rounded-xl border-2 border-purple-200 bg-purple-50/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold shadow-2xs">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          Registered Visits & Clinical Attendance History
                        </h4>
                        <span className="px-2.5 py-0.5 bg-purple-200 text-purple-900 rounded-full text-[10px] font-black uppercase">
                          {sortedVisits.length} Registered Visit{sortedVisits.length === 1 ? '' : 's'}
                        </span>
                        {selectedPatient.isRevisit && (
                          <span className="px-2 py-0.5 bg-purple-700 text-white rounded-full text-[9px] font-bold">
                            Active Revisit
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-purple-900 mt-0.5">
                        Permanent timeline of OPD/IPD number issuances, departments, intake vitals, and reasons for revisit under this patient's unified record.
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Active Encounter MRN</div>
                    <div className="text-xs font-black font-mono text-purple-900 bg-purple-100 px-2 py-0.5 rounded border border-purple-300 inline-block mt-0.5">
                      {selectedPatient.mrn}
                    </div>
                  </div>
                </div>

                <GroupPaginationTopBar
                  pagination={visitsHistoryPagination}
                  onSelectPage={handleSelectVisitsHistoryGroup}
                  itemNoun="visit(s)"
                  accentColor="purple"
                />

                <div className="space-y-3">
                  {visitsHistoryPagination.visibleItems.map((v, idx) => {
                    const globalIdx = visitsHistoryPagination.startIndex + idx;
                    const isLatest = globalIdx === 0;
                    const vVitals = v.vitals;
                    return (
                      <div
                        key={v.id || globalIdx}
                        className={`p-4 rounded-xl border transition-all ${
                          isLatest
                            ? 'bg-white border-purple-300 ring-2 ring-purple-400/20 shadow-xs'
                            : 'bg-white/80 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                              isLatest ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-800'
                            }`}>
                              Visit #{v.visitNumber || (sortedVisits.length - globalIdx)}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {v.visitMrn}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              v.patientType === 'IPD' ? 'bg-indigo-100 text-indigo-800' : 'bg-sky-100 text-sky-800'
                            }`}>
                              {v.patientType || 'OPD'}
                            </span>
                            {isLatest && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Current Active Attendance
                              </span>
                            )}
                          </div>

                          <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {v.visitTimestamp 
                                ? `${new Date(v.visitTimestamp).toLocaleDateString()} at ${new Date(v.visitTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : v.visitDate}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 text-slate-700">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Reason / Chief Complaint</div>
                            <div className="font-semibold text-slate-900 mt-0.5 text-xs">
                              {v.revisitReason || 'Clinical Consultation & Review'}
                            </div>
                            {v.notes && (
                              <div className="text-[11px] text-slate-500 italic mt-0.5">
                                &ldquo;{v.notes}&rdquo;
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Location & Attending Clinician</div>
                            <div className="text-xs font-medium text-slate-800 mt-0.5 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{v.department || 'General Outpatient (OPD)'}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {v.patientType === 'IPD' ? (
                                <span>{v.ward || 'Ward'} &bull; {v.bedNumber || 'Bed Assigned'}</span>
                              ) : (
                                <span>{v.doctorRoom || 'Consultation Office'}</span>
                              )}
                              {v.assignedDoctorName && (
                                <span> &bull; Dr. {v.assignedDoctorName}</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Intake Vitals Snapshot</div>
                            {vVitals?.bloodPressure ? (
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px]">
                                <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">BP: <strong>{vVitals.bloodPressure}</strong></span>
                                <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">Pulse: <strong>{vVitals.pulseRate} bpm</strong></span>
                                <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">Temp: <strong>{vVitals.temperature}&deg;C</strong></span>
                                <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">SpO2: <strong>{vVitals.spO2}%</strong></span>
                                {vVitals.weightKg && <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">Wt: <strong>{vVitals.weightKg} kg</strong></span>}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400 italic mt-0.5">
                                Standard clinical intake vitals
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <GroupPaginationBottomBar
                  pagination={visitsHistoryPagination}
                  onSelectPage={handleSelectVisitsHistoryGroup}
                  itemNoun="visit(s)"
                  accentColor="purple"
                />
              </div>
            );
          })()}

          {/* Discharge Summary Card if exists */}
          {selectedPatientDischargeSummary && (
            <div className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-2.5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-emerald-950 text-sm">
                      Hospital Discharge Summary
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full text-[10px] font-bold">
                      {selectedPatientDischargeSummary.dischargeCondition || 'Discharged'}
                    </span>
                  </div>
                  <div className="text-emerald-800 text-[11px] mt-0.5">
                    Discharged on <strong>{new Date(selectedPatientDischargeSummary.dischargeDate).toLocaleDateString()} at {new Date(selectedPatientDischargeSummary.dischargeDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> &bull; Attending: <strong>Dr. {selectedPatientDischargeSummary.dischargingDoctorName}</strong>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsViewDischargeFileOpen(true)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md flex items-center gap-1 cursor-pointer text-[11px] transition-colors shadow-2xs"
                    title="View formatted discharge dossier and revision timestamps"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View Discharge File</span>
                    {selectedPatientDischargeSummary.changeHistory && selectedPatientDischargeSummary.changeHistory.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-bold">
                        {selectedPatientDischargeSummary.changeHistory.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintModal({
                        isOpen: true,
                        type: 'discharge_summary',
                        data: selectedPatientDischargeSummary
                      });
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-md flex items-center gap-1 cursor-pointer text-[11px] transition-colors"
                  >
                    <Download className="w-3 h-3 text-emerald-700" />
                    <span>Export PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDischargeModalOpen(true)}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-md flex items-center gap-1 cursor-pointer text-[11px] transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Discharge Form</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-700">
                <div>
                  <span className="font-bold text-slate-800">Final Diagnosis: </span>
                  {selectedPatientDischargeSummary.finalDiagnosis || 'Not specified'}
                </div>
                <div>
                  <span className="font-bold text-slate-800">Follow-up: </span>
                  {selectedPatientDischargeSummary.followUpDate 
                    ? new Date(selectedPatientDischargeSummary.followUpDate).toLocaleDateString()
                    : 'As needed / PRN'}
                </div>
                {selectedPatientDischargeSummary.takeHomePrescription ? (
                  <div className="md:col-span-2">
                    <span className="font-bold text-slate-800">Take-Home Prescription: </span>
                    <span className="whitespace-pre-wrap text-slate-800">{selectedPatientDischargeSummary.takeHomePrescription}</span>
                  </div>
                ) : selectedPatientDischargeSummary.dischargeMedications && selectedPatientDischargeSummary.dischargeMedications.length > 0 ? (
                  <div className="md:col-span-2">
                    <span className="font-bold text-slate-800">Take-Home Medications ({selectedPatientDischargeSummary.dischargeMedications.length}): </span>
                    {selectedPatientDischargeSummary.dischargeMedications.map(m => `${m.medicationName} (${m.dosage} ${m.frequency}, Qty: ${m.quantityToDispense})`).join('; ')}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Clinical Encounters History */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" /> Clinical Consultation Encounters ({patientEncounters.length})
            </h4>

            <GroupPaginationTopBar
              pagination={encountersHistoryPagination}
              onSelectPage={handleSelectEncountersHistoryGroup}
              itemNoun="encounter(s)"
              accentColor="sky"
            />

            <div className="space-y-3">
              {encountersHistoryPagination.visibleItems.map(enc => {
                const isHistoryExpanded = expandedEncounterHistoryId === enc.id;
                const hasEdits = Boolean(enc.updatedAt || (enc.editHistory && enc.editHistory.length > 0));

                return (
                  <div key={enc.id} className="p-4 rounded-xl border border-sky-100 bg-sky-50/40 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">
                            {enc.workingDiagnosis || 'Clinical Encounter'}
                          </span>
                          <span className="font-mono text-slate-500 text-[10px]">({enc.id})</span>
                          {hasEdits && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <History className="w-2.5 h-2.5 text-amber-700" />
                              Revised {enc.editHistory && enc.editHistory.length > 0 ? `(${enc.editHistory.length}x)` : ''}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-600 text-[11px] mt-0.5">
                          Dr. {enc.doctorName} &bull; Visit Date: <strong>{enc.visitDate}</strong>
                          {enc.updatedAt && (
                            <span className="text-amber-800 ml-1.5 font-medium">
                              &bull; Last edited by <strong>{enc.updatedBy || 'Doctor'}</strong> on {new Date(enc.updatedAt).toLocaleDateString()} at {new Date(enc.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {hasEdits && (
                          <button
                            type="button"
                            onClick={() => setExpandedEncounterHistoryId(isHistoryExpanded ? null : enc.id)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md border flex items-center gap-1 cursor-pointer transition-colors ${
                              isHistoryExpanded
                                ? 'bg-amber-100 border-amber-300 text-amber-900'
                                : 'bg-white border-amber-200 text-amber-800 hover:bg-amber-50'
                            }`}
                            title="View revision audit trail and timestamps"
                          >
                            <History className="w-3 h-3 text-amber-600" />
                            <span>Audit Log ({enc.editHistory?.length || 1})</span>
                            {isHistoryExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleLoadEncounterForEditing(enc)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-md shadow-2xs flex items-center gap-1.5 cursor-pointer text-[11px] transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Encounter</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('workup');
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 text-sky-700 border border-sky-200 font-semibold rounded-md flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View Workup</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintModal({ isOpen: true, type: 'workup', data: enc })}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-md flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          <Download className="w-3 h-3" />
                          <span>Export PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEncounter(enc.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                          title="Delete this encounter record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Chief Complaint</span>
                        <span className="text-slate-800 font-medium">{enc.chiefComplaint || 'None documented'}</span>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Vitals Recorded</span>
                        <div className="text-slate-800 font-medium">
                          BP: {enc.vitals?.bloodPressure || '-'} &bull; HR: {enc.vitals?.pulseRate || '-'} bpm &bull; Temp: {enc.vitals?.temperature || '-'}°C &bull; SpO2: {enc.vitals?.spO2 || '-'}%
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Management / Plan</span>
                        <span className="text-slate-800 font-medium truncate block" title={enc.clinicalPlan}>
                          {enc.clinicalPlan || 'Routine supportive care'}
                        </span>
                      </div>
                    </div>

                    {/* Expandable Audit Log and Edit Timestamps Timeline */}
                    {isHistoryExpanded && (
                      <div className="mt-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2.5 text-[11px]">
                        <div className="flex items-center justify-between pb-1 border-b border-amber-200/80">
                          <span className="font-bold text-amber-950 flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 text-amber-700" />
                            Revision Audit History & Editor Timestamps
                          </span>
                          <span className="text-[10px] text-amber-800 font-medium">
                            Encounter ID: {enc.id}
                          </span>
                        </div>

                        {enc.editHistory && enc.editHistory.length > 0 ? (
                          <div className="space-y-2">
                            {enc.editHistory.map((rev, idx) => (
                              <div key={rev.id || idx} className="p-2.5 bg-white rounded border border-amber-200/80 space-y-1">
                                <div className="flex items-center justify-between flex-wrap gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center justify-center">
                                      #{enc.editHistory!.length - idx}
                                    </span>
                                    <span className="font-bold text-slate-900">
                                      {rev.editorName}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded capitalize font-medium">
                                      {rev.editorRole || 'Doctor'}
                                    </span>
                                  </div>
                                  <span className="text-slate-500 font-mono text-[10px] flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {new Date(rev.editedAt).toLocaleDateString()} &bull; {new Date(rev.editedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                </div>

                                {rev.summaryOfChanges && (
                                  <div className="text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-200">
                                    <span className="font-semibold text-slate-900">Modified: </span>
                                    {rev.summaryOfChanges}
                                  </div>
                                )}

                                {rev.reason && (
                                  <div className="text-[11px] text-amber-900 italic bg-amber-50/50 p-1.5 rounded border border-amber-100">
                                    <span className="font-semibold text-amber-950 not-italic">Clinical Note / Reason: </span>
                                    "{rev.reason}"
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-2.5 bg-white rounded border border-amber-200 text-slate-600">
                            Modified on <strong>{enc.updatedAt ? new Date(enc.updatedAt).toLocaleString() : 'N/A'}</strong> by <strong>{enc.updatedBy || 'Doctor'}</strong>.
                          </div>
                        )}

                        <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between">
                          <span>Original author: Dr. {enc.doctorName}</span>
                          <span>Visit record date: {enc.visitDate}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {patientEncounters.length === 0 && (
                <p className="text-slate-400">No clinical consultation encounters recorded for this patient yet.</p>
              )}
            </div>

            <GroupPaginationBottomBar
              pagination={encountersHistoryPagination}
              onSelectPage={handleSelectEncountersHistoryGroup}
              itemNoun="encounter(s)"
              accentColor="sky"
            />
          </div>

          {/* Prescriptions */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Pill className="w-4 h-4 text-emerald-600" /> Prescriptions History ({patientPrescriptions.length})
            </h4>

            <GroupPaginationTopBar
              pagination={prescriptionsHistoryPagination}
              onSelectPage={handleSelectPrescriptionsHistoryGroup}
              itemNoun="prescription(s)"
              accentColor="emerald"
            />

            <div className="space-y-3">
              {prescriptionsHistoryPagination.visibleItems.map(rx => (
                <div key={rx.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 font-mono">{rx.id} &bull; {new Date(rx.createdAt).toLocaleDateString()}</div>
                    <div className="text-slate-600 text-[11px] mt-0.5">
                      Diagnosis: <span className="font-medium text-slate-800">{rx.diagnosis}</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Items: {rx.items.map(i => `${i.medicationName} (${i.quantityToDispense})`).join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      rx.overallStatus === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {rx.overallStatus}
                    </span>
                    <button
                      onClick={() => setPrintModal({ isOpen: true, type: 'prescription', data: rx })}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 font-medium hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Export PDF
                    </button>
                  </div>
                </div>
              ))}
              {patientPrescriptions.length === 0 && <p className="text-slate-400">No prescriptions recorded for this patient.</p>}
            </div>

            <GroupPaginationBottomBar
              pagination={prescriptionsHistoryPagination}
              onSelectPage={handleSelectPrescriptionsHistoryGroup}
              itemNoun="prescription(s)"
              accentColor="emerald"
            />
          </div>

          {/* Pathology Orders with Collapsible Results Cards */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Microscope className="w-4 h-4 text-amber-600" /> Pathology Diagnostic Results ({patientTestOrders.length})
            </h4>

            <GroupPaginationTopBar
              pagination={labResultsHistoryPagination}
              onSelectPage={handleSelectLabResultsHistoryGroup}
              itemNoun="lab order(s)"
              accentColor="amber"
            />

            <div className="space-y-3">
              {labResultsHistoryPagination.visibleItems.map(t => {
                const isExpanded = expandedLabResultId === t.id;
                const isCompleted = t.status === 'completed';
                return (
                  <div
                    key={t.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shadow-2xs transition-all"
                  >
                    <div className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{t.testName}</span>
                          <span className="font-mono text-slate-500 text-[11px]">({t.testCode})</span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>Category: {t.category} &bull; Priority: {t.priority} &bull; Ordered: {new Date(t.orderedAt).toLocaleDateString()}</span>
                          {t.attachments && t.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                              <Paperclip className="w-2.5 h-2.5 text-emerald-600" />
                              {t.attachments.length} attachment{t.attachments.length > 1 ? 's' : ''} (Prime Cloud)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>

                        {isCompleted && (
                          <>
                            <button
                              onClick={() => setExpandedLabResultId(isExpanded ? null : t.id)}
                              className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 font-semibold hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" /> Hide Findings
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" /> View Findings ({t.results?.length || 0})
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => setPrintModal({ isOpen: true, type: 'lab_report', data: t })}
                              className="px-2.5 py-1 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3 h-3" /> Export PDF
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Pathology Results Details */}
                    {isExpanded && isCompleted && (
                      <div className="p-4 border-t border-slate-200 bg-white space-y-3">
                        {t.results && t.results.length > 0 ? (
                          <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left divide-y divide-slate-200">
                              <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px]">
                                <tr>
                                  <th className="py-2 px-3">Parameter</th>
                                  <th className="py-2 px-3">Result</th>
                                  <th className="py-2 px-3">Unit</th>
                                  <th className="py-2 px-3">Ref. Range</th>
                                  <th className="py-2 px-3 text-right">Flag</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {t.results.map((r, i) => (
                                  <tr key={i} className="hover:bg-slate-50">
                                    <td className="py-2 px-3 font-semibold text-slate-900">{r.parameter}</td>
                                    <td className={`py-2 px-3 font-bold ${r.flag !== 'Normal' ? 'text-rose-600' : 'text-slate-900'}`}>
                                      {r.value}
                                    </td>
                                    <td className="py-2 px-3 text-slate-600">{r.unit}</td>
                                    <td className="py-2 px-3 text-slate-600">{r.referenceRange}</td>
                                    <td className="py-2 px-3 text-right">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                        r.flag === 'Normal' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                                      }`}>
                                        {r.flag}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-slate-500 italic">No parameter readings recorded.</p>
                        )}

                        {t.labTechnicianNotes && (
                          <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-amber-900 text-[11px]">
                            <span className="font-bold">Pathologist Remarks: </span>{t.labTechnicianNotes}
                          </div>
                        )}

                        {/* Attached Patient Lab Documents (Saved in Prime Admin Cloud Account) */}
                        {t.attachments && t.attachments.length > 0 && (
                          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                              <span className="flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                                Attached Patient Lab Documents & Slips ({t.attachments.length})
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-200">
                                <Cloud className="w-2.5 h-2.5 text-emerald-600" />
                                Stored on Prime Admin Cloud
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {t.attachments.map((att) => (
                                <div
                                  key={att.id}
                                  className="flex items-center justify-between p-2.5 bg-white rounded border border-emerald-200 text-xs shadow-2xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {att.type.startsWith('image/') ? (
                                      <img
                                        src={att.dataUrl}
                                        alt={att.name}
                                        className="w-8 h-8 rounded object-cover border border-slate-200 shrink-0"
                                      />
                                    ) : (
                                      <FileText className="w-6 h-6 text-emerald-600 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                      <div className="font-semibold text-slate-800 truncate" title={att.name}>
                                        {att.name}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        {(att.size / 1024).toFixed(1)} KB &bull; {att.uploadedBy || 'Pathologist'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setViewingAttachment({ attachment: att, patientName: t.patientName, orderTitle: t.testName })}
                                      className="p-1 px-2 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
                                      title="View document in full-screen modal"
                                    >
                                      <Eye className="w-3 h-3" /> View
                                    </button>
                                    <a
                                      href={att.dataUrl}
                                      download={att.name}
                                      className="p-1 text-slate-500 hover:text-emerald-700 rounded cursor-pointer transition-colors"
                                      title="Download attachment"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="text-[11px] text-slate-500">
                          Validated by: <strong className="text-slate-800">{t.completedBy || 'Clinical Pathologist'}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {patientTestOrders.length === 0 && <p className="text-slate-400">No lab test orders on file.</p>}
            </div>

            <GroupPaginationBottomBar
              pagination={labResultsHistoryPagination}
              onSelectPage={handleSelectLabResultsHistoryGroup}
              itemNoun="lab order(s)"
              accentColor="amber"
            />
          </div>

          {/* Radiology Orders with Collapsible Findings */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Film className="w-4 h-4 text-cyan-600" /> Radiology Scans & Imaging ({patientRadOrders.length})
            </h4>

            <GroupPaginationTopBar
              pagination={radResultsHistoryPagination}
              onSelectPage={handleSelectRadResultsHistoryGroup}
              itemNoun="radiology order(s)"
              accentColor="cyan"
            />

            <div className="space-y-3">
              {radResultsHistoryPagination.visibleItems.map(r => {
                const isExpanded = expandedRadResultId === r.id;
                const isCompleted = r.status === 'completed';
                return (
                  <div
                    key={r.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shadow-2xs transition-all"
                  >
                    <div className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{r.procedureName}</span>
                          <span className="font-mono text-slate-500 text-[11px]">({r.modality} - {r.bodyPart})</span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>Priority: {r.priority} &bull; Ordered: {new Date(r.orderedAt).toLocaleDateString()}</span>
                          {r.attachments && r.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-cyan-50 text-cyan-800 border border-cyan-200 font-bold">
                              <Paperclip className="w-2.5 h-2.5 text-cyan-600" />
                              {r.attachments.length} attachment{r.attachments.length > 1 ? 's' : ''} (Prime Cloud)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status}
                        </span>

                        {isCompleted && (
                          <>
                            <button
                              onClick={() => setExpandedRadResultId(isExpanded ? null : r.id)}
                              className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 font-semibold hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" /> Hide Findings
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" /> View Findings
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => setPrintModal({ isOpen: true, type: 'radiology_report', data: r })}
                              className="px-2.5 py-1 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3 h-3" /> Export PDF
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Radiology Findings */}
                    {isExpanded && isCompleted && (
                      <div className="p-4 border-t border-slate-200 bg-white space-y-2.5">
                        <div>
                          <div className="text-[11px] font-bold text-slate-700 uppercase">Findings:</div>
                          <p className="text-[11px] text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed">
                            {r.findings || 'No formal findings text.'}
                          </p>
                        </div>

                        <div>
                          <div className="text-[11px] font-bold text-cyan-900 uppercase">Diagnostic Impression:</div>
                          <p className="text-[11px] text-cyan-950 font-medium bg-cyan-50 p-2.5 rounded border border-cyan-200">
                            {r.impression || 'Impression pending.'}
                          </p>
                        </div>

                        {/* Attached Diagnostic Scans & Images (Stored on Prime Admin Cloud Account) */}
                        {r.attachments && r.attachments.length > 0 && (
                          <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-lg space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-cyan-950">
                              <span className="flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5 text-cyan-600" />
                                Attached Diagnostic Scans & Images ({r.attachments.length})
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-800 bg-cyan-100/90 px-2 py-0.5 rounded border border-cyan-200">
                                <Cloud className="w-2.5 h-2.5 text-cyan-600" />
                                Stored on Prime Admin Cloud
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {r.attachments.map((att) => (
                                <div
                                  key={att.id}
                                  className="flex items-center justify-between p-2.5 bg-white rounded border border-cyan-200 text-xs shadow-2xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {att.type.startsWith('image/') ? (
                                      <img
                                        src={att.dataUrl}
                                        alt={att.name}
                                        className="w-8 h-8 rounded object-cover border border-slate-200 shrink-0"
                                      />
                                    ) : (
                                      <Film className="w-6 h-6 text-cyan-600 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                      <div className="font-semibold text-slate-800 truncate" title={att.name}>
                                        {att.name}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        {(att.size / 1024).toFixed(1)} KB &bull; {att.uploadedBy || 'Radiologist'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setViewingAttachment({ attachment: att, patientName: r.patientName, orderTitle: r.procedureName })}
                                      className="p-1 px-2 text-[11px] font-semibold bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded border border-cyan-200 flex items-center gap-1 cursor-pointer transition-colors"
                                      title="View scan/document in full-screen modal"
                                    >
                                      <Eye className="w-3 h-3" /> View
                                    </button>
                                    <a
                                      href={att.dataUrl}
                                      download={att.name}
                                      className="p-1 text-slate-500 hover:text-cyan-700 rounded cursor-pointer transition-colors"
                                      title="Download attachment"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="text-[11px] text-slate-500">
                          Reported by: <strong className="text-slate-800">{r.completedBy || 'Radiologist'}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {patientRadOrders.length === 0 && <p className="text-slate-400">No radiology scan orders on file.</p>}
            </div>

            <GroupPaginationBottomBar
              pagination={radResultsHistoryPagination}
              onSelectPage={handleSelectRadResultsHistoryGroup}
              itemNoun="radiology order(s)"
              accentColor="cyan"
            />
          </div>

        </div>
      )}

      {/* Level 2 Clearance Edit Patient Demographics Modal */}
      {isEditPatientOpen && selectedPatient && (
        <EditPatientModal
          isOpen={isEditPatientOpen}
          onClose={() => setIsEditPatientOpen(false)}
          patient={selectedPatient}
        />
      )}

      {/* Edit Vitals & Anthropometry Modal */}
      {isEditVitalsOpen && selectedPatient && (
        <EditAnthropometryModal
          isOpen={isEditVitalsOpen}
          onClose={() => setIsEditVitalsOpen(false)}
          patient={selectedPatient}
          onSaveCallback={(newVitals) => {
            setEncounterForm(prev => ({
              ...prev,
              vitals: {
                bloodPressure: newVitals.bloodPressure,
                pulseRate: newVitals.pulseRate,
                temperature: newVitals.temperature,
                respiratoryRate: newVitals.respiratoryRate,
                weightKg: newVitals.weightKg,
                heightCm: newVitals.heightCm,
                spO2: newVitals.spO2
              }
            }));
          }}
        />
      )}

      {/* Patient Movement History & Admission/Transfer Modal */}
      {isMovementModalOpen && selectedPatient && (
        <PatientMovementHistoryModal
          isOpen={isMovementModalOpen}
          onClose={() => setIsMovementModalOpen(false)}
          patient={selectedPatient}
        />
      )}

      {/* Editable Wards & Clinical Consultation Rooms Modal */}
      {isLocationsModalOpen && (
        <ManageLocationsModal
          isOpen={isLocationsModalOpen}
          onClose={() => setIsLocationsModalOpen(false)}
        />
      )}

      {/* Discharge Patient Modal */}
      {isDischargeModalOpen && selectedPatient && (
        <DischargePatientModal
          isOpen={isDischargeModalOpen}
          onClose={() => setIsDischargeModalOpen(false)}
          patient={selectedPatient}
          onPrintPreview={(ds) => {
            setPrintModal({
              isOpen: true,
              type: 'discharge_summary',
              data: ds
            });
          }}
          onDischargeSuccess={() => {
            // Patient discharge summary saved
          }}
        />
      )}

      {/* View Discharge File Modal */}
      {isViewDischargeFileOpen && selectedPatientDischargeSummary && (
        <ViewDischargeFileModal
          isOpen={isViewDischargeFileOpen}
          onClose={() => setIsViewDischargeFileOpen(false)}
          dischargeSummary={selectedPatientDischargeSummary}
          onPrint={(ds) => {
            setPrintModal({
              isOpen: true,
              type: 'discharge_summary',
              data: ds
            });
          }}
          onEdit={() => {
            setIsViewDischargeFileOpen(false);
            setIsDischargeModalOpen(true);
          }}
        />
      )}

      {/* Refer Patient Modal */}
      {isReferralModalOpen && selectedPatient && (
        <ReferralPatientModal
          isOpen={isReferralModalOpen}
          onClose={() => setIsReferralModalOpen(false)}
          patient={selectedPatient}
          existingReferral={selectedPatientReferral}
          onPrintPreview={(ref: any) => {
            setPrintModal({
              isOpen: true,
              type: 'referral_form',
              data: ref
            });
          }}
        />
      )}

      {/* View Referral File Modal */}
      {isViewReferralFileOpen && selectedPatientReferral && (
        <ViewReferralFileModal
          isOpen={isViewReferralFileOpen}
          onClose={() => setIsViewReferralFileOpen(false)}
          referral={selectedPatientReferral}
          onPrint={(ref) => {
            setPrintModal({
              isOpen: true,
              type: 'referral_form',
              data: ref
            });
          }}
          onEdit={() => {
            setIsViewReferralFileOpen(false);
            setIsReferralModalOpen(true);
          }}
        />
      )}

      {/* Report Deceased / Death Certificate Modal */}
      {isReportDeceasedModalOpen && selectedPatient && (
        <ReportDeceasedModal
          isOpen={isReportDeceasedModalOpen}
          onClose={() => setIsReportDeceasedModalOpen(false)}
          patient={selectedPatient}
          existingCertificate={selectedPatientDeathCert}
          onPrintPreview={(cert) => {
            setPrintModal({
              isOpen: true,
              type: 'death_certificate',
              data: cert
            });
          }}
        />
      )}

      {/* View Death Certificate File Modal */}
      {isViewDeathCertModalOpen && selectedPatientDeathCert && (
        <ViewDeathCertificateModal
          isOpen={isViewDeathCertModalOpen}
          onClose={() => setIsViewDeathCertModalOpen(false)}
          certificate={selectedPatientDeathCert}
          onPrintPreview={(cert) => {
            setPrintModal({
              isOpen: true,
              type: 'death_certificate',
              data: cert
            });
          }}
          onEdit={() => {
            setIsViewDeathCertModalOpen(false);
            setIsReportDeceasedModalOpen(true);
          }}
        />
      )}

      {/* Printable Document Modal (rendered top-most in stack) */}
      {printModal.isOpen && (
        <PrintReceiptModal
          isOpen={printModal.isOpen}
          onClose={() => setPrintModal({ ...printModal, isOpen: false })}
          type={printModal.type}
          data={printModal.data}
        />
      )}

      {/* Full-Screen Clinical Document Attachment Viewer Modal (Prime Admin Cloud) */}
      {viewingAttachment && (
        <ClinicalAttachmentModal
          isOpen={!!viewingAttachment}
          onClose={() => setViewingAttachment(null)}
          attachment={viewingAttachment.attachment}
          patientName={viewingAttachment.patientName}
          orderTitle={viewingAttachment.orderTitle}
        />
      )}

    </div>
  );
};
