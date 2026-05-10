import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { hashPassword } from './passwords.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFile = path.join(__dirname, '../data/store.json');

let storeCache = null;
let writeQueue = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

async function createSeedStore() {
  const createdAt = nowIso();
  const demoPasswordHash = await hashPassword('demo123');
  const adminPasswordHash = await hashPassword('admin123');
  const collegePasswordHash = await hashPassword('college123');

  const states = [
    { id: 1, code: '58', name: 'Maharashtra' },
    { id: 2, code: '62', name: 'Karnataka' },
    { id: 3, code: '74', name: 'Tamil Nadu' },
    { id: 4, code: '75', name: 'Delhi' },
    { id: 5, code: '56', name: 'Uttar Pradesh' },
  ];

  const districts = [
    { id: 1, stateCode: '58', code: '101', name: 'Pune' },
    { id: 2, stateCode: '58', code: '102', name: 'Mumbai' },
    { id: 3, stateCode: '62', code: '201', name: 'Bengaluru Urban' },
    { id: 4, stateCode: '74', code: '301', name: 'Chennai' },
    { id: 5, stateCode: '75', code: '401', name: 'New Delhi' },
  ];

  const universities = [
    { id: 1, stateCode: '58', districtCode: '101', code: '001', name: 'Symbiosis International University', shortName: 'SIU' },
    { id: 2, stateCode: '62', districtCode: '201', code: '001', name: 'Bengaluru City University', shortName: 'BCU' },
    { id: 3, stateCode: '74', districtCode: '301', code: '001', name: 'University of Madras', shortName: 'UOM' },
  ];

  const collegePrograms = [
    {
      id: 1,
      collegeId: 1,
      programId: '91 58 101 450 001 001 01 2024 2028',
      startYear: 2024,
      endYear: 2028,
      courseCode: '01',
      courseName: 'B.Tech',
      branches: ['Computer Science', 'AI & DS'],
    },
    {
      id: 2,
      collegeId: 1,
      programId: '91 58 101 450 001 001 02 2024 2026',
      startYear: 2024,
      endYear: 2026,
      courseCode: '02',
      courseName: 'MBA',
      branches: ['Finance', 'Marketing'],
    },
  ];

  const colleges = [
    {
      id: 1,
      universityId: 1,
      universityCode: '001',
      universityName: 'Symbiosis International University',
      universityShortName: 'SIU',
      collegeCode: '001',
      collegeName: 'Symbiosis Institute of Technology',
      collegeShortName: 'SIT',
      state: 'Maharashtra',
      stateCode: '58',
      district: 'Pune',
      districtCode: '101',
      sectorCode: '450',
      pincode: '411016',
      contactEmail: 'admin@symbiosis.edu',
      contactPhone: '9876543210',
      studentEmailDomain: 'symbiosis.edu',
      loginCode: '91 58 101 450 001 001 01 2024 2028',
      passwordHash: collegePasswordHash,
      status: 'approved',
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const users = [
    {
      id: 1,
      email: 'admin@ira.co.in',
      password_hash: adminPasswordHash,
      full_name: 'IRA Platform Admin',
      whatsapp: '9999999999',
      upi_id: 'admin@ira',
      college_email: 'admin@ira.co.in',
      shri_score: 950,
      batua_locked: 0,
      batua_unlocked: 0,
      tijori: 0,
      role: 'admin',
      kyc_status: 'verified',
      college_verified: true,
      wallet_activated: true,
      mode: 'lender',
      can_borrow: false,
      can_lend: false,
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: 2,
      email: 'college@symbiosis.edu',
      password_hash: collegePasswordHash,
      full_name: 'Symbiosis College Admin',
      whatsapp: '9888888888',
      upi_id: 'college@symbiosis',
      college_email: 'college@symbiosis.edu',
      shri_score: 900,
      batua_locked: 0,
      batua_unlocked: 0,
      tijori: 0,
      role: 'college_admin',
      collegeId: 1,
      kyc_status: 'verified',
      college_verified: true,
      wallet_activated: true,
      mode: 'lender',
      can_borrow: false,
      can_lend: false,
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: 3,
      email: 'aarav.mehta@symbiosis.edu',
      password_hash: demoPasswordHash,
      full_name: 'Aarav Mehta',
      whatsapp: '9000000001',
      upi_id: 'aarav@upi',
      college_email: 'aarav.mehta@symbiosis.edu',
      shri_score: 690,
      batua_locked: 320,
      batua_unlocked: 780,
      tijori: 120,
      role: 'both',
      kyc_status: 'verified',
      college_verified: true,
      wallet_activated: true,
      mode: 'borrower',
      can_borrow: true,
      can_lend: true,
      stateCode: '58',
      districtCode: '101',
      sectorCode: '450',
      universityCode: '001',
      collegeCode: '001',
      course_code: '01',
      course_name: 'B.Tech',
      branch_name: 'Computer Science',
      year: 3,
      enrollment_number: 'SIT2024001',
      collegeId: 1,
      lending_account_id: '91 58 101 450 00003',
      borrowing_account_id: '91 58 101 001 001 01 00003',
      mock_upi_balance: 1500,
      student_status: 'approved',
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: 4,
      email: 'vihaan.singh@symbiosis.edu',
      password_hash: demoPasswordHash,
      full_name: 'Vihaan Singh',
      whatsapp: '9000000002',
      upi_id: 'vihaan@upi',
      college_email: 'vihaan.singh@symbiosis.edu',
      shri_score: 820,
      batua_locked: 500,
      batua_unlocked: 3800,
      tijori: 900,
      role: 'both',
      kyc_status: 'verified',
      college_verified: true,
      wallet_activated: true,
      mode: 'lender',
      can_borrow: true,
      can_lend: true,
      stateCode: '58',
      districtCode: '101',
      sectorCode: '450',
      universityCode: '001',
      collegeCode: '001',
      course_code: '01',
      course_name: 'B.Tech',
      branch_name: 'AI & DS',
      year: 4,
      enrollment_number: 'SIT2023002',
      collegeId: 1,
      lending_account_id: '91 58 101 450 00004',
      borrowing_account_id: '91 58 101 001 001 01 00004',
      mock_upi_balance: 2500,
      student_status: 'approved',
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: 5,
      email: 'diya.iyer@symbiosis.edu',
      password_hash: demoPasswordHash,
      full_name: 'Diya Iyer',
      whatsapp: '9000000003',
      upi_id: 'diya@upi',
      college_email: 'diya.iyer@symbiosis.edu',
      shri_score: 760,
      batua_locked: 220,
      batua_unlocked: 2600,
      tijori: 480,
      role: 'both',
      kyc_status: 'verified',
      college_verified: true,
      wallet_activated: true,
      mode: 'lender',
      can_borrow: true,
      can_lend: true,
      stateCode: '58',
      districtCode: '101',
      sectorCode: '450',
      universityCode: '001',
      collegeCode: '001',
      course_code: '02',
      course_name: 'MBA',
      branch_name: 'Finance',
      year: 2,
      enrollment_number: 'SIT2024003',
      collegeId: 1,
      lending_account_id: '91 58 101 450 00005',
      borrowing_account_id: '91 58 101 001 001 02 00005',
      mock_upi_balance: 1200,
      student_status: 'approved',
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: 6,
      email: 'riya.menon@symbiosis.edu',
      password_hash: demoPasswordHash,
      full_name: 'Riya Menon',
      whatsapp: '9000000004',
      upi_id: 'riya@upi',
      college_email: 'riya.menon@symbiosis.edu',
      shri_score: 730,
      batua_locked: 600,
      batua_unlocked: 1950,
      tijori: 650,
      role: 'both',
      kyc_status: 'verified',
      college_verified: true,
      wallet_activated: true,
      mode: 'both',
      can_borrow: true,
      can_lend: true,
      stateCode: '58',
      districtCode: '101',
      sectorCode: '450',
      universityCode: '001',
      collegeCode: '001',
      course_code: '02',
      course_name: 'MBA',
      branch_name: 'Marketing',
      year: 2,
      enrollment_number: 'SIT2024004',
      collegeId: 1,
      lending_account_id: '91 58 101 450 00006',
      borrowing_account_id: '91 58 101 001 001 02 00006',
      mock_upi_balance: 900,
      student_status: 'approved',
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: 7,
      email: 'karthik.rao@symbiosis.edu',
      password_hash: demoPasswordHash,
      full_name: 'Karthik Rao',
      whatsapp: '9000000005',
      upi_id: 'karthik@upi',
      college_email: 'karthik.rao@symbiosis.edu',
      shri_score: 680,
      batua_locked: 350,
      batua_unlocked: 1100,
      tijori: 200,
      role: 'both',
      kyc_status: 'verified',
      college_verified: true,
      wallet_activated: true,
      mode: 'lender',
      can_borrow: true,
      can_lend: true,
      stateCode: '58',
      districtCode: '101',
      sectorCode: '450',
      universityCode: '001',
      collegeCode: '001',
      course_code: '01',
      course_name: 'B.Tech',
      branch_name: 'Computer Science',
      year: 4,
      enrollment_number: 'SIT2023005',
      collegeId: 1,
      lending_account_id: '91 58 101 450 00007',
      borrowing_account_id: '91 58 101 001 001 01 00007',
      mock_upi_balance: 1000,
      student_status: 'approved',
      created_at: createdAt,
      updated_at: createdAt,
    },
  ];

  const pendingColleges = [
    {
      id: 1,
      submitted_data: {
        university: { name: 'Pune Innovation University', shortName: 'PIU' },
        college: { name: 'PIU School of Design', shortName: 'PIUSD' },
        location: {
          state: 'Maharashtra',
          district: 'Pune',
          areaCode: '451',
          pincode: '411045',
        },
        courses: [
          { name: 'B.Des', duration: 4, branches: ['Product Design', 'UX Design'] },
        ],
        contact: {
          email: 'registrar@piu.edu',
          phone: '9123456789',
        },
      },
      status: 'pending_admin',
      ml_score: 0.94,
      created_at: createdAt,
      processed_at: null,
    },
  ];

  return {
    meta: {
      nextIds: {
        pendingColleges: 2,
        colleges: 2,
        collegePrograms: 3,
        users: 8,
        loans: 1,
        investments: 1,
        transactions: 1,
        adminAuditLog: 1,
        refreshTokens: 1,
        otpSessions: 1,
      },
      createdAt,
      updatedAt: createdAt,
    },
    states,
    districts,
    universities,
    colleges,
    collegePrograms,
    users,
    pendingColleges,
    guarantors: [
      {
        borrower_id: 3,
        guarantor_id: 6,
        status: 'approved',
        approved_at: createdAt,
      },
      {
        borrower_id: 3,
        guarantor_id: 7,
        status: 'approved',
        approved_at: createdAt,
      },
    ],
    adminAuditLog: [],
    loans: [],
    investments: [],
    transactions: [],
    notifications: [],
    refreshTokens: [],
    otpSessions: [],
    friends: [],
    messages: [],
  };
}

async function ensureStore() {
  if (storeCache) {
    return storeCache;
  }

  try {
    const fileContent = await fs.readFile(dataFile, 'utf8');
    storeCache = JSON.parse(fileContent);
    return storeCache;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  storeCache = await createSeedStore();
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(storeCache, null, 2));
  return storeCache;
}

async function persistStore() {
  storeCache.meta.updatedAt = nowIso();
  await fs.writeFile(dataFile, JSON.stringify(storeCache, null, 2));
}

export async function initializeStore() {
  return ensureStore();
}

export async function readStore(selector = (store) => store) {
  const store = await ensureStore();
  return structuredClone(selector(store));
}

export async function mutateStore(mutator) {
  const runner = async () => {
    const store = await ensureStore();
    const result = await mutator(store);
    await persistStore();
    return structuredClone(result);
  };

  writeQueue = writeQueue.then(runner, runner);
  return writeQueue;
}

export function nextId(store, collectionName) {
  const current = store.meta.nextIds[collectionName] || 1;
  store.meta.nextIds[collectionName] = current + 1;
  return current;
}

export function sanitiseUser(user) {
  if (!user) return null;

  const { password_hash, mock_upi_balance, ...safeUser } = user;
  return safeUser;
}

export function sanitiseCollege(college) {
  if (!college) return null;

  const { passwordHash, ...safeCollege } = college;
  return safeCollege;
}
