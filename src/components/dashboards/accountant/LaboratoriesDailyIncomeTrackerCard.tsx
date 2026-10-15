import React, { useState, useMemo, useEffect } from 'react';
import { useClinic } from '../../../context/ClinicContext';
import {
  Microscope,
  Calendar as CalendarIcon,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Printer,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Layers,
  ArrowUpRight,
  FileText,
  BadgeAlert,
  Radio,
  Building2,
  Percent,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import { TestOrder, RadiologyOrder, LedgerItem, PaymentTransaction } from '../../../types';

export type DatePreset = 'all' | 'today' | 'last7' | 'last30' | 'this_month' | 'custom';

export interface LabDateGroup<T> {
  date: string;
  formattedDate: string;
  rows: T[];
  totalBilled: number;
  totalIncome: number;
  totalDebt: number;
  paidCount: number;
  unpaidCount: number;
}

interface DailyLabStats {
  date: string;
  isToday: boolean;
  // Pathology
  pathologyBilled: number;
  pathologyIncome: number;
  pathologyDebt: number;
  pathologyCount: number;
  pathologyPaidCount: number;
  pathologyUnpaidCount: number;
  // Radiology
  radiologyBilled: number;
  radiologyIncome: number;
  radiologyDebt: number;
  radiologyCount: number;
  radiologyPaidCount: number;
  radiologyUnpaidCount: number;
  // Combined Labs
  totalLabBilled: number;
  totalLabIncome: number;
  totalLabDebt: number;
  totalLabCount: number;
  labRealizationRate: number;
  // Hospital Overall
  hospitalDayBilled: number;
  hospitalDayIncome: number;
  hospitalDayDebt: number;
}

interface TestDetailRow {
  id: string;
  testCode: string;
  testName: string;
  category: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorName: string;
  orderedAt: string;
  clinicalStatus: string;
  billedAmount: number;
  amountPaid: number;
  debtAmount: number;
  paymentStatus: 'paid' | 'partially_paid' | 'unpaid';
  insuranceTariff?: string;
  receiptNumber?: string;
  paymentMethod?: string;
}

interface RadiologyDetailRow {
  id: string;
  procedureCode: string;
  procedureName: string;
  modality: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorName: string;
  orderedAt: string;
  clinicalStatus: string;
  billedAmount: number;
  amountPaid: number;
  debtAmount: number;
  paymentStatus: 'paid' | 'partially_paid' | 'unpaid';
  insuranceTariff?: string;
}

export interface LaboratoriesDailyIncomeTrackerCardProps {
  forceOpen?: boolean;
  defaultCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export const LaboratoriesDailyIncomeTrackerCard: React.FC<LaboratoriesDailyIncomeTrackerCardProps> = ({
  forceOpen,
  defaultCollapsed = true,
  onToggleCollapse
}) => {
  const {
    currentClinicLedgers,
    currentClinicPatients,
    currentClinicTestOrders,
    currentClinicRadiologyOrders,
    getPatientLedger,
    formatCurrency,
    currencySymbol,
    activeClinic,
    currentUser
  } = useClinic();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (forceOpen) return false;
    const saved = localStorage.getItem('omniclinic_lab_tracker_collapsed');
    return saved !== null ? saved === 'true' : defaultCollapsed;
  });

  useEffect(() => {
    if (forceOpen) {
      setIsCollapsed(false);
    }
  }, [forceOpen]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('omniclinic_lab_tracker_collapsed', String(next));
      if (onToggleCollapse) onToggleCollapse(next);
      return next;
    });
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeViewTab, setActiveViewTab] = useState<'pathology' | 'radiology' | 'combined'>('pathology');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'debt'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Month navigation for mini-calendar
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  // Quick Date Selectors
  const setQuickDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dStr = d.toISOString().split('T')[0];
    setSelectedDate(dStr);
    setDatePreset('custom');
    setCustomStartDate(dStr);
    setCustomEndDate(dStr);
  };

  // Compile all unified ledger items across all patients for accurate financial queries
  const allLedgersWithItems = useMemo(() => {
    return currentClinicPatients.map(patient => {
      return getPatientLedger(patient.id);
    }).filter(Boolean);
  }, [currentClinicPatients, getPatientLedger]);

  // Map of date -> whether it has pathology orders or transactions
  const activeHistoricalDates = useMemo(() => {
    const dateSet = new Set<string>();
    
    currentClinicTestOrders.forEach(o => {
      if (o.orderedAt) dateSet.add(o.orderedAt.split('T')[0]);
    });

    currentClinicRadiologyOrders.forEach(r => {
      if (r.orderedAt) dateSet.add(r.orderedAt.split('T')[0]);
    });

    allLedgersWithItems.forEach(ledger => {
      (ledger?.items || []).forEach(item => {
        if (item.date && (item.department === 'Pathology' || item.department === 'Radiology')) {
          dateSet.add(item.date.split('T')[0]);
        }
      });
      (ledger?.transactions || []).forEach(tx => {
        if (tx.date) dateSet.add(tx.date.split('T')[0]);
      });
    });

    return dateSet;
  }, [currentClinicTestOrders, currentClinicRadiologyOrders, allLedgersWithItems]);

  // Check whether a date string is inside the currently selected range
  const isDateInRange = useMemo(() => {
    return (dateStr: string) => {
      if (!dateStr) return false;
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const itemTime = new Date(dateStr + 'T12:00:00').getTime();

      if (datePreset === 'today') {
        return dateStr === todayStr;
      }
      if (datePreset === 'last7') {
        const d7 = new Date();
        d7.setDate(d7.getDate() - 7);
        d7.setHours(0, 0, 0, 0);
        return itemTime >= d7.getTime() && itemTime <= today.getTime();
      }
      if (datePreset === 'last30') {
        const d30 = new Date();
        d30.setDate(d30.getDate() - 30);
        d30.setHours(0, 0, 0, 0);
        return itemTime >= d30.getTime() && itemTime <= today.getTime();
      }
      if (datePreset === 'this_month') {
        const dMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        dMonth.setHours(0, 0, 0, 0);
        return itemTime >= dMonth.getTime() && itemTime <= today.getTime();
      }
      if (datePreset === 'custom') {
        if (customStartDate && dateStr < customStartDate) return false;
        if (customEndDate && dateStr > customEndDate) return false;
        return true;
      }
      return true; // 'all'
    };
  }, [datePreset, customStartDate, customEndDate, todayStr]);

  // Construct Statement Period Label matching the statement style
  const statementPeriodLabel = useMemo(() => {
    if (datePreset === 'today') return `Today (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
    if (datePreset === 'last7') return 'Last 7 Days';
    if (datePreset === 'last30') return 'Last 30 Days';
    if (datePreset === 'this_month') return `This Month (${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
    if (datePreset === 'custom') {
      if (customStartDate && customEndDate) {
        return customStartDate === customEndDate 
          ? `Date: ${customStartDate}` 
          : `${customStartDate} to ${customEndDate}`;
      }
      if (customStartDate) return `From ${customStartDate}`;
      if (customEndDate) return `Up to ${customEndDate}`;
      return 'Custom Date Range';
    }
    return 'All Historical Dates';
  }, [datePreset, customStartDate, customEndDate]);

  // General statistics computation for any date predicate
  const computeStatsWithFilter = (
    predicate: (dStr: string) => boolean,
    label: string,
    isToday: boolean
  ): DailyLabStats => {
    let pathBilled = 0;
    let pathIncome = 0;
    let pathDebt = 0;
    let pathCount = 0;
    let pathPaid = 0;
    let pathUnpaid = 0;

    let radBilled = 0;
    let radIncome = 0;
    let radDebt = 0;
    let radCount = 0;
    let radPaid = 0;
    let radUnpaid = 0;

    let hospBilled = 0;
    let hospIncome = 0;
    let hospDebt = 0;

    allLedgersWithItems.forEach(ledger => {
      if (!ledger) return;

      (ledger.items || []).forEach(item => {
        const itemDate = item.date ? item.date.split('T')[0] : '';
        if (predicate(itemDate)) {
          const totalAmt = item.totalAmount || (item.quantity * item.unitPrice) || 0;
          const paidAmt = item.amountPaid !== undefined 
            ? item.amountPaid 
            : (item.status === 'paid' ? totalAmt : 0);
          const dueAmt = item.balanceDue !== undefined 
            ? item.balanceDue 
            : Math.max(0, totalAmt - paidAmt);

          hospBilled += totalAmt;
          hospDebt += dueAmt;

          if (item.department === 'Pathology') {
            pathBilled += totalAmt;
            pathDebt += dueAmt;
            pathCount++;
            if (item.status === 'paid' || dueAmt <= 0) {
              pathPaid++;
            } else {
              pathUnpaid++;
            }
          } else if (item.department === 'Radiology') {
            radBilled += totalAmt;
            radDebt += dueAmt;
            radCount++;
            if (item.status === 'paid' || dueAmt <= 0) {
              radPaid++;
            } else {
              radUnpaid++;
            }
          }
        }
      });

      (ledger.transactions || []).forEach(tx => {
        const txDate = tx.date ? tx.date.split('T')[0] : '';
        if (predicate(txDate)) {
          hospIncome += tx.amountPaid || 0;

          if (tx.allocatedItems && tx.allocatedItems.length > 0) {
            tx.allocatedItems.forEach(alloc => {
              if (alloc.department === 'Pathology') {
                pathIncome += alloc.amountAllocated || 0;
              } else if (alloc.department === 'Radiology') {
                radIncome += alloc.amountAllocated || 0;
              }
            });
          } else if (tx.paidItemIds && tx.paidItemIds.length > 0) {
            tx.paidItemIds.forEach(id => {
              const matched = (ledger.items || []).find(i => i.id === id);
              if (matched?.department === 'Pathology') {
                pathIncome += (matched.amountPaid || matched.totalAmount || 0);
              } else if (matched?.department === 'Radiology') {
                radIncome += (matched.amountPaid || matched.totalAmount || 0);
              }
            });
          } else if (tx.targetCategory === 'tests_all' || tx.notes?.toLowerCase().includes('lab') || tx.notes?.toLowerCase().includes('pathology')) {
            pathIncome += tx.amountPaid || 0;
          } else if (tx.targetCategory === 'rad_all' || tx.notes?.toLowerCase().includes('radiology') || tx.notes?.toLowerCase().includes('scan')) {
            radIncome += tx.amountPaid || 0;
          }
        }
      });
    });

    currentClinicTestOrders.forEach(order => {
      const orderDate = order.orderedAt ? order.orderedAt.split('T')[0] : '';
      if (predicate(orderDate)) {
        const foundInLedger = allLedgersWithItems.some(l => 
          (l?.items || []).some(i => i.referenceId === order.id || i.id === `lab-${order.id}`)
        );
        if (!foundInLedger) {
          pathBilled += order.cost || 0;
          pathDebt += order.cost || 0;
          pathCount++;
          pathUnpaid++;
        }
      }
    });

    currentClinicRadiologyOrders.forEach(scan => {
      const scanDate = scan.orderedAt ? scan.orderedAt.split('T')[0] : '';
      if (predicate(scanDate)) {
        const foundInLedger = allLedgersWithItems.some(l => 
          (l?.items || []).some(i => i.referenceId === scan.id || i.id === `rad-${scan.id}`)
        );
        if (!foundInLedger) {
          radBilled += scan.cost || 0;
          radDebt += scan.cost || 0;
          radCount++;
          radUnpaid++;
        }
      }
    });

    if (pathIncome === 0 && pathBilled > 0) {
      allLedgersWithItems.forEach(ledger => {
        (ledger?.items || []).forEach(item => {
          if (item.department === 'Pathology' && item.date && predicate(item.date.split('T')[0])) {
            pathIncome += (item.amountPaid || (item.status === 'paid' ? item.totalAmount : 0));
          }
        });
      });
    }

    if (radIncome === 0 && radBilled > 0) {
      allLedgersWithItems.forEach(ledger => {
        (ledger?.items || []).forEach(item => {
          if (item.department === 'Radiology' && item.date && predicate(item.date.split('T')[0])) {
            radIncome += (item.amountPaid || (item.status === 'paid' ? item.totalAmount : 0));
          }
        });
      });
    }

    const totalLabBilled = pathBilled + radBilled;
    const totalLabIncome = pathIncome + radIncome;
    const totalLabDebt = pathDebt + radDebt;
    const totalLabCount = pathCount + radCount;
    const labRealizationRate = totalLabBilled > 0 ? Math.min(100, (totalLabIncome / totalLabBilled) * 100) : 0;

    return {
      date: label,
      isToday,
      pathologyBilled: Number(pathBilled.toFixed(2)),
      pathologyIncome: Number(pathIncome.toFixed(2)),
      pathologyDebt: Number(pathDebt.toFixed(2)),
      pathologyCount: pathCount,
      pathologyPaidCount: pathPaid,
      pathologyUnpaidCount: pathUnpaid,
      radiologyBilled: Number(radBilled.toFixed(2)),
      radiologyIncome: Number(radIncome.toFixed(2)),
      radiologyDebt: Number(radDebt.toFixed(2)),
      radiologyCount: radCount,
      radiologyPaidCount: radPaid,
      radiologyUnpaidCount: radUnpaid,
      totalLabBilled: Number(totalLabBilled.toFixed(2)),
      totalLabIncome: Number(totalLabIncome.toFixed(2)),
      totalLabDebt: Number(totalLabDebt.toFixed(2)),
      totalLabCount,
      labRealizationRate: Number(labRealizationRate.toFixed(1)),
      hospitalDayBilled: Number(hospBilled.toFixed(2)),
      hospitalDayIncome: Number(hospIncome.toFixed(2)),
      hospitalDayDebt: Number(hospDebt.toFixed(2))
    };
  };

  // Compute stats for ANY given single date string
  const computeStatsForDate = (dateStr: string): DailyLabStats => {
    return computeStatsWithFilter((d) => d === dateStr, dateStr, dateStr === todayStr);
  };

  // Active Statement Range statistics (aggregates all dates in range)
  const currentStats = useMemo(() => {
    return computeStatsWithFilter(isDateInRange, statementPeriodLabel, datePreset === 'today');
  }, [isDateInRange, statementPeriodLabel, datePreset, allLedgersWithItems, currentClinicTestOrders, currentClinicRadiologyOrders]);

  // Today's baseline statistics (for direct comparison and quick view)
  const todayStats = useMemo(() => {
    return computeStatsForDate(todayStr);
  }, [todayStr, allLedgersWithItems, currentClinicTestOrders, currentClinicRadiologyOrders]);

  // Detailed test orders breakdown for the selected range
  const selectedDatePathologyRows = useMemo<TestDetailRow[]>(() => {
    const rows: TestDetailRow[] = [];
    const seenOrderIds = new Set<string>();

    // 1. From testOrders
    currentClinicTestOrders.forEach(order => {
      const orderDate = order.orderedAt ? order.orderedAt.split('T')[0] : '';
      if (isDateInRange(orderDate)) {
        seenOrderIds.add(order.id);
        const patientLedger = getPatientLedger(order.patientId);
        const matchingLedgerItem = (patientLedger?.items || []).find(
          i => i.referenceId === order.id || i.id === `lab-${order.id}` || (i.department === 'Pathology' && i.description.includes(order.testName))
        );

        const billedAmount = matchingLedgerItem ? matchingLedgerItem.totalAmount : (order.cost || 0);
        const amountPaid = matchingLedgerItem 
          ? (matchingLedgerItem.amountPaid !== undefined ? matchingLedgerItem.amountPaid : (matchingLedgerItem.status === 'paid' ? billedAmount : 0))
          : 0;
        const debtAmount = matchingLedgerItem 
          ? (matchingLedgerItem.balanceDue !== undefined ? matchingLedgerItem.balanceDue : Math.max(0, billedAmount - amountPaid))
          : billedAmount;

        const paymentStatus: 'paid' | 'partially_paid' | 'unpaid' = 
          debtAmount <= 0 ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'unpaid';

        rows.push({
          id: order.id,
          testCode: order.testCode || 'LAB-TEST',
          testName: order.testName,
          category: order.category,
          patientId: order.patientId,
          patientName: order.patientName,
          patientMrn: order.patientMrn,
          doctorName: order.doctorName,
          orderedAt: order.orderedAt,
          clinicalStatus: order.status,
          billedAmount,
          amountPaid,
          debtAmount,
          paymentStatus,
          insuranceTariff: order.insurancePolicyName,
          receiptNumber: matchingLedgerItem?.paidReceiptNumber
        });
      }
    });

    // 2. Also check ledger items marked with date that were not in testOrders
    allLedgersWithItems.forEach(ledger => {
      if (!ledger) return;
      (ledger.items || []).forEach(item => {
        const itemDate = item.date ? item.date.split('T')[0] : '';
        if (isDateInRange(itemDate) && item.department === 'Pathology') {
          if (item.referenceId && seenOrderIds.has(item.referenceId)) return;

          const totalAmt = item.totalAmount || 0;
          const paidAmt = item.amountPaid || (item.status === 'paid' ? totalAmt : 0);
          const dueAmt = item.balanceDue !== undefined ? item.balanceDue : Math.max(0, totalAmt - paidAmt);
          const paymentStatus: 'paid' | 'partially_paid' | 'unpaid' = 
            dueAmt <= 0 ? 'paid' : paidAmt > 0 ? 'partially_paid' : 'unpaid';

          rows.push({
            id: item.id,
            testCode: 'LAB-BILL',
            testName: item.description,
            category: 'Pathology',
            patientId: ledger.patientId,
            patientName: ledger.patientName,
            patientMrn: ledger.patientMrn,
            doctorName: 'Clinical Consultant',
            orderedAt: item.date,
            clinicalStatus: item.status === 'paid' ? 'completed' : 'processing',
            billedAmount: totalAmt,
            amountPaid: paidAmt,
            debtAmount: dueAmt,
            paymentStatus,
            insuranceTariff: item.insurancePolicyName,
            receiptNumber: item.paidReceiptNumber
          });
        }
      });
    });

    return rows.sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime());
  }, [isDateInRange, currentClinicTestOrders, allLedgersWithItems, getPatientLedger]);

  // Detailed radiology orders breakdown for the selected range
  const selectedDateRadiologyRows = useMemo<RadiologyDetailRow[]>(() => {
    const rows: RadiologyDetailRow[] = [];
    const seenOrderIds = new Set<string>();

    currentClinicRadiologyOrders.forEach(order => {
      const orderDate = order.orderedAt ? order.orderedAt.split('T')[0] : '';
      if (isDateInRange(orderDate)) {
        seenOrderIds.add(order.id);
        const patientLedger = getPatientLedger(order.patientId);
        const matchingLedgerItem = (patientLedger?.items || []).find(
          i => i.referenceId === order.id || i.id === `rad-${order.id}` || (i.department === 'Radiology' && i.description.includes(order.procedureName))
        );

        const billedAmount = matchingLedgerItem ? matchingLedgerItem.totalAmount : (order.cost || 0);
        const amountPaid = matchingLedgerItem 
          ? (matchingLedgerItem.amountPaid !== undefined ? matchingLedgerItem.amountPaid : (matchingLedgerItem.status === 'paid' ? billedAmount : 0))
          : 0;
        const debtAmount = matchingLedgerItem 
          ? (matchingLedgerItem.balanceDue !== undefined ? matchingLedgerItem.balanceDue : Math.max(0, billedAmount - amountPaid))
          : billedAmount;

        const paymentStatus: 'paid' | 'partially_paid' | 'unpaid' = 
          debtAmount <= 0 ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'unpaid';

        rows.push({
          id: order.id,
          procedureCode: order.procedureCode || 'RAD-SCAN',
          procedureName: order.procedureName,
          modality: order.modality,
          patientId: order.patientId,
          patientName: order.patientName,
          patientMrn: order.patientMrn,
          doctorName: order.doctorName,
          orderedAt: order.orderedAt,
          clinicalStatus: order.status,
          billedAmount,
          amountPaid,
          debtAmount,
          paymentStatus,
          insuranceTariff: order.insurancePolicyName
        });
      }
    });

    // Also check ledger items marked with date that were not in radiologyOrders
    allLedgersWithItems.forEach(ledger => {
      if (!ledger) return;
      (ledger.items || []).forEach(item => {
        const itemDate = item.date ? item.date.split('T')[0] : '';
        if (isDateInRange(itemDate) && item.department === 'Radiology') {
          if (item.referenceId && seenOrderIds.has(item.referenceId)) return;

          const totalAmt = item.totalAmount || 0;
          const paidAmt = item.amountPaid || (item.status === 'paid' ? totalAmt : 0);
          const dueAmt = item.balanceDue !== undefined ? item.balanceDue : Math.max(0, totalAmt - paidAmt);
          const paymentStatus: 'paid' | 'partially_paid' | 'unpaid' = 
            dueAmt <= 0 ? 'paid' : paidAmt > 0 ? 'partially_paid' : 'unpaid';

          rows.push({
            id: item.id,
            procedureCode: 'RAD-BILL',
            procedureName: item.description,
            modality: 'Radiology',
            patientId: ledger.patientId,
            patientName: ledger.patientName,
            patientMrn: ledger.patientMrn,
            doctorName: 'Radiologist / Consultant',
            orderedAt: item.date,
            clinicalStatus: item.status === 'paid' ? 'completed' : 'processing',
            billedAmount: totalAmt,
            amountPaid: paidAmt,
            debtAmount: dueAmt,
            paymentStatus,
            insuranceTariff: item.insurancePolicyName
          });
        }
      });
    });

    return rows.sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime());
  }, [isDateInRange, currentClinicRadiologyOrders, allLedgersWithItems, getPatientLedger]);

  // Filtered rows for Pathology
  const filteredPathologyRows = useMemo(() => {
    return selectedDatePathologyRows.filter(row => {
      if (statusFilter === 'paid' && row.paymentStatus !== 'paid') return false;
      if (statusFilter === 'debt' && row.paymentStatus === 'paid') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          row.testName.toLowerCase().includes(q) ||
          row.testCode.toLowerCase().includes(q) ||
          row.patientName.toLowerCase().includes(q) ||
          row.patientMrn.toLowerCase().includes(q) ||
          row.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedDatePathologyRows, statusFilter, searchQuery]);

  // Filtered rows for Radiology
  const filteredRadiologyRows = useMemo(() => {
    return selectedDateRadiologyRows.filter(row => {
      if (statusFilter === 'paid' && row.paymentStatus !== 'paid') return false;
      if (statusFilter === 'debt' && row.paymentStatus === 'paid') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          row.procedureName.toLowerCase().includes(q) ||
          row.procedureCode.toLowerCase().includes(q) ||
          row.patientName.toLowerCase().includes(q) ||
          row.patientMrn.toLowerCase().includes(q) ||
          row.modality.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedDateRadiologyRows, statusFilter, searchQuery]);

  // Group Pathology rows by date (matching ledger statement style)
  const pathologyDateGroups = useMemo<LabDateGroup<TestDetailRow>[]>(() => {
    const map = new Map<string, TestDetailRow[]>();
    filteredPathologyRows.forEach(row => {
      const d = row.orderedAt ? row.orderedAt.split('T')[0] : 'undated';
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(row);
    });

    const sortedDates = Array.from(map.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return sortedDates.map(date => {
      const rows = map.get(date)!;
      const totalBilled = Number(rows.reduce((s, r) => s + r.billedAmount, 0).toFixed(2));
      const totalIncome = Number(rows.reduce((s, r) => s + r.amountPaid, 0).toFixed(2));
      const totalDebt = Number(rows.reduce((s, r) => s + r.debtAmount, 0).toFixed(2));
      const paidCount = rows.filter(r => r.paymentStatus === 'paid').length;
      const unpaidCount = rows.filter(r => r.paymentStatus !== 'paid').length;

      const parsedDate = new Date(date + 'T12:00:00');
      const isToday = todayStr === date;
      const formattedDate = date === 'undated'
        ? 'Undated Test Orders'
        : isToday
        ? `Today • ${parsedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`
        : parsedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

      return {
        date,
        formattedDate,
        rows,
        totalBilled,
        totalIncome,
        totalDebt,
        paidCount,
        unpaidCount
      };
    });
  }, [filteredPathologyRows, todayStr]);

  // Group Radiology rows by date (matching ledger statement style)
  const radiologyDateGroups = useMemo<LabDateGroup<RadiologyDetailRow>[]>(() => {
    const map = new Map<string, RadiologyDetailRow[]>();
    filteredRadiologyRows.forEach(row => {
      const d = row.orderedAt ? row.orderedAt.split('T')[0] : 'undated';
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(row);
    });

    const sortedDates = Array.from(map.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return sortedDates.map(date => {
      const rows = map.get(date)!;
      const totalBilled = Number(rows.reduce((s, r) => s + r.billedAmount, 0).toFixed(2));
      const totalIncome = Number(rows.reduce((s, r) => s + r.amountPaid, 0).toFixed(2));
      const totalDebt = Number(rows.reduce((s, r) => s + r.debtAmount, 0).toFixed(2));
      const paidCount = rows.filter(r => r.paymentStatus === 'paid').length;
      const unpaidCount = rows.filter(r => r.paymentStatus !== 'paid').length;

      const parsedDate = new Date(date + 'T12:00:00');
      const isToday = todayStr === date;
      const formattedDate = date === 'undated'
        ? 'Undated Scan Orders'
        : isToday
        ? `Today • ${parsedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`
        : parsedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

      return {
        date,
        formattedDate,
        rows,
        totalBilled,
        totalIncome,
        totalDebt,
        paidCount,
        unpaidCount
      };
    });
  }, [filteredRadiologyRows, todayStr]);

  // Combined timeline breakdown for every date in range
  const combinedDateSummaries = useMemo(() => {
    const datesSet = new Set<string>();
    pathologyDateGroups.forEach(g => datesSet.add(g.date));
    radiologyDateGroups.forEach(g => datesSet.add(g.date));

    const sortedDates = Array.from(datesSet).filter(d => d !== 'undated').sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return sortedDates.map(dStr => {
      const pGroup = pathologyDateGroups.find(g => g.date === dStr);
      const rGroup = radiologyDateGroups.find(g => g.date === dStr);

      const pBilled = pGroup?.totalBilled || 0;
      const pIncome = pGroup?.totalIncome || 0;
      const pDebt = pGroup?.totalDebt || 0;
      const pCount = pGroup?.rows.length || 0;

      const rBilled = rGroup?.totalBilled || 0;
      const rIncome = rGroup?.totalIncome || 0;
      const rDebt = rGroup?.totalDebt || 0;
      const rCount = rGroup?.rows.length || 0;

      const dayBilled = Number((pBilled + rBilled).toFixed(2));
      const dayIncome = Number((pIncome + rIncome).toFixed(2));
      const dayDebt = Number((pDebt + rDebt).toFixed(2));
      const dayRealization = dayBilled > 0 ? ((dayIncome / dayBilled) * 100).toFixed(1) : '0.0';

      const parsedDate = new Date(dStr + 'T12:00:00');
      const isToday = todayStr === dStr;
      const formattedDate = isToday
        ? `Today • ${parsedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`
        : parsedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

      return {
        date: dStr,
        formattedDate,
        pBilled,
        pIncome,
        pDebt,
        pCount,
        rBilled,
        rIncome,
        rDebt,
        rCount,
        dayBilled,
        dayIncome,
        dayDebt,
        dayRealization
      };
    });
  }, [pathologyDateGroups, radiologyDateGroups, todayStr]);

  // Keep expanded dates populated by default
  useEffect(() => {
    const allDates = new Set<string>();
    pathologyDateGroups.forEach(g => allDates.add(g.date));
    radiologyDateGroups.forEach(g => allDates.add(g.date));
    setExpandedDates(allDates);
  }, [pathologyDateGroups, radiologyDateGroups]);

  const toggleDateExpansion = (dStr: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(dStr)) next.delete(dStr);
      else next.add(dStr);
      return next;
    });
  };

  const handleExpandAllDates = () => {
    const allDates = new Set<string>();
    pathologyDateGroups.forEach(g => allDates.add(g.date));
    radiologyDateGroups.forEach(g => allDates.add(g.date));
    setExpandedDates(allDates);
  };

  const handleCollapseAllDates = () => {
    setExpandedDates(new Set());
  };

  // Calendar Day Generation (Monthly Grid)
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean; hasActivity: boolean; isSelected: boolean; isToday: boolean }> = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push({
        dateStr: '',
        dayNum: 0,
        isCurrentMonth: false,
        hasActivity: false,
        isSelected: false,
        isToday: false
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: day,
        isCurrentMonth: true,
        hasActivity: activeHistoricalDates.has(dStr),
        isSelected: dStr === selectedDate,
        isToday: dStr === todayStr
      });
    }

    return days;
  }, [calendarMonth, activeHistoricalDates, selectedDate, todayStr]);

  // Format exact time string for ledger-style time column
  const formatExactTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      if (dateStr.includes('T') || dateStr.includes(':')) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
      return '09:00 AM';
    } catch {
      return '—';
    }
  };

  // Format date and time for flat table mode
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const datePart = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      const timePart = dateStr.includes('T') || dateStr.includes(':')
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'All Day';
      return `${datePart} • ${timePart}`;
    } catch {
      return dateStr;
    }
  };

  // Print Daily / Range Lab Finance Summary Statement
  const handlePrintDailyReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const pBilled = currentStats.pathologyBilled;
    const pIncome = currentStats.pathologyIncome;
    const pDebt = currentStats.pathologyDebt;
    const rBilled = currentStats.radiologyBilled;
    const rIncome = currentStats.radiologyIncome;
    const rDebt = currentStats.radiologyDebt;

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>ViperH.M.S - Laboratory Finances Statement (${statementPeriodLabel})</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; color: #1e293b; padding: 24px; margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #0f172a; margin-bottom: 16px; }
            .title { font-size: 18px; font-weight: 800; color: #0f172a; }
            .subtitle { font-size: 12px; color: #475569; margin-top: 4px; }
            .meta { text-align: right; font-size: 11px; color: #64748b; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
            .kpi-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; }
            .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; }
            .kpi-value { font-size: 16px; font-weight: 800; font-family: monospace; margin-top: 4px; }
            .green { color: #047857; }
            .red { color: #be123c; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; }
            th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; color: #475569; }
            td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; }
            .date-hdr { background: #e0e7ff; padding: 6px 10px; font-weight: 700; font-size: 11px; color: #3730a3; margin-top: 14px; border-radius: 4px; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
            .badge-paid { background: #d1fae5; color: #065f46; }
            .badge-debt { background: #ffe4e6; color: #9f1239; }
            .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">ViperH.M.S &bull; Laboratory Financial Statement</div>
              <div class="subtitle">Pathology & Radiology Revenue Reconciliation and Debtor Register</div>
              <div style="font-weight: 600; color: #1e293b; margin-top: 4px;">Facility: ${activeClinic?.name || 'ViperH.M.S'}</div>
            </div>
            <div class="meta">
              <div><strong>Statement Period:</strong> ${statementPeriodLabel}</div>
              <div><strong>Auditor:</strong> ${currentUser?.name || 'Accountant'}</div>
              <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Total Lab Income (${datePreset === 'today' ? 'Day' : 'Period'})</div>
              <div class="kpi-value green">${formatCurrency(currentStats.totalLabIncome)}</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Path: ${formatCurrency(pIncome)} | Rad: ${formatCurrency(rIncome)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Lab Debt (${datePreset === 'today' ? 'Day' : 'Period'})</div>
              <div class="kpi-value red">${formatCurrency(currentStats.totalLabDebt)}</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Path: ${formatCurrency(pDebt)} | Rad: ${formatCurrency(rDebt)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Charges Billed</div>
              <div class="kpi-value">${formatCurrency(currentStats.totalLabBilled)}</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${currentStats.totalLabCount} Total Orders</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Settlement Realization</div>
              <div class="kpi-value green">${currentStats.labRealizationRate}%</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Hosp Day: ${formatCurrency(currentStats.hospitalDayIncome)}</div>
            </div>
          </div>

          <h3 style="font-size: 13px; color: #3730a3; margin-top: 16px; margin-bottom: 6px;">
            1. Pathology Diagnostic Tests (${filteredPathologyRows.length} Orders)
          </h3>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient & MRN</th>
                <th>Test Name & Code</th>
                <th>Physician</th>
                <th class="text-right">Billed</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Debt</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPathologyRows.map(r => `
                <tr>
                  <td class="font-mono">${formatDateTime(r.orderedAt)}</td>
                  <td><strong>${r.patientName}</strong> (${r.patientMrn})</td>
                  <td>${r.testName} <span style="color: #64748b;">[${r.testCode}]</span></td>
                  <td>Dr. ${r.doctorName || 'Attending'}</td>
                  <td class="text-right font-mono">${formatCurrency(r.billedAmount)}</td>
                  <td class="text-right font-mono green">${formatCurrency(r.amountPaid)}</td>
                  <td class="text-right font-mono red">${formatCurrency(r.debtAmount)}</td>
                  <td style="text-align: center;">
                    <span class="badge ${r.paymentStatus === 'paid' ? 'badge-paid' : 'badge-debt'}">${r.paymentStatus}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h3 style="font-size: 13px; color: #1e40af; margin-top: 20px; margin-bottom: 6px;">
            2. Radiology & Imaging Procedures (${filteredRadiologyRows.length} Orders)
          </h3>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient & MRN</th>
                <th>Procedure Name & Code</th>
                <th>Modality</th>
                <th class="text-right">Billed</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Debt</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRadiologyRows.map(r => `
                <tr>
                  <td class="font-mono">${formatDateTime(r.orderedAt)}</td>
                  <td><strong>${r.patientName}</strong> (${r.patientMrn})</td>
                  <td>${r.procedureName} <span style="color: #64748b;">[${r.procedureCode}]</span></td>
                  <td>${r.modality}</td>
                  <td class="text-right font-mono">${formatCurrency(r.billedAmount)}</td>
                  <td class="text-right font-mono green">${formatCurrency(r.amountPaid)}</td>
                  <td class="text-right font-mono red">${formatCurrency(r.debtAmount)}</td>
                  <td style="text-align: center;">
                    <span class="badge ${r.paymentStatus === 'paid' ? 'badge-paid' : 'badge-debt'}">${r.paymentStatus}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div>ViperH.M.S Multi-Branch Healthcare Information System</div>
            <div>Official Accounts Department Ledger Statement &bull; Page 1 of 1</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden text-slate-800 transition-all">
      
      {/* 1. Header Banner */}
      <div 
        onClick={toggleCollapse}
        className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-5 text-white flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none transition-all hover:bg-slate-900/95"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner shrink-0">
            <Microscope className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-tight">
                Laboratories Daily Income & Debt Tracker
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                Pathology & Radiology
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/10 text-slate-300">
                {activeClinic?.name || 'ViperH.M.S'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Real-time daily income reconciliation, unpaid debtor tracking, and historical calendar investigation.
            </p>
          </div>
        </div>

        {/* Collapsed view summary chips OR Expanded controls */}
        {isCollapsed ? (
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              <span className="text-slate-300 text-[11px]">Today's Income:</span>
              <span className="font-mono font-bold text-emerald-300">{formatCurrency(todayStats.totalLabIncome)}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              <span className="text-slate-300 text-[11px]">Today's Debt:</span>
              <span className="font-mono font-bold text-rose-300">{formatCurrency(todayStats.totalLabDebt)}</span>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              <span className="text-slate-300 text-[11px]">Efficiency:</span>
              <span className="font-bold text-indigo-200">{todayStats.labRealizationRate}%</span>
            </div>
            <button
              type="button"
              onClick={toggleCollapse}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <span>Expand Tracker</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
            {/* Period Indicator Badge */}
            <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-300" />
              <span>{statementPeriodLabel}</span>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrintDailyReport}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Print Laboratory Income & Debt Statement for this period"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Statement</span>
            </button>

            {/* Collapse Button */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Collapse Tracker to clean view"
            >
              <span>Collapse</span>
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Body: Rendered only when expanded */}
      {!isCollapsed && (
        <>
          {/* 1.5 Date Range & Statement Filter Toolbar (matching PatientLedgerStatementSection) */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 border-b border-slate-700/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-400 flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    Time Range & Timeline Ledger
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {statementPeriodLabel}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Display test orders and scan revenues in date ranges as in the patient statement ledger, with expandable time groups.
                  </p>
                </div>
              </div>

              {/* View Mode Toggle & Expand/Collapse */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* View Mode Switcher */}
                <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('grouped')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      viewMode === 'grouped'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    title="Display records separated into date ranges with individual time columns"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Date-Grouped Ranges</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('flat')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      viewMode === 'flat'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    title="Display continuous flat list across the selected period"
                  >
                    <Layers className="w-3 h-3" />
                    <span>Flat Table</span>
                  </button>
                </div>

                {viewMode === 'grouped' && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleExpandAllDates}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-medium cursor-pointer"
                      title="Expand all date range groups"
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={handleCollapseAllDates}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-medium cursor-pointer"
                      title="Collapse all date range groups"
                    >
                      Collapse All
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Date Filter Presets Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-700/80 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  Period Range:
                </span>
                {[
                  { id: 'all', label: 'All Dates' },
                  { id: 'today', label: 'Today' },
                  { id: 'last7', label: 'Last 7 Days' },
                  { id: 'last30', label: 'Last 30 Days' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'custom', label: 'Custom Range...' }
                ].map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setDatePreset(preset.id as DatePreset);
                      if (preset.id === 'today') {
                        setSelectedDate(todayStr);
                        setCustomStartDate(todayStr);
                        setCustomEndDate(todayStr);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      datePreset === preset.id
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Quick Jump Interactive Calendar Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Calendar Jump</span>
                </button>

                {/* Interactive Calendar Popover */}
                {isCalendarOpen && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 text-slate-800 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <span className="font-bold text-xs text-slate-900">
                        {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Day header */}
                    <div className="grid grid-cols-7 gap-1 text-[11px] font-bold text-slate-400 text-center py-2">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 text-xs">
                      {calendarDays.map((cd, idx) => {
                        if (!cd.isCurrentMonth) {
                          return <div key={idx} className="h-8" />;
                        }
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedDate(cd.dateStr);
                              setDatePreset('custom');
                              setCustomStartDate(cd.dateStr);
                              setCustomEndDate(cd.dateStr);
                              setIsCalendarOpen(false);
                            }}
                            className={`h-8 w-full rounded-lg text-xs font-semibold flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                              cd.isSelected
                                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                : cd.isToday
                                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>{cd.dayNum}</span>
                            {cd.hasActivity && (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  cd.isSelected ? 'bg-amber-300' : 'bg-indigo-500'
                                }`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Calendar Legend / Native Picker fallback */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span>Has Lab Records</span>
                      </div>
                      <input
                        type="date"
                        value={selectedDate}
                        max={todayStr}
                        onChange={(e) => {
                          if (e.target.value) {
                            setSelectedDate(e.target.value);
                            setDatePreset('custom');
                            setCustomStartDate(e.target.value);
                            setCustomEndDate(e.target.value);
                            setCalendarMonth(new Date(e.target.value));
                            setIsCalendarOpen(false);
                          }
                        }}
                        className="text-[11px] p-1 border border-slate-200 rounded text-slate-700 font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Date Range Row */}
            {datePreset === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 p-2.5 bg-slate-800/80 rounded-lg border border-slate-700 text-xs animate-in fade-in">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-slate-900 border border-slate-600 text-white px-2 py-1 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-slate-900 border border-slate-600 text-white px-2 py-1 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
                <span className="text-[11px] text-slate-400">
                  Filtering records between {customStartDate || 'all past dates'} and {customEndDate || 'today'}
                </span>
              </div>
            )}
          </div>

          {/* 2. Primary KPI Cards: Totals Debts & Incomes for the Selected Range */}
          <div className="p-5 bg-slate-50/70 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Financial Status for {statementPeriodLabel}
                </span>
                {datePreset !== 'today' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                    Period Range Aggregate
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                Settlement Realization Rate: <strong className="text-emerald-700">{currentStats.labRealizationRate}%</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Combined Lab Incomes */}
              <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between text-emerald-700 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Total Lab Income ({datePreset === 'today' ? 'Day' : 'Period'})
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
                  {formatCurrency(currentStats.totalLabIncome)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                  <span>Pathology: <strong className="text-slate-800">{formatCurrency(currentStats.pathologyIncome)}</strong></span>
                  <span>Radiology: <strong className="text-slate-800">{formatCurrency(currentStats.radiologyIncome)}</strong></span>
                </div>
              </div>

              {/* Card 2: Combined Lab Debts */}
              <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-xs relative overflow-hidden group hover:border-rose-300 transition-all">
                <div className="flex items-center justify-between text-rose-700 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Total Lab Debt ({datePreset === 'today' ? 'Day' : 'Period'})
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <BadgeAlert className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-mono text-rose-700 tracking-tight">
                  {formatCurrency(currentStats.totalLabDebt)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                  <span>Pathology: <strong className="text-rose-600">{formatCurrency(currentStats.pathologyDebt)}</strong></span>
                  <span>Radiology: <strong className="text-rose-600">{formatCurrency(currentStats.radiologyDebt)}</strong></span>
                </div>
              </div>

              {/* Card 3: Total Lab Billed Services */}
              <div className="bg-white p-4 rounded-xl border border-indigo-200/80 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between text-indigo-700 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Total Lab Charges Billed ({datePreset === 'today' ? 'Day' : 'Period'})
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                  {formatCurrency(currentStats.totalLabBilled)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                  <span>{currentStats.totalLabCount} Total Order(s)</span>
                  <span className="text-emerald-600 font-semibold">{currentStats.pathologyPaidCount + currentStats.radiologyPaidCount} Settled</span>
                </div>
              </div>

              {/* Card 4: Hospital Overview Comparison */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-600 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Hospital Overall ({datePreset === 'today' ? 'Day' : 'Period'})
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black font-mono text-emerald-700">
                    {formatCurrency(currentStats.hospitalDayIncome)}
                  </span>
                  <span className="text-[11px] text-slate-400">Income</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                  <span className="text-rose-600 font-bold">Debt: {formatCurrency(currentStats.hospitalDayDebt)}</span>
                  <span>Billed: {formatCurrency(currentStats.hospitalDayBilled)}</span>
                </div>
              </div>

            </div>

            {/* Progress Realization Bar */}
            <div className="mt-3.5 bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-700">Laboratory Collection Efficiency:</span>
                <span className="font-bold text-slate-900">
                  {currentStats.totalLabBilled > 0 ? `${currentStats.labRealizationRate}% Collected` : 'No billing orders recorded'}
                </span>
              </div>

              <div className="flex-1 max-w-md bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${currentStats.labRealizationRate}%` }}
                  title={`Collected: ${formatCurrency(currentStats.totalLabIncome)}`}
                />
                <div
                  className="bg-rose-400 h-full transition-all duration-500"
                  style={{ width: `${100 - currentStats.labRealizationRate}%` }}
                  title={`Debt / Unpaid: ${formatCurrency(currentStats.totalLabDebt)}`}
                />
              </div>

              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Income: <strong>{formatCurrency(currentStats.totalLabIncome)}</strong></span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="text-slate-600">Debt: <strong>{formatCurrency(currentStats.totalLabDebt)}</strong></span>
                </span>
              </div>
            </div>

          </div>

          {/* 3. Investigation Tabs: Pathology (Primary) vs. Radiology vs. Combined */}
          <div className="p-5 space-y-4">
            
            {/* Navigation & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-100">
              
              {/* View Mode Tabs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveViewTab('pathology')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    activeViewTab === 'pathology'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Microscope className="w-3.5 h-3.5" />
                  <span>Pathology Finances ({filteredPathologyRows.length})</span>
                </button>

                <button
                  onClick={() => setActiveViewTab('radiology')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    activeViewTab === 'radiology'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Radiology Finances ({filteredRadiologyRows.length})</span>
                </button>

                <button
                  onClick={() => setActiveViewTab('combined')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    activeViewTab === 'combined'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Combined Timeline Audit</span>
                </button>
              </div>

              {/* Status Filter & Search */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Filter by Status */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                      statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter('paid')}
                    className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                      statusFilter === 'paid' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    Paid Incomes
                  </button>
                  <button
                    onClick={() => setStatusFilter('debt')}
                    className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                      statusFilter === 'debt' ? 'bg-white text-rose-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-rose-700'
                    }`}
                  >
                    Debts / Unpaid
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search test, MRN, patient..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white w-48 transition-all"
                  />
                </div>
              </div>

            </div>

            {/* 4. Tab Content: Pathology Detailed Finances */}
            {activeViewTab === 'pathology' && (
              <div className="space-y-4">
                
                {/* Pathology Date Header Summary */}
                <div className="flex flex-wrap items-center justify-between p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <Microscope className="w-4 h-4 text-indigo-700" />
                    <span className="font-bold text-slate-900">
                      Pathology Department Financial Journal: {statementPeriodLabel}
                    </span>
                    <span className="text-slate-500">
                      ({filteredPathologyRows.length} tests listed across {pathologyDateGroups.length} date range{pathologyDateGroups.length === 1 ? '' : 's'})
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="text-slate-600">
                      Total Billed: <strong className="text-slate-900 font-mono">{formatCurrency(currentStats.pathologyBilled)}</strong>
                    </span>
                    <span className="text-emerald-700">
                      Collected Income: <strong className="font-mono">{formatCurrency(currentStats.pathologyIncome)}</strong>
                    </span>
                    <span className="text-rose-700">
                      Outstanding Debt: <strong className="font-mono">{formatCurrency(currentStats.pathologyDebt)}</strong>
                    </span>
                  </div>
                </div>

                {/* Empty State */}
                {filteredPathologyRows.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                    <Microscope className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold">No pathology financial records found for {statementPeriodLabel}.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {datePreset !== 'all' 
                        ? 'Try selecting "All Dates" or adjusting your date range filter above.' 
                        : 'Use the Doctor or Pathology workstation to order lab tests.'}
                    </p>
                    {datePreset !== 'today' && (
                      <button
                        onClick={() => {
                          setDatePreset('today');
                          setSelectedDate(todayStr);
                          setCustomStartDate(todayStr);
                          setCustomEndDate(todayStr);
                        }}
                        className="mt-3 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        Jump to Today
                      </button>
                    )}
                  </div>
                ) : viewMode === 'grouped' ? (
                  /* 4.A Date-Grouped Ranges View (Statement Style) */
                  <div className="space-y-3">
                    {pathologyDateGroups.map((group) => {
                      const isExpanded = expandedDates.has(group.date);
                      const realization = group.totalBilled > 0 
                        ? Math.min(100, Math.round((group.totalIncome / group.totalBilled) * 100))
                        : 0;

                      return (
                        <div key={group.date} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all">
                          {/* Date Range Header Banner */}
                          <div
                            onClick={() => toggleDateExpansion(group.date)}
                            className="px-4 py-3 bg-gradient-to-r from-slate-50 to-indigo-50/50 hover:bg-indigo-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                <CalendarIcon className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-900">
                                    {group.formattedDate}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                    {group.rows.length} Test{group.rows.length === 1 ? '' : 's'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {group.date} &bull; {group.paidCount} Paid &bull; {group.unpaidCount} Debt
                                </span>
                              </div>
                            </div>

                            {/* Financial Subtotals for this date */}
                            <div className="flex items-center gap-3 sm:gap-4 text-xs">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Billed</span>
                                <span className="font-mono font-bold text-slate-900">{formatCurrency(group.totalBilled)}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-emerald-600 uppercase font-semibold block">Income</span>
                                <span className="font-mono font-bold text-emerald-700">+{formatCurrency(group.totalIncome)}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-rose-500 uppercase font-semibold block">Debt</span>
                                <span className="font-mono font-bold text-rose-700">
                                  {group.totalDebt > 0 ? `-${formatCurrency(group.totalDebt)}` : `${currencySymbol}0.00`}
                                </span>
                              </div>
                              <div className="hidden sm:block text-right pl-2 border-l border-slate-200">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Realized</span>
                                <span className="font-mono font-bold text-indigo-700">{realization}%</span>
                              </div>
                              <div className="p-1 rounded-md text-slate-400 hover:text-slate-600">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Table */}
                          {isExpanded && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-2.5 px-3">Time</th>
                                    <th className="py-2.5 px-3">Patient & MRN</th>
                                    <th className="py-2.5 px-3">Test Name & Code</th>
                                    <th className="py-2.5 px-3">Category</th>
                                    <th className="py-2.5 px-3">Physician</th>
                                    <th className="py-2.5 px-3 text-right">Billed Cost</th>
                                    <th className="py-2.5 px-3 text-right">Paid Income</th>
                                    <th className="py-2.5 px-3 text-right">Debt Balance</th>
                                    <th className="py-2.5 px-3 text-center">Payment Status</th>
                                    <th className="py-2.5 px-3 text-center">Clinical Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {group.rows.map(row => {
                                    const exactTime = formatExactTime(row.orderedAt);
                                    return (
                                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                                          <span className="flex items-center gap-1 font-mono text-slate-600 text-[11px]">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            {exactTime}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <div className="font-bold text-slate-900">{row.patientName}</div>
                                          <div className="text-[11px] font-mono text-indigo-700">{row.patientMrn}</div>
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <div className="font-bold text-slate-900">{row.testName}</div>
                                          <div className="text-[10px] text-slate-500 font-mono">
                                            {row.testCode}
                                            {row.insuranceTariff && (
                                              <span className="ml-1 text-emerald-700 font-bold">[{row.insuranceTariff}]</span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-600">
                                          <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold">
                                            {row.category}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-700 text-[11px]">
                                          Dr. {row.doctorName || 'Attending'}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                          {formatCurrency(row.billedAmount)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                          {formatCurrency(row.amountPaid)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                                          {formatCurrency(row.debtAmount)}
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                          {row.paymentStatus === 'paid' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                              Paid
                                            </span>
                                          ) : row.paymentStatus === 'partially_paid' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                              <Clock className="w-3 h-3 text-amber-600" />
                                              Partially Paid
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                              <AlertCircle className="w-3 h-3 text-rose-600" />
                                              Unpaid Debt
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                            row.clinicalStatus === 'completed'
                                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                              : row.clinicalStatus === 'processing'
                                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                              : 'bg-slate-100 text-slate-700'
                                          }`}>
                                            {row.clinicalStatus ? row.clinicalStatus.replace('_', ' ') : 'Ordered'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-slate-50 font-bold text-xs border-t border-slate-200">
                                    <td colSpan={5} className="py-2.5 px-3 text-slate-700 uppercase text-[10px]">
                                      Subtotal for {group.formattedDate} ({group.rows.length} tests)
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                                      {formatCurrency(group.totalBilled)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                                      {formatCurrency(group.totalIncome)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                                      {formatCurrency(group.totalDebt)}
                                    </td>
                                    <td colSpan={2} />
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* 4.B Flat Table View */
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
                          <th className="py-2.5 px-3">Date / Time</th>
                          <th className="py-2.5 px-3">Patient & MRN</th>
                          <th className="py-2.5 px-3">Test Name & Code</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Physician</th>
                          <th className="py-2.5 px-3 text-right">Billed Cost</th>
                          <th className="py-2.5 px-3 text-right">Paid Income</th>
                          <th className="py-2.5 px-3 text-right">Debt Balance</th>
                          <th className="py-2.5 px-3 text-center">Payment Status</th>
                          <th className="py-2.5 px-3 text-center">Clinical Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPathologyRows.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                              <span className="flex items-center gap-1 font-mono text-slate-600 text-[11px]">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {formatDateTime(row.orderedAt)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{row.patientName}</div>
                              <div className="text-[11px] font-mono text-indigo-700">{row.patientMrn}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{row.testName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {row.testCode}
                                {row.insuranceTariff && (
                                  <span className="ml-1 text-emerald-700 font-bold">[{row.insuranceTariff}]</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold">
                                {row.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 text-[11px]">
                              Dr. {row.doctorName || 'Attending'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(row.billedAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatCurrency(row.amountPaid)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                              {formatCurrency(row.debtAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {row.paymentStatus === 'paid' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Paid
                                </span>
                              ) : row.paymentStatus === 'partially_paid' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Partially Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  Unpaid Debt
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                row.clinicalStatus === 'completed'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : row.clinicalStatus === 'processing'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {row.clinicalStatus ? row.clinicalStatus.replace('_', ' ') : 'Ordered'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold text-xs border-t-2 border-slate-300">
                          <td colSpan={5} className="py-3 px-3 text-slate-800 uppercase text-[11px]">
                            Total for {filteredPathologyRows.length} tests ({statementPeriodLabel})
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-900">
                            {formatCurrency(filteredPathologyRows.reduce((s, r) => s + r.billedAmount, 0))}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-700">
                            {formatCurrency(filteredPathologyRows.reduce((s, r) => s + r.amountPaid, 0))}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-rose-700">
                            {formatCurrency(filteredPathologyRows.reduce((s, r) => s + r.debtAmount, 0))}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 5. Tab Content: Radiology Detailed Finances */}
            {activeViewTab === 'radiology' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-blue-700" />
                    <span className="font-bold text-slate-900">
                      Radiology & Imaging Financial Journal: {statementPeriodLabel}
                    </span>
                    <span className="text-slate-500">
                      ({filteredRadiologyRows.length} scans listed across {radiologyDateGroups.length} date range{radiologyDateGroups.length === 1 ? '' : 's'})
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="text-slate-600">
                      Total Billed: <strong className="text-slate-900 font-mono">{formatCurrency(currentStats.radiologyBilled)}</strong>
                    </span>
                    <span className="text-emerald-700">
                      Collected Income: <strong className="font-mono">{formatCurrency(currentStats.radiologyIncome)}</strong>
                    </span>
                    <span className="text-rose-700">
                      Outstanding Debt: <strong className="font-mono">{formatCurrency(currentStats.radiologyDebt)}</strong>
                    </span>
                  </div>
                </div>

                {/* Empty State */}
                {filteredRadiologyRows.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                    <Radio className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold">No radiology orders recorded for {statementPeriodLabel}.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      X-rays, ultrasounds, CT, and MRI scans ordered in this period will appear here.
                    </p>
                    {datePreset !== 'today' && (
                      <button
                        onClick={() => {
                          setDatePreset('today');
                          setSelectedDate(todayStr);
                          setCustomStartDate(todayStr);
                          setCustomEndDate(todayStr);
                        }}
                        className="mt-3 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        Jump to Today
                      </button>
                    )}
                  </div>
                ) : viewMode === 'grouped' ? (
                  /* 5.A Date-Grouped Ranges View for Radiology */
                  <div className="space-y-3">
                    {radiologyDateGroups.map((group) => {
                      const isExpanded = expandedDates.has(group.date);
                      const realization = group.totalBilled > 0 
                        ? Math.min(100, Math.round((group.totalIncome / group.totalBilled) * 100))
                        : 0;

                      return (
                        <div key={group.date} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all">
                          {/* Date Range Header Banner */}
                          <div
                            onClick={() => toggleDateExpansion(group.date)}
                            className="px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50/50 hover:bg-blue-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                <CalendarIcon className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-900">
                                    {group.formattedDate}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                    {group.rows.length} Scan{group.rows.length === 1 ? '' : 's'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {group.date} &bull; {group.paidCount} Paid &bull; {group.unpaidCount} Debt
                                </span>
                              </div>
                            </div>

                            {/* Financial Subtotals for this date */}
                            <div className="flex items-center gap-3 sm:gap-4 text-xs">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Billed</span>
                                <span className="font-mono font-bold text-slate-900">{formatCurrency(group.totalBilled)}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-emerald-600 uppercase font-semibold block">Income</span>
                                <span className="font-mono font-bold text-emerald-700">+{formatCurrency(group.totalIncome)}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-rose-500 uppercase font-semibold block">Debt</span>
                                <span className="font-mono font-bold text-rose-700">
                                  {group.totalDebt > 0 ? `-${formatCurrency(group.totalDebt)}` : `${currencySymbol}0.00`}
                                </span>
                              </div>
                              <div className="hidden sm:block text-right pl-2 border-l border-slate-200">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Realized</span>
                                <span className="font-mono font-bold text-blue-700">{realization}%</span>
                              </div>
                              <div className="p-1 rounded-md text-slate-400 hover:text-slate-600">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Table */}
                          {isExpanded && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-2.5 px-3">Time</th>
                                    <th className="py-2.5 px-3">Patient & MRN</th>
                                    <th className="py-2.5 px-3">Procedure Name</th>
                                    <th className="py-2.5 px-3">Modality</th>
                                    <th className="py-2.5 px-3">Physician</th>
                                    <th className="py-2.5 px-3 text-right">Billed Cost</th>
                                    <th className="py-2.5 px-3 text-right">Paid Income</th>
                                    <th className="py-2.5 px-3 text-right">Debt Balance</th>
                                    <th className="py-2.5 px-3 text-center">Payment Status</th>
                                    <th className="py-2.5 px-3 text-center">Scan Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {group.rows.map(row => {
                                    const exactTime = formatExactTime(row.orderedAt);
                                    return (
                                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                                          <span className="flex items-center gap-1 font-mono text-slate-600 text-[11px]">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            {exactTime}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <div className="font-bold text-slate-900">{row.patientName}</div>
                                          <div className="text-[11px] font-mono text-indigo-700">{row.patientMrn}</div>
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <div className="font-bold text-slate-900">{row.procedureName}</div>
                                          <div className="text-[10px] text-slate-500 font-mono">{row.procedureCode}</div>
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-600">
                                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                                            {row.modality}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-700 text-[11px]">
                                          Dr. {row.doctorName || 'Attending'}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                          {formatCurrency(row.billedAmount)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                          {formatCurrency(row.amountPaid)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                                          {formatCurrency(row.debtAmount)}
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                          {row.paymentStatus === 'paid' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                              Paid
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                              <AlertCircle className="w-3 h-3 text-rose-600" />
                                              Unpaid Debt
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                                            {row.clinicalStatus || 'Pending'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-slate-50 font-bold text-xs border-t border-slate-200">
                                    <td colSpan={5} className="py-2.5 px-3 text-slate-700 uppercase text-[10px]">
                                      Subtotal for {group.formattedDate} ({group.rows.length} scans)
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                                      {formatCurrency(group.totalBilled)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                                      {formatCurrency(group.totalIncome)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                                      {formatCurrency(group.totalDebt)}
                                    </td>
                                    <td colSpan={2} />
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* 5.B Flat Table View for Radiology */
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
                          <th className="py-2.5 px-3">Date / Time</th>
                          <th className="py-2.5 px-3">Patient & MRN</th>
                          <th className="py-2.5 px-3">Procedure Name</th>
                          <th className="py-2.5 px-3">Modality</th>
                          <th className="py-2.5 px-3">Physician</th>
                          <th className="py-2.5 px-3 text-right">Billed Cost</th>
                          <th className="py-2.5 px-3 text-right">Paid Income</th>
                          <th className="py-2.5 px-3 text-right">Debt Balance</th>
                          <th className="py-2.5 px-3 text-center">Payment Status</th>
                          <th className="py-2.5 px-3 text-center">Scan Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRadiologyRows.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                              <span className="flex items-center gap-1 font-mono text-slate-600 text-[11px]">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {formatDateTime(row.orderedAt)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{row.patientName}</div>
                              <div className="text-[11px] font-mono text-indigo-700">{row.patientMrn}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{row.procedureName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{row.procedureCode}</div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                                {row.modality}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 text-[11px]">
                              Dr. {row.doctorName || 'Attending'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(row.billedAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatCurrency(row.amountPaid)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                              {formatCurrency(row.debtAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {row.paymentStatus === 'paid' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  Unpaid Debt
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                                {row.clinicalStatus || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold text-xs border-t-2 border-slate-300">
                          <td colSpan={5} className="py-3 px-3 text-slate-800 uppercase text-[11px]">
                            Total for {filteredRadiologyRows.length} radiology orders ({statementPeriodLabel})
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-900">
                            {formatCurrency(filteredRadiologyRows.reduce((s, r) => s + r.billedAmount, 0))}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-700">
                            {formatCurrency(filteredRadiologyRows.reduce((s, r) => s + r.amountPaid, 0))}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-rose-700">
                            {formatCurrency(filteredRadiologyRows.reduce((s, r) => s + r.debtAmount, 0))}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 6. Tab Content: Combined Summary & Date-by-Date Timeline Audit */}
            {activeViewTab === 'combined' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Pathology Recap Box */}
                  <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-200/80 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                      <div className="flex items-center gap-2">
                        <Microscope className="w-4 h-4 text-indigo-700" />
                        <span className="font-bold text-sm text-slate-900">Pathology Period Summary</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        {currentStats.pathologyCount} Orders
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">Total Billed Charges:</span>
                        <span className="font-mono font-bold text-slate-900">{formatCurrency(currentStats.pathologyBilled)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-emerald-700 font-semibold">Total Revenue Collected:</span>
                        <span className="font-mono font-bold text-emerald-700">{formatCurrency(currentStats.pathologyIncome)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-rose-700 font-semibold">Unpaid Patient Debt:</span>
                        <span className="font-mono font-bold text-rose-700">{formatCurrency(currentStats.pathologyDebt)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-600">Settlement Realization:</span>
                        <span className="font-bold text-indigo-900">
                          {currentStats.pathologyBilled > 0 ? `${((currentStats.pathologyIncome / currentStats.pathologyBilled) * 100).toFixed(1)}%` : '0.0%'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Radiology Recap Box */}
                  <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200/80 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-blue-700" />
                        <span className="font-bold text-sm text-slate-900">Radiology Period Summary</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        {currentStats.radiologyCount} Orders
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">Total Billed Charges:</span>
                        <span className="font-mono font-bold text-slate-900">{formatCurrency(currentStats.radiologyBilled)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-emerald-700 font-semibold">Total Revenue Collected:</span>
                        <span className="font-mono font-bold text-emerald-700">{formatCurrency(currentStats.radiologyIncome)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-rose-700 font-semibold">Unpaid Patient Debt:</span>
                        <span className="font-mono font-bold text-rose-700">{formatCurrency(currentStats.radiologyDebt)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-600">Settlement Realization:</span>
                        <span className="font-bold text-blue-900">
                          {currentStats.radiologyBilled > 0 ? `${((currentStats.radiologyIncome / currentStats.radiologyBilled) * 100).toFixed(1)}%` : '0.0%'}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Combined Timeline Table across all dates in range */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-indigo-600" />
                      <span>Date-by-Date Combined Lab Revenue & Realization Timeline</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {combinedDateSummaries.length} Date Range Period(s)
                    </span>
                  </div>

                  {combinedDateSummaries.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No combined lab transactions logged in {statementPeriodLabel}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/70 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold">
                            <th className="py-2.5 px-3">Date Range</th>
                            <th className="py-2.5 px-3 text-right">Pathology Billed</th>
                            <th className="py-2.5 px-3 text-right text-emerald-700">Pathology Income</th>
                            <th className="py-2.5 px-3 text-right">Radiology Billed</th>
                            <th className="py-2.5 px-3 text-right text-emerald-700">Radiology Income</th>
                            <th className="py-2.5 px-3 text-right font-bold text-slate-900">Combined Billed</th>
                            <th className="py-2.5 px-3 text-right font-bold text-emerald-700">Total Income</th>
                            <th className="py-2.5 px-3 text-right font-bold text-rose-700">Total Debt</th>
                            <th className="py-2.5 px-3 text-center">Settlement %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {combinedDateSummaries.map((ds) => (
                            <tr key={ds.date} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                <div>{ds.formattedDate}</div>
                                <div className="text-[10px] text-slate-400 font-mono">Date: {ds.date}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                {formatCurrency(ds.pBilled)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                                +{formatCurrency(ds.pIncome)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                {formatCurrency(ds.rBilled)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                                +{formatCurrency(ds.rIncome)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(ds.dayBilled)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                +{formatCurrency(ds.dayIncome)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                                {ds.dayDebt > 0 ? `-${formatCurrency(ds.dayDebt)}` : `${currencySymbol}0.00`}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <div className="w-12 bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-emerald-500 h-full rounded-full" 
                                      style={{ width: `${Math.min(100, Number(ds.dayRealization))}%` }} 
                                    />
                                  </div>
                                  <span className="font-mono font-bold text-[11px] text-indigo-700">
                                    {ds.dayRealization}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 font-bold text-xs border-t-2 border-slate-300">
                            <td className="py-3 px-3 uppercase text-[10px] text-slate-800">
                              Period Totals ({statementPeriodLabel})
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-900">
                              {formatCurrency(currentStats.pathologyBilled)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-emerald-700">
                              +{formatCurrency(currentStats.pathologyIncome)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-900">
                              {formatCurrency(currentStats.radiologyBilled)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-emerald-700">
                              +{formatCurrency(currentStats.radiologyIncome)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-900">
                              {formatCurrency(currentStats.totalLabBilled)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-emerald-700">
                              +{formatCurrency(currentStats.totalLabIncome)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-rose-700">
                              {currentStats.totalLabDebt > 0 ? `-${formatCurrency(currentStats.totalLabDebt)}` : `${currencySymbol}0.00`}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-indigo-700">
                              {currentStats.labRealizationRate}%
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Reconciliation Note */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>
                      Reconciliation statement for <strong>{statementPeriodLabel}</strong> verified by Accounts Gatekeeper <strong>{currentUser?.name || 'Accountant'}</strong>.
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">
                    Timestamp: {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
};
