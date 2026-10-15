import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { TestOrder, InventoryItem, AvailableTest, Patient, TestResultType, TestParameterDefinition, ClinicalAttachment } from '../../types';
import {
  Microscope,
  CheckCircle2,
  Clock,
  FlaskConical,
  FileText,
  FileSpreadsheet,
  Layers,
  AlertTriangle,
  Plus,
  ArrowRight,
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Calendar,
  User as UserIcon,
  Tag,
  ShieldCheck,
  Building2,
  DoorOpen,
  BedDouble,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Pencil,
  Check,
  Eye,
  Download,
  Paperclip,
  Upload
} from 'lucide-react';
import { PrintReceiptModal } from '../common/PrintReceiptModal';
import { TestInsurancePricingModal } from '../diagnostic/TestInsurancePricingModal';
import { formatPatientAge, getAgeInYears } from '../../utils/ageUtils';
import { exportPathologyToPdf } from '../../utils/pathologyPdfExport';
import { preloadClinicLogo } from '../../utils/pdfLogoHelper';
import {
  exportSinglePathologyOrderToExcel,
  exportPathologyOrdersListToExcel,
  exportPathologyCatalogToExcel
} from '../../utils/pathologyExcelExport';

// Standard Clinical Panel Presets for Range-Based Tests in Series
export const CLINICAL_PANEL_PRESETS: {
  id: string;
  name: string;
  category: AvailableTest['category'];
  sample: string;
  parameters: TestParameterDefinition[];
}[] = [
  {
    id: 'urinalysis',
    name: 'Urinalysis (10-Parameter Dipstick)',
    category: 'Urinalysis',
    sample: 'Midstream Urine',
    parameters: [
      { parameter: 'Urine Leucocytes', unit: 'Dipstick', referenceRange: 'Negative', defaultExpectedValue: 'Negative' },
      { parameter: 'Urine Nitrites', unit: 'Dipstick', referenceRange: 'Negative', defaultExpectedValue: 'Negative' },
      { parameter: 'Urine Protein', unit: 'Dipstick', referenceRange: 'Negative', defaultExpectedValue: 'Negative' },
      { parameter: 'Urine Glucose', unit: 'Dipstick', referenceRange: 'Negative', defaultExpectedValue: 'Negative' },
      { parameter: 'Specific Gravity', unit: 'Index', referenceRange: '1.005 - 1.030', defaultExpectedValue: '1.018' },
      { parameter: 'pH', unit: 'pH', referenceRange: '5.0 - 7.5', defaultExpectedValue: '6.0' },
      { parameter: 'Urine Blood / Hemoglobin', unit: 'Dipstick', referenceRange: 'Negative', defaultExpectedValue: 'Negative' },
      { parameter: 'Urine Ketones', unit: 'Dipstick', referenceRange: 'Negative', defaultExpectedValue: 'Negative' },
      { parameter: 'Urine Bilirubin', unit: 'Dipstick', referenceRange: 'Negative', defaultExpectedValue: 'Negative' },
      { parameter: 'Urobilinogen', unit: 'mg/dL', referenceRange: '0.2 - 1.0', defaultExpectedValue: '0.2' }
    ]
  },
  {
    id: 'lft',
    name: 'Liver Function Tests (LFT Panel)',
    category: 'Biochemistry',
    sample: 'Serum',
    parameters: [
      { parameter: 'ALT (SGPT)', unit: 'U/L', referenceRange: '7 - 56', defaultExpectedValue: '28' },
      { parameter: 'AST (SGOT)', unit: 'U/L', referenceRange: '10 - 40', defaultExpectedValue: '24' },
      { parameter: 'Total Bilirubin', unit: 'mg/dL', referenceRange: '0.2 - 1.2', defaultExpectedValue: '0.8' },
      { parameter: 'Direct (Conjugated) Bilirubin', unit: 'mg/dL', referenceRange: '0.0 - 0.3', defaultExpectedValue: '0.1' },
      { parameter: 'Alkaline Phosphatase (ALP)', unit: 'U/L', referenceRange: '44 - 147', defaultExpectedValue: '75' },
      { parameter: 'Total Protein', unit: 'g/dL', referenceRange: '6.0 - 8.3', defaultExpectedValue: '7.2' },
      { parameter: 'Serum Albumin', unit: 'g/dL', referenceRange: '3.5 - 5.0', defaultExpectedValue: '4.2' },
      { parameter: 'Serum Globulin', unit: 'g/dL', referenceRange: '2.0 - 3.5', defaultExpectedValue: '3.0' }
    ]
  },
  {
    id: 'rft',
    name: 'Kidney / Renal Function (RFT / KFT)',
    category: 'Biochemistry',
    sample: 'Serum',
    parameters: [
      { parameter: 'Serum Creatinine', unit: 'mg/dL', referenceRange: '0.6 - 1.2', defaultExpectedValue: '0.9' },
      { parameter: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', referenceRange: '7 - 20', defaultExpectedValue: '14' },
      { parameter: 'eGFR', unit: 'mL/min/1.73m²', referenceRange: '> 90', defaultExpectedValue: '98' },
      { parameter: 'Serum Sodium (Na+)', unit: 'mEq/L', referenceRange: '135 - 145', defaultExpectedValue: '140' },
      { parameter: 'Serum Potassium (K+)', unit: 'mEq/L', referenceRange: '3.5 - 5.0', defaultExpectedValue: '4.2' },
      { parameter: 'Serum Chloride (Cl-)', unit: 'mEq/L', referenceRange: '96 - 106', defaultExpectedValue: '102' },
      { parameter: 'Serum Uric Acid', unit: 'mg/dL', referenceRange: '3.5 - 7.2', defaultExpectedValue: '5.2' }
    ]
  },
  {
    id: 'tft',
    name: 'Thyroid Function Tests (TFT Panel)',
    category: 'Biochemistry',
    sample: 'Serum',
    parameters: [
      { parameter: 'Thyroid Stimulating Hormone (TSH)', unit: 'mIU/L', referenceRange: '0.4 - 4.0', defaultExpectedValue: '1.8' },
      { parameter: 'Free Triiodothyronine (Free T3)', unit: 'pg/mL', referenceRange: '2.3 - 4.2', defaultExpectedValue: '3.1' },
      { parameter: 'Free Thyroxine (Free T4)', unit: 'ng/dL', referenceRange: '0.8 - 1.8', defaultExpectedValue: '1.2' },
      { parameter: 'Total T3', unit: 'ng/dL', referenceRange: '80 - 200', defaultExpectedValue: '130' },
      { parameter: 'Total T4', unit: 'µg/dL', referenceRange: '4.5 - 12.0', defaultExpectedValue: '8.5' }
    ]
  },
  {
    id: 'cbc',
    name: 'Complete Blood Count (CBC / FBC)',
    category: 'Hematology',
    sample: 'Whole Blood (EDTA)',
    parameters: [
      { parameter: 'Hemoglobin (Hb)', unit: 'g/dL', referenceRange: '12.0 - 16.5', defaultExpectedValue: '14.0' },
      { parameter: 'White Blood Cells (WBC)', unit: 'x10^9/L', referenceRange: '4.0 - 10.0', defaultExpectedValue: '6.8' },
      { parameter: 'Platelet Count', unit: 'x10^9/L', referenceRange: '150 - 450', defaultExpectedValue: '260' },
      { parameter: 'Hematocrit (PCV)', unit: '%', referenceRange: '36 - 50', defaultExpectedValue: '42' },
      { parameter: 'Red Blood Cells (RBC)', unit: 'x10^12/L', referenceRange: '4.2 - 5.8', defaultExpectedValue: '4.8' },
      { parameter: 'Neutrophils %', unit: '%', referenceRange: '40 - 70', defaultExpectedValue: '60' },
      { parameter: 'Lymphocytes %', unit: '%', referenceRange: '20 - 45', defaultExpectedValue: '32' },
      { parameter: 'Monocytes %', unit: '%', referenceRange: '2 - 8', defaultExpectedValue: '5' }
    ]
  },
  {
    id: 'lipid',
    name: 'Lipid Profile',
    category: 'Biochemistry',
    sample: 'Serum (Fasting)',
    parameters: [
      { parameter: 'Total Cholesterol', unit: 'mg/dL', referenceRange: '< 200', defaultExpectedValue: '170' },
      { parameter: 'Triglycerides', unit: 'mg/dL', referenceRange: '< 150', defaultExpectedValue: '115' },
      { parameter: 'HDL Cholesterol', unit: 'mg/dL', referenceRange: '> 40', defaultExpectedValue: '52' },
      { parameter: 'LDL Cholesterol', unit: 'mg/dL', referenceRange: '< 100', defaultExpectedValue: '88' },
      { parameter: 'VLDL Cholesterol', unit: 'mg/dL', referenceRange: '< 30', defaultExpectedValue: '22' }
    ]
  },
  {
    id: 'glucose',
    name: 'Blood Glucose & Glycemic Profile',
    category: 'Biochemistry',
    sample: 'Fluoride Plasma',
    parameters: [
      { parameter: 'Fasting Blood Glucose', unit: 'mg/dL', referenceRange: '70 - 99', defaultExpectedValue: '92' },
      { parameter: 'Post-Prandial Glucose (2hr)', unit: 'mg/dL', referenceRange: '< 140', defaultExpectedValue: '115' },
      { parameter: 'Glycated Hemoglobin (HbA1c)', unit: '%', referenceRange: '< 5.7', defaultExpectedValue: '5.4' }
    ]
  },
  {
    id: 'electrolytes',
    name: 'Electrolytes Panel',
    category: 'Biochemistry',
    sample: 'Serum',
    parameters: [
      { parameter: 'Serum Sodium (Na+)', unit: 'mEq/L', referenceRange: '135 - 145', defaultExpectedValue: '140' },
      { parameter: 'Serum Potassium (K+)', unit: 'mEq/L', referenceRange: '3.5 - 5.0', defaultExpectedValue: '4.2' },
      { parameter: 'Serum Chloride (Cl-)', unit: 'mEq/L', referenceRange: '96 - 106', defaultExpectedValue: '102' },
      { parameter: 'Bicarbonate (HCO3-)', unit: 'mEq/L', referenceRange: '22 - 28', defaultExpectedValue: '24' },
      { parameter: 'Ionized Calcium', unit: 'mmol/L', referenceRange: '1.15 - 1.33', defaultExpectedValue: '1.24' }
    ]
  }
];

interface PathologyDashboardProps {
  onOpenInventory: () => void;
}

export const PathologyDashboard: React.FC<PathologyDashboardProps> = ({ onOpenInventory }) => {
  const {
    activeClinic,
    currentUser,
    testOrders,
    currentClinicTestOrders,
    updateTestStatus,
    recordTestResults,
    inventory,
    currentClinicInventory,
    currentClinicAvailableTests,
    addAvailableTest,
    updateAvailableTest,
    deleteAvailableTest,
    toggleAvailableTestStatus,
    currentClinicInsurancePolicies,
    currentClinicPatients,
    currentClinicDepartments,
    currentClinicWards
  } = useClinic();

  const availableInsurancePolicies = useMemo(() => {
    return (currentClinicInsurancePolicies || []).filter(p => p.status === 'active');
  }, [currentClinicInsurancePolicies]);

  const [activeTab, setActiveTab] = useState<'queue' | 'recent_patients' | 'catalog' | 'reagents'>('queue');
  const [selectedTest, setSelectedTest] = useState<TestOrder | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [printModalData, setPrintModalData] = useState<any>(null);

  useEffect(() => {
    if (activeClinic) {
      preloadClinicLogo(activeClinic.logoUrl, activeClinic);
    }
  }, [activeClinic]);

  // Document Attachments for patient results (stored in Prime Admin's cloud account)
  const [testAttachments, setTestAttachments] = useState<ClinicalAttachment[]>([]);
  const [viewingAttachment, setViewingAttachment] = useState<ClinicalAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Patient Map Helper
  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    currentClinicPatients.forEach(p => {
      map.set(p.id, p);
      if (p.mrn) map.set(p.mrn, p);
    });
    return map;
  }, [currentClinicPatients]);

  const getOrderPatient = (order: { patientId: string; patientMrn?: string }): Patient | undefined => {
    return patientMap.get(order.patientId) || (order.patientMrn ? patientMap.get(order.patientMrn) : undefined);
  };

  // Queue Filter & Sort State
  const [queueSearchTerm, setQueueSearchTerm] = useState('');
  const [queuePriorityFilter, setQueuePriorityFilter] = useState<'all' | 'STAT' | 'Urgent' | 'Routine'>('all');
  const [queuePatientTypeFilter, setQueuePatientTypeFilter] = useState<'all' | 'OPD' | 'IPD'>('all');
  const [queueCategoryFilter, setQueueCategoryFilter] = useState<string>('all');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>('all');
  const [selectedBedFilter, setSelectedBedFilter] = useState<string>('all');
  const [queueSortKey, setQueueSortKey] = useState<'date' | 'patient' | 'test' | 'mrn' | 'priority' | 'age'>('date');
  const [queueSortOrder, setQueueSortOrder] = useState<'asc' | 'desc'>('desc');

  // Recent Patients / Results Filter & Sort State
  const [recentSearchTerm, setRecentSearchTerm] = useState('');
  const [recentCategoryFilter, setRecentCategoryFilter] = useState<string>('all');
  const [recentDepartmentFilter, setRecentDepartmentFilter] = useState<string>('all');
  const [recentRoomFilter, setRecentRoomFilter] = useState<string>('all');
  const [recentWardFilter, setRecentWardFilter] = useState<string>('all');
  const [recentBedFilter, setRecentBedFilter] = useState<string>('all');
  const [recentSortKey, setRecentSortKey] = useState<'date' | 'patient' | 'test' | 'mrn'>('date');
  const [recentSortOrder, setRecentSortOrder] = useState<'asc' | 'desc'>('desc');

  // Catalog Filter & Sort State
  const [searchFilter, setSearchFilter] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('all');
  const [catalogSortKey, setCatalogSortKey] = useState<'name' | 'code' | 'price' | 'category'>('name');
  const [catalogSortOrder, setCatalogSortOrder] = useState<'asc' | 'desc'>('asc');

  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
  const [expandedCardTestId, setExpandedCardTestId] = useState<string | null>(null);
  const [insurancePricingTest, setInsurancePricingTest] = useState<AvailableTest | null>(null);
  const [newItemInsurancePrices, setNewItemInsurancePrices] = useState<Record<string, number>>({});

  // Catalog item editing states
  const [editingCatalogTestId, setEditingCatalogTestId] = useState<string | null>(null);
  const [editingTestModal, setEditingTestModal] = useState<AvailableTest | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    code: string;
    category: AvailableTest['category'];
    price: number;
    sampleOrBodyPart: string;
    turnaroundTime: string;
    description: string;
    isActive: boolean;
    insurancePrices: Record<string, number>;
    resultType: TestResultType;
    expectedOutcome: string;
    parameters: TestParameterDefinition[];
  }>({
    name: '',
    code: '',
    category: 'Hematology',
    price: 35,
    sampleOrBodyPart: 'Whole Blood (EDTA)',
    turnaroundTime: '1-2 Hours',
    description: '',
    isActive: true,
    insurancePrices: {},
    resultType: 'ranges',
    expectedOutcome: 'Negative',
    parameters: []
  });

  // Result entry form state
  const [resultsList, setResultsList] = useState<NonNullable<TestOrder['results']>>([]);
  const [technicianNotes, setTechnicianNotes] = useState('');

  // Add Test to Catalog Form State
  const [newTestForm, setNewTestForm] = useState<{
    name: string;
    code: string;
    category: AvailableTest['category'];
    price: number;
    sampleOrBodyPart: string;
    turnaroundTime: string;
    description: string;
    isActive: boolean;
    resultType: TestResultType;
    expectedOutcome: string;
    parameters: TestParameterDefinition[];
  }>({
    name: '',
    code: '',
    category: 'Hematology',
    price: 35,
    sampleOrBodyPart: 'Whole Blood (EDTA)',
    turnaroundTime: '1-2 Hours',
    description: '',
    isActive: true,
    resultType: 'ranges',
    expectedOutcome: 'Negative',
    parameters: [
      { parameter: 'Diagnostic Biomarker Level', unit: 'U/L', referenceRange: '10 - 40', defaultExpectedValue: '25' }
    ]
  });

  const basePendingTests = useMemo(() => {
    return currentClinicTestOrders.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  }, [currentClinicTestOrders]);

  const baseCompletedTests = useMemo(() => {
    return currentClinicTestOrders.filter(t => t.status === 'completed');
  }, [currentClinicTestOrders]);

  // Unique departments
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    if (currentClinicDepartments && Array.isArray(currentClinicDepartments)) {
      currentClinicDepartments.forEach(d => { if (d.name) set.add(d.name); });
    }
    currentClinicPatients.forEach(p => {
      if (p.department) set.add(p.department);
    });
    return Array.from(set).sort();
  }, [currentClinicDepartments, currentClinicPatients]);

  // Unique rooms
  const availableRooms = useMemo(() => {
    const set = new Set<string>();
    if (selectedDepartmentFilter !== 'all') {
      const targetDept = currentClinicDepartments?.find(d => d.name === selectedDepartmentFilter);
      if (targetDept?.rooms) targetDept.rooms.forEach(r => set.add(r));
      currentClinicPatients
        .filter(p => (p.department || (p.patientType === 'IPD' ? 'Inpatient Ward' : 'General Outpatient (OPD)')) === selectedDepartmentFilter)
        .forEach(p => { if (p.doctorRoom) set.add(p.doctorRoom); });
    } else {
      if (currentClinicDepartments && Array.isArray(currentClinicDepartments)) {
        currentClinicDepartments.forEach(d => { if (d.rooms) d.rooms.forEach(r => set.add(r)); });
      }
      currentClinicPatients.forEach(p => { if (p.doctorRoom) set.add(p.doctorRoom); });
    }
    return Array.from(set).sort();
  }, [currentClinicDepartments, currentClinicPatients, selectedDepartmentFilter]);

  // Unique wards
  const availableWards = useMemo(() => {
    const set = new Set<string>();
    if (currentClinicWards && Array.isArray(currentClinicWards)) {
      currentClinicWards.forEach(w => { if (w.name) set.add(w.name); });
    }
    currentClinicPatients.forEach(p => {
      if (p.ward) set.add(p.ward);
    });
    return Array.from(set).sort();
  }, [currentClinicWards, currentClinicPatients]);

  // Unique beds
  const availableBeds = useMemo(() => {
    const set = new Set<string>();
    if (selectedWardFilter !== 'all') {
      const targetWard = currentClinicWards?.find(w => w.name === selectedWardFilter);
      if (targetWard?.beds) targetWard.beds.forEach(b => set.add(b));
      currentClinicPatients
        .filter(p => p.ward === selectedWardFilter)
        .forEach(p => { if (p.bedNumber) set.add(p.bedNumber); });
    } else {
      if (currentClinicWards && Array.isArray(currentClinicWards)) {
        currentClinicWards.forEach(w => { if (w.beds) w.beds.forEach(b => set.add(b)); });
      }
      currentClinicPatients.forEach(p => { if (p.bedNumber) set.add(p.bedNumber); });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [currentClinicWards, currentClinicPatients, selectedWardFilter]);

  // Filtered & Sorted Pending Tests
  const filteredPendingTests = useMemo(() => {
    let result = [...basePendingTests];

    if (queueSearchTerm.trim()) {
      const q = queueSearchTerm.toLowerCase().trim();
      result = result.filter(t => {
        const patient = getOrderPatient(t);
        const pName = t.patientName.toLowerCase();
        const pMrn = t.patientMrn.toLowerCase();
        const tName = t.testName.toLowerCase();
        const tCode = t.testCode.toLowerCase();
        const dName = t.doctorName.toLowerCase();
        const ind = (t.clinicalIndication || '').toLowerCase();
        const ward = (patient?.ward || '').toLowerCase();
        const bed = (patient?.bedNumber || '').toLowerCase();
        const dept = (patient?.department || '').toLowerCase();
        const room = (patient?.doctorRoom || '').toLowerCase();
        return pName.includes(q) || pMrn.includes(q) || tName.includes(q) || tCode.includes(q) || dName.includes(q) || ind.includes(q) || ward.includes(q) || bed.includes(q) || dept.includes(q) || room.includes(q);
      });
    }

    if (queuePriorityFilter !== 'all') {
      result = result.filter(t => t.priority === queuePriorityFilter);
    }

    if (queuePatientTypeFilter !== 'all') {
      result = result.filter(t => {
        const patient = getOrderPatient(t);
        const pType = patient?.patientType || 'OPD';
        return pType === queuePatientTypeFilter;
      });
    }

    if (queueCategoryFilter !== 'all') {
      result = result.filter(t => t.category === queueCategoryFilter);
    }

    if (selectedDepartmentFilter !== 'all') {
      result = result.filter(t => {
        const patient = getOrderPatient(t);
        const pDept = patient?.department || (patient?.patientType === 'IPD' ? 'Inpatient Ward' : 'General Outpatient (OPD)');
        return pDept.toLowerCase() === selectedDepartmentFilter.toLowerCase() || patient?.department === selectedDepartmentFilter;
      });
    }

    if (selectedRoomFilter !== 'all') {
      result = result.filter(t => {
        const patient = getOrderPatient(t);
        const pRoom = patient?.doctorRoom || (patient?.patientType === 'IPD' ? (patient?.ward || 'Ward') : 'Consultation Room 1');
        return pRoom.toLowerCase() === selectedRoomFilter.toLowerCase() || patient?.doctorRoom === selectedRoomFilter;
      });
    }

    if (selectedWardFilter !== 'all') {
      result = result.filter(t => {
        const patient = getOrderPatient(t);
        return (patient?.ward || '') === selectedWardFilter;
      });
    }

    if (selectedBedFilter !== 'all') {
      result = result.filter(t => {
        const patient = getOrderPatient(t);
        return (patient?.bedNumber || '') === selectedBedFilter;
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (queueSortKey === 'date') {
        cmp = new Date(a.orderedAt).getTime() - new Date(b.orderedAt).getTime();
      } else if (queueSortKey === 'patient') {
        cmp = a.patientName.localeCompare(b.patientName);
      } else if (queueSortKey === 'test') {
        cmp = a.testName.localeCompare(b.testName);
      } else if (queueSortKey === 'mrn') {
        cmp = a.patientMrn.localeCompare(b.patientMrn, undefined, { numeric: true });
      } else if (queueSortKey === 'priority') {
        const priorityWeight: Record<string, number> = { 'STAT': 3, 'Urgent': 2, 'Routine': 1 };
        cmp = (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0);
      } else if (queueSortKey === 'age') {
        const ageA = getAgeInYears(getOrderPatient(a)?.age ?? 0);
        const ageB = getAgeInYears(getOrderPatient(b)?.age ?? 0);
        cmp = ageA - ageB;
      }
      return queueSortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [
    basePendingTests,
    queueSearchTerm,
    queuePriorityFilter,
    queuePatientTypeFilter,
    queueCategoryFilter,
    selectedDepartmentFilter,
    selectedRoomFilter,
    selectedWardFilter,
    selectedBedFilter,
    queueSortKey,
    queueSortOrder,
    patientMap
  ]);

  // Filtered & Sorted Completed Tests
  const filteredCompletedTests = useMemo(() => {
    let result = [...baseCompletedTests];

    if (recentSearchTerm.trim()) {
      const q = recentSearchTerm.toLowerCase().trim();
      result = result.filter(t => {
        const patient = getOrderPatient(t);
        const pName = t.patientName.toLowerCase();
        const pMrn = t.patientMrn.toLowerCase();
        const tName = t.testName.toLowerCase();
        const tCode = t.testCode.toLowerCase();
        const dName = t.doctorName.toLowerCase();
        const remarks = (t.labTechnicianNotes || '').toLowerCase();
        const ward = (patient?.ward || '').toLowerCase();
        const bed = (patient?.bedNumber || '').toLowerCase();
        const dept = (patient?.department || '').toLowerCase();
        const room = (patient?.doctorRoom || '').toLowerCase();
        return pName.includes(q) || pMrn.includes(q) || tName.includes(q) || tCode.includes(q) || dName.includes(q) || remarks.includes(q) || ward.includes(q) || bed.includes(q) || dept.includes(q) || room.includes(q);
      });
    }

    if (recentCategoryFilter !== 'all') {
      result = result.filter(t => t.category === recentCategoryFilter);
    }

    if (recentDepartmentFilter !== 'all') {
      result = result.filter(t => {
        const patient = getOrderPatient(t);
        const pDept = patient?.department || (patient?.patientType === 'IPD' ? 'Inpatient Ward' : 'General Outpatient (OPD)');
        return pDept.toLowerCase() === recentDepartmentFilter.toLowerCase() || patient?.department === recentDepartmentFilter;
      });
    }

    if (recentRoomFilter !== 'all') {
      result = result.filter(t => {
        const patient = getOrderPatient(t);
        const pRoom = patient?.doctorRoom || (patient?.patientType === 'IPD' ? (patient?.ward || 'Ward') : 'Consultation Room 1');
        return pRoom.toLowerCase() === recentRoomFilter.toLowerCase() || patient?.doctorRoom === recentRoomFilter;
      });
    }

    if (recentWardFilter !== 'all') {
      result = result.filter(t => {
        const patient = getOrderPatient(t);
        return (patient?.ward || '') === recentWardFilter;
      });
    }

    if (recentBedFilter !== 'all') {
      result = result.filter(t => {
        const patient = getOrderPatient(t);
        return (patient?.bedNumber || '') === recentBedFilter;
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (recentSortKey === 'date') {
        cmp = new Date(a.completedAt || a.orderedAt).getTime() - new Date(b.completedAt || b.orderedAt).getTime();
      } else if (recentSortKey === 'patient') {
        cmp = a.patientName.localeCompare(b.patientName);
      } else if (recentSortKey === 'test') {
        cmp = a.testName.localeCompare(b.testName);
      } else if (recentSortKey === 'mrn') {
        cmp = a.patientMrn.localeCompare(b.patientMrn, undefined, { numeric: true });
      }
      return recentSortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [
    baseCompletedTests,
    recentSearchTerm,
    recentCategoryFilter,
    recentDepartmentFilter,
    recentRoomFilter,
    recentWardFilter,
    recentBedFilter,
    recentSortKey,
    recentSortOrder,
    patientMap
  ]);

  const reagentsStock = currentClinicInventory.filter(
    i => i.category === 'lab_reagent' || i.department === 'pathology'
  );

  const pathologyCatalog = currentClinicAvailableTests.filter(t => t.department === 'pathology');

  const filteredCatalog = useMemo(() => {
    let result = [...pathologyCatalog];
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.sampleOrBodyPart && t.sampleOrBodyPart.toLowerCase().includes(q))
      );
    }
    if (catalogCategoryFilter !== 'all') {
      result = result.filter(t => t.category === catalogCategoryFilter);
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (catalogSortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (catalogSortKey === 'code') cmp = a.code.localeCompare(b.code);
      else if (catalogSortKey === 'price') cmp = a.price - b.price;
      else if (catalogSortKey === 'category') cmp = a.category.localeCompare(b.category);
      return catalogSortOrder === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [pathologyCatalog, searchFilter, catalogCategoryFilter, catalogSortKey, catalogSortOrder]);

  const handleOpenResultModal = (test: TestOrder) => {
    setSelectedTest(test);
    setTestAttachments(test.attachments ? [...test.attachments] : []);

    // Look for matching test definition in availableTests catalog
    const matchedCatalogTest = currentClinicAvailableTests.find(
      t => t.code.toUpperCase() === test.testCode.toUpperCase() ||
           t.name.toLowerCase() === test.testName.toLowerCase()
    );

    if (matchedCatalogTest?.parameters && matchedCatalogTest.parameters.length > 0) {
      setResultsList(
        matchedCatalogTest.parameters.map(p => ({
          parameter: p.parameter,
          value: p.defaultExpectedValue || (matchedCatalogTest.resultType === 'positive_negative' ? 'Negative' : (matchedCatalogTest.resultType === 'reactive_non_reactive' ? 'Non-reactive' : '')),
          unit: p.unit || '',
          referenceRange: p.referenceRange || '',
          flag: 'Normal'
        }))
      );
    } else if (matchedCatalogTest?.resultType === 'positive_negative') {
      const outcome = matchedCatalogTest.expectedOutcome || 'Negative';
      setResultsList([
        {
          parameter: test.testName,
          value: outcome,
          unit: 'Rapid Ag/Ab',
          referenceRange: outcome,
          flag: 'Normal'
        }
      ]);
    } else if (matchedCatalogTest?.resultType === 'reactive_non_reactive') {
      const outcome = matchedCatalogTest.expectedOutcome || 'Non-reactive';
      setResultsList([
        {
          parameter: test.testName,
          value: outcome,
          unit: 'Serology',
          referenceRange: outcome,
          flag: 'Normal'
        }
      ]);
    } else if (test.testCode.includes('CBC') || test.testName.toLowerCase().includes('cbc') || test.testName.toLowerCase().includes('blood count')) {
      setResultsList([
        { parameter: 'Hemoglobin (Hb)', value: '13.5', unit: 'g/dL', referenceRange: '12.0 - 16.5', flag: 'Normal' },
        { parameter: 'White Blood Cells (WBC)', value: '7.8', unit: 'x10^9/L', referenceRange: '4.0 - 10.0', flag: 'Normal' },
        { parameter: 'Platelet Count', value: '265', unit: 'x10^9/L', referenceRange: '150 - 450', flag: 'Normal' },
        { parameter: 'Neutrophils %', value: '62', unit: '%', referenceRange: '40 - 70', flag: 'Normal' },
        { parameter: 'Lymphocytes %', value: '30', unit: '%', referenceRange: '20 - 45', flag: 'Normal' }
      ]);
    } else if (test.testCode.includes('GLU') || test.testName.toLowerCase().includes('glucose') || test.testName.toLowerCase().includes('sugar')) {
      setResultsList([
        { parameter: 'Fasting Blood Glucose', value: '98', unit: 'mg/dL', referenceRange: '70 - 99', flag: 'Normal' },
        { parameter: 'Estimated HbA1c', value: '5.4', unit: '%', referenceRange: '< 5.7', flag: 'Normal' }
      ]);
    } else if (test.testCode.includes('URN') || test.testName.toLowerCase().includes('urine') || test.testName.toLowerCase().includes('urinalysis')) {
      setResultsList([
        { parameter: 'Urine Leucocytes', value: 'Negative', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Normal' },
        { parameter: 'Urine Nitrites', value: 'Negative', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Normal' },
        { parameter: 'Urine Protein', value: 'Negative', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Normal' },
        { parameter: 'Urine Glucose', value: 'Negative', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Normal' },
        { parameter: 'Specific Gravity', value: '1.018', unit: 'Index', referenceRange: '1.005 - 1.030', flag: 'Normal' }
      ]);
    } else if (test.testCode.includes('MAL') || test.testName.toLowerCase().includes('malaria')) {
      setResultsList([
        { parameter: 'Malaria Rapid Ag (Pf/Pan)', value: 'Negative', unit: 'RDT', referenceRange: 'Negative', flag: 'Normal' },
        { parameter: 'Giemsa Smear Parasitaemia', value: 'No parasites seen', unit: 'Microscopy', referenceRange: 'Negative', flag: 'Normal' }
      ]);
    } else if (test.testCode.includes('LFT') || test.testName.toLowerCase().includes('liver')) {
      setResultsList([
        { parameter: 'ALT (SGPT)', value: '28', unit: 'U/L', referenceRange: '7 - 56', flag: 'Normal' },
        { parameter: 'AST (SGOT)', value: '24', unit: 'U/L', referenceRange: '10 - 40', flag: 'Normal' },
        { parameter: 'Total Bilirubin', value: '0.8', unit: 'mg/dL', referenceRange: '0.2 - 1.2', flag: 'Normal' },
        { parameter: 'Alkaline Phosphatase (ALP)', value: '75', unit: 'U/L', referenceRange: '44 - 147', flag: 'Normal' },
        { parameter: 'Serum Albumin', value: '4.2', unit: 'g/dL', referenceRange: '3.5 - 5.0', flag: 'Normal' }
      ]);
    } else if (test.testCode.includes('RFT') || test.testName.toLowerCase().includes('renal') || test.testName.toLowerCase().includes('kidney')) {
      setResultsList([
        { parameter: 'Serum Creatinine', value: '0.9', unit: 'mg/dL', referenceRange: '0.6 - 1.2', flag: 'Normal' },
        { parameter: 'Blood Urea Nitrogen (BUN)', value: '14', unit: 'mg/dL', referenceRange: '7 - 20', flag: 'Normal' },
        { parameter: 'Serum Sodium (Na+)', value: '140', unit: 'mEq/L', referenceRange: '135 - 145', flag: 'Normal' },
        { parameter: 'Serum Potassium (K+)', value: '4.2', unit: 'mEq/L', referenceRange: '3.5 - 5.0', flag: 'Normal' }
      ]);
    } else {
      setResultsList([
        { parameter: 'Diagnostic Biomarker Level', value: '18.5', unit: 'U/L', referenceRange: '10 - 40', flag: 'Normal' }
      ]);
    }
    setResultModalOpen(true);
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (file.size > 8 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 8MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) return;
        const newAttachment: ClinicalAttachment = {
          id: `att-lab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser.name || 'Pathology Specialist',
          storageType: 'prime_admin_cloud'
        };
        setTestAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleExportTestExcel = (test: TestOrder) => {
    exportSinglePathologyOrderToExcel(test, activeClinic);
  };

  const handleExportAllTestsExcel = () => {
    exportPathologyOrdersListToExcel(
      filteredCompletedTests,
      activeClinic,
      recentCategoryFilter !== 'all' ? `Pathology ${recentCategoryFilter} Results` : 'Pathology Results Registry'
    );
  };

  const handleExportCatalogExcel = () => {
    exportPathologyCatalogToExcel(filteredCatalog, activeClinic);
  };

  const handleSaveResults = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;

    // Deduct reagent if matched
    const matchedReagent = reagentsStock[0];
    const reagentsUsed = matchedReagent ? [{
      inventoryItemId: matchedReagent.id,
      reagentName: matchedReagent.name,
      quantityUsed: 1,
      unit: 'test pack'
    }] : undefined;

    // Save test results and attachments directly to Prime Admin's cloud account partition
    recordTestResults(
      selectedTest.id,
      resultsList,
      technicianNotes,
      reagentsUsed,
      testAttachments
    );
    setResultModalOpen(false);
    setTestAttachments([]);

    // Switch to recent patients tab for immediate review, print, and PDF export
    setActiveTab('recent_patients');
  };

  const handleStartEditModal = (test: AvailableTest) => {
    setEditingTestModal(test);
    setEditFormData({
      name: test.name,
      code: test.code,
      category: test.category,
      price: test.price,
      sampleOrBodyPart: test.sampleOrBodyPart || '',
      turnaroundTime: test.turnaroundTime || '',
      description: test.description || '',
      isActive: test.isActive,
      insurancePrices: test.insurancePrices ? { ...test.insurancePrices } : {},
      resultType: test.resultType || 'ranges',
      expectedOutcome: test.expectedOutcome || 'Negative',
      parameters: test.parameters && test.parameters.length > 0
        ? test.parameters.map(p => ({ ...p }))
        : (test.resultType === 'positive_negative' || test.resultType === 'reactive_non_reactive'
            ? []
            : [{ parameter: test.name || 'Biomarker Level', unit: 'U/L', referenceRange: '10 - 40', defaultExpectedValue: '25' }])
    });
  };

  const handleSaveEditedModalTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTestModal || !editFormData.name.trim() || !editFormData.code.trim()) return;

    const sanitizedParams = editFormData.resultType === 'ranges'
      ? editFormData.parameters.filter(p => p.parameter.trim() !== '')
      : (editFormData.resultType === 'positive_negative' || editFormData.resultType === 'reactive_non_reactive'
          ? [{
              parameter: editFormData.name.trim(),
              unit: editFormData.resultType === 'positive_negative' ? 'Rapid Ag/Ab' : 'Serology',
              referenceRange: editFormData.expectedOutcome,
              defaultExpectedValue: editFormData.expectedOutcome
            }]
          : undefined);

    updateAvailableTest(editingTestModal.id, {
      name: editFormData.name.trim(),
      code: editFormData.code.trim().toUpperCase(),
      category: editFormData.category,
      price: Number(editFormData.price),
      sampleOrBodyPart: editFormData.sampleOrBodyPart.trim() || undefined,
      turnaroundTime: editFormData.turnaroundTime.trim() || undefined,
      description: editFormData.description.trim() || undefined,
      isActive: editFormData.isActive,
      insurancePrices: Object.keys(editFormData.insurancePrices).length > 0 ? editFormData.insurancePrices : undefined,
      resultType: editFormData.resultType,
      expectedOutcome: (editFormData.resultType === 'positive_negative' || editFormData.resultType === 'reactive_non_reactive')
        ? editFormData.expectedOutcome
        : undefined,
      parameters: sanitizedParams
    });

    setEditingTestModal(null);
  };

  const handleLoadTestIntoSidebar = (test: AvailableTest) => {
    setEditingCatalogTestId(test.id);
    setNewTestForm({
      name: test.name,
      code: test.code,
      category: test.category,
      price: test.price,
      sampleOrBodyPart: test.sampleOrBodyPart || '',
      turnaroundTime: test.turnaroundTime || '',
      description: test.description || '',
      isActive: test.isActive,
      resultType: test.resultType || 'ranges',
      expectedOutcome: test.expectedOutcome || 'Negative',
      parameters: test.parameters && test.parameters.length > 0
        ? test.parameters.map(p => ({ ...p }))
        : (test.resultType === 'positive_negative' || test.resultType === 'reactive_non_reactive'
            ? []
            : [{ parameter: test.name || 'Biomarker Level', unit: 'U/L', referenceRange: '10 - 40', defaultExpectedValue: '25' }])
    });
    setNewItemInsurancePrices(test.insurancePrices ? { ...test.insurancePrices } : {});
  };

  const handleCancelSidebarEdit = () => {
    setEditingCatalogTestId(null);
    setNewTestForm({
      name: '',
      code: '',
      category: 'Hematology',
      price: 35,
      sampleOrBodyPart: 'Whole Blood (EDTA)',
      turnaroundTime: '1-2 Hours',
      description: '',
      isActive: true,
      resultType: 'ranges',
      expectedOutcome: 'Negative',
      parameters: [
        { parameter: 'Diagnostic Biomarker Level', unit: 'U/L', referenceRange: '10 - 40', defaultExpectedValue: '25' }
      ]
    });
    setNewItemInsurancePrices({});
  };

  const handleAddCatalogTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestForm.name || !newTestForm.code) return;

    const sanitizedParams = newTestForm.resultType === 'ranges'
      ? newTestForm.parameters.filter(p => p.parameter.trim() !== '')
      : (newTestForm.resultType === 'positive_negative' || newTestForm.resultType === 'reactive_non_reactive'
          ? [{
              parameter: newTestForm.name.trim(),
              unit: newTestForm.resultType === 'positive_negative' ? 'Rapid Ag/Ab' : 'Serology',
              referenceRange: newTestForm.expectedOutcome,
              defaultExpectedValue: newTestForm.expectedOutcome
            }]
          : undefined);

    const testPayload = {
      name: newTestForm.name.trim(),
      code: newTestForm.code.trim().toUpperCase(),
      department: 'pathology' as const,
      category: newTestForm.category,
      price: Number(newTestForm.price),
      insurancePrices: Object.keys(newItemInsurancePrices).length > 0 ? newItemInsurancePrices : undefined,
      sampleOrBodyPart: newTestForm.sampleOrBodyPart.trim() || 'Whole Blood / Specimen',
      turnaroundTime: newTestForm.turnaroundTime.trim() || '1-2 Hours',
      description: newTestForm.description.trim() || undefined,
      isActive: newTestForm.isActive,
      resultType: newTestForm.resultType,
      expectedOutcome: (newTestForm.resultType === 'positive_negative' || newTestForm.resultType === 'reactive_non_reactive')
        ? newTestForm.expectedOutcome
        : undefined,
      parameters: sanitizedParams
    };

    if (editingCatalogTestId) {
      updateAvailableTest(editingCatalogTestId, testPayload);
      setEditingCatalogTestId(null);
    } else {
      addAvailableTest({
        clinicId: activeClinic.id,
        ...testPayload
      });
    }

    setNewTestForm({
      name: '',
      code: '',
      category: 'Hematology',
      price: 35,
      sampleOrBodyPart: 'Whole Blood (EDTA)',
      turnaroundTime: '1-2 Hours',
      description: '',
      isActive: true,
      resultType: 'ranges',
      expectedOutcome: 'Negative',
      parameters: [
        { parameter: 'Diagnostic Biomarker Level', unit: 'U/L', referenceRange: '10 - 40', defaultExpectedValue: '25' }
      ]
    });
    setNewItemInsurancePrices({});
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <Microscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">Pathology & Laboratory Diagnostic Suite</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                {currentUser.name}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Investigation Orders &bull; Test Catalog Management &bull; PDF & Excel Diagnostic Reports
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('catalog')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Available Tests
          </button>

          <button
            onClick={onOpenInventory}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            Stock Matrix
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex flex-wrap items-center gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'queue' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Diagnostic Queue</span>
          {basePendingTests.length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full font-bold">
              {basePendingTests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('recent_patients')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'recent_patients' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Recent Patients & Results Archive ({baseCompletedTests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'catalog' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Available Test Catalog ({pathologyCatalog.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reagents')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'reagents' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          <span>Reagents & Consumables ({reagentsStock.length})</span>
        </button>
      </div>

      {/* Tab 1: Pending Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filter & Sort Controls Strip */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-sm">Active Pathology Investigation Queue</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {filteredPendingTests.length} of {basePendingTests.length} Orders
                    </span>
                    <span className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                      <SlidersHorizontal className="w-2.5 h-2.5 text-amber-600" />
                      Sorted by {queueSortKey === 'patient' ? 'Patient' : queueSortKey === 'test' ? 'Test Name' : queueSortKey === 'date' ? 'Date & Time' : queueSortKey === 'mrn' ? 'MRN' : queueSortKey === 'priority' ? 'Priority' : 'Age'} ({queueSortOrder === 'asc' ? 'Asc' : 'Desc'})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Filter and process lab specimens, run analyzers, and certify diagnostic results
                  </p>
                </div>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by patient, MRN, test, ward..."
                    value={queueSearchTerm}
                    onChange={(e) => setQueueSearchTerm(e.target.value)}
                    className="pl-8 pr-7 py-1.5 border border-slate-200 rounded-md text-xs bg-slate-50 focus:bg-white text-slate-900 w-56 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  {queueSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setQueueSearchTerm('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {/* Sort Selector */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                  <SlidersHorizontal className="w-3 h-3 text-amber-600" />
                  <span className="text-[10px] font-bold text-slate-600">Sort:</span>
                  <select
                    value={queueSortKey}
                    onChange={(e) => setQueueSortKey(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="date">Date & Time</option>
                    <option value="patient">Patient Name (A-Z)</option>
                    <option value="test">Test Name</option>
                    <option value="mrn">OPD / IPD #</option>
                    <option value="priority">Priority (STAT first)</option>
                    <option value="age">Age</option>
                  </select>
                </div>

                {/* Order Direction Toggle */}
                <button
                  type="button"
                  onClick={() => setQueueSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-md font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                  title={`Toggle sort order (currently ${queueSortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
                >
                  {queueSortOrder === 'asc' ? (
                    <>
                      <ArrowUp className="w-3 h-3 text-amber-700" />
                      <span>Asc</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-3 h-3 text-amber-700" />
                      <span>Desc</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Priority & Admission Type Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-400" />
                  Priority:
                </span>
                <button
                  type="button"
                  onClick={() => setQueuePriorityFilter('all')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                    queuePriorityFilter === 'all'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All ({basePendingTests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueuePriorityFilter('STAT')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                    queuePriorityFilter === 'STAT'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  STAT ({basePendingTests.filter(t => t.priority === 'STAT').length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueuePriorityFilter('Urgent')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                    queuePriorityFilter === 'Urgent'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  Urgent ({basePendingTests.filter(t => t.priority === 'Urgent').length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueuePriorityFilter('Routine')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                    queuePriorityFilter === 'Routine'
                      ? 'bg-slate-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Routine ({basePendingTests.filter(t => t.priority === 'Routine').length})
                </button>

                <div className="h-4 w-px bg-slate-200 mx-1" />

                <span className="text-slate-500 font-medium mr-1">Type:</span>
                <button
                  type="button"
                  onClick={() => setQueuePatientTypeFilter('all')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                    queuePatientTypeFilter === 'all'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setQueuePatientTypeFilter('OPD')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                    queuePatientTypeFilter === 'OPD'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200'
                  }`}
                >
                  OPD
                </button>
                <button
                  type="button"
                  onClick={() => setQueuePatientTypeFilter('IPD')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                    queuePatientTypeFilter === 'IPD'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  IPD Inpatient
                </button>
              </div>

              {(queueSearchTerm || queuePriorityFilter !== 'all' || queuePatientTypeFilter !== 'all' || queueCategoryFilter !== 'all' || selectedDepartmentFilter !== 'all' || selectedRoomFilter !== 'all' || selectedWardFilter !== 'all' || selectedBedFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setQueueSearchTerm('');
                    setQueuePriorityFilter('all');
                    setQueuePatientTypeFilter('all');
                    setQueueCategoryFilter('all');
                    setSelectedDepartmentFilter('all');
                    setSelectedRoomFilter('all');
                    setSelectedWardFilter('all');
                    setSelectedBedFilter('all');
                  }}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Clear Filters
                </button>
              )}
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
                    <option value="all">All Departments ({basePendingTests.length})</option>
                    {availableDepartments.map(dept => {
                      const count = basePendingTests.filter(t => {
                        const patient = getOrderPatient(t);
                        const pDept = patient?.department || (patient?.patientType === 'IPD' ? 'Inpatient Ward' : 'General Outpatient (OPD)');
                        return pDept.toLowerCase() === dept.toLowerCase() || patient?.department === dept;
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
                      const count = basePendingTests.filter(t => {
                        const patient = getOrderPatient(t);
                        const matchesDept = selectedDepartmentFilter === 'all' ||
                          (patient?.department || (patient?.patientType === 'IPD' ? 'Inpatient Ward' : 'General Outpatient (OPD)')).toLowerCase() === selectedDepartmentFilter.toLowerCase();
                        const pRoom = patient?.doctorRoom || (patient?.patientType === 'IPD' ? (patient?.ward || 'Ward') : 'Consultation Room 1');
                        return matchesDept && (pRoom.toLowerCase() === room.toLowerCase() || patient?.doctorRoom === room);
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
                    <option value="all">All Wards</option>
                    {availableWards.map(ward => {
                      const count = basePendingTests.filter(t => {
                        const patient = getOrderPatient(t);
                        return patient?.ward && patient.ward.toLowerCase() === ward.toLowerCase();
                      }).length;
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
                  <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600">Bed:</span>
                  <select
                    value={selectedBedFilter}
                    onChange={(e) => setSelectedBedFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
                  >
                    <option value="all">All Beds</option>
                    {availableBeds.map(bed => {
                      const count = basePendingTests.filter(t => {
                        const patient = getOrderPatient(t);
                        const matchesWard = selectedWardFilter === 'all' || (patient?.ward && patient.ward.toLowerCase() === selectedWardFilter.toLowerCase());
                        return matchesWard && patient?.bedNumber === bed;
                      }).length;
                      return (
                        <option key={bed} value={bed}>
                          Bed {bed} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Category Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <FlaskConical className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600">Category:</span>
                  <select
                    value={queueCategoryFilter}
                    onChange={(e) => setQueueCategoryFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[150px] truncate"
                  >
                    <option value="all">All Categories</option>
                    <option value="Hematology">Hematology</option>
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Parasitology">Parasitology</option>
                    <option value="Immunology">Immunology</option>
                    <option value="Urinalysis">Urinalysis</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Test Cards List */}
          <div className="grid grid-cols-1 gap-4">
            {filteredPendingTests.map(test => {
              const patient = getOrderPatient(test);
              const isIPD = patient?.patientType === 'IPD' || Boolean(patient?.ward);

              return (
                <div
                  key={test.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-all"
                >
                  <div className="space-y-2 text-xs flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{test.testName}</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {test.testCode}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        test.priority === 'STAT' ? 'bg-rose-100 text-rose-800' :
                        test.priority === 'Urgent' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {test.priority}
                      </span>
                      <span className="text-slate-400">&bull; {test.category}</span>
                    </div>

                    {/* Patient & Location Row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-700 text-xs">
                      <span className="font-semibold text-slate-900 flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        {test.patientName}
                      </span>
                      <span>&bull;</span>
                      <span className="text-slate-500 font-mono">MRN: {test.patientMrn}</span>
                      {patient && (
                        <>
                          <span>&bull;</span>
                          <span className="text-slate-500">{formatPatientAge(patient, 'short')} &bull; {patient.gender}</span>
                        </>
                      )}
                      <span>&bull;</span>
                      {isIPD ? (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-teal-50 border border-teal-200 text-teal-800 px-2 py-0.5 rounded font-semibold">
                          <BedDouble className="w-3 h-3 text-teal-600" />
                          <span>{patient?.ward || 'General Inpatient'}</span>
                          <span>&bull;</span>
                          <span className="font-bold">Bed {patient?.bedNumber || 'N/A'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-purple-50 border border-purple-200 text-purple-800 px-2 py-0.5 rounded font-semibold">
                          <Building2 className="w-3 h-3 text-purple-600" />
                          <span>{patient?.department || 'General OPD'}</span>
                          <span>&bull;</span>
                          <DoorOpen className="w-3 h-3 text-indigo-600" />
                          <span>{patient?.doctorRoom || 'Room 1'}</span>
                        </span>
                      )}
                    </div>

                    <div className="text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div>
                        <span className="font-semibold">Ordering Physician: </span>Dr. {test.doctorName}
                      </div>
                      <div>
                        <span className="font-semibold">Ordered: </span>{new Date(test.orderedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(test.orderedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                      </div>
                    </div>

                    <div className="text-slate-600">
                      <span className="font-semibold">Clinical Indication: </span>{test.clinicalIndication || 'Routine Diagnostic Evaluation'}
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[11px] font-medium text-slate-500">Status:</span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase">
                        {test.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                    {test.status === 'pending' && (
                      <button
                        onClick={() => updateTestStatus(test.id, 'sample_collected')}
                        className="w-full sm:w-auto px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer"
                      >
                        Collect Specimen
                      </button>
                    )}
                    {test.status === 'sample_collected' && (
                      <button
                        onClick={() => updateTestStatus(test.id, 'processing')}
                        className="w-full sm:w-auto px-3 py-2 bg-sky-50 text-sky-700 border border-sky-200 rounded text-xs font-semibold cursor-pointer"
                      >
                        Run Analyzer
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenResultModal(test)}
                      className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FlaskConical className="w-4 h-4" />
                      Enter Results
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredPendingTests.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs space-y-3">
                <FlaskConical className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-600">No pathology test orders match your selected filters.</p>
                {(queueSearchTerm || queuePriorityFilter !== 'all' || queuePatientTypeFilter !== 'all' || queueCategoryFilter !== 'all' || selectedDepartmentFilter !== 'all' || selectedRoomFilter !== 'all' || selectedWardFilter !== 'all' || selectedBedFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setQueueSearchTerm('');
                      setQueuePriorityFilter('all');
                      setQueuePatientTypeFilter('all');
                      setQueueCategoryFilter('all');
                      setSelectedDepartmentFilter('all');
                      setSelectedRoomFilter('all');
                      setSelectedWardFilter('all');
                      setSelectedBedFilter('all');
                    }}
                    className="px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-bold cursor-pointer"
                  >
                    Reset Queue Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Recent Patients & Results with Print / Export PDF */}
      {activeTab === 'recent_patients' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Recently Worked Upon Patients & Diagnostic Results
              </h3>
              <p className="text-slate-500 text-[11px]">
                View certified parameter values, pathologist remarks, and export official PDF reports or Excel documents.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportAllTestsExcel}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Export all filtered completed laboratory results to an Excel document (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>Export as Excel</span>
              </button>
              <div className="text-slate-500 font-semibold text-xs">
                Showing <strong className="text-slate-900 font-bold">{filteredCompletedTests.length}</strong> of {baseCompletedTests.length} Validated Records
              </div>
            </div>
          </div>

          {/* Results Filter & Sort Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search completed results..."
                  value={recentSearchTerm}
                  onChange={(e) => setRecentSearchTerm(e.target.value)}
                  className="pl-8 pr-7 py-1.5 border border-slate-200 rounded-md text-xs bg-white text-slate-900 w-52 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {recentSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setRecentSearchTerm('')}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Department Dropdown */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-2.5 py-1">
                <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-600">Dept:</span>
                <select
                  value={recentDepartmentFilter}
                  onChange={(e) => {
                    setRecentDepartmentFilter(e.target.value);
                    setRecentRoomFilter('all');
                  }}
                  className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[140px] truncate"
                >
                  <option value="all">All Depts</option>
                  {availableDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Room Dropdown */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-2.5 py-1">
                <DoorOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-600">Room:</span>
                <select
                  value={recentRoomFilter}
                  onChange={(e) => setRecentRoomFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
                >
                  <option value="all">All Rooms</option>
                  {availableRooms.map(room => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </select>
              </div>

              {/* Ward Dropdown */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-2.5 py-1">
                <BedDouble className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-600">Ward:</span>
                <select
                  value={recentWardFilter}
                  onChange={(e) => {
                    setRecentWardFilter(e.target.value);
                    setRecentBedFilter('all');
                  }}
                  className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
                >
                  <option value="all">All Wards</option>
                  {availableWards.map(ward => (
                    <option key={ward} value={ward}>{ward}</option>
                  ))}
                </select>
              </div>

              {/* Bed Dropdown */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-2.5 py-1">
                <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-[11px] font-bold text-slate-600">Bed:</span>
                <select
                  value={recentBedFilter}
                  onChange={(e) => setRecentBedFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[110px] truncate"
                >
                  <option value="all">All Beds</option>
                  {availableBeds.map(bed => (
                    <option key={bed} value={bed}>Bed {bed}</option>
                  ))}
                </select>
              </div>

              {/* Category Dropdown */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-2.5 py-1">
                <FlaskConical className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-600">Category:</span>
                <select
                  value={recentCategoryFilter}
                  onChange={(e) => setRecentCategoryFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
                >
                  <option value="all">All</option>
                  <option value="Hematology">Hematology</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Parasitology">Parasitology</option>
                  <option value="Immunology">Immunology</option>
                  <option value="Urinalysis">Urinalysis</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-2 py-1">
                <SlidersHorizontal className="w-3 h-3 text-amber-600" />
                <span className="text-[10px] font-bold text-slate-600">Sort:</span>
                <select
                  value={recentSortKey}
                  onChange={(e) => setRecentSortKey(e.target.value as any)}
                  className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="date">Date Completed</option>
                  <option value="patient">Patient Name</option>
                  <option value="test">Test Name</option>
                  <option value="mrn">MRN #</option>
                </select>
              </div>

              {/* Order Direction Toggle */}
              <button
                type="button"
                onClick={() => setRecentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-md font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                title={`Toggle sort order (currently ${recentSortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
              >
                {recentSortOrder === 'asc' ? (
                  <>
                    <ArrowUp className="w-3 h-3 text-amber-700" />
                    <span>Asc</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3 h-3 text-amber-700" />
                    <span>Desc</span>
                  </>
                )}
              </button>

              {(recentSearchTerm || recentCategoryFilter !== 'all' || recentDepartmentFilter !== 'all' || recentRoomFilter !== 'all' || recentWardFilter !== 'all' || recentBedFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setRecentSearchTerm('');
                    setRecentCategoryFilter('all');
                    setRecentDepartmentFilter('all');
                    setRecentRoomFilter('all');
                    setRecentWardFilter('all');
                    setRecentBedFilter('all');
                  }}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {filteredCompletedTests.map(test => {
              const isExpanded = expandedResultId === test.id;
              const patient = getOrderPatient(test);
              const isIPD = patient?.patientType === 'IPD' || Boolean(patient?.ward);

              return (
                <div
                  key={test.id}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:border-slate-300 transition-all"
                >
                  <div className="p-4 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{test.testName}</span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {test.testCode}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                          Certified
                        </span>
                        <span className="text-slate-400 text-xs">&bull; {test.category}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-700 text-xs">
                        <span className="font-semibold text-slate-900 flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                          {test.patientName}
                        </span>
                        <span>&bull;</span>
                        <span className="font-mono text-slate-600">MRN: {test.patientMrn}</span>
                        {patient && (
                          <>
                            <span>&bull;</span>
                            <span className="text-slate-500">{formatPatientAge(patient, 'short')} &bull; {patient.gender}</span>
                          </>
                        )}
                        <span>&bull;</span>
                        {isIPD ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-teal-50 border border-teal-200 text-teal-800 px-2 py-0.5 rounded font-semibold">
                            <BedDouble className="w-3 h-3 text-teal-600" />
                            <span>{patient?.ward || 'General Inpatient'}</span>
                            <span>&bull;</span>
                            <span className="font-bold">Bed {patient?.bedNumber || 'N/A'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-purple-50 border border-purple-200 text-purple-800 px-2 py-0.5 rounded font-semibold">
                            <Building2 className="w-3 h-3 text-purple-600" />
                            <span>{patient?.department || 'General OPD'}</span>
                            <span>&bull;</span>
                            <DoorOpen className="w-3 h-3 text-indigo-600" />
                            <span>{patient?.doctorRoom || 'Room 1'}</span>
                          </span>
                        )}
                        <span>&bull;</span>
                        <span className="text-slate-500">Dr. {test.doctorName}</span>
                        <span>&bull;</span>
                        <span className="text-slate-500">
                          {test.completedAt ? new Date(test.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                        </span>
                        {test.attachments && test.attachments.length > 0 && (
                          <>
                            <span>&bull;</span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                              <Paperclip className="w-2.5 h-2.5 text-emerald-600" />
                              {test.attachments.length} attachment{test.attachments.length > 1 ? 's' : ''} (Prime Cloud)
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => setExpandedResultId(isExpanded ? null : test.id)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 flex items-center gap-1 font-semibold cursor-pointer shadow-xs"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" /> Collapse Details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" /> View Results Table ({test.results?.length || 0})
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => exportPathologyToPdf(test, activeClinic)}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        title="Export certified PDF document (user prints via PDF reader)"
                      >
                        <Download className="w-3.5 h-3.5" /> Export as PDF
                      </button>

                      <button
                        onClick={() => handleExportTestExcel(test)}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        title="Export test parameters and results as Excel document (.xlsx)"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" /> Export as Excel
                      </button>

                      <button
                        onClick={() => setPrintModalData(test)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        title="Open Document Preview Modal"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>
                    </div>
                  </div>

                  {/* Expanded Result View */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-200 space-y-3 bg-white">
                      {test.clinicalIndication && (
                        <div className="text-[11px] text-slate-600">
                          <span className="font-bold text-slate-800">Clinical Indication: </span>
                          {test.clinicalIndication}
                        </div>
                      )}

                      {test.results && test.results.length > 0 ? (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-left divide-y divide-slate-200">
                            <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px]">
                              <tr>
                                <th className="py-2 px-3">Investigation Parameter</th>
                                <th className="py-2 px-3">Observed Value</th>
                                <th className="py-2 px-3">Unit</th>
                                <th className="py-2 px-3">Biological Reference Range</th>
                                <th className="py-2 px-3 text-right">Interpretation Flag</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {test.results.map((res, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="py-2 px-3 font-semibold text-slate-900">{res.parameter}</td>
                                  <td className={`py-2 px-3 font-bold ${res.flag !== 'Normal' ? 'text-rose-600' : 'text-slate-900'}`}>
                                    {res.value}
                                  </td>
                                  <td className="py-2 px-3 text-slate-600">{res.unit}</td>
                                  <td className="py-2 px-3 text-slate-600">{res.referenceRange}</td>
                                  <td className="py-2 px-3 text-right">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                      res.flag === 'Normal'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-rose-50 text-rose-800 border-rose-200'
                                    }`}>
                                      {res.flag}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-slate-500 italic">No structured parameter list recorded.</p>
                      )}

                      {test.labTechnicianNotes && (
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px]">
                          <span className="font-bold">Pathologist Remarks & Clinical Notes: </span>
                          {test.labTechnicianNotes}
                        </div>
                      )}

                      {/* Patient Result Document Attachments (Stored on Prime Admin Cloud Account) */}
                      {test.attachments && test.attachments.length > 0 && (
                        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                            <span className="flex items-center gap-1.5">
                              <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                              Attached Patient Lab Documents & Slips ({test.attachments.length})
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-200">
                              Stored on Prime Admin Cloud Account
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {test.attachments.map((att) => (
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
                                    <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-800 truncate text-[11px] max-w-[170px]">
                                      {att.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {(att.size / 1024).toFixed(1)} KB • Prime Cloud
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setViewingAttachment(att)}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px] cursor-pointer"
                                  >
                                    View
                                  </button>
                                  <a
                                    href={att.dataUrl}
                                    download={att.name}
                                    className="p-1 text-slate-500 hover:text-emerald-700 rounded cursor-pointer"
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

                      <div className="flex flex-wrap justify-between items-center gap-2 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
                        <span>Certified By: <strong className="text-slate-800">{test.completedBy || 'Clinical Pathologist'}</strong></span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => exportPathologyToPdf(test, activeClinic)}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                            title="Export certified PDF document (user prints via PDF reader)"
                          >
                            <Download className="w-3.5 h-3.5" /> Export as PDF
                          </button>
                          <button
                            onClick={() => handleExportTestExcel(test)}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                            title="Export test parameters and results as Excel document (.xlsx)"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" /> Export as Excel
                          </button>
                          <button
                            onClick={() => setPrintModalData(test)}
                            className="text-amber-700 hover:text-amber-800 font-bold underline flex items-center gap-1 cursor-pointer text-xs ml-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Full Document View
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredCompletedTests.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-xs">
                No certified pathology results match your search and filter criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Available Test Catalog & Menu (Add and Manage Tests for Doctors) */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card: Add or Edit Available Test in Catalog */}
          <div className="lg:col-span-1">
            <form onSubmit={handleAddCatalogTest} className={`bg-white rounded-xl border p-5 shadow-xs space-y-4 text-xs transition-colors ${editingCatalogTestId ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}>
              <div className="pb-3 border-b border-slate-100 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    {editingCatalogTestId ? (
                      <>
                        <Pencil className="w-4 h-4 text-amber-600" />
                        Edit Diagnostic Test
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-amber-600" />
                        Add Diagnostic Test to Catalog
                      </>
                    )}
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    {editingCatalogTestId ? (
                      <span className="text-amber-700 font-semibold">
                        Editing existing catalog item. Submitting will update this test across the clinic.
                      </span>
                    ) : (
                      'Configure tests that doctors can order directly from their consultation dashboard.'
                    )}
                  </p>
                </div>
                {editingCatalogTestId && (
                  <button
                    type="button"
                    onClick={handleCancelSidebarEdit}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Test Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Thyroid Panel (TSH, Free T3, Free T4)"
                  value={newTestForm.name}
                  onChange={(e) => setNewTestForm({ ...newTestForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Test Code / SKU *</label>
                  <input
                    type="text"
                    placeholder="e.g. TFT-PANEL"
                    value={newTestForm.code}
                    onChange={(e) => setNewTestForm({ ...newTestForm, code: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono uppercase font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category *</label>
                  <select
                    value={newTestForm.category}
                    onChange={(e) => setNewTestForm({ ...newTestForm, category: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="Hematology">Hematology</option>
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Parasitology">Parasitology</option>
                    <option value="Immunology">Immunology</option>
                    <option value="Urinalysis">Urinalysis</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Standard Fee ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newTestForm.price}
                    onChange={(e) => setNewTestForm({ ...newTestForm, price: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Turnaround Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 1-2 Hours, 24 Hours"
                    value={newTestForm.turnaroundTime}
                    onChange={(e) => setNewTestForm({ ...newTestForm, turnaroundTime: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Specimen / Sample Type</label>
                <input
                  type="text"
                  placeholder="e.g. Whole Blood (EDTA), Serum, Midstream Urine"
                  value={newTestForm.sampleOrBodyPart}
                  onChange={(e) => setNewTestForm({ ...newTestForm, sampleOrBodyPart: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Clinical Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief clinical purpose and indications for doctors..."
                  value={newTestForm.description}
                  onChange={(e) => setNewTestForm({ ...newTestForm, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
                />
              </div>

              {/* Expected Results & Reference Ranges in Series */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div>
                  <label className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-amber-600" />
                    Expected Results & Normal Ranges
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Prompt and format expected findings: qualitative outcomes (Positive/Negative, Reactive/Non-reactive) or normal reference ranges in series.
                  </p>
                </div>

                {/* Format selection */}
                <div className="grid grid-cols-1 gap-2">
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setNewTestForm(prev => ({
                          ...prev,
                          resultType: 'positive_negative',
                          expectedOutcome: 'Negative'
                        }));
                      }}
                      className={`py-1.5 px-2 rounded-md font-bold text-[11px] transition-all cursor-pointer text-center ${
                        newTestForm.resultType === 'positive_negative'
                          ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-500'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      Positive / Negative
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewTestForm(prev => ({
                          ...prev,
                          resultType: 'reactive_non_reactive',
                          expectedOutcome: 'Non-reactive'
                        }));
                      }}
                      className={`py-1.5 px-2 rounded-md font-bold text-[11px] transition-all cursor-pointer text-center ${
                        newTestForm.resultType === 'reactive_non_reactive'
                          ? 'bg-white text-blue-800 shadow-xs ring-1 ring-blue-500'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      Reactive / Non-reactive
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewTestForm(prev => ({
                          ...prev,
                          resultType: 'ranges',
                          parameters: prev.parameters && prev.parameters.length > 0
                            ? prev.parameters
                            : [{ parameter: prev.name || 'Biomarker Level', unit: 'U/L', referenceRange: '10 - 40', defaultExpectedValue: '25' }]
                        }));
                      }}
                      className={`py-1.5 px-2 rounded-md font-bold text-[11px] transition-all cursor-pointer text-center ${
                        newTestForm.resultType === 'ranges'
                          ? 'bg-white text-purple-800 shadow-xs ring-1 ring-purple-500'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      Results in Ranges
                    </button>
                  </div>
                </div>

                {/* Sub-panels */}
                {newTestForm.resultType === 'positive_negative' && (
                  <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950 text-xs">Standard Expected Normal Outcome:</span>
                      <span className="text-[10px] text-emerald-700">Qualitative Rapid Ag/Ab</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                        <input
                          type="radio"
                          name="new_expected_posneg"
                          value="Negative"
                          checked={newTestForm.expectedOutcome === 'Negative'}
                          onChange={() => setNewTestForm({ ...newTestForm, expectedOutcome: 'Negative' })}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Negative (Normal / Non-infected)
                        </span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                        <input
                          type="radio"
                          name="new_expected_posneg"
                          value="Positive"
                          checked={newTestForm.expectedOutcome === 'Positive'}
                          onChange={() => setNewTestForm({ ...newTestForm, expectedOutcome: 'Positive' })}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          Positive (Positive Marker / Desired)
                        </span>
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      When certifying findings for orders of this test, technician can select Positive or Negative with 1-click.
                    </p>
                  </div>
                )}

                {newTestForm.resultType === 'reactive_non_reactive' && (
                  <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-950 text-xs">Standard Expected Normal Outcome:</span>
                      <span className="text-[10px] text-blue-700">Serology Screening</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                        <input
                          type="radio"
                          name="new_expected_react"
                          value="Non-reactive"
                          checked={newTestForm.expectedOutcome === 'Non-reactive'}
                          onChange={() => setNewTestForm({ ...newTestForm, expectedOutcome: 'Non-reactive' })}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                          Non-reactive (Normal / Negative)
                        </span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                        <input
                          type="radio"
                          name="new_expected_react"
                          value="Reactive"
                          checked={newTestForm.expectedOutcome === 'Reactive'}
                          onChange={() => setNewTestForm({ ...newTestForm, expectedOutcome: 'Reactive' })}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300">
                          Reactive (Positive Antibody / Immunity)
                        </span>
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      When certifying findings for orders of this test, technician can select Reactive or Non-reactive with 1-click.
                    </p>
                  </div>
                )}

                {newTestForm.resultType === 'ranges' && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                    {/* Presets Header */}
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          Multi-Parameter Clinical Templates:
                        </span>
                        <span className="text-[10px] text-slate-500">Auto-fill series</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {CLINICAL_PANEL_PRESETS.map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setNewTestForm(prev => ({
                                ...prev,
                                name: prev.name || preset.name,
                                category: preset.category,
                                sampleOrBodyPart: prev.sampleOrBodyPart || preset.sample,
                                resultType: 'ranges',
                                parameters: preset.parameters.map(p => ({ ...p }))
                              }));
                            }}
                            className="px-2 py-0.5 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-800 rounded text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
                            title={`Load standard ${preset.name} parameters`}
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Series Parameters Table/Rows */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs">
                          Normal Ranges in Series ({newTestForm.parameters.length})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setNewTestForm(prev => ({
                                ...prev,
                                parameters: [
                                  ...prev.parameters,
                                  {
                                    parameter: '',
                                    unit: '',
                                    referenceRange: '',
                                    defaultExpectedValue: ''
                                  }
                                ]
                              }));
                            }}
                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Plus className="w-3 h-3" /> Add Parameter
                          </button>
                          {newTestForm.parameters.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setNewTestForm(prev => ({ ...prev, parameters: [] }))}
                              className="px-2 py-0.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded text-[10px] font-semibold cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {newTestForm.parameters.length === 0 ? (
                        <div className="p-3 bg-white border border-dashed border-slate-300 rounded text-center text-slate-400 text-xs">
                          No parameters added yet. Click a template above (e.g. Urinalysis, LFT, RFT, TFT, CBC) or "+ Add Parameter".
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {newTestForm.parameters.map((param, pIdx) => (
                            <div
                              key={pIdx}
                              className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  #{pIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  placeholder="Parameter Name (e.g. TSH, ALT, Albumin, Glucose)"
                                  value={param.parameter}
                                  onChange={(e) => {
                                    const updated = [...newTestForm.parameters];
                                    updated[pIdx].parameter = e.target.value;
                                    setNewTestForm({ ...newTestForm, parameters: updated });
                                  }}
                                  className="flex-1 p-1 text-xs border border-slate-300 rounded font-semibold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = newTestForm.parameters.filter((_, i) => i !== pIdx);
                                    setNewTestForm({ ...newTestForm, parameters: updated });
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                  title="Remove parameter"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-3 gap-1.5">
                                <div>
                                  <label className="block text-[10px] text-slate-500">Unit</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. U/L, g/dL, %"
                                    value={param.unit}
                                    onChange={(e) => {
                                      const updated = [...newTestForm.parameters];
                                      updated[pIdx].unit = e.target.value;
                                      setNewTestForm({ ...newTestForm, parameters: updated });
                                    }}
                                    className="w-full p-1 text-[11px] border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-500">Normal Range *</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 7 - 56, < 200, Negative"
                                    value={param.referenceRange}
                                    onChange={(e) => {
                                      const updated = [...newTestForm.parameters];
                                      updated[pIdx].referenceRange = e.target.value;
                                      setNewTestForm({ ...newTestForm, parameters: updated });
                                    }}
                                    className="w-full p-1 text-[11px] border border-slate-300 rounded bg-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-500">Typical Value</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 28, 14.0, Negative"
                                    value={param.defaultExpectedValue || ''}
                                    onChange={(e) => {
                                      const updated = [...newTestForm.parameters];
                                      updated[pIdx].defaultExpectedValue = e.target.value;
                                      setNewTestForm({ ...newTestForm, parameters: updated });
                                    }}
                                    className="w-full p-1 text-[11px] border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Insurance Company Selling Prices (Differential Tariffs) */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      Insurance Tariff Schemes
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Set custom selling prices for insurance payers. Unconfigured payers bill at standard fee (${Number(newTestForm.price || 0).toFixed(2)}).
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const newPrices: Record<string, number> = {};
                        availableInsurancePolicies.forEach(p => {
                          newPrices[p.name] = Number(newTestForm.price || 0);
                        });
                        setNewItemInsurancePrices(newPrices);
                      }}
                      className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors cursor-pointer"
                      title="Set all policies to standard fee"
                    >
                      Match Fee
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newPrices: Record<string, number> = {};
                        availableInsurancePolicies.forEach(p => {
                          newPrices[p.name] = Math.round((Number(newTestForm.price || 0) * 1.10) * 100) / 100;
                        });
                        setNewItemInsurancePrices(newPrices);
                      }}
                      className="px-2 py-1 text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded border border-amber-200 transition-colors cursor-pointer"
                    >
                      +10%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newPrices: Record<string, number> = {};
                        availableInsurancePolicies.forEach(p => {
                          newPrices[p.name] = Math.round((Number(newTestForm.price || 0) * 1.20) * 100) / 100;
                        });
                        setNewItemInsurancePrices(newPrices);
                      }}
                      className="px-2 py-1 text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded border border-amber-200 transition-colors cursor-pointer"
                    >
                      +20%
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItemInsurancePrices({})}
                      className="px-2 py-1 text-[10px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {availableInsurancePolicies.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 text-center">
                    No active insurance policies registered for this clinic.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {availableInsurancePolicies.map(policy => {
                      const hasCustom = newItemInsurancePrices[policy.name] !== undefined;
                      const currentVal = hasCustom ? newItemInsurancePrices[policy.name] : '';

                      return (
                        <div key={policy.id} className="bg-slate-50/70 p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-800 text-xs truncate" title={policy.name}>
                              {policy.name}
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {policy.category || 'insurance'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="relative w-24">
                              <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-bold">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder={`${Number(newTestForm.price || 0).toFixed(2)}`}
                                value={currentVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewItemInsurancePrices(prev => {
                                    const updated = { ...prev };
                                    if (val === '') {
                                      delete updated[policy.name];
                                    } else {
                                      updated[policy.name] = Number(val);
                                    }
                                    return updated;
                                  });
                                }}
                                className="w-full pl-5 pr-1.5 py-1 text-xs border border-slate-300 rounded font-semibold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setNewItemInsurancePrices(prev => ({
                                  ...prev,
                                  [policy.name]: Number(newTestForm.price || 0)
                                }));
                              }}
                              className="px-2 py-1 text-[10px] font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 cursor-pointer"
                              title="Set to standard cash fee"
                            >
                              Match
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {editingCatalogTestId ? (
                    <>
                      <Check className="w-4 h-4" /> Save Changes to Investigation
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Save Available Test to Catalog
                    </>
                  )}
                </button>
                {editingCatalogTestId && (
                  <button
                    type="button"
                    onClick={handleCancelSidebarEdit}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Cancel Edit (Create New Test Instead)
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Catalog List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Active Pathology Investigation Catalog ({filteredCatalog.length} tests)
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    Available tests published for doctor order entry in consultation suite.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search name, code, category..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 border border-slate-300 rounded bg-white text-xs"
                    />
                    {searchFilter && (
                      <button
                        type="button"
                        onClick={() => setSearchFilter('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        &times;
                      </button>
                    )}
                  </div>

                  {/* Category Dropdown */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                    <span className="text-[10px] font-bold text-slate-600">Category:</span>
                    <select
                      value={catalogCategoryFilter}
                      onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                      className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Categories</option>
                      <option value="Hematology">Hematology</option>
                      <option value="Biochemistry">Biochemistry</option>
                      <option value="Microbiology">Microbiology</option>
                      <option value="Parasitology">Parasitology</option>
                      <option value="Immunology">Immunology</option>
                      <option value="Urinalysis">Urinalysis</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportCatalogExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-bold text-xs cursor-pointer shadow-xs transition-colors"
                    title="Export laboratory test catalog to Excel document (.xlsx)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Export as Excel</span>
                  </button>

                  {/* Sort Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                    <SlidersHorizontal className="w-3 h-3 text-amber-600" />
                    <select
                      value={catalogSortKey}
                      onChange={(e) => setCatalogSortKey(e.target.value as any)}
                      className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="name">Sort by Name</option>
                      <option value="code">Sort by Code</option>
                      <option value="price">Sort by Price</option>
                      <option value="category">Sort by Category</option>
                    </select>
                  </div>

                  {/* Sort Order Toggle */}
                  <button
                    type="button"
                    onClick={() => setCatalogSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-md cursor-pointer"
                    title={`Toggle order (currently ${catalogSortOrder})`}
                  >
                    {catalogSortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredCatalog.map(item => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      item.isActive
                        ? 'bg-white border-slate-200 shadow-2xs hover:border-amber-300'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          {item.code}
                        </span>
                        <h4 
                          onClick={() => handleStartEditModal(item)}
                          className="font-bold text-slate-900 text-xs mt-1 hover:text-amber-700 cursor-pointer flex items-center gap-1 transition-colors"
                          title="Click to edit investigation"
                        >
                          <span>{item.name}</span>
                          <Pencil className="w-2.5 h-2.5 text-slate-400 hover:text-amber-600" />
                        </h4>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm text-slate-900">${item.price.toFixed(2)}</div>
                        <span className="text-[10px] text-slate-500">{item.turnaroundTime || 'Routine'}</span>
                        {item.insurancePrices && Object.keys(item.insurancePrices).length > 0 && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-bold">
                              <ShieldCheck className="w-2.5 h-2.5 text-indigo-600" />
                              {Object.keys(item.insurancePrices).length} Schemes
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold text-slate-700">Category:</span> {item.category}
                      </div>
                      {item.sampleOrBodyPart && (
                        <div>
                          <span className="font-semibold text-slate-700">Specimen:</span> {item.sampleOrBodyPart}
                        </div>
                      )}
                      {item.description && (
                        <p className="text-slate-500 text-[10px] line-clamp-2 pt-1 border-t border-slate-100">
                          {item.description}
                        </p>
                      )}

                      {/* Expected Result Format Badge */}
                      <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                        {item.resultType === 'positive_negative' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Positive / Negative &bull; Normal: {item.expectedOutcome || 'Negative'}
                          </span>
                        )}
                        {item.resultType === 'reactive_non_reactive' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Reactive / Non-reactive &bull; Normal: {item.expectedOutcome || 'Non-reactive'}
                          </span>
                        )}
                        {(!item.resultType || item.resultType === 'ranges') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            Ranges in Series: {item.parameters?.length || 1} {item.parameters?.length === 1 ? 'Param' : 'Params'}
                          </span>
                        )}
                      </div>

                      {/* Expandable Parameters in Series Preview */}
                      {item.parameters && item.parameters.length > 0 && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setExpandedCardTestId(expandedCardTestId === item.id ? null : item.id)}
                            className="text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            {expandedCardTestId === item.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            <span>{expandedCardTestId === item.id ? 'Hide Normal Ranges' : `View Normal Ranges in Series (${item.parameters.length})`}</span>
                          </button>
                          {expandedCardTestId === item.id && (
                            <div className="mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1 text-[10px] max-h-36 overflow-y-auto">
                              {item.parameters.map((p, pIdx) => (
                                <div key={pIdx} className="flex items-center justify-between gap-2 border-b border-slate-200/50 pb-0.5 last:border-0 last:pb-0">
                                  <span className="font-semibold text-slate-800 truncate">{p.parameter}</span>
                                  <div className="text-right shrink-0">
                                    <span className="text-slate-600 font-mono font-medium">Range: {p.referenceRange}</span>
                                    {p.unit && <span className="ml-1 text-slate-400">({p.unit})</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px] gap-2">
                      <button
                        onClick={() => toggleAvailableTestStatus(item.id)}
                        className="flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        {item.isActive ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Active in Menu</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-500">Inactive</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEditModal(item)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Edit investigation details and parameters"
                        >
                          <Pencil className="w-3.5 h-3.5 text-amber-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInsurancePricingTest(item)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Configure Insurance Tariffs & Scheme Prices"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Tariffs</span>
                          {item.insurancePrices && Object.keys(item.insurancePrices).length > 0 && (
                            <span className="px-1 py-0.2 bg-indigo-200 text-indigo-900 rounded-full text-[9px] font-bold">
                              {Object.keys(item.insurancePrices).length}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Remove ${item.name} from catalog?`)) {
                              deleteAvailableTest(item.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Delete test"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredCatalog.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No tests matching "{searchFilter}". Click "Add Diagnostic Test" on the left to create one.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Reagents Stock */}
      {activeTab === 'reagents' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900">
              Laboratory Reagents & Diagnostic Consumables ({reagentsStock.length} items)
            </h3>
            <button
              onClick={onOpenInventory}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Reorder Reagents
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Reagent Kit Name</th>
                  <th className="py-2.5 px-3">SKU Code</th>
                  <th className="py-2.5 px-3 text-right">Available Packs</th>
                  <th className="py-2.5 px-3 text-right">Cost Per Run</th>
                  <th className="py-2.5 px-3">Lot & Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reagentsStock.map(item => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{item.code}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {item.totalQuantity} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-700">${item.unitCost.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {item.batches.map(b => `${b.batchNumber} (Exp: ${b.expiryDate})`).join(', ') || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enter Result Modal */}
      {resultModalOpen && selectedTest && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setResultModalOpen(false);
            }
          }}
        >
          <form 
            onSubmit={handleSaveResults} 
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden text-xs cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Pathology Result Certification: {selectedTest.testName}</h3>
                <p className="text-slate-300 text-[11px]">Patient: {selectedTest.patientName} ({selectedTest.patientMrn})</p>
              </div>
              <button
                type="button"
                onClick={() => setResultModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-base"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-50 text-slate-700">
                    <th className="py-2 px-2">Parameter</th>
                    <th className="py-2 px-2">Measured Value</th>
                    <th className="py-2 px-2">Unit</th>
                    <th className="py-2 px-2">Reference Range</th>
                    <th className="py-2 px-2">Flag</th>
                    <th className="py-2 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {resultsList.map((res, idx) => {
                    const isPosNeg = res.referenceRange.toLowerCase().includes('negative') || res.referenceRange.toLowerCase().includes('positive');
                    const isReactive = res.referenceRange.toLowerCase().includes('reactive');

                    return (
                      <tr key={idx}>
                        <td className="py-2 px-2 font-medium text-slate-900">
                          <div>{res.parameter}</div>
                          {isReactive ? (
                            <div className="flex items-center gap-1 mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...resultsList];
                                  updated[idx].value = 'Non-reactive';
                                  updated[idx].flag = 'Normal';
                                  setResultsList(updated);
                                }}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer"
                              >
                                Non-reactive
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...resultsList];
                                  updated[idx].value = 'Reactive';
                                  updated[idx].flag = 'Abnormal';
                                  setResultsList(updated);
                                }}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                              >
                                Reactive
                              </button>
                            </div>
                          ) : isPosNeg ? (
                            <div className="flex items-center gap-1 mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...resultsList];
                                  updated[idx].value = 'Negative';
                                  updated[idx].flag = 'Normal';
                                  setResultsList(updated);
                                }}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer"
                              >
                                Negative
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...resultsList];
                                  updated[idx].value = 'Positive';
                                  updated[idx].flag = 'Abnormal';
                                  setResultsList(updated);
                                }}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                              >
                                Positive
                              </button>
                            </div>
                          ) : null}
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={res.value}
                            onChange={(e) => {
                              const updated = [...resultsList];
                              updated[idx].value = e.target.value;
                              setResultsList(updated);
                            }}
                            className="w-28 p-1 border border-slate-300 rounded font-bold bg-white"
                            required
                          />
                        </td>
                        <td className="py-2 px-2 text-slate-600">{res.unit}</td>
                        <td className="py-2 px-2 text-slate-600 font-mono text-[11px]">{res.referenceRange}</td>
                        <td className="py-2 px-2">
                          <select
                            value={res.flag}
                            onChange={(e) => {
                              const updated = [...resultsList];
                              updated[idx].flag = e.target.value as any;
                              setResultsList(updated);
                            }}
                            className={`p-1 rounded font-bold text-[11px] border ${
                              res.flag === 'Normal' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            <option value="Normal">Normal</option>
                            <option value="High">High</option>
                            <option value="Low">Low</option>
                            <option value="Abnormal">Abnormal</option>
                          </select>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setResultsList(resultsList.filter((_, i) => i !== idx));
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Remove parameter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setResultsList([
                      ...resultsList,
                      {
                        parameter: 'Additional Finding',
                        value: 'Normal',
                        unit: '',
                        referenceRange: 'Normal',
                        flag: 'Normal'
                      }
                    ]);
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  <span>Add Finding / Parameter</span>
                </button>
                <span className="text-[11px] text-slate-400">
                  {resultsList.length} parameters to certify
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Pathologist Remarks & Technician Notes</label>
                <textarea
                  rows={2}
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  placeholder="e.g. Findings confirmed by duplicate run. Specimen clear."
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>

              {/* Patient Result Document Attachments (Stored in Prime Admin Cloud Account) */}
              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      Attach Diagnostic Documents & Lab Slips
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                      Prime Admin Cloud Storage
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-600" />
                    <span>Attach Files</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.doc,.docx,.txt"
                    onChange={handleAttachmentUpload}
                    className="hidden"
                  />
                </div>

                <p className="text-[11px] text-slate-500">
                  Attach laboratory analyzer printouts, microscope captures, reference charts, or external referral documents. All attachments are saved directly to the Prime Admin's cloud account partition.
                </p>

                {testAttachments.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {testAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {att.type.startsWith('image/') ? (
                            <img
                              src={att.dataUrl}
                              alt={att.name}
                              className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate max-w-[280px]">
                              {att.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {(att.size / 1024).toFixed(1)} KB • Prime Admin Cloud
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingAttachment(att)}
                            className="px-2 py-0.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 rounded cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => setTestAttachments(prev => prev.filter(a => a.id !== att.id))}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Remove attachment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3 border border-dashed border-slate-300 rounded bg-white/50 text-slate-400 text-[11px]">
                    No documents attached yet. Click "Attach Files" to upload patient laboratory files.
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-slate-500 text-[11px]">
                Certifying results generates a formal report ready for immediate PDF or Excel document export.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResultModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded cursor-pointer"
                >
                  Certify & Approve Report
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Print Report Preview Modal */}
      {printModalData && (
        <PrintReceiptModal
          isOpen={true}
          onClose={() => setPrintModalData(null)}
          type="lab_report"
          data={printModalData}
        />
      )}

      {/* Insurance Tariff Pricing Modal */}
      {insurancePricingTest && (
        <TestInsurancePricingModal
          test={insurancePricingTest}
          onClose={() => setInsurancePricingTest(null)}
        />
      )}

      {/* Edit Pathology Investigation Catalog Modal */}
      {editingTestModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingTestModal(null);
            }
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-xs cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white">
                  <Microscope className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">Edit Pathology Investigation</h3>
                    <span className="px-1.5 py-0.5 rounded bg-white/20 text-white font-mono text-[10px] font-bold">
                      {editingTestModal.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-100">
                    Modify test code, category, standard pricing, specimen requirements, and tariffs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTestModal(null)}
                className="text-white/80 hover:text-white cursor-pointer text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEditedModalTest} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Investigation Name *</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. Complete Blood Count (CBC)"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Test Code / SKU *</label>
                    <input
                      type="text"
                      value={editFormData.code}
                      onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-mono uppercase font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="e.g. CBC-01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Category *</label>
                    <select
                      value={editFormData.category}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value as any })}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Hematology">Hematology</option>
                      <option value="Biochemistry">Biochemistry</option>
                      <option value="Microbiology">Microbiology</option>
                      <option value="Parasitology">Parasitology</option>
                      <option value="Immunology">Immunology</option>
                      <option value="Urinalysis">Urinalysis</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Standard Cash Fee ($) *</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editFormData.price}
                        onChange={(e) => setEditFormData({ ...editFormData, price: Number(e.target.value) })}
                        className="w-full pl-6 pr-2 py-2 border border-slate-300 rounded bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Turnaround Time</label>
                    <input
                      type="text"
                      value={editFormData.turnaroundTime}
                      onChange={(e) => setEditFormData({ ...editFormData, turnaroundTime: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="e.g. 1-2 Hours, 24 Hours, STAT"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Specimen / Sample Type</label>
                  <input
                    type="text"
                    value={editFormData.sampleOrBodyPart}
                    onChange={(e) => setEditFormData({ ...editFormData, sampleOrBodyPart: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. Whole Blood (EDTA), Serum, Midstream Urine"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Clinical Description / Indications</label>
                  <textarea
                    rows={2}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                    placeholder="Clinical purpose, indications, fasting instructions..."
                  />
                </div>

                {/* Expected Results & Reference Ranges in Series */}
                <div className="pt-2 border-t border-slate-200 space-y-3">
                  <div>
                    <label className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                      <FlaskConical className="w-4 h-4 text-amber-600" />
                      Expected Results & Normal Ranges
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Configure expected findings format: qualitative outcomes (Positive/Negative, Reactive/Non-reactive) or normal reference ranges in series.
                    </p>
                  </div>

                  {/* Format selection */}
                  <div className="grid grid-cols-1 gap-2">
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setEditFormData(prev => ({
                            ...prev,
                            resultType: 'positive_negative',
                            expectedOutcome: 'Negative'
                          }));
                        }}
                        className={`py-1.5 px-2 rounded-md font-bold text-[11px] transition-all cursor-pointer text-center ${
                          editFormData.resultType === 'positive_negative'
                            ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-500'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        Positive / Negative
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditFormData(prev => ({
                            ...prev,
                            resultType: 'reactive_non_reactive',
                            expectedOutcome: 'Non-reactive'
                          }));
                        }}
                        className={`py-1.5 px-2 rounded-md font-bold text-[11px] transition-all cursor-pointer text-center ${
                          editFormData.resultType === 'reactive_non_reactive'
                            ? 'bg-white text-blue-800 shadow-xs ring-1 ring-blue-500'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        Reactive / Non-reactive
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditFormData(prev => ({
                            ...prev,
                            resultType: 'ranges',
                            parameters: prev.parameters && prev.parameters.length > 0
                              ? prev.parameters
                              : [{ parameter: prev.name || 'Biomarker Level', unit: 'U/L', referenceRange: '10 - 40', defaultExpectedValue: '25' }]
                          }));
                        }}
                        className={`py-1.5 px-2 rounded-md font-bold text-[11px] transition-all cursor-pointer text-center ${
                          editFormData.resultType === 'ranges'
                            ? 'bg-white text-purple-800 shadow-xs ring-1 ring-purple-500'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        Results in Ranges
                      </button>
                    </div>
                  </div>

                  {/* Sub-panels */}
                  {editFormData.resultType === 'positive_negative' && (
                    <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950 text-xs">Standard Expected Normal Outcome:</span>
                        <span className="text-[10px] text-emerald-700">Qualitative Rapid Ag/Ab</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                          <input
                            type="radio"
                            name="edit_expected_posneg"
                            value="Negative"
                            checked={editFormData.expectedOutcome === 'Negative'}
                            onChange={() => setEditFormData({ ...editFormData, expectedOutcome: 'Negative' })}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Negative (Normal / Non-infected)
                          </span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                          <input
                            type="radio"
                            name="edit_expected_posneg"
                            value="Positive"
                            checked={editFormData.expectedOutcome === 'Positive'}
                            onChange={() => setEditFormData({ ...editFormData, expectedOutcome: 'Positive' })}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            Positive (Positive Marker / Desired)
                          </span>
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        When certifying findings for orders of this test, technician can select Positive or Negative with 1-click.
                      </p>
                    </div>
                  )}

                  {editFormData.resultType === 'reactive_non_reactive' && (
                    <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-950 text-xs">Standard Expected Normal Outcome:</span>
                        <span className="text-[10px] text-blue-700">Serology Screening</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                          <input
                            type="radio"
                            name="edit_expected_react"
                            value="Non-reactive"
                            checked={editFormData.expectedOutcome === 'Non-reactive'}
                            onChange={() => setEditFormData({ ...editFormData, expectedOutcome: 'Non-reactive' })}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                            Non-reactive (Normal / Negative)
                          </span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                          <input
                            type="radio"
                            name="edit_expected_react"
                            value="Reactive"
                            checked={editFormData.expectedOutcome === 'Reactive'}
                            onChange={() => setEditFormData({ ...editFormData, expectedOutcome: 'Reactive' })}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300">
                            Reactive (Positive Antibody / Immunity)
                          </span>
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        When certifying findings for orders of this test, technician can select Reactive or Non-reactive with 1-click.
                      </p>
                    </div>
                  )}

                  {editFormData.resultType === 'ranges' && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                      {/* Presets Header */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            Multi-Parameter Clinical Templates:
                          </span>
                          <span className="text-[10px] text-slate-500">Auto-fill series</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {CLINICAL_PANEL_PRESETS.map(preset => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setEditFormData(prev => ({
                                  ...prev,
                                  parameters: preset.parameters.map(p => ({ ...p }))
                                }));
                              }}
                              className="px-2 py-0.5 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-800 rounded text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
                              title={`Load standard ${preset.name} parameters`}
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Series Parameters Table/Rows */}
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-xs">
                            Normal Ranges in Series ({editFormData.parameters.length})
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditFormData(prev => ({
                                  ...prev,
                                  parameters: [
                                    ...prev.parameters,
                                    {
                                      parameter: '',
                                      unit: '',
                                      referenceRange: '',
                                      defaultExpectedValue: ''
                                    }
                                  ]
                                }));
                              }}
                              className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                              <Plus className="w-3 h-3" /> Add Parameter
                            </button>
                            {editFormData.parameters.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setEditFormData(prev => ({ ...prev, parameters: [] }))}
                                className="px-2 py-0.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded text-[10px] font-semibold cursor-pointer"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {editFormData.parameters.length === 0 ? (
                          <div className="p-3 bg-white border border-dashed border-slate-300 rounded text-center text-slate-400 text-xs">
                            No parameters added yet. Click a template above (e.g. Urinalysis, LFT, RFT, TFT, CBC) or "+ Add Parameter".
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {editFormData.parameters.map((param, pIdx) => (
                              <div
                                key={pIdx}
                                className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                    #{pIdx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    placeholder="Parameter Name (e.g. TSH, ALT, Albumin, Glucose)"
                                    value={param.parameter}
                                    onChange={(e) => {
                                      const updated = [...editFormData.parameters];
                                      updated[pIdx].parameter = e.target.value;
                                      setEditFormData({ ...editFormData, parameters: updated });
                                    }}
                                    className="flex-1 p-1 text-xs border border-slate-300 rounded font-semibold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    required
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = editFormData.parameters.filter((_, i) => i !== pIdx);
                                      setEditFormData({ ...editFormData, parameters: updated });
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                    title="Remove parameter"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-3 gap-1.5">
                                  <div>
                                    <label className="block text-[10px] text-slate-500">Unit</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. U/L, g/dL, %"
                                      value={param.unit}
                                      onChange={(e) => {
                                        const updated = [...editFormData.parameters];
                                        updated[pIdx].unit = e.target.value;
                                        setEditFormData({ ...editFormData, parameters: updated });
                                      }}
                                      className="w-full p-1 text-[11px] border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-500">Normal Range *</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. 7 - 56, < 200, Negative"
                                      value={param.referenceRange}
                                      onChange={(e) => {
                                        const updated = [...editFormData.parameters];
                                        updated[pIdx].referenceRange = e.target.value;
                                        setEditFormData({ ...editFormData, parameters: updated });
                                      }}
                                      className="w-full p-1 text-[11px] border border-slate-300 rounded bg-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-500">Typical Value</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. 28, 14.0, Negative"
                                      value={param.defaultExpectedValue || ''}
                                      onChange={(e) => {
                                        const updated = [...editFormData.parameters];
                                        updated[pIdx].defaultExpectedValue = e.target.value;
                                        setEditFormData({ ...editFormData, parameters: updated });
                                      }}
                                      className="w-full p-1 text-[11px] border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Toggle */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">Catalog Status</span>
                    <span className="text-[11px] text-slate-500">
                      {editFormData.isActive ? 'Active and available for doctor order entry' : 'Inactive (hidden from consultation order suite)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, isActive: !editFormData.isActive })}
                    className="flex items-center gap-1.5 font-bold cursor-pointer"
                  >
                    {editFormData.isActive ? (
                      <>
                        <ToggleRight className="w-5 h-5 text-emerald-600" />
                        <span className="text-emerald-700">Active</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                        <span className="text-slate-500">Inactive</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Insurance Scheme Tariffs */}
                <div className="pt-2 border-t border-slate-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        Insurance Tariff Schemes
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Custom prices for insurance payers. Unconfigured payers bill at cash fee (${Number(editFormData.price || 0).toFixed(2)}).
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const newPrices: Record<string, number> = {};
                          availableInsurancePolicies.forEach(p => {
                            newPrices[p.name] = Number(editFormData.price || 0);
                          });
                          setEditFormData(prev => ({ ...prev, insurancePrices: newPrices }));
                        }}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors cursor-pointer"
                      >
                        Match Fee
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newPrices: Record<string, number> = {};
                          availableInsurancePolicies.forEach(p => {
                            newPrices[p.name] = Math.round((Number(editFormData.price || 0) * 1.10) * 100) / 100;
                          });
                          setEditFormData(prev => ({ ...prev, insurancePrices: newPrices }));
                        }}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded border border-amber-200 transition-colors cursor-pointer"
                      >
                        +10%
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newPrices: Record<string, number> = {};
                          availableInsurancePolicies.forEach(p => {
                            newPrices[p.name] = Math.round((Number(editFormData.price || 0) * 1.20) * 100) / 100;
                          });
                          setEditFormData(prev => ({ ...prev, insurancePrices: newPrices }));
                        }}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded border border-amber-200 transition-colors cursor-pointer"
                      >
                        +20%
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditFormData(prev => ({ ...prev, insurancePrices: {} }))}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {availableInsurancePolicies.length > 0 && (
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {availableInsurancePolicies.map(policy => {
                        const hasCustom = editFormData.insurancePrices[policy.name] !== undefined;
                        const currentVal = hasCustom ? editFormData.insurancePrices[policy.name] : '';

                        return (
                          <div key={policy.id} className="bg-slate-50/70 p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-800 text-xs truncate" title={policy.name}>
                                {policy.name}
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {policy.category || 'insurance'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="relative w-24">
                                <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-bold">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder={`${Number(editFormData.price || 0).toFixed(2)}`}
                                  value={currentVal}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditFormData(prev => {
                                      const updated = { ...prev.insurancePrices };
                                      if (val === '') {
                                        delete updated[policy.name];
                                      } else {
                                        updated[policy.name] = Number(val);
                                      }
                                      return { ...prev, insurancePrices: updated };
                                    });
                                  }}
                                  className="w-full pl-5 pr-1.5 py-1 text-xs border border-slate-300 rounded font-semibold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    handleLoadTestIntoSidebar(editingTestModal);
                    setEditingTestModal(null);
                  }}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded font-semibold text-xs cursor-pointer transition-colors"
                  title="Switch editing to left sidebar form"
                >
                  Dock into Sidebar Form
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTestModal(null)}
                    className="px-4 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded font-semibold text-xs cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Check className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Attached Document Modal */}
      {viewingAttachment && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setViewingAttachment(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-xs cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 truncate">
                <Paperclip className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-bold text-xs truncate">{viewingAttachment.name}</span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  ({(viewingAttachment.size / 1024).toFixed(1)} KB • Prime Admin Cloud)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingAttachment.dataUrl}
                  download={viewingAttachment.name}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setViewingAttachment(null)}
                  className="text-slate-400 hover:text-white text-base cursor-pointer px-1"
                >
                  &times;
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-slate-100 min-h-[250px]">
              {viewingAttachment.type.startsWith('image/') ? (
                <img
                  src={viewingAttachment.dataUrl}
                  alt={viewingAttachment.name}
                  className="max-h-[60vh] max-w-full rounded object-contain border border-slate-300 bg-white"
                />
              ) : viewingAttachment.type === 'application/pdf' ? (
                <iframe
                  src={viewingAttachment.dataUrl}
                  title={viewingAttachment.name}
                  className="w-full h-[60vh] border border-slate-300 rounded bg-white"
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-lg border border-slate-200 shadow-xs">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <div className="font-bold text-sm text-slate-800">{viewingAttachment.name}</div>
                  <div className="text-xs text-slate-500 mt-1">Binary document file stored on Prime Admin Cloud</div>
                  <a
                    href={viewingAttachment.dataUrl}
                    download={viewingAttachment.name}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800"
                  >
                    <Download className="w-3.5 h-3.5" /> Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
