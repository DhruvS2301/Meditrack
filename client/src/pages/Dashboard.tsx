import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import {
  Users,
  Calendar,
  BedDouble,
  CreditCard,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Building2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { dashboardService, appointmentService } from '../services';
import { DashboardSummary, Appointment } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';

interface DeptWorkload {
  department_name: string;
  appointment_count: string | number;
  completed_count: string | number;
}

interface OccupancyData {
  by_department: Array<{
    department_name: string;
    total_beds: string | number;
    occupied_beds: string | number;
    available_beds: string | number;
  }>;
  overall: {
    total: string | number;
    occupied: string | number;
    available: string | number;
  };
}

export default function Dashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [workload, setWorkload] = useState<DeptWorkload[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancyData | null>(null);

  const statsContainerRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, apptRes, workRes, occRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getAppointments(),
        dashboardService.getDepartmentWorkload(),
        dashboardService.getOccupancy(),
      ]);
      setSummary(sumRes);
      setTodayAppointments(apptRes);
      setWorkload(workRes);
      setOccupancy(occRes);
    } catch (err: any) {
      toast('error', 'Failed to load dashboard data', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!loading && statsContainerRef.current) {
      const ctx = gsap.context(() => {
        gsap.from('.stat-card', {
          y: 20,
          opacity: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out',
        });
      }, statsContainerRef);
      return () => ctx.revert();
    }
  }, [loading]);

  const handleQuickStatus = async (id: number, status: string) => {
    try {
      await appointmentService.updateStatus(id, status);
      toast('success', 'Appointment updated', `Status changed to ${status}`);
      fetchDashboardData();
    } catch (err: any) {
      toast('error', 'Update failed', err.message);
    }
  };

  const totalBedsNum = Number(occupancy?.overall?.total || 0);
  const occupiedBedsNum = Number(occupancy?.overall?.occupied || 0);
  const availableBedsNum = Number(occupancy?.overall?.available || 0);
  const occupancyPercent = totalBedsNum > 0 ? Math.round((occupiedBedsNum / totalBedsNum) * 100) : 0;

  const pieData = [
    { name: 'Occupied', value: occupiedBedsNum, color: '#B74B43' },
    { name: 'Available', value: availableBedsNum, color: '#315C48' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Clinical Operations Overview
          </h1>
          <p className="text-sm text-text-secondary">
            Live hospital metrics, bed occupancy, and today's consultation schedule.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-positive-light text-positive">
            <span className="w-2 h-2 rounded-full bg-positive animate-pulse" />
            Live PostgreSQL Connected
          </span>
          <button
            onClick={fetchDashboardData}
            className="btn btn-secondary btn-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <CardSkeleton count={6} />
      ) : (
        <div ref={statsContainerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="stat-card">
            <div className="flex items-center justify-between text-text-secondary mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Patients</span>
              <div className="p-1.5 rounded bg-accent-light text-accent">
                <Users size={16} />
              </div>
            </div>
            <div className="stat-value">{summary?.total_patients ?? 0}</div>
            <div className="stat-label">Active registered records</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between text-text-secondary mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Today's Visits</span>
              <div className="p-1.5 rounded bg-accent-light text-accent">
                <Calendar size={16} />
              </div>
            </div>
            <div className="stat-value">{summary?.todays_appointments ?? 0}</div>
            <div className="stat-label">Scheduled consultations</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between text-text-secondary mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Inpatients</span>
              <div className="p-1.5 rounded bg-accent-light text-accent">
                <BedDouble size={16} />
              </div>
            </div>
            <div className="stat-value">{summary?.active_admissions ?? 0}</div>
            <div className="stat-label">Currently admitted</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between text-text-secondary mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Beds Free</span>
              <div className="p-1.5 rounded bg-accent-light text-accent">
                <Activity size={16} />
              </div>
            </div>
            <div className="stat-value text-positive">
              {summary?.available_beds ?? 0}
              <span className="text-xs font-normal text-text-secondary ml-1">/ {summary?.total_beds ?? 0}</span>
            </div>
            <div className="stat-label">Ready for admission</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between text-text-secondary mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Pending Bills</span>
              <div className="p-1.5 rounded bg-warning-light text-warning">
                <CreditCard size={16} />
              </div>
            </div>
            <div className="stat-value text-warning">{summary?.pending_bills ?? 0}</div>
            <div className="stat-label">Awaiting settlement</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between text-text-secondary mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">30-Day Revenue</span>
              <div className="p-1.5 rounded bg-positive-light text-positive">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="stat-value text-text-primary">
              ₹{(summary?.revenue_30d ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="stat-label">Realised payments</div>
          </div>
        </div>
      )}

      {/* Main Grid: Schedule & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Appointments */}
        <div className="lg:col-span-2 card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Today's Appointment Schedule</h2>
              <p className="text-xs text-text-secondary">Real-time status updates and patient queue</p>
            </div>
            <span className="text-xs text-text-secondary font-medium">
              {todayAppointments.length} Appointments Today
            </span>
          </div>

          {loading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : todayAppointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No Appointments Today"
              description="There are no consultations scheduled for the current hospital date."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Doctor & Dept</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Quick Action</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAppointments.map((apt) => (
                    <tr key={apt.appointment_id}>
                      <td className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-text-primary">
                          <Clock size={13} className="text-text-secondary" />
                          {new Date(apt.appointment_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium text-text-primary">{apt.patient_name}</div>
                        <div className="text-xs text-text-secondary">{apt.patient_code}</div>
                      </td>
                      <td>
                        <div className="text-text-primary font-medium">{apt.doctor_name}</div>
                        <div className="text-xs text-text-secondary">{apt.department_name}</div>
                      </td>
                      <td className="max-w-[180px] truncate text-xs text-text-secondary">
                        {apt.reason || 'General checkup'}
                      </td>
                      <td>
                        <StatusBadge status={apt.status} />
                      </td>
                      <td>
                        {apt.status === 'Scheduled' && (
                          <button
                            onClick={() => handleQuickStatus(apt.appointment_id, 'Checked In')}
                            className="btn btn-secondary btn-sm"
                          >
                            Check In
                          </button>
                        )}
                        {apt.status === 'Checked In' && (
                          <button
                            onClick={() => handleQuickStatus(apt.appointment_id, 'In Progress')}
                            className="btn btn-primary btn-sm"
                          >
                            Start
                          </button>
                        )}
                        {apt.status === 'In Progress' && (
                          <button
                            onClick={() => handleQuickStatus(apt.appointment_id, 'Completed')}
                            className="btn btn-secondary btn-sm text-positive border-positive"
                          >
                            Complete
                          </button>
                        )}
                        {['Completed', 'Cancelled', 'No Show'].includes(apt.status) && (
                          <span className="text-xs text-text-secondary">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Col: Bed Occupancy Gauge & Stats */}
        <div className="card p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Bed Occupancy Rate</h2>
              <p className="text-xs text-text-secondary">Inpatient facility utilization</p>
            </div>
            <span className="text-sm font-bold text-accent">{occupancyPercent}%</span>
          </div>

          <div className="h-44 flex items-center justify-center">
            {totalBedsNum > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} Beds`, '']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-text-secondary">No bed records loaded</div>
            )}
          </div>

          <div className="space-y-2.5 pt-2 border-t border-border">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B74B43]" />
                Occupied Beds
              </span>
              <span className="font-semibold text-text-primary">{occupiedBedsNum}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#315C48]" />
                Available Beds
              </span>
              <span className="font-semibold text-positive">{availableBedsNum}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-border pt-2">
              <span className="text-text-secondary">Total Inpatient Capacity</span>
              <span className="font-semibold text-text-primary">{totalBedsNum}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Department Workload Chart */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Department Workload Distribution</h2>
            <p className="text-xs text-text-secondary">Appointment counts across medical departments (past 30 days)</p>
          </div>
          <div className="text-xs font-medium text-text-secondary flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-[#315C48] rounded-sm inline-block" /> Total Scheduled
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-[#6A9E85] rounded-sm inline-block" /> Completed
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          {workload.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-text-secondary">
              No department workload data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workload} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis
                  dataKey="department_name"
                  tick={{ fontSize: 11, fill: '#747C75' }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#747C75' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E6DF',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="appointment_count" name="Total Appointments" fill="#315C48" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed_count" name="Completed" fill="#6A9E85" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
