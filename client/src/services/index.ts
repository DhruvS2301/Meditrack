import api from './api';

export const dashboardService = {
  getSummary: () => api.get('/dashboard/summary').then(r => r.data.data),
  getAppointments: () => api.get('/dashboard/appointments').then(r => r.data.data),
  getOccupancy: () => api.get('/dashboard/occupancy').then(r => r.data.data),
  getRevenue: () => api.get('/dashboard/revenue').then(r => r.data.data),
  getDepartmentWorkload: () => api.get('/dashboard/department-workload').then(r => r.data.data),
};

export const patientService = {
  getAll: (params?: Record<string, unknown>) => api.get('/patients', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/patients/${id}`).then(r => r.data.data),
  create: (data: unknown) => api.post('/patients', data).then(r => r.data.data),
  update: (id: number, data: unknown) => api.patch(`/patients/${id}`, data).then(r => r.data.data),
  deactivate: (id: number) => api.patch(`/patients/${id}/deactivate`).then(r => r.data.data),
  activate: (id: number) => api.patch(`/patients/${id}/activate`).then(r => r.data.data),
  delete: (id: number) => api.delete(`/patients/${id}`).then(r => r.data),
  getAppointments: (id: number) => api.get(`/patients/${id}/appointments`).then(r => r.data.data),
  getAdmissions: (id: number) => api.get(`/patients/${id}/admissions`).then(r => r.data.data),
  getPrescriptions: (id: number) => api.get(`/patients/${id}/prescriptions`).then(r => r.data.data),
  getBills: (id: number) => api.get(`/patients/${id}/bills`).then(r => r.data.data),
};

export const appointmentService = {
  getAll: (params?: Record<string, unknown>) => api.get('/appointments', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/appointments/${id}`).then(r => r.data.data),
  create: (data: unknown) => api.post('/appointments', data).then(r => r.data.data),
  update: (id: number, data: unknown) => api.patch(`/appointments/${id}`, data).then(r => r.data.data),
  updateStatus: (id: number, status: string) => api.patch(`/appointments/${id}/status`, { status }).then(r => r.data.data),
  cancel: (id: number) => api.post(`/appointments/${id}/cancel`).then(r => r.data.data),
  delete: (id: number) => api.delete(`/appointments/${id}`).then(r => r.data),
};

export const doctorService = {
  getAll: (params?: Record<string, unknown>) => api.get('/doctors', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/doctors/${id}`).then(r => r.data.data),
  create: (data: unknown) => api.post('/doctors', data).then(r => r.data.data),
  update: (id: number, data: unknown) => api.patch(`/doctors/${id}`, data).then(r => r.data.data),
  deactivate: (id: number) => api.patch(`/doctors/${id}/deactivate`).then(r => r.data.data),
  activate: (id: number) => api.patch(`/doctors/${id}/activate`).then(r => r.data.data),
  delete: (id: number) => api.delete(`/doctors/${id}`).then(r => r.data),
  getAppointments: (id: number) => api.get(`/doctors/${id}/appointments`).then(r => r.data.data),
  getAvailability: (id: number, date?: string) => api.get(`/doctors/${id}/availability`, { params: { date } }).then(r => r.data),
};

export const departmentService = {
  getAll: (params?: Record<string, unknown>) => api.get('/departments', { params }).then(r => r.data.data),
  getById: (id: number) => api.get(`/departments/${id}`).then(r => r.data.data),
  create: (data: unknown) => api.post('/departments', data).then(r => r.data.data),
  update: (id: number, data: unknown) => api.patch(`/departments/${id}`, data).then(r => r.data.data),
  deactivate: (id: number) => api.patch(`/departments/${id}/deactivate`).then(r => r.data.data),
  activate: (id: number) => api.patch(`/departments/${id}/activate`).then(r => r.data.data),
  delete: (id: number) => api.delete(`/departments/${id}`).then(r => r.data),
};

export const bedService = {
  getAll: (params?: Record<string, unknown>) => api.get('/beds', { params }).then(r => r.data.data),
  getById: (id: number) => api.get(`/beds/${id}`).then(r => r.data.data),
  getAvailability: () => api.get('/beds/availability').then(r => r.data.data),
  create: (data: unknown) => api.post('/beds', data).then(r => r.data.data),
  update: (id: number, data: unknown) => api.patch(`/beds/${id}`, data).then(r => r.data.data),
  delete: (id: number) => api.delete(`/beds/${id}`).then(r => r.data),
};

export const admissionService = {
  getAll: (params?: Record<string, unknown>) => api.get('/admissions', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/admissions/${id}`).then(r => r.data.data),
  create: (data: unknown) => api.post('/admissions', data).then(r => r.data.data),
  update: (id: number, data: unknown) => api.patch(`/admissions/${id}`, data).then(r => r.data.data),
  discharge: (id: number, data: unknown) => api.post(`/admissions/${id}/discharge`, data).then(r => r.data.data),
  delete: (id: number) => api.delete(`/admissions/${id}`).then(r => r.data),
};

export const prescriptionService = {
  getAll: (params?: Record<string, unknown>) => api.get('/prescriptions', { params }).then(r => r.data.data),
  getById: (id: number) => api.get(`/prescriptions/${id}`).then(r => r.data.data),
  create: (data: unknown) => api.post('/prescriptions', data).then(r => r.data.data),
  update: (id: number, data: unknown) => api.patch(`/prescriptions/${id}`, data).then(r => r.data.data),
  finalise: (id: number) => api.post(`/prescriptions/${id}/finalise`).then(r => r.data.data),
  delete: (id: number) => api.delete(`/prescriptions/${id}`).then(r => r.data),
};

export const billService = {
  getAll: (params?: Record<string, unknown>) => api.get('/bills', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/bills/${id}`).then(r => r.data.data),
  create: (data: unknown) => api.post('/bills', data).then(r => r.data.data),
  update: (id: number, data: unknown) => api.patch(`/bills/${id}`, data).then(r => r.data.data),
  delete: (id: number) => api.delete(`/bills/${id}`).then(r => r.data),
  getPayments: (id: number) => api.get(`/bills/${id}/payments`).then(r => r.data.data),
  addPayment: (id: number, data: unknown) => api.post(`/bills/${id}/payments`, data).then(r => r.data.data),
};

export const reportService = {
  getAppointments: (params?: Record<string, unknown>) => api.get('/reports/appointments', { params }).then(r => r.data.data),
  getDoctorWorkload: (params?: Record<string, unknown>) => api.get('/reports/doctor-workload', { params }).then(r => r.data.data),
  getDepartments: (params?: Record<string, unknown>) => api.get('/reports/departments', { params }).then(r => r.data.data),
  getPatientRegistrations: (params?: Record<string, unknown>) => api.get('/reports/patient-registrations', { params }).then(r => r.data.data),
  getOccupancy: () => api.get('/reports/occupancy').then(r => r.data.data),
  getAdmissions: (params?: Record<string, unknown>) => api.get('/reports/admissions', { params }).then(r => r.data.data),
  getRevenue: (params?: Record<string, unknown>) => api.get('/reports/revenue', { params }).then(r => r.data.data),
  getBilling: (params?: Record<string, unknown>) => api.get('/reports/billing', { params }).then(r => r.data.data),
  getPrescriptions: (params?: Record<string, unknown>) => api.get('/reports/prescriptions', { params }).then(r => r.data.data),
};

export const auditService = {
  getAll: (params?: Record<string, unknown>) => api.get('/audit-logs', { params }).then(r => r.data.data),
};
