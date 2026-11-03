# MediTrack — PostgreSQL Database Schema Reference

This technical reference provides the data dictionary, constraints, triggers, indexes, and normalisation justification for the **MediTrack** hospital operations database.

---

## 1. Normalisation Analysis (3NF / BCNF)

1. **First Normal Form (1NF)**:
   - All attribute domains are atomic.
   - Repeated prescription medications are stored in child table `prescription_items`, eliminating comma-separated fields.
   - Bill line items are stored in child table `bill_items`.

2. **Second Normal Form (2NF)**:
   - Every non-key attribute is fully functionally dependent on the entire primary key.
   - Composite keys (e.g. `(bed_number, ward_name)`) do not have partial functional dependencies.

3. **Third Normal Form (3NF)**:
   - No transitive functional dependencies exist ($X \to Y$ and $Y \to Z$).
   - Doctor department data is not repeated in appointment or admission tables; foreign key `department_id` references the primary relation `departments`.

---

## 2. Table Dictionaries & Constraints

### 2.1 Table: `departments`
Stores clinical specialty departments (e.g. Cardiology, Paediatrics).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `department_id` | BIGINT | PRIMARY KEY, IDENTITY | Unique surrogate key |
| `department_name` | VARCHAR(100) | NOT NULL, UNIQUE | Specialty department title |
| `description` | TEXT | NULLABLE | Clinical scope |
| `location` | VARCHAR(100) | NULLABLE | Hospital block and floor |
| `contact_number` | VARCHAR(20) | NULLABLE | Internal extension |
| `head_doctor_id` | BIGINT | FOREIGN KEY -> doctors | Assigned physician in charge |
| `is_active` | BOOLEAN | DEFAULT true | Soft deletion toggle |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Timestamp |

### 2.2 Table: `patients`
Stores registered patient demographic records.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `patient_id` | BIGINT | PRIMARY KEY, IDENTITY | Surrogate identifier |
| `patient_code` | VARCHAR(20) | NOT NULL, UNIQUE | Auto-generated code `PAT-000001` |
| `full_name` | VARCHAR(100) | NOT NULL | Patient name |
| `date_of_birth` | DATE | CHECK (<= CURRENT_DATE) | Birthdate |
| `gender` | VARCHAR(30) | CHECK IN ('Male','Female','Other',...) | Demographic gender |
| `phone` | VARCHAR(20) | NOT NULL | Contact number |
| `email` | VARCHAR(150) | NULLABLE | Email address |
| `blood_group` | VARCHAR(5) | CHECK IN ('A+','A-',...) | ABO & Rh blood type |
| `is_active` | BOOLEAN | DEFAULT true | Soft deletion toggle |
| `registered_at` | TIMESTAMPTZ | DEFAULT NOW() | System entry timestamp |

### 2.3 Table: `doctors`
Stores hospital medical staff and physician records.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `doctor_id` | BIGINT | PRIMARY KEY, IDENTITY | Surrogate identifier |
| `doctor_code` | VARCHAR(20) | NOT NULL, UNIQUE | Auto-generated code `DOC-000001` |
| `full_name` | VARCHAR(100) | NOT NULL | Doctor full name |
| `department_id` | BIGINT | FK -> departments ON DELETE RESTRICT | Assigned medical unit |
| `specialisation` | VARCHAR(100) | NOT NULL | Sub-specialty expertise |
| `consultation_fee`| NUMERIC(12,2)| CHECK (>= 0) | Standard outpatient fee |
| `is_active` | BOOLEAN | DEFAULT true | Employment status |

### 2.4 Table: `beds`
Hospital bed inventory across wards and departments.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `bed_id` | BIGINT | PRIMARY KEY, IDENTITY | Surrogate identifier |
| `bed_number` | VARCHAR(20) | NOT NULL | Bed number |
| `ward_name` | VARCHAR(100) | NOT NULL | Ward location |
| `department_id` | BIGINT | FK -> departments ON DELETE RESTRICT | Responsible department |
| `bed_type` | VARCHAR(20) | CHECK IN ('General','Semi-Private','Private','ICU') | Ward accommodation grade |
| `daily_charge` | NUMERIC(12,2)| CHECK (>= 0) | Cost per 24 hours |
| `bed_status` | VARCHAR(20) | CHECK IN ('Available','Occupied','Maintenance') | Current bed availability |

*Constraint:* `UNIQUE (bed_number, ward_name)` ensures bed numbers are unique within each ward.

### 2.5 Table: `appointments`
Outpatient bookings and consultation scheduling.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `appointment_id` | BIGINT | PRIMARY KEY, IDENTITY | Surrogate identifier |
| `appointment_code` | VARCHAR(20)| NOT NULL, UNIQUE | Auto-generated code `APT-000001` |
| `patient_id` | BIGINT | FK -> patients ON DELETE RESTRICT | Patient receiving care |
| `doctor_id` | BIGINT | FK -> doctors ON DELETE RESTRICT | Attending physician |
| `department_id` | BIGINT | FK -> departments ON DELETE RESTRICT| Specialty unit |
| `appointment_start`| TIMESTAMPTZ| NOT NULL | Scheduled start timestamp |
| `appointment_end` | TIMESTAMPTZ| CHECK (> start) | Scheduled end timestamp |
| `status` | VARCHAR(20) | CHECK IN ('Scheduled','Confirmed',...) | Operational visit state |

*Exclusion Constraint:*
GiST exclusion constraint on `(doctor_id, tstzrange(appointment_start, appointment_end))` prevents doctor double-booking.

### 2.6 Table: `admissions`
Inpatient admissions, bed tracking, and length of stay records.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `admission_id` | BIGINT | PRIMARY KEY, IDENTITY | Surrogate identifier |
| `admission_code` | VARCHAR(20)| NOT NULL, UNIQUE | Auto-generated code `ADM-000001` |
| `patient_id` | BIGINT | FK -> patients ON DELETE RESTRICT | Admitted patient |
| `bed_id` | BIGINT | FK -> beds ON DELETE RESTRICT | Occupied bed |
| `admission_datetime`| TIMESTAMPTZ| NOT NULL | Inpatient arrival time |
| `discharge_datetime`| TIMESTAMPTZ| CHECK (> admission_datetime) | Discharged timestamp |
| `status` | VARCHAR(20) | CHECK IN ('Active','Discharged','Transferred') | Admission lifecycle state |

*Partial Unique Index:* `admissions(bed_id) WHERE status = 'Active'` guarantees that an inpatient bed cannot be double-booked.

### 2.7 Table: `prescriptions` & `prescription_items`
Itemized drug prescription charting.

- `prescriptions` holds header metadata (patient, doctor, date, status `Draft` or `Finalised`).
- `prescription_items` holds individual medication names, dosage instructions, routes, frequency, duration, and quantities with foreign key `ON DELETE CASCADE`.

### 2.8 Table: `bills`, `bill_items`, & `payments`
Financial management, invoicing, and payment processing.

- Monetary values are stored with `NUMERIC(12,2)` precision to prevent IEEE 754 floating-point rounding errors.
- `bills` records subtotal, discount, tax, total amount, and settlement status (`Pending`, `Partial`, `Paid`, `Overdue`, `Cancelled`).
- `payments` tracks amounts, payment methods (`Cash`, `Card`, `UPI`, `Bank Transfer`), and payment status (`Completed`, `Pending`, `Failed`, `Refunded`).
- Only `Completed` payments reduce the outstanding balance.
