# MediTrack — REST API Documentation

The MediTrack backend is implemented with Express.js and TypeScript, serving strict JSON payloads validated with Zod schemas.

Base URL: `http://localhost:5000/api`

---

## 1. System Health & Ping
- `GET /health`
  - Returns PostgreSQL pool connectivity and server uptime.
  - Response: `{ "success": true, "status": "healthy", "database": "connected", "db_version": "PostgreSQL 18.x" }`

---

## 2. Dashboard Analytics
- `GET /dashboard/summary`
  - Aggregated KPIs (total patients, today's appointments, active admissions, free beds, pending bills, 30-day revenue).
- `GET /dashboard/appointments`
  - Appointments scheduled for today's hospital local date.
- `GET /dashboard/occupancy`
  - Inpatient bed occupancy counts broken down by department and overall.
- `GET /dashboard/revenue`
  - 30-day financial summary and 12-month trajectory.
- `GET /dashboard/department-workload`
  - 30-day consultation volume grouped by department.

---

## 3. Patients
- `GET /patients`
  - Query params: `page`, `limit`, `search`, `sort_by`, `sort_order`
  - Paginated active patient records.
- `GET /patients/:id`
  - Returns complete patient profile and calculated age.
- `POST /patients`
  - Registers a new patient. Auto-generates `patient_code` (e.g. `PAT-000016`).
- `PATCH /patients/:id`
  - Updates demographics or emergency contacts.
- `PATCH /patients/:id/deactivate`
  - Soft-deactivates a patient. Blocked if patient has an active inpatient admission.
- Sub-resources:
  - `GET /patients/:id/appointments`
  - `GET /patients/:id/admissions`
  - `GET /patients/:id/prescriptions`
  - `GET /patients/:id/bills`

---

## 4. Appointments
- `GET /appointments`
  - Query params: `page`, `limit`, `search`, `status`, `doctor_id`, `department_id`, `date_from`, `date_to`
- `GET /appointments/:id`
  - Single appointment details.
- `POST /appointments`
  - Books consultation. Enforces anti-overlap logic for both doctor and patient.
  - Returns `409 Conflict` if doctor or patient is already booked.
- `PATCH /appointments/:id`
  - Reschedules appointment time. Re-validates overlaps.
- `PATCH /appointments/:id/status`
  - Updates status (`Scheduled`, `Confirmed`, `Checked In`, `In Progress`, `Completed`, `Cancelled`, `No Show`).
- `POST /appointments/:id/cancel`
  - Safely cancels appointment while preserving record for audit history.

---

## 5. Doctors
- `GET /doctors`
  - Active/inactive doctors, department joins, upcoming appointment counts.
- `GET /doctors/:id`
  - Doctor profile.
- `POST /doctors`
  - Adds a new doctor. Auto-generates `doctor_code`.
- `PATCH /doctors/:id`
  - Updates qualification, fees, or department.
- `PATCH /doctors/:id/deactivate`
  - Soft-deactivates doctor. Blocked if active inpatient admissions are assigned.
- `GET /doctors/:id/availability?date=YYYY-MM-DD`
  - Returns booked slots for date to check availability.

---

## 6. Departments
- `GET /departments`
  - All departments with head physician, doctor count, and bed count.
- `GET /departments/:id`
  - Details and roster of doctors.
- `POST /departments`
  - Creates department.
- `PATCH /departments/:id`
  - Updates location or head doctor.
- `PATCH /departments/:id/deactivate`
  - Deactivates department. Blocked if active admissions reference it.

---

## 7. Beds & Inpatient Admissions
- `GET /beds`
  - Bed inventory with status and current occupant name.
- `POST /beds`
  - Adds a new hospital bed in a ward.
- `GET /admissions`
  - Paginated list of inpatient admissions with length of stay calculation.
- `POST /admissions`
  - Executes ACID transaction: verifies doctor active, locks bed row (`FOR UPDATE`), creates admission record, and marks bed as `Occupied`.
- `POST /admissions/:id/discharge`
  - Executes ACID transaction: marks admission `Discharged`, calculates stay duration, releases bed back to `Available`.

---

## 8. Prescriptions
- `GET /prescriptions`
  - Outpatient/inpatient prescription records.
- `GET /prescriptions/:id`
  - Itemized prescription details.
- `POST /prescriptions`
  - Creates prescription and child `prescription_items` in a single transaction.
- `POST /prescriptions/:id/finalise`
  - Locks prescription into `Finalised` state. Future mutations are rejected with `409 Conflict`.

---

## 9. Billing & Payments
- `GET /bills`
  - Invoices with total amount, amount paid, and outstanding balance.
- `POST /bills`
  - Generates invoice with line items (`bill_items`) atomically.
- `POST /bills/:id/payments`
  - Records payment against a bill. Validates positive amount, prevents overpayment, and auto-updates bill status to `Partial` or `Paid`.
- `GET /bills/:id/payments`
  - Payment transaction history.

---

## 10. Reports & Audit
- `GET /reports/appointments`
- `GET /reports/doctor-workload`
- `GET /reports/departments`
- `GET /reports/patient-registrations`
- `GET /reports/occupancy`
- `GET /reports/admissions`
- `GET /reports/revenue`
- `GET /reports/billing`
- `GET /reports/prescriptions`
- `GET /audit-logs`
