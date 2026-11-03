import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  UserPlus,
  Search,
  Edit2,
  UserX,
  Phone,
  Mail,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  BedDouble,
  ChevronRight,
  Droplets,
  AlertCircle,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { patientService } from '../services';
import { Patient, Appointment, Admission, Prescription, Bill } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../hooks/useToast';

interface PatientFormData {
  full_name: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  phone: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
}

export default function Patients() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deactivatingPatient, setDeactivatingPatient] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Detail panel state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [detailTab, setDetailTab] = useState<'appointments' | 'admissions' | 'prescriptions' | 'bills'>('appointments');
  const [patientAppts, setPatientAppts] = useState<Appointment[]>([]);
  const [patientAdmissions, setPatientAdmissions] = useState<Admission[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<Prescription[]>([]);
  const [patientBills, setPatientBills] = useState<Bill[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<PatientFormData>();

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await patientService.getAll({
        page,
        limit: 15,
        search: search.trim() || undefined,
      });
      setPatients(res.data);
      setTotalPages(res.pagination.pages);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      toast('error', 'Failed to fetch patients', err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  const openCreateModal = () => {
    setEditingPatient(null);
    reset({
      full_name: '',
      date_of_birth: '',
      gender: undefined,
      phone: '',
      email: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      blood_group: undefined,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Patient) => {
    setEditingPatient(p);
    setValue('full_name', p.full_name);
    setValue('date_of_birth', p.date_of_birth ? p.date_of_birth.substring(0, 10) : '');
    setValue('gender', p.gender as any);
    setValue('phone', p.phone);
    setValue('email', p.email || '');
    setValue('address', p.address || '');
    setValue('emergency_contact_name', p.emergency_contact_name || '');
    setValue('emergency_contact_phone', p.emergency_contact_phone || '');
    setValue('blood_group', p.blood_group as any);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: PatientFormData) => {
    try {
      const payload = {
        ...data,
        date_of_birth: data.date_of_birth || null,
        email: data.email || null,
        address: data.address || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        blood_group: data.blood_group || null,
        gender: data.gender || null,
      };

      if (editingPatient) {
        await patientService.update(editingPatient.patient_id, payload);
        toast('success', 'Patient updated', 'Patient records successfully modified.');
      } else {
        await patientService.create(payload);
        toast('success', 'Patient registered', 'New patient registered in hospital system.');
      }
      setIsModalOpen(false);
      fetchPatients();
    } catch (err: any) {
      toast('error', 'Operation failed', err.message);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingPatient) return;
    try {
      await patientService.deactivate(deactivatingPatient.patient_id);
      toast('success', 'Patient deactivated', 'Patient record has been marked inactive.');
      setDeactivatingPatient(null);
      if (selectedPatient?.patient_id === deactivatingPatient.patient_id) {
        setSelectedPatient(null);
      }
      fetchPatients();
    } catch (err: any) {
      toast('error', 'Deactivation failed', err.message);
    }
  };

  const handleActivate = async (patient: Patient) => {
    try {
      await patientService.activate(patient.patient_id);
      toast('success', 'Patient reactivated', `${patient.full_name} is now active.`);
      fetchPatients();
    } catch (err: any) {
      toast('error', 'Activation failed', err.message);
    }
  };

  const handleDelete = async () => {
    if (!deletingPatient) return;
    setDeletingLoading(true);
    try {
      await patientService.delete(deletingPatient.patient_id);
      toast('success', 'Patient deleted', `${deletingPatient.full_name} was permanently removed from PostgreSQL.`);
      setDeletingPatient(null);
      if (selectedPatient?.patient_id === deletingPatient.patient_id) {
        setSelectedPatient(null);
      }
      fetchPatients();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message;
      toast('error', 'Deletion prevented', msg);
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleSelectPatient = async (p: Patient) => {
    setSelectedPatient(p);
    setDetailLoading(true);
    try {
      const [appts, adms, rxs, bills] = await Promise.all([
        patientService.getAppointments(p.patient_id),
        patientService.getAdmissions(p.patient_id),
        patientService.getPrescriptions(p.patient_id),
        patientService.getBills(p.patient_id),
      ]);
      setPatientAppts(appts);
      setPatientAdmissions(adms);
      setPatientPrescriptions(rxs);
      setPatientBills(bills);
    } catch (err: any) {
      toast('error', 'Failed to load medical history', err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Patient Directory</h1>
          <p className="text-sm text-text-secondary">
            Manage demographics, medical history, appointments, and billing profiles.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          <UserPlus size={16} />
          Register Patient
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search by name, ID, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="form-input pl-9"
          />
        </div>
        <div className="text-xs text-text-secondary self-start sm:self-center">
          Total Registered: <span className="font-semibold text-text-primary">{totalCount}</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : patients.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No Patients Found"
            description={search ? `No patients matching "${search}"` : "No registered patients in the database."}
            action={
              <button onClick={openCreateModal} className="btn btn-primary btn-sm">
                Register First Patient
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient Code</th>
                  <th>Full Name</th>
                  <th>Age / Gender</th>
                  <th>Contact</th>
                  <th>Blood Group</th>
                  <th>Registered</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr
                    key={p.patient_id}
                    className={`cursor-pointer transition-colors ${
                      selectedPatient?.patient_id === p.patient_id ? 'bg-[#F0F4F1]' : ''
                    }`}
                    onClick={() => handleSelectPatient(p)}
                  >
                    <td className="font-mono text-xs font-semibold text-accent">{p.patient_code}</td>
                    <td className="font-medium text-text-primary">
                      {p.full_name}
                      {!p.is_active && (
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-critical-light text-critical font-normal">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td>
                      {p.age !== undefined && p.age !== null ? `${p.age} yrs` : '—'} / {p.gender || '—'}
                    </td>
                    <td>
                      <div className="text-xs text-text-primary">{p.phone}</div>
                      {p.email && <div className="text-[11px] text-text-secondary">{p.email}</div>}
                    </td>
                    <td>
                      {p.blood_group ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                          <Droplets size={12} />
                          {p.blood_group}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-xs text-text-secondary">
                      {new Date(p.registered_at).toLocaleDateString()}
                    </td>
                    <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(p)}
                          className="btn btn-ghost btn-sm p-1.5 text-text-secondary hover:text-text-primary"
                          title="Edit Patient"
                        >
                          <Edit2 size={14} />
                        </button>
                        {p.is_active ? (
                          <button
                            onClick={() => setDeactivatingPatient(p)}
                            className="btn btn-ghost btn-sm p-1.5 text-text-secondary hover:text-critical"
                            title="Deactivate Patient"
                          >
                            <UserX size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(p)}
                            className="btn btn-ghost btn-sm p-1.5 text-positive hover:bg-positive-light"
                            title="Reactivate Patient"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingPatient(p)}
                          className="btn btn-ghost btn-sm p-1.5 text-text-secondary hover:text-critical"
                          title="Delete Patient"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={page}
        pages={totalPages}
        total={totalCount}
        limit={15}
        onChange={(newPage) => setPage(newPage)}
      />

      {/* Patient Deep Dive Panel */}
      {selectedPatient && (
        <div className="card p-5 space-y-4 border-l-4 border-l-accent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-text-primary">{selectedPatient.full_name}</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-accent-light text-accent">
                  {selectedPatient.patient_code}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {selectedPatient.gender || 'Unknown gender'} •{' '}
                {selectedPatient.date_of_birth ? `DOB: ${selectedPatient.date_of_birth.substring(0, 10)}` : 'DOB not recorded'}{' '}
                • Phone: {selectedPatient.phone}
              </p>
            </div>
            <button
              onClick={() => setSelectedPatient(null)}
              className="btn btn-ghost btn-sm text-xs self-start"
            >
              Close Details
            </button>
          </div>

          {/* Sub tabs */}
          <div className="flex items-center gap-2 border-b border-border pb-2 text-xs font-medium">
            <button
              onClick={() => setDetailTab('appointments')}
              className={`px-3 py-1.5 rounded transition-colors ${
                detailTab === 'appointments' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg'
              }`}
            >
              Appointments ({patientAppts.length})
            </button>
            <button
              onClick={() => setDetailTab('admissions')}
              className={`px-3 py-1.5 rounded transition-colors ${
                detailTab === 'admissions' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg'
              }`}
            >
              Inpatient Admissions ({patientAdmissions.length})
            </button>
            <button
              onClick={() => setDetailTab('prescriptions')}
              className={`px-3 py-1.5 rounded transition-colors ${
                detailTab === 'prescriptions' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg'
              }`}
            >
              Prescriptions ({patientPrescriptions.length})
            </button>
            <button
              onClick={() => setDetailTab('bills')}
              className={`px-3 py-1.5 rounded transition-colors ${
                detailTab === 'bills' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg'
              }`}
            >
              Invoices & Billing ({patientBills.length})
            </button>
          </div>

          {detailLoading ? (
            <TableSkeleton rows={3} cols={4} />
          ) : (
            <div>
              {detailTab === 'appointments' && (
                patientAppts.length === 0 ? (
                  <p className="text-xs text-text-secondary py-3">No appointment records found for this patient.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Doctor</th>
                        <th>Department</th>
                        <th>Scheduled Time</th>
                        <th>Reason</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientAppts.map((a) => (
                        <tr key={a.appointment_id}>
                          <td className="font-mono text-xs">{a.appointment_code}</td>
                          <td className="font-medium">{a.doctor_name}</td>
                          <td>{a.department_name}</td>
                          <td className="text-xs">{new Date(a.appointment_start).toLocaleString()}</td>
                          <td className="text-xs text-text-secondary">{a.reason || '—'}</td>
                          <td><StatusBadge status={a.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {detailTab === 'admissions' && (
                patientAdmissions.length === 0 ? (
                  <p className="text-xs text-text-secondary py-3">No admission history found for this patient.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Admission Code</th>
                        <th>Ward / Bed</th>
                        <th>Doctor</th>
                        <th>Admitted Date</th>
                        <th>Discharged Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientAdmissions.map((adm) => (
                        <tr key={adm.admission_id}>
                          <td className="font-mono text-xs">{adm.admission_code}</td>
                          <td className="font-medium">{adm.ward_name} (Bed {adm.bed_number})</td>
                          <td>{adm.doctor_name}</td>
                          <td className="text-xs">{new Date(adm.admission_datetime).toLocaleDateString()}</td>
                          <td className="text-xs">
                            {adm.discharge_datetime ? new Date(adm.discharge_datetime).toLocaleDateString() : 'Still admitted'}
                          </td>
                          <td><StatusBadge status={adm.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {detailTab === 'prescriptions' && (
                patientPrescriptions.length === 0 ? (
                  <p className="text-xs text-text-secondary py-3">No prescriptions recorded for this patient.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Rx Code</th>
                        <th>Prescribing Doctor</th>
                        <th>Date</th>
                        <th>Notes</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientPrescriptions.map((rx) => (
                        <tr key={rx.prescription_id}>
                          <td className="font-mono text-xs">{rx.prescription_code}</td>
                          <td className="font-medium">{rx.doctor_name}</td>
                          <td className="text-xs">{rx.prescription_date}</td>
                          <td className="text-xs text-text-secondary max-w-[200px] truncate">{rx.notes || '—'}</td>
                          <td><StatusBadge status={rx.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {detailTab === 'bills' && (
                patientBills.length === 0 ? (
                  <p className="text-xs text-text-secondary py-3">No billing invoices found for this patient.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Bill #</th>
                        <th>Date</th>
                        <th>Total Amount</th>
                        <th>Paid</th>
                        <th>Outstanding</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientBills.map((b) => (
                        <tr key={b.bill_id}>
                          <td className="font-mono text-xs font-semibold">{b.bill_number}</td>
                          <td className="text-xs">{b.bill_date}</td>
                          <td className="font-medium">₹{Number(b.total_amount).toFixed(2)}</td>
                          <td className="text-positive font-medium">₹{Number(b.amount_paid || 0).toFixed(2)}</td>
                          <td className="text-critical font-medium">₹{Number(b.outstanding || 0).toFixed(2)}</td>
                          <td><StatusBadge status={b.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Patient Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPatient ? `Edit Patient: ${editingPatient.patient_code}` : 'Register New Patient'}
        maxWidth={620}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className={`form-input ${errors.full_name ? 'error' : ''}`}
                placeholder="e.g. Ramesh Patel"
                {...register('full_name', { required: 'Full name is required', minLength: { value: 2, message: 'Minimum 2 characters' } })}
              />
              {errors.full_name && <p className="form-error">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="form-label">Phone Number *</label>
              <input
                type="tel"
                className={`form-input ${errors.phone ? 'error' : ''}`}
                placeholder="e.g. 9876543210"
                {...register('phone', { required: 'Phone is required' })}
              />
              {errors.phone && <p className="form-error">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. ramesh@example.com"
                {...register('email')}
              />
            </div>

            <div>
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                className="form-input"
                max={new Date().toISOString().split('T')[0]}
                {...register('date_of_birth')}
              />
            </div>

            <div>
              <label className="form-label">Gender</label>
              <select className="form-select" {...register('gender')}>
                <option value="">Select gender...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="form-label">Blood Group</label>
              <select className="form-select" {...register('blood_group')}>
                <option value="">Select blood group...</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div>
              <label className="form-label">Emergency Contact Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Suman Patel (Spouse)"
                {...register('emergency_contact_name')}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">Emergency Contact Phone</label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. 9876543211"
                {...register('emergency_contact_phone')}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">Residential Address</label>
              <textarea
                rows={2}
                className="form-textarea"
                placeholder="House No., Street, City, Pincode"
                {...register('address')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Saving...' : editingPatient ? 'Update Patient' : 'Register Patient'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deactivatingPatient)}
        onClose={() => setDeactivatingPatient(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Patient Record"
        message={`Are you sure you want to deactivate ${deactivatingPatient?.full_name} (${deactivatingPatient?.patient_code})? The patient will no longer appear in active directories, but past medical and billing records will remain intact for audit integrity.`}
        confirmLabel="Deactivate"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingPatient)}
        onClose={() => setDeletingPatient(null)}
        onConfirm={handleDelete}
        title="Permanently Delete Patient"
        message={`Are you sure you want to permanently delete patient ${deletingPatient?.full_name} (${deletingPatient?.patient_code})? If this patient has linked appointments, admissions, prescriptions, or bills, deletion will be blocked by foreign key constraints to maintain medical record integrity.`}
        confirmLabel="Delete Patient"
        confirmClass="btn-danger"
        isLoading={deletingLoading}
      />
    </div>
  );
}
