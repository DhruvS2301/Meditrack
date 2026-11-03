import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Users,
  BedDouble,
  CreditCard,
  FileText,
  Stethoscope,
  Building2,
  Filter,
  RefreshCw,
  PieChart as PieIcon,
  ChevronRight,
  Database
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { reportService } from '../services';
import { TableSkeleton, CardSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../hooks/useToast';

const COLORS = ['#315C48', '#B78035', '#367653', '#B74B43', '#4A7C65', '#8E6E53', '#6A9E85'];

export default function Reports() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'appointments' | 'workload' | 'departments' | 'admissions' | 'revenue' | 'prescriptions' | 'sql'>('revenue');

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Report state data
  const [loading, setLoading] = useState(true);
  const [apptReport, setApptReport] = useState<any>(null);
  const [workloadReport, setWorkloadReport] = useState<any[]>([]);
  const [deptReport, setDeptReport] = useState<any[]>([]);
  const [occupancyReport, setOccupancyReport] = useState<any>(null);
  const [admissionReport, setAdmissionReport] = useState<any>(null);
  const [revenueReport, setRevenueReport] = useState<any>(null);
  const [billingReport, setBillingReport] = useState<any>(null);
  const [prescriptionReport, setPrescriptionReport] = useState<any>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = { date_from: dateFrom, date_to: dateTo };
      const [appts, workload, depts, occ, adms, rev, bill, rx] = await Promise.all([
        reportService.getAppointments(params),
        reportService.getDoctorWorkload(params),
        reportService.getDepartments(params),
        reportService.getOccupancy(),
        reportService.getAdmissions(params),
        reportService.getRevenue(params),
        reportService.getBilling(params),
        reportService.getPrescriptions(params),
      ]);
      setApptReport(appts);
      setWorkloadReport(workload);
      setDeptReport(depts);
      setOccupancyReport(occ);
      setAdmissionReport(adms);
      setRevenueReport(rev);
      setBillingReport(bill);
      setPrescriptionReport(rx);
    } catch (err: any) {
      toast('error', 'Failed to generate reports', err.message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, toast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Hospital Analytics & DBMS Reports</h1>
          <p className="text-sm text-text-secondary">
            Aggregated operational analytics powered entirely by PostgreSQL server-side relational queries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="form-input text-xs"
          />
          <span className="text-xs text-text-secondary">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="form-input text-xs"
          />
          <button onClick={fetchReports} className="btn btn-secondary btn-sm">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-2 text-xs font-medium">
        {[
          { id: 'revenue', label: 'Financial & Revenue', icon: CreditCard },
          { id: 'appointments', label: 'Appointment Statistics', icon: Calendar },
          { id: 'workload', label: 'Doctor Workload', icon: Stethoscope },
          { id: 'departments', label: 'Department Utilisation', icon: Building2 },
          { id: 'admissions', label: 'Inpatient & LOS', icon: BedDouble },
          { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
          { id: 'sql', label: 'DBMS Viva SQL Guide', icon: Database },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded transition-colors ${
              activeTab === id
                ? 'bg-accent text-white font-semibold'
                : 'text-text-secondary hover:bg-bg hover:text-text-primary'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="space-y-6">
          {/* TAB: REVENUE & BILLING */}
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="stat-card">
                  <span className="text-xs text-text-secondary uppercase">Gross Billed</span>
                  <div className="stat-value">
                    ₹{Number(revenueReport?.summary?.total_billed || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <span className="stat-label">Invoices in period</span>
                </div>
                <div className="stat-card">
                  <span className="text-xs text-text-secondary uppercase">Realised Revenue</span>
                  <div className="stat-value text-positive">
                    ₹{Number(revenueReport?.summary?.total_collected || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <span className="stat-label">Successful payments</span>
                </div>
                <div className="stat-card">
                  <span className="text-xs text-text-secondary uppercase">Outstanding Balance</span>
                  <div className="stat-value text-critical">
                    ₹{Number(revenueReport?.summary?.outstanding || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <span className="stat-label">Unsettled invoices</span>
                </div>
                <div className="stat-card">
                  <span className="text-xs text-text-secondary uppercase">Average Bill</span>
                  <div className="stat-value">
                    ₹{Number(billingReport?.stats?.avg_bill || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <span className="stat-label">Mean invoice charge</span>
                </div>
              </div>

              {/* Monthly Revenue Chart */}
              <div className="card p-5 space-y-4">
                <h3 className="text-base font-semibold text-text-primary">Monthly Revenue Trajectory</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueReport?.monthly || []}>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#315C48" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Payment Method Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-5 space-y-4">
                  <h3 className="text-base font-semibold text-text-primary">Payment Channels</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={billingReport?.by_method || []}
                          dataKey="total"
                          nameKey="payment_method"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                        >
                          {(billingReport?.by_method || []).map((_: any, idx: number) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, 'Total']} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card p-5 space-y-3">
                  <h3 className="text-base font-semibold text-text-primary">Payment Channel Breakdown</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Method</th>
                        <th>Transactions</th>
                        <th className="text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(billingReport?.by_method || []).map((m: any) => (
                        <tr key={m.payment_method}>
                          <td className="font-medium">{m.payment_method}</td>
                          <td>{m.count}</td>
                          <td className="text-right font-semibold">₹{Number(m.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: APPOINTMENTS */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="stat-card">
                  <span className="text-xs text-text-secondary uppercase">Total Consultations</span>
                  <div className="stat-value">{apptReport?.summary?.total || 0}</div>
                  <span className="stat-label">Scheduled in range</span>
                </div>
                <div className="stat-card">
                  <span className="text-xs text-text-secondary uppercase">Completed</span>
                  <div className="stat-value text-positive">{apptReport?.summary?.completed || 0}</div>
                  <span className="stat-label">Successfully attended</span>
                </div>
                <div className="stat-card">
                  <span className="text-xs text-text-secondary uppercase">Completion Rate</span>
                  <div className="stat-value text-accent">{apptReport?.summary?.completion_rate || 0}%</div>
                  <span className="stat-label">Attended ratio</span>
                </div>
                <div className="stat-card">
                  <span className="text-xs text-text-secondary uppercase">Cancelled / No-Show</span>
                  <div className="stat-value text-critical">
                    {(Number(apptReport?.summary?.cancelled) || 0) + (Number(apptReport?.summary?.no_show) || 0)}
                  </div>
                  <span className="stat-label">Missed consultations</span>
                </div>
              </div>

              <div className="card p-5 space-y-4">
                <h3 className="text-base font-semibold text-text-primary">Consultation Volume by Day</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={apptReport?.by_day || []}>
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#315C48" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DOCTOR WORKLOAD */}
          {activeTab === 'workload' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-base font-semibold text-text-primary">Doctor Workload & Productivity</h3>
                <p className="text-xs text-text-secondary">Appointment volumes and completion breakdown per physician</p>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Specialisation / Dept</th>
                      <th>Total Appointments</th>
                      <th>Completed</th>
                      <th>Upcoming</th>
                      <th>Completion %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workloadReport.map((doc: any) => {
                      const total = Number(doc.total_appointments) || 0;
                      const comp = Number(doc.completed) || 0;
                      const rate = total > 0 ? Math.round((comp / total) * 100) : 0;
                      return (
                        <tr key={doc.doctor_id}>
                          <td className="font-medium text-text-primary">{doc.doctor_name}</td>
                          <td>{doc.department_name}</td>
                          <td className="font-bold">{total}</td>
                          <td className="text-positive font-semibold">{comp}</td>
                          <td className="text-accent">{doc.upcoming || 0}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 rounded bg-bg overflow-hidden">
                                <div className="h-full bg-accent" style={{ width: `${rate}%` }} />
                              </div>
                              <span className="text-xs text-text-secondary">{rate}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: DEPARTMENTS */}
          {activeTab === 'departments' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-base font-semibold text-text-primary">Department Resource Utilization</h3>
                <p className="text-xs text-text-secondary">Cross-department analysis of appointments, admissions, and beds</p>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Active Doctors</th>
                      <th>Appointments</th>
                      <th>Inpatient Admissions</th>
                      <th>Allocated Beds</th>
                      <th>Free Beds</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptReport.map((dept: any) => (
                      <tr key={dept.department_id}>
                        <td className="font-semibold text-text-primary">{dept.department_name}</td>
                        <td>{dept.active_doctors}</td>
                        <td className="font-medium">{dept.appointments}</td>
                        <td className="font-medium">{dept.admissions}</td>
                        <td>{dept.total_beds}</td>
                        <td className="text-positive font-semibold">{dept.available_beds}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: ADMISSIONS & LENGTH OF STAY */}
          {activeTab === 'admissions' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="stat-card">
                  <span className="text-xs text-text-secondary uppercase">Total Admissions</span>
                  <div className="stat-value">{admissionReport?.stats?.total_admissions || 0}</div>
                  <span className="stat-label">Inpatient encounters</span>
                </div>
                <div className="stat-card">
                  <span className="text-xs text-text-secondary uppercase">Active Inpatients</span>
                  <div className="stat-value text-accent">{admissionReport?.stats?.active_admissions || 0}</div>
                  <span className="stat-label">Currently in beds</span>
                </div>
                <div className="stat-card">
                  <span className="text-xs text-text-secondary uppercase">Average Length of Stay</span>
                  <div className="stat-value text-text-primary">
                    {admissionReport?.stats?.avg_stay_days || 0} <span className="text-xs font-normal">days</span>
                  </div>
                  <span className="stat-label">Mean stay duration</span>
                </div>
                <div className="stat-card">
                  <span className="text-xs text-text-secondary uppercase">Max Length of Stay</span>
                  <div className="stat-value">
                    {admissionReport?.stats?.max_stay_days || 0} <span className="text-xs font-normal">days</span>
                  </div>
                  <span className="stat-label">Longest inpatient stay</span>
                </div>
              </div>

              {/* Monthly Admission Trends */}
              <div className="card p-5 space-y-4">
                <h3 className="text-base font-semibold text-text-primary">Monthly Admission vs Discharge Volume</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={admissionReport?.monthly || []}>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="admissions" name="Admissions" fill="#315C48" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="discharges" name="Discharges" fill="#B78035" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PRESCRIPTIONS */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-6">
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="text-base font-semibold text-text-primary">Prescription Activity by Physician</h3>
                  <p className="text-xs text-text-secondary">Volume of prescriptions and individual medicine items charted</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Department</th>
                        <th>Total Prescriptions</th>
                        <th>Total Medication Items</th>
                        <th>Items per Rx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(prescriptionReport?.by_doctor || []).map((rx: any, idx: number) => {
                        const count = Number(rx.prescription_count) || 0;
                        const items = Number(rx.item_count) || 0;
                        const avg = count > 0 ? (items / count).toFixed(1) : '0';
                        return (
                          <tr key={idx}>
                            <td className="font-medium text-text-primary">{rx.doctor_name}</td>
                            <td>{rx.department_name}</td>
                            <td className="font-semibold">{count}</td>
                            <td className="text-accent font-semibold">{items}</td>
                            <td>{avg}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DBMS VIVA SQL EXPLANATION GUIDE */}
          {activeTab === 'sql' && (
            <div className="card p-5 space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-lg font-bold text-text-primary">DBMS Viva Demonstration & pgAdmin 4 Guide</h3>
                <p className="text-xs text-text-secondary">
                  Ready-to-explain SQL queries powering this platform, designed for examiner demonstration.
                </p>
              </div>

              <div className="space-y-5">
                <div className="p-4 bg-bg rounded border border-border space-y-2">
                  <span className="font-mono text-xs font-bold text-accent uppercase">
                    1. Complex Multi-Table Relational Join
                  </span>
                  <p className="text-xs text-text-secondary">
                    Retrieves full inpatient admission records by joining 5 distinct relational tables:
                  </p>
                  <pre className="p-3 bg-[#1e231f] text-emerald-300 font-mono text-xs rounded overflow-x-auto">
{`SELECT 
  adm.admission_code, p.full_name AS patient, d.full_name AS doctor,
  dept.department_name, b.bed_number, b.ward_name, adm.status
FROM admissions adm
JOIN patients p ON adm.patient_id = p.patient_id
JOIN doctors d ON adm.doctor_id = d.doctor_id
JOIN departments dept ON adm.department_id = dept.department_id
JOIN beds b ON adm.bed_id = b.bed_id
WHERE adm.status = 'Active';`}
                  </pre>
                </div>

                <div className="p-4 bg-bg rounded border border-border space-y-2">
                  <span className="font-mono text-xs font-bold text-accent uppercase">
                    2. Correlated Subquery & NOT EXISTS
                  </span>
                  <p className="text-xs text-text-secondary">
                    Identifies registered patients who have never booked an appointment:
                  </p>
                  <pre className="p-3 bg-[#1e231f] text-emerald-300 font-mono text-xs rounded overflow-x-auto">
{`SELECT p.patient_code, p.full_name, p.phone
FROM patients p
WHERE NOT EXISTS (
  SELECT 1 FROM appointments a WHERE a.patient_id = p.patient_id
);`}
                  </pre>
                </div>

                <div className="p-4 bg-bg rounded border border-border space-y-2">
                  <span className="font-mono text-xs font-bold text-accent uppercase">
                    3. Aggregate GROUP BY with HAVING Clause
                  </span>
                  <p className="text-xs text-text-secondary">
                    Finds doctors with higher than average consultation loads (completed &gt; 2):
                  </p>
                  <pre className="p-3 bg-[#1e231f] text-emerald-300 font-mono text-xs rounded overflow-x-auto">
{`SELECT d.full_name, COUNT(a.appointment_id) AS total_completed
FROM doctors d
JOIN appointments a ON d.doctor_id = a.doctor_id
WHERE a.status = 'Completed'
GROUP BY d.doctor_id, d.full_name
HAVING COUNT(a.appointment_id) >= 2
ORDER BY total_completed DESC;`}
                  </pre>
                </div>

                <div className="p-4 bg-bg rounded border border-border space-y-2">
                  <span className="font-mono text-xs font-bold text-accent uppercase">
                    4. ACID Transaction & Atomic Bed Reservation
                  </span>
                  <p className="text-xs text-text-secondary">
                    How MediTrack executes simultaneous admission and bed status locking inside a single transaction:
                  </p>
                  <pre className="p-3 bg-[#1e231f] text-emerald-300 font-mono text-xs rounded overflow-x-auto">
{`BEGIN;
-- Lock selected bed row to prevent race conditions
SELECT bed_id, bed_status FROM beds WHERE bed_id = 1 FOR UPDATE;

-- Insert admission record
INSERT INTO admissions (patient_id, doctor_id, department_id, bed_id, admission_datetime, admission_reason)
VALUES (2, 2, 2, 1, NOW(), 'Cardiac evaluation');

-- Mark bed as occupied
UPDATE beds SET bed_status = 'Occupied' WHERE bed_id = 1;

COMMIT;`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
