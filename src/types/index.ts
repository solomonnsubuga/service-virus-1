export type UserRole = 
  | 'admin'
  | 'doctor'
  | 'pharmacy'
  | 'nursing'
  | 'pathology'
  | 'radiology'
  | 'reception'
  | 'accountant'
  | 'store_manager'
  | 'medical_records';

export type SecurityClearance = 
  | 'Level 1 - Front Desk & Registration'
  | 'Level 2 - Clinical & Ward Staff'
  | 'Level 3 - Diagnostic Specialists & Pharmacists'
  | 'Level 4 - Finance & Account Officers'
  | 'Level 5 - Clinic Admin & Executive Management';

export type UserStatus = 
  | 'active'
  | 'pending_approval'
  | 'pending_password'
  | 'pending_verification'
  | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  roles?: UserRole[]; // Up to 3 roles assigned per user
  clearance: SecurityClearance;
  clearanceLevel: number; // 1 to 5
  assignedRole?: UserRole;
  assignedRoles?: UserRole[];
  assignedClearanceLevel?: number;
  clinicId: string; // which clinic they belong to (or 'all' for super admin)
  title: string;
  status: UserStatus;
  requestedRole?: UserRole;
  requestedRoles?: UserRole[];
  requestedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  verificationToken?: string;
  avatarUrl?: string;
  specialty?: string;
}

export interface InsurancePolicy {
  id: string;
  clinicId: string; // Respective clinic ID this policy is affiliated with (or 'all' for multi-branch network)
  name: string; // Available Insurance Policy Name e.g. "NHIF Premier", "Jubilee Health", "Aetna Corporate PPO"
  policyName?: string; // Compatibility alias
  code?: string; // Policy Code / Payer ID e.g. "NHIF-001"
  category?: 'national' | 'corporate' | 'private' | 'community' | 'other';
  coveragePercentage?: number; // Coverage rate e.g. 100%, 80%
  copayAmount?: number; // Fixed copay amount e.g. 0, 10
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals?: number;
  position?: 'prefix' | 'suffix';
}

export type ClinicUserLimitTier = 'access' | 'basic' | 'standard' | 'premium' | 'enterprise';

export interface Clinic {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  adminName: string;
  adminPassword?: string;
  operatingHours: string;
  color: string;
  status?: boolean; // false when newly created, true when approved by developer
  approved?: boolean;
  approvedAt?: string;
  userLimitTier?: ClinicUserLimitTier; // access (5), basic (10), standard (20), premium (50), enterprise (75+)
  userLimit?: number; // Upper limit of users for this clinic ID
  isVerified?: boolean;
  createdAt?: string;
  insurancePolicies?: InsurancePolicy[];
  currency?: string;
  currencySymbol?: string;
  currencyName?: string;
  currencyDecimals?: number;
  currencyPosition?: 'prefix' | 'suffix';
  // Company & Facility Brand Logo (Stored in Prime Admin Cloud Account)
  logoUrl?: string;
  logoUpdatedAt?: string;
  logoStorageType?: 'prime_admin_cloud' | 'local';
  logoUploadedBy?: string;
  logoFileName?: string;
  logoFileSize?: number;
}

export interface SimulatedEmail {
  id: string;
  recipientEmail: string;
  recipientName: string;
  clinicId: string;
  clinicName: string;
  type: 'clinic_verification' | 'password_setup' | 'role_assigned';
  subject: string;
  content: string;
  actionToken: string;
  actionUrl: string;
  actionButtonText: string;
  sentAt: string;
  isRead?: boolean;
}

export type InventoryCategory = 
  | 'pharmaceutical'
  | 'nursing_consumable'
  | 'lab_reagent'
  | 'radiology_supply'
  | 'surgical_equipment'
  | 'general_medical';

export interface StockBatch {
  id: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  unitCost?: number;
  sellingPrice?: number;
  supplier?: string;
  manufactureDate?: string;
  receivedDate?: string;
  locationRack?: string;
}

export interface InventoryItem {
  id: string;
  clinicId: string;
  code: string;
  name: string;
  genericName?: string;
  category: InventoryCategory;
  unit: string; // e.g., 'tablets', 'vials', 'bottles', 'pieces', 'kits', 'boxes'
  description?: string;
  batches: StockBatch[];
  totalQuantity: number;
  subInventory?: SubInventoryLocation; // 'main' (Central Warehouse) | 'pharmacy' (Pharmacy Dispensary) | 'nursing' (Ward / Nursing Station)
  reorderLevel: number;
  idealStockLevel: number;
  unitCost: number;
  sellingPrice: number;
  unitPrice?: number;
  insurancePrices?: Record<string, number>; // Map of insurance policy name or ID -> custom selling price e.g. { "NHIF Premier": 4.50, "Jubilee Health": 6.00 }
  requiresPrescription: boolean;
  department: 'pharmacy' | 'nursing' | 'pathology' | 'radiology' | 'general';
  contraindications?: string;
  dosageForm?: string; // e.g., '500mg Oral Tablet', '1g IV Injection'
}

export type PatientAgeCategory = 'ADULT' | 'ELDER' | 'INFANT' | 'CHILD';
export type PatientAdmissionType = 'OPD' | 'IPD';

export type SubInventoryLocation = 'main' | 'pharmacy' | 'nursing';

export interface PatientMovementRecord {
  id: string;
  timestamp: string; // ISO datetime
  actionType?: 'admission' | 'discharge' | 'ward_transfer' | 'room_transfer' | 'triage' | 'initial_registration' | 'revisit' | 'deceased';
  fromDepartment?: string;
  fromLocation: string; // e.g. "Reception / Registration", "A&E - Bed 2", "OPD Room 101"
  toDepartment?: string;
  toLocation: string; // e.g. "Pediatrics Ward - Bed 12", "Consultation Room 3B"
  department?: string;
  roomOrWard?: string;
  toBedNumber?: string;
  bedNumber?: string;
  assignedDoctorName?: string;
  patientType?: PatientAdmissionType; // 'OPD' | 'IPD'
  reason?: string; // e.g. "Admitted from OPD by Dr. Smith", "Transferred from A&E"
  performedById?: string;
  performedByName?: string;
  performedByRole?: string;
  transferredBy?: string; // user name
  transferredByRole?: string;
}

export interface PatientVisit {
  id: string;
  visitNumber: number; // 1 (initial), 2 (revisit 1), 3...
  isRevisit: boolean;
  patientId: string;
  clinicId: string;
  visitDate: string; // ISO datetime
  visitTimestamp?: string;
  patientType: PatientAdmissionType; // 'OPD' | 'IPD'
  visitMrn: string; // The OPD or IPD number generated for this specific visit
  department?: string;
  doctorRoom?: string;
  ward?: string;
  bedNumber?: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  revisitReason?: string; // e.g. "Follow-up", "Routine Review", "Acute recurrence", "New complaint"
  notes?: string;
  status: 'waiting' | 'in_consultation' | 'in_triage' | 'in_lab' | 'in_radiology' | 'in_pharmacy' | 'in_ward' | 'discharged' | 'referred' | 'deceased';
  registeredBy: string;
  registeredById?: string;
  vitals?: PatientAnthropometry;
  dischargeDate?: string;
  dischargeCondition?: string;
}

export interface ClinicWard {
  id: string;
  clinicId: string;
  name: string;
  code?: string;
  building?: string;
  floor?: string;
  totalBeds: number;
  beds: string[];
  nurseInCharge?: string;
  isActive?: boolean;
}

export interface ClinicDepartment {
  id: string;
  clinicId: string;
  name: string;
  code?: string;
  headOfDepartment?: string;
  headOfDepartmentId?: string;
  deputies?: string[];
  deputyIds?: string[];
  rooms: string[];
  isActive?: boolean;
}

export interface PatientAnthropometry {
  bloodPressure: string;      // e.g. "120/80"
  pulseRate: number;          // bpm, e.g. 72
  temperature: number;        // °C, e.g. 36.8
  respiratoryRate: number;    // breaths/min, e.g. 16
  spO2: number;               // %, e.g. 99
  weightKg: number;           // kg, e.g. 70
  heightCm: number;           // cm, e.g. 170
  bmi?: number;               // kg/m²
  muacCm?: number;            // Mid-upper arm circumference in cm
  bloodGlucose?: string;      // mg/dL or mmol/L
  lastUpdated?: string;
  recordedBy?: string;
}

export interface Patient {
  id: string;
  mrn: string; // OPD or IPD Number (e.g. OPD-2026-8801, IPD-2026-8802)
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  age: number | string; // Numeric years (e.g. 29) or clinical fraction notation (e.g. "5/7", "2/52", "1/12", "3/12")
  ageDisplay?: string; // Formatted display, e.g. "2/52 (2 weeks)", "5/7 (5 days)", "1/12 (1 month)", "29 yrs"
  rawAge?: string; // Original clinical notation e.g. "2/52", "5/7", "1/12", "29"
  ageInYears?: number; // Chronological age in decimal years for calculations and sorting
  ageFraction?: string; // Standardized fraction string if applicable
  ageUnit?: 'days' | 'weeks' | 'months' | 'years';
  ageCategory?: PatientAgeCategory;
  patientType?: PatientAdmissionType; // Outpatient (OPD) vs Inpatient (IPD)
  phone?: string;
  email?: string;
  address: string;
  registeredClinicId: string;
  clinicId?: string;
  registeredAt: string;
  registeredDate?: string;
  name?: string;
  initialComplaint?: string;
  doctorRoomOrOffice?: string;
  admissionType?: PatientAdmissionType;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodGroup?: string;
  allergies: string[];
  insuranceProvider?: string;
  insurancePolicyName?: string;
  insurancePolicyNumber?: string;
  emergencyContact: {
    name: string;
    phone?: string;
    relationship: string;
  };
  currentStatus: 'waiting' | 'in_consultation' | 'in_triage' | 'in_lab' | 'in_radiology' | 'in_pharmacy' | 'in_ward' | 'admitted' | 'discharged' | 'referred' | 'deceased';
  
  // Tagging & Departmental Routing
  department?: string; // e.g. "General OPD", "Pediatrics", "Accident & Emergency (A&E)", "Internal Medicine"
  doctorRoom?: string; // e.g. "Room 101", "Consultation Room 3B", "Office 12"
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  
  // Inpatient IPD Ward & Bed Details
  ward?: string; // e.g. "Male Medical Ward", "Female Surgical Ward", "Pediatric Ward", "A&E Observation", "ICU"
  bedNumber?: string; // e.g. "Bed 01", "Bed 12"
  admissionDate?: string;
  dischargeDate?: string;
  dateOfDeath?: string;
  timeOfDeath?: string;
  
  // Historical Patient Journey & Movement Path with Timestamps
  movementHistory?: PatientMovementRecord[];
  
  vitals?: PatientAnthropometry;
  anthropometry?: PatientAnthropometry;

  // Revisit & Multi-Visit Tracking
  isRevisit?: boolean;
  revisitCount?: number;
  initialMrn?: string;
  currentVisitId?: string;
  currentVisitNumber?: number;
  visits?: PatientVisit[];
  notes?: string;
  createdAt?: string;
}

export type TestResultType = 'positive_negative' | 'reactive_non_reactive' | 'ranges';

export interface TestParameterDefinition {
  parameter: string;
  unit: string; // e.g. "g/dL", "mg/dL", "U/L", "Index", "Dipstick", "mIU/L", "%"
  referenceRange: string; // e.g. "12.0 - 16.5", "70 - 99", "Negative", "< 5.7"
  defaultExpectedValue?: string; // e.g. "Negative", "14.0", "Non-reactive", "Normal"
}

export interface AvailableTest {
  id: string;
  clinicId: string;
  name: string;
  code: string;
  department: 'pathology' | 'radiology';
  category: 'Hematology' | 'Biochemistry' | 'Microbiology' | 'Parasitology' | 'Immunology' | 'Urinalysis' | 'X-Ray' | 'Ultrasound' | 'CT Scan' | 'MRI' | 'General';
  price: number;
  insurancePrices?: Record<string, number>; // Map of insurance policy name or ID -> custom tariff price e.g. { "NHIF Premier": 25.00, "Aetna Global": 35.00 }
  turnaroundTime?: string; // e.g. "1-2 Hours", "Same Day", "24 Hours"
  sampleOrBodyPart?: string; // e.g. "Whole Blood (EDTA)", "Serum", "Chest / Thorax"
  description?: string;
  isActive: boolean;
  resultType?: TestResultType; // 'positive_negative' | 'reactive_non_reactive' | 'ranges'
  expectedOutcome?: string; // e.g. "Negative", "Positive", "Non-reactive", "Reactive"
  parameters?: TestParameterDefinition[]; // Parameters and normal ranges in series
  createdAt?: string;
}

export interface PrescriptionItem {
  id: string;
  inventoryItemId?: string;
  medicationName: string;
  dosage: string;
  frequency: string; // e.g. "TDS (3x Daily)", "BD (2x Daily)", "OD (Once Daily)", "PRN"
  duration: string; // e.g. "5 days"
  route: 'Oral' | 'IV' | 'IM' | 'Subcutaneous' | 'Topical' | 'Ophthalmic' | 'Inhalation';
  quantityToDispense: number;
  unit?: string;
  category?: InventoryCategory;
  instructions: string;
  status: 'pending' | 'dispensed' | 'partially_dispensed' | 'cancelled';
  dispensedBatchId?: string;
  dispensedAt?: string;
  dispensedBy?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  patientType?: PatientAdmissionType;
  targetDepartment?: 'pharmacy' | 'nursing';
  clinicId: string;
  doctorId: string;
  doctorName: string;
  encounterId: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  diagnosis: string;
  clinicalNotes: string;
  items: PrescriptionItem[];
  overallStatus: 'pending' | 'partially_dispensed' | 'completed' | 'cancelled';
  isDischargePrescription?: boolean;
  dischargeSummaryId?: string;
}

export type TreatmentDoseStatus = 'given' | 'pending' | 'omitted' | 'refused' | 'skipped';

export interface TreatmentDoseRecord {
  id: string;
  doseNumber: number; // 1, 2, 3...
  scheduledTime?: string; // e.g. "08:00", "14:00", "20:00"
  scheduledDate?: string;
  status: TreatmentDoseStatus;
  administeredAt?: string;
  administeredBy?: string;
  administeredById?: string;
  reason?: string;
  notes?: string;
  route?: string;
  vitals?: {
    bloodPressure?: string;
    pulseRate?: number;
    temperature?: number;
    spO2?: number;
  };
  history?: UnitAdminHistoryEntry[];
}

export interface TreatmentChartItem {
  id: string;
  inventoryItemId?: string;
  inventoryItemName?: string;
  unitPrice?: number;
  medicationOrItemName: string;
  dosage: string; // e.g. "1g", "500ml", "40mg"
  route: string; // e.g. "IV", "Oral", "IM", "Subcutaneous", "Infusion", etc.
  frequency: string; // e.g. "OD (Once Daily)", "BD (2x Daily)", "TDS (3x Daily)", "QID (4x Daily)", "STAT (Once)", "PRN (As Needed)"
  duration?: string; // e.g. "3 days", "5 days"
  quantityPerDose: number; // e.g. 1
  unit: string; // e.g. "vials", "tablets", "ampoules", "bottles", "pieces"
  totalQuantityToAdminister: number; // e.g. 6
  instructions?: string;
  encounterId?: string;
  prescriptionId?: string;
  prescribedByDoctor: string;
  prescribedAt: string;
  populatedByNurse: string;
  populatedAt: string;
  status: 'active' | 'completed' | 'discontinued';
  discontinueReason?: string;
  doses: TreatmentDoseRecord[];
}

export interface PatientTreatmentChart {
  id: string;
  patientId: string;
  clinicId: string;
  patientName: string;
  patientMrn: string;
  ward?: string;
  bedNumber?: string;
  encounterId?: string;
  encounterDate?: string;
  doctorName?: string;
  diagnosis?: string;
  doctorOrders?: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  items: TreatmentChartItem[];
}

export type UnitAdminStatus = 'given' | 'refused' | 'skipped' | 'pending';

export interface UnitAdminHistoryEntry {
  id: string;
  timestamp: string;
  user: string;
  userId?: string;
  previousStatus?: UnitAdminStatus;
  newStatus: UnitAdminStatus;
  reason?: string;
  notes?: string;
  route?: string;
}

export interface CartItemUnitAdministration {
  unitIndex: number; // 1-based unit index (e.g. 1, 2, 3...)
  status: UnitAdminStatus; // 'given' | 'refused' | 'skipped' | 'pending'
  administeredAt: string; // ISO timestamp
  administeredBy: string; // User name
  administeredById?: string; // User ID
  route?: string;
  reason?: string;
  notes?: string;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
  history?: UnitAdminHistoryEntry[];
  vitals?: {
    bloodPressure?: string;
    pulseRate?: number;
    temperature?: number;
    spO2?: number;
  };
}

export interface PharmacyCartItem {
  id: string;
  inventoryItemId?: string; // Sub-inventory item id
  itemCode: string;
  itemName: string;
  genericName?: string;
  category?: InventoryCategory;
  dosage?: string;
  dosageForm?: string;
  route?: string;
  unit: string;
  quantity: number;
  unitCost?: number;
  unitPrice: number; // selling price charged
  baseUnitPrice?: number; // standard base cash price for comparison
  totalPrice: number; // quantity * unitPrice
  insurancePolicyName?: string; // insurance policy name applied
  isInsurancePrice?: boolean; // whether custom insurance rate was used
  prescribedItemRefId?: string; // Doctor's prescription item ID reference
  instructions?: string;
  batchNumber?: string;
  dispensedQuantity?: number;
  dispensedOrAdministeredQty?: number; // Count of units already dispensed or administered
  administeredQuantity?: number;
  unitAdministrations?: CartItemUnitAdministration[];
  status?: 'pending' | 'dispensed' | 'administered' | 'partially_administered' | 'ready_to_administer' | 'transferred_to_indirect' | 'sent_to_nursing';
  transferredToCartId?: string;
  transferredQuantity?: number;
  dispensedAt?: string;
  dispensedBy?: string;
  administeredAt?: string;
  administeredBy?: string;
}

export type CartStatus = 
  | 'draft'
  | 'pending_accounts'
  | 'sent_to_accounts'
  | 'approved_by_accounts'
  | 'rejected_by_accounts'
  | 'partially_approved'
  | 'ready_for_nursing'
  | 'sent_to_nursing'
  | 'dispensed'
  | 'partially_dispensed'
  | 'administered'
  | 'partially_administered'
  | 'returned'
  | 'cancelled';

export interface PharmacyCart {
  id: string;
  cartNumber: string; // e.g., "CRT-DIR-2026-1001" or "CRT-IND-2026-1001"
  clinicId: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  encounterId?: string;
  prescriptionId?: string;
  parentCartId?: string;
  parentCartNumber?: string;
  cartType: 'direct' | 'indirect';
  targetWard?: string;
  targetBedNumber?: string;
  // direct = immediate take-home by patient from Pharmacy Sub-Inventory
  // indirect = nursing/ward sub-inventory administration (injectables, infusions, consumables)
  items: PharmacyCartItem[];
  totalAmount?: number;
  totalSumCost?: number; // Total billed selling price
  totalCostPrice?: number; // Total unit cost
  insurancePolicyName?: string; // e.g. "NHIF Premier", "Jubilee Health Insurance", or "Cash"
  insurancePolicyApplied?: boolean; // Whether non-cash tariff rates were applied
  createdAt: string;
  createdBy?: string;
  createdById?: string;
  updatedAt?: string;
  updatedBy?: string;
  status: CartStatus;
  
  // Accounts financial status & patient affordability note
  accountsStatus?: 'pending' | 'approved' | 'partially_approved' | 'rejected';
  affordabilityAmount?: number;
  patientAffordabilityAmount?: number; // Amount patient is ready/willing to incur
  accountsNotes?: string;
  accountsApprovedAt?: string;
  accountsApprovedBy?: string;
  accountsReviewedAt?: string;
  accountsReviewedBy?: string;
  accountsNotesEditedAt?: string;
  accountsNotesEditedBy?: string;
  accountsNotesHistory?: {
    id: string;
    note: string;
    updatedAt: string;
    updatedBy: string;
    updatedById?: string;
    reason?: string;
  }[];
  
  // Dispense tracking and user audit logs
  dispensedAt?: string;
  dispensedBy?: string;
  dispensedById?: string;
  dispenseLogs?: {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    action: 'dispensed' | 'edited' | 'returned' | 'administered' | 'created';
    quantityChanged: number;
    itemCode: string;
    notes?: string;
  }[];
}

export interface NursingAdministrationLog {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  ward?: string;
  bedNumber?: string;
  cartId?: string;
  cartItemId?: string;
  prescriptionItemId?: string;
  itemId?: string;
  inventoryItemId?: string;
  itemName: string;
  dosage: string;
  route: string;
  quantityAdministered: number;
  unit: string;
  administeredAt: string; // ISO datetime
  nurseId: string;
  nurseName: string;
  vitalsAtAdmin?: {
    bloodPressure?: string;
    pulseRate?: number;
    temperature?: number;
    spO2?: number;
  };
  vitalsAtAdministration?: {
    bloodPressure?: string;
    pulseRate?: number;
    temperature?: number;
    spO2?: number;
  };
  notes?: string;
  reasonNotAdministered?: string;
  status: 'given' | 'omitted' | 'administered' | 'reverted' | 'edited' | 'refused' | 'held' | 'skipped';
  revertedAt?: string;
  revertedBy?: string;
}

export interface ClinicalAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  storageType?: 'prime_admin_cloud' | 'local';
}

export interface TestOrder {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  encounterId: string;
  testCode: string;
  testName: string;
  category: 'Hematology' | 'Biochemistry' | 'Microbiology' | 'Parasitology' | 'Immunology' | 'Urinalysis';
  clinicalIndication: string;
  priority: 'Routine' | 'Urgent' | 'STAT';
  orderedAt: string;
  status: 'pending' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';
  reagentsUsed?: {
    inventoryItemId: string;
    reagentName: string;
    quantityUsed: number;
    unit: string;
  }[];
  results?: {
    parameter: string;
    value: string;
    unit: string;
    referenceRange: string;
    flag: 'Normal' | 'High' | 'Low' | 'Abnormal';
  }[];
  labTechnicianNotes?: string;
  completedAt?: string;
  completedBy?: string;
  cost: number;
  baseCost?: number;
  isInsurancePrice?: boolean;
  insurancePolicyName?: string;
  // Patient Result Document Attachments (Stored in Prime Admin Cloud Account)
  attachments?: ClinicalAttachment[];
}

export interface RadiologyOrder {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  encounterId: string;
  procedureCode: string;
  procedureName: string;
  modality: 'X-Ray' | 'Ultrasound' | 'CT Scan' | 'MRI' | 'Mammography';
  bodyPart: string;
  clinicalHistory: string;
  priority: 'Routine' | 'Urgent' | 'Emergency' | 'STAT';
  orderedAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  consumablesUsed?: {
    inventoryItemId: string;
    itemName: string;
    quantityUsed: number;
    unit: string;
  }[];
  findings?: string;
  impression?: string;
  radiologistNotes?: string;
  completedAt?: string;
  completedBy?: string;
  cost: number;
  baseCost?: number;
  isInsurancePrice?: boolean;
  insurancePolicyName?: string;
  imageUrl?: string;
  // Patient Result Document Attachments (Stored in Prime Admin Cloud Account)
  attachments?: ClinicalAttachment[];
}

export interface AdministeredItem {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  clinicId: string;
  nurseId: string;
  nurseName: string;
  encounterId: string;
  inventoryItemId: string;
  itemName: string;
  category: InventoryCategory;
  quantityAdministered: number;
  unit: string;
  routeOfAdministration?: string;
  administeredAt: string;
  batchNumberUsed?: string;
  unitPriceCharged: number;
  totalCostCharged: number;
  notes: string;
  vitalsAtAdministration?: {
    bloodPressure?: string;
    pulseRate?: number;
    temperature?: number;
    spO2?: number;
  };
}

export interface PaymentTransactionItemAllocation {
  itemId: string;
  description: string;
  department: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount: number;
  amountAllocated: number;
}

export interface OtherChargeItem {
  id: string;
  clinicId?: string;
  description: string;
  cost: number;
  insurancePrices?: Record<string, number>; // Map of insurance policy name or ID -> custom tariff cost e.g. { "NHIF Premier": 20.00, "Aetna Global": 30.00 }
  department?: 'Consultation' | 'Registration' | 'Nursing' | 'Procedure' | 'Pathology' | 'Radiology' | 'Pharmacy' | 'Other' | string;
  category?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface LedgerItem {
  id: string;
  date: string;
  department: 'Consultation' | 'Pharmacy' | 'Pathology' | 'Radiology' | 'Nursing' | 'Procedure' | 'Registration' | 'Other' | string;
  description: string;
  referenceId?: string; // prescriptionId, testOrderId, scanId, adminItemId, cartId
  treatmentChartId?: string;
  treatmentChartItemId?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: 'unpaid' | 'paid' | 'partially_paid' | 'waived' | 'insurance_pending';
  amountPaid?: number;
  balanceDue?: number;
  paidAt?: string;
  paidReceiptNumber?: string;
  paidBy?: string;
  cartId?: string;
  cartNumber?: string;
  cartType?: 'direct' | 'indirect';
  visitNumber?: number;
  visitMrn?: string;
  isInsurancePrice?: boolean;
  insurancePolicyName?: string;
  baseUnitPrice?: number;
}

export interface PaymentTransaction {
  id: string;
  receiptNumber: string;
  date: string;
  amountPaid: number;
  paymentMethod: 'Cash' | 'Credit/Debit Card' | 'Mobile Money' | 'Insurance Claim' | 'Bank Transfer' | string;
  referenceNo?: string;
  receivedBy: string;
  notes?: string;
  patientId?: string;
  patientName?: string;
  patientMrn?: string;
  allocatedItems?: PaymentTransactionItemAllocation[];
  paidItemIds?: string[];
  targetCategory?: string;
  targetCartId?: string;
  targetCartNumber?: string;
  remainingPatientDebt?: number;
}

export interface PatientLedger {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  patientPhone?: string;
  clinicId: string;
  createdAt: string;
  items: LedgerItem[];
  totalBilled: number;
  totalPaid: number;
  balanceDue: number;
  status: 'settled' | 'pending_payment' | 'partially_paid';
  transactions: PaymentTransaction[];
  registeredMrns?: string[]; // All OPD / IPD numbers generated for this patient
  totalVisitsCount?: number;
  isCompoundLedger?: boolean;
}

export interface InterBranchTransfer {
  id: string;
  transferNumber: string;
  sourceClinicId: string;
  sourceClinicName: string;
  targetClinicId: string;
  targetClinicName: string;
  requestedBy: string;
  requestedAt: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantityRequested: number;
  quantityShipped?: number;
  quantityReceived?: number;
  batchNumber?: string;
  status: 'requested' | 'approved' | 'in_transit' | 'received' | 'rejected';
  notes?: string;
  approvedBy?: string;
  completedAt?: string;
}

export interface ClinicalEncounterEditRecord {
  id: string;
  editedAt: string; // ISO timestamp of edit
  editorId: string;
  editorName: string;
  editorRole?: string;
  reason?: string;
  summaryOfChanges?: string;
  previousDiagnosis?: string;
  newDiagnosis?: string;
}

export interface ClinicalEncounter {
  id: string;
  patientId: string;
  patientName?: string;
  patientMrn?: string;
  patientType?: PatientAdmissionType;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  visitDate: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedById?: string;
  lastEditReason?: string;
  editHistory?: ClinicalEncounterEditRecord[];
  chiefComplaint: string;
  historyOfPresentIllness: string;
  vitals: {
    bloodPressure: string;
    pulseRate: number;
    temperature: number;
    respiratoryRate: number;
    weightKg: number;
    heightCm: number;
    spO2: number;
    muacCm?: number;
    bloodGlucose?: string;
    bmi?: number;
  };
  physicalExamNotes: string;
  generalExam?: string;
  systemicExam?: string;
  workingDiagnosis: string;
  differentialDiagnosis?: string;
  clinicalPlan?: string;
  investigationsOrdered?: string[];
  medicationsPrescribed?: string[];
  followUpDate?: string;
  status: 'in_progress' | 'awaiting_results' | 'completed';
}

export interface ProcedureInventoryItem {
  id: string;
  clinicId?: string; // 'all' or specific clinicId
  code: string;
  name: string;
  category: 'Minor Surgery' | 'Emergency & Trauma' | 'Wound Care & Suture' | 'Diagnostic / Biopsy' | 'Orthopedic / Casting' | 'Catheter / Cannulation' | 'General Medical';
  defaultCost: number; // Standard cash price
  insurancePrices?: Record<string, number>; // Insurance Company Name -> Selling Price
  anesthesia: 'Local Anesthesia' | 'Sedation' | 'Spinal / Regional' | 'General Anesthesia' | 'Topical' | 'None';
  description: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClinicalProcedure {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  encounterId?: string;
  procedureName: string;
  procedureCode?: string;
  category?: 'Minor Surgery' | 'Emergency & Trauma' | 'Wound Care & Suture' | 'Diagnostic / Biopsy' | 'Orthopedic / Casting' | 'Catheter / Cannulation' | 'General Medical';
  details: string;
  findings?: string;
  anesthesiaType?: 'Local Anesthesia' | 'Sedation' | 'Spinal / Regional' | 'General Anesthesia' | 'Topical' | 'None';
  assistants?: string;
  outcome: 'Successful' | 'Successful with Monitoring' | 'Partial' | 'Complications' | 'Referred';
  outcomeNotes?: string;
  cost: number;
  baseCost?: number;
  insurancePolicyName?: string;
  isInsurancePrice?: boolean;
  performedAt: string; // ISO datetime
  scheduledDate?: string;
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
  updatedBy?: string;
  postProcedureCare?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  clinicId: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  details: string;
  ipAddress?: string;
}

export interface DischargeMedicationItem {
  id: string;
  inventoryItemId?: string;
  medicationName: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantityToDispense: number;
  instructions: string;
  unitPrice?: number;
}

export type DischargeCondition = 
  | 'Improved'
  | 'Recovered / Cured'
  | 'Stable'
  | 'Discharged on Request (LAMA)'
  | 'Referred / Transferred'
  | 'Deceased';

export interface DischargeChangeRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole?: string;
  action: 'created' | 'updated' | 'finalized';
  details?: string;
  previousDischargeCondition?: string;
  newDischargeCondition?: string;
}

export interface DischargeSummary {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  patientAge: number | string;
  patientGender: string;
  ward?: string;
  bedNumber?: string;
  admissionDate: string;
  dischargeDate: string;
  dischargingDoctorId: string;
  dischargingDoctorName: string;
  
  // Auto-filled fields:
  firstChiefComplaint: string;
  testsDoneSummary: string[]; // List of names, codes, findings of lab & imaging tests done
  
  // User provided/editable fields:
  finalDiagnosis: string;
  secondaryDiagnoses?: string;
  clinicalFeatures: string; // Signs, symptoms, progress during stay, physical exam at discharge
  managementGiven: string; // Summary of inpatient management, medications administered, procedures
  dischargeCondition: DischargeCondition;
  
  // Discharge management (sent to pharmacist as prescription):
  takeHomePrescription?: string; // Text field for doctor's take-home prescription (like OPD encounters)
  dischargeManagementNotes: string; // Advice, wound care, home instructions
  dischargeMedications?: DischargeMedicationItem[]; // Structured take-home prescriptions (populated by pharmacist or optional)
  prescriptionId?: string; // Linked Prescription created for pharmacist
  
  // Follow up instructions:
  followUpDate?: string;
  followUpClinicOrDoctor?: string;
  followUpInstructions: string; // Review instructions, emergency red flag signs
  
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  status: 'draft' | 'finalized';
  changeHistory?: DischargeChangeRecord[]; // Audit trail of timestamps and users who changed the discharge file
}

export type ReferralUrgency = 'routine' | 'urgent' | 'emergency';

export interface ReferralChangeRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: 'created' | 'updated' | 'finalized';
  details?: string;
}

export interface PatientReferral {
  id: string;
  referralNumber?: string; // e.g. REF-2026-001
  clinicId: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  patientAge: number | string;
  patientGender: string;
  patientDob?: string;
  patientPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  ward?: string;
  bedNumber?: string;
  admissionDate: string;
  referralDate: string; // ISO string

  // Referring facility & clinician (auto-captured)
  referringFacilityName: string;
  referringFacilityCode?: string;
  referringFacilityPhone: string;
  referringFacilityEmail?: string;
  referringFacilityAddress?: string;
  referringDoctorId: string;
  referringDoctorName: string;
  referringDoctorRole: string;
  referringDoctorPhone?: string;

  // ESSENTIAL FIELDS (prompted to user):
  destinationHospital: string; // Name of receiving facility
  destinationDepartment?: string; // Receiving unit/specialty (e.g., ICU, Neuro Surgery, Burns unit)
  destinationDoctorOrContact?: string; // Contact person / phone at receiving hospital
  conditionBeforeReferral: string; // Clinical status at handover (e.g. Critical, Unstable, Guarded, Stable with O2)
  reasonForReferral: string; // Clinical justification & specialized services required

  // ADDITIONAL REFERRAL PARAMETERS:
  urgency: ReferralUrgency; // 'routine' | 'urgent' | 'emergency'
  transportMode?: string; // e.g. Ambulance (ALS/BLS), Patient Transport, Private
  accompanyingStaff?: string; // e.g. Escort Nurse, Paramedic, None
  handoverVitalsRecordedAt?: string;

  // AUTO-CAPTURED MANDATORY CLINICAL DATA (system pre-filled & clinician editable):
  diagnosis: string; // Primary / Working diagnosis
  secondaryDiagnoses?: string;
  clinicalSummary: string; // Course of inpatient stay, chief complaint & progression
  vitalsAtReferral: {
    bloodPressure?: string;
    pulseRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    spO2?: number;
    bloodGlucose?: string;
    gcs?: string;
  };
  investigationsSummary: string[]; // Laboratory & Imaging investigations performed
  treatmentsGiven: string; // Inpatient medications administered, IV fluids, oxygen, procedures
  knownAllergies: string[];
  specialPrecautions?: string; // e.g., Infection control, Spinal precautions, High fall risk

  status: 'draft' | 'completed';
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  changeHistory?: ReferralChangeRecord[];
}

export type PatientVitals = PatientReferral['vitalsAtReferral'];

export type MannerOfDeath = 'natural' | 'accident' | 'suicide' | 'homicide' | 'undetermined' | 'pending_investigation';

export interface DeathCertificateChangeRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: 'created' | 'updated' | 'finalized';
  details?: string;
}

export interface DeathCertificate {
  id: string;
  certificateNumber?: string; // e.g. DC-2026-001
  clinicId: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  patientAge: number | string;
  patientGender: string;
  patientDob?: string;
  patientAddress?: string;
  ward?: string;
  bedNumber?: string;
  admissionDate?: string;
  
  // Date, Time & Place of Death
  dateOfDeath: string; // YYYY-MM-DD
  timeOfDeath: string; // HH:mm
  placeOfDeath: string; // e.g. "OmniClinic Hospital - Male Medical Ward Bed 03"
  
  // Informant / Next of Kin
  informantName: string;
  informantRelationship: string;
  informantPhone?: string;
  informantAddress?: string;
  informantNotifiedAt?: string;

  // Medical Cause of Death (WHO Standard MCCD Format)
  // Part I: Disease or condition directly leading to death & antecedent causes
  immediateCause: string; // Part Ia: Immediate cause directly leading to death
  immediateCauseInterval?: string; // Approximate interval between onset and death (e.g. "30 minutes", "2 hours")
  antecedentCause?: string; // Part Ib: Morbid condition giving rise to the immediate cause
  antecedentCauseInterval?: string;
  underlyingCause?: string; // Part Ic: Underlying morbid condition that initiated train of events
  underlyingCauseInterval?: string;
  
  // Part II: Other significant conditions contributing to death but not related to disease causing it
  contributingConditions?: string;
  
  mannerOfDeath: MannerOfDeath;
  autopsyRequested: 'yes' | 'no' | 'not_indicated';
  autopsyFindingsAvailable?: boolean;
  pregnancyStatus?: 'not_pregnant' | 'pregnant_at_death' | 'pregnant_within_42_days' | 'not_applicable';

  // Clinical Summary & Terminal Events (Resuscitation details, CPR, time rhythm flatlined)
  clinicalSummary?: string;
  
  // Certifying Medical Practitioner
  certifyingDoctorId: string;
  certifyingDoctorName: string;
  certifyingDoctorRole: string;
  certifyingDoctorLicenseNumber?: string;
  certifyingDoctorPhone?: string;
  certifiedAt: string; // ISO date-time

  // Mortuary & Body Disposition
  bodyReleasedTo: 'hospital_mortuary' | 'external_mortuary' | 'next_of_kin' | 'funeral_home' | 'other';
  mortuaryName?: string;
  mortuaryTagNumber?: string;
  releasedByName?: string;
  releasedAt?: string;
  dispositionNotes?: string;

  status: 'draft' | 'finalized';
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  changeHistory?: DeathCertificateChangeRecord[];
}

export type ExpenditureCategory =
  | 'Medical Supplies'
  | 'Laboratory Reagents'
  | 'Pharmacy Restock'
  | 'Utilities & Energy'
  | 'Equipment & Maintenance'
  | 'Staff & Operational'
  | 'Logistics & Transport'
  | 'Administrative & Office'
  | 'Food & Catering'
  | 'Facility & Cleaning'
  | 'Other';

export interface DailyExpenditureItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  notes?: string;
}

export interface DailyExpenditure {
  id: string;
  clinicId: string;
  title: string;
  category: ExpenditureCategory;
  date: string; // YYYY-MM-DD
  items: DailyExpenditureItem[];
  totalAmount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'petty_cash' | 'mobile_money' | 'card' | 'cheque';
  receiptOrVoucherNumber?: string;
  vendorOrPayee?: string;
  notes?: string;
  
  // Audit Trail & User Attribution
  enteredByUserId: string;
  enteredByUserName: string;
  enteredByUserRole: string;
  createdAt: string; // ISO 8601 timestamp with date and time
  updatedAt?: string;
  updatedByUserId?: string;
  updatedByUserName?: string;
}

