// Shared types for MediTrack frontend

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface Patient {
  patient_id: number;
  patient_code: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  blood_group: string | null;
  is_active: boolean;
  registered_at: string;
  updated_at: string | null;
  age?: number;
}

export interface Doctor {
  doctor_id: number;
  doctor_code: string;
  full_name: string;
  email: string | null;
  phone: string;
  department_id: number;
  department_name?: string;
  specialisation: string;
  qualification: string | null;
  experience_years: number | null;
  consultation_fee: number;
  is_active: boolean;
  created_at: string;
  upcoming_appointments?: number;
}

export interface Department {
  department_id: number;
  department_name: string;
  description: string | null;
  location: string | null;
  contact_number: string | null;
  head_doctor_id: number | null;
  head_doctor_name: string | null;
  is_active: boolean;
  created_at: string;
  doctor_count?: number;
  bed_count?: number;
  available_beds?: number;
}

export interface Bed {
  bed_id: number;
  bed_number: string;
  ward_name: string;
  department_id: number;
  department_name?: string;
  bed_type: 'General' | 'Semi-Private' | 'Private' | 'ICU';
  daily_charge: number;
  bed_status: 'Available' | 'Occupied' | 'Maintenance';
  created_at: string;
  admission_id?: number;
  patient_name?: string;
}

export interface Appointment {
  appointment_id: number;
  appointment_code: string;
  patient_id: number;
  patient_name?: string;
  patient_code?: string;
  doctor_id: number;
  doctor_name?: string;
  department_id: number;
  department_name?: string;
  appointment_start: string;
  appointment_end: string;
  reason: string | null;
  notes: string | null;
  status: 'Scheduled' | 'Confirmed' | 'Checked In' | 'In Progress' | 'Completed' | 'Cancelled' | 'No Show';
  created_at: string;
  updated_at: string | null;
}

export interface Admission {
  admission_id: number;
  admission_code: string;
  patient_id: number;
  patient_name?: string;
  patient_code?: string;
  doctor_id: number;
  doctor_name?: string;
  department_id: number;
  department_name?: string;
  bed_id: number;
  bed_number?: string;
  ward_name?: string;
  admission_datetime: string;
  discharge_datetime: string | null;
  admission_reason: string;
  discharge_notes: string | null;
  expected_discharge_date: string | null;
  status: 'Active' | 'Discharged' | 'Transferred';
  days_admitted?: number;
  created_at: string;
}

export interface PrescriptionItem {
  prescription_item_id: number;
  prescription_id: number;
  medicine_name: string;
  dosage_instructions: string;
  route: string | null;
  frequency: string;
  duration: string;
  quantity: number;
  additional_instructions: string | null;
}

export interface Prescription {
  prescription_id: number;
  prescription_code: string;
  patient_id: number;
  patient_name?: string;
  patient_code?: string;
  blood_group?: string;
  doctor_id: number;
  doctor_name?: string;
  specialisation?: string;
  appointment_id: number | null;
  prescription_date: string;
  notes: string | null;
  status: 'Draft' | 'Finalised';
  created_at: string;
  item_count?: number;
  items?: PrescriptionItem[];
}

export interface BillItem {
  bill_item_id: number;
  bill_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Payment {
  payment_id: number;
  bill_id: number;
  amount: number;
  payment_method: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer';
  payment_status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  transaction_reference: string | null;
  payment_date: string;
  created_at: string;
}

export interface Bill {
  bill_id: number;
  bill_number: string;
  patient_id: number;
  patient_name?: string;
  patient_code?: string;
  appointment_id: number | null;
  admission_id: number | null;
  bill_date: string;
  due_date: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid?: number;
  outstanding?: number;
  notes: string | null;
  status: 'Pending' | 'Partial' | 'Paid' | 'Overdue' | 'Cancelled';
  created_at: string;
  items?: BillItem[];
  payments?: Payment[];
}

export interface AuditLog {
  audit_id: number;
  entity_type: string;
  entity_id: number;
  action_type: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_at: string;
}

export interface DashboardSummary {
  total_patients: number;
  todays_appointments: number;
  completed_appointments_30d: number;
  active_admissions: number;
  available_beds: number;
  total_beds: number;
  pending_bills: number;
  revenue_30d: number;
}
