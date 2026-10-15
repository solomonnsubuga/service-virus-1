# Security Specification: Multi-Tenant Healthcare Data Isolation & Access Control

## 1. Data Invariants

1. **Tenant Exclusivity & Isolation (Primary Invariant):**
   - Every patient, encounter, clinical procedure, test order, radiology scan, prescription, ledger, pharmacy cart, treatment chart, nursing log, discharge summary, referral, and death certificate strictly belongs to a specific clinic facility denoted by `clinicId`.
   - No user belonging to Clinic A (`clinic-A`) may read, list, modify, or delete any record created by or belonging to Clinic B (`clinic-B`).
   - Tenant cross-pollination is strictly prohibited. Stand-alone facilities must have 100% cryptographic and rule-enforced boundary safety.

2. **User Identity & Clinic Membership:**
   - A user profile in `/users/{userId}` is strictly keyed by `request.auth.uid`.
   - A user cannot self-assign or elevate their `clearanceLevel` or `role` (e.g. standard doctor cannot promote themselves to `admin` or change `clinicId`).
   - Write operations require that `incoming().clinicId == getUserClinicId()` or user belongs to that facility.

3. **System Baseline Catalogs vs. Tenant Catalogs:**
   - Base system templates (such as default diagnostic tests, standard insurance schemes, base departments, and standard wards) have `clinicId: ''`.
   - Read operations on catalog collections (`availableTests`, `insurancePolicies`, `procedureInventory`, `wards`, `departments`, `otherCharges`) permit reading baseline templates (`clinicId == ''`) or records matching the authenticated user's own `clinicId`.
   - Write operations on catalogs require the target document to have the user's specific `clinicId`. Writing or overriding global baseline records (`clinicId == ''`) is restricted to system administrators.

4. **Medical Record Immutability & Audit Trail:**
   - Deletion of clinical encounters, death certificates, and audit logs by non-admin users is prohibited.
   - Every mutation must preserve document identity integrity: `request.resource.data.id == id`.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following 12 payloads represent attacks designed to breach tenant boundaries, spoof identities, or corrupt clinical data:

### Payload 1: Cross-Tenant Patient Record Injection
- **Attack:** User authenticated under `clinic-alpha` attempts to write a patient record into `clinic-beta`'s scope.
- **Target Path:** `/patients/patient-malicious-01`
- **Data:**
  ```json
  {
    "id": "patient-malicious-01",
    "clinicId": "clinic-beta",
    "name": "Infiltrated Patient",
    "gender": "male",
    "dob": "1990-01-01",
    "phone": "+1234567890",
    "registeredAt": "2026-09-22T00:00:00.000Z"
  }
  ```
- **Expected Outcome:** `PERMISSION_DENIED`

### Payload 2: Cross-Tenant Medical Record Snooping (Read Breach)
- **Attack:** User authenticated under `clinic-alpha` attempts to directly `get` a patient ledger document belonging to `clinic-beta`.
- **Target Path:** `/ledgers/ledger-beta-999`
- **Resource Data:**
  ```json
  {
    "id": "ledger-beta-999",
    "clinicId": "clinic-beta",
    "patientId": "pt-secret-beta",
    "totalCharges": 4500.00,
    "balance": 1200.00
  }
  ```
- **Expected Outcome:** `PERMISSION_DENIED`

### Payload 3: Tenant ID Hijacking on Update
- **Attack:** Attendant updates a patient profile and mutates the `clinicId` field to re-assign the patient to a foreign clinic.
- **Target Path:** `/patients/patient-alpha-01`
- **Update Payload:**
  ```json
  {
    "clinicId": "clinic-attacker-owned"
  }
  ```
- **Expected Outcome:** `PERMISSION_DENIED` (Immutable `clinicId`)

### Payload 4: Self-Assigned Privilege Escalation
- **Attack:** A receptionist or nurse with clearance level 1 attempts to update their own user profile to `role: 'admin'` and `clearanceLevel: 5`.
- **Target Path:** `/users/nurse-uid-123`
- **Update Payload:**
  ```json
  {
    "role": "admin",
    "clearanceLevel": 5
  }
  ```
- **Expected Outcome:** `PERMISSION_DENIED`

### Payload 5: Unauthorized Global Catalog Pollution
- **Attack:** A clinic user attempts to create a custom test with `clinicId: ''` to force it into all clinics across the portal.
- **Target Path:** `/availableTests/malicious-test-01`
- **Payload:**
  ```json
  {
    "id": "malicious-test-01",
    "clinicId": "",
    "name": "Spoofed Global Test",
    "category": "Toxic",
    "price": 999.00
  }
  ```
- **Expected Outcome:** `PERMISSION_DENIED`

### Payload 6: Unauthenticated Prescription Access
- **Attack:** An unauthenticated visitor queries `/prescriptions` without an active session token.
- **Target Path:** `/prescriptions/rx-confidential-01`
- **Expected Outcome:** `PERMISSION_DENIED`

### Payload 7: Cross-Tenant Encounter Mutation
- **Attack:** Doctor from `clinic-alpha` attempts to edit or delete a clinical encounter record located in `clinic-gamma`.
- **Target Path:** `/encounters/encounter-gamma-45`
- **Expected Outcome:** `PERMISSION_DENIED`

### Payload 8: Path Variable / Document ID Poisoning
- **Attack:** Attacker supplies an oversized junk character string with control characters as the document ID.
- **Target Path:** `/patients/bad-id-../../../etc/shadow-over-128-bytes-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Expected Outcome:** `PERMISSION_DENIED` (failed `isValidId`)

### Payload 9: Audit Log Destruction
- **Attack:** A staff member attempts to delete an audit log document to hide unauthorized data manipulation.
- **Target Path:** `/auditLogs/log-critical-audit-77`
- **Expected Outcome:** `PERMISSION_DENIED` (Audit logs are append-only)

### Payload 10: Cross-Tenant Inventory Drainage
- **Attack:** Attacker updates stock count of pharmaceuticals in a competing facility.
- **Target Path:** `/inventory/item-clinic-beta-morphine`
- **Payload:**
  ```json
  {
    "totalQuantity": 0
  }
  ```
- **Expected Outcome:** `PERMISSION_DENIED`

### Payload 11: Cross-Tenant Treatment Chart Injection
- **Attack:** Unauthorized user attaches a chemotherapy MAR order to a patient in another clinic.
- **Target Path:** `/treatmentCharts/tc-victim-01`
- **Payload:**
  ```json
  {
    "id": "tc-victim-01",
    "clinicId": "clinic-other",
    "patientId": "pt-other-patient"
  }
  ```
- **Expected Outcome:** `PERMISSION_DENIED`

### Payload 12: Fraudulent Death Certificate Generation
- **Attack:** Non-physician user or foreign clinic user creates a legal Certificate of Cause of Death for an external patient.
- **Target Path:** `/deathCertificates/mccd-counterfeit-01`
- **Payload:**
  ```json
  {
    "id": "mccd-counterfeit-01",
    "clinicId": "clinic-foreign",
    "patientId": "pt-unrelated"
  }
  ```
- **Expected Outcome:** `PERMISSION_DENIED`

---

## 3. Test Runner Specification (`firestore.rules.test.ts`)

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

// Verification suite structure ensuring:
// 1. All 12 "Dirty Dozen" payloads fail with PERMISSION_DENIED
// 2. Legitimate tenant operations within user's own clinic succeed
// 3. System baseline reads (clinicId == '') succeed for catalog browsing
```
