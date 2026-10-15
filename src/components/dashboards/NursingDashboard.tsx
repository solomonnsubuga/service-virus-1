import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { AdministeredItem, InventoryItem, Patient } from '../../types';
import { formatPatientAge, getAgeInYears } from '../../utils/ageUtils';
import {
  Syringe,
  Activity,
  Plus,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  HeartPulse,
  FileText,
  User,
  Clock,
  BedDouble,
  Stethoscope,
  Building2,
  Search,
  DoorOpen,
  Tag,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Filter
} from 'lucide-react';
import { IPDPatientMonitoringCard } from './nursing/IPDPatientMonitoringCard';
import { ManageLocationsModal } from '../common/ManageLocationsModal';
import { InjectionRoomUnitAdminList } from './nursing/InjectionRoomUnitAdminList';

interface NursingDashboardProps {
  onOpenInventory: () => void;
}

export const NursingDashboard: React.FC<NursingDashboardProps> = ({ onOpenInventory }) => {
  const {
    activeClinic,
    currentUser,
    currentClinicPatients,
    currentClinicDepartments,
    currentClinicInventory,
    currentClinicAdministeredItems,
    currentClinicWards,
    currentClinicPharmacyCarts,
    administerIndirectCartItem,
    recordAdministeredItem,
    getPatientLedger
  } = useClinic();

  const [activeTab, setActiveTab] = useState<'ipd_monitoring' | 'injection_room' | 'administer' | 'history' | 'ward_stock'>('ipd_monitoring');
  const [showLocationsModal, setShowLocationsModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Filters & Sorting for Patient Switcher in Administer tab
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientDeptFilter, setPatientDeptFilter] = useState('all');
  const [patientRoomFilter, setPatientRoomFilter] = useState('all');
  const [patientWardFilter, setPatientWardFilter] = useState('all');
  const [patientBedFilter, setPatientBedFilter] = useState('all');
  const [patientSortKey, setPatientSortKey] = useState<'name' | 'date' | 'mrn' | 'age'>('name');
  const [patientSortOrder, setPatientSortOrder] = useState<'asc' | 'desc'>('asc');

  // Available departments, rooms, wards, and beds for patient switcher
  const availableDepartments = useMemo(() => {
    const deptSet = new Set<string>();
    if (currentClinicDepartments && Array.isArray(currentClinicDepartments)) {
      currentClinicDepartments.forEach(d => { if (d.name) deptSet.add(d.name); });
    }
    currentClinicPatients.forEach(p => { if (p.department) deptSet.add(p.department); });
    return Array.from(deptSet).sort();
  }, [currentClinicDepartments, currentClinicPatients]);

  const availableRooms = useMemo(() => {
    const roomSet = new Set<string>();
    if (patientDeptFilter !== 'all') {
      const targetDept = currentClinicDepartments?.find(d => d.name === patientDeptFilter);
      if (targetDept?.rooms) targetDept.rooms.forEach(r => roomSet.add(r));
      currentClinicPatients
        .filter(p => (p.department || 'General Outpatient (OPD)') === patientDeptFilter || p.department === patientDeptFilter)
        .forEach(p => { if (p.doctorRoom) roomSet.add(p.doctorRoom); });
    } else {
      if (currentClinicDepartments && Array.isArray(currentClinicDepartments)) {
        currentClinicDepartments.forEach(d => { if (d.rooms) d.rooms.forEach(r => roomSet.add(r)); });
      }
      currentClinicPatients.forEach(p => { if (p.doctorRoom) roomSet.add(p.doctorRoom); });
    }
    return Array.from(roomSet).sort();
  }, [currentClinicDepartments, currentClinicPatients, patientDeptFilter]);

  const availableWards = useMemo(() => {
    const wardSet = new Set<string>();
    if (currentClinicWards && Array.isArray(currentClinicWards)) {
      currentClinicWards.forEach(w => { if (w.name) wardSet.add(w.name); });
    }
    currentClinicPatients.forEach(p => { if (p.ward) wardSet.add(p.ward); });
    return Array.from(wardSet).sort();
  }, [currentClinicWards, currentClinicPatients]);

  const availableBeds = useMemo(() => {
    const bedSet = new Set<string>();
    if (patientWardFilter !== 'all') {
      const targetWard = currentClinicWards?.find(w => w.name === patientWardFilter);
      if (targetWard?.beds) targetWard.beds.forEach(b => bedSet.add(b));
      currentClinicPatients
        .filter(p => p.ward === patientWardFilter)
        .forEach(p => { if (p.bedNumber) bedSet.add(p.bedNumber); });
    } else {
      if (currentClinicWards && Array.isArray(currentClinicWards)) {
        currentClinicWards.forEach(w => { if (w.beds) w.beds.forEach(b => bedSet.add(b)); });
      }
      currentClinicPatients.forEach(p => { if (p.bedNumber) bedSet.add(p.bedNumber); });
    }
    return Array.from(bedSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [currentClinicWards, currentClinicPatients, patientWardFilter]);

  // Filtered & Sorted Patients for switcher
  const filteredPatientsForSwitch = useMemo(() => {
    let list = [...currentClinicPatients];

    if (patientDeptFilter !== 'all') {
      list = list.filter(p => {
        const pDept = p.department || (p.patientType === 'IPD' ? 'Inpatient Ward' : 'General Outpatient (OPD)');
        return pDept.toLowerCase() === patientDeptFilter.toLowerCase() || p.department === patientDeptFilter;
      });
    }

    if (patientRoomFilter !== 'all') {
      list = list.filter(p => {
        const pRoom = p.doctorRoom || (p.patientType === 'IPD' ? (p.ward || 'Ward') : 'Consultation Room 1');
        return pRoom.toLowerCase() === patientRoomFilter.toLowerCase() || p.doctorRoom === patientRoomFilter;
      });
    }

    if (patientWardFilter !== 'all') {
      list = list.filter(p => p.ward && p.ward.toLowerCase() === patientWardFilter.toLowerCase());
    }

    if (patientBedFilter !== 'all') {
      list = list.filter(p => p.bedNumber && p.bedNumber.toLowerCase() === patientBedFilter.toLowerCase());
    }

    if (patientSearchTerm.trim()) {
      const q = patientSearchTerm.toLowerCase().trim();
      list = list.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        (p.ward && p.ward.toLowerCase().includes(q)) ||
        (p.bedNumber && p.bedNumber.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (patientSortKey === 'name') {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return patientSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (patientSortKey === 'date') {
        const timeA = new Date(a.registeredAt || (a as any).admissionDate || 0).getTime();
        const timeB = new Date(b.registeredAt || (b as any).admissionDate || 0).getTime();
        return patientSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      if (patientSortKey === 'mrn') {
        return patientSortOrder === 'asc'
          ? (a.mrn || '').localeCompare(b.mrn || '', undefined, { numeric: true })
          : (b.mrn || '').localeCompare(a.mrn || '', undefined, { numeric: true });
      }
      if (patientSortKey === 'age') {
        const ageA = getAgeInYears(a);
        const ageB = getAgeInYears(b);
        return patientSortOrder === 'asc' ? ageA - ageB : ageB - ageA;
      }
      return 0;
    });

    return list;
  }, [
    currentClinicPatients,
    patientDeptFilter,
    patientRoomFilter,
    patientWardFilter,
    patientBedFilter,
    patientSearchTerm,
    patientSortKey,
    patientSortOrder
  ]);

  // Filters & Sorting for Injection & Treatment Room Carts
  const [cartSearchTerm, setCartSearchTerm] = useState('');
  const [cartStatusFilter, setCartStatusFilter] = useState<'all' | 'pending' | 'administered'>('all');
  const [cartSortKey, setCartSortKey] = useState<'date' | 'patient' | 'amount'>('date');
  const [cartSortOrder, setCartSortOrder] = useState<'asc' | 'desc'>('desc');

  // Indirect Carts for Injection / Treatment Room
  const indirectCarts = useMemo(() => {
    let carts = currentClinicPharmacyCarts.filter(c => c.cartType === 'indirect');

    if (cartStatusFilter === 'pending') {
      carts = carts.filter(c => c.status !== 'administered' && c.status !== 'dispensed');
    } else if (cartStatusFilter === 'administered') {
      carts = carts.filter(c => c.status === 'administered' || c.items.every(it => it.status === 'administered'));
    }

    if (cartSearchTerm.trim()) {
      const q = cartSearchTerm.toLowerCase().trim();
      carts = carts.filter(c =>
        (c.cartNumber || '').toLowerCase().includes(q) ||
        (c.patientName || '').toLowerCase().includes(q) ||
        (c.patientMrn || '').toLowerCase().includes(q) ||
        c.items.some(it => it.itemName.toLowerCase().includes(q))
      );
    }

    carts.sort((a, b) => {
      if (cartSortKey === 'date') {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return cartSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      if (cartSortKey === 'patient') {
        const nameA = (a.patientName || '').toLowerCase();
        const nameB = (b.patientName || '').toLowerCase();
        return cartSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (cartSortKey === 'amount') {
        const amtA = a.totalSumCost || a.totalAmount || 0;
        const amtB = b.totalSumCost || b.totalAmount || 0;
        return cartSortOrder === 'asc' ? amtA - amtB : amtB - amtA;
      }
      return 0;
    });

    return carts;
  }, [currentClinicPharmacyCarts, cartStatusFilter, cartSearchTerm, cartSortKey, cartSortOrder]);

  const pendingIndirectCarts = useMemo(() => {
    return currentClinicPharmacyCarts
      .filter(c => c.cartType === 'indirect')
      .filter(c => c.status !== 'administered' && c.status !== 'dispensed');
  }, [currentClinicPharmacyCarts]);

  const ipdPatientsCount = currentClinicPatients.filter(p => p.patientType === 'IPD' && p.currentStatus !== 'discharged').length;

  // Filters & Sorting for Ward Administration Log (history tab)
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historySortKey, setHistorySortKey] = useState<'date' | 'patient' | 'item' | 'cost'>('date');
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredHistory = useMemo(() => {
    let list = [...currentClinicAdministeredItems];

    if (historySearchTerm.trim()) {
      const q = historySearchTerm.toLowerCase().trim();
      list = list.filter(adm =>
        (adm.patientName || '').toLowerCase().includes(q) ||
        (adm.patientMrn || '').toLowerCase().includes(q) ||
        (adm.itemName || '').toLowerCase().includes(q) ||
        (adm.nurseName || '').toLowerCase().includes(q) ||
        (adm.routeOfAdministration || '').toLowerCase().includes(q) ||
        (adm.notes || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (historySortKey === 'date') {
        const timeA = new Date(admToDate(a.administeredAt)).getTime();
        const timeB = new Date(admToDate(b.administeredAt)).getTime();
        return historySortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      if (historySortKey === 'patient') {
        const nameA = (a.patientName || '').toLowerCase();
        const nameB = (b.patientName || '').toLowerCase();
        return historySortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (historySortKey === 'item') {
        const itemA = (a.itemName || '').toLowerCase();
        const itemB = (b.itemName || '').toLowerCase();
        return historySortOrder === 'asc' ? itemA.localeCompare(itemB) : itemB.localeCompare(itemA);
      }
      if (historySortKey === 'cost') {
        return historySortOrder === 'asc' ? a.totalCostCharged - b.totalCostCharged : b.totalCostCharged - a.totalCostCharged;
      }
      return 0;
    });

    return list;
  }, [currentClinicAdministeredItems, historySearchTerm, historySortKey, historySortOrder]);

  function admToDate(raw: any): Date {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }

  // Administer Form State
  const [administerForm, setAdministerForm] = useState({
    inventoryItemId: '',
    quantity: 1,
    unit: 'pieces',
    route: 'IV Bolus',
    notes: '',
    vitals: {
      bloodPressure: '120/80',
      pulseRate: 76,
      temperature: 36.8,
      spO2: 99
    }
  });

  // Injection Room item administration state
  const [administeringCartItem, setAdministeringCartItem] = useState<{
    cartId: string;
    cartItemId: string;
    itemName: string;
    dosage: string;
    quantity: number;
    patientName: string;
    route: string;
    notes: string;
    vitals: {
      bloodPressure: string;
      pulseRate: number;
      temperature: number;
      spO2: number;
    };
  } | null>(null);

  const handleAdministerCartItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!administeringCartItem) return;

    const success = administerIndirectCartItem(
      administeringCartItem.cartId,
      administeringCartItem.cartItemId,
      administeringCartItem.quantity,
      administeringCartItem.vitals,
      `${administeringCartItem.route} - ${administeringCartItem.notes || 'Administered in Injection Room'}`
    );

    if (success) {
      alert(`Administered ${administeringCartItem.quantity}x ${administeringCartItem.itemName} to ${administeringCartItem.patientName} in Injection Room.`);
      setAdministeringCartItem(null);
    }
  };

  const selectedPatient = selectedPatientId ? (currentClinicPatients.find(p => p.id === selectedPatientId) || null) : null;
  const patientLedger = selectedPatient ? getPatientLedger(selectedPatient.id) : null;

  // Nursing consumables & injectable medications available in this clinic
  const wardItems = currentClinicInventory.filter(
    i => i.category === 'nursing_consumable' || i.department === 'nursing' || i.unit === 'vials' || i.unit === 'bottles'
  );

  // Filter administered items for current clinic
  const clinicAdministeredHistory = currentClinicAdministeredItems;

  const handleAdministerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !administerForm.inventoryItemId) return;

    const item = currentClinicInventory.find(i => i.id === administerForm.inventoryItemId);
    if (!item) return;

    if (item.totalQuantity < administerForm.quantity) {
      alert(`Insufficient stock! Only ${item.totalQuantity} ${item.unit} available in ward.`);
      return;
    }

    const success = recordAdministeredItem({
      patientId: selectedPatient.id,
      encounterId: `enc-${Date.now()}`,
      inventoryItemId: item.id,
      quantity: Number(administerForm.quantity),
      unit: item.unit,
      route: administerForm.route,
      notes: administerForm.notes,
      vitals: administerForm.vitals
    });

    if (success) {
      alert(`Item administered: ${administerForm.quantity}x ${item.name} deducted from inventory and automatically charged to ${selectedPatient.firstName}'s ledger.`);
      setActiveTab('history');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
            <Syringe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">Nursing & Ward Administration Suite</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                {currentUser.name}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Administered Meds & Consumables &bull; Ward Floor Stock Tracking &bull; Direct Patient Ledger Billing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLocationsModal(true)}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <BedDouble className="w-3.5 h-3.5 text-purple-600" />
            Wards & Beds ({currentClinicWards.length})
          </button>
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

      {/* Patient Selector for Consumables & Medication Administration */}
      {activeTab === 'administer' && selectedPatient && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div 
              className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
              onClick={() => setSelectedPatientId('')}
              title="Click patient data to deselect active patient"
            >
              <div className="p-2 rounded-full bg-slate-100 text-slate-700 group-hover:bg-rose-100 group-hover:text-rose-700 transition-colors">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </span>
                  <span className="font-mono text-slate-500">({selectedPatient.mrn})</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-50 text-emerald-800 border-emerald-200">
                    {selectedPatient.ageCategory || (getAgeInYears(selectedPatient.age) <= 2 ? 'INFANT' : getAgeInYears(selectedPatient.age) <= 12 ? 'CHILD' : getAgeInYears(selectedPatient.age) >= 60 ? 'ELDER' : 'ADULT')}
                  </span>
                  <span className="px-2 py-0.2 bg-slate-100 text-slate-700 rounded font-semibold text-[10px]">
                    {selectedPatient.currentStatus.replace('_', ' ')}
                  </span>
                  {selectedPatient.ward && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                      <BedDouble className="w-3 h-3 text-teal-600" />
                      {selectedPatient.ward} &bull; Bed {selectedPatient.bedNumber || 'N/A'}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <X className="w-3 h-3" /> Deselect
                  </span>
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Age: {formatPatientAge(selectedPatient)} &bull; Blood: {selectedPatient.bloodGroup} &bull; Allergies: {selectedPatient.allergies.join(', ') || 'None'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Active Patient:</span>
              {filteredPatientsForSwitch.length > 0 ? (
                <select
                  value={selectedPatient.id}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded bg-white font-medium text-slate-800 max-w-xs truncate"
                >
                  <option value="">-- Click to Deselect Patient --</option>
                  {filteredPatientsForSwitch.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.mrn}) {p.ward ? `— ${p.ward} Bed ${p.bedNumber || 'N/A'}` : `— ${p.department || 'OPD'}`}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-slate-400 italic">No patients match filters</span>
              )}
              <button
                type="button"
                onClick={() => setSelectedPatientId('')}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded border border-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                title="Deselect active patient"
              >
                Deselect
              </button>
            </div>
          </div>

          {/* Filter and Sort Strip for Patient Switcher */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Filter patients..."
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                  className="pl-8 pr-2.5 py-1 border border-slate-200 rounded text-xs w-36 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                <ArrowUpDown className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="text-[10px] font-bold text-slate-600">Sort:</span>
                <select
                  value={patientSortKey}
                  onChange={(e) => setPatientSortKey(e.target.value as any)}
                  className="bg-transparent font-medium text-slate-800 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="name">Name</option>
                  <option value="date">Date</option>
                  <option value="mrn">MRN</option>
                  <option value="age">Age</option>
                </select>
                <button
                  type="button"
                  onClick={() => setPatientSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-0.5 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                >
                  {patientSortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Department */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                <Building2 className="w-3 h-3 text-purple-600 shrink-0" />
                <span className="text-[10px] font-bold text-slate-600">Dept:</span>
                <select
                  value={patientDeptFilter}
                  onChange={(e) => {
                    setPatientDeptFilter(e.target.value);
                    setPatientRoomFilter('all');
                  }}
                  className="bg-transparent font-medium text-slate-800 text-xs focus:outline-none cursor-pointer max-w-[120px] truncate"
                >
                  <option value="all">All Depts</option>
                  {availableDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Room */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                <DoorOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="text-[10px] font-bold text-slate-600">Room:</span>
                <select
                  value={patientRoomFilter}
                  onChange={(e) => setPatientRoomFilter(e.target.value)}
                  className="bg-transparent font-medium text-slate-800 text-xs focus:outline-none cursor-pointer max-w-[110px] truncate"
                >
                  <option value="all">All Rooms</option>
                  {availableRooms.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Ward */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                <BedDouble className="w-3 h-3 text-teal-600 shrink-0" />
                <span className="text-[10px] font-bold text-slate-600">Ward:</span>
                <select
                  value={patientWardFilter}
                  onChange={(e) => {
                    setPatientWardFilter(e.target.value);
                    setPatientBedFilter('all');
                  }}
                  className="bg-transparent font-medium text-slate-800 text-xs focus:outline-none cursor-pointer max-w-[120px] truncate"
                >
                  <option value="all">All Wards</option>
                  {availableWards.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              {/* Bed */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                <Tag className="w-3 h-3 text-cyan-600 shrink-0" />
                <span className="text-[10px] font-bold text-slate-600">Bed:</span>
                <select
                  value={patientBedFilter}
                  onChange={(e) => setPatientBedFilter(e.target.value)}
                  className="bg-transparent font-medium text-slate-800 text-xs focus:outline-none cursor-pointer max-w-[95px] truncate"
                >
                  <option value="all">All Beds</option>
                  {availableBeds.map(b => (
                    <option key={b} value={b}>Bed {b}</option>
                  ))}
                </select>
              </div>

              {(patientDeptFilter !== 'all' || patientRoomFilter !== 'all' || patientWardFilter !== 'all' || patientBedFilter !== 'all' || patientSearchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setPatientSearchTerm('');
                    setPatientDeptFilter('all');
                    setPatientRoomFilter('all');
                    setPatientWardFilter('all');
                    setPatientBedFilter('all');
                  }}
                  className="p-1 text-rose-600 hover:bg-rose-50 rounded flex items-center gap-0.5 text-[10px] font-bold cursor-pointer"
                  title="Clear filters"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            <div className="text-[10px] text-slate-500 font-semibold">
              Showing {filteredPatientsForSwitch.length} of {currentClinicPatients.length} patients
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex flex-wrap items-center gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('ipd_monitoring')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'ipd_monitoring' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BedDouble className="w-3.5 h-3.5" />
          <span>IPD Inpatient Monitoring & Clinical Records</span>
          <span className="px-1.5 py-0.2 bg-sky-100 text-sky-800 rounded-full text-[10px] font-bold">
            {ipdPatientsCount} Active
          </span>
        </button>

        <button
          onClick={() => setActiveTab('injection_room')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'injection_room' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Syringe className="w-3.5 h-3.5 text-purple-600" />
          <span>Injection & Treatment Room Carts</span>
          {pendingIndirectCarts.length > 0 && (
            <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-full text-[10px] font-bold">
              {pendingIndirectCarts.length} Due
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('administer')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'administer' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Administered Consumables / Meds</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Ward Administration Log ({clinicAdministeredHistory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ward_stock')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'ward_stock' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Ward Floor Consumables Inventory</span>
        </button>
      </div>

      {/* Tab 0: IPD Patient Monitoring & Clinical Records Card */}
      {activeTab === 'ipd_monitoring' && (
        <IPDPatientMonitoringCard />
      )}

      {/* Tab: Injection & Treatment Room Carts (Indirect Carts for Outpatient Administration) */}
      {activeTab === 'injection_room' && (
        <div className="space-y-4">
          <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-purple-950 flex items-center gap-2">
                <Syringe className="w-4 h-4 text-purple-600" />
                Injection & Treatment Room - Outpatient Administration Carts
              </div>
              <p className="text-purple-800 text-[11px] mt-0.5">
                Outpatients returning or waiting for injections, IV medications, wound care, and procedures. Pharmacists populate these indirect carts; nurses administer them and record vitals.
              </p>
            </div>
            <div className="font-mono text-purple-900 font-bold bg-purple-100 px-2.5 py-1 rounded-md border border-purple-200">
              {pendingIndirectCarts.length} Pending Administration / {indirectCarts.length} Total
            </div>
          </div>

          {/* Injection Room Carts Filter & Sort Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setCartStatusFilter('all')}
                  className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
                    cartStatusFilter === 'all' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Carts
                </button>
                <button
                  type="button"
                  onClick={() => setCartStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
                    cartStatusFilter === 'pending' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending ({pendingIndirectCarts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCartStatusFilter('administered')}
                  className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
                    cartStatusFilter === 'administered' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Administered
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search carts, patient, MRN..."
                  value={cartSearchTerm}
                  onChange={(e) => setCartSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs w-52 focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-[11px] font-bold text-slate-600">Sort:</span>
                <select
                  value={cartSortKey}
                  onChange={(e) => setCartSortKey(e.target.value as any)}
                  className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="date">Date & Time</option>
                  <option value="patient">Patient Name</option>
                  <option value="amount">Amount / Cost</option>
                </select>
                <button
                  type="button"
                  onClick={() => setCartSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1 hover:bg-slate-200 rounded transition-colors text-slate-600 cursor-pointer"
                >
                  {cartSortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {(cartSearchTerm || cartStatusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setCartSearchTerm('');
                    setCartStatusFilter('all');
                  }}
                  className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            <div className="text-slate-500 text-xs font-semibold">
              Showing <strong className="text-slate-900">{indirectCarts.length}</strong> carts
            </div>
          </div>

          {/* Quick Administer Modal/Drawer for Selected Item */}
          {administeringCartItem && (
            <div 
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setAdministeringCartItem(null);
                }
              }}
            >
              <div 
                className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Administer in Injection Room</h3>
                    <p className="text-slate-500 text-[11px]">
                      Patient: <strong className="text-slate-800">{administeringCartItem.patientName}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setAdministeringCartItem(null)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleAdministerCartItemSubmit} className="space-y-3">
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-purple-950">{administeringCartItem.itemName}</div>
                      <div className="text-purple-700 text-[11px]">Dosage: {administeringCartItem.dosage}</div>
                    </div>
                    <div className="font-mono font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded">
                      Qty: {administeringCartItem.quantity}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Route / Technique</label>
                      <input
                        type="text"
                        value={administeringCartItem.route}
                        onChange={(e) => setAdministeringCartItem({
                          ...administeringCartItem,
                          route: e.target.value
                        })}
                        placeholder="e.g. IV Bolus, IM Deltoid, SC"
                        className="w-full p-2 border border-slate-300 rounded bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Quantity to Give</label>
                      <input
                        type="number"
                        min="1"
                        max={administeringCartItem.quantity}
                        value={administeringCartItem.quantity}
                        onChange={(e) => setAdministeringCartItem({
                          ...administeringCartItem,
                          quantity: Number(e.target.value)
                        })}
                        className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Patient Vitals at Administration
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-slate-500 text-[10px] mb-0.5">BP (mmHg)</label>
                        <input
                          type="text"
                          value={administeringCartItem.vitals.bloodPressure}
                          onChange={(e) => setAdministeringCartItem({
                            ...administeringCartItem,
                            vitals: { ...administeringCartItem.vitals, bloodPressure: e.target.value }
                          })}
                          className="w-full p-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 text-[10px] mb-0.5">Pulse (bpm)</label>
                        <input
                          type="number"
                          value={administeringCartItem.vitals.pulseRate}
                          onChange={(e) => setAdministeringCartItem({
                            ...administeringCartItem,
                            vitals: { ...administeringCartItem.vitals, pulseRate: Number(e.target.value) }
                          })}
                          className="w-full p-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 text-[10px] mb-0.5">Temp (&deg;C)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={administeringCartItem.vitals.temperature}
                          onChange={(e) => setAdministeringCartItem({
                            ...administeringCartItem,
                            vitals: { ...administeringCartItem.vitals, temperature: Number(e.target.value) }
                          })}
                          className="w-full p-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 text-[10px] mb-0.5">SpO2 (%)</label>
                        <input
                          type="number"
                          value={administeringCartItem.vitals.spO2}
                          onChange={(e) => setAdministeringCartItem({
                            ...administeringCartItem,
                            vitals: { ...administeringCartItem.vitals, spO2: Number(e.target.value) }
                          })}
                          className="w-full p-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Nurse Clinical Notes</label>
                    <textarea
                      rows={2}
                      value={administeringCartItem.notes}
                      onChange={(e) => setAdministeringCartItem({
                        ...administeringCartItem,
                        notes: e.target.value
                      })}
                      placeholder="Observation, site tolerance, injection outcome..."
                      className="w-full p-2 border border-slate-300 rounded bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setAdministeringCartItem(null)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Syringe className="w-3.5 h-3.5" />
                      Confirm Administration
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {indirectCarts.map(cart => {
              const isFullyAdministered = cart.status === 'administered' || cart.items.every(it => it.status === 'administered');
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
                        isFullyAdministered
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {isFullyAdministered ? 'Administered' : cart.status.replace('_', ' ')}
                      </span>

                      <span className="text-slate-400 text-xs">&bull; {new Date(cart.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>

                    <div className="text-xs">
                      <span className="font-bold text-slate-900 text-sm">{cart.patientName}</span>
                      <span className="text-slate-500 ml-2 font-mono">MRN: {cart.patientMrn}</span>
                      {cart.parentCartNumber && (
                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                          Transferred from Cart #{cart.parentCartNumber}
                        </span>
                      )}
                      {cart.createdBy && <span className="text-slate-500 ml-2">&bull; Pharmacist: {cart.createdBy}</span>}
                    </div>

                    {/* Prescribed Items in Cart: Unit Checkbox System */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Prescribed Items & Unit Administration Grid ({cart.items.length}):</span>
                        <span className="font-mono text-slate-800 text-xs">Total: ${totalVal.toFixed(2)}</span>
                      </div>
                      
                      <InjectionRoomUnitAdminList cart={cart} />
                    </div>
                  </div>
                </div>
              );
            })}

            {indirectCarts.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs space-y-2">
                <Syringe className="w-8 h-8 mx-auto text-slate-300" />
                <div className="font-bold text-slate-700 text-sm">No Pending Injection Room Carts</div>
                <p>When pharmacists populate indirect carts for returning outpatients or injection room orders, they will appear here for nursing administration.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 1: Record Administered Item */}
      {activeTab === 'administer' && selectedPatient && (
        <form onSubmit={handleAdministerSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">
              Administer Item to {selectedPatient.firstName} {selectedPatient.lastName}
            </h3>
            <p className="text-[11px] text-slate-500">
              Consumables (cannulas, syringes, IV lines, saline) and ward medications are immediately deducted from ward stock and billed to patient ledger.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="lg:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Select Consumable / Medication</label>
              <select
                value={administerForm.inventoryItemId}
                onChange={(e) => setAdministerForm({ ...administerForm, inventoryItemId: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                required
              >
                <option value="">-- Choose Item from Ward Stock --</option>
                {wardItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Stock: {item.totalQuantity} {item.unit} &bull; ${item.sellingPrice.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Quantity Administered</label>
              <input
                type="number"
                min="1"
                value={administerForm.quantity}
                onChange={(e) => setAdministerForm({ ...administerForm, quantity: Number(e.target.value) })}
                className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Route / Site of Administration</label>
              <input
                type="text"
                placeholder="e.g. Left cephalic vein, IM gluteal"
                value={administerForm.route}
                onChange={(e) => setAdministerForm({ ...administerForm, route: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded bg-white"
              />
            </div>

          </div>

          {/* Vitals at Administration */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-rose-500" /> Patient Vitals at Time of Administration
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Blood Pressure (mmHg)</label>
                <input
                  type="text"
                  value={administerForm.vitals.bloodPressure}
                  onChange={(e) => setAdministerForm({
                    ...administerForm,
                    vitals: { ...administerForm.vitals, bloodPressure: e.target.value }
                  })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Pulse Rate (bpm)</label>
                <input
                  type="number"
                  value={administerForm.vitals.pulseRate}
                  onChange={(e) => setAdministerForm({
                    ...administerForm,
                    vitals: { ...administerForm.vitals, pulseRate: Number(e.target.value) }
                  })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Temperature (&deg;C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={administerForm.vitals.temperature}
                  onChange={(e) => setAdministerForm({
                    ...administerForm,
                    vitals: { ...administerForm.vitals, temperature: Number(e.target.value) }
                  })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">SpO2 Oxygen (%)</label>
                <input
                  type="number"
                  value={administerForm.vitals.spO2}
                  onChange={(e) => setAdministerForm({
                    ...administerForm,
                    vitals: { ...administerForm.vitals, spO2: Number(e.target.value) }
                  })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Nursing Observation & Procedure Notes</label>
            <textarea
              rows={2}
              value={administerForm.notes}
              onChange={(e) => setAdministerForm({ ...administerForm, notes: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded bg-white"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Syringe className="w-4 h-4" />
              Confirm Administration & Bill Ledger
            </button>
          </div>
        </form>
      )}

      {activeTab === 'administer' && !selectedPatient && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center space-y-4 text-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto border border-indigo-200">
            <User className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-800">No Patient Selected</h3>
            <p className="text-xs text-slate-500">
              Select an inpatient or outpatient to administer ward consumables, injectables, and bill to patient ledger. Click on a patient to select; re-clicking will deselect.
            </p>
          </div>
          {filteredPatientsForSwitch.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 max-w-2xl mx-auto">
              {filteredPatientsForSwitch.slice(0, 8).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPatientId(p.id)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 hover:border-indigo-300 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                >
                  {p.firstName} {p.lastName} ({p.mrn})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Ward Administration History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold text-sm text-slate-900">
              Ward Administration & Consumable Depletion History ({filteredHistory.length})
            </h3>

            {/* Filter & Sort Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search logs, patient, item, nurse..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs w-60 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-[11px] font-bold text-slate-600">Sort:</span>
                <select
                  value={historySortKey}
                  onChange={(e) => setHistorySortKey(e.target.value as any)}
                  className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="date">Date & Time</option>
                  <option value="patient">Patient Name</option>
                  <option value="item">Item Name</option>
                  <option value="cost">Total Charged</option>
                </select>
                <button
                  type="button"
                  onClick={() => setHistorySortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1 hover:bg-slate-200 rounded transition-colors text-slate-600 cursor-pointer"
                >
                  {historySortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {historySearchTerm && (
                <button
                  type="button"
                  onClick={() => setHistorySearchTerm('')}
                  className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Item Administered</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Charged</th>
                  <th className="py-2.5 px-3">Administering Nurse</th>
                  <th className="py-2.5 px-3">Vitals Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map(adm => (
                    <tr key={adm.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {adm.patientName}
                        <div className="text-[10px] text-slate-400 font-mono">{adm.patientMrn}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-indigo-950">{adm.itemName}</div>
                        <div className="text-[10px] text-slate-500">{adm.routeOfAdministration} &bull; {adm.notes}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {adm.quantityAdministered} {adm.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                        ${adm.totalCostCharged.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {adm.nurseName}
                        <div className="text-[10px] text-slate-400">
                          {new Date(adm.administeredAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(adm.administeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {adm.vitalsAtAdministration ? (
                          <div className="text-[10px] text-slate-600">
                            BP: {adm.vitalsAtAdministration.bloodPressure} | HR: {adm.vitalsAtAdministration.pulseRate} | Temp: {adm.vitalsAtAdministration.temperature}&deg;C
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">None</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No administration logs match your search or filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Ward Floor Stock */}
      {activeTab === 'ward_stock' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900">
              Ward Floor Stock & Consumables ({wardItems.length} items)
            </h3>
            <button
              onClick={onOpenInventory}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold cursor-pointer"
            >
              Reorder from Central Store
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3 text-right">Floor Stock</th>
                  <th className="py-2.5 px-3 text-right">Charge Rate</th>
                  <th className="py-2.5 px-3">Batch Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wardItems.map(item => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{item.code}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {item.totalQuantity} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">${item.sellingPrice.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {item.batches.map(b => b.batchNumber).join(', ') || 'General Batch'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wards & Bed Directory Modal */}
      <ManageLocationsModal
        isOpen={showLocationsModal}
        onClose={() => setShowLocationsModal(false)}
      />

    </div>
  );
};
