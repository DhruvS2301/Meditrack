import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  Stethoscope,
  Building2,
  Star,
  Phone,
  Mail,
  Edit2,
  UserX,
  Plus,
  ChevronDown,
  Search,
  Clock,
  Calendar,
  AlertTriangle,
  RefreshCw,
  X,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { doctorService, departmentService } from '../services';
import type { Doctor, Department, Appointment } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../hooks/useToast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface DoctorFormData {
  full_name: string;
  email: string;
  phone: string;
  department_id: number | '';
  specialisation: string;
  qualification: string;
  experience_years: number | '';
  consultation_fee: number | '';
}

interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface AvailabilityResponse {
  data?: AvailabilitySlot[];
  slots?: AvailabilitySlot[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFee(fee: number): string {
  return `₹${fee.toLocaleString('en-IN')}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Doctor Form Modal
// ---------------------------------------------------------------------------

interface DoctorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  departments: Department[];
  editDoctor?: Doctor | null;
}

function DoctorFormModal({
  isOpen,
  onClose,
  onSaved,
  departments,
  editDoctor,
}: DoctorFormModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DoctorFormData>({
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      department_id: '',
      specialisation: '',
      qualification: '',
      experience_years: '',
      consultation_fee: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (editDoctor) {
      reset({
        full_name: editDoctor.full_name,
        email: editDoctor.email ?? '',
        phone: editDoctor.phone,
        department_id: editDoctor.department_id,
        specialisation: editDoctor.specialisation,
        qualification: editDoctor.qualification ?? '',
        experience_years: editDoctor.experience_years ?? '',
        consultation_fee: editDoctor.consultation_fee,
      });
    } else {
      reset({
        full_name: '',
        email: '',
        phone: '',
        department_id: '',
        specialisation: '',
        qualification: '',
        experience_years: '',
        consultation_fee: '',
      });
    }
  }, [editDoctor, reset, isOpen]);

  const onSubmit = async (data: DoctorFormData) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        department_id: data.department_id === '' ? undefined : Number(data.department_id),
        experience_years: data.experience_years === '' ? undefined : Number(data.experience_years),
        consultation_fee: Number(data.consultation_fee),
        email: data.email || undefined,
        qualification: data.qualification || undefined,
      };

      if (editDoctor) {
        await doctorService.update(editDoctor.doctor_id, payload);
        toast('success', 'Doctor updated', `${data.full_name}'s profile has been updated.`);
      } else {
        await doctorService.create(payload);
        toast('success', 'Doctor added', `${data.full_name} has been added to the directory.`);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Something went wrong. Please try again.';
      toast('error', editDoctor ? 'Update failed' : 'Create failed', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editDoctor ? 'Edit Doctor' : 'Add New Doctor'}
      maxWidth={620}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="submit"
            form="doctor-form"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving…' : editDoctor ? 'Save Changes' : 'Add Doctor'}
          </button>
        </>
      }
    >
      <form id="doctor-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Full Name */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">
              Full Name <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <input
              className={`form-input${errors.full_name ? ' form-input-error' : ''}`}
              placeholder="Dr. John Smith"
              {...register('full_name', { required: 'Full name is required' })}
            />
            {errors.full_name && (
              <p className="form-error">{errors.full_name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="doctor@hospital.com"
              {...register('email', {
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email address',
                },
              })}
            />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="form-label">
              Phone <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <input
              className={`form-input${errors.phone ? ' form-input-error' : ''}`}
              placeholder="+91 98765 43210"
              {...register('phone', { required: 'Phone number is required' })}
            />
            {errors.phone && <p className="form-error">{errors.phone.message}</p>}
          </div>

          {/* Department */}
          <div>
            <label className="form-label">Department</label>
            <select
              className="form-select"
              {...register('department_id')}
            >
              <option value="">— Select department —</option>
              {departments.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.department_name}
                </option>
              ))}
            </select>
          </div>

          {/* Specialisation */}
          <div>
            <label className="form-label">
              Specialisation <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <input
              className={`form-input${errors.specialisation ? ' form-input-error' : ''}`}
              placeholder="e.g. Cardiology"
              {...register('specialisation', { required: 'Specialisation is required' })}
            />
            {errors.specialisation && (
              <p className="form-error">{errors.specialisation.message}</p>
            )}
          </div>

          {/* Qualification */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Qualification</label>
            <input
              className="form-input"
              placeholder="e.g. MBBS, MD, DM"
              {...register('qualification')}
            />
          </div>

          {/* Experience Years */}
          <div>
            <label className="form-label">Experience (years)</label>
            <input
              className="form-input"
              type="number"
              min={0}
              max={60}
              placeholder="0"
              {...register('experience_years', {
                min: { value: 0, message: 'Cannot be negative' },
                max: { value: 60, message: 'Max 60 years' },
              })}
            />
            {errors.experience_years && (
              <p className="form-error">{errors.experience_years.message}</p>
            )}
          </div>

          {/* Consultation Fee */}
          <div>
            <label className="form-label">
              Consultation Fee (₹) <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <input
              className={`form-input${errors.consultation_fee ? ' form-input-error' : ''}`}
              type="number"
              min={0}
              step={50}
              placeholder="500"
              {...register('consultation_fee', {
                required: 'Consultation fee is required',
                min: { value: 0, message: 'Fee must be ≥ 0' },
              })}
            />
            {errors.consultation_fee && (
              <p className="form-error">{errors.consultation_fee.message}</p>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Doctor Detail Modal
// ---------------------------------------------------------------------------

interface DoctorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor | null;
  onEdit: (doc: Doctor) => void;
}

function DoctorDetailModal({ isOpen, onClose, doctor, onEdit }: DoctorDetailModalProps) {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [loadingAvail, setLoadingAvail] = useState(false);

  useEffect(() => {
    if (!isOpen || !doctor) {
      setAppointments([]);
      setAvailability([]);
      return;
    }

    // Load appointments
    setLoadingAppts(true);
    doctorService
      .getAppointments(doctor.doctor_id)
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setAppointments(arr.slice(0, 10));
      })
      .catch(() => toast('error', 'Could not load appointments'))
      .finally(() => setLoadingAppts(false));

    // Load today's availability
    const todayStr = new Date().toISOString().split('T')[0];
    setLoadingAvail(true);
    doctorService
      .getAvailability(doctor.doctor_id, todayStr)
      .then((res: AvailabilityResponse) => {
        const slots: AvailabilitySlot[] = res?.data ?? res?.slots ?? [];
        setAvailability(Array.isArray(slots) ? slots : []);
      })
      .catch(() => {
        // Availability endpoint may not exist – silently ignore
        setAvailability([]);
      })
      .finally(() => setLoadingAvail(false));
  }, [isOpen, doctor]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!doctor) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Doctor Profile"
      maxWidth={700}
      footer={
        <button
          className="btn btn-secondary"
          onClick={() => {
            onClose();
            onEdit(doctor);
          }}
        >
          <Edit2 size={14} style={{ marginRight: 6 }} />
          Edit Profile
        </button>
      }
    >
      {/* Personal info card */}
      <div
        className="card"
        style={{ marginBottom: '1.25rem', padding: '1.25rem' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Stethoscope size={24} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                {doctor.full_name}
              </h3>
              <span
                className={`badge ${doctor.is_active ? 'badge-active' : 'badge-cancelled'}`}
              >
                {doctor.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#16a34a', fontWeight: 500 }}>
              {doctor.specialisation}
            </p>
            {doctor.qualification && (
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#747C75' }}>
                {doctor.qualification}
              </p>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '0.75rem',
            marginTop: '1rem',
          }}
        >
          <InfoRow icon={<Building2 size={13} />} label="Department" value={doctor.department_name ?? '—'} />
          <InfoRow icon={<Star size={13} />} label="Experience" value={doctor.experience_years != null ? `${doctor.experience_years} yrs` : '—'} />
          <InfoRow icon={<Phone size={13} />} label="Phone" value={doctor.phone} />
          <InfoRow icon={<Mail size={13} />} label="Email" value={doctor.email ?? '—'} />
          <InfoRow icon={<span style={{ fontWeight: 700 }}>₹</span>} label="Consult. Fee" value={formatFee(doctor.consultation_fee)} />
          <InfoRow icon={<Calendar size={13} />} label="Doctor ID" value={doctor.doctor_code} />
        </div>
      </div>

      {/* Today's Availability */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.625rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={14} /> Today's Availability
        </h4>
        {loadingAvail ? (
          <p style={{ fontSize: '0.8125rem', color: '#747C75' }}>Loading…</p>
        ) : availability.length === 0 ? (
          <p style={{ fontSize: '0.8125rem', color: '#747C75' }}>No availability data for today.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {availability.map((slot, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.625rem',
                  borderRadius: 20,
                  background: slot.is_available ? '#dcfce7' : '#fee2e2',
                  color: slot.is_available ? '#166534' : '#991b1b',
                  fontWeight: 500,
                }}
              >
                {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Appointments */}
      <div>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.625rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calendar size={14} /> Upcoming Appointments
        </h4>
        {loadingAppts ? (
          <p style={{ fontSize: '0.8125rem', color: '#747C75' }}>Loading…</p>
        ) : appointments.length === 0 ? (
          <p style={{ fontSize: '0.8125rem', color: '#747C75' }}>No upcoming appointments.</p>
        ) : (
          <div
            style={{
              borderRadius: 8,
              border: '1px solid #e8ebe9',
              overflow: 'hidden',
            }}
          >
            {appointments.map((apt, idx) => (
              <div
                key={apt.appointment_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.875rem',
                  background: idx % 2 === 0 ? '#fff' : '#f8faf9',
                  borderBottom: idx < appointments.length - 1 ? '1px solid #e8ebe9' : 'none',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 500 }}>
                    {apt.patient_name ?? `Patient #${apt.patient_id}`}
                  </p>
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#747C75' }}>
                    {formatDate(apt.appointment_start)} · {formatTime(apt.appointment_start)}
                  </p>
                </div>
                <StatusBadge status={apt.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontSize: '0.6875rem',
          color: '#747C75',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {icon} {label}
      </span>
      <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#202722' }}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Doctors Page
// ---------------------------------------------------------------------------

const PAGE_LIMIT = 10;

export default function Doctors() {
  const { toast } = useToast();

  // Data state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    pages: 1,
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);
  const [detailDoctor, setDetailDoctor] = useState<Doctor | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deactivateDoctor, setDeactivateDoctor] = useState<Doctor | null>(null);
  const [deleteDoctor, setDeleteDoctor] = useState<Doctor | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasActiveAdmissions, setHasActiveAdmissions] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load departments once ──────────────────────────────────────────────────

  useEffect(() => {
    departmentService
      .getAll({ limit: 200 })
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setDepartments(arr.filter((d: Department) => d.is_active));
      })
      .catch(() => toast('error', 'Could not load departments'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load doctors ──────────────────────────────────────────────────────────

  const fetchDoctors = useCallback(
    async (page: number, search: string, dept: string, status: string) => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, unknown> = {
          page,
          limit: PAGE_LIMIT,
        };
        if (search) params.search = search;
        if (dept) params.department_id = dept;
        if (status === 'active') params.is_active = true;
        if (status === 'inactive') params.is_active = false;

        const res = await doctorService.getAll(params);
        const data: Doctor[] = Array.isArray(res?.data) ? res.data : [];
        setDoctors(data);
        if (res?.pagination) setPagination(res.pagination);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to load doctors. Please try again.';
        setError(msg);
        toast('error', 'Load failed', msg);
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  // Re-fetch when filters / page change
  useEffect(() => {
    fetchDoctors(currentPage, searchTerm, deptFilter, statusFilter);
  }, [currentPage, deptFilter, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const handleSearch = (val: string) => {
    setSearchTerm(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setCurrentPage(1);
      fetchDoctors(1, val, deptFilter, statusFilter);
    }, 350);
  };

  // ── Deactivate ─────────────────────────────────────────────────────────────

  const openDeactivate = async (doc: Doctor) => {
    setDeactivateDoctor(doc);
    // Quick heuristic: check upcoming_appointments count
    setHasActiveAdmissions((doc.upcoming_appointments ?? 0) > 0);
  };

  const handleDeactivate = async () => {
    if (!deactivateDoctor) return;
    setDeactivating(true);
    try {
      await doctorService.deactivate(deactivateDoctor.doctor_id);
      toast(
        'success',
        'Doctor deactivated',
        `${deactivateDoctor.full_name} has been deactivated.`,
      );
      setDeactivateDoctor(null);
      fetchDoctors(currentPage, searchTerm, deptFilter, statusFilter);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not deactivate doctor.';
      toast('error', 'Deactivation failed', msg);
    } finally {
      setDeactivating(false);
    }
  };

  const handleActivate = async (doc: Doctor) => {
    try {
      await doctorService.activate(doc.doctor_id);
      toast('success', 'Doctor reactivated', `Dr. ${doc.full_name} is now active.`);
      fetchDoctors(currentPage, searchTerm, deptFilter, statusFilter);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.error ||
        'Could not reactivate doctor.';
      toast('error', 'Reactivation failed', msg);
    }
  };

  const handleDelete = async () => {
    if (!deleteDoctor) return;
    setDeleting(true);
    try {
      await doctorService.delete(deleteDoctor.doctor_id);
      toast('success', 'Doctor deleted', `Dr. ${deleteDoctor.full_name} was permanently removed.`);
      setDeleteDoctor(null);
      fetchDoctors(currentPage, searchTerm, deptFilter, statusFilter);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.error ||
        'Could not delete doctor.';
      toast('error', 'Deletion prevented', msg);
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Doctors</h1>
          <p className="page-subtitle">
            Manage the hospital's physician directory and schedules.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditDoctor(null);
            setFormOpen(true);
          }}
        >
          <Plus size={16} style={{ marginRight: 6 }} />
          Add Doctor
        </button>
      </div>

      {/* Filters */}
      <div
        className="card"
        style={{
          padding: '0.875rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#747C75',
              pointerEvents: 'none',
            }}
          />
          <input
            className="form-input"
            style={{ paddingLeft: 30, margin: 0 }}
            placeholder="Search name or specialisation…"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchTerm && (
            <button
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#747C75',
                padding: 0,
                display: 'flex',
              }}
              onClick={() => handleSearch('')}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Department filter */}
        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <select
            className="form-select"
            style={{ margin: 0, paddingRight: 32 }}
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.department_id} value={String(d.department_id)}>
                {d.department_name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: '#747C75',
            }}
          />
        </div>

        {/* Status filter */}
        <div style={{ position: 'relative', flex: '0 1 150px' }}>
          <select
            className="form-select"
            style={{ margin: 0, paddingRight: 32 }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown
            size={13}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: '#747C75',
            }}
          />
        </div>

        {/* Refresh */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => fetchDoctors(currentPage, searchTerm, deptFilter, statusFilter)}
          aria-label="Refresh"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={9} />
      ) : error ? (
        <div
          className="card"
          style={{ padding: '2.5rem', textAlign: 'center' }}
        >
          <AlertTriangle size={36} color="#dc2626" style={{ marginBottom: '0.75rem' }} />
          <p style={{ color: '#dc2626', fontWeight: 500, marginBottom: '1rem' }}>{error}</p>
          <button
            className="btn btn-secondary"
            onClick={() => fetchDoctors(currentPage, searchTerm, deptFilter, statusFilter)}
          >
            <RefreshCw size={14} style={{ marginRight: 6 }} /> Retry
          </button>
        </div>
      ) : doctors.length === 0 ? (
        <div className="card" style={{ padding: '1rem' }}>
          <EmptyState
            icon={Stethoscope}
            title="No doctors found"
            description={
              searchTerm || deptFilter || statusFilter
                ? 'Try adjusting your search or filters.'
                : 'Get started by adding the first doctor to the directory.'
            }
            action={
              !searchTerm && !deptFilter && !statusFilter ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditDoctor(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus size={13} style={{ marginRight: 5 }} />
                  Add Doctor
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Doctor ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Specialisation</th>
                <th>Experience</th>
                <th>Consult. Fee</th>
                <th>Status</th>
                <th>Upcoming Appts</th>
                <th style={{ width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc.doctor_id}>
                  {/* Doctor Code */}
                  <td>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: '#747C75',
                        background: '#f1f5f2',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {doc.doctor_code}
                    </span>
                  </td>

                  {/* Name */}
                  <td>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onClick={() => {
                        setDetailDoctor(doc);
                        setDetailOpen(true);
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: '#16a34a',
                          fontSize: '0.875rem',
                        }}
                      >
                        {doc.full_name}
                      </span>
                    </button>
                    {doc.qualification && (
                      <p
                        style={{
                          margin: '2px 0 0',
                          fontSize: '0.75rem',
                          color: '#747C75',
                        }}
                      >
                        {doc.qualification}
                      </p>
                    )}
                  </td>

                  {/* Department */}
                  <td>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.8125rem',
                      }}
                    >
                      <Building2 size={12} color="#747C75" />
                      {doc.department_name ?? '—'}
                    </span>
                  </td>

                  {/* Specialisation */}
                  <td style={{ fontSize: '0.8125rem' }}>{doc.specialisation}</td>

                  {/* Experience */}
                  <td style={{ fontSize: '0.8125rem' }}>
                    {doc.experience_years != null ? `${doc.experience_years} yrs` : '—'}
                  </td>

                  {/* Fee */}
                  <td style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    {formatFee(doc.consultation_fee)}
                  </td>

                  {/* Status */}
                  <td>
                    <span
                      className={`badge ${doc.is_active ? 'badge-active' : 'badge-cancelled'}`}
                    >
                      {doc.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Upcoming appointments */}
                  <td>
                    {doc.upcoming_appointments != null ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '0.8125rem',
                        }}
                      >
                        <Calendar size={12} color="#747C75" />
                        {doc.upcoming_appointments}
                      </span>
                    ) : (
                      <span style={{ color: '#c0c7c1', fontSize: '0.8125rem' }}>—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Edit doctor"
                        onClick={() => {
                          setEditDoctor(doc);
                          setFormOpen(true);
                        }}
                      >
                        <Edit2 size={13} />
                      </button>
                      {doc.is_active ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Deactivate doctor"
                          style={{ color: '#dc2626' }}
                          onClick={() => openDeactivate(doc)}
                        >
                          <UserX size={13} />
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Reactivate doctor"
                          style={{ color: '#315C48' }}
                          onClick={() => handleActivate(doc)}
                        >
                          <CheckCircle size={13} />
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Delete doctor"
                        style={{ color: '#747C75' }}
                        onClick={() => setDeleteDoctor(doc)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{ padding: '0.75rem 1rem' }}>
            <Pagination
              page={pagination.page}
              pages={pagination.pages}
              total={pagination.total}
              limit={pagination.limit}
              onChange={(p) => setCurrentPage(p)}
            />
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      <DoctorFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditDoctor(null);
        }}
        onSaved={() => fetchDoctors(currentPage, searchTerm, deptFilter, statusFilter)}
        departments={departments}
        editDoctor={editDoctor}
      />

      {/* Doctor Detail Modal */}
      <DoctorDetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        doctor={detailDoctor}
        onEdit={(doc) => {
          setEditDoctor(doc);
          setFormOpen(true);
        }}
      />

      {/* Deactivate Confirm Modal */}
      <ConfirmModal
        isOpen={!!deactivateDoctor}
        onClose={() => setDeactivateDoctor(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Doctor"
        message={
          deactivateDoctor
            ? hasActiveAdmissions
              ? `⚠️ ${deactivateDoctor.full_name} has ${deactivateDoctor.upcoming_appointments} upcoming appointment(s). Deactivating will not cancel them automatically. Are you sure you want to proceed?`
              : `Are you sure you want to deactivate ${deactivateDoctor.full_name}? They will no longer appear as available for new appointments.`
            : ''
        }
        confirmLabel="Deactivate"
        confirmClass="btn-danger"
        isLoading={deactivating}
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteDoctor}
        onClose={() => setDeleteDoctor(null)}
        onConfirm={handleDelete}
        title="Permanently Delete Doctor"
        message={
          deleteDoctor
            ? `Are you sure you want to delete Dr. ${deleteDoctor.full_name}? If this doctor has linked appointments, admissions, or prescriptions, deletion will be safely rejected by database constraints to preserve medical records.`
            : ''
        }
        confirmLabel="Delete Doctor"
        confirmClass="btn-danger"
        isLoading={deleting}
      />
    </div>
  );
}
