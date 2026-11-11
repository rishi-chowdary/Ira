import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';

import { FRONTEND_ORIGIN } from './lib/constants.js';
import { ApiError } from './lib/errors.js';
import { exportHierarchySnapshot } from './lib/csvExport.js';
import { initializeStore, readStore } from './lib/store.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import collegeAuthRoutes from './routes/college-auth.js';
import collegeRoutes from './routes/college.js';
import guarantorRoutes from './routes/guarantors.js';
import loanRoutes from './routes/loans.js';
import lookupRoutes from './routes/lookup.js';
import notificationsRoutes from './routes/notifications.js';
import privateLoanRoutes from './routes/private-loans.js';
import friendsRoutes from './routes/friends.js';
import statsRoutes from './routes/stats.js';
import transactionRoutes from './routes/transactions.js';
import userRoutes from './routes/users.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5001);

const allowedOrigins = [
  FRONTEND_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        origin.startsWith('vscode-webview://') ||
        origin === 'null'
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.get('/api/health', async (_req, res, next) => {
  try {
    await initializeStore();
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/lookup', lookupRoutes);
app.use('/api/college-auth', collegeAuthRoutes);
app.use('/api/college', collegeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/guarantors', guarantorRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/private-loans', privateLoanRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/colleges', async (req, res, next) => {
  try {
    const store = await readStore();
    const colleges = store.colleges.map((college) => ({
      id: college.id,
      name: college.collegeName || college.universityName,
      programId: college.loginCode,
      universityName: college.universityName,
      state: college.state,
      district: college.district,
      status: college.status,
    }));
    res.json(colleges);
  } catch (error) {
    next(error);
  }
});

app.get('/api/students', async (req, res, next) => {
  try {
    const store = await readStore();
    const { collegeId } = req.query;
    const students = store.users.filter(
      (user) =>
        !['admin', 'college_admin'].includes(user.role) &&
        (!collegeId || String(user.collegeId || '') === String(collegeId)),
    );
    res.json(
      students.map((user) => ({
        id: user.id,
        full_name: user.full_name,
        college_email: user.college_email,
        enrollment_number: user.enrollment_number,
        course_name: user.course_name,
        year: user.year,
        college_verified: user.college_verified,
        student_status: user.student_status,
      })),
    );
  } catch (error) {
    next(error);
  }
});

app.get('/api/college-api', async (_req, res, next) => {
  try {
    const store = await readStore();
    res.json({
      pendingRegistrations: store.pendingColleges.filter((item) => item.status === 'pending_admin').length,
      approvedColleges: store.colleges.length,
      studentsAwaitingApproval: store.users.filter((user) => user.student_status === 'pending_college').length,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/college-auth', async (req, res, next) => {
  try {
    if (req.body?.action !== 'login') {
      throw new ApiError(400, 'Unsupported college-auth action');
    }
    req.url = '/login';
    collegeAuthRoutes.handle(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.post('/api/bootstrap/export-csv', async (_req, res, next) => {
  try {
    const store = await readStore();
    await exportHierarchySnapshot(store);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use(notFound);
app.use(errorHandler);

initializeStore()
  .then(async () => {
    const snapshot = await readStore();
    await exportHierarchySnapshot(snapshot);
    const startServer = (listenPort) => {
      const server = app.listen(listenPort, () => {
        console.log(`IRA backend listening on http://localhost:${listenPort}`);
      });
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          const fallbackPort = listenPort === 5000 ? 5001 : listenPort + 1;
          console.warn(`Port ${listenPort} is in use, retrying on port ${fallbackPort}...`);
          startServer(fallbackPort);
        } else {
          console.error('Backend server error:', err);
          process.exit(1);
        }
      });
    };
    startServer(port);
  })
  .catch((error) => {
    console.error('Failed to initialize backend:', error);
    process.exit(1);
  });
