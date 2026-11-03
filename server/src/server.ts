import app from './app';
import pool from './db/pool';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    // Test DB connection
    const result = await pool.query('SELECT 1');
    if (result.rows.length) {
      console.log('✓ Database connection established');
    }
  } catch (err) {
    console.error('✗ Database connection failed:', err);
    console.log('  Server will start but database operations will fail.');
    console.log('  Check your .env configuration and PostgreSQL server.');
  }

  app.listen(PORT, () => {
    console.log(`✓ MediTrack API server running on http://localhost:${PORT}`);
    console.log(`  Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer();
