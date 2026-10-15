import React, { useState, useMemo, useEffect } from 'react';
import { useClinic } from '../../../context/ClinicContext';
import {
  Receipt,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Printer,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User as UserIcon,
  Building2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  X,
  Scale,
  Wallet,
  Tag,
  CreditCard,
  Pill,
  Microscope,
  Stethoscope,
  Activity,
  Layers,
  Trash2
} from 'lucide-react';
import { DailyExpenditure, DailyExpenditureItem, ExpenditureCategory, PaymentTransaction } from '../../../types';

export interface GeneralDailyIncomeExpenditureTrackerCardProps {
  forceOpen?: boolean;
  defaultCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

const EXPENDITURE_CATEGORIES: ExpenditureCategory[] = [
  'Medical Supplies',
  'Laboratory Reagents',
  'Pharmacy Restock',
  'Utilities & Energy',
  'Equipment & Maintenance',
  'Staff & Operational',
  'Logistics & Transport',
  'Administrative & Office',
  'Food & Catering',
  'Facility & Cleaning',
  'Other'
];

interface IncomeTransactionDetail {
  id: string;
  receiptNumber: string;
  date: string;
  amount: number;
  paymentMethod: string;
  receivedBy: string;
  patientName: string;
  patientMrn: string;
  patientId: string;
  department: string;
  description: string;
}

export const GeneralDailyIncomeExpenditureTrackerCard: React.FC<GeneralDailyIncomeExpenditureTrackerCardProps> = ({
  forceOpen = false,
  defaultCollapsed = false,
  onToggleCollapse
}) => {
  const {
    activeClinic,
    currentUser,
    currentClinicPatients,
    currentClinicDailyExpenditures,
    addDailyExpenditure,
    formatCurrency,
    currencyConfig,
    currencySymbol,
    ledgers
  } = useClinic();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Card Collapsible state
  const STORAGE_KEY = 'clinicsync_general_account_tracker_collapsed';
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (forceOpen) return false;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return defaultCollapsed;
  });

  useEffect(() => {
    if (forceOpen) {
      setIsCollapsed(false);
    }
  }, [forceOpen]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (onToggleCollapse) onToggleCollapse(next);
      return next;
    });
  };

  // Date selection state
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [isCalendarDrawerOpen, setIsCalendarDrawerOpen] = useState<boolean>(true);

  // View subtabs: 'reconciliation' | 'incomes' | 'expenditures'
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'incomes' | 'expenditures'>('reconciliation');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedExpCategoryFilter, setSelectedExpCategoryFilter] = useState<string>('all');

  // Quick Expense Modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [expTitle, setExpTitle] = useState<string>('');
  const [expCategory, setExpCategory] = useState<ExpenditureCategory>('Medical Supplies');
  const [expDate, setExpDate] = useState<string>(todayStr);
  const [expPaymentMethod, setExpPaymentMethod] = useState<DailyExpenditure['paymentMethod']>('petty_cash');
  const [expVoucherNo, setExpVoucherNo] = useState<string>('');
  const [expVendor, setExpVendor] = useState<string>('');
  const [expNotes, setExpNotes] = useState<string>('');
  const [expItems, setExpItems] = useState<DailyExpenditureItem[]>([
    {
      id: `item-${Date.now()}-1`,
      name: '',
      quantity: 1,
      unit: 'pcs',
      unitCost: 0,
      totalCost: 0,
      notes: ''
    }
  ]);

  // Open Quick Expense Modal
  const handleOpenExpenseModal = () => {
    setExpTitle('');
    setExpCategory('Medical Supplies');
    setExpDate(selectedDate || todayStr);
    setExpPaymentMethod('petty_cash');
    setExpVoucherNo(`VCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setExpVendor('');
    setExpNotes('');
    setExpItems([
      {
        id: `item-${Date.now()}-1`,
        name: '',
        quantity: 1,
        unit: 'pcs',
        unitCost: 0,
        totalCost: 0,
        notes: ''
      }
    ]);
    setIsExpenseModalOpen(true);
  };

  const handleAddExpItemRow = () => {
    setExpItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        name: '',
        quantity: 1,
        unit: 'pcs',
        unitCost: 0,
        totalCost: 0,
        notes: ''
      }
    ]);
  };

  const handleRemoveExpItemRow = (index: number) => {
    if (expItems.length <= 1) {
      setExpItems([
        {
          id: `item-${Date.now()}-1`,
          name: '',
          quantity: 1,
          unit: 'pcs',
          unitCost: 0,
          totalCost: 0,
          notes: ''
        }
      ]);
      return;
    }
    setExpItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleExpItemChange = (index: number, field: keyof DailyExpenditureItem, val: any) => {
    setExpItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: val };
      if (field === 'quantity' || field === 'unitCost') {
        const q = field === 'quantity' ? Number(val) || 0 : Number(item.quantity) || 0;
        const c = field === 'unitCost' ? Number(val) || 0 : Number(item.unitCost) || 0;
        item.totalCost = Math.round(q * c * 100) / 100;
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = expTitle.trim() || (expItems[0]?.name ? `${expCategory}: ${expItems[0].name}` : `${expCategory} Expenditure`);
    const cleanedItems = expItems
      .filter(it => it.name.trim() !== '' || it.totalCost > 0)
      .map(it => ({
        ...it,
        name: it.name.trim() || 'General Expense Item',
        quantity: Number(it.quantity) || 1,
        unit: it.unit.trim() || 'pcs',
        unitCost: Number(it.unitCost) || 0,
        totalCost: Number(it.totalCost) || (Number(it.quantity) * Number(it.unitCost)) || 0
      }));

    if (cleanedItems.length === 0) {
      alert('Please add at least one item with a valid name or cost.');
      return;
    }

    const totalAmount = cleanedItems.reduce((s, it) => s + it.totalCost, 0);

    addDailyExpenditure({
      title: cleanTitle,
      category: expCategory,
      date: expDate,
      items: cleanedItems,
      totalAmount,
      paymentMethod: expPaymentMethod,
      receiptOrVoucherNumber: expVoucherNo.trim(),
      vendorOrPayee: expVendor.trim(),
      notes: expNotes.trim()
    });

    setIsExpenseModalOpen(false);
  };

  // Compile all income transactions across all active patient ledgers
  const allIncomeTransactions = useMemo<IncomeTransactionDetail[]>(() => {
    const list: IncomeTransactionDetail[] = [];

    ledgers.forEach(ledger => {
      // Direct transactions
      (ledger.transactions || []).forEach(tx => {
        const txDate = tx.date ? tx.date.split('T')[0] : '';
        
        let dept = 'General';
        let desc = tx.notes || 'Patient Bill Settlement';

        if (tx.allocatedItems && tx.allocatedItems.length > 0) {
          dept = tx.allocatedItems[0].department || 'General';
          desc = tx.allocatedItems.map(a => a.description).join(', ');
        } else if (tx.targetCategory) {
          dept = tx.targetCategory;
        }

        list.push({
          id: tx.id || `tx-${Math.random()}`,
          receiptNumber: tx.receiptNumber || 'RCP-N/A',
          date: txDate,
          amount: tx.amountPaid || 0,
          paymentMethod: tx.paymentMethod || 'Cash',
          receivedBy: tx.receivedBy || 'Finance Office',
          patientName: tx.patientName || ledger.patientName || 'Unknown Patient',
          patientMrn: tx.patientMrn || ledger.patientMrn || 'N/A',
          patientId: tx.patientId || ledger.patientId,
          department: dept,
          description: desc
        });
      });
    });

    return list;
  }, [ledgers]);

  // Aggregate stats by date for quick calendar lookups and calculations
  const dateFinancialAggregates = useMemo(() => {
    const map: Record<string, { income: number; expenditure: number; net: number; incomeCount: number; expCount: number }> = {};

    // 1. Incomes
    allIncomeTransactions.forEach(tx => {
      if (!tx.date) return;
      if (!map[tx.date]) {
        map[tx.date] = { income: 0, expenditure: 0, net: 0, incomeCount: 0, expCount: 0 };
      }
      map[tx.date].income += tx.amount;
      map[tx.date].incomeCount += 1;
    });

    // 2. Expenditures
    currentClinicDailyExpenditures.forEach(exp => {
      if (!exp.date) return;
      if (!map[exp.date]) {
        map[exp.date] = { income: 0, expenditure: 0, net: 0, incomeCount: 0, expCount: 0 };
      }
      map[exp.date].expenditure += exp.totalAmount;
      map[exp.date].expCount += 1;
    });

    // 3. Compute Net
    Object.keys(map).forEach(d => {
      map[d].net = map[d].income - map[d].expenditure;
    });

    return map;
  }, [allIncomeTransactions, currentClinicDailyExpenditures]);

  // Selected Day's Incomes
  const selectedDayIncomes = useMemo(() => {
    return allIncomeTransactions.filter(tx => tx.date === selectedDate);
  }, [allIncomeTransactions, selectedDate]);

  // Selected Day's Expenditures
  const selectedDayExpenditures = useMemo(() => {
    return currentClinicDailyExpenditures.filter(exp => exp.date === selectedDate);
  }, [currentClinicDailyExpenditures, selectedDate]);

  // Selected Day Summary Figures
  const selectedDayMetrics = useMemo(() => {
    const totalIncome = selectedDayIncomes.reduce((s, tx) => s + tx.amount, 0);
    const totalExpenditure = selectedDayExpenditures.reduce((s, exp) => s + exp.totalAmount, 0);
    const netBalance = totalIncome - totalExpenditure;
    const isSurplus = netBalance >= 0;

    // Departmental Incomes breakdown
    const deptIncomes: Record<string, number> = {
      Consultation: 0,
      Pharmacy: 0,
      Pathology: 0,
      Radiology: 0,
      Nursing: 0,
      Procedure: 0,
      Other: 0
    };

    selectedDayIncomes.forEach(tx => {
      const d = tx.department;
      if (d === 'Consultation' || d === 'OPD Consultation') deptIncomes.Consultation += tx.amount;
      else if (d === 'Pharmacy' || d === 'Medication') deptIncomes.Pharmacy += tx.amount;
      else if (d === 'Pathology' || d === 'Laboratory') deptIncomes.Pathology += tx.amount;
      else if (d === 'Radiology' || d === 'Imaging') deptIncomes.Radiology += tx.amount;
      else if (d === 'Nursing' || d === 'Inpatient' || d === 'Ward') deptIncomes.Nursing += tx.amount;
      else if (d === 'Procedure' || d === 'Surgery') deptIncomes.Procedure += tx.amount;
      else deptIncomes.Other += tx.amount;
    });

    // Categorized Expenditures breakdown
    const catExpenditures: Record<string, number> = {};
    selectedDayExpenditures.forEach(exp => {
      catExpenditures[exp.category] = (catExpenditures[exp.category] || 0) + exp.totalAmount;
    });

    return {
      totalIncome,
      totalExpenditure,
      netBalance,
      isSurplus,
      incomeCount: selectedDayIncomes.length,
      expenditureCount: selectedDayExpenditures.length,
      deptIncomes,
      catExpenditures
    };
  }, [selectedDayIncomes, selectedDayExpenditures]);

  // Calendar month rendering data
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];

    // Empty padding slots
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: 0, dateStr: '', isCurrentMonth: false });
    }

    // Actual month days
    for (let day = 1; day <= totalDays; day++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        dayNumber: day,
        dateStr: dStr,
        isCurrentMonth: true
      });
    }

    return days;
  }, [calendarMonth]);

  // Month-to-date summary totals
  const currentMonthTotals = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth() + 1;
    const prefix = `${year}-${String(month).padStart(2, '0')}`;

    let mIncome = 0;
    let mExpenditure = 0;

    Object.entries(dateFinancialAggregates).forEach(([d, val]) => {
      const v = val as { income: number; expenditure: number; net: number; incomeCount: number; expCount: number };
      if (d.startsWith(prefix)) {
        mIncome += v.income;
        mExpenditure += v.expenditure;
      }
    });

    return {
      mIncome,
      mExpenditure,
      mNet: mIncome - mExpenditure,
      monthName: calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
    };
  }, [calendarMonth, dateFinancialAggregates]);

  // Quick date jump
  const jumpToQuickDate = (mode: 'today' | 'yesterday' | '7days') => {
    if (mode === 'today') {
      setSelectedDate(todayStr);
      setCalendarMonth(new Date());
    } else if (mode === 'yesterday') {
      const y = new Date(Date.now() - 86400000);
      setSelectedDate(y.toISOString().split('T')[0]);
      setCalendarMonth(y);
    }
  };

  // Printable Financial Statement Report Generator
  const handlePrintFinancialReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const {
      totalIncome,
      totalExpenditure,
      netBalance,
      isSurplus,
      deptIncomes,
      catExpenditures
    } = selectedDayMetrics;

    const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Incomes Table Rows
    const incomesTableHtml = selectedDayIncomes.length === 0
      ? `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #64748b;">No cash/ledger receipts recorded on this date.</td></tr>`
      : selectedDayIncomes.map((tx, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 8px 10px; color: #475569;">${idx + 1}</td>
          <td style="padding: 8px 10px; font-weight: 700; color: #0f172a;">${tx.receiptNumber}</td>
          <td style="padding: 8px 10px; color: #0f172a;">
            <strong>${tx.patientName}</strong>
            <span style="font-size: 10px; color: #64748b; margin-left: 4px;">(${tx.patientMrn})</span>
          </td>
          <td style="padding: 8px 10px; color: #4338ca; font-weight: 600;">${tx.department}</td>
          <td style="padding: 8px 10px; color: #475569; text-transform: uppercase;">${tx.paymentMethod}</td>
          <td style="padding: 8px 10px; font-weight: 700; color: #047857; text-align: right; font-family: monospace;">${formatCurrency(tx.amount)}</td>
        </tr>
      `).join('');

    // Expenditures Table Rows
    const expendituresTableHtml = selectedDayExpenditures.length === 0
      ? `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #64748b;">No operational expenditure vouchers logged on this date.</td></tr>`
      : selectedDayExpenditures.map((exp, idx) => {
          const itemsSummary = exp.items.map(it => `${it.name} (${it.quantity} ${it.unit})`).join(', ');
          return `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
              <td style="padding: 8px 10px; color: #475569;">${idx + 1}</td>
              <td style="padding: 8px 10px; font-weight: 700; color: #0f172a;">${exp.receiptOrVoucherNumber || exp.id}</td>
              <td style="padding: 8px 10px; color: #0f172a;">
                <strong>${exp.title}</strong>
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Items: ${itemsSummary || 'General'}</div>
              </td>
              <td style="padding: 8px 10px; color: #9f1239; font-weight: 600;">${exp.category}</td>
              <td style="padding: 8px 10px; color: #475569;">${exp.enteredByUserName} (${exp.enteredByUserRole})</td>
              <td style="padding: 8px 10px; font-weight: 700; color: #be123c; text-align: right; font-family: monospace;">${formatCurrency(exp.totalAmount)}</td>
            </tr>
          `;
        }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Financial Statement - ${selectedDate} - ${activeClinic?.name || 'Clinic-Sync'}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 12px; line-height: 1.4; }
            .header-box { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
            .clinic-brand { font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
            .report-title { font-size: 15px; font-weight: 800; color: #1e1b4b; text-transform: uppercase; margin-top: 5px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
            .kpi-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }
            .kpi-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; }
            .kpi-val { font-size: 18px; font-weight: 900; font-family: monospace; }
            .val-green { color: #059669; }
            .val-rose { color: #e11d48; }
            .dept-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #0f172a; color: #ffffff; padding: 8px 10px; font-size: 10px; text-transform: uppercase; text-align: left; }
            .table-heading { font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; display: flex; justify-content: space-between; }
            .audit-stamp { margin-top: 30px; padding: 12px; border: 1px dashed #94a3b8; border-radius: 6px; font-size: 10px; color: #475569; background: #f8fafc; }
            .signature-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 25px; margin-top: 45px; }
            .signature-block { border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 11px; text-align: center; }
            .signature-title { font-size: 9px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div>
              <div class="clinic-brand">${activeClinic?.name || 'Clinic-Sync Portal'}</div>
              <div style="color: #475569; font-size: 11px;">${activeClinic?.address || 'Hospital Central Financial Ledger'}</div>
              <div style="color: #475569; font-size: 11px;">Telephone: ${activeClinic?.phone || 'N/A'} &bull; Facility Code: ${activeClinic?.code || 'CS-01'}</div>
            </div>
            <div style="text-align: right;">
              <div class="report-title">General Daily Financial Statement</div>
              <div style="font-size: 12px; font-weight: 700; color: #334155;">Audit Date: ${formattedDate}</div>
              <div style="font-size: 10px; color: #64748b;">Currency: ${currencyConfig.code} (${currencySymbol})</div>
            </div>
          </div>

          <!-- Executive KPI Reconciliation -->
          <div class="kpi-grid">
            <div class="kpi-card" style="border-left: 4px solid #059669;">
              <div class="kpi-label">Gross Revenue Collected (Incomes)</div>
              <div class="kpi-val val-green">${formatCurrency(totalIncome)}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 3px;">Total Receipts: ${selectedDayIncomes.length}</div>
            </div>

            <div class="kpi-card" style="border-left: 4px solid #e11d48;">
              <div class="kpi-label">Total Cash Disbursed (Expenditures)</div>
              <div class="kpi-val val-rose">${formatCurrency(totalExpenditure)}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 3px;">Total Vouchers: ${selectedDayExpenditures.length}</div>
            </div>

            <div class="kpi-card" style="border-left: 4px solid ${isSurplus ? '#059669' : '#d97706'};">
              <div class="kpi-label">Net Daily Operating Balance</div>
              <div class="kpi-val ${isSurplus ? 'val-green' : 'val-rose'}">${formatCurrency(netBalance)}</div>
              <div style="font-size: 10px; font-weight: bold; color: ${isSurplus ? '#059669' : '#d97706'}; margin-top: 3px;">
                ${isSurplus ? 'OPERATING SURPLUS' : 'OPERATING DEFICIT'}
              </div>
            </div>
          </div>

          <!-- Departmental Incomes vs Categorized Expenses -->
          <div class="dept-grid">
            <!-- Incomes by Department -->
            <div>
              <div class="table-heading">
                <span>Revenue Breakdown by Department</span>
                <span>${formatCurrency(totalIncome)}</span>
              </div>
              <table style="margin-bottom: 0;">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th style="text-align: right;">Amount</th>
                    <th style="text-align: right; width: 60px;">Share</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(deptIncomes).map(([dept, rawAmt]) => {
                    const amt = Number(rawAmt) || 0;
                    return `
                    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                      <td style="padding: 6px 8px; font-weight: 600;">${dept}</td>
                      <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: 700;">${formatCurrency(amt)}</td>
                      <td style="padding: 6px 8px; text-align: right; color: #64748b;">${totalIncome > 0 ? ((amt / totalIncome) * 100).toFixed(0) : 0}%</td>
                    </tr>
                  `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Expenditures by Category -->
            <div>
              <div class="table-heading">
                <span>Expenses Breakdown by Category</span>
                <span>${formatCurrency(totalExpenditure)}</span>
              </div>
              <table style="margin-bottom: 0;">
                <thead>
                  <tr>
                    <th>Expense Category</th>
                    <th style="text-align: right;">Amount</th>
                    <th style="text-align: right; width: 60px;">Share</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(catExpenditures).length === 0 
                    ? `<tr><td colspan="3" style="padding: 8px; text-align: center; color: #64748b;">No expenses categorized.</td></tr>`
                    : Object.entries(catExpenditures).map(([cat, rawAmt]) => {
                      const amt = Number(rawAmt) || 0;
                      return `
                      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                        <td style="padding: 6px 8px; font-weight: 600;">${cat}</td>
                        <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: 700;">${formatCurrency(amt)}</td>
                        <td style="padding: 6px 8px; text-align: right; color: #64748b;">${totalExpenditure > 0 ? ((amt / totalExpenditure) * 100).toFixed(0) : 0}%</td>
                      </tr>
                    `;
                    }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Itemized Incomes Register -->
          <div class="table-heading">
            <span>Official Daily Incomes Register (Payments Received)</span>
            <span>Total: ${selectedDayIncomes.length} Receipts</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th style="width: 90px;">Receipt #</th>
                <th>Patient Details</th>
                <th>Department</th>
                <th>Payment Mode</th>
                <th style="text-align: right; width: 100px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${incomesTableHtml}
            </tbody>
          </table>

          <!-- Itemized Expenditures Register -->
          <div class="table-heading" style="margin-top: 25px;">
            <span>Official Daily Expenditures Register (Operational Outflows)</span>
            <span>Total: ${selectedDayExpenditures.length} Vouchers</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th style="width: 100px;">Voucher #</th>
                <th>Expense Title & Items</th>
                <th>Category</th>
                <th>Entered By</th>
                <th style="text-align: right; width: 100px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${expendituresTableHtml}
            </tbody>
          </table>

          <div class="audit-stamp">
            <strong>Financial Statement Certification:</strong> This daily reconciliation dossier was generated from the Clinic-Sync Accounts Ledger on 
            <strong>${new Date().toLocaleString()}</strong> by <strong>${currentUser.name}</strong> (${currentUser.role.toUpperCase()}). 
            All line items correspond to official receipts and validated expenditure vouchers for facility <strong>${activeClinic?.name}</strong>.
          </div>

          <div class="signature-row">
            <div class="signature-block">
              <strong>${currentUser.name}</strong>
              <div class="signature-title">Prepared by: Finance Officer</div>
            </div>
            <div class="signature-block">
              <strong>Chief Accountant / Internal Auditor</strong>
              <div class="signature-title">Verified & Audited</div>
            </div>
            <div class="signature-block">
              <strong>Medical Director / Hospital Administrator</strong>
              <div class="signature-title">Approved & Facility Stamp</div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 450);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
      {/* 1. Card Top Bar & Collapsible Trigger */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner shrink-0 mt-0.5 sm:mt-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                General Accounts Daily Incomes & Expenditure Reconciliation Tracker
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                Unified Ledger
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/10 text-slate-300">
                {activeClinic?.name || 'Clinic'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Unified daily reconciliation of all clinical departmental incomes (Consultation, Pharmacy, Lab, Radiology, Inpatient, Procedures) and itemized operational expenditures with interactive calendar tracking and printable reports.
            </p>
          </div>
        </div>

        {/* Action Controls & Collapse Button */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={handlePrintFinancialReport}
            className="px-3.5 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs border border-indigo-400/30 transition-all"
            title="Print Official Financial Statement"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Daily Report</span>
          </button>

          <button
            type="button"
            onClick={handleOpenExpenseModal}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs border border-rose-400/30 transition-all"
            title="Record Daily Expenditure"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Expenditure</span>
          </button>

          <button
            type="button"
            onClick={toggleCollapse}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-white/10"
            title={isCollapsed ? 'Expand Financial Tracker' : 'Collapse Financial Tracker'}
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-4 h-4 text-slate-300" />
                <span className="hidden sm:inline">Expand Tracker</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4 text-slate-300" />
                <span className="hidden sm:inline">Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsed Ribbon View */}
      {isCollapsed && (
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Date: {selectedDate}</span>
            {selectedDate === todayStr && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                Today
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Daily Incomes:</span>
              <span className="font-bold font-mono text-emerald-600">
                {formatCurrency(selectedDayMetrics.totalIncome)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Daily Expenditures:</span>
              <span className="font-bold font-mono text-rose-600">
                {formatCurrency(selectedDayMetrics.totalExpenditure)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Net Operating Balance:</span>
              <span className={`font-black font-mono px-2 py-0.5 rounded ${selectedDayMetrics.isSurplus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {formatCurrency(selectedDayMetrics.netBalance)} ({selectedDayMetrics.isSurplus ? 'Surplus' : 'Deficit'})
              </span>
            </div>
          </div>

          <button
            onClick={toggleCollapse}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
          >
            <span>View Full Calendar & Itemized Breakdown &rarr;</span>
          </button>
        </div>
      )}

      {/* Expanded Main Content Body */}
      {!isCollapsed && (
        <div className="p-5 space-y-6">
          {/* 2. Top Summary KPI Ribbon for Selected Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Daily Incomes Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-xl border border-emerald-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Daily Incomes</span>
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-700 tracking-tight font-mono">
                {formatCurrency(selectedDayMetrics.totalIncome)}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-100 text-[11px] text-emerald-700">
                <span>{selectedDayMetrics.incomeCount} receipt transaction(s)</span>
                <span className="font-bold">{selectedDate}</span>
              </div>
            </div>

            {/* Daily Expenditures Card */}
            <div className="bg-gradient-to-br from-rose-50 to-white p-4 rounded-xl border border-rose-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-rose-800 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Total Daily Expenditures</span>
                <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-700 tracking-tight font-mono">
                {formatCurrency(selectedDayMetrics.totalExpenditure)}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-rose-100 text-[11px] text-rose-700">
                <span>{selectedDayMetrics.expenditureCount} expense voucher(s)</span>
                <span className="font-bold">Outflows</span>
              </div>
            </div>

            {/* Net Operating Balance Card */}
            <div className={`p-4 rounded-xl border shadow-xs relative overflow-hidden ${
              selectedDayMetrics.isSurplus 
                ? 'bg-gradient-to-br from-indigo-50 to-white border-indigo-200' 
                : 'bg-gradient-to-br from-amber-50 to-white border-amber-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Net Operating Margin
                </span>
                <div className={`p-1.5 rounded-lg ${selectedDayMetrics.isSurplus ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-2xl font-black tracking-tight font-mono ${
                selectedDayMetrics.isSurplus ? 'text-indigo-900' : 'text-amber-800'
              }`}>
                {formatCurrency(selectedDayMetrics.netBalance)}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                <span className="font-bold uppercase">
                  {selectedDayMetrics.isSurplus ? 'Operating Surplus' : 'Operating Deficit'}
                </span>
                <span className="font-bold">
                  {selectedDayMetrics.totalIncome > 0
                    ? `${((selectedDayMetrics.netBalance / selectedDayMetrics.totalIncome) * 100).toFixed(0)}% margin`
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Month-To-Date Snapshot Card */}
            <div className="bg-slate-900 p-4 rounded-xl text-white shadow-xs">
              <div className="flex items-center justify-between text-slate-300 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  {currentMonthTotals.monthName} MTD
                </span>
                <CalendarIcon className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="text-xl font-black text-white font-mono">
                {formatCurrency(currentMonthTotals.mNet)}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                <span>In: {formatCurrency(currentMonthTotals.mIncome)}</span>
                <span>Out: {formatCurrency(currentMonthTotals.mExpenditure)}</span>
              </div>
            </div>
          </div>

          {/* 3. Interactive Calendar Tracker Section */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs text-indigo-600">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Financial Calendar Tracker</span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-bold">
                      {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click any day in the calendar to review combined incomes, expenditures, and net surplus/deficit.
                  </p>
                </div>
              </div>

              {/* Month Navigation & Presets */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                  <button
                    onClick={() => {
                      const d = new Date(calendarMonth);
                      d.setMonth(d.getMonth() - 1);
                      setCalendarMonth(d);
                    }}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 text-xs font-bold text-slate-800">
                    {calendarMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}
                  </span>

                  <button
                    onClick={() => {
                      const d = new Date(calendarMonth);
                      d.setMonth(d.getMonth() + 1);
                      setCalendarMonth(d);
                    }}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => jumpToQuickDate('today')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                    selectedDate === todayStr 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' 
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Today
                </button>

                <button
                  onClick={() => jumpToQuickDate('yesterday')}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Yesterday
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
                <div
                  key={weekday}
                  className="text-center py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider"
                >
                  {weekday}
                </div>
              ))}

              {calendarDays.map((cell, idx) => {
                if (!cell.isCurrentMonth) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[64px] rounded-xl bg-slate-100/40 border border-transparent opacity-30"
                    />
                  );
                }

                const dayData = dateFinancialAggregates[cell.dateStr];
                const isSelected = selectedDate === cell.dateStr;
                const isToday = todayStr === cell.dateStr;
                const hasIncome = dayData && dayData.income > 0;
                const hasExp = dayData && dayData.expenditure > 0;
                const net = dayData ? dayData.net : 0;

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(cell.dateStr)}
                    className={`min-h-[70px] p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between relative group ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                        : isToday
                        ? 'bg-white border-indigo-300 hover:border-indigo-400'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-bold ${
                        isSelected 
                          ? 'text-indigo-900 font-black' 
                          : isToday 
                          ? 'text-indigo-600 font-extrabold' 
                          : 'text-slate-700'
                      }`}>
                        {cell.dayNumber}
                      </span>

                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 ring-2 ring-indigo-200" title="Today" />
                      )}
                    </div>

                    {/* Incomes & Expenditures pills */}
                    <div className="space-y-0.5 mt-1 w-full text-[10px]">
                      {hasIncome && (
                        <div className="truncate text-emerald-700 font-mono font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/60 text-[9px]">
                          +{formatCurrency(dayData.income)}
                        </div>
                      )}
                      {hasExp && (
                        <div className="truncate text-rose-700 font-mono font-bold bg-rose-50 px-1 py-0.2 rounded border border-rose-200/60 text-[9px]">
                          -{formatCurrency(dayData.expenditure)}
                        </div>
                      )}
                      {!hasIncome && !hasExp && (
                        <div className="text-[10px] text-slate-300 italic py-1 text-center">
                          &bull;
                        </div>
                      )}
                    </div>

                    {/* Net indicator dot */}
                    {(hasIncome || hasExp) && (
                      <div className="mt-1 flex items-center justify-between text-[9px] pt-0.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium">Net</span>
                        <span className={`font-mono font-bold ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {net >= 0 ? '+' : ''}{formatCurrency(net)}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Tab Navigation for Selected Date */}
          <div className="border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-xs font-bold">
              <button
                onClick={() => setActiveTab('reconciliation')}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'reconciliation'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>Daily Reconciliation Summary</span>
              </button>

              <button
                onClick={() => setActiveTab('incomes')}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'incomes'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Incomes Register ({selectedDayIncomes.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('expenditures')}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'expenditures'
                    ? 'border-rose-600 text-rose-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Expenditures Register ({selectedDayExpenditures.length})</span>
              </button>
            </div>

            <div className="pb-2 text-xs text-slate-500 font-medium flex items-center gap-2">
              <span>Showing:</span>
              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                {selectedDate}
              </span>
            </div>
          </div>

          {/* 5. Subtab 1: Daily Reconciliation Breakdown */}
          {activeTab === 'reconciliation' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Departmental Incomes Distribution */}
              <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Incomes by Clinical Service
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Gross receipts categorized by medical department.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black font-mono text-emerald-700">
                      {formatCurrency(selectedDayMetrics.totalIncome)}
                    </div>
                    <span className="text-[10px] text-slate-400">Total Incomes</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {Object.entries(selectedDayMetrics.deptIncomes).map(([dept, rawAmount]) => {
                    const amount = Number(rawAmount) || 0;
                    const pct = selectedDayMetrics.totalIncome > 0 
                      ? Math.round((amount / selectedDayMetrics.totalIncome) * 100) 
                      : 0;

                    return (
                      <div key={dept} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{dept}</span>
                          <span className="font-bold font-mono text-slate-900">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 text-right">
                          {pct}% of day's income
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Categorized Expenditures Distribution */}
              <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Expenditures by Cost Category
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Operational outflows and petty cash disbursements.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black font-mono text-rose-700">
                      {formatCurrency(selectedDayMetrics.totalExpenditure)}
                    </div>
                    <span className="text-[10px] text-slate-400">Total Outflows</span>
                  </div>
                </div>

                {selectedDayExpenditures.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-slate-600">No expenditures recorded for {selectedDate}</p>
                    <p className="text-[11px] mt-1">Use the "Add Expenditure" button above to log petty cash or supplies.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {Object.entries(selectedDayMetrics.catExpenditures).map(([cat, rawAmount]) => {
                      const amount = Number(rawAmount) || 0;
                      const pct = selectedDayMetrics.totalExpenditure > 0
                        ? Math.round((amount / selectedDayMetrics.totalExpenditure) * 100)
                        : 0;

                      return (
                        <div key={cat} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">{cat}</span>
                            <span className="font-bold font-mono text-rose-700">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                            <div
                              className="bg-rose-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-400 text-right">
                            {pct}% of day's outflow
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. Subtab 2: Detailed Incomes Register */}
          {activeTab === 'incomes' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-800">
                  Receipts Logged on {selectedDate} ({selectedDayIncomes.length})
                </span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  Total Collected: {formatCurrency(selectedDayMetrics.totalIncome)}
                </span>
              </div>

              {selectedDayIncomes.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-bold text-slate-600">No payment receipts recorded for this date</p>
                  <p className="text-[11px] mt-0.5">Payments settled via Billing Counter appear here automatically.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                        <th className="py-2.5 px-3">Receipt #</th>
                        <th className="py-2.5 px-3">Patient Details</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Description / Items</th>
                        <th className="py-2.5 px-3">Payment Mode</th>
                        <th className="py-2.5 px-3">Cashier</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedDayIncomes.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {tx.receiptNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{tx.patientName}</div>
                            <div className="text-[10px] text-slate-400">{tx.patientMrn}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {tx.department}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={tx.description}>
                            {tx.description}
                          </td>
                          <td className="py-2.5 px-3 capitalize text-slate-700 font-medium">
                            {tx.paymentMethod}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {tx.receivedBy}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 7. Subtab 3: Detailed Expenditures Register */}
          {activeTab === 'expenditures' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-800">
                  Expenditure Vouchers on {selectedDate} ({selectedDayExpenditures.length})
                </span>
                <span className="font-mono font-bold text-rose-700 text-sm">
                  Total Disbursed: {formatCurrency(selectedDayMetrics.totalExpenditure)}
                </span>
              </div>

              {selectedDayExpenditures.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-bold text-slate-600">No expenditure vouchers recorded on this date</p>
                  <button
                    onClick={handleOpenExpenseModal}
                    className="mt-2 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record Expense for {selectedDate}</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                        <th className="py-2.5 px-3">Voucher #</th>
                        <th className="py-2.5 px-3">Purpose & Title</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Items & Quantities</th>
                        <th className="py-2.5 px-3">Payee / Mode</th>
                        <th className="py-2.5 px-3">Recorded By & Time</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedDayExpenditures.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {exp.receiptOrVoucherNumber || exp.id}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {exp.title}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="space-y-0.5 max-w-xs">
                              {exp.items.map((it, i) => (
                                <div key={i} className="text-[11px] text-slate-700">
                                  &bull; {it.name} <span className="text-slate-500 font-mono font-bold">({it.quantity} {it.unit})</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="capitalize font-semibold text-slate-800">
                              {exp.paymentMethod.replace('_', ' ')}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {exp.vendorOrPayee || 'Internal'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800">
                              {exp.enteredByUserName} ({exp.enteredByUserRole})
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(exp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                            {formatCurrency(exp.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Daily Expenditure</h3>
                  <p className="text-xs text-slate-300">Directly post operational expenses to the general journal.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Title / Expense Purpose *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lab Reagents, Generator Fuel, Sterile Gloves..."
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as ExpenditureCategory)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 text-xs bg-white"
                  >
                    {EXPENDITURE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
                  <select
                    value={expPaymentMethod}
                    onChange={(e) => setExpPaymentMethod(e.target.value as DailyExpenditure['paymentMethod'])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 text-xs bg-white"
                  >
                    <option value="petty_cash">Petty Cash</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="card">Corporate Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Voucher / Receipt Reference</label>
                  <input
                    type="text"
                    placeholder="VCH-2026-XXXX"
                    value={expVoucherNo}
                    onChange={(e) => setExpVoucherNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor / Payee</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Health Ltd"
                    value={expVendor}
                    onChange={(e) => setExpVendor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 text-xs"
                  />
                </div>
              </div>

              {/* Items & Quantities */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Itemized Items & Quantities
                  </span>
                  <button
                    type="button"
                    onClick={handleAddExpItemRow}
                    className="px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {expItems.map((item, idx) => (
                    <div key={item.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Item name..."
                        value={item.name}
                        onChange={(e) => handleExpItemChange(idx, 'name', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity || ''}
                        onChange={(e) => handleExpItemChange(idx, 'quantity', e.target.value)}
                        className="w-16 px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-center font-mono font-bold text-xs"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => handleExpItemChange(idx, 'unit', e.target.value)}
                        className="w-20 px-1.5 py-1.5 border border-slate-200 bg-white rounded-lg text-[11px]"
                      >
                        <option value="pcs">pcs</option>
                        <option value="boxes">boxes</option>
                        <option value="liters">liters</option>
                        <option value="packs">packs</option>
                        <option value="kg">kg</option>
                        <option value="bottles">bottles</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Cost"
                        value={item.unitCost || ''}
                        onChange={(e) => handleExpItemChange(idx, 'unitCost', e.target.value)}
                        className="w-20 px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-right font-mono font-bold text-xs"
                      />
                      <div className="w-24 text-right font-mono font-bold text-slate-800 text-xs">
                        {formatCurrency(item.totalCost)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExpItemRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
                <span>Total Outflow for Voucher:</span>
                <span className="text-base font-black font-mono text-rose-700">
                  {formatCurrency(expItems.reduce((s, it) => s + it.totalCost, 0))}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  Commit Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
