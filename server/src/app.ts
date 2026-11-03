import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

import { errorHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import dashboardRouter from './routes/dashboard';
import patientsRouter from './routes/patients';
import appointmentsRouter from './routes/appointments';
import doctorsRouter from './routes/doctors';
import departmentsRouter from './routes/departments';
import { bedsRouter, admissionsRouter } from './routes/bedsAndAdmissions';
import prescriptionsRouter from './routes/prescriptions';
import billingRouter from './routes/billing';
import reportsRouter from './routes/reports';
import auditLogsRouter from './routes/auditLogs';

const app = express();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({
  origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/doctors', doctorsRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/beds', bedsRouter);
app.use('/api/admissions', admissionsRouter);
app.use('/api/prescriptions', prescriptionsRouter);
app.use('/api/bills', billingRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/audit-logs', auditLogsRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

export default app;
