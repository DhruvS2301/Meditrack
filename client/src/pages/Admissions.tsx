import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  BedDouble,
  Plus,
  LogOut,
  Building2,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  Activity,
  AlertCircle,
  Wrench,
  UserCheck,
  Edit2,
  Trash2
} from 'lucide-react';
import {
  admissionService,
  bedService,
  patientService,
  doctorService,
  departmentService
} from '../services';
import { Admission, Bed, Patient, Doctor, Department } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { TableSkeleton, CardSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../hooks/useToast';

interface AdmitFormData {
  patient_id: number;
  doctor_id: number;
  department_id: number;
  bed_id: number;
  admission_datetime: string;
  admission_reason: string;
  initial_notes?: string;
  expected_discharge_date?: string;
}

interface DischargeFormData {
  discharge_datetime: string;
  discharge_notes?: string;
}

interface AddBedFormData {
  bed_number: string;
  ward_name: string;
  department_id: number;
  bed_type: 'General' | 'Semi-Private' | 'Private' | 'ICU';
  daily_charge: number;
  bed_status?: 'Available' | 'Occupied' | 'Maintenance';
}

interface EditAdmissionFormData {
  admission_reason: string;
  initial_notes?: string;
  expected_discharge_date?: string;
}

export default function Admissions() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'admissions' | 'beds'>('admissions');

  // Admissions state
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loadingAdmissions, setLoadingAdmissions] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterAdmissionStatus, setFilterAdmissionStatus] = useState<'Active' | 'Discharged' | ''>('Active');
  const [filterDept, setFilterDept] = useState('');

  // Beds state
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loadingBeds, setLoadingBeds] = useState(true);
  const [filterBedStatus, setFilterBedStatus] = useState('');

  // Dropdown references
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Modals
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [isAddBedModalOpen, setIsAddBedModalOpen] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [deletingBed, setDeletingBed] = useState<Bed | null>(null);
  const [deletingBedLoading, setDeletingBedLoading] = useState(false);

  const [dischargingAdmission, setDischargingAdmission] = useState<Admission | null>(null);
  const [editingAdmission, setEditingAdmission] = useState<Admission | null>(null);
  const [deletingAdmission, setDeletingAdmission] = useState<Admission | null>(null);
  const [deletingAdmissionLoading, setDeletingAdmissionLoading] = useState(false);

  const { register: registerAdmit, handleSubmit: handleSubmitAdmit, reset: resetAdmit, watch: watchAdmit, setValue: setValueAdmit, formState: { errors: errorsAdmit, isSubmitting: isSubmittingAdmit } } = useForm<AdmitFormData>();
  const { register: registerDischarge, handleSubmit: handleSubmitDischarge, reset: resetDischarge, formState: { isSubmitting: isSubmittingDischarge } } = useForm<DischargeFormData>();
  const { register: registerBed, handleSubmit: handleSubmitBed, reset: resetBed, setValue: setValueBed, formState: { errors: errorsBed, isSubmitting: isSubmittingBed } } = useForm<AddBedFormData>();
  const { register: registerEditAdmission, handleSubmit: handleSubmitEditAdmission, reset: resetEditAdmission, formState: { isSubmitting: isSubmittingEditAdmission } } = useForm<EditAdmissionFormData>();

  const selectedAdmitDept = watchAdmit('department_id');

  // Load dropdown lists
  useEffect(() => {
    async function loadRefs() {
      try {
        const [pRes, dRes, deptRes] = await Promise.all([
          patientService.getAll({ limit: 100 }),
          doctorService.getAll({ limit: 100, is_active: true }),
          departmentService.getAll(),
        ]);
        setPatients(pRes.data || []);
        setDoctors(dRes.data || []);
        setDepartments(deptRes || []);
      } catch (err: any) {
        console.error('Failed to load references', err);
      }
    }
    loadRefs();
  }, []);

  const fetchAdmissions = useCallback(async () => {
    try {
      setLoadingAdmissions(true);
      const res = await admissionService.getAll({
        page,
        limit: 15,
        status: filterAdmissionStatus || undefined,
        department_id: filterDept || undefined,
      });
      setAdmissions(res.data);
      setTotalPages(res.pagination.pages);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      toast('error', 'Failed to fetch admissions', err.message);
    } finally {
      setLoadingAdmissions(false);
    }
  }, [page, filterAdmissionStatus, filterDept, toast]);

  const fetchBeds = useCallback(async () => {
    try {
      setLoadingBeds(true);
      const res = await bedService.getAll({
        bed_status: filterBedStatus || undefined,
        department_id: filterDept || undefined,
      });
      setBeds(res);
    } catch (err: any) {
      toast('error', 'Failed to fetch beds', err.message);
    } finally {
      setLoadingBeds(false);
    }
  }, [filterBedStatus, filterDept, toast]);

  useEffect(() => {
    fetchAdmissions();
  }, [fetchAdmissions]);

  useEffect(() => {
    fetchBeds();
  }, [fetchBeds]);

  const openAdmitModal = () => {
    const now = new Date();
    resetAdmit({
      patient_id: undefined,
      doctor_id: undefined,
      department_id: undefined,
      bed_id: undefined,
      admission_datetime: now.toISOString().slice(0, 16),
      admission_reason: '',
      initial_notes: '',
      expected_discharge_date: '',
    });
    setIsAdmitModalOpen(true);
  };

  const onAdmitSubmit = async (data: AdmitFormData) => {
    try {
      await admissionService.create({
        ...data,
        patient_id: Number(data.patient_id),
        doctor_id: Number(data.doctor_id),
        department_id: Number(data.department_id),
        bed_id: Number(data.bed_id),
        admission_datetime: new Date(data.admission_datetime).toISOString(),
        expected_discharge_date: data.expected_discharge_date || null,
        initial_notes: data.initial_notes || null,
      });
      toast('success', 'Patient admitted', 'Admission created and bed marked as Occupied.');
      setIsAdmitModalOpen(false);
      fetchAdmissions();
      fetchBeds();
    } catch (err: any) {
      toast('error', 'Admission failed', err.message);
    }
  };

  const openDischargeModal = (adm: Admission) => {
    setDischargingAdmission(adm);
    resetDischarge({
      discharge_datetime: new Date().toISOString().slice(0, 16),
      discharge_notes: '',
    });
  };

  const onDischargeSubmit = async (data: DischargeFormData) => {
    if (!dischargingAdmission) return;
    try {
      await admissionService.discharge(dischargingAdmission.admission_id, {
        discharge_datetime: new Date(data.discharge_datetime).toISOString(),
        discharge_notes: data.discharge_notes || null,
      });
      toast('success', 'Patient discharged', 'Inpatient discharged and bed marked as Available.');
      setDischargingAdmission(null);
      fetchAdmissions();
      fetchBeds();
    } catch (err: any) {
      toast('error', 'Discharge failed', err.message);
    }
  };

  const onAddBedSubmit = async (data: AddBedFormData) => {
    try {
      await bedService.create({
        ...data,
        department_id: Number(data.department_id),
        daily_charge: Number(data.daily_charge),
      });
      toast('success', 'Bed created', `Bed ${data.bed_number} added to ${data.ward_name}`);
      setIsAddBedModalOpen(false);
      fetchBeds();
    } catch (err: any) {
      toast('error', 'Failed to add bed', err.message);
    }
  };

  const openEditBedModal = (b: Bed) => {
    setEditingBed(b);
    setValueBed('bed_number', b.bed_number);
    setValueBed('ward_name', b.ward_name);
    setValueBed('department_id', b.department_id);
    setValueBed('bed_type', b.bed_type);
    setValueBed('daily_charge', Number(b.daily_charge));
    setValueBed('bed_status', b.bed_status);
  };

  const onEditBedSubmit = async (data: AddBedFormData) => {
    if (!editingBed) return;
    try {
      await bedService.update(editingBed.bed_id, {
        bed_number: data.bed_number,
        ward_name: data.ward_name,
        department_id: Number(data.department_id),
        bed_type: data.bed_type,
        daily_charge: Number(data.daily_charge),
        bed_status: data.bed_status,
      });
      toast('success', 'Bed updated', `Bed ${data.bed_number} details saved.`);
      setEditingBed(null);
      fetchBeds();
    } catch (err: any) {
      toast('error', 'Failed to update bed', err.message);
    }
  };

  const handleDeleteBed = async () => {
    if (!deletingBed) return;
    setDeletingBedLoading(true);
    try {
      await bedService.delete(deletingBed.bed_id);
      toast('success', 'Bed deleted', `Bed ${deletingBed.bed_number} has been removed.`);
      setDeletingBed(null);
      fetchBeds();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message;
      toast('error', 'Deletion prevented', msg);
    } finally {
      setDeletingBedLoading(false);
    }
  };

  const openEditAdmissionModal = (adm: Admission) => {
    setEditingAdmission(adm);
    resetEditAdmission({
      admission_reason: adm.admission_reason || '',
      initial_notes: (adm as any).initial_notes || '',
      expected_discharge_date: adm.expected_discharge_date ? adm.expected_discharge_date.slice(0, 10) : '',
    });
  };

  const onEditAdmissionSubmit = async (data: EditAdmissionFormData) => {
    if (!editingAdmission) return;
    try {
      await admissionService.update(editingAdmission.admission_id, data);
      toast('success', 'Admission updated', 'Admission details successfully saved.');
      setEditingAdmission(null);
      fetchAdmissions();
    } catch (err: any) {
      toast('error', 'Update failed', err.message);
    }
  };

  const handleDeleteAdmission = async () => {
    if (!deletingAdmission) return;
    setDeletingAdmissionLoading(true);
    try {
      await admissionService.delete(deletingAdmission.admission_id);
      toast('success', 'Admission deleted', `Admission ${deletingAdmission.admission_code} was deleted and bed freed.`);
      setDeletingAdmission(null);
      fetchAdmissions();
      fetchBeds();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message;
      toast('error', 'Deletion prevented', msg);
    } finally {
      setDeletingAdmissionLoading(false);
    }
  };

  const availableBedsForAdmit = beds.filter((b) => {
    if (b.bed_status !== 'Available') return false;
    if (selectedAdmitDept && b.department_id !== Number(selectedAdmitDept)) return false;
    return true;
  });

  const totalBedsCount = beds.length;
  const occupiedBedsCount = beds.filter((b) => b.bed_status === 'Occupied').length;
  const availableBedsCount = beds.filter((b) => b.bed_status === 'Available').length;
  const maintenanceBedsCount = beds.filter((b) => b.bed_status === 'Maintenance').length;
  const occupancyRate = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Inpatient & Bed Management</h1>
          <p className="text-sm text-text-secondary">
            Manage hospital ward occupancy, patient admissions, and discharge reconciliations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsAddBedModalOpen(true)} className="btn btn-secondary">
            <Plus size={15} /> Add Bed
          </button>
          <button onClick={openAdmitModal} className="btn btn-primary">
            <UserCheck size={16} /> Admit Patient
          </button>
        </div>
      </div>

      {/* Ward Occupancy Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="stat-card">
          <span className="text-xs text-text-secondary uppercase">Total Capacity</span>
          <div className="stat-value">{totalBedsCount}</div>
          <span className="stat-label">Configured beds</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-text-secondary uppercase">Occupied</span>
          <div className="stat-value text-critical">{occupiedBedsCount}</div>
          <span className="stat-label">Currently admitted</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-text-secondary uppercase">Available</span>
          <div className="stat-value text-positive">{availableBedsCount}</div>
          <span className="stat-label">Ready for admit</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-text-secondary uppercase">Maintenance</span>
          <div className="stat-value text-warning">{maintenanceBedsCount}</div>
          <span className="stat-label">Sanitizing / repair</span>
        </div>
        <div className="stat-card col-span-2 sm:col-span-1">
          <span className="text-xs text-text-secondary uppercase">Occupancy</span>
          <div className="stat-value text-accent">{occupancyRate}%</div>
          <span className="stat-label">Capacity utilization</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('admissions')}
          className={`pb-2.5 px-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'admissions'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Active & Historical Admissions
        </button>
        <button
          onClick={() => setActiveTab('beds')}
          className={`pb-2.5 px-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'beds'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Hospital Bed Directory ({beds.length})
        </button>
      </div>

      {activeTab === 'admissions' ? (
        <div className="space-y-4">
          {/* Admissions Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <select
              value={filterAdmissionStatus}
              onChange={(e) => {
                setFilterAdmissionStatus(e.target.value as any);
                setPage(1);
              }}
              className="form-select w-full sm:w-48 text-xs"
            >
              <option value="">All Admission States</option>
              <option value="Active">Currently Active</option>
              <option value="Discharged">Discharged</option>
            </select>

            <select
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setPage(1);
              }}
              className="form-select w-full sm:w-56 text-xs"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.department_id} value={dept.department_id}>
                  {dept.department_name}
                </option>
              ))}
            </select>
          </div>

          {/* Admissions Table */}
          <div className="card overflow-hidden">
            {loadingAdmissions ? (
              <TableSkeleton rows={6} cols={7} />
            ) : admissions.length === 0 ? (
              <EmptyState
                icon={BedDouble}
                title="No Admission Records"
                description="No patient admissions match the selected criteria."
                action={
                  <button onClick={openAdmitModal} className="btn btn-primary btn-sm">
                    Admit a Patient
                  </button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Patient</th>
                      <th>Attending Doctor</th>
                      <th>Ward & Bed</th>
                      <th>Admitted Date</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissions.map((adm) => (
                      <tr key={adm.admission_id}>
                        <td className="font-mono text-xs font-semibold text-accent">{adm.admission_code}</td>
                        <td>
                          <div className="font-medium text-text-primary">{adm.patient_name}</div>
                          <div className="text-xs text-text-secondary">{adm.patient_code}</div>
                        </td>
                        <td>
                          <div className="font-medium text-text-primary">{adm.doctor_name}</div>
                          <div className="text-xs text-text-secondary">{adm.department_name}</div>
                        </td>
                        <td>
                          <div className="font-semibold text-text-primary">Bed {adm.bed_number}</div>
                          <div className="text-xs text-text-secondary">{adm.ward_name}</div>
                        </td>
                        <td>
                          <div className="text-xs font-medium text-text-primary">
                            {new Date(adm.admission_datetime).toLocaleDateString()}
                          </div>
                          <div className="text-[11px] text-text-secondary">
                            {new Date(adm.admission_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td>
                          <span className="font-medium text-text-primary">
                            {adm.days_admitted !== undefined ? `${adm.days_admitted} days` : '—'}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={adm.status} />
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditAdmissionModal(adm)}
                              className="btn btn-ghost btn-sm p-1.5 text-text-secondary hover:text-text-primary"
                              title="Edit Admission"
                            >
                              <Edit2 size={13} />
                            </button>
                            {adm.status === 'Active' && (
                              <button
                                onClick={() => openDischargeModal(adm)}
                                className="btn btn-secondary btn-sm text-critical hover:bg-critical-light"
                                title="Discharge Patient"
                              >
                                <LogOut size={13} /> Discharge
                              </button>
                            )}
                            <button
                              onClick={() => setDeletingAdmission(adm)}
                              className="btn btn-ghost btn-sm p-1.5 text-text-secondary hover:text-critical"
                              title="Delete Admission"
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
            )}
          </div>

          <Pagination
            page={page}
            pages={totalPages}
            total={totalCount}
            limit={15}
            onChange={(p) => setPage(p)}
          />
        </div>
      ) : (
        /* Beds Directory Tab */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <select
              value={filterBedStatus}
              onChange={(e) => setFilterBedStatus(e.target.value)}
              className="form-select w-full sm:w-48 text-xs"
            >
              <option value="">All Bed Statuses</option>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          {loadingBeds ? (
            <CardSkeleton count={8} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {beds.map((b) => (
                <div key={b.bed_id} className="card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          b.bed_status === 'Available'
                            ? 'bg-positive'
                            : b.bed_status === 'Occupied'
                            ? 'bg-critical'
                            : 'bg-warning'
                        }`}
                      />
                      <span className="font-mono text-sm font-bold text-text-primary">{b.bed_number}</span>
                    </div>
                    <StatusBadge status={b.bed_status} />
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Ward:</span>
                      <span className="font-medium text-text-primary">{b.ward_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Type:</span>
                      <span className="font-medium text-text-primary">{b.bed_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Department:</span>
                      <span className="font-medium text-text-primary">{b.department_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Daily Charge:</span>
                      <span className="font-medium text-text-primary">₹{Number(b.daily_charge).toFixed(2)}/day</span>
                    </div>
                    {b.patient_name && (
                      <div className="mt-2 pt-2 border-t border-border flex justify-between text-xs">
                        <span className="text-text-secondary">Occupant:</span>
                        <span className="font-semibold text-accent">{b.patient_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <button
                      onClick={() => openEditBedModal(b)}
                      className="btn btn-ghost btn-sm text-xs p-1 flex items-center gap-1 text-text-secondary hover:text-text-primary"
                      title="Edit Bed"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => setDeletingBed(b)}
                      className="btn btn-ghost btn-sm text-xs p-1 text-text-secondary hover:text-critical flex items-center gap-1"
                      title="Delete Bed"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admit Patient Modal */}
      <Modal
        isOpen={isAdmitModalOpen}
        onClose={() => setIsAdmitModalOpen(false)}
        title="Admit Patient to Inpatient Care"
        maxWidth={580}
      >
        <form onSubmit={handleSubmitAdmit(onAdmitSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Patient *</label>
              <select
                className={`form-select ${errorsAdmit.patient_id ? 'error' : ''}`}
                {...registerAdmit('patient_id', { required: 'Please select patient' })}
              >
                <option value="">Select registered patient...</option>
                {patients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.full_name} ({p.patient_code}) — {p.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Department *</label>
              <select
                className={`form-select ${errorsAdmit.department_id ? 'error' : ''}`}
                {...registerAdmit('department_id', { required: 'Department required' })}
              >
                <option value="">Select department...</option>
                {departments.map((dept) => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.department_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Attending Doctor *</label>
              <select
                className={`form-select ${errorsAdmit.doctor_id ? 'error' : ''}`}
                {...registerAdmit('doctor_id', { required: 'Doctor required' })}
              >
                <option value="">Select doctor...</option>
                {doctors.map((d) => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    {d.full_name} ({d.specialisation})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">Assigned Bed (Available only) *</label>
              <select
                className={`form-select ${errorsAdmit.bed_id ? 'error' : ''}`}
                {...registerAdmit('bed_id', { required: 'Please select an available bed' })}
              >
                <option value="">Select available bed...</option>
                {availableBedsForAdmit.map((b) => (
                  <option key={b.bed_id} value={b.bed_id}>
                    Bed {b.bed_number} — {b.ward_name} ({b.bed_type}) — ₹{b.daily_charge}/day
                  </option>
                ))}
              </select>
              {availableBedsForAdmit.length === 0 && (
                <p className="form-error">No available beds in the selected department. Please free a bed first.</p>
              )}
            </div>

            <div>
              <label className="form-label">Admission Date & Time *</label>
              <input
                type="datetime-local"
                className="form-input"
                {...registerAdmit('admission_datetime', { required: true })}
              />
            </div>

            <div>
              <label className="form-label">Expected Discharge Date</label>
              <input
                type="date"
                className="form-input"
                {...registerAdmit('expected_discharge_date')}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">Admission Diagnosis / Reason *</label>
              <textarea
                rows={2}
                className={`form-textarea ${errorsAdmit.admission_reason ? 'error' : ''}`}
                placeholder="e.g. Acute exacerbation of COPD requiring IV medication and continuous monitoring"
                {...registerAdmit('admission_reason', { required: 'Admission reason is required' })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">Initial Assessment Notes</label>
              <input
                type="text"
                className="form-input"
                placeholder="Vital signs, allergies, preliminary treatment plan"
                {...registerAdmit('initial_notes')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsAdmitModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAdmit || availableBedsForAdmit.length === 0}
              className="btn btn-primary"
            >
              {isSubmittingAdmit ? 'Processing Admission...' : 'Confirm Admission'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Discharge Patient Modal */}
      {dischargingAdmission && (
        <Modal
          isOpen={Boolean(dischargingAdmission)}
          onClose={() => setDischargingAdmission(null)}
          title={`Discharge Patient: ${dischargingAdmission.patient_name}`}
          maxWidth={500}
        >
          <form onSubmit={handleSubmitDischarge(onDischargeSubmit)} className="space-y-4">
            <div className="p-3 bg-bg rounded text-xs space-y-1">
              <div><span className="text-text-secondary">Patient:</span> <strong className="text-text-primary">{dischargingAdmission.patient_name}</strong></div>
              <div><span className="text-text-secondary">Bed Assigned:</span> Bed {dischargingAdmission.bed_number} ({dischargingAdmission.ward_name})</div>
              <div><span className="text-text-secondary">Admission Date:</span> {new Date(dischargingAdmission.admission_datetime).toLocaleString()}</div>
            </div>

            <div>
              <label className="form-label">Discharge Date & Time *</label>
              <input
                type="datetime-local"
                className="form-input"
                {...registerDischarge('discharge_datetime', { required: true })}
              />
            </div>

            <div>
              <label className="form-label">Discharge Summary & Instructions</label>
              <textarea
                rows={3}
                className="form-textarea"
                placeholder="e.g. Patient recovered well, vital signs stable, advised rest for 7 days with prescribed medications."
                {...registerDischarge('discharge_notes')}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setDischargingAdmission(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingDischarge}
                className="btn btn-primary bg-critical hover:bg-[#9E3D36] border-critical"
              >
                {isSubmittingDischarge ? 'Discharging...' : 'Confirm Discharge & Free Bed'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Bed Modal */}
      <Modal
        isOpen={isAddBedModalOpen}
        onClose={() => setIsAddBedModalOpen(false)}
        title="Add Hospital Bed"
        maxWidth={480}
      >
        <form onSubmit={handleSubmitBed(onAddBedSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Bed Number *</label>
              <input
                type="text"
                placeholder="e.g. GM-04 or ICU-03"
                className={`form-input ${errorsBed.bed_number ? 'error' : ''}`}
                {...registerBed('bed_number', { required: true })}
              />
            </div>

            <div>
              <label className="form-label">Ward Name *</label>
              <input
                type="text"
                placeholder="e.g. General Ward Floor 1"
                className={`form-input ${errorsBed.ward_name ? 'error' : ''}`}
                {...registerBed('ward_name', { required: true })}
              />
            </div>

            <div>
              <label className="form-label">Department *</label>
              <select
                className="form-select"
                {...registerBed('department_id', { required: true })}
              >
                <option value="">Select department...</option>
                {departments.map((dept) => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.department_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Bed Type *</label>
              <select className="form-select" {...registerBed('bed_type', { required: true })}>
                <option value="General">General</option>
                <option value="Semi-Private">Semi-Private</option>
                <option value="Private">Private</option>
                <option value="ICU">ICU</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="form-label">Daily Charge (₹) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="800.00"
                className="form-input"
                {...registerBed('daily_charge', { required: true, min: 0 })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsAddBedModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingBed}
              className="btn btn-primary"
            >
              {isSubmittingBed ? 'Adding...' : 'Create Bed'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Bed Modal */}
      {editingBed && (
        <Modal
          isOpen={Boolean(editingBed)}
          onClose={() => setEditingBed(null)}
          title={`Edit Bed: ${editingBed.bed_number}`}
          maxWidth={480}
        >
          <form onSubmit={handleSubmitBed(onEditBedSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Bed Number *</label>
                <input
                  type="text"
                  className={`form-input ${errorsBed.bed_number ? 'error' : ''}`}
                  {...registerBed('bed_number', { required: true })}
                />
              </div>

              <div>
                <label className="form-label">Ward Name *</label>
                <input
                  type="text"
                  className={`form-input ${errorsBed.ward_name ? 'error' : ''}`}
                  {...registerBed('ward_name', { required: true })}
                />
              </div>

              <div>
                <label className="form-label">Department *</label>
                <select
                  className="form-select"
                  {...registerBed('department_id', { required: true })}
                >
                  <option value="">Select department...</option>
                  {departments.map((dept) => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Bed Type *</label>
                <select className="form-select" {...registerBed('bed_type', { required: true })}>
                  <option value="General">General</option>
                  <option value="Semi-Private">Semi-Private</option>
                  <option value="Private">Private</option>
                  <option value="ICU">ICU</option>
                </select>
              </div>

              <div>
                <label className="form-label">Daily Charge (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  {...registerBed('daily_charge', { required: true, min: 0 })}
                />
              </div>

              <div>
                <label className="form-label">Status *</label>
                <select className="form-select" {...registerBed('bed_status')}>
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingBed(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Save Bed Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Bed Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingBed)}
        onClose={() => setDeletingBed(null)}
        onConfirm={handleDeleteBed}
        title="Delete Hospital Bed"
        message={`Are you sure you want to delete bed ${deletingBed?.bed_number} (${deletingBed?.ward_name})? Note: Beds with active or historical admissions cannot be deleted to preserve hospital records.`}
        confirmLabel="Delete Bed"
        confirmClass="btn-danger"
        isLoading={deletingBedLoading}
      />

      {/* Edit Admission Modal */}
      {editingAdmission && (
        <Modal
          isOpen={Boolean(editingAdmission)}
          onClose={() => setEditingAdmission(null)}
          title={`Edit Admission: ${editingAdmission.admission_code}`}
          maxWidth={500}
        >
          <form onSubmit={handleSubmitEditAdmission(onEditAdmissionSubmit)} className="space-y-4">
            <div className="p-3 bg-bg rounded text-xs space-y-1">
              <div><span className="text-text-secondary">Patient:</span> <strong className="text-text-primary">{editingAdmission.patient_name}</strong></div>
              <div><span className="text-text-secondary">Bed Assigned:</span> Bed {editingAdmission.bed_number} ({editingAdmission.ward_name})</div>
              <div><span className="text-text-secondary">Admitted:</span> {new Date(editingAdmission.admission_datetime).toLocaleString()}</div>
            </div>

            <div>
              <label className="form-label">Admission Diagnosis / Reason *</label>
              <textarea
                rows={2}
                className="form-textarea"
                {...registerEditAdmission('admission_reason', { required: true })}
              />
            </div>

            <div>
              <label className="form-label">Initial Assessment Notes</label>
              <input
                type="text"
                className="form-input"
                {...registerEditAdmission('initial_notes')}
              />
            </div>

            <div>
              <label className="form-label">Expected Discharge Date</label>
              <input
                type="date"
                className="form-input"
                {...registerEditAdmission('expected_discharge_date')}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingAdmission(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingEditAdmission}
                className="btn btn-primary"
              >
                {isSubmittingEditAdmission ? 'Saving...' : 'Save Admission'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Admission Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingAdmission)}
        onClose={() => setDeletingAdmission(null)}
        onConfirm={handleDeleteAdmission}
        title="Delete Admission Record"
        message={`Are you sure you want to delete admission ${deletingAdmission?.admission_code} for ${deletingAdmission?.patient_name}? If active, the occupied bed will be immediately released back to Available status.`}
        confirmLabel="Delete Admission"
        confirmClass="btn-danger"
        isLoading={deletingAdmissionLoading}
      />
    </div>
  );
}
