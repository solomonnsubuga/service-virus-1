import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { RadiologyOrder, InventoryItem, AvailableTest, Patient } from '../../types';
import {
  Film,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Layers,
  FileText,
  AlertTriangle,
  Plus,
  Eye,
  Activity,
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Trash2,
  ToggleLeft,
  ToggleRight,
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
  Download,
  Paperclip,
  Upload
} from 'lucide-react';
import { PrintReceiptModal } from '../common/PrintReceiptModal';
import { TestInsurancePricingModal } from '../diagnostic/TestInsurancePricingModal';
import { formatPatientAge, getAgeInYears } from '../../utils/ageUtils';
import { exportRadiologyToPdf } from '../../utils/radiologyPdfExport';
import { preloadClinicLogo } from '../../utils/pdfLogoHelper';
import {
  exportSingleRadiologyOrderToExcel,
  exportRadiologyOrdersListToExcel,
  exportRadiologyCatalogToExcel
} from '../../utils/radiologyExcelExport';
import { ClinicalAttachment } from '../../types';

interface RadiologyDashboardProps {
  onOpenInventory: () => void;
}

export const RadiologyDashboard: React.FC<RadiologyDashboardProps> = ({ onOpenInventory }) => {
  const {
    activeClinic,
    currentUser,
    radiologyOrders,
    currentClinicRadiologyOrders,
    completeRadiologyScan,
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

  const [activeTab, setActiveTab] = useState<'queue' | 'recent_patients' | 'catalog' | 'consumables'>('queue');
  const [selectedScan, setSelectedScan] = useState<RadiologyOrder | null>(null);
  const [findingsModalOpen, setFindingsModalOpen] = useState(false);
  const [pacsModalOpen, setPacsModalOpen] = useState(false);
  const [printModalData, setPrintModalData] = useState<any>(null);

  useEffect(() => {
    if (activeClinic) {
      preloadClinicLogo(activeClinic.logoUrl, activeClinic);
    }
  }, [activeClinic]);

  // Document Attachments for patient results (stored in Prime Admin's cloud account)
  const [scanAttachments, setScanAttachments] = useState<ClinicalAttachment[]>([]);
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
  const [queuePriorityFilter, setQueuePriorityFilter] = useState<'all' | 'Emergency' | 'Urgent' | 'Routine'>('all');
  const [queuePatientTypeFilter, setQueuePatientTypeFilter] = useState<'all' | 'OPD' | 'IPD'>('all');
  const [queueModalityFilter, setQueueModalityFilter] = useState<string>('all');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>('all');
  const [selectedBedFilter, setSelectedBedFilter] = useState<string>('all');
  const [queueSortKey, setQueueSortKey] = useState<'date' | 'patient' | 'procedure' | 'mrn' | 'priority' | 'age'>('date');
  const [queueSortOrder, setQueueSortOrder] = useState<'asc' | 'desc'>('desc');

  // Recent Patients / Reports Filter & Sort State
  const [recentSearchTerm, setRecentSearchTerm] = useState('');
  const [recentModalityFilter, setRecentModalityFilter] = useState<string>('all');
  const [recentDepartmentFilter, setRecentDepartmentFilter] = useState<string>('all');
  const [recentRoomFilter, setRecentRoomFilter] = useState<string>('all');
  const [recentWardFilter, setRecentWardFilter] = useState<string>('all');
  const [recentBedFilter, setRecentBedFilter] = useState<string>('all');
  const [recentSortKey, setRecentSortKey] = useState<'date' | 'patient' | 'procedure' | 'mrn'>('date');
  const [recentSortOrder, setRecentSortOrder] = useState<'asc' | 'desc'>('desc');

  // Catalog Filter & Sort State
  const [searchFilter, setSearchFilter] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('all');
  const [catalogSortKey, setCatalogSortKey] = useState<'name' | 'code' | 'price' | 'category'>('name');
  const [catalogSortOrder, setCatalogSortOrder] = useState<'asc' | 'desc'>('asc');

  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
  const [insurancePricingScan, setInsurancePricingScan] = useState<AvailableTest | null>(null);
  const [newItemInsurancePrices, setNewItemInsurancePrices] = useState<Record<string, number>>({});

  // Catalog item editing states
  const [editingCatalogScanId, setEditingCatalogScanId] = useState<string | null>(null);
  const [editingScanModal, setEditingScanModal] = useState<AvailableTest | null>(null);
  const [editScanFormData, setEditScanFormData] = useState<{
    name: string;
    code: string;
    category: AvailableTest['category'];
    price: number;
    sampleOrBodyPart: string;
    turnaroundTime: string;
    description: string;
    isActive: boolean;
    insurancePrices: Record<string, number>;
  }>({
    name: '',
    code: '',
    category: 'X-Ray',
    price: 65,
    sampleOrBodyPart: 'Chest / Thorax',
    turnaroundTime: '1 Hour',
    description: '',
    isActive: true,
    insurancePrices: {}
  });

  // Scan Completion Form
  const [findingsText, setFindingsText] = useState('');
  const [impressionText, setImpressionText] = useState('');
  const [notesText, setNotesText] = useState('');

  // Add Scan to Catalog Form State
  const [newScanForm, setNewScanForm] = useState({
    name: '',
    code: '',
    category: 'X-Ray' as AvailableTest['category'],
    price: 65,
    sampleOrBodyPart: 'Chest / Thorax',
    turnaroundTime: '1 Hour',
    description: '',
    isActive: true
  });

  const basePendingScans = useMemo(() => {
    return currentClinicRadiologyOrders.filter(r => r.status !== 'completed' && r.status !== 'cancelled');
  }, [currentClinicRadiologyOrders]);

  const baseCompletedScans = useMemo(() => {
    return currentClinicRadiologyOrders.filter(r => r.status === 'completed');
  }, [currentClinicRadiologyOrders]);

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

  // Filtered & Sorted Pending Scans
  const filteredPendingScans = useMemo(() => {
    let result = [...basePendingScans];

    if (queueSearchTerm.trim()) {
      const q = queueSearchTerm.toLowerCase().trim();
      result = result.filter(r => {
        const patient = getOrderPatient(r);
        const pName = r.patientName.toLowerCase();
        const pMrn = r.patientMrn.toLowerCase();
        const proc = r.procedureName.toLowerCase();
        const dName = r.doctorName.toLowerCase();
        const hist = (r.clinicalHistory || '').toLowerCase();
        const body = (r.bodyPart || '').toLowerCase();
        const ward = (patient?.ward || '').toLowerCase();
        const bed = (patient?.bedNumber || '').toLowerCase();
        const dept = (patient?.department || '').toLowerCase();
        const room = (patient?.doctorRoom || '').toLowerCase();
        return pName.includes(q) || pMrn.includes(q) || proc.includes(q) || dName.includes(q) || hist.includes(q) || body.includes(q) || ward.includes(q) || bed.includes(q) || dept.includes(q) || room.includes(q);
      });
    }

    if (queuePriorityFilter !== 'all') {
      result = result.filter(r => r.priority === queuePriorityFilter);
    }

    if (queuePatientTypeFilter !== 'all') {
      result = result.filter(r => {
        const patient = getOrderPatient(r);
        const pType = patient?.patientType || 'OPD';
        return pType === queuePatientTypeFilter;
      });
    }

    if (queueModalityFilter !== 'all') {
      result = result.filter(r => r.modality === queueModalityFilter);
    }

    if (selectedDepartmentFilter !== 'all') {
      result = result.filter(r => {
        const patient = getOrderPatient(r);
        const pDept = patient?.department || (patient?.patientType === 'IPD' ? 'Inpatient Ward' : 'General Outpatient (OPD)');
        return pDept.toLowerCase() === selectedDepartmentFilter.toLowerCase() || patient?.department === selectedDepartmentFilter;
      });
    }

    if (selectedRoomFilter !== 'all') {
      result = result.filter(r => {
        const patient = getOrderPatient(r);
        const pRoom = patient?.doctorRoom || (patient?.patientType === 'IPD' ? (patient?.ward || 'Ward') : 'Consultation Room 1');
        return pRoom.toLowerCase() === selectedRoomFilter.toLowerCase() || patient?.doctorRoom === selectedRoomFilter;
      });
    }

    if (selectedWardFilter !== 'all') {
      result = result.filter(r => {
        const patient = getOrderPatient(r);
        return (patient?.ward || '') === selectedWardFilter;
      });
    }

    if (selectedBedFilter !== 'all') {
      result = result.filter(r => {
        const patient = getOrderPatient(r);
        return (patient?.bedNumber || '') === selectedBedFilter;
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (queueSortKey === 'date') {
        cmp = new Date(a.orderedAt).getTime() - new Date(b.orderedAt).getTime();
      } else if (queueSortKey === 'patient') {
        cmp = a.patientName.localeCompare(b.patientName);
      } else if (queueSortKey === 'procedure') {
        cmp = a.procedureName.localeCompare(b.procedureName);
      } else if (queueSortKey === 'mrn') {
        cmp = a.patientMrn.localeCompare(b.patientMrn, undefined, { numeric: true });
      } else if (queueSortKey === 'priority') {
        const priorityWeight: Record<string, number> = { 'Emergency': 3, 'Urgent': 2, 'Routine': 1 };
        cmp = (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0);
      } else if (queueSortKey === 'age') {
        const ageA = getAgeInYears(getOrderPatient(a));
        const ageB = getAgeInYears(getOrderPatient(b));
        cmp = Number(ageA) - Number(ageB);
      }
      return queueSortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [
    basePendingScans,
    queueSearchTerm,
    queuePriorityFilter,
    queuePatientTypeFilter,
    queueModalityFilter,
    selectedDepartmentFilter,
    selectedRoomFilter,
    selectedWardFilter,
    selectedBedFilter,
    queueSortKey,
    queueSortOrder,
    patientMap
  ]);

  // Filtered & Sorted Completed Scans
  const filteredCompletedScans = useMemo(() => {
    let result = [...baseCompletedScans];

    if (recentSearchTerm.trim()) {
      const q = recentSearchTerm.toLowerCase().trim();
      result = result.filter(r => {
        const patient = getOrderPatient(r);
        const pName = r.patientName.toLowerCase();
        const pMrn = r.patientMrn.toLowerCase();
        const proc = r.procedureName.toLowerCase();
        const dName = r.doctorName.toLowerCase();
        const findings = (r.findings || '').toLowerCase();
        const impression = (r.impression || '').toLowerCase();
        const ward = (patient?.ward || '').toLowerCase();
        const bed = (patient?.bedNumber || '').toLowerCase();
        const dept = (patient?.department || '').toLowerCase();
        const room = (patient?.doctorRoom || '').toLowerCase();
        return pName.includes(q) || pMrn.includes(q) || proc.includes(q) || dName.includes(q) || findings.includes(q) || impression.includes(q) || ward.includes(q) || bed.includes(q) || dept.includes(q) || room.includes(q);
      });
    }

    if (recentModalityFilter !== 'all') {
      result = result.filter(r => r.modality === recentModalityFilter);
    }

    if (recentDepartmentFilter !== 'all') {
      result = result.filter(r => {
        const patient = getOrderPatient(r);
        const pDept = patient?.department || (patient?.patientType === 'IPD' ? 'Inpatient Ward' : 'General Outpatient (OPD)');
        return pDept.toLowerCase() === recentDepartmentFilter.toLowerCase() || patient?.department === recentDepartmentFilter;
      });
    }

    if (recentRoomFilter !== 'all') {
      result = result.filter(r => {
        const patient = getOrderPatient(r);
        const pRoom = patient?.doctorRoom || (patient?.patientType === 'IPD' ? (patient?.ward || 'Ward') : 'Consultation Room 1');
        return pRoom.toLowerCase() === recentRoomFilter.toLowerCase() || patient?.doctorRoom === recentRoomFilter;
      });
    }

    if (recentWardFilter !== 'all') {
      result = result.filter(r => {
        const patient = getOrderPatient(r);
        return (patient?.ward || '') === recentWardFilter;
      });
    }

    if (recentBedFilter !== 'all') {
      result = result.filter(r => {
        const patient = getOrderPatient(r);
        return (patient?.bedNumber || '') === recentBedFilter;
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (recentSortKey === 'date') {
        cmp = new Date(a.completedAt || a.orderedAt).getTime() - new Date(b.completedAt || b.orderedAt).getTime();
      } else if (recentSortKey === 'patient') {
        cmp = a.patientName.localeCompare(b.patientName);
      } else if (recentSortKey === 'procedure') {
        cmp = a.procedureName.localeCompare(b.procedureName);
      } else if (recentSortKey === 'mrn') {
        cmp = a.patientMrn.localeCompare(b.patientMrn, undefined, { numeric: true });
      }
      return recentSortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [
    baseCompletedScans,
    recentSearchTerm,
    recentModalityFilter,
    recentDepartmentFilter,
    recentRoomFilter,
    recentWardFilter,
    recentBedFilter,
    recentSortKey,
    recentSortOrder,
    patientMap
  ]);

  const radiologySupplies = currentClinicInventory.filter(
    i => i.category === 'radiology_supply' || i.department === 'radiology'
  );

  const imagingCatalog = currentClinicAvailableTests.filter(t => t.department === 'radiology');

  const filteredCatalog = useMemo(() => {
    let result = [...imagingCatalog];
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
  }, [imagingCatalog, searchFilter, catalogCategoryFilter, catalogSortKey, catalogSortOrder]);

  const handleOpenFindingsModal = (scan: RadiologyOrder) => {
    setSelectedScan(scan);
    setScanAttachments(scan.attachments ? [...scan.attachments] : []);
    if (scan.modality === 'Ultrasound') {
      setFindingsText('Liver is normal in size with homogenous echotexture. Gallbladder is well distended, thin-walled, without calculi. Common bile duct is normal caliber. Kidneys show normal corticomedullary differentiation.');
      setImpressionText('Unremarkable abdominal ultrasound examination. No acute abnormalities detected.');
    } else if (scan.modality === 'CT Scan') {
      setFindingsText('No intracranial hemorrhage, mass effect, or midline shift. Ventricles and sulci appropriate for age. Major intracranial vascular flow voids preserved. Bony calvarium intact.');
      setImpressionText('Normal non-contrast head CT scan. No acute intracranial process.');
    } else if (scan.modality === 'MRI') {
      setFindingsText('High resolution multiplanar sequences demonstrate intact anatomic architecture. No focal signal abnormalities or pathologic enhancement.');
      setImpressionText('MRI study unremarkable within normal physiological parameters.');
    } else {
      setFindingsText('Bilateral lung fields clear of consolidation or effusion. Costophrenic angles sharp. Cardiothoracic ratio within normal range. Skeletal thorax intact.');
      setImpressionText('Normal diagnostic chest radiograph. No active cardiopulmonary lesion.');
    }
    setFindingsModalOpen(true);
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
          id: `att-rad-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser.name || 'Radiologist',
          storageType: 'prime_admin_cloud'
        };
        setScanAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleExportScanExcel = (scan: RadiologyOrder) => {
    exportSingleRadiologyOrderToExcel(scan, activeClinic);
  };

  const handleExportAllScansExcel = () => {
    exportRadiologyOrdersListToExcel(
      filteredCompletedScans,
      activeClinic,
      recentModalityFilter !== 'all' ? `Radiology ${recentModalityFilter} Scans` : 'Radiology Reports Registry'
    );
  };

  const handleExportCatalogExcel = () => {
    exportRadiologyCatalogToExcel(filteredCatalog, activeClinic);
  };

  const handleSaveFindings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScan) return;

    // Deduct radiology consumable if available
    const matchedSupply = radiologySupplies[0];
    const consumablesUsed = matchedSupply ? [{
      inventoryItemId: matchedSupply.id,
      itemName: matchedSupply.name,
      quantityUsed: 1,
      unit: 'exposure/dose'
    }] : undefined;

    // Save findings and attachments directly to Prime Admin's cloud account partition
    completeRadiologyScan(
      selectedScan.id,
      findingsText,
      impressionText,
      notesText,
      consumablesUsed,
      scanAttachments
    );
    setFindingsModalOpen(false);
    setScanAttachments([]);

    // Navigate to recent patients where print, export PDF, and preview are immediately accessible
    setActiveTab('recent_patients');
  };

  const handleStartEditScanModal = (scan: AvailableTest) => {
    setEditingScanModal(scan);
    setEditScanFormData({
      name: scan.name,
      code: scan.code,
      category: scan.category,
      price: scan.price,
      sampleOrBodyPart: scan.sampleOrBodyPart || '',
      turnaroundTime: scan.turnaroundTime || '',
      description: scan.description || '',
      isActive: scan.isActive,
      insurancePrices: scan.insurancePrices ? { ...scan.insurancePrices } : {}
    });
  };

  const handleSaveEditedModalScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScanModal || !editScanFormData.name.trim() || !editScanFormData.code.trim()) return;

    updateAvailableTest(editingScanModal.id, {
      name: editScanFormData.name.trim(),
      code: editScanFormData.code.trim().toUpperCase(),
      category: editScanFormData.category,
      price: Number(editScanFormData.price),
      sampleOrBodyPart: editScanFormData.sampleOrBodyPart.trim() || undefined,
      turnaroundTime: editScanFormData.turnaroundTime.trim() || undefined,
      description: editScanFormData.description.trim() || undefined,
      isActive: editScanFormData.isActive,
      insurancePrices: Object.keys(editScanFormData.insurancePrices).length > 0 ? editScanFormData.insurancePrices : undefined
    });

    setEditingScanModal(null);
  };

  const handleLoadScanIntoSidebar = (scan: AvailableTest) => {
    setEditingCatalogScanId(scan.id);
    setNewScanForm({
      name: scan.name,
      code: scan.code,
      category: scan.category,
      price: scan.price,
      sampleOrBodyPart: scan.sampleOrBodyPart || '',
      turnaroundTime: scan.turnaroundTime || '',
      description: scan.description || '',
      isActive: scan.isActive
    });
    setNewItemInsurancePrices(scan.insurancePrices ? { ...scan.insurancePrices } : {});
  };

  const handleCancelSidebarScanEdit = () => {
    setEditingCatalogScanId(null);
    setNewScanForm({
      name: '',
      code: '',
      category: 'X-Ray',
      price: 65,
      sampleOrBodyPart: 'Chest / Thorax',
      turnaroundTime: '1 Hour',
      description: '',
      isActive: true
    });
    setNewItemInsurancePrices({});
  };

  const handleAddCatalogScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScanForm.name || !newScanForm.code) return;

    if (editingCatalogScanId) {
      updateAvailableTest(editingCatalogScanId, {
        name: newScanForm.name.trim(),
        code: newScanForm.code.trim().toUpperCase(),
        department: 'radiology',
        category: newScanForm.category,
        price: Number(newScanForm.price),
        insurancePrices: Object.keys(newItemInsurancePrices).length > 0 ? newItemInsurancePrices : undefined,
        sampleOrBodyPart: newScanForm.sampleOrBodyPart.trim() || 'Specified Anatomical Region',
        turnaroundTime: newScanForm.turnaroundTime.trim() || '1 Hour',
        description: newScanForm.description.trim() || undefined,
        isActive: newScanForm.isActive
      });
      setEditingCatalogScanId(null);
    } else {
      addAvailableTest({
        clinicId: activeClinic.id,
        name: newScanForm.name.trim(),
        code: newScanForm.code.trim().toUpperCase(),
        department: 'radiology',
        category: newScanForm.category,
        price: Number(newScanForm.price),
        insurancePrices: Object.keys(newItemInsurancePrices).length > 0 ? newItemInsurancePrices : undefined,
        sampleOrBodyPart: newScanForm.sampleOrBodyPart.trim() || 'Specified Anatomical Region',
        turnaroundTime: newScanForm.turnaroundTime.trim() || '1 Hour',
        description: newScanForm.description.trim() || undefined,
        isActive: newScanForm.isActive
      });
    }

    setNewScanForm({
      name: '',
      code: '',
      category: 'X-Ray',
      price: 65,
      sampleOrBodyPart: 'Chest / Thorax',
      turnaroundTime: '1 Hour',
      description: '',
      isActive: true
    });
    setNewItemInsurancePrices({});
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">Radiology & Medical Imaging Suite</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800">
                {currentUser.name}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Imaging Workflow &bull; Imaging Catalog Management &bull; PACS DICOM Reader &bull; PDF & Excel Diagnostic Reports
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('catalog')}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Available Scans
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
            activeTab === 'queue' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Imaging Orders</span>
          {basePendingScans.length > 0 && (
            <span className="px-1.5 py-0.2 bg-cyan-100 text-cyan-800 text-[10px] rounded-full font-bold">
              {basePendingScans.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('recent_patients')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'recent_patients' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Recent Patients & Reports Archive ({baseCompletedScans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'catalog' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Imaging Procedure Catalog ({imagingCatalog.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('consumables')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'consumables' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Contrast Media & Supplies ({radiologySupplies.length})</span>
        </button>
      </div>

      {/* Tab 1: Pending Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filter & Sort Controls Strip */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-sm">Active Radiology & Imaging Queue</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800">
                      {filteredPendingScans.length} of {basePendingScans.length} Scans
                    </span>
                    <span className="text-[10px] text-cyan-900 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                      <SlidersHorizontal className="w-2.5 h-2.5 text-cyan-600" />
                      Sorted by {queueSortKey === 'patient' ? 'Patient' : queueSortKey === 'procedure' ? 'Procedure Name' : queueSortKey === 'date' ? 'Date & Time' : queueSortKey === 'mrn' ? 'MRN' : queueSortKey === 'priority' ? 'Priority' : 'Age'} ({queueSortOrder === 'asc' ? 'Asc' : 'Desc'})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Filter scans, preview DICOM / PACS images, and record validated diagnostic findings
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
                    placeholder="Search by patient, MRN, procedure, ward..."
                    value={queueSearchTerm}
                    onChange={(e) => setQueueSearchTerm(e.target.value)}
                    className="pl-8 pr-7 py-1.5 border border-slate-200 rounded-md text-xs bg-slate-50 focus:bg-white text-slate-900 w-56 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
                  <SlidersHorizontal className="w-3 h-3 text-cyan-600" />
                  <span className="text-[10px] font-bold text-slate-600">Sort:</span>
                  <select
                    value={queueSortKey}
                    onChange={(e) => setQueueSortKey(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="date">Date & Time</option>
                    <option value="patient">Patient Name (A-Z)</option>
                    <option value="procedure">Procedure Name</option>
                    <option value="mrn">OPD / IPD #</option>
                    <option value="priority">Priority (Emergency first)</option>
                    <option value="age">Age</option>
                  </select>
                </div>

                {/* Order Direction Toggle */}
                <button
                  type="button"
                  onClick={() => setQueueSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-900 rounded-md font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                  title={`Toggle sort order (currently ${queueSortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
                >
                  {queueSortOrder === 'asc' ? (
                    <>
                      <ArrowUp className="w-3 h-3 text-cyan-700" />
                      <span>Asc</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-3 h-3 text-cyan-700" />
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
                      ? 'bg-cyan-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All ({basePendingScans.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueuePriorityFilter('Emergency')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                    queuePriorityFilter === 'Emergency'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  Emergency ({basePendingScans.filter(r => r.priority === 'Emergency').length})
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
                  Urgent ({basePendingScans.filter(r => r.priority === 'Urgent').length})
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
                  Routine ({basePendingScans.filter(r => r.priority === 'Routine').length})
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

              {(queueSearchTerm || queuePriorityFilter !== 'all' || queuePatientTypeFilter !== 'all' || queueModalityFilter !== 'all' || selectedDepartmentFilter !== 'all' || selectedRoomFilter !== 'all' || selectedWardFilter !== 'all' || selectedBedFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setQueueSearchTerm('');
                    setQueuePriorityFilter('all');
                    setQueuePatientTypeFilter('all');
                    setQueueModalityFilter('all');
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
                    <option value="all">All Departments ({basePendingScans.length})</option>
                    {availableDepartments.map(dept => {
                      const count = basePendingScans.filter(r => {
                        const patient = getOrderPatient(r);
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
                      const count = basePendingScans.filter(r => {
                        const patient = getOrderPatient(r);
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
                      const count = basePendingScans.filter(r => {
                        const patient = getOrderPatient(r);
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
                      const count = basePendingScans.filter(r => {
                        const patient = getOrderPatient(r);
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

                {/* Modality Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <Film className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600">Modality:</span>
                  <select
                    value={queueModalityFilter}
                    onChange={(e) => setQueueModalityFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[150px] truncate"
                  >
                    <option value="all">All Modalities</option>
                    <option value="X-Ray">X-Ray</option>
                    <option value="Ultrasound">Ultrasound</option>
                    <option value="CT Scan">CT Scan</option>
                    <option value="MRI">MRI</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Scans List Cards */}
          <div className="grid grid-cols-1 gap-4">
            {filteredPendingScans.map(scan => {
              const patient = getOrderPatient(scan);
              const isIPD = patient?.patientType === 'IPD' || Boolean(patient?.ward);

              return (
                <div
                  key={scan.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-all"
                >
                  <div className="space-y-2 text-xs flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{scan.procedureName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        scan.priority === 'Emergency' ? 'bg-rose-100 text-rose-800' :
                        scan.priority === 'Urgent' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {scan.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800 uppercase">
                        {scan.modality}
                      </span>
                      {scan.bodyPart && (
                        <span className="text-slate-400">&bull; {scan.bodyPart}</span>
                      )}
                    </div>

                    {/* Patient & Location Row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-700 text-xs">
                      <span className="font-semibold text-slate-900 flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        {scan.patientName}
                      </span>
                      <span>&bull;</span>
                      <span className="text-slate-500 font-mono">MRN: {scan.patientMrn}</span>
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
                        <span className="font-semibold">Ordering Physician: </span>Dr. {scan.doctorName}
                      </div>
                      <div>
                        <span className="font-semibold">Ordered: </span>{new Date(scan.orderedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(scan.orderedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                      </div>
                    </div>

                    <div className="text-slate-600">
                      <span className="font-semibold">Clinical Indication: </span>{scan.clinicalHistory || 'Diagnostic investigation'}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedScan(scan);
                        setPacsModalOpen(true);
                      }}
                      className="w-full sm:w-auto px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> PACS Preview
                    </button>
                    <button
                      onClick={() => handleOpenFindingsModal(scan)}
                      className="w-full sm:w-auto px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Film className="w-4 h-4" />
                      Enter Findings
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredPendingScans.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs space-y-3">
                <Film className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-600">No radiology orders match your selected filters.</p>
                {(queueSearchTerm || queuePriorityFilter !== 'all' || queuePatientTypeFilter !== 'all' || queueModalityFilter !== 'all' || selectedDepartmentFilter !== 'all' || selectedRoomFilter !== 'all' || selectedWardFilter !== 'all' || selectedBedFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setQueueSearchTerm('');
                      setQueuePriorityFilter('all');
                      setQueuePatientTypeFilter('all');
                      setQueueModalityFilter('all');
                      setSelectedDepartmentFilter('all');
                      setSelectedRoomFilter('all');
                      setSelectedWardFilter('all');
                      setSelectedBedFilter('all');
                    }}
                    className="px-3 py-1.5 bg-cyan-600 text-white rounded text-xs font-bold cursor-pointer"
                  >
                    Reset Queue Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Recent Patients & Reports with Collapsible Details and Print/PDF Export */}
      {activeTab === 'recent_patients' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Recently Worked Upon Patients & Diagnostic Imaging Reports
              </h3>
              <p className="text-slate-500 text-[11px]">
                Review verified radiological findings, impressions, and export certified PDF reports or Excel documents.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportAllScansExcel}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Export all filtered completed radiology reports to an Excel document (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>Export as Excel</span>
              </button>
              <div className="text-slate-500 font-semibold text-xs">
                Showing <strong className="text-slate-900 font-bold">{filteredCompletedScans.length}</strong> of {baseCompletedScans.length} Reported Scans
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
                  placeholder="Search completed reports..."
                  value={recentSearchTerm}
                  onChange={(e) => setRecentSearchTerm(e.target.value)}
                  className="pl-8 pr-7 py-1.5 border border-slate-200 rounded-md text-xs bg-white text-slate-900 w-52 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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

              {/* Modality Dropdown */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-2.5 py-1">
                <Film className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-600">Modality:</span>
                <select
                  value={recentModalityFilter}
                  onChange={(e) => setRecentModalityFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
                >
                  <option value="all">All</option>
                  <option value="X-Ray">X-Ray</option>
                  <option value="Ultrasound">Ultrasound</option>
                  <option value="CT Scan">CT Scan</option>
                  <option value="MRI">MRI</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-2 py-1">
                <SlidersHorizontal className="w-3 h-3 text-cyan-600" />
                <span className="text-[10px] font-bold text-slate-600">Sort:</span>
                <select
                  value={recentSortKey}
                  onChange={(e) => setRecentSortKey(e.target.value as any)}
                  className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="date">Date Completed</option>
                  <option value="patient">Patient Name</option>
                  <option value="procedure">Procedure Name</option>
                  <option value="mrn">MRN #</option>
                </select>
              </div>

              {/* Order Direction Toggle */}
              <button
                type="button"
                onClick={() => setRecentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-1 px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-900 rounded-md font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                title={`Toggle sort order (currently ${recentSortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
              >
                {recentSortOrder === 'asc' ? (
                  <>
                    <ArrowUp className="w-3 h-3 text-cyan-700" />
                    <span>Asc</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3 h-3 text-cyan-700" />
                    <span>Desc</span>
                  </>
                )}
              </button>

              {(recentSearchTerm || recentModalityFilter !== 'all' || recentDepartmentFilter !== 'all' || recentRoomFilter !== 'all' || recentWardFilter !== 'all' || recentBedFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setRecentSearchTerm('');
                    setRecentModalityFilter('all');
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
            {filteredCompletedScans.map(scan => {
              const isExpanded = expandedResultId === scan.id;
              const patient = getOrderPatient(scan);
              const isIPD = patient?.patientType === 'IPD' || Boolean(patient?.ward);

              return (
                <div
                  key={scan.id}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:border-slate-300 transition-all"
                >
                  <div className="p-4 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{scan.procedureName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800 uppercase">
                          {scan.modality}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                          Reported
                        </span>
                        {scan.bodyPart && (
                          <span className="text-slate-400 text-xs">&bull; {scan.bodyPart}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-700 text-xs">
                        <span className="font-semibold text-slate-900 flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                          {scan.patientName}
                        </span>
                        <span>&bull;</span>
                        <span className="font-mono text-slate-600">MRN: {scan.patientMrn}</span>
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
                        <span className="text-slate-500">Ordered by Dr. {scan.doctorName}</span>
                        <span>&bull;</span>
                        <span className="text-slate-500">
                          {scan.completedAt ? new Date(scan.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                        </span>
                        {scan.attachments && scan.attachments.length > 0 && (
                          <>
                            <span>&bull;</span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                              <Paperclip className="w-2.5 h-2.5 text-emerald-600" />
                              {scan.attachments.length} attachment{scan.attachments.length > 1 ? 's' : ''} (Prime Cloud)
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => setExpandedResultId(isExpanded ? null : scan.id)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 flex items-center gap-1 font-semibold cursor-pointer shadow-xs"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" /> Collapse Details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" /> View Findings & Impression
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => exportRadiologyToPdf(scan, activeClinic)}
                        className="px-3.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        title="Export certified PDF document (user prints via PDF reader)"
                      >
                        <Download className="w-3.5 h-3.5" /> Export as PDF
                      </button>

                      <button
                        onClick={() => handleExportScanExcel(scan)}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        title="Export scan report details as Excel document (.xlsx)"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" /> Export as Excel
                      </button>

                      <button
                        onClick={() => setPrintModalData(scan)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        title="Open Document Preview Modal"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>
                    </div>
                  </div>

                  {/* Expanded Report Findings */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-200 space-y-3 bg-white">
                      {scan.clinicalHistory && (
                        <div className="text-[11px] text-slate-600">
                          <span className="font-bold text-slate-800">Clinical History & Indication: </span>
                          {scan.clinicalHistory}
                        </div>
                      )}

                      <div className="space-y-2">
                        <div>
                          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                            Radiological Findings
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 text-[11px] leading-relaxed">
                            {scan.findings || 'Findings recorded and validated.'}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                            Diagnostic Impression & Conclusion
                          </div>
                          <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200 text-cyan-950 font-medium text-[11px] leading-relaxed">
                            {scan.impression || 'Impression certified.'}
                          </div>
                        </div>

                        {scan.radiologistNotes && (
                          <div className="p-2.5 bg-slate-100 rounded border border-slate-200 text-slate-700 text-[11px]">
                            <span className="font-bold">Additional Technical Notes: </span>
                            {scan.radiologistNotes}
                          </div>
                        )}

                        {/* Patient Result Document Attachments (Stored on Prime Admin Cloud Account) */}
                        {scan.attachments && scan.attachments.length > 0 && (
                          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2.5">
                            <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                              <span className="flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                                Patient Result Document Attachments ({scan.attachments.length})
                              </span>
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-200">
                                Stored on Prime Admin Cloud Account
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {scan.attachments.map((att) => (
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
                      </div>

                      <div className="flex flex-wrap justify-between items-center gap-2 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
                        <span>Reporting Radiologist: <strong className="text-slate-800">{scan.completedBy || 'Radiology Specialist'}</strong></span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => exportRadiologyToPdf(scan, activeClinic)}
                            className="px-3.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                            title="Export certified PDF document (user prints via PDF reader)"
                          >
                            <Download className="w-3.5 h-3.5" /> Export as PDF
                          </button>
                          <button
                            onClick={() => handleExportScanExcel(scan)}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                            title="Export scan report details as Excel document (.xlsx)"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" /> Export as Excel
                          </button>
                          <button
                            onClick={() => setPrintModalData(scan)}
                            className="text-cyan-700 hover:text-cyan-800 font-bold underline flex items-center gap-1 cursor-pointer text-xs ml-1"
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

            {filteredCompletedScans.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-xs">
                No completed imaging reports match your search and filter criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Available Imaging Catalog & Menu (Add and Manage Scans for Doctors) */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card: Add or Edit Available Scan in Catalog */}
          <div className="lg:col-span-1">
            <form onSubmit={handleAddCatalogScan} className={`bg-white rounded-xl border p-5 shadow-xs space-y-4 text-xs transition-colors ${editingCatalogScanId ? 'border-cyan-400 ring-2 ring-cyan-100' : 'border-slate-200'}`}>
              <div className="pb-3 border-b border-slate-100 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    {editingCatalogScanId ? (
                      <>
                        <Pencil className="w-4 h-4 text-cyan-600" />
                        Edit Imaging Procedure
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-cyan-600" />
                        Add Imaging Procedure to Catalog
                      </>
                    )}
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    {editingCatalogScanId ? (
                      <span className="text-cyan-700 font-semibold">
                        Editing existing catalog item. Submitting will update this procedure across the clinic.
                      </span>
                    ) : (
                      'Configure scans that doctors can order directly from their consultation dashboard.'
                    )}
                  </p>
                </div>
                {editingCatalogScanId && (
                  <button
                    type="button"
                    onClick={handleCancelSidebarScanEdit}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Procedure Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Lumbar Spine X-Ray (AP & Lateral)"
                  value={newScanForm.name}
                  onChange={(e) => setNewScanForm({ ...newScanForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Procedure Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. XR-LSPINE-2V"
                    value={newScanForm.code}
                    onChange={(e) => setNewScanForm({ ...newScanForm, code: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono uppercase font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Modality *</label>
                  <select
                    value={newScanForm.category}
                    onChange={(e) => setNewScanForm({ ...newScanForm, category: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="X-Ray">X-Ray (Radiography)</option>
                    <option value="Ultrasound">Ultrasound (Sonography)</option>
                    <option value="CT Scan">CT Scan (Computed Tomography)</option>
                    <option value="MRI">MRI (Magnetic Resonance)</option>
                    <option value="General">General Imaging</option>
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
                    value={newScanForm.price}
                    onChange={(e) => setNewScanForm({ ...newScanForm, price: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Turnaround Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 30 Minutes, 1 Hour"
                    value={newScanForm.turnaroundTime}
                    onChange={(e) => setNewScanForm({ ...newScanForm, turnaroundTime: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Anatomical Region / Body Part</label>
                <input
                  type="text"
                  placeholder="e.g. Lumbar Spine, Abdomen, Chest, Brain"
                  value={newScanForm.sampleOrBodyPart}
                  onChange={(e) => setNewScanForm({ ...newScanForm, sampleOrBodyPart: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Clinical Protocol & Description</label>
                <textarea
                  rows={2}
                  placeholder="Standard projections, patient preparation, and scan protocol..."
                  value={newScanForm.description}
                  onChange={(e) => setNewScanForm({ ...newScanForm, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
                />
              </div>

              {/* Insurance Company Selling Prices (Differential Tariffs) */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-600" />
                      Insurance Tariff Schemes
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Set custom selling prices for insurance payers. Unconfigured payers bill at standard fee (${Number(newScanForm.price || 0).toFixed(2)}).
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const newPrices: Record<string, number> = {};
                        availableInsurancePolicies.forEach(p => {
                          newPrices[p.name] = Number(newScanForm.price || 0);
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
                          newPrices[p.name] = Math.round((Number(newScanForm.price || 0) * 1.10) * 100) / 100;
                        });
                        setNewItemInsurancePrices(newPrices);
                      }}
                      className="px-2 py-1 text-[10px] font-semibold bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded border border-cyan-200 transition-colors cursor-pointer"
                    >
                      +10%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newPrices: Record<string, number> = {};
                        availableInsurancePolicies.forEach(p => {
                          newPrices[p.name] = Math.round((Number(newScanForm.price || 0) * 1.20) * 100) / 100;
                        });
                        setNewItemInsurancePrices(newPrices);
                      }}
                      className="px-2 py-1 text-[10px] font-semibold bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded border border-cyan-200 transition-colors cursor-pointer"
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
                                placeholder={`${Number(newScanForm.price || 0).toFixed(2)}`}
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
                                className="w-full pl-5 pr-1.5 py-1 text-xs border border-slate-300 rounded font-semibold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setNewItemInsurancePrices(prev => ({
                                  ...prev,
                                  [policy.name]: Number(newScanForm.price || 0)
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
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {editingCatalogScanId ? (
                    <>
                      <Check className="w-4 h-4" /> Save Changes to Procedure
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Save Imaging Procedure to Catalog
                    </>
                  )}
                </button>
                {editingCatalogScanId && (
                  <button
                    type="button"
                    onClick={handleCancelSidebarScanEdit}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Cancel Edit (Create New Procedure Instead)
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
                    Active Radiology & Imaging Catalog ({filteredCatalog.length} procedures)
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    Available procedures published for doctor order entry in consultation suite.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search procedure, modality, body part..."
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

                  {/* Modality / Category Dropdown */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                    <span className="text-[10px] font-bold text-slate-600">Modality:</span>
                    <select
                      value={catalogCategoryFilter}
                      onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                      className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Modalities</option>
                      <option value="X-Ray">X-Ray</option>
                      <option value="Ultrasound">Ultrasound</option>
                      <option value="CT Scan">CT Scan</option>
                      <option value="MRI">MRI</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportCatalogExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-bold text-xs cursor-pointer shadow-xs transition-colors"
                    title="Export imaging catalog to Excel document (.xlsx)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Export as Excel</span>
                  </button>

                  {/* Sort Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                    <SlidersHorizontal className="w-3 h-3 text-cyan-600" />
                    <select
                      value={catalogSortKey}
                      onChange={(e) => setCatalogSortKey(e.target.value as any)}
                      className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="name">Sort by Name</option>
                      <option value="code">Sort by Code</option>
                      <option value="price">Sort by Price</option>
                      <option value="category">Sort by Modality</option>
                    </select>
                  </div>

                  {/* Sort Order Toggle */}
                  <button
                    type="button"
                    onClick={() => setCatalogSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-1.5 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 rounded-md cursor-pointer"
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
                        ? 'bg-white border-slate-200 shadow-2xs hover:border-cyan-300'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200">
                          {item.code}
                        </span>
                        <h4
                          onClick={() => handleStartEditScanModal(item)}
                          className="font-bold text-slate-900 text-xs mt-1 hover:text-cyan-700 cursor-pointer flex items-center gap-1 transition-colors"
                          title="Click to edit procedure"
                        >
                          <span>{item.name}</span>
                          <Pencil className="w-2.5 h-2.5 text-slate-400 hover:text-cyan-600" />
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
                        <span className="font-semibold text-slate-700">Modality:</span> {item.category}
                      </div>
                      {item.sampleOrBodyPart && (
                        <div>
                          <span className="font-semibold text-slate-700">Anatomy:</span> {item.sampleOrBodyPart}
                        </div>
                      )}
                      {item.description && (
                        <p className="text-slate-500 text-[10px] line-clamp-2 pt-1 border-t border-slate-100">
                          {item.description}
                        </p>
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
                          onClick={() => handleStartEditScanModal(item)}
                          className="px-2 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Edit procedure details and parameters"
                        >
                          <Pencil className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInsurancePricingScan(item)}
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
                          title="Delete scan"
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
                  No procedures matching "{searchFilter}". Click "Add Imaging Procedure" on the left to create one.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Consumables Stock */}
      {activeTab === 'consumables' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900">
              Radiology Consumables & Contrast Media ({radiologySupplies.length} items)
            </h3>
            <button
              onClick={onOpenInventory}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Request Contrast Supply
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3">SKU Code</th>
                  <th className="py-2.5 px-3 text-right">Available Stock</th>
                  <th className="py-2.5 px-3 text-right">Cost Rate</th>
                  <th className="py-2.5 px-3">Batches & Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {radiologySupplies.map(item => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{item.code}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {item.totalQuantity} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-700">${item.unitCost.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {item.batches.map(b => `${b.batchNumber} (Exp: ${b.expiryDate})`).join(', ') || 'Standard Lot'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enter Findings Modal */}
      {findingsModalOpen && selectedScan && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setFindingsModalOpen(false);
            }
          }}
        >
          <form 
            onSubmit={handleSaveFindings} 
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden text-xs cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Certify Imaging Findings: {selectedScan.procedureName}</h3>
                <p className="text-slate-300 text-[11px]">Patient: {selectedScan.patientName} ({selectedScan.patientMrn})</p>
              </div>
              <button
                type="button"
                onClick={() => setFindingsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-base"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Radiological Findings (Observations) *</label>
                <textarea
                  rows={4}
                  value={findingsText}
                  onChange={(e) => setFindingsText(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-xs leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Diagnostic Impression & Conclusion *</label>
                <textarea
                  rows={2}
                  value={impressionText}
                  onChange={(e) => setImpressionText(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-semibold text-slate-900 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Radiologist Notes & Recommendations</label>
                <textarea
                  rows={2}
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="e.g. Clinical correlation advised. Follow-up imaging in 4 weeks if symptoms persist."
                  className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
                />
              </div>

              {/* Patient Result Document Attachments (Stored in Prime Admin Cloud Account) */}
              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-cyan-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      Attach Diagnostic Documents & Images
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
                    <Upload className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Attach Files</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.dcm,.dicom,.doc,.docx"
                    onChange={handleAttachmentUpload}
                    className="hidden"
                  />
                </div>

                <p className="text-[11px] text-slate-500">
                  Attach scan images, DICOM exports, prior investigation reports, or referral slips. All attachments are saved directly to the Prime Admin's cloud account partition.
                </p>

                {scanAttachments.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {scanAttachments.map((att) => (
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
                            <FileText className="w-5 h-5 text-cyan-600 shrink-0" />
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
                            className="px-2 py-0.5 text-[11px] font-semibold text-cyan-700 hover:bg-cyan-50 rounded cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => setScanAttachments(prev => prev.filter(a => a.id !== att.id))}
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
                    No documents attached yet. Click "Attach Files" to upload patient scan records.
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-slate-500 text-[11px]">
                Validating report finalizes diagnostic findings and makes report available for immediate PDF or Excel document export.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFindingsModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded cursor-pointer"
                >
                  Certify & Approve Report
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* PACS Viewer Simulation Modal */}
      {pacsModalOpen && selectedScan && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPacsModalOpen(false);
            }
          }}
        >
          <div 
            className="bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 w-full max-w-3xl overflow-hidden text-xs cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2 font-mono">
                <Film className="w-4 h-4 text-cyan-400" />
                <span>PACS DICOM Viewer &bull; {selectedScan.procedureName}</span>
              </div>
              <button
                onClick={() => setPacsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-base"
              >
                &times;
              </button>
            </div>

            <div className="p-8 flex flex-col items-center justify-center bg-black min-h-[320px] relative">
              <div className="w-64 h-64 border border-cyan-500/30 rounded-lg flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/60 shadow-inner">
                <Film className="w-16 h-16 text-cyan-400/40 animate-pulse" />
                <div className="font-mono text-cyan-300 text-xs">
                  {selectedScan.modality} SERIES #1 - {selectedScan.bodyPart}
                </div>
                <div className="text-[10px] text-slate-400">
                  Window: L:40 W:400 &bull; Matrix: 512x512 &bull; 16-bit Grayscale
                </div>
              </div>

              <div className="absolute top-4 left-4 text-[10px] font-mono text-cyan-400/70 space-y-0.5">
                <div>Patient: {selectedScan.patientName}</div>
                <div>MRN: {selectedScan.patientMrn}</div>
                <div>Modality: {selectedScan.modality}</div>
              </div>

              <div className="absolute bottom-4 right-4 text-[10px] font-mono text-slate-500">
                Facility: {activeClinic.name} ({activeClinic.code})
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">Simulated High-Resolution Diagnostic Viewer</span>
              <button
                onClick={() => setPacsModalOpen(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Report Preview Modal */}
      {printModalData && (
        <PrintReceiptModal
          isOpen={true}
          onClose={() => setPrintModalData(null)}
          type="radiology_report"
          data={printModalData}
        />
      )}

      {/* Insurance Tariff Pricing Modal */}
      {insurancePricingScan && (
        <TestInsurancePricingModal
          test={insurancePricingScan}
          onClose={() => setInsurancePricingScan(null)}
        />
      )}

      {/* Edit Radiology Procedure Catalog Modal */}
      {editingScanModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingScanModal(null);
            }
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-xs cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">Edit Radiology Procedure</h3>
                    <span className="px-1.5 py-0.5 rounded bg-white/20 text-white font-mono text-[10px] font-bold">
                      {editingScanModal.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-100">
                    Modify procedure code, modality, standard fee, anatomical target, and tariffs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingScanModal(null)}
                className="text-white/80 hover:text-white cursor-pointer text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEditedModalScan} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Procedure Name *</label>
                  <input
                    type="text"
                    value={editScanFormData.name}
                    onChange={(e) => setEditScanFormData({ ...editScanFormData, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="e.g. Chest X-Ray PA & Lateral View"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Procedure Code / SKU *</label>
                    <input
                      type="text"
                      value={editScanFormData.code}
                      onChange={(e) => setEditScanFormData({ ...editScanFormData, code: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-mono uppercase font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="e.g. XR-CHEST-2V"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Modality *</label>
                    <select
                      value={editScanFormData.category}
                      onChange={(e) => setEditScanFormData({ ...editScanFormData, category: e.target.value as any })}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="X-Ray">X-Ray (Radiography)</option>
                      <option value="Ultrasound">Ultrasound (Sonography)</option>
                      <option value="CT Scan">CT Scan (Computed Tomography)</option>
                      <option value="MRI">MRI (Magnetic Resonance)</option>
                      <option value="General">General Medical Imaging</option>
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
                        value={editScanFormData.price}
                        onChange={(e) => setEditScanFormData({ ...editScanFormData, price: Number(e.target.value) })}
                        className="w-full pl-6 pr-2 py-2 border border-slate-300 rounded bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Turnaround Time</label>
                    <input
                      type="text"
                      value={editScanFormData.turnaroundTime}
                      onChange={(e) => setEditScanFormData({ ...editScanFormData, turnaroundTime: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="e.g. 30 Minutes, 1 Hour, STAT"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Anatomical Region / Body Part</label>
                  <input
                    type="text"
                    value={editScanFormData.sampleOrBodyPart}
                    onChange={(e) => setEditScanFormData({ ...editScanFormData, sampleOrBodyPart: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="e.g. Lumbar Spine, Abdomen & Pelvis, Chest, Brain"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Clinical Protocol & Description</label>
                  <textarea
                    rows={2}
                    value={editScanFormData.description}
                    onChange={(e) => setEditScanFormData({ ...editScanFormData, description: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs"
                    placeholder="Standard projections, patient preparation, and scan protocol..."
                  />
                </div>

                {/* Status Toggle */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">Catalog Status</span>
                    <span className="text-[11px] text-slate-500">
                      {editScanFormData.isActive ? 'Active and available for doctor order entry' : 'Inactive (hidden from consultation order suite)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditScanFormData({ ...editScanFormData, isActive: !editScanFormData.isActive })}
                    className="flex items-center gap-1.5 font-bold cursor-pointer"
                  >
                    {editScanFormData.isActive ? (
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
                        <ShieldCheck className="w-4 h-4 text-cyan-600" />
                        Insurance Tariff Schemes
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Custom prices for insurance payers. Unconfigured payers bill at cash fee (${Number(editScanFormData.price || 0).toFixed(2)}).
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const newPrices: Record<string, number> = {};
                          availableInsurancePolicies.forEach(p => {
                            newPrices[p.name] = Number(editScanFormData.price || 0);
                          });
                          setEditScanFormData(prev => ({ ...prev, insurancePrices: newPrices }));
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
                            newPrices[p.name] = Math.round((Number(editScanFormData.price || 0) * 1.10) * 100) / 100;
                          });
                          setEditScanFormData(prev => ({ ...prev, insurancePrices: newPrices }));
                        }}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded border border-cyan-200 transition-colors cursor-pointer"
                      >
                        +10%
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newPrices: Record<string, number> = {};
                          availableInsurancePolicies.forEach(p => {
                            newPrices[p.name] = Math.round((Number(editScanFormData.price || 0) * 1.20) * 100) / 100;
                          });
                          setEditScanFormData(prev => ({ ...prev, insurancePrices: newPrices }));
                        }}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded border border-cyan-200 transition-colors cursor-pointer"
                      >
                        +20%
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditScanFormData(prev => ({ ...prev, insurancePrices: {} }))}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {availableInsurancePolicies.length > 0 && (
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {availableInsurancePolicies.map(policy => {
                        const hasCustom = editScanFormData.insurancePrices[policy.name] !== undefined;
                        const currentVal = hasCustom ? editScanFormData.insurancePrices[policy.name] : '';

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
                                  placeholder={`${Number(editScanFormData.price || 0).toFixed(2)}`}
                                  value={currentVal}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditScanFormData(prev => {
                                      const updated = { ...prev.insurancePrices };
                                      if (val === '') {
                                        delete updated[policy.name];
                                      } else {
                                        updated[policy.name] = Number(val);
                                      }
                                      return { ...prev, insurancePrices: updated };
                                    });
                                  }}
                                  className="w-full pl-5 pr-1.5 py-1 text-xs border border-slate-300 rounded font-semibold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
                    handleLoadScanIntoSidebar(editingScanModal);
                    setEditingScanModal(null);
                  }}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded font-semibold text-xs cursor-pointer transition-colors"
                  title="Switch editing to left sidebar form"
                >
                  Dock into Sidebar Form
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingScanModal(null)}
                    className="px-4 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded font-semibold text-xs cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
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
                <Paperclip className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-bold text-xs truncate">{viewingAttachment.name}</span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  ({(viewingAttachment.size / 1024).toFixed(1)} KB • Prime Admin Cloud)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingAttachment.dataUrl}
                  download={viewingAttachment.name}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
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
