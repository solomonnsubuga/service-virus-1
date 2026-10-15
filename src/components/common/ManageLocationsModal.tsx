import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { ClinicWard, ClinicDepartment } from '../../types';
import {
  X,
  Building2,
  BedDouble,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  DoorOpen,
  Users,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Save,
  RotateCcw,
  Sparkles,
  Check,
  Tag,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Info
} from 'lucide-react';

interface ManageLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface DeputyItem {
  id: string;
  userId?: string;
  name: string;
}

export const ManageLocationsModal: React.FC<ManageLocationsModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    activeClinic,
    users,
    currentUser,
    currentClinicWards,
    currentClinicDepartments,
    currentClinicPatients,
    addWard,
    updateWard,
    deleteWard,
    addDepartment,
    updateDepartment,
    deleteDepartment
  } = useClinic();

  // Filter available system users for this specific clinic ID
  const clinicUsers = useMemo(() => {
    if (!activeClinic?.id) return [];
    const currentClinicId = activeClinic.id;
    const userMap = new Map<string, (typeof users)[0]>();

    // 1. Pull all matching users from system users directory for this clinic ID
    (users || []).forEach(u => {
      if (
        u &&
        u.id &&
        (u.clinicId === currentClinicId || u.clinicId === 'all') &&
        u.status !== 'suspended'
      ) {
        userMap.set(u.id, u);
      }
    });

    // 2. Also ensure currentUser is included if belonging to this clinic
    if (
      currentUser &&
      currentUser.id &&
      (currentUser.clinicId === currentClinicId || currentUser.clinicId === 'all') &&
      currentUser.status !== 'suspended'
    ) {
      if (!userMap.has(currentUser.id)) {
        userMap.set(currentUser.id, currentUser);
      }
    }

    // 3. If active clinic has an administrator configured on the clinic record, ensure they are present
    if (activeClinic.adminName && activeClinic.adminName !== 'Not Assigned') {
      const alreadyHasAdmin = Array.from(userMap.values()).some(
        u => u.name === activeClinic.adminName || u.email === activeClinic.email
      );
      if (!alreadyHasAdmin) {
        userMap.set('admin-' + activeClinic.id, {
          id: 'admin-' + activeClinic.id,
          name: activeClinic.adminName,
          email: activeClinic.email || 'admin@' + (activeClinic.code?.toLowerCase() || 'clinic') + '.org',
          role: 'admin',
          clearance: 'Level 5 - Clinic Admin & Executive Management',
          clearanceLevel: 5,
          clinicId: currentClinicId,
          title: 'Clinic Administrator & Medical Director',
          status: 'active'
        });
      }
    }

    return Array.from(userMap.values());
  }, [users, activeClinic?.id, activeClinic?.adminName, activeClinic?.email, activeClinic?.code, currentUser]);

  const [activeTab, setActiveTab] = useState<'wards' | 'departments'>('wards');

  // Ward Form (Add)
  const [showAddWard, setShowAddWard] = useState(false);
  const [wardForm, setWardForm] = useState({
    name: '',
    code: '',
    building: 'Main Clinical Block',
    floor: 'Floor 1',
    totalBeds: 10,
    nurseInCharge: ''
  });

  // Ward Form (Edit)
  const [editingWardId, setEditingWardId] = useState<string | null>(null);
  const [editWardForm, setEditWardForm] = useState({
    name: '',
    code: '',
    building: '',
    floor: '',
    totalBeds: 10,
    nurseInCharge: '',
    beds: [] as string[],
    isActive: true,
    newBedInput: ''
  });

  // Department Form (Add)
  const [showAddDept, setShowAddDept] = useState(false);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    headOfDepartment: '',
    headOfDepartmentId: '',
    deputies: [
      { id: 'dep-1', userId: '', name: '' },
      { id: 'dep-2', userId: '', name: '' },
      { id: 'dep-3', userId: '', name: '' }
    ] as DeputyItem[],
    roomsText: 'Consultation Room 1, Consultation Room 2, Triage Bay'
  });

  // Department Form (Edit)
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptForm, setEditDeptForm] = useState({
    name: '',
    code: '',
    headOfDepartment: '',
    headOfDepartmentId: '',
    deputies: [] as DeputyItem[],
    rooms: [] as string[],
    isActive: true,
    newRoomInput: '',
    bulkMode: false,
    bulkText: ''
  });

  const [leadershipPromptModal, setLeadershipPromptModal] = useState<{
    isOpen: boolean;
    missingHod: boolean;
    hasFewerThanThreeDeputies: boolean;
    deputyCount: number;
    availableUsersCount: number;
  } | null>(null);

  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  if (!isOpen) return null;

  // --- Ward Handlers ---
  const handleAddWardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wardForm.name) return;

    const total = Math.max(1, Number(wardForm.totalBeds) || 6);
    const beds = Array.from({ length: total }, (_, i) => `Bed ${String(i + 1).padStart(2, '0')}`);

    addWard({
      clinicId: activeClinic.id,
      name: wardForm.name.trim(),
      code: wardForm.code.trim() || wardForm.name.substring(0, 4).toUpperCase(),
      building: wardForm.building.trim(),
      floor: wardForm.floor.trim(),
      totalBeds: total,
      beds,
      nurseInCharge: wardForm.nurseInCharge.trim() || undefined,
      isActive: true
    });

    setWardForm({
      name: '',
      code: '',
      building: 'Main Clinical Block',
      floor: 'Floor 1',
      totalBeds: 10,
      nurseInCharge: ''
    });
    setShowAddWard(false);
    showFeedback(`Ward "${wardForm.name.trim()}" created successfully with ${total} beds.`);
  };

  const startEditWard = (ward: ClinicWard) => {
    setEditingWardId(ward.id);
    setEditWardForm({
      name: ward.name,
      code: ward.code || '',
      building: ward.building || 'Main Clinical Block',
      floor: ward.floor || 'Floor 1',
      totalBeds: ward.totalBeds || ward.beds.length || 6,
      nurseInCharge: ward.nurseInCharge || '',
      beds: ward.beds ? [...ward.beds] : Array.from({ length: ward.totalBeds || 6 }, (_, i) => `Bed ${String(i + 1).padStart(2, '0')}`),
      isActive: ward.isActive !== false,
      newBedInput: ''
    });
  };

  const handleRegenerateWardBeds = () => {
    const total = Math.max(1, Number(editWardForm.totalBeds) || 1);
    const newBeds = Array.from({ length: total }, (_, i) => `Bed ${String(i + 1).padStart(2, '0')}`);
    setEditWardForm(prev => ({ ...prev, beds: newBeds }));
  };

  const handleAddCustomBed = () => {
    const name = editWardForm.newBedInput.trim();
    if (!name) return;
    if (editWardForm.beds.includes(name)) {
      alert('A bed with this label already exists in this ward.');
      return;
    }
    const updated = [...editWardForm.beds, name];
    setEditWardForm(prev => ({
      ...prev,
      beds: updated,
      totalBeds: updated.length,
      newBedInput: ''
    }));
  };

  const handleRemoveWardBed = (bedLabel: string) => {
    const updated = editWardForm.beds.filter(b => b !== bedLabel);
    setEditWardForm(prev => ({
      ...prev,
      beds: updated,
      totalBeds: updated.length
    }));
  };

  const handleSaveWardEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWardId || !editWardForm.name.trim()) return;

    const beds = editWardForm.beds.length > 0
      ? editWardForm.beds
      : Array.from({ length: Math.max(1, Number(editWardForm.totalBeds) || 1) }, (_, i) => `Bed ${String(i + 1).padStart(2, '0')}`);

    updateWard(editingWardId, {
      name: editWardForm.name.trim(),
      code: editWardForm.code.trim() || editWardForm.name.substring(0, 4).toUpperCase(),
      building: editWardForm.building.trim(),
      floor: editWardForm.floor.trim(),
      totalBeds: beds.length,
      beds,
      nurseInCharge: editWardForm.nurseInCharge.trim() || undefined,
      isActive: editWardForm.isActive
    });

    setEditingWardId(null);
    showFeedback(`Ward "${editWardForm.name.trim()}" updated successfully.`);
  };

  // --- Deputy Management Helpers for Add Form ---
  const handleUpdateDeputy = (index: number, userId: string, customName?: string) => {
    setDeptForm(prev => {
      const next = [...prev.deputies];
      if (userId === '__custom__') {
        next[index] = { ...next[index], userId: '', name: customName ?? next[index].name };
      } else if (userId === '') {
        next[index] = { ...next[index], userId: '', name: '' };
      } else {
        const u = clinicUsers.find(x => x.id === userId);
        const formattedName = u ? (u.title ? `${u.name}, ${u.title}` : u.name) : '';
        next[index] = { ...next[index], userId, name: formattedName };
      }
      return { ...prev, deputies: next };
    });
  };

  const handleAddDeputySlot = () => {
    setDeptForm(prev => ({
      ...prev,
      deputies: [
        ...prev.deputies,
        { id: `dep-${Date.now()}-${prev.deputies.length}`, userId: '', name: '' }
      ]
    }));
  };

  const handleRemoveDeputySlot = (index: number) => {
    setDeptForm(prev => {
      const next = prev.deputies.filter((_, i) => i !== index);
      return { ...prev, deputies: next };
    });
  };

  // --- Deputy Management Helpers for Edit Form ---
  const handleUpdateEditDeputy = (index: number, userId: string, customName?: string) => {
    setEditDeptForm(prev => {
      const next = [...prev.deputies];
      if (userId === '__custom__') {
        next[index] = { ...next[index], userId: '', name: customName ?? next[index].name };
      } else if (userId === '') {
        next[index] = { ...next[index], userId: '', name: '' };
      } else {
        const u = clinicUsers.find(x => x.id === userId);
        const formattedName = u ? (u.title ? `${u.name}, ${u.title}` : u.name) : '';
        next[index] = { ...next[index], userId, name: formattedName };
      }
      return { ...prev, deputies: next };
    });
  };

  const handleAddEditDeputySlot = () => {
    setEditDeptForm(prev => ({
      ...prev,
      deputies: [
        ...prev.deputies,
        { id: `dep-edit-${Date.now()}-${prev.deputies.length}`, userId: '', name: '' }
      ]
    }));
  };

  const handleRemoveEditDeputySlot = (index: number) => {
    setEditDeptForm(prev => {
      const next = prev.deputies.filter((_, i) => i !== index);
      return { ...prev, deputies: next };
    });
  };

  // Auto-populate leadership helper for Add Form
  const handleAutoPopulateLeadership = () => {
    if (clinicUsers.length === 0) return;

    // Select the best HOD candidate: a doctor, admin, or first user
    const hodCandidate = clinicUsers.find(u => u.role === 'doctor' || u.role === 'admin') || clinicUsers[0];
    const hodName = hodCandidate.title ? `${hodCandidate.name}, ${hodCandidate.title}` : hodCandidate.name;

    // Remaining users for deputies (aiming for >2 deputies, i.e. 3 or more if available)
    const remainingUsers = clinicUsers.filter(u => u.id !== hodCandidate.id);
    const targetDeputySlots = Math.max(3, remainingUsers.length);
    const newDeputies: DeputyItem[] = [];

    for (let i = 0; i < targetDeputySlots; i++) {
      const u = remainingUsers[i];
      if (u) {
        newDeputies.push({
          id: `dep-${Date.now()}-${i}`,
          userId: u.id,
          name: u.title ? `${u.name}, ${u.title}` : u.name
        });
      } else {
        newDeputies.push({
          id: `dep-${Date.now()}-${i}`,
          userId: '',
          name: ''
        });
      }
    }

    setDeptForm(prev => ({
      ...prev,
      headOfDepartment: hodName,
      headOfDepartmentId: hodCandidate.id,
      deputies: newDeputies
    }));

    showFeedback(`Leadership populated from ${activeClinic.name} staff (${hodCandidate.name} as HOD and ${newDeputies.filter(d => d.name).length} deputies).`);
  };

  // --- Department Handlers ---
  const executeSaveDept = (formToSave = deptForm) => {
    if (!formToSave.name.trim()) return;

    const rooms = formToSave.roomsText
      .split(',')
      .map(r => r.trim())
      .filter(Boolean);

    const validDeputies = formToSave.deputies.filter(d => d.name.trim());

    addDepartment({
      clinicId: activeClinic.id,
      name: formToSave.name.trim(),
      code: formToSave.code.trim() || formToSave.name.substring(0, 4).toUpperCase(),
      headOfDepartment: formToSave.headOfDepartment.trim() || undefined,
      headOfDepartmentId: formToSave.headOfDepartmentId.trim() || undefined,
      deputies: validDeputies.length > 0 ? validDeputies.map(d => d.name.trim()) : undefined,
      deputyIds: validDeputies.length > 0 ? (validDeputies.map(d => d.userId).filter(Boolean) as string[]) : undefined,
      rooms: rooms.length > 0 ? rooms : ['Consultation Room 1'],
      isActive: true
    });

    setDeptForm({
      name: '',
      code: '',
      headOfDepartment: '',
      headOfDepartmentId: '',
      deputies: [
        { id: 'dep-1', userId: '', name: '' },
        { id: 'dep-2', userId: '', name: '' },
        { id: 'dep-3', userId: '', name: '' }
      ],
      roomsText: 'Consultation Room 1, Consultation Room 2, Triage Bay'
    });
    setShowAddDept(false);
    setLeadershipPromptModal(null);
    showFeedback(`Department "${formToSave.name.trim()}" created successfully with leadership governance.`);
  };

  const handleAddDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name.trim()) return;

    const validDeputies = deptForm.deputies.filter(d => d.name.trim());
    const missingHod = !deptForm.headOfDepartment.trim();
    // Prompt if HOD is missing OR fewer than 3 deputies are assigned (meaning not "more than two")
    // AND staff members are available in this clinic
    const hasFewerThanThreeDeputies = validDeputies.length <= 2;
    const hasAvailableStaff = clinicUsers.length > 0;

    if ((missingHod || hasFewerThanThreeDeputies) && hasAvailableStaff) {
      setLeadershipPromptModal({
        isOpen: true,
        missingHod,
        hasFewerThanThreeDeputies,
        deputyCount: validDeputies.length,
        availableUsersCount: clinicUsers.length
      });
      return;
    }

    executeSaveDept();
  };

  const startEditDept = (dept: ClinicDepartment) => {
    setEditingDeptId(dept.id);

    const matchedHodUser = clinicUsers.find(u =>
      u.id === dept.headOfDepartmentId ||
      u.name === dept.headOfDepartment ||
      dept.headOfDepartment?.startsWith(u.name)
    );

    const initialDeputies: DeputyItem[] = (dept.deputies || []).map((depName, idx) => {
      const depId = dept.deputyIds?.[idx];
      const matchedUser = clinicUsers.find(u => u.id === depId || u.name === depName || depName.startsWith(u.name));
      return {
        id: `dep-edit-${idx}-${Date.now()}`,
        userId: matchedUser?.id || depId || '',
        name: depName
      };
    });

    // Provide at least 3 deputy slots if staff are available so user can easily add more than 2 deputies
    if (initialDeputies.length < 3 && clinicUsers.length >= 3) {
      while (initialDeputies.length < 3) {
        initialDeputies.push({
          id: `dep-edit-${initialDeputies.length}-${Date.now()}`,
          userId: '',
          name: ''
        });
      }
    } else if (initialDeputies.length < 2 && clinicUsers.length >= 2) {
      while (initialDeputies.length < 2) {
        initialDeputies.push({
          id: `dep-edit-${initialDeputies.length}-${Date.now()}`,
          userId: '',
          name: ''
        });
      }
    }

    setEditDeptForm({
      name: dept.name,
      code: dept.code || '',
      headOfDepartment: dept.headOfDepartment || '',
      headOfDepartmentId: matchedHodUser?.id || dept.headOfDepartmentId || '',
      deputies: initialDeputies,
      rooms: dept.rooms ? [...dept.rooms] : ['Consultation Room 1'],
      isActive: dept.isActive !== false,
      newRoomInput: '',
      bulkMode: false,
      bulkText: dept.rooms ? dept.rooms.join(', ') : 'Consultation Room 1'
    });
  };

  const handleAddRoomToDept = () => {
    const rName = editDeptForm.newRoomInput.trim();
    if (!rName) return;
    if (editDeptForm.rooms.includes(rName)) {
      alert('This consultation room is already added to this department.');
      return;
    }
    const nextRooms = [...editDeptForm.rooms, rName];
    setEditDeptForm(prev => ({
      ...prev,
      rooms: nextRooms,
      bulkText: nextRooms.join(', '),
      newRoomInput: ''
    }));
  };

  const handleRemoveRoomFromDept = (roomName: string) => {
    if (editDeptForm.rooms.length <= 1) {
      alert('A department must have at least one consultation room or office.');
      return;
    }
    const nextRooms = editDeptForm.rooms.filter(r => r !== roomName);
    setEditDeptForm(prev => ({
      ...prev,
      rooms: nextRooms,
      bulkText: nextRooms.join(', ')
    }));
  };

  const handleSaveDeptEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeptId || !editDeptForm.name.trim()) return;

    let finalRooms: string[] = [];
    if (editDeptForm.bulkMode) {
      finalRooms = editDeptForm.bulkText
        .split(',')
        .map(r => r.trim())
        .filter(Boolean);
    } else {
      finalRooms = editDeptForm.rooms.filter(Boolean);
    }

    if (finalRooms.length === 0) {
      finalRooms = ['Consultation Room 1'];
    }

    const validEditDeputies = editDeptForm.deputies.filter(d => d.name.trim());

    updateDepartment(editingDeptId, {
      name: editDeptForm.name.trim(),
      code: editDeptForm.code.trim() || editDeptForm.name.substring(0, 4).toUpperCase(),
      headOfDepartment: editDeptForm.headOfDepartment.trim() || undefined,
      headOfDepartmentId: editDeptForm.headOfDepartmentId?.trim() || undefined,
      deputies: validEditDeputies.length > 0 ? validEditDeputies.map(d => d.name.trim()) : undefined,
      deputyIds: validEditDeputies.length > 0 ? (validEditDeputies.map(d => d.userId).filter(Boolean) as string[]) : undefined,
      rooms: finalRooms,
      isActive: editDeptForm.isActive
    });

    setEditingDeptId(null);
    showFeedback(`Department "${editDeptForm.name.trim()}" and its leadership updated successfully.`);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Clinic Locations, Wards & Clinical Rooms Directory
              </h3>
              <p className="text-xs text-slate-500">
                Manage, add, and edit Inpatient Wards, Bed allocations, and Clinical Consultation Rooms in {activeClinic.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Action Notification */}
        {actionNotice && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="px-6 border-b border-slate-200 flex items-center justify-between text-xs font-bold bg-white">
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                setActiveTab('wards');
                setEditingWardId(null);
              }}
              className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'wards' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BedDouble className="w-3.5 h-3.5" />
              <span>Inpatient Wards & Beds ({currentClinicWards.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('departments');
                setEditingDeptId(null);
              }}
              className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'departments' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Clinical Departments & Consultation Rooms ({currentClinicDepartments.length})</span>
            </button>
          </div>

          <div>
            {activeTab === 'wards' ? (
              <button
                onClick={() => {
                  setShowAddWard(!showAddWard);
                  setEditingWardId(null);
                }}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddWard ? 'Cancel' : 'Add New Ward'}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowAddDept(!showAddDept);
                  setEditingDeptId(null);
                }}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddDept ? 'Cancel' : 'Add Department'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 text-xs">
          
          {/* TAB 1: WARDS */}
          {activeTab === 'wards' && (
            <div className="space-y-6">
              
              {/* Add Ward Form */}
              {showAddWard && (
                <form onSubmit={handleAddWardSubmit} className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 space-y-4 animate-in fade-in duration-150">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                    <BedDouble className="w-4 h-4 text-purple-600" />
                    Register New Inpatient Ward
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Ward Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Neonatal High Dependency Unit"
                        value={wardForm.name}
                        onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Ward Code</label>
                      <input
                        type="text"
                        placeholder="e.g. NHDU"
                        value={wardForm.code}
                        onChange={(e) => setWardForm({ ...wardForm, code: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white uppercase"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Total Bed Count *</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={wardForm.totalBeds}
                        onChange={(e) => setWardForm({ ...wardForm, totalBeds: Number(e.target.value) })}
                        className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Building Wing</label>
                      <input
                        type="text"
                        placeholder="e.g. West Wing Annex"
                        value={wardForm.building}
                        onChange={(e) => setWardForm({ ...wardForm, building: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Floor</label>
                      <input
                        type="text"
                        placeholder="e.g. Floor 2, Ground"
                        value={wardForm.floor}
                        onChange={(e) => setWardForm({ ...wardForm, floor: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Nurse In Charge</label>
                      <input
                        type="text"
                        placeholder="e.g. Sr. Mercy Cherono, BSN"
                        value={wardForm.nurseInCharge}
                        onChange={(e) => setWardForm({ ...wardForm, nurseInCharge: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddWard(false)}
                      className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Ward & Generate Beds
                    </button>
                  </div>
                </form>
              )}

              {/* Edit Ward Modal / Form */}
              {editingWardId && (
                <form onSubmit={handleSaveWardEdit} className="p-5 bg-sky-50/60 rounded-xl border border-sky-300 shadow-sm space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-sky-200 pb-3">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                      <Edit2 className="w-4 h-4 text-sky-600" />
                      Edit Ward Details & Bed Layout
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 uppercase tracking-wider">
                      Editing Ward: {editWardForm.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Ward Name *</label>
                      <input
                        type="text"
                        value={editWardForm.name}
                        onChange={(e) => setEditWardForm({ ...editWardForm, name: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Ward Code</label>
                      <input
                        type="text"
                        value={editWardForm.code}
                        onChange={(e) => setEditWardForm({ ...editWardForm, code: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white uppercase font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Nurse In Charge</label>
                      <input
                        type="text"
                        value={editWardForm.nurseInCharge}
                        onChange={(e) => setEditWardForm({ ...editWardForm, nurseInCharge: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white"
                        placeholder="Sister in Charge"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Building Wing</label>
                      <input
                        type="text"
                        value={editWardForm.building}
                        onChange={(e) => setEditWardForm({ ...editWardForm, building: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Floor</label>
                      <input
                        type="text"
                        value={editWardForm.floor}
                        onChange={(e) => setEditWardForm({ ...editWardForm, floor: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Total Bed Count</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={editWardForm.totalBeds}
                          onChange={(e) => setEditWardForm({ ...editWardForm, totalBeds: Number(e.target.value) })}
                          className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleRegenerateWardBeds}
                          className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-bold whitespace-nowrap cursor-pointer flex items-center gap-1"
                          title="Generate sequential Bed 01 to Bed N"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Regen
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bed Labels Editor */}
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-800 text-xs">
                        Configured Beds ({editWardForm.beds.length} beds allocated):
                      </label>
                      <span className="text-[10px] text-slate-500">
                        Click &times; to remove a bed, or add custom bed labels below.
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded border border-slate-200">
                      {editWardForm.beds.map((b) => (
                        <span
                          key={b}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 rounded text-[11px] font-semibold text-slate-800 shadow-2xs"
                        >
                          <BedDouble className="w-3 h-3 text-purple-600" />
                          <span>{b}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveWardBed(b)}
                            className="text-slate-400 hover:text-rose-600 ml-0.5 rounded-full p-0.5 hover:bg-rose-50 cursor-pointer"
                            title="Remove bed"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {editWardForm.beds.length === 0 && (
                        <div className="text-slate-400 text-xs p-2">No beds added yet. Click &quot;Regen&quot; or add custom beds below.</div>
                      )}
                    </div>

                    {/* Add Custom Bed Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Add custom bed (e.g. ICU-01, VIP-Suite, Bed 12B)"
                        value={editWardForm.newBedInput}
                        onChange={(e) => setEditWardForm({ ...editWardForm, newBedInput: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomBed();
                          }
                        }}
                        className="flex-1 p-2 border border-slate-300 rounded bg-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomBed}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Bed
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editWardForm.isActive}
                        onChange={(e) => setEditWardForm({ ...editWardForm, isActive: e.target.checked })}
                        className="w-4 h-4 rounded text-purple-600"
                      />
                      <span className="font-semibold text-slate-700 text-xs">Ward is Active & Open for Admissions</span>
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingWardId(null)}
                        className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Ward Changes
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Wards List with Bed Occupancy and Edit buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentClinicWards.map(ward => {
                  // Count occupied beds
                  const admittedPatients = currentClinicPatients.filter(
                    p => p.patientType === 'IPD' && p.ward === ward.name && p.currentStatus !== 'discharged'
                  );
                  const occupiedCount = admittedPatients.length;
                  const availableCount = Math.max(0, (ward.totalBeds || ward.beds.length) - occupiedCount);
                  const isEditingThisWard = editingWardId === ward.id;

                  return (
                    <div
                      key={ward.id}
                      className={`bg-white rounded-xl border p-4 shadow-xs space-y-3 transition-all ${
                        isEditingThisWard
                          ? 'border-sky-500 ring-2 ring-sky-300'
                          : ward.isActive === false
                          ? 'border-slate-300 opacity-70 bg-slate-50'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{ward.name}</h4>
                            {ward.code && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 font-mono border border-slate-200">
                                {ward.code}
                              </span>
                            )}
                            {ward.isActive === false && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 uppercase">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {ward.building || 'Main Wing'} &bull; {ward.floor || 'Floor 1'} &bull; Nurse: <span className="font-medium text-slate-700">{ward.nurseInCharge || 'Sister in Charge'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditWard(ward)}
                            className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Edit Ward Details & Beds"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (occupiedCount > 0) {
                                alert(`Cannot delete ward "${ward.name}" while ${occupiedCount} patient(s) are currently admitted here. Please transfer or discharge them first.`);
                                return;
                              }
                              if (confirm(`Are you sure you want to delete ward "${ward.name}"?`)) {
                                deleteWard(ward.id);
                                if (editingWardId === ward.id) setEditingWardId(null);
                                showFeedback(`Ward "${ward.name}" removed.`);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded cursor-pointer transition-colors"
                            title="Delete Ward"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Bed Occupancy Stats */}
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100">
                        <div>
                          <span className="text-slate-500">Capacity:</span> <strong className="text-slate-900">{ward.totalBeds || ward.beds.length} Beds</strong>
                        </div>
                        <div>
                          <span className="text-emerald-600 font-bold">{availableCount} Free</span>
                          <span className="text-slate-400 mx-1.5">|</span>
                          <span className="text-indigo-600 font-bold">{occupiedCount} Occupied</span>
                        </div>
                      </div>

                      {/* Visual Bed Grid */}
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span>Bed Layout ({ward.beds ? ward.beds.length : 0}):</span>
                          {ward.beds && ward.beds.length > 8 && (
                            <span className="text-[9px] text-slate-400">Scroll to view all</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50/70 rounded border border-slate-150">
                          {ward.beds && ward.beds.map(b => {
                            const occupant = admittedPatients.find(p => p.bedNumber === b);
                            const isOccupied = !!occupant;
                            return (
                              <div
                                key={b}
                                title={isOccupied ? `Occupied by: ${occupant.firstName} ${occupant.lastName} (${occupant.mrn})` : `Bed Available`}
                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                                  isOccupied
                                    ? 'bg-indigo-100 text-indigo-900 border-indigo-300 shadow-2xs'
                                    : 'bg-white text-emerald-800 border-emerald-300'
                                }`}
                              >
                                <BedDouble className="w-2.5 h-2.5" />
                                <span>{b}</span>
                                {isOccupied && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  );
                })}

                {currentClinicWards.length === 0 && (
                  <div className="col-span-2 text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                    No inpatient wards configured yet. Click &quot;Add New Ward&quot; above to create your first ward.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: DEPARTMENTS & CLINICAL ROOMS */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              
              {/* Add Department Form */}
              {showAddDept && (
                <form onSubmit={handleAddDeptSubmit} className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-purple-200/70 pb-2.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                      <Layers className="w-4 h-4 text-purple-600" />
                      Register New Clinical Department
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                      Facility: {activeClinic.name} ({activeClinic.code})
                    </span>
                  </div>

                  {/* Clinical Governance Prompt Card */}
                  <div className="p-3.5 bg-gradient-to-r from-purple-100/70 via-indigo-50/80 to-purple-100/70 rounded-xl border border-purple-200 text-slate-800 space-y-2 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 bg-purple-600 text-white rounded-lg shrink-0 mt-0.5 shadow-2xs">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <h5 className="text-xs font-bold text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-purple-700" />
                            Leadership Governance Advisory &bull; Clinic ID: {activeClinic.id}
                          </h5>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200/90 text-purple-950 font-mono">
                            {clinicUsers.length} Available Staff in {activeClinic.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-purple-900/90 mt-1 leading-normal">
                          <strong>Accreditation Guideline:</strong> Please select an official <strong>Department Head (HOD)</strong> and <strong>more than two (2+) Deputy Heads</strong> if staff members are available. Drop-down menus below are populated directly from the available system users of this particular clinic ID (<strong>{activeClinic.id}</strong>).
                        </p>

                        {clinicUsers.length > 0 && (
                          <div className="pt-1.5 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={handleAutoPopulateLeadership}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              <span>Auto-Assign Leadership from Clinic Users</span>
                            </button>
                            <span className="text-[10px] text-purple-700">
                              (Quickly assigns 1 HOD and 3+ Deputies from {activeClinic.name} staff)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Basic Department Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Department Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Cardiology Specialist Clinic"
                        value={deptForm.name}
                        onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Department Code</label>
                      <input
                        type="text"
                        placeholder="e.g. CARDIO"
                        value={deptForm.code}
                        onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white uppercase text-xs font-mono text-slate-900 focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Leadership Section: Head of Department Drop-down Menu */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                        Head of Department (HOD) *
                      </span>
                      {deptForm.headOfDepartment && (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Selected: {deptForm.headOfDepartment}
                        </span>
                      )}
                    </label>

                    {clinicUsers.length > 0 ? (
                      <select
                        value={deptForm.headOfDepartmentId || (deptForm.headOfDepartment && !deptForm.headOfDepartmentId ? '__custom__' : '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__custom__') {
                            setDeptForm(prev => ({ ...prev, headOfDepartmentId: '', headOfDepartment: '' }));
                          } else if (!val) {
                            setDeptForm(prev => ({ ...prev, headOfDepartmentId: '', headOfDepartment: '' }));
                          } else {
                            const u = clinicUsers.find(x => x.id === val);
                            setDeptForm(prev => ({
                              ...prev,
                              headOfDepartmentId: u ? u.id : '',
                              headOfDepartment: u ? (u.title ? `${u.name}, ${u.title}` : u.name) : ''
                            }));
                          }
                        }}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
                      >
                        <option value="">-- Select Department Head from {activeClinic.name} Staff ({clinicUsers.length} Users) --</option>
                        {clinicUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} — {u.role.toUpperCase()}{u.title ? ` (${u.title})` : ''} &bull; {u.email}
                          </option>
                        ))}
                        <option value="__custom__">+ Enter Custom Clinician Name (External)...</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. Dr. Sarah Nduta, MD"
                        value={deptForm.headOfDepartment}
                        onChange={(e) => setDeptForm({ ...deptForm, headOfDepartment: e.target.value, headOfDepartmentId: '' })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-900"
                      />
                    )}

                    {clinicUsers.length > 0 && (!deptForm.headOfDepartmentId && (deptForm.headOfDepartment || deptForm.headOfDepartment === '')) && (
                      <div className="pt-1">
                        <input
                          type="text"
                          placeholder="Type custom external clinician name (e.g. Dr. Sarah Nduta, MD)"
                          value={deptForm.headOfDepartment}
                          onChange={(e) => setDeptForm(prev => ({ ...prev, headOfDepartment: e.target.value }))}
                          className="w-full p-2 border border-purple-300 rounded text-xs bg-purple-50/40 text-purple-950 placeholder:text-purple-400"
                        />
                      </div>
                    )}
                  </div>

                  {/* Leadership Section: Deputies Drop-Down Menus (Support more than two deputies) */}
                  <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-100 pb-2">
                      <div>
                        <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                          Deputy Department Heads (Prompt: Assign &gt;2 Deputies if Staff Available)
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Select from registered clinic staff using the drop-down menus below.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          deptForm.deputies.filter(d => d.name.trim()).length > 2
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : deptForm.deputies.filter(d => d.name.trim()).length === 2
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : deptForm.deputies.filter(d => d.name.trim()).length === 1
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {deptForm.deputies.filter(d => d.name.trim()).length > 2
                            ? `✅ ${deptForm.deputies.filter(d => d.name.trim()).length} Deputies (>2 satisfied)`
                            : `${deptForm.deputies.filter(d => d.name.trim()).length} Assigned • Governance recommends >2`}
                        </span>
                      </div>
                    </div>

                    {/* Deputy Slot Items */}
                    <div className="space-y-2.5">
                      {deptForm.deputies.map((dep, index) => {
                        const isCustom = !dep.userId && dep.name !== '';
                        return (
                          <div key={dep.id} className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-200 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-700 flex items-center gap-1">
                                Deputy #{index + 1}
                                {index >= 2 && (
                                  <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                    Recommended &gt;2
                                  </span>
                                )}
                              </span>
                              {deptForm.deputies.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDeputySlot(index)}
                                  className="text-slate-400 hover:text-rose-600 text-[10px] flex items-center gap-0.5 cursor-pointer"
                                  title="Remove this deputy slot"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-1.5">
                              {clinicUsers.length > 0 ? (
                                <select
                                  value={dep.userId || (isCustom ? '__custom__' : '')}
                                  onChange={(e) => handleUpdateDeputy(index, e.target.value)}
                                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white text-slate-900 cursor-pointer shadow-2xs"
                                >
                                  <option value="">-- Select Deputy from {activeClinic.name} Staff --</option>
                                  {clinicUsers.map(u => {
                                    const isHod = deptForm.headOfDepartmentId === u.id;
                                    const isOtherDeputy = deptForm.deputies.some((d, i) => i !== index && d.userId === u.id);
                                    const isTaken = isHod || isOtherDeputy;
                                    return (
                                      <option key={u.id} value={u.id} disabled={isTaken}>
                                        {u.name} — {u.role.toUpperCase()}{u.title ? ` (${u.title})` : ''} {isHod ? '(Current HOD)' : isOtherDeputy ? '(Already Assigned)' : ''}
                                      </option>
                                    );
                                  })}
                                  <option value="__custom__">+ Enter Custom External Clinician Name...</option>
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  placeholder={`Deputy #${index + 1} Name (e.g. Dr. Deputy Clinician)`}
                                  value={dep.name}
                                  onChange={(e) => handleUpdateDeputy(index, '__custom__', e.target.value)}
                                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                                />
                              )}

                              {clinicUsers.length > 0 && isCustom && (
                                <div className="mt-1">
                                  <input
                                    type="text"
                                    placeholder={`Enter custom name for Deputy #${index + 1}`}
                                    value={dep.name}
                                    onChange={(e) => handleUpdateDeputy(index, '__custom__', e.target.value)}
                                    className="w-full p-1.5 border border-purple-300 rounded text-xs bg-purple-50/40 text-purple-950"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAddDeputySlot}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Another Deputy ({deptForm.deputies.length + 1}th Deputy)</span>
                      </button>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {clinicUsers.length} staff registered in {activeClinic.name}
                      </span>
                    </div>
                  </div>

                  {/* Consultation Rooms */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Consultation Rooms & Exam Suites (Comma Separated) *</label>
                    <input
                      type="text"
                      placeholder="e.g. Consultation Room 101, Consultation Room 102, ECG Suite, Stress Test Room"
                      value={deptForm.roomsText}
                      onChange={(e) => setDeptForm({ ...deptForm, roomsText: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-purple-200">
                    <button
                      type="button"
                      onClick={() => setShowAddDept(false)}
                      className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Save Department
                    </button>
                  </div>
                </form>
              )}

              {/* Edit Department & Clinical Rooms Form */}
              {editingDeptId && (
                <form onSubmit={handleSaveDeptEdit} className="p-5 bg-sky-50/60 rounded-xl border border-sky-300 shadow-sm space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-sky-200 pb-3">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                      <Edit2 className="w-4 h-4 text-sky-600" />
                      Edit Clinical Department & Leadership Team
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 uppercase tracking-wider">
                      Editing: {editDeptForm.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Department Name *</label>
                      <input
                        type="text"
                        value={editDeptForm.name}
                        onChange={(e) => setEditDeptForm({ ...editDeptForm, name: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Department Code</label>
                      <input
                        type="text"
                        value={editDeptForm.code}
                        onChange={(e) => setEditDeptForm({ ...editDeptForm, code: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white uppercase font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Edit HOD Drop-down Menu */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                        Head of Department (HOD)
                      </span>
                      {editDeptForm.headOfDepartment && (
                        <span className="text-[10px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          Selected: {editDeptForm.headOfDepartment}
                        </span>
                      )}
                    </label>

                    {clinicUsers.length > 0 ? (
                      <select
                        value={editDeptForm.headOfDepartmentId || (editDeptForm.headOfDepartment && !editDeptForm.headOfDepartmentId ? '__custom__' : '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__custom__') {
                            setEditDeptForm(prev => ({ ...prev, headOfDepartmentId: '', headOfDepartment: '' }));
                          } else if (!val) {
                            setEditDeptForm(prev => ({ ...prev, headOfDepartmentId: '', headOfDepartment: '' }));
                          } else {
                            const u = clinicUsers.find(x => x.id === val);
                            setEditDeptForm(prev => ({
                              ...prev,
                              headOfDepartmentId: u ? u.id : '',
                              headOfDepartment: u ? (u.title ? `${u.name}, ${u.title}` : u.name) : ''
                            }));
                          }
                        }}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-900 cursor-pointer shadow-2xs"
                      >
                        <option value="">-- Select Department Head from {activeClinic.name} Staff --</option>
                        {clinicUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} — {u.role.toUpperCase()}{u.title ? ` (${u.title})` : ''} &bull; {u.email}
                          </option>
                        ))}
                        <option value="__custom__">+ Enter Custom External Clinician Name...</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={editDeptForm.headOfDepartment}
                        onChange={(e) => setEditDeptForm({ ...editDeptForm, headOfDepartment: e.target.value, headOfDepartmentId: '' })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                        placeholder="e.g. Dr. Head Clinician"
                      />
                    )}

                    {clinicUsers.length > 0 && (!editDeptForm.headOfDepartmentId && (editDeptForm.headOfDepartment || editDeptForm.headOfDepartment === '')) && (
                      <div className="pt-1">
                        <input
                          type="text"
                          placeholder="Type custom external clinician name"
                          value={editDeptForm.headOfDepartment}
                          onChange={(e) => setEditDeptForm(prev => ({ ...prev, headOfDepartment: e.target.value }))}
                          className="w-full p-2 border border-sky-300 rounded text-xs bg-sky-50/40 text-slate-900"
                        />
                      </div>
                    )}
                  </div>

                  {/* Edit Deputies Drop-down Menus */}
                  <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-100 pb-2">
                      <div>
                        <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                          Deputy Department Heads (Assign More Than 2 Deputies if Available)
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Governance advises maintaining multiple deputies to ensure 24/7 handover authorization.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          editDeptForm.deputies.filter(d => d.name.trim()).length > 2
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : editDeptForm.deputies.filter(d => d.name.trim()).length === 2
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : editDeptForm.deputies.filter(d => d.name.trim()).length === 1
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {editDeptForm.deputies.filter(d => d.name.trim()).length > 2
                            ? `✅ ${editDeptForm.deputies.filter(d => d.name.trim()).length} Deputies (>2 satisfied)`
                            : `${editDeptForm.deputies.filter(d => d.name.trim()).length} Assigned`}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {editDeptForm.deputies.map((dep, index) => {
                        const isCustom = !dep.userId && dep.name !== '';
                        return (
                          <div key={dep.id} className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-200 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-700 flex items-center gap-1">
                                Deputy #{index + 1}
                                {index >= 2 && (
                                  <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                                    Recommended &gt;2
                                  </span>
                                )}
                              </span>
                              {editDeptForm.deputies.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEditDeputySlot(index)}
                                  className="text-slate-400 hover:text-rose-600 text-[10px] flex items-center gap-0.5 cursor-pointer"
                                  title="Remove this deputy slot"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-1.5">
                              {clinicUsers.length > 0 ? (
                                <select
                                  value={dep.userId || (isCustom ? '__custom__' : '')}
                                  onChange={(e) => handleUpdateEditDeputy(index, e.target.value)}
                                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white text-slate-900 cursor-pointer shadow-2xs"
                                >
                                  <option value="">-- Select Deputy from {activeClinic.name} Staff --</option>
                                  {clinicUsers.map(u => {
                                    const isHod = editDeptForm.headOfDepartmentId === u.id;
                                    const isOtherDeputy = editDeptForm.deputies.some((d, i) => i !== index && d.userId === u.id);
                                    const isTaken = isHod || isOtherDeputy;
                                    return (
                                      <option key={u.id} value={u.id} disabled={isTaken}>
                                        {u.name} — {u.role.toUpperCase()}{u.title ? ` (${u.title})` : ''} {isHod ? '(Current HOD)' : isOtherDeputy ? '(Already Assigned)' : ''}
                                      </option>
                                    );
                                  })}
                                  <option value="__custom__">+ Enter Custom External Clinician Name...</option>
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  placeholder={`Deputy #${index + 1} Name`}
                                  value={dep.name}
                                  onChange={(e) => handleUpdateEditDeputy(index, '__custom__', e.target.value)}
                                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                                />
                              )}

                              {clinicUsers.length > 0 && isCustom && (
                                <div className="mt-1">
                                  <input
                                    type="text"
                                    placeholder={`Enter custom name for Deputy #${index + 1}`}
                                    value={dep.name}
                                    onChange={(e) => handleUpdateEditDeputy(index, '__custom__', e.target.value)}
                                    className="w-full p-1.5 border border-sky-300 rounded text-xs bg-sky-50/40 text-slate-900"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAddEditDeputySlot}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Another Deputy ({editDeptForm.deputies.length + 1}th Deputy)</span>
                      </button>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {clinicUsers.length} staff registered in {activeClinic.name}
                      </span>
                    </div>
                  </div>

                  {/* Consultation Rooms & Exam Suites Manager */}
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block font-bold text-slate-800 text-xs">
                          Clinical Consultation Rooms & Exam Suites ({editDeptForm.rooms.length}):
                        </label>
                        <p className="text-[11px] text-slate-500">
                          These rooms will be available for doctor routing, triage, and outpatient consultations.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditDeptForm(prev => ({ ...prev, bulkMode: !prev.bulkMode }))}
                        className="text-[11px] font-bold text-sky-600 hover:text-sky-800 underline cursor-pointer"
                      >
                        {editDeptForm.bulkMode ? 'Switch to Badge View' : 'Bulk Edit as Comma-Separated Text'}
                      </button>
                    </div>

                    {!editDeptForm.bulkMode ? (
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-50 rounded border border-slate-200">
                          {editDeptForm.rooms.map((rm) => (
                            <span
                              key={rm}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded text-[11px] font-semibold text-slate-800 shadow-2xs"
                            >
                              <DoorOpen className="w-3 h-3 text-purple-600" />
                              <span>{rm}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveRoomFromDept(rm)}
                                className="text-slate-400 hover:text-rose-600 ml-0.5 rounded-full p-0.5 hover:bg-rose-50 cursor-pointer"
                                title="Remove room"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* Add Room Input Field */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Add new consultation room (e.g. Room 104, Ultrasound Suite, Procedure Room)"
                            value={editDeptForm.newRoomInput}
                            onChange={(e) => setEditDeptForm({ ...editDeptForm, newRoomInput: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddRoomToDept();
                              }
                            }}
                            className="flex-1 p-2 border border-slate-300 rounded bg-white text-xs"
                          />
                          <button
                            type="button"
                            onClick={handleAddRoomToDept}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Room
                          </button>
                        </div>

                        {/* Quick Presets for Clinic Rooms */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
                          <span>Quick add suggestions:</span>
                          {['Consultation Room 3', 'Triage Bay', 'Minor Ops Room', 'Doctor Office 2', 'Exam Suite A'].map(sugg => (
                            <button
                              key={sugg}
                              type="button"
                              onClick={() => {
                                if (!editDeptForm.rooms.includes(sugg)) {
                                  const updated = [...editDeptForm.rooms, sugg];
                                  setEditDeptForm(prev => ({ ...prev, rooms: updated, bulkText: updated.join(', ') }));
                                }
                              }}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 cursor-pointer"
                            >
                              + {sugg}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <textarea
                          rows={3}
                          value={editDeptForm.bulkText}
                          onChange={(e) => setEditDeptForm({ ...editDeptForm, bulkText: e.target.value })}
                          placeholder="Consultation Room 1, Consultation Room 2, Triage Bay, Specialist Room 4"
                          className="w-full p-2.5 border border-slate-300 rounded bg-white text-xs leading-relaxed"
                        />
                        <span className="text-[10px] text-slate-400">Separate multiple rooms with commas</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editDeptForm.isActive}
                        onChange={(e) => setEditDeptForm({ ...editDeptForm, isActive: e.target.checked })}
                        className="w-4 h-4 rounded text-purple-600"
                      />
                      <span className="font-semibold text-slate-700 text-xs">Department is Active & Open for Appointments</span>
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingDeptId(null)}
                        className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Department Changes
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Departments List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentClinicDepartments.map(dept => {
                  const isEditingThisDept = editingDeptId === dept.id;

                  return (
                    <div
                      key={dept.id}
                      className={`bg-white rounded-xl border p-4 shadow-xs space-y-3 transition-all ${
                        isEditingThisDept
                          ? 'border-sky-500 ring-2 ring-sky-300'
                          : dept.isActive === false
                          ? 'border-slate-300 opacity-70 bg-slate-50'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{dept.name}</h4>
                            {dept.code && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 font-mono border border-slate-200">
                                {dept.code}
                              </span>
                            )}
                            {dept.isActive === false && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 uppercase">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-700 flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                                HOD:
                              </span>
                              <span className="font-medium text-slate-900">{dept.headOfDepartment || 'Not Assigned'}</span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-700 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-indigo-600" />
                                Deputies ({dept.deputies?.length || 0}):
                              </span>
                              {dept.deputies && dept.deputies.length > 0 ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  {dept.deputies.map((depName, dIdx) => (
                                    <span key={dIdx} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-800 border border-purple-200">
                                      {depName}
                                    </span>
                                  ))}
                                  {dept.deputies.length > 2 ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      &gt;2 Deputies Verified
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                      &le;2 Deputies
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">None assigned</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditDept(dept)}
                            className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Edit Department & Clinical Rooms"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete department "${dept.name}"?`)) {
                                deleteDepartment(dept.id);
                                if (editingDeptId === dept.id) setEditingDeptId(null);
                                showFeedback(`Department "${dept.name}" removed.`);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded cursor-pointer transition-colors"
                            title="Delete Department"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span>Assigned Consultation Rooms & Exam Suites ({dept.rooms ? dept.rooms.length : 0}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50/70 rounded border border-slate-150">
                          {dept.rooms && dept.rooms.map(rm => (
                            <div
                              key={rm}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded text-[10px] font-semibold flex items-center gap-1 shadow-2xs"
                            >
                              <DoorOpen className="w-2.5 h-2.5 text-purple-600" />
                              <span>{rm}</span>
                            </div>
                          ))}
                          {(!dept.rooms || dept.rooms.length === 0) && (
                            <span className="text-slate-400 text-xs p-1">No rooms assigned</span>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}

                {currentClinicDepartments.length === 0 && (
                  <div className="col-span-2 text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                    No clinical departments configured yet. Click &quot;Add Department&quot; above to create your first department.
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Leadership Governance Prompt Modal (Prompt when HOD or >2 deputies missing if available) */}
      {leadershipPromptModal && leadershipPromptModal.isOpen && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setLeadershipPromptModal(null);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-purple-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <ShieldAlert className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>Department Leadership Governance Prompt</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                      Accreditation Action Required
                    </span>
                  </h3>
                  <p className="text-xs text-purple-100 mt-0.5">
                    Facility: <strong className="text-white">{activeClinic.name}</strong> &bull; Clinic ID: <span className="font-mono text-purple-200 font-bold">{activeClinic.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLeadershipPromptModal(null)}
                className="p-1 text-purple-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* Governance Advisory Alert */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Accreditation Standard: Assign Head of Department &amp; &gt;2 Deputies</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  When creating <strong>&quot;{deptForm.name || 'New Department'}&quot;</strong>, clinical governance requires an official <strong>Department Head (HOD)</strong> and strongly recommends assigning <strong>more than two (2+) Deputy Department Heads</strong> whenever system users are available in this clinic ID. Deputies ensure uninterrupted clinical supervision, emergency authorizations, and ward round handovers.
                </p>
              </div>

              {/* Status Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                  deptForm.headOfDepartment
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/70 border-rose-200 text-rose-900'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Department Head (HOD)</span>
                  <div className="font-bold text-xs mt-1 truncate">
                    {deptForm.headOfDepartment ? `✅ ${deptForm.headOfDepartment}` : '❌ Missing HOD'}
                  </div>
                </div>

                <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                  deptForm.deputies.filter(d => d.name.trim()).length > 2
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Deputies (&gt;2 Standard)</span>
                  <div className="font-bold text-xs mt-1">
                    {deptForm.deputies.filter(d => d.name.trim()).length > 2
                      ? `✅ ${deptForm.deputies.filter(d => d.name.trim()).length} Deputies (>2 satisfied)`
                      : `⚠️ ${deptForm.deputies.filter(d => d.name.trim()).length} Deputies (Advises >2)`}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/70 text-purple-900 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Available Clinic Staff</span>
                  <div className="font-bold text-xs mt-1 font-mono">
                    👥 {clinicUsers.length} Users in Clinic ID: {activeClinic.id}
                  </div>
                </div>
              </div>

              {/* Direct In-Modal Leadership Assignor */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>Select Leadership from Clinic Users (Clinic ID: {activeClinic.id})</span>
                  </h4>
                  {clinicUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoPopulateLeadership}
                      className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Automatically assign available clinic staff as HOD and 3 deputies"
                    >
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      <span>Auto-Assign Staff</span>
                    </button>
                  )}
                </div>

                {/* HOD Drop-down */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Department Head (HOD) from Clinic Users *
                  </label>
                  <select
                    value={deptForm.headOfDepartmentId || (deptForm.headOfDepartment && !deptForm.headOfDepartmentId ? '__custom__' : '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setDeptForm(prev => ({ ...prev, headOfDepartmentId: '', headOfDepartment: '' }));
                      } else if (!val) {
                        setDeptForm(prev => ({ ...prev, headOfDepartmentId: '', headOfDepartment: '' }));
                      } else {
                        const u = clinicUsers.find(x => x.id === val);
                        setDeptForm(prev => ({
                          ...prev,
                          headOfDepartmentId: u ? u.id : '',
                          headOfDepartment: u ? (u.title ? `${u.name}, ${u.title}` : u.name) : ''
                        }));
                      }
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Select Department Head from {activeClinic.name} ({clinicUsers.length} Users) --</option>
                    {clinicUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.role.toUpperCase()}{u.title ? ` (${u.title})` : ''} &bull; {u.email}
                      </option>
                    ))}
                    <option value="__custom__">+ Enter Custom External Clinician Name...</option>
                  </select>
                  {deptForm.headOfDepartment && !deptForm.headOfDepartmentId && (
                    <div className="mt-1.5">
                      <input
                        type="text"
                        placeholder="Custom Department Head Name (e.g. Dr. Sarah Nduta, MD)"
                        value={deptForm.headOfDepartment}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, headOfDepartment: e.target.value }))}
                        className="w-full p-2 border border-purple-300 rounded text-xs bg-purple-50/40 text-purple-950"
                      />
                    </div>
                  )}
                </div>

                {/* Deputies Drop-downs */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Select Deputy Heads (Governance advises &gt;2 Deputies)
                    </label>
                    <span className="text-[11px] font-bold text-purple-700">
                      {deptForm.deputies.filter(d => d.name.trim()).length} of 3+ Recommended Assigned
                    </span>
                  </div>

                  {deptForm.deputies.map((dep, index) => {
                    const isCustom = !dep.userId && dep.name !== '';
                    return (
                      <div key={dep.id} className="p-2 bg-white rounded-lg border border-slate-200 flex flex-col gap-1.5 shadow-2xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700">
                            Deputy #{index + 1} {index >= 2 && <span className="text-emerald-700 font-extrabold">(Satisfies &gt;2 standard)</span>}
                          </span>
                          {deptForm.deputies.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDeputySlot(index)}
                              className="text-slate-400 hover:text-rose-600 text-[10px] cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <select
                          value={dep.userId || (isCustom ? '__custom__' : '')}
                          onChange={(e) => handleUpdateDeputy(index, e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white text-slate-900 cursor-pointer"
                        >
                          <option value="">-- Select Deputy from {activeClinic.name} Staff --</option>
                          {clinicUsers.map(u => {
                            const isHod = deptForm.headOfDepartmentId === u.id;
                            const isOtherDeputy = deptForm.deputies.some((d, i) => i !== index && d.userId === u.id);
                            const isTaken = isHod || isOtherDeputy;
                            return (
                              <option key={u.id} value={u.id} disabled={isTaken}>
                                {u.name} — {u.role.toUpperCase()}{u.title ? ` (${u.title})` : ''} {isHod ? '(Current HOD)' : isOtherDeputy ? '(Assigned)' : ''}
                              </option>
                            );
                          })}
                          <option value="__custom__">+ Enter Custom External Clinician Name...</option>
                        </select>
                        {isCustom && (
                          <input
                            type="text"
                            placeholder={`Enter custom name for Deputy #${index + 1}`}
                            value={dep.name}
                            onChange={(e) => handleUpdateDeputy(index, '__custom__', e.target.value)}
                            className="w-full p-1.5 border border-purple-300 rounded text-xs bg-purple-50/40 text-purple-950 mt-1"
                          />
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleAddDeputySlot}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Deputy Slot ({deptForm.deputies.length + 1}th Deputy)</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setLeadershipPromptModal(null);
                    executeSaveDept();
                  }}
                  className="px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                >
                  Proceed Without Recommended Leadership
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLeadershipPromptModal(null)}
                    className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                  >
                    Edit in Form
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLeadershipPromptModal(null);
                      executeSaveDept();
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 text-xs transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Create Department</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
