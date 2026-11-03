import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  Eye,
  Pill,
  Search,
  Printer,
  Calendar,
  User,
  Stethoscope,
  Lock,
  Edit2
} from 'lucide-react';
import {
  prescriptionService,
  patientService,
  doctorService,
  appointmentService
} from '../services';
import { Prescription, PrescriptionItem, Patient, Doctor, Appointment } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../hooks/useToast';

interface PrescriptionFormData {
  patient_id: number;
  doctor_id: number;
  appointment_id?: number | null;
  prescription_date: string;
  notes?: string;
  items: Array<{
    medicine_name: string;
    dosage_instructions: string;
    route?: string;
    frequency: string;
    duration: string;
    quantity: number;
    additional_instructions?: string;
  }>;
}

export default function Prescriptions() {
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState<'Draft' | 'Finalised' | ''>('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [searchPatient, setSearchPatient] = useState('');

  // Dropdown reference data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRx, setEditingRx] = useState<Prescription | null>(null);
  const [deletingRx, setDeletingRx] = useState<Prescription | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingRx, setViewingRx] = useState<Prescription | null>(null);
  const [finalisingRx, setFinalisingRx] = useState<Prescription | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<PrescriptionFormData>({
    defaultValues: {
      prescription_date: new Date().toISOString().split('T')[0],
      items: [
        {
          medicine_name: '',
          dosage_instructions: '',
          route: 'Oral',
          frequency: 'Twice daily',
          duration: '5 days',
          quantity: 10,
        },
      ],
    },
  });

  const watchedPatientId = watch('patient_id');

  useEffect(() => {
    if (watchedPatientId) {
      patientService.getAppointments(Number(watchedPatientId))
        .then((res: any) => setPatientAppointments(Array.isArray(res) ? res : []))
        .catch(() => setPatientAppointments([]));
    } else {
      setPatientAppointments([]);
    }
  }, [watchedPatientId]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Load reference dropdowns
  useEffect(() => {
    async function loadRefs() {
      try {
        const [pRes, dRes] = await Promise.all([
          patientService.getAll({ limit: 100 }),
          doctorService.getAll({ limit: 100, is_active: true }),
        ]);
        setPatients(pRes.data || []);
        setDoctors(dRes.data || []);
      } catch (err: any) {
        console.error('Failed to load references', err);
      }
    }
    loadRefs();
  }, []);

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await prescriptionService.getAll({
        status: filterStatus || undefined,
        doctor_id: filterDoctor || undefined,
      });
      setPrescriptions(res);
    } catch (err: any) {
      toast('error', 'Failed to fetch prescriptions', err.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterDoctor, toast]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const openCreateModal = () => {
    setEditingRx(null);
    reset({
      patient_id: undefined,
      doctor_id: undefined,
      appointment_id: null,
      prescription_date: new Date().toISOString().split('T')[0],
      notes: '',
      items: [
        {
          medicine_name: '',
          dosage_instructions: '1 tablet after food',
          route: 'Oral',
          frequency: 'Twice daily',
          duration: '5 days',
          quantity: 10,
        },
      ],
    });
    setIsCreateOpen(true);
  };

  const openEditModal = async (rx: Prescription) => {
    try {
      const fullRx = await prescriptionService.getById(rx.prescription_id);
      setEditingRx(fullRx);
      reset({
        patient_id: fullRx.patient_id,
        doctor_id: fullRx.doctor_id,
        appointment_id: fullRx.appointment_id || null,
        prescription_date: fullRx.prescription_date ? fullRx.prescription_date.split('T')[0] : new Date().toISOString().split('T')[0],
        notes: fullRx.notes || '',
        items: (fullRx.items && fullRx.items.length > 0)
          ? fullRx.items.map((item: PrescriptionItem) => ({
              medicine_name: item.medicine_name,
              dosage_instructions: item.dosage_instructions,
              route: item.route || 'Oral',
              frequency: item.frequency,
              duration: item.duration,
              quantity: Number(item.quantity) || 1,
              additional_instructions: item.additional_instructions || '',
            }))
          : [
              {
                medicine_name: '',
                dosage_instructions: '1 tablet after food',
                route: 'Oral',
                frequency: 'Twice daily',
                duration: '5 days',
                quantity: 10,
              },
            ],
      });
      setIsCreateOpen(true);
    } catch (err: any) {
      toast('error', 'Failed to load details', err.message);
    }
  };

  const onSubmit = async (data: PrescriptionFormData) => {
    try {
      if (data.items.length === 0) {
        toast('warning', 'Missing Medicines', 'Prescription must contain at least one medicine item.');
        return;
      }
      if (editingRx) {
        await prescriptionService.update(editingRx.prescription_id, {
          prescription_date: data.prescription_date,
          notes: data.notes || '',
          items: data.items.map((item) => ({
            ...item,
            quantity: Number(item.quantity),
            route: item.route || null,
            additional_instructions: item.additional_instructions || null,
          })),
        });
        toast('success', 'Prescription updated', `Prescription ${editingRx.prescription_code} updated successfully.`);
        setEditingRx(null);
      } else {
        await prescriptionService.create({
          ...data,
          patient_id: Number(data.patient_id),
          doctor_id: Number(data.doctor_id),
          appointment_id: data.appointment_id ? Number(data.appointment_id) : null,
          items: data.items.map((item) => ({
            ...item,
            quantity: Number(item.quantity),
            route: item.route || null,
            additional_instructions: item.additional_instructions || null,
          })),
        });
        toast('success', 'Prescription created', 'Medical prescription recorded in database.');
      }
      setIsCreateOpen(false);
      fetchPrescriptions();
    } catch (err: any) {
      toast('error', editingRx ? 'Update failed' : 'Creation failed', err.message);
    }
  };

  const handleDeleteRx = async () => {
    if (!deletingRx) return;
    try {
      setIsDeleting(true);
      await prescriptionService.delete(deletingRx.prescription_id);
      toast('success', 'Prescription deleted', `Prescription ${deletingRx.prescription_code} deleted successfully.`);
      setDeletingRx(null);
      if (viewingRx && viewingRx.prescription_id === deletingRx.prescription_id) {
        setViewingRx(null);
      }
      fetchPrescriptions();
    } catch (err: any) {
      toast('error', 'Deletion failed', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const openViewModal = async (rx: Prescription) => {
    try {
      const fullRx = await prescriptionService.getById(rx.prescription_id);
      setViewingRx(fullRx);
    } catch (err: any) {
      toast('error', 'Failed to load details', err.message);
    }
  };

  const handleFinalise = async () => {
    if (!finalisingRx) return;
    try {
      await prescriptionService.finalise(finalisingRx.prescription_id);
      toast('success', 'Prescription finalised', 'Prescription is now locked as an immutable medical record.');
      setFinalisingRx(null);
      if (viewingRx && viewingRx.prescription_id === finalisingRx.prescription_id) {
        setViewingRx({ ...viewingRx, status: 'Finalised' });
      }
      fetchPrescriptions();
    } catch (err: any) {
      toast('error', 'Finalisation failed', err.message);
    }
  };

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (!searchPatient) return true;
    return (
      rx.patient_name?.toLowerCase().includes(searchPatient.toLowerCase()) ||
      rx.prescription_code?.toLowerCase().includes(searchPatient.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Prescription Management</h1>
          <p className="text-sm text-text-secondary">
            Generate itemised outpatient & inpatient drug charts, manage dosage schedules, and finalise prescriptions.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          <Plus size={16} /> New Prescription
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search patient name or Rx code..."
            value={searchPatient}
            onChange={(e) => setSearchPatient(e.target.value)}
            className="form-input pl-9 text-xs"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="form-select w-full sm:w-44 text-xs"
        >
          <option value="">All Statuses</option>
          <option value="Draft">Draft Only</option>
          <option value="Finalised">Finalised Only</option>
        </select>

        <select
          value={filterDoctor}
          onChange={(e) => setFilterDoctor(e.target.value)}
          className="form-select w-full sm:w-56 text-xs"
        >
          <option value="">All Prescribing Doctors</option>
          {doctors.map((d) => (
            <option key={d.doctor_id} value={d.doctor_id}>
              {d.full_name} ({d.specialisation})
            </option>
          ))}
        </select>
      </div>

      {/* Prescription Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filteredPrescriptions.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Prescriptions Found"
            description="No medical prescriptions match the active search or filter criteria."
            action={
              <button onClick={openCreateModal} className="btn btn-primary btn-sm">
                Write Prescription
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rx Code</th>
                  <th>Patient</th>
                  <th>Prescribing Doctor</th>
                  <th>Date</th>
                  <th>Medicines Count</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrescriptions.map((rx) => (
                  <tr key={rx.prescription_id}>
                    <td className="font-mono text-xs font-semibold text-accent">{rx.prescription_code}</td>
                    <td>
                      <div className="font-medium text-text-primary">{rx.patient_name}</div>
                      <div className="text-xs text-text-secondary">{rx.patient_code}</div>
                    </td>
                    <td>
                      <div className="font-medium text-text-primary">{rx.doctor_name}</div>
                    </td>
                    <td className="text-xs text-text-secondary">{rx.prescription_date}</td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-bg text-text-primary">
                        <Pill size={12} className="text-text-secondary" />
                        {rx.item_count || 0} items
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={rx.status} />
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openViewModal(rx)}
                          className="btn btn-ghost btn-sm p-1.5"
                          title="View Prescription"
                        >
                          <Eye size={14} />
                        </button>
                        {rx.status === 'Draft' && (
                          <>
                            <button
                              onClick={() => openEditModal(rx)}
                              className="btn btn-ghost btn-sm p-1.5 text-accent hover:bg-accent-light"
                              title="Edit Prescription"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setFinalisingRx(rx)}
                              className="btn btn-ghost btn-sm p-1.5 text-positive hover:bg-positive-light"
                              title="Finalise Prescription"
                            >
                              <Lock size={14} />
                            </button>
                            <button
                              onClick={() => setDeletingRx(rx)}
                              className="btn btn-ghost btn-sm p-1.5 text-critical hover:bg-critical-light"
                              title="Delete Prescription"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Prescription Modal */}
      {viewingRx && (
        <Modal
          isOpen={Boolean(viewingRx)}
          onClose={() => setViewingRx(null)}
          title={`Prescription: ${viewingRx.prescription_code}`}
          maxWidth={640}
        >
          <div className="space-y-4 print:p-0">
            {/* Header Card */}
            <div className="p-3 bg-bg rounded border border-border flex items-start justify-between">
              <div>
                <span className="text-xs text-text-secondary">Patient Details</span>
                <div className="font-bold text-sm text-text-primary">{viewingRx.patient_name}</div>
                <div className="text-xs text-text-secondary">
                  Code: {viewingRx.patient_code} • Blood Group: {viewingRx.blood_group || 'N/A'}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-text-secondary">Attending Physician</span>
                <div className="font-semibold text-xs text-text-primary">{viewingRx.doctor_name}</div>
                <div className="text-xs text-text-secondary">{viewingRx.specialisation}</div>
                <div className="mt-1"><StatusBadge status={viewingRx.status} /></div>
              </div>
            </div>

            {/* Medicines List */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Prescribed Medications
              </h4>
              <div className="card overflow-hidden border border-border">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Dosage & Frequency</th>
                      <th>Duration</th>
                      <th>Route</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingRx.items?.map((item) => (
                      <tr key={item.prescription_item_id}>
                        <td className="font-semibold text-text-primary">{item.medicine_name}</td>
                        <td>
                          <div>{item.dosage_instructions}</div>
                          <div className="text-[11px] text-text-secondary">{item.frequency}</div>
                        </td>
                        <td className="text-xs">{item.duration}</td>
                        <td className="text-xs">{item.route || 'Oral'}</td>
                        <td className="font-mono text-xs">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {viewingRx.notes && (
              <div className="p-3 bg-bg rounded text-xs space-y-1">
                <span className="font-semibold text-text-secondary block">Doctor's Clinical Notes:</span>
                <p className="text-text-primary">{viewingRx.notes}</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-border">
              <button
                onClick={() => window.print()}
                className="btn btn-secondary btn-sm flex items-center gap-1.5"
              >
                <Printer size={14} /> Print Rx
              </button>
              <div className="flex gap-2">
                {viewingRx.status === 'Draft' && (
                  <>
                    <button
                      onClick={() => {
                        const rx = viewingRx;
                        setViewingRx(null);
                        openEditModal(rx);
                      }}
                      className="btn btn-secondary btn-sm flex items-center gap-1.5"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => {
                        setFinalisingRx(viewingRx);
                      }}
                      className="btn btn-primary btn-sm flex items-center gap-1.5"
                    >
                      <Lock size={13} /> Finalise Record
                    </button>
                    <button
                      onClick={() => {
                        setDeletingRx(viewingRx);
                      }}
                      className="btn btn-ghost btn-sm text-critical hover:bg-critical-light flex items-center gap-1.5"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </>
                )}
                <button onClick={() => setViewingRx(null)} className="btn btn-secondary btn-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create / Edit Prescription Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingRx(null);
        }}
        title={editingRx ? `Edit Draft Prescription: ${editingRx.prescription_code}` : 'Issue Medical Prescription'}
        maxWidth={720}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Patient *</label>
              <select
                disabled={Boolean(editingRx)}
                className={`form-select ${errors.patient_id ? 'error' : ''} ${editingRx ? 'bg-bg text-text-secondary cursor-not-allowed' : ''}`}
                {...register('patient_id', { required: 'Patient required' })}
              >
                <option value="">Select patient...</option>
                {patients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.full_name} ({p.patient_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Doctor *</label>
              <select
                disabled={Boolean(editingRx)}
                className={`form-select ${errors.doctor_id ? 'error' : ''} ${editingRx ? 'bg-bg text-text-secondary cursor-not-allowed' : ''}`}
                {...register('doctor_id', { required: 'Doctor required' })}
              >
                <option value="">Select prescribing doctor...</option>
                {doctors.map((d) => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    {d.full_name} ({d.specialisation})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Date *</label>
              <input
                type="date"
                className="form-input"
                {...register('prescription_date', { required: true })}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Clinical Notes / Diagnosis Context</label>
            <input
              type="text"
              placeholder="e.g. Mild respiratory tract infection; maintain fluid intake"
              className="form-input"
              {...register('notes')}
            />
          </div>

          {/* Dynamic Prescription Items */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-border pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Medicines & Dosages ({fields.length})
              </span>
              <button
                type="button"
                onClick={() =>
                  append({
                    medicine_name: '',
                    dosage_instructions: '',
                    route: 'Oral',
                    frequency: 'Once daily',
                    duration: '5 days',
                    quantity: 5,
                  })
                }
                className="btn btn-secondary btn-sm text-xs py-1 px-2"
              >
                <Plus size={12} /> Add Medicine
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {fields.map((field, idx) => (
                <div key={field.id} className="p-3 bg-bg rounded border border-border space-y-2 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-accent">Item #{idx + 1}</span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className="text-text-secondary hover:text-critical p-1"
                        title="Remove Medicine"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-medium text-text-secondary block">Medicine Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Amoxicillin 500mg"
                        className="form-input text-xs"
                        {...register(`items.${idx}.medicine_name`, { required: true })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-text-secondary block">Route</label>
                      <select className="form-select text-xs" {...register(`items.${idx}.route`)}>
                        <option value="Oral">Oral</option>
                        <option value="Topical">Topical</option>
                        <option value="Intravenous">Intravenous (IV)</option>
                        <option value="Intramuscular">Intramuscular (IM)</option>
                        <option value="Subcutaneous">Subcutaneous</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <label className="text-[11px] font-medium text-text-secondary block">Dosage Instructions *</label>
                      <input
                        type="text"
                        placeholder="e.g. 1 capsule after breakfast and dinner"
                        className="form-input text-xs"
                        {...register(`items.${idx}.dosage_instructions`, { required: true })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-text-secondary block">Frequency *</label>
                      <input
                        type="text"
                        placeholder="e.g. Twice daily"
                        className="form-input text-xs"
                        {...register(`items.${idx}.frequency`, { required: true })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-text-secondary block">Duration *</label>
                      <input
                        type="text"
                        placeholder="e.g. 7 days"
                        className="form-input text-xs"
                        {...register(`items.${idx}.duration`, { required: true })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingRx(null);
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Saving...' : editingRx ? 'Update Prescription' : 'Save Draft Prescription'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Finalise Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(finalisingRx)}
        onClose={() => setFinalisingRx(null)}
        onConfirm={handleFinalise}
        title="Finalise Medical Prescription"
        message={`Are you sure you want to finalise ${finalisingRx?.prescription_code}? Once finalised, a prescription becomes an immutable historical medical document and can no longer be edited or revoked.`}
        confirmLabel="Finalise Record"
        confirmClass="btn-primary"
      />

      {/* Delete Draft Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingRx)}
        onClose={() => setDeletingRx(null)}
        onConfirm={handleDeleteRx}
        title="Delete Draft Prescription"
        message={`Are you sure you want to permanently delete draft prescription ${deletingRx?.prescription_code}? This will remove all associated medicine items from the PostgreSQL database.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Prescription'}
        confirmClass="btn-critical"
      />
    </div>
  );
}
