import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Building2,
  Users,
  BedDouble,
  Phone,
  MapPin,
  Edit2,
  PowerOff,
  Plus,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  CheckCircle2,
  CheckCircle,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { departmentService, doctorService } from '../services';
import { Department, Doctor } from '../types';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { CardSkeleton } from '../components/ui/Skeleton';

interface DepartmentFormData {
  department_name: string;
  description?: string;
  location?: string;
  contact_number?: string;
  head_doctor_id?: number | null;
}

export default function Departments() {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded department doctor drawer
  const [expandedDeptId, setExpandedDeptId] = useState<number | null>(null);
  const [deptDoctors, setDeptDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deactivatingDept, setDeactivatingDept] = useState<Department | null>(null);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<DepartmentFormData>();

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const [deptRes, docRes] = await Promise.all([
        departmentService.getAll(),
        doctorService.getAll({ limit: 100, is_active: true }),
      ]);
      setDepartments(deptRes);
      setDoctors(docRes.data || []);
    } catch (err: any) {
      toast('error', 'Failed to fetch departments', err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const openCreateModal = () => {
    setEditingDept(null);
    reset({
      department_name: '',
      description: '',
      location: '',
      contact_number: '',
      head_doctor_id: undefined,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (d: Department) => {
    setEditingDept(d);
    setValue('department_name', d.department_name);
    setValue('description', d.description || '');
    setValue('location', d.location || '');
    setValue('contact_number', d.contact_number || '');
    setValue('head_doctor_id', d.head_doctor_id || undefined);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      const payload = {
        ...data,
        description: data.description || null,
        location: data.location || null,
        contact_number: data.contact_number || null,
        head_doctor_id: data.head_doctor_id ? Number(data.head_doctor_id) : null,
      };

      if (editingDept) {
        await departmentService.update(editingDept.department_id, payload);
        toast('success', 'Department updated', 'Department information saved.');
      } else {
        await departmentService.create(payload);
        toast('success', 'Department created', 'New clinical department added.');
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      toast('error', 'Operation failed', err.message);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingDept) return;
    try {
      await departmentService.deactivate(deactivatingDept.department_id);
      toast('success', 'Department deactivated', 'Department status changed to inactive.');
      setDeactivatingDept(null);
      fetchDepartments();
    } catch (err: any) {
      toast('error', 'Deactivation blocked', err.message);
    }
  };

  const handleActivate = async (dept: Department) => {
    try {
      await departmentService.activate(dept.department_id);
      toast('success', 'Department activated', `${dept.department_name} is now active.`);
      fetchDepartments();
    } catch (err: any) {
      toast('error', 'Activation failed', err.message);
    }
  };

  const handleDelete = async () => {
    if (!deletingDept) return;
    setDeletingLoading(true);
    try {
      await departmentService.delete(deletingDept.department_id);
      toast('success', 'Department deleted', `${deletingDept.department_name} was permanently removed.`);
      setDeletingDept(null);
      fetchDepartments();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message;
      toast('error', 'Deletion prevented', msg);
    } finally {
      setDeletingLoading(false);
    }
  };

  const toggleExpand = async (deptId: number) => {
    if (expandedDeptId === deptId) {
      setExpandedDeptId(null);
      setDeptDoctors([]);
      return;
    }
    setExpandedDeptId(deptId);
    setLoadingDoctors(true);
    try {
      const deptDetails = await departmentService.getById(deptId);
      setDeptDoctors(deptDetails.doctors || []);
    } catch (err: any) {
      toast('error', 'Failed to load department staff', err.message);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const totalDoctorsCount = departments.reduce((acc, d) => acc + Number(d.doctor_count || 0), 0);
  const totalBedsCount = departments.reduce((acc, d) => acc + Number(d.bed_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Clinical Departments</h1>
          <p className="text-sm text-text-secondary">
            Manage specialty hospital units, head physicians, allocated bed capacities, and staff rosters.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          <Plus size={16} /> Add Department
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <span className="text-xs text-text-secondary uppercase">Active Departments</span>
          <div className="stat-value">{departments.filter((d) => d.is_active).length}</div>
          <span className="stat-label">Specialist divisions</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-text-secondary uppercase">Medical Staff</span>
          <div className="stat-value text-accent">{totalDoctorsCount}</div>
          <span className="stat-label">Doctors assigned</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-text-secondary uppercase">Total Bed Capacity</span>
          <div className="stat-value">{totalBedsCount}</div>
          <span className="stat-label">Distributed beds</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-text-secondary uppercase">Operational Status</span>
          <div className="stat-value text-positive">100%</div>
          <span className="stat-label">Divisions active</span>
        </div>
      </div>

      {loading ? (
        <CardSkeleton count={6} />
      ) : departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Departments Configured"
          description="Create your first clinical department to start onboarding doctors and allocating beds."
          action={
            <button onClick={openCreateModal} className="btn btn-primary btn-sm">
              Create First Department
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept) => {
            const isExpanded = expandedDeptId === dept.department_id;
            return (
              <div
                key={dept.department_id}
                className="card p-5 space-y-4 flex flex-col justify-between hover:border-accent/40 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-text-primary">{dept.department_name}</h2>
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-1">
                        <MapPin size={12} />
                        {dept.location || 'Location unassigned'}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        dept.is_active ? 'bg-positive-light text-positive' : 'bg-critical-light text-critical'
                      }`}
                    >
                      {dept.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary mt-2 line-clamp-2">
                    {dept.description || 'No formal description provided.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-border space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-secondary flex items-center gap-1">
                        <Phone size={12} /> Contact Extension:
                      </span>
                      <span className="font-mono text-text-primary">{dept.contact_number || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary flex items-center gap-1">
                        <Stethoscope size={12} /> Head of Dept:
                      </span>
                      <span className="font-medium text-accent">{dept.head_doctor_name || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary flex items-center gap-1">
                        <Users size={12} /> Doctors on Duty:
                      </span>
                      <span className="font-semibold text-text-primary">{dept.doctor_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary flex items-center gap-1">
                        <BedDouble size={12} /> Allocated Beds:
                      </span>
                      <span className="font-semibold text-text-primary">
                        {dept.available_beds || 0} free / {dept.bed_count || 0} total
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions & Doctor Drawer */}
                <div className="pt-3 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleExpand(dept.department_id)}
                      className="btn btn-ghost btn-sm text-xs flex items-center gap-1 px-1.5"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} /> Hide Staff
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} /> View Doctors ({dept.doctor_count || 0})
                        </>
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(dept)}
                        className="btn btn-ghost btn-sm p-1.5 text-text-secondary hover:text-text-primary"
                        title="Edit Department"
                      >
                        <Edit2 size={14} />
                      </button>
                      {dept.is_active ? (
                        <button
                          onClick={() => setDeactivatingDept(dept)}
                          className="btn btn-ghost btn-sm p-1.5 text-text-secondary hover:text-critical"
                          title="Deactivate Department"
                        >
                          <PowerOff size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(dept)}
                          className="btn btn-ghost btn-sm p-1.5 text-positive hover:bg-positive-light"
                          title="Reactivate Department"
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setDeletingDept(dept)}
                        className="btn btn-ghost btn-sm p-1.5 text-text-secondary hover:text-critical"
                        title="Delete Department"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded doctors list */}
                  {isExpanded && (
                    <div className="p-3 bg-bg rounded border border-border space-y-2 animate-fadeIn">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block">
                        Assigned Medical Specialists
                      </span>
                      {loadingDoctors ? (
                        <div className="text-xs text-text-secondary py-2">Loading physicians...</div>
                      ) : deptDoctors.length === 0 ? (
                        <div className="text-xs text-text-secondary py-1">No doctors currently in this department.</div>
                      ) : (
                        <ul className="space-y-1.5">
                          {deptDoctors.map((doc) => (
                            <li key={doc.doctor_id} className="text-xs flex items-center justify-between">
                              <span className="font-medium text-text-primary">{doc.full_name}</span>
                              <span className="text-[11px] text-text-secondary">{doc.specialisation}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Department Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDept ? `Edit Department: ${editingDept.department_name}` : 'Create Clinical Department'}
        maxWidth={500}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">Department Name *</label>
            <input
              type="text"
              placeholder="e.g. Cardiology, Orthopaedics, Paediatrics"
              className={`form-input ${errors.department_name ? 'error' : ''}`}
              {...register('department_name', { required: 'Department name is required' })}
            />
            {errors.department_name && <p className="form-error">{errors.department_name.message}</p>}
          </div>

          <div>
            <label className="form-label">Location / Building Floor</label>
            <input
              type="text"
              placeholder="e.g. Block B, Floor 2, Room 204"
              className="form-input"
              {...register('location')}
            />
          </div>

          <div>
            <label className="form-label">Contact Number / Direct Extension</label>
            <input
              type="text"
              placeholder="e.g. 080-1111-0002"
              className="form-input"
              {...register('contact_number')}
            />
          </div>

          <div>
            <label className="form-label">Head of Department (Lead Physician)</label>
            <select className="form-select" {...register('head_doctor_id')}>
              <option value="">Select head physician...</option>
              {doctors.map((d) => (
                <option key={d.doctor_id} value={d.doctor_id}>
                  {d.full_name} ({d.specialisation})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Clinical Scope & Description</label>
            <textarea
              rows={3}
              placeholder="Summary of medical procedures and inpatient care provided by this specialty"
              className="form-textarea"
              {...register('description')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
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
              {isSubmitting ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deactivatingDept)}
        onClose={() => setDeactivatingDept(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Department"
        message={`Are you sure you want to deactivate ${deactivatingDept?.department_name}? Deactivation will fail if any patient is currently admitted under this department.`}
        confirmLabel="Deactivate Department"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingDept)}
        onClose={() => setDeletingDept(null)}
        onConfirm={handleDelete}
        title="Permanently Delete Department"
        message={`Are you sure you want to permanently delete '${deletingDept?.department_name}'? If doctors, beds, or consultations are assigned to this department, PostgreSQL foreign key constraints will safely block deletion.`}
        confirmLabel="Delete Department"
        confirmClass="btn-danger"
        isLoading={deletingLoading}
      />
    </div>
  );
}
