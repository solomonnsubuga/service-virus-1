import React, { useState, useMemo } from 'react';
import { useClinic } from '../../../context/ClinicContext';
import { DailyExpenditure, DailyExpenditureItem, ExpenditureCategory } from '../../../types';
import {
  Receipt,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Search,
  Calendar,
  Clock,
  User as UserIcon,
  DollarSign,
  ArrowDownRight,
  TrendingDown,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  Building2,
  CreditCard,
  Tag,
  FileCheck2,
  CheckCircle,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

const CATEGORIES: ExpenditureCategory[] = [
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

const PAYMENT_METHODS = [
  { id: 'petty_cash', label: 'Petty Cash' },
  { id: 'cash', label: 'Cash in Hand' },
  { id: 'bank_transfer', label: 'Bank Transfer / EFT' },
  { id: 'mobile_money', label: 'Mobile Money (M-Pesa / MTN / Airtel)' },
  { id: 'card', label: 'Debit / Corporate Card' },
  { id: 'cheque', label: 'Cheque' }
] as const;

interface DailyExpendituresManagerProps {
  onSelectDateForInvestigation?: (dateStr: string) => void;
}

export const DailyExpendituresManager: React.FC<DailyExpendituresManagerProps> = () => {
  const {
    currentClinicDailyExpenditures,
    addDailyExpenditure,
    updateDailyExpenditure,
    deleteDailyExpenditure,
    currentUser,
    activeClinic,
    formatCurrency,
    ledgers
  } = useClinic();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter and Search States
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'yesterday' | 'all' | 'custom'>('today');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingExpenditure, setEditingExpenditure] = useState<DailyExpenditure | null>(null);
  const [viewingExpenditure, setViewingExpenditure] = useState<DailyExpenditure | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form Fields State
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<ExpenditureCategory>('Medical Supplies');
  const [formDate, setFormDate] = useState<string>(todayStr);
  const [formPaymentMethod, setFormPaymentMethod] = useState<DailyExpenditure['paymentMethod']>('petty_cash');
  const [formVoucherNo, setFormVoucherNo] = useState<string>('');
  const [formVendor, setFormVendor] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formItems, setFormItems] = useState<DailyExpenditureItem[]>([
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

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingExpenditure(null);
    setFormTitle('');
    setFormCategory('Medical Supplies');
    setFormDate(todayStr);
    setFormPaymentMethod('petty_cash');
    setFormVoucherNo(`VCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormVendor('');
    setFormNotes('');
    setFormItems([
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
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (exp: DailyExpenditure) => {
    setEditingExpenditure(exp);
    setFormTitle(exp.title);
    setFormCategory(exp.category);
    setFormDate(exp.date);
    setFormPaymentMethod(exp.paymentMethod);
    setFormVoucherNo(exp.receiptOrVoucherNumber || '');
    setFormVendor(exp.vendorOrPayee || '');
    setFormNotes(exp.notes || '');
    setFormItems(
      exp.items.length > 0
        ? exp.items.map(it => ({ ...it }))
        : [
            {
              id: `item-${Date.now()}-1`,
              name: exp.title,
              quantity: 1,
              unit: 'entry',
              unitCost: exp.totalAmount,
              totalCost: exp.totalAmount,
              notes: ''
            }
          ]
    );
    setIsFormModalOpen(true);
  };

  // Form Item Management
  const handleAddItemRow = () => {
    setFormItems(prev => [
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

  const handleRemoveItemRow = (index: number) => {
    if (formItems.length <= 1) {
      // Reset first row rather than removing
      setFormItems([
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
    setFormItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof DailyExpenditureItem, value: any) => {
    setFormItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === 'quantity' || field === 'unitCost') {
        const qty = field === 'quantity' ? Number(value) || 0 : Number(item.quantity) || 0;
        const cost = field === 'unitCost' ? Number(value) || 0 : Number(item.unitCost) || 0;
        item.totalCost = Math.round(qty * cost * 100) / 100;
      }

      updated[index] = item;
      return updated;
    });
  };

  // Total Form Cost calculation
  const computedFormTotal = useMemo(() => {
    return formItems.reduce((acc, it) => acc + (Number(it.totalCost) || 0), 0);
  }, [formItems]);

  // Submit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTitle = formTitle.trim() || (formItems[0]?.name ? `${formCategory}: ${formItems[0].name}` : `${formCategory} Expenditure`);

    // Clean items
    const cleanedItems = formItems
      .filter(it => it.name.trim() !== '' || it.totalCost > 0)
      .map(it => ({
        ...it,
        name: it.name.trim() || 'General Item',
        quantity: Number(it.quantity) || 1,
        unit: it.unit.trim() || 'pcs',
        unitCost: Number(it.unitCost) || 0,
        totalCost: Number(it.totalCost) || (Number(it.quantity) * Number(it.unitCost)) || 0
      }));

    if (cleanedItems.length === 0) {
      alert('Please add at least one item with a name or cost.');
      return;
    }

    const totalAmount = cleanedItems.reduce((sum, it) => sum + it.totalCost, 0);

    if (editingExpenditure) {
      updateDailyExpenditure(editingExpenditure.id, {
        title: cleanTitle,
        category: formCategory,
        date: formDate,
        items: cleanedItems,
        totalAmount,
        paymentMethod: formPaymentMethod,
        receiptOrVoucherNumber: formVoucherNo.trim(),
        vendorOrPayee: formVendor.trim(),
        notes: formNotes.trim()
      });
    } else {
      addDailyExpenditure({
        title: cleanTitle,
        category: formCategory,
        date: formDate,
        items: cleanedItems,
        totalAmount,
        paymentMethod: formPaymentMethod,
        receiptOrVoucherNumber: formVoucherNo.trim(),
        vendorOrPayee: formVendor.trim(),
        notes: formNotes.trim()
      });
    }

    setIsFormModalOpen(false);
  };

  // Delete handler
  const confirmDelete = (id: string) => {
    deleteDailyExpenditure(id);
    setDeletingId(null);
  };

  // Quick Date presets
  const setQuickFilterDate = (mode: 'today' | 'yesterday' | 'all') => {
    setDateFilterMode(mode);
    if (mode === 'today') {
      setSelectedDate(todayStr);
    } else if (mode === 'yesterday') {
      const y = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      setSelectedDate(y);
    }
  };

  // Filtered Expenditures
  const filteredExpenditures = useMemo(() => {
    return currentClinicDailyExpenditures.filter(exp => {
      // Date Filter
      if (dateFilterMode === 'today' && exp.date !== todayStr) return false;
      if (dateFilterMode === 'yesterday') {
        const y = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (exp.date !== y) return false;
      }
      if (dateFilterMode === 'custom' && exp.date !== selectedDate) return false;

      // Category Filter
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) return false;

      // Payment Method Filter
      if (selectedPaymentMethod !== 'all' && exp.paymentMethod !== selectedPaymentMethod) return false;

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = exp.title.toLowerCase().includes(q);
        const matchVoucher = exp.receiptOrVoucherNumber?.toLowerCase().includes(q);
        const matchVendor = exp.vendorOrPayee?.toLowerCase().includes(q);
        const matchUser = exp.enteredByUserName.toLowerCase().includes(q) || exp.enteredByUserRole.toLowerCase().includes(q);
        const matchNotes = exp.notes?.toLowerCase().includes(q);
        const matchItems = exp.items.some(it => it.name.toLowerCase().includes(q) || it.notes?.toLowerCase().includes(q));
        if (!matchTitle && !matchVoucher && !matchVendor && !matchUser && !matchNotes && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [
    currentClinicDailyExpenditures,
    dateFilterMode,
    selectedDate,
    todayStr,
    selectedCategory,
    selectedPaymentMethod,
    searchQuery
  ]);

  // KPI Calculations
  const stats = useMemo(() => {
    // Today's Expenditures
    const todayExps = currentClinicDailyExpenditures.filter(e => e.date === todayStr);
    const todayTotal = todayExps.reduce((sum, e) => sum + e.totalAmount, 0);

    // Filtered Total
    const filteredTotal = filteredExpenditures.reduce((sum, e) => sum + e.totalAmount, 0);

    // Today's Total Clinic Revenue from Ledgers
    let todayIncome = 0;
    ledgers.forEach(l => {
      (l.transactions || []).forEach(p => {
        if (p.date.startsWith(todayStr)) {
          todayIncome += p.amountPaid;
        }
      });
    });

    const netCashflow = todayIncome - todayTotal;

    // Top Category in filtered data
    const catMap: Record<string, number> = {};
    filteredExpenditures.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.totalAmount;
    });
    let topCatName = 'N/A';
    let topCatAmount = 0;
    Object.entries(catMap).forEach(([cat, amount]) => {
      if (amount > topCatAmount) {
        topCatAmount = amount;
        topCatName = cat;
      }
    });

    return {
      todayTotal,
      todayCount: todayExps.length,
      filteredTotal,
      filteredCount: filteredExpenditures.length,
      todayIncome,
      netCashflow,
      topCatName,
      topCatAmount
    };
  }, [currentClinicDailyExpenditures, filteredExpenditures, todayStr, ledgers]);

  // Print Expense Voucher
  const handlePrintVoucher = (exp: DailyExpenditure) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const itemsHtml = exp.items
      .map(
        (it, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-size: 12px; color: #475569;">${idx + 1}</td>
          <td style="padding: 10px; font-size: 12px; font-weight: 600; color: #0f172a;">
            ${it.name}
            ${it.notes ? `<div style="font-size: 10px; color: #64748b; font-weight: normal;">${it.notes}</div>` : ''}
          </td>
          <td style="padding: 10px; font-size: 12px; color: #334155; text-align: center;">${it.quantity} ${it.unit}</td>
          <td style="padding: 10px; font-size: 12px; color: #334155; text-align: right;">${formatCurrency(it.unitCost)}</td>
          <td style="padding: 10px; font-size: 12px; font-weight: 700; color: #0f172a; text-align: right;">${formatCurrency(it.totalCost)}</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Expenditure Voucher - ${exp.receiptOrVoucherNumber || exp.id}</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #0f172a; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; }
            .clinic-title { font-size: 20px; font-weight: 800; color: #0f172a; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #e2e8f0; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .meta-item { font-size: 12px; }
            .meta-label { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; }
            .meta-value { font-weight: 700; color: #0f172a; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th { background: #0f172a; color: #ffffff; padding: 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
            .total-box { margin-left: auto; width: 280px; padding: 15px; background: #f1f5f9; border-radius: 8px; border: 1px solid #cbd5e1; text-align: right; }
            .total-amount { font-size: 20px; font-weight: 900; color: #0f172a; }
            .audit-section { margin-top: 40px; padding: 15px; border: 1px dashed #94a3b8; border-radius: 8px; font-size: 11px; color: #475569; }
            .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; }
            .signature-line { border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 12px; font-weight: 600; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="clinic-title">${activeClinic?.name || 'Clinic-Sync Portal'}</div>
              <div style="font-size: 12px; color: #64748b;">${activeClinic?.address || 'Official Financial Voucher'}</div>
              <div style="font-size: 12px; color: #64748b;">Tel: ${activeClinic?.phone || 'N/A'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 18px; font-weight: 900; text-transform: uppercase; color: #4338ca;">Official Expenditure Voucher</div>
              <div style="font-size: 12px; font-weight: 700; color: #64748b; margin-top: 4px;">Voucher No: ${exp.receiptOrVoucherNumber || exp.id}</div>
              <div style="font-size: 11px; color: #64748b;">Date: ${exp.date}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Title / Purpose</div>
              <div class="meta-value">${exp.title}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Category</div>
              <div class="meta-value">${exp.category}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Vendor / Payee</div>
              <div class="meta-value">${exp.vendorOrPayee || 'Internal / N/A'}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Payment Mode</div>
              <div class="meta-value" style="text-transform: uppercase;">${exp.paymentMethod.replace('_', ' ')}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Item & Description</th>
                <th style="text-align: center; width: 120px;">Qty & Unit</th>
                <th style="text-align: right; width: 120px;">Unit Cost</th>
                <th style="text-align: right; width: 140px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-box">
            <div style="font-size: 12px; color: #64748b; font-weight: 600;">Total Expenditure Disbursed</div>
            <div class="total-amount">${formatCurrency(exp.totalAmount)}</div>
          </div>

          ${exp.notes ? `
            <div style="margin-top: 20px; padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 12px; color: #92400e;">
              <strong>Remarks / Justification:</strong> ${exp.notes}
            </div>
          ` : ''}

          <div class="audit-section">
            <strong>System Audit Trail:</strong> This expenditure was recorded into the official financial journal by 
            <strong>${exp.enteredByUserName}</strong> (Role: <span style="text-transform: uppercase;">${exp.enteredByUserRole}</span>) 
            at exact ISO Timestamp: <strong>${exp.createdAt}</strong> (${new Date(exp.createdAt).toLocaleString()}). 
            Facility: <strong>${activeClinic?.name}</strong>.
          </div>

          <div class="signature-grid">
            <div class="signature-line">
              Prepared / Recorded By: ${exp.enteredByUserName}
              <div style="font-size: 10px; color: #64748b; font-weight: normal;">Finance Officer / Accounts Gatekeeper</div>
            </div>
            <div class="signature-line">
              Approved By: Medical Director / Admin
              <div style="font-size: 10px; color: #64748b; font-weight: normal;">Signature & Facility Stamp</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Quick Action */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner shrink-0 mt-0.5">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Daily Expenditures & Operational Outflows
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 border border-rose-400/30 text-rose-300">
                Outflow Journal
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/10 text-slate-300">
                {activeClinic?.name || 'Clinic'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Track daily expenses with itemized quantities, unit costs, payment modes, immutable user attribution, and timestamp audit trails.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/20 transition-all hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Record Daily Expenditure</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards: Daily Totals & Cashflow Reconciliation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Expenditure */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-600">Today's Expenditures</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">
            {formatCurrency(stats.todayTotal)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>{stats.todayCount} voucher(s) logged today</span>
            <span className="font-semibold text-slate-700">{todayStr}</span>
          </div>
        </div>

        {/* Filtered Period Expenditure */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-600">Selected View Outflow</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(stats.filteredTotal)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>{stats.filteredCount} record(s) in view</span>
            <span className="text-indigo-600 font-bold capitalize">{dateFilterMode}</span>
          </div>
        </div>

        {/* Net Daily Cash Surplus / Deficit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-600">Net Daily Operating Margin</span>
            <div className={`p-1.5 rounded-lg ${stats.netCashflow >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black tracking-tight ${stats.netCashflow >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {formatCurrency(stats.netCashflow)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Income: {formatCurrency(stats.todayIncome)}</span>
            <span className={stats.netCashflow >= 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
              {stats.netCashflow >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>
        </div>

        {/* Top Expense Category */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-600">Highest Cost Category</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-bold text-slate-900 truncate" title={stats.topCatName}>
            {stats.topCatName}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Category Share:</span>
            <span className="font-bold text-slate-800">{formatCurrency(stats.topCatAmount)}</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Controls & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Date Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setQuickFilterDate('today')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateFilterMode === 'today' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setQuickFilterDate('yesterday')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateFilterMode === 'yesterday' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setQuickFilterDate('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateFilterMode === 'all' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Custom Date Picker */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>Specific Date:</span>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDateFilterMode('custom');
              }}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search items, titles, vouchers, vendors, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-indigo-500 placeholder-slate-400"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:outline-indigo-500"
            >
              <option value="all">All Categories ({CATEGORIES.length})</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Dropdown */}
          <div>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:outline-indigo-500"
            >
              <option value="all">All Payment Methods</option>
              {PAYMENT_METHODS.map(pm => (
                <option key={pm.id} value={pm.id}>{pm.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Itemized Expenditure Journal / Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Expenditure Records ({filteredExpenditures.length})
            </h3>
            <p className="text-xs text-slate-500">
              Complete audit log of recorded expenses with item quantities, costs, users, and timestamps.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Total Filtered:</span>
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-mono font-bold text-xs rounded-lg border border-rose-200">
              {formatCurrency(stats.filteredTotal)}
            </span>
          </div>
        </div>

        {filteredExpenditures.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No expenditure records match your filters</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Click "Record Daily Expenditure" above to log operational expenses, consumables, fuel, or staff costs.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record First Expenditure</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Purpose & Category</th>
                  <th className="py-3 px-4">Items & Quantities</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4">Payment & Vendor</th>
                  <th className="py-3 px-4">Entered By (Audit Trail)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenditures.map((exp) => {
                  const createdDate = new Date(exp.createdAt);
                  const timeFormatted = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{exp.date}</div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{timeFormatted}</span>
                        </div>
                      </td>

                      {/* Purpose & Category */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 max-w-xs">{exp.title}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {exp.category}
                          </span>
                          {exp.receiptOrVoucherNumber && (
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              #{exp.receiptOrVoucherNumber}
                            </span>
                          )}
                        </div>
                        {exp.notes && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1 max-w-xs">
                            "{exp.notes}"
                          </div>
                        )}
                      </td>

                      {/* Items & Quantities */}
                      <td className="py-3 px-4">
                        <div className="space-y-1 max-w-xs">
                          {exp.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2 text-[11px] bg-slate-50 p-1 rounded border border-slate-100">
                              <span className="font-medium text-slate-800 truncate" title={it.name}>
                                {it.name}
                              </span>
                              <span className="font-mono font-bold text-slate-600 shrink-0">
                                {it.quantity} {it.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="text-sm font-black font-mono text-rose-600">
                          {formatCurrency(exp.totalAmount)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {exp.items.length} item{exp.items.length !== 1 ? 's' : ''}
                        </div>
                      </td>

                      {/* Payment & Vendor */}
                      <td className="py-3 px-4">
                        <div className="capitalize font-semibold text-slate-800">
                          {exp.paymentMethod.replace('_', ' ')}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                          {exp.vendorOrPayee ? `Vendor: ${exp.vendorOrPayee}` : 'Direct disbursement'}
                        </div>
                      </td>

                      {/* Entered By (User & Role & Timestamp) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold">
                            {exp.enteredByUserName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">
                            {exp.enteredByUserName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                            {exp.enteredByUserRole}
                          </span>
                          <span className="text-[10px] text-slate-400" title={exp.createdAt}>
                            • {new Date(exp.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Voucher */}
                          <button
                            onClick={() => handlePrintVoucher(exp)}
                            className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                            title="Print Voucher Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* View Full Detail */}
                          <button
                            onClick={() => setViewingExpenditure(exp)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                            title="View Full Breakdown"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(exp)}
                            className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                            title="Edit Expenditure"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeletingId(exp.id)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Delete Record"
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
        )}
      </div>

      {/* 5. Create / Edit Expenditure Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-indigo-200">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingExpenditure ? 'Edit Daily Expenditure' : 'Record Daily Expenditure'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Add line items, quantities, unit prices, and payment attribution.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Basic Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Expenditure Title / Purpose *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lab Reagents Replenishment, Generator Fuel..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-indigo-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Expenditure Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenditureCategory)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:outline-indigo-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date of Expense *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    max={todayStr}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-indigo-500"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as DailyExpenditure['paymentMethod'])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:outline-indigo-500"
                  >
                    {PAYMENT_METHODS.map(pm => (
                      <option key={pm.id} value={pm.id}>{pm.label}</option>
                    ))}
                  </select>
                </div>

                {/* Voucher / Receipt Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Voucher / Receipt Reference #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VCH-2026-1029 or RCP-5521"
                    value={formVoucherNo}
                    onChange={(e) => setFormVoucherNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-indigo-500"
                  />
                </div>

                {/* Vendor / Payee */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vendor / Supplier / Payee
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Medical Supplies Ltd"
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-indigo-500"
                  />
                </div>
              </div>

              {/* Items & Quantities Section (Crucial user request!) */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Line Items & Quantities</span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                        {formItems.length} {formItems.length === 1 ? 'item' : 'items'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Breakdown of purchased products, quantities, units, and unit costs.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {/* Item List Rows */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {formItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs"
                    >
                      <div className="w-6 text-center font-bold text-slate-400 text-[11px] shrink-0">
                        #{idx + 1}
                      </div>

                      {/* Item Name */}
                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          required
                          placeholder="Item name (e.g. EDTA tubes, Diesel, Syringes)..."
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-800 focus:outline-indigo-500"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="w-20 shrink-0">
                        <input
                          type="number"
                          min="1"
                          step="any"
                          required
                          placeholder="Qty"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-center font-mono font-bold text-slate-800 focus:outline-indigo-500"
                          title="Quantity"
                        />
                      </div>

                      {/* Unit */}
                      <div className="w-20 shrink-0">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full px-1.5 py-1.5 border border-slate-200 bg-white rounded-lg text-[11px] text-slate-700 focus:outline-indigo-500"
                        >
                          <option value="pcs">pcs</option>
                          <option value="boxes">boxes</option>
                          <option value="packs">packs</option>
                          <option value="liters">liters</option>
                          <option value="bottles">bottles</option>
                          <option value="kg">kg</option>
                          <option value="cartons">cartons</option>
                          <option value="units">units</option>
                        </select>
                      </div>

                      {/* Unit Cost */}
                      <div className="w-24 shrink-0">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder="Unit cost"
                          value={item.unitCost || ''}
                          onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-right font-mono font-bold text-slate-800 focus:outline-indigo-500"
                          title="Unit Cost"
                        />
                      </div>

                      {/* Line Total */}
                      <div className="w-28 text-right font-bold font-mono text-slate-900 shrink-0 px-1 text-xs">
                        {formatCurrency(item.totalCost)}
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Subtotal Ribbon */}
                <div className="mt-3 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                  <div className="text-xs text-indigo-900 font-medium">
                    Calculated Total Outflow ({formItems.length} item{formItems.length !== 1 ? 's' : ''}):
                  </div>
                  <div className="text-lg font-black font-mono text-indigo-950">
                    {formatCurrency(computedFormTotal)}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Justification / Additional Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context, department usage, approval reference..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-indigo-500"
                />
              </div>

              {/* Immutable Audit Attribution Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <strong>Audit Attribution:</strong> This record will be permanently attributed to{' '}
                  <strong>{currentUser?.name || 'Accountant'}</strong> (Role: <span className="uppercase font-bold">{currentUser?.role || 'accountant'}</span>) 
                  with server timestamp <strong>{new Date().toISOString()}</strong>.
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow"
                >
                  {editingExpenditure ? 'Save Changes' : 'Commit Daily Expenditure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. View Full Breakdown Modal */}
      {viewingExpenditure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/30 flex items-center justify-center text-indigo-300">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {viewingExpenditure.title}
                  </h3>
                  <span className="text-xs text-slate-300">
                    Voucher: {viewingExpenditure.receiptOrVoucherNumber || viewingExpenditure.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingExpenditure(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Date</span>
                  <div className="font-bold text-slate-800">{viewingExpenditure.date}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Category</span>
                  <div className="font-bold text-indigo-700">{viewingExpenditure.category}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Payment</span>
                  <div className="font-bold text-slate-800 capitalize">
                    {viewingExpenditure.paymentMethod.replace('_', ' ')}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Vendor</span>
                  <div className="font-bold text-slate-800">{viewingExpenditure.vendorOrPayee || 'N/A'}</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Itemized List ({viewingExpenditure.items.length})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Unit Price</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingExpenditure.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{it.name}</td>
                          <td className="py-2 px-3 text-center text-slate-600">{it.quantity} {it.unit}</td>
                          <td className="py-2 px-3 text-right text-slate-600 font-mono">{formatCurrency(it.unitCost)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">{formatCurrency(it.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="text-xs font-bold text-rose-900">Total Expenditure Amount:</span>
                <span className="text-lg font-black font-mono text-rose-700">
                  {formatCurrency(viewingExpenditure.totalAmount)}
                </span>
              </div>

              {/* Audit attribution card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Audit & Timestamp Trail</div>
                <div className="text-slate-700">
                  Recorded by: <strong>{viewingExpenditure.enteredByUserName}</strong> ({viewingExpenditure.enteredByUserRole})
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  Created at: {viewingExpenditure.createdAt} ({new Date(viewingExpenditure.createdAt).toLocaleString()})
                </div>
                {viewingExpenditure.updatedAt && (
                  <div className="text-slate-500 font-mono text-[11px]">
                    Last updated: {viewingExpenditure.updatedAt} by {viewingExpenditure.updatedByUserName || 'Staff'}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => handlePrintVoucher(viewingExpenditure)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  onClick={() => setViewingExpenditure(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Confirm Delete Dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Expenditure Record?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove this expenditure entry? This will reverse the recorded outflow from financial reports.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deletingId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
