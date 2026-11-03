import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  ShieldCheck,
  Activity,
  History,
  Server,
  RefreshCw,
  Terminal,
  Layers,
  FileCode
} from 'lucide-react';
import api from '../services/api';
import { auditService } from '../services';
import { AuditLog } from '../types';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../hooks/useToast';

export default function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'system' | 'audit' | 'database'>('system');

  // Health state
  const [health, setHealth] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const checkHealth = async () => {
    try {
      setLoadingHealth(true);
      const res = await api.get('/health');
      setHealth(res.data);
    } catch (err: any) {
      setHealth({ success: false, status: 'unhealthy', error: err.message });
      toast('error', 'Health check failed', err.message);
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const res = await auditService.getAll({ limit: 50 });
      setAuditLogs(res || []);
    } catch (err: any) {
      toast('error', 'Failed to fetch audit logs', err.message);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchAuditLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">System Administration & Database Settings</h1>
          <p className="text-sm text-text-secondary">
            Inspect live PostgreSQL connection status, review entity audit logs, and explore database configuration.
          </p>
        </div>
        <button onClick={checkHealth} className="btn btn-secondary btn-sm flex items-center gap-1.5">
          <RefreshCw size={14} className={loadingHealth ? 'animate-spin' : ''} />
          Ping Database
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            activeTab === 'system' ? 'bg-accent text-white font-semibold' : 'text-text-secondary hover:bg-bg'
          }`}
        >
          <Server size={14} /> System Health & Status
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            activeTab === 'audit' ? 'bg-accent text-white font-semibold' : 'text-text-secondary hover:bg-bg'
          }`}
        >
          <History size={14} /> Audit Log Ledger ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            activeTab === 'database' ? 'bg-accent text-white font-semibold' : 'text-text-secondary hover:bg-bg'
          }`}
        >
          <Database size={14} /> Schema & viva Demonstration
        </button>
      </div>

      {/* TAB 1: System Health */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="stat-card">
              <span className="text-xs text-text-secondary uppercase">Database Connectivity</span>
              <div className="stat-value text-positive flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-positive animate-pulse" />
                {health?.database === 'connected' ? 'Connected' : 'Checking...'}
              </div>
              <span className="stat-label">PostgreSQL connection pool active</span>
            </div>

            <div className="stat-card">
              <span className="text-xs text-text-secondary uppercase">Server Health Status</span>
              <div className="stat-value text-accent uppercase">
                {health?.status || 'Active'}
              </div>
              <span className="stat-label">Express REST API operational</span>
            </div>

            <div className="stat-card">
              <span className="text-xs text-text-secondary uppercase">DBMS Engine Version</span>
              <div className="stat-value text-sm font-mono truncate text-text-primary">
                {health?.db_version || 'PostgreSQL 18.x'}
              </div>
              <span className="stat-label">Verified relational engine</span>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="text-base font-semibold text-text-primary">Architecture & Environment Parameters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-bg rounded border border-border space-y-1">
                <span className="text-text-secondary block font-semibold">Backend Runtime:</span>
                <span className="font-mono text-text-primary">Node.js Express + TypeScript</span>
              </div>
              <div className="p-3 bg-bg rounded border border-border space-y-1">
                <span className="text-text-secondary block font-semibold">Relational Database Client:</span>
                <span className="font-mono text-text-primary">Node-Postgres (pg Pool with connection pooling)</span>
              </div>
              <div className="p-3 bg-bg rounded border border-border space-y-1">
                <span className="text-text-secondary block font-semibold">Validation Engine:</span>
                <span className="font-mono text-text-primary">Zod (Server & Client Synchronized Schemas)</span>
              </div>
              <div className="p-3 bg-bg rounded border border-border space-y-1">
                <span className="text-text-secondary block font-semibold">Frontend Architecture:</span>
                <span className="font-mono text-text-primary">React 18 + Vite + Tailwind CSS + GSAP</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="card overflow-hidden space-y-4">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Audit Log Ledger</h3>
              <p className="text-xs text-text-secondary">
                Immutable audit trail recording all INSERT, UPDATE, and STATUS_CHANGE operations across entities.
              </p>
            </div>
            <button onClick={fetchAuditLogs} className="btn btn-secondary btn-sm text-xs">
              Refresh Audit Log
            </button>
          </div>

          {loadingAudit ? (
            <TableSkeleton rows={8} cols={5} />
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-secondary">
              No audit log entries recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Entity Type</th>
                    <th>Entity ID</th>
                    <th>Action</th>
                    <th>Timestamp</th>
                    <th>Audit Details Snapshot</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.audit_id}>
                      <td className="font-mono text-xs font-semibold text-text-secondary">#{log.audit_id}</td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-bg text-text-primary">
                          {log.entity_type}
                        </span>
                      </td>
                      <td className="font-mono text-xs">{log.entity_id}</td>
                      <td>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            log.action_type === 'INSERT'
                              ? 'bg-positive-light text-positive'
                              : log.action_type === 'CANCEL' || log.action_type === 'DEACTIVATE'
                              ? 'bg-critical-light text-critical'
                              : 'bg-warning-light text-warning'
                          }`}
                        >
                          {log.action_type}
                        </span>
                      </td>
                      <td className="text-xs text-text-secondary">
                        {new Date(log.changed_at).toLocaleString()}
                      </td>
                      <td className="max-w-xs truncate text-[11px] font-mono text-text-secondary">
                        {JSON.stringify(log.new_values || log.old_values)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Database & Viva Guide */}
      {activeTab === 'database' && (
        <div className="card p-5 space-y-6">
          <div className="border-b border-border pb-3">
            <h3 className="text-base font-semibold text-text-primary">PostgreSQL Schema & pgAdmin 4 Inspection Guide</h3>
            <p className="text-xs text-text-secondary">
              Instructions for demonstrating database integrity, constraints, triggers, and transactions during course viva.
            </p>
          </div>

          <div className="space-y-4 text-xs text-text-secondary leading-relaxed">
            <div className="p-4 bg-bg rounded border border-border space-y-2">
              <h4 className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                <Database size={15} className="text-accent" />
                How to Connect pgAdmin 4 to MediTrack
              </h4>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Open <strong>pgAdmin 4</strong> on your machine.</li>
                <li>Right-click <strong>Servers</strong> &rarr; <strong>Register</strong> &rarr; <strong>Server</strong>.</li>
                <li>In <em>General</em> tab, set Name to <code className="text-accent font-mono font-bold">MediTrack Local</code>.</li>
                <li>In <em>Connection</em> tab, set Host: <code className="text-accent font-mono font-bold">localhost</code>, Port: <code className="text-accent font-mono font-bold">5432</code>, Username: <code className="text-accent font-mono font-bold">postgres</code>.</li>
                <li>Expand <code className="font-mono">Databases &rarr; meditrack &rarr; Schemas &rarr; public &rarr; Tables</code> to view all 12 tables.</li>
              </ol>
            </div>

            <div className="p-4 bg-bg rounded border border-border space-y-2">
              <h4 className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-accent" />
                Key Relational Constraints Enforced at Database Level
              </h4>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li><strong>Anti-Double-Booking Constraint:</strong> GiST exclusion constraint on <code className="font-mono font-semibold">appointments(doctor_id, tstzrange(appointment_start, appointment_end))</code> prevents overlapping consultations for active doctors.</li>
                <li><strong>Single Active Bed Occupancy:</strong> Partial unique index on <code className="font-mono font-semibold">admissions(bed_id) WHERE status = 'Active'</code> prevents two simultaneous inpatients from sharing a bed.</li>
                <li><strong>Entity Sequences:</strong> Auto-generating format triggers: <code className="font-mono font-semibold">PAT-000001</code>, <code className="font-mono font-semibold">DOC-000001</code>, <code className="font-mono font-semibold">APT-000001</code>, <code className="font-mono font-semibold">ADM-000001</code>, <code className="font-mono font-semibold">BILL-000001</code>.</li>
                <li><strong>Referential Integrity:</strong> Foreign keys use <code className="font-mono font-semibold">ON DELETE RESTRICT</code> on patients and doctors to preserve historical billing, prescriptions, and admission records.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
