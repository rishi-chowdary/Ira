import { COUNTRY_CODE } from '../lib/constants.js';

const TABLE_ALIASES = {
  pending_colleges: 'pendingColleges',
  college_programs: 'collegePrograms',
  admin_audit_log: 'adminAuditLog',
};

function toCamelCase(value) {
  return value.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

function resolveCollection(store, table) {
  const key = TABLE_ALIASES[table] || table;
  return store[key] || store[toCamelCase(key)] || [];
}

function getRecordValue(record, column) {
  return record[column] ?? record[toCamelCase(column)] ?? null;
}

export function generateNextCode(table, column, length, store) {
  const collection = resolveCollection(store, table);
  const maxValue = collection.reduce((highest, record) => {
    const currentValue = Number.parseInt(String(getRecordValue(record, column) || '0').replace(/\D/g, ''), 10) || 0;
    return Math.max(highest, currentValue);
  }, 0);

  return String(maxValue + 1).padStart(length, '0');
}

export function generateLendingAccountId(userId, stateCode, districtCode, sectorCode) {
  return [
    COUNTRY_CODE,
    stateCode || '00',
    districtCode || '000',
    sectorCode || '000',
    String(userId).padStart(5, '0'),
  ].join(' ');
}

export function generateBorrowingAccountId(
  userId,
  stateCode,
  districtCode,
  universityCode,
  collegeCode,
  courseCode,
) {
  return [
    COUNTRY_CODE,
    stateCode || '00',
    districtCode || '000',
    universityCode || '000',
    collegeCode || '000',
    courseCode || '00',
    String(userId).padStart(5, '0'),
  ].join(' ');
}

export function generateCollegeProgramId(
  stateCode,
  districtCode,
  sectorCode,
  universityCode,
  collegeCode,
  courseCode,
  startYear,
  endYear,
) {
  return [
    COUNTRY_CODE,
    stateCode || '00',
    districtCode || '000',
    sectorCode || '000',
    universityCode || '000',
    collegeCode || '000',
    courseCode || '00',
    String(startYear),
    String(endYear),
  ].join(' ');
}

export function generateTemporaryPassword(date = new Date()) {
  return date.toISOString().replace(/\D/g, '').slice(0, 14);
}
