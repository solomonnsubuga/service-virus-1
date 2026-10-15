import React, { useState, useMemo, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { PatientLedger, PaymentTransaction, LedgerItem, PharmacyCart, Prescription, OtherChargeItem } from '../../types';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Printer,
  FileCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  PieChart,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
  Pill,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Check,
  X,
  User,
  ShoppingBag,
  MessageSquare,
  FileText,
  Send,
  Sparkles,
  Edit3,
  History,
  Syringe,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Activity,
  ArrowRight,
  Receipt,
  CheckSquare,
  Square,
  CheckCircle,
  Tag,
  HelpCircle,
  PlusCircle,
  Plus,
  Save,
  Edit2,
  Trash2,
  ListPlus,
  FolderPlus,
  Microscope,
  Scale,
  Phone,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Building2,
  BedDouble
} from 'lucide-react';
import { PrintReceiptModal } from '../common/PrintReceiptModal';
import { PatientLedgerStatementSection } from './accountant/PatientLedgerStatementSection';
import { OtherChargeInsurancePricingModal } from '../finance/OtherChargeInsurancePricingModal';
import { LaboratoriesDailyIncomeTrackerCard } from './accountant/LaboratoriesDailyIncomeTrackerCard';
import { DailyExpendituresManager } from './accountant/DailyExpendituresManager';
import { GeneralDailyIncomeExpenditureTrackerCard } from './accountant/GeneralDailyIncomeExpenditureTrackerCard';

interface GroupedPatientCarts {
  groupKey: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  prescriptionId?: string;
  prescription?: Prescription;
  latestCreatedAt: string;
  carts: PharmacyCart[];
  directCarts: PharmacyCart[];
  indirectCarts: PharmacyCart[];
  totalAmount: number;
  hasPending: boolean;
  allApproved: boolean;
  allDispensedOrAdministered: boolean;
  hasRejected: boolean;
}

export const AccountantDashboard: React.FC = () => {
  const {
    activeClinic,
    currentUser,
    ledgers,
    currentClinicLedgers,
    currentClinicPatients,
    currentClinicPharmacyCarts,
    testOrders,
    radiologyOrders,
    prescriptions,
    clinics,
    recordPayment,
    getPatientLedger,
    recordAccountsAffordability,
    updateCartAccountsInstructions,
    addLedgerCharge,
    getOtherChargeCost,
    otherCharges,
    currentClinicOtherCharges,
    addOtherCharge,
    updateOtherCharge,
    deleteOtherCharge,
    currentClinicInsurancePolicies,
    currentClinicDailyExpenditures,
    currentClinicDepartments,
    currentClinicWards,
    currencyConfig,
    currencySymbol,
    formatCurrency
  } = useClinic();

  const availableInsurancePolicies = useMemo(() => {
    return (currentClinicInsurancePolicies || []).filter(p => p.status === 'active');
  }, [currentClinicInsurancePolicies]);

  const [activeTab, setActiveTab] = useState<'ledgers' | 'settlement' | 'other_charges' | 'pharmacy_approvals' | 'income_analytics' | 'lab_tracker' | 'expenditures' | 'general_tracker'>('ledgers');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(currentClinicPatients[0]?.id || '');
  const [expandedLedgerPatientId, setExpandedLedgerPatientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartFilter, setCartFilter] = useState<'all' | 'pending' | 'approved' | 'direct' | 'indirect'>('all');

  // Universal Filter & Sort State for Patient Account Ledgers
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'all' | 'debt' | 'settled' | 'partially_paid' | 'unpaid'>('all');
  const [ledgerAdmissionTypeFilter, setLedgerAdmissionTypeFilter] = useState<'all' | 'OPD' | 'IPD'>('all');
  const [ledgerStructureFilter, setLedgerStructureFilter] = useState<'all' | 'compound' | 'single'>('all');
  const [ledgerDepartmentFilter, setLedgerDepartmentFilter] = useState<string>('all');
  const [ledgerWardFilter, setLedgerWardFilter] = useState<string>('all');
  const [ledgerInsuranceFilter, setLedgerInsuranceFilter] = useState<string>('all');
  const [ledgerSortKey, setLedgerSortKey] = useState<'date' | 'patient' | 'debt' | 'billed' | 'paid' | 'mrn' | 'phone' | 'visits'>('date');
  const [ledgerSortOrder, setLedgerSortOrder] = useState<'asc' | 'desc'>('desc');

  // Other Charges & Billing Selection State
  const [selectedOtherChargeId, setSelectedOtherChargeId] = useState<string>('');
  const [otherChargeQty, setOtherChargeQty] = useState<number>(1);
  const [otherChargeCustomCost, setOtherChargeCustomCost] = useState<number | null>(null);
  const [otherChargeSuccessMessage, setOtherChargeSuccessMessage] = useState<string>('');
  const [isAddingNewMasterCharge, setIsAddingNewMasterCharge] = useState<boolean>(false);
  const [insurancePricingCharge, setInsurancePricingCharge] = useState<OtherChargeItem | null>(null);
  const [newChargeInsurancePrices, setNewChargeInsurancePrices] = useState<Record<string, number>>({});

  // Master Catalog Management State
  const [newCatalogCharge, setNewCatalogCharge] = useState({
    description: '',
    cost: 0,
    department: 'Consultation' as 'Consultation' | 'Registration' | 'Nursing' | 'Procedure' | 'Other',
    category: 'Clinical'
  });
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null);
  const [editCatalogCharge, setEditCatalogCharge] = useState({
    description: '',
    cost: 0,
    department: 'Consultation' as 'Consultation' | 'Registration' | 'Nursing' | 'Procedure' | 'Other',
    category: 'Clinical'
  });
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('all');
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; cart: PharmacyCart | null; reason: string }>({
    isOpen: false,
    cart: null,
    reason: ''
  });
  const [approveModal, setApproveModal] = useState<{
    isOpen: boolean;
    cart: PharmacyCart | null;
    cartGroup?: GroupedPatientCarts | null;
    note: string;
    affordabilityAmount: number;
  }>({
    isOpen: false,
    cart: null,
    cartGroup: null,
    note: '',
    affordabilityAmount: 0
  });
  const [editInstructionsModal, setEditInstructionsModal] = useState<{
    isOpen: boolean;
    cart: PharmacyCart | null;
    note: string;
    reason: string;
  }>({
    isOpen: false,
    cart: null,
    note: '',
    reason: ''
  });
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    cart: PharmacyCart | null;
  }>({
    isOpen: false,
    cart: null
  });

  // Payment Settlement Form & Selection Mechanism
  const [payForm, setPayForm] = useState({
    amount: 0,
    paymentMethod: 'Cash' as PaymentTransaction['paymentMethod'],
    reference: '',
    notes: ''
  });

  const [selectedPaymentOption, setSelectedPaymentOption] = useState<string>('all');
  const [selectedDebtItemIds, setSelectedDebtItemIds] = useState<Set<string>>(new Set());
  const [settlementViewFilter, setSettlementViewFilter] = useState<'unpaid' | 'paid' | 'all'>('unpaid');

  const [printModal, setPrintModal] = useState<{
    isOpen: boolean;
    type: 'receipt' | 'ledger';
    data: any;
  }>({
    isOpen: false,
    type: 'receipt',
    data: null
  });

  const selectedPatient = currentClinicPatients.find(p => p.id === selectedPatientId) || currentClinicPatients[0];
  const activeLedger = selectedPatient ? getPatientLedger(selectedPatient.id) : null;

  // Granular categorized unpaid debt items and paid services for the active patient
  const unpaidItems = useMemo(() => {
    return (activeLedger?.items || []).filter(
      i => i.status !== 'paid' && (i.balanceDue === undefined || i.balanceDue > 0)
    );
  }, [activeLedger]);

  const paidItems = useMemo(() => {
    return (activeLedger?.items || []).filter(
      i => i.status === 'paid' || (i.balanceDue !== undefined && i.balanceDue <= 0)
    );
  }, [activeLedger]);

  const unpaidLabTests = useMemo(() => unpaidItems.filter(i => i.department === 'Pathology'), [unpaidItems]);
  const unpaidRadiology = useMemo(() => unpaidItems.filter(i => i.department === 'Radiology'), [unpaidItems]);
  const unpaidPharmacy = useMemo(() => unpaidItems.filter(i => i.department === 'Pharmacy'), [unpaidItems]);
  const unpaidProcedures = useMemo(() => unpaidItems.filter(i => i.department === 'Procedure'), [unpaidItems]);
  const unpaidNursing = useMemo(() => unpaidItems.filter(i => i.department === 'Nursing'), [unpaidItems]);
  const unpaidOtherCharges = useMemo(() => unpaidItems.filter(i => i.department === 'Registration' || i.department === 'Other' || i.department === 'Consultation'), [unpaidItems]);

  // Group unpaid pharmacy carts by Cart ID / Reference ID
  const unpaidCartsList = useMemo(() => {
    const map = new Map<string, { cartId: string; cartNumber: string; cartType: string; items: LedgerItem[]; total: number }>();
    unpaidPharmacy.forEach(i => {
      const cId = i.cartId || i.referenceId || 'misc_cart';
      if (!map.has(cId)) {
        map.set(cId, {
          cartId: cId,
          cartNumber: i.cartNumber || 'Cart',
          cartType: i.cartType || (i.description.includes('Indirect') ? 'indirect' : 'direct'),
          items: [],
          total: 0
        });
      }
      const entry = map.get(cId)!;
      entry.items.push(i);
      entry.total += (i.balanceDue ?? i.totalAmount);
    });
    return Array.from(map.values());
  }, [unpaidPharmacy]);

  // Function to calculate and apply selection based on drop-down choice
  const selectItemsForOption = (option: string, patientUnpaid = unpaidItems) => {
    let ids = new Set<string>();
    let noteDesc = '';

    if (option === 'all') {
      ids = new Set(patientUnpaid.map(i => i.id));
      noteDesc = 'Full settlement of all patient debt items';
    } else if (option === 'tests_all') {
      const tests = patientUnpaid.filter(i => i.department === 'Pathology');
      ids = new Set(tests.map(i => i.id));
      noteDesc = `Settlement for all diagnostic laboratory tests (${tests.length} test(s))`;
    } else if (option === 'rad_all') {
      const scans = patientUnpaid.filter(i => i.department === 'Radiology');
      ids = new Set(scans.map(i => i.id));
      noteDesc = `Settlement for all radiology & imaging scans (${scans.length} scan(s))`;
    } else if (option === 'carts_all') {
      const meds = patientUnpaid.filter(i => i.department === 'Pharmacy');
      ids = new Set(meds.map(i => i.id));
      noteDesc = `Settlement for all pharmacy medication carts (${meds.length} item(s))`;
    } else if (option.startsWith('cart_')) {
      const cId = option.replace('cart_', '');
      const cartItems = patientUnpaid.filter(i => i.cartId === cId || i.referenceId === cId);
      ids = new Set(cartItems.map(i => i.id));
      const first = cartItems[0];
      noteDesc = `Settlement for Pharmacy Cart #${first?.cartNumber || ''} (${cartItems.length} medication items)`;
    } else if (option === 'procedures_all') {
      const procs = patientUnpaid.filter(i => i.department === 'Procedure');
      ids = new Set(procs.map(i => i.id));
      noteDesc = `Settlement for clinical procedures (${procs.length} item(s))`;
    } else if (option === 'nursing_all') {
      const wardItems = patientUnpaid.filter(i => i.department === 'Nursing');
      ids = new Set(wardItems.map(i => i.id));
      noteDesc = `Settlement for nursing consumables & administration`;
    } else if (option === 'other_all') {
      const otherList = patientUnpaid.filter(i => i.department === 'Registration' || i.department === 'Other' || i.department === 'Consultation');
      ids = new Set(otherList.map(i => i.id));
      noteDesc = `Settlement for other charges, consultations and registration fees (${otherList.length} item(s))`;
    } else if (option.startsWith('item_')) {
      const itId = option.replace('item_', '');
      const item = patientUnpaid.find(i => i.id === itId);
      if (item) {
        ids = new Set([itId]);
        noteDesc = `Payment for [${item.department}] ${item.description}`;
      }
    }

    setSelectedDebtItemIds(ids);
    const totalSelected = patientUnpaid.filter(i => ids.has(i.id)).reduce((s, i) => s + (i.balanceDue ?? i.totalAmount), 0);
    setPayForm(prev => ({
      ...prev,
      amount: Number(totalSelected.toFixed(2)),
      notes: noteDesc || prev.notes
    }));
  };

  // Other Charges Handlers
  const handleAddOtherChargeToBill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPatient) return;

    const targetCharge = currentClinicOtherCharges.find(c => c.id === selectedOtherChargeId);
    if (!targetCharge) return;

    const policy = selectedPatient.insurancePolicyName;
    const standardCost = targetCharge.cost;
    const tariffCost = getOtherChargeCost(targetCharge, policy);

    const unitPrice = otherChargeCustomCost !== null && otherChargeCustomCost >= 0
      ? otherChargeCustomCost
      : tariffCost;

    const isInsurance = Boolean(policy && (unitPrice !== standardCost || targetCharge.insurancePrices?.[policy] !== undefined));

    const qty = Math.max(1, Math.floor(otherChargeQty || 1));
    const total = Number((unitPrice * qty).toFixed(2));

    addLedgerCharge(selectedPatient.id, {
      department: targetCharge.department || 'Other',
      description: targetCharge.description,
      quantity: qty,
      unitPrice,
      baseUnitPrice: standardCost,
      isInsurancePrice: isInsurance,
      insurancePolicyName: isInsurance ? policy : undefined
    });

    setOtherChargeSuccessMessage(
      `Added "${targetCharge.description}" (Qty: ${qty}, Total: $${total.toFixed(2)}${isInsurance ? ` - ${policy} tariff` : ''}) to ${selectedPatient.firstName} ${selectedPatient.lastName}'s bill and ledger.`
    );
    setTimeout(() => setOtherChargeSuccessMessage(''), 6000);

    setOtherChargeQty(1);
    setOtherChargeCustomCost(null);
  };

  const handleSaveNewCatalogCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatalogCharge.description.trim()) return;

    const created = addOtherCharge({
      clinicId: activeClinic.id,
      description: newCatalogCharge.description.trim(),
      cost: Number(newCatalogCharge.cost) || 0,
      insurancePrices: Object.keys(newChargeInsurancePrices).length > 0 ? newChargeInsurancePrices : undefined,
      department: newCatalogCharge.department,
      category: newCatalogCharge.category
    });

    setSelectedOtherChargeId(created.id);
    setOtherChargeCustomCost(created.cost);
    setIsAddingNewMasterCharge(false);
    setNewCatalogCharge({
      description: '',
      cost: 0,
      department: 'Consultation',
      category: 'Clinical'
    });
    setNewChargeInsurancePrices({});
  };

  const handleStartEditCatalogCharge = (charge: OtherChargeItem) => {
    setEditingChargeId(charge.id);
    setEditCatalogCharge({
      description: charge.description,
      cost: charge.cost,
      department: (charge.department as any) || 'Other',
      category: charge.category || 'General'
    });
  };

  const handleSaveEditCatalogCharge = (id: string) => {
    if (!editCatalogCharge.description.trim()) return;
    updateOtherCharge(id, {
      description: editCatalogCharge.description.trim(),
      cost: Number(editCatalogCharge.cost) || 0,
      department: editCatalogCharge.department,
      category: editCatalogCharge.category
    });
    setEditingChargeId(null);
  };

  const handleDeleteCatalogCharge = (id: string) => {
    if (window.confirm('Are you sure you want to delete this charge definition from the clinic catalog?')) {
      deleteOtherCharge(id);
      if (selectedOtherChargeId === id) {
        setSelectedOtherChargeId('');
        setOtherChargeCustomCost(null);
      }
    }
  };

  const handlePaymentOptionChange = (newOption: string) => {
    setSelectedPaymentOption(newOption);
    if (newOption !== 'custom') {
      selectItemsForOption(newOption);
    }
  };

  const toggleDebtItemSelection = (itemId: string) => {
    const next = new Set(selectedDebtItemIds);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setSelectedDebtItemIds(next);
    setSelectedPaymentOption('custom');

    const totalSelected = unpaidItems.filter(i => next.has(i.id)).reduce((s, i) => s + (i.balanceDue ?? i.totalAmount), 0);
    const selectedList = unpaidItems.filter(i => next.has(i.id));
    const noteStr = selectedList.length > 0
      ? `Settlement for: ${selectedList.map(i => i.description.slice(0, 24)).join(', ')}`
      : '';
    setPayForm(prev => ({
      ...prev,
      amount: Number(totalSelected.toFixed(2)),
      notes: noteStr || prev.notes
    }));
  };

  const handleSelectAllUnpaid = () => {
    setSelectedPaymentOption('all');
    selectItemsForOption('all');
  };

  const handleClearUnpaidSelection = () => {
    setSelectedDebtItemIds(new Set());
    setSelectedPaymentOption('custom');
    setPayForm(prev => ({ ...prev, amount: 0 }));
  };

  // Sync selection when patient is switched
  useEffect(() => {
    if (activeLedger) {
      const currentUnpaid = activeLedger.items.filter(
        i => i.status !== 'paid' && (i.balanceDue === undefined || i.balanceDue > 0)
      );
      selectItemsForOption('all', currentUnpaid);
      setSelectedPaymentOption('all');
    }
  }, [selectedPatientId]);

  // Income Metrics strictly for active clinic
  const totalBilledAll = currentClinicLedgers.reduce((sum, l) => sum + l.totalBilled, 0);
  const totalPaidAll = currentClinicLedgers.reduce((sum, l) => sum + l.totalPaid, 0);
  const totalBalanceDue = currentClinicLedgers.reduce((sum, l) => sum + l.balanceDue, 0);

  // Today's total expenditures strictly for active clinic
  const todayExpendituresTotal = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return currentClinicDailyExpenditures
      .filter(e => e.date === todayStr)
      .reduce((sum, e) => sum + e.totalAmount, 0);
  }, [currentClinicDailyExpenditures]);

  // Departmental breakdown across active clinic ledger line items
  const allLineItems: LedgerItem[] = currentClinicLedgers.flatMap(l => l.items);
  const pharmacyRevenue = allLineItems.filter(i => i.department === 'Pharmacy').reduce((sum, i) => sum + i.totalAmount, 0);
  const labRevenue = allLineItems.filter(i => i.department === 'Pathology').reduce((sum, i) => sum + i.totalAmount, 0);
  const radRevenue = allLineItems.filter(i => i.department === 'Radiology').reduce((sum, i) => sum + i.totalAmount, 0);
  const consultRevenue = allLineItems.filter(i => i.department === 'Consultation').reduce((sum, i) => sum + i.totalAmount, 0);
  const nursingRevenue = allLineItems.filter(i => i.department === 'Nursing').reduce((sum, i) => sum + i.totalAmount, 0);

  const pendingCarts = currentClinicPharmacyCarts.filter(c => c.status === 'pending_accounts' || c.accountsStatus === 'pending');

  const filteredCarts = [...currentClinicPharmacyCarts]
    .filter(cart => {
      if (cartFilter === 'pending') return cart.status === 'pending_accounts' || cart.accountsStatus === 'pending';
      if (cartFilter === 'approved') return cart.accountsStatus === 'approved' || cart.status === 'approved_by_accounts' || cart.status === 'dispensed' || cart.status === 'administered';
      if (cartFilter === 'direct') return cart.cartType === 'direct';
      if (cartFilter === 'indirect') return cart.cartType === 'indirect';
      return true;
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // Group filtered carts by patient and prescription so direct and indirect carts of the same patient prescription are displayed in the same unified card
  const groupedCarts: GroupedPatientCarts[] = (() => {
    const map = new Map<string, GroupedPatientCarts>();

    filteredCarts.forEach(cart => {
      // Group key: if prescriptionId exists, group by patientId + prescriptionId; otherwise group by patientId + cartId
      const key = cart.prescriptionId
        ? `${cart.patientId}_rx_${cart.prescriptionId}`
        : `${cart.patientId}_cart_${cart.id}`;

      if (!map.has(key)) {
        const rx = cart.prescriptionId ? prescriptions.find(p => p.id === cart.prescriptionId) : undefined;
        map.set(key, {
          groupKey: key,
          patientId: cart.patientId,
          patientName: cart.patientName,
          patientMrn: cart.patientMrn,
          prescriptionId: cart.prescriptionId,
          prescription: rx,
          latestCreatedAt: cart.createdAt,
          carts: [],
          directCarts: [],
          indirectCarts: [],
          totalAmount: 0,
          hasPending: false,
          allApproved: true,
          allDispensedOrAdministered: true,
          hasRejected: false
        });
      }

      const group = map.get(key)!;
      group.carts.push(cart);
      if (cart.cartType === 'direct') {
        group.directCarts.push(cart);
      } else {
        group.indirectCarts.push(cart);
      }

      const cost = cart.totalAmount || cart.totalSumCost || cart.items.reduce((s, it) => s + (it.totalPrice || it.quantity * it.unitPrice), 0);
      group.totalAmount += cost;

      if (new Date(cart.createdAt).getTime() > new Date(group.latestCreatedAt).getTime()) {
        group.latestCreatedAt = cart.createdAt;
      }

      if (cart.status === 'pending_accounts' || cart.accountsStatus === 'pending') {
        group.hasPending = true;
      }
      if (cart.accountsStatus !== 'approved' && cart.status !== 'approved_by_accounts' && cart.status !== 'dispensed' && cart.status !== 'administered') {
        group.allApproved = false;
      }
      if (cart.status !== 'dispensed' && cart.status !== 'administered') {
        group.allDispensedOrAdministered = false;
      }
      if (cart.accountsStatus === 'rejected' || cart.status === 'rejected_by_accounts') {
        group.hasRejected = true;
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latestCreatedAt || 0).getTime() - new Date(a.latestCreatedAt || 0).getTime()
    );
  })();

  const getLedgerTimestamp = (l: PatientLedger) => {
    const dates: number[] = [];
    if (l.createdAt) dates.push(new Date(l.createdAt).getTime());
    if (l.transactions && l.transactions.length > 0) {
      l.transactions.forEach(t => {
        if (t.date) dates.push(new Date(t.date).getTime());
      });
    }
    if (l.items && l.items.length > 0) {
      l.items.forEach(it => {
        if (it.date) dates.push(new Date(it.date).getTime());
      });
    }
    return dates.length > 0 ? Math.max(...dates) : 0;
  };

  // Ensure every patient in the clinic has exactly one unified ledger with all consolidated billable items
  const unifiedPatientLedgers: PatientLedger[] = useMemo(() => {
    return currentClinicPatients.map(patient => {
      return getPatientLedger(patient.id);
    }).filter(Boolean) as PatientLedger[];
  }, [currentClinicPatients, getPatientLedger]);

  // Unique departments for filter
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

  // Unique wards for filter
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

  // Unique insurance policies / schemes
  const availableInsurances = useMemo(() => {
    const set = new Set<string>();
    if (availableInsurancePolicies && Array.isArray(availableInsurancePolicies)) {
      availableInsurancePolicies.forEach(pol => {
        if (pol.policyName) set.add(pol.policyName);
        else if (pol.name) set.add(pol.name);
      });
    }
    currentClinicPatients.forEach(p => {
      if (p.insurancePolicyName) set.add(p.insurancePolicyName);
      if (p.insuranceProvider) set.add(p.insuranceProvider);
    });
    return Array.from(set).sort();
  }, [availableInsurancePolicies, currentClinicPatients]);

  const isLedgerFilterActive = Boolean(
    ledgerSearchTerm.trim() ||
    ledgerStatusFilter !== 'all' ||
    ledgerAdmissionTypeFilter !== 'all' ||
    ledgerStructureFilter !== 'all' ||
    ledgerDepartmentFilter !== 'all' ||
    ledgerWardFilter !== 'all' ||
    ledgerInsuranceFilter !== 'all'
  );

  const resetLedgerFilters = () => {
    setLedgerSearchTerm('');
    setLedgerStatusFilter('all');
    setLedgerAdmissionTypeFilter('all');
    setLedgerStructureFilter('all');
    setLedgerDepartmentFilter('all');
    setLedgerWardFilter('all');
    setLedgerInsuranceFilter('all');
    setLedgerSortKey('date');
    setLedgerSortOrder('desc');
  };

  const filteredLedgers = useMemo(() => {
    const term = ledgerSearchTerm.trim().toLowerCase();
    const termDigits = term.replace(/\D/g, '');

    return [...unifiedPatientLedgers].filter(l => {
      const patient = currentClinicPatients.find(p => p.id === l.patientId);

      // Search matching: Patient name, MRN, revisit MRNs, phone number, emergency phone, ledger ID, email, items, transactions
      if (term) {
        const phoneRaw = (patient?.phone || l.patientPhone || '').toLowerCase();
        const phoneDigits = phoneRaw.replace(/\D/g, '');
        const emergencyPhoneRaw = (patient?.emergencyContact?.phone || '').toLowerCase();
        const emergencyPhoneDigits = emergencyPhoneRaw.replace(/\D/g, '');

        const matchesName = l.patientName.toLowerCase().includes(term);
        const matchesMrn = l.patientMrn.toLowerCase().includes(term);
        const matchesRevisitMrns = Boolean(l.registeredMrns && l.registeredMrns.some(m => m.toLowerCase().includes(term)));
        const matchesId = l.id.toLowerCase().includes(term);
        const matchesEmail = Boolean(patient?.email && patient.email.toLowerCase().includes(term));
        
        // Comprehensive Phone matching (raw substring + normalized digits comparison)
        const matchesPhone = phoneRaw.includes(term) ||
          emergencyPhoneRaw.includes(term) ||
          (termDigits.length >= 3 && (phoneDigits.includes(termDigits) || emergencyPhoneDigits.includes(termDigits)));

        const matchesItems = l.items.some(it => 
          it.description.toLowerCase().includes(term) || 
          Boolean(it.department && it.department.toLowerCase().includes(term))
        );
        const matchesTransactions = l.transactions.some(t => 
          t.id.toLowerCase().includes(term) || 
          Boolean(t.receiptNumber && t.receiptNumber.toLowerCase().includes(term))
        );

        if (!matchesName && !matchesMrn && !matchesRevisitMrns && !matchesId && !matchesPhone && !matchesEmail && !matchesItems && !matchesTransactions) {
          return false;
        }
      }

      // Status filter
      if (ledgerStatusFilter === 'debt' && l.balanceDue <= 0) return false;
      if (ledgerStatusFilter === 'settled' && l.balanceDue > 0 && l.status !== 'settled') return false;
      if (ledgerStatusFilter === 'partially_paid') {
        const isPart = l.status === 'partially_paid' || (l.totalPaid > 0 && l.balanceDue > 0);
        if (!isPart) return false;
      }
      if (ledgerStatusFilter === 'unpaid') {
        const isUnpaid = l.status === 'pending_payment' && l.totalPaid === 0;
        if (!isUnpaid) return false;
      }

      // Admission type filter (OPD vs IPD)
      if (ledgerAdmissionTypeFilter === 'OPD') {
        const isOpd = patient?.patientType === 'OPD' || (!patient?.patientType && !patient?.ward);
        if (!isOpd) return false;
      }
      if (ledgerAdmissionTypeFilter === 'IPD') {
        const isIpd = patient?.patientType === 'IPD' || Boolean(patient?.ward);
        if (!isIpd) return false;
      }

      // Structure filter (Compound vs Single)
      if (ledgerStructureFilter === 'compound' && !l.isCompoundLedger) return false;
      if (ledgerStructureFilter === 'single' && l.isCompoundLedger) return false;

      // Department filter
      if (ledgerDepartmentFilter !== 'all') {
        const matchesDept = patient?.department?.toLowerCase() === ledgerDepartmentFilter.toLowerCase() ||
          l.items.some(it => it.department?.toLowerCase() === ledgerDepartmentFilter.toLowerCase());
        if (!matchesDept) return false;
      }

      // Ward filter
      if (ledgerWardFilter !== 'all') {
        const matchesWard = patient?.ward?.toLowerCase() === ledgerWardFilter.toLowerCase();
        if (!matchesWard) return false;
      }

      // Insurance filter
      if (ledgerInsuranceFilter !== 'all') {
        if (ledgerInsuranceFilter === 'cash') {
          if (patient?.insurancePolicyName || patient?.insuranceProvider) return false;
        } else if (ledgerInsuranceFilter === 'insured') {
          if (!patient?.insurancePolicyName && !patient?.insuranceProvider) return false;
        } else {
          const pol = patient?.insurancePolicyName || patient?.insuranceProvider;
          if (pol?.toLowerCase() !== ledgerInsuranceFilter.toLowerCase()) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const patientA = currentClinicPatients.find(p => p.id === a.patientId);
      const patientB = currentClinicPatients.find(p => p.id === b.patientId);
      let comparison = 0;

      switch (ledgerSortKey) {
        case 'date':
          comparison = getLedgerTimestamp(b) - getLedgerTimestamp(a);
          break;
        case 'patient':
          comparison = a.patientName.localeCompare(b.patientName);
          break;
        case 'debt':
          comparison = b.balanceDue - a.balanceDue;
          break;
        case 'billed':
          comparison = b.totalBilled - a.totalBilled;
          break;
        case 'paid':
          comparison = b.totalPaid - a.totalPaid;
          break;
        case 'mrn':
          comparison = a.patientMrn.localeCompare(b.patientMrn);
          break;
        case 'phone': {
          const phoneA = patientA?.phone || a.patientPhone || '';
          const phoneB = patientB?.phone || b.patientPhone || '';
          comparison = phoneA.localeCompare(phoneB);
          break;
        }
        case 'visits': {
          const visitsA = a.totalVisitsCount || (a.registeredMrns?.length || 1);
          const visitsB = b.totalVisitsCount || (b.registeredMrns?.length || 1);
          comparison = visitsB - visitsA;
          break;
        }
        default:
          comparison = getLedgerTimestamp(b) - getLedgerTimestamp(a);
      }

      if (ledgerSortKey === 'patient' || ledgerSortKey === 'mrn' || ledgerSortKey === 'phone') {
        return ledgerSortOrder === 'desc' ? -comparison : comparison;
      }
      return ledgerSortOrder === 'asc' ? -comparison : comparison;
    });
  }, [
    unifiedPatientLedgers,
    ledgerSearchTerm,
    ledgerStatusFilter,
    ledgerAdmissionTypeFilter,
    ledgerStructureFilter,
    ledgerDepartmentFilter,
    ledgerWardFilter,
    ledgerInsuranceFilter,
    ledgerSortKey,
    ledgerSortOrder,
    currentClinicPatients
  ]);

  const filteredTotals = useMemo(() => {
    return filteredLedgers.reduce(
      (acc, l) => ({
        billed: acc.billed + l.totalBilled,
        paid: acc.paid + l.totalPaid,
        debt: acc.debt + l.balanceDue
      }),
      { billed: 0, paid: 0, debt: 0 }
    );
  }, [filteredLedgers]);

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLedger) return;

    if (payForm.amount <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }

    // Determine targeted items based on user selection or dropdown option
    let targetItems = unpaidItems.filter(i => selectedDebtItemIds.has(i.id));
    if (targetItems.length === 0) {
      targetItems = unpaidItems;
    }

    // Calculate item allocations
    let remainingPayment = Number(payForm.amount);
    const allocatedItems = targetItems.map(item => {
      const itemDue = item.balanceDue ?? item.totalAmount;
      const allocated = Math.min(itemDue, remainingPayment);
      remainingPayment -= allocated;
      return {
        itemId: item.id,
        description: item.description,
        department: item.department,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalAmount: item.totalAmount,
        amountAllocated: Number(allocated.toFixed(2))
      };
    }).filter(a => a.amountAllocated > 0);

    if (allocatedItems.length === 0 && Number(payForm.amount) > 0) {
      allocatedItems.push({
        itemId: `item-${Date.now()}`,
        description: payForm.notes || (selectedPaymentOption !== 'all' ? `${selectedPaymentOption.toUpperCase()} Settlement` : 'Clinical Healthcare Services Settlement'),
        department: selectedPaymentOption !== 'all' ? selectedPaymentOption : 'Hospital Accounts',
        quantity: 1,
        unitPrice: Number(payForm.amount),
        totalAmount: Number(payForm.amount),
        amountAllocated: Number(payForm.amount)
      });
    } else if (remainingPayment > 0.009) {
      allocatedItems.push({
        itemId: `advance-${Date.now()}`,
        description: 'Patient Account Credit / Advance Balance',
        department: 'Hospital Accounts',
        quantity: 1,
        unitPrice: Number(remainingPayment.toFixed(2)),
        totalAmount: Number(remainingPayment.toFixed(2)),
        amountAllocated: Number(remainingPayment.toFixed(2))
      });
    }

    const firstCartId = targetItems.find(i => i.cartId)?.cartId;

    const receipt = recordPayment(
      activeLedger.patientId,
      {
        amountPaid: Number(payForm.amount),
        paymentMethod: payForm.paymentMethod,
        referenceNo: payForm.reference,
        receivedBy: currentUser.name,
        notes: payForm.notes,
        allocatedItems,
        paidItemIds: allocatedItems.map(a => a.itemId),
        targetCategory: selectedPaymentOption,
        targetCartId: firstCartId
      }
    );

    if (receipt) {
      setPrintModal({
        isOpen: true,
        type: 'receipt',
        data: receipt
      });
      setSelectedPaymentOption('all');
      setSelectedDebtItemIds(new Set());
      setPayForm({
        amount: 0,
        paymentMethod: 'Cash',
        reference: '',
        notes: ''
      });
    }
  };

  const handleOpenApproveModal = (cart: PharmacyCart) => {
    const totalAmount = cart.totalSumCost || cart.totalAmount || cart.items.reduce((s, i) => s + (i.totalPrice || i.quantity * i.unitPrice), 0);
    setApproveModal({
      isOpen: true,
      cart,
      cartGroup: null,
      note: 'Payment received and verified. Cleared for dispensing by Pharmacy.',
      affordabilityAmount: totalAmount
    });
  };

  const handleOpenApproveGroupModal = (group: GroupedPatientCarts) => {
    const pendingInGroup = group.carts.filter(c => c.status === 'pending_accounts' || c.accountsStatus === 'pending');
    const firstPending = pendingInGroup[0] || group.carts[0];
    setApproveModal({
      isOpen: true,
      cart: firstPending,
      cartGroup: group,
      note: 'Full prescription payment verified. Cleared for dispensing both direct and indirect carts.',
      affordabilityAmount: group.totalAmount
    });
  };

  const handleConfirmApprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveModal.cart && !approveModal.cartGroup) return;
    const finalNote = approveModal.note.trim() || 'Approved by Accounts for Dispensing / Administration';

    if (approveModal.cartGroup) {
      // Batch approve all pending carts in the group
      approveModal.cartGroup.carts.forEach(c => {
        const cartTotal = c.totalSumCost || c.totalAmount || c.items.reduce((s, i) => s + (i.totalPrice || i.quantity * i.unitPrice), 0);
        recordAccountsAffordability(
          c.id,
          cartTotal,
          finalNote,
          'approved'
        );
      });
    } else if (approveModal.cart) {
      recordAccountsAffordability(
        approveModal.cart.id,
        Number(approveModal.affordabilityAmount) || 0,
        finalNote,
        'approved'
      );
    }

    setApproveModal({ isOpen: false, cart: null, cartGroup: null, note: '', affordabilityAmount: 0 });
  };

  const handleOpenRejectModal = (cart: PharmacyCart) => {
    setRejectModal({
      isOpen: true,
      cart,
      reason: 'Outstanding balance pending payment / Insurance unconfirmed.'
    });
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModal.cart) return;
    recordAccountsAffordability(rejectModal.cart.id, 0, rejectModal.reason, 'rejected');
    setRejectModal({ isOpen: false, cart: null, reason: '' });
  };

  const handleOpenEditInstructions = (cart: PharmacyCart) => {
    setEditInstructionsModal({
      isOpen: true,
      cart,
      note: cart.accountsNotes || '',
      reason: ''
    });
  };

  const handleConfirmEditInstructions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInstructionsModal.cart) return;
    updateCartAccountsInstructions(
      editInstructionsModal.cart.id,
      editInstructionsModal.note,
      editInstructionsModal.reason.trim() || 'Instruction revised by Accounts'
    );
    setEditInstructionsModal({ isOpen: false, cart: null, note: '', reason: '' });
  };

  const handleOpenHistoryModal = (cart: PharmacyCart) => {
    setHistoryModal({
      isOpen: true,
      cart
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900">Hospital Billing, Ledgers & Gatekeeper Suite</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {currentUser.name} (Finance Office)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Accounting Currency: {currencyConfig.code} ({currencySymbol})
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Integrated Patient Ledgers &bull; Pharmacy Dispense Approvals &bull; Payment Settlement &bull; Revenue Breakdown
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingCarts.length > 0 && (
            <button
              onClick={() => setActiveTab('pharmacy_approvals')}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer animate-pulse"
            >
              <ShieldAlert className="w-4 h-4" />
              {pendingCarts.length} Pending Pharmacy Approval{pendingCarts.length === 1 ? '' : 's'}
            </button>
          )}

          <button
            onClick={() => setActiveTab('settlement')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            Accept Payment
          </button>

          <button
            onClick={() => setActiveTab('expenditures')}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            Daily Expenditures
          </button>
        </div>
      </div>

      {/* Financial KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Billed Charges</span>
            <FileCheck className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatCurrency(totalBilledAll)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across all departments & clinics</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Revenue Collected</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-600">
            {formatCurrency(totalPaidAll)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-semibold">
            {((totalPaidAll / (totalBilledAll || 1)) * 100).toFixed(1)}% realization rate
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Outstanding Receivables</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-600">
            {formatCurrency(totalBalanceDue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Pending settlement or insurance</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Pharmacy Gatekeeper</span>
            <Pill className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-purple-700">
            {pendingCarts.length} Pending
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{currentClinicPharmacyCarts.length} Total orders active</div>
        </div>

        <div
          onClick={() => setActiveTab('expenditures')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-rose-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Today's Expenditures</span>
            <Receipt className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-600">
            {formatCurrency(todayExpendituresTotal)}
          </div>
          <div className="text-[11px] text-rose-700 mt-1 font-semibold flex items-center justify-between">
            <span>Daily Outflows</span>
            <span>Manage &rarr;</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex flex-wrap items-center gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('general_tracker')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'general_tracker' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>General Incomes & Expenditures Tracker</span>
        </button>

        <button
          onClick={() => setActiveTab('ledgers')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'ledgers' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Patient Account Ledgers ({unifiedPatientLedgers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('lab_tracker')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'lab_tracker' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Microscope className="w-3.5 h-3.5" />
          <span>Pathology & Radiology Income & Debt Tracker</span>
        </button>

        <button
          onClick={() => setActiveTab('pharmacy_approvals')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'pharmacy_approvals' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Pill className="w-3.5 h-3.5" />
          <span>Pharmacy & Medication Approvals</span>
          {pendingCarts.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
              {pendingCarts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settlement')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'settlement' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Billing Counter & Payment Settlement</span>
        </button>

        <button
          onClick={() => setActiveTab('other_charges')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'other_charges' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListPlus className="w-3.5 h-3.5" />
          <span>Other Charges Catalog ({currentClinicOtherCharges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('expenditures')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'expenditures' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Daily Expenditures & Outflows</span>
        </button>

        <button
          onClick={() => setActiveTab('income_analytics')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'income_analytics' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Revenue & Income Analytics by Service</span>
        </button>
      </div>

      {/* Tab: General Daily Incomes & Expenditures Tracker */}
      {activeTab === 'general_tracker' && (
        <GeneralDailyIncomeExpenditureTrackerCard forceOpen={true} defaultCollapsed={false} />
      )}

      {/* Tab: Daily Expenditures & Cash Outflows */}
      {activeTab === 'expenditures' && (
        <DailyExpendituresManager />
      )}

      {/* Tab: Laboratory Daily & Historical Finances Tracker */}
      {activeTab === 'lab_tracker' && (
        <LaboratoriesDailyIncomeTrackerCard forceOpen={true} defaultCollapsed={false} />
      )}

      {/* Tab 2: Pharmacy Gatekeeper Approvals */}
      {activeTab === 'pharmacy_approvals' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Pharmacy & Medication Gatekeeper Approvals
              </h3>
              <p className="text-[11px] text-slate-500">
                Verify patient insurance/payment eligibility before releasing medication. Pharmacists cannot dispense items until approved here.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setCartFilter('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  cartFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({currentClinicPharmacyCarts.length})
              </button>
              <button
                type="button"
                onClick={() => setCartFilter('pending')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer flex items-center gap-1 ${
                  cartFilter === 'pending' ? 'bg-amber-500 text-slate-950 shadow-2xs' : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                <Clock className="w-3 h-3" />
                Pending ({pendingCarts.length})
              </button>
              <button
                type="button"
                onClick={() => setCartFilter('direct')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  cartFilter === 'direct' ? 'bg-white text-sky-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Direct (OPD)
              </button>
              <button
                type="button"
                onClick={() => setCartFilter('indirect')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  cartFilter === 'indirect' ? 'bg-white text-indigo-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Indirect (IPD/Ward)
              </button>
            </div>
          </div>

          {/* Unified Grouped Patient Carts List */}
          <div className="grid grid-cols-1 gap-5">
            {groupedCarts.map(group => {
              const pat = currentClinicPatients.find(p => p.id === group.patientId);
              const ledger = pat ? getPatientLedger(pat.id) : null;
              const hasBothTypes = group.directCarts.length > 0 && group.indirectCarts.length > 0;
              const totalMedsCount = group.carts.reduce((acc, c) => acc + c.items.length, 0);
              const pendingCartsCount = group.carts.filter(c => c.status === 'pending_accounts' || c.accountsStatus === 'pending').length;

              return (
                <div
                  key={group.groupKey}
                  className={`rounded-xl border shadow-xs transition-all overflow-hidden ${
                    group.hasPending
                      ? 'bg-white border-amber-300 ring-1 ring-amber-300/80 shadow-amber-50/50'
                      : group.hasRejected
                      ? 'bg-white border-rose-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Master Patient & Prescription Card Header */}
                  <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
                    group.hasPending
                      ? 'bg-gradient-to-r from-amber-50 via-amber-50/40 to-white border-amber-200'
                      : group.hasRejected
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-slate-50/80 border-slate-200'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">
                          {group.patientName}
                        </span>
                        <span className="font-mono text-slate-600 text-xs font-semibold px-2 py-0.5 bg-white border border-slate-200 rounded">
                          MRN: {group.patientMrn}
                        </span>

                        {(group.carts.find(c => c.insurancePolicyName)?.insurancePolicyName || pat?.insurancePolicyName || pat?.insuranceProvider) && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-teal-600" />
                            Tariff: {group.carts.find(c => c.insurancePolicyName)?.insurancePolicyName || pat?.insurancePolicyName || pat?.insuranceProvider}
                          </span>
                        )}

                        {group.prescriptionId && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                            Rx #{group.prescriptionId.slice(-8)}
                          </span>
                        )}

                        {hasBothTypes ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-purple-600" />
                            Unified Rx: Direct (OPD) + Indirect (Injection)
                          </span>
                        ) : group.directCarts.length > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-300">
                            Direct Cart (OPD Take-Home)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                            Indirect Cart (Injection Room)
                          </span>
                        )}

                        {/* Overall Approval Status Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                          group.hasPending
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : group.allApproved
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : group.hasRejected
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}>
                          {group.hasPending ? `${pendingCartsCount} Awaiting Approval` : group.allApproved ? 'All Carts Approved' : 'Reviewed'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        {group.prescription?.doctorName && (
                          <span className="flex items-center gap-1 text-slate-700">
                            <Stethoscope className="w-3 h-3 text-emerald-600" />
                            Prescribing Clinician: <strong>{group.prescription.doctorName}</strong>
                          </span>
                        )}
                        {group.prescription?.diagnosis && (
                          <span className="text-slate-600">
                            &bull; Diagnosis: <em>{group.prescription.diagnosis}</em>
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(group.latestCreatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(group.latestCreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Header Financial Context & Batch Action */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Combined Rx Total</div>
                        <div className="text-sm font-black text-slate-900 font-mono">
                          {formatCurrency(group.totalAmount)}
                        </div>
                        {ledger && (
                          <div className={`text-[10px] font-semibold ${ledger.balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            Patient Balance: {formatCurrency(ledger.balanceDue)}
                          </div>
                        )}
                      </div>

                      {pendingCartsCount > 1 && (
                        <button
                          type="button"
                          onClick={() => handleOpenApproveGroupModal(group)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                          title="Approve both direct and indirect carts together with instructions"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve All ({pendingCartsCount}) Carts
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Connected Carts Callout if patient has both Direct and Indirect carts */}
                  {hasBothTypes && (
                    <div className="px-4 py-2 bg-purple-50/60 border-b border-purple-100 flex items-center justify-between text-[11px] text-purple-900">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                        <span>
                          <strong>Consolidated Prescription:</strong> This patient has both <strong>Direct (OPD Take-Home)</strong> and <strong>Indirect (Injection Room)</strong> carts generated from this visit.
                        </span>
                      </div>
                      <span className="font-semibold text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                        {group.directCarts.length} Direct &bull; {group.indirectCarts.length} Indirect ({totalMedsCount} Total Drugs)
                      </span>
                    </div>
                  )}

                  {/* Inside Card Body: Render individual carts within this patient's container */}
                  <div className="p-4 space-y-4 divide-y divide-slate-100">
                    {group.carts.map((cart, cIdx) => {
                      const isPending = cart.status === 'pending_accounts' || cart.accountsStatus === 'pending';
                      const isApproved = cart.accountsStatus === 'approved' || cart.status === 'approved_by_accounts';
                      const isRejected = cart.accountsStatus === 'rejected' || cart.status === 'rejected_by_accounts';
                      const isDispensed = cart.status === 'dispensed';
                      const isAdministered = cart.status === 'administered';
                      const cartTotal = cart.totalAmount || cart.totalSumCost || cart.items.reduce((sum, it) => sum + (it.totalPrice || it.quantity * it.unitPrice), 0);

                      return (
                        <div key={cart.id} className={`pt-4 first:pt-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start`}>
                          
                          {/* Cart Metadata & Items List (Left / Center Column) */}
                          <div className="lg:col-span-8 space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 border ${
                                  cart.cartType === 'direct'
                                    ? 'bg-sky-50 text-sky-900 border-sky-300'
                                    : 'bg-purple-50 text-purple-900 border-purple-300'
                                }`}>
                                  {cart.cartType === 'direct' ? (
                                    <>
                                      <ShoppingBag className="w-3.5 h-3.5 text-sky-600" />
                                      <span>Direct Cart &bull; OPD Take-Home Medication</span>
                                    </>
                                  ) : (
                                    <>
                                      <Syringe className="w-3.5 h-3.5 text-purple-600" />
                                      <span>Indirect Cart &bull; Injection Room Administration</span>
                                    </>
                                  )}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                                  #{cart.cartNumber || cart.id.slice(-6)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-slate-800">
                                  {formatCurrency(cartTotal)}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                                  isPending
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : isApproved
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : isRejected
                                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                                    : 'bg-slate-100 text-slate-800 border-slate-300'
                                }`}>
                                  {cart.accountsStatus || cart.status.replace('_', ' ')}
                                </span>
                              </div>
                            </div>

                            {/* Itemized Medications */}
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                <span>Prescribed Items ({cart.items.length}):</span>
                                <span className="font-mono text-slate-700">{formatCurrency(cartTotal)}</span>
                              </div>
                              <div className="space-y-1">
                                {cart.items.map((item, idx) => (
                                  <div key={item.id || idx} className="flex items-center justify-between text-xs font-medium text-slate-800 bg-white p-1.5 rounded border border-slate-100">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Pill className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                      <span className="font-bold text-slate-900">{item.itemName}</span>
                                      <span className="text-[11px] text-slate-500">
                                        ({item.dosage || item.unit}{item.route ? ` • ${item.route}` : ''}{item.instructions ? ` • ${item.instructions}` : ''})
                                      </span>
                                      {item.isInsurancePrice && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                          {cart.insurancePolicyName || item.insurancePolicyName} Rate
                                        </span>
                                      )}
                                    </div>
                                    <div className="font-bold text-slate-900 font-mono shrink-0 ml-2 text-right">
                                      <span>Qty: {item.quantity} ({formatCurrency(item.totalPrice || item.quantity * item.unitPrice)})</span>
                                      <div className="text-[10px] text-slate-400 font-normal">@{formatCurrency(item.unitPrice)}/{item.unit}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Accountant Clearance Instructions / Notes Box */}
                            {cart.accountsNotes ? (
                              <div className="text-slate-800 bg-emerald-50/40 p-3 rounded-lg border border-emerald-200 font-medium space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-1.5">
                                  <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-xs">
                                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Accountant Instructions for Pharmacist:</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {cart.accountsNotesHistory && cart.accountsNotesHistory.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenHistoryModal(cart)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 cursor-pointer shadow-2xs"
                                        title="View audit timeline of all previous edits"
                                      >
                                        <History className="w-3 h-3" />
                                        Revision History ({cart.accountsNotesHistory.length})
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditInstructions(cart)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer shadow-2xs"
                                      title="Edit accountant instructions"
                                    >
                                      <Edit3 className="w-3 h-3 text-slate-500" />
                                      Edit Note
                                    </button>
                                  </div>
                                </div>

                                <p className="text-xs text-slate-900 leading-relaxed whitespace-pre-wrap">
                                  {cart.accountsNotes}
                                </p>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] text-slate-500 border-t border-emerald-200/40">
                                  {(cart.accountsApprovedBy || cart.accountsReviewedBy) && (
                                    <span className="flex items-center gap-1 text-slate-600">
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
                            ) : (
                              <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-dashed border-slate-200 text-slate-500 text-[11px]">
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                                  No specific instructions attached to this cart yet.
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditInstructions(cart)}
                                  className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer text-[11px] flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  Add Instruction Note
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Cart Action Buttons (Right Column) */}
                          <div className="lg:col-span-4 flex flex-col gap-2 pt-1">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenApproveModal(cart)}
                                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer w-full justify-center"
                                >
                                  <Check className="w-4 h-4" />
                                  Approve {cart.cartType === 'direct' ? 'Direct' : 'Indirect'} Dispensation
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectModal(cart)}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg font-semibold text-xs cursor-pointer w-full justify-center flex items-center gap-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Reject Request
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <div className="text-center p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 w-full">
                                <div className="font-bold text-emerald-800 flex items-center justify-center gap-1 text-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Approved for Dispensing
                                </div>
                                <div className="text-[10px] text-emerald-700 mt-0.5">
                                  {cart.cartType === 'direct' ? 'Ready for OPD Take-Home' : 'Ready for Injection Room'}
                                </div>
                              </div>
                            )}

                            {(isDispensed || isAdministered) && (
                              <div className="text-center p-2.5 bg-slate-100 rounded-lg border border-slate-200 w-full">
                                <div className="font-bold text-slate-800 text-xs">
                                  {isDispensed ? 'Dispensed by Pharmacy' : 'Administered by Nursing'}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Transaction Completed
                                </div>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenEditInstructions(cart)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs cursor-pointer w-full justify-center flex items-center gap-1.5 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                              {cart.accountsNotes ? 'Edit Instructions' : 'Add Note to Pharmacy'}
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}

            {groupedCarts.length === 0 && (
              <div className="bg-slate-50 rounded-xl p-12 text-center text-slate-400">
                No pharmacy cart requests matching selected filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approve Dispensation Modal with Instructions to Pharmacy */}
      {approveModal.isOpen && approveModal.cart && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setApproveModal({ isOpen: false, cart: null, note: '', affordabilityAmount: 0 });
            }
          }}
        >
          <form 
            onSubmit={handleConfirmApprove} 
            className="bg-white rounded-xl max-w-lg w-full p-5 border border-slate-200 shadow-xl space-y-4 text-xs cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Approve Dispensation & Pharmacy Clearance
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Authorizes the Pharmacy dashboard to dispense medications
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApproveModal({ isOpen: false, cart: null, note: '', affordabilityAmount: 0 })}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart & Patient Details */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs">{approveModal.cart.patientName}</span>
                  <span className="text-slate-500 font-mono text-[11px] ml-1.5">MRN: {approveModal.cart.patientMrn}</span>
                  {approveModal.cart.insurancePolicyName && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      Tariff: {approveModal.cart.insurancePolicyName}
                    </span>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 font-mono text-slate-700">
                  {approveModal.cart.cartNumber}
                </span>
              </div>

              {/* Items summary */}
              <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/80">
                <div className="font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Prescribed Items ({approveModal.cart.items.length}):</span>
                  <span className="font-bold text-slate-900">
                    Total Value: {formatCurrency(approveModal.cart.totalSumCost || approveModal.cart.totalAmount || approveModal.cart.items.reduce((s, i) => s + (i.totalPrice || i.quantity * i.unitPrice), 0))}
                  </span>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                  {approveModal.cart.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded border border-slate-100">
                      <span className="font-medium text-slate-800 truncate max-w-[280px]">{it.itemName} ({it.dosage || it.unit})</span>
                      <span className="font-mono text-slate-600">Qty: {it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Approved / Cleared Amount */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Approved Financial Amount ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={approveModal.affordabilityAmount}
                onChange={(e) => setApproveModal({ ...approveModal, affordabilityAmount: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900"
                required
              />
            </div>

            {/* Instruction / Note to Pharmacist */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  Instructions & Clearance Note for Pharmacist *
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Sent to Pharmacy Dashboard</span>
              </div>
              <textarea
                value={approveModal.note}
                onChange={(e) => setApproveModal({ ...approveModal, note: e.target.value })}
                rows={3}
                placeholder="Enter specific instructions for the pharmacist (e.g. Payment cleared via Cash. Release full course of medication.)"
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                required
              />

              {/* Quick Preset Buttons */}
              <div className="mt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Quick Instruction Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Full cash payment cleared. Dispense all items.',
                    'Insurance clearance verified. Release full course.',
                    'Patient paid part payment. Dispense 5-day supply.',
                    'Cleared for immediate Injection Room administration.',
                    'Emergency waiver granted by Finance Manager.'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setApproveModal({ ...approveModal, note: preset })}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-slate-600 border border-slate-200 text-[10px] font-medium transition-colors cursor-pointer text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApproveModal({ isOpen: false, cart: null, note: '', affordabilityAmount: 0 })}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Approve Dispensation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.isOpen && rejectModal.cart && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRejectModal({ isOpen: false, cart: null, reason: '' });
            }
          }}
        >
          <form 
            onSubmit={handleConfirmReject} 
            className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4 text-xs cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 text-rose-600">
                <ShieldAlert className="w-4 h-4" />
                Reject Pharmacy Request
              </h3>
              <button
                type="button"
                onClick={() => setRejectModal({ isOpen: false, cart: null, reason: '' })}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-slate-600 mb-2">
                Rejecting request for <strong>{rejectModal.cart.patientName}</strong> ({rejectModal.cart.patientMrn}). The pharmacist will be notified with this reason.
              </p>

              <label className="block font-semibold text-slate-700 mb-1">Reason for Rejection *</label>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                rows={3}
                className="w-full p-2 border border-slate-300 rounded bg-white"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModal({ isOpen: false, cart: null, reason: '' })}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Accountant Instructions Modal */}
      {editInstructionsModal.isOpen && editInstructionsModal.cart && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditInstructionsModal({ isOpen: false, cart: null, note: '', reason: '' });
            }
          }}
        >
          <form 
            onSubmit={handleConfirmEditInstructions} 
            className="bg-white rounded-xl max-w-lg w-full p-5 border border-slate-200 shadow-xl space-y-4 text-xs cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Edit Clearance Instructions & Pharmacist Directives
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Updates will be timestamped and logged under your user profile: <strong>{currentUser.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditInstructionsModal({ isOpen: false, cart: null, note: '', reason: '' })}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart & Patient Context */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs">{editInstructionsModal.cart.patientName}</span>
                  <span className="text-slate-500 font-mono text-[11px] ml-1.5">MRN: {editInstructionsModal.cart.patientMrn}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 font-mono text-slate-700">
                  Cart #{editInstructionsModal.cart.cartNumber}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-600">
                <span>Items: <strong>{editInstructionsModal.cart.items.length}</strong></span>
                <span>&bull;</span>
                <span>Type: <strong>{editInstructionsModal.cart.cartType === 'direct' ? 'Direct (OPD Take-Home)' : 'Indirect (Injection Room)'}</strong></span>
                <span>&bull;</span>
                <span>Status: <strong className="capitalize">{editInstructionsModal.cart.accountsStatus || editInstructionsModal.cart.status}</strong></span>
              </div>
            </div>

            {/* Previous Instructions Notice if existing */}
            {editInstructionsModal.cart.accountsNotes && (
              <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200 text-slate-600 space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Current / Previous Instruction on Record:
                </div>
                <div className="text-slate-800 text-[11px] italic bg-white p-2 rounded border border-slate-200">
                  "{editInstructionsModal.cart.accountsNotes}"
                </div>
              </div>
            )}

            {/* New Instructions Note */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  Revised Instructions for Pharmacist *
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Visible to Pharmacy</span>
              </div>
              <textarea
                value={editInstructionsModal.note}
                onChange={(e) => setEditInstructionsModal({ ...editInstructionsModal, note: e.target.value })}
                rows={3}
                placeholder="Enter updated instructions for dispensing or injection administration..."
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-xs leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                required
              />

              {/* Quick Preset Buttons */}
              <div className="mt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Quick Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Full cash payment cleared. Dispense all items.',
                    'Insurance clearance verified. Release full course.',
                    'Patient paid part payment. Dispense 5-day supply.',
                    'Cleared for immediate Injection Room administration.',
                    'Emergency waiver granted by Finance Manager.'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditInstructionsModal({ ...editInstructionsModal, note: preset })}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300 text-slate-600 border border-slate-200 text-[10px] font-medium transition-colors cursor-pointer text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Reason for Editing */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Reason for Revision / Amendment (Audit Trail)
              </label>
              <input
                type="text"
                value={editInstructionsModal.reason}
                onChange={(e) => setEditInstructionsModal({ ...editInstructionsModal, reason: e.target.value })}
                placeholder="e.g. Patient cleared remaining balance at cash desk / Doctor amended prescription"
                className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-900"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditInstructionsModal({ isOpen: false, cart: null, note: '', reason: '' })}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Save & Update Instructions
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Revision History Modal */}
      {historyModal.isOpen && historyModal.cart && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setHistoryModal({ isOpen: false, cart: null });
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
                    Cart #{historyModal.cart.cartNumber} &bull; {historyModal.cart.patientName} (MRN: {historyModal.cart.patientMrn})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModal({ isOpen: false, cart: null })}
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
                  {historyModal.cart.accountsNotesEditedAt
                    ? new Date(historyModal.cart.accountsNotesEditedAt).toLocaleString()
                    : historyModal.cart.accountsApprovedAt
                    ? new Date(historyModal.cart.accountsApprovedAt).toLocaleString()
                    : 'Current'}
                </span>
              </div>
              <p className="text-xs text-emerald-950 font-medium leading-relaxed bg-white p-2.5 rounded border border-emerald-100">
                {historyModal.cart.accountsNotes || 'No instruction note recorded.'}
              </p>
              <div className="text-[10px] text-emerald-700 flex items-center justify-between">
                <span>Updated by: <strong>{historyModal.cart.accountsNotesEditedBy || historyModal.cart.accountsApprovedBy || historyModal.cart.accountsReviewedBy || 'Accounts'}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    const cart = historyModal.cart!;
                    setHistoryModal({ isOpen: false, cart: null });
                    handleOpenEditInstructions(cart);
                  }}
                  className="text-emerald-700 hover:underline font-bold cursor-pointer"
                >
                  Edit Again
                </button>
              </div>
            </div>

            {/* Timeline of Prior Versions */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Prior Revisions ({historyModal.cart.accountsNotesHistory?.length || 0})
              </div>

              {(!historyModal.cart.accountsNotesHistory || historyModal.cart.accountsNotesHistory.length === 0) ? (
                <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-400 text-xs">
                  No prior revisions logged. This is the first version of the instruction.
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
                  {historyModal.cart.accountsNotesHistory.map((rev, idx) => (
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
                        <p className="text-xs text-slate-800 bg-white p-2 rounded border border-slate-100 leading-relaxed">
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
                onClick={() => setHistoryModal({ isOpen: false, cart: null })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Patient Ledgers Directory & Consolidated Itemized Statements */}
      {activeTab === 'ledgers' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Consolidated Patient Account Ledgers
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {unifiedPatientLedgers.length} Patients
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                  {activeClinic.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Single unified ledger per patient showing all billed items, diagnostic tests, clinical procedures, medications, recorded payments with timestamps, and outstanding debt.
              </p>
            </div>
          </div>

          {/* Universal Sort & Filter Controls Toolbar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            {/* Primary Search & Sort Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Engine Input with Phone Number support */}
              <div className="relative flex-1 min-w-[280px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search patient name, MRN, phone #, ledger ID, department..."
                  value={ledgerSearchTerm}
                  onChange={(e) => setLedgerSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-2xs"
                />
                {ledgerSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setLedgerSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 font-bold text-xs"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Selector & Direction Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-bold text-slate-600">Sort:</span>
                  <select
                    value={ledgerSortKey}
                    onChange={(e) => setLedgerSortKey(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="date">Date & Activity</option>
                    <option value="patient">Patient Name (A-Z)</option>
                    <option value="debt">Outstanding Debt</option>
                    <option value="billed">Total Invoiced</option>
                    <option value="paid">Total Paid</option>
                    <option value="mrn">OPD / IPD #</option>
                    <option value="phone">Phone Number</option>
                    <option value="visits">Visit Count (Compound)</option>
                  </select>
                </div>

                {/* Order Direction Toggle */}
                <button
                  type="button"
                  onClick={() => setLedgerSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                  title={`Toggle sort order (currently ${ledgerSortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
                >
                  {ledgerSortOrder === 'asc' ? (
                    <>
                      <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Asc</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Desc</span>
                    </>
                  )}
                </button>

                {/* Reset Filters Button */}
                {isLedgerFilterActive && (
                  <button
                    type="button"
                    onClick={resetLedgerFilters}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                    title="Clear all active filters"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/70 text-[11px]">
              <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-400" />
                Status:
              </span>
              <button
                type="button"
                onClick={() => setLedgerStatusFilter('all')}
                className={`px-2.5 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                  ledgerStatusFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All ({unifiedPatientLedgers.length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerStatusFilter('debt')}
                className={`px-2.5 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                  ledgerStatusFilter === 'debt'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Outstanding Debt ({unifiedPatientLedgers.filter(l => l.balanceDue > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerStatusFilter('settled')}
                className={`px-2.5 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                  ledgerStatusFilter === 'settled'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Cleared / Settled ({unifiedPatientLedgers.filter(l => l.balanceDue <= 0 || l.status === 'settled').length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerStatusFilter('partially_paid')}
                className={`px-2.5 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                  ledgerStatusFilter === 'partially_paid'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                Partially Paid ({unifiedPatientLedgers.filter(l => l.status === 'partially_paid' || (l.totalPaid > 0 && l.balanceDue > 0)).length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerStatusFilter('unpaid')}
                className={`px-2.5 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] ${
                  ledgerStatusFilter === 'unpaid'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                Unpaid ({unifiedPatientLedgers.filter(l => l.status === 'pending_payment' && l.totalPaid === 0).length})
              </button>
            </div>

            {/* Secondary Filter Dropdowns & Pills Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
              <div className="flex flex-wrap items-center gap-2">
                {/* Admission Type Filter */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-0.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500">Care Type:</span>
                  <select
                    value={ledgerAdmissionTypeFilter}
                    onChange={(e) => setLedgerAdmissionTypeFilter(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-800 text-[11px] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Care Types</option>
                    <option value="OPD">OPD (Outpatient)</option>
                    <option value="IPD">IPD (Inpatient)</option>
                  </select>
                </div>

                {/* Ledger Structure Filter (Compound vs Single) */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-0.5 shadow-2xs">
                  <Layers className="w-3 h-3 text-purple-600" />
                  <span className="text-[10px] font-bold text-slate-500">Structure:</span>
                  <select
                    value={ledgerStructureFilter}
                    onChange={(e) => setLedgerStructureFilter(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-800 text-[11px] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Ledgers</option>
                    <option value="compound">Compound (Multi-Visit)</option>
                    <option value="single">Single Visit</option>
                  </select>
                </div>

                {/* Department Dropdown */}
                {availableDepartments.length > 0 && (
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-0.5 shadow-2xs">
                    <Building2 className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-500">Dept:</span>
                    <select
                      value={ledgerDepartmentFilter}
                      onChange={(e) => setLedgerDepartmentFilter(e.target.value)}
                      className="bg-transparent font-bold text-slate-800 text-[11px] focus:outline-none cursor-pointer max-w-[140px] truncate"
                    >
                      <option value="all">All Departments</option>
                      {availableDepartments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Ward Dropdown */}
                {availableWards.length > 0 && (
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-0.5 shadow-2xs">
                    <BedDouble className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-500">Ward:</span>
                    <select
                      value={ledgerWardFilter}
                      onChange={(e) => setLedgerWardFilter(e.target.value)}
                      className="bg-transparent font-bold text-slate-800 text-[11px] focus:outline-none cursor-pointer max-w-[130px] truncate"
                    >
                      <option value="all">All Wards</option>
                      {availableWards.map(ward => (
                        <option key={ward} value={ward}>{ward}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Insurance / Tariff Scheme */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-0.5 shadow-2xs">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span className="text-[10px] font-bold text-slate-500">Tariff:</span>
                  <select
                    value={ledgerInsuranceFilter}
                    onChange={(e) => setLedgerInsuranceFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 text-[11px] focus:outline-none cursor-pointer max-w-[140px] truncate"
                  >
                    <option value="all">All Schemes / Cash</option>
                    <option value="cash">Cash / Self-Pay Only</option>
                    <option value="insured">Insured Accounts Only</option>
                    {availableInsurances.map(ins => (
                      <option key={ins} value={ins}>{ins}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Result Counter & Financial Subtotals */}
              <div className="flex items-center gap-3 text-[10px] text-slate-500 ml-auto flex-wrap">
                <span>
                  Showing <strong className="text-slate-900 font-bold">{filteredLedgers.length}</strong> of{' '}
                  <strong className="text-slate-700">{unifiedPatientLedgers.length}</strong> ledgers
                </span>
                {isLedgerFilterActive && (
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[9px] border border-emerald-300">
                    Filters Applied
                  </span>
                )}
                <div className="h-3 w-px bg-slate-300 hidden sm:block"></div>
                <div className="flex items-center gap-2 font-mono">
                  <span title="Total Invoiced in Filtered Results">Inv: <strong className="text-slate-800">{formatCurrency(filteredTotals.billed)}</strong></span>
                  <span>&bull;</span>
                  <span title="Total Paid in Filtered Results">Paid: <strong className="text-emerald-700">{formatCurrency(filteredTotals.paid)}</strong></span>
                  <span>&bull;</span>
                  <span title="Total Debt in Filtered Results">Debt: <strong className="text-amber-700 font-bold">{formatCurrency(filteredTotals.debt)}</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredLedgers.map(l => {
              const clinic = clinics.find(c => c.id === l.clinicId);
              const pat = currentClinicPatients.find(p => p.id === l.patientId);
              const patientPhone = pat?.phone || l.patientPhone || '';
              const emergencyPhone = pat?.emergencyContact?.phone || '';
              const isExpanded = expandedLedgerPatientId === l.patientId;
              const hasDebt = l.balanceDue > 0;
              const latestDate = l.createdAt 
                ? new Date(l.createdAt) 
                : (l.items && l.items.length > 0 ? new Date(l.items[l.items.length - 1].date) : new Date());

              return (
                <div
                  key={l.id}
                  className={`border rounded-xl transition-all overflow-hidden ${
                    isExpanded
                      ? 'border-emerald-300 shadow-md ring-1 ring-emerald-400/50 bg-white'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {/* Ledger Summary Header Row */}
                  <div
                    onClick={() => setExpandedLedgerPatientId(isExpanded ? null : l.patientId)}
                    className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none bg-gradient-to-r from-slate-50/70 to-white hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {l.patientName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">{l.patientName}</span>
                          <span className="font-mono text-xs text-slate-500 font-semibold px-2 py-0.5 bg-white border border-slate-200 rounded">
                            {l.patientMrn}
                          </span>

                          {/* Patient Phone Number Badge with Search Visualizer */}
                          {patientPhone ? (
                            <span 
                              className="font-mono text-xs text-slate-700 font-semibold px-2 py-0.5 bg-slate-50 border border-slate-200 rounded flex items-center gap-1 hover:border-emerald-300 transition-colors" 
                              title={`Contact Phone: ${patientPhone}${emergencyPhone ? ` • ICE Contact: ${emergencyPhone}` : ''}`}
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{patientPhone}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded">
                              No Phone
                            </span>
                          )}

                          {/* Care Type Badge */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            pat?.patientType === 'IPD' || pat?.ward
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-sky-50 text-sky-800 border-sky-200'
                          }`}>
                            {pat?.patientType === 'IPD' || pat?.ward ? 'IPD Inpatient' : 'OPD Outpatient'}
                          </span>

                          {l.isCompoundLedger && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1 shadow-2xs">
                              <Layers className="w-3 h-3 text-purple-700" />
                              <span>Compound Ledger ({l.totalVisitsCount || l.registeredMrns?.length || 2} Visits)</span>
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            l.status === 'settled'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : l.status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}>
                            {l.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                          <span>Facility: <strong>{clinic?.name || activeClinic.name}</strong></span>
                          {pat?.department && (
                            <>
                              <span>&bull;</span>
                              <span className="bg-slate-100 px-1.5 py-0.2 rounded font-medium text-slate-700">
                                Dept: {pat.department}
                              </span>
                            </>
                          )}
                          {pat?.ward && (
                            <>
                              <span>&bull;</span>
                              <span className="bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded font-medium">
                                Ward: {pat.ward} {pat.bedNumber ? `• ${pat.bedNumber}` : ''}
                              </span>
                            </>
                          )}
                          {(pat?.insurancePolicyName || pat?.insuranceProvider) && (
                            <>
                              <span>&bull;</span>
                              <span className="bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.2 rounded font-medium">
                                {pat.insurancePolicyName || pat.insuranceProvider}
                              </span>
                            </>
                          )}
                          <span>&bull;</span>
                          <span>{l.items.length} Incurred Service{l.items.length === 1 ? '' : 's'}</span>
                          <span>&bull;</span>
                          <span>{l.transactions?.length || 0} Payment{l.transactions?.length === 1 ? '' : 's'}</span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {latestDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          {l.registeredMrns && l.registeredMrns.length > 1 && (
                            <>
                              <span>&bull;</span>
                              <span className="text-purple-800 font-mono text-[10px] bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                All MRNs: {l.registeredMrns.join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financial Numbers & Actions */}
                    <div className="flex items-center gap-5 shrink-0">
                      <div className="grid grid-cols-3 gap-3 text-right">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Invoiced</div>
                          <div className="text-xs font-bold text-slate-900 font-mono">{formatCurrency(l.totalBilled)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Paid</div>
                          <div className="text-xs font-bold text-emerald-700 font-mono">{formatCurrency(l.totalPaid)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Patient Debt</div>
                          <div className={`text-xs font-black font-mono ${hasDebt ? 'text-amber-700' : 'text-slate-700'}`}>
                            {formatCurrency(l.balanceDue)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatientId(l.patientId);
                            setActiveTab('settlement');
                          }}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Pay
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintModal({ isOpen: true, type: 'ledger', data: l })}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold cursor-pointer flex items-center gap-1"
                          title="Print official ledger statement"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          Statement
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedLedgerPatientId(isExpanded ? null : l.patientId)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Itemized Statement View - Date-Separated & Bank Statement Selectable */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-4">
                      
                      {/* Compound Multi-Visit Ledger Banner */}
                      {l.isCompoundLedger && (
                        <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-purple-950">
                          <div className="flex items-center gap-2.5">
                            <Layers className="w-5 h-5 text-purple-700 shrink-0" />
                            <div>
                              <div className="font-bold">
                                Compound Patient Ledger &bull; Aggregating All {l.totalVisitsCount || l.registeredMrns?.length || 2} Registered Visits
                              </div>
                              <div className="text-[11px] text-purple-800">
                                This single continuous ledger accounts for all charges, lab tests, prescriptions, bed transfers, and payments across all visits.
                              </div>
                            </div>
                          </div>
                          {l.registeredMrns && (
                            <div className="text-right shrink-0">
                              <span className="text-[10px] uppercase font-bold text-purple-600 block">Registered MRN Trail</span>
                              <span className="font-mono font-bold text-xs text-purple-900">{l.registeredMrns.join(' • ')}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Financial KPI Banner */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-2xs">
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Total Charges Incurred</span>
                          <div className="text-base font-black text-slate-900 font-mono mt-0.5">${l.totalBilled.toFixed(2)}</div>
                          <span className="text-[10px] text-slate-400">{l.items.length} billable items</span>
                        </div>
                        <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-100">
                          <span className="text-[10px] text-emerald-800 font-bold uppercase">Total Amount Paid</span>
                          <div className="text-base font-black text-emerald-700 font-mono mt-0.5">${l.totalPaid.toFixed(2)}</div>
                          <span className="text-[10px] text-emerald-600 font-medium">{l.transactions?.length || 0} payment receipts</span>
                        </div>
                        <div className={`p-2 rounded-lg border ${hasDebt ? 'bg-amber-50/80 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                          <span className="text-[10px] text-amber-900 font-black uppercase">Outstanding Debt (Balance)</span>
                          <div className={`text-base font-black font-mono mt-0.5 ${hasDebt ? 'text-amber-700' : 'text-slate-700'}`}>
                            ${l.balanceDue.toFixed(2)}
                          </div>
                          <span className="text-[10px] text-slate-500">{hasDebt ? 'Payment Pending' : 'Account Cleared'}</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Account Clearance Status</span>
                          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-[11px] font-black uppercase ${
                            l.status === 'settled'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : l.status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}>
                            {l.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Date-Separated Historical Transactions & Bank Statement Selector */}
                      <PatientLedgerStatementSection
                        ledger={l}
                        pharmacyCarts={currentClinicPharmacyCarts}
                        onPrintStatement={(statementData) => setPrintModal({ isOpen: true, type: 'ledger', data: statementData })}
                        onPrintReceipt={(txn) => setPrintModal({ isOpen: true, type: 'receipt', data: txn })}
                        onNavigateToSettlement={(patientId) => {
                          setSelectedPatientId(patientId);
                          setActiveTab('settlement');
                        }}
                      />

                    </div>
                  )}
                </div>
              );
            })}

            {filteredLedgers.length === 0 && (
              <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200 space-y-3">
                <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-700 text-sm">No Patient Account Ledgers Found</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No patient accounts match your search query {ledgerSearchTerm ? `"${ledgerSearchTerm}"` : ''} or the selected filter criteria.
                </p>
                {isLedgerFilterActive && (
                  <button
                    type="button"
                    onClick={resetLedgerFilters}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Settlement Counter with Itemized Billable Item Selection */}
      {activeTab === 'settlement' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          
          {/* Patient Selector & Itemized Debt Breakdown */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Select Patient Account for Billing Settlement
                </h3>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Patient from Current Clinic</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded bg-white text-xs font-semibold"
                >
                  {[...currentClinicPatients]
                    .sort((a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime())
                    .map(p => {
                      const pLedger = getPatientLedger(p.id);
                      const bal = pLedger ? pLedger.balanceDue : 0;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} &bull; {p.mrn} {p.phone ? `• Tel: ${p.phone} ` : ''}&bull; {p.patientType || 'OPD'} {bal > 0 ? `(Debt: $${bal.toFixed(2)})` : '(Cleared)'}
                        </option>
                      );
                    })}
                </select>
              </div>

              {activeLedger && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-slate-900">{activeLedger.patientName}</span>
                      <span className="text-slate-500 font-mono text-xs ml-2">({activeLedger.patientMrn})</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                      activeLedger.status === 'settled' ? 'bg-emerald-100 text-emerald-800' : activeLedger.status === 'partially_paid' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {activeLedger.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-center">
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Invoiced</span>
                      <div className="text-sm font-bold text-slate-900">${activeLedger.totalBilled.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Paid</span>
                      <div className="text-sm font-bold text-emerald-700">${activeLedger.totalPaid.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Outstanding Debt</span>
                      <div className={`text-sm font-black ${activeLedger.balanceDue > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                        ${activeLedger.balanceDue.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card: Add Other Charges & Service Fees to Patient's Bill */}
              {selectedPatient && (
                <div className="bg-gradient-to-br from-indigo-50/80 via-sky-50/40 to-slate-50 rounded-xl border border-indigo-200 p-4 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                        <PlusCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                          Add Other Charges to Patient's Bill & Ledger
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Manually bill consultation, registration, admission, medical certificates, or custom fees
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddingNewMasterCharge(!isAddingNewMasterCharge)}
                      className="px-2.5 py-1 rounded bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      {isAddingNewMasterCharge ? 'Close Catalog Editor' : 'Define New Charge in Catalog'}
                    </button>
                  </div>

                  {otherChargeSuccessMessage && (
                    <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{otherChargeSuccessMessage}</span>
                    </div>
                  )}

                  {/* Form: Inline Quick Add New Charge to Master Catalog */}
                  {isAddingNewMasterCharge && (
                    <form onSubmit={handleSaveNewCatalogCharge} className="p-3 bg-white rounded-lg border border-indigo-200 space-y-2.5 shadow-2xs">
                      <div className="font-bold text-[11px] text-indigo-900 flex items-center justify-between">
                        <span>Define New Standard Charge in Clinic Master Catalog</span>
                        <span className="text-[10px] text-slate-400 font-normal">Saves description & cost permanently</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Charge Description *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Doctor Follow-up Consultation, File Reopening"
                            value={newCatalogCharge.description}
                            onChange={(e) => setNewCatalogCharge({ ...newCatalogCharge, description: e.target.value })}
                            className="w-full p-2 text-xs border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Standard Cost ($) *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.50"
                            placeholder="0.00"
                            value={newCatalogCharge.cost || ''}
                            onChange={(e) => setNewCatalogCharge({ ...newCatalogCharge, cost: parseFloat(e.target.value) || 0 })}
                            className="w-full p-2 text-xs border border-slate-300 rounded bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Department</label>
                          <select
                            value={newCatalogCharge.department}
                            onChange={(e) => setNewCatalogCharge({ ...newCatalogCharge, department: e.target.value as any })}
                            className="w-full p-2 text-xs border border-slate-300 rounded bg-white font-semibold"
                          >
                            <option value="Consultation">Consultation</option>
                            <option value="Registration">Registration</option>
                            <option value="Nursing">Nursing</option>
                            <option value="Procedure">Procedure</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      {/* Insurance Tariff Schemes for Inline Add */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <label className="font-bold text-slate-800 text-[10px] uppercase tracking-wide flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                            Insurance Tariff Schemes
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const newPrices: Record<string, number> = {};
                                availableInsurancePolicies.forEach(p => {
                                  newPrices[p.name] = Number(newCatalogCharge.cost || 0);
                                });
                                setNewChargeInsurancePrices(newPrices);
                              }}
                              className="px-1.5 py-0.5 text-[9px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 cursor-pointer"
                            >
                              Match
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newPrices: Record<string, number> = {};
                                availableInsurancePolicies.forEach(p => {
                                  newPrices[p.name] = Math.round((Number(newCatalogCharge.cost || 0) * 1.10) * 100) / 100;
                                });
                                setNewChargeInsurancePrices(newPrices);
                              }}
                              className="px-1.5 py-0.5 text-[9px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded border border-indigo-200 cursor-pointer"
                            >
                              +10%
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newPrices: Record<string, number> = {};
                                availableInsurancePolicies.forEach(p => {
                                  newPrices[p.name] = Math.round((Number(newCatalogCharge.cost || 0) * 1.20) * 100) / 100;
                                });
                                setNewChargeInsurancePrices(newPrices);
                              }}
                              className="px-1.5 py-0.5 text-[9px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded border border-indigo-200 cursor-pointer"
                            >
                              +20%
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewChargeInsurancePrices({})}
                              className="px-1.5 py-0.5 text-[9px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        {availableInsurancePolicies.length > 0 && (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                            {availableInsurancePolicies.map(policy => {
                              const hasCustom = newChargeInsurancePrices[policy.name] !== undefined;
                              const currentVal = hasCustom ? newChargeInsurancePrices[policy.name] : '';

                              return (
                                <div key={policy.id} className="bg-slate-50/70 p-1.5 rounded border border-slate-200 flex items-center justify-between gap-1.5 text-[11px]">
                                  <span className="font-semibold text-slate-800 truncate" title={policy.name}>
                                    {policy.name}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <div className="relative w-20">
                                      <span className="absolute left-1.5 top-1 text-[10px] text-slate-400 font-bold">{currencySymbol}</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder={`${Number(newCatalogCharge.cost || 0).toFixed(2)}`}
                                        value={currentVal}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setNewChargeInsurancePrices(prev => {
                                            const updated = { ...prev };
                                            if (val === '') {
                                              delete updated[policy.name];
                                            } else {
                                              updated[policy.name] = Number(val);
                                            }
                                            return updated;
                                          });
                                        }}
                                        className="w-full pl-4 pr-1 py-0.5 text-[11px] border border-slate-300 rounded font-semibold text-slate-900 bg-white"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewChargeInsurancePrices(prev => ({
                                          ...prev,
                                          [policy.name]: Number(newCatalogCharge.cost || 0)
                                        }));
                                      }}
                                      className="px-1.5 py-0.5 text-[9px] font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 cursor-pointer"
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
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingNewMasterCharge(false)}
                          className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Save Charge & Select
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Insurance Policy Active Banner */}
                  {selectedPatient?.insurancePolicyName && (
                    <div className="mb-3 p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-medium">
                        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Insured Patient Tariff Active: <strong>{selectedPatient.insurancePolicyName}</strong></span>
                      </div>
                      <span className="text-[10px] text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded font-bold">
                        Tariff Rate Auto-Populated
                      </span>
                    </div>
                  )}

                  {/* Form: Select Other Charge and Add to Bill */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    {/* Dropdown Menu to Select the Other Charge */}
                    <div className="sm:col-span-6">
                      <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                        Select Other Charge / Fee from Dropdown Menu *
                      </label>
                      <select
                        value={selectedOtherChargeId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedOtherChargeId(val);
                          const found = currentClinicOtherCharges.find(c => c.id === val);
                          if (found) {
                            const policy = selectedPatient?.insurancePolicyName;
                            const eff = getOtherChargeCost(found, policy);
                            setOtherChargeCustomCost(eff);
                          } else {
                            setOtherChargeCustomCost(null);
                          }
                        }}
                        className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Choose Other Charge (Description & Cost) --</option>
                        {currentClinicOtherCharges.map(charge => {
                          const policy = selectedPatient?.insurancePolicyName;
                          const eff = getOtherChargeCost(charge, policy);
                          const isSpecial = Boolean(policy && eff !== charge.cost);
                          return (
                            <option key={charge.id} value={charge.id}>
                              [{charge.department || 'Other'}] {charge.description} — {formatCurrency(eff)}
                              {isSpecial ? ` (${policy} Tariff, Standard: ${formatCurrency(charge.cost)})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Unit Cost (Adjustable) */}
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                        Unit Cost ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.50"
                        placeholder="0.00"
                        value={otherChargeCustomCost !== null ? otherChargeCustomCost : ''}
                        onChange={(e) => setOtherChargeCustomCost(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={otherChargeQty}
                        onChange={(e) => setOtherChargeQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                      />
                    </div>

                    {/* Add to Bill Button */}
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        disabled={!selectedOtherChargeId}
                        onClick={handleAddOtherChargeToBill}
                        className={`w-full p-2.5 rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors ${
                          selectedOtherChargeId
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        Add to Bill
                      </button>
                    </div>
                  </div>

                  {/* Live Calculation Preview when item selected */}
                  {selectedOtherChargeId && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-100/70 rounded-lg text-[11px] text-indigo-950 font-medium">
                      <span>
                        Selected: <strong>{currentClinicOtherCharges.find(c => c.id === selectedOtherChargeId)?.description}</strong>
                      </span>
                      <span>
                        Total Calculation: {otherChargeQty} &times; {formatCurrency(otherChargeCustomCost ?? currentClinicOtherCharges.find(c => c.id === selectedOtherChargeId)?.cost ?? 0)} = <strong className="text-indigo-900 font-mono text-xs">{formatCurrency((otherChargeCustomCost ?? currentClinicOtherCharges.find(c => c.id === selectedOtherChargeId)?.cost ?? 0) * otherChargeQty)}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Billable Item Selection Dropdown & Controls */}
              {activeLedger && (
                <div className="space-y-3 pt-1">
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-700" />
                        What is the Client Paying For? (Select Debt Item or Category)
                      </label>
                      <span className="text-[11px] font-semibold text-emerald-800">
                        {selectedDebtItemIds.size} of {unpaidItems.length} Debt Item(s) Selected
                      </span>
                    </div>

                    <select
                      value={selectedPaymentOption}
                      onChange={(e) => handlePaymentOptionChange(e.target.value)}
                      className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    >
                      <option value="all">
                        🌟 All Outstanding Patient Debt ({formatCurrency(unpaidItems.reduce((s, i) => s + (i.balanceDue ?? i.totalAmount), 0))} • {unpaidItems.length} items)
                      </option>

                      {unpaidLabTests.length > 0 && (
                        <optgroup label="🔬 Diagnostic Laboratory & Pathology Tests">
                          <option value="tests_all">
                            All Diagnostic Lab Tests ({formatCurrency(unpaidLabTests.reduce((s, i) => s + (i.balanceDue ?? i.totalAmount), 0))} • {unpaidLabTests.length} tests)
                          </option>
                          {unpaidLabTests.map(t => (
                            <option key={t.id} value={`item_${t.id}`}>
                              &nbsp;&nbsp;• [Lab] {t.description} ({formatCurrency(t.balanceDue ?? t.totalAmount)})
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {unpaidRadiology.length > 0 && (
                        <optgroup label="☢️ Radiology & Diagnostic Imaging Scans">
                          <option value="rad_all">
                            All Radiology & Imaging Scans ({formatCurrency(unpaidRadiology.reduce((s, i) => s + (i.balanceDue ?? i.totalAmount), 0))} • {unpaidRadiology.length} scans)
                          </option>
                          {unpaidRadiology.map(r => (
                            <option key={r.id} value={`item_${r.id}`}>
                              &nbsp;&nbsp;• [Scan] {r.description} ({formatCurrency(r.balanceDue ?? r.totalAmount)})
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {unpaidCartsList.length > 0 && (
                        <optgroup label="💊 Pharmacy Medication Carts (Direct & Indirect)">
                          <option value="carts_all">
                            All Pharmacy Medication Carts ({formatCurrency(unpaidPharmacy.reduce((s, i) => s + (i.balanceDue ?? i.totalAmount), 0))} • {unpaidPharmacy.length} medications)
                          </option>
                          {unpaidCartsList.map(c => (
                            <option key={c.cartId} value={`cart_${c.cartId}`}>
                              &nbsp;&nbsp;• Pharmacy Cart #{c.cartNumber} ({c.cartType.toUpperCase()}) — {formatCurrency(c.total)} ({c.items.length} items)
                            </option>
                          ))}
                          {unpaidPharmacy.map(med => (
                            <option key={med.id} value={`item_${med.id}`}>
                              &nbsp;&nbsp;&nbsp;&nbsp;› [Med] {med.description} ({formatCurrency(med.balanceDue ?? med.totalAmount)})
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {unpaidProcedures.length > 0 && (
                        <optgroup label="🩺 Doctor Consultations & Clinical Procedures">
                          <option value="procedures_all">
                            All Consultations & Procedures ({formatCurrency(unpaidProcedures.reduce((s, i) => s + (i.balanceDue ?? i.totalAmount), 0))} • {unpaidProcedures.length} items)
                          </option>
                          {unpaidProcedures.map(proc => (
                            <option key={proc.id} value={`item_${proc.id}`}>
                              &nbsp;&nbsp;• [{proc.department}] {proc.description} ({formatCurrency(proc.balanceDue ?? proc.totalAmount)})
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {unpaidNursing.length > 0 && (
                        <optgroup label="💉 Ward Care & Nursing Consumables">
                          <option value="nursing_all">
                            All Nursing Administration & Consumables ({formatCurrency(unpaidNursing.reduce((s, i) => s + (i.balanceDue ?? i.totalAmount), 0))})
                          </option>
                          {unpaidNursing.map(n => (
                            <option key={n.id} value={`item_${n.id}`}>
                              &nbsp;&nbsp;• [{n.department}] {n.description} ({formatCurrency(n.balanceDue ?? n.totalAmount)})
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {unpaidOtherCharges.length > 0 && (
                        <optgroup label="📋 Other Hospital Fees & Administrative Charges">
                          <option value="other_all">
                            All Other Charges & Consultation/Registration ({formatCurrency(unpaidOtherCharges.reduce((s, i) => s + (i.balanceDue ?? i.totalAmount), 0))} • {unpaidOtherCharges.length} items)
                          </option>
                          {unpaidOtherCharges.map(o => (
                            <option key={o.id} value={`item_${o.id}`}>
                              &nbsp;&nbsp;• [{o.department}] {o.description} ({formatCurrency(o.balanceDue ?? o.totalAmount)})
                            </option>
                          ))}
                        </optgroup>
                      )}

                      <option value="custom">
                        ☑️ Custom Individual Item Checkbox Selection
                      </option>
                    </select>

                    {/* Quick Selection Shortcuts */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSelectAllUnpaid}
                        className="px-2.5 py-1 rounded bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-[11px] shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <CheckSquare className="w-3 h-3 text-emerald-600" />
                        Select All ({unpaidItems.length})
                      </button>

                      {unpaidLabTests.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handlePaymentOptionChange('tests_all')}
                          className="px-2.5 py-1 rounded bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-semibold text-[11px] shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <Activity className="w-3 h-3 text-amber-600" />
                          Lab Tests ({unpaidLabTests.length})
                        </button>
                      )}

                      {unpaidPharmacy.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handlePaymentOptionChange('carts_all')}
                          className="px-2.5 py-1 rounded bg-white hover:bg-purple-50 text-purple-900 border border-purple-300 font-semibold text-[11px] shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <Pill className="w-3 h-3 text-purple-600" />
                          Pharmacy Carts ({unpaidPharmacy.length})
                        </button>
                      )}

                      {unpaidOtherCharges.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handlePaymentOptionChange('other_all')}
                          className="px-2.5 py-1 rounded bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-300 font-semibold text-[11px] shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <ListPlus className="w-3 h-3 text-indigo-600" />
                          Other Charges ({unpaidOtherCharges.length})
                        </button>
                      )}

                      {unpaidProcedures.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handlePaymentOptionChange('procedures_all')}
                          className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 font-semibold text-[11px] shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <Stethoscope className="w-3 h-3 text-blue-600" />
                          Procedures ({unpaidProcedures.length})
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleClearUnpaidSelection}
                        className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 font-semibold text-[11px] shadow-2xs cursor-pointer ml-auto"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>

                  {/* Filter View Selector: Unpaid Debt vs Paid Services */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSettlementViewFilter('unpaid')}
                        className={`px-3 py-1 rounded-md font-bold text-xs cursor-pointer transition-all ${
                          settlementViewFilter === 'unpaid'
                            ? 'bg-white text-rose-800 shadow-2xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🔴 Outstanding Debt Items ({unpaidItems.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettlementViewFilter('paid')}
                        className={`px-3 py-1 rounded-md font-bold text-xs cursor-pointer transition-all ${
                          settlementViewFilter === 'paid'
                            ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🟢 Settled & Paid Items ({paidItems.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettlementViewFilter('all')}
                        className={`px-3 py-1 rounded-md font-bold text-xs cursor-pointer transition-all ${
                          settlementViewFilter === 'all'
                            ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All Services ({activeLedger.items.length})
                      </button>
                    </div>
                  </div>

                  {/* 1. Unpaid Debt Billable Items List */}
                  {(settlementViewFilter === 'unpaid' || settlementViewFilter === 'all') && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-slate-700 font-bold text-xs px-1">
                        <span>Unpaid Billable Items (Check items to allocate payment)</span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          Click row or checkbox to toggle
                        </span>
                      </div>

                      {unpaidItems.length === 0 ? (
                        <div className="p-6 bg-emerald-50/60 rounded-xl border border-emerald-200 text-center text-emerald-800">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
                          <div className="font-bold text-sm">All Patient Account Charges are Fully Cleared!</div>
                          <div className="text-[11px] text-emerald-700 mt-0.5">No outstanding unpaid debts for this patient.</div>
                        </div>
                      ) : (
                        <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-2xs">
                          {unpaidItems.map(item => {
                            const isSelected = selectedDebtItemIds.has(item.id);
                            const itemDue = item.balanceDue ?? item.totalAmount;
                            const isCartItem = item.description.includes('[Cart #');

                            return (
                              <div
                                key={item.id}
                                onClick={() => toggleDebtItemSelection(item.id)}
                                className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                  isSelected ? 'bg-emerald-50/60 border-l-4 border-l-emerald-600' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleDebtItemSelection(item.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                  />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        item.department === 'Pharmacy'
                                          ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                          : item.department === 'Pathology'
                                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                          : item.department === 'Radiology'
                                          ? 'bg-cyan-100 text-cyan-900 border border-cyan-200'
                                          : item.department === 'Consultation'
                                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                          : item.department === 'Nursing'
                                          ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                          : 'bg-slate-100 text-slate-800 border border-slate-200'
                                      }`}>
                                        {item.department}
                                      </span>
                                      <span className="font-bold text-slate-900 text-xs">{item.description}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                                      <span>Date: {item.date}</span>
                                      <span>&bull;</span>
                                      <span>Qty: {item.quantity}</span>
                                      <span>&bull;</span>
                                      <span>Rate: {formatCurrency(item.unitPrice)}</span>
                                      {isCartItem && (
                                        <>
                                          <span>&bull;</span>
                                          <span className="text-purple-700 font-semibold flex items-center gap-0.5">
                                            <Pill className="w-2.5 h-2.5" /> Cart Med
                                          </span>
                                        </>
                                      )}
                                      {item.status === 'partially_paid' && (
                                        <>
                                          <span>&bull;</span>
                                          <span className="text-amber-700 font-bold">
                                            Paid: {formatCurrency(item.amountPaid || 0)}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right whitespace-nowrap flex flex-col items-end gap-1">
                                  <div className="font-mono font-black text-rose-700 text-sm">
                                    Due: {formatCurrency(itemDue)}
                                  </div>
                                  {isSelected ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                                      ✓ Selected to Settle
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPaymentOption(`item_${item.id}`);
                                        selectItemsForOption(`item_${item.id}`);
                                      }}
                                      className="text-[10px] text-slate-600 hover:text-emerald-700 underline font-medium cursor-pointer"
                                    >
                                      Pay only this
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Settled & Paid Services List */}
                  {(settlementViewFilter === 'paid' || settlementViewFilter === 'all') && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-slate-700 font-bold text-xs px-1">
                        <span>Settled Services & Verified Payments ({paidItems.length})</span>
                      </div>

                      {paidItems.length === 0 ? (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400">
                          No paid or cleared services recorded yet for this patient account.
                        </div>
                      ) : (
                        <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-2xs">
                          {paidItems.map(item => (
                            <div key={item.id} className="p-2.5 flex items-center justify-between text-[11px] bg-slate-50/40">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {item.department}
                                </span>
                                <div>
                                  <div className="font-semibold text-slate-900">{item.description}</div>
                                  <div className="text-[10px] text-slate-500">
                                    {item.date} &bull; Qty: {item.quantity} &bull; Total: {formatCurrency(item.totalAmount)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                  PAID ({formatCurrency(item.totalAmount)})
                                </span>
                                {item.paidReceiptNumber && (
                                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                    Receipt: {item.paidReceiptNumber}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>

          {/* Payment Processing Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Collect & Settle Payment
            </h3>

            {/* Quick Selection Summary Box */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Payment Allocation Target</div>
              <div className="font-bold text-xs text-slate-900 truncate">
                {selectedPaymentOption === 'all'
                  ? 'All Outstanding Patient Debt'
                  : selectedPaymentOption === 'tests_all'
                  ? 'All Diagnostic Lab Tests'
                  : selectedPaymentOption === 'rad_all'
                  ? 'All Radiology & Imaging Scans'
                  : selectedPaymentOption === 'carts_all'
                  ? 'All Pharmacy Medication Carts'
                  : selectedPaymentOption.startsWith('cart_')
                  ? 'Specific Pharmacy Medication Cart'
                  : selectedPaymentOption === 'procedures_all'
                  ? 'All Clinical Procedures & Consultation'
                  : selectedPaymentOption.startsWith('item_')
                  ? 'Specific Billable Service Item'
                  : `${selectedDebtItemIds.size} Custom Selected Debt Item(s)`}
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[11px]">
                <span className="text-slate-600">Selected Subtotal:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatCurrency(unpaidItems.filter(i => selectedDebtItemIds.has(i.id)).reduce((s, i) => s + (i.balanceDue ?? i.totalAmount), 0))}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-600">Debt Remaining After:</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatCurrency(Math.max(0, (activeLedger?.balanceDue || 0) - (payForm.amount || 0)))}
                </span>
              </div>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Amount to Pay ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={activeLedger?.balanceDue || 99999}
                  value={payForm.amount || ''}
                  onChange={(e) => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })}
                  placeholder={`Balance: ${formatCurrency(activeLedger?.balanceDue || 0)}`}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-base font-black font-mono text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={payForm.paymentMethod}
                  onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value as any })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                >
                  <option value="Cash">Cash Currency</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Mobile_Money">Mobile Money (M-Pesa, Airtel Money, etc.)</option>
                  <option value="Insurance">Insurance Clearance</option>
                  <option value="Bank_Transfer">Bank Wire Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Receipt / Trans Ref (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TXN-89318, MPESA-QW90"
                  value={payForm.reference}
                  onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                >
                </input>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Finance & Itemization Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Full settlement / Lab tests cleared"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center justify-center gap-2 mt-4 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                Process & Print Official Receipt
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Tab: Other Charges & Fee Master Catalog */}
      {activeTab === 'other_charges' && (
        <div className="space-y-6 text-xs">
          {/* Header Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs">
                  <ListPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    Other Charges & Fee Master Catalog
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define and manage standard hospital fees (Consultations, Registrations, Admission & Bed charges, Certificates, Consumables) available at the billing counter.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-xs">
                  {currentClinicOtherCharges.length} Standard Fees Configured
                </span>
                <button
                  onClick={() => {
                    setActiveTab('settlement');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Go to Billing Counter
                </button>
              </div>
            </div>

            {/* Policy Info Notice */}
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Manual Billing Policy:</strong> Automatic consultation and registration charges are disabled across the system. Accountants have manual control to select and bill these items on-demand under the <strong>Billing Counter & Payment Settlement</strong> tab.
              </span>
            </div>

            {/* Form: Add New Master Charge */}
            <form onSubmit={handleSaveNewCatalogCharge} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <FolderPlus className="w-4 h-4 text-indigo-600" />
                <span>Define New Charge in Master Catalog (Description & Cost)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Charge Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Doctor Consultation Fee, Medical Certificate, Admission Fee"
                    value={newCatalogCharge.description}
                    onChange={(e) => setNewCatalogCharge({ ...newCatalogCharge, description: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Standard Cost ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.50"
                    placeholder="0.00"
                    value={newCatalogCharge.cost || ''}
                    onChange={(e) => setNewCatalogCharge({ ...newCatalogCharge, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={newCatalogCharge.department}
                    onChange={(e) => setNewCatalogCharge({ ...newCatalogCharge, department: e.target.value as any })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Registration">Registration</option>
                    <option value="Nursing">Nursing</option>
                    <option value="Procedure">Procedure</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Insurance Company Selling Prices (Differential Tariffs) */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      Insurance Tariff Schemes
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Set custom selling rates for insurance payers. Unconfigured payers bill at standard cost ({formatCurrency(Number(newCatalogCharge.cost || 0))}).
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const newPrices: Record<string, number> = {};
                        availableInsurancePolicies.forEach(p => {
                          newPrices[p.name] = Number(newCatalogCharge.cost || 0);
                        });
                        setNewChargeInsurancePrices(newPrices);
                      }}
                      className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors cursor-pointer"
                      title="Set all policies to standard cost"
                    >
                      Match Fee
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newPrices: Record<string, number> = {};
                        availableInsurancePolicies.forEach(p => {
                          newPrices[p.name] = Math.round((Number(newCatalogCharge.cost || 0) * 1.10) * 100) / 100;
                        });
                        setNewChargeInsurancePrices(newPrices);
                      }}
                      className="px-2 py-1 text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded border border-indigo-200 transition-colors cursor-pointer"
                    >
                      +10%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newPrices: Record<string, number> = {};
                        availableInsurancePolicies.forEach(p => {
                          newPrices[p.name] = Math.round((Number(newCatalogCharge.cost || 0) * 1.20) * 100) / 100;
                        });
                        setNewChargeInsurancePrices(newPrices);
                      }}
                      className="px-2 py-1 text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded border border-indigo-200 transition-colors cursor-pointer"
                    >
                      +20%
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewChargeInsurancePrices({})}
                      className="px-2 py-1 text-[10px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {availableInsurancePolicies.length === 0 ? (
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-500 text-center">
                    No active insurance policies registered for this clinic.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {availableInsurancePolicies.map(policy => {
                      const hasCustom = newChargeInsurancePrices[policy.name] !== undefined;
                      const currentVal = hasCustom ? newChargeInsurancePrices[policy.name] : '';

                      return (
                        <div key={policy.id} className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
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
                              <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-bold">{currencySymbol}</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder={`${Number(newCatalogCharge.cost || 0).toFixed(2)}`}
                                value={currentVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewChargeInsurancePrices(prev => {
                                    const updated = { ...prev };
                                    if (val === '') {
                                      delete updated[policy.name];
                                    } else {
                                      updated[policy.name] = Number(val);
                                    }
                                    return updated;
                                  });
                                }}
                                className="w-full pl-5 pr-1.5 py-1 text-xs border border-slate-300 rounded font-semibold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setNewChargeInsurancePrices(prev => ({
                                  ...prev,
                                  [policy.name]: Number(newCatalogCharge.cost || 0)
                                }));
                              }}
                              className="px-2 py-1 text-[10px] font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-200 cursor-pointer"
                              title="Set to standard cost"
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

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Charge to Master Catalog
                </button>
              </div>
            </form>

            {/* Search & Category Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {['all', 'Consultation', 'Registration', 'Nursing', 'Procedure', 'Other'].map(dep => (
                  <button
                    key={dep}
                    type="button"
                    onClick={() => setCatalogCategoryFilter(dep)}
                    className={`px-3 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                      catalogCategoryFilter === dep
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {dep === 'all' ? 'All Departments' : dep}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-500">
                Showing{' '}
                <span className="font-bold text-slate-800">
                  {currentClinicOtherCharges.filter(c => catalogCategoryFilter === 'all' || c.department === catalogCategoryFilter).length}
                </span>{' '}
                catalog fee items
              </div>
            </div>

            {/* Catalog Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left divide-y divide-slate-200">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Standard Cost ({currencySymbol})</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {currentClinicOtherCharges
                    .filter(c => catalogCategoryFilter === 'all' || c.department === catalogCategoryFilter)
                    .map(charge => {
                      const isEditing = editingChargeId === charge.id;

                      if (isEditing) {
                        return (
                          <tr key={charge.id} className="bg-indigo-50/50">
                            <td className="py-2.5 px-4">
                              <input
                                type="text"
                                value={editCatalogCharge.description}
                                onChange={(e) => setEditCatalogCharge({ ...editCatalogCharge, description: e.target.value })}
                                className="w-full p-1.5 text-xs border border-indigo-300 rounded bg-white"
                              />
                            </td>
                            <td className="py-2.5 px-4">
                              <select
                                value={editCatalogCharge.department}
                                onChange={(e) => setEditCatalogCharge({ ...editCatalogCharge, department: e.target.value as any })}
                                className="p-1.5 text-xs border border-indigo-300 rounded bg-white"
                              >
                                <option value="Consultation">Consultation</option>
                                <option value="Registration">Registration</option>
                                <option value="Nursing">Nursing</option>
                                <option value="Procedure">Procedure</option>
                                <option value="Other">Other</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-4">
                              <input
                                type="text"
                                value={editCatalogCharge.category}
                                onChange={(e) => setEditCatalogCharge({ ...editCatalogCharge, category: e.target.value })}
                                className="w-full p-1.5 text-xs border border-indigo-300 rounded bg-white"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.50"
                                value={editCatalogCharge.cost}
                                onChange={(e) => setEditCatalogCharge({ ...editCatalogCharge, cost: parseFloat(e.target.value) || 0 })}
                                className="w-24 p-1.5 text-xs border border-indigo-300 rounded bg-white font-mono text-right font-bold"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditCatalogCharge(charge.id)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingChargeId(null)}
                                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={charge.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {charge.description}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              charge.department === 'Consultation' ? 'bg-blue-100 text-blue-800' :
                              charge.department === 'Registration' ? 'bg-amber-100 text-amber-800' :
                              charge.department === 'Nursing' ? 'bg-rose-100 text-rose-800' :
                              charge.department === 'Procedure' ? 'bg-purple-100 text-purple-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {charge.department || 'Other'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {charge.category || 'General'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            <div>{formatCurrency(charge.cost)}</div>
                            {charge.insurancePrices && Object.keys(charge.insurancePrices).length > 0 && (
                              <div className="mt-0.5">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-bold">
                                  <ShieldCheck className="w-2.5 h-2.5 text-indigo-600" />
                                  {Object.keys(charge.insurancePrices).length} Schemes
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setInsurancePricingCharge(charge)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-colors shadow-2xs"
                                title="Manage Insurance Tariffs & Scheme Pricing"
                              >
                                <ShieldCheck className="w-3 h-3 text-indigo-600" />
                                <span>Tariffs</span>
                                {charge.insurancePrices && Object.keys(charge.insurancePrices).length > 0 && (
                                  <span className="px-1 py-0.2 bg-indigo-200 text-indigo-900 rounded-full text-[9px] font-bold">
                                    {Object.keys(charge.insurancePrices).length}
                                  </span>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOtherChargeId(charge.id);
                                  setOtherChargeCustomCost(charge.cost);
                                  setActiveTab('settlement');
                                }}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-bold cursor-pointer flex items-center gap-1"
                              >
                                <CreditCard className="w-3 h-3 text-emerald-600" />
                                Bill at Counter
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEditCatalogCharge(charge)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                                title="Edit Charge"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCatalogCharge(charge.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                title="Delete Charge"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Revenue Analytics */}
      {activeTab === 'income_analytics' && (
        <div className="space-y-6 text-xs">
          
          {/* Departmental Revenue Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              Departmental Revenue Realization ({activeClinic.name})
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
                <span className="text-[11px] font-bold text-purple-900 uppercase">Pharmacy</span>
                <div className="text-lg font-bold text-purple-700 mt-1">{formatCurrency(pharmacyRevenue)}</div>
                <div className="text-[10px] text-purple-600 mt-0.5">{((pharmacyRevenue / (totalBilledAll || 1)) * 100).toFixed(1)}% of total</div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                <span className="text-[11px] font-bold text-amber-900 uppercase">Pathology Lab</span>
                <div className="text-lg font-bold text-amber-700 mt-1">{formatCurrency(labRevenue)}</div>
                <div className="text-[10px] text-amber-600 mt-0.5">{((labRevenue / (totalBilledAll || 1)) * 100).toFixed(1)}% of total</div>
              </div>

              <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200 text-center">
                <span className="text-[11px] font-bold text-cyan-900 uppercase">Radiology</span>
                <div className="text-lg font-bold text-cyan-700 mt-1">{formatCurrency(radRevenue)}</div>
                <div className="text-[10px] text-cyan-600 mt-0.5">{((radRevenue / (totalBilledAll || 1)) * 100).toFixed(1)}% of total</div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <span className="text-[11px] font-bold text-emerald-900 uppercase">Consultations</span>
                <div className="text-lg font-bold text-emerald-700 mt-1">{formatCurrency(consultRevenue)}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">{((consultRevenue / (totalBilledAll || 1)) * 100).toFixed(1)}% of total</div>
              </div>

              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-center">
                <span className="text-[11px] font-bold text-indigo-900 uppercase">Ward & Consumables</span>
                <div className="text-lg font-bold text-indigo-700 mt-1">{formatCurrency(nursingRevenue)}</div>
                <div className="text-[10px] text-indigo-600 mt-0.5">{((nursingRevenue / (totalBilledAll || 1)) * 100).toFixed(1)}% of total</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      <PrintReceiptModal
        isOpen={printModal.isOpen}
        onClose={() => setPrintModal({ ...printModal, isOpen: false })}
        type={printModal.type}
        data={printModal.data}
      />

      {/* Insurance Tariff Pricing Modal for Other Charges */}
      {insurancePricingCharge && (
        <OtherChargeInsurancePricingModal
          charge={insurancePricingCharge}
          isOpen={Boolean(insurancePricingCharge)}
          onClose={() => setInsurancePricingCharge(null)}
        />
      )}

    </div>
  );
};
