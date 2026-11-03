import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Calendar,
  Plus,
  Search,
  Eye,
  Edit2,
  XCircle,
  Clock,
  User,
  Stethoscope,
  AlertTriangle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { appointmentService, doctorService, patientService, departmentService } from '../services';
import { Appointment, Doctor, Patient, Department } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../hooks/useToast';

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentStatus =
  | 'Scheduled'
  | 'Confirmed'
  | 'Checked In'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'No Show';

interface AppointmentFormValues {
  patient_id: number | '';
  doctor_id: number | '';
  department_id: number | '';
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
  notes: string;
}

interface Filters {
  status: string;
  date_from: string;
  date_to: string;
  doctor_id: string;
  department_id: string;
  search: string;
}

const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'Scheduled',
  'Confirmed',
  'Checked In',
  'In Progress',
  'Completed',
  'Cancelled',
  'No Show',
];

const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  Scheduled: ['Confirmed', 'Cancelled', 'No Show'],
  Confirmed: ['Checked In', 'Cancelled', 'No Show'],
  'Checked In': ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
  'No Show': [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getDurationMinutes(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

function toISODateTime(date: string, time: string): string {
  // Combine a date string (YYYY-MM-DD) and time string (HH:MM) into ISO format
  return new Date(`${date}T${time}:00`).toISOString();
}

function extractDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function extractTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ─── AppointmentFormModal ─────────────────────────────────────────────────────

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editAppointment?: Appointment | null;
  rescheduleOnly?: boolean;
  patients: Patient[];
  doctors: Doctor[];
  departments: Department[];
}

function AppointmentFormModal({
  isOpen,
  onClose,
  onSuccess,
  editAppointment,
  rescheduleOnly = false,
  patients,
  doctors,
  departments,
}: AppointmentFormModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    defaultValues: {
      patient_id: '',
      doctor_id: '',
      department_id: '',
      date: '',
      start_time: '',
      end_time: '',
      reason: '',
      notes: '',
    },
  });

  const watchedDoctorId = watch('doctor_id');

  // Auto-fill department from doctor selection
  useEffect(() => {
    if (watchedDoctorId && !rescheduleOnly) {
      const doc = doctors.find(d => d.doctor_id === Number(watchedDoctorId));
      if (doc) {
        setValue('department_id', doc.department_id);
      }
    }
  }, [watchedDoctorId, doctors, setValue, rescheduleOnly]);

  // Populate form when editing
  useEffect(() => {
    if (isOpen && editAppointment) {
      reset({
        patient_id: editAppointment.patient_id,
        doctor_id: editAppointment.doctor_id,
        department_id: editAppointment.department_id,
        date: extractDate(editAppointment.appointment_start),
        start_time: extractTime(editAppointment.appointment_start),
        end_time: extractTime(editAppointment.appointment_end),
        reason: editAppointment.reason ?? '',
        notes: editAppointment.notes ?? '',
      });
    } else if (isOpen && !editAppointment) {
      reset({
        patient_id: '',
        doctor_id: '',
        department_id: '',
        date: '',
        start_time: '',
        end_time: '',
        reason: '',
        notes: '',
      });
    }
    setConflictError(null);
  }, [isOpen, editAppointment, reset]);

  const onSubmit = async (values: AppointmentFormValues) => {
    setConflictError(null);
    setSubmitting(true);
    try {
      const appointment_start = toISODateTime(values.date, values.start_time);
      const appointment_end = toISODateTime(values.date, values.end_time);

      const payload: Record<string, unknown> = {
        appointment_start,
        appointment_end,
      };

      if (!rescheduleOnly) {
        payload.patient_id = Number(values.patient_id);
        payload.doctor_id = Number(values.doctor_id);
        const doc = doctors.find(d => d.doctor_id === Number(values.doctor_id));
        payload.department_id = Number(values.department_id) || (doc?.department_id ? Number(doc.department_id) : undefined);
        payload.reason = values.reason;
        payload.notes = values.notes || null;
      }

      if (editAppointment) {
        await appointmentService.update(editAppointment.appointment_id, payload);
        toast('success', rescheduleOnly ? 'Appointment rescheduled' : 'Appointment updated');
      } else {
        await appointmentService.create(payload);
        toast('success', 'Appointment scheduled successfully');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr?.response?.status === 409) {
        const msg = axiosErr.response?.data?.message ?? 'Doctor has a conflicting appointment at this time.';
        setConflictError(msg);
      } else {
        const msg = axiosErr?.response?.data?.message ?? 'An unexpected error occurred.';
        toast('error', 'Failed to save appointment', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const startTime = watch('start_time');
  const endTime = watch('end_time');

  const activeDoctors = doctors.filter(d => d.is_active);

  const title = rescheduleOnly
    ? 'Reschedule Appointment'
    : editAppointment
    ? 'Edit Appointment'
    : 'Schedule Appointment';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth={640}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="appointment-form"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Saving…' : editAppointment ? 'Update' : 'Schedule'}
          </button>
        </>
      }
    >
      {conflictError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            marginBottom: '1.25rem',
            color: '#DC2626',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
          }}
        >
          <AlertTriangle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>{conflictError}</span>
        </div>
      )}

      <form id="appointment-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {/* Patient */}
          {!rescheduleOnly && (
            <div>
              <label className="form-label">
                Patient <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                className={`form-select ${errors.patient_id ? 'error' : ''}`}
                {...register('patient_id', { required: 'Patient is required', validate: v => v !== '' || 'Patient is required' })}
                disabled={!!editAppointment}
              >
                <option value="">Select patient…</option>
                {patients.map(p => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.full_name} ({p.patient_code})
                  </option>
                ))}
              </select>
              {errors.patient_id && <p className="form-error">{errors.patient_id.message}</p>}
            </div>
          )}

          {/* Doctor */}
          {!rescheduleOnly && (
            <div>
              <label className="form-label">
                Doctor <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                className={`form-select ${errors.doctor_id ? 'error' : ''}`}
                {...register('doctor_id', { required: 'Doctor is required', validate: v => v !== '' || 'Doctor is required' })}
                disabled={!!editAppointment}
              >
                <option value="">Select doctor…</option>
                {activeDoctors.map(d => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    Dr. {d.full_name} — {d.department_name ?? d.specialisation}
                  </option>
                ))}
              </select>
              {errors.doctor_id && <p className="form-error">{errors.doctor_id.message}</p>}
            </div>
          )}

          {/* Department */}
          {!rescheduleOnly && (
            <div>
              <label className="form-label">Department</label>
              <select
                className="form-select"
                {...register('department_id')}
                disabled={!!editAppointment}
              >
                <option value="">Auto-filled from doctor</option>
                {departments.map(dept => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.department_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date + Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="form-label">
                Date <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="date"
                className={`form-input ${errors.date ? 'error' : ''}`}
                {...register('date', { required: 'Date is required' })}
              />
              {errors.date && <p className="form-error">{errors.date.message}</p>}
            </div>
            <div>
              <label className="form-label">
                Start Time <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="time"
                className={`form-input ${errors.start_time ? 'error' : ''}`}
                {...register('start_time', { required: 'Start time is required' })}
              />
              {errors.start_time && <p className="form-error">{errors.start_time.message}</p>}
            </div>
            <div>
              <label className="form-label">
                End Time <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="time"
                className={`form-input ${errors.end_time ? 'error' : ''}`}
                {...register('end_time', {
                  required: 'End time is required',
                  validate: val => {
                    if (!startTime || !val) return true;
                    return val > startTime || 'End time must be after start time';
                  },
                })}
              />
              {errors.end_time && <p className="form-error">{errors.end_time.message}</p>}
              {startTime && endTime && endTime > startTime && (
                <p style={{ fontSize: '0.7rem', color: '#747C75', marginTop: 2 }}>
                  {getDurationMinutes(`2000-01-01T${startTime}`, `2000-01-01T${endTime}`)} min
                </p>
              )}
            </div>
          </div>

          {/* Reason */}
          {!rescheduleOnly && (
            <div>
              <label className="form-label">
                Reason <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <textarea
                className={`form-textarea ${errors.reason ? 'error' : ''}`}
                rows={2}
                placeholder="Chief complaint or visit reason…"
                {...register('reason', { required: 'Reason is required' })}
              />
              {errors.reason && <p className="form-error">{errors.reason.message}</p>}
            </div>
          )}

          {/* Notes */}
          {!rescheduleOnly && (
            <div>
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Additional notes…"
                {...register('notes')}
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ─── AppointmentDetailModal ───────────────────────────────────────────────────

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}
function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid #F0F3F0' }}>
      <span style={{ fontSize: '0.75rem', color: '#747C75', minWidth: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.8125rem', color: '#202722', fontWeight: 500 }}>{value || '—'}</span>
    </div>
  );
}

function AppointmentDetailModal({
  appointment,
  isOpen,
  onClose,
}: {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!appointment) return null;
  const duration = getDurationMinutes(appointment.appointment_start, appointment.appointment_end);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Appointment Details" maxWidth={560}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#747C75' }}>
          {appointment.appointment_code}
        </span>
        <StatusBadge status={appointment.status} />
      </div>

      <DetailRow label="Patient" value={`${appointment.patient_name ?? '—'} (${appointment.patient_code ?? ''})`} />
      <DetailRow label="Doctor" value={appointment.doctor_name ? `Dr. ${appointment.doctor_name}` : '—'} />
      <DetailRow label="Department" value={appointment.department_name} />
      <DetailRow label="Date" value={formatDateTime(appointment.appointment_start).split(',')[0]} />
      <DetailRow
        label="Time"
        value={`${formatTime(appointment.appointment_start)} – ${formatTime(appointment.appointment_end)} (${duration} min)`}
      />
      <DetailRow label="Reason" value={appointment.reason} />
      <DetailRow label="Notes" value={appointment.notes} />
      <DetailRow label="Created" value={formatDateTime(appointment.created_at)} />
      {appointment.updated_at && (
        <DetailRow label="Last Updated" value={formatDateTime(appointment.updated_at)} />
      )}
    </Modal>
  );
}

// ─── StatusDropdown ───────────────────────────────────────────────────────────

interface StatusDropdownProps {
  appointment: Appointment;
  onStatusChange: (id: number, status: string) => void;
  loading: boolean;
}

function StatusDropdown({ appointment, onStatusChange, loading }: StatusDropdownProps) {
  const nextStatuses = STATUS_TRANSITIONS[appointment.status] ?? [];

  if (nextStatuses.length === 0) {
    return <StatusBadge status={appointment.status} />;
  }

  return (
    <select
      value={appointment.status}
      onChange={e => onStatusChange(appointment.appointment_id, e.target.value)}
      disabled={loading}
      className="form-select"
      style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', minWidth: 0 }}
      onClick={e => e.stopPropagation()}
    >
      <option value={appointment.status}>{appointment.status}</option>
      {nextStatuses.map(s => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Appointments() {
  const { toast } = useToast();

  // Data
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 15;

  // Filters
  const [filters, setFilters] = useState<Filters>({
    status: '',
    date_from: '',
    date_to: '',
    doctor_id: '',
    department_id: '',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Modals
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch reference data once ──────────────────────────────────────────────
  useEffect(() => {
    const fetchRef = async () => {
      try {
        const [pRes, dRes, deptRes] = await Promise.all([
          patientService.getAll({ limit: 100 }),
          doctorService.getAll({ limit: 100, is_active: true }),
          departmentService.getAll(),
        ]);
        setPatients(pRes.data ?? []);
        setDoctors(dRes.data ?? []);
        setDepartments(Array.isArray(deptRes) ? deptRes : deptRes?.data ?? []);
      } catch (err) {
        console.error('Failed to load reference data for appointments', err);
      }
    };
    fetchRef();
  }, []);

  // ── Fetch appointments ─────────────────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, limit: LIMIT };
      if (filters.status) params.status = filters.status;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.doctor_id) params.doctor_id = filters.doctor_id;
      if (filters.department_id) params.department_id = filters.department_id;
      if (filters.search) params.search = filters.search;

      const res = await appointmentService.getAll(params);
      setAppointments(res.data ?? []);
      if (res.pagination) {
        setPages(res.pagination.pages);
        setTotal(res.pagination.total);
      }
    } catch {
      setError('Failed to load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ── Filter handlers ────────────────────────────────────────────────────────
  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateFilter('search', searchInput.trim());
    }
  };

  const clearFilters = () => {
    setFilters({ status: '', date_from: '', date_to: '', doctor_id: '', department_id: '', search: '' });
    setSearchInput('');
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // ── Status change ──────────────────────────────────────────────────────────
  const handleStatusChange = async (id: number, status: string) => {
    setStatusLoading(id);
    try {
      await appointmentService.updateStatus(id, status);
      toast('success', 'Status updated', `Appointment marked as ${status}`);
      fetchAppointments();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast('error', 'Status update failed', axiosErr?.response?.data?.message ?? 'Please try again.');
    } finally {
      setStatusLoading(null);
    }
  };

  // ── Cancel ────────────────────────────────────────────────────────────────
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await appointmentService.cancel(cancelTarget.appointment_id);
      toast('success', 'Appointment cancelled');
      setCancelTarget(null);
      fetchAppointments();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast('error', 'Failed to cancel', axiosErr?.response?.data?.message ?? 'Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await appointmentService.delete(deleteTarget.appointment_id);
      toast('success', 'Appointment deleted', `Appointment ${deleteTarget.appointment_code} was permanently deleted.`);
      setDeleteTarget(null);
      fetchAppointments();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
      const msg = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error || 'Failed to delete appointment';
      toast('error', 'Deletion prevented', msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const isCancellable = (appt: Appointment) =>
    !['Cancelled', 'Completed', 'No Show'].includes(appt.status);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">
            Schedule and manage patient appointments
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setScheduleOpen(true)}>
          <Plus size={16} />
          Schedule Appointment
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '0.75rem',
            alignItems: 'end',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '0.625rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#747C75',
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Patient name or code…"
              value={searchInput}
              style={{ paddingLeft: '2rem' }}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onBlur={() => updateFilter('search', searchInput.trim())}
            />
          </div>

          {/* Status */}
          <div>
            <label className="form-label" style={{ marginBottom: 4 }}>Status</label>
            <select
              className="form-select"
              value={filters.status}
              onChange={e => updateFilter('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              {APPOINTMENT_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="form-label" style={{ marginBottom: 4 }}>Date From</label>
            <input
              type="date"
              className="form-input"
              value={filters.date_from}
              onChange={e => updateFilter('date_from', e.target.value)}
            />
          </div>

          {/* Date To */}
          <div>
            <label className="form-label" style={{ marginBottom: 4 }}>Date To</label>
            <input
              type="date"
              className="form-input"
              value={filters.date_to}
              onChange={e => updateFilter('date_to', e.target.value)}
            />
          </div>

          {/* Doctor */}
          <div>
            <label className="form-label" style={{ marginBottom: 4 }}>Doctor</label>
            <select
              className="form-select"
              value={filters.doctor_id}
              onChange={e => updateFilter('doctor_id', e.target.value)}
            >
              <option value="">All Doctors</option>
              {doctors.filter(d => d.is_active).map(d => (
                <option key={d.doctor_id} value={d.doctor_id}>
                  Dr. {d.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="form-label" style={{ marginBottom: 4 }}>Department</label>
            <select
              className="form-select"
              value={filters.department_id}
              onChange={e => updateFilter('department_id', e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.department_id} value={d.department_id}>
                  {d.department_name}
                </option>
              ))}
            </select>
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                <XCircle size={13} />
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            borderRadius: 8,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            marginBottom: '1rem',
            color: '#DC2626',
            fontSize: '0.875rem',
          }}
        >
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={fetchAppointments}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && <TableSkeleton rows={8} cols={9} />}

      {/* Table */}
      {!loading && !error && (
        <>
          {appointments.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={Calendar}
                title="No appointments found"
                description={
                  hasActiveFilters
                    ? 'No appointments match your current filters. Try adjusting or clearing the filters.'
                    : 'No appointments have been scheduled yet. Click "Schedule Appointment" to get started.'
                }
                action={
                  hasActiveFilters ? (
                    <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                      Clear Filters
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => setScheduleOpen(true)}>
                      <Plus size={13} /> Schedule Appointment
                    </button>
                  )
                }
              />
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Department</th>
                      <th>Date & Time</th>
                      <th>Duration</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(appt => (
                      <tr
                        key={appt.appointment_id}
                        onClick={() => setDetailAppointment(appt)}
                        className="cursor-pointer hover:bg-bg/60 transition-colors"
                        title="Click to view appointment details"
                      >
                        {/* Code */}
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#747C75' }}>
                            {appt.appointment_code}
                          </span>
                        </td>

                        {/* Patient */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <User size={13} style={{ color: '#747C75', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                                {appt.patient_name ?? '—'}
                              </div>
                              {appt.patient_code && (
                                <div style={{ fontSize: '0.7rem', color: '#747C75' }}>
                                  {appt.patient_code}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Doctor */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Stethoscope size={13} style={{ color: '#747C75', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8125rem' }}>
                              {appt.doctor_name ? `Dr. ${appt.doctor_name}` : '—'}
                            </span>
                          </div>
                        </td>

                        {/* Department */}
                        <td>
                          <span style={{ fontSize: '0.8125rem', color: '#747C75' }}>
                            {appt.department_name ?? '—'}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={12} style={{ color: '#747C75', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                                {formatDateTime(appt.appointment_start).split(',')[0]}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#747C75' }}>
                                {formatTime(appt.appointment_start)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Duration */}
                        <td>
                          <span style={{ fontSize: '0.8125rem', color: '#747C75' }}>
                            {getDurationMinutes(appt.appointment_start, appt.appointment_end)} min
                          </span>
                        </td>

                        {/* Reason */}
                        <td style={{ maxWidth: 180 }}>
                          <span
                            style={{
                              fontSize: '0.8125rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                            title={appt.reason ?? undefined}
                          >
                            {appt.reason ?? '—'}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <StatusDropdown
                            appointment={appt}
                            onStatusChange={handleStatusChange}
                            loading={statusLoading === appt.appointment_id}
                          />
                        </td>

                        {/* Actions */}
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            {/* View */}
                            <button
                              className="btn btn-ghost btn-sm"
                              title="View details"
                              onClick={() => setDetailAppointment(appt)}
                            >
                              <Eye size={13} />
                            </button>

                            {/* Edit */}
                            {!['Completed', 'Cancelled', 'No Show'].includes(appt.status) && (
                              <button
                                className="btn btn-ghost btn-sm"
                                title="Edit appointment"
                                onClick={() => setEditAppointment(appt)}
                              >
                                <Edit2 size={13} />
                              </button>
                            )}

                            {/* Reschedule */}
                            {!['Completed', 'Cancelled', 'No Show'].includes(appt.status) && (
                              <button
                                className="btn btn-ghost btn-sm"
                                title="Reschedule time slot"
                                onClick={() => setRescheduleAppointment(appt)}
                              >
                                <Clock size={13} />
                              </button>
                            )}

                            {/* Cancel */}
                            {isCancellable(appt) && (
                              <button
                                className="btn btn-ghost btn-sm"
                                title="Cancel appointment"
                                style={{ color: '#DC2626' }}
                                onClick={() => setCancelTarget(appt)}
                              >
                                <XCircle size={13} />
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Delete appointment"
                              style={{ color: '#747C75' }}
                              onClick={() => setDeleteTarget(appt)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={page}
                pages={pages}
                total={total}
                limit={LIMIT}
                onChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Schedule / Edit Appointment Modal */}
      <AppointmentFormModal
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSuccess={fetchAppointments}
        patients={patients}
        doctors={doctors}
        departments={departments}
      />

      {/* Edit Appointment Modal */}
      <AppointmentFormModal
        isOpen={!!editAppointment}
        onClose={() => setEditAppointment(null)}
        onSuccess={fetchAppointments}
        editAppointment={editAppointment}
        patients={patients}
        doctors={doctors}
        departments={departments}
      />

      {/* Reschedule Modal */}
      <AppointmentFormModal
        isOpen={!!rescheduleAppointment}
        onClose={() => setRescheduleAppointment(null)}
        onSuccess={fetchAppointments}
        editAppointment={rescheduleAppointment}
        rescheduleOnly
        patients={patients}
        doctors={doctors}
        departments={departments}
      />

      {/* Detail Modal */}
      <AppointmentDetailModal
        appointment={detailAppointment}
        isOpen={!!detailAppointment}
        onClose={() => setDetailAppointment(null)}
      />

      {/* Cancel Confirm Modal */}
      <ConfirmModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Appointment"
        message={`Are you sure you want to cancel appointment ${cancelTarget?.appointment_code ?? ''}? This action cannot be undone.`}
        confirmLabel="Cancel Appointment"
        confirmClass="btn-danger"
        isLoading={cancelLoading}
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Appointment"
        message={`Are you sure you want to permanently delete appointment ${deleteTarget?.appointment_code ?? ''}? Note: Appointments with linked prescriptions or bills cannot be deleted to preserve financial and clinical history.`}
        confirmLabel="Delete Appointment"
        confirmClass="btn-danger"
        isLoading={deleteLoading}
      />
    </div>
  );
}
