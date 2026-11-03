# MediTrack — Hospital Business Rules & Operational Safeguards

This document formalises the clinical and administrative operational rules enforced in MediTrack across both the PostgreSQL database layer and the Express backend service layer.

---

## 1. Patient Lifecycle Rules
1. **Unique Identity**: Every patient is assigned an immutable, system-generated identifier (`PAT-000001` format) via sequence and trigger.
2. **Contact Integrity**: A phone number is strictly required for patient registration.
3. **No Hard Deletion**: Patients cannot be physically deleted (`DROP/DELETE`) if they hold linked medical, financial, or admission records. They must be soft-deactivated (`is_active = false`).
4. **Deactivation Guard**: A patient with an `Active` inpatient admission cannot be deactivated.

---

## 2. Appointment Scheduling Rules
1. **Temporal Sequence**: Appointment `appointment_end` must be strictly later than `appointment_start`.
2. **Anti-Double-Booking (Doctor)**: A doctor cannot be scheduled for two overlapping appointments unless the prior appointment is marked `Cancelled` or `No Show`.
   - *Enforcement*: Validated in Express and guaranteed at PostgreSQL level via GiST exclusion constraint on `(doctor_id, tstzrange(appointment_start, appointment_end))`.
3. **Anti-Double-Booking (Patient)**: A patient cannot be scheduled for two simultaneous appointments.
4. **Active Doctor Guard**: Appointments can only be booked with active doctors (`is_active = true`).
5. **Preservation of History**: Cancellation never deletes the database record; the status is updated to `Cancelled` and recorded in the audit trail.
6. **Immutable Historical Appointments**: Completed, Cancelled, or No-Show appointments cannot be edited or rescheduled.

---

## 3. Inpatient Admission & Bed Management Rules
1. **Single Inpatient Per Bed**: A hospital bed can only have **one** active admission.
   - *Enforcement*: Enforced at database level using a partial unique index: `CREATE UNIQUE INDEX ON admissions (bed_id) WHERE status = 'Active';`
2. **Atomic Admission Transaction**: Admitting a patient checks doctor status, locks the bed row (`FOR UPDATE`), creates the admission record, and marks the bed as `Occupied` in a single ACID transaction. If any step fails, the entire transaction rolls back.
3. **Atomic Discharge Transaction**: Discharging an inpatient validates the active admission, records the discharge timestamp, marks the admission as `Discharged`, calculates stay duration, and releases the bed status back to `Available`.
4. **No Multiple Simultaneous Admissions**: A patient cannot have more than one `Active` admission at any given time.

---

## 4. Prescription Charting Rules
1. **Doctor Attribution**: Every prescription must be signed by an active attending physician.
2. **Atomicity**: A prescription and its constituent medication items are written in a single database transaction. Comma-separated values are prohibited (1NF).
3. **Finalisation Immutability**: Prescriptions in `Draft` status can have their clinical notes updated. Once marked `Finalised`, the prescription is locked as an immutable legal record; any further edits are rejected by the server.

---

## 5. Billing & Revenue Rules
1. **Authoritative Server Calculations**: Invoice totals ($Subtotal - Discount + Tax$) and item line totals ($Quantity \times Unit Price$) are authoritatively calculated on the backend to prevent client tampering.
2. **Monetary Precision**: All currency amounts use PostgreSQL `NUMERIC(12,2)` to guarantee exact decimal arithmetic without IEEE 754 floating-point errors.
3. **Overpayment Safeguard**: A payment cannot exceed the outstanding balance of a bill ($Total - Completed Payments$).
4. **Payment Status Accounting**: Failed or Pending payments do NOT reduce the outstanding balance of an invoice.
5. **Automatic Status Updates**:
   - When cumulative completed payments equal the total bill amount, the bill status transitions to `Paid`.
   - When partial payments are recorded, status transitions to `Partial`.
