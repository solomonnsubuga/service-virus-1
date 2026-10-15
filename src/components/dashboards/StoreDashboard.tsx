import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { InventoryCategory, InventoryItem, StockBatch, SubInventoryLocation } from '../../types';
import { InsurancePricingModal } from '../store/InsurancePricingModal';
import {
  Boxes,
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Calendar,
  Layers,
  FileSpreadsheet,
  Printer,
  X,
  TrendingDown,
  ArrowRightLeft,
  DollarSign,
  ShieldCheck,
  Lock,
  Building2,
  CheckCircle2,
  Eye,
  Info,
  Truck,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

interface StoreDashboardProps {
  onOpenInventory: () => void;
}

export const StoreDashboard: React.FC<StoreDashboardProps> = ({ onOpenInventory }) => {
  const {
    activeClinic,
    currentClinicInventory,
    currentUser,
    currentClinicInsurancePolicies,
    getItemSellingPrice,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    addStockBatch,
    adjustStockQuantity,
    transferStockBetweenInventories
  } = useClinic();

  // Role restriction: ONLY Admin or Store Manager can add or edit
  const canModify = currentUser.role === 'admin' || currentUser.role === 'store_manager';

  // Available insurance policies for current clinic
  const availableInsurancePolicies = useMemo(() => {
    return (currentClinicInsurancePolicies || []).filter(p => p.status === 'active');
  }, [currentClinicInsurancePolicies]);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'inventory' | 'low_stock' | 'batches' | 'transfers' | 'add_item'>('inventory');

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubInventory, setSelectedSubInventory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'normal' | 'low' | 'out'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock_asc' | 'stock_desc' | 'value_desc'>('name');

  // Insurance Pricing View & Filter
  const [selectedInsurancePricing, setSelectedInsurancePricing] = useState<string>('cash');
  const [insuranceTariffFilter, setInsuranceTariffFilter] = useState<'all' | 'custom_only' | 'fallback_only'>('all');

  // Modal States
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [pricingModalItem, setPricingModalItem] = useState<InventoryItem | null>(null);
  const [batchModalItem, setBatchModalItem] = useState<InventoryItem | null>(null);
  const [adjustModalItem, setAdjustModalItem] = useState<InventoryItem | null>(null);
  const [transferModalItem, setTransferModalItem] = useState<InventoryItem | null>(null);
  const [viewBatchesItem, setViewBatchesItem] = useState<InventoryItem | null>(null);

  // Forms
  const [editFormData, setEditFormData] = useState({
    name: '',
    genericName: '',
    category: 'pharmaceutical' as InventoryCategory,
    department: 'pharmacy' as InventoryItem['department'],
    subInventory: 'main' as SubInventoryLocation,
    unit: 'tablets',
    dosageForm: '',
    reorderLevel: 20,
    idealStockLevel: 100,
    unitCost: 0,
    sellingPrice: 0,
    insurancePrices: {} as Record<string, number>,
    requiresPrescription: false
  });

  const [batchFormData, setBatchFormData] = useState({
    batchNumber: '',
    expiryDate: '',
    quantity: 50,
    unitCost: 0,
    sellingPrice: 0,
    supplier: '',
    locationRack: 'Main-Store-A1'
  });

  const [adjustFormData, setAdjustFormData] = useState({
    batchId: '',
    quantityChange: 0,
    reason: 'Physical Count Reconciliation'
  });

  const [transferFormData, setTransferFormData] = useState({
    fromSub: 'main' as SubInventoryLocation,
    toSub: 'pharmacy' as SubInventoryLocation,
    quantity: 10,
    notes: 'Internal departmental stock issue'
  });

  // New Catalog Item Form State
  const [newItemData, setNewItemData] = useState({
    code: '',
    name: '',
    genericName: '',
    category: 'pharmaceutical' as InventoryCategory,
    department: 'pharmacy' as InventoryItem['department'],
    subInventory: 'main' as SubInventoryLocation,
    unit: 'tablets',
    dosageForm: 'Tablets',
    reorderLevel: 20,
    idealStockLevel: 100,
    unitCost: 5.0,
    sellingPrice: 9.5,
    requiresPrescription: true,
    batchNumber: '',
    expiryDate: '2028-12-31',
    initialQuantity: 100,
    supplier: 'National Pharma Wholesalers',
    locationRack: 'Shelf-A-01'
  });

  // Insurance Selling Prices for New Item
  const [newItemInsurancePrices, setNewItemInsurancePrices] = useState<Record<string, number>>({});

  // Calculate KPIs
  const totalSKUs = currentClinicInventory.length;
  const totalStockUnits = currentClinicInventory.reduce((acc, item) => acc + item.totalQuantity, 0);
  const totalInventoryCost = currentClinicInventory.reduce((acc, item) => acc + (item.totalQuantity * item.unitCost), 0);
  const totalRetailValuation = useMemo(() => {
    return currentClinicInventory.reduce((acc, item) => {
      const price = selectedInsurancePricing === 'cash'
        ? item.sellingPrice
        : getItemSellingPrice(item, selectedInsurancePricing);
      return acc + (item.totalQuantity * price);
    }, 0);
  }, [currentClinicInventory, selectedInsurancePricing, getItemSellingPrice]);
  const lowStockItems = currentClinicInventory.filter(item => item.totalQuantity <= item.reorderLevel);

  // Flattened batches for expiry register
  const allBatches = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const batches: Array<{
      id: string;
      itemId: string;
      itemName: string;
      itemCode: string;
      category: string;
      unit: string;
      batchNumber: string;
      quantity: number;
      expiryDate: string;
      unitCost: number;
      supplier?: string;
      locationRack?: string;
      daysRemaining: number;
      status: 'expired' | 'critical' | 'warning' | 'good';
    }> = [];

    currentClinicInventory.forEach(item => {
      (item.batches || []).forEach(b => {
        const expDate = new Date(b.expiryDate).getTime();
        const now = new Date(today).getTime();
        const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));

        let status: 'expired' | 'critical' | 'warning' | 'good' = 'good';
        if (diffDays <= 0) {
          status = 'expired';
        } else if (diffDays <= 30) {
          status = 'critical';
        } else if (diffDays <= 90) {
          status = 'warning';
        }

        batches.push({
          id: b.id,
          itemId: item.id,
          itemName: item.name,
          itemCode: item.code,
          category: item.category,
          unit: item.unit,
          batchNumber: b.batchNumber,
          quantity: b.quantity,
          expiryDate: b.expiryDate,
          unitCost: b.unitCost || item.unitCost,
          supplier: b.supplier,
          locationRack: b.locationRack,
          daysRemaining: diffDays,
          status
        });
      });
    });

    return batches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [currentClinicInventory]);

  const expiredBatchesCount = allBatches.filter(b => b.status === 'expired').length;
  const criticalBatchesCount = allBatches.filter(b => b.status === 'critical').length;

  // Filtered and Sorted Inventory List
  const filteredInventory = useMemo(() => {
    return currentClinicInventory
      .filter(item => {
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        const matchesSub = selectedSubInventory === 'all' || (item.subInventory || 'main') === selectedSubInventory;
        
        let matchesStatus = true;
        if (stockStatusFilter === 'low') {
          matchesStatus = item.totalQuantity > 0 && item.totalQuantity <= item.reorderLevel;
        } else if (stockStatusFilter === 'out') {
          matchesStatus = item.totalQuantity === 0;
        } else if (stockStatusFilter === 'normal') {
          matchesStatus = item.totalQuantity > item.reorderLevel;
        }

        // Insurance-Specific Tariff Filtering
        if (selectedInsurancePricing !== 'cash') {
          const hasCustomPrice = item.insurancePrices && (
            item.insurancePrices[selectedInsurancePricing] !== undefined ||
            Object.keys(item.insurancePrices).some(k => k.toLowerCase() === selectedInsurancePricing.toLowerCase())
          );
          if (insuranceTariffFilter === 'custom_only' && !hasCustomPrice) {
            return false;
          }
          if (insuranceTariffFilter === 'fallback_only' && hasCustomPrice) {
            return false;
          }
        }

        const query = searchQuery.toLowerCase();
        const matchesSearch = item.name.toLowerCase().includes(query) ||
          item.code.toLowerCase().includes(query) ||
          (item.genericName && item.genericName.toLowerCase().includes(query));

        return matchesCategory && matchesSub && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'stock_asc') return a.totalQuantity - b.totalQuantity;
        if (sortBy === 'stock_desc') return b.totalQuantity - a.totalQuantity;
        if (sortBy === 'value_desc') return (b.totalQuantity * b.unitCost) - (a.totalQuantity * a.unitCost);
        return 0;
      });
  }, [currentClinicInventory, selectedCategory, selectedSubInventory, stockStatusFilter, searchQuery, sortBy, selectedInsurancePricing, insuranceTariffFilter]);

  // Handlers for Add / Edit / Actions
  const handleOpenEditModal = (item: InventoryItem) => {
    if (!canModify) {
      alert('Unauthorized: Only users with an Admin or Store Manager role can edit inventory items.');
      return;
    }
    setEditingItem(item);
    setEditFormData({
      name: item.name,
      genericName: item.genericName || '',
      category: item.category,
      department: item.department || 'pharmacy',
      subInventory: item.subInventory || 'main',
      unit: item.unit,
      dosageForm: item.dosageForm || '',
      reorderLevel: item.reorderLevel,
      idealStockLevel: item.idealStockLevel,
      unitCost: item.unitCost,
      sellingPrice: item.sellingPrice,
      insurancePrices: item.insurancePrices ? { ...item.insurancePrices } : {},
      requiresPrescription: !!item.requiresPrescription
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify || !editingItem) return;

    updateInventoryItem(editingItem.id, {
      name: editFormData.name.trim(),
      genericName: editFormData.genericName.trim(),
      category: editFormData.category,
      department: editFormData.department,
      subInventory: editFormData.subInventory,
      unit: editFormData.unit.trim(),
      dosageForm: editFormData.dosageForm.trim(),
      reorderLevel: Number(editFormData.reorderLevel),
      idealStockLevel: Number(editFormData.idealStockLevel),
      unitCost: Number(editFormData.unitCost),
      sellingPrice: Number(editFormData.sellingPrice),
      insurancePrices: editFormData.insurancePrices,
      requiresPrescription: editFormData.requiresPrescription
    });

    setEditingItem(null);
  };

  const handleDeleteItem = (item: InventoryItem) => {
    if (!canModify) {
      alert('Unauthorized: Only Admin or Store Manager can remove inventory records.');
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete "${item.name}" (${item.code}) from ${activeClinic.name} store?`)) {
      deleteInventoryItem(item.id);
    }
  };

  const handleOpenBatchModal = (item: InventoryItem) => {
    if (!canModify) {
      alert('Unauthorized: Only Admin or Store Manager can receive stock batches.');
      return;
    }
    setBatchModalItem(item);
    setBatchFormData({
      batchNumber: `LOT-${Date.now().toString().slice(-6)}`,
      expiryDate: '2028-12-31',
      quantity: Math.max(50, item.idealStockLevel - item.totalQuantity),
      unitCost: item.unitCost,
      sellingPrice: item.sellingPrice,
      supplier: 'Primary Medical Depot',
      locationRack: 'Store-Rack-A'
    });
  };

  const handleSaveBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify || !batchModalItem) return;

    addStockBatch(batchModalItem.id, {
      batchNumber: batchFormData.batchNumber.trim(),
      expiryDate: batchFormData.expiryDate,
      quantity: Number(batchFormData.quantity),
      unitCost: Number(batchFormData.unitCost),
      sellingPrice: Number(batchFormData.sellingPrice),
      supplier: batchFormData.supplier.trim() || 'Standard Delivery',
      locationRack: batchFormData.locationRack.trim() || 'Warehouse Rack'
    });

    setBatchModalItem(null);
  };

  const handleOpenAdjustModal = (item: InventoryItem) => {
    if (!canModify) {
      alert('Unauthorized: Only Admin or Store Manager can adjust stock quantities.');
      return;
    }
    setAdjustModalItem(item);
    setAdjustFormData({
      batchId: item.batches?.[0]?.id || '',
      quantityChange: 0,
      reason: 'Physical Count Reconciliation'
    });
  };

  const handleSaveAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify || !adjustModalItem) return;

    if (!adjustFormData.batchId) {
      alert('Please select a batch to adjust.');
      return;
    }

    if (adjustFormData.quantityChange === 0) {
      alert('Quantity change cannot be 0.');
      return;
    }

    adjustStockQuantity(
      adjustModalItem.id,
      adjustFormData.batchId,
      Number(adjustFormData.quantityChange),
      adjustFormData.reason
    );

    setAdjustModalItem(null);
  };

  const handleOpenTransferModal = (item: InventoryItem) => {
    if (!canModify) {
      alert('Unauthorized: Only Admin or Store Manager can issue stock transfers.');
      return;
    }
    setTransferModalItem(item);
    setTransferFormData({
      fromSub: item.subInventory || 'main',
      toSub: (item.subInventory || 'main') === 'main' ? 'pharmacy' : 'main',
      quantity: Math.min(10, item.totalQuantity),
      notes: 'Issued for dispensary replenishment'
    });
  };

  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify || !transferModalItem) return;

    if (transferFormData.fromSub === transferFormData.toSub) {
      alert('Source and destination sub-inventories must be different.');
      return;
    }

    if (transferFormData.quantity <= 0) {
      alert('Transfer quantity must be greater than 0.');
      return;
    }

    const success = transferStockBetweenInventories(
      transferModalItem.id,
      transferFormData.fromSub,
      transferFormData.toSub,
      Number(transferFormData.quantity),
      transferFormData.notes
    );

    if (success) {
      setTransferModalItem(null);
    }
  };

  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) {
      alert('Unauthorized: Only users with an Admin or Store Manager role can add inventory items.');
      return;
    }

    if (!newItemData.code.trim() || !newItemData.name.trim()) {
      alert('SKU Code and Item Name are required.');
      return;
    }

    addInventoryItem(
      {
        clinicId: activeClinic.id,
        code: newItemData.code.trim().toUpperCase(),
        name: newItemData.name.trim(),
        genericName: newItemData.genericName.trim(),
        category: newItemData.category,
        department: newItemData.department,
        subInventory: newItemData.subInventory,
        unit: newItemData.unit.trim(),
        dosageForm: newItemData.dosageForm.trim(),
        reorderLevel: Number(newItemData.reorderLevel),
        idealStockLevel: Number(newItemData.idealStockLevel),
        unitCost: Number(newItemData.unitCost),
        sellingPrice: Number(newItemData.sellingPrice),
        insurancePrices: newItemInsurancePrices,
        requiresPrescription: newItemData.requiresPrescription,
        batches: []
      },
      {
        batchNumber: newItemData.batchNumber.trim() || `INIT-${Date.now().toString().slice(-4)}`,
        expiryDate: newItemData.expiryDate || '2028-12-31',
        quantity: Number(newItemData.initialQuantity) || 50,
        unitCost: Number(newItemData.unitCost),
        sellingPrice: Number(newItemData.sellingPrice),
        supplier: newItemData.supplier.trim() || 'Central Receiving',
        locationRack: newItemData.locationRack.trim() || 'Main-Store-01'
      }
    );

    // Reset form & switch back to inventory tab
    setNewItemInsurancePrices({});
    setNewItemData({
      code: '',
      name: '',
      genericName: '',
      category: 'pharmaceutical',
      department: 'pharmacy',
      subInventory: 'main',
      unit: 'tablets',
      dosageForm: 'Tablets',
      reorderLevel: 20,
      idealStockLevel: 100,
      unitCost: 5.0,
      sellingPrice: 9.5,
      requiresPrescription: true,
      batchNumber: '',
      expiryDate: '2028-12-31',
      initialQuantity: 100,
      supplier: 'National Pharma Wholesalers',
      locationRack: 'Shelf-A-01'
    });

    setActiveTab('inventory');
  };

  const handleExportCSV = () => {
    const headers = ['SKU Code', 'Item Name', 'Generic Name', 'Category', 'Sub-Store', 'Quantity', 'Unit', 'Reorder Level', 'Unit Cost ($)', 'Selling Price ($)', 'Valuation ($)'];
    const rows = filteredInventory.map(item => [
      `"${item.code}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${(item.genericName || '').replace(/"/g, '""')}"`,
      `"${item.category}"`,
      `"${item.subInventory || 'main'}"`,
      item.totalQuantity,
      `"${item.unit}"`,
      item.reorderLevel,
      item.unitCost.toFixed(2),
      item.sellingPrice.toFixed(2),
      (item.totalQuantity * item.unitCost).toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Store_Catalog_${activeClinic.code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 select-none">
      
      {/* TOP BAR / CONTEXT HEADER */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-600 text-white shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900">
                  Central Medical Store & Warehouse
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase border border-slate-200">
                  {activeClinic.name} ({activeClinic.code})
                </span>
                {canModify ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Manager Clearance (Add & Edit Allowed)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-600" />
                    View-Only Access (Non-Store Manager)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Hospital procurement intake, stock catalog master data, batch receiving, and inter-department issuance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View-Only Central Stock Matrix Quick Button */}
            <button
              onClick={onOpenInventory}
              title="Open View-Only Central Stock Matrix for Cross-Branch Verification"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            >
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>Central Stock Matrix</span>
              <span className="text-[10px] px-1 bg-slate-100 text-slate-600 rounded font-normal">View-Only</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Catalog</span>
            </button>

            {canModify ? (
              <button
                onClick={() => setActiveTab('add_item')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Catalog Item</span>
              </button>
            ) : (
              <div 
                title="Only Administrator or Store Manager roles can add new items to the catalog"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed border border-slate-200"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Add Item (Locked)</span>
              </div>
            )}
          </div>
        </div>

        {/* Permission Notice Banner */}
        {!canModify && (
          <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Restricted Mode:</strong> You are currently signed in as <strong>{currentUser.name}</strong> with role <strong>{currentUser.role.toUpperCase()}</strong>. Only users with <strong>admin</strong> or <strong>store_manager</strong> roles can add or edit inventory items in this list.
              </span>
            </div>
            <span className="text-[10px] text-amber-700 font-bold uppercase">View-Only Enforcement</span>
          </div>
        )}
      </div>

      {/* KPI METRIC CARDS */}
      <div className="p-4 sm:p-6 pb-2 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs font-medium">Catalog SKUs</span>
              <Boxes className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">{totalSKUs}</div>
            <span className="text-[10px] text-slate-400 font-medium">Active master items</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs font-medium">Total In-Stock Units</span>
              <Package className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">{totalStockUnits.toLocaleString()}</div>
            <span className="text-[10px] text-emerald-600 font-medium">Across all sub-stores</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs font-medium">Inventory Valuation</span>
              <DollarSign className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">${totalInventoryCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <span className="text-[10px] text-slate-400 font-medium">Retail: ${totalRetailValuation.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
          </div>

          <div 
            onClick={() => setActiveTab('low_stock')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-amber-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs font-medium">Reorder Alerts</span>
              <AlertTriangle className={`w-4 h-4 ${lowStockItems.length > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
            </div>
            <div className="text-xl font-bold text-amber-700 mt-1">{lowStockItems.length}</div>
            <span className="text-[10px] text-amber-600 font-medium">Items &le; reorder point</span>
          </div>

          <div 
            onClick={() => setActiveTab('batches')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-rose-300 transition-colors cursor-pointer col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs font-medium">Expiry Quality Alerts</span>
              <Calendar className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl font-bold text-rose-700 mt-1">
              {expiredBatchesCount + criticalBatchesCount}
            </div>
            <span className="text-[10px] text-rose-600 font-medium">{expiredBatchesCount} expired, {criticalBatchesCount} &le;30d</span>
          </div>

        </div>
      </div>

      {/* DASHBOARD TAB NAVIGATION */}
      <div className="px-4 sm:px-6 border-b border-slate-200 bg-white flex items-center justify-between gap-4 text-xs font-semibold shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Inventory Master List ({totalSKUs})</span>
          </button>

          <button
            onClick={() => setActiveTab('low_stock')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'low_stock'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Low Stock & Reorder ({lowStockItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('batches')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'batches'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Batch & Expiry Register ({allBatches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'transfers'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-sky-600" />
            <span>Internal Issuance & Transfers</span>
          </button>

          {canModify && (
            <button
              onClick={() => setActiveTab('add_item')}
              className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'add_item'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Add Catalog Item</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB CONTENT AREA */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 sm:p-6 pt-3">
        
        {/* TAB 1: INVENTORY MASTER LIST */}
        {activeTab === 'inventory' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-xl border border-slate-200 shadow-2xs">
            
            {/* Filter Toolbar */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              
              <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by SKU, brand name, generic ingredient..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 text-xs font-medium"
                >
                  <option value="all">All Categories</option>
                  <option value="pharmaceutical">Pharmaceuticals</option>
                  <option value="nursing_consumable">Nursing Consumables</option>
                  <option value="lab_reagent">Pathology Reagents</option>
                  <option value="radiology_supply">Radiology Supplies</option>
                  <option value="surgical">Surgical Supplies</option>
                  <option value="general">General Medical</option>
                </select>

                {/* Sub-Inventory Location Filter */}
                <select
                  value={selectedSubInventory}
                  onChange={(e) => setSelectedSubInventory(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 text-xs font-medium"
                >
                  <option value="all">All Sub-Locations</option>
                  <option value="main">Central Warehouse (main)</option>
                  <option value="pharmacy">Pharmacy Dispensary</option>
                  <option value="nursing">Ward Nurse Station</option>
                </select>

                {/* Stock Level Filter */}
                <select
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 text-xs font-medium"
                >
                  <option value="all">All Stock Statuses</option>
                  <option value="normal">Normal / Healthy Stock</option>
                  <option value="low">Low Stock / Reorder Needed</option>
                  <option value="out">Out of Stock (0 Units)</option>
                </select>

                {/* Sort Filter */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 text-xs font-medium"
                >
                  <option value="name">Sort: Name (A-Z)</option>
                  <option value="stock_asc">Sort: Stock (Low to High)</option>
                  <option value="stock_desc">Sort: Stock (High to Low)</option>
                  <option value="value_desc">Sort: Highest Valuation</option>
                </select>

                {/* Insurance Policy Tariff View Selector */}
                <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-200 px-2.5 py-1 rounded-md">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="text-[11px] font-bold text-emerald-950 whitespace-nowrap">Insurance Tariff:</span>
                  <select
                    value={selectedInsurancePricing}
                    onChange={(e) => setSelectedInsurancePricing(e.target.value)}
                    className="px-2 py-1 border border-emerald-300 rounded bg-white text-xs font-semibold text-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="cash">💵 Standard Cash / Base Price</option>
                    {availableInsurancePolicies.length > 0 && (
                      <optgroup label="Clinic Accepted Insurance Schemes">
                        {availableInsurancePolicies.map(pol => (
                          <option key={pol.id} value={pol.name}>
                            🛡️ {pol.name} {pol.code ? `[${pol.code}]` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  {selectedInsurancePricing !== 'cash' && (
                    <select
                      value={insuranceTariffFilter}
                      onChange={(e) => setInsuranceTariffFilter(e.target.value as any)}
                      className="px-2 py-1 border border-emerald-300 rounded bg-white text-[11px] font-medium text-emerald-800 focus:outline-none"
                      title="Filter items by insurance tariff setup"
                    >
                      <option value="all">All Items</option>
                      <option value="custom_only">Custom Tariff Only</option>
                      <option value="fallback_only">Base Cash Fallback Only</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0 z-10 text-slate-600 font-semibold shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-3">SKU & Item Name</th>
                    <th className="py-2.5 px-3">Category & Sub-Store</th>
                    <th className="py-2.5 px-3 text-right">Available Stock</th>
                    <th className="py-2.5 px-3 text-right">
                      {selectedInsurancePricing === 'cash' ? (
                        'Pricing (Cost / Sell)'
                      ) : (
                        <span className="text-emerald-700">Tariff: {selectedInsurancePricing}</span>
                      )}
                    </th>
                    <th className="py-2.5 px-3 text-right">Total Valuation</th>
                    <th className="py-2.5 px-3">Batches Overview</th>
                    <th className="py-2.5 px-3 text-right">
                      {canModify ? 'Store Actions' : 'Details'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredInventory.map(item => {
                    const isLow = item.totalQuantity <= item.reorderLevel;
                    const isOut = item.totalQuantity === 0;
                    const valuation = item.totalQuantity * item.unitCost;

                    const customInsurancePrice = item.insurancePrices && (
                      item.insurancePrices[selectedInsurancePricing] !== undefined
                        ? item.insurancePrices[selectedInsurancePricing]
                        : Object.entries(item.insurancePrices).find(([k]) => k.toLowerCase() === selectedInsurancePricing.toLowerCase())?.[1]
                    );
                    const hasCustomTariff = typeof customInsurancePrice === 'number';
                    const effectiveSellingPrice = selectedInsurancePricing === 'cash'
                      ? item.sellingPrice
                      : (hasCustomTariff ? customInsurancePrice : item.sellingPrice);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* SKU & Name */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {item.name}
                            {item.requiresPrescription && (
                              <span className="px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[9px] font-bold">
                                Rx
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {item.code} {item.genericName && <span className="font-sans text-slate-600">&bull; {item.genericName}</span>}
                            {item.dosageForm && <span className="font-sans text-slate-400"> ({item.dosageForm})</span>}
                          </div>
                        </td>

                        {/* Category & Location */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 capitalize w-fit">
                              {item.category.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium capitalize">
                              Sub: {item.subInventory || 'Main Store'}
                            </span>
                          </div>
                        </td>

                        {/* Available Stock */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-bold text-slate-900">
                            {item.totalQuantity} <span className="font-normal text-slate-500">{item.unit}</span>
                          </div>
                          {isOut ? (
                            <span className="text-[10px] font-bold text-rose-700 flex items-center justify-end gap-0.5">
                              <AlertTriangle className="w-3 h-3" /> Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="text-[10px] font-bold text-amber-600 flex items-center justify-end gap-0.5">
                              <AlertTriangle className="w-3 h-3" /> Low (&le;{item.reorderLevel})
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Buffer: {item.reorderLevel} | Ideal: {item.idealStockLevel}</span>
                          )}
                        </td>

                        {/* Pricing */}
                        <td className="py-2.5 px-3 text-right">
                          <div className={`font-semibold ${selectedInsurancePricing !== 'cash' && hasCustomTariff ? 'text-emerald-700 font-bold' : 'text-slate-900'}`}>
                            ${effectiveSellingPrice.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400">Cost: ${item.unitCost.toFixed(2)}</div>
                          
                          {selectedInsurancePricing === 'cash' ? (
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              {item.insurancePrices && Object.keys(item.insurancePrices).length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setPricingModalItem(item)}
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200 transition-colors cursor-pointer"
                                  title="View configured insurance selling prices"
                                >
                                  {Object.keys(item.insurancePrices).length} Tariffs
                                </button>
                              ) : (
                                <span className="text-[9px] text-slate-400">Cash only</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              {hasCustomTariff ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                                  Custom Tariff
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium border border-slate-200" title={`Base cash fallback: $${item.sellingPrice.toFixed(2)}`}>
                                  Base Fallback
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Total Valuation */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-bold text-slate-800">${valuation.toFixed(2)}</div>
                          <div className="text-[10px] text-slate-400">Cost Value</div>
                        </td>

                        {/* Batches Overview */}
                        <td className="py-2.5 px-3">
                          <div className="space-y-0.5 max-h-16 overflow-y-auto">
                            {(item.batches || []).map(b => (
                              <div key={b.id} className="text-[10px] text-slate-600 flex items-center justify-between gap-2">
                                <span className="font-mono font-semibold">{b.batchNumber}</span>
                                <span className="text-slate-500">Exp: {b.expiryDate} ({b.quantity})</span>
                              </div>
                            ))}
                            {(!item.batches || item.batches.length === 0) && (
                              <span className="text-[10px] text-slate-400 italic">No batches</span>
                            )}
                          </div>
                        </td>

                        {/* Actions (Only Admin or Store Manager can Edit/Add/Mutate) */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {canModify ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setPricingModalItem(item)}
                                title="Configure insurance-specific selling prices"
                                className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold rounded border border-teal-200 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <ShieldCheck className="w-3 h-3 text-teal-600" />
                                <span>Tariffs</span>
                                {item.insurancePrices && Object.keys(item.insurancePrices).length > 0 && (
                                  <span className="w-3.5 h-3.5 rounded-full bg-teal-600 text-white text-[9px] flex items-center justify-center font-bold">
                                    {Object.keys(item.insurancePrices).length}
                                  </span>
                                )}
                              </button>

                              <button
                                onClick={() => handleOpenBatchModal(item)}
                                title="Receive new supplier batch"
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded border border-emerald-200 transition-colors cursor-pointer"
                              >
                                + Batch
                              </button>
                              
                              <button
                                onClick={() => handleOpenAdjustModal(item)}
                                title="Stock count reconciliation or write-off"
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded transition-colors cursor-pointer"
                              >
                                Adjust
                              </button>

                              <button
                                onClick={() => handleOpenTransferModal(item)}
                                title="Issue stock to Pharmacy Dispensary or Nursing Ward"
                                className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 text-[11px] font-semibold rounded border border-sky-200 transition-colors cursor-pointer"
                              >
                                Transfer
                              </button>

                              <button
                                onClick={() => handleOpenEditModal(item)}
                                title="Edit item specifications"
                                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteItem(item)}
                                title="Delete item from catalog"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setViewBatchesItem(item)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>Inspect</span>
                              </button>
                              <span 
                                title="Editing restricted to Admin or Store Manager"
                                className="p-1 text-slate-300 cursor-not-allowed"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredInventory.length === 0 && (
                <div className="py-16 text-center text-slate-400 text-xs">
                  <Boxes className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p>No inventory items match the current filters for {activeClinic.name}.</p>
                  {canModify && (
                    <button
                      onClick={() => setActiveTab('add_item')}
                      className="mt-3 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add First Item to Catalog
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Table Footer Summary */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 shrink-0">
              <span className="font-medium">
                Displaying <strong>{filteredInventory.length}</strong> of <strong>{totalSKUs}</strong> master items in {activeClinic.name}
              </span>
              <div className="flex items-center gap-4">
                <span>Total Filtered Units: <strong>{filteredInventory.reduce((acc, i) => acc + i.totalQuantity, 0)}</strong></span>
                <span>Valuation: <strong>${filteredInventory.reduce((acc, i) => acc + (i.totalQuantity * i.unitCost), 0).toFixed(2)}</strong></span>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: LOW STOCK & PROCUREMENT WORKBENCH */}
        {activeTab === 'low_stock' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-6 space-y-4">
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900 text-xs flex items-center justify-between">
              <div>
                <div className="font-bold text-amber-950 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Automated Safety Buffer & Procurement Replenishment Workbench
                </div>
                <p className="text-amber-800">
                  Items below have fallen below hospital safety reorder thresholds. Authorized store managers can directly trigger supplier purchase order batch inflows.
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] font-bold text-amber-900 block">Total Low Stock Items</span>
                <span className="text-xl font-black text-amber-700">{lowStockItems.length}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0 z-10 text-slate-600 font-semibold shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-3">Item & SKU</th>
                    <th className="py-2.5 px-3">Sub-Store</th>
                    <th className="py-2.5 px-3 text-right">Current Stock</th>
                    <th className="py-2.5 px-3 text-right">Reorder Threshold</th>
                    <th className="py-2.5 px-3 text-right">Ideal Target</th>
                    <th className="py-2.5 px-3 text-right">Suggested Order Qty</th>
                    <th className="py-2.5 px-3 text-right">Est. Cost</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {lowStockItems.map(item => {
                    const deficit = Math.max(0, item.idealStockLevel - item.totalQuantity);
                    const estCost = deficit * item.unitCost;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{item.code} &bull; <span className="capitalize">{item.category.replace('_', ' ')}</span></div>
                        </td>
                        <td className="py-2.5 px-3 capitalize text-slate-600">
                          {item.subInventory || 'Main Store'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                          {item.totalQuantity} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {item.reorderLevel} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {item.idealStockLevel} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-800">
                          +{deficit} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                          ${estCost.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {canModify ? (
                            <button
                              onClick={() => handleOpenBatchModal(item)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs cursor-pointer shadow-xs inline-flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Restock Batch</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setViewBatchesItem(item)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-xs cursor-pointer"
                            >
                              Inspect
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {lowStockItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <div className="font-bold text-slate-800">Optimal Stock Reserves</div>
                        <p className="text-slate-400 mt-1">All items in {activeClinic.name} currently satisfy their minimum safety stock buffer.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB 3: BATCH & EXPIRY QUALITY REGISTER */}
        {activeTab === 'batches' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-6 space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Batch & Expiry Quality Control Register</h2>
                <p className="text-slate-500">
                  Track individual lot numbers, manufacturer expiration dates, shelf rack coordinates, and days remaining before shelf retirement.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-800 font-bold text-xs">
                  {expiredBatchesCount} Expired Lots
                </span>
                <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-800 font-bold text-xs">
                  {criticalBatchesCount} Critical Lots (&le;30d)
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0 z-10 text-slate-600 font-semibold shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-3">Item & SKU</th>
                    <th className="py-2.5 px-3">Batch / Lot #</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3">Stability Status</th>
                    <th className="py-2.5 px-3 text-right">Available Qty</th>
                    <th className="py-2.5 px-3">Storage Rack</th>
                    <th className="py-2.5 px-3">Supplier Provenance</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {allBatches.map(b => {
                    const matchedItem = currentClinicInventory.find(i => i.id === b.itemId);

                    return (
                      <tr key={`${b.itemId}-${b.id}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{b.itemName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{b.itemCode} &bull; <span className="capitalize">{b.category.replace('_', ' ')}</span></div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {b.batchNumber}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">
                          {b.expiryDate}
                        </td>
                        <td className="py-2.5 px-3">
                          {b.status === 'expired' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Expired ({Math.abs(b.daysRemaining)}d ago)
                            </span>
                          )}
                          {b.status === 'critical' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Critical ({b.daysRemaining}d left)
                            </span>
                          )}
                          {b.status === 'warning' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Expiring ({b.daysRemaining}d left)
                            </span>
                          )}
                          {b.status === 'good' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Valid ({b.daysRemaining}d left)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {b.quantity} <span className="font-normal text-slate-500">{b.unit}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          {b.locationRack || 'Main-Shelf'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {b.supplier || 'Direct Delivery'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {canModify && matchedItem ? (
                            <button
                              onClick={() => {
                                setAdjustModalItem(matchedItem);
                                setAdjustFormData({
                                  batchId: b.id,
                                  quantityChange: -b.quantity,
                                  reason: b.status === 'expired' ? 'Expired Batch Disposal' : 'Physical Count Adjustment'
                                });
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Adjust / Write-Off
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">View Only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {allBatches.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                        No active stock batches found in {activeClinic.name}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB 4: INTERNAL ISSUANCE & TRANSFERS */}
        {activeTab === 'transfers' && (
          <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-6 space-y-6">
            
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Inter-Departmental Stock Issuance</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Issue medications and supplies from the Central Medical Warehouse to the Pharmacy Dispensary or Inpatient Nursing Ward stations.
                </p>
              </div>
              <div className="p-2 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
            </div>

            {canModify ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide mb-3">
                  Initiate Stock Transfer
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Select Catalog Item</label>
                    <select
                      onChange={(e) => {
                        const it = currentClinicInventory.find(i => i.id === e.target.value);
                        if (it) {
                          handleOpenTransferModal(it);
                        }
                      }}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                      defaultValue=""
                    >
                      <option value="" disabled>Choose an item to transfer...</option>
                      {currentClinicInventory.map(it => (
                        <option key={it.id} value={it.id}>
                          {it.name} ({it.totalQuantity} {it.unit} in stock)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center text-xs text-slate-500 col-span-3">
                    Select an item above to launch the calibrated transfer dialog with sub-inventory source, destination, and quantity validation.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Only Administrator or Store Manager roles can initiate internal departmental stock issuance.</span>
              </div>
            )}

            {/* Current Sub-Inventory Distribution Matrix */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">
                Sub-Inventory Distribution Across Facilities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900">Main Central Warehouse</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-600">main</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Primary bulk intake depot for commercial supplier POs.</p>
                  <div className="text-xl font-black text-slate-900">
                    {currentClinicInventory.filter(i => (i.subInventory || 'main') === 'main').length} <span className="text-xs font-normal text-slate-500">Catalog SKUs</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900">Pharmacy Dispensary</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono">pharmacy</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Frontline patient dispensing and prescription fulfillment counter.</p>
                  <div className="text-xl font-black text-emerald-700">
                    {currentClinicInventory.filter(i => i.subInventory === 'pharmacy').length} <span className="text-xs font-normal text-slate-500">Catalog SKUs</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900">Ward Nurse Station</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-mono">nursing</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Inpatient bedside consumables, IV fluids, and emergency ward carts.</p>
                  <div className="text-xl font-black text-indigo-700">
                    {currentClinicInventory.filter(i => i.subInventory === 'nursing').length} <span className="text-xs font-normal text-slate-500">Catalog SKUs</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 5: ADD NEW CATALOG ITEM (Only for Admin or Store Manager) */}
        {activeTab === 'add_item' && (
          <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Register New Catalog Item & Initial Stock Receipt
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authorized creation of master inventory item in {activeClinic.name} ({activeClinic.code}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded cursor-pointer"
              >
                Back to Inventory
              </button>
            </div>

            {canModify ? (
              <form onSubmit={handleCreateNewItem} className="space-y-6 text-xs max-w-4xl">
                
                {/* SECTION 1: MASTER ITEM DETAILS */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-amber-600" />
                    1. Master Product Specifications
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        SKU / Item Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. MED-AMOX-500"
                        value={newItemData.code}
                        onChange={(e) => setNewItemData({ ...newItemData, code: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold uppercase focus:ring-1 focus:ring-amber-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Commercial / Brand Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Amoxicillin Trihydrate 500mg"
                        value={newItemData.name}
                        onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded font-medium focus:ring-1 focus:ring-amber-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Generic / Chemical Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Amoxicillin"
                        value={newItemData.genericName}
                        onChange={(e) => setNewItemData({ ...newItemData, genericName: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Category</label>
                      <select
                        value={newItemData.category}
                        onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value as InventoryCategory })}
                        className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                      >
                        <option value="pharmaceutical">Pharmaceutical (Medication)</option>
                        <option value="nursing_consumable">Nursing Consumable (Syringes, Gauze)</option>
                        <option value="lab_reagent">Pathology Reagent (Test Kits)</option>
                        <option value="radiology_supply">Radiology Supply (Contrast, Film)</option>
                        <option value="surgical">Surgical / Sterile Instrument</option>
                        <option value="general">General Medical Supply</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Initial Sub-Inventory Destination</label>
                      <select
                        value={newItemData.subInventory}
                        onChange={(e) => setNewItemData({ ...newItemData, subInventory: e.target.value as SubInventoryLocation })}
                        className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                      >
                        <option value="main">Main Warehouse Depot (main)</option>
                        <option value="pharmacy">Pharmacy Dispensary (pharmacy)</option>
                        <option value="nursing">Ward Nurse Station (nursing)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Unit of Measure</label>
                      <input
                        type="text"
                        placeholder="e.g. tablets, vials, boxes, kits"
                        value={newItemData.unit}
                        onChange={(e) => setNewItemData({ ...newItemData, unit: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Dosage Form / Packaging</label>
                      <input
                        type="text"
                        placeholder="e.g. 500mg Film-Coated Tablet"
                        value={newItemData.dosageForm}
                        onChange={(e) => setNewItemData({ ...newItemData, dosageForm: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="newRequiresPrescription"
                        checked={newItemData.requiresPrescription}
                        onChange={(e) => setNewItemData({ ...newItemData, requiresPrescription: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <label htmlFor="newRequiresPrescription" className="font-bold text-slate-700 cursor-pointer">
                        Prescription Required (Rx Controlled)
                      </label>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: PRICING & REORDER BUFFERS */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    2. Pricing & Safety Thresholds
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Unit Procurement Cost ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newItemData.unitCost}
                        onChange={(e) => setNewItemData({ ...newItemData, unitCost: Number(e.target.value) })}
                        className="w-full p-2 border border-slate-300 rounded font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Unit Selling Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newItemData.sellingPrice}
                        onChange={(e) => setNewItemData({ ...newItemData, sellingPrice: Number(e.target.value) })}
                        className="w-full p-2 border border-slate-300 rounded font-semibold text-emerald-700"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Safety Reorder Level</label>
                      <input
                        type="number"
                        min="0"
                        value={newItemData.reorderLevel}
                        onChange={(e) => setNewItemData({ ...newItemData, reorderLevel: Number(e.target.value) })}
                        className="w-full p-2 border border-slate-300 rounded font-bold text-amber-700"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Ideal Target Stock Level</label>
                      <input
                        type="number"
                        min="1"
                        value={newItemData.idealStockLevel}
                        onChange={(e) => setNewItemData({ ...newItemData, idealStockLevel: Number(e.target.value) })}
                        className="w-full p-2 border border-slate-300 rounded font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2B: INSURANCE SPECIFIC SELLING PRICES */}
                {availableInsurancePolicies.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-teal-600" />
                          2B. Insurance Company Selling Prices (Differential Tariffs)
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Specify custom selling prices for accepted clinic insurance payers. Any payer left unconfigured will automatically bill at standard cash price (${newItemData.sellingPrice.toFixed(2)}).
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const newPrices: Record<string, number> = {};
                            availableInsurancePolicies.forEach(p => {
                              newPrices[p.name] = Number(newItemData.sellingPrice);
                            });
                            setNewItemInsurancePrices(newPrices);
                          }}
                          className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors cursor-pointer"
                        >
                          Match Cash Price
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newPrices: Record<string, number> = {};
                            availableInsurancePolicies.forEach(p => {
                              newPrices[p.name] = Math.round((Number(newItemData.sellingPrice) * 1.10) * 100) / 100;
                            });
                            setNewItemInsurancePrices(newPrices);
                          }}
                          className="px-2 py-1 text-[10px] font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 rounded border border-teal-200 transition-colors cursor-pointer"
                        >
                          +10% Markup
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newPrices: Record<string, number> = {};
                            availableInsurancePolicies.forEach(p => {
                              newPrices[p.name] = Math.round((Number(newItemData.sellingPrice) * 1.20) * 100) / 100;
                            });
                            setNewItemInsurancePrices(newPrices);
                          }}
                          className="px-2 py-1 text-[10px] font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 rounded border border-teal-200 transition-colors cursor-pointer"
                        >
                          +20% Markup
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-teal-50/40 p-3.5 rounded-lg border border-teal-100">
                      {availableInsurancePolicies.map(policy => {
                        const hasCustom = newItemInsurancePrices[policy.name] !== undefined;
                        const currentVal = hasCustom ? newItemInsurancePrices[policy.name] : '';

                        return (
                          <div key={policy.id} className="bg-white p-2.5 rounded-md border border-slate-200 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-xs truncate" title={policy.name}>
                                {policy.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                {policy.category || 'insurance'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder={`Cash: $${newItemData.sellingPrice}`}
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
                                  className="w-full pl-6 pr-2 py-1.5 text-xs border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setNewItemInsurancePrices(prev => ({
                                    ...prev,
                                    [policy.name]: Number(newItemData.sellingPrice)
                                  }));
                                }}
                                className="px-2 py-1.5 text-[10px] font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-200 shrink-0 cursor-pointer"
                                title="Set to standard cash price"
                              >
                                Cash
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SECTION 3: INITIAL DELIVERY BATCH */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-sky-600" />
                    3. Initial Supplier Delivery Lot
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Batch / Lot #</label>
                      <input
                        type="text"
                        placeholder="e.g. LOT-2026-09A"
                        value={newItemData.batchNumber}
                        onChange={(e) => setNewItemData({ ...newItemData, batchNumber: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Expiry Date</label>
                      <input
                        type="date"
                        value={newItemData.expiryDate}
                        onChange={(e) => setNewItemData({ ...newItemData, expiryDate: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Initial Received Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={newItemData.initialQuantity}
                        onChange={(e) => setNewItemData({ ...newItemData, initialQuantity: Number(e.target.value) })}
                        className="w-full p-2 border border-slate-300 rounded font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Supplier / Vendor</label>
                      <input
                        type="text"
                        value={newItemData.supplier}
                        onChange={(e) => setNewItemData({ ...newItemData, supplier: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Storage Rack / Shelf Location</label>
                      <input
                        type="text"
                        value={newItemData.locationRack}
                        onChange={(e) => setNewItemData({ ...newItemData, locationRack: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-xs cursor-pointer"
                  >
                    Confirm & Add Item to Store
                  </button>
                </div>

              </form>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-200">
                <Lock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <h3 className="font-bold text-slate-900 text-sm">Manager Authorization Required</h3>
                <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                  Only staff members with an Administrator or Store Manager role can add new items into the hospital catalog.
                </p>
              </div>
            )}

          </div>
        )}

      </div>

      {/* MODAL 1: EDIT ITEM SPECIFICATIONS (Only Admin or Store Manager) */}
      {editingItem && (
        <div 
          className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingItem(null);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl p-5 cursor-default max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-amber-50 text-amber-700">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Edit Master Item: {editingItem.name}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">SKU: {editingItem.code}</span>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Item / Brand Name</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Generic / Chemical Name</label>
                  <input
                    type="text"
                    value={editFormData.genericName}
                    onChange={(e) => setEditFormData({ ...editFormData, genericName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value as InventoryCategory })}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                  >
                    <option value="pharmaceutical">Pharmaceutical</option>
                    <option value="nursing_consumable">Nursing Consumable</option>
                    <option value="lab_reagent">Pathology Reagent</option>
                    <option value="radiology_supply">Radiology Supply</option>
                    <option value="surgical">Surgical Supply</option>
                    <option value="general">General Medical</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sub-Inventory Location</label>
                  <select
                    value={editFormData.subInventory}
                    onChange={(e) => setEditFormData({ ...editFormData, subInventory: e.target.value as SubInventoryLocation })}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                  >
                    <option value="main">Main Warehouse Depot</option>
                    <option value="pharmacy">Pharmacy Dispensary</option>
                    <option value="nursing">Ward Nurse Station</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={editFormData.unit}
                    onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dosage Form / Packaging</label>
                  <input
                    type="text"
                    value={editFormData.dosageForm}
                    onChange={(e) => setEditFormData({ ...editFormData, dosageForm: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="editRx"
                    checked={editFormData.requiresPrescription}
                    onChange={(e) => setEditFormData({ ...editFormData, requiresPrescription: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="editRx" className="font-bold text-slate-700 cursor-pointer">
                    Requires Doctor Prescription (Rx)
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFormData.unitCost}
                    onChange={(e) => setEditFormData({ ...editFormData, unitCost: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFormData.sellingPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, sellingPrice: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded font-semibold text-emerald-700"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.reorderLevel}
                    onChange={(e) => setEditFormData({ ...editFormData, reorderLevel: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded font-bold text-amber-700"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ideal Target Stock</label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.idealStockLevel}
                    onChange={(e) => setEditFormData({ ...editFormData, idealStockLevel: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded font-bold"
                    required
                  />
                </div>
              </div>

              {/* Insurance Specific Selling Prices in Edit Modal */}
              {availableInsurancePolicies.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                      Insurance Specific Selling Prices (Optional Differential Tariffs)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newPrices: Record<string, number> = {};
                        availableInsurancePolicies.forEach(p => {
                          newPrices[p.name] = Number(editFormData.sellingPrice);
                        });
                        setEditFormData(prev => ({ ...prev, insurancePrices: newPrices }));
                      }}
                      className="text-[10px] text-teal-700 hover:text-teal-900 font-semibold cursor-pointer underline"
                    >
                      Match Base Price (${editFormData.sellingPrice})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded border border-slate-200">
                    {availableInsurancePolicies.map(pol => {
                      const hasVal = editFormData.insurancePrices && editFormData.insurancePrices[pol.name] !== undefined;
                      const val = hasVal ? editFormData.insurancePrices[pol.name] : '';

                      return (
                        <div key={pol.id} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                          <span className="text-xs font-semibold text-slate-800 truncate flex-1" title={pol.name}>
                            {pol.name}
                          </span>
                          <div className="relative w-28">
                            <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-bold">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder={`$${editFormData.sellingPrice}`}
                              value={val}
                              onChange={(e) => {
                                const inputVal = e.target.value;
                                setEditFormData(prev => {
                                  const updated = { ...(prev.insurancePrices || {}) };
                                  if (inputVal === '') {
                                    delete updated[pol.name];
                                  } else {
                                    updated[pol.name] = Number(inputVal);
                                  }
                                  return { ...prev, insurancePrices: updated };
                                });
                              }}
                              className="w-full pl-5 pr-1 py-1 text-xs border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold shadow-xs cursor-pointer"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECEIVE SUPPLIER BATCH (Only Admin or Store Manager) */}
      {batchModalItem && (
        <div 
          className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBatchModalItem(null);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-emerald-50 text-emerald-700">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Receive Supplier Stock Batch
                  </h3>
                  <span className="text-xs text-slate-500">{batchModalItem.name} ({batchModalItem.code})</span>
                </div>
              </div>
              <button
                onClick={() => setBatchModalItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Batch / Lot Number</label>
                <input
                  type="text"
                  value={batchFormData.batchNumber}
                  onChange={(e) => setBatchFormData({ ...batchFormData, batchNumber: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Received Quantity ({batchModalItem.unit})</label>
                  <input
                    type="number"
                    min="1"
                    value={batchFormData.quantity}
                    onChange={(e) => setBatchFormData({ ...batchFormData, quantity: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Manufacturer Expiry Date</label>
                  <input
                    type="date"
                    value={batchFormData.expiryDate}
                    onChange={(e) => setBatchFormData({ ...batchFormData, expiryDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={batchFormData.unitCost}
                    onChange={(e) => setBatchFormData({ ...batchFormData, unitCost: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={batchFormData.sellingPrice}
                    onChange={(e) => setBatchFormData({ ...batchFormData, sellingPrice: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded font-semibold text-emerald-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supplier / PO Delivery</label>
                  <input
                    type="text"
                    value={batchFormData.supplier}
                    onChange={(e) => setBatchFormData({ ...batchFormData, supplier: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Storage Rack / Shelf Coordinate</label>
                  <input
                    type="text"
                    value={batchFormData.locationRack}
                    onChange={(e) => setBatchFormData({ ...batchFormData, locationRack: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setBatchModalItem(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs cursor-pointer"
                >
                  Confirm Inward Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADJUST STOCK (Only Admin or Store Manager) */}
      {adjustModalItem && (
        <div 
          className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAdjustModalItem(null);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-slate-100 text-slate-700">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Adjust Stock Quantity
                  </h3>
                  <span className="text-xs text-slate-500">{adjustModalItem.name}</span>
                </div>
              </div>
              <button
                onClick={() => setAdjustModalItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjust} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Batch to Adjust</label>
                <select
                  value={adjustFormData.batchId}
                  onChange={(e) => setAdjustFormData({ ...adjustFormData, batchId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded font-mono font-medium bg-white"
                  required
                >
                  <option value="" disabled>Select a batch...</option>
                  {(adjustModalItem.batches || []).map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber} (Exp: {b.expiryDate}) &bull; Current: {b.quantity} {adjustModalItem.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Quantity Change (+ to increase, - to decrease)
                </label>
                <input
                  type="number"
                  value={adjustFormData.quantityChange}
                  onChange={(e) => setAdjustFormData({ ...adjustFormData, quantityChange: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded font-bold text-slate-900"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  E.g., enter +25 to add surplus found in count, or -10 for write-off/damage.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Adjustment Reason</label>
                <select
                  value={adjustFormData.reason}
                  onChange={(e) => setAdjustFormData({ ...adjustFormData, reason: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                >
                  <option value="Physical Count Reconciliation">Physical Count Reconciliation</option>
                  <option value="Damaged / Broken in Warehouse">Damaged / Broken in Warehouse</option>
                  <option value="Expired Batch Disposal">Expired Batch Disposal</option>
                  <option value="Supplier Return">Return to Supplier / Recall</option>
                  <option value="Emergency Internal Issuance">Emergency Internal Issuance</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAdjustModalItem(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded shadow-xs cursor-pointer"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: TRANSFER BETWEEN SUB-INVENTORIES */}
      {transferModalItem && (
        <div 
          className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTransferModalItem(null);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-sky-50 text-sky-700">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Inter-Department Stock Issuance
                  </h3>
                  <span className="text-xs text-slate-500">{transferModalItem.name}</span>
                </div>
              </div>
              <button
                onClick={() => setTransferModalItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransfer} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Source Depot</label>
                  <select
                    value={transferFormData.fromSub}
                    onChange={(e) => setTransferFormData({ ...transferFormData, fromSub: e.target.value as SubInventoryLocation })}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                  >
                    <option value="main">Main Warehouse Depot</option>
                    <option value="pharmacy">Pharmacy Dispensary</option>
                    <option value="nursing">Ward Nurse Station</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Department</label>
                  <select
                    value={transferFormData.toSub}
                    onChange={(e) => setTransferFormData({ ...transferFormData, toSub: e.target.value as SubInventoryLocation })}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                  >
                    <option value="pharmacy">Pharmacy Dispensary</option>
                    <option value="nursing">Ward Nurse Station</option>
                    <option value="main">Main Warehouse Depot</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Quantity to Issue ({transferModalItem.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  max={transferModalItem.totalQuantity}
                  value={transferFormData.quantity}
                  onChange={(e) => setTransferFormData({ ...transferFormData, quantity: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded font-bold"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Available in {transferFormData.fromSub}: {transferModalItem.totalQuantity} {transferModalItem.unit}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Requisition Notes / Purpose</label>
                <input
                  type="text"
                  value={transferFormData.notes}
                  onChange={(e) => setTransferFormData({ ...transferFormData, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setTransferModalItem(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded shadow-xs cursor-pointer"
                >
                  Issue Stock Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: VIEW BATCH DETAILS (For Non-Managers or Quick View) */}
      {viewBatchesItem && (
        <div 
          className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewBatchesItem(null);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl p-5 cursor-default flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {viewBatchesItem.name}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    SKU: {viewBatchesItem.code} &bull; Total In Stock: {viewBatchesItem.totalQuantity} {viewBatchesItem.unit}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewBatchesItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-3 bg-slate-50 rounded-lg text-xs shrink-0">
              <div>
                <span className="text-slate-400 block text-[10px]">Category</span>
                <span className="font-bold text-slate-800 capitalize">{viewBatchesItem.category.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Sub-Depot</span>
                <span className="font-bold text-slate-800 capitalize">{viewBatchesItem.subInventory || 'Main Store'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Unit Cost</span>
                <span className="font-bold text-slate-800">${viewBatchesItem.unitCost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Selling Price</span>
                <span className="font-bold text-slate-800">${viewBatchesItem.sellingPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Batch / Lot #</th>
                    <th className="py-2 px-3">Expiry Date</th>
                    <th className="py-2 px-3 text-right">Available Qty</th>
                    <th className="py-2 px-3">Storage Rack</th>
                    <th className="py-2 px-3">Supplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(viewBatchesItem.batches || []).map(b => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{b.batchNumber}</td>
                      <td className="py-2 px-3 text-slate-700">{b.expiryDate}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{b.quantity} {viewBatchesItem.unit}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{b.locationRack || 'Main-Shelf'}</td>
                      <td className="py-2 px-3 text-slate-600">{b.supplier || 'Commercial PO'}</td>
                    </tr>
                  ))}
                  {(!viewBatchesItem.batches || viewBatchesItem.batches.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No active batches found for this SKU.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewBatchesItem(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: INSURANCE-SPECIFIC PRICING MODAL */}
      <InsurancePricingModal
        isOpen={!!pricingModalItem}
        onClose={() => setPricingModalItem(null)}
        item={pricingModalItem}
      />

    </div>
  );
};
