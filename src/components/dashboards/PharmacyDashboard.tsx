import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Prescription, StockBatch, InventoryItem, PharmacyCart, ClinicalEncounter, Patient } from '../../types';
import { getAgeInYears, formatPatientAge } from '../../utils/ageUtils';
import {
  Pill,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  Layers,
  Search,
  Plus,
  Printer,
  Calendar,
  DollarSign,
  BedDouble,
  Syringe,
  FileText,
  Stethoscope,
  Building2,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Check,
  Filter,
  User,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Activity,
  Eye,
  History,
  X,
  MessageSquare,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Tag,
  DoorOpen
} from 'lucide-react';
import { PrintReceiptModal } from '../common/PrintReceiptModal';
import { CartAllocationModal } from './pharmacy/CartAllocationModal';
import { TransferToInjectionRoomModal } from './pharmacy/TransferToInjectionRoomModal';

interface PharmacyDashboardProps {
  onOpenInventory: () => void;
}

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({ onOpenInventory }) => {
  const {
    activeClinic,
    currentUser,
    prescriptions,
    currentClinicPrescriptions,
    inventory,
    currentClinicInventory,
    pharmacyCarts,
    currentClinicPharmacyCarts,
    currentClinicPatients,
    currentClinicDepartments,
    currentClinicWards,
    currentClinicEncounters,
    currentClinicInsurancePolicies,
    dispensePrescriptionItem,
    dispenseDirectCart,
    sendIndirectCartToNursing,
    addStockBatch
  } = useClinic();

  const [activeTab, setActiveTab] = useState<'queue' | 'direct_carts' | 'indirect_carts' | 'stock' | 'dispensed_history'>('queue');
  const [selectedRxForAllocation, setSelectedRxForAllocation] = useState<Prescription | null>(null);
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  
  // Dispense Direct Cart Modal / Batch Selection
  const [selectedDirectCart, setSelectedDirectCart] = useState<PharmacyCart | null>(null);
  const [directDispenseModalOpen, setDirectDispenseModalOpen] = useState(false);

  // Transfer Items to Injection Room Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedCartForTransfer, setSelectedCartForTransfer] = useState<PharmacyCart | null>(null);

  // History Modal for viewing Accountant clearance notes & revisions
  const [selectedHistoryCart, setSelectedHistoryCart] = useState<PharmacyCart | null>(null);
  
  const [printModalData, setPrintModalData] = useState<any>(null);
  const [expandedEncounterRxId, setExpandedEncounterRxId] = useState<string | null>(null);

  // Quick Stock-In Modal
  const [stockInModalOpen, setStockInModalOpen] = useState(false);
  const [selectedStockInItem, setSelectedStockInItem] = useState<InventoryItem | null>(null);
  const [stockInForm, setStockInForm] = useState({
    batchNumber: '',
    expiryDate: '',
    quantity: 10,
    unitCost: 0,
    sellingPrice: 0,
    supplier: ''
  });

  // Patient Map Helper
  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    currentClinicPatients.forEach(p => {
      map.set(p.id, p);
      if (p.mrn) map.set(p.mrn, p);
    });
    return map;
  }, [currentClinicPatients]);

  const getRxPatient = (rx: { patientId: string; patientMrn?: string }): Patient | undefined => {
    return patientMap.get(rx.patientId) || (rx.patientMrn ? patientMap.get(rx.patientMrn) : undefined);
  };

  // Tab 1: Queue Filters & Sort State
  const [queueSearchTerm, setQueueSearchTerm] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState<'all' | 'pending' | 'partially_dispensed' | 'completed'>('all');
  const [queuePatientTypeFilter, setQueuePatientTypeFilter] = useState<'all' | 'OPD' | 'IPD'>('all');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>('all');
  const [selectedBedFilter, setSelectedBedFilter] = useState<string>('all');
  const [queueSortKey, setQueueSortKey] = useState<'date' | 'patient' | 'doctor' | 'mrn' | 'diagnosis' | 'items' | 'age'>('date');
  const [queueSortOrder, setQueueSortOrder] = useState<'asc' | 'desc'>('desc');

  // Tab 2: Direct OPD Carts Filters & Sort State
  const [directSearchTerm, setDirectSearchTerm] = useState('');
  const [directStatusFilter, setDirectStatusFilter] = useState<'all' | 'pending_accounts' | 'approved' | 'rejected' | 'dispensed'>('all');
  const [directInsuranceFilter, setDirectInsuranceFilter] = useState<string>('all');
  const [directSortKey, setDirectSortKey] = useState<'date' | 'patient' | 'cart' | 'amount'>('date');
  const [directSortOrder, setDirectSortOrder] = useState<'asc' | 'desc'>('desc');

  // Tab 3: Indirect Carts (Injection Room) Filters & Sort State
  const [indirectSearchTerm, setIndirectSearchTerm] = useState('');
  const [indirectStatusFilter, setIndirectStatusFilter] = useState<'all' | 'pending_accounts' | 'ready_for_nursing' | 'dispensed' | 'administered'>('all');
  const [indirectSortKey, setIndirectSortKey] = useState<'date' | 'patient' | 'cart' | 'amount'>('date');
  const [indirectSortOrder, setIndirectSortOrder] = useState<'asc' | 'desc'>('desc');

  // Tab 4: Dispensary Stock Filters & Sort State
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'in_stock'>('all');
  const [stockSortKey, setStockSortKey] = useState<'name' | 'code' | 'quantity' | 'price'>('name');
  const [stockSortOrder, setStockSortOrder] = useState<'asc' | 'desc'>('asc');

  // Tab 5: Dispensed History Filters & Sort State
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'prescriptions' | 'direct_carts'>('all');
  const [historySortKey, setHistorySortKey] = useState<'date' | 'patient' | 'id'>('date');
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');

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

  // Calculate effective timestamp (updatedAt takes priority over createdAt)
  const getEffectiveTimestamp = (rx: Prescription): number => {
    const rawTime = rx.updatedAt || rx.createdAt;
    const t = new Date(rawTime).getTime();
    return isNaN(t) ? 0 : t;
  };

  // Base Prescriptions
  const basePrescriptions = useMemo(() => {
    return currentClinicPrescriptions.filter(rx => {
      if (rx.targetDepartment === 'nursing') return false;
      if (rx.isDischargePrescription) return true;
      if (rx.patientType === 'IPD') return false;
      const patient = getRxPatient(rx);
      if (patient?.patientType === 'IPD' || (patient as any)?.admissionType === 'IPD' || !!patient?.ward) {
        return false;
      }
      return true;
    });
  }, [currentClinicPrescriptions, patientMap]);

  // Sorted Prescriptions (default newest first)
  const sortedPrescriptions = useMemo(() => {
    return [...basePrescriptions].sort(
      (a, b) => getEffectiveTimestamp(b) - getEffectiveTimestamp(a)
    );
  }, [basePrescriptions]);

  // The single most recently saved / modified prescription
  const mostRecentPrescription: Prescription | null = sortedPrescriptions.length > 0 ? sortedPrescriptions[0] : null;

  const pendingPrescriptions = useMemo(() => {
    return basePrescriptions.filter(
      rx => rx.overallStatus === 'pending' || rx.overallStatus === 'partially_dispensed'
    );
  }, [basePrescriptions]);

  const completedPrescriptions = useMemo(() => {
    return basePrescriptions.filter(
      rx => rx.overallStatus === 'completed'
    );
  }, [basePrescriptions]);

  // Helper to find linked clinical encounter
  const getLinkedEncounter = (rx: Prescription): ClinicalEncounter | undefined => {
    if (!rx.encounterId) return undefined;
    return currentClinicEncounters.find(e => e.id === rx.encounterId);
  };

  // Filtered Queue Prescriptions
  const filteredQueuePrescriptions = useMemo(() => {
    let result = [...basePrescriptions];

    if (queueSearchTerm.trim()) {
      const q = queueSearchTerm.toLowerCase().trim();
      result = result.filter(rx => {
        const patient = getRxPatient(rx);
        const nameMatch = (rx.patientName || '').toLowerCase().includes(q);
        const mrnMatch = (rx.patientMrn || '').toLowerCase().includes(q);
        const docMatch = (rx.doctorName || '').toLowerCase().includes(q);
        const dxMatch = (rx.diagnosis || '').toLowerCase().includes(q);
        const notesMatch = (rx.clinicalNotes || '').toLowerCase().includes(q);
        const idMatch = rx.id.toLowerCase().includes(q);
        const itemsMatch = rx.items?.some(it => it.medicationName.toLowerCase().includes(q));
        const wardMatch = (patient?.ward || '').toLowerCase().includes(q);
        const bedMatch = (patient?.bedNumber || '').toLowerCase().includes(q);
        const deptMatch = (patient?.department || '').toLowerCase().includes(q);
        const roomMatch = (patient?.doctorRoom || '').toLowerCase().includes(q);
        return nameMatch || mrnMatch || docMatch || dxMatch || notesMatch || idMatch || itemsMatch || wardMatch || bedMatch || deptMatch || roomMatch;
      });
    }

    if (queueStatusFilter !== 'all') {
      result = result.filter(rx => rx.overallStatus === queueStatusFilter);
    }

    if (queuePatientTypeFilter !== 'all') {
      result = result.filter(rx => {
        const patient = getRxPatient(rx);
        const isIPD = patient?.patientType === 'IPD' || !!patient?.ward || rx.isDischargePrescription;
        return queuePatientTypeFilter === 'IPD' ? isIPD : !isIPD;
      });
    }

    if (selectedDepartmentFilter !== 'all') {
      result = result.filter(rx => {
        const patient = getRxPatient(rx);
        const pDept = patient?.department || (patient?.patientType === 'IPD' ? 'Inpatient Ward' : 'General Outpatient (OPD)');
        return pDept.toLowerCase() === selectedDepartmentFilter.toLowerCase() || patient?.department === selectedDepartmentFilter;
      });
    }

    if (selectedRoomFilter !== 'all') {
      result = result.filter(rx => {
        const patient = getRxPatient(rx);
        const pRoom = patient?.doctorRoom || (patient?.patientType === 'IPD' ? (patient?.ward || 'Ward') : 'Consultation Room 1');
        return pRoom.toLowerCase() === selectedRoomFilter.toLowerCase() || patient?.doctorRoom === selectedRoomFilter;
      });
    }

    if (selectedWardFilter !== 'all') {
      result = result.filter(rx => {
        const patient = getRxPatient(rx);
        return (patient?.ward || '') === selectedWardFilter;
      });
    }

    if (selectedBedFilter !== 'all') {
      result = result.filter(rx => {
        const patient = getRxPatient(rx);
        return (patient?.bedNumber || '') === selectedBedFilter;
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (queueSortKey === 'date') {
        cmp = getEffectiveTimestamp(a) - getEffectiveTimestamp(b);
      } else if (queueSortKey === 'patient') {
        cmp = a.patientName.localeCompare(b.patientName);
      } else if (queueSortKey === 'doctor') {
        cmp = a.doctorName.localeCompare(b.doctorName);
      } else if (queueSortKey === 'mrn') {
        cmp = a.patientMrn.localeCompare(b.patientMrn, undefined, { numeric: true });
      } else if (queueSortKey === 'diagnosis') {
        cmp = (a.diagnosis || '').localeCompare(b.diagnosis || '');
      } else if (queueSortKey === 'items') {
        cmp = (a.items?.length || 0) - (b.items?.length || 0);
      } else if (queueSortKey === 'age') {
        const ageA = getAgeInYears(getRxPatient(a));
        const ageB = getAgeInYears(getRxPatient(b));
        cmp = Number(ageA) - Number(ageB);
      }
      return queueSortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [
    basePrescriptions,
    queueSearchTerm,
    queueStatusFilter,
    queuePatientTypeFilter,
    selectedDepartmentFilter,
    selectedRoomFilter,
    selectedWardFilter,
    selectedBedFilter,
    queueSortKey,
    queueSortOrder,
    patientMap
  ]);

  // Tab 2: Direct Carts
  const baseDirectCarts = useMemo(() => {
    return currentClinicPharmacyCarts.filter(c => c.cartType === 'direct');
  }, [currentClinicPharmacyCarts]);

  const pendingDirectCarts = useMemo(() => {
    return baseDirectCarts.filter(c => c.status !== 'dispensed');
  }, [baseDirectCarts]);

  const filteredDirectCarts = useMemo(() => {
    let result = [...baseDirectCarts];

    if (directSearchTerm.trim()) {
      const q = directSearchTerm.toLowerCase().trim();
      result = result.filter(c => {
        const numMatch = (c.cartNumber || c.id).toLowerCase().includes(q);
        const pName = c.patientName.toLowerCase().includes(q);
        const mrn = (c.patientMrn || '').toLowerCase().includes(q);
        const by = (c.createdBy || '').toLowerCase().includes(q);
        const notes = (c.accountsNotes || '').toLowerCase().includes(q);
        const itemsMatch = c.items.some(i => i.itemName.toLowerCase().includes(q));
        return numMatch || pName || mrn || by || notes || itemsMatch;
      });
    }

    if (directStatusFilter !== 'all') {
      result = result.filter(c => {
        const isApproved = c.accountsStatus === 'approved' || c.status === 'approved_by_accounts';
        const isDispensed = c.status === 'dispensed';
        const isPending = c.status === 'pending_accounts' || c.accountsStatus === 'pending';
        const isRejected = c.accountsStatus === 'rejected' || c.status === 'rejected_by_accounts';

        if (directStatusFilter === 'pending_accounts') return isPending;
        if (directStatusFilter === 'approved') return isApproved && !isDispensed;
        if (directStatusFilter === 'rejected') return isRejected;
        if (directStatusFilter === 'dispensed') return isDispensed;
        return true;
      });
    }

    if (directInsuranceFilter !== 'all') {
      result = result.filter(c => c.insurancePolicyName === directInsuranceFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (directSortKey === 'date') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (directSortKey === 'patient') {
        cmp = a.patientName.localeCompare(b.patientName);
      } else if (directSortKey === 'cart') {
        cmp = (a.cartNumber || a.id).localeCompare(b.cartNumber || b.id, undefined, { numeric: true });
      } else if (directSortKey === 'amount') {
        const valA = a.totalSumCost || a.totalAmount || a.items.reduce((s, i) => s + (i.totalPrice || i.quantity * i.unitPrice), 0);
        const valB = b.totalSumCost || b.totalAmount || b.items.reduce((s, i) => s + (i.totalPrice || i.quantity * i.unitPrice), 0);
        cmp = valA - valB;
      }
      return directSortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [baseDirectCarts, directSearchTerm, directStatusFilter, directInsuranceFilter, directSortKey, directSortOrder]);

  // Tab 3: Indirect Carts
  const baseIndirectCarts = useMemo(() => {
    return currentClinicPharmacyCarts.filter(c => c.cartType === 'indirect');
  }, [currentClinicPharmacyCarts]);

  const pendingIndirectCarts = useMemo(() => {
    return baseIndirectCarts.filter(c => c.status !== 'administered' && c.status !== 'dispensed');
  }, [baseIndirectCarts]);

  const filteredIndirectCarts = useMemo(() => {
    let result = [...baseIndirectCarts];

    if (indirectSearchTerm.trim()) {
      const q = indirectSearchTerm.toLowerCase().trim();
      result = result.filter(c => {
        const numMatch = (c.cartNumber || c.id).toLowerCase().includes(q);
        const pName = c.patientName.toLowerCase().includes(q);
        const mrn = (c.patientMrn || '').toLowerCase().includes(q);
        const parentMatch = (c.parentCartNumber || '').toLowerCase().includes(q);
        const by = (c.createdBy || '').toLowerCase().includes(q);
        const notes = (c.accountsNotes || '').toLowerCase().includes(q);
        const itemsMatch = c.items.some(i => i.itemName.toLowerCase().includes(q));
        return numMatch || pName || mrn || parentMatch || by || notes || itemsMatch;
      });
    }

    if (indirectStatusFilter !== 'all') {
      result = result.filter(c => {
        const isApproved = c.accountsStatus === 'approved' || c.status === 'approved_by_accounts';
        const isSentToNursing = c.status === 'sent_to_nursing' || c.status === 'ready_for_nursing';
        const isDispensed = c.status === 'dispensed' || c.status === 'administered';
        const isPending = c.status === 'pending_accounts' || c.accountsStatus === 'pending';

        if (indirectStatusFilter === 'pending_accounts') return isPending;
        if (indirectStatusFilter === 'ready_for_nursing') return isSentToNursing || (isApproved && !isDispensed);
        if (indirectStatusFilter === 'dispensed' || indirectStatusFilter === 'administered') return isDispensed;
        return true;
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (indirectSortKey === 'date') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (indirectSortKey === 'patient') {
        cmp = a.patientName.localeCompare(b.patientName);
      } else if (indirectSortKey === 'cart') {
        cmp = (a.cartNumber || a.id).localeCompare(b.cartNumber || b.id, undefined, { numeric: true });
      } else if (indirectSortKey === 'amount') {
        const valA = a.totalSumCost || a.totalAmount || a.items.reduce((s, i) => s + (i.totalPrice || i.quantity * i.unitPrice), 0);
        const valB = b.totalSumCost || b.totalAmount || b.items.reduce((s, i) => s + (i.totalPrice || i.quantity * i.unitPrice), 0);
        cmp = valA - valB;
      }
      return indirectSortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [baseIndirectCarts, indirectSearchTerm, indirectStatusFilter, indirectSortKey, indirectSortOrder]);

  // Tab 4: Pharmacy Stock
  const pharmacyStock = useMemo(() => {
    return currentClinicInventory.filter(
      i => i.category === 'pharmaceutical' || i.department === 'pharmacy'
    );
  }, [currentClinicInventory]);

  const filteredStock = useMemo(() => {
    let result = [...pharmacyStock];

    if (stockSearchTerm.trim()) {
      const q = stockSearchTerm.toLowerCase().trim();
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.dosageForm && item.dosageForm.toLowerCase().includes(q))
      );
    }

    if (stockStatusFilter === 'low') {
      result = result.filter(item => item.totalQuantity <= item.reorderLevel);
    } else if (stockStatusFilter === 'in_stock') {
      result = result.filter(item => item.totalQuantity > item.reorderLevel);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (stockSortKey === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (stockSortKey === 'code') {
        cmp = a.code.localeCompare(b.code);
      } else if (stockSortKey === 'quantity') {
        cmp = a.totalQuantity - b.totalQuantity;
      } else if (stockSortKey === 'price') {
        cmp = a.sellingPrice - b.sellingPrice;
      }
      return stockSortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [pharmacyStock, stockSearchTerm, stockStatusFilter, stockSortKey, stockSortOrder]);

  // Tab 5: Dispensed History
  const filteredHistoryPrescriptions = useMemo(() => {
    if (historyTypeFilter === 'direct_carts') return [];
    let list = [...completedPrescriptions];
    if (historySearchTerm.trim()) {
      const q = historySearchTerm.toLowerCase().trim();
      list = list.filter(rx =>
        rx.id.toLowerCase().includes(q) ||
        rx.patientName.toLowerCase().includes(q) ||
        (rx.patientMrn || '').toLowerCase().includes(q) ||
        rx.doctorName.toLowerCase().includes(q) ||
        rx.items.some(i => i.medicationName.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (historySortKey === 'date') {
        cmp = getEffectiveTimestamp(a) - getEffectiveTimestamp(b);
      } else if (historySortKey === 'patient') {
        cmp = a.patientName.localeCompare(b.patientName);
      } else if (historySortKey === 'id') {
        cmp = a.id.localeCompare(b.id, undefined, { numeric: true });
      }
      return historySortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [completedPrescriptions, historyTypeFilter, historySearchTerm, historySortKey, historySortOrder]);

  const filteredHistoryDirectCarts = useMemo(() => {
    if (historyTypeFilter === 'prescriptions') return [];
    let list = baseDirectCarts.filter(c => c.status === 'dispensed');
    if (historySearchTerm.trim()) {
      const q = historySearchTerm.toLowerCase().trim();
      list = list.filter(c =>
        (c.cartNumber || c.id).toLowerCase().includes(q) ||
        c.patientName.toLowerCase().includes(q) ||
        (c.patientMrn || '').toLowerCase().includes(q) ||
        (c.createdBy || '').toLowerCase().includes(q) ||
        c.items.some(i => i.itemName.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (historySortKey === 'date') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (historySortKey === 'patient') {
        cmp = a.patientName.localeCompare(b.patientName);
      } else if (historySortKey === 'id') {
        cmp = (a.cartNumber || a.id).localeCompare(b.cartNumber || b.id, undefined, { numeric: true });
      }
      return historySortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [baseDirectCarts, historyTypeFilter, historySearchTerm, historySortKey, historySortOrder]);

  const handleOpenAllocationModal = (rx: Prescription) => {
    setSelectedRxForAllocation(rx);
    setAllocationModalOpen(true);
  };

  // Unique Insurance Policies for Cart Filter
  const availableInsurances = useMemo(() => {
    const set = new Set<string>();
    if (currentClinicInsurancePolicies && Array.isArray(currentClinicInsurancePolicies)) {
      currentClinicInsurancePolicies.forEach(pol => { if (pol.name) set.add(pol.name); });
    }
    baseDirectCarts.forEach(c => {
      if (c.insurancePolicyName) set.add(c.insurancePolicyName);
    });
    return Array.from(set).sort();
  }, [currentClinicInsurancePolicies, baseDirectCarts]);

  // Tab 1 Active Filter Check & Reset
  const isQueueFilterActive = queueSearchTerm !== '' ||
    queueStatusFilter !== 'all' ||
    queuePatientTypeFilter !== 'all' ||
    selectedDepartmentFilter !== 'all' ||
    selectedRoomFilter !== 'all' ||
    selectedWardFilter !== 'all' ||
    selectedBedFilter !== 'all' ||
    queueSortKey !== 'date' ||
    queueSortOrder !== 'desc';

  const resetQueueFilters = () => {
    setQueueSearchTerm('');
    setQueueStatusFilter('all');
    setQueuePatientTypeFilter('all');
    setSelectedDepartmentFilter('all');
    setSelectedRoomFilter('all');
    setSelectedWardFilter('all');
    setSelectedBedFilter('all');
    setQueueSortKey('date');
    setQueueSortOrder('desc');
  };

  // Tab 2 Active Filter Check & Reset
  const isDirectFilterActive = directSearchTerm !== '' ||
    directStatusFilter !== 'all' ||
    directInsuranceFilter !== 'all' ||
    directSortKey !== 'date' ||
    directSortOrder !== 'desc';

  const resetDirectFilters = () => {
    setDirectSearchTerm('');
    setDirectStatusFilter('all');
    setDirectInsuranceFilter('all');
    setDirectSortKey('date');
    setDirectSortOrder('desc');
  };

  // Tab 3 Active Filter Check & Reset
  const isIndirectFilterActive = indirectSearchTerm !== '' ||
    indirectStatusFilter !== 'all' ||
    indirectSortKey !== 'date' ||
    indirectSortOrder !== 'desc';

  const resetIndirectFilters = () => {
    setIndirectSearchTerm('');
    setIndirectStatusFilter('all');
    setIndirectSortKey('date');
    setIndirectSortOrder('desc');
  };

  // Tab 4 Active Filter Check & Reset
  const isStockFilterActive = stockSearchTerm !== '' ||
    stockStatusFilter !== 'all' ||
    stockSortKey !== 'name' ||
    stockSortOrder !== 'asc';

  const resetStockFilters = () => {
    setStockSearchTerm('');
    setStockStatusFilter('all');
    setStockSortKey('name');
    setStockSortOrder('asc');
  };

  // Tab 5 Active Filter Check & Reset
  const isHistoryFilterActive = historySearchTerm !== '' ||
    historyTypeFilter !== 'all' ||
    historySortKey !== 'date' ||
    historySortOrder !== 'desc';

  const resetHistoryFilters = () => {
    setHistorySearchTerm('');
    setHistoryTypeFilter('all');
    setHistorySortKey('date');
    setHistorySortOrder('desc');
  };

  const handleStockIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockInItem) return;

    addStockBatch(selectedStockInItem.id, {
      batchNumber: stockInForm.batchNumber,
      expiryDate: stockInForm.expiryDate,
      quantity: Number(stockInForm.quantity),
      unitCost: Number(stockInForm.unitCost),
      sellingPrice: Number(stockInForm.sellingPrice),
      supplier: stockInForm.supplier,
      locationRack: 'Ph-Main'
    });

    setStockInModalOpen(false);
    alert(`Stock receipt verified: +${stockInForm.quantity} units of ${selectedStockInItem.name} logged into pharmacy.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">Pharmacy & Drug Dispensing Suite</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {currentUser.name} ({currentUser.role})
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Doctor Encounter Fulfillment &bull; Direct (OPD) & Indirect (Ward) Cart Allocation &bull; Batch Inventory Depletion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenInventory}
            title="Open View-Only Central Stock Matrix"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Central Stock Matrix</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-amber-400 text-slate-950 font-bold rounded">View-Only</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 flex flex-wrap items-center gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'queue' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Doctor Encounters & Prescriptions</span>
          {pendingPrescriptions.length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full font-bold">
              {pendingPrescriptions.length} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('direct_carts')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'direct_carts' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Direct OPD Carts</span>
          {pendingDirectCarts.length > 0 && (
            <span className="px-1.5 py-0.2 bg-sky-100 text-sky-800 text-[10px] rounded-full font-bold">
              {pendingDirectCarts.length} Active
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('indirect_carts')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'indirect_carts' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Syringe className="w-3.5 h-3.5" />
          <span>Indirect Carts (Injection Room)</span>
          {pendingIndirectCarts.length > 0 && (
            <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[10px] rounded-full font-bold">
              {pendingIndirectCarts.length} Injection Room
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'stock' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Dispensary Stock ({pharmacyStock.length} SKUs)</span>
        </button>

        <button
          onClick={() => setActiveTab('dispensed_history')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'dispensed_history' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Dispensed Archive ({completedPrescriptions.length + baseDirectCarts.filter(c => c.status === 'dispensed').length})</span>
        </button>
      </div>

      {/* Tab 1: Live Doctor Encounters & Prescriptions Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-5">
          {/* Header Banner */}
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-emerald-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Doctor Encounters & Prescriptions Queue
              </div>
              <p className="text-emerald-800 text-[11px] mt-0.5">
                Clinical workplans saved during doctor consultations are transferred here in real-time. The most recently saved prescription is automatically prioritized at the top of the queue for immediate cart population and dispensing.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-emerald-900 font-mono bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-200 text-xs">
                {pendingPrescriptions.length} Pending &bull; {sortedPrescriptions.length} Total Encounters
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* FEATURED: MOST RECENTLY SAVED DOCTOR PRESCRIPTION SPOTLIGHT CARD */}
          {/* ========================================================================= */}
          {mostRecentPrescription && (() => {
            const rx = mostRecentPrescription;
            const patient = currentClinicPatients.find(p => p.id === rx.patientId);
            const isIPD = patient?.patientType === 'IPD' || !!patient?.ward;
            const linkedEnc = getLinkedEncounter(rx);
            const isExpanded = expandedEncounterRxId === rx.id;
            const effectiveTime = rx.updatedAt || rx.createdAt;
            const isUpdated = Boolean(rx.updatedAt);

            return (
              <div className="bg-gradient-to-br from-emerald-50/90 via-white to-sky-50/60 rounded-2xl border-2 border-emerald-400 p-5 shadow-sm space-y-4">
                {/* Top Badge & Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-600 text-white flex items-center gap-1.5 shadow-xs animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      MOST RECENT SAVED PRESCRIPTION
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-xs bg-white px-2 py-0.5 rounded border border-emerald-200">
                      {rx.id}
                    </span>
                    {rx.encounterId && (
                      <span className="font-mono text-slate-600 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        Encounter: {rx.encounterId}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 uppercase border border-amber-300">
                      {rx.overallStatus.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isIPD ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-sky-100 text-sky-800 border border-sky-200'
                    }`}>
                      {isIPD ? `IPD (${patient?.ward || 'Ward'} - ${patient?.bedNumber || 'Bed'})` : 'OPD Outpatient'}
                    </span>
                  </div>

                  <div className="text-right text-[11px] text-emerald-950 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {isUpdated ? 'Last Modified: ' : 'Prescribed: '}
                      <strong>{new Date(effectiveTime).toLocaleDateString()} at {new Date(effectiveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                    </span>
                  </div>
                </div>

                {/* Patient & Doctor Core Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Patient Information</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">{rx.patientName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">MRN: {rx.patientMrn}</div>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Prescribing Clinician</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">Dr. {rx.doctorName}</div>
                    <div className="text-[11px] text-slate-500">{activeClinic.name}</div>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-emerald-200 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Working Diagnosis</span>
                    <div className="font-bold text-emerald-950 text-sm mt-0.5">{rx.diagnosis || 'Clinical Consultation'}</div>
                    {linkedEnc?.chiefComplaint && (
                      <div className="text-[11px] text-slate-600 truncate mt-0.5" title={linkedEnc.chiefComplaint}>
                        Complaint: {linkedEnc.chiefComplaint}
                      </div>
                    )}
                  </div>
                </div>

                {/* Doctor's Transferred Clinical Workplan / Instructions */}
                {rx.clinicalNotes && (
                  <div className="p-3.5 bg-indigo-50/90 rounded-xl border border-indigo-200 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase text-indigo-900 tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        Transferred Doctor Clinical Workplan & Strategy:
                      </span>
                      {isUpdated && (
                        <span className="text-[9px] text-amber-900 font-semibold bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                          Updated Workplan
                        </span>
                      )}
                    </div>
                    <div className="text-indigo-950 text-xs font-semibold leading-relaxed bg-white/95 p-3.5 rounded-lg border border-indigo-100 shadow-2xs whitespace-pre-wrap break-words font-sans">
                      {rx.clinicalNotes}
                    </div>
                  </div>
                )}

                {/* Existing Drug Lines if added */}
                {rx.items && rx.items.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      Drug Lines Configured ({rx.items.length}):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {rx.items.map((item, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border ${
                            item.status === 'dispensed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-50 text-slate-800 border-slate-200'
                          }`}
                        >
                          <Pill className="w-3 h-3 text-slate-500" />
                          {item.medicationName} ({item.dosage}) &bull; Qty: {item.quantityToDispense}
                          {item.status === 'dispensed' && <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-0.5" />}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collapsible Linked Encounter Clinical Vitals & Exam Summary */}
                {linkedEnc && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setExpandedEncounterRxId(isExpanded ? null : rx.id)}
                      className="text-[11px] text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Activity className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isExpanded ? 'Hide Doctor Encounter Vitals & Examination' : 'View Doctor Encounter Vitals & Physical Exam Summary'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 p-3 bg-white rounded-xl border border-emerald-200 space-y-2 text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Blood Pressure</span>
                            <span className="font-semibold text-slate-800">{linkedEnc.vitals?.bloodPressure || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Pulse Rate</span>
                            <span className="font-semibold text-slate-800">{linkedEnc.vitals?.pulseRate ? `${linkedEnc.vitals.pulseRate} bpm` : 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Temperature</span>
                            <span className="font-semibold text-slate-800">{linkedEnc.vitals?.temperature ? `${linkedEnc.vitals.temperature}°C` : 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">SpO2</span>
                            <span className="font-semibold text-slate-800">{linkedEnc.vitals?.spO2 ? `${linkedEnc.vitals.spO2}%` : 'N/A'}</span>
                          </div>
                        </div>

                        {linkedEnc.physicalExamNotes && (
                          <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="font-bold text-slate-900">Physical Exam: </span>
                            {linkedEnc.physicalExamNotes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons for Most Recent Prescription */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-200">
                  <span className="text-[11px] text-slate-500">
                    Ready to populate pharmacy inventory items and dispatch to Direct (OPD) or Indirect (Ward) cart.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintModalData(rx)}
                      className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      Print Rx Slip
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAllocationModal(rx)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-200" />
                      Populate Carts & Allocate &rarr;
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* SEARCH & QUEUE SUB-FILTERS TOOLBAR */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
            {/* Search Input & Quick Status & Admission Pills */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by patient name, MRN, doctor, diagnosis, medication, department, ward, bed..."
                  value={queueSearchTerm}
                  onChange={(e) => setQueueSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                />
                {queueSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setQueueSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 mr-1">
                  <Filter className="w-3 h-3" /> Status:
                </span>
                <button
                  type="button"
                  onClick={() => setQueueStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    queueStatusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All ({sortedPrescriptions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    queueStatusFilter === 'pending'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  Pending ({pendingPrescriptions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueStatusFilter('partially_dispensed')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    queueStatusFilter === 'partially_dispensed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  Partially Dispensed ({basePrescriptions.filter(rx => rx.overallStatus === 'partially_dispensed').length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueStatusFilter('completed')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    queueStatusFilter === 'completed'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  Completed ({completedPrescriptions.length})
                </button>
              </div>
            </div>

            {/* Sub-row: Admission Type Pills + Location Dropdowns & Sorting */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* Admission Type Filter */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setQueuePatientTypeFilter('all')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                      queuePatientTypeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Types
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueuePatientTypeFilter('OPD')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                      queuePatientTypeFilter === 'OPD' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    OPD
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueuePatientTypeFilter('IPD')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                      queuePatientTypeFilter === 'IPD' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    IPD
                  </button>
                </div>

                {/* Department Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600">Dept:</span>
                  <select
                    value={selectedDepartmentFilter}
                    onChange={(e) => {
                      setSelectedDepartmentFilter(e.target.value);
                      setSelectedRoomFilter('all');
                    }}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
                  >
                    <option value="all">All Depts</option>
                    {availableDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Room Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
                  <DoorOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600">Room:</span>
                  <select
                    value={selectedRoomFilter}
                    onChange={(e) => setSelectedRoomFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[120px] truncate"
                  >
                    <option value="all">All Rooms</option>
                    {availableRooms.map(room => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                  </select>
                </div>

                {/* Ward Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
                  <BedDouble className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600">Ward:</span>
                  <select
                    value={selectedWardFilter}
                    onChange={(e) => {
                      setSelectedWardFilter(e.target.value);
                      setSelectedBedFilter('all');
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
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
                  <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600">Bed:</span>
                  <select
                    value={selectedBedFilter}
                    onChange={(e) => setSelectedBedFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[110px] truncate"
                  >
                    <option value="all">All Beds</option>
                    {availableBeds.map(bed => (
                      <option key={bed} value={bed}>Bed {bed}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sorting and Reset Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600">Sort:</span>
                  <select
                    value={queueSortKey}
                    onChange={(e) => setQueueSortKey(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="date">Date & Time</option>
                    <option value="patient">Patient Name</option>
                    <option value="doctor">Prescribing Doctor</option>
                    <option value="mrn">MRN #</option>
                    <option value="diagnosis">Working Diagnosis</option>
                    <option value="items">Medications Count</option>
                    <option value="age">Patient Age</option>
                  </select>
                </div>

                {/* Sort Order Toggle */}
                <button
                  type="button"
                  onClick={() => setQueueSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-md cursor-pointer transition-colors"
                  title={`Sort ${queueSortOrder === 'asc' ? 'Ascending' : 'Descending'} (click to invert)`}
                >
                  {queueSortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                </button>

                {/* Clear Filters Button */}
                {isQueueFilterActive && (
                  <button
                    type="button"
                    onClick={resetQueueFilters}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Results Pill Count */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>
                Showing <strong>{filteredQueuePrescriptions.length}</strong> of <strong>{sortedPrescriptions.length}</strong> prescriptions
              </span>
              {isQueueFilterActive && (
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                  Filters Applied
                </span>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ALL DOCTOR ENCOUNTERS & PRESCRIPTIONS LIST (SORTED NEWEST FIRST) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 gap-4">
            {filteredQueuePrescriptions.map((rx, idx) => {
              const patient = getRxPatient(rx);
              const isIPD = patient?.patientType === 'IPD' || !!patient?.ward;
              const isFirst = idx === 0;
              const linkedEnc = getLinkedEncounter(rx);
              const isExpanded = expandedEncounterRxId === rx.id;
              const effectiveTime = rx.updatedAt || rx.createdAt;
              const isUpdated = Boolean(rx.updatedAt);
              const pDept = patient?.department || (isIPD ? 'Inpatient Ward' : 'General Outpatient (OPD)');
              const pRoom = patient?.doctorRoom || (isIPD ? (patient?.ward || 'Ward') : 'Consultation Room 1');

              return (
                <div
                  key={rx.id}
                  className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all ${
                    isFirst
                      ? 'border-emerald-300 ring-1 ring-emerald-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isFirst && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white uppercase flex items-center gap-1 shadow-2xs">
                          <Sparkles className="w-3 h-3" /> #1 Latest
                        </span>
                      )}
                      <span className="font-mono font-bold text-slate-900 text-sm">{rx.id}</span>
                      {rx.encounterId && (
                        <span className="font-mono text-slate-500 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          Enc: {rx.encounterId}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase border border-amber-200">
                        {rx.overallStatus.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rx.isDischargePrescription
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isIPD 
                          ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                          : 'bg-sky-100 text-sky-800 border border-sky-200'
                      }`}>
                        {rx.isDischargePrescription 
                          ? 'IPD Discharge Take-Home Rx'
                          : isIPD 
                          ? `IPD (${patient?.ward || 'Ward'} - ${patient?.bedNumber || 'Bed'})` 
                          : 'OPD Outpatient'}
                      </span>
                      <span className="text-slate-400 text-xs">
                        &bull; {new Date(effectiveTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        {isUpdated && <span className="ml-1 text-amber-800 font-semibold">(Modified)</span>}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{rx.patientName}</span>
                          <span className="text-slate-500 font-mono">MRN: {rx.patientMrn}</span>
                          {patient?.gender && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {patient.gender}
                              {patient.age != null ? ` • ${formatPatientAge(patient, 'short')}` : ''}
                            </span>
                          )}
                        </div>
                        {/* Patient Location Tag */}
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-600">
                          {isIPD ? (
                            <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
                              <BedDouble className="w-3 h-3 text-purple-600" />
                              {patient?.ward || 'Inpatient Ward'} &bull; Bed {patient?.bedNumber || 'Unassigned'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-semibold">
                              <Building2 className="w-3 h-3 text-sky-600" />
                              {pDept} &bull; {pRoom}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-slate-600">
                        <span className="font-semibold text-slate-700">Doctor: </span>
                        Dr. {rx.doctorName}
                      </div>
                      <div className="text-slate-600 sm:col-span-2">
                        <span className="font-semibold text-slate-700">Working Diagnosis: </span>
                        {rx.diagnosis || 'Clinical Workup'}
                      </div>
                    </div>

                    {/* Transferred Doctor Workplan / Orders Content */}
                    {rx.clinicalNotes && (
                      <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-200 space-y-1">
                        <div className="text-[10px] font-bold uppercase text-indigo-900 tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          Transferred Doctor Clinical Workplan & Strategy:
                        </div>
                        <div className="text-indigo-950 text-xs font-medium leading-relaxed bg-white/90 p-3 rounded-lg border border-indigo-100 whitespace-pre-wrap break-words font-sans">
                          {rx.clinicalNotes}
                        </div>
                      </div>
                    )}

                    {/* Items if already partially populated */}
                    {rx.items && rx.items.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                          Drug Lines ({rx.items.length}):
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {rx.items.map((item, iIdx) => (
                            <span
                              key={iIdx}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border ${
                                item.status === 'dispensed'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-50 text-slate-800 border-slate-200'
                              }`}
                            >
                              <Pill className="w-3 h-3 text-slate-500" />
                              {item.medicationName} ({item.dosage}) &bull; Qty: {item.quantityToDispense}
                              {item.status === 'dispensed' && <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-0.5" />}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expandable Doctor Encounter Vitals */}
                    {linkedEnc && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setExpandedEncounterRxId(isExpanded ? null : rx.id)}
                          className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Activity className="w-3 h-3 text-emerald-600" />
                          <span>{isExpanded ? 'Hide Doctor Vitals' : 'Show Doctor Vitals & Findings'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                            <div>
                              <span className="text-slate-400 uppercase text-[9px] block">BP</span>
                              <span className="font-semibold text-slate-800">{linkedEnc.vitals?.bloodPressure || '-'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 uppercase text-[9px] block">Pulse</span>
                              <span className="font-semibold text-slate-800">{linkedEnc.vitals?.pulseRate ? `${linkedEnc.vitals.pulseRate} bpm` : '-'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 uppercase text-[9px] block">Temp</span>
                              <span className="font-semibold text-slate-800">{linkedEnc.vitals?.temperature ? `${linkedEnc.vitals.temperature}°C` : '-'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 uppercase text-[9px] block">SpO2</span>
                              <span className="font-semibold text-slate-800">{linkedEnc.vitals?.spO2 ? `${linkedEnc.vitals.spO2}%` : '-'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-2 shrink-0 md:w-56">
                    <button
                      onClick={() => handleOpenAllocationModal(rx)}
                      className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-200" />
                      Populate Carts & Allocate &rarr;
                    </button>

                    <button
                      onClick={() => setPrintModalData(rx)}
                      className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Rx Slip
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredQueuePrescriptions.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="font-bold text-slate-700 text-sm">No Prescriptions Found</div>
                <p>
                  {isQueueFilterActive
                    ? 'No doctor prescriptions match your current search or filter criteria.'
                    : `All clinical encounter workplans and orders for ${activeClinic.name} have been processed into carts.`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Direct OPD Pharmacy Carts (Take-Home Prescriptions) */}
      {activeTab === 'direct_carts' && (
        <div className="space-y-4">
          <div className="bg-sky-50/50 border border-sky-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-sky-950 flex items-center gap-2">
                <Package className="w-4 h-4 text-sky-600" />
                Direct OPD Take-Home Pharmacy Carts
              </div>
              <p className="text-sky-800 text-[11px] mt-0.5">
                Outpatient medications dispensed at the main pharmacy counter. Requires Accounts payment clearance prior to final dispensing.
              </p>
            </div>
            <div className="font-mono text-sky-900 font-bold bg-sky-100 px-2.5 py-1 rounded-md border border-sky-200">
              {baseDirectCarts.length} Total Direct Carts
            </div>
          </div>

          {/* Filter & Sorting Toolbar for Direct OPD Carts */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search carts by cart #, patient name, MRN, pharmacist, items, notes..."
                  value={directSearchTerm}
                  onChange={(e) => setDirectSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-sky-500 bg-slate-50/50"
                />
                {directSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setDirectSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 mr-1">
                  <Filter className="w-3 h-3" /> Status:
                </span>
                <button
                  type="button"
                  onClick={() => setDirectStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    directStatusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All ({baseDirectCarts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDirectStatusFilter('pending_accounts')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    directStatusFilter === 'pending_accounts'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  Awaiting Accounts ({baseDirectCarts.filter(c => c.status === 'pending_accounts' || c.accountsStatus === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setDirectStatusFilter('approved')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    directStatusFilter === 'approved'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  Cleared ({baseDirectCarts.filter(c => (c.accountsStatus === 'approved' || c.status === 'approved_by_accounts') && c.status !== 'dispensed').length})
                </button>
                <button
                  type="button"
                  onClick={() => setDirectStatusFilter('dispensed')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    directStatusFilter === 'dispensed'
                      ? 'bg-sky-600 text-white'
                      : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  Dispensed ({baseDirectCarts.filter(c => c.status === 'dispensed').length})
                </button>
                <button
                  type="button"
                  onClick={() => setDirectStatusFilter('rejected')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    directStatusFilter === 'rejected'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  Rejected ({baseDirectCarts.filter(c => c.accountsStatus === 'rejected' || c.status === 'rejected_by_accounts').length})
                </button>
              </div>
            </div>

            {/* Sub-row: Insurance Tariff Dropdown & Sort */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* Insurance Filter */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600">Tariff:</span>
                  <select
                    value={directInsuranceFilter}
                    onChange={(e) => setDirectInsuranceFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[160px] truncate"
                  >
                    <option value="all">All Tariffs / Schemes</option>
                    {availableInsurances.map(ins => (
                      <option key={ins} value={ins}>{ins}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sort & Order Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600">Sort:</span>
                  <select
                    value={directSortKey}
                    onChange={(e) => setDirectSortKey(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="date">Date Created</option>
                    <option value="patient">Patient Name</option>
                    <option value="cartNumber">Cart Number</option>
                    <option value="cost">Total Value ($)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setDirectSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-md cursor-pointer transition-colors"
                  title={`Sort ${directSortOrder === 'asc' ? 'Ascending' : 'Descending'} (click to invert)`}
                >
                  {directSortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                </button>

                {isDirectFilterActive && (
                  <button
                    type="button"
                    onClick={resetDirectFilters}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Results Counter */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>
                Showing <strong>{filteredDirectCarts.length}</strong> of <strong>{baseDirectCarts.length}</strong> OPD carts
              </span>
              {isDirectFilterActive && (
                <span className="text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[10px]">
                  Filters Applied
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredDirectCarts.map(cart => {
              const isAccountsApproved = cart.accountsStatus === 'approved' || cart.status === 'approved_by_accounts';
              const isDispensed = cart.status === 'dispensed';
              const isPendingAccounts = cart.status === 'pending_accounts' || cart.accountsStatus === 'pending';
              const isRejectedAccounts = cart.accountsStatus === 'rejected' || cart.status === 'rejected_by_accounts';
              const totalVal = cart.totalSumCost || cart.totalAmount || cart.items.reduce((s, i) => s + (i.totalPrice || i.quantity * i.unitPrice), 0);

              return (
                <div
                  key={cart.id}
                  className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all ${
                    isPendingAccounts ? 'border-amber-200 bg-amber-50/20' : isAccountsApproved && !isDispensed ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">{cart.cartNumber || cart.id}</span>
                      
                      {/* Accounts Gatekeeper Status */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${
                        isAccountsApproved
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isPendingAccounts
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : isRejectedAccounts
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-purple-100 text-purple-800 border-purple-300'
                      }`}>
                        {isAccountsApproved ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {isAccountsApproved ? 'Accounts Cleared' : isPendingAccounts ? 'Awaiting Accounts Clearance' : isRejectedAccounts ? 'Rejected by Accounts' : cart.status}
                      </span>

                      {isDispensed && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 uppercase border border-slate-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Dispensed
                        </span>
                      )}

                      <span className="text-slate-400 text-xs">&bull; {new Date(cart.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>

                      {cart.insurancePolicyName && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-teal-600" />
                          Tariff: {cart.insurancePolicyName}
                        </span>
                      )}
                    </div>

                    <div className="text-xs">
                      <span className="font-bold text-slate-900 text-sm">{cart.patientName}</span>
                      <span className="text-slate-500 ml-2 font-mono">MRN: {cart.patientMrn}</span>
                      {cart.createdBy && <span className="text-slate-500 ml-2">&bull; Pharmacist: {cart.createdBy}</span>}
                    </div>

                    {/* Accountant Instructions & Clearance Note */}
                    {cart.accountsNotes && (
                      <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                        isAccountsApproved
                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                          : isRejectedAccounts
                          ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                          : 'bg-amber-50/90 border-amber-300 text-amber-950'
                      }`}>
                        <MessageSquare className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isAccountsApproved ? 'text-emerald-700' : isRejectedAccounts ? 'text-rose-700' : 'text-amber-700'
                        }`} />
                        <div className="flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                              {isAccountsApproved ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                  Accountant Clearance Instructions:
                                </>
                              ) : isRejectedAccounts ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                                  Accountant Rejection Reason:
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                                  Accounts Clearance Notes:
                                </>
                              )}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {cart.accountsNotesHistory && cart.accountsNotesHistory.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedHistoryCart(cart)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 cursor-pointer shadow-2xs"
                                  title="View audit timeline of instruction edits"
                                >
                                  <History className="w-3 h-3" />
                                  History ({cart.accountsNotesHistory.length})
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap bg-white/80 p-2 rounded border border-slate-200/60">
                            {cart.accountsNotes}
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[10px] text-slate-500">
                            {(cart.accountsApprovedBy || cart.accountsReviewedBy) && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                Authorized by: <strong>{cart.accountsApprovedBy || cart.accountsReviewedBy}</strong>
                                {cart.accountsApprovedAt || cart.accountsReviewedAt ? ` • ${new Date(cart.accountsApprovedAt || cart.accountsReviewedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                              </span>
                            )}
                            {cart.accountsNotesEditedBy && cart.accountsNotesEditedAt && (
                              <span className="flex items-center gap-1 text-purple-700 font-medium">
                                <Clock className="w-3 h-3 text-purple-500" />
                                Last edited by <strong>{cart.accountsNotesEditedBy}</strong> ({new Date(cart.accountsNotesEditedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cart Items Table */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Cart Medications ({cart.items.length}):</span>
                        <span className="font-mono text-slate-800 text-xs">Total: ${totalVal.toFixed(2)}</span>
                      </div>
                      <div className="space-y-1.5">
                        {cart.items.map((item, idx) => {
                          const isTransferred = item.status === 'transferred_to_indirect';
                          return (
                            <div
                              key={item.id || idx}
                              className={`flex items-center justify-between text-xs p-2 rounded border transition-colors ${
                                isTransferred
                                  ? 'bg-purple-50/50 border-purple-200 text-purple-950'
                                  : 'bg-white border-slate-200/80 text-slate-800'
                              }`}
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-900">{item.itemName}</span>
                                <span className="text-slate-500">({item.dosage || item.unit})</span>
                                {item.route && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                                    {item.route}
                                  </span>
                                )}
                                {isTransferred && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                                    <Syringe className="w-3 h-3 text-purple-600" />
                                    Transferred to Injection Room
                                  </span>
                                )}
                                {item.instructions && <span className="text-slate-500 text-[11px]">&bull; {item.instructions}</span>}
                                {item.isInsurancePrice && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                    {cart.insurancePolicyName || item.insurancePolicyName} Rate
                                  </span>
                                )}
                              </div>
                              <div className="font-mono font-bold text-slate-900 shrink-0 ml-2 text-right">
                                <div>Qty: {item.quantity} (${(item.totalPrice || item.quantity * item.unitPrice).toFixed(2)})</div>
                                <div className="text-[10px] text-slate-400 font-normal">@${item.unitPrice.toFixed(2)}/{item.unit}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-2 shrink-0 md:w-56">
                    {!isDispensed && isAccountsApproved && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedCartForTransfer(cart);
                            setTransferModalOpen(true);
                          }}
                          className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Syringe className="w-3.5 h-3.5" />
                          Transfer to Injection Room
                        </button>

                        <button
                          onClick={() => {
                            const success = dispenseDirectCart(cart.id);
                            if (success) {
                              alert(`Direct Cart ${cart.cartNumber || cart.id} dispensed successfully. Stock deducted and ledger updated.`);
                            }
                          }}
                          className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Dispense Take-Home Meds
                        </button>
                      </>
                    )}

                    {!isDispensed && isPendingAccounts && (
                      <div className="px-3 py-2 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Awaiting Accounts Clearance
                      </div>
                    )}

                    {isDispensed && (
                      <div className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5 border border-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Dispensed & Handed to Patient
                      </div>
                    )}

                    <button
                      onClick={() => setPrintModalData({
                        id: cart.cartNumber || cart.id,
                        patientName: cart.patientName,
                        patientMrn: cart.patientMrn,
                        doctorName: cart.createdBy || 'Pharmacy Department',
                        createdAt: cart.createdAt,
                        items: cart.items.map(i => ({
                          medicationName: i.itemName,
                          dosage: i.dosage || i.unit,
                          frequency: 'Direct Counter Dispense',
                          duration: 'Prescribed Course',
                          route: i.route || 'Oral',
                          quantityToDispense: i.quantity,
                          instructions: i.instructions || 'Take as directed'
                        }))
                      })}
                      className="w-full px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Cart Slip
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredDirectCarts.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs space-y-2">
                <Package className="w-8 h-8 mx-auto text-slate-300" />
                <div className="font-bold text-slate-700 text-sm">No Direct Pharmacy Carts Found</div>
                <p>
                  {isDirectFilterActive
                    ? 'No direct OPD carts match your current search and filter settings.'
                    : 'Prescriptions allocated to Direct OPD Cart from the Doctor Encounters queue will appear here.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Indirect Pharmacy Carts (Injection & Treatment Room) */}
      {activeTab === 'indirect_carts' && (
        <div className="space-y-4">
          <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-purple-950 flex items-center gap-2">
                <Syringe className="w-4 h-4 text-purple-600" />
                Indirect Carts for Injection & Treatment Room (Nursing Administration)
              </div>
              <p className="text-purple-800 text-[11px] mt-0.5">
                Prescribed injectables, IV infusions, wound care items, and repeat clinic doses populated by pharmacy for nurses to dispense and administer in the Injection / Treatment Room.
              </p>
            </div>
            <div className="font-mono text-purple-900 font-bold bg-purple-100 px-2.5 py-1 rounded-md border border-purple-200">
              {baseIndirectCarts.length} Total Injection Room Carts
            </div>
          </div>

          {/* Filter & Sorting Toolbar for Indirect Carts */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search injection carts by cart #, patient name, MRN, parent cart #, items, notes..."
                  value={indirectSearchTerm}
                  onChange={(e) => setIndirectSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-purple-500 bg-slate-50/50"
                />
                {indirectSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setIndirectSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 mr-1">
                  <Filter className="w-3 h-3" /> Status:
                </span>
                <button
                  type="button"
                  onClick={() => setIndirectStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    indirectStatusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All ({baseIndirectCarts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIndirectStatusFilter('pending_accounts')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    indirectStatusFilter === 'pending_accounts'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  Awaiting Accounts ({baseIndirectCarts.filter(c => c.status === 'pending_accounts' || c.accountsStatus === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setIndirectStatusFilter('ready_for_nursing')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    indirectStatusFilter === 'ready_for_nursing'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  Ready for Nursing ({baseIndirectCarts.filter(c => c.status === 'sent_to_nursing' || c.status === 'ready_for_nursing' || (c.accountsStatus === 'approved' && c.status !== 'dispensed' && c.status !== 'administered')).length})
                </button>
                <button
                  type="button"
                  onClick={() => setIndirectStatusFilter('administered')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    indirectStatusFilter === 'administered'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  Administered / Dispensed ({baseIndirectCarts.filter(c => c.status === 'dispensed' || c.status === 'administered').length})
                </button>
              </div>
            </div>

            {/* Sub-row: Sort & Order Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600">Sort:</span>
                  <select
                    value={indirectSortKey}
                    onChange={(e) => setIndirectSortKey(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="date">Date Created</option>
                    <option value="patient">Patient Name</option>
                    <option value="cartNumber">Cart Number</option>
                    <option value="cost">Total Amount ($)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setIndirectSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 rounded-md cursor-pointer transition-colors"
                  title={`Sort ${indirectSortOrder === 'asc' ? 'Ascending' : 'Descending'} (click to invert)`}
                >
                  {indirectSortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                </button>

                {isIndirectFilterActive && (
                  <button
                    type="button"
                    onClick={resetIndirectFilters}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Results Counter */}
              <div className="text-[11px] text-slate-500">
                Showing <strong>{filteredIndirectCarts.length}</strong> of <strong>{baseIndirectCarts.length}</strong> injection carts
                {isIndirectFilterActive && (
                  <span className="ml-2 text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[10px]">
                    Filters Applied
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredIndirectCarts.map(cart => {
              const isAccountsApproved = cart.accountsStatus === 'approved' || cart.status === 'approved_by_accounts';
              const isSentToNursing = cart.status === 'sent_to_nursing' || cart.status === 'ready_for_nursing';
              const isDispensed = cart.status === 'dispensed' || cart.status === 'administered';
              const totalVal = cart.totalSumCost || cart.totalAmount || cart.items.reduce((s, i) => s + (i.totalPrice || i.quantity * i.unitPrice), 0);

              return (
                <div
                  key={cart.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">{cart.cartNumber || cart.id}</span>
                      
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 uppercase border border-purple-200 flex items-center gap-1">
                        <Syringe className="w-3 h-3 text-purple-600" />
                        Injection & Treatment Room
                      </span>

                      {/* Status */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        isAccountsApproved || isSentToNursing
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {cart.status.replace('_', ' ')}
                      </span>

                      <span className="text-slate-400 text-xs">&bull; {new Date(cart.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>

                      {cart.insurancePolicyName && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-teal-600" />
                          Tariff: {cart.insurancePolicyName}
                        </span>
                      )}
                    </div>

                    <div className="text-xs">
                      <span className="font-bold text-slate-900 text-sm">{cart.patientName}</span>
                      <span className="text-slate-500 ml-2 font-mono">MRN: {cart.patientMrn}</span>
                      {cart.parentCartNumber && (
                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                          Transferred from Direct Cart #{cart.parentCartNumber}
                        </span>
                      )}
                      {cart.createdBy && <span className="text-slate-500 ml-2">&bull; Pharmacist: {cart.createdBy}</span>}
                    </div>

                    {/* Accountant Instructions & Clearance Note */}
                    {cart.accountsNotes && (
                      <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/80 text-purple-950 text-xs flex items-start gap-2.5">
                        <MessageSquare className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                              Accountant / Authorization Notes:
                            </span>
                            <div className="flex items-center gap-1.5">
                              {cart.accountsNotesHistory && cart.accountsNotesHistory.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedHistoryCart(cart)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 cursor-pointer shadow-2xs"
                                  title="View audit timeline of instruction edits"
                                >
                                  <History className="w-3 h-3" />
                                  History ({cart.accountsNotesHistory.length})
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap bg-white/80 p-2 rounded border border-purple-100">
                            {cart.accountsNotes}
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[10px] text-slate-500">
                            {(cart.accountsApprovedBy || cart.accountsReviewedBy) && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                Authorized by: <strong>{cart.accountsApprovedBy || cart.accountsReviewedBy}</strong>
                                {cart.accountsApprovedAt || cart.accountsReviewedAt ? ` • ${new Date(cart.accountsApprovedAt || cart.accountsReviewedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                              </span>
                            )}
                            {cart.accountsNotesEditedBy && cart.accountsNotesEditedAt && (
                              <span className="flex items-center gap-1 text-purple-700 font-medium">
                                <Clock className="w-3 h-3 text-purple-500" />
                                Last edited by <strong>{cart.accountsNotesEditedBy}</strong> ({new Date(cart.accountsNotesEditedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Items */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Injection Room Medication Items ({cart.items.length}):</span>
                        <span className="font-mono text-slate-800 text-xs">Total: ${totalVal.toFixed(2)}</span>
                      </div>
                      <div className="space-y-1.5">
                        {cart.items.map((item, idx) => (
                          <div key={item.id || idx} className="flex items-center justify-between text-xs text-slate-800 bg-white p-2 rounded border border-slate-200/80">
                            <div>
                              <span className="font-bold text-slate-900">{item.itemName}</span>
                              <span className="text-slate-500 ml-1">({item.dosage || item.unit} - {item.route || 'IV/IM'}) &bull; {item.instructions || 'Administer in Injection Room'}</span>
                              {item.isInsurancePrice && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                  {cart.insurancePolicyName || item.insurancePolicyName} Rate
                                </span>
                              )}
                            </div>
                            <div className="font-mono font-bold text-purple-900 text-right">
                              <div>Qty: {item.quantity} (${(item.totalPrice || item.quantity * item.unitPrice).toFixed(2)})</div>
                              <div className="text-[10px] text-slate-400 font-normal">@${item.unitPrice.toFixed(2)}/{item.unit}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-2 shrink-0 md:w-52">
                    <button
                      onClick={() => {
                        const success = sendIndirectCartToNursing(cart.id);
                        if (success) {
                          alert(`Cart ${cart.cartNumber || cart.id} transferred to Nursing Injection / Treatment Room for administration.`);
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Syringe className="w-4 h-4" />
                      Transfer to Injection Room
                    </button>

                    <button
                      onClick={() => setPrintModalData({
                        id: cart.cartNumber || cart.id,
                        patientName: cart.patientName,
                        patientMrn: cart.patientMrn,
                        doctorName: `Nursing: Injection & Treatment Room`,
                        createdAt: cart.createdAt,
                        items: cart.items.map(i => ({
                          medicationName: i.itemName,
                          dosage: i.dosage || i.unit,
                          frequency: 'Injection Room Administration',
                          duration: 'Prescribed Regimen',
                          route: i.route || 'IV/IM',
                          quantityToDispense: i.quantity,
                          instructions: i.instructions || 'Nursing Administration'
                        }))
                      })}
                      className="w-full px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Injection Slip
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredIndirectCarts.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs space-y-2">
                <Syringe className="w-8 h-8 mx-auto text-slate-300" />
                <div className="font-bold text-slate-700 text-sm">No Indirect Injection Room Carts Found</div>
                <p>
                  {isIndirectFilterActive
                    ? 'No injection carts match your current search and filter criteria.'
                    : 'Prescribed injectables and procedural items allocated from doctor encounter workplans will appear here.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Pharmacy Stock & Batches */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {activeClinic.name} Dispensary Stock Inventory
              </h3>
              <p className="text-slate-500 text-[11px]">
                Monitors active stock balances, lot/batch identifiers, and expiry windows.
              </p>
            </div>
            <button
              onClick={onOpenInventory}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Drug SKU
            </button>
          </div>

          {/* Filter & Sort Toolbar for Stock */}
          <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-3.5 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search medication name, SKU code, dosage form..."
                  value={stockSearchTerm}
                  onChange={(e) => setStockSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 bg-white"
                />
                {stockSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setStockSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 mr-1">
                  <Filter className="w-3 h-3" /> Status:
                </span>
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    stockStatusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  All ({pharmacyStock.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('low')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    stockStatusFilter === 'low'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  Low Stock ({pharmacyStock.filter(i => i.totalQuantity <= i.reorderLevel).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('in_stock')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    stockStatusFilter === 'in_stock'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  In Stock ({pharmacyStock.filter(i => i.totalQuantity > i.reorderLevel).length})
                </button>
              </div>
            </div>

            {/* Sub-row: Sort & Order Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-2.5 py-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600">Sort:</span>
                  <select
                    value={stockSortKey}
                    onChange={(e) => setStockSortKey(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="name">Medication Name</option>
                    <option value="code">SKU Code</option>
                    <option value="quantity">Stock On Hand</option>
                    <option value="price">Retail Rate ($)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setStockSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-md cursor-pointer transition-colors"
                  title={`Sort ${stockSortOrder === 'asc' ? 'Ascending' : 'Descending'} (click to invert)`}
                >
                  {stockSortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                </button>

                {isStockFilterActive && (
                  <button
                    type="button"
                    onClick={resetStockFilters}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Results Counter */}
              <div className="text-[11px] text-slate-500">
                Showing <strong>{filteredStock.length}</strong> of <strong>{pharmacyStock.length}</strong> SKUs
                {isStockFilterActive && (
                  <span className="ml-2 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                    Filters Applied
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Medication Name</th>
                  <th className="py-2.5 px-3">SKU Code</th>
                  <th className="py-2.5 px-3 text-right">Stock On Hand</th>
                  <th className="py-2.5 px-3 text-right">Retail Rate</th>
                  <th className="py-2.5 px-3">Active Batches & Shelf Expiry</th>
                  <th className="py-2.5 px-3 text-right">Stock-In Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStock.map(item => {
                  const isLow = item.totalQuantity <= item.reorderLevel;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {item.name}
                        {item.dosageForm && <div className="text-[10px] text-slate-400 font-normal">{item.dosageForm}</div>}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{item.code}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {item.totalQuantity} <span className="font-normal text-slate-500">{item.unit}</span>
                        {isLow && (
                          <div className="text-[10px] text-rose-600 font-semibold">Low (&le;{item.reorderLevel})</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">${item.sellingPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          {item.batches.map(b => (
                            <div key={b.id} className="flex items-center gap-2 text-[10px] text-slate-600">
                              <span className="font-mono font-medium">{b.batchNumber}</span>
                              <span className="text-slate-400">&bull; Exp: {b.expiryDate}</span>
                              <span className="font-bold text-slate-700">({b.quantity} {item.unit})</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedStockInItem(item);
                            setStockInModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-[11px] cursor-pointer"
                        >
                          + Receive Batch
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredStock.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No medication SKUs match your search or filter criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Dispensed History */}
      {activeTab === 'dispensed_history' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Dispensed Prescription & Pharmacy Cart Fulfillment Archive
              </h3>
              <p className="text-slate-500 text-[11px]">
                Historical record of completed outpatient prescriptions and dispensed pharmacy carts.
              </p>
            </div>
            <div className="font-mono text-slate-700 font-bold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {completedPrescriptions.length + baseDirectCarts.filter(c => c.status === 'dispensed').length} Total Fulfilled
            </div>
          </div>

          {/* Filter & Sort Toolbar for Archive */}
          <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-3.5 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search archive by patient name, MRN, ID, doctor, medication..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-500 bg-white"
                />
                {historySearchTerm && (
                  <button
                    type="button"
                    onClick={() => setHistorySearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Type Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 mr-1">
                  <Filter className="w-3 h-3" /> Type:
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    historyTypeFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  All ({completedPrescriptions.length + baseDirectCarts.filter(c => c.status === 'dispensed').length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('prescriptions')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    historyTypeFilter === 'prescriptions'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  Prescriptions ({completedPrescriptions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('direct_carts')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    historyTypeFilter === 'direct_carts'
                      ? 'bg-sky-600 text-white'
                      : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  Direct OPD Carts ({baseDirectCarts.filter(c => c.status === 'dispensed').length})
                </button>
              </div>
            </div>

            {/* Sub-row: Sort & Order Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-2.5 py-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600">Sort:</span>
                  <select
                    value={historySortKey}
                    onChange={(e) => setHistorySortKey(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="date">Date Completed</option>
                    <option value="patient">Patient Name</option>
                    <option value="id">Order / Cart ID</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setHistorySortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-md cursor-pointer transition-colors"
                  title={`Sort ${historySortOrder === 'asc' ? 'Ascending' : 'Descending'} (click to invert)`}
                >
                  {historySortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                </button>

                {isHistoryFilterActive && (
                  <button
                    type="button"
                    onClick={resetHistoryFilters}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Results Counter */}
              <div className="text-[11px] text-slate-500">
                Showing <strong>{filteredHistoryPrescriptions.length + filteredHistoryDirectCarts.length}</strong> items in archive
                {isHistoryFilterActive && (
                  <span className="ml-2 text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-[10px]">
                    Filters Applied
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filteredHistoryPrescriptions.map(rx => (
              <div key={rx.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between hover:bg-slate-100/60 transition-colors">
                <div>
                  <div className="font-bold text-slate-900 font-mono">{rx.id} &bull; {rx.patientName} ({rx.patientMrn})</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Prescribed by Dr. {rx.doctorName} &bull; Items: {rx.items.map(i => `${i.medicationName} (${i.quantityToDispense})`).join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                    Cart Generated & Fulfilled
                  </span>
                  <button
                    onClick={() => setPrintModalData(rx)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {filteredHistoryDirectCarts.map(cart => (
              <div key={cart.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between hover:bg-slate-100/60 transition-colors">
                <div>
                  <div className="font-bold text-slate-900 font-mono">{cart.cartNumber || cart.id} &bull; {cart.patientName} ({cart.patientMrn})</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Direct OPD Cart &bull; {cart.items.map(i => `${i.itemName} (${i.quantity})`).join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                    Dispensed to Patient
                  </span>
                  <button
                    onClick={() => setPrintModalData({
                      id: cart.cartNumber || cart.id,
                      patientName: cart.patientName,
                      patientMrn: cart.patientMrn,
                      doctorName: cart.createdBy || 'Pharmacy Department',
                      createdAt: cart.createdAt,
                      items: cart.items.map(i => ({
                        medicationName: i.itemName,
                        dosage: i.dosage || i.unit,
                        frequency: 'Dispensed',
                        duration: '',
                        route: i.route || 'Oral',
                        quantityToDispense: i.quantity,
                        instructions: i.instructions || ''
                      }))
                    })}
                    className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {filteredHistoryPrescriptions.length === 0 && filteredHistoryDirectCarts.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No dispensed records found matching your archive filter criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cart Allocation & Population Modal */}
      {allocationModalOpen && selectedRxForAllocation && (
        <CartAllocationModal
          isOpen={allocationModalOpen}
          onClose={() => {
            setAllocationModalOpen(false);
            setSelectedRxForAllocation(null);
          }}
          prescription={selectedRxForAllocation}
          onSuccess={() => {
            setActiveTab('direct_carts');
          }}
        />
      )}

      {/* Stock In Batch Modal */}
      {stockInModalOpen && selectedStockInItem && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setStockInModalOpen(false);
            }
          }}
        >
          <form 
            onSubmit={handleStockIn} 
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-xs cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Stock Receipt: {selectedStockInItem.name}</h3>
                <p className="text-slate-300 text-[11px]">{selectedStockInItem.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setStockInModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Batch / Lot Number</label>
                <input
                  type="text"
                  value={stockInForm.batchNumber}
                  onChange={(e) => setStockInForm({ ...stockInForm, batchNumber: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Quantity Received</label>
                <input
                  type="number"
                  min="1"
                  value={stockInForm.quantity}
                  onChange={(e) => setStockInForm({ ...stockInForm, quantity: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Batch Expiration Date</label>
                <input
                  type="date"
                  value={stockInForm.expiryDate}
                  onChange={(e) => setStockInForm({ ...stockInForm, expiryDate: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Supplier / Distributor</label>
                <input
                  type="text"
                  value={stockInForm.supplier}
                  onChange={(e) => setStockInForm({ ...stockInForm, supplier: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStockInModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded cursor-pointer"
              >
                Receive Batch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Print Slip Modal */}
      {printModalData && (
        <PrintReceiptModal
          isOpen={true}
          onClose={() => setPrintModalData(null)}
          type="prescription"
          data={printModalData}
        />
      )}

      {/* Transfer to Injection Room Modal */}
      {transferModalOpen && selectedCartForTransfer && (
        <TransferToInjectionRoomModal
          isOpen={transferModalOpen}
          onClose={() => {
            setTransferModalOpen(false);
            setSelectedCartForTransfer(null);
          }}
          cart={selectedCartForTransfer}
        />
      )}



      {/* Revision History Modal */}
      {selectedHistoryCart && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedHistoryCart(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl max-w-xl w-full p-5 border border-slate-200 shadow-xl space-y-4 text-xs max-h-[90vh] flex flex-col cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Instruction Audit Trail & Revision History
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cart #{selectedHistoryCart.cartNumber} &bull; {selectedHistoryCart.patientName} (MRN: {selectedHistoryCart.patientMrn})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryCart(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Active Instruction */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider">
                  Active Instruction
                </span>
                <span className="text-[10px] text-emerald-800 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedHistoryCart.accountsNotesEditedAt
                    ? new Date(selectedHistoryCart.accountsNotesEditedAt).toLocaleString()
                    : selectedHistoryCart.accountsApprovedAt
                    ? new Date(selectedHistoryCart.accountsApprovedAt).toLocaleString()
                    : 'Current'}
                </span>
              </div>
              <p className="text-xs text-emerald-950 font-medium leading-relaxed bg-white p-2.5 rounded border border-emerald-100 whitespace-pre-wrap">
                {selectedHistoryCart.accountsNotes || 'No instruction note recorded.'}
              </p>
              <div className="text-[10px] text-emerald-700 flex items-center justify-between">
                <span>Updated by: <strong>{selectedHistoryCart.accountsNotesEditedBy || selectedHistoryCart.accountsApprovedBy || selectedHistoryCart.accountsReviewedBy || 'Accounts'}</strong></span>
                <span className="text-slate-400 italic">Managed by Accounts Department</span>
              </div>
            </div>

            {/* Timeline of Prior Versions */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Prior Revisions ({selectedHistoryCart.accountsNotesHistory?.length || 0})
              </div>

              {(!selectedHistoryCart.accountsNotesHistory || selectedHistoryCart.accountsNotesHistory.length === 0) ? (
                <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-400 text-xs">
                  No prior revisions logged. This is the first version of the instruction.
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
                  {selectedHistoryCart.accountsNotesHistory.map((rev, idx) => (
                    <div key={rev.id || idx} className="relative pl-7 space-y-1">
                      <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-white shadow-xs"></div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {rev.updatedBy}
                          </span>
                          <span className="font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(rev.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(rev.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 bg-white p-2 rounded border border-slate-100 leading-relaxed whitespace-pre-wrap">
                          {rev.note}
                        </p>
                        {rev.reason && (
                          <div className="text-[10px] text-slate-500 italic">
                            Reason: <span className="text-slate-700 font-medium">{rev.reason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedHistoryCart(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
